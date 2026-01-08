import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { SiteCredential, CredentialsData, CredentialsManagerConfig } from '@/types/credentials';

export class CredentialsManager {
  private config: CredentialsManagerConfig;
  private cache: CredentialsData | null = null;

  constructor(config: CredentialsManagerConfig) {
    this.config = config;
  }

  /**
   * デスクトップフォルダから認証情報ファイルを自動検出（本番環境対応）
   */
  static async autoDetectCredentialsFile(): Promise<CredentialsManager | null> {
    // 本番環境（Vercel）では認証情報ファイルは利用できないため、nullを返す
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.log('📁 Production environment detected - using demo mode');
      return null;
    }

    const desktopPath = path.join(process.env.HOME || '', 'Desktop');
    
    // 検索対象のファイルパターン
    const searchPatterns = [
      /^funt.*IDpass\.(xlsx|xls)$/i,
      /^.*業者間サイト.*\.(csv|xlsx|xls)$/i,
      /^.*ログイン.*\.(csv|xlsx|xls)$/i,
      /^.*認証.*\.(csv|xlsx|xls)$/i
    ];

    try {
      const files = fs.readdirSync(desktopPath);
      
      for (const file of files) {
        for (const pattern of searchPatterns) {
          if (pattern.test(file)) {
            const filePath = path.join(desktopPath, file);
            const fileType = this.determineFileType(filePath);
            
            console.log(`📁 Found credentials file: ${file}`);
            return new CredentialsManager({
              filePath,
              fileType
            });
          }
        }
      }
    } catch (error) {
      console.error('Error scanning desktop for credentials:', error);
    }

    console.log('📁 No credentials file found, will use demo mode');
    return null;
  }

  /**
   * ファイル拡張子からファイルタイプを判定
   */
  private static determineFileType(filePath: string): 'excel' | 'csv' | 'auto' {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.xlsx':
      case '.xls':
        return 'excel';
      case '.csv':
        return 'csv';
      default:
        return 'auto';
    }
  }

  /**
   * 認証情報を読み込み
   */
  async loadCredentials(forceRefresh = false): Promise<CredentialsData> {
    if (this.cache && !forceRefresh) {
      return this.cache;
    }

    try {
      const fileType = this.config.fileType === 'auto' 
        ? CredentialsManager.determineFileType(this.config.filePath)
        : this.config.fileType;

      let sites: SiteCredential[];

      if (fileType === 'excel') {
        sites = await this.readExcelFile();
      } else {
        sites = await this.readCsvFile();
      }

      this.cache = {
        sites,
        lastUpdated: new Date()
      };

      console.log(`✅ Loaded ${sites.length} site credentials from ${this.config.filePath}`);
      return this.cache;

    } catch (error) {
      console.error('Error loading credentials:', error);
      throw new Error(`Failed to load credentials: ${error}`);
    }
  }

  /**
   * Excelファイルから認証情報を読み込み
   */
  private async readExcelFile(): Promise<SiteCredential[]> {
    const workbook = XLSX.readFile(this.config.filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // JSONに変換
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    return this.parseCredentialsData(data as string[][]);
  }

  /**
   * CSVファイルから認証情報を読み込み
   */
  private async readCsvFile(): Promise<SiteCredential[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      
      fs.createReadStream(this.config.filePath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          try {
            const credentials = this.parseCredentialsFromObjects(results);
            resolve(credentials);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * 2次元配列形式のデータを認証情報に変換
   */
  private parseCredentialsData(data: string[][]): SiteCredential[] {
    if (data.length < 2) {
      throw new Error('Invalid credentials file format');
    }

    const headers = data[0].map(h => h?.toString().toLowerCase() || '');
    const rows = data.slice(1);

    // ヘッダー列のインデックスを特定
    const indices = {
      siteName: this.findColumnIndex(headers, ['サイト名', 'site', 'sitename', 'name']),
      url: this.findColumnIndex(headers, ['url', 'アドレス', 'サイト', 'website']),
      username: this.findColumnIndex(headers, ['ユーザー名', 'username', 'user', 'id', 'ログインid']),
      password: this.findColumnIndex(headers, ['パスワード', 'password', 'pass', 'pw']),
      notes: this.findColumnIndex(headers, ['備考', 'notes', 'memo', '注記'])
    };

    // 必須フィールドの確認
    if (indices.siteName === -1 || indices.username === -1 || indices.password === -1) {
      console.warn('Some required columns not found, using fallback mapping');
      // フォールバック: 順序で推定
      if (headers.length >= 3) {
        indices.siteName = 0;
        indices.username = 1;
        indices.password = 2;
        indices.url = headers.length > 3 ? 3 : -1;
      }
    }

    const credentials: SiteCredential[] = [];

    for (const row of rows) {
      if (!row || row.length === 0) continue;

      const siteName = row[indices.siteName]?.toString().trim();
      const username = row[indices.username]?.toString().trim();
      const password = row[indices.password]?.toString().trim();

      if (siteName && username && password) {
        credentials.push({
          siteName,
          url: indices.url >= 0 ? row[indices.url]?.toString().trim() || '' : '',
          username,
          password,
          notes: indices.notes >= 0 ? row[indices.notes]?.toString().trim() || '' : ''
        });
      }
    }

    return credentials;
  }

  /**
   * オブジェクト配列形式のデータを認証情報に変換
   */
  private parseCredentialsFromObjects(data: any[]): SiteCredential[] {
    const credentials: SiteCredential[] = [];

    for (const item of data) {
      const keys = Object.keys(item);
      
      // 動的にフィールドをマッピング
      const siteName = this.findValueByKeys(item, ['サイト名', 'site', 'sitename', 'name']);
      const username = this.findValueByKeys(item, ['ユーザー名', 'username', 'user', 'id', 'ログインid']);
      const password = this.findValueByKeys(item, ['パスワード', 'password', 'pass', 'pw']);
      const url = this.findValueByKeys(item, ['url', 'アドレス', 'サイト', 'website']);
      const notes = this.findValueByKeys(item, ['備考', 'notes', 'memo', '注記']);

      if (siteName && username && password) {
        credentials.push({
          siteName,
          url: url || '',
          username,
          password,
          notes: notes || ''
        });
      }
    }

    return credentials;
  }

  /**
   * ヘッダー配列から該当する列のインデックスを検索
   */
  private findColumnIndex(headers: string[], searchTerms: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (searchTerms.some(term => header.includes(term))) {
        return i;
      }
    }
    return -1;
  }

  /**
   * オブジェクトから該当するキーの値を検索
   */
  private findValueByKeys(obj: any, searchKeys: string[]): string | null {
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      if (searchKeys.some(searchKey => lowerKey.includes(searchKey.toLowerCase()))) {
        return obj[key]?.toString().trim() || null;
      }
    }
    return null;
  }

  /**
   * 特定サイトの認証情報を取得
   */
  async getCredentialsForSite(siteName: string): Promise<SiteCredential | null> {
    const data = await this.loadCredentials();
    
    return data.sites.find(site => 
      site.siteName.toLowerCase().includes(siteName.toLowerCase()) ||
      siteName.toLowerCase().includes(site.siteName.toLowerCase())
    ) || null;
  }

  /**
   * 全サイトの認証情報を取得
   */
  async getAllCredentials(): Promise<SiteCredential[]> {
    const data = await this.loadCredentials();
    return data.sites;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache = null;
  }
}