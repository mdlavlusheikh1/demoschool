import { NotificationService } from './database';
import { settingsQueries, SystemSettings } from './database-queries';
import { SCHOOL_ID } from './constants';
import { Timestamp } from 'firebase/firestore';

export type NotificationType = 
  | 'student_registration'
  | 'payment_reminder'
  | 'attendance_report'
  | 'system_alert'
  | 'exam_schedule'
  | 'exam_results'
  | 'homework_assignment'
  | 'homework_reminder'
  | 'class_announcement'
  | 'notice_notification'
  | 'event_reminder'
  | 'message_notification'
  | 'complaint_response'
  | 'fee_payment_confirmation'
  | 'admission_confirmation'
  | 'teacher_assignment'
  | 'class_schedule';

interface SendNotificationOptions {
  userId: string;
  schoolId: string;
  title: string;
  message: string;
  type: NotificationType;
  notificationType?: 'attendance' | 'announcement' | 'alert';
}

/**
 * Check if a notification type is enabled in settings
 */
export async function isNotificationEnabled(
  type: NotificationType,
  channel: 'email' | 'push' | 'sms'
): Promise<boolean> {
  try {
    const settings = await settingsQueries.getSettings();
    if (!settings) return false; // Default to disabled if settings not found

    // Map notification types to settings keys
    const settingsMap: Record<NotificationType, { email: string; push: string; sms: string }> = {
      student_registration: { email: 'studentRegistrationEmail', push: 'studentRegistrationPush', sms: 'studentRegistrationSMS' },
      payment_reminder: { email: 'paymentReminderEmail', push: 'paymentReminderPush', sms: 'paymentReminderSMS' },
      attendance_report: { email: 'attendanceReportEmail', push: 'attendanceReportPush', sms: 'attendanceReportSMS' },
      system_alert: { email: 'systemAlertEmail', push: 'systemAlertPush', sms: 'systemAlertSMS' },
      exam_schedule: { email: 'examScheduleEmail', push: 'examSchedulePush', sms: 'examScheduleSMS' },
      exam_results: { email: 'examResultsEmail', push: 'examResultsPush', sms: 'examResultsSMS' },
      homework_assignment: { email: 'homeworkAssignmentEmail', push: 'homeworkAssignmentPush', sms: 'homeworkAssignmentSMS' },
      homework_reminder: { email: 'homeworkReminderEmail', push: 'homeworkReminderPush', sms: 'homeworkReminderSMS' },
      class_announcement: { email: 'classAnnouncementEmail', push: 'classAnnouncementPush', sms: 'classAnnouncementSMS' },
      notice_notification: { email: 'noticeNotificationEmail', push: 'noticeNotificationPush', sms: 'noticeNotificationSMS' },
      event_reminder: { email: 'eventReminderEmail', push: 'eventReminderPush', sms: 'eventReminderSMS' },
      message_notification: { email: 'messageNotificationEmail', push: 'messageNotificationPush', sms: 'messageNotificationSMS' },
      complaint_response: { email: 'complaintResponseEmail', push: 'complaintResponsePush', sms: 'complaintResponseSMS' },
      fee_payment_confirmation: { email: 'feePaymentConfirmationEmail', push: 'feePaymentConfirmationPush', sms: 'feePaymentConfirmationSMS' },
      admission_confirmation: { email: 'admissionConfirmationEmail', push: 'admissionConfirmationPush', sms: 'admissionConfirmationSMS' },
      teacher_assignment: { email: 'teacherAssignmentEmail', push: 'teacherAssignmentPush', sms: 'teacherAssignmentSMS' },
      class_schedule: { email: 'classScheduleEmail', push: 'classSchedulePush', sms: 'classScheduleSMS' },
    };

    const settingKey = settingsMap[type]?.[channel];
    if (!settingKey) return false; // Default to disabled if type not found

    // Only return true if the setting is explicitly set to true
    const settingValue = (settings as any)[settingKey];
    return settingValue === true; // Only enabled if explicitly true
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return false; // Default to disabled on error
  }
}

/**
 * Send notification to a user
 * Checks settings before sending
 */
export async function sendNotification(options: SendNotificationOptions): Promise<boolean> {
  try {
    const { userId, schoolId, title, message, type, notificationType = 'announcement' } = options;

    // Check if push notification is enabled in settings
    const pushEnabled = await isNotificationEnabled(type, 'push');
    
    // Only send notification if explicitly enabled in settings
    if (!pushEnabled) {
      console.log(`Notification type "${type}" (push) is disabled in settings. Skipping notification.`);
      return false;
    }
    
    // Create in-app notification
    const notificationData = {
      userId,
      schoolId: schoolId || SCHOOL_ID,
      title,
      message,
      type: notificationType,
      isRead: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const result = await NotificationService.createNotification(notificationData);
    
    if (!result.success) {
      console.error('Failed to create notification:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

/**
 * Send notifications to multiple users
 */
export async function sendBulkNotifications(
  userIds: string[],
  options: Omit<SendNotificationOptions, 'userId'>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const userId of userIds) {
    const result = await sendNotification({ ...options, userId });
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Send notification to users by role
 */
export async function sendNotificationToRole(
  role: 'student' | 'teacher' | 'parent' | 'admin',
  options: Omit<SendNotificationOptions, 'userId' | 'schoolId'>
): Promise<{ success: number; failed: number }> {
  try {
    // This would need to fetch users by role from database
    // For now, return placeholder
    console.warn('sendNotificationToRole: Not implemented yet. Need to fetch users by role.');
    return { success: 0, failed: 0 };
  } catch (error) {
    console.error('Error sending notification to role:', error);
    return { success: 0, failed: 0 };
  }
}

