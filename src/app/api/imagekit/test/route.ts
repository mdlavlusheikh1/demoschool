import { NextRequest, NextResponse } from 'next/server';
import imagekit from '@/lib/imagekit';

export async function GET(request: NextRequest) {
  console.log('🧪 Testing ImageKit configuration...');

  if (!imagekit) {
    return NextResponse.json({
      status: 'error',
      message: 'ImageKit not initialized',
      details: 'Check environment variables and server restart'
    });
  }

  try {
    // Test the connection by getting account details
    const account = await imagekit.getAuthenticationParameters();

    return NextResponse.json({
      status: 'success',
      message: 'ImageKit is working correctly',
      account: {
        hasToken: !!account.token,
        hasSignature: !!account.signature,
        hasExpire: !!account.expire,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('ImageKit test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'ImageKit credentials are invalid',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
