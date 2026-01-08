import Anthropic from '@anthropic-ai/sdk';
// PDF解析はローカル環境のみで有効
// const pdfParse = require('pdf-parse');
import * as fs from 'fs';
import { PropertyInfo, PdfAnalysisResult, AnalysisProgress } from '@/types/pdf-analysis';

export class PdfAnalyzer {
  private anthropic: Anthropic;
  
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }

  /**
   * PDFファイルを解析して物件情報を抽出
   */
  async analyzePdf(
    filePath: string, 
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<PdfAnalysisResult> {
    try {
      onProgress?.({
        stage: 'parsing',
        progress: 10,
        message: 'PDFファイルを読み込み中...'
      });

      // 本番環境ではPDF解析を無効化
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        onProgress?.({
          stage: 'parsing',
          progress: 30,
          message: 'デモモード: サンプル物件情報を使用',
          totalPages: 1
        });

        const sampleProperty: PropertyInfo = {
          propertyName: 'アークヒルズ仙石山森タワー',
          roomNumber: '3A',
          address: '東京都港区六本木1丁目',
          managementCompany: '森ビル株式会社'
        };

        return {
          success: true,
          properties: [sampleProperty],
          totalPages: 1,
          processedPages: 1
        };
      }

      // ローカル環境でのPDF解析
      let pdfParse;
      try {
        pdfParse = require('pdf-parse');
        // CommonJS形式でexportされている場合の対応
        if (typeof pdfParse !== 'function' && pdfParse.default) {
          pdfParse = pdfParse.default;
        }
      } catch (error) {
        console.error('Failed to load pdf-parse:', error);
        throw new Error('PDF parsing library not available');
      }
      
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);

      const totalPages = pdfData.numpages || 1;
      
      onProgress?.({
        stage: 'parsing',
        progress: 30,
        message: `PDF解析完了（${totalPages}ページ）`,
        totalPages
      });

      onProgress?.({
        stage: 'analyzing',
        progress: 40,
        message: 'Claude AIで物件情報を分析中...'
      });

      // Claude AIで物件情報を抽出
      const properties = await this.extractPropertiesWithAI(pdfData.text, onProgress);

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: `解析完了（${properties.length}件の物件情報を抽出）`
      });

      return {
        success: true,
        properties,
        totalPages,
        processedPages: totalPages
      };

    } catch (error) {
      console.error('PDF analysis error:', error);
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `解析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      return {
        success: false,
        properties: [],
        totalPages: 0,
        processedPages: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * 複数のPDFファイルを一括解析
   */
  async analyzeMultiplePdfs(
    filePaths: string[],
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<PdfAnalysisResult> {
    const allProperties: PropertyInfo[] = [];
    let totalPages = 0;
    let processedPages = 0;
    const errors: string[] = [];

    onProgress?.({
      stage: 'parsing',
      progress: 0,
      message: `${filePaths.length}個のPDFファイルを処理中...`
    });

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const fileName = filePath.split('/').pop() || 'Unknown';
      
      try {
        const result = await this.analyzePdf(filePath, (progress) => {
          const overallProgress = ((i / filePaths.length) * 100) + (progress.progress / filePaths.length);
          onProgress?.({
            ...progress,
            progress: overallProgress,
            message: `[${i + 1}/${filePaths.length}] ${fileName}: ${progress.message}`
          });
        });

        if (result.success) {
          allProperties.push(...result.properties);
          totalPages += result.totalPages;
          processedPages += result.processedPages;
        } else {
          errors.push(`${fileName}: ${result.errors?.join(', ')}`);
        }

      } catch (error) {
        const errorMsg = `${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`Error processing ${fileName}:`, error);
      }
    }

    return {
      success: errors.length === 0,
      properties: allProperties,
      totalPages,
      processedPages,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Claude AIを使用してテキストから物件情報を抽出
   */
  private async extractPropertiesWithAI(
    pdfText: string,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<PropertyInfo[]> {
    onProgress?.({
      stage: 'extracting',
      progress: 60,
      message: 'Claude AIで物件情報を構造化中...'
    });

    const prompt = `
以下の不動産マイソクPDFテキストから、物件情報を抽出してください。
複数の物件が含まれている場合は、すべての物件を抽出してください。

抽出する情報：
1. 物件名（建物名）
2. 号室（部屋番号）
3. 住所（都道府県市区町村以下の住所）
4. 管理会社名
5. 間取り（可能であれば）
6. 賃料（可能であれば）
7. 敷金（可能であれば）
8. 礼金（可能であれば）

回答は以下のJSON形式で返してください：

\`\`\`json
{
  "properties": [
    {
      "propertyName": "物件名",
      "roomNumber": "号室",
      "address": "住所",
      "managementCompany": "管理会社名",
      "floorPlan": "間取り",
      "rent": "賃料",
      "deposit": "敷金",
      "keyMoney": "礼金",
      "notes": "その他特記事項"
    }
  ]
}
\`\`\`

PDFテキスト:
${pdfText}
`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20241022',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      onProgress?.({
        stage: 'extracting',
        progress: 80,
        message: 'AI分析結果を処理中...'
      });

      // レスポンスからJSONを抽出
      const response = message.content[0];
      if (response.type === 'text') {
        const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1];
          const parsed = JSON.parse(jsonStr);
          
          if (parsed.properties && Array.isArray(parsed.properties)) {
            return parsed.properties.map(this.validatePropertyInfo);
          }
        }
        
        // JSONブロックがない場合、直接パースを試行
        try {
          const parsed = JSON.parse(response.text);
          if (parsed.properties && Array.isArray(parsed.properties)) {
            return parsed.properties.map(this.validatePropertyInfo);
          }
        } catch {
          // JSONパースに失敗した場合はエラーログを出力
          console.warn('Failed to parse AI response as JSON:', response.text);
        }
      }

      console.warn('No valid properties found in AI response');
      return [];

    } catch (error) {
      console.error('AI extraction error:', error);
      throw new Error(`AI分析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 物件情報の妥当性を検証・正規化
   */
  private validatePropertyInfo(raw: any): PropertyInfo {
    return {
      propertyName: this.sanitizeString(raw.propertyName || ''),
      roomNumber: this.sanitizeString(raw.roomNumber || ''),
      address: this.sanitizeString(raw.address || ''),
      managementCompany: this.sanitizeString(raw.managementCompany || ''),
      floorPlan: raw.floorPlan ? this.sanitizeString(raw.floorPlan) : undefined,
      rent: raw.rent ? this.sanitizeString(raw.rent) : undefined,
      deposit: raw.deposit ? this.sanitizeString(raw.deposit) : undefined,
      keyMoney: raw.keyMoney ? this.sanitizeString(raw.keyMoney) : undefined,
      notes: raw.notes ? this.sanitizeString(raw.notes) : undefined
    };
  }

  /**
   * 文字列のサニタイズ
   */
  private sanitizeString(str: string): string {
    return str
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF0-9\-()（）]/g, '');
  }

  /**
   * PDFファイルの基本情報を取得（解析なし）
   */
  async getPdfInfo(filePath: string): Promise<{ pages: number; text: string }> {
    // 本番環境ではサンプルデータを返す
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return {
        pages: 1,
        text: 'アークヒルズ仙石山森タワー 3A 東京都港区六本木1丁目 森ビル株式会社'
      };
    }

    try {
      let pdfParse;
      try {
        pdfParse = require('pdf-parse');
        // CommonJS形式でexportされている場合の対応
        if (typeof pdfParse !== 'function' && pdfParse.default) {
          pdfParse = pdfParse.default;
        }
      } catch (error) {
        console.error('Failed to load pdf-parse:', error);
        throw new Error('PDF parsing library not available');
      }
      
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      return {
        pages: pdfData.numpages || 0,
        text: pdfData.text.substring(0, 500) // 最初の500文字のみ返す
      };
    } catch (error) {
      throw new Error(`PDF読み込みエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}