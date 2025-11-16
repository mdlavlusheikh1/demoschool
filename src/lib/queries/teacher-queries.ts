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

// Teacher Management Functions
export const teacherQueries = {
  // Get all teachers (only active by default)
  async getAllTeachers(onlyActive: boolean = true): Promise<User[]> {
    let q;
    if (onlyActive) {
      q = query(
        collection(db, 'teachers'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'teachers'),
        orderBy('createdAt', 'desc')
      );
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get teachers by school
  async getTeachersBySchool(schoolId: string): Promise<User[]> {
    const q = query(
      collection(db, 'teachers'),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get teachers by subject
  async getTeachersBySubject(subject: string): Promise<User[]> {
    const q = query(
      collection(db, 'teachers'),
      where('subject', '==', subject),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get active teachers
  async getActiveTeachers(): Promise<User[]> {
    const q = query(
      collection(db, 'teachers'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get inactive teachers
  async getInactiveTeachers(): Promise<User[]> {
    const q = query(
      collection(db, 'teachers'),
      where('isActive', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get teacher by ID
  async getTeacherById(uid: string): Promise<User | null> {
    const docRef = doc(db, 'teachers', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } as User : null;
  },

  // Get teacher by employee ID
  async getTeacherByEmployeeId(employeeId: string): Promise<User | null> {
    const q = query(
      collection(db, 'teachers'),
      where('employeeId', '==', employeeId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { uid: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
  },

  // Create teacher
  async createTeacher(teacherData: Omit<User, 'createdAt' | 'updatedAt'> & { uid?: string }): Promise<string> {
    const teacherDoc = {
      ...teacherData,
      role: 'teacher' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (teacherData.uid) {
      await setDoc(doc(db, 'teachers', teacherData.uid), teacherDoc);
      return teacherData.uid;
    } else {
      const docRef = await addDoc(collection(db, 'teachers'), teacherDoc);
      return docRef.id;
    }
  },

  // Update teacher
  async updateTeacher(uid: string, updates: Partial<User>): Promise<void> {
    try {
      const docRef = doc(db, 'teachers', uid);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      console.log('Updating teacher document:', uid, 'with data:', updateData);
      await updateDoc(docRef, updateData);
      console.log('Teacher updated successfully');
    } catch (error) {
      console.error('Error updating teacher:', error);
      throw new Error(`Failed to update teacher: ${error}`);
    }
  },

  // Activate/Deactivate teacher
  async setTeacherActive(uid: string, isActive: boolean): Promise<void> {
    const docRef = doc(db, 'teachers', uid);
    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp()
    });
  },

  // Delete teacher
  async deleteTeacher(uid: string): Promise<void> {
    try {
      console.log('Attempting to delete teacher:', uid);
      await deleteDoc(doc(db, 'teachers', uid));
      console.log('Teacher deleted successfully:', uid);
    } catch (error) {
      console.error('Error deleting teacher:', error);
      throw error;
    }
  },

  // Get latest teacher by employee ID pattern
  async getLatestTeacherByEmployeeId(prefix: string): Promise<User | null> {
    const endPrefix = `${prefix}\uf8ff`;
    const q = query(
      collection(db, 'teachers'),
      where('employeeId', '>=', prefix),
      where('employeeId', '<=', endPrefix),
      orderBy('employeeId', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { uid: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
  },

  // Get teacher statistics
  async getTeacherStats(schoolId?: string): Promise<{
    totalTeachers: number;
    activeTeachers: number;
    inactiveTeachers: number;
    teachersBySubject: Record<string, number>;
    experiencedTeachers: number;
  }> {
    let q = query(collection(db, 'teachers'));

    if (schoolId) {
      q = query(q, where('schoolId', '==', schoolId));
    }

    const snapshot = await getDocs(q);
    const teachers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));

    const stats = {
      totalTeachers: teachers.length,
      activeTeachers: teachers.filter(t => t.isActive).length,
      inactiveTeachers: teachers.filter(t => !t.isActive).length,
      teachersBySubject: {} as Record<string, number>,
      experiencedTeachers: teachers.filter(t => {
        // Consider teachers with 5+ years experience as experienced
        const experience = t.experience || '0 বছর';
        const years = parseInt(experience.split(' ')[0]) || 0;
        return years >= 5;
      }).length
    };

    teachers.forEach(teacher => {
      // Count by subject
      if (teacher.subject) {
        stats.teachersBySubject[teacher.subject] = (stats.teachersBySubject[teacher.subject] || 0) + 1;
      }
    });

    return stats;
  }
};