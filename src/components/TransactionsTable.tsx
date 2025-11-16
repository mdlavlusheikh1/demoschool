'use client';

import { FinancialTransaction } from '@/lib/database-queries';

// Helper function to format date in Bengali
const formatDateInBengali = (dateString: string): string => {
  if (!dateString) return '-';
  
  try {
    // Handle different date formats
    let date: Date;
    if (typeof dateString === 'string') {
      // Check if it's a Firestore timestamp string
      if (dateString.includes('T') && dateString.includes('Z')) {
        date = new Date(dateString);
      } else if (dateString.includes('-')) {
        // Format: YYYY-MM-DD
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }
    
    // Bengali month names
    const bengaliMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    
    // Bengali digits mapping
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    
    const day = date.getDate();
    const month = bengaliMonths[date.getMonth()];
    const year = date.getFullYear();
    
    // Convert day and year to Bengali numerals
    const convertToBengali = (num: number): string => {
      return num.toString().split('').map(digit => bengaliDigits[parseInt(digit)]).join('');
    };
    
    return `${convertToBengali(day)} ${month}, ${convertToBengali(year)}`;
  } catch (error) {
    return dateString; // Return original if error
  }
};

// Helper function to format amount with Bengali numerals (optional)
const formatAmountInBengali = (amount: number): string => {
  // Bengali digits mapping
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  
  // Convert number to Bengali numerals
  const convertToBengali = (num: number): string => {
    return num.toString().split('').map(digit => {
      if (digit === '.') return '.';
      if (digit === ',') return ',';
      return bengaliDigits[parseInt(digit)] || digit;
    }).join('');
  };
  
  // Format with commas for thousands
  const formatted = amount.toLocaleString('en-US');
  return convertToBengali(parseFloat(formatted.replace(/,/g, '')));
};

// Helper function to translate category to Bengali
const getCategoryInBengali = (category: string): string => {
  const categoryMap: { [key: string]: string } = {
    // Fee categories
    'tuition_fee': 'টিউশন ফি',
    'salary': 'টিউশন ফি',
    'exam_fee': 'পরীক্ষার ফি',
    'admission_fee': 'ভর্তি ফি',
    'session_fee': 'সেশন ফি',
    'registration_fee': 'রেজিস্ট্রেশন ফি',
    'library_fee': 'লাইব্রেরি ফি',
    'transport_fee': 'পরিবহন ফি',
    'laboratory_fee': 'ল্যাবরেটরি ফি',
    'sports_fee': 'ক্রীড়া ফি',
    'hostel_fee': 'হোস্টেল ফি',
    'development_fee': 'ডেভেলপমেন্ট ফি',
    'computer_fee': 'কম্পিউটার ফি',
    'scout_fee': 'স্কাউট ফি',
    'red_crescent_fee': 'রেড ক্রিসেন্ট ফি',
    'science_fee': 'বিজ্ঞান ফি',
    'music_fee': 'সঙ্গীত ফি',
    'fine_arts_fee': 'শিল্পকলা ফি',
    'miscellaneous_fee': 'অন্যান্য ফি',
    
    // Expense categories
    'teacher_salary': 'শিক্ষক বেতন',
    'utility_bills': 'ইউটিলিটি বিল',
    'rent': 'ভাড়া',
    'maintenance': 'রক্ষণাবেক্ষণ',
    'office_supplies': 'অফিস সরঞ্জাম',
    'other': 'অন্যান্য',
    
    // Other
    'donation': 'অনুদান',
    'income': 'আয়',
    'expense': 'ব্যয়',
  };
  
  // Check if category exists in map
  if (categoryMap[category.toLowerCase()]) {
    return categoryMap[category.toLowerCase()];
  }
  
  // If category contains Bengali characters, return as is
  if (/[\u0980-\u09FF]/.test(category)) {
    return category;
  }
  
  // Otherwise return the original category (fallback)
  return category;
};

interface TransactionsTableProps {
  transactions: FinancialTransaction[];
  currentTransactions: FinancialTransaction[];
  dataLoading: boolean;
  startIndex: number;
  endIndex: number;
  totalPages: number;
  currentPage: number;
  goToPage: (page: number) => void;
  goToPrevious: () => void;
  goToNext: () => void;
  actionButtons?: React.ReactNode;
}

export default function TransactionsTable({
  transactions,
  currentTransactions,
  dataLoading,
  startIndex,
  endIndex,
  totalPages,
  currentPage,
  goToPage,
  goToPrevious,
  goToNext,
  actionButtons,
}: TransactionsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">সাম্প্রতিক লেনদেন</h3>
          {actionButtons && (
            <div className="flex space-x-2">
              {actionButtons}
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ধরন</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">বিবরণ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">পরিমাণ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">তারিখ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ক্যাটেগরি</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">সংগ্রহকারী</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অবস্থা</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dataLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-gray-600">লেনদেন লোড হচ্ছে...</span>
                  </div>
                </td>
              </tr>
            ) : currentTransactions.length > 0 ? (
              currentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {transaction.type === 'income' ? (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17l5-5m0 0l-5-5m5 5H6" />
                          </svg>
                        </div>
                      )}
                      <span className={`ml-3 text-sm font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? 'আয়' : 'ব্যয়'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.type === 'income' ? '+' : '-'}৳{(transaction.paidAmount || transaction.amount || 0).toLocaleString('bn-BD')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateInBengali(transaction.date || transaction.paymentDate || transaction.collectionDate || '')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getCategoryInBengali(transaction.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.collectedBy || transaction.recordedBy || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : transaction.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.status === 'completed' ? 'সম্পন্ন' :
                       transaction.status === 'pending' ? 'অপেক্ষমাণ' :
                       transaction.status === 'cancelled' ? 'বাতিল' : 'ফেরত'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  কোনো লেনদেন নেই
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {transactions.length > 0 && (
        <div className="mt-6 flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          {/* Pagination Info */}
          <div className="text-sm text-gray-700">
            <span>
              দেখানো হচ্ছে {startIndex + 1}-{Math.min(endIndex, transactions.length)} এর মধ্যে {transactions.length} লেনদেন
            </span>
          </div>

          {/* Pagination Buttons */}
          <div className="flex items-center space-x-2">
            {/* Previous Button */}
            <button
              onClick={goToPrevious}
              disabled={currentPage === 1}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
              }`}
            >
              পূর্ববর্তী
            </button>

            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => goToPage(pageNumber)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      currentPage === pageNumber
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={goToNext}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
              }`}
            >
              পরবর্তী
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

