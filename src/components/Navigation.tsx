'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { settingsQueries, SystemSettings } from '@/lib/database-queries';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Load settings once (optimized for public pages)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Cache settings in sessionStorage for faster subsequent loads
        const cachedSettings = sessionStorage.getItem('nav_settings');
        const cacheTime = sessionStorage.getItem('nav_settings_time');
        const now = Date.now();
        
        // Use cached settings if less than 5 minutes old
        if (cachedSettings && cacheTime && (now - parseInt(cacheTime)) < 5 * 60 * 1000) {
          try {
            setSettings(JSON.parse(cachedSettings));
            setLoading(false);
            return;
          } catch (e) {
            // If cache is invalid, continue to fetch
          }
        }
        
        // Fetch settings
        const data = await settingsQueries.getSettings();
        if (data) {
          setSettings(data);
          // Cache settings
          sessionStorage.setItem('nav_settings', JSON.stringify(data));
          sessionStorage.setItem('nav_settings_time', now.toString());
        }
      } catch (error) {
        console.error('Error loading settings in Navigation:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Only show navigation on public pages, hide on admin/user pages
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth') || pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/parent')) {
    return null;
  }

  const handleLoginClick = () => {
    router.push('/auth/login');
  };

  // Content
  const content = {
    bn: {
      nav: {
        home: 'হোম',
        notice: 'নোটিশ',
        admission: 'ভর্তি',
        homework: 'বাড়ির কাজ',
        results: 'ফলাফল',
        questions: 'প্রশ্ন',
        gallery: 'গ্যালারী',
        about: 'পরিচিতি',
        contact: 'যোগাযোগ',
        login: 'লগইন'
      }
    },
    en: {
      nav: {
        home: 'Home',
        notice: 'Notice',
        admission: 'Admission',
        homework: 'Homework',
        results: 'Results',
        questions: 'Questions',
        gallery: 'Gallery',
        about: 'About',
        contact: 'Contact',
        login: 'Login'
      }
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 fixed w-full top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3">
            {(settings as any)?.websiteLogo ? (
              <img
                src={(settings as any).websiteLogo}
                alt={(settings as any).schoolName || 'Logo'}
                className="h-14 w-auto max-w-[280px] object-contain"
                onError={(e) => {
                  try {
                    // Hide the failed image
                    const img = e.target as HTMLImageElement;
                    if (img) {
                      img.style.display = 'none';
                      // Find and show the fallback icon
                      const parent = img.parentElement;
                      if (parent) {
                        const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                        if (fallback) {
                          fallback.classList.remove('hidden');
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Error handling logo fallback:', error);
                  }
                }}
              />
            ) : null}
            <div 
              className={`logo-fallback w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center ${
                (settings as any)?.websiteLogo ? 'hidden' : ''
              }`}
            >
              <span className="text-white font-bold text-base">ই</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              {loading ? (
                <span className="inline-block w-24 h-5 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                settings?.schoolName || 'আমার স্কুল'
              )}
            </span>
          </div>
          <div className="hidden lg:flex items-center space-x-2 xl:space-x-4 flex-nowrap">
            <a href="/" className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-1 xl:px-2 py-2 whitespace-nowrap text-sm xl:text-base">{content[language].nav.home}</a>
            <a href="/notice" className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-1 xl:px-2 py-2 whitespace-nowrap text-sm xl:text-base">{content[language].nav.notice}</a>
            <a href="/admission" className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-1 xl:px-2 py-2 whitespace-nowrap text-sm xl:text-base">{content[language].nav.admission}</a>
            <a href="/results" className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-1 xl:px-2 py-2 whitespace-nowrap text-sm xl:text-base">{content[language].nav.results}</a>
            <a href="/homework" className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-1 xl:px-2 py-2 whitespace-nowrap text-sm xl:text-base">{content[language].nav.homework}</a>
            <a href="/questions" className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-1 xl:px-2 py-2 whitespace-nowrap text-sm xl:text-base">{content[language].nav.questions}</a>
            <a href="/gallery" className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-1 xl:px-2 py-2 whitespace-nowrap text-sm xl:text-base">{content[language].nav.gallery}</a>
            <a href="/about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-1 xl:px-2 py-2 whitespace-nowrap text-sm xl:text-base">{content[language].nav.about}</a>
            <a href="/contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-1 xl:px-2 py-2 whitespace-nowrap text-sm xl:text-base">{content[language].nav.contact}</a>
            
            <button 
              onClick={handleLoginClick}
              className="bg-green-600 hover:bg-green-700 text-white px-3 xl:px-6 py-2 rounded-lg transition-colors font-medium whitespace-nowrap text-sm xl:text-base"
            >
              {content[language].nav.login}
            </button>
            
            {/* Language Toggle Switch */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">বাং</span>
              <button 
                onClick={() => setLanguage(prev => prev === 'bn' ? 'en' : 'bn')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  language === 'en' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    language === 'en' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-600">EN</span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="/" className="block text-gray-700 hover:text-blue-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-blue-50">{content[language].nav.home}</a>
              <a href="/notice" className="block text-gray-700 hover:text-blue-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-blue-50">{content[language].nav.notice}</a>
              <a href="/admission" className="block text-gray-700 hover:text-blue-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-blue-50">{content[language].nav.admission}</a>
              <a href="/results" className="block text-gray-700 hover:text-blue-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-blue-50">{content[language].nav.results}</a>
              <a href="/homework" className="block text-gray-700 hover:text-blue-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-blue-50">{content[language].nav.homework}</a>
              <a href="/questions" className="block text-gray-700 hover:text-blue-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-blue-50">{content[language].nav.questions}</a>
              <a href="/gallery" className="block text-gray-700 hover:text-blue-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-blue-50">{content[language].nav.gallery}</a>
              <a href="/about" className="block text-gray-700 hover:text-blue-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-blue-50">{content[language].nav.about}</a>
              <a href="/contact" className="block text-gray-700 hover:text-blue-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-blue-50">{content[language].nav.contact}</a>
              
              <button 
                onClick={handleLoginClick}
                className="w-full text-left bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors font-medium"
              >
                {content[language].nav.login}
              </button>
              
              {/* Mobile Language Toggle */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-gray-700 font-medium">ভাষা / Language</span>
                <button 
                  onClick={() => setLanguage(prev => prev === 'bn' ? 'en' : 'bn')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    language === 'en' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      language === 'en' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;