'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { SCHOOL_ID, SCHOOL_NAME } from '@/lib/constants';
import {
  Download, Upload, Database, Shield, AlertTriangle, Clock, FileText, ArrowLeft, Trash2
} from 'lucide-react';

interface MarkEntry {
  id?: string;
  studentId: string;
  studentName: string;
  class: string;
  subject: string;
  examName: string;
  obtainedMarks: number;
  fullMarks: number;
  percentage: number;
  grade: string;
  status: 'পাস' | 'ফেল';
  entryDate: string;
  enteredBy: string;
}

interface BackupRecord {
  id: string;
  backupName: string;
  description: string;
  totalEntries: number;
  backupDate: string;
  createdBy: string;
  fileSize: string;
  status: 'সম্পন্ন' | 'প্রক্রিয়াধীন' | 'ব্যর্থ';
}

function SaveMarksPage() {
  const [markEntries, setMarkEntries] = useState<MarkEntry[]>([]);
  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>([]);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [newBackup, setNewBackup] = useState({
    backupName: '',
    description: ''
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const router = useRouter();
  const schoolId = SCHOOL_ID;
  const schoolName = SCHOOL_NAME;

  // Sample data for demo
  const sampleEntries = [
    {
      id: '1',
      studentId: '2025001',
      studentName: 'মোঃ রাহিম হোসেন',
      class: '৫',
      subject: 'বাংলা',
      examName: 'প্রথম সাময়িক পরীক্ষা',
      obtainedMarks: 85,
      fullMarks: 100,
      percentage: 85,
      grade: 'A+',
      status: 'পাস' as const,
      entryDate: new Date().toISOString(),
      enteredBy: 'admin'
    },
    {
      id: '2',
      studentId: '2025002',
      studentName: 'ফাতেমা আক্তার',
      class: '৫',
      subject: 'গণিত',
      examName: 'প্রথম সাময়িক পরীক্ষা',
      obtainedMarks: 72,
      fullMarks: 100,
      percentage: 72,
      grade: 'B+',
      status: 'পাস' as const,
      entryDate: new Date().toISOString(),
      enteredBy: 'admin'
    }
  ];

  const sampleBackups = [
    {
      id: '1',
      backupName: 'প্রথম সাময়িক পরীক্ষা ব্যাকআপ',
      description: 'প্রথম সাময়িক পরীক্ষার সকল মার্ক এন্ট্রি',
      totalEntries: 2,
      backupDate: new Date().toISOString(),
      createdBy: 'admin',
      fileSize: '2.5 KB',
      status: 'সম্পন্ন' as const
    }
  ];

  // Load sample data
  useEffect(() => {
    setMarkEntries(sampleEntries);
    setBackupRecords(sampleBackups);
  }, []);

  // Create backup
  const handleCreateBackup = async () => {
    if (!newBackup.backupName.trim()) {
      alert('অনুগ্রহ করে ব্যাকআপের নাম লিখুন।');
      return;
    }

    setIsBackingUp(true);

    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const backupData = {
        markEntries,
        timestamp: new Date().toISOString(),
        schoolId,
        version: '1.0'
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${newBackup.backupName}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Save backup record
      const backupRecord: BackupRecord = {
        id: Date.now().toString(),
        backupName: newBackup.backupName,
        description: newBackup.description,
        totalEntries: markEntries.length,
        backupDate: new Date().toISOString(),
        createdBy: 'admin',
        fileSize: `${(dataStr.length / 1024).toFixed(2)} KB`,
        status: 'সম্পন্ন'
      };

      const updatedBackups = [backupRecord, ...backupRecords];
      setBackupRecords(updatedBackups);

      setShowBackupModal(false);
      setNewBackup({ backupName: '', description: '' });
      alert('ব্যাকআপ সফলভাবে তৈরি করা হয়েছে।');

    } catch (error) {
      console.error('Backup error:', error);
      alert('ব্যাকআপ তৈরিতে ত্রুটি হয়েছে।');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore from backup
  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    if (!confirm('আপনি কি নিশ্চিত যে এই ব্যাকআপ থেকে ডেটা পুনরুদ্ধার করতে চান? বর্তমান ডেটা হারিয়ে যাবে।')) {
      return;
    }

    setIsRestoring(true);

    try {
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simulate successful restore
      alert('ব্যাকআপ থেকে ডেটা সফলভাবে পুনরুদ্ধার করা হয়েছে।');

      setShowRestoreModal(false);
      setSelectedBackup(null);

    } catch (error) {
      console.error('Restore error:', error);
      alert('পুনরুদ্ধার প্রক্রিয়ায় ত্রুটি হয়েছে।');
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete backup record
  const handleDeleteBackup = (backupId: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই ব্যাকআপ রেকর্ডটি মুছে ফেলতে চান?')) {
      return;
    }

    const updatedBackups = backupRecords.filter(backup => backup.id !== backupId);
    setBackupRecords(updatedBackups);
    alert('ব্যাকআপ রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।');
  };

  // Filter backup records
  const filteredBackups = backupRecords.filter(backup =>
    backup.backupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    backup.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <button
                onClick={() => router.push('/admin/exams')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>পিছনে যান</span>
              </button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">মার্ক ব্যাকআপ এবং পুনরুদ্ধার</h2>
            <p className="text-gray-600">মার্ক এন্ট্রিগুলো সংরক্ষণ করুন এবং প্রয়োজনে পুনরুদ্ধার করুন।</p>
          </div>

          <div className="flex items-center space-x-3">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>ফাইল থেকে আমদানি করুন</span>
            </button>
            <button
              onClick={() => setShowBackupModal(true)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>নতুন ব্যাকআপ তৈরি করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">মোট মার্ক এন্ট্রি</p>
              <p className="text-2xl font-bold text-gray-900">{markEntries.length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">মোট ব্যাকআপ</p>
              <p className="text-2xl font-bold text-gray-900">{backupRecords.length}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Database className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">সর্বশেষ ব্যাকআপ</p>
              <p className="text-sm font-bold text-gray-900">
                {backupRecords.length > 0 ? new Date(backupRecords[0].backupDate).toLocaleDateString('bn-BD') : 'কোনো ব্যাকআপ নেই'}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">স্টোরেজ ব্যবহার</p>
              <p className="text-sm font-bold text-gray-900">
                {backupRecords.reduce((total, backup) => {
                  const size = parseFloat(backup.fileSize.replace(' KB', ''));
                  return total + size;
                }, 0).toFixed(2)} KB
              </p>
            </div>
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Backup Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">ব্যাকআপ রেকর্ডসমূহ</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="ব্যাকআপ খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ব্যাকআপের নাম
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  বিবরণ
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  এন্ট্রি সংখ্যা
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ফাইলের আকার
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  তারিখ
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  স্ট্যাটাস
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ক্রিয়াকলাপ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBackups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Database className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো ব্যাকআপ পাওয়া যায়নি</h3>
                    <p className="mt-1 text-sm text-gray-500">নতুন ব্যাকআপ তৈরি করুন</p>
                  </td>
                </tr>
              ) : (
                filteredBackups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{backup.backupName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{backup.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {backup.totalEntries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {backup.fileSize}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {new Date(backup.backupDate).toLocaleDateString('bn-BD')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        backup.status === 'সম্পন্ন' ? 'bg-green-100 text-green-800' :
                        backup.status === 'প্রক্রিয়াধীন' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {backup.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBackup(backup);
                            setShowRestoreModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="পুনরুদ্ধার করুন"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Backup Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">নতুন ব্যাকআপ তৈরি করুন</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ব্যাকআপের নাম *
                  </label>
                  <input
                    type="text"
                    value={newBackup.backupName}
                    onChange={(e) => setNewBackup({...newBackup, backupName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="যেমন: প্রথম সাময়িক পরীক্ষা ব্যাকআপ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    বিবরণ
                  </label>
                  <textarea
                    value={newBackup.description}
                    onChange={(e) => setNewBackup({...newBackup, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="ব্যাকআপের সংক্ষিপ্ত বিবরণ"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">ব্যাকআপ তথ্য:</p>
                      <p>মোট মার্ক এন্ট্রি: {markEntries.length}</p>
                      <p>আনুমানিক ফাইলের আকার: ~{((JSON.stringify(markEntries).length / 1024)).toFixed(2)} KB</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowBackupModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={isBackingUp}
                >
                  বাতিল করুন
                </button>
                <button
                  onClick={handleCreateBackup}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center space-x-2"
                  disabled={isBackingUp}
                >
                  {isBackingUp ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>ব্যাকআপ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>ব্যাকআপ তৈরি করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Modal */}
      {showRestoreModal && selectedBackup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">ব্যাকআপ পুনরুদ্ধার করুন</h3>

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">সতর্কতা!</p>
                      <p>এই ক্রিয়াটি বর্তমান সকল মার্ক এন্ট্রি মুছে ফেলবে এবং নির্বাচিত ব্যাকআপ থেকে ডেটা পুনরুদ্ধার করবে।</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-md p-4">
                  <h4 className="font-medium text-gray-900 mb-2">ব্যাকআপ তথ্য:</h4>
                  <p><strong>নাম:</strong> {selectedBackup.backupName}</p>
                  <p><strong>তারিখ:</strong> {new Date(selectedBackup.backupDate).toLocaleDateString('bn-BD')}</p>
                  <p><strong>এন্ট্রি সংখ্যা:</strong> {selectedBackup.totalEntries}</p>
                  <p><strong>তৈরি করেছেন:</strong> {selectedBackup.createdBy}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setSelectedBackup(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={isRestoring}
                >
                  বাতিল করুন
                </button>
                <button
                  onClick={handleRestoreBackup}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>পুনরুদ্ধার হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>পুনরুদ্ধার করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SaveMarksPageWrapper() {
  return (
    <AdminLayout title="মার্ক সংরক্ষণ করুন" subtitle="মার্ক ব্যাকআপ এবং পুনরুদ্ধার">
      <SaveMarksPage />
    </AdminLayout>
  );
}
