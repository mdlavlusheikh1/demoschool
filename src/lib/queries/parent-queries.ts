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

// Parent Management Functions
export const parentQueries = {
  // Get all parents (only active by default)
  async getAllParents(onlyActive: boolean = true): Promise<User[]> {
    let q;
    if (onlyActive) {
      q = query(
        collection(db, 'parents'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'parents'),
        orderBy('createdAt', 'desc')
      );
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get parents by school
  async getParentsBySchool(schoolId: string): Promise<User[]> {
    const q = query(
      collection(db, 'parents'),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get parents who have associated students
  async getParentsWithStudents(): Promise<User[]> {
    try {
      // Get all parents
      const allParents = await this.getAllParents();
      console.log('Total parents found:', allParents.length);

      // Get all students to find which parents have students
      const { studentQueries } = await import('./student-queries');
      const allStudents = await studentQueries.getAllStudents();
      console.log('Total students found:', allStudents.length);

      // Create a map of parent information from students
      const parentStudentMap = new Map<string, any[]>();

      allStudents.forEach(student => {
        console.log('Student guardian info:', {
          name: student.name || student.displayName,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          phoneNumber: student.phoneNumber,
          phone: student.phone
        });

        if (student.guardianName && student.guardianPhone) {
          const parentKey = `${student.guardianName}-${student.guardianPhone}`;
          if (!parentStudentMap.has(parentKey)) {
            parentStudentMap.set(parentKey, []);
          }
          parentStudentMap.get(parentKey)!.push({
            name: student.name || student.displayName,
            class: student.class,
            studentId: student.studentId,
            uid: student.uid
          });
        }
      });

      console.log('Parent-student mapping:', Array.from(parentStudentMap.entries()));

      // Filter parents to only include those who have students
      const parentsWithStudents = allParents.filter(parent => {
        const parentKey = `${parent.name}-${parent.phoneNumber || parent.phone}`;
        const hasMatch = parentStudentMap.has(parentKey);
        console.log('Checking parent:', parent.name, 'Key:', parentKey, 'Has match:', hasMatch);
        return hasMatch;
      });

      console.log('Parents with students:', parentsWithStudents.length);

      // Add student information to parent objects
      return parentsWithStudents.map(parent => {
        const parentKey = `${parent.name}-${parent.phoneNumber || parent.phone}`;
        const associatedStudents = parentStudentMap.get(parentKey) || [];

        return {
          ...parent,
          associatedStudents: associatedStudents
        };
      });
    } catch (error) {
      console.error('Error getting parents with students:', error);
      return [];
    }
  },

  // Get all parents (for debugging - shows all parents regardless of student association)
  async getAllParentsUnfiltered(): Promise<User[]> {
    try {
      const allParents = await this.getAllParents();
      console.log('All parents (unfiltered):', allParents.length);
      return allParents;
    } catch (error) {
      console.error('Error getting all parents:', error);
      return [];
    }
  },

  // Get active parents
  async getActiveParents(): Promise<User[]> {
    const q = query(
      collection(db, 'parents'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get inactive parents
  async getInactiveParents(): Promise<User[]> {
    const q = query(
      collection(db, 'parents'),
      where('isActive', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get parent by ID
  async getParentById(uid: string): Promise<User | null> {
    const docRef = doc(db, 'parents', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } as User : null;
  },

  // Create parent
  async createParent(parentData: Omit<User, 'createdAt' | 'updatedAt' | 'uid'> & { uid?: string }): Promise<string> {
    const parentDoc = {
      ...parentData,
      role: 'parent' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (parentData.uid) {
      await setDoc(doc(db, 'parents', parentData.uid), parentDoc);
      return parentData.uid;
    } else {
      const docRef = await addDoc(collection(db, 'parents'), parentDoc);
      return docRef.id;
    }
  },

  // Update parent
  async updateParent(uid: string, updates: Partial<User>): Promise<void> {
    try {
      const docRef = doc(db, 'parents', uid);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      console.log('Updating parent document:', uid, 'with data:', updateData);
      await updateDoc(docRef, updateData);
      console.log('Parent updated successfully');
    } catch (error) {
      console.error('Error updating parent:', error);
      throw new Error(`Failed to update parent: ${error}`);
    }
  },

  // Delete parent
  async deleteParent(uid: string): Promise<void> {
    try {
      console.log('Attempting to delete parent:', uid);
      await deleteDoc(doc(db, 'parents', uid));
      console.log('Parent deleted successfully:', uid);
    } catch (error) {
      console.error('Error deleting parent:', error);
      throw error;
    }
  },

  // Get parent statistics
  async getParentStats(schoolId?: string): Promise<{
    totalParents: number;
    parentsWithStudents: number;
    parentsWithoutStudents: number;
    studentsPerParent: Record<string, number>;
  }> {
    let q = query(collection(db, 'parents'));

    if (schoolId) {
      q = query(q, where('schoolId', '==', schoolId));
    }

    const snapshot = await getDocs(q);
    const parents = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));

    const parentsWithStudents = await this.getParentsWithStudents();
    const parentsWithoutStudents = parents.filter(parent =>
      !parentsWithStudents.some(pws => pws.uid === parent.uid)
    );

    const stats = {
      totalParents: parents.length,
      parentsWithStudents: parentsWithStudents.length,
      parentsWithoutStudents: parentsWithoutStudents.length,
      studentsPerParent: {} as Record<string, number>
    };

    // Count students per parent
    parentsWithStudents.forEach(parent => {
      const studentCount = parent.associatedStudents?.length || 0;
      stats.studentsPerParent[studentCount.toString()] =
        (stats.studentsPerParent[studentCount.toString()] || 0) + 1;
    });

    return stats;
  }
};