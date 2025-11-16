'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { inventoryQueries, InventoryItem, settingsQueries } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import {
  Home, Users, BookOpen, ClipboardList, Calendar, Settings, LogOut, Menu, X,
  UserCheck, GraduationCap, Building, CreditCard, TrendingUp, Search, Bell,
  Package, AlertTriangle, CheckCircle, Edit, Trash2, Eye, RefreshCw,   ArrowLeft,
  Globe, Download, FileText, Loader2, BookOpen as BookOpenIcon, Award, MessageSquare,
  Gift, Sparkles, Users as UsersIcon, AlertCircle as AlertCircleIcon
} from 'lucide-react';
import Modal from '@/components/ui/modal';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
// @ts-ignore - file-saver types not available
import { saveAs } from 'file-saver';

function AllStockPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('সব');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const { userData } = useAuth();

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  // Load inventory data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadInventoryData();
        loadSchoolSettings();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Load school settings
  const loadSchoolSettings = async () => {
    try {
      const settings = await settingsQueries.getSettings();
      if (settings) {
        setSchoolSettings(settings);
      }
    } catch (error) {
      console.error('Error loading school settings:', error);
    }
  };

  // Load inventory data
  const loadInventoryData = async () => {
    try {
      setDataLoading(true);
      const schoolId = SCHOOL_ID;
      const items = await inventoryQueries.getAllInventoryItems(schoolId);
      setInventoryItems(items);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setDataLoading(false);
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

    return () => {
      unsubscribeItems();
    };
  }, [user]);

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

  // Filter items based on search and category
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.nameEn && item.nameEn.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'সব' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['সব', ...Array.from(new Set(inventoryItems.map(item => item.category)))];

  // Handle category filter
  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
  };

  // Handle item actions
  const handleViewItem = (itemId: string) => {
    router.push(`/admin/inventory/view/${itemId}`);
  };

  const handleEditItem = (itemId: string) => {
    router.push(`/admin/inventory/edit/${itemId}`);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete?.id) return;

    try {
      await inventoryQueries.deleteInventoryItem(itemToDelete.id);
      alert('পণ্যটি সফলভাবে ডিলিট করা হয়েছে!');
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('পণ্য ডিলিট করতে ত্রুটি হয়েছে।');
    }
  };

  const cancelDeleteItem = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  // Helper function to escape HTML
  const escapeHtml = (text: string) => {
    if (!text) return '';
    const map: any = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  // Helper function to format date
  const formatDate = (date: any) => {
    if (!date) return '-';
    try {
      if (date.toDate) {
        return date.toDate().toLocaleDateString('bn-BD');
      }
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('bn-BD');
      }
      return new Date(date).toLocaleDateString('bn-BD');
    } catch (error) {
      return '-';
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      
      // Always load fresh settings before export to ensure latest data
      const settings = await settingsQueries.getSettings();
      if (settings) setSchoolSettings(settings);
      
      // Get real school data from settings
      const schoolName = settings?.schoolName || 'ইকরা নূরানী একাডেমি';
      const schoolAddress = settings?.schoolAddress || 'ঢাকা, বাংলাদেশ';
      const schoolPhone = settings?.schoolPhone || '০১৭১১১১১১১১';
      const schoolEmail = settings?.schoolEmail || 'info@ikranurani.edu';
      const establishmentYear = (settings as any)?.establishmentYear || '';
      
      console.log('Exporting PDF with settings:', { schoolName, schoolAddress, schoolPhone, schoolEmail, establishmentYear });

      const currentDate = new Date().toLocaleDateString('bn-BD');
      
      // Calculate total value
      const totalValue = filteredItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('পপআপ ব্লকার ব্যবহার করা হচ্ছে। অনুগ্রহ করে পপআপ অনুমতি দিন।');
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="bn">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>সব মজুদ - রিপোর্ট</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Noto Sans Bengali', 'Arial', sans-serif;
                    padding: 20px;
                    direction: rtl;
                    background-color: #fff;
                }
                .school-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #2563eb;
                }
                .school-name {
                    font-size: 24px;
                    font-weight: bold;
                    color: #1e40af;
                    margin-bottom: 8px;
                }
                .school-info {
                    font-size: 14px;
                    color: #4b5563;
                    margin: 4px 0;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding: 15px;
                    background-color: #eff6ff;
                    border-radius: 8px;
                }
                .report-title {
                    font-size: 20px;
                    font-weight: bold;
                    color: #1e40af;
                    margin-bottom: 8px;
                }
                .report-info {
                    font-size: 14px;
                    color: #4b5563;
                }
                .summary-box {
                    background-color: #f0fdf4;
                    border: 2px solid #22c55e;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 20px;
                    text-align: center;
                    font-size: 16px;
                    color: #166534;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    font-size: 11px;
                    table-layout: fixed;
                }
                th, td {
                    border: 1px solid #d1d5db;
                    padding: 6px 4px;
                    text-align: center;
                    word-wrap: break-word;
                    vertical-align: middle;
                }
                th {
                    background-color: #dbeafe;
                    font-weight: bold;
                    color: #1e40af;
                    font-size: 11px;
                }
                td {
                    font-size: 11px;
                }
                tr:nth-child(even) {
                    background-color: #f9fafb;
                }
                .amount {
                    font-weight: bold;
                    color: #059669;
                }
                @media print {
                    body { padding: 10px; }
                    .no-print { display: none; }
                }
                @page {
                    size: A4 landscape;
                    margin: 0.3in;
                }
            </style>
        </head>
        <body>
            <div class="school-header">
                <div class="school-name">${escapeHtml(schoolName)}</div>
                <div class="school-info">${escapeHtml(schoolAddress)}</div>
                ${establishmentYear ? `<div class="school-info">প্রতিষ্ঠার সাল: ${escapeHtml(establishmentYear)}</div>` : ''}
                <div class="school-info">ফোন: ${escapeHtml(schoolPhone)} | ইমেইল: ${escapeHtml(schoolEmail)}</div>
            </div>

            <div class="report-header">
                <div class="report-title">সব মজুদ</div>
                <div class="report-info">
                    রিপোর্ট তৈরির তারিখ: ${currentDate} | মোট পণ্য: ${filteredItems.length} টি
                </div>
            </div>

            <div class="summary-box">
                <strong>মোট পণ্যের মূল্য: ৳${totalValue.toLocaleString('bn-BD')}</strong>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">ক্রম</th>
                        <th style="width: 18%;">পণ্যের নাম</th>
                        <th style="width: 12%;">বিভাগ</th>
                        <th style="width: 10%;">পরিমাণ</th>
                        <th style="width: 10%;">দাম (৳)</th>
                        <th style="width: 10%;">মোট মূল্য (৳)</th>
                        <th style="width: 10%;">ক্লাস</th>
                        <th style="width: 10%;">স্ট্যাটাস</th>
                        <th style="width: 10%;">শেষ আপডেট</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredItems.map((item, index) => {
                      const itemTotal = item.quantity * item.unitPrice;
                      return `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(item.name)}${item.nameEn ? `<br><small>${escapeHtml(item.nameEn)}</small>` : ''}</td>
                            <td>${escapeHtml(item.category)}</td>
                            <td>${item.quantity} ${escapeHtml(item.unit)}</td>
                            <td class="amount">৳${item.unitPrice.toLocaleString('bn-BD')}</td>
                            <td class="amount">৳${itemTotal.toLocaleString('bn-BD')}</td>
                            <td>${escapeHtml(item.assignedClass || 'কোনো ক্লাস নেই')}</td>
                            <td>${getStatusInBengali(item)}</td>
                            <td>${formatDate(item.updatedAt)}</td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF এক্সপোর্ট করতে সমস্যা হয়েছে');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to DOCX
  const exportToDOCX = async () => {
    try {
      setIsExporting(true);
      
      // Always load fresh settings before export to ensure latest data
      const settings = await settingsQueries.getSettings();
      if (settings) setSchoolSettings(settings);
      
      // Get real school data from settings
      const schoolName = settings?.schoolName || 'ইকরা নূরানী একাডেমি';
      const schoolAddress = settings?.schoolAddress || 'ঢাকা, বাংলাদেশ';
      const schoolPhone = settings?.schoolPhone || '০১৭১১১১১১১১';
      const schoolEmail = settings?.schoolEmail || 'info@ikranurani.edu';
      const establishmentYear = (settings as any)?.establishmentYear || '';
      
      console.log('Exporting DOCX with settings:', { schoolName, schoolAddress, schoolPhone, schoolEmail, establishmentYear });

      // Calculate total value
      const totalValue = filteredItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // School info
            new Paragraph({
              children: [
                new TextRun({
                  text: schoolName,
                  bold: true,
                  size: 32
                })
              ],
              alignment: 'center'
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${schoolAddress}${establishmentYear ? ` | প্রতিষ্ঠার সাল: ${establishmentYear}` : ''} | ফোন: ${schoolPhone} | ইমেইল: ${schoolEmail}`,
                  size: 20
                })
              ],
              alignment: 'center'
            }),
            new Paragraph({ children: [new TextRun({ text: '' })] }),
            
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: 'সব মজুদ',
                  bold: true,
                  size: 32
                })
              ],
              alignment: 'center'
            }),
            
            // Date and summary
            new Paragraph({
              children: [
                new TextRun({
                  text: `তারিখ: ${new Date().toLocaleDateString('bn-BD')} | মোট: ${filteredItems.length} টি | মোট মূল্য: ৳${totalValue.toLocaleString('bn-BD')}`,
                  size: 20
                })
              ],
              alignment: 'center'
            }),
            
            new Paragraph({ children: [new TextRun({ text: '' })] }),
            
            // Table
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE
              },
              rows: [
                // Header row
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ক্রম', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'পণ্যের নাম', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'বিভাগ', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'পরিমাণ', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'দাম', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'মোট মূল্য', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ক্লাস', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'স্ট্যাটাস', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'শেষ আপডেট', bold: true })] })] })
                  ]
                }),
                
                // Data rows
                ...filteredItems.map((item, index) => {
                  const itemTotal = item.quantity * item.unitPrice;
                  return new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(index + 1) })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.name + (item.nameEn ? `\n${item.nameEn}` : '') })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.category })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${item.quantity} ${item.unit}` })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳${item.unitPrice.toLocaleString('bn-BD')}` })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳${itemTotal.toLocaleString('bn-BD')}` })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.assignedClass || 'কোনো ক্লাস নেই' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getStatusInBengali(item) })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatDate(item.updatedAt) })] })] })
                    ]
                  });
                })
              ]
            })
          ]
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const fileName = `সব_মজুদ_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, fileName);
      
      console.log('✅ DOCX exported successfully');
    } catch (error) {
      console.error('DOCX export error:', error);
      alert('DOCX এক্সপোর্ট করতে সমস্যা হয়েছে');
    } finally {
      setIsExporting(false);
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
    { icon: AlertCircleIcon, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: true },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: UsersIcon, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
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
        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6 bg-gray-50 overflow-y-auto">
          {/* Clean Header Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">সব মজুদ</h1>
                  <p className="text-sm text-gray-600">সকল পণ্যের তালিকা</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="পণ্য খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 w-64"
                  />
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

          {/* Back Button - After Header */}
          <div className="p-4 mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/inventory')}
                className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 px-4 py-2 rounded-full transition-all duration-200 group shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">
                  ফিরে যান
                </span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryFilter(category)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={exportToPDF}
                  disabled={isExporting || filteredItems.length === 0}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="PDF হিসেবে এক্সপোর্ট করুন"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>PDF</span>
                </button>
                <button
                  onClick={exportToDOCX}
                  disabled={isExporting || filteredItems.length === 0}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="DOCX হিসেবে এক্সপোর্ট করুন"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>DOCX</span>
                </button>
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">পণ্যের তালিকা</h3>
                <p className="text-sm text-gray-600">মোট {inventoryItems.length} টি পণ্য</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">পণ্যের নাম</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">বিভাগ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">পরিমাণ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">দাম</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ক্লাস</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">স্ট্যাটাস</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">শেষ আপডেট</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অ্যাকশন</th>
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
                        {inventoryItems.length === 0 ? 'কোনো পণ্য পাওয়া যায়নি' : 'ফিল্টার অনুসারে কোনো পণ্য পাওয়া যায়নি'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColorClasses(getStatusInBengali(item))}`}>
                            {getStatusInBengali(item)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.updatedAt?.toDate?.()?.toLocaleDateString('bn-BD') || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewItem(item.id!)}
                              className="text-blue-600 hover:text-blue-900"
                              title="দেখুন"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditItem(item.id!)}
                              className="text-green-600 hover:text-green-900"
                              title="এডিট করুন"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="text-red-600 hover:text-red-900"
                              title="ডিলিট করুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={cancelDeleteItem}
        title="পণ্য ডিলিট করুন"
        subtitle="এই অ্যাকশনটি পূর্বাবস্থায় ফেরানো যাবে না"
        size="md"
        footer={
          <div className="flex space-x-3">
            <button
              onClick={cancelDeleteItem}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              বাতিল করুন
            </button>
            <button
              onClick={confirmDeleteItem}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              ডিলিট করুন
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">ডিলিট কনফার্মেশন</p>
              <p className="text-sm text-red-600">আপনি কি নিশ্চিত যে এই পণ্যটি ডিলিট করতে চান?</p>
            </div>
          </div>

          {itemToDelete && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{itemToDelete.name}</p>
                  {itemToDelete.nameEn && (
                    <p className="text-xs text-gray-500">{itemToDelete.nameEn}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">বিভাগ:</span>
                  <span className="ml-2 font-medium">{itemToDelete.category}</span>
                </div>
                <div>
                  <span className="text-gray-600">পরিমাণ:</span>
                  <span className="ml-2 font-medium">{itemToDelete.quantity} {itemToDelete.unit}</span>
                </div>
                <div>
                  <span className="text-gray-600">দাম:</span>
                  <span className="ml-2 font-medium">৳{itemToDelete.unitPrice.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">ক্লাস:</span>
                  <span className="ml-2 font-medium">
                    {itemToDelete.assignedClass || 'কোনো ক্লাস নেই'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">সতর্কতা</p>
                <p className="text-yellow-700 mt-1">
                  এই পণ্যটি ডিলিট করলে এটি স্থায়ীভাবে মুছে যাবে এবং পুনরুদ্ধার করা যাবে না।
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AllStockPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AllStockPage />
    </ProtectedRoute>
  );
}
