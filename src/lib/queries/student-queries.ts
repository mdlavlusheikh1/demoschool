import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from './user-queries';

// Student Management Functions
export const studentQueries = {
  // Get all students (only active by default)
  async getAllStudents(onlyActive: boolean = true): Promise<User[]> {
    let q;
    if (onlyActive) {
      q = query(
        collection(db, 'students'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'students'),
        orderBy('createdAt', 'desc')
      );
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get students by school
  async getStudentsBySchool(schoolId: string): Promise<User[]> {
    const q = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get students by class
  async getStudentsByClass(className: string): Promise<User[]> {
    const q = query(
      collection(db, 'students'),
      where('class', '==', className),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get active students
  async getActiveStudents(): Promise<User[]> {
    const q = query(
      collection(db, 'students'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get inactive students
  async getInactiveStudents(): Promise<User[]> {
    const q = query(
      collection(db, 'students'),
      where('isActive', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get pending students (not yet approved)
  async getPendingStudents(): Promise<User[]> {
    const q = query(
      collection(db, 'students'),
      where('isApproved', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get student by ID
  async getStudentById(uid: string): Promise<User | null> {
    const docRef = doc(db, 'students', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } as User : null;
  },

  // Get student by student ID
  async getStudentByStudentId(studentId: string): Promise<User | null> {
    const q = query(
      collection(db, 'students'),
      where('studentId', '==', studentId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { uid: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
  },

  // Create student
  async createStudent(studentData: Omit<User, 'createdAt' | 'updatedAt'> & { uid?: string }): Promise<string> {
    const studentDoc = {
      ...studentData,
      role: 'student' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (studentData.uid) {
      await setDoc(doc(db, 'students', studentData.uid), studentDoc);
      return studentData.uid;
    } else {
      const docRef = await addDoc(collection(db, 'students'), studentDoc);
      return docRef.id;
    }
  },

  // Update student
  async updateStudent(uid: string, updates: Partial<User>): Promise<void> {
    try {
      const docRef = doc(db, 'students', uid);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      console.log('Updating student document:', uid, 'with data:', updateData);
      await updateDoc(docRef, updateData);
      console.log('Student updated successfully');
    } catch (error) {
      console.error('Error updating student:', error);
      throw new Error(`Failed to update student: ${error}`);
    }
  },

  // Activate/Deactivate student
  async setStudentActive(uid: string, isActive: boolean): Promise<void> {
    const docRef = doc(db, 'students', uid);
    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp()
    });
  },

  // Delete student
  async deleteStudent(uid: string): Promise<void> {
    try {
      console.log('Attempting to delete student:', uid);
      await deleteDoc(doc(db, 'students', uid));
      console.log('Student deleted successfully:', uid);
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  // Approve student (set as approved and active)
  async approveStudent(uid: string): Promise<void> {
    try {
      const docRef = doc(db, 'students', uid);
      await updateDoc(docRef, {
        isApproved: true,
        isActive: true,
        updatedAt: serverTimestamp()
      });
      console.log('Student approved successfully:', uid);
    } catch (error) {
      console.error('Error approving student:', error);
      throw new Error(`Failed to approve student: ${error}`);
    }
  },

  // Reject student (completely delete from database)
  async rejectStudent(uid: string): Promise<void> {
    try {
      const docRef = doc(db, 'students', uid);

      // First, get the student data to log what we're deleting
      const studentDoc = await getDoc(docRef);
      if (studentDoc.exists()) {
        const studentData = studentDoc.data();
        console.log('🗑️ Deleting student:', {
          uid,
          name: studentData.name,
          studentId: studentData.studentId,
          email: studentData.email
        });
      }

      // Delete the document completely
      await deleteDoc(docRef);
      console.log('✅ Student deleted successfully:', uid);
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      throw new Error(`Failed to delete student: ${error}`);
    }
  },

  // Get student statistics
  async getStudentStats(schoolId?: string): Promise<{
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    studentsByClass: Record<string, number>;
    studentsByGender: Record<string, number>;
  }> {
    let q = query(collection(db, 'students'));

    if (schoolId) {
      q = query(q, where('schoolId', '==', schoolId));
    }

    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));

    const stats = {
      totalStudents: students.length,
      activeStudents: students.filter(s => s.isActive).length,
      inactiveStudents: students.filter(s => !s.isActive).length,
      studentsByClass: {} as Record<string, number>,
      studentsByGender: {} as Record<string, number>
    };

    students.forEach(student => {
      // Count by class
      if (student.class) {
        stats.studentsByClass[student.class] = (stats.studentsByClass[student.class] || 0) + 1;
      }

      // Count by gender (assuming gender is stored in displayName or other field)
      // This is a simplified approach - you might want to add a gender field
      const gender = student.displayName?.includes('Female') || student.displayName?.includes('মহিলা') ? 'female' : 'male';
      stats.studentsByGender[gender] = (stats.studentsByGender[gender] || 0) + 1;
    });

    return stats;
  },

  // Bulk import students with auto-generated emails
  async bulkImportStudents(studentsData: Array<Omit<User, 'createdAt' | 'updatedAt' | 'email'> & { email?: string }>): Promise<string[]> {
    const importedIds: string[] = [];

    for (const studentData of studentsData) {
      // Auto-generate email if not provided
      const email = studentData.email || this.generateRandomEmail(studentData.name || 'student', 'iqra');

      const studentDoc = {
        ...studentData,
        email,
        role: 'student' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'students'), studentDoc);
      importedIds.push(docRef.id);
    }

    return importedIds;
  },

  // Create student with auto-generated email
  async createStudentWithAutoEmail(studentData: Omit<User, 'createdAt' | 'updatedAt' | 'email'> & { email?: string }): Promise<string> {
    // Check if student ID already exists
    if (studentData.studentId) {
      const existingStudent = await this.getStudentByStudentId(studentData.studentId);
      if (existingStudent) {
        console.log(`⚠️ Student ID ${studentData.studentId} already exists, but continuing with save...`);
        // Don't throw error, let the calling function handle it
      }
    }

    // Auto-generate email if not provided
    const email = studentData.email || this.generateStudentEmail(
      studentData.name || 'student',
      studentData.studentId || '001',
      'iqra'
    );

    const studentDoc = {
      ...studentData,
      email,
      role: 'student' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log('🔍 Student document to save:', studentDoc);

    if (studentData.uid) {
      await setDoc(doc(db, 'students', studentData.uid), studentDoc);
      return studentData.uid;
    } else {
      const docRef = await addDoc(collection(db, 'students'), studentDoc);
      return docRef.id;
    }
  },

  // Email generation utilities
  generateRandomEmail(name: string, schoolName: string = 'iqra'): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomNumber = Math.floor(Math.random() * 1000);
    return `${cleanName}${randomNumber}@${schoolName}.com`;
  },

  generateStudentEmail(name: string, studentId: string, schoolName: string = 'iqra'): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${cleanName}.${studentId}@${schoolName}.edu.bd`;
  }
};
