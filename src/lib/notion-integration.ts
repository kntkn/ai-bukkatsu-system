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
   * 複数物件の一括アップロード
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

  /**
   * ページの詳細内容を追加
   */
  private async addDetailedContent(pageId: string, result: NotionPropertyResult) {
    const blocks: any[] = [];

    // ヘッダー
    blocks.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: '物確結果詳細',
            },
          },
        ],
      },
    });

    // サイト別結果
    blocks.push({
      type: 'heading_3',
      heading_3: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: '各サイト確認状況',
            },
          },
        ],
      },
    });

    for (const siteResult of result.verificationResults) {
      const statusIcon = this.getStatusIcon(siteResult.status);
      const statusText = this.getStatusText(siteResult.status);

      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `${statusIcon} ${siteResult.siteName}: ${statusText}`,
              },
            },
          ],
        },
      });

      if (siteResult.notes) {
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `   └ ${siteResult.notes}`,
                },
              },
            ],
          },
        });
      }
    }

    // 総合判定
    blocks.push({
      type: 'heading_3',
      heading_3: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: '総合判定',
            },
          },
        ],
      },
    });

    const finalStatusText = this.getFinalStatusText(result.finalStatus);
    blocks.push({
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: finalStatusText,
            },
          },
        ],
      },
    });

    if (result.notes) {
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `備考: ${result.notes}`,
              },
            },
          ],
        },
      });
    }

    // ブロックを追加
    try {
      await this.notion.blocks.children.append({
        block_id: pageId,
        children: blocks,
      });
    } catch (error) {
      console.warn('Failed to add detailed content:', error);
    }
  }

  /**
   * ステータスをNotionセレクトオプションにマッピング
   */
  private mapStatusToNotionSelect(status: string): string {
    switch (status) {
      case 'available': return '空室あり';
      case 'occupied': return '満室';
      case 'unknown': return '不明';
      case 'needs_call': return '要電話確認';
      default: return '不明';
    }
  }

  /**
   * ステータスアイコンを取得
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'available': return '✅';
      case 'occupied': return '❌';
      case 'unknown': return '❓';
      case 'error': return '⚠️';
      default: return '❓';
    }
  }

  /**
   * ステータステキストを取得
   */
  private getStatusText(status: string): string {
    switch (status) {
      case 'available': return '空室あり';
      case 'occupied': return '満室';
      case 'unknown': return '確認できず';
      case 'error': return 'エラー';
      default: return '不明';
    }
  }

  /**
   * 最終ステータステキストを取得
   */
  private getFinalStatusText(status: string): string {
    switch (status) {
      case 'available': return '🟢 空室が確認されました';
      case 'occupied': return '🔴 満室のようです';
      case 'unknown': return '🟡 確認が取れませんでした';
      case 'needs_call': return '📞 電話での確認が必要です';
      default: return '❓ 判定できませんでした';
    }
  }

  /**
   * 要電話確認リストを取得
   */
  async getNeedsCallList(): Promise<NotionPropertyResult[]> {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          property: '空室状況',
          select: {
            equals: '要電話確認',
          },
        },
        sorts: [
          {
            property: '確認日時',
            direction: 'descending',
          },
        ],
      });

      // レスポンスを解析してNotionPropertyResultに変換
      return response.results.map(this.parseNotionPageToResult).filter(Boolean) as NotionPropertyResult[];
    } catch (error) {
      console.error('Failed to fetch needs call list:', error);
      return [];
    }
  }

  /**
   * NotionページをNotionPropertyResultに変換
   */
  private parseNotionPageToResult(page: any): NotionPropertyResult | null {
    try {
      const properties = page.properties;

      return {
        id: page.id,
        propertyName: properties['物件名']?.title?.[0]?.text?.content || '',
        roomNumber: properties['号室']?.rich_text?.[0]?.text?.content || '',
        address: properties['住所']?.rich_text?.[0]?.text?.content || '',
        managementCompany: properties['管理会社']?.rich_text?.[0]?.text?.content || '',
        verificationResults: [], // 詳細は別途取得が必要
        finalStatus: this.mapNotionSelectToStatus(properties['空室状況']?.select?.name || ''),
        lastVerified: new Date(properties['確認日時']?.date?.start || Date.now()),
      };
    } catch (error) {
      console.warn('Failed to parse Notion page:', error);
      return null;
    }
  }

  /**
   * Notionセレクトオプションをステータスにマッピング
   */
  private mapNotionSelectToStatus(selectValue: string): 'available' | 'occupied' | 'unknown' | 'needs_call' {
    switch (selectValue) {
      case '空室あり': return 'available';
      case '満室': return 'occupied';
      case '要電話確認': return 'needs_call';
      default: return 'unknown';
    }
  }
}