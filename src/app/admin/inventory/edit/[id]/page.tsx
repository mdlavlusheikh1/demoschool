'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { inventoryQueries, classQueries, InventoryItem } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import {
  Home, Users, BookOpen, ClipboardList, Calendar, Settings, LogOut, Menu, X,
  UserCheck, GraduationCap, Building, CreditCard, TrendingUp, Search, Bell,
  Package, Plus, Save, RefreshCw,   ArrowLeft,
  Globe
} from 'lucide-react';

function EditInventoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<Array<{ classId?: string; className: string; section: string }>>([]);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const { userData } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    category: '',
    subcategory: '',
    quantity: 0,
    minQuantity: 0,
    unit: '',
    unitPrice: 0,
    sellingPrice: 0,
    supplier: '',
    supplierContact: '',
    assignedClass: '',
    status: 'active' as const,
    condition: 'new' as const,
    isSet: false,
    setItems: [] as string[],
    notes: ''
  });

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setupClassesListener();
        if (itemId) {
          loadInventoryItem();
        }
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, itemId]);

  // Setup real-time listener for classes
  const setupClassesListener = () => {
    try {
      const schoolId = SCHOOL_ID;
      const unsubscribe = classQueries.subscribeToClassesBySchool(
        schoolId,
        (classesData) => {
          setClasses(classesData);
        },
        (error) => {
          console.error('❌ Error in classes listener:', error);
          setClasses([]);
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up classes listener:', error);
      setClasses([]);
    }
  };

  // Load inventory item data
  const loadInventoryItem = async () => {
    try {
      setDataLoading(true);

      if (!itemId) {
        alert('পণ্য আইডি পাওয়া যায়নি');
        router.push('/admin/inventory/all-stock');
        return;
      }

      const itemData = await inventoryQueries.getInventoryItemById(itemId);
      if (!itemData) {
        alert('পণ্যটি পাওয়া যায়নি');
        router.push('/admin/inventory/all-stock');
        return;
      }

      setItem(itemData);

      // Populate form data
      setFormData({
        name: itemData.name || '',
        nameEn: itemData.nameEn || '',
        category: itemData.category || '',
        subcategory: itemData.subcategory || '',
        quantity: itemData.quantity || 0,
        minQuantity: itemData.minQuantity || 0,
        unit: itemData.unit || '',
        unitPrice: itemData.unitPrice || 0,
        sellingPrice: itemData.sellingPrice || 0,
        supplier: itemData.supplier || '',
        supplierContact: itemData.supplierContact || '',
        assignedClass: itemData.assignedClass || '',
        status: itemData.status || 'active',
        condition: itemData.condition || 'new',
        isSet: itemData.isSet || false,
        setItems: itemData.setItems || [],
        notes: itemData.notes || ''
      });

    } catch (error) {
      console.error('Error loading inventory item:', error);
      alert('পণ্য লোড করতে ত্রুটি হয়েছে।');
    } finally {
      setDataLoading(false);
    }
  };

  const categories = [
    'স্টেশনারি',
    'পাঠ্যবই',
    'সেট',
    'ইলেকট্রনিক্স',
    'সরঞ্জাম',
    'খেলনা'
  ];

  const units = [
    'পিস',
    'বক্স',
    'প্যাকেট',
    'ডজন',
    'সেট',
    'লিটার',
    'কেজি'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.unit || formData.quantity < 0 || formData.unitPrice < 0) {
      alert('অনুগ্রহ করে সকল আবশ্যকীয় ফিল্ড পূরণ করুন!');
      return;
    }

    try {
      setSaving(true);

      const updates: Partial<InventoryItem> = {
        ...formData,
        updatedAt: new Date() as any,
        lastUpdatedBy: user?.uid || 'admin'
      };

      await inventoryQueries.updateInventoryItem(itemId, updates);

      alert('পণ্য সফলভাবে আপডেট করা হয়েছে!');

      // Redirect to view page
      router.push(`/admin/inventory/view/${itemId}`);

    } catch (error) {
      console.error('Error updating inventory item:', error);
      alert('পণ্য আপডেট করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">পণ্য পাওয়া যায়নি</h2>
          <p className="text-gray-600 mb-4">অনুরোধকৃত পণ্যটি খুঁজে পাওয়া যায়নি।</p>
          <button
            onClick={() => router.push('/admin/inventory/all-stock')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            সব মজুদে ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: false },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: false },
    { icon: Building, label: 'অভিভাবক', href: '/admin/parents', active: false },
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Settings, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Home, label: 'পরীক্ষা', href: '/admin/exams', active: false },
    { icon: BookOpen, label: 'বিষয়', href: '/admin/subjects', active: false },
    { icon: Users, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Calendar, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: Settings, label: 'Generate', href: '/admin/generate', active: false },
    { icon: Users, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: true },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">ই</span>
            </div>
            <span className="text-lg font-bold text-gray-900">সুপার অ্যাডমিন</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 mt-2 overflow-y-auto pb-4">
          {menuItems.map((item) => (
            <a key={item.label} href={item.href} className={`flex items-center px-6 py-2 text-sm font-medium transition-colors ${
                item.active ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </a>
          ))}
          <button onClick={handleLogout} className="flex items-center w-full px-6 py-2 mt-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4 mr-3" />
            লগআউট
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center h-full">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 mr-4">
                  <Menu className="w-6 h-6" />
                </button>
                <button
                  onClick={() => router.push(`/admin/inventory/view/${itemId}`)}
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeft className="w-5 h-5 mr-1" />
                  ফিরে যান
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">পণ্য এডিট করুন</h1>
                  <p className="text-sm text-gray-600 leading-tight">{item.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 h-full">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="পণ্য খুঁজুন..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10" />
                </div>
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                  {((userData as any)?.photoURL || user?.photoURL) && !imageError ? (
                    <img
                      src={(userData as any)?.photoURL || user?.photoURL || ''}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setImageError(true);
                      }}
                    />
                  ) : (
                    <span className="text-white font-medium text-sm">
                      {(user?.email?.charAt(0) || userData?.email?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6 bg-gray-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">পণ্যের তথ্য এডিট করুন</h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">মৌলিক তথ্য</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">পণ্যের নাম *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="পণ্যের নাম লিখুন"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">পণ্যের ইংরেজি নাম</label>
                        <input
                          type="text"
                          value={formData.nameEn}
                          onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Product name in English"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category and Details */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">বিভাগ ও বিবরণ</h4>

                    {/* First Row: বিভাগ, ক্লাস, একক */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">বিভাগ *</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">বিভাগ নির্বাচন করুন</option>
                          {categories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ক্লাস</label>
                        <select
                          value={formData.assignedClass}
                          onChange={(e) => setFormData(prev => ({ ...prev, assignedClass: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">ক্লাস নির্বাচন করুন</option>
                          {classes.length > 0 ? (
                            classes.map((classItem) => (
                              <option key={classItem.classId} value={classItem.className}>
                                {classItem.className} - {classItem.section}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="প্লে">প্লে</option>
                              <option value="নার্সারি">নার্সারি</option>
                              <option value="প্রথম">প্রথম</option>
                              <option value="দ্বিতীয়">দ্বিতীয়</option>
                              <option value="তৃতীয়">তৃতীয়</option>
                              <option value="চতুর্থ">চতুর্থ</option>
                              <option value="পঞ্চম">পঞ্চম</option>
                              <option value="ষষ্ঠ">ষষ্ঠ</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">একক *</label>
                        <select
                          value={formData.unit}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">একক নির্বাচন করুন</option>
                          {units.map((unit) => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Second Row: পরিমাণ, ন্যূনতম স্টক */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">পরিমাণ *</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="পরিমাণ"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ন্যূনতম স্টক</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.minQuantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, minQuantity: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="ন্যূনতম স্টক"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">মূল্য নির্ধারণ</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ক্রয় মূল্য (একক) *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">৳</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.unitPrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">বিক্রয় মূল্য (একক)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">৳</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.sellingPrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Set Items - New Feature */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">সেট আইটেমসমূহ</h4>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="isSet"
                          checked={formData.isSet}
                          onChange={(e) => setFormData(prev => ({ ...prev, isSet: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isSet" className="text-sm font-medium text-gray-700">
                          এটি একটি সেট পণ্য
                        </label>
                      </div>

                      {formData.isSet && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">সেটে কী কী আছে?</label>
                          <div className="space-y-2">
                            {formData.setItems.map((item, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={item}
                                  onChange={(e) => {
                                    const newSetItems = [...formData.setItems];
                                    newSetItems[index] = e.target.value;
                                    setFormData(prev => ({ ...prev, setItems: newSetItems }));
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder={`সেট আইটেম ${index + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSetItems = formData.setItems.filter((_, i) => i !== index);
                                    setFormData(prev => ({ ...prev, setItems: newSetItems }));
                                  }}
                                  className="px-2 py-2 text-red-600 hover:text-red-800"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, setItems: [...prev.setItems, ''] }))}
                              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                            >
                              + আইটেম যোগ করুন
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Supplier */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">সরবরাহকারী</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">সরবরাহকারীর নাম</label>
                        <input
                          type="text"
                          value={formData.supplier}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="সরবরাহকারীর নাম"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">যোগাযোগ নম্বর</label>
                        <input
                          type="text"
                          value={formData.supplierContact}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplierContact: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="যোগাযোগ নম্বর"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">অতিরিক্ত তথ্য</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">স্ট্যাটাস</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="active">সক্রিয়</option>
                          <option value="inactive">নিষ্ক্রিয়</option>
                          <option value="discontinued">বন্ধ</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">কন্ডিশন</label>
                        <select
                          value={formData.condition}
                          onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="new">নতুন</option>
                          <option value="good">ভালো</option>
                          <option value="fair">মোটামুটি</option>
                          <option value="poor">খারাপ</option>
                          <option value="damaged">ক্ষতিগ্রস্ত</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">নোটস</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="পণ্য সম্পর্কিত কোনো নোট লিখুন..."
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/inventory/view/${itemId}`)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      বাতিল করুন
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>আপডেট হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>পণ্য আপডেট করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditInventoryPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <EditInventoryPage />
    </ProtectedRoute>
  );
}
