'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Database, CheckCircle, XCircle, RefreshCw, Users } from 'lucide-react';

export default function FirestoreDebugPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [testResult, setTestResult] = useState<string>('');

  const testFirestoreConnection = async () => {
    setLoading(true);
    setConnectionStatus('unknown');
    
    try {
      // Test writing a document
      const testDoc = doc(db, 'test', 'connection-test');
      await setDoc(testDoc, {
        message: 'Connection test successful',
        timestamp: serverTimestamp(),
        testId: Date.now()
      });
      
      // Test reading the document back
      const docSnap = await getDoc(testDoc);
      if (docSnap.exists()) {
        setConnectionStatus('connected');
        setTestResult('✅ Firestore connection successful!');
      } else {
        setConnectionStatus('error');
        setTestResult('❌ Could not read test document');
      }
    } catch (error) {
      setConnectionStatus('error');
      setTestResult(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Firestore connection test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersCollection = collection(db, 'users');
      const snapshot = await getDocs(usersCollection);
      
      const userData: any[] = [];
      snapshot.forEach((doc) => {
        userData.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toLocaleString() || 'N/A'
        });
      });
      
      setUsers(userData);
      setTestResult(`✅ Found ${userData.length} users in Firestore`);
    } catch (error) {
      setTestResult(`❌ Error loading users: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTestUser = async () => {
    setLoading(true);
    try {
      const testUserId = `test-user-${Date.now()}`;
      const testUserData = {
        uid: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        phone: '+880 1700000000',
        role: 'student',
        schoolId: 'school-abc-123',
        schoolName: 'আমার স্কুল',
        address: 'Test Address',
        isActive: false,
        profileImage: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', testUserId), testUserData);
      setTestResult(`✅ Test user created successfully with ID: ${testUserId}`);
      
      // Reload users
      setTimeout(loadUsers, 1000);
    } catch (error) {
      setTestResult(`❌ Error creating test user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error creating test user:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testFirestoreConnection();
    loadUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Database className="w-8 h-8 mr-3 text-blue-600" />
            Firestore Debug Panel
          </h1>
          <p className="text-gray-600">Debug Firestore connection and user data</p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              {connectionStatus === 'connected' ? (
                <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
              ) : connectionStatus === 'error' ? (
                <XCircle className="w-6 h-6 mr-2 text-red-600" />
              ) : (
                <RefreshCw className="w-6 h-6 mr-2 text-gray-400" />
              )}
              Connection Status
            </h2>
            <button
              onClick={testFirestoreConnection}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
          
          <div className={`p-4 rounded-lg ${
            connectionStatus === 'connected' 
              ? 'bg-green-50 border border-green-200' 
              : connectionStatus === 'error'
              ? 'bg-red-50 border border-red-200'
              : 'bg-gray-50 border border-gray-200'
          }`}>
            <p className="text-sm font-mono">{testResult || 'Testing connection...'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            <Users className="w-5 h-5 mr-2" />
            {loading ? 'Loading...' : 'Reload Users'}
          </button>
          
          <button
            onClick={createTestUser}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            Create Test User
          </button>
          
          <a
            href="/admin/users"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
          >
            Go to User Management
          </a>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Users in Firestore ({users.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            {users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No users found in Firestore</p>
                <p className="text-sm mt-2">Try creating a test user or check if sign up is working properly</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      School
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'parent' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.createdAt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.schoolName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Firebase Project Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Current Firebase Project</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Project ID:</strong> iqra-nuranu-academy</p>
            <p><strong>Auth Domain:</strong> iqra-nuranu-academy.firebaseapp.com</p>
            <p><strong>Storage Bucket:</strong> iqra-nuranu-academy.firebasestorage.app</p>
          </div>
        </div>
      </div>
    </div>
  );
}