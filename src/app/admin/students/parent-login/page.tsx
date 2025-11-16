'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { studentQueries, User as StudentUser, settingsQueries } from '@/lib/database-queries';
import { SCHOOL_ID, SCHOOL_NAME } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  CheckSquare,
  Square,
  ShieldCheck,
} from 'lucide-react';

function ParentLoginPage() {
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [parentPasswords, setParentPasswords] = useState<Record<string, string>>({});
  const router = useRouter();
  const { user, userData } = useAuth();

  useEffect(() => {
    loadStudents();
    loadSchoolSettings();
  }, []);

  // Reset image errors when students change
  useEffect(() => {
    setImageErrors(new Set());
  }, [students]);

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

  const loadStudents = async () => {
    try {
      setStudentsLoading(true);
      setError('');
      const studentsData = await studentQueries.getAllStudents();
      setStudents(studentsData);
      
      // Load parent passwords for all students efficiently
      const passwordMap: Record<string, string> = {};
      
      // Get all unique student emails
      const studentEmails = studentsData
        .filter(s => s.email)
        .map(s => s.email!)
        .filter((email, index, self) => self.indexOf(email) === index);
      
      if (studentEmails.length > 0) {
        // Fetch all parent accounts at once
        const parentQueries = studentEmails.map(email =>
          query(
            collection(db, 'users'),
            where('email', '==', email),
            where('role', '==', 'parent'),
            limit(1)
          )
        );
        
        const parentSnapshots = await Promise.all(
          parentQueries.map(q => getDocs(q))
        );
        
        // Create a map of email to password
        const emailToPassword: Record<string, string> = {};
        parentSnapshots.forEach((snapshot, index) => {
          if (!snapshot.empty) {
            const parentData = snapshot.docs[0].data();
            const email = studentEmails[index];
            // If parent has custom password, use it; otherwise use phone number
            if (parentData.parentPassword || parentData.customPassword) {
              emailToPassword[email] = parentData.parentPassword || parentData.customPassword || '';
            } else {
              const parentPhone = parentData.phoneNumber || parentData.phone || '';
              emailToPassword[email] = parentPhone.replace(/\D/g, '') || '';
            }
          }
        });
        
        // Map passwords to students
        studentsData.forEach(student => {
          if (student.email && emailToPassword[student.email]) {
            passwordMap[student.uid] = emailToPassword[student.email];
          }
        });
      }
      
      setParentPasswords(passwordMap);
    } catch (error) {
      console.error('Error loading students:', error);
      setError('শিক্ষার্থী লোড করতে সমস্যা হয়েছে');
    } finally {
      setStudentsLoading(false);
    }
  };


  // Toggle student selection
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select all students
  const selectAllStudents = () => {
    const filtered = getFilteredStudents();
    if (selectedStudentIds.length === filtered.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filtered.map(s => s.uid));
    }
  };

  // Get filtered students
  const getFilteredStudents = () => {
    return students.filter(student => {
      const matchesSearch = 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.guardianName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.guardianPhone?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClass = selectedClass === 'all' || student.class === selectedClass;
      
      return matchesSearch && matchesClass;
    });
  };

  // Get parent password for a student
  const getParentPassword = async (student: StudentUser): Promise<string> => {
    try {
      if (!student.email) return '-';
      
      // Check if parent account exists with student's email
      const parentQuery = query(
        collection(db, 'users'),
        where('email', '==', student.email),
        where('role', '==', 'parent')
      );
      const parentSnapshot = await getDocs(parentQuery);
      
      if (!parentSnapshot.empty) {
        const parentData = parentSnapshot.docs[0].data();
        // If parent has custom password, use it; otherwise use phone number
        if (parentData.parentPassword || parentData.customPassword) {
          return parentData.parentPassword || parentData.customPassword || '-';
        }
        // Default password is cleaned phone number
        const parentPhone = parentData.phoneNumber || parentData.phone || '';
        return parentPhone.replace(/\D/g, '') || '-';
      }
      
      return '-';
    } catch (error) {
      console.error('Error getting parent password:', error);
      return '-';
    }
  };

  // Check if student has parent login enabled
  const hasParentLogin = async (student: StudentUser): Promise<boolean> => {
    try {
      if (!student.email) return false;
      
      // Check if parent account exists with student's email
      const parentQuery = query(
        collection(db, 'users'),
        where('email', '==', student.email),
        where('role', '==', 'parent')
      );
      const parentSnapshot = await getDocs(parentQuery);
      
      return !parentSnapshot.empty;
    } catch (error) {
      console.error('Error checking parent login:', error);
      return false;
    }
  };

  // Enable parent login for selected students
  const handleEnableParentLogin = async () => {
    if (selectedStudentIds.length === 0) {
      setError('অনুগ্রহ করে অন্তত একটি শিক্ষার্থী নির্বাচন করুন');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccessMessage('');
    
    const selectedStudents = students.filter(s => selectedStudentIds.includes(s.uid));
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    let anyAccountCreated = false; // Track if any new account was created

    for (const student of selectedStudents) {
      setProcessingStudentId(student.uid);
      
      try {
        // Get parent information from student
        const parentName = student.guardianName || student.fatherName || student.motherName || '';
        const parentPhone = student.guardianPhone || student.fatherPhone || student.motherPhone || student.phoneNumber || '';
        const studentEmail = student.email || '';

        if (!parentName || !parentPhone) {
          errors.push(`${student.name || student.displayName || student.studentId}: অভিভাবকের নাম এবং ফোন নম্বর প্রয়োজন`);
          errorCount++;
          continue;
        }

        if (!studentEmail) {
          errors.push(`${student.name || student.displayName || student.studentId}: শিক্ষার্থীর ইমেইল প্রয়োজন`);
          errorCount++;
          continue;
        }

        // Clean phone number first (remove any non-digit characters)
        const cleanPhone = parentPhone.replace(/\D/g, ''); // Remove non-digits
        const password = cleanPhone; // Use cleaned phone number as password

        // Use student's email (created during admission) as parent email
        const parentEmail = studentEmail;

        // Check if parent account already exists by phone number
        const existingParentByPhoneQuery = query(
          collection(db, 'users'),
          where('phoneNumber', '==', parentPhone),
          where('role', '==', 'parent')
        );
        const existingParentByPhoneSnapshot = await getDocs(existingParentByPhoneQuery);

        if (!existingParentByPhoneSnapshot.empty) {
          // Parent already exists, just link the student
          const existingParent = existingParentByPhoneSnapshot.docs[0].data();
          const existingParentUid = existingParentByPhoneSnapshot.docs[0].id;
          
          // Check if we need to create/update Firebase Auth account with student email
          // If existing parent has different email, try to create new Firebase Auth account
          if (existingParent.email !== parentEmail) {
            try {
              // Try to create Firebase Auth account with student email
              const userCredential = await createUserWithEmailAndPassword(auth, parentEmail, password);
              const newParentUid = userCredential.user.uid;
              
              // Update Firestore to use new UID and student email
              await setDoc(doc(db, 'users', newParentUid), {
                uid: newParentUid,
                name: parentName,
                displayName: parentName,
                email: parentEmail,
                phone: parentPhone,
                phoneNumber: parentPhone,
                role: 'parent' as const,
                schoolId: existingParent.schoolId || schoolSettings?.schoolCode || SCHOOL_ID,
                schoolName: existingParent.schoolName || schoolSettings?.schoolName || SCHOOL_NAME,
                isActive: true,
                isApproved: true,
                associatedStudents: [
                  ...(existingParent.associatedStudents || []),
                  {
                    name: student.displayName || student.name || '',
                    class: student.class || '',
                    studentId: student.studentId || '',
                    uid: student.uid
                  }
                ],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              
              // Delete old parent document
              await deleteDoc(doc(db, 'users', existingParentUid));
              
              // Sign out the newly created parent user
              await signOut(auth);
              
              // Update student document to link parent
              const studentRef = doc(db, 'students', student.uid);
              await setDoc(studentRef, {
                parentUid: newParentUid,
                parentEmail: parentEmail,
                updatedAt: serverTimestamp()
              }, { merge: true });

              console.log(`✅ Parent account updated for student: ${student.displayName || student.name}`);
              console.log(`   Login credentials: Email: ${parentEmail}, Password: ${password}`);
              
              anyAccountCreated = true; // Account was created, so admin was signed out
              
              successCount++;
              continue;
            } catch (emailError: any) {
              if (emailError.code === 'auth/email-already-in-use') {
                // Email already exists in Firebase Auth (might be student account)
                // Just update Firestore and link student
                console.warn(`⚠️ Email ${parentEmail} already exists in Firebase Auth`);
              } else {
                throw emailError;
              }
            }
          }
          
          // If email matches, just update and link student
          const associatedStudents = existingParent.associatedStudents || [];
          const isAlreadyLinked = associatedStudents.some((s: any) => s.uid === student.uid);
          
          if (!isAlreadyLinked) {
            await setDoc(doc(db, 'users', existingParentUid), {
              email: parentEmail, // Use student email
              associatedStudents: [
                ...associatedStudents,
                {
                  name: student.displayName || student.name || '',
                  class: student.class || '',
                  studentId: student.studentId || '',
                  uid: student.uid
                }
              ],
              updatedAt: serverTimestamp()
            }, { merge: true });
          }

          // Update student document to link parent
          const studentRef = doc(db, 'students', student.uid);
          const studentDoc = await getDoc(studentRef);
          if (studentDoc.exists()) {
            await setDoc(
              studentRef,
              {
                parentUid: existingParentUid,
                parentEmail: parentEmail, // Use student email
                updatedAt: serverTimestamp()
              },
              { merge: true }
            );
          }

          console.log(`✅ Student linked to existing parent account: ${student.displayName || student.name}`);
          console.log(`   Login credentials: Email: ${parentEmail}, Password: ${password}`);
          
          successCount++;
          continue;
        }

        // Check if parent account exists with student email
        const existingParentByEmailQuery = query(
          collection(db, 'users'),
          where('email', '==', studentEmail),
          where('role', '==', 'parent')
        );
        const existingParentByEmailSnapshot = await getDocs(existingParentByEmailQuery);

        if (!existingParentByEmailSnapshot.empty) {
          // Parent account exists with student email, just update
          const existingParent = existingParentByEmailSnapshot.docs[0].data();
          const existingParentUid = existingParentByEmailSnapshot.docs[0].id;
          
          const associatedStudents = existingParent.associatedStudents || [];
          const isAlreadyLinked = associatedStudents.some((s: any) => s.uid === student.uid);
          
          if (!isAlreadyLinked) {
            await setDoc(
              doc(db, 'users', existingParentUid),
              {
                associatedStudents: [
                  ...associatedStudents,
                  {
                    name: student.displayName || student.name || '',
                    class: student.class || '',
                    studentId: student.studentId || '',
                    uid: student.uid
                  }
                ],
                updatedAt: serverTimestamp()
              },
              { merge: true }
            );

            const studentRef = doc(db, 'students', student.uid);
            const studentDoc = await getDoc(studentRef);
            if (studentDoc.exists()) {
              await setDoc(
                studentRef,
                {
                  parentUid: existingParentUid,
                  parentEmail: studentEmail,
                  updatedAt: serverTimestamp()
                },
                { merge: true }
              );
            }
          }
          
          console.log(`✅ Student linked to existing parent account (by email): ${student.displayName || student.name}`);
          console.log(`   Login credentials: Email: ${studentEmail}, Password: ${password}`);
          
          successCount++;
          continue;
        }

        // Create new parent account
        try {
          console.log(`Creating parent account for student: ${student.displayName || student.name}`, {
            studentEmail,
            password: password.substring(0, 3) + '...',
            passwordLength: password.length,
            parentName,
            parentPhone
          });
          
          // Check if parent account already exists in Firebase Auth (by email)
          // If exists, we'll just update Firestore, otherwise create new account
          let parentUid: string;
          let accountCreated = false;
          
          try {
            // Try to create new parent account in Firebase Auth
            console.log('Attempting to create Firebase Auth account...');
            const userCredential = await createUserWithEmailAndPassword(auth, studentEmail, password);
            parentUid = userCredential.user.uid;
            accountCreated = true;
            console.log('✅ Firebase Auth account created successfully:', parentUid);
            
            // Sign out the newly created parent user immediately
            console.log('Signing out parent user...');
            await signOut(auth);
            console.log('✅ Parent user signed out');
            
            // Note: Admin will be automatically re-authenticated by AuthContext
            // The current admin session should be preserved in the browser
            console.log('Admin session should be preserved');
          } catch (createAuthError: any) {
            console.error('Error creating Firebase Auth account:', createAuthError);
            
            // If account already exists in Firebase Auth, find the existing UID
            if (createAuthError.code === 'auth/email-already-in-use') {
              console.log('Parent account already exists in Firebase Auth, finding existing account...');
              
              // Find existing parent account in Firestore
              const existingParentQuery = query(
                collection(db, 'users'),
                where('email', '==', studentEmail),
                where('role', '==', 'parent'),
                limit(1)
              );
              const existingParentSnapshot = await getDocs(existingParentQuery);
              
              if (!existingParentSnapshot.empty) {
                parentUid = existingParentSnapshot.docs[0].id;
                accountCreated = false;
                console.log('✅ Found existing parent account:', parentUid);
              } else {
                // Account exists in Auth but not in Firestore - try to get UID from Auth
                // We can't directly query Auth, so we'll need to handle this differently
                console.warn('⚠️ Parent account exists in Auth but not in Firestore');
                throw new Error('Parent account exists in authentication but not in database. Please contact admin.');
              }
            } else {
              throw createAuthError;
            }
          }

          const schoolId = schoolSettings?.schoolCode || SCHOOL_ID;
          const schoolName = schoolSettings?.schoolName || SCHOOL_NAME;

          // Check if parent document already exists
          const parentDocRef = doc(db, 'users', parentUid);
          const parentDocSnapshot = await getDoc(parentDocRef);
          
          if (parentDocSnapshot.exists()) {
            // Update existing parent document
            const existingParentData = parentDocSnapshot.data();
            const associatedStudents = existingParentData.associatedStudents || [];
            const isAlreadyLinked = associatedStudents.some((s: any) => s.uid === student.uid);
            
            if (!isAlreadyLinked) {
              await setDoc(
                parentDocRef,
                {
                  associatedStudents: [
                    ...associatedStudents,
                    {
                      name: student.displayName || student.name || '',
                      class: student.class || '',
                      studentId: student.studentId || '',
                      uid: student.uid
                    }
                  ],
                  updatedAt: serverTimestamp()
                },
                { merge: true }
              );
            }
          } else {
            // Create new parent document in Firestore
            const parentData = {
              uid: parentUid,
              name: parentName,
              displayName: parentName,
              email: studentEmail,
              phone: parentPhone,
              phoneNumber: parentPhone,
              role: 'parent' as const,
              schoolId: schoolId,
              schoolName: schoolName,
              isActive: true,
              isApproved: true,
              associatedStudents: [
                {
                  name: student.displayName || student.name || '',
                  class: student.class || '',
                  studentId: student.studentId || '',
                  uid: student.uid
                }
              ],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            await setDoc(parentDocRef, parentData);
          }

          // Update student document to link parent
          const studentRef = doc(db, 'students', student.uid);
          const studentDoc = await getDoc(studentRef);
          if (studentDoc.exists()) {
            await setDoc(
              studentRef,
              {
                parentUid: parentUid,
                parentEmail: studentEmail,
                parentPhone: parentPhone,
                updatedAt: serverTimestamp()
              },
              { merge: true }
            );
            console.log('✅ Student document updated with parent link');
          }
          
          console.log(`✅ Parent login enabled for student: ${student.displayName || student.name}`);
          console.log(`   Login credentials: Email: ${studentEmail}, Password: ${password}`);
          
          // Track if any account was created (which would sign out admin)
          if (accountCreated) {
            anyAccountCreated = true;
            console.log('⚠️ Admin session was signed out. Page will reload to restore session.');
          }
          
          successCount++;
        } catch (createError: any) {
          console.error('Error creating parent account:', createError);
          if (createError.code === 'auth/email-already-in-use') {
            // Email already in use, try to link existing account
            const existingParentByEmailQuery = query(
              collection(db, 'users'),
              where('email', '==', studentEmail),
              where('role', '==', 'parent')
            );
            const existingParentByEmailSnapshot = await getDocs(existingParentByEmailQuery);
            
            if (!existingParentByEmailSnapshot.empty) {
              const existingParent = existingParentByEmailSnapshot.docs[0].data();
              const existingParentUid = existingParentByEmailSnapshot.docs[0].id;
              
              const associatedStudents = existingParent.associatedStudents || [];
              const isAlreadyLinked = associatedStudents.some((s: any) => s.uid === student.uid);
              
              if (!isAlreadyLinked) {
                await setDoc(
                  doc(db, 'users', existingParentUid),
                  {
                    associatedStudents: [
                      ...associatedStudents,
                      {
                        name: student.displayName || student.name || '',
                        class: student.class || '',
                        studentId: student.studentId || '',
                        uid: student.uid
                      }
                    ],
                    updatedAt: serverTimestamp()
                  },
                  { merge: true }
                );

                const studentRef = doc(db, 'students', student.uid);
                const studentDoc = await getDoc(studentRef);
                if (studentDoc.exists()) {
                  await setDoc(
                    studentRef,
                    {
                      parentUid: existingParentUid,
                      parentEmail: studentEmail,
                      updatedAt: serverTimestamp()
                    },
                    { merge: true }
                  );
                }
              }
              
              successCount++;
            } else {
              errors.push(`${student.name || student.displayName || student.studentId}: ${createError.message}`);
              errorCount++;
            }
          } else {
            errors.push(`${student.name || student.displayName || student.studentId}: ${createError.message}`);
            errorCount++;
          }
        }
      } catch (error: any) {
        console.error(`Error processing student ${student.uid}:`, error);
        errors.push(`${student.name || student.displayName || student.studentId}: ${error.message || 'অজানা ত্রুটি'}`);
        errorCount++;
      }
    }

    setProcessingStudentId(null);
    setIsProcessing(false);

    if (successCount > 0) {
      setSuccessMessage(`${successCount} জন শিক্ষার্থীর অভিভাবক লগিন সক্রিয় করা হয়েছে`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // If we created any new accounts, reload the page to restore admin session
      // This is necessary because creating parent accounts signs out the admin
      if (anyAccountCreated) {
        setTimeout(() => {
          console.log('🔄 Reloading page to restore admin session...');
          window.location.reload();
        }, 2000); // Wait 2 seconds to show success message
      }
    }

    if (errorCount > 0) {
      setError(`${errorCount} জন শিক্ষার্থীর জন্য ত্রুটি: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
      setTimeout(() => setError(''), 8000);
    }

    // Clear selection and reload students
    setSelectedStudentIds([]);
    await loadStudents();
  };

  // Get unique classes
  const uniqueClasses = Array.from(new Set(students.map(s => s.class).filter(Boolean))).sort();

  const filteredStudents = getFilteredStudents();
  const allSelected = filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length;

  return (
    <ProtectedRoute>
      <AdminLayout title="অভিভাবক লগিন" subtitle="শিক্ষার্থীদের জন্য অভিভাবক লগিন পারমিশন দিন">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/admin/students')}
            className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            শিক্ষার্থী তালিকায় ফিরে যান
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="শিক্ষার্থী খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>

              {/* Class Filter */}
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">সব ক্লাস</option>
                {uniqueClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={selectAllStudents}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center"
              >
                {allSelected ? (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    সব নির্বাচন বাতিল
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    সব নির্বাচন
                  </>
                )}
              </button>
              
              <button
                onClick={handleEnableParentLogin}
                disabled={isProcessing || selectedStudentIds.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium flex items-center"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    প্রক্রিয়াকরণ...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    লগিন পারমিশন দিন ({selectedStudentIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {studentsLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600">শিক্ষার্থী লোড হচ্ছে...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">কোন শিক্ষার্থী পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={selectAllStudents}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      শিক্ষার্থী
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ক্লাস
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      অভিভাবক
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ফোন
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ইমেইল
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      নতুন পাসওয়ার্ড
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      স্ট্যাটাস
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => {
                    const isSelected = selectedStudentIds.includes(student.uid);
                    const isProcessingThis = processingStudentId === student.uid;
                    
                    return (
                      <tr
                        key={student.uid}
                        className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${isProcessingThis ? 'opacity-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudentSelection(student.uid)}
                            disabled={isProcessing}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                              {(student as any).profileImage && !imageErrors.has(student.uid) ? (
                                <img
                                  src={(student as any).profileImage}
                                  alt={student.displayName || student.name || 'Student'}
                                  className="w-full h-full object-cover"
                                  onError={() => {
                                    setImageErrors(prev => new Set(prev).add(student.uid));
                                  }}
                                />
                              ) : (
                                <span className="text-white font-medium text-sm">
                                  {(student.name?.charAt(0) || student.displayName?.charAt(0) || 'S').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {student.displayName || student.name || 'নাম নেই'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.studentId || 'ID নেই'} | {student.rollNumber || 'রোল নেই'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.class || '-'}</div>
                          <div className="text-sm text-gray-500">{student.section || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {student.guardianName || student.fatherName || student.motherName || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {student.guardianPhone || student.fatherPhone || student.motherPhone || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.email || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900">
                            {parentPasswords[student.uid] || '-'}
                          </div>
                          {!parentPasswords[student.uid] && student.email && (
                            <div className="text-xs text-gray-500 mt-1">
                              ডিফল্ট: {((student.guardianPhone || student.fatherPhone || student.motherPhone || '').replace(/\D/g, '') || '-')}
                            </div>
                          )}
                          {parentPasswords[student.uid] && (
                            <div className="text-xs text-green-600 mt-1">
                              কাস্টম পাসওয়ার্ড
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isProcessingThis ? (
                            <div className="flex items-center text-blue-600">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              <span className="text-xs">প্রক্রিয়াকরণ...</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <ShieldCheck className="w-4 h-4 text-green-600 mr-2" />
                              <span className="text-xs text-gray-600">সক্রিয়</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">নির্দেশনা:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>শিক্ষার্থী নির্বাচন করতে চেকবক্স ব্যবহার করুন</li>
                <li>একসাথে অনেকগুলো শিক্ষার্থী নির্বাচন করতে "সব নির্বাচন" বাটন ব্যবহার করুন</li>
                <li>লগিন পারমিশন দেওয়ার পর অভিভাবকরা শিক্ষার্থীর ইমেইল এবং ফোন নম্বর দিয়ে লগইন করতে পারবেন</li>
                <li>পাসওয়ার্ড হবে অভিভাবকের ফোন নম্বর</li>
              </ul>
            </div>
          </div>
        </div>
      </AdminLayout>
      </ProtectedRoute>
    );
  }

export default ParentLoginPage;

