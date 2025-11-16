import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { User } from './database-queries';

// @ts-expect-error - file-saver does not have type definitions
import { saveAs } from 'file-saver';

export interface StudentExportData {
  name: string;
  studentId: string;
  rollNumber?: string;
  email: string;
  phoneNumber: string;
  class: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  dateOfBirth?: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
}

// Export to PDF using HTML-based approach for better Bengali font support
export const exportToPDF = async (students: StudentExportData[], filename: string = 'students.pdf', schoolLogo?: string, schoolSettings?: any) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('পপআপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপআপ অনুমতি দিন।');
      return;
    }

    const currentDate = new Date().toLocaleDateString('bn-BD');
    const logoHtml = schoolLogo ? `<img src="${escapeHtml(schoolLogo)}" alt="School Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 10px;" />` : '';
    const logoSectionHtml = logoHtml ? `<div class="school-logo">${logoHtml}</div>` : '';
    const spacerHtml = logoHtml ? '<div class="school-header-spacer"></div>' : '';
    
    // Get real school data from settings
    const schoolName = schoolSettings?.schoolName || 'ইকরা নূরানী একাডেমি';
    const schoolAddress = schoolSettings?.schoolAddress || 'Dhaka, Bangladesh';
    const schoolPhone = schoolSettings?.schoolPhone || '০১৭১১১১১১১১';
    const schoolEmail = schoolSettings?.schoolEmail || 'info@ikranurani.edu';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn" dir="ltr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>শিক্ষার্থী তালিকা রিপোর্ট</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
              * {
                  box-sizing: border-box;
              }
              body {
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  margin: 0;
                  padding: 10px 8px;
                  direction: ltr;
                  text-align: left;
              }
              .school-header {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 8px;
                  padding: 8px;
                  border-bottom: 2px solid #2563eb;
                  position: relative;
              }
              .school-logo {
                  position: absolute;
                  left: 0;
                  flex-shrink: 0;
              }
              .school-logo img {
                  max-height: 60px;
                  max-width: 200px;
                  object-fit: contain;
              }
              .school-info-container {
                  text-align: center;
                  flex: 1;
              }
              .school-header-spacer {
                  display: none;
              }
              .school-name {
                  font-size: 32px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 6px;
              }
              .school-info {
                  font-size: 14px;
                  color: #333;
                  margin-bottom: 3px;
              }
              .report-header {
                  text-align: center;
                  margin-bottom: 10px;
                  padding: 8px;
              }
              .report-title {
                  font-size: 24px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 15px;
              }
              .report-info {
                  font-size: 16px;
                  color: #333;
                  margin-bottom: 5px;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px auto;
                  font-size: 10px;
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  table-layout: fixed;
                  direction: ltr;
              }
              th, td {
                  border: 1px solid #2563eb;
                  padding: 6px 4px;
                  text-align: center;
                  white-space: normal;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
              }
              th {
                  background-color: #dbeafe;
                  font-weight: bold;
                  color: #1e40af;
                  font-size: 11px;
                  border-bottom: 2px solid #2563eb;
                  line-height: 1.3;
              }
              td {
                  font-size: 10px;
                  line-height: 1.3;
              }
              tr:nth-child(even) {
                  background-color: #f9f9f9;
              }
              .col-roll { width: 6%; }
              .col-name { width: 16%; }
              .col-id { width: 9%; }
              .col-class { width: 9%; }
              .col-email { width: 16%; }
              .col-phone { width: 11%; }
              .col-guardian-name { width: 13%; }
              .col-guardian-phone { width: 11%; }
              .col-address { width: 13%; }
              @media print {
                  body { padding: 20px; }
                  .no-print { display: none; }
              }
              @page {
                  size: A4 landscape;
                  margin: 0.2in;
              }
          </style>
      </head>
      <body>
          <div class="school-header">
              ${logoSectionHtml}
              <div class="school-info-container">
                  <div class="school-name">${escapeHtml(schoolName)}</div>
                  <div class="school-info">${escapeHtml(schoolAddress)}</div>
                  <div class="school-info">ফোন: ${escapeHtml(schoolPhone)} | ইমেইল: ${escapeHtml(schoolEmail)}</div>
              </div>
              ${spacerHtml}
          </div>

          <div class="report-header">
              <div class="report-title">শিক্ষার্থী তালিকা</div>
              <div class="report-info">
                  রিপোর্ট তৈরির তারিখ: ${currentDate} | মোট শিক্ষার্থী: ${students.length} জন
              </div>
          </div>

          <table>
              <thead>
                  <tr>
                      <th class="col-roll">রোল নম্বর</th>
                      <th class="col-name">শিক্ষার্থীর নাম</th>
                      <th class="col-id">শিক্ষার্থী আইডি</th>
                      <th class="col-class">ক্লাস</th>
                      <th class="col-email">ইমেইল</th>
                      <th class="col-phone">ফোন নম্বর</th>
                      <th class="col-guardian-name">অভিভাবকের নাম</th>
                      <th class="col-guardian-phone">অভিভাবকের ফোন</th>
                      <th class="col-address">ঠিকানা</th>
                  </tr>
              </thead>
              <tbody>
                  ${students.map((student, index) => `
                      <tr>
                          <td class="col-roll">${index + 1}</td>
                          <td class="col-name">${escapeHtml(student.name || '-')}</td>
                          <td class="col-id">${escapeHtml(student.studentId || '-')}</td>
                          <td class="col-class">${escapeHtml(student.class || '-')}</td>
                          <td class="col-email">${escapeHtml(student.email || '-')}</td>
                          <td class="col-phone">${escapeHtml(student.phoneNumber || '-')}</td>
                          <td class="col-guardian-name">${escapeHtml(student.guardianName || '-')}</td>
                          <td class="col-guardian-phone">${escapeHtml(student.guardianPhone || '-')}</td>
                          <td class="col-address">${escapeHtml(student.address || '-')}</td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Don't close immediately, let user see the print dialog
      }, 250);
    };

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('PDF export failed');
  }
};

// Helper function to escape HTML
function escapeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Export teachers to PDF
export const exportTeachersToPDF = async (teachers: any[], filename: string = 'teachers.pdf', schoolLogo?: string, schoolSettings?: any) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('পপআপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপআপ অনুমতি দিন।');
      return;
    }

    const currentDate = new Date().toLocaleDateString('bn-BD');
    const logoHtml = schoolLogo ? `<img src="${escapeHtml(schoolLogo)}" alt="School Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 10px;" />` : '';
    const logoSectionHtml = logoHtml ? `<div class="school-logo">${logoHtml}</div>` : '';
    
    const schoolName = schoolSettings?.schoolName || 'ইকরা নূরানী একাডেমি';
    const schoolAddress = schoolSettings?.schoolAddress || 'Dhaka, Bangladesh';
    const schoolPhone = schoolSettings?.schoolPhone || '০১৭১১১১১১১১';
    const schoolEmail = schoolSettings?.schoolEmail || 'info@ikranurani.edu';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn" dir="ltr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>শিক্ষক তালিকা রিপোর্ট</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
              body {
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  margin: 0;
                  padding: 10px 8px;
                  direction: ltr;
                  text-align: left;
              }
              .school-header {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 8px;
                  padding: 8px;
                  border-bottom: 2px solid #2563eb;
                  position: relative;
              }
              .school-logo {
                  position: absolute;
                  left: 0;
                  flex-shrink: 0;
              }
              .school-logo img {
                  max-height: 60px;
                  max-width: 200px;
                  object-fit: contain;
              }
              .school-info-container {
                  text-align: center;
                  flex: 1;
              }
              .school-name {
                  font-size: 32px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 6px;
              }
              .school-info {
                  font-size: 14px;
                  color: #333;
                  margin-bottom: 3px;
              }
              .report-header {
                  text-align: center;
                  margin-bottom: 10px;
                  padding: 8px;
              }
              .report-title {
                  font-size: 24px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 15px;
              }
              .report-info {
                  font-size: 16px;
                  color: #333;
                  margin-bottom: 5px;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px auto;
                  font-size: 10px;
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  table-layout: fixed;
                  direction: ltr;
              }
              th, td {
                  border: 1px solid #2563eb;
                  padding: 6px 4px;
                  text-align: center;
                  white-space: normal;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
              }
              th {
                  background-color: #dbeafe;
                  font-weight: bold;
                  color: #1e40af;
                  font-size: 11px;
                  border-bottom: 2px solid #2563eb;
                  line-height: 1.3;
              }
              td {
                  font-size: 10px;
                  line-height: 1.3;
              }
              tr:nth-child(even) {
                  background-color: #f9f9f9;
              }
              .col-serial { width: 5%; }
              .col-name { width: 18%; }
              .col-id { width: 10%; }
              .col-email { width: 18%; }
              .col-phone { width: 12%; }
              .col-subject { width: 12%; }
              .col-class { width: 10%; }
              .col-qualification { width: 15%; }
              @media print {
                  body { padding: 20px; }
                  .no-print { display: none; }
              }
              @page {
                  size: A4 landscape;
                  margin: 0.2in;
              }
          </style>
      </head>
      <body>
          <div class="school-header">
              ${logoSectionHtml}
              <div class="school-info-container">
                  <div class="school-name">${escapeHtml(schoolName)}</div>
                  <div class="school-info">${escapeHtml(schoolAddress)}</div>
                  <div class="school-info">ফোন: ${escapeHtml(schoolPhone)} | ইমেইল: ${escapeHtml(schoolEmail)}</div>
              </div>
          </div>

          <div class="report-header">
              <div class="report-title">শিক্ষক তালিকা</div>
              <div class="report-info">
                  রিপোর্ট তৈরির তারিখ: ${currentDate} | মোট শিক্ষক: ${teachers.length} জন
              </div>
          </div>

          <table>
              <thead>
                  <tr>
                      <th class="col-serial">ক্রমিক</th>
                      <th class="col-name">নাম</th>
                      <th class="col-id">শিক্ষক আইডি</th>
                      <th class="col-email">ইমেইল</th>
                      <th class="col-phone">ফোন নম্বর</th>
                      <th class="col-subject">বিষয়</th>
                      <th class="col-class">ক্লাস</th>
                      <th class="col-qualification">যোগ্যতা</th>
                  </tr>
              </thead>
              <tbody>
                  ${teachers.map((teacher, index) => `
                      <tr>
                          <td class="col-serial">${index + 1}</td>
                          <td class="col-name">${escapeHtml(teacher.name || '-')}</td>
                          <td class="col-id">${escapeHtml(teacher.teacherId || '-')}</td>
                          <td class="col-email">${escapeHtml(teacher.email || '-')}</td>
                          <td class="col-phone">${escapeHtml(teacher.phoneNumber || '-')}</td>
                          <td class="col-subject">${escapeHtml(teacher.subject || '-')}</td>
                          <td class="col-class">${escapeHtml(teacher.class || '-')}</td>
                          <td class="col-qualification">${escapeHtml(teacher.qualification || '-')}</td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

  } catch (error) {
    console.error('Error exporting teachers to PDF:', error);
    throw new Error('PDF export failed');
  }
};

// Export single teacher to PDF
export const exportSingleTeacherToPDF = async (teacher: any, schoolLogo?: string, schoolSettings?: any) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('পপআপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপআপ অনুমতি দিন।');
      return;
    }

    const currentDate = new Date().toLocaleDateString('bn-BD');
    const logoHtml = schoolLogo ? `<img src="${escapeHtml(schoolLogo)}" alt="School Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 10px;" />` : '';
    const logoSectionHtml = logoHtml ? `<div class="school-logo">${logoHtml}</div>` : '';
    
    const schoolName = schoolSettings?.schoolName || 'ইকরা নূরানী একাডেমি';
    const schoolAddress = schoolSettings?.schoolAddress || 'Dhaka, Bangladesh';
    const schoolPhone = schoolSettings?.schoolPhone || '০১৭১১১১১১১১';
    const schoolEmail = schoolSettings?.schoolEmail || 'info@ikranurani.edu';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn" dir="ltr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>শিক্ষক তথ্য</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
              body {
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  direction: ltr;
                  text-align: left;
              }
              .page-container {
                  padding: 8px;
                  display: flex;
                  flex-direction: column;
              }
              .school-header {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 6px;
                  padding: 4px;
                  border-bottom: 2px solid #2563eb;
                  position: relative;
              }
              .school-logo {
                  position: absolute;
                  left: 0;
                  flex-shrink: 0;
              }
              .school-logo img {
                  max-height: 45px;
                  max-width: 160px;
                  object-fit: contain;
              }
              .school-info-container {
                  text-align: center;
                  flex: 1;
              }
              .school-name {
                  font-size: 24px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 2px;
              }
              .school-info {
                  font-size: 12px;
                  color: #333;
                  margin-bottom: 1px;
              }
              .teacher-header {
                  text-align: center;
                  margin-bottom: 8px;
                  padding: 8px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border-radius: 6px;
              }
              .teacher-profile {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  margin-bottom: 8px;
              }
              .teacher-image {
                  width: 120px;
                  height: 120px;
                  border-radius: 50%;
                  border: 4px solid white;
                  object-fit: cover;
                  margin-bottom: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              }
              .teacher-name {
                  font-size: 26px;
                  font-weight: bold;
                  margin-bottom: 3px;
              }
              .teacher-subject {
                  font-size: 16px;
                  opacity: 0.9;
              }
              .content-wrapper {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 10px;
              }
              .info-section {
                  margin-bottom: 8px;
                  padding: 8px;
                  background: #f9fafb;
                  border-radius: 4px;
                  border-left: 3px solid #2563eb;
              }
              .info-section h3 {
                  font-size: 16px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 6px;
                  border-bottom: 1px solid #e5e7eb;
                  padding-bottom: 3px;
              }
              .info-row {
                  display: flex;
                  margin-bottom: 4px;
                  font-size: 13px;
                  line-height: 1.4;
              }
              .info-label {
                  font-weight: 600;
                  color: #374151;
                  width: 160px;
                  flex-shrink: 0;
              }
              .info-value {
                  color: #6b7280;
                  flex: 1;
              }
              .status-badge {
                  display: inline-block;
                  padding: 4px 12px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: 600;
              }
              .status-active {
                  background-color: #d1fae5;
                  color: #065f46;
              }
              .status-inactive {
                  background-color: #fee2e2;
                  color: #991b1b;
              }
              @media print {
                  body { padding: 0; margin: 0; }
                  .page-container { padding: 8px; }
                  .no-print { display: none; }
              }
              @page {
                  size: A4 portrait;
                  margin: 0.15in;
              }
          </style>
      </head>
      <body>
          <div class="page-container">
          <div class="school-header">
              ${logoSectionHtml}
              <div class="school-info-container">
                  <div class="school-name">${escapeHtml(schoolName)}</div>
                  <div class="school-info">${escapeHtml(schoolAddress)}</div>
                  <div class="school-info">ফোন: ${escapeHtml(schoolPhone)} | ইমেইল: ${escapeHtml(schoolEmail)}</div>
              </div>
          </div>

          <div class="teacher-header">
              <div class="teacher-profile">
                  ${teacher.profileImage ? `<img src="${escapeHtml(teacher.profileImage)}" alt="Teacher Photo" class="teacher-image" onerror="this.style.display='none'">` : ''}
                  <div class="teacher-name">${escapeHtml(teacher.name || teacher.displayName || '-')}</div>
              </div>
          </div>

          <div class="content-wrapper">
              <div class="left-column">
                  <div class="info-section">
                      <h3>ব্যক্তিগত তথ্য</h3>
              <div class="info-row">
                  <span class="info-label">নাম:</span>
                  <span class="info-value">${escapeHtml(teacher.name || teacher.displayName || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">ইমেইল:</span>
                  <span class="info-value">${escapeHtml(teacher.email || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">ফোন নম্বর:</span>
                  <span class="info-value">${escapeHtml(teacher.phoneNumber || teacher.phone || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">জন্ম তারিখ:</span>
                  <span class="info-value">${escapeHtml(teacher.dateOfBirth || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">লিঙ্গ:</span>
                  <span class="info-value">${escapeHtml(teacher.gender || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">বৈবাহিক অবস্থা:</span>
                  <span class="info-value">${escapeHtml(teacher.maritalStatus || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">জাতীয়তা:</span>
                  <span class="info-value">${escapeHtml(teacher.nationality || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">ধর্ম:</span>
                  <span class="info-value">${escapeHtml(teacher.religion || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">রক্তের গ্রুপ:</span>
                  <span class="info-value">${escapeHtml(teacher.bloodGroup || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">পিতার নাম:</span>
                  <span class="info-value">${escapeHtml(teacher.fatherName || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">মাতার নাম:</span>
                  <span class="info-value">${escapeHtml(teacher.motherName || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">জাতীয় পরিচয়পত্র:</span>
                  <span class="info-value">${escapeHtml(teacher.nationalId || '-')}</span>
                      </div>
                  </div>

                  <div class="info-section">
                      <h3>ঠিকানা</h3>
              <div class="info-row">
                  <span class="info-label">বর্তমান ঠিকানা:</span>
                  <span class="info-value">${escapeHtml(teacher.presentAddress || teacher.address || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">স্থায়ী ঠিকানা:</span>
                  <span class="info-value">${escapeHtml(teacher.permanentAddress || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">শহর:</span>
                  <span class="info-value">${escapeHtml(teacher.city || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">জেলা:</span>
                  <span class="info-value">${escapeHtml(teacher.district || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">পোস্টাল কোড:</span>
                  <span class="info-value">${escapeHtml(teacher.postalCode || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">দেশ:</span>
                  <span class="info-value">${escapeHtml(teacher.country || '-')}</span>
                      </div>
                  </div>
              </div>

              <div class="right-column">
                  <div class="info-section">
                      <h3>পেশাগত তথ্য</h3>
              <div class="info-row">
                  <span class="info-label">শিক্ষক আইডি:</span>
                  <span class="info-value">${escapeHtml(teacher.teacherId || teacher.employeeId || teacher.uid || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">কর্মচারী আইডি:</span>
                  <span class="info-value">${escapeHtml(teacher.employeeId || teacher.teacherId || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">বিষয়:</span>
                  <span class="info-value">${escapeHtml(teacher.subject || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">ক্লাস:</span>
                  <span class="info-value">${escapeHtml(teacher.class || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">যোগ্যতা:</span>
                  <span class="info-value">${escapeHtml(teacher.qualification || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">অভিজ্ঞতা:</span>
                  <span class="info-value">${escapeHtml(teacher.experience || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">বিশেষায়ন:</span>
                  <span class="info-value">${escapeHtml(teacher.specialization || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">বিভাগ:</span>
                  <span class="info-value">${escapeHtml(teacher.department || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">পদবী:</span>
                  <span class="info-value">${escapeHtml(teacher.designation || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">যোগদানের তারিখ:</span>
                  <span class="info-value">${escapeHtml(teacher.joinDate || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">বেতন:</span>
                  <span class="info-value">${teacher.salary && teacher.salary !== '-' ? (typeof teacher.salary === 'number' ? teacher.salary.toLocaleString('bn-BD') + ' টাকা' : teacher.salary) : '-'}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">নিয়োগের ধরন:</span>
                  <span class="info-value">${escapeHtml(teacher.employmentType || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">অবস্থা:</span>
                  <span class="info-value">
                      <span class="status-badge ${teacher.isActive !== false ? 'status-active' : 'status-inactive'}">
                          ${teacher.isActive !== false ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                  </span>
                      </div>
                  </div>

                  <div class="info-section">
                      <h3>জরুরি যোগাযোগ</h3>
              <div class="info-row">
                  <span class="info-label">যোগাযোগের নাম:</span>
                  <span class="info-value">${escapeHtml(teacher.emergencyContactName || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">যোগাযোগের ফোন:</span>
                  <span class="info-value">${escapeHtml(teacher.emergencyContactPhone || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">সম্পর্ক:</span>
                  <span class="info-value">${escapeHtml(teacher.emergencyContactRelation || '-')}</span>
                      </div>
                  </div>

                  <div class="info-section">
                      <h3>অতিরিক্ত তথ্য</h3>
              <div class="info-row">
                  <span class="info-label">ভাষা:</span>
                  <span class="info-value">${escapeHtml(teacher.languages || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">দক্ষতা:</span>
                  <span class="info-value">${escapeHtml(teacher.skills || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">অর্জন:</span>
                  <span class="info-value">${escapeHtml(teacher.achievements || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">প্রকাশনা:</span>
                  <span class="info-value">${escapeHtml(teacher.publications || '-')}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">গবেষণার আগ্রহ:</span>
                  <span class="info-value">${escapeHtml(teacher.researchInterests || '-')}</span>
                      </div>
                  </div>
              </div>
          </div>

          <div style="text-align: center; margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px;">
              রিপোর্ট তৈরির তারিখ: ${currentDate}
          </div>
          </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

  } catch (error) {
    console.error('Error exporting single teacher to PDF:', error);
    throw new Error('PDF export failed');
  }
};

// Export teachers to Excel
export const exportTeachersToExcel = (teachers: any[], filename: string = 'teachers.xlsx') => {
  try {
    // Prepare data for Excel
    const excelData = teachers.map((teacher, index) => ({
      'ক্রমিক': index + 1,
      'নাম': teacher.name || '-',
      'শিক্ষক আইডি': teacher.teacherId || '-',
      'ইমেইল': teacher.email || '-',
      'ফোন নম্বর': teacher.phoneNumber || '-',
      'বিষয়': teacher.subject || '-',
      'ক্লাস': teacher.class || '-',
      'যোগ্যতা': teacher.qualification || '-',
      'অভিজ্ঞতা': teacher.experience || '-',
      'ঠিকানা': teacher.address || '-',
      'অবস্থা': teacher.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়',
      'তৈরির তারিখ': teacher.createdAt || '-'
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const colWidths = [
      { wch: 8 },  // ক্রমিক
      { wch: 25 }, // নাম
      { wch: 15 }, // শিক্ষক আইডি
      { wch: 30 }, // ইমেইল
      { wch: 15 }, // ফোন নম্বর
      { wch: 15 }, // বিষয়
      { wch: 12 }, // ক্লাস
      { wch: 20 }, // যোগ্যতা
      { wch: 12 }, // অভিজ্ঞতা
      { wch: 30 }, // ঠিকানা
      { wch: 12 }, // অবস্থা
      { wch: 20 }  // তৈরির তারিখ
    ];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'শিক্ষক');
    
    // Save file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting teachers to Excel:', error);
    throw new Error('Excel export failed');
  }
};

// Export exam results to Excel
export const exportExamResultsToExcel = (results: any[], filename: string = 'exam-results.xlsx') => {
  try {
    // Prepare data for Excel
    const excelData = results.map((result, index) => ({
      'ক্রমিক': index + 1,
      'শিক্ষার্থী আইডি': result.studentId || '-',
      'শিক্ষার্থীর নাম': result.studentName || '-',
      'ক্লাস': result.className || '-',
      'পরীক্ষার নাম': result.examName || '-',
      'বিষয়': result.subject || '-',
      'প্রাপ্ত নম্বর': result.obtainedMarks || 0,
      'মোট নম্বর': result.totalMarks || 0,
      'শতাংশ': result.percentage ? `${result.percentage}%` : '-',
      'গ্রেড': result.grade || '-',
      'জিপিএ': result.gpa || '-',
      'অবস্থা': result.percentage >= 40 ? 'পাস' : 'ফেল'
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const colWidths = [
      { wch: 8 },  // ক্রমিক
      { wch: 15 }, // শিক্ষার্থী আইডি
      { wch: 25 }, // শিক্ষার্থীর নাম
      { wch: 15 }, // ক্লাস
      { wch: 20 }, // পরীক্ষার নাম
      { wch: 15 }, // বিষয়
      { wch: 12 }, // প্রাপ্ত নম্বর
      { wch: 12 }, // মোট নম্বর
      { wch: 10 }, // শতাংশ
      { wch: 8 },  // গ্রেড
      { wch: 8 },  // জিপিএ
      { wch: 10 }  // অবস্থা
    ];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'পরীক্ষার ফলাফল');
    
    // Save file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting exam results to Excel:', error);
    throw new Error('Excel export failed');
  }
};

// Export exam results to Excel (pivot format - students with all subjects)
export const exportExamResultsPivotToExcel = (pivotData: any[], allSubjects: string[], examName: string, className: string, filename: string = 'exam-results-pivot.xlsx') => {
  try {
    // Prepare headers
    const headers = [
      'ক্রমিক',
      'শিক্ষার্থী আইডি',
      'শিক্ষার্থীর নাম',
      'ক্লাস',
      ...allSubjects.map(sub => `${sub} (নম্বর)`),
      ...allSubjects.map(sub => `${sub} (গ্রেড)`),
      'মোট নম্বর',
      'গড় শতাংশ',
      'জিপিএ',
      'গ্রেড',
      'অবস্থা',
      'র‍্যাঙ্ক'
    ];
    
    // Prepare data
    const excelData = pivotData.map((student, index) => {
      const row: any = {
        'ক্রমিক': index + 1,
        'শিক্ষার্থী আইডি': student.studentId || '-',
        'শিক্ষার্থীর নাম': student.studentName || '-',
        'ক্লাস': student.className || '-'
      };
      
      // Add subject marks
      allSubjects.forEach(subject => {
        const subjectData = student.subjects.get(subject);
        row[`${subject} (নম্বর)`] = subjectData?.obtainedMarks || 0;
      });
      
      // Add subject grades
      allSubjects.forEach(subject => {
        const subjectData = student.subjects.get(subject);
        row[`${subject} (গ্রেড)`] = subjectData?.grade || '-';
      });
      
      row['মোট নম্বর'] = student.totalObtainedMarks || 0;
      row['গড় শতাংশ'] = `${student.averagePercentage.toFixed(2)}%`;
      row['জিপিএ'] = student.averageGPA.toFixed(2);
      row['গ্রেড'] = student.overallGrade || '-';
      row['অবস্থা'] = student.isPass ? 'পাস' : 'ফেল';
      row['র‍্যাঙ্ক'] = student.rank || '-';
      
      return row;
    });
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const colWidths = [
      { wch: 8 },   // ক্রমিক
      { wch: 15 },  // শিক্ষার্থী আইডি
      { wch: 25 },  // শিক্ষার্থীর নাম
      { wch: 15 },  // ক্লাস
      ...allSubjects.map(() => ({ wch: 12 })), // Subject marks
      ...allSubjects.map(() => ({ wch: 8 })),  // Subject grades
      { wch: 12 },  // মোট নম্বর
      { wch: 12 },  // গড় শতাংশ
      { wch: 8 },   // জিপিএ
      { wch: 8 },   // গ্রেড
      { wch: 10 },  // অবস্থা
      { wch: 8 }    // র‍্যাঙ্ক
    ];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    const sheetName = examName && className ? `${examName} - ${className}` : 'পরীক্ষার ফলাফল';
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel sheet name limit
    
    // Save file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting exam results pivot to Excel:', error);
    throw new Error('Excel export failed');
  }
};

// Export exam results to PDF
export const exportExamResultsToPDF = async (results: any[], filename: string = 'exam-results.pdf', schoolLogo?: string, schoolSettings?: any, examName?: string, className?: string) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('পপআপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপআপ অনুমতি দিন।');
      return;
    }

    const currentDate = new Date().toLocaleDateString('bn-BD');
    const logoHtml = schoolLogo ? `<img src="${escapeHtml(schoolLogo)}" alt="School Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 10px;" />` : '';
    const logoSectionHtml = logoHtml ? `<div class="school-logo">${logoHtml}</div>` : '';
    
    const schoolName = schoolSettings?.schoolName || 'ইকরা নূরানী একাডেমি';
    const schoolAddress = schoolSettings?.schoolAddress || 'Dhaka, Bangladesh';
    const schoolPhone = schoolSettings?.schoolPhone || '০১৭১১১১১১১১';
    const schoolEmail = schoolSettings?.schoolEmail || 'info@ikranurani.edu';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn" dir="ltr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>পরীক্ষার ফলাফল রিপোর্ট</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
              * {
                  box-sizing: border-box;
              }
              body {
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  margin: 0;
                  padding: 10px 8px;
                  direction: ltr;
                  text-align: left;
              }
              .school-header {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 8px;
                  padding: 8px;
                  border-bottom: 2px solid #2563eb;
                  position: relative;
              }
              .school-logo {
                  position: absolute;
                  left: 0;
                  flex-shrink: 0;
              }
              .school-logo img {
                  max-height: 60px;
                  max-width: 200px;
                  object-fit: contain;
              }
              .school-info-container {
                  text-align: center;
                  flex: 1;
              }
              .school-name {
                  font-size: 32px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 6px;
              }
              .school-info {
                  font-size: 14px;
                  color: #333;
                  margin-bottom: 3px;
              }
              .report-header {
                  text-align: center;
                  margin-bottom: 10px;
                  padding: 8px;
              }
              .report-title {
                  font-size: 24px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 15px;
              }
              .report-info {
                  font-size: 16px;
                  color: #333;
                  margin-bottom: 5px;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px auto;
                  font-size: 10px;
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  table-layout: fixed;
                  direction: ltr;
              }
              th, td {
                  border: 1px solid #2563eb;
                  padding: 6px 4px;
                  text-align: center;
                  white-space: normal;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
              }
              th {
                  background-color: #dbeafe;
                  font-weight: bold;
                  color: #1e40af;
                  font-size: 11px;
                  border-bottom: 2px solid #2563eb;
                  line-height: 1.3;
              }
              td {
                  font-size: 10px;
                  line-height: 1.3;
              }
              tr:nth-child(even) {
                  background-color: #f9f9f9;
              }
              @media print {
                  body { padding: 20px; }
                  .no-print { display: none; }
              }
              @page {
                  size: A4 landscape;
                  margin: 0.2in;
              }
          </style>
      </head>
      <body>
          <div class="school-header">
              ${logoSectionHtml}
              <div class="school-info-container">
                  <div class="school-name">${escapeHtml(schoolName)}</div>
                  <div class="school-info">${escapeHtml(schoolAddress)}</div>
                  <div class="school-info">ফোন: ${escapeHtml(schoolPhone)} | ইমেইল: ${escapeHtml(schoolEmail)}</div>
              </div>
          </div>

          <div class="report-header">
              <div class="report-title">পরীক্ষার ফলাফল</div>
              <div class="report-info">
                  ${examName ? `পরীক্ষা: ${escapeHtml(examName)}` : ''}
                  ${className ? ` | ক্লাস: ${escapeHtml(className)}` : ''}
                  | রিপোর্ট তৈরির তারিখ: ${currentDate} | মোট ফলাফল: ${results.length} টি
              </div>
          </div>

          <table>
              <thead>
                  <tr>
                      <th style="width: 8%;">ক্রমিক</th>
                      <th style="width: 12%;">শিক্ষার্থী আইডি</th>
                      <th style="width: 18%;">শিক্ষার্থীর নাম</th>
                      <th style="width: 10%;">ক্লাস</th>
                      <th style="width: 15%;">পরীক্ষার নাম</th>
                      <th style="width: 12%;">বিষয়</th>
                      <th style="width: 8%;">প্রাপ্ত</th>
                      <th style="width: 8%;">মোট</th>
                      <th style="width: 8%;">শতাংশ</th>
                      <th style="width: 6%;">গ্রেড</th>
                      <th style="width: 7%;">অবস্থা</th>
                  </tr>
              </thead>
              <tbody>
                  ${results.map((result, index) => `
                      <tr>
                          <td>${index + 1}</td>
                          <td>${escapeHtml(result.studentId || '-')}</td>
                          <td>${escapeHtml(result.studentName || '-')}</td>
                          <td>${escapeHtml(result.className || '-')}</td>
                          <td>${escapeHtml(result.examName || '-')}</td>
                          <td>${escapeHtml(result.subject || '-')}</td>
                          <td>${result.obtainedMarks || 0}</td>
                          <td>${result.totalMarks || 0}</td>
                          <td>${result.percentage ? result.percentage.toFixed(2) + '%' : '-'}</td>
                          <td>${result.grade || '-'}</td>
                          <td>${result.percentage >= 40 ? 'পাস' : 'ফেল'}</td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

  } catch (error) {
    console.error('Error exporting exam results to PDF:', error);
    throw new Error('PDF export failed');
  }
};

// Export exam results pivot to PDF
export const exportExamResultsPivotToPDF = async (pivotData: any[], allSubjects: string[], examName: string, className: string, filename: string = 'exam-results-pivot.pdf', schoolLogo?: string, schoolSettings?: any) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('পপআপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপআপ অনুমতি দিন।');
      return;
    }

    const currentDate = new Date().toLocaleDateString('bn-BD');
    const logoHtml = schoolLogo ? `<img src="${escapeHtml(schoolLogo)}" alt="School Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 10px;" />` : '';
    const logoSectionHtml = logoHtml ? `<div class="school-logo">${logoHtml}</div>` : '';
    
    const schoolName = schoolSettings?.schoolName || 'ইকরা নূরানী একাডেমি';
    const schoolAddress = schoolSettings?.schoolAddress || 'Dhaka, Bangladesh';
    const schoolPhone = schoolSettings?.schoolPhone || '০১৭১১১১১১১১';
    const schoolEmail = schoolSettings?.schoolEmail || 'info@ikranurani.edu';

    // Create subject columns HTML - only marks, no grade column, filter out "ক্রস"
    const filteredSubjects = allSubjects.filter(sub => sub && sub.trim() !== 'ক্রস' && sub.trim() !== '');
    const subjectColsHtml = filteredSubjects.map(sub => `
      <th style="width: 8%;">${escapeHtml(sub)}</th>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn" dir="ltr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>পরীক্ষার ফলাফল রিপোর্ট</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
              * {
                  box-sizing: border-box;
              }
              body {
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  margin: 0;
                  padding: 5px;
                  direction: ltr;
                  text-align: left;
              }
              .school-header {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 5px;
                  padding: 5px;
                  border-bottom: 2px solid #2563eb;
                  position: relative;
              }
              .school-logo {
                  position: absolute;
                  left: 0;
                  flex-shrink: 0;
              }
              .school-logo img {
                  max-height: 50px;
                  max-width: 180px;
                  object-fit: contain;
              }
              .school-info-container {
                  text-align: center;
                  flex: 1;
              }
              .school-name {
                  font-size: 28px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 3px;
              }
              .school-info {
                  font-size: 12px;
                  color: #333;
                  margin-bottom: 2px;
              }
              .report-header {
                  text-align: center;
                  margin-bottom: 5px;
                  padding: 5px;
              }
              .report-title {
                  font-size: 20px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 8px;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 10px auto;
                  font-size: 14px;
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  table-layout: fixed;
                  direction: ltr;
              }
              th, td {
                  border: 1px solid #2563eb;
                  padding: 5px 3px;
                  text-align: center;
                  white-space: normal;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
              }
              th {
                  background-color: #dbeafe;
                  font-weight: bold;
                  color: #1e40af;
                  font-size: 14px;
                  border-bottom: 2px solid #2563eb;
                  line-height: 1.3;
              }
              td {
                  font-size: 14px;
                  line-height: 1.3;
              }
              tr:nth-child(even) {
                  background-color: #f9f9f9;
              }
              @media print {
                  body { padding: 5px; }
                  .no-print { display: none; }
              }
              @page {
                  size: A4 landscape;
                  margin: 0.15in;
              }
          </style>
      </head>
      <body>
          <div class="school-header">
              ${logoSectionHtml}
              <div class="school-info-container">
                  <div class="school-name">${escapeHtml(schoolName)}</div>
                  <div class="school-info">${escapeHtml(schoolAddress)}</div>
                  <div class="school-info">ফোন: ${escapeHtml(schoolPhone)} | ইমেইল: ${escapeHtml(schoolEmail)}</div>
              </div>
          </div>

          <div class="report-header">
              <div class="report-title">${escapeHtml(examName)} - ${escapeHtml(className)}</div>
          </div>

          <table>
              <thead>
                  <tr>
                      <th style="width: 4%;">ক্রমিক</th>
                      <th style="width: 20%;">শিক্ষার্থীর নাম</th>
                      ${subjectColsHtml}
                      <th style="width: 6%;">মোট</th>
                      <th style="width: 5%;">জিপিএ</th>
                      <th style="width: 5%;">অবস্থা</th>
                      <th style="width: 5%;">অবস্থান</th>
                  </tr>
              </thead>
              <tbody>
                  ${pivotData.map((student, index) => {
                    const filteredSubjects = allSubjects.filter(sub => sub && sub.trim() !== 'ক্রস' && sub.trim() !== '');
                    const subjectCellsHtml = filteredSubjects.map(subject => {
                      const subjectData = student.subjects.get(subject);
                      return `
                        <td>${subjectData?.obtainedMarks || 0}</td>
                      `;
                    }).join('');
                    
                    return `
                      <tr>
                          <td>${index + 1}</td>
                          <td>${escapeHtml(student.studentName || '-')}</td>
                          ${subjectCellsHtml}
                          <td>${student.totalObtainedMarks || 0}</td>
                          <td>${student.averageGPA.toFixed(2)}</td>
                          <td>${student.isPass ? 'পাস' : 'ফেল'}</td>
                          <td>${student.rank || '-'}</td>
                      </tr>
                    `;
                  }).join('')}
              </tbody>
          </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

  } catch (error) {
    console.error('Error exporting exam results pivot to PDF:', error);
    throw new Error('PDF export failed');
  }
};

// Export to Excel
export const exportToExcel = (students: StudentExportData[], filename: string = 'students.xlsx') => {
  try {
    // Prepare data for Excel
    const excelData = students.map(student => ({
      'নাম': student.name,
      'শিক্ষার্থী আইডি': student.studentId,
      'রোল নম্বর': student.rollNumber || '-',
      'ইমেইল': student.email,
      'ফোন নম্বর': student.phoneNumber,
      'ক্লাস': student.class,
      'অভিভাবকের নাম': student.guardianName || '-',
      'অভিভাবকের ফোন': student.guardianPhone || '-',
      'ঠিকানা': student.address || '-',
      'জন্ম তারিখ': student.dateOfBirth || '-',
      'অবস্থা': student.isApproved ? 'অনুমোদিত' : 'পেন্ডিং',
      'সক্রিয়': student.isActive ? 'হ্যাঁ' : 'না',
      'তৈরির তারিখ': student.createdAt
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, // নাম
      { wch: 15 }, // শিক্ষার্থী আইডি
      { wch: 12 }, // রোল নম্বর
      { wch: 30 }, // ইমেইল
      { wch: 15 }, // ফোন নম্বর
      { wch: 12 }, // ক্লাস
      { wch: 20 }, // অভিভাবকের নাম
      { wch: 15 }, // অভিভাবকের ফোন
      { wch: 30 }, // ঠিকানা
      { wch: 15 }, // জন্ম তারিখ
      { wch: 12 }, // অবস্থা
      { wch: 10 }, // সক্রিয়
      { wch: 20 }  // তৈরির তারিখ
    ];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'শিক্ষার্থীরা');
    
    // Save file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Excel export failed');
  }
};

// Export to DOCX
export const exportToDOCX = async (students: StudentExportData[], filename: string = 'students.docx') => {
  try {
    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: 'শিক্ষার্থীদের তালিকা',
                bold: true,
                size: 32
              })
            ],
            alignment: 'center'
          }),
          
          // Date
          new Paragraph({
            children: [
              new TextRun({
                text: `তারিখ: ${new Date().toLocaleDateString('bn-BD')}`,
                size: 20
              })
            ],
            alignment: 'center'
          }),
          
          // Empty line
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          
          // Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'নাম', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'আইডি', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'রোল', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ইমেইল', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ফোন', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ক্লাস', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'অভিভাবক', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'অবস্থা', bold: true })] })] })
                ]
              }),
              
              // Data rows
              ...students.map(student => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.name })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.studentId })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.rollNumber || '-' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.email })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.phoneNumber })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.class })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.guardianName || '-' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.isApproved ? 'অনুমোদিত' : 'পেন্ডিং' })] })] })
                  ]
                })
              )
            ]
          })
        ]
      }]
    });
    
    // Generate and save
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error exporting to DOCX:', error);
    throw new Error('DOCX export failed');
  }
};

// Format date for display
export const formatDate = (date: any): string => {
  if (!date) return '-';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('bn-BD');
};

// Export tuition fee collection data to PDF
export const exportTuitionFeeCollectionToPDF = async (
  paymentData: any[],
  filename: string = 'tuition_fee_collection.pdf',
  schoolLogo?: string,
  schoolSettings?: any
) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('পপআপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপআপ অনুমতি দিন।');
      return;
    }

    const currentDate = new Date().toLocaleDateString('bn-BD');
    const logoHtml = schoolLogo ? `<img src="${escapeHtml(schoolLogo)}" alt="School Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 10px;" />` : '';
    const logoSectionHtml = logoHtml ? `<div class="school-logo">${logoHtml}</div>` : '';
    
    // Get real data from settings with fallbacks
    const schoolName = schoolSettings?.schoolName || 'ইকরা নূরানী একাডেমি';
    const schoolAddress = schoolSettings?.schoolAddress || 'চাঁদাইকোনা, রায়গঞ্জ, সিরাজগঞ্জ';
    const schoolPhone = schoolSettings?.schoolPhone || '০১৭৯৯৬৬৩২১০';
    const schoolEmail = schoolSettings?.schoolEmail || 'iqranuraniacademy2018@gmail.com';
    const establishmentYear = schoolSettings?.establishmentYear || schoolSettings?.establishedYear || '';
    
    // Format address and establishment info
    let addressLine = escapeHtml(schoolAddress);
    if (establishmentYear) {
      addressLine += ` (প্রতিষ্ঠিত: ${establishmentYear})`;
    }

    const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn" dir="ltr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>টিউশন ফি সংগ্রহ রিপোর্ট</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
              * {
                  box-sizing: border-box;
              }
              body {
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  margin: 0;
                  padding: 5px;
                  direction: ltr;
                  text-align: left;
              }
              .school-header {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 4px;
                  padding: 4px;
                  border-bottom: 2px solid #2563eb;
                  position: relative;
              }
              .school-logo {
                  position: absolute;
                  left: 0;
                  flex-shrink: 0;
              }
              .school-logo img {
                  max-height: 50px;
                  max-width: 180px;
                  object-fit: contain;
              }
              .school-info-container {
                  text-align: center;
                  flex: 1;
              }
              .school-name {
                  font-size: 28px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 3px;
              }
              .school-info {
                  font-size: 12px;
                  color: #333;
                  margin-bottom: 2px;
              }
              .report-header {
                  text-align: center;
                  margin-bottom: 4px;
                  padding: 4px;
              }
              .report-title {
                  font-size: 20px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 6px;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 8px auto;
                  font-size: 10px;
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  table-layout: fixed;
                  direction: ltr;
              }
              th, td {
                  border: 1px solid #2563eb;
                  padding: 4px 3px;
                  text-align: center;
                  white-space: normal;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
              }
              th {
                  background-color: #dbeafe;
                  font-weight: bold;
                  color: #1e40af;
                  font-size: 10px;
                  border-bottom: 2px solid #2563eb;
                  line-height: 1.2;
              }
              td {
                  font-size: 9px;
                  line-height: 1.2;
              }
              tr:nth-child(even) {
                  background-color: #f9f9f9;
              }
              .col-name { width: 15%; }
              .col-class { width: 10%; }
              .col-months { width: 60%; }
              .col-paid { width: 8%; }
              .col-donation { width: 7%; }
              @media print {
                  body { padding: 5px; }
                  .no-print { display: none; }
              }
              @page {
                  size: A4 landscape;
                  margin: 0.15in;
              }
          </style>
      </head>
      <body>
          <div class="school-header">
              ${logoSectionHtml}
              <div class="school-info-container">
                  <div class="school-name">${escapeHtml(schoolName)}</div>
                  <div class="school-info">${addressLine}</div>
                  <div class="school-info">ফোন: ${escapeHtml(schoolPhone)} | ইমেইল: ${escapeHtml(schoolEmail)}</div>
              </div>
          </div>

          <div class="report-header">
              <div class="report-title">টিউশন ফি সংগ্রহ রিপোর্ট</div>
          </div>

          <table>
              <thead>
                  <tr>
                      <th class="col-name">শিক্ষার্থীর নাম</th>
                      <th class="col-class">ক্লাস</th>
                      ${months.map(month => `<th style="width: 5%;">${month}</th>`).join('')}
                      <th class="col-paid">মোট প্রদত্ত</th>
                      <th class="col-donation">মোট অনুদান</th>
                  </tr>
              </thead>
              <tbody>
                  ${paymentData.map((student, index) => {
                    if (!student) return '';
                    const studentName = student.studentName || student.name || '-';
                    const className = student.className || student.class || '-';
                    const payments = student.payments || [];
                    const totalPaid = student.totalPaid || 0;
                    const totalDonation = student.totalDonation || 0;
                    
                    const monthCells = months.map((month, monthIndex) => {
                      const isPaid = payments && payments[monthIndex] === true;
                      return `<td style="color: ${isPaid ? 'green' : 'red'}; font-weight: bold;">${isPaid ? '✓' : '✗'}</td>`;
                    }).join('');
                    
                    return `
                      <tr>
                          <td class="col-name">${escapeHtml(studentName)}</td>
                          <td class="col-class">${escapeHtml(className)}</td>
                          ${monthCells}
                          <td class="col-paid">৳${totalPaid.toLocaleString('bn-BD')}</td>
                          <td class="col-donation">৳${totalDonation.toLocaleString('bn-BD')}</td>
                      </tr>
                    `;
                  }).join('')}
              </tbody>
          </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('PDF এক্সপোর্ট করতে সমস্যা হয়েছে');
  }
};

// Export tuition fee collection data to DOCX
export const exportTuitionFeeCollectionToDOCX = async (
  paymentData: any[],
  filename: string = 'tuition_fee_collection.docx'
) => {
  try {
    const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: 'টিউশন ফি সংগ্রহ রিপোর্ট',
                bold: true,
                size: 32
              })
            ],
            alignment: 'center'
          }),
          
          // Date
          new Paragraph({
            children: [
              new TextRun({
                text: `তারিখ: ${new Date().toLocaleDateString('bn-BD')} | মোট শিক্ষার্থী: ${paymentData.length} জন`,
                size: 20
              })
            ],
            alignment: 'center'
          }),
          
          // Empty line
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          
          // Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'শিক্ষার্থীর নাম', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ক্লাস', bold: true })] })] }),
                  ...months.map(month => 
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: month, bold: true })] })] })
                  ),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'মোট প্রদত্ত', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'মোট অনুদান', bold: true })] })] })
                ]
              }),
              
              // Data rows
              ...paymentData.map(student => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.studentName || '-' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: student.className || '-' })] })] }),
                    ...months.map((month, monthIndex) => {
                      const isPaid = student.payments && student.payments[monthIndex];
                      return new TableCell({ 
                        children: [new Paragraph({ 
                          children: [new TextRun({ 
                            text: isPaid ? '✓' : '✗',
                            color: isPaid ? '00FF00' : 'FF0000',
                            bold: true
                          })] 
                        })] 
                      });
                    }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳${(student.totalPaid || 0).toLocaleString()}` })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳${(student.totalDonation || 0).toLocaleString()}` })] })] })
                  ]
                })
              )
            ]
          })
        ]
      }]
    });
    
    // Generate and save
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error exporting to DOCX:', error);
    alert('DOCX এক্সপোর্ট করতে সমস্যা হয়েছে');
  }
};

// Export exam fee collection data to PDF
export const exportExamFeeCollectionToPDF = async (
  students: any[],
  filename: string = 'exam_fee_collection.pdf',
  schoolLogo?: string,
  schoolSettings?: any
) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('পপআপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপআপ অনুমতি দিন।');
      return;
    }

    const currentDate = new Date().toLocaleDateString('bn-BD');
    const logoHtml = schoolLogo ? `<img src="${escapeHtml(schoolLogo)}" alt="School Logo" style="max-height: 50px; max-width: 180px; margin-bottom: 10px;" />` : '';
    const logoSectionHtml = logoHtml ? `<div class="school-logo">${logoHtml}</div>` : '';
    
    const schoolName = schoolSettings?.schoolName || 'ইকরা নূরানী একাডেমি';
    const schoolAddress = schoolSettings?.schoolAddress || 'চাঁদাইকোনা, রায়গঞ্জ, সিরাজগঞ্জ';
    const schoolPhone = schoolSettings?.schoolPhone || '০১৭৯৯৬৬৩২১০';
    const schoolEmail = schoolSettings?.schoolEmail || 'iqranuraniacademy2018@gmail.com';
    const establishmentYear = schoolSettings?.establishmentYear || schoolSettings?.establishedYear || '';
    
    let addressLine = escapeHtml(schoolAddress);
    if (establishmentYear) {
      addressLine += ` (প্রতিষ্ঠিত: ${establishmentYear})`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn" dir="ltr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>পরীক্ষার ফি সংগ্রহ রিপোর্ট</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
              * { box-sizing: border-box; }
              body {
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  margin: 0;
                  padding: 5px;
                  direction: ltr;
                  text-align: left;
              }
              .school-header {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 4px;
                  padding: 4px;
                  border-bottom: 2px solid #2563eb;
                  position: relative;
              }
              .school-logo {
                  position: absolute;
                  left: 0;
                  flex-shrink: 0;
              }
              .school-logo img {
                  max-height: 50px;
                  max-width: 180px;
                  object-fit: contain;
              }
              .school-info-container {
                  text-align: center;
                  flex: 1;
              }
              .school-name {
                  font-size: 28px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 3px;
              }
              .school-info {
                  font-size: 12px;
                  color: #333;
                  margin-bottom: 2px;
              }
              .report-header {
                  text-align: center;
                  margin-bottom: 4px;
                  padding: 4px;
              }
              .report-title {
                  font-size: 20px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 6px;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 8px auto;
                  font-size: 10px;
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  table-layout: fixed;
                  direction: ltr;
              }
              th, td {
                  border: 1px solid #2563eb;
                  padding: 4px 3px;
                  text-align: center;
                  white-space: normal;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
              }
              th {
                  background-color: #dbeafe;
                  font-weight: bold;
                  color: #1e40af;
                  font-size: 10px;
                  border-bottom: 2px solid #2563eb;
                  line-height: 1.2;
              }
              td {
                  font-size: 9px;
                  line-height: 1.2;
              }
              tr:nth-child(even) {
                  background-color: #f9f9f9;
              }
              @media print {
                  body { padding: 5px; }
                  .no-print { display: none; }
              }
              @page {
                  size: A4 landscape;
                  margin: 0.15in;
              }
          </style>
      </head>
      <body>
          <div class="school-header">
              ${logoSectionHtml}
              <div class="school-info-container">
                  <div class="school-name">${escapeHtml(schoolName)}</div>
                  <div class="school-info">${addressLine}</div>
                  <div class="school-info">ফোন: ${escapeHtml(schoolPhone)} | ইমেইল: ${escapeHtml(schoolEmail)}</div>
              </div>
          </div>

          <div class="report-header">
              <div class="report-title">পরীক্ষার ফি সংগ্রহ রিপোর্ট</div>
          </div>

          <table>
              <thead>
                  <tr>
                      <th style="width: 8%;">ক্রমিক</th>
                      <th style="width: 20%;">শিক্ষার্থীর নাম</th>
                      <th style="width: 12%;">শ্রেণি</th>
                      <th style="width: 10%;">শাখা</th>
                      <th style="width: 15%;">রোল নম্বর</th>
                      <th style="width: 15%;">পরীক্ষার ধরন</th>
                      <th style="width: 10%;">ফি পরিমাণ</th>
                      <th style="width: 10%;">স্ট্যাটাস</th>
                  </tr>
              </thead>
              <tbody>
                  ${students.map((student, index) => {
                    if (!student) return '';
                    const studentName = student.name || student.displayName || student.studentName || '-';
                    const className = student.class || student.className || '-';
                    const section = student.section || '-';
                    const rollNumber = student.rollNumber || student.roll || student.studentId || '-';
                    // Try multiple possible exam type field names
                    const examType = student.examType || student.examTypeForDisplay || student.examName || student.exam || 'পরীক্ষা';
                    // Try multiple possible fee field names
                    const feeAmount = student.feeAmount || student.examFee || student.fee || student.amount || student.tuitionFee || 0;
                    
                    // Determine status based on hasPaid field or status field
                    let status = 'বাকেয়া';
                    if (student.hasPaid === true || student.feeStatus === 'paid' || student.status === 'paid' || student.status === 'সংগৃহীত') {
                      status = 'পরিশোধিত';
                    } else if (student.hasPaid === false || student.feeStatus === 'due' || student.status === 'due' || student.status === 'অপেক্ষমান') {
                      status = 'বাকেয়া';
                    } else if (student.status) {
                      status = student.status;
                    }
                    
                    return `
                      <tr>
                          <td>${index + 1}</td>
                          <td>${escapeHtml(studentName)}</td>
                          <td>${escapeHtml(className)}</td>
                          <td>${escapeHtml(section)}</td>
                          <td>${escapeHtml(rollNumber)}</td>
                          <td>${escapeHtml(examType)}</td>
                          <td>৳${feeAmount.toLocaleString('bn-BD')}</td>
                          <td>${escapeHtml(status)}</td>
                      </tr>
                    `;
                  }).join('')}
              </tbody>
          </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('PDF এক্সপোর্ট করতে সমস্যা হয়েছে');
  }
};

// Export exam fee collection data to DOCX
export const exportExamFeeCollectionToDOCX = async (
  students: any[],
  filename: string = 'exam_fee_collection.docx'
) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'পরীক্ষার ফি সংগ্রহ রিপোর্ট',
                bold: true,
                size: 32
              })
            ],
            alignment: 'center'
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `তারিখ: ${new Date().toLocaleDateString('bn-BD')} | মোট শিক্ষার্থী: ${students.length} জন`,
                size: 20
              })
            ],
            alignment: 'center'
          }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ক্রমিক', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'শিক্ষার্থীর নাম', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'শ্রেণি', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'শাখা', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'রোল নম্বর', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'পরীক্ষার ধরন', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ফি পরিমাণ', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'স্ট্যাটাস', bold: true })] })] })
                ]
              }),
              ...students.map((student, index) => {
                const studentName = student.name || student.displayName || student.studentName || '-';
                const className = student.class || student.className || '-';
                const section = student.section || '-';
                const rollNumber = student.rollNumber || student.roll || '-';
                const examType = student.examType || student.examTypeForDisplay || '-';
                const feeAmount = student.feeAmount || student.examFee || 0;
                const status = student.status || student.feeStatus || 'বাকেয়া';
                
                return new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString() })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: studentName })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: className })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: section })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rollNumber })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: examType })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳${feeAmount.toLocaleString('bn-BD')}` })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: status })] })] })
                  ]
                });
              })
            ]
          })
        ]
      }]
    });
    
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error exporting to DOCX:', error);
    alert('DOCX এক্সপোর্ট করতে সমস্যা হয়েছে');
  }
};

// Export admission fee collection data to PDF
export const exportAdmissionFeeCollectionToPDF = async (
  students: any[],
  filename: string = 'admission_fee_collection.pdf',
  schoolLogo?: string,
  schoolSettings?: any
) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('পপআপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপআপ অনুমতি দিন।');
      return;
    }

    const currentDate = new Date().toLocaleDateString('bn-BD');
    const logoHtml = schoolLogo ? `<img src="${escapeHtml(schoolLogo)}" alt="School Logo" style="max-height: 50px; max-width: 180px; margin-bottom: 10px;" />` : '';
    const logoSectionHtml = logoHtml ? `<div class="school-logo">${logoHtml}</div>` : '';
    
    const schoolName = schoolSettings?.schoolName || 'ইকরা নূরানী একাডেমি';
    const schoolAddress = schoolSettings?.schoolAddress || 'চাঁদাইকোনা, রায়গঞ্জ, সিরাজগঞ্জ';
    const schoolPhone = schoolSettings?.schoolPhone || '০১৭৯৯৬৬৩২১০';
    const schoolEmail = schoolSettings?.schoolEmail || 'iqranuraniacademy2018@gmail.com';
    const establishmentYear = schoolSettings?.establishmentYear || schoolSettings?.establishedYear || '';
    
    let addressLine = escapeHtml(schoolAddress);
    if (establishmentYear) {
      addressLine += ` (প্রতিষ্ঠিত: ${establishmentYear})`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn" dir="ltr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ভর্তি ফি সংগ্রহ রিপোর্ট</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
              * { box-sizing: border-box; }
              body {
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  margin: 0;
                  padding: 5px;
                  direction: ltr;
                  text-align: left;
              }
              .school-header {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 4px;
                  padding: 4px;
                  border-bottom: 2px solid #2563eb;
                  position: relative;
              }
              .school-logo {
                  position: absolute;
                  left: 0;
                  flex-shrink: 0;
              }
              .school-logo img {
                  max-height: 50px;
                  max-width: 180px;
                  object-fit: contain;
              }
              .school-info-container {
                  text-align: center;
                  flex: 1;
              }
              .school-name {
                  font-size: 32px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 3px;
              }
              .school-info {
                  font-size: 14px;
                  color: #333;
                  margin-bottom: 2px;
              }
              .report-header {
                  text-align: center;
                  margin-bottom: 4px;
                  padding: 4px;
              }
              .report-title {
                  font-size: 24px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 6px;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 8px auto;
                  font-size: 12px;
                  font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Siyam Rupali', Arial, sans-serif;
                  table-layout: fixed;
                  direction: ltr;
              }
              th, td {
                  border: 1px solid #2563eb;
                  padding: 5px 4px;
                  text-align: center;
                  white-space: normal;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
              }
              th {
                  background-color: #dbeafe;
                  font-weight: bold;
                  color: #1e40af;
                  font-size: 12px;
                  border-bottom: 2px solid #2563eb;
                  line-height: 1.3;
              }
              td {
                  font-size: 11px;
                  line-height: 1.3;
              }
              tr:nth-child(even) {
                  background-color: #f9f9f9;
              }
              @media print {
                  body { padding: 5px; }
                  .no-print { display: none; }
              }
              @page {
                  size: A4 landscape;
                  margin: 0.15in;
              }
          </style>
      </head>
      <body>
          <div class="school-header">
              ${logoSectionHtml}
              <div class="school-info-container">
                  <div class="school-name">${escapeHtml(schoolName)}</div>
                  <div class="school-info">${escapeHtml(addressLine)}</div>
                  <div class="school-info">ফোন: ${escapeHtml(schoolPhone)} | ইমেইল: ${escapeHtml(schoolEmail)}</div>
              </div>
          </div>

          <div class="report-header">
              <div class="report-title">ভর্তি ফি সংগ্রহ রিপোর্ট</div>
          </div>

          <table>
              <thead>
                  <tr>
                      <th style="width: 6%;">ক্রমিক</th>
                      <th style="width: 10%;">শিক্ষার্থী আইডি</th>
                      <th style="width: 15%;">শিক্ষার্থীর নাম</th>
                      <th style="width: 10%;">শ্রেণি</th>
                      <th style="width: 8%;">শাখা</th>
                      <th style="width: 10%;">ফির ধরন</th>
                      <th style="width: 10%;">মোট প্রদত্ত</th>
                      <th style="width: 10%;">ছাড়</th>
                      <th style="width: 10%;">মোট বাকেয়া</th>
                      <th style="width: 11%;">স্ট্যাটাস</th>
                  </tr>
              </thead>
              <tbody>
                  ${students.map((student, index) => {
                    if (!student) return '';
                    const studentName = student.studentName || student.name || '-';
                    const studentId = student.studentId || '-';
                    const className = student.className || student.class || '-';
                    const section = student.section || '-';
                    const feeType = student.studentType === 'new_admission' ? 'ভর্তি ফি' : 'সেশন ফি';
                    const totalPaid = student.paidAmount || 0;
                    const totalDiscount = student.totalDiscount || 0;
                    const totalDue = student.dueAmount || 0;
                    const status = student.status === 'paid' ? 'পরিশোধিত' : student.status === 'partial' ? 'আংশিক' : 'বাকেয়া';
                    
                    return `
                      <tr>
                          <td>${index + 1}</td>
                          <td>${escapeHtml(studentId)}</td>
                          <td>${escapeHtml(studentName)}</td>
                          <td>${escapeHtml(className)}</td>
                          <td>${escapeHtml(section)}</td>
                          <td>${escapeHtml(feeType)}</td>
                          <td>৳${totalPaid.toLocaleString('bn-BD')}</td>
                          <td>৳${totalDiscount.toLocaleString('bn-BD')}</td>
                          <td>৳${totalDue.toLocaleString('bn-BD')}</td>
                          <td>${escapeHtml(status)}</td>
                      </tr>
                    `;
                  }).join('')}
              </tbody>
          </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('PDF এক্সপোর্ট করতে সমস্যা হয়েছে');
  }
};

// Export admission fee collection data to DOCX
export const exportAdmissionFeeCollectionToDOCX = async (
  students: any[],
  filename: string = 'admission_fee_collection.docx'
) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'ভর্তি ফি সংগ্রহ রিপোর্ট',
                bold: true,
                size: 32
              })
            ],
            alignment: 'center'
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `তারিখ: ${new Date().toLocaleDateString('bn-BD')} | মোট শিক্ষার্থী: ${students.length} জন`,
                size: 20
              })
            ],
            alignment: 'center'
          }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ক্রমিক', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'শিক্ষার্থী আইডি', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'শিক্ষার্থীর নাম', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'শ্রেণি', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'শাখা', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ফির ধরন', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'মোট প্রদত্ত', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ছাড়', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'মোট বাকেয়া', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'স্ট্যাটাস', bold: true })] })] })
                ]
              }),
              ...students.map((student, index) => {
                const studentName = student.studentName || student.name || '-';
                const studentId = student.studentId || '-';
                const className = student.className || student.class || '-';
                const section = student.section || '-';
                const feeType = student.studentType === 'new_admission' ? 'ভর্তি ফি' : 'সেশন ফি';
                const totalPaid = student.paidAmount || 0;
                const totalDiscount = student.totalDiscount || 0;
                const totalDue = student.dueAmount || 0;
                const status = student.status === 'paid' ? 'পরিশোধিত' : student.status === 'partial' ? 'আংশিক' : 'বাকেয়া';
                
                return new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString() })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: studentId })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: studentName })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: className })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: section })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: feeType })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳${totalPaid.toLocaleString('bn-BD')}` })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳${totalDiscount.toLocaleString('bn-BD')}` })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `৳${totalDue.toLocaleString('bn-BD')}` })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: status })] })] })
                  ]
                });
              })
            ]
          })
        ]
      }]
    });
    
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error exporting to DOCX:', error);
    alert('DOCX এক্সপোর্ট করতে সমস্যা হয়েছে');
  }
};

// Convert student data for export
export const convertStudentsForExport = (students: User[]): StudentExportData[] => {
  return students.map(student => ({
    name: student.name || '',
    studentId: student.studentId || '',
    rollNumber: (student as any).rollNumber,
    email: student.email || '',
    phoneNumber: student.phoneNumber || (student as any).phone || '',
    class: student.class || '',
    guardianName: (student as any).guardianName,
    guardianPhone: (student as any).guardianPhone,
    address: (student as any).address,
    dateOfBirth: (student as any).dateOfBirth,
    isApproved: (student as any).isApproved || false,
    isActive: (student as any).isActive || false,
    createdAt: formatDate((student as any).createdAt)
  }));
};
