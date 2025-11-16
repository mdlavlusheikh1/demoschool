'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import TeacherLayout from '@/components/TeacherLayout';
import TransactionsTable from '@/components/TransactionsTable';
import { accountingQueries, FinancialTransaction, FinancialCategory } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { CreditCard } from 'lucide-react';

// Helper function to convert numbers to Bengali numerals
const toBengaliNumerals = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '০';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const formatted = num.toLocaleString('en-US');
  return formatted.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

function AccountingPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(7);
  const router = useRouter();

  // Pagination calculations
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch financial data from Firestore
  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setDataLoading(true);
        setError(null);

        const schoolId = SCHOOL_ID; // Should come from user context

        // Get all transactions first
        const transactionsData = await accountingQueries.getAllTransactions(schoolId);
        
        // Filter out donation transactions
        const transactionsWithoutDonation = transactionsData.filter((t: FinancialTransaction) => 
          t.category !== 'donation' && 
          !t.category?.toLowerCase().includes('donation') &&
          !(t.type === 'income' && t.category?.toLowerCase().includes('অনুদান'))
        );
        
        // Sort by date descending (newest first)
        // Handle different date formats: ISO string, date string, or timestamp
        transactionsWithoutDonation.sort((a, b) => {
          const getDateValue = (transaction: FinancialTransaction): number => {
            // Try collectionDate first (most accurate)
            if (transaction.collectionDate) {
              const date = transaction.collectionDate;
              if (date && typeof date === 'object' && 'toDate' in date) {
                return (date as any).toDate().getTime();
              }
              return new Date(date as string).getTime();
            }
            // Try paymentDate
            if (transaction.paymentDate) {
              const date = transaction.paymentDate;
              if (date && typeof date === 'object' && 'toDate' in date) {
                return (date as any).toDate().getTime();
              }
              return new Date(date as string).getTime();
            }
            // Try date field
            if (transaction.date) {
              const date = transaction.date;
              if (date && typeof date === 'object' && 'toDate' in date) {
                return (date as any).toDate().getTime();
              }
              return new Date(date as string).getTime();
            }
            // Try createdAt
            if (transaction.createdAt) {
              const date = transaction.createdAt;
              if (date && typeof date === 'object' && 'toDate' in date) {
                return (date as any).toDate().getTime();
              }
              return new Date(date as string).getTime();
            }
            // Fallback to 0 (oldest)
            return 0;
          };
          
          const dateA = getDateValue(a);
          const dateB = getDateValue(b);
          
          // Sort descending (newest first)
          return dateB - dateA;
        });
        
        setTransactions(transactionsWithoutDonation); // Store transactions without donation, sorted by date

        // Calculate financial summary excluding donations
        const summary = {
          totalIncome: transactionsWithoutDonation
            .filter(t => t.type === 'income' && t.status === 'completed')
            .reduce((sum: number, t: FinancialTransaction) => sum + (t.amount || 0), 0),
          totalExpense: transactionsWithoutDonation
            .filter(t => t.type === 'expense' && t.status === 'completed')
            .reduce((sum: number, t: FinancialTransaction) => sum + (t.amount || 0), 0),
          netAmount: 0,
          pendingIncome: transactionsWithoutDonation
            .filter(t => t.type === 'income' && t.status === 'pending')
            .reduce((sum: number, t: FinancialTransaction) => sum + (t.amount || 0), 0),
          pendingExpense: transactionsWithoutDonation
            .filter(t => t.type === 'expense' && t.status === 'pending')
            .reduce((sum: number, t: FinancialTransaction) => sum + (t.amount || 0), 0),
          transactionCount: transactionsWithoutDonation.length
        };
        summary.netAmount = summary.totalIncome - summary.totalExpense;
        setFinancialSummary(summary);

        // Get categories
        const categoriesData = await accountingQueries.getAllCategories(schoolId);
        setCategories(categoriesData);

      } catch (err) {
        console.error('Error fetching financial data:', err);
        setError('আর্থিক তথ্য লোড করতে ত্রুটি হয়েছে');
      } finally {
        setDataLoading(false);
      }
    };

    if (user) {
      fetchFinancialData();
    }
  }, [user]);

  // Create sample financial data
  const handleCreateSampleData = async () => {
    try {
      setDataLoading(true);
      const schoolId = SCHOOL_ID;
      // Function removed - just show alert
      alert('নমুনা ডেটা তৈরি ফাংশন অপসারণ করা হয়েছে');
      setDataLoading(false);
    } catch (err) {
      console.error('Error creating sample data:', err);
      setError('নমুনা তথ্য তৈরি করতে ত্রুটি হয়েছে');
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

  if (loading) {
    return (
      <TeacherLayout title="হিসাব ব্যবস্থাপনা" subtitle="আর্থিক লেনদেন ও হিসাব পরিচালনা করুন">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="হিসাব ব্যবস্থাপনা" subtitle="আর্থিক লেনদেন ও হিসাব পরিচালনা করুন">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট আয়</p>
                  <p className="text-2xl font-bold text-green-600">
                    ৳{toBengaliNumerals(financialSummary?.totalIncome)}
                  </p>
                  <div className="flex items-center mt-1">
                    <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-xs text-green-600">+১২.৫%</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট ব্যয়</p>
                  <p className="text-2xl font-bold text-red-600">
                    ৳{toBengaliNumerals(financialSummary?.totalExpense)}
                  </p>
                  <div className="flex items-center mt-1">
                    <svg className="w-4 h-4 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17l5-5m0 0l-5-5m5 5H6" />
                    </svg>
                    <span className="text-xs text-red-600">+৮.২%</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">নিট মুনাফা</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ৳{toBengaliNumerals(financialSummary?.netAmount)}
                  </p>
                  <div className="flex items-center mt-1">
                    <svg className="w-4 h-4 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-xs text-blue-600">+১৫.৮%</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">বকেয়া পেমেন্ট</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ৳{toBengaliNumerals(financialSummary?.pendingIncome)}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-orange-600">
                      {financialSummary?.pendingIncome > 0 ? 'বকেয়া আছে' : 'সব কিছু আপডেট'}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

        {/* Charts and Analytics - Only show if there are categories */}
          {(categories.filter(c => c.type === 'income').length > 0 || categories.filter(c => c.type === 'expense').length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Income Breakdown */}
              {categories.filter(c => c.type === 'income').length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">আয়ের ভাগ</h3>
                  {dataLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categories
                        .filter(c => c.type === 'income' && c.name !== 'donation' && !c.name.toLowerCase().includes('donation') && !c.name.includes('অনুদান'))
                        .map((category, index) => {
                        const categoryTransactions = transactions.filter(t =>
                          t.category === category.name && t.type === 'income' && t.status === 'completed'
                        );
                        const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
                        const percentage = financialSummary?.totalIncome > 0
                          ? (totalAmount / financialSummary.totalIncome * 100).toFixed(1)
                          : '0';

                        return (
                          <div key={category.id || index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-sm text-gray-700">{category.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">৳{toBengaliNumerals(totalAmount)}</div>
                              <div className="text-xs text-gray-500">{toBengaliNumerals(parseFloat(percentage))}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Expense Breakdown */}
              {categories.filter(c => c.type === 'expense').length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">ব্যয়ের ভাগ</h3>
                  {dataLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categories.filter(c => c.type === 'expense').map((category, index) => {
                        const categoryTransactions = transactions.filter(t =>
                          t.category === category.name && t.type === 'expense' && t.status === 'completed'
                        );
                        const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
                        const percentage = financialSummary?.totalExpense > 0
                          ? (totalAmount / financialSummary.totalExpense * 100).toFixed(1)
                          : '0';

                        return (
                          <div key={category.id || index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="text-sm text-gray-700">{category.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">৳{toBengaliNumerals(totalAmount)}</div>
                              <div className="text-xs text-gray-500">{toBengaliNumerals(parseFloat(percentage))}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recent Transactions */}
          <TransactionsTable
            transactions={transactions}
            currentTransactions={currentTransactions}
            dataLoading={dataLoading}
            startIndex={startIndex}
            endIndex={endIndex}
            totalPages={totalPages}
            currentPage={currentPage}
            goToPage={goToPage}
            goToPrevious={goToPrevious}
            goToNext={goToNext}
            actionButtons={
              <button
                onClick={() => router.push('/teacher/accounting/fee-collection-center')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>ফি আদায় কেন্দ্র</span>
              </button>
            }
          />
    </TeacherLayout>
  );
}

export default function AccountingPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AccountingPage />
    </ProtectedRoute>
  );
}
