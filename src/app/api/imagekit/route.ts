import { NextRequest, NextResponse } from 'next/server';
import imagekit from '@/lib/imagekit';

export async function GET(request: NextRequest) {
  console.log('🔐 ImageKit auth request received');

  if (!imagekit) {
    console.error('❌ ImageKit not initialized');
    return NextResponse.json(
      {
        error: 'ImageKit credentials not configured',
        message: 'Please set up ImageKit environment variables to enable image uploads',
        details: 'Missing NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, or NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT'
      },
      { status: 503 }
    );
  }

  try {
    console.log('🔐 Generating ImageKit authentication parameters...');

    // Generate authentication parameters for client-side uploads
    const authenticationParameters = imagekit.getAuthenticationParameters();
    console.log('✅ Auth parameters generated successfully');

    return NextResponse.json(authenticationParameters);
  } catch (error) {
    console.error('🚨 ImageKit auth error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate authentication parameters',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}