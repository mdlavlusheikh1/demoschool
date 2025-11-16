import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'src', 'lib', 'data', 'bangladesh-locations.json');
    const fileContents = await readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading location data:', error);
    return NextResponse.json(
      { error: 'Failed to load location data' },
      { status: 500 }
    );
  }
}

