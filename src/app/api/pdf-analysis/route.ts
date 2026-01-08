import { NextRequest, NextResponse } from 'next/server';
import { PdfAnalyzer } from '@/lib/pdf-analyzer';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// アップロードディレクトリの設定
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// アップロードディレクトリの作成
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir();
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded', message: 'PDFファイルを選択してください' },
        { status: 400 }
      );
    }

    // PDFファイルのバリデーション
    const pdfFiles = files.filter(file => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        console.warn(`Non-PDF file rejected: ${file.name} (${file.type})`);
      }
      return isPdf;
    });

    if (pdfFiles.length === 0) {
      return NextResponse.json(
        { error: 'No PDF files found', message: 'PDFファイルのみアップロード可能です' },
        { status: 400 }
      );
    }

    // ファイルを一時保存
    const savedFiles: string[] = [];
    const fileInfos: Array<{id: string, name: string, path: string}> = [];

    for (const file of pdfFiles) {
      const fileId = uuidv4();
      const filename = `${fileId}-${file.name}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      await writeFile(filepath, buffer);
      savedFiles.push(filepath);
      fileInfos.push({
        id: fileId,
        name: file.name,
        path: filepath
      });
    }

    // PDF解析を実行
    const analyzer = new PdfAnalyzer();
    
    console.log(`🏠 Starting PDF analysis for ${savedFiles.length} files`);
    
    const result = await analyzer.analyzeMultiplePdfs(savedFiles, (progress) => {
      console.log(`📊 Progress: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
    });

    if (result.success) {
      console.log(`✅ Analysis completed: ${result.properties.length} properties extracted`);
      
      return NextResponse.json({
        success: true,
        data: {
          properties: result.properties,
          summary: {
            totalFiles: pdfFiles.length,
            totalPages: result.totalPages,
            totalProperties: result.properties.length,
            processedFiles: fileInfos.map(f => ({ id: f.id, name: f.name }))
          }
        },
        message: `${result.properties.length}件の物件情報を抽出しました`
      });
    } else {
      console.error('Analysis failed:', result.errors);
      
      return NextResponse.json(
        { 
          error: 'Analysis failed',
          message: '解析中にエラーが発生しました',
          details: result.errors 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('PDF upload/analysis error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'test') {
    // テスト用エンドポイント
    try {
      const analyzer = new PdfAnalyzer();
      
      // API キーの確認
      const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
      
      // 本番環境ではデモモードとして動作
      const effectivelyConfigured = hasApiKey || isProduction;
      
      return NextResponse.json({
        success: true,
        data: {
          apiKeyConfigured: effectivelyConfigured,
          uploadsDir: UPLOAD_DIR,
          uploadsExist: existsSync(UPLOAD_DIR),
          environment: isProduction ? 'production' : 'development',
          demoMode: isProduction && !hasApiKey
        },
        message: effectivelyConfigured 
          ? (isProduction && !hasApiKey ? 'PDF analyzer ready (demo mode)' : 'PDF analyzer ready')
          : 'Anthropic API key not configured'
      });
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Test failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { 
      error: 'Invalid action',
      message: 'Supported actions: test'
    },
    { status: 400 }
  );
}