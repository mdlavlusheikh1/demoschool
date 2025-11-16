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

// Types
export interface User {
  uid: string;
  name?: string;
  displayName?: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  role: 'super_admin' | 'admin' | 'teacher' | 'parent' | 'student';
  schoolId: string;
  schoolName?: string;
  address?: string;
  isActive: boolean;
  isApproved?: boolean;
  profileImage?: string;
  createdAt?: any;
  updatedAt?: any;
  associatedStudents?: Array<{
    name?: string;
    class?: string;
    studentId?: string;
    uid: string;
  }>;
  // Student specific fields
  guardianName?: string;
  guardianPhone?: string;
  studentId?: string;
  class?: string;
  section?: string;
  group?: string;
  rollNumber?: string;
  // Teacher specific fields
  subject?: string;
  experience?: string;
  qualification?: string;
  joinDate?: string;
  salary?: number;
  department?: string;
  designation?: string;
  employeeId?: string;
  employmentType?: string;
  specialization?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  religion?: string;
  bloodGroup?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  languages?: string;
  skills?: string;
  achievements?: string;
  publications?: string;
  researchInterests?: string;
  // Additional personal fields
  fatherName?: string;
  fatherPhone?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherPhone?: string;
  motherOccupation?: string;
  nationalId?: string;
  nidNumber?: string;
  permanentAddress?: string;
  emergencyContact?: string;
  emergencyRelation?: string;
  presentAddress?: string;
  previousSchool?: string;
  previousClass?: string;
  previousSchoolAddress?: string;
  reasonForLeaving?: string;
  previousGPA?: string;
}

// User Management Functions
export const userQueries = {
  // Get all users
  async getAllUsers(): Promise<User[]> {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get users by role (only admin and super_admin roles)
  async getUsersByRole(role: string): Promise<User[]> {
    // Only handle admin and super_admin roles in users collection
    if (!['admin', 'super_admin'].includes(role)) {
      return [];
    }

    const q = query(
      collection(db, 'users'),
      where('role', '==', role),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get users by school (only admin and super_admin roles)
  async getUsersBySchool(schoolId: string): Promise<User[]> {
    const q = query(
      collection(db, 'users'),
      where('schoolId', '==', schoolId),
      where('role', 'in', ['admin', 'super_admin']),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get pending users (inactive)
  async getPendingUsers(): Promise<User[]> {
    const q = query(
      collection(db, 'users'),
      where('isActive', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get active users
  async getActiveUsers(): Promise<User[]> {
    const q = query(
      collection(db, 'users'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  // Get user by ID
  async getUserById(uid: string): Promise<User | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { uid: docSnap.id, ...docSnap.data() } as User : null;
  },

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { uid: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
  },

  // Create user
  async createUser(userData: Omit<User, 'createdAt' | 'updatedAt'> & { uid?: string }): Promise<string> {
    const userDoc = {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Use a custom UID if provided, otherwise let Firestore generate one
    if (userData.uid) {
      await setDoc(doc(db, 'users', userData.uid), userDoc);
      return userData.uid;
    } else {
      const docRef = await addDoc(collection(db, 'users'), userDoc);
      return docRef.id;
    }
  },

  // Update user
  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  // Activate/Deactivate user
  async setUserActive(uid: string, isActive: boolean): Promise<void> {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp()
    });
  },

  // Delete user
  async deleteUser(uid: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid));
  }
};