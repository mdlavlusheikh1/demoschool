'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { accountingQueries, settingsQueries, studentQueries } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';
import {
  Home, Users, BookOpen, ClipboardList, Calendar, Settings, LogOut, Menu, X,
  UserCheck, GraduationCap, Building, CreditCard, TrendingUp, Search, Bell,
  Plus, Play, Pause, RotateCcw, Activity, Database, Server,
  Package, Heart, DollarSign, Users2,   Gift, Target, Eye, CheckCircle, HandHeart, List, Edit,
  Globe,
  FileText,
  Award,
  MessageSquare,
  Sparkles,
  AlertCircle,
  BookOpen as BookOpenIcon,
  Users as UsersIcon,
  Loader2,
  Filter,
  RefreshCw,
  Save,
  Mail,
  Phone,
  Download,
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
// @ts-ignore - file-saver types not available
import { saveAs } from 'file-saver';

interface DonationTransaction {
  id?: string;
  donorName?: string;
  donorPhone?: string;
  donorEmail?: string;
  amount: number;
  purpose?: string;
  description?: string;
  date: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function DonationPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [donations, setDonations] = useState<DonationTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<DonationTransaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    donorName: '',
    donorPhone: '',
    donorEmail: '',
    amount: '',
    purpose: '',
    customPurpose: '',
    description: '',
    paymentMethod: 'cash',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    status: 'completed'
  });

  const donationPurposes = [
    { value: '', label: 'উদ্দেশ্য নির্বাচন করুন', disabled: true },
    { value: 'শিক্ষার্থী সাহায্য', label: 'শিক্ষার্থী সাহায্য', important: true },
    { value: 'বই ক্রয়', label: 'বই ক্রয়', important: true },
    { value: 'খেলার সামগ্রী', label: 'খেলার সামগ্রী', important: true },
    { value: 'অনুষ্ঠান আয়োজন', label: 'অনুষ্ঠান আয়োজন', important: true },
    { value: 'স্কুল অবকাঠামো উন্নয়ন', label: 'স্কুল অবকাঠামো উন্নয়ন', important: true },
    { value: 'শিক্ষক প্রশিক্ষণ', label: 'শিক্ষক প্রশিক্ষণ', important: false },
    { value: 'ছাত্রাবাস ব্যবস্থাপনা', label: 'ছাত্রাবাস ব্যবস্থাপনা', important: false },
    { value: 'সাধারণ দান', label: 'সাধারণ দান', important: false },
    { value: 'জরুরী তহবিল', label: 'জরুরী তহবিল', important: true },
    { value: 'সেশন ফি', label: 'সেশন ফি', important: false },
    { value: 'other', label: 'অন্যান্য (কাস্টম)', important: false }
  ];
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const { userData } = useAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadDonations();
        loadSchoolSettings();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

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

  const loadDonations = async () => {
    try {
      setDataLoading(true);
      const schoolId = SCHOOL_ID;
      const allTransactions = await accountingQueries.getAllTransactions(schoolId);
      
      // Filter donation transactions
      // Only include standard donation transactions (exclude collect-salary donations)
      // Collect-salary donations have category 'tuition_fee' with donation field - exclude those
      const donationTransactions = allTransactions.filter((transaction: any) => {
        // Exclude collect-salary donations (tuition_fee category with donation field)
        if (transaction.category === 'tuition_fee' && transaction.donation && parseFloat(transaction.donation) > 0) {
          return false;
        }
        
        // Only include transactions where category is 'donation'
        if (transaction.category === 'donation' || 
            (transaction.type === 'income' && transaction.category?.toLowerCase().includes('donation'))) {
          return true;
        }
        
        return false;
      });

      // Map to donation format
      const mappedDonations: DonationTransaction[] = donationTransactions.map((transaction: any) => ({
        id: transaction.id,
        donorName: transaction.description?.split(' - ')[0] || transaction.donorName || 'অজানা দাতা',
        donorPhone: transaction.donorPhone || '-',
        donorEmail: transaction.donorEmail || '-',
        amount: transaction.amount || transaction.paidAmount || 0,
        purpose: transaction.description?.split(' - ')[1] || transaction.purpose || transaction.description || 'সাধারণ দান',
        description: transaction.description || transaction.notes || '',
        date: transaction.date || transaction.paymentDate || new Date().toISOString().split('T')[0],
        status: transaction.status || 'completed',
        paymentMethod: transaction.paymentMethod || 'নগদ',
        reference: transaction.reference || transaction.voucherNumber || '-',
        notes: transaction.notes || '',
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }));

      // Sort by date (newest first)
      mappedDonations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setDonations(mappedDonations);
    } catch (error) {
      console.error('Error loading donations:', error);
      setDonations([]);
    } finally {
      setDataLoading(false);
    }
  };

  // Calculate statistics
  const donationStats = useMemo(() => {
    const totalDonations = donations.reduce((sum, donation) => {
      if (donation.status === 'completed') {
        return sum + donation.amount;
      }
      return sum;
    }, 0);

    // Get unique donors (by name or phone)
    const uniqueDonors = new Set<string>();
    donations.forEach(donation => {
      if (donation.donorName && donation.donorName !== 'অজানা দাতা') {
        uniqueDonors.add(donation.donorName);
      } else if (donation.donorPhone && donation.donorPhone !== '-') {
        uniqueDonors.add(donation.donorPhone);
      }
    });

    // This month's donations
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const thisMonthDonations = donations
      .filter(donation => {
        const donationDate = new Date(donation.date);
        return donationDate.getMonth() === currentMonth && 
               donationDate.getFullYear() === currentYear &&
               donation.status === 'completed';
      })
      .reduce((sum, donation) => sum + donation.amount, 0);

    return {
      totalDonations,
      donorCount: uniqueDonors.size,
      thisMonthDonations
    };
  }, [donations]);

  // Calculate recipient statistics (same as recipients page)
  const [recipientStats, setRecipientStats] = useState({
    totalDonationDistributed: 0,
    totalRecipients: 0
  });

  useEffect(() => {
    const loadRecipientStats = async () => {
      try {
        const schoolId = SCHOOL_ID;
        
        // Get all students
        const studentsData = await studentQueries.getAllStudents();
        
        // Get all donation transactions (same logic as recipients page)
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

        // Map donation transactions to recipients (same logic as recipients page)
        const recipientsMap = new Map<string, any>();

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
                  studentId: transaction.studentId,
                  donationAmount: donationAmount
                });
              }
            }
          }
        });

        const recipientsList = Array.from(recipientsMap.values());
        
        // Calculate total donation distributed (sum of all recipient donation amounts)
        const totalDistributed = recipientsList.reduce((sum, recipient) => 
          sum + recipient.donationAmount, 0
        );

        // Get total recipients count (same as recipients page: recipients.length)
        const totalRecipients = recipientsList.length;

        setRecipientStats({
          totalDonationDistributed: totalDistributed,
          totalRecipients: totalRecipients
        });
      } catch (error) {
        console.error('Error calculating recipient stats:', error);
      }
    };

    if (user) {
      loadRecipientStats();
    }
  }, [user]);

  // Real-time listener for transactions (to update recipient stats)
  useEffect(() => {
    if (!user) return;

    const schoolId = SCHOOL_ID;
    const unsubscribe = accountingQueries.subscribeToTransactions(schoolId, async (transactions) => {
      console.log('🔄 Real-time transaction update received on donation page:', transactions.length);
      // Reload recipient stats when transactions change
      const loadRecipientStats = async () => {
        try {
          // Get all students
          const studentsData = await studentQueries.getAllStudents();
          
          // Get all donation transactions (same logic as recipients page)
          const donationTransactions = transactions.filter((transaction: any) => {
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

          // Map donation transactions to recipients (same logic as recipients page)
          const recipientsMap = new Map<string, any>();

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
                    studentId: transaction.studentId,
                    donationAmount: donationAmount
                  });
                }
              }
            }
          });

          const recipientsList = Array.from(recipientsMap.values());
          
          // Calculate total donation distributed (sum of all recipient donation amounts)
          const totalDistributed = recipientsList.reduce((sum, recipient) => 
            sum + recipient.donationAmount, 0
          );

          // Get total recipients count (same as recipients page: recipients.length)
          const totalRecipients = recipientsList.length;

          setRecipientStats({
            totalDonationDistributed: totalDistributed,
            totalRecipients: totalRecipients
          });
        } catch (error) {
          console.error('Error calculating recipient stats in real-time:', error);
        }
      };
      
      await loadRecipientStats();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filter donations
  const filteredDonations = useMemo(() => {
    let filtered = donations;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(donation =>
        donation.donorName?.toLowerCase().includes(searchLower) ||
        donation.donorPhone?.toLowerCase().includes(searchLower) ||
        donation.purpose?.toLowerCase().includes(searchLower) ||
        donation.description?.toLowerCase().includes(searchLower) ||
        donation.reference?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(donation => donation.status === statusFilter);
    }

    // Date filter
    if (dateFilter === 'thisMonth') {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      filtered = filtered.filter(donation => {
        const donationDate = new Date(donation.date);
        return donationDate.getMonth() === currentMonth && 
               donationDate.getFullYear() === currentYear;
      });
    } else if (dateFilter === 'lastMonth') {
      const currentDate = new Date();
      const lastMonth = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1;
      const lastMonthYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
      filtered = filtered.filter(donation => {
        const donationDate = new Date(donation.date);
        return donationDate.getMonth() === lastMonth && 
               donationDate.getFullYear() === lastMonthYear;
      });
    } else if (dateFilter === 'thisYear') {
      const currentYear = new Date().getFullYear();
      filtered = filtered.filter(donation => {
        const donationDate = new Date(donation.date);
        return donationDate.getFullYear() === currentYear;
      });
    }

    return filtered;
  }, [donations, searchTerm, statusFilter, dateFilter]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateDonationForm = () => {
    if (!formData.donorName.trim()) {
      setErrorMessage('দাতার নাম আবশ্যক');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setErrorMessage('অনুদানের পরিমাণ সঠিকভাবে লিখুন');
      return false;
    }
    if (!formData.purpose.trim()) {
      setErrorMessage('অনুদানের উদ্দেশ্য নির্বাচন করুন');
      return false;
    }
    if (formData.purpose === 'other' && !formData.customPurpose.trim()) {
      setErrorMessage('কাস্টম উদ্দেশ্য লিখুন');
      return false;
    }
    if (!formData.date) {
      setErrorMessage('তারিখ নির্বাচন করুন');
      return false;
    }
    return true;
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateDonationForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const schoolId = SCHOOL_ID;
      const amount = parseFloat(formData.amount);

      // Determine final purpose
      const finalPurpose = formData.purpose === 'other' ? formData.customPurpose : formData.purpose;

      // Prepare donation transaction data
      const donationData: any = {
        type: 'income',
        category: 'donation',
        amount: amount,
        description: `${formData.donorName} - ${finalPurpose}`,
        paymentMethod: formData.paymentMethod as 'cash' | 'bank_transfer' | 'check' | 'online' | 'other',
        status: formData.status as 'pending' | 'completed' | 'cancelled' | 'refunded',
        date: formData.date,
        schoolId: schoolId,
        recordedBy: user?.uid || user?.email || 'admin',
        donorName: formData.donorName,
        purpose: finalPurpose
      };

      // Add optional fields
      if (formData.donorPhone && formData.donorPhone.trim() !== '') {
        donationData.donorPhone = formData.donorPhone.trim();
      }
      if (formData.donorEmail && formData.donorEmail.trim() !== '') {
        donationData.donorEmail = formData.donorEmail.trim();
      }
      if (formData.description && formData.description.trim() !== '') {
        donationData.description = formData.description.trim();
      }
      if (formData.reference && formData.reference.trim() !== '') {
        donationData.reference = formData.reference.trim();
      }
      if (formData.notes && formData.notes.trim() !== '') {
        donationData.notes = formData.notes.trim();
      }

      // Filter out undefined or null values
      const cleanedData: any = {};
      Object.keys(donationData).forEach(key => {
        if (donationData[key] !== undefined && donationData[key] !== null) {
          cleanedData[key] = donationData[key];
        }
      });

      console.log('💾 Saving donation with data:', cleanedData);

      await accountingQueries.createTransaction(cleanedData);

      setSuccessMessage('অনুদান সফলভাবে যোগ করা হয়েছে!');
      
      // Reset form
      setFormData({
        donorName: '',
        donorPhone: '',
        donorEmail: '',
        amount: '',
        purpose: '',
        customPurpose: '',
        description: '',
        paymentMethod: 'cash',
        date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
        status: 'completed'
      });

      // Reload donations
      await loadDonations();

      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowAddDialog(false);
        setSuccessMessage('');
      }, 2000);

    } catch (error) {
      console.error('Error adding donation:', error);
      setErrorMessage('অনুদান যোগ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setShowViewDialog(false);
    setShowEditDialog(false);
    setSelectedDonation(null);
    setErrorMessage('');
    setSuccessMessage('');
    setFormData({
      donorName: '',
      donorPhone: '',
      donorEmail: '',
      amount: '',
      purpose: '',
      customPurpose: '',
      description: '',
      paymentMethod: 'cash',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
      status: 'completed'
    });
  };

  const handleViewDonation = (donation: DonationTransaction) => {
    setSelectedDonation(donation);
    setShowViewDialog(true);
  };

  const handleEditDonation = (donation: DonationTransaction) => {
    setSelectedDonation(donation);
    setFormData({
      donorName: donation.donorName || '',
      donorPhone: donation.donorPhone || '',
      donorEmail: donation.donorEmail || '',
      amount: donation.amount.toString(),
      purpose: donation.purpose || '',
      customPurpose: '',
      description: donation.description || '',
      paymentMethod: donation.paymentMethod || 'cash',
      date: donation.date || new Date().toISOString().split('T')[0],
      reference: donation.reference || '',
      notes: donation.notes || '',
      status: donation.status || 'completed'
    });
    setShowEditDialog(true);
  };

  const handleUpdateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonation?.id) return;

    try {
      setSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      const purpose = formData.purpose === 'other' ? formData.customPurpose : formData.purpose;
      
      const cleanedData: any = {
        type: 'income',
        category: 'donation',
        amount: parseFloat(formData.amount),
        description: `${formData.donorName} - ${purpose}`,
        date: formData.date,
        status: formData.status,
        schoolId: SCHOOL_ID,
        recordedBy: user?.email || 'admin',
        paymentMethod: formData.paymentMethod,
        donorName: formData.donorName,
        donorPhone: formData.donorPhone,
        donorEmail: formData.donorEmail,
        purpose: purpose,
        reference: formData.reference,
        notes: formData.notes
      };

      await accountingQueries.updateTransaction(selectedDonation.id, cleanedData);

      setSuccessMessage('অনুদান সফলভাবে আপডেট করা হয়েছে!');
      
      // Reload donations
      await loadDonations();

      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowEditDialog(false);
        setSelectedDonation(null);
        setSuccessMessage('');
      }, 2000);

    } catch (error) {
      console.error('Error updating donation:', error);
      setErrorMessage('অনুদান আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
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
      const totalAmount = filteredDonations.reduce((sum, donation) => {
        if (donation.status === 'completed') {
          return sum + donation.amount;
        }
        return sum;
      }, 0);

      // Get real school data from settings
      const schoolName = settings?.schoolName || 'ইকরা নূরানী একাডেমি';
      const schoolAddress = settings?.schoolAddress || 'ঢাকা, বাংলাদেশ';
      const schoolPhone = settings?.schoolPhone || '০১৭১১১১১১১১';
      const schoolEmail = settings?.schoolEmail || 'info@ikranurani.edu';
      const establishmentYear = (settings as any)?.establishmentYear || '';
      
      console.log('Exporting with settings:', { schoolName, schoolAddress, schoolPhone, schoolEmail, establishmentYear });

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="bn" dir="ltr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>অনুদান তালিকা রিপোর্ট</title>
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
                }
                th, td {
                    border: 1px solid #2563eb;
                    padding: 8px 6px;
                    text-align: left;
                    word-wrap: break-word;
                }
                th {
                    background-color: #dbeafe;
                    font-weight: bold;
                    color: #1e40af;
                    font-size: 12px;
                    text-align: center;
                }
                td {
                    font-size: 11px;
                }
                tr:nth-child(even) {
                    background-color: #f9fafb;
                }
                .amount {
                    text-align: right;
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
                <div class="report-title">সকল অনুদান</div>
                <div class="report-info">
                    রিপোর্ট তৈরির তারিখ: ${currentDate} | মোট অনুদান: ${filteredDonations.length} টি
                </div>
            </div>

            <div class="summary-box">
                <strong>মোট অনুদানের পরিমাণ: ৳${totalAmount.toLocaleString('bn-BD')}</strong>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">ক্রম</th>
                        <th style="width: 15%;">দাতার নাম</th>
                        <th style="width: 10%;">ফোন</th>
                        <th style="width: 15%;">উদ্দেশ্য</th>
                        <th style="width: 10%;">পরিমাণ (৳)</th>
                        <th style="width: 10%;">পেমেন্ট পদ্ধতি</th>
                        <th style="width: 10%;">তারিখ</th>
                        <th style="width: 10%;">রেফারেন্স</th>
                        <th style="width: 10%;">স্ট্যাটাস</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredDonations.map((donation, index) => `
                        <tr>
                            <td style="text-align: center;">${index + 1}</td>
                            <td>${escapeHtml(donation.donorName || '-')}</td>
                            <td>${escapeHtml(donation.donorPhone || '-')}</td>
                            <td>${escapeHtml(donation.purpose || '-')}</td>
                            <td class="amount">৳${donation.amount.toLocaleString('bn-BD')}</td>
                            <td>${escapeHtml(donation.paymentMethod || 'নগদ')}</td>
                            <td>${formatDate(donation.date)}</td>
                            <td>${escapeHtml(donation.reference || '-')}</td>
                            <td>${donation.status === 'completed' ? 'সম্পন্ন' : donation.status === 'pending' ? 'প্রক্রিয়াধীন' : donation.status === 'cancelled' ? 'বাতিল' : 'ফেরত'}</td>
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
      
      const totalAmount = filteredDonations.reduce((sum, donation) => {
        if (donation.status === 'completed') {
          return sum + donation.amount;
        }
        return sum;
      }, 0);

      // Get real school data from settings
      const schoolName = settings?.schoolName || 'ইকরা নূরানী একাডেমি';
      const schoolAddress = settings?.schoolAddress || 'ঢাকা, বাংলাদেশ';
      const schoolPhone = settings?.schoolPhone || '০১৭১১১১১১১১';
      const schoolEmail = settings?.schoolEmail || 'info@ikranurani.edu';
      const establishmentYear = (settings as any)?.establishmentYear || '';
      
      console.log('Exporting DOCX with settings:', { schoolName, schoolAddress, schoolPhone, schoolEmail, establishmentYear });

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
                  text: 'সকল অনুদান',
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
                  text: `তারিখ: ${new Date().toLocaleDateString('bn-BD')} | মোট: ${filteredDonations.length} টি | মোট পরিমাণ: ৳${totalAmount.toLocaleString('bn-BD')}`,
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
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'দাতার নাম', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ফোন', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'উদ্দেশ্য', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'পরিমাণ', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'পেমেন্ট', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'তারিখ', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'স্ট্যাটাস', bold: true })] })] })
                  ]
                }),
                
                // Data rows
                ...filteredDonations.map((donation, index) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(index + 1) })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: donation.donorName || '-' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: donation.donorPhone || '-' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: donation.purpose || '-' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳${donation.amount.toLocaleString('bn-BD')}` })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: donation.paymentMethod || 'নগদ' })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatDate(donation.date) })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: donation.status === 'completed' ? 'সম্পন্ন' : donation.status === 'pending' ? 'প্রক্রিয়াধীন' : donation.status === 'cancelled' ? 'বাতিল' : 'ফেরত' })] })] })
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
      const filename = `অনুদান_তালিকা_${new Date().toISOString().split('T')[0]}.docx`;
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
          <button onClick={handleLogout} className="flex items-center w-full px-6 py-2 mt-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
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
                    <Heart className="w-6 h-6 text-red-500" />
                    <h1 className="text-xl font-semibold text-gray-900 leading-tight">দান ব্যবস্থাপনা</h1>
                  </div>
                  <p className="text-sm text-gray-600 leading-tight">দান ব্যবস্থাপনা এবং অনুদান সংগ্রহ</p>
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
          {/* Donation Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট অনুদান</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dataLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      `৳${donationStats.totalDonations.toLocaleString('bn-BD')}`
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
                  <p className="text-sm text-gray-600 mb-1">দাতার সংখ্যা</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {dataLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      toBengaliNumerals(donationStats.donorCount)
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
                  <p className="text-sm text-gray-600 mb-1">এই মাসে</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {dataLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      `৳${donationStats.thisMonthDonations.toLocaleString('bn-BD')}`
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট অনুদান প্রদান</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {dataLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      `৳${recipientStats.totalDonationDistributed.toLocaleString('bn-BD')}`
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <HandHeart className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট অনুদান গ্রহীতা</p>
                  <p className="text-2xl font-bold text-teal-600">
                    {dataLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      toBengaliNumerals(recipientStats.totalRecipients)
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <Users2 className="w-5 h-5 text-teal-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex flex-wrap gap-4">
            <button
              onClick={() => setShowAddDialog(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>নতুন অনুদান যোগ করুন</span>
            </button>
            <button
              onClick={() => router.push('/admin/donation/recipients')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 font-medium"
            >
              <Users2 className="w-5 h-5" />
              <span>অনুদান গ্রহীতা</span>
            </button>
            <div className="flex items-center space-x-2 ml-auto">
              <button
                onClick={exportToPDF}
                disabled={isExporting || filteredDonations.length === 0}
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
                disabled={isExporting || filteredDonations.length === 0}
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

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="দাতার নাম, ফোন, উদ্দেশ্য বা রেফারেন্স দিয়ে খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">সব স্ট্যাটাস</option>
                  <option value="completed">সম্পন্ন</option>
                  <option value="pending">প্রক্রিয়াধীন</option>
                  <option value="cancelled">বাতিল</option>
                  <option value="refunded">ফেরত</option>
                </select>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">সব তারিখ</option>
                  <option value="thisMonth">এই মাস</option>
                  <option value="lastMonth">গত মাস</option>
                  <option value="thisYear">এই বছর</option>
                </select>
              </div>
              <button
                onClick={loadDonations}
                disabled={dataLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                <span>রিফ্রেশ</span>
              </button>
            </div>
          </div>

          {/* Donations List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">সকল অনুদান</h3>
              <span className="text-sm text-gray-600">
                মোট: {filteredDonations.length} টি
              </span>
            </div>
            <div className="p-6">
              {dataLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">ডাটা লোড হচ্ছে...</span>
                </div>
              ) : filteredDonations.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো অনুদান পাওয়া যায়নি</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                      ? 'অনুসন্ধান ফিল্টার পরিবর্তন করুন' 
                      : 'এখনও কোনো অনুদান রেকর্ড করা হয়নি'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDonations.map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`w-3 h-3 rounded-full ${donation.status === 'completed' ? 'bg-green-500' : donation.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h4 className="font-medium text-gray-900">{donation.donorName}</h4>
                            {getStatusBadge(donation.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span>{donation.purpose}</span>
                            {donation.donorPhone && donation.donorPhone !== '-' && (
                              <span>• ফোন: {donation.donorPhone}</span>
                            )}
                            <span>• {formatDate(donation.date)}</span>
                            {donation.reference && donation.reference !== '-' && (
                              <span>• রেফারেন্স: {donation.reference}</span>
                            )}
                          </div>
                          {donation.notes && (
                            <p className="text-xs text-gray-500 mt-1">{donation.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 ml-4">
                        <div className="text-right">
                          <p className="font-bold text-green-600 text-lg">
                            ৳{donation.amount.toLocaleString('bn-BD')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {donation.paymentMethod || 'নগদ'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewDonation(donation)}
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center"
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditDonation(donation)}
                            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center"
                            title="সম্পাদনা করুন"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Donation Dialog */}
          {showAddDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Heart className="w-5 h-5 mr-2 text-red-500" />
                      নতুন অনুদান যোগ করুন
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">অনুদান রেকর্ড করুন</p>
                  </div>
                  <button
                    onClick={handleCloseDialog}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddDonation} className="p-6">
                  {/* Success/Error Messages */}
                  {successMessage && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <p className="text-green-800">{successMessage}</p>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <p className="text-red-800">{errorMessage}</p>
                    </div>
                  )}

                  {/* Donor Information */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <Users2 className="w-4 h-4 mr-2 text-blue-600" />
                      দাতার তথ্য
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          দাতার নাম <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="donorName"
                          value={formData.donorName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="দাতার নাম লিখুন"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          ফোন নম্বর
                        </label>
                        <input
                          type="tel"
                          name="donorPhone"
                          value={formData.donorPhone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="০১৭১২৩৪৫৬৭৮"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          ইমেইল
                        </label>
                        <input
                          type="email"
                          name="donorEmail"
                          value={formData.donorEmail}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="donor@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Donation Details */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                      অনুদানের তথ্য
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          অনুদানের পরিমাণ (৳) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          required
                          min="1"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="০"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          অনুদানের উদ্দেশ্য <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="purpose"
                          value={formData.purpose}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {donationPurposes.map((purpose) => (
                            <option 
                              key={purpose.value} 
                              value={purpose.value}
                              disabled={purpose.disabled}
                              className={purpose.important ? 'font-semibold' : ''}
                            >
                              {purpose.label} {purpose.important && '⭐'}
                            </option>
                          ))}
                        </select>
                        {formData.purpose === 'other' && (
                          <input
                            type="text"
                            name="customPurpose"
                            value={formData.customPurpose}
                            onChange={handleInputChange}
                            required
                            className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="কাস্টম উদ্দেশ্য লিখুন"
                          />
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          বিবরণ
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="অনুদানের বিস্তারিত বিবরণ (যদি থাকে)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2 text-purple-600" />
                      পেমেন্ট তথ্য
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          পেমেন্ট পদ্ধতি <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="paymentMethod"
                          value={formData.paymentMethod}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="cash">নগদ</option>
                          <option value="bank_transfer">ব্যাংক ট্রান্সফার</option>
                          <option value="check">চেক</option>
                          <option value="online">অনলাইন</option>
                          <option value="other">অন্যান্য</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          তারিখ <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          রেফারেন্স/রিসিপ্ট নম্বর
                        </label>
                        <input
                          type="text"
                          name="reference"
                          value={formData.reference}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="রিসিপ্ট বা রেফারেন্স নম্বর"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          স্ট্যাটাস
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="completed">সম্পন্ন</option>
                          <option value="pending">প্রক্রিয়াধীন</option>
                          <option value="cancelled">বাতিল</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      অতিরিক্ত নোট
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="যেকোনো অতিরিক্ত তথ্য বা নোট (যদি থাকে)"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleCloseDialog}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>সংরক্ষণ করা হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>অনুদান সংরক্ষণ করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Donation Dialog */}
          {showViewDialog && selectedDonation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Eye className="w-5 h-5 mr-2 text-blue-600" />
                      অনুদান বিস্তারিত
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseDialog}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    {/* Donor Information */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <Users2 className="w-4 h-4 mr-2 text-blue-600" />
                        দাতার তথ্য
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">দাতার নাম</p>
                          <p className="text-base font-medium text-gray-900">{selectedDonation.donorName || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ফোন</p>
                          <p className="text-base font-medium text-gray-900">{selectedDonation.donorPhone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ইমেইল</p>
                          <p className="text-base font-medium text-gray-900">{selectedDonation.donorEmail || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Donation Information */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <Heart className="w-4 h-4 mr-2 text-red-600" />
                        অনুদান তথ্য
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">পরিমাণ</p>
                          <p className="text-2xl font-bold text-green-600">৳{selectedDonation.amount.toLocaleString('bn-BD')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">উদ্দেশ্য</p>
                          <p className="text-base font-medium text-gray-900">{selectedDonation.purpose || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">পেমেন্ট পদ্ধতি</p>
                          <p className="text-base font-medium text-gray-900">
                            {selectedDonation.paymentMethod === 'cash' ? 'নগদ' :
                             selectedDonation.paymentMethod === 'bank_transfer' ? 'ব্যাংক ট্রান্সফার' :
                             selectedDonation.paymentMethod === 'check' ? 'চেক' :
                             selectedDonation.paymentMethod === 'online' ? 'অনলাইন' : selectedDonation.paymentMethod || 'নগদ'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">তারিখ</p>
                          <p className="text-base font-medium text-gray-900">{formatDate(selectedDonation.date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">স্ট্যাটাস</p>
                          <div className="mt-1">{getStatusBadge(selectedDonation.status)}</div>
                        </div>
                        {selectedDonation.reference && selectedDonation.reference !== '-' && (
                          <div>
                            <p className="text-sm text-gray-600">রেফারেন্স</p>
                            <p className="text-base font-medium text-gray-900">{selectedDonation.reference}</p>
                          </div>
                        )}
                      </div>
                      {selectedDonation.notes && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600">নোট</p>
                          <p className="text-base text-gray-900 mt-1">{selectedDonation.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => handleEditDonation(selectedDonation)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span>সম্পাদনা করুন</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseDialog}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        বন্ধ করুন
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Donation Dialog */}
          {showEditDialog && selectedDonation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Edit className="w-5 h-5 mr-2 text-green-600" />
                      অনুদান সম্পাদনা করুন
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">অনুদান তথ্য আপডেট করুন</p>
                  </div>
                  <button
                    onClick={handleCloseDialog}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateDonation} className="p-6">
                  {/* Success/Error Messages */}
                  {successMessage && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <p className="text-green-800">{successMessage}</p>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <p className="text-red-800">{errorMessage}</p>
                    </div>
                  )}

                  {/* Same form fields as Add Dialog */}
                  {/* Donor Information */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <Users2 className="w-4 h-4 mr-2 text-blue-600" />
                      দাতার তথ্য
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          দাতার নাম <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="donorName"
                          value={formData.donorName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="দাতার নাম লিখুন"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ফোন</label>
                        <input
                          type="tel"
                          name="donorPhone"
                          value={formData.donorPhone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="০১৭১২৩৪৫৬৭৮"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ইমেইল</label>
                        <input
                          type="email"
                          name="donorEmail"
                          value={formData.donorEmail}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="donor@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Donation Information */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <Heart className="w-4 h-4 mr-2 text-red-600" />
                      অনুদান তথ্য
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          পরিমাণ (৳) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="০"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          উদ্দেশ্য <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="purpose"
                          value={formData.purpose}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {donationPurposes.map((purpose) => (
                            <option key={purpose.value} value={purpose.value} disabled={purpose.disabled}>
                              {purpose.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {formData.purpose === 'other' && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            কাস্টম উদ্দেশ্য <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="customPurpose"
                            value={formData.customPurpose}
                            onChange={handleInputChange}
                            required={formData.purpose === 'other'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="উদ্দেশ্য লিখুন"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">বিবরণ</label>
                        <input
                          type="text"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="বিবরণ (যদি থাকে)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">স্ট্যাটাস</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="completed">সম্পন্ন</option>
                          <option value="pending">প্রক্রিয়াধীন</option>
                          <option value="cancelled">বাতিল</option>
                          <option value="refunded">ফেরত</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2 text-purple-600" />
                      পেমেন্ট তথ্য
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          পেমেন্ট পদ্ধতি <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="paymentMethod"
                          value={formData.paymentMethod}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="cash">নগদ</option>
                          <option value="bank_transfer">ব্যাংক ট্রান্সফার</option>
                          <option value="check">চেক</option>
                          <option value="online">অনলাইন</option>
                          <option value="other">অন্যান্য</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          তারিখ <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">রেফারেন্স</label>
                        <input
                          type="text"
                          name="reference"
                          value={formData.reference}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="রেফারেন্স নম্বর (যদি থাকে)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">নোট</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="যেকোনো অতিরিক্ত তথ্য বা নোট (যদি থাকে)"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleCloseDialog}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>আপডেট করা হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>আপডেট করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function DonationPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DonationPage />
    </ProtectedRoute>
  );
}
