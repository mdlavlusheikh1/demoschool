import * as XLSX from 'xlsx';

export interface StudentImportTemplate {
  // Basic Information
  name: string;
  studentId: string;
  rollNumber: string;
  registrationNumber: string;
  email: string;
  phoneNumber: string;
  class: string;
  section: string;
  group: string;
  
  // Personal Information
  dateOfBirth: string;
  gender: string;
  address: string;
  
  // Guardian Information
  guardianName: string;
  guardianPhone: string;
  
  // Father Information
  fatherName: string;
  fatherPhone: string;
  fatherOccupation: string;
  
  // Mother Information
  motherName: string;
  motherPhone: string;
  motherOccupation: string;
  
  // Emergency Contact
  emergencyContact: string;
  emergencyRelation: string;
  
  // Previous School Information
  previousSchool: string;
  previousClass: string;
  reasonForLeaving: string;
  previousGPA: string;
  
  // Profile Image (URL)
  profileImage: string;
  
  // Status
  isApproved: string;
  isActive: string;
}

// Generate Excel template for bulk import
export const generateStudentImportTemplate = (filename: string = 'student_import_template.xlsx') => {
  try {
    // Create template data with sample row
    const templateData: StudentImportTemplate[] = [
      {
        // Basic Information
        name: 'নুসরাত জাহান মায়া',
        studentId: 'STD001',
        rollNumber: '001',
        registrationNumber: '26102330001',
        email: 'nusratjaha001@iqra.bd.edu',
        phoneNumber: '01712345678',
        class: 'পঞ্চম',
        section: 'ক',
        group: 'বিজ্ঞান',
        
        // Personal Information
        dateOfBirth: '06/07/2012',
        gender: 'মহিলা',
        address: 'চান্দাইকোনা, মিরপুর, ঢাকা',
        
        // Guardian Information
        guardianName: 'মো. আবুল হাসান',
        guardianPhone: '01712345679',
        
        // Father Information
        fatherName: 'মো. আবুল হাসান',
        fatherPhone: '01712345679',
        fatherOccupation: 'ব্যবসায়ী',
        
        // Mother Information
        motherName: 'রোকসানা বেগম',
        motherPhone: '01712345680',
        motherOccupation: 'গৃহিণী',
        
        // Emergency Contact
        emergencyContact: '01712345681',
        emergencyRelation: 'চাচা',
        
        // Previous School Information
        previousSchool: 'আল-আমিন স্কুল',
        previousClass: 'চতুর্থ',
        reasonForLeaving: 'স্থানান্তর',
        previousGPA: '4.50',
        
        // Profile Image
        profileImage: 'https://example.com/profile.jpg',
        
        // Status
        isApproved: 'true',
        isActive: 'true'
      },
      {
        // Basic Information
        name: 'মোহাম্মদ রফি হাসান',
        studentId: 'STD002',
        rollNumber: '002',
        registrationNumber: '26102330002',
        email: 'rafihasan002@iqra.bd.edu',
        phoneNumber: '01722345678',
        class: 'ষষ্ঠ',
        section: 'খ',
        group: 'মানবিক',
        
        // Personal Information
        dateOfBirth: '15/03/2011',
        gender: 'পুরুষ',
        address: 'বনানী, ঢাকা',
        
        // Guardian Information
        guardianName: 'মো. হোসেন আলী',
        guardianPhone: '01722345679',
        
        // Father Information
        fatherName: 'মো. হোসেন আলী',
        fatherPhone: '01722345679',
        fatherOccupation: 'শিক্ষক',
        
        // Mother Information
        motherName: 'রেহানা খাতুন',
        motherPhone: '01722345680',
        motherOccupation: 'গৃহিণী',
        
        // Emergency Contact
        emergencyContact: '01722345681',
        emergencyRelation: 'মামা',
        
        // Previous School Information
        previousSchool: 'বনানী মডেল স্কুল',
        previousClass: 'পঞ্চম',
        reasonForLeaving: 'ভাল শিক্ষা প্রতিষ্ঠান',
        previousGPA: '4.25',
        
        // Profile Image
        profileImage: 'https://example.com/rafi.jpg',
        
        // Status
        isApproved: 'true',
        isActive: 'true'
      },
      {
        // Basic Information
        name: 'ফাতেমা আক্তার',
        studentId: 'STD003',
        rollNumber: '003',
        registrationNumber: '26102330003',
        email: 'fatemaakter003@iqra.bd.edu',
        phoneNumber: '01732345678',
        class: 'সপ্তম',
        section: 'ক',
        group: 'বিজ্ঞান',
        
        // Personal Information
        dateOfBirth: '22/08/2010',
        gender: 'মহিলা',
        address: 'গুলশান, ঢাকা',
        
        // Guardian Information
        guardianName: 'আবদুর রহমান মিয়া',
        guardianPhone: '01732345679',
        
        // Father Information
        fatherName: 'আবদুর রহমান মিয়া',
        fatherPhone: '01732345679',
        fatherOccupation: 'ইঞ্জিনিয়ার',
        
        // Mother Information
        motherName: 'সালমা বেগম',
        motherPhone: '01732345680',
        motherOccupation: 'ডাক্তার',
        
        // Emergency Contact
        emergencyContact: '01732345681',
        emergencyRelation: 'চাচি',
        
        // Previous School Information
        previousSchool: 'গুলশান মডেল স্কুল',
        previousClass: 'ষষ্ঠ',
        reasonForLeaving: 'আধুনিক সুবিধা',
        previousGPA: '4.75',
        
        // Profile Image
        profileImage: 'https://example.com/fatema.jpg',
        
        // Status
        isApproved: 'true',
        isActive: 'true'
      }
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    const colWidths = [
      { wch: 25 }, // name
      { wch: 15 }, // studentId
      { wch: 12 }, // rollNumber
      { wch: 18 }, // registrationNumber
      { wch: 30 }, // email
      { wch: 15 }, // phoneNumber
      { wch: 12 }, // class
      { wch: 10 }, // section
      { wch: 12 }, // group
      { wch: 15 }, // dateOfBirth
      { wch: 10 }, // gender
      { wch: 30 }, // address
      { wch: 20 }, // guardianName
      { wch: 15 }, // guardianPhone
      { wch: 20 }, // fatherName
      { wch: 15 }, // fatherPhone
      { wch: 20 }, // fatherOccupation
      { wch: 20 }, // motherName
      { wch: 15 }, // motherPhone
      { wch: 20 }, // motherOccupation
      { wch: 15 }, // emergencyContact
      { wch: 15 }, // emergencyRelation
      { wch: 25 }, // previousSchool
      { wch: 12 }, // previousClass
      { wch: 20 }, // reasonForLeaving
      { wch: 10 }, // previousGPA
      { wch: 40 }, // profileImage
      { wch: 10 }, // isApproved
      { wch: 10 }  // isActive
    ];
    ws['!cols'] = colWidths;

    // Add instructions sheet
    const instructionsData = [
      ['শিক্ষার্থী বাল্ক ইমপোর্ট টেমপ্লেট - নির্দেশাবলী'],
      [''],
      ['এই টেমপ্লেট ব্যবহার করে একসাথে অনেক শিক্ষার্থী যোগ করতে পারেন।'],
      [''],
      ['নির্দেশাবলী:'],
      ['1. প্রথম তিনটি সারিতে দেওয়া নমুনা ডেটা মুছে ফেলুন'],
      ['2. আপনার শিক্ষার্থীদের তথ্য লিখুন'],
      ['3. সব প্রয়োজনীয় ক্ষেত্র পূরণ করুন'],
      ['4. ফাইলটি সংরক্ষণ করুন'],
      ['5. এই পেজে আপলোড করুন'],
      [''],
      ['ক্ষেত্রের বিবরণ:'],
      ['নাম - শিক্ষার্থীর পূর্ণ নাম (বাংলা বা ইংরেজি)'],
      ['শিক্ষার্থী আইডি - স্বয়ংক্রিয়ভাবে তৈরি হবে (খালি রাখুন)'],
      ['রোল নম্বর - স্বয়ংক্রিয়ভাবে তৈরি হবে (খালি রাখুন)'],
      ['রেজিস্ট্রেশন নম্বর - 26 + স্কুল কোড + রোল নম্বর ফরম্যাটে (যেমন: 26102330001)'],
      ['ইমেইল - স্বয়ংক্রিয়ভাবে তৈরি হবে (খালি রাখুন)'],
      ['ফোন নম্বর - অভিভাবকের ফোন নম্বর'],
      ['ক্লাস - ক্লাসের নাম (যেমন: পঞ্চম, ষষ্ঠ, সপ্তম)'],
      ['বিভাগ - বিভাগের নাম (যেমন: ক, খ, গ)'],
      ['গ্রুপ - গ্রুপের নাম (যেমন: বিজ্ঞান, মানবিক, বাণিজ্য)'],
      ['জন্ম তারিখ - MM/DD/YYYY ফরম্যাটে'],
      ['লিঙ্গ - পুরুষ/মহিলা'],
      ['ঠিকানা - পূর্ণ ঠিকানা'],
      ['অভিভাবকের নাম - অভিভাবকের পূর্ণ নাম'],
      ['অভিভাবকের ফোন - অভিভাবকের ফোন নম্বর'],
      ['পিতার নাম - পিতার পূর্ণ নাম'],
      ['পিতার ফোন - পিতার ফোন নম্বর'],
      ['পিতার পেশা - পিতার পেশা'],
      ['মাতার নাম - মাতার পূর্ণ নাম'],
      ['মাতার ফোন - মাতার ফোন নম্বর'],
      ['মাতার পেশা - মাতার পেশা'],
      ['জরুরী যোগাযোগ - জরুরী ফোন নম্বর'],
      ['জরুরী সম্পর্ক - জরুরী যোগাযোগের সাথে সম্পর্ক'],
      ['পূর্ববর্তী স্কুল - পূর্ববর্তী স্কুলের নাম'],
      ['পূর্ববর্তী ক্লাস - পূর্ববর্তী ক্লাস'],
      ['স্কুল পরিবর্তনের কারণ - স্কুল পরিবর্তনের কারণ'],
      ['পূর্ববর্তী GPA - পূর্ববর্তী GPA'],
      ['প্রোফাইল ছবি - ছবির URL (ঐচ্ছিক)'],
      ['অনুমোদিত - true/false (সাধারণত true)'],
      ['সক্রিয় - true/false (সাধারণত true)'],
      [''],
      ['নমুনা ডেটা:'],
      ['নুসরাত জাহান মায়া - পঞ্চম ক বিজ্ঞান'],
      ['মোহাম্মদ রফি হাসান - ষষ্ঠ খ মানবিক'],
      ['ফাতেমা আক্তার - সপ্তম ক বিজ্ঞান'],
      [''],
      ['মহুত্বপূর্ণ নোট:'],
      ['- নাম, ফোন নম্বর, ক্লাস, অভিভাবকের নাম - এই ক্ষেত্রগুলো আবশ্যক'],
      ['- অন্যান্য ক্ষেত্রগুলো ঐচ্ছিক'],
      ['- তারিখ MM/DD/YYYY ফরম্যাটে লিখুন'],
      ['- true/false মানগুলো ছোট হাতের অক্ষরে লিখুন'],
      ['- ছবির URL দেওয়ার সময় সঠিক লিংক দিন'],
      ['- ক্লাসের নাম বাংলায় লিখুন (পঞ্চম, ষষ্ঠ, সপ্তম ইত্যাদি)'],
      ['- বিভাগের নাম বাংলায় লিখুন (ক, খ, গ ইত্যাদি)'],
      ['- গ্রুপের নাম বাংলায় লিখুন (বিজ্ঞান, মানবিক, বাণিজ্য)'],
      ['- পেশার নাম বাংলায় লিখুন (শিক্ষক, ডাক্তার, ইঞ্জিনিয়ার ইত্যাদি)'],
      ['- সম্পর্কের নাম বাংলায় লিখুন (পিতা, মাতা, চাচা, মামা ইত্যাদি)']
    ];

    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsWs['!cols'] = [{ wch: 50 }];

    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'শিক্ষার্থী ডেটা');
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'নির্দেশাবলী');

    // Save file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Error generating template:', error);
    throw new Error('Template generation failed');
  }
};

// Parse uploaded Excel file
export const parseStudentImportFile = (file: File): Promise<StudentImportTemplate[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate and clean data
        const cleanedData = jsonData.map((row: any, index: number) => {
          // Clean and validate each field
          return {
            name: String(row.name || '').trim(),
            studentId: String(row.studentId || '').trim(),
            rollNumber: String(row.rollNumber || '').trim(),
            registrationNumber: String(row.registrationNumber || '').trim(),
            email: String(row.email || '').trim(),
            phoneNumber: String(row.phoneNumber || '').trim(),
            class: String(row.class || '').trim(),
            section: String(row.section || '').trim(),
            group: String(row.group || '').trim(),
            dateOfBirth: String(row.dateOfBirth || '').trim(),
            gender: String(row.gender || '').trim(),
            address: String(row.address || '').trim(),
            guardianName: String(row.guardianName || '').trim(),
            guardianPhone: String(row.guardianPhone || '').trim(),
            fatherName: String(row.fatherName || '').trim(),
            fatherPhone: String(row.fatherPhone || '').trim(),
            fatherOccupation: String(row.fatherOccupation || '').trim(),
            motherName: String(row.motherName || '').trim(),
            motherPhone: String(row.motherPhone || '').trim(),
            motherOccupation: String(row.motherOccupation || '').trim(),
            emergencyContact: String(row.emergencyContact || '').trim(),
            emergencyRelation: String(row.emergencyRelation || '').trim(),
            previousSchool: String(row.previousSchool || '').trim(),
            previousClass: String(row.previousClass || '').trim(),
            reasonForLeaving: String(row.reasonForLeaving || '').trim(),
            previousGPA: String(row.previousGPA || '').trim(),
            profileImage: String(row.profileImage || '').trim(),
            isApproved: String(row.isApproved || 'true').toLowerCase(),
            isActive: String(row.isActive || 'true').toLowerCase()
          };
        });

        resolve(cleanedData);
      } catch (error) {
        console.error('Error parsing file:', error);
        reject(new Error('File parsing failed'));
      }
    };

    reader.onerror = () => {
      reject(new Error('File reading failed'));
    };

    reader.readAsArrayBuffer(file);
  });
};

// Validate student data
export const validateStudentData = (data: StudentImportTemplate[]): { valid: StudentImportTemplate[], errors: string[] } => {
  const valid: StudentImportTemplate[] = [];
  const errors: string[] = [];

  data.forEach((student, index) => {
    const rowErrors: string[] = [];
    const rowNumber = index + 2; // +2 because Excel starts from row 1 and we have header

    // Required fields validation
    if (!student.name.trim()) {
      rowErrors.push(`Row ${rowNumber}: Name is required`);
    }
    if (!student.phoneNumber.trim()) {
      rowErrors.push(`Row ${rowNumber}: Phone number is required`);
    }
    if (!student.class.trim()) {
      rowErrors.push(`Row ${rowNumber}: Class is required`);
    }
    if (!student.guardianName.trim()) {
      rowErrors.push(`Row ${rowNumber}: Guardian name is required`);
    }

    // Email validation
    if (student.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
      rowErrors.push(`Row ${rowNumber}: Invalid email format`);
    }

    // Phone validation
    if (student.phoneNumber && !/^[0-9+\-\s()]+$/.test(student.phoneNumber)) {
      rowErrors.push(`Row ${rowNumber}: Invalid phone number format`);
    }

    // Date validation
    if (student.dateOfBirth && !/^\d{2}\/\d{2}\/\d{4}$/.test(student.dateOfBirth)) {
      rowErrors.push(`Row ${rowNumber}: Date must be in MM/DD/YYYY format`);
    }

    // Boolean validation
    if (student.isApproved && !['true', 'false'].includes(student.isApproved)) {
      rowErrors.push(`Row ${rowNumber}: isApproved must be true or false`);
    }
    if (student.isActive && !['true', 'false'].includes(student.isActive)) {
      rowErrors.push(`Row ${rowNumber}: isActive must be true or false`);
    }

    if (rowErrors.length === 0) {
      valid.push(student);
    } else {
      errors.push(...rowErrors);
    }
  });

  return { valid, errors };
};
