import { sendNotification, isNotificationEnabled } from './notification-helper';
import { SCHOOL_ID } from './constants';
import { studentQueries, settingsQueries } from './database-queries';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { sendSMS, getSMSConfigFromSettings } from './sms-api';

/**
 * Get parent user IDs for a student based on phone/email
 */
async function getParentUserIds(studentId: string): Promise<string[]> {
  try {
    // Get student data
    const student = await studentQueries.getStudentById(studentId);
    if (!student) {
      console.error('Student not found:', studentId);
      return [];
    }

    const parentPhone = (student as any).guardianPhone || (student as any).fatherPhone || (student as any).motherPhone || '';
    const parentEmail = (student as any).parentEmail || (student as any).guardianEmail || '';

    if (!parentPhone && !parentEmail) {
      console.log('No parent phone or email found for student:', studentId);
      return [];
    }

    // Get all users with role 'parent' from Firestore
    const usersRef = collection(db, 'users');
    const parentUsersQuery = query(usersRef, where('role', '==', 'parent'));
    const parentUsersSnapshot = await getDocs(parentUsersQuery);
    const parentUsers = parentUsersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    // Find parent users by phone or email
    const matchingParents = parentUsers.filter(parent => {
      const parentPhoneMatch = parentPhone && (
        parent.phoneNumber === parentPhone ||
        parent.phone === parentPhone ||
        (parent as any).guardianPhone === parentPhone
      );
      const parentEmailMatch = parentEmail && (
        parent.email === parentEmail ||
        (parent as any).parentEmail === parentEmail
      );
      return parentPhoneMatch || parentEmailMatch;
    });

    return matchingParents.map(p => p.uid).filter(Boolean);
  } catch (error) {
    console.error('Error getting parent user IDs:', error);
    return [];
  }
}

/**
 * Create a fee payment message/notification for parents
 */
export interface FeePaymentNotification {
  studentId: string;
  studentName: string;
  feeType: string; // 'admission_fee' | 'session_fee' | 'exam_fee' | 'tuition_fee' | 'registration_fee'
  feeName: string; // Bengali name
  amount: number;
  paymentDate: string;
  voucherNumber?: string;
  paymentMethod?: string;
  collectedBy?: string;
  transactionId?: string;
  className?: string;
  month?: string; // For monthly fees
}

/**
 * Check if fee payment notification is enabled in settings (any channel)
 */
async function isFeePaymentNotificationEnabled(): Promise<{ push: boolean; sms: boolean; email: boolean }> {
  try {
    const pushEnabled = await isNotificationEnabled('fee_payment_confirmation', 'push');
    const smsEnabled = await isNotificationEnabled('fee_payment_confirmation', 'sms');
    const emailEnabled = await isNotificationEnabled('fee_payment_confirmation', 'email');
    
    return { push: pushEnabled, sms: smsEnabled, email: emailEnabled };
  } catch (error) {
    console.error('Error checking fee payment notification settings:', error);
    return { push: false, sms: false, email: false }; // Default to disabled on error
  }
}

/**
 * Send fee payment notification to parents
 */
export async function sendFeePaymentNotification(
  feePayment: FeePaymentNotification
): Promise<void> {
  try {
    // Check if fee payment notifications are enabled in settings
    const notificationSettings = await isFeePaymentNotificationEnabled();
    
    // Get parent user IDs for this student (always get parent IDs, even if notifications are disabled)
    // This ensures messages are created for dashboard display
    const parentUserIds = await getParentUserIds(feePayment.studentId);
    
    if (parentUserIds.length === 0) {
      console.log('No parent users found for student:', feePayment.studentId);
      return;
    }
    
    // If all channels are disabled, skip notifications but still create message for dashboard
    const allChannelsDisabled = !notificationSettings.push && !notificationSettings.sms && !notificationSettings.email;
    if (allChannelsDisabled) {
      console.log('Fee payment notifications are disabled in settings for all channels. Skipping notifications but creating message for dashboard.');
    }

    // Get student data to access parent phone number
    const student = await studentQueries.getStudentById(feePayment.studentId);
    const parentPhone = student ? ((student as any).guardianPhone || (student as any).fatherPhone || (student as any).motherPhone || '') : '';

    // Format amount in Bengali numerals
    const formatAmount = (amount: number): string => {
      const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const formatted = Math.round(amount).toLocaleString('en-US');
      return formatted.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
    };

    // Create notification title and message
    const title = `ফি পেমেন্ট কনফার্মেশন`;
    const monthText = feePayment.month ? ` (${feePayment.month})` : '';
    const message = `${feePayment.studentName} (${feePayment.className || ''}) এর ${feePayment.feeName}${monthText} - ৳${formatAmount(feePayment.amount)} সফলভাবে সংগ্রহ করা হয়েছে।${feePayment.voucherNumber ? ` ভাউচার নম্বর: ${feePayment.voucherNumber}` : ''}${feePayment.paymentDate ? ` তারিখ: ${new Date(feePayment.paymentDate).toLocaleDateString('bn-BD')}` : ''}`;

    // Create SMS message (shorter format for SMS)
    const smsMessage = `${feePayment.studentName} এর ${feePayment.feeName}${monthText} - ৳${formatAmount(feePayment.amount)} সংগ্রহ হয়েছে।${feePayment.voucherNumber ? ` ভাউচার: ${feePayment.voucherNumber}` : ''}`;

    // Get SMS config
    const smsConfig = await getSMSConfigFromSettings();

    // Send notification to each parent
    for (const parentUserId of parentUserIds) {
      try {
        // Send in-app push notification (if enabled)
        if (notificationSettings.push) {
          await sendNotification({
            userId: parentUserId,
            schoolId: SCHOOL_ID,
            title,
            message,
            type: 'fee_payment_confirmation',
            notificationType: 'announcement'
          });
        }

        // Send SMS notification (if enabled and phone number available)
        if (notificationSettings.sms && parentPhone && smsConfig) {
          try {
            const smsResult = await sendSMS(parentPhone, smsMessage, smsConfig);
            if (smsResult.success) {
              console.log(`✅ SMS sent to parent ${parentUserId} at ${parentPhone}`);
            } else {
              console.error(`❌ Failed to send SMS to ${parentPhone}:`, smsResult.error);
            }
          } catch (smsError) {
            console.error(`Error sending SMS to ${parentPhone}:`, smsError);
          }
        }

        // Create a message in the messages collection (ALWAYS create for dashboard display, regardless of notification settings)
        // This ensures parents can see fee payment history even if notifications are disabled
        await addDoc(collection(db, 'parentMessages'), {
          parentUserId,
          studentId: feePayment.studentId,
          studentName: feePayment.studentName,
          type: 'fee_payment',
          feeType: feePayment.feeType,
          feeName: feePayment.feeName,
          amount: feePayment.amount,
          paymentDate: feePayment.paymentDate,
          voucherNumber: feePayment.voucherNumber || '',
          paymentMethod: feePayment.paymentMethod || '',
          collectedBy: feePayment.collectedBy || '',
          transactionId: feePayment.transactionId || '',
          className: feePayment.className || '',
          month: feePayment.month || '',
          isRead: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          schoolId: SCHOOL_ID
        });
        
        console.log(`✅ Fee payment message created in parentMessages collection for parent: ${parentUserId}`);

        console.log(`✅ Fee payment notification sent to parent: ${parentUserId} (push: ${notificationSettings.push}, sms: ${notificationSettings.sms}, email: ${notificationSettings.email})`);
      } catch (error) {
        console.error(`Error sending notification to parent ${parentUserId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sending fee payment notification:', error);
  }
}

/**
 * Get messages for a parent
 */
export async function getParentMessages(parentUserId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'parentMessages'),
      where('parentUserId', '==', parentUserId),
      where('schoolId', '==', SCHOOL_ID)
    );

    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by createdAt (newest first)
    messages.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA;
    });

    return messages;
  } catch (error) {
    console.error('Error getting parent messages:', error);
    return [];
  }
}

/**
 * Get unread message count for a parent
 */
export async function getUnreadMessageCount(parentUserId: string): Promise<number> {
  try {
    const messages = await getParentMessages(parentUserId);
    return messages.filter(msg => !msg.isRead).length;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const messageRef = doc(db, 'parentMessages', messageId);
    await updateDoc(messageRef, {
      isRead: true,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
}

