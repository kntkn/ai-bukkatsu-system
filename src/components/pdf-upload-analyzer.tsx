'use client';

import { useState, useRef } from 'react';
import { PropertyInfo, PdfAnalysisResult, AnalysisProgress } from '@/types/pdf-analysis';

interface PdfUploadAnalyzerProps {
  onAnalysisComplete?: (properties: PropertyInfo[]) => void;
  onError?: (error: string) => void;
}

export default function PdfUploadAnalyzer({ onAnalysisComplete, onError }: PdfUploadAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [results, setResults] = useState<PropertyInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length !== files.length) {
      alert(`${files.length - pdfFiles.length}個のファイルがPDFではないため除外されました`);
    }

    setSelectedFiles(pdfFiles);
    setResults([]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('PDFファイルを選択してください');
      return;
    }

    setIsAnalyzing(true);
    setProgress({
      stage: 'uploading',
      progress: 0,
      message: 'ファイルをアップロード中...'
    });

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      // プログレス更新のシミュレーション
      setProgress({
        stage: 'uploading',
        progress: 30,
        message: `${selectedFiles.length}個のPDFファイルをアップロード中...`
      });

      const response = await fetch('/api/pdf-analysis', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setProgress({
          stage: 'completed',
          progress: 100,
          message: data.message
        });

        setResults(data.data.properties);
        onAnalysisComplete?.(data.data.properties);
        
        console.log('📊 Analysis Summary:', data.data.summary);
      } else {
        throw new Error(data.message || 'アップロードに失敗しました');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Upload error:', error);
      
      setProgress({
        stage: 'error',
        progress: 0,
        message: errorMessage
      });
      
      onError?.(errorMessage);
    } finally {
      setIsAnalyzing(false);
      
      // 数秒後にプログレス表示をクリア
      setTimeout(() => {
        setProgress(null);
      }, 3000);
    }
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setResults([]);
    setProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getProgressColor = () => {
    if (!progress) return 'bg-blue-600';
    
    switch (progress.stage) {
      case 'error': return 'bg-red-600';
      case 'completed': return 'bg-green-600';
      default: return 'bg-blue-600';
    }
  };

  const getProgressIcon = () => {
    if (!progress) return '📄';
    
    switch (progress.stage) {
      case 'uploading': return '⬆️';
      case 'parsing': return '📖';
      case 'analyzing': return '🤖';
      case 'extracting': return '🔍';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2 dark:text-white">📄 マイソク PDF 解析</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          不動産マイソク（PDF）をアップロードすると、AIが自動的に物件情報を抽出します。
          複数ファイルの一括アップロードに対応しています。
        </p>
      </div>

      {/* File Upload Area */}
      <div className="mb-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept=".pdf"
          disabled={isAnalyzing}
          className="hidden"
        />
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isAnalyzing 
              ? 'border-gray-300 bg-gray-100 cursor-not-allowed' 
              : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'
            }`}
        >
          <div className="text-4xl mb-3">📁</div>
          <p className="text-lg font-medium dark:text-white">
            {selectedFiles.length > 0 
              ? `${selectedFiles.length}個のPDFファイルを選択中`
              : 'PDFファイルを選択またはドラッグ＆ドロップ'
            }
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            複数ファイル対応 • 最大サイズ: 10MB/ファイル
          </p>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2 dark:text-white">選択されたファイル:</h4>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center space-x-2">
                    <span>📄</span>
                    <span className="text-sm dark:text-gray-300">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress Display */}
      {progress && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">{getProgressIcon()}</span>
            <div className="flex-1">
              <p className="font-medium dark:text-white">{progress.message}</p>
              {progress.currentPage && progress.totalPages && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  ページ {progress.currentPage}/{progress.totalPages}
                </p>
              )}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 text-right">
            {progress.progress}%
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3 mb-6">
        <button
          onClick={handleUpload}
          disabled={isAnalyzing || selectedFiles.length === 0}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <span>{isAnalyzing ? '🤖' : '🚀'}</span>
          <span>{isAnalyzing ? '解析中...' : 'AI解析開始'}</span>
        </button>
        
        {selectedFiles.length > 0 && !isAnalyzing && (
          <button
            onClick={clearFiles}
            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            クリア
          </button>
        )}
      </div>

      {/* Results Display */}
      {results.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
          <h4 className="text-lg font-semibold mb-4 dark:text-white">
            📊 解析結果 ({results.length}件の物件)
          </h4>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {results.map((property, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">物件名:</span>
                    <p className="dark:text-white">{property.propertyName || '不明'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">号室:</span>
                    <p className="dark:text-white">{property.roomNumber || '不明'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">住所:</span>
                    <p className="dark:text-white">{property.address || '不明'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">管理会社:</span>
                    <p className="dark:text-white">{property.managementCompany || '不明'}</p>
                  </div>
                  {property.floorPlan && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">間取り:</span>
                      <p className="dark:text-white">{property.floorPlan}</p>
                    </div>
                  )}
                  {property.rent && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">賃料:</span>
                      <p className="dark:text-white">{property.rent}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}