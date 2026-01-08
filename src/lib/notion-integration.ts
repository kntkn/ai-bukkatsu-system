import { NotionPropertyResult, NotionConfig, NotionUploadResult } from '@/types/notion-integration';

export class NotionIntegration {
  private databaseId: string;

  constructor(config: NotionConfig) {
    this.databaseId = config.databaseId;
  }

  /**
   * Notion設定の自動検出（MCP使用）
   */
  static createFromEnvironment(): NotionIntegration | null {
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!databaseId) {
      console.warn('Notion database ID not configured');
      return null;
    }

    return new NotionIntegration({ databaseId } as NotionConfig);
  }

  /**
   * データベースの接続テスト（MCP使用）
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // MCPでデータベース情報を取得してテスト
      const response = await fetch('/api/notion?action=test');
      const result = await response.json();
      return { success: result.success, error: result.message };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 物件確認結果をNotionに登録（MCP使用）
   */
  async uploadPropertyResult(result: NotionPropertyResult): Promise<NotionUploadResult> {
    try {
      const response = await fetch('/api/notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'upload',
          properties: [result]
        })
      });

      const uploadResult = await response.json();
      
      if (uploadResult.success) {
        return {
          success: true,
          pageId: uploadResult.data?.pageId,
          url: uploadResult.data?.url,
        };
      } else {
        return {
          success: false,
          error: uploadResult.message || 'Upload failed',
        };
      }
    } catch (error) {
      console.error('Notion upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 複数物件の一括アップロード（MCP使用）
   */
  async uploadMultipleResults(results: NotionPropertyResult[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const result of results) {
      try {
        const uploadResult = await this.uploadPropertyResult(result);
        if (uploadResult.success) {
          successful++;
        } else {
          failed++;
          errors.push(`${result.propertyName}: ${uploadResult.error}`);
        }
      } catch (error) {
        failed++;
        errors.push(`${result.propertyName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Rate limiting対策
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return { successful, failed, errors };
  }
}