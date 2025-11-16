// Font loader using jsPDF events API
// This file registers fonts when jsPDF is imported

import { jsPDF } from 'jspdf';

// Cache for loaded fonts
const fontCache: { [key: string]: string | null } = {};

// Load fonts from base64 files synchronously (for events API)
// Note: We'll preload fonts when the module loads
function loadFontBase64Sync(fontPath: string): string | null {
  // Check cache first
  if (fontCache[fontPath] !== undefined) {
    return fontCache[fontPath];
  }
  
  // For events API, fonts need to be loaded beforehand
  // We'll use a synchronous fetch with a promise that resolves immediately
  // In practice, fonts should be pre-loaded or embedded
  console.warn(`Font ${fontPath} needs to be pre-loaded for events API`);
  fontCache[fontPath] = null;
  return null;
}

// Alternative: Pre-load fonts and store in cache
async function preloadFonts() {
  const fonts = [
    { path: '/fonts/sayam-rupali-base64.txt', name: 'SayamRupali', file: 'SayamRupali.ttf' },
    { path: '/fonts/noto-serif-bengali-base64.txt', name: 'NotoSerifBengali', file: 'NotoSerifBengali-Regular.ttf' }
  ];
  
  for (const font of fonts) {
    try {
      const response = await fetch(font.path, { cache: 'force-cache' });
      if (response.ok) {
        const base64 = await response.text();
        const cleanedBase64 = base64.trim().replace(/\r?\n|\r/g, '');
        fontCache[font.path] = cleanedBase64;
        console.log(`✅ Pre-loaded font: ${font.name}`);
      }
    } catch (e) {
      fontCache[font.path] = null;
      console.warn(`⚠️ Could not pre-load font: ${font.name}`, e);
    }
  }
}

// Pre-load fonts immediately (non-blocking)
const fontLoadingPromise = preloadFonts();

// Export function to ensure fonts are loaded
export async function ensureFontsLoaded(): Promise<void> {
  await fontLoadingPromise;
}

// Register fonts using jsPDF events API
// This runs when jsPDF is imported and fonts are requested
jsPDF.API.events.push([
  'addFonts',
  function () {
    try {
      // Sayam Rupali font
      const sayamRupaliBase64 = fontCache['/fonts/sayam-rupali-base64.txt'];
      if (sayamRupaliBase64 && sayamRupaliBase64.length > 100) {
        try {
          this.addFileToVFS('SayamRupali.ttf', sayamRupaliBase64);
          this.addFont('SayamRupali.ttf', 'SayamRupali', 'normal');
          console.log('✅ Sayam Rupali font registered via events API');
        } catch (e) {
          console.warn('⚠️ Error registering Sayam Rupali via events API:', e);
        }
      } else {
        console.warn('⚠️ Sayam Rupali font not loaded yet in cache or invalid');
      }
      
      // Noto Serif Bengali font
      const notoSerifBengaliBase64 = fontCache['/fonts/noto-serif-bengali-base64.txt'];
      if (notoSerifBengaliBase64 && notoSerifBengaliBase64.length > 100) {
        try {
          this.addFileToVFS('NotoSerifBengali-Regular.ttf', notoSerifBengaliBase64);
          this.addFont('NotoSerifBengali-Regular.ttf', 'NotoSerifBengali', 'normal');
          console.log('✅ Noto Serif Bengali font registered via events API');
        } catch (e) {
          console.warn('⚠️ Error registering Noto Serif Bengali via events API:', e);
        }
      } else {
        console.warn('⚠️ Noto Serif Bengali font not loaded yet in cache or invalid');
      }
    } catch (error) {
      console.warn('Error registering fonts via events API:', error);
    }
  }
]);

// Export for backward compatibility
export { jsPDF };

