'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Camera, Search, Filter, Grid, List, Download, Eye, Calendar, User, MapPin, Heart, Share2, ChevronLeft, ChevronRight, X, Video } from 'lucide-react';
import { settingsQueries, SystemSettings } from '@/lib/database-queries';
import { transformImageUrl, getProxyUrl } from '@/lib/imagekit-utils';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  event: string;
  date: string;
  photographer: string;
  location: string;
  tags: string[];
  type?: 'image' | 'video';
  uploadedBy?: string;
  likes?: number;
  isLiked?: boolean;
}

const PublicGalleryPage = () => {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [pageTitle, setPageTitle] = useState('ফটো গ্যালারি');
  const [pageSubtitle, setPageSubtitle] = useState('আমাদের স্কুলের স্মরণীয় মুহূর্তগুলো এবং বিশেষ অনুষ্ঠানগুলোর ছবি দেখুন');
  const [categories, setCategories] = useState<string[]>(['সকল বিভাগ']);
  const [events, setEvents] = useState<string[]>(['সকল অনুষ্ঠান']);
  const [generalSettings, setGeneralSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Real-time listener for gallery settings
    const settingsRef = doc(db, 'system', 'settings');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      try {
        if (!docSnap.exists()) {
          console.warn('No settings found');
          setGalleryItems([]);
          setFilteredItems([]);
          setLoading(false);
          return;
        }

        const settings = { id: docSnap.id, ...docSnap.data() } as SystemSettings;

        // Check if gallery page is enabled
        if (settings.galleryPageEnabled === false) {
          setGalleryItems([]);
          setFilteredItems([]);
          setLoading(false);
          return;
        }

        // Set page title and subtitle
        if (settings.galleryPageTitle) {
          setPageTitle(settings.galleryPageTitle);
        }
        if (settings.galleryPageSubtitle) {
          setPageSubtitle(settings.galleryPageSubtitle);
        }

        // Set categories and events
        if (settings.galleryCategories && settings.galleryCategories.length > 0) {
          setCategories(settings.galleryCategories);
        }
        if (settings.galleryEvents && settings.galleryEvents.length > 0) {
          setEvents(settings.galleryEvents);
        }

        // Store general settings for footer
        setGeneralSettings(settings);

        // Load gallery items
        const items = settings.galleryItems || [];
        
        // Initialize likes and isLiked if not present, and validate image URLs
        const itemsWithLikes = items.map((item) => {
          // Ensure imageUrl is valid and properly formatted
          let imageUrl = item.imageUrl || '';
          
          // If URL doesn't start with http/https, it's invalid
          if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            imageUrl = '';
          }
          
          return {
            ...item,
            likes: item.likes || 0,
            isLiked: item.isLiked || false,
            imageUrl: imageUrl
          };
        });

        setGalleryItems(itemsWithLikes);
        setFilteredItems(itemsWithLikes);
        setLoading(false);
      } catch (error) {
        console.error('Error loading gallery data:', error);
        setGalleryItems([]);
        setFilteredItems([]);
        setLoading(false);
      }
    }, (error) => {
      console.error('Error listening to gallery settings:', error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      let filtered = galleryItems || [];

      // Search filter
      if (searchTerm) {
        filtered = filtered.filter(item => 
          item?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item?.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      // Category filter
      if (selectedCategory && selectedCategory !== 'সকল বিভাগ') {
        filtered = filtered.filter(item => item?.category === selectedCategory);
      }

      // Event filter
      if (selectedEvent && selectedEvent !== 'সকল অনুষ্ঠান') {
        filtered = filtered.filter(item => item?.event === selectedEvent);
      }

      // Sort
      filtered.sort((a, b) => {
        try {
          let aValue, bValue;
          
          switch (sortBy) {
            case 'date':
              aValue = new Date(a?.date || '').getTime();
              bValue = new Date(b?.date || '').getTime();
              break;
            case 'likes':
              aValue = a?.likes || 0;
              bValue = b?.likes || 0;
              break;
            case 'title':
              aValue = a?.title?.toLowerCase() || '';
              bValue = b?.title?.toLowerCase() || '';
              break;
            default:
              aValue = 0;
              bValue = 0;
          }

          if (sortBy === 'title') {
            return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
          }

          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        } catch (error) {
          console.error('Error sorting gallery items:', error);
          return 0;
        }
      });

      setFilteredItems(filtered);
    } catch (error) {
      console.error('Error filtering gallery items:', error);
      setFilteredItems([]);
    }
  }, [galleryItems, searchTerm, selectedCategory, selectedEvent, sortBy, sortOrder]);

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'events': return 'অনুষ্ঠান';
      case 'academic': return 'শিক্ষামূলক';
      case 'cultural': return 'সাংস্কৃতিক';
      case 'environment': return 'পরিবেশ';
      case 'sports': return 'ক্রীড়া';
      default: return category;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'তারিখ নেই';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'অবৈধ তারিখ';
      return date.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'তারিখ ফরম্যাট করতে ত্রুটি';
    }
  };

  const handleLike = async (id: string) => {
    // Find the item to update
    const item = galleryItems.find(i => i.id === id);
    if (!item) return;

    const newIsLiked = !item.isLiked;
    const newLikes = newIsLiked ? (item.likes || 0) + 1 : Math.max(0, (item.likes || 0) - 1);
    
    // Update local state immediately for better UX
    setGalleryItems(prev => prev.map(i => 
      i.id === id 
        ? { ...i, isLiked: newIsLiked, likes: newLikes }
        : i
    ));

    // Update Firebase
    try {
      const settingsRef = doc(db, 'system', 'settings');
      const settingsDoc = await settingsQueries.getSettings();
      
      if (settingsDoc && settingsDoc.galleryItems) {
        const updatedItems = settingsDoc.galleryItems.map((galleryItem: any) => {
          if (galleryItem.id === id) {
            return {
              ...galleryItem,
              likes: newLikes,
              isLiked: newIsLiked
            };
          }
          return galleryItem;
        });
        
        await updateDoc(settingsRef, {
          galleryItems: updatedItems
        });
      }
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert local state on error
      setGalleryItems(prev => prev.map(i => 
        i.id === id 
          ? { ...i, isLiked: item.isLiked, likes: item.likes || 0 }
          : i
      ));
    }
  };

  const handleShare = async (item: GalleryItem) => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `${item.title} - ${pageTitle}`;
    
    // Use Web Share API if available (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: Copy link to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('লিঙ্ক ক্লিপবোর্ডে কপি করা হয়েছে!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        // Fallback: Show URL in prompt
        prompt('এই লিঙ্কটি শেয়ার করুন:', shareUrl);
      }
    }
  };

  const handleDownload = async (item: GalleryItem) => {
    try {
      // Fetch the image/video as a blob for direct download
      const response = await fetch(item.imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch media');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Get file extension from URL or default
      const urlExtension = item.imageUrl.split('.').pop()?.split('?')[0] || (item.type === 'video' ? 'mp4' : 'jpg');
      const fileName = `${item.title || 'gallery-item'}.${urlExtension}`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading:', error);
      // Fallback: try direct download link
      try {
        const link = document.createElement('a');
        link.href = item.imageUrl;
        link.download = `${item.title || 'gallery-item'}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackError) {
        console.error('Fallback download also failed:', fallbackError);
        alert('ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    }
  };

  const openLightbox = (item: GalleryItem) => {
    setSelectedImage(item);
    setCurrentImageIndex(filteredItems.findIndex(img => img.id === item.id));
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (currentImageIndex < filteredItems.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setSelectedImage(filteredItems[currentImageIndex + 1]);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setSelectedImage(filteredItems[currentImageIndex - 1]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">গ্যালারি লোড হচ্ছে...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">{pageTitle}</h1>
            <p className="text-xl text-pink-100 max-w-3xl mx-auto">
              {pageSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ছবি খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category} value={category === 'সকল বিভাগ' ? '' : category}>
                    {category === 'সকল বিভাগ' ? category : getCategoryText(category)}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Filter */}
            <div>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                {events.map((event) => (
                  <option key={event} value={event === 'সকল অনুষ্ঠান' ? '' : event}>
                    {event}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode and Sort Options */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">দেখার ধরন:</span>
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-pink-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-pink-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">সাজান:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="date">তারিখ অনুযায়ী</option>
                <option value="likes">লাইক অনুযায়ী</option>
                <option value="title">শিরোনাম অনুযায়ী</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <span className="text-sm">{sortOrder === 'asc' ? 'আরোহী' : 'অবরোহী'}</span>
                {sortOrder === 'asc' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredItems.length}টি {filteredItems.length === 1 ? 'আইটেম' : 'আইটেম'} পাওয়া গেছে
          </p>
        </div>

        {/* Gallery Grid/List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">কোন ছবি পাওয়া যায়নি</h3>
            <p className="text-gray-600">আপনার অনুসন্ধানের সাথে মিলে যায় এমন কোন ছবি নেই</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-6'
          }>
            {filteredItems.map((item) => (
              <div key={item.id} className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                viewMode === 'list' ? 'flex' : ''
              }`}>
                <div className={`${viewMode === 'list' ? 'w-1/3' : 'w-full'} relative overflow-hidden`} style={{ 
                  height: viewMode === 'list' ? '200px' : '320px',
                  backgroundColor: '#f3f4f6'
                }}>
                  {item.type === 'video' ? (
                    <video
                      src={item.imageUrl}
                      className="w-full h-full object-cover cursor-pointer"
                      style={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onClick={() => openLightbox(item)}
                      controls={false}
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <>
                      {item.imageUrl ? (
                        <img
                          key={`img-${item.id}`}
                          src={getProxyUrl(item.imageUrl)}
                          alt={item.title || 'Gallery image'}
                          className="w-full h-full object-cover cursor-pointer"
                          style={{ 
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            objectFit: 'cover'
                          }}
                          loading="lazy"
                          onClick={() => openLightbox(item)}
                          onLoad={(e) => {
                            const target = e.target as HTMLImageElement;
                            console.log('✅ Image loaded successfully:', item.title, target.src);
                          }}
                          onError={(e) => {
                            console.error('❌ Image failed to load:', item.title, item.imageUrl);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.image-error-placeholder')) {
                              const placeholder = document.createElement('div');
                              placeholder.className = `image-error-placeholder absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500`;
                              placeholder.style.width = '100%';
                              placeholder.style.height = '100%';
                              placeholder.innerHTML = `
                                <div class="text-center">
                                  <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                  </svg>
                                  <p class="text-sm">ছবি লোড করতে পারেনি</p>
                                </div>
                              `;
                              parent.appendChild(placeholder);
                            }
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400" style={{ width: '100%', height: '100%' }}>
                          <div className="text-center">
                            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">ছবির URL নেই</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {/* Category badges */}
                  <div className="absolute top-2 right-2 flex items-center space-x-2 z-10">
                    {item.type === 'video' && (
                      <span className="px-2 py-1 bg-red-600 bg-opacity-80 text-white text-xs rounded-full flex items-center space-x-1">
                        <Video className="w-3 h-3" />
                        <span>ভিডিও</span>
                      </span>
                    )}
                    <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded-full">
                      {getCategoryText(item.category)}
                    </span>
                  </div>
                </div>
                
                <div className={`p-6 ${viewMode === 'list' ? 'w-2/3' : 'w-full'}`}>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-pink-100 text-pink-600 text-xs rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{item.uploadedBy || item.photographer}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(item.date)}</span>
                    </div>
                  </div>
                  {item.location && (
                    <div className="flex items-center space-x-1 text-sm text-gray-500 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{item.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLike(item.id)}
                        className={`flex items-center space-x-1 ${
                          item.isLiked ? 'text-pink-600' : 'text-gray-400 hover:text-pink-600'
                        } transition-colors`}
                      >
                        <Heart className={`w-5 h-5 ${item.isLiked ? 'fill-current' : ''}`} />
                        <span>{item.likes}</span>
                      </button>
                      <button 
                        onClick={() => handleShare(item)}
                        className="flex items-center space-x-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                        <span>শেয়ার</span>
                      </button>
                    </div>
                    <button 
                      onClick={() => handleDownload(item)}
                      className="flex items-center space-x-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      <span>ডাউনলোড</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full w-full">
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
            >
              <X className="w-6 h-6" />
            </button>
            
            {selectedImage.type === 'video' ? (
              <video
                src={getProxyUrl(selectedImage.imageUrl)}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : (
              <img
                src={getProxyUrl(selectedImage.imageUrl || '')}
                alt={selectedImage.title}
                className="max-w-full max-h-[80vh] object-contain bg-gray-100"
                onError={(e) => {
                  // Try transformed URL as fallback
                  const target = e.target as HTMLImageElement;
                  if (selectedImage.imageUrl && !selectedImage.imageUrl.includes('tr:')) {
                    const transformedUrl = transformImageUrl(selectedImage.imageUrl, {
                      width: 1200,
                      height: 800,
                      crop: 'maintain_ratio',
                      format: 'webp',
                      quality: 90
                    }, true); // Use proxy
                    if (transformedUrl !== selectedImage.imageUrl) {
                      target.src = transformedUrl;
                    }
                  }
                }}
              />
            )}
            
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4">
              <h3 className="text-xl font-semibold mb-2">{selectedImage.title}</h3>
              {selectedImage.description && (
                <p className="text-sm text-gray-300 mb-2">{selectedImage.description}</p>
              )}
              <div className="flex items-center space-x-4 text-xs text-gray-400">
                {selectedImage.uploadedBy && (
                  <span>আপলোডকারী: {selectedImage.uploadedBy}</span>
                )}
                {selectedImage.location && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{selectedImage.location}</span>
                  </span>
                )}
              </div>
            </div>
            
            {currentImageIndex > 0 && (
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-3"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            
            {currentImageIndex < filteredItems.length - 1 && (
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-3"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">ই</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">{generalSettings?.schoolName || 'আমার স্কুল'}</h3>
            <p className="text-gray-400 mb-4">{generalSettings?.schoolDescription || 'ভালোবাসা দিয়ে শিক্ষা, ইসলামিক মূল্যবোধে জীবন গড়া'}</p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <span>📞 {generalSettings?.schoolPhone || '+৮৮০ ১৭১১ ২৩৪৫৬৭'}</span>
              <span>✉️ {generalSettings?.schoolEmail || 'info@iqraschool.edu'}</span>
              <span>📍 {generalSettings?.schoolAddress || 'ঢাকা, বাংলাদেশ'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PublicGalleryPageWrapper() {
  return <PublicGalleryPage />;
}
