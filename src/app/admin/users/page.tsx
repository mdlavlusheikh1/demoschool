'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, User, Phone, Mail, Calendar, School, Edit, Trash2, Save, X, Database, Shield } from 'lucide-react';

interface UserData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  schoolId: string;
  schoolName: string;
  address: string;
  isActive: boolean;
  createdAt: any;
  guardianName?: string;
  guardianPhone?: string;
  class?: string;
  section?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('pending');
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const { userData } = useAuth();

  useEffect(() => {
    if (userData && ['super_admin', 'school_admin'].includes(userData.role)) {
      loadUsers();
    }
  }, [userData, filter]);

  const loadUsers = async () => {
    if (!userData) return;

    try {
      setLoading(true);
      
      // Base query - always order by createdAt
      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

      // Add schoolId filter for school admins (this requires a composite index)
      if (userData.role === 'admin' && userData.schoolId) {
        q = query(
          collection(db, 'users'),
          where('schoolId', '==', userData.schoolId),
          orderBy('createdAt', 'desc')
        );
      }

      console.log('Executing Firestore query for users...');
      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} users in Firestore`);
      
      const usersData: UserData[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserData;
        usersData.push({
          ...data,
          uid: doc.id,
          createdAt: data.createdAt?.toDate?.() || new Date()
        });
      });

      // Apply client-side filtering for better performance
      const filteredUsers = usersData.filter(user => {
        switch (filter) {
          case 'pending':
            return !user.isActive;
          case 'active':
            return user.isActive === true;
          case 'inactive':
            return user.isActive === false;
          default:
            return true;
        }
      });

      console.log(`Filtered to ${filteredUsers.length} users for display`);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      
      // Check if it's an index error
      if (error instanceof Error && error.message.includes('index')) {
        setUsers([]);
        alert('ডেটাবেস ইনডেক্স তৈরি হচ্ছে। অনুগ্রহ করে কয়েক মিনিট পর আবার চেষ্টা করুন।');
      } else {
        setUsers([]);
        alert('ব্যবহারকারী লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, isActive: boolean) => {
    setUpdating(prev => new Set(prev).add(userId));

    try {
      await updateDoc(doc(db, 'users', userId), {
        isActive,
        updatedAt: new Date()
      });

      // Update local state
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, isActive } : user
      ));

      // If filtering by pending and user is approved, remove from view
      if (filter === 'pending' && isActive) {
        setUsers(prev => prev.filter(user => user.uid !== userId));
      }

    } catch (error) {
      console.error('Error updating user status:', error);
      alert('ব্যবহারকারীর স্ট্যাটাস আপডেট করতে ব্যর্থ');
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const saveUserChanges = async () => {
    if (!editingUser) return;

    setUpdating(prev => new Set(prev).add(editingUser.uid));

    try {
      const { uid, createdAt, ...updateData } = editingUser;
      await updateDoc(doc(db, 'users', uid), {
        ...updateData,
        updatedAt: new Date()
      });

      // Update local state
      setUsers(prev => prev.map(user => 
        user.uid === uid ? editingUser : user
      ));

      setEditingUser(null);
      alert('ব্যবহারকারীর তথ্য সফলভাবে আপডেট হয়েছে');

    } catch (error) {
      console.error('Error updating user:', error);
      alert('ব্যবহারকারীর তথ্য আপডেট করতে ব্যর্থ');
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(editingUser.uid);
        return newSet;
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই ব্যবহারকারীকে মুছে ফেলতে চান? এই কাজটি আর ফেরত নেওয়া যাবে না।')) {
      return;
    }

    setUpdating(prev => new Set(prev).add(userId));

    try {
      await deleteDoc(doc(db, 'users', userId));
      
      // Remove from local state
      setUsers(prev => prev.filter(user => user.uid !== userId));
      
      alert('ব্যবহারকারী সফলভাবে মুছে ফেলা হয়েছে');

    } catch (error) {
      console.error('Error deleting user:', error);
      alert('ব্যবহারকারী মুছে ফেলতে ব্যর্থ');
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'school_admin':
        return 'bg-purple-100 text-purple-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      case 'parent':
        return 'bg-green-100 text-green-800';
      case 'student':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'সুপার অ্যাডমিন';
      case 'school_admin':
        return 'স্কুল অ্যাডমিন';
      case 'teacher':
        return 'শিক্ষক';
      case 'parent':
        return 'অভিভাবক';
      case 'student':
        return 'ছাত্র/ছাত্রী';
      default:
        return role;
    }
  };

  if (!userData || !['super_admin', 'school_admin'].includes(userData.role)) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">আপনার এই পেইজে প্রবেশের অনুমতি নেই</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ব্যবহারকারী ব্যবস্থাপনা</h1>
            <p className="text-gray-600">নতুন নিবন্ধনের অনুমোদন এবং ব্যবহারকারী পরিচালনা</p>
          </div>
          
          {/* Super Admin Quick Actions */}
          {userData?.role === 'super_admin' && (
            <div className="flex space-x-3">
              <a
                href="/super-admin/data-manager"
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Database className="w-5 h-5" />
                <span>ডেটা ম্যানেজার</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'pending', label: 'অনুমোদনের অপেক্ষায়', count: users.filter(u => !u.isActive).length },
              { key: 'active', label: 'সক্রিয়', count: users.filter(u => u.isActive).length },
              { key: 'all', label: 'সব ব্যবহারকারী', count: users.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">কোনো ব্যবহারকারী পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {users.map((user) => (
            <div key={user.uid} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between">
                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{user.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <School className="w-4 h-4" />
                      <span>{user.schoolName}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{user.createdAt?.toLocaleDateString('bn-BD')}</span>
                    </div>
                  </div>

                  {/* Student-specific info */}
                  {user.role === 'student' && (user.guardianName || user.class) && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <h4 className="font-medium text-blue-900 mb-2">ছাত্র/ছাত্রীর তথ্য</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
                        {user.class && <div><strong>শ্রেণী:</strong> {user.class}</div>}
                        {user.section && <div><strong>শাখা:</strong> {user.section}</div>}
                        {user.guardianName && <div><strong>অভিভাবক:</strong> {user.guardianName}</div>}
                        {user.guardianPhone && <div><strong>অভিভাবকের ফোন:</strong> {user.guardianPhone}</div>}
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  {user.address && (
                    <div className="text-sm text-gray-600">
                      <strong>ঠিকানা:</strong> {user.address}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2 ml-4">
                  {/* Edit Button for Super Admin */}
                  {userData?.role === 'super_admin' && (
                    <button
                      onClick={() => setEditingUser(user.uid === editingUser?.uid ? null : user)}
                      className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                      <span>{editingUser?.uid === user.uid ? 'বাতিল' : 'এডিট'}</span>
                    </button>
                  )}
                  
                  {!user.isActive ? (
                    <button
                      onClick={() => updateUserStatus(user.uid, true)}
                      disabled={updating.has(user.uid)}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>অনুমোদন</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => updateUserStatus(user.uid, false)}
                      disabled={updating.has(user.uid)}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>নিষ্ক্রিয়</span>
                    </button>
                  )}
                  
                  {/* Delete Button for Super Admin */}
                  {userData?.role === 'super_admin' && (
                    <button
                      onClick={() => deleteUser(user.uid)}
                      disabled={updating.has(user.uid)}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>মুছুন</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Edit Form for Super Admin */}
              {editingUser?.uid === user.uid && userData?.role === 'super_admin' && (
                <div className="mt-6 bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-4">ব্যবহারকারীর তথ্য এডিট করুন</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">নাম</label>
                      <input
                        type="text"
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ইমেইল</label>
                      <input
                        type="email"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ফোন</label>
                      <input
                        type="text"
                        value={editingUser.phone}
                        onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">রোল</label>
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="super_admin">সুপার অ্যাডমিন</option>
                        <option value="school_admin">স্কুল অ্যাডমিন</option>
                        <option value="teacher">শিক্ষক</option>
                        <option value="parent">অভিভাবক</option>
                        <option value="student">ছাত্র/ছাত্রী</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">স্কুল আইডি</label>
                      <input
                        type="text"
                        value={editingUser.schoolId}
                        onChange={(e) => setEditingUser({...editingUser, schoolId: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">স্কুলের নাম</label>
                      <input
                        type="text"
                        value={editingUser.schoolName}
                        onChange={(e) => setEditingUser({...editingUser, schoolName: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">ঠিকানা</label>
                      <input
                        type="text"
                        value={editingUser.address}
                        onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* Student specific fields */}
                    {editingUser.role === 'student' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">শ্রেণী</label>
                          <input
                            type="text"
                            value={editingUser.class || ''}
                            onChange={(e) => setEditingUser({...editingUser, class: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">শাখা</label>
                          <input
                            type="text"
                            value={editingUser.section || ''}
                            onChange={(e) => setEditingUser({...editingUser, section: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">অভিভাবকের নাম</label>
                          <input
                            type="text"
                            value={editingUser.guardianName || ''}
                            onChange={(e) => setEditingUser({...editingUser, guardianName: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">অভিভাবকের ফোন</label>
                          <input
                            type="text"
                            value={editingUser.guardianPhone || ''}
                            onChange={(e) => setEditingUser({...editingUser, guardianPhone: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={saveUserChanges}
                      disabled={updating.has(user.uid)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>সেভ করুন</span>
                    </button>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <X className="w-4 h-4" />
                      <span>বাতিল</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          তালিকা রিফ্রেশ করুন
        </button>
      </div>
    </div>
  );
}