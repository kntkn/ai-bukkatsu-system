'use client';

import { useState, useRef } from 'react';
import { PropertyInfo } from '@/types/pdf-analysis';

interface VerificationResult {
  property: PropertyInfo;
  result: {
    status: 'available' | 'occupied' | 'unknown' | 'error';
    source: string;
    details: string;
    contactInfo?: string;
    lastUpdated: string;
    searchSteps: Array<{
      site: string;
      action: string;
      result: string;
      timestamp: string;
    }>;
  };
  timestamp: string;
}

export default function PropertyVerificationApp() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedProperties, setExtractedProperties] = useState<PropertyInfo[]>([]);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'extract' | 'verify' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setCurrentStep('extract');

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch('/api/pdf-analysis', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('PDF解析に失敗しました');
      }

      const result = await response.json();
      
      if (result.success && result.data.properties) {
        setExtractedProperties(result.data.properties);
        setCurrentStep('verify');
        
        // 自動的に物件確認を開始
        await startVerification(result.data.properties);
      } else {
        throw new Error(result.message || 'PDF解析に失敗しました');
      }

    } catch (error) {
      console.error('Upload error:', error);
      alert(`エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const startVerification = async (properties: PropertyInfo[]) => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/property-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify-properties',
          properties: properties,
        }),
      });

      if (!response.ok) {
        throw new Error('物件確認に失敗しました');
      }

      const result = await response.json();
      
      if (result.success && result.data.results) {
        setVerificationResults(result.data.results);
        setCurrentStep('complete');
      } else {
        throw new Error(result.message || '物件確認に失敗しました');
      }

    } catch (error) {
      console.error('Verification error:', error);
      alert(`エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return '✅';
      case 'occupied': return '❌';
      case 'unknown': return '❓';
      case 'error': return '⚠️';
      default: return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50 border-green-200';
      case 'occupied': return 'text-red-600 bg-red-50 border-red-200';
      case 'unknown': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const resetApp = () => {
    setExtractedProperties([]);
    setVerificationResults([]);
    setCurrentStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🏠 AI物件確認システム</h1>
        <p className="text-gray-600">PDF → AI解析 → ITANDI・いえらぶ自動確認</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex justify-center">
        <div className="flex items-center space-x-4">
          {['upload', 'extract', 'verify', 'complete'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${currentStep === step ? 'bg-blue-600 text-white' : 
                  ['upload', 'extract', 'verify', 'complete'].indexOf(currentStep) > index ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                {index + 1}
              </div>
              {index < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  ['upload', 'extract', 'verify', 'complete'].indexOf(currentStep) > index ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: File Upload */}
      {currentStep === 'upload' && (
        <div className="mb-8">
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept=".pdf"
              disabled={isProcessing}
              className="hidden"
            />
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-bold mb-2">PDFファイルをアップロード</h3>
            <p className="text-gray-600 mb-4">
              不動産マイソクのPDFをアップロードしてください（複数ファイル対応）
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? '処理中...' : 'ファイルを選択'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Extracted Properties */}
      {(currentStep === 'extract' || currentStep === 'verify' || currentStep === 'complete') && extractedProperties.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">📋 抽出された物件情報</h3>
          <div className="grid gap-4">
            {extractedProperties.map((property, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-lg">{property.propertyName}</h4>
                    <p className="text-gray-600">{property.roomNumber} | {property.address}</p>
                    <p className="text-sm text-gray-500">管理会社: {property.managementCompany}</p>
                  </div>
                  <div className="text-2xl">🏢</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {(currentStep === 'extract' || currentStep === 'verify') && isProcessing && (
        <div className="mb-8 text-center">
          <div className="inline-flex items-center space-x-3 bg-blue-50 px-6 py-3 rounded-lg">
            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-blue-800 font-medium">
              {currentStep === 'extract' ? 'AI解析中...' : 'ITANDI・いえらぶ確認中...'}
            </span>
          </div>
        </div>
      )}

      {/* Step 4: Verification Results */}
      {currentStep === 'complete' && verificationResults.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">🎯 物件確認結果</h3>
            <button
              onClick={resetApp}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              新しい確認を開始
            </button>
          </div>
          
          <div className="grid gap-4">
            {verificationResults.map((item, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getStatusColor(item.result.status)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-lg flex items-center">
                      {getStatusIcon(item.result.status)}
                      <span className="ml-2">{item.property.propertyName} {item.property.roomNumber}</span>
                    </h4>
                    <p className="text-sm opacity-80">{item.property.address}</p>
                  </div>
                  <div className="text-sm opacity-70">
                    {new Date(item.timestamp).toLocaleString('ja-JP')}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="font-medium">📊 確認結果: {item.result.details}</p>
                  <p className="text-sm opacity-80">情報源: {item.result.source}</p>
                  {item.result.contactInfo && (
                    <p className="text-sm opacity-80 mt-1">📞 {item.result.contactInfo}</p>
                  )}
                </div>

                {/* Search Steps */}
                <div className="border-t pt-3 opacity-80">
                  <p className="text-sm font-medium mb-2">確認手順:</p>
                  <div className="space-y-1">
                    {item.result.searchSteps.map((step, stepIndex) => (
                      <div key={stepIndex} className="text-xs flex items-center space-x-2">
                        <span className="font-medium">{step.site}:</span>
                        <span>{step.action}</span>
                        <span>→</span>
                        <span>{step.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-bold mb-2">📈 確認サマリー</h4>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {verificationResults.filter(r => r.result.status === 'available').length}
                </div>
                <div className="text-sm text-gray-600">空室あり</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {verificationResults.filter(r => r.result.status === 'occupied').length}
                </div>
                <div className="text-sm text-gray-600">満室</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {verificationResults.filter(r => r.result.status === 'unknown').length}
                </div>
                <div className="text-sm text-gray-600">要確認</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {verificationResults.filter(r => r.result.status === 'error').length}
                </div>
                <div className="text-sm text-gray-600">エラー</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}