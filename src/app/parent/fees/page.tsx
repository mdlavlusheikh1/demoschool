'use client';

import { useState, useEffect, useCallback } from 'react';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ID } from '@/lib/constants';
import { studentQueries, accountingQueries } from '@/lib/database-queries';
import { feeQueries } from '@/lib/queries/fee-queries';
import { DollarSign, CreditCard, Clock, CheckCircle, AlertCircle, Loader2, Users } from 'lucide-react';

// Helper function to get students by parent
const getStudentsByParent = async (parentEmail?: string, parentPhone?: string) => {
  try {
    const allStudents = await studentQueries.getAllStudents();
    
    if (!parentEmail && !parentPhone) {
      return [];
    }

    const myChildren = allStudents.filter(student => {
      const guardianPhone = (student as any).guardianPhone || '';
      const fatherPhone = (student as any).fatherPhone || '';
      const motherPhone = (student as any).motherPhone || '';
      const parentEmailField = (student as any).parentEmail || '';
      
      return (parentPhone && (guardianPhone === parentPhone || fatherPhone === parentPhone || motherPhone === parentPhone)) ||
             (parentEmail && parentEmailField === parentEmail);
    });

    return myChildren;
  } catch (error) {
    console.error('Error getting students by parent:', error);
    return [];
  }
};

// Helper function to convert numbers to Bengali numerals
const toBengaliNumerals = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '০';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const formatted = num.toLocaleString('en-US');
  return formatted.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return `৳ ${toBengaliNumerals(Math.round(amount))}`;
};

// Helper function to format date
const formatDate = (date: string): string => {
  if (!date) return '';
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return date;
  }
};

function FeesPage() {
  const { userData, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [feeCollections, setFeeCollections] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDue: 0,
    totalPaid: 0,
    totalFees: 0
  });

  const loadFees = useCallback(async () => {
    try {
      setLoading(true);
      
      const parentEmail = user?.email || (userData as any)?.email;
      const parentPhone = (userData as any)?.phone || user?.phoneNumber;
      
      // Load children
      const myChildren = await getStudentsByParent(parentEmail, parentPhone);
      setStudents(myChildren.map(s => ({
        id: (s as any).uid || (s as any).id || '',
        name: s.name || '',
        className: (s as any).className || (s as any).class || '',
        section: (s as any).section || '',
      })));

      if (myChildren.length === 0) {
        setLoading(false);
        return;
      }

      // Load fee collections and financial transactions for all students
      const allCollections: any[] = [];
      // Create a set of all possible student identifiers (uid, id, studentId)
      const studentIdSet = new Set<string>();
      const studentIdentifierMap = new Map<string, any>(); // Map from any identifier to student
      
      myChildren.forEach(child => {
        const uid = (child as any).uid || '';
        const id = (child as any).id || '';
        const studentId = (child as any).studentId || '';
        
        if (uid) {
          studentIdSet.add(uid);
          studentIdentifierMap.set(uid, child);
        }
        if (id && id !== uid) {
          studentIdSet.add(id);
          studentIdentifierMap.set(id, child);
        }
        if (studentId && studentId !== uid && studentId !== id) {
          studentIdSet.add(studentId);
          studentIdentifierMap.set(studentId, child);
        }
      });
      
      const studentIds = Array.from(studentIdSet);
      console.log(`Found ${studentIds.length} unique student identifiers for ${myChildren.length} students`);
      
      // Fee-related categories in financial transactions
      const feeCategories = ['admission_fee', 'session_fee', 'exam_fee', 'registration_fee', 'tuition_fee'];

      // Load fee collections from feeCollections collection
      for (const studentId of studentIds) {
        try {
          const collections = await feeQueries.getFeeCollectionsByStudent(studentId);
          const student = studentIdentifierMap.get(studentId);
          allCollections.push(...collections.map(collection => ({
            ...collection,
            studentName: student?.name || '',
            source: 'feeCollection'
          })));
        } catch (error) {
          console.error(`Error loading fee collections for student ${studentId}:`, error);
        }
      }

      // Load financial transactions (fees stored as transactions)
      try {
        const allTransactions = await accountingQueries.getAllTransactions(SCHOOL_ID);
        const studentMap = new Map(myChildren.map(c => [((c as any).uid || (c as any).id), c]));
        
        // Filter transactions by studentId and fee categories
        const feeTransactions = allTransactions.filter(transaction => {
          if (!transaction.studentId && !(transaction as any).uid) return false;
          if (transaction.type !== 'income') return false;
          if (!feeCategories.includes(transaction.category)) return false;
          
          // Match by studentId (could be uid, id, or studentId field)
          // Check all possible student identifiers
          const transStudentId = transaction.studentId || (transaction as any).uid || (transaction as any).id;
          const matchesStudent = studentIdSet.has(transStudentId);
          
          if (matchesStudent) {
            console.log(`✅ Matched transaction for student: ${transStudentId}, Category: ${transaction.category}, Amount: ${transaction.amount || transaction.paidAmount}`);
          }
          
          return matchesStudent;
        });
        
        console.log(`Found ${feeTransactions.length} fee transactions for ${studentIds.length} students`);

        // Convert financial transactions to fee collection format
        feeTransactions.forEach(transaction => {
          const transStudentId = transaction.studentId || (transaction as any).uid || (transaction as any).id;
          // Find student by any identifier (uid, id, or studentId)
          const student = studentIdentifierMap.get(transStudentId) || 
                         myChildren.find(c => {
                           const cUid = (c as any).uid || '';
                           const cId = (c as any).id || '';
                           const cStudentId = (c as any).studentId || '';
                           return cUid === transStudentId || cId === transStudentId || cStudentId === transStudentId;
                         });
          
          if (!student) {
            console.warn(`⚠️ Could not find student for transaction with studentId: ${transStudentId}`);
          }
          
          // Map category to Bengali fee name
          const feeNameMap: Record<string, string> = {
            'admission_fee': 'ভর্তি ফি',
            'session_fee': 'সেশন ফি',
            'exam_fee': 'পরীক্ষার ফি',
            'registration_fee': 'রেজিস্ট্রেশন ফি',
            'tuition_fee': 'টিউশন ফি'
          };
          
          const feeName = feeNameMap[transaction.category] || transaction.description || transaction.category;
          
          // For tuition fee, include month in fee name to make it unique per month
          let uniqueFeeName = feeName;
          if (transaction.category === 'tuition_fee' && (transaction as any).month) {
            uniqueFeeName = `${feeName} - ${(transaction as any).month}`;
          }
          
          // Determine status: completed = paid, pending = due
          const status = transaction.status === 'completed' ? 'paid' : 'pending';
          
          // Get amount (use paidAmount if available, otherwise amount)
          // For tuition fee, also include donation if available
          let amount = transaction.paidAmount || transaction.amount || 0;
          if (transaction.category === 'tuition_fee' && (transaction as any).donation) {
            amount += (transaction as any).donation;
          }
          
          if (amount > 0) {
            allCollections.push({
              id: transaction.id || `trans_${Date.now()}_${Math.random()}`,
              feeId: `trans_${transaction.id}`,
              feeName: uniqueFeeName,
              studentId: transStudentId,
              studentName: transaction.studentName || student?.name || '',
              classId: transaction.classId || '',
              className: transaction.className || student?.class || '',
              amount: transaction.paidAmount || transaction.amount || 0, // Base amount without donation
              donation: (transaction as any).donation || 0, // Separate donation field
              lateFee: 0,
              totalAmount: amount, // Total including donation
              paymentDate: transaction.paymentDate || (status === 'paid' ? transaction.date : ''),
              dueDate: transaction.dueDate || transaction.date || '',
              status: status,
              paymentMethod: transaction.paymentMethod,
              transactionId: transaction.reference || transaction.voucherNumber || transaction.id,
              voucherNumber: (transaction as any).voucherNumber || transaction.reference || '',
              month: (transaction as any).month || '',
              monthIndex: (transaction as any).monthIndex,
              notes: transaction.notes,
              collectedBy: transaction.collectedBy || transaction.recordedBy || '',
              schoolId: transaction.schoolId,
              source: 'transaction'
            });
          }
        });
      } catch (error) {
        console.error('Error loading financial transactions:', error);
      }

      // Remove duplicates and handle multiple payments for the same fee
      // For tuition fees with months, each month should be a separate entry
      // For other fees, prefer feeCollections over transactions if both exist
      const uniqueCollections = new Map<string, any>();
      allCollections.forEach(collection => {
        // For tuition fees with month information, use transactionId or voucherNumber for uniqueness
        // This allows multiple payments for the same month to be tracked separately
        let key: string;
        
        if (collection.feeName.includes('টিউশন ফি') && collection.month) {
          // For tuition fees with month: use studentId + month + transactionId/voucherNumber
          // This allows multiple payments for the same month to be shown separately
          const transactionId = collection.transactionId || collection.voucherNumber || collection.id || '';
          key = `${collection.studentId}_টিউশন ফি_${collection.month}_${transactionId}`;
        } else if (collection.transactionId || collection.voucherNumber) {
          // For other fees with transaction ID, use it for uniqueness
          const transactionId = collection.transactionId || collection.voucherNumber;
          const dateKey = collection.dueDate || collection.paymentDate || collection.date || '';
          const normalizedDate = dateKey ? new Date(dateKey).toISOString().split('T')[0] : '';
          key = `${collection.studentId}_${collection.feeName}_${normalizedDate}_${transactionId}`;
        } else {
          // Fallback: use studentId + feeName + date (normalized)
          const dateKey = collection.dueDate || collection.paymentDate || collection.date || '';
          const normalizedDate = dateKey ? new Date(dateKey).toISOString().split('T')[0] : '';
          key = `${collection.studentId}_${collection.feeName}_${normalizedDate}`;
        }
        
        // If key exists and current is a transaction, skip it (prefer feeCollection)
        // BUT: if it's a tuition fee with different transactionId/voucherNumber, allow it (multiple payments)
        if (uniqueCollections.has(key)) {
          const existing = uniqueCollections.get(key);
          // Only replace if current is feeCollection and existing is transaction
          if (collection.source === 'feeCollection' && existing.source === 'transaction') {
            uniqueCollections.set(key, collection);
          }
          // For tuition fees, if transactionId is different, it's a separate payment - add it
          else if (collection.feeName.includes('টিউশন ফি') && 
                   collection.transactionId && 
                   existing.transactionId !== collection.transactionId) {
            // This is a different transaction for the same month - add it with a modified key
            const newKey = `${key}_${collection.transactionId}`;
            uniqueCollections.set(newKey, collection);
          }
        } else {
          uniqueCollections.set(key, collection);
        }
      });

      const finalCollections = Array.from(uniqueCollections.values());

      console.log(`Total fee collections: ${allCollections.length}, after deduplication: ${finalCollections.length}`);

      // Sort by due date (overdue first, then by due date)
      finalCollections.sort((a, b) => {
        const dateA = new Date(a.dueDate || a.date || '').getTime();
        const dateB = new Date(b.dueDate || b.date || '').getTime();
        return dateA - dateB;
      });

      setFeeCollections(finalCollections);

      // Calculate stats for due and paid
      const pending = finalCollections.filter(c => c.status === 'pending' || c.status === 'overdue');
      const paid = finalCollections.filter(c => c.status === 'paid');
      
      const totalDue = pending.reduce((sum, c) => sum + (c.totalAmount || c.amount || 0), 0);
      const totalPaid = paid.reduce((sum, c) => sum + (c.totalAmount || c.amount || 0), 0);

      // Calculate total expected fees for all students
      // This includes: Annual tuition fees + Admission/Session fees
      let totalExpectedFees = 0;
      
      try {
        // Get all active fees from the fee structure
        const allActiveFees = await feeQueries.getActiveFees(SCHOOL_ID);
        
        // Find admission/session/registration fees (these apply to all students regardless of class)
        const admissionSessionFees = allActiveFees.filter(fee => {
          if (!fee.isActive) return false;
          const feeName = (fee.feeName || '').toLowerCase();
          const isAdmissionFee = feeName.includes('ভর্তি') || feeName.includes('admission');
          const isSessionFee = feeName.includes('সেশন') || feeName.includes('session');
          const isRegistrationFee = feeName.includes('রেজিস্ট্রেশন') || feeName.includes('registration');
          return (isAdmissionFee || isSessionFee || isRegistrationFee) && 
                 (fee.feeType === 'one-time' || fee.feeType === 'admission');
        });
        
        console.log(`Found ${admissionSessionFees.length} admission/session/registration fees in fee structure`);
        
        // Get admission/session fees from transactions for reference
        const admissionSessionTransactions = allCollections.filter(c => {
          const feeName = (c.feeName || '').toLowerCase();
          const isAdmission = feeName.includes('ভর্তি') || feeName.includes('admission');
          const isSession = feeName.includes('সেশন') || feeName.includes('session');
          const isRegistration = feeName.includes('রেজিস্ট্রেশন') || feeName.includes('registration');
          return isAdmission || isSession || isRegistration;
        });
        
        // Calculate expected fees for each student
        for (const child of myChildren) {
          const studentClass = (child as any).className || (child as any).class || '';
          const studentName = child.name || '';
          const studentId = (child as any).uid || (child as any).id || '';
          let studentExpectedFees = 0;
          
          // 1. Add admission/session/registration fees (one-time fees for all students)
          for (const fee of admissionSessionFees) {
            studentExpectedFees += fee.amount;
            console.log(`  - ${fee.feeName} (${fee.feeType}): ৳${fee.amount} - Added to ${studentName}`);
          }
          
          // 2. If no admission/session fees in fee structure, check transactions
          // This ensures we include expected fees even if they're not in the fee structure yet
          if (admissionSessionFees.length === 0) {
            const studentAdmissionSessionTransactions = admissionSessionTransactions.filter(t => t.studentId === studentId);
            if (studentAdmissionSessionTransactions.length > 0) {
              // Sum all admission/session fees from transactions for this student
              const totalAdmissionSession = studentAdmissionSessionTransactions.reduce((sum, t) => {
                return sum + (t.totalAmount || t.amount || 0);
              }, 0);
              if (totalAdmissionSession > 0) {
                studentExpectedFees += totalAdmissionSession;
                console.log(`  - Found admission/session fees in transactions: ৳${totalAdmissionSession} - Added to ${studentName}`);
              }
            }
          }
          
          // 3. Find fees applicable to this student's class
          const classSpecificFees = allActiveFees.filter(fee => 
            fee.applicableClasses.includes(studentClass) && 
            fee.isActive &&
            !admissionSessionFees.includes(fee) // Don't double-count admission/session fees
          );
          
          console.log(`Calculating fees for student: ${studentName}, Class: ${studentClass}, Found ${classSpecificFees.length} class-specific fees`);
          
          // 4. Add class-specific fees
          for (const fee of classSpecificFees) {
            let feeAmount = 0;
            if (fee.feeType === 'monthly') {
              // Monthly fees (tuition, etc.): multiply by 12 for annual total
              feeAmount = fee.amount * 12;
              studentExpectedFees += feeAmount;
            } else if (fee.feeType === 'yearly' || fee.feeType === 'annual') {
              // Annual/yearly fees: add once per year
              feeAmount = fee.amount;
              studentExpectedFees += feeAmount;
            } else if (fee.feeType === 'quarterly') {
              // Quarterly fees: multiply by 4 for annual total
              feeAmount = fee.amount * 4;
              studentExpectedFees += feeAmount;
            } else if (fee.feeType === 'exam') {
              // Exam fees: typically paid multiple times per year, estimate 4 exams
              feeAmount = fee.amount * 4;
              studentExpectedFees += feeAmount;
            } else if (fee.feeType === 'one-time' || fee.feeType === 'admission') {
              // Other one-time fees (if any)
              feeAmount = fee.amount;
              studentExpectedFees += feeAmount;
            } else {
              // For any other fee type or undefined, add the amount once
              feeAmount = fee.amount;
              studentExpectedFees += feeAmount;
            }
            console.log(`  - ${fee.feeName} (${fee.feeType}): ৳${fee.amount} => ৳${feeAmount} annual`);
          }
          
          // 5. If no class-specific fees found, try to get from class fee structure
          if (classSpecificFees.length === 0) {
            try {
              const feeStructure = await accountingQueries.getClassFeeStructure(studentClass, SCHOOL_ID);
              if (feeStructure && feeStructure.tuitionFee > 0) {
                // Annual tuition fee
                const annualTuition = feeStructure.tuitionFee * 12;
                studentExpectedFees += annualTuition;
                console.log(`  - Using class fee structure: ৳${feeStructure.tuitionFee}/month => ৳${annualTuition} annual`);
              }
            } catch (error) {
              console.error(`Error getting fee structure for class ${studentClass}:`, error);
            }
          }
          
          console.log(`Student ${studentName} total expected fees: ৳${studentExpectedFees}`);
          totalExpectedFees += studentExpectedFees;
        }
      } catch (error) {
        console.error('Error calculating expected fees:', error);
        // Fallback: use sum of due + paid if we can't calculate expected fees
        totalExpectedFees = totalDue + totalPaid;
      }

      // Use expected fees if calculated, otherwise use due + paid
      const totalFees = totalExpectedFees > 0 ? totalExpectedFees : (totalDue + totalPaid);

      console.log(`Fee stats - Due: ${totalDue}, Paid: ${totalPaid}, Expected Total: ${totalExpectedFees}, Display Total: ${totalFees}`);

      setStats({
        totalDue,
        totalPaid,
        totalFees
      });

    } catch (error) {
      console.error('Error loading fee data:', error);
    } finally {
      setLoading(false);
    }
  }, [userData, user]);

  useEffect(() => {
    if (userData || user) {
      loadFees();
    }
  }, [loadFees, userData, user]);

  // Check if fee is overdue
  const isOverdue = (dueDate: string | undefined, status: string): boolean => {
    if (status === 'paid') return false;
    if (!dueDate) return false;
    try {
      const due = new Date(dueDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      due.setHours(0, 0, 0, 0);
      return due < now;
    } catch {
      return false;
    }
  };

  if (loading) {
    return (
      <ParentLayout title="ফিস ও পেমেন্ট" subtitle="সন্তানদের ফি এবং পেমেন্ট ইতিহাস">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="ফিস ও পেমেন্ট" subtitle="সন্তানদের ফি এবং পেমেন্ট ইতিহাস">
      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">মোট বকেয়া</p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(stats.totalDue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">পরিশোধিত</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(stats.totalPaid)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">মোট ফি</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(stats.totalFees)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Fee Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">ফি বিবরণ</h2>
        </div>
        
        <div className="p-6">
          {students.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
              <p className="text-sm mt-1">আপনার ফোন নম্বর বা ইমেইলের সাথে মিল রয়েছে এমন কোনো শিক্ষার্থী নেই</p>
            </div>
          ) : feeCollections.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">কোনো ফি রেকর্ড নেই</p>
              <p className="text-sm mt-1">এই মুহূর্তে কোনো ফি তথ্য পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feeCollections.map((collection) => {
                const dueDate = collection.dueDate || collection.date || '';
                const overdue = isOverdue(dueDate, collection.status);
                const isPaid = collection.status === 'paid';
                const isPending = collection.status === 'pending';
                
                let bgColor = 'bg-yellow-50';
                let borderColor = 'border-yellow-200';
                let textColor = 'text-yellow-600';
                let statusBg = 'bg-yellow-600';
                let statusText = 'বকেয়া';
                
                if (overdue) {
                  bgColor = 'bg-red-50';
                  borderColor = 'border-red-200';
                  textColor = 'text-red-600';
                  statusBg = 'bg-red-600';
                  statusText = 'বকেয়া';
                } else if (isPaid) {
                  bgColor = 'bg-green-50';
                  borderColor = 'border-green-200';
                  textColor = 'text-green-600';
                  statusBg = 'bg-green-600';
                  statusText = 'পরিশোধিত';
                }

                return (
                  <div key={collection.id} className={`flex items-center justify-between p-4 ${bgColor} border ${borderColor} rounded-lg`}>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {collection.feeName || 'ফি'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        শিক্ষার্থী: {collection.studentName || 'N/A'} 
                        {collection.className ? ` (${collection.className})` : ''}
                      </p>
                      <p className={`text-xs ${textColor} mt-1`}>
                        {isPaid 
                          ? `পরিশোধিত: ${collection.paymentDate ? formatDate(collection.paymentDate) : collection.date ? formatDate(collection.date) : 'N/A'}`
                          : overdue
                            ? `পরিশোধের তারিখ: ${dueDate ? formatDate(dueDate) : 'N/A'} (বিলম্বিত)`
                            : `পরিশোধের তারিখ: ${dueDate ? formatDate(dueDate) : 'N/A'}`
                        }
                      </p>
                      {collection.paymentMethod && isPaid && (
                        <p className="text-xs text-gray-500 mt-1">
                          পেমেন্ট মেথড: {
                            collection.paymentMethod === 'cash' ? 'নগদ' :
                            collection.paymentMethod === 'bank_transfer' ? 'ব্যাংক ট্রান্সফার' :
                            collection.paymentMethod === 'check' ? 'চেক' :
                            collection.paymentMethod === 'online' ? 'অনলাইন' :
                            collection.paymentMethod
                          }
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${textColor}`}>
                        {formatCurrency(collection.totalAmount || collection.amount || 0)}
                      </p>
                      {collection.lateFee && collection.lateFee > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          বিলম্ব ফি: {formatCurrency(collection.lateFee)}
                        </p>
                      )}
                      <span className={`inline-block mt-2 px-3 py-1 ${statusBg} text-white text-xs font-medium rounded-full`}>
                        {statusText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">পেমেন্ট মেথড</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              <CreditCard className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-sm font-semibold text-gray-900">অনলাইন পেমেন্ট</p>
              <p className="text-xs text-gray-500 mt-1">শীঘ্রই আসছে</p>
            </button>
            
            <button className="p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <DollarSign className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="text-sm font-semibold text-gray-900">ব্যাংক ট্রান্সফার</p>
              <p className="text-xs text-gray-500 mt-1">স্কুল অফিসে যোগাযোগ করুন</p>
            </button>
            
            <button className="p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Clock className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="text-sm font-semibold text-gray-900">নগদ পেমেন্ট</p>
              <p className="text-xs text-gray-500 mt-1">স্কুল অফিসে প্রদান করুন</p>
            </button>
          </div>
        </div>
      </div>
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <FeesPage />
    </ProtectedRoute>
  );
}
