'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { inventoryQueries, InventoryItem, InventoryAlert, StockMovement, accountingQueries, classQueries } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import {
  Home, Users, BookOpen, ClipboardList, Calendar, Settings, LogOut, Menu, X,
  UserCheck, GraduationCap, Building, CreditCard, TrendingUp, Search, Bell,
  Plus, Package, AlertTriangle, CheckCircle,   BarChart, RefreshCw, Eye, Edit, Trash2,
  Globe,
  FileText,
  Award,
  MessageSquare,
  Gift,
  Sparkles,
  AlertCircle,
  BookOpen as BookOpenIcon,
  Users as UsersIcon,
  Save,
} from 'lucide-react';
import Modal from '@/components/ui/modal';

function InventoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalItems: 0,
    totalValue: 0,
    activeItems: 0,
    inactiveItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    categoriesCount: 0,
    recentMovements: 0,
    alertsCount: 0,
    topCategories: [] as Array<{ category: string; count: number; value: number }>
  });

  // Calculate derived stats
  const inStock = inventoryItems.filter(item => item.quantity > item.minQuantity).length;
  const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPurchaseValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalSellingValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * (item.sellingPrice || item.unitPrice)), 0);

  // Calculate total distributed value from admission fee collections
  const [totalDistributedValue, setTotalDistributedValue] = useState(0);
  // Calculate total sales from inventory transactions
  const [totalSales, setTotalSales] = useState(0);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [classes, setClasses] = useState<Array<{ classId?: string; className: string; section: string }>>([]);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const { userData } = useAuth();

  // Form state for add stock
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

  // Initialize Firebase data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadInventoryData();
        setupClassesListener();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

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
          console.error('Error in classes listener:', error);
          setClasses([]);
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up classes listener:', error);
      setClasses([]);
    }
  };

  // Load initial inventory data
  const loadInventoryData = async () => {
    try {
      setDataLoading(true);
      const schoolId = SCHOOL_ID; // This should come from user context

      // Load inventory statistics
      const stats = await inventoryQueries.getInventoryStats(schoolId);
      setInventoryStats(stats);

      // Load inventory items
      const items = await inventoryQueries.getAllInventoryItems(schoolId);
      setInventoryItems(items);

      // Load alerts
      const alertsData = await inventoryQueries.getAllInventoryAlerts(schoolId);
      setAlerts(alertsData);

      // Load recent movements
      const movements = await inventoryQueries.getStockMovements(undefined, schoolId);
      setRecentMovements(movements.slice(0, 10)); // Show last 10 movements

      // Load distributed inventory value from admission fee collections
      await loadDistributedInventoryValue(schoolId);

      // Load total sales from inventory transactions
      await loadTotalSales(schoolId);

    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // Load distributed inventory value from admission fee collections
  const loadDistributedInventoryValue = async (schoolId: string) => {
    try {
      // Get all admission fee transactions that include inventory items
      const transactions = await accountingQueries.getAllTransactions(schoolId);

      // For now, we'll calculate based on transactions that have inventory data
      // In a real implementation, you might want to store inventory distribution data in the transaction
      let distributedValue = 0;

      // Calculate distributed value from transactions
      // This is a simplified calculation - in reality you might store the inventory items distributed in each transaction
      transactions.forEach(transaction => {
        // If transaction has inventory items data, calculate their value
        if (transaction.inventoryItems && Array.isArray(transaction.inventoryItems)) {
          transaction.inventoryItems.forEach((item: any) => {
            if (item.quantity && item.unitPrice) {
              distributedValue += item.quantity * item.unitPrice;
            }
          });
        }
      });

      setTotalDistributedValue(distributedValue);
    } catch (error) {
      console.error('Error loading distributed inventory value:', error);
      setTotalDistributedValue(0);
    }
  };

  // Load total sales from inventory transactions
  const loadTotalSales = async (schoolId: string) => {
    try {
      // Get all transactions that include inventory items (sales)
      const transactions = await accountingQueries.getAllTransactions(schoolId);

      // Filter transactions that have inventory items and are completed
      const inventoryTransactions = transactions.filter(t =>
        t.inventoryItems && t.inventoryItems.length > 0 && t.status === 'completed'
      );

      // Calculate total sales from inventory items
      const totalInventorySales = inventoryTransactions.reduce((total, transaction) => {
        if (transaction.inventoryItems && Array.isArray(transaction.inventoryItems)) {
          const transactionTotal = transaction.inventoryItems.reduce((sum, item: any) => {
            return sum + ((item as any)?.totalValue || 0);
          }, 0);
          return total + transactionTotal;
        }
        return total;
      }, 0);

      console.log('💰 Total inventory sales calculated:', totalInventorySales);
      setTotalSales(totalInventorySales);
    } catch (error) {
      console.error('Error loading total sales:', error);
      setTotalSales(0);
    }
  };

  // Set up real-time listeners
  useEffect(() => {
    if (!user) return;

    const schoolId = SCHOOL_ID;

    // Listen to inventory items changes
    const unsubscribeItems = inventoryQueries.subscribeToInventoryItems(schoolId, (items) => {
      setInventoryItems(items);
    });

    // Listen to alerts changes
    const unsubscribeAlerts = inventoryQueries.subscribeToInventoryAlerts(schoolId, (alertsData) => {
      setAlerts(alertsData);
    });

    // Listen to stock movements changes
    const unsubscribeMovements = inventoryQueries.subscribeToStockMovements(schoolId, (movements) => {
      setRecentMovements(movements.slice(0, 10));
    });

    return () => {
      unsubscribeItems();
      unsubscribeAlerts();
      unsubscribeMovements();
    };
  }, [user]);

  // Create sample data for testing
  const createSampleData = async () => {
    try {
      setDataLoading(true);
      const schoolId = SCHOOL_ID;
      await inventoryQueries.createSampleInventoryData(schoolId);
      await loadInventoryData(); // Reload data after creating samples
    } catch (error) {
      console.error('Error creating sample data:', error);
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

  // Filter items based on search term
  const filteredItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Quick select items
  const quickSelectItems = [
    { name: 'বই', nameEn: 'Book', category: 'পাঠ্যবই', unit: 'পিস' },
    { name: 'স্লেট', nameEn: 'Slate', category: 'স্টেশনারি', unit: 'পিস' },
    { name: 'খাতা', nameEn: 'Notebook', category: 'স্টেশনারি', unit: 'পিস' },
    { name: 'চক', nameEn: 'Chalk', category: 'স্টেশনারি', unit: 'বক্স' },
    { name: 'পেন্সিল', nameEn: 'Pencil', category: 'স্টেশনারি', unit: 'পিস' },
    { name: 'ব্রাশ/ডাস্টার', nameEn: 'Brush/Duster', category: 'স্টেশনারি', unit: 'পিস' },
    { name: 'ইরেজার/রাবার', nameEn: 'Eraser/Rubber', category: 'স্টেশনারি', unit: 'পিস' },
    { name: 'কাটার', nameEn: 'Cutter', category: 'স্টেশনারি', unit: 'পিস' }
  ];

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

  const handleQuickSelect = (item: typeof quickSelectItems[0]) => {
    setFormData(prev => ({
      ...prev,
      name: item.name,
      nameEn: item.nameEn,
      category: item.category,
      unit: item.unit
    }));
  };

  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.unit || formData.quantity <= 0 || formData.unitPrice <= 0) {
      alert('অনুগ্রহ করে সকল আবশ্যকীয় ফিল্ড পূরণ করুন!');
      return;
    }

    try {
      setSaving(true);

      const inventoryItem: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        schoolId: SCHOOL_ID,
        createdBy: user?.uid || 'admin'
      };

      await inventoryQueries.createInventoryItem(inventoryItem);

      // Show success modal
      setShowSuccessModal(true);
      setShowAddStockModal(false);

      // Reset form
      setFormData({
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
        status: 'active',
        condition: 'new',
        isSet: false,
        setItems: [],
        notes: ''
      });

      // Reload inventory data
      await loadInventoryData();

    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert('পণ্য যোগ করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: false },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: false },
    { icon: Building, label: 'অভিভাবক', href: '/admin/parents', active: false },
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: false },
    { icon: BookOpenIcon, label: 'বিষয়', href: '/admin/subjects', active: false },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/admin/homework', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: false },
    { icon: Award, label: 'পরীক্ষা', href: '/admin/exams', active: false },
    { icon: Bell, label: 'নোটিশ', href: '/admin/notice', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: false },
    { icon: MessageSquare, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: true },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: UsersIcon, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];

  const quickActions = [
    {
      title: 'সব মজুদ',
      description: 'সকল পণ্যের তালিকা দেখুন',
      icon: Package,
      color: 'blue',
      href: '/admin/inventory/all-stock'
    },
    {
      title: 'নতুন মজুদ যোগ করুন',
      description: 'নতুন পণ্য যোগ করুন',
      icon: Plus,
      color: 'green',
      onClick: () => setShowAddStockModal(true)
    },
    {
      title: 'কম স্টক রিপোর্ট',
      description: 'কম স্টকের তালিকা',
      icon: AlertTriangle,
      color: 'yellow',
      href: '/admin/inventory/low-stock'
    }
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
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
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Top Navigation */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center h-full">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 mr-4">
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">ইনভেন্টরি ড্যাশবোর্ড</h1>
                  <p className="text-sm text-gray-600 leading-tight">মজুদ ব্যবস্থাপনা ও পর্যবেক্ষণ</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 h-full">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="পণ্য খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 w-48"
                  />
                </div>
                <button
                  onClick={createSampleData}
                  disabled={dataLoading}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="নমুনা ডেটা তৈরি করুন"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${dataLoading ? 'animate-spin' : ''}`} />
                  নমুনা ডেটা
                </button>
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
          {/* Inventory Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট পণ্য</p>
                  <p className="text-2xl font-bold text-gray-900">{inventoryStats.totalItems}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">স্টকে আছে</p>
                  <p className="text-2xl font-bold text-green-600">{totalQuantity} {inventoryItems.length > 0 ? inventoryItems[0]?.unit : 'পিস'}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট ক্রয় মূল্য</p>
                  <p className="text-2xl font-bold text-purple-600">৳{totalPurchaseValue.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <BarChart className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট বিক্রয়</p>
                  <p className="text-2xl font-bold text-orange-600">৳{totalDistributedValue.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">বিক্রয় মূল্য</p>
                  <p className="text-2xl font-bold text-indigo-600">৳{totalSellingValue.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <BarChart className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">দ্রুত অ্যাকশন</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                action.href ? (
                  <a 
                    key={index} 
                    href={action.href}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${action.color === 'blue' ? 'bg-blue-100' : action.color === 'green' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                        <action.icon className={`w-6 h-6 ${action.color === 'blue' ? 'text-blue-600' : action.color === 'green' ? 'text-green-600' : 'text-yellow-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{action.title}</h3>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                    </div>
                  </a>
                ) : (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer text-left w-full"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${action.color === 'blue' ? 'bg-blue-100' : action.color === 'green' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                        <action.icon className={`w-6 h-6 ${action.color === 'blue' ? 'text-blue-600' : action.color === 'green' ? 'text-green-600' : 'text-yellow-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{action.title}</h3>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                    </div>
                  </button>
                )
              ))}
            </div>
          </div>

          {/* Recent Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">সাম্প্রতিক পণ্য</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">পণ্যের নাম</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">বিভাগ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">পরিমাণ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">একক দাম</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ক্লাস</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">সেট আইটেম</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">স্ট্যাটাস</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">শেষ আপডেট</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataLoading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                          লোড হচ্ছে...
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        কোনো পণ্য পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item: InventoryItem) => {
                      const status = getStatusInBengali(item);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-white" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                {item.nameEn && (
                                  <div className="text-xs text-gray-500">{item.nameEn}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity} {item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">৳{item.unitPrice.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.assignedClass ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {item.assignedClass}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">কোনো ক্লাস নেই</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.isSet ? (
                              <div className="text-xs">
                                <span className="font-medium">সেট আইটেম:</span>
                                <ul className="mt-1">
                                  {item.setItems?.map((setItem, index) => (
                                    <li key={index} className="text-gray-600">• {setItem}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <span className="text-gray-500">নয়</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColorClasses(status)}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.updatedAt?.toDate?.()?.toLocaleDateString('bn-BD') || 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    পৃষ্ঠা {currentPage} এর {totalPages} এর মধ্যে • মোট {filteredItems.length} টি পণ্য
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      পূর্ববর্তী
                    </button>

                    {/* Page Numbers */}
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNumber > totalPages) return null;

                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              currentPage === pageNumber
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      পরবর্তী
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Stock Modal */}
      <Modal
        isOpen={showAddStockModal}
        onClose={() => {
          setShowAddStockModal(false);
          // Reset form when closing
          setFormData({
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
            status: 'active',
            condition: 'new',
            isSet: false,
            setItems: [],
            notes: ''
          });
        }}
        title="নতুন মজুদ যোগ করুন"
        subtitle="ইনভেন্টরিতে নতুন পণ্য যোগ করুন"
        size="2xl"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowAddStockModal(false);
                setFormData({
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
                  status: 'active',
                  condition: 'new',
                  isSet: false,
                  setItems: [],
                  notes: ''
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              বাতিল করুন
            </button>
            <button
              onClick={handleAddStockSubmit}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>পণ্য সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddStockSubmit} className="space-y-6">
          {/* Quick Select Items */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">দ্রুত নির্বাচন</h4>
            <p className="text-sm text-gray-600 mb-3">সাধারণ পণ্য দ্রুত নির্বাচন করুন:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickSelectItems.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuickSelect(item)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.nameEn}</div>
                </button>
              ))}
            </div>
          </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-2">ক্রয় মূল্য (একক) *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">বিক্রয় মূল্য (একক)</label>
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
        </form>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
        }}
        title="পণ্য সফলভাবে যোগ করা হয়েছে"
        subtitle="নতুন পণ্যটি ইনভেন্টরিতে সংরক্ষণ করা হয়েছে"
        size="md"
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowSuccessModal(false);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ঠিক আছে
            </button>
          </div>
        }
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-600 mb-2">
            পণ্যটি সফলভাবে ইনভেন্টরিতে যোগ করা হয়েছে।
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default function InventoryPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <InventoryPage />
    </ProtectedRoute>
  );
}
