import ImageKit from 'imagekit';

// Check if ImageKit credentials are configured
const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

console.log('🔧 Checking ImageKit configuration...');
console.log('🔑 Public Key:', publicKey ? '✅ Set' : '❌ Missing');
console.log('🔒 Private Key:', privateKey ? '✅ Set' : '❌ Missing');
console.log('🌐 URL Endpoint:', urlEndpoint ? '✅ Set' : '❌ Missing');

if (!publicKey || !privateKey || !urlEndpoint) {
  const missing = [];
  if (!publicKey) missing.push('NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY');
  if (!privateKey) missing.push('IMAGEKIT_PRIVATE_KEY');
  if (!urlEndpoint) missing.push('NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT');

  console.warn('❌ ImageKit credentials not configured. Missing:', missing.join(', '));
  console.warn('📝 Please set the missing environment variables in your .env.local file');
  console.warn('📝 Image upload features will not work until ImageKit is properly configured.');
}

// Initialize ImageKit only if credentials are available
let imagekit: ImageKit | null = null;
if (publicKey && privateKey && urlEndpoint) {
  try {
    console.log('🚀 Initializing ImageKit...');
    imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
    console.log('✅ ImageKit initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize ImageKit:', error);
  }
}

export default imagekit;