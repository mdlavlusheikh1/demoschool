'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { accountingQueries, studentQueries, settingsQueries } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';
import {
  Home, Users, BookOpen, ClipboardList, Calendar, Settings, LogOut, Menu, X,
  UserCheck, GraduationCap, Building, CreditCard, TrendingUp, Search, Bell,
  Plus, Package, Heart, DollarSign, Users2, Gift, Target, Eye, CheckCircle,
  Globe, FileText, Award, MessageSquare, Sparkles, AlertCircle,
  BookOpen as BookOpenIcon, Users as UsersIcon, ArrowLeft, Loader2,
  Filter, RefreshCw, Download, User as UserIcon, Phone, Mail, MapPin
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
// @ts-ignore - file-saver types not available
import { saveAs } from 'file-saver';

interface DonationRecipient {
  id?: string;
  studentId?: string;
  studentName: string;
  className?: string;
  section?: string;
  rollNumber?: string;
  guardianName?: string;
  guardianPhone?: string;
  donationAmount: number;
  purpose: string;
  donationDate: string;
  donorName?: string;
  paymentMethod?: string;
  reference?: string;
  status: string;
  notes?: string;
}

function DonationRecipientsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recipients, setRecipients] = useState<DonationRecipient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadRecipients();
        loadSchoolSettings();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Real-time listener for transactions
  useEffect(() => {
    if (!user) return;

    const schoolId = SCHOOL_ID;
    const unsubscribe = accountingQueries.subscribeToTransactions(schoolId, async (transactions) => {
      console.log('🔄 Real-time transaction update received:', transactions.length);
      // Reload recipients when transactions change
      await loadRecipients();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Convert English numbers to Bengali numerals
  const toBengaliNumerals = (num: number): string => {
    const englishToBengali: { [key: string]: string } = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return num.toString().replace(/[0-9]/g, (digit) => englishToBengali[digit]);
  };

  const loadSchoolSettings = async () => {
    try {
      const settings = await settingsQueries.getSettings();
      if (settings) {
        setSchoolSettings(settings);
        console.log('School settings loaded:', {
          schoolName: settings.schoolName,
          schoolAddress: settings.schoolAddress,
          schoolPhone: settings.schoolPhone,
          schoolEmail: settings.schoolEmail,
          establishmentYear: (settings as any).establishmentYear
        });
      }
    } catch (error) {
      console.error('Error loading school settings:', error);
    }
  };

  const loadRecipients = async () => {
    try {
      setDataLoading(true);
      const schoolId = SCHOOL_ID;
      
      // Get all students
      const studentsData = await studentQueries.getAllStudents();
      
      // Get all donation transactions
      // Include: 1) Category is 'donation', OR 2) Has donation amount > 0 with studentId (from collect-salary)
      const allTransactions = await accountingQueries.getAllTransactions(schoolId);
      const donationTransactions = allTransactions.filter((transaction: any) => {
        // Standard donation transactions
        if (transaction.category === 'donation' || 
            (transaction.type === 'income' && transaction.category?.toLowerCase().includes('donation'))) {
          return true;
        }
        // Donations from collect-salary page (has donation amount with studentId)
        if (transaction.studentId && 
            transaction.donation && 
            parseFloat(transaction.donation) > 0 &&
            transaction.type === 'income') {
          return true;
        }
        return false;
      });

      // Map donation transactions to recipients
      const recipientsMap = new Map<string, DonationRecipient>();

      donationTransactions.forEach((transaction: any) => {
        // Only show donations that are linked to a student (studentId must exist)
        if (transaction.studentId) {
          const student = studentsData.find((s: any) => s.uid === transaction.studentId);
          if (student) {
            // For collect-salary donations, use the donation field amount
            // For regular donations, use the transaction amount
            const donationAmount = transaction.donation && parseFloat(transaction.donation) > 0
              ? parseFloat(transaction.donation)
              : (transaction.amount || 0);
            
            // Skip if donation amount is 0
            if (donationAmount <= 0) return;
            
            const purpose = transaction.purpose || 
                          (transaction.donation > 0 ? 'শিক্ষার্থী সাহায্য' : '') ||
                          transaction.description?.split(' - ')[1] || 
                          'সাধারণ দান';
            const key = `${transaction.studentId}_${purpose}_${transaction.month || ''}`;
            const existing = recipientsMap.get(key);
            
            if (existing) {
              existing.donationAmount += donationAmount;
            } else {
              recipientsMap.set(key, {
                id: transaction.id,
                studentId: transaction.studentId,
                studentName: student.displayName || student.name || 'Unknown',
                className: student.class || transaction.className || '-',
                section: student.section || transaction.section || '-',
                rollNumber: student.rollNumber || transaction.rollNumber || '-',
                guardianName: student.guardianName || '-',
                guardianPhone: student.guardianPhone || '-',
                donationAmount: donationAmount,
                purpose: purpose,
                donationDate: transaction.date || transaction.paymentDate || new Date().toISOString().split('T')[0],
                donorName: transaction.donorName || transaction.description?.split(' - ')[0] || 'অজানা দাতা',
                paymentMethod: transaction.paymentMethod || 'নগদ',
                reference: transaction.reference || transaction.voucherNumber || '-',
                status: transaction.status || 'completed',
                notes: transaction.notes || transaction.month || ''
              });
            }
          }
        }
        // Skip donations that are not linked to a specific student
      });

      const recipientsList = Array.from(recipientsMap.values());
      recipientsList.sort((a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime());
      
      setRecipients(recipientsList);
    } catch (error) {
      console.error('Error loading recipients:', error);
      setRecipients([]);
    } finally {
      setDataLoading(false);
    }
  };

  // Calculate statistics
  const recipientStats = useMemo(() => {
    const totalRecipients = recipients.length;
    const totalAmount = recipients.reduce((sum, recipient) => sum + recipient.donationAmount, 0);
    const uniqueStudents = new Set(recipients.filter(r => r.studentId).map(r => r.studentId));
    
    // Get unique purposes
    const purposes = [...new Set(recipients.map(r => r.purpose))];
    
    return {
      totalRecipients,
      totalAmount,
      uniqueStudents: uniqueStudents.size,
      purposes
    };
  }, [recipients]);

  // Filter recipients
  const filteredRecipients = useMemo(() => {
    let filtered = recipients;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(recipient =>
        recipient.studentName?.toLowerCase().includes(searchLower) ||
        recipient.className?.toLowerCase().includes(searchLower) ||
        recipient.purpose?.toLowerCase().includes(searchLower) ||
        recipient.guardianName?.toLowerCase().includes(searchLower) ||
        recipient.guardianPhone?.toLowerCase().includes(searchLower)
      );
    }

    // Class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(recipient => recipient.className === classFilter);
    }

    // Purpose filter
    if (purposeFilter !== 'all') {
      filtered = filtered.filter(recipient => recipient.purpose === purposeFilter);
    }

    return filtered;
  }, [recipients, searchTerm, classFilter, purposeFilter]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      'completed': { text: 'সম্পন্ন', class: 'bg-green-100 text-green-800' },
      'pending': { text: 'প্রক্রিয়াধীন', class: 'bg-yellow-100 text-yellow-800' },
      'cancelled': { text: 'বাতিল', class: 'bg-red-100 text-red-800' },
      'refunded': { text: 'ফেরত', class: 'bg-gray-100 text-gray-800' }
    };
    const statusInfo = statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  // Get unique classes for filter
  const uniqueClasses = useMemo(() => {
    const classes = recipients
      .map(r => r.className)
      .filter((c): c is string => c !== undefined && c !== '-');
    return [...new Set(classes)].sort();
  }, [recipients]);

  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    if (typeof text !== 'string') return '';
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      
      // Always load fresh settings before export to ensure latest data
      const settings = await settingsQueries.getSettings();
      if (settings) setSchoolSettings(settings);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('পপআপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপআপ অনুমতি দিন।');
        return;
      }

      const currentDate = new Date().toLocaleDateString('bn-BD');
      const totalAmount = filteredRecipients.reduce((sum, recipient) => sum + recipient.donationAmount, 0);

      // Get real school data from settings
      const schoolName = settings?.schoolName || 'ইকরা নূরানী একাডেমি';
      const schoolAddress = settings?.schoolAddress || 'ঢাকা, বাংলাদেশ';
      const schoolPhone = settings?.schoolPhone || '০১৭১১১১১১১১';
      const schoolEmail = settings?.schoolEmail || 'info@ikranurani.edu';
      const establishmentYear = (settings as any)?.establishmentYear || '';
      
      console.log('Exporting recipients PDF with settings:', { schoolName, schoolAddress, schoolPhone, schoolEmail, establishmentYear });

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="bn" dir="ltr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>অনুদান গ্রহীতা তালিকা রিপোর্ট</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
                * {
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    direction: ltr;
                    text-align: left;
                }
                .school-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding: 15px;
                    border-bottom: 2px solid #2563eb;
                }
                .school-name {
                    font-size: 28px;
                    font-weight: bold;
                    color: #2563eb;
                    margin-bottom: 5px;
                }
                .school-info {
                    font-size: 14px;
                    color: #333;
                    margin-bottom: 3px;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding: 15px;
                }
                .report-title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2563eb;
                    margin-bottom: 10px;
                }
                .report-info {
                    font-size: 16px;
                    color: #333;
                    margin-bottom: 5px;
                }
                .summary-box {
                    background-color: #f0f9ff;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 8px;
                    border: 2px solid #2563eb;
                    text-align: center;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 11px;
                    font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                    table-layout: fixed;
                }
                th, td {
                    border: 1px solid #2563eb;
                    padding: 6px 4px;
                    text-align: center;
                    white-space: normal;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    vertical-align: middle;
                }
                th {
                    background-color: #dbeafe;
                    font-weight: bold;
                    color: #1e40af;
                    font-size: 11px;
                    text-align: center;
                    white-space: normal;
                    padding: 6px 4px;
                }
                td {
                    font-size: 11px;
                    white-space: normal;
                    text-align: center;
                    padding: 6px 4px;
                }
                tr:nth-child(even) {
                    background-color: #f9fafb;
                }
                .amount {
                    text-align: center;
                    font-weight: bold;
                    color: #059669;
                }
                @media print {
                    body { padding: 10px; }
                    .no-print { display: none; }
                }
                @page {
                    size: A4 landscape;
                    margin: 0.15in;
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
                <div class="report-title">সকল অনুদান গ্রহীতা</div>
                <div class="report-info">
                    রিপোর্ট তৈরির তারিখ: ${currentDate} | মোট গ্রহীতা: ${filteredRecipients.length} জন
                </div>
            </div>

            <div class="summary-box">
                <strong>মোট অনুদানের পরিমাণ: ৳${totalAmount.toLocaleString('bn-BD')}</strong>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 4%;">ক্রম</th>
                        <th style="width: 13%;">গ্রহীতার নাম</th>
                        <th style="width: 7%;">ক্লাস</th>
                        <th style="width: 6%;">শাখা</th>
                        <th style="width: 6%;">রোল</th>
                        <th style="width: 10%;">অভিভাবক</th>
                        <th style="width: 9%;">ফোন</th>
                        <th style="width: 12%;">উদ্দেশ্য</th>
                        <th style="width: 8%;">পরিমাণ</th>
                        <th style="width: 9%;">তারিখ</th>
                        <th style="width: 6%;">স্ট্যাটাস</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredRecipients.map((recipient, index) => `
                        <tr>
                            <td style="text-align: center;">${index + 1}</td>
                            <td>${escapeHtml(recipient.studentName || '-')}</td>
                            <td>${escapeHtml(recipient.className || '-')}</td>
                            <td>${escapeHtml(recipient.section || '-')}</td>
                            <td>${escapeHtml(recipient.rollNumber || '-')}</td>
                            <td>${escapeHtml(recipient.guardianName || '-')}</td>
                            <td>${escapeHtml(recipient.guardianPhone || '-')}</td>
                            <td>${escapeHtml(recipient.purpose || '-')}</td>
                            <td class="amount">৳${recipient.donationAmount.toLocaleString('bn-BD')}</td>
                            <td>${formatDate(recipient.donationDate)}</td>
                            <td>${recipient.status === 'completed' ? 'সম্পন্ন' : recipient.status === 'pending' ? 'প্রক্রিয়াধীন' : recipient.status === 'cancelled' ? 'বাতিল' : 'ফেরত'}</td>
                        </tr>
                    `).join('')}
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
      
      const totalAmount = filteredRecipients.reduce((sum, recipient) => sum + recipient.donationAmount, 0);

      // Get real school data from settings
      const schoolName = settings?.schoolName || 'ইকরা নূরানী একাডেমি';
      const schoolAddress = settings?.schoolAddress || 'ঢাকা, বাংলাদেশ';
      const schoolPhone = settings?.schoolPhone || '০১৭১১১১১১১১';
      const schoolEmail = settings?.schoolEmail || 'info@ikranurani.edu';
      const establishmentYear = (settings as any)?.establishmentYear || '';
      
      console.log('Exporting recipients DOCX with settings:', { schoolName, schoolAddress, schoolPhone, schoolEmail, establishmentYear });

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
                  text: 'সকল অনুদান গ্রহীতা',
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
                  text: `তারিখ: ${new Date().toLocaleDateString('bn-BD')} | মোট: ${filteredRecipients.length} জন | মোট পরিমাণ: ৳${totalAmount.toLocaleString('bn-BD')}`,
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
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'গ্রহীতার নাম', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ক্লাস', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'শাখা', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'রোল', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'অভিভাবক', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ফোন', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'উদ্দেশ্য', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'পরিমাণ', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'তারিখ', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'স্ট্যাটাস', bold: true })] })] })
                  ]
                }),
                
                // Data rows
                ...filteredRecipients.map((recipient) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: recipient.studentName || '-' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: recipient.className || '-' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: recipient.section || '-' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: recipient.rollNumber || '-' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: recipient.guardianName || '-' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: recipient.guardianPhone || '-' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: recipient.purpose || '-' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳${recipient.donationAmount.toLocaleString('bn-BD')}` })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatDate(recipient.donationDate) })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: recipient.status === 'completed' ? 'সম্পন্ন' : recipient.status === 'pending' ? 'প্রক্রিয়াধীন' : recipient.status === 'cancelled' ? 'বাতিল' : 'ফেরত' })] })] })
                    ]
                  })
                )
              ]
            })
          ]
        }]
      });
      
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const filename = `অনুদান_গ্রহীতা_তালিকা_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, filename);
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
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: true },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: UsersIcon, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
          <button onClick={() => auth.signOut()} className="flex items-center w-full px-6 py-2 mt-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4 mr-3" />
            লগআউট
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center h-full">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 mr-4">
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col justify-center h-full">
                  <div className="flex items-center space-x-2">
                    <Users2 className="w-6 h-6 text-blue-500" />
                    <h1 className="text-xl font-semibold text-gray-900 leading-tight">অনুদান গ্রহীতা</h1>
                  </div>
                  <p className="text-sm text-gray-600 leading-tight">সকল অনুদান গ্রহীতার তথ্য</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 h-full">
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{user?.email?.charAt(0).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/admin/donation')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>অনুদান পেজে ফিরে যান</span>
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট গ্রহীতা</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {dataLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      toBengaliNumerals(recipientStats.totalRecipients)
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users2 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট অনুদান প্রদান</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dataLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      `৳${recipientStats.totalAmount.toLocaleString('bn-BD')}`
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">শিক্ষার্থী সংখ্যা</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {dataLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      toBengaliNumerals(recipientStats.uniqueStudents)
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">উদ্দেশ্যের সংখ্যা</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {dataLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      toBengaliNumerals(recipientStats.purposes.length)
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="গ্রহীতার নাম, ক্লাস, উদ্দেশ্য দিয়ে খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">সব ক্লাস</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <select
                  value={purposeFilter}
                  onChange={(e) => setPurposeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">সব উদ্দেশ্য</option>
                  {recipientStats.purposes.map((purpose) => (
                    <option key={purpose} value={purpose}>{purpose}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={exportToPDF}
                  disabled={isExporting || filteredRecipients.length === 0}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="PDF হিসেবে এক্সপোর্ট করুন"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>PDF</span>
                </button>
                <button
                  onClick={exportToDOCX}
                  disabled={isExporting || filteredRecipients.length === 0}
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
                <button
                  onClick={loadRecipients}
                  disabled={dataLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                  <span>রিফ্রেশ</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recipients List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">সকল অনুদান গ্রহীতা</h3>
              <span className="text-sm text-gray-600">
                মোট: {toBengaliNumerals(filteredRecipients.length)} জন
              </span>
            </div>
            <div className="overflow-x-auto">
              {dataLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">ডাটা লোড হচ্ছে...</span>
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div className="text-center py-12">
                  <Users2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো গ্রহীতা পাওয়া যায়নি</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || classFilter !== 'all' || purposeFilter !== 'all' 
                      ? 'অনুসন্ধান ফিল্টার পরিবর্তন করুন' 
                      : 'এখনও কোনো অনুদান গ্রহীতা রেকর্ড করা হয়নি'}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">গ্রহীতার নাম</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ক্লাস</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">শাখা</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">রোল নম্বর</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অভিভাবকের নাম</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অভিভাবকের ফোন</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">উদ্দেশ্য</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">অনুদানের পরিমাণ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">তারিখ</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecipients.map((recipient, index) => (
                      <tr key={recipient.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{recipient.studentName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{recipient.className || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{recipient.section || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{recipient.rollNumber || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{recipient.guardianName || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{recipient.guardianPhone || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{recipient.purpose}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-bold text-green-600">
                            ৳{recipient.donationAmount.toLocaleString('bn-BD')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(recipient.donationDate)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(recipient.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DonationRecipientsPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DonationRecipientsPage />
    </ProtectedRoute>
  );
}

