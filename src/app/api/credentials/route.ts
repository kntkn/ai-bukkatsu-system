import { NextRequest, NextResponse } from 'next/server';
import { CredentialsManager } from '@/lib/credentials-manager';

let credentialsManager: CredentialsManager | null = null;

export async function GET(request: NextRequest) {
  try {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    // 本番環境ではデモモードとして動作
    if (isProduction) {
      return NextResponse.json({ 
        success: true,
        data: [
          { siteName: 'ITANDI BB', url: 'https://bb.itandi.net', username: 'demo_user', notes: 'デモモード' },
          { siteName: 'いえらぶBB', url: 'https://bb.ielove.co.jp', username: 'demo_user', notes: 'デモモード' }
        ],
        count: 2,
        demoMode: true,
        message: 'Running in production demo mode'
      });
    }
    
    // 初回アクセス時に認証情報ファイルを自動検出
    if (!credentialsManager) {
      credentialsManager = await CredentialsManager.autoDetectCredentialsFile();
      
      if (!credentialsManager) {
        return NextResponse.json(
          { 
            error: 'No credentials file found',
            message: 'Could not find credentials file (funt IDpass.xlsx or similar) in desktop folder' 
          }, 
          { status: 404 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const siteName = searchParams.get('site');

    if (siteName) {
      // 特定サイトの認証情報を取得
      const credential = await credentialsManager.getCredentialsForSite(siteName);
      
      if (!credential) {
        return NextResponse.json(
          { 
            error: 'Site not found',
            message: `No credentials found for site: ${siteName}` 
          }, 
          { status: 404 }
        );
      }

      return NextResponse.json({ 
        success: true,
        data: credential 
      });
    } else {
      // 全サイトの認証情報を取得（パスワードは除く）
      const credentials = await credentialsManager.getAllCredentials();
      
      const publicCredentials = credentials.map(cred => ({
        siteName: cred.siteName,
        url: cred.url,
        username: cred.username,
        notes: cred.notes
        // パスワードは除外
      }));

      return NextResponse.json({ 
        success: true,
        data: publicCredentials,
        count: credentials.length
      });
    }
  } catch (error) {
    console.error('Credentials API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'refresh') {
      // キャッシュをクリアして再読み込み
      credentialsManager?.clearCache();
      
      // 再検出
      credentialsManager = await CredentialsManager.autoDetectCredentialsFile();
      
      if (!credentialsManager) {
        return NextResponse.json(
          { 
            error: 'No credentials file found',
            message: 'Could not find credentials file after refresh' 
          }, 
          { status: 404 }
        );
      }

      const credentials = await credentialsManager.getAllCredentials();
      
      return NextResponse.json({ 
        success: true,
        message: 'Credentials refreshed successfully',
        count: credentials.length
      });
    }

    return NextResponse.json(
      { 
        error: 'Invalid action',
        message: 'Supported actions: refresh' 
      }, 
      { status: 400 }
    );

  } catch (error) {
    console.error('Credentials POST error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}