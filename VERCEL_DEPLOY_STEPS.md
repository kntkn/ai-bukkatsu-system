# 🚀 Vercel デプロイ - ステップバイステップガイド

## 📋 事前準備完了
✅ GitHubリポジトリ: https://github.com/kntkn/ai-bukkatsu-system  
✅ Vercel設定ファイル: `vercel.json`  
✅ 環境変数テンプレート: `.env.production`  
✅ デプロイメントガイド: `DEPLOYMENT.md`

## 🎯 今すぐ実行するステップ

### ステップ1: Vercel ダッシュボードにアクセス
1. ブラウザで https://vercel.com/dashboard を開く
2. GitHubアカウントでログイン（未ログインの場合）

### ステップ2: 新しいプロジェクトを作成
1. **"Add New Project"** ボタンをクリック
2. **"Import Git Repository"** を選択
3. GitHub連携が未設定の場合は **"Connect to GitHub"** をクリック

### ステップ3: リポジトリを選択
1. `ai-bukkatsu-system` リポジトリを検索
2. **"Import"** ボタンをクリック

### ステップ4: プロジェクト設定
```
Project Name: ai-bukkatsu-system
Framework: Next.js (自動検出)
Root Directory: ai-bukkatsu-system/
Build Command: npm run build (デフォルト)
Output Directory: .next (デフォルト)
Install Command: npm install (デフォルト)
```

### ステップ5: 環境変数設定 ⚠️ 重要
**Environment Variables** セクションで以下を追加：

```bash
# 必須: あなたのAnthropicAPIキー
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...

# 必須: Notion データベースID（設定済み）
NOTION_DATABASE_ID=2e21c1974dad81bfad4ace49ca030e9e

# 任意: アプリケーションURL（自動設定される）
NEXT_PUBLIC_APP_URL=https://ai-bukkatsu-system.vercel.app
```

### ステップ6: デプロイ実行
1. **"Deploy"** ボタンをクリック
2. ビルドプロセス監視（約2-3分）
3. 完了まで待機

## 🎊 デプロイ完了後

### 📱 生成されるURL
```
Production: https://ai-bukkatsu-system-[random].vercel.app
または
Custom Domain: https://ai-bukkatsu-system.vercel.app
```

### ✅ 動作確認
1. **メインページ**: PDF アップロード機能
2. **Notion API**: `/api/notion?action=test`
3. **ライブデモ**: Start Demo ボタン

### 🎯 期待される動作
- ✅ PDF から物件情報自動抽出
- ✅ ブラウザ自動化のリアルタイム表示
- ✅ Notion データベースへの結果保存
- ✅ AI思考プロセスの可視化

## 🆘 トラブルシューティング

### ビルドエラーの場合
```bash
# ローカルビルドテスト
npm run build
npm run start
```

### 環境変数エラーの場合
- Vercel Dashboard > Project Settings > Environment Variables
- 正しいキー名・値を再確認

### Notion連携エラーの場合
- データベースID: `2e21c1974dad81bfad4ace49ca030e9e`
- MCP統合確認: Claude Code環境での動作

---

## 📞 次のアクション
1. 👆 上記ステップを実行
2. 📱 デプロイ完了後のURLを確認
3. 🧪 各機能の動作テスト
4. 🎉 本格運用開始

**デプロイが完了したらURLをお知らせください！**