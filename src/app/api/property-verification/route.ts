import { NextRequest, NextResponse } from 'next/server';
import { PdfAnalyzer } from '@/lib/pdf-analyzer';
import { PropertySearchEngine } from '@/lib/property-search-engine';
import { CredentialsManager } from '@/lib/credentials-manager';

interface PropertyVerificationRequest {
  action: 'upload-and-verify' | 'verify-properties';
  properties?: Array<{
    propertyName: string;
    roomNumber: string;
    address: string;
    managementCompany: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PropertyVerificationRequest;

    if (body.action === 'verify-properties' && body.properties) {
      // 直接物件データが提供された場合の処理
      return await verifyProperties(body.properties);
    }

    // PDF アップロードからの処理は別途実装
    return NextResponse.json({
      error: 'Invalid action or missing data',
      message: 'サポートされていないアクションです'
    }, { status: 400 });

  } catch (error) {
    console.error('Property verification error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: '物件確認処理中にエラーが発生しました'
    }, { status: 500 });
  }
}

async function verifyProperties(properties: Array<{
  propertyName: string;
  roomNumber: string;
  address: string;
  managementCompany: string;
}>) {
  const results = [];
  
  // 認証情報を取得
  const credentialsManager = await CredentialsManager.autoDetectCredentialsFile();
  
  for (const property of properties) {
    console.log(`🔍 物件確認開始: ${property.propertyName} ${property.roomNumber}`);
    
    const searchEngine = new PropertySearchEngine(credentialsManager);
    const verificationResult = await searchEngine.verifyProperty({
      ...property,
      id: `${property.propertyName}-${property.roomNumber}`.replace(/\s/g, '-')
    });

    results.push({
      property,
      result: verificationResult,
      timestamp: new Date().toISOString()
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      results,
      summary: {
        total: results.length,
        available: results.filter(r => r.result.status === 'available').length,
        occupied: results.filter(r => r.result.status === 'occupied').length,
        unknown: results.filter(r => r.result.status === 'unknown').length,
        errors: results.filter(r => r.result.status === 'error').length
      }
    },
    message: `${results.length}件の物件確認が完了しました`
  });
}