'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AuthService } from '@/lib/auth';

export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'parent' | 'student';

export interface UserData {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  photoURL?: string;
  schoolId?: string;
  classId?: string;
  studentId?: string;
  isActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  getUserRole: () => UserRole | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  getUserRole: () => null,
  signIn: async () => ({ success: false, error: 'Not implemented' }),
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string) => {
    try {
      if (!db) {
        console.warn('Firestore not initialized, using default user data');
        const defaultUserData: UserData = {
          uid,
          email: user?.email || '',
          role: 'admin',
          name: user?.displayName || user?.email?.split('@')[0] || 'User',
          photoURL: user?.photoURL || undefined,
          isActive: true, // Default to active if DB not available
        };
        setUserData(defaultUserData);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        
        // Check if user is active (approved)
        // Only sign out if isActive is explicitly false
        // If isActive is undefined/null, allow login (for backward compatibility)
        if (data.isActive === false) {
          // User is not approved, sign them out
          console.log('⚠️ User account is not active (not approved), signing out...');
          await firebaseSignOut(auth);
          setUserData(null);
          return;
        }
        
        // Set user data - include isActive in the data
        // Merge photoURL from Firebase Auth if available (prioritize Firestore, but fallback to Auth)
        const finalPhotoURL = data.photoURL || user?.photoURL || undefined;
        setUserData({
          ...data,
          photoURL: finalPhotoURL,
          isActive: data.isActive ?? true // Treat undefined/null as active for backward compatibility
        });

        // Update Firebase Auth displayName and photoURL if they're different from the database
        if (user) {
          const updates: { displayName?: string; photoURL?: string } = {};
          if (data.name && user.displayName !== data.name) {
            updates.displayName = data.name;
          }
          if (data.photoURL && user.photoURL !== data.photoURL) {
            updates.photoURL = data.photoURL;
          }
          if (Object.keys(updates).length > 0) {
            try {
              await updateProfile(user, updates);
              console.log('✅ Updated Firebase Auth profile:', updates);
            } catch (error) {
              console.error('❌ Error updating Firebase Auth profile:', error);
            }
          }
        }
      } else {
        // Default role for demo purposes - prioritize Firebase Auth displayName
        const defaultUserData: UserData = {
          uid,
          email: user?.email || '',
          role: 'admin',
          name: user?.displayName || user?.email?.split('@')[0] || 'User',
          photoURL: user?.photoURL || undefined,
          isActive: true, // Default to active if user doc doesn't exist
        };
        setUserData(defaultUserData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Set default data on error
      const defaultUserData: UserData = {
        uid,
        email: user?.email || '',
        role: 'admin',
        name: user?.displayName || user?.email?.split('@')[0] || 'User',
        photoURL: user?.photoURL || undefined,
        isActive: true, // Default to active on error
      };
      setUserData(defaultUserData);
    }
  };

  const getUserRole = (): UserRole | null => {
    return userData?.role || null;
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (!auth) {
        return { success: false, error: 'Firebase not initialized. Please check your environment variables.' };
      }
      
      const result = await AuthService.signIn(email, password);
      if (result.success && result.data) {
        // User data will be updated through onAuthStateChanged
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Sign in failed' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  };

  const signOut = async () => {
    try {
      if (!auth) {
        console.warn('Firebase auth not initialized');
        return;
      }
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let firestoreUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchUserData(user.uid);
        
        // Set up real-time listener for user document changes
        if (db) {
          firestoreUnsubscribe = onSnapshot(
            doc(db, 'users', user.uid),
            async (userDoc) => {
              if (userDoc.exists()) {
                const data = userDoc.data() as UserData;
                
                // Check if user is active
                if (data.isActive === false) {
                  await firebaseSignOut(auth);
                  setUserData(null);
                  return;
                }
                
                // Get current user from auth
                const currentUser = auth.currentUser;
                if (!currentUser) return;

                // Update userData with latest from Firestore
                const finalPhotoURL = data.photoURL || currentUser.photoURL || undefined;
                setUserData({
                  ...data,
                  photoURL: finalPhotoURL,
                  isActive: data.isActive ?? true
                });

                // Sync photoURL to Firebase Auth if it changed
                if (data.photoURL && currentUser.photoURL !== data.photoURL) {
                  try {
                    await updateProfile(currentUser, { photoURL: data.photoURL });
                    console.log('✅ Synced photoURL to Firebase Auth:', data.photoURL);
                  } catch (error) {
                    console.error('❌ Error syncing photoURL to Firebase Auth:', error);
                  }
                }
              }
            },
            (error) => {
              console.error('Error listening to user document:', error);
            }
          );
        }
      } else {
        setUserData(null);
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, getUserRole, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
