'use client';

import { useState } from 'react';
import LiveBrowserMirror from '@/components/live-browser-mirror';
import PdfUploadAnalyzer from '@/components/pdf-upload-analyzer';
import { BrowserMirrorState } from '@/types/browser-mirror';
import { PropertyInfo } from '@/types/pdf-analysis';

export default function Home() {
  const [systemState, setSystemState] = useState<BrowserMirrorState | null>(null);
  const [extractedProperties, setExtractedProperties] = useState<PropertyInfo[]>([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">🏠</div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI物確システム</h1>
                <p className="text-gray-300 text-sm">不動産仲介業務完全自動化プラットフォーム</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {systemState && (
                <div className="text-right">
                  <p className="text-white font-medium">System Status</p>
                  <p className="text-sm text-gray-300 capitalize">{systemState.status}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Feature Introduction */}
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            🤖 AI エージェント・ライブビューア
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            AIが不動産サイトを巡回して物確作業を実行する様子を、
            <span className="text-blue-400 font-semibold">リアルタイムで可視化</span>します。
            まるで機械式時計の精密な動きを見るように、
            <span className="text-purple-400 font-semibold">AIの思考プロセス</span>を透明化します。
          </p>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-white mb-2">スケルトン・ビュー</h3>
            <p className="text-gray-300 text-sm">
              AIの内部処理を透明化。ブラウザ操作、思考プロセス、判断基準まで全て可視化
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold text-white mb-2">リアルタイム実行</h3>
            <p className="text-gray-300 text-sm">
              複数サイトを並行処理。WebSocket通信で遅延なくライブストリーミング配信
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold text-white mb-2">完全自動化</h3>
            <p className="text-gray-300 text-sm">
              PDF解析から結果出力まで。人間の介入なしで物確業務を完全自動実行
            </p>
          </div>
        </div>

        {/* PDF Upload & Analysis */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 mb-8">
          <PdfUploadAnalyzer 
            onAnalysisComplete={(properties) => {
              setExtractedProperties(properties);
              console.log('📊 Properties extracted:', properties);
            }}
            onError={(error) => {
              console.error('PDF Analysis Error:', error);
              alert(`PDF解析エラー: ${error}`);
            }}
          />
          
          {extractedProperties.length > 0 && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
              <h4 className="text-green-400 font-semibold mb-2">
                ✅ {extractedProperties.length}件の物件情報が抽出されました
              </h4>
              <p className="text-green-300 text-sm">
                「Start Demo」ボタンをクリックして、これらの物件の空室確認を自動実行できます。
              </p>
            </div>
          )}
        </div>

        {/* Live Browser Mirror */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
          <LiveBrowserMirror onStateChange={setSystemState} />
        </div>

        {/* Demo Instructions */}
        <div className="mt-8 bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="text-2xl">💡</div>
            <h3 className="text-lg font-semibold text-white">デモの実行方法</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-white mb-2">1. PDF解析</h4>
              <p className="text-gray-300 text-sm mb-3">
                マイソク（PDF）をアップロードすると、Claude AIが物件情報を自動抽出。
                複数ファイルの一括処理に対応しています。
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">2. AI物確実行</h4>
              <p className="text-gray-300 text-sm mb-3">
                「Start Demo」で抽出された物件の空室確認を自動実行。
                複数サイトを並行チェックします。
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">3. リアルタイム監視</h4>
              <p className="text-gray-300 text-sm mb-3">
                AIの作業画面をライブ配信。
                思考プロセス・判断基準まで完全可視化します。
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
            <h4 className="font-medium text-white mb-2">📋 デモ処理内容</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• サンプル物件: 「アークヒルズ仙石山森タワー 3A」</li>
              <li>• 対象サイト: ITANDI BB、いえらぶBB</li>
              <li>• 処理時間: 約2-3分（サイトアクセス + 検索 + 結果分析）</li>
              <li>• 出力: 空室状況、最終更新日時、情報ソース</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-black/20 backdrop-blur-lg border-t border-white/10">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              🤖 AI物確システム - 次世代不動産テクノロジー
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Playwright + Anthropic Claude + Next.js で実現するスケルトン・デモシステム
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}