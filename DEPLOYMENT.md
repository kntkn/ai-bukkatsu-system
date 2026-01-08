# 🚀 AI物確システム - Vercel デプロイガイド

## 📋 デプロイ前チェックリスト

### 1. 必要な環境変数
以下の環境変数をVercelダッシュボードで設定してください：

```bash
# 必須: Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# 必須: Notion データベース ID
NOTION_DATABASE_ID=2e21c1974dad81bfad4ace49ca030e9e

# 自動設定: アプリケーションURL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 2. Notion データベース設定
- データベースID: `2e21c1974dad81bfad4ace49ca030e9e`
- データベース名: "AI物確システム - 検証結果"
- 必要フィールド: ✅ 設定済み

### 3. GitHubリポジトリ
- リポジトリ: https://github.com/kntkn/ai-bukkatsu-system
- ブランチ: main
- ステータス: ✅ プッシュ済み

## 🔧 Vercel デプロイ手順

### ステップ1: Vercelプロジェクト作成
1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. "Add New Project" をクリック
3. GitHubリポジトリ `ai-bukkatsu-system` を選択
4. プロジェクト設定:
   - Framework: **Next.js** (自動検出)
   - Root Directory: **ai-bukkatsu-system** 
   - Build Command: `npm run build` (デフォルト)
   - Output Directory: `.next` (デフォルト)

### ステップ2: 環境変数設定
1. プロジェクト設定 > Environment Variables
2. 上記の環境変数を追加:
   ```
   ANTHROPIC_API_KEY = [あなたのClaudeAPIキー]
   NOTION_DATABASE_ID = 2e21c1974dad81bfad4ace49ca030e9e
   ```

### ステップ3: デプロイ実行
1. "Deploy" ボタンをクリック
2. ビルド完了を待機 (約2-3分)
3. デプロイ完了後、URLが生成されます

## 🎯 デプロイ後の確認事項

### 動作テスト
1. **ベースURL**: `https://your-app.vercel.app`
2. **Notion API**: `https://your-app.vercel.app/api/notion?action=test`
3. **PDF アップロード機能**: メインページでPDFをアップロード
4. **リアルタイム物確**: Start Demoボタンでライブミラーリング

### 期待される結果
- ✅ PDFからの物件情報抽出
- ✅ ブラウザ自動化のリアルタイム表示
- ✅ Notionへの結果自動アップロード
- ✅ WebSocket接続による進捗表示

## 🛠️ トラブルシューティング

### よくある問題と解決策

#### 1. ビルドエラー
```bash
# TypeScript型エラー
npm run build  # ローカルでビルドテスト
```

#### 2. 環境変数未設定
- Vercel Dashboard > Settings > Environment Variables
- 正しいキーと値が設定されているか確認

#### 3. Notion接続エラー
- データベースIDが正しいか確認
- MCP統合が有効になっているか確認

#### 4. PDF解析エラー
- ANTHROPIC_API_KEYが正しく設定されているか確認
- APIキーの残高・制限を確認

## 📊 パフォーマンス最適化

### Vercel設定
- リージョン: Asia Northeast (Tokyo) - `nrt1`
- 関数タイムアウト: 60秒 (PDF解析・物確実行)
- 自動デプロイ: mainブランチへのプッシュ時

### 最適化項目
- Next.js App Router使用
- 動的インポートでコード分割
- 画像最適化 (next/image)
- WebSocket接続のエラーハンドリング

## 📈 本番環境での運用

### モニタリング
- Vercel Analytics: ページビュー・エラー監視
- Notion API: アップロード成功率
- PDF処理: 解析成功率・処理時間

### 更新フロー
1. ローカル開発・テスト
2. mainブランチにプッシュ
3. Vercel自動デプロイ
4. 本番環境テスト

---

## 🎉 デプロイ完了

システムが正常にデプロイされたら、以下の機能が利用可能になります：

- **🤖 AI-powered PDF解析**: 物件資料から自動情報抽出
- **👀 スケルトンビュー**: AIの思考プロセスをリアルタイム可視化  
- **🔄 自動物確実行**: 複数サイトを並行チェック
- **📝 Notion統合**: 結果の自動データベース保存

完全自動化された物確システムの運用を開始できます！