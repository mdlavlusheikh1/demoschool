// Bengali Font Support for jsPDF
// This file will load Bengali fonts for PDF generation

import { jsPDF } from 'jspdf';

// Import font loader (registers fonts via events API)
import '@/lib/pdf-font-loader';

// Import base64 font files
// Note: Font files are stored separately to avoid large file issues
let SAYAM_RUPALI_BASE64: string | null = null;
let NOTO_SERIF_BENGALI_BASE64: string | null = null;

// Generic function to load font from file
async function loadFontFromFile(fontPath: string, cacheName: string): Promise<string | null> {
  // First check module-level cache
  const moduleCache = cacheName === 'SAYAM_RUPALI' ? SAYAM_RUPALI_BASE64 : NOTO_SERIF_BENGALI_BASE64;
  if (moduleCache) {
    console.log(`Using module-level cache for ${cacheName}`);
    return moduleCache;
  }
  
  // Then check shared global cache (from pdf-font-loader)
  const globalCache = (globalThis as any).fontCache;
  if (globalCache && globalCache[fontPath]) {
    const cachedFont = globalCache[fontPath];
    console.log(`Using global cache for ${fontPath}`);
    // Also update module cache for faster access
    if (cacheName === 'SAYAM_RUPALI') {
      SAYAM_RUPALI_BASE64 = cachedFont;
    } else if (cacheName === 'NOTO_SERIF_BENGALI') {
      NOTO_SERIF_BENGALI_BASE64 = cachedFont;
    }
    return cachedFont;
  }
  
  // If not in cache, load from file
  try {
    console.log(`Loading font from ${fontPath}`);
    const response = await fetch(fontPath, {
      cache: 'force-cache'
    });
    
    if (response.ok) {
      const base64 = await response.text();
      // Remove any whitespace/newlines/carriage returns
      const cleanedBase64 = base64.trim().replace(/\r?\n|\r/g, '').replace(/\s/g, '');
      
      // Validate it's a proper base64 string
      if (cleanedBase64.length > 100) {
        console.log(`Font loaded successfully. Length: ${cleanedBase64.length} characters`);
        
        // Cache in both module and global cache
        if (cacheName === 'SAYAM_RUPALI') {
          SAYAM_RUPALI_BASE64 = cleanedBase64;
        } else if (cacheName === 'NOTO_SERIF_BENGALI') {
          NOTO_SERIF_BENGALI_BASE64 = cleanedBase64;
        }
        
        // Also update global cache
        if (!(globalThis as any).fontCache) {
          (globalThis as any).fontCache = {};
        }
        (globalThis as any).fontCache[fontPath] = cleanedBase64;
        
        return cleanedBase64;
      } else {
        console.warn('Font file is too small or empty');
      }
    } else {
      console.warn(`Font file fetch failed with status: ${response.status}`);
    }
  } catch (e) {
    console.warn(`Font file not found: ${fontPath}`, e);
  }
  
  return null;
}

// Load Sayam Rupali font from file dynamically
async function loadSayamRupaliFont(): Promise<string | null> {
  return loadFontFromFile('/fonts/sayam-rupali-base64.txt', 'SAYAM_RUPALI');
}

// Load Noto Serif Bengali font from file dynamically
async function loadNotoSerifBengaliFont(): Promise<string | null> {
  return loadFontFromFile('/fonts/noto-serif-bengali-base64.txt', 'NOTO_SERIF_BENGALI');
}

/**
 * Register Bengali fonts with jsPDF
 * Call this function before creating any PDF
 * This function is async because it needs to load the font file
 * 
 * @param fontName - 'SayamRupali' or 'NotoSerifBengali' (default: 'SayamRupali')
 */
export async function registerBengaliFonts(doc: jsPDF, fontName: 'SayamRupali' | 'NotoSerifBengali' = 'SayamRupali') {
  // Check if fonts are already registered
  const registrationKey = `bengaliFontsRegistered_${fontName}`;
  if ((doc as any)[registrationKey]) {
    console.log(`Font ${fontName} already registered`);
    // Verify it's still available
    const fonts = (doc as any).getFontList();
    const fontDisplayName = fontName === 'SayamRupali' ? 'SayamRupali' : 'NotoSerifBengali';
    if (fonts && fonts[fontDisplayName]) {
      return; // Already registered and available
    } else {
      console.warn(`Font ${fontName} was marked as registered but not found, re-registering...`);
      (doc as any)[registrationKey] = false; // Reset flag to allow re-registration
    }
  }

  console.log(`Registering Bengali font: ${fontName}...`);
  
  let fontBase64: string | null = null;
  let fontFileName = '';
  let fontDisplayName = '';

  if (fontName === 'SayamRupali') {
    fontBase64 = await loadSayamRupaliFont();
    fontFileName = 'SayamRupali.ttf';
    fontDisplayName = 'SayamRupali';
  } else if (fontName === 'NotoSerifBengali') {
    fontBase64 = await loadNotoSerifBengaliFont();
    fontFileName = 'NotoSerifBengali-Regular.ttf';
    fontDisplayName = 'NotoSerifBengali';
  }
  
  if (!fontBase64) {
    const errorMsg = `⚠️ ${fontDisplayName} font file could not be loaded. Please check if the font file exists.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // Validate base64 string (should start with valid TTF header when decoded)
  if (fontBase64.length < 100) {
    const errorMsg = `⚠️ ${fontDisplayName} font file appears to be too small or invalid.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  try {
    console.log(`Adding ${fontDisplayName} to VFS... (Base64 length: ${fontBase64.length})`);
    
    // Clear any existing font with the same name first
    try {
      const existingFonts = (doc as any).getFontList();
      if (existingFonts && existingFonts[fontDisplayName]) {
        console.log(`⚠️ Font ${fontDisplayName} already exists, clearing first...`);
        // Note: jsPDF doesn't have a direct way to remove fonts, so we'll just re-add
      }
    } catch (e) {
      // Ignore errors when checking
    }
    
    // Add font to Virtual File System
    doc.addFileToVFS(fontFileName, fontBase64);
    console.log(`✅ Font file added to VFS`);
    
    // Wait a moment for VFS to process
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`Adding ${fontDisplayName} to jsPDF font registry...`);
    // Register the font with jsPDF
    // Important: fontDisplayName must match exactly what we'll use in setFont
    doc.addFont(fontFileName, fontDisplayName, 'normal');
    console.log(`✅ Font registered with name: ${fontDisplayName}`);
    
    // Also add bold variant (if available)
    try {
      doc.addFont(fontFileName, fontDisplayName, 'bold');
      console.log(`✅ Bold variant registered for ${fontDisplayName}`);
    } catch (e) {
      // Bold variant might not be available, that's okay
      console.log(`ℹ️ Bold variant not available for ${fontDisplayName} (this is normal)`);
    }
    
    // Wait for jsPDF to fully process the font registration
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verify font is available
    const fonts = (doc as any).getFontList();
    
    if (fonts) {
      const fontKeys = Object.keys(fonts);
      console.log('Available fonts after registration:', fontKeys);
      
      // Check if our font is in the list
      const hasFont = fonts[fontDisplayName];
      if (!hasFont) {
        // Try case-insensitive search
        const foundKey = fontKeys.find(k => k.toLowerCase() === fontDisplayName.toLowerCase());
        if (foundKey) {
          console.log(`✅ Found font with different case: ${foundKey}`);
          // Update fontDisplayName to match the actual key
          fontDisplayName = foundKey;
        } else {
          // Try partial match
          const foundVariation = fontKeys.find(k => 
            k.toLowerCase().includes(fontDisplayName.toLowerCase()) ||
            fontDisplayName.toLowerCase().includes(k.toLowerCase())
          );
          if (foundVariation) {
            console.log(`⚠️ Found font variation: ${foundVariation} (using this instead)`);
            fontDisplayName = foundVariation;
          } else {
            console.warn(`⚠️ ${fontDisplayName} not found in font list. Available fonts:`, fontKeys);
            // Still try to use it - jsPDF might accept it anyway
            console.warn(`⚠️ Attempting to use ${fontDisplayName} anyway...`);
          }
        }
      } else {
        console.log(`✅ ${fontDisplayName} verified in font list`);
      }
    } else {
      console.warn('⚠️ Could not retrieve font list');
    }
    
    // Mark as registered to avoid duplicate registration
    (doc as any)[registrationKey] = true;
    (doc as any)[`${registrationKey}_name`] = fontDisplayName; // Store actual font name used
    
    return fontDisplayName; // Return the actual font name that should be used
  } catch (error) {
    const errorMsg = `❌ Error registering ${fontDisplayName} font: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    console.error('Full error:', error);
    
    // Mark as failed to prevent retry loops
    (doc as any)[registrationKey] = 'failed';
    throw new Error(errorMsg);
  }
}

/**
 * Set Bengali font on jsPDF document
 * Falls back to default if font not available
 */
export function setBengaliFont(doc: jsPDF, fontName: string = 'SayamRupali', style: 'normal' | 'bold' = 'normal') {
  try {
    // Get list of available fonts
    const fontList = (doc as any).getFontList();
    
    // Check if our font is available
    if (fontList && fontList[fontName]) {
      // Font is available, use it
      doc.setFont(fontName, style);
    } else {
      // Font not available, check what fonts we have
      const availableFontNames = fontList ? Object.keys(fontList) : [];
      console.warn(`Font ${fontName} not available. Available fonts:`, availableFontNames);
      
      // Try to use the font anyway (jsPDF might still work)
      try {
        doc.setFont(fontName, style);
      } catch (e) {
        // If that fails, use helvetica as fallback
        console.warn(`Failed to set font ${fontName}, using helvetica fallback`);
        doc.setFont('helvetica', style);
      }
    }
  } catch (error) {
    console.warn('Error setting Bengali font, using default:', error);
    try {
      doc.setFont('helvetica', style);
    } catch (e) {
      // Last resort
      doc.setFont('helvetica');
    }
  }
}

