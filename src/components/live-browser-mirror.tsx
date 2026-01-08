'use client';

import { useEffect, useState, useRef } from 'react';
import { BrowserMirrorState, PropertySearchTask, WebSocketMessage } from '@/types/browser-mirror';
import { PropertyInfo } from '@/types/pdf-analysis';

interface LiveBrowserMirrorProps {
  onStateChange?: (state: BrowserMirrorState) => void;
  extractedProperties?: PropertyInfo[];
}

export default function LiveBrowserMirror({ onStateChange, extractedProperties }: LiveBrowserMirrorProps) {
  const [state, setState] = useState<BrowserMirrorState>({
    status: 'idle',
    currentSite: '',
    currentAction: 'Ready to start...',
    screenshot: null,
    aiThought: 'AI agent is ready for property verification',
    progress: { current: 0, total: 0, siteName: '' }
  });

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      // Connect to WebSocket server
      wsRef.current = new WebSocket('ws://localhost:8080');
      
      wsRef.current.onopen = () => {
        console.log('🔗 Connected to browser mirror');
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'browser_state') {
            const browserData = message.data as BrowserMirrorState;
            const newState = { ...state, ...browserData };
            setState(newState);
            onStateChange?.(newState);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔌 Disconnected from browser mirror');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const convertToPropertyTasks = (properties: PropertyInfo[]): PropertySearchTask[] => {
    return properties.map((prop, index) => ({
      id: `extracted-${index + 1}`,
      propertyName: prop.propertyName,
      roomNumber: prop.roomNumber,
      address: prop.address,
      managementCompany: prop.managementCompany,
      status: 'pending' as const
    }));
  };

  const startDemo = () => {
    if (!wsRef.current || !isConnected) return;

    let propertiesToVerify: PropertySearchTask[];

    if (extractedProperties && extractedProperties.length > 0) {
      // Use extracted properties from PDF analysis
      propertiesToVerify = convertToPropertyTasks(extractedProperties);
      console.log(`🏠 Starting verification with ${propertiesToVerify.length} extracted properties`);
    } else {
      // Fallback to demo properties
      propertiesToVerify = [
        {
          id: '1',
          propertyName: 'アークヒルズ仙石山森タワー',
          roomNumber: '3A',
          address: '東京都港区六本木1-9-10',
          managementCompany: '森ビル',
          status: 'pending'
        },
        {
          id: '2', 
          propertyName: 'パークコート赤坂檜町ザタワー',
          roomNumber: '15B',
          address: '東京都港区赤坂9-6-35',
          managementCompany: '三井不動産',
          status: 'pending'
        }
      ];
      console.log('📝 Using demo properties (no PDF data available)');
    }

    wsRef.current.send(JSON.stringify({
      type: 'start_verification',
      properties: propertiesToVerify
    }));
  };

  const stopDemo = () => {
    if (!wsRef.current || !isConnected) return;

    wsRef.current.send(JSON.stringify({
      type: 'stop_verification'
    }));
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'idle': return 'text-gray-500';
      case 'connecting': return 'text-yellow-500';
      case 'running': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case 'idle': return '⚪';
      case 'connecting': return '🟡';
      case 'running': return '🟢';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 text-white p-6 rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">🤖 AI Browser Mirror</h2>
          <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
            <span>{getStatusIcon()}</span>
            <span className="capitalize font-medium">{state.status}</span>
          </div>
        </div>
        
        <div className="flex space-x-3">
          {!isConnected ? (
            <button
              onClick={connectWebSocket}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              🔄 Reconnect
            </button>
          ) : (
            <>
              <button
                onClick={startDemo}
                disabled={state.status === 'running'}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 
                  ${extractedProperties && extractedProperties.length > 0 
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600' 
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600'
                  }`}
              >
                <span>{extractedProperties && extractedProperties.length > 0 ? '🏠' : '▶️'}</span>
                <span>
                  {extractedProperties && extractedProperties.length > 0 
                    ? `物確実行 (${extractedProperties.length}件)` 
                    : 'Start Demo'
                  }
                </span>
              </button>
              <button
                onClick={stopDemo}
                disabled={state.status !== 'running'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition-colors"
              >
                ⏹️ Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {state.progress.total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress: {state.progress.current}/{state.progress.total}</span>
            <span>{state.progress.siteName}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(state.progress.current / state.progress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 h-[calc(100%-140px)]">
        {/* Live Browser View */}
        <div className="col-span-2 bg-black rounded-lg overflow-hidden relative">
          <div className="bg-gray-800 px-4 py-2 text-sm font-medium border-b border-gray-700">
            🌐 Live Browser View: {state.currentSite || 'Waiting...'}
          </div>
          
          <div className="h-full flex items-center justify-center">
            {state.screenshot ? (
              <img 
                src={state.screenshot} 
                alt="Live browser screenshot"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">🖥️</div>
                <p>Waiting for browser to start...</p>
                <p className="text-sm mt-2">Click "Start Demo" to begin</p>
              </div>
            )}
          </div>

          {state.status === 'running' && (
            <div className="absolute top-4 right-4 bg-red-600 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>LIVE</span>
            </div>
          )}
        </div>

        {/* AI Thoughts Panel */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">🧠 AI Thoughts</h3>
            <div className="bg-gray-900 p-3 rounded-lg min-h-[100px]">
              <p className="text-green-400 text-sm leading-relaxed">
                {state.aiThought}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">⚡ Current Action</h3>
            <div className="bg-gray-900 p-3 rounded-lg">
              <p className="text-blue-400 text-sm">
                {state.currentAction}
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="mt-auto">
            <h3 className="text-lg font-semibold mb-2">🔗 Connection</h3>
            <div className={`p-3 rounded-lg ${isConnected ? 'bg-green-900' : 'bg-red-900'}`}>
              <p className="text-sm">
                {isConnected ? '✅ Connected to AI engine' : '❌ Disconnected'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}