import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export class QRUtils {
  /**
   * Generate a unique QR code for a student
   * @param studentId - The student's ID
   * @param schoolId - The school's ID
   * @param rollNumber - The student's roll number
   * @returns Promise<string> - Base64 encoded QR code image
   */
  static async generateStudentQR(
    studentId: string,
    schoolId: string,
    rollNumber: string
  ): Promise<{ qrCode: string; qrData: string }> {
    try {
      // School name mapping
      const schoolName = schoolId === '102330' ? 'ইকরা নূরানী একাডেমি' : 'Unknown School';
      
      // Create unique QR data with timestamp to prevent duplication
      const qrData = JSON.stringify({
        type: 'student_attendance',
        studentId,
        schoolId,
        schoolName,
        rollNumber,
        timestamp: Date.now(),
        uuid: uuidv4()
      });

      // Generate QR code as base64 data URL
      const qrCode = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return { qrCode, qrData };
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Generate QR code as SVG string
   * @param data - Data to encode in QR code
   * @returns Promise<string> - SVG string
   */
  static async generateQRSVG(data: string): Promise<string> {
    try {
      return await QRCode.toString(data, {
        type: 'svg',
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      throw new Error(`Failed to generate QR SVG: ${error}`);
    }
  }

  /**
   * Parse QR code data
   * @param qrData - The scanned QR code data
   * @returns Parsed QR data object or null if invalid
   */
  static parseQRData(qrData: string): {
    type: string;
    studentId: string;
    schoolId: string;
    rollNumber: string;
    timestamp: number;
    uuid: string;
  } | null {
    try {
      const data = JSON.parse(qrData);
      
      // Validate required fields
      if (
        data.type === 'student_attendance' &&
        data.studentId &&
        data.schoolId &&
        data.rollNumber &&
        data.timestamp &&
        data.uuid
      ) {
        return data;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate if QR code is for student attendance
   * @param qrData - The scanned QR code data
   * @returns boolean
   */
  static isValidStudentQR(qrData: string): boolean {
    const parsed = this.parseQRData(qrData);
    return parsed !== null && parsed.type === 'student_attendance';
  }

  /**
   * Parse teacher QR code data
   * @param qrData - The scanned QR code data
   * @returns Parsed teacher QR data object or null if invalid
   */
  static parseTeacherQR(qrData: string): {
    type: string;
    teacherId: string;
    schoolId: string;
    schoolName: string;
    subject?: string;
    timestamp: number;
    uuid: string;
  } | null {
    try {
      const data = JSON.parse(qrData);
      
      // Validate required fields for teacher attendance QR
      if (
        data.type === 'teacher_attendance' &&
        data.teacherId &&
        data.schoolId &&
        data.schoolName &&
        data.timestamp &&
        data.uuid
      ) {
        return data;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate if QR code is for teacher attendance
   * @param qrData - The scanned QR code data
   * @returns boolean
   */
  static isValidTeacherQR(qrData: string): boolean {
    const parsed = this.parseTeacherQR(qrData);
    return parsed !== null && parsed.type === 'teacher_attendance';
  }

  /**
   * Generate a batch of QR codes for multiple students
   * @param students - Array of student data
   * @returns Promise<Array<{ studentId: string; qrCode: string; qrData: string }>>
   */
  static async generateBatchQRCodes(
    students: Array<{ id: string; schoolId: string; rollNumber: string }>
  ): Promise<Array<{ studentId: string; qrCode: string; qrData: string }>> {
    const results = [];
    
    for (const student of students) {
      try {
        const { qrCode, qrData } = await this.generateStudentQR(
          student.id,
          student.schoolId,
          student.rollNumber
        );
        
        results.push({
          studentId: student.id,
          qrCode,
          qrData
        });
      } catch (error) {
        console.error(`Failed to generate QR for student ${student.id}:`, error);
        // Continue with other students
      }
    }
    
    return results;
  }

  /**
   * Generate attendance session QR code for teachers
   * @param sessionId - Attendance session ID
   * @param classId - Class ID
   * @param teacherId - Teacher ID
   * @returns Promise<{ qrCode: string; qrData: string }>
   */
  static async generateSessionQR(
    sessionId: string,
    classId: string,
    teacherId: string
  ): Promise<{ qrCode: string; qrData: string }> {
    try {
      const qrData = JSON.stringify({
        type: 'attendance_session',
        sessionId,
        classId,
        teacherId,
        timestamp: Date.now(),
        uuid: uuidv4()
      });

      const qrCode = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return { qrCode, qrData };
    } catch (error) {
      throw new Error(`Failed to generate session QR code: ${error}`);
    }
  }

  /**
   * Parse attendance session QR data
   * @param qrData - The scanned QR code data
   * @returns Parsed session QR data or null if invalid
   */
  static parseSessionQRData(qrData: string): {
    type: string;
    sessionId: string;
    classId: string;
    teacherId: string;
    timestamp: number;
    uuid: string;
  } | null {
    try {
      const data = JSON.parse(qrData);
      
      if (
        data.type === 'attendance_session' &&
        data.sessionId &&
        data.classId &&
        data.teacherId &&
        data.timestamp &&
        data.uuid
      ) {
        return data;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate QR code for school identification
   * @param schoolId - School ID
   * @param schoolName - School name
   * @returns Promise<{ qrCode: string; qrData: string }>
   */
  static async generateSchoolQR(
    schoolId: string,
    schoolName: string
  ): Promise<{ qrCode: string; qrData: string }> {
    try {
      const qrData = JSON.stringify({
        type: 'school_identification',
        schoolId,
        schoolName,
        timestamp: Date.now(),
        uuid: uuidv4()
      });

      const qrCode = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return { qrCode, qrData };
    } catch (error) {
      throw new Error(`Failed to generate school QR code: ${error}`);
    }
  }

  /**
   * Generate QR code for teacher attendance
   * @param teacherId - The teacher's ID
   * @param schoolId - The school's ID
   * @param schoolName - The school's name
   * @param subject - The teacher's subject (optional)
   * @returns Promise<{ qrCode: string; qrData: string }>
   */
  static async generateTeacherQR(
    teacherId: string,
    schoolId: string,
    schoolName: string,
    subject?: string
  ): Promise<{ qrCode: string; qrData: string }> {
    try {
      // Create unique QR data with timestamp to prevent duplication
      const qrData = JSON.stringify({
        type: 'teacher_attendance',
        teacherId,
        schoolId,
        schoolName,
        subject: subject || 'Teacher',
        timestamp: Date.now(),
        uuid: uuidv4()
      });

      // Generate QR code as base64 data URL
      const qrCode = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return { qrCode, qrData };
    } catch (error) {
      throw new Error(`Failed to generate teacher QR code: ${error}`);
    }
  }
}