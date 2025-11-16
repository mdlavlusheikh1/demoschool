import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy API route to hide ImageKit URLs from public
 * Usage: /api/proxy/[encoded_url]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    // Handle both Promise and direct params (for Next.js compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    
    // Reconstruct the encoded URL from path segments
    const encodedUrl = resolvedParams.path.join('/');
    
    if (!encodedUrl) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    // Decode the URL (it was base64 encoded, then made URL-safe)
    let actualUrl: string;
    try {
      // Convert URL-safe base64 back to standard base64
      // Replace - with +, _ with /, and add padding if needed
      let standardBase64 = encodedUrl
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Add padding if needed (base64 strings should be multiples of 4)
      const padLength = (4 - (standardBase64.length % 4)) % 4;
      standardBase64 += '='.repeat(padLength);
      
      // Decode from base64
      actualUrl = Buffer.from(standardBase64, 'base64').toString('utf-8');
    } catch (decodeError) {
      console.error('Error decoding proxy URL:', decodeError);
      return NextResponse.json(
        { error: 'Invalid URL encoding', details: decodeError instanceof Error ? decodeError.message : 'Unknown error' },
        { status: 400 }
      );
    }

    // Validate that it's an ImageKit URL (security measure)
    if (!actualUrl.includes('imagekit.io') && !actualUrl.includes('ik.imagekit.io')) {
      // Allow other URLs too, but log for security
      console.warn('⚠️ Proxy request for non-ImageKit URL:', actualUrl);
    }

    // Fetch the resource from ImageKit
    const response = await fetch(actualUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
      },
      // Add cache control for better performance
      cache: 'force-cache',
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch resource:', actualUrl, response.status);
      return NextResponse.json(
        { error: 'Failed to fetch resource', status: response.status },
        { status: response.status }
      );
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    
    // Get the file content
    const buffer = await response.arrayBuffer();

    // Return the file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength || buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

