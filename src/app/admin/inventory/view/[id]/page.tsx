'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { inventoryQueries, InventoryItem, StockMovement } from '@/lib/database-queries';
import {
  Home, Users, BookOpen, ClipboardList, Calendar, Settings, LogOut, Menu, X,
  UserCheck, GraduationCap, Building, CreditCard, TrendingUp, Search, Bell,
  Package, AlertTriangle, CheckCircle, Edit, Trash2, Eye, RefreshCw, ArrowLeft,
  TrendingDown, TrendingUp as TrendingUpIcon, Activity, DollarSign,   Calendar as CalendarIcon,
  Globe
} from 'lucide-react';

function InventoryViewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const { userData } = useAuth();

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  // Load inventory item data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
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

  // Load inventory item and its movements
  const loadInventoryItem = async () => {
    try {
      setDataLoading(true);

      if (!itemId) {
        alert('পণ্য আইডি পাওয়া যায়নি');
        router.push('/admin/inventory/all-stock');
        return;
      }

      // Load inventory item
      const itemData = await inventoryQueries.getInventoryItemById(itemId);
      if (!itemData) {
        alert('পণ্যটি পাওয়া যায়নি');
        router.push('/admin/inventory/all-stock');
        return;
      }
      setItem(itemData);

      // Load stock movements for this item
      const movements = await inventoryQueries.getStockMovements(itemId);
      setStockMovements(movements);

    } catch (error) {
      console.error('Error loading inventory item:', error);
      alert('পণ্য লোড করতে ত্রুটি হয়েছে।');
    } finally {
      setDataLoading(false);
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

  // Get status in Bengali
  const getStatusInBengali = (item: InventoryItem) => {
    if (item.quantity === 0) return 'স্টক শেষ';
    if (item.quantity <= item.minQuantity) return 'কম স্টক';
    return 'স্টকে আছে';
  };

  // Get status color classes
  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case 'স্টকে আছে': return 'bg-green-100 text-green-800';
      case 'কম স্টক': return 'bg-yellow-100 text-yellow-800';
      case 'স্টক শেষ': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get movement type in Bengali
  const getMovementTypeInBengali = (type: StockMovement['type']) => {
    switch (type) {
      case 'stock_in': return 'স্টক ইন';
      case 'stock_out': return 'স্টক আউট';
      case 'adjustment': return 'অ্যাডজাস্টমেন্ট';
      case 'return': return 'রিটার্ন';
      case 'damage': return 'ক্ষতিগ্রস্ত';
      case 'expiry': return 'মেয়াদ শেষ';
      default: return type;
    }
  };

  // Get movement icon
  const getMovementIcon = (type: StockMovement['type']) => {
    switch (type) {
      case 'stock_in':
      case 'return':
        return <TrendingUpIcon className="w-4 h-4 text-green-600" />;
      case 'stock_out':
      case 'damage':
      case 'expiry':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'adjustment':
        return <Activity className="w-4 h-4 text-blue-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  // Handle item actions
  const handleEditItem = () => {
    router.push(`/admin/inventory/edit/${itemId}`);
  };

  const handleDeleteItem = async () => {
    if (confirm('আপনি কি এই পণ্যটি ডিলিট করতে চান?')) {
      try {
        await inventoryQueries.deleteInventoryItem(itemId);
        alert('পণ্যটি সফলভাবে ডিলিট করা হয়েছে!');
        router.push('/admin/inventory/all-stock');
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('পণ্য ডিলিট করতে ত্রুটি হয়েছে।');
      }
    }
  };

  if (loading) {
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
                  onClick={() => router.push('/admin/inventory/all-stock')}
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeft className="w-5 h-5 mr-1" />
                  ফিরে যান
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">পণ্যের বিবরণ</h1>
                  <p className="text-sm text-gray-600 leading-tight">{item.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 h-full">
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
          {dataLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-gray-600">লোড হচ্ছে...</span>
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Item Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">বর্তমান স্টক</p>
                      <p className="text-2xl font-bold text-gray-900">{item.quantity} {item.unit}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">ক্রয় মূল্য</p>
                      <p className="text-2xl font-bold text-green-600">৳{item.unitPrice.toLocaleString()}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">বিক্রয় মূল্য</p>
                      <p className="text-2xl font-bold text-purple-600">
                        ৳{(item.sellingPrice || item.unitPrice).toLocaleString()}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">স্ট্যাটাস</p>
                      <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getStatusColorClasses(getStatusInBengali(item))}`}>
                        {getStatusInBengali(item)}
                      </span>
                    </div>
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Item Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Basic Information */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">পণ্যের তথ্য</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">পণ্যের নাম</label>
                          <p className="text-gray-900">{item.name}</p>
                          {item.nameEn && (
                            <p className="text-sm text-gray-600 mt-1">{item.nameEn}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">বিভাগ</label>
                          <p className="text-gray-900">{item.category}</p>
                          {item.subcategory && (
                            <p className="text-sm text-gray-600 mt-1">সাব-ক্যাটাগরি: {item.subcategory}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">পরিমাণ</label>
                          <p className="text-gray-900">{item.quantity} {item.unit}</p>
                          <p className="text-sm text-gray-600 mt-1">ন্যূনতম স্টক: {item.minQuantity} {item.unit}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">কন্ডিশন</label>
                          <p className="text-gray-900 capitalize">{item.condition}</p>
                        </div>

                        {item.supplier && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">সরবরাহকারী</label>
                            <p className="text-gray-900">{item.supplier}</p>
                            {item.supplierContact && (
                              <p className="text-sm text-gray-600 mt-1">{item.supplierContact}</p>
                            )}
                          </div>
                        )}

                        {item.location && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">অবস্থান</label>
                            <p className="text-gray-900">{item.location}</p>
                          </div>
                        )}

                        {item.notes && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">নোটস</label>
                            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Set Items (if applicable) */}
                  {item.isSet && item.setItems && item.setItems.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">সেট আইটেমসমূহ</h3>
                      </div>
                      <div className="p-6">
                        <ul className="space-y-2">
                          {item.setItems.map((setItem, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                              <span className="text-gray-900">{setItem}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Panel */}
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">কুইক অ্যাকশন</h3>
                    </div>
                    <div className="p-6 space-y-3">
                      <button
                        onClick={handleEditItem}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span>পণ্য এডিট করুন</span>
                      </button>

                      <button
                        onClick={() => router.push('/admin/inventory/stock-movement')}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span>স্টক মুভমেন্ট</span>
                      </button>

                      <button
                        onClick={handleDeleteItem}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>পণ্য ডিলিট করুন</span>
                      </button>
                    </div>
                  </div>

                  {/* Stock Summary */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">স্টক সারাংশ</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">মোট স্টক ইন:</span>
                        <span className="font-semibold text-green-600">{item.stockInCount || 0} বার</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">মোট স্টক আউট:</span>
                        <span className="font-semibold text-red-600">{item.stockOutCount || 0} বার</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">শেষ স্টক ইন:</span>
                        <span className="text-sm text-gray-900">
                          {item.lastStockIn?.toDate?.()?.toLocaleDateString('bn-BD') || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">শেষ স্টক আউট:</span>
                        <span className="text-sm text-gray-900">
                          {item.lastStockOut?.toDate?.()?.toLocaleDateString('bn-BD') || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock Movements History */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">স্টক মুভমেন্ট হিস্টরি</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">তারিখ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ধরন</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">পরিমাণ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">কারণ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">রেফারেন্স</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stockMovements.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                            কোনো মুভমেন্ট রেকর্ড নেই
                          </td>
                        </tr>
                      ) : (
                        stockMovements.map((movement) => (
                          <tr key={movement.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {movement.createdAt?.toDate?.()?.toLocaleDateString('bn-BD') || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {getMovementIcon(movement.type)}
                                <span className="text-sm text-gray-900">
                                  {getMovementTypeInBengali(movement.type)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`font-medium ${
                                movement.type === 'stock_in' || movement.type === 'return'
                                  ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {movement.type === 'stock_in' || movement.type === 'return' ? '+' : '-'}
                                {movement.quantity} {item.unit}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {movement.reason || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {movement.reference || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InventoryViewPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <InventoryViewPage />
    </ProtectedRoute>
  );
}
