'use client';

import { useState, useEffect } from 'react';

interface SystemStatus {
  credentialsLoaded: boolean;
  anthropicConfigured: boolean;
  websocketConnected: boolean;
  playwrightReady: boolean;
}

interface SystemStatusProps {
  extractedProperties: number;
  websocketConnected?: boolean;
}

export default function SystemStatus({ extractedProperties, websocketConnected = false }: SystemStatusProps) {
  const [status, setStatus] = useState<SystemStatus>({
    credentialsLoaded: false,
    anthropicConfigured: false,
    websocketConnected: false,
    playwrightReady: false
  });

  useEffect(() => {
    checkSystemStatus();
  }, []);

  useEffect(() => {
    setStatus(prev => ({ ...prev, websocketConnected }));
  }, [websocketConnected]);

  const checkSystemStatus = async () => {
    try {
      // Check credentials
      const credResponse = await fetch('/api/credentials');
      const credentialsLoaded = credResponse.ok;

      // Check PDF analysis (Anthropic)
      const pdfResponse = await fetch('/api/pdf-analysis?action=test');
      const pdfData = await pdfResponse.json();
      const anthropicConfigured = pdfData.success && pdfData.data?.apiKeyConfigured;

      setStatus(prev => ({
        ...prev,
        credentialsLoaded,
        anthropicConfigured,
        playwrightReady: true // Assume ready if the app loaded
      }));
    } catch (error) {
      console.error('System status check failed:', error);
    }
  };

  const getStatusIcon = (isReady: boolean) => isReady ? '✅' : '⚠️';
  const getStatusColor = (isReady: boolean) => isReady ? 'text-green-400' : 'text-yellow-400';

  const overallHealth = Object.values(status).filter(Boolean).length / Object.values(status).length;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">🔧 システム状態</h3>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-300">Health:</div>
          <div className={`text-sm font-medium ${overallHealth >= 0.8 ? 'text-green-400' : overallHealth >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
            {Math.round(overallHealth * 100)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center space-x-2">
          <span>{getStatusIcon(status.credentialsLoaded)}</span>
          <span className={getStatusColor(status.credentialsLoaded)}>
            認証情報読み込み
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span>{getStatusIcon(status.anthropicConfigured)}</span>
          <span className={getStatusColor(status.anthropicConfigured)}>
            Claude API設定
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span>{getStatusIcon(status.websocketConnected)}</span>
          <span className={getStatusColor(status.websocketConnected)}>
            WebSocket接続
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span>{getStatusIcon(status.playwrightReady)}</span>
          <span className={getStatusColor(status.playwrightReady)}>
            ブラウザエンジン
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-600">
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">抽出済み物件:</span>
          <span className="text-blue-400 font-medium">
            {extractedProperties}件
          </span>
        </div>
      </div>

      {!status.anthropicConfigured && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-400/30 rounded text-xs text-yellow-300">
          ⚠️ Anthropic API keyが設定されていません。PDF解析機能が利用できません。
        </div>
      )}

      {!status.credentialsLoaded && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-400/30 rounded text-xs text-yellow-300">
          ⚠️ 認証情報ファイルが見つかりません。デモモードで実行されます。
        </div>
      )}
    </div>
  );
}