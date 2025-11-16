// SMS API Integration
// This file handles SMS sending via external API

import { settingsQueries } from './database-queries';

export interface SMSConfig {
  apiKey?: string;
  apiUrl?: string;
  senderId?: string;
  provider?: 'bulksmsbd' | 'twilio' | 'nexmo' | 'textlocal' | 'msg91' | 'custom';
  customProvider?: string;
}

/**
 * Get SMS configuration from Firebase settings
 * @returns SMSConfig with provider settings from integrations
 */
export async function getSMSConfigFromSettings(): Promise<SMSConfig | null> {
  try {
    const settings = await settingsQueries.getSettings();
    if (!settings || !(settings as any).integrations) {
      return null;
    }

    const integrations = (settings as any).integrations;
    const smsIntegration = integrations.find((i: any) => i.id === 'sms-gateway' && i.status === 'connected');
    
    if (!smsIntegration || !smsIntegration.config) {
      return null;
    }

    const config = smsIntegration.config;
    return {
      apiKey: config.apiKey || '',
      senderId: config.senderId || '',
      provider: config.provider || 'bulksmsbd',
      customProvider: config.customProvider || '',
      apiUrl: config.provider === 'bulksmsbd' ? 'http://bulksmsbd.net/api/smsapi' : config.apiUrl
    };
  } catch (error) {
    console.error('Error loading SMS config from settings:', error);
    return null;
  }
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

/**
 * Send SMS via API
 * @param phoneNumber Recipient phone number (with country code, e.g., +8801712345678)
 * @param message SMS message text
 * @param config SMS API configuration (optional, can be from environment variables)
 * @returns SMSResponse with success status and details
 */
export async function sendSMS(
  phoneNumber: string,
  message: string,
  config?: SMSConfig
): Promise<SMSResponse> {
  try {
    // Get SMS configuration from environment or config parameter
    const smsConfig: SMSConfig = {
      apiKey: config?.apiKey || process.env.NEXT_PUBLIC_SMS_API_KEY,
      apiUrl: config?.apiUrl || process.env.NEXT_PUBLIC_SMS_API_URL,
      senderId: config?.senderId || process.env.NEXT_PUBLIC_SMS_SENDER_ID || 'IQRASCHOOL',
      provider: config?.provider || (process.env.NEXT_PUBLIC_SMS_PROVIDER as any) || 'bulksmsbd',
      customProvider: config?.customProvider,
    };

    // If no API key is configured, return error
    if (!smsConfig.apiKey) {
      return {
        success: false,
        error: 'SMS API কনফিগার করা নেই। সেটিংস পেজে API key যোগ করুন।',
      };
    }

    // Format phone number - remove + if present, BulkSMS BD expects number without +
    let formattedNumber = phoneNumber.replace(/[^\d]/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '880' + formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('880')) {
      formattedNumber = '880' + formattedNumber;
    }

    // BulkSMS BD API Integration
    if (smsConfig.provider === 'bulksmsbd') {
      if (!smsConfig.senderId) {
        return {
          success: false,
          error: 'Sender ID কনফিগার করা নেই। সেটিংস পেজে Sender ID যোগ করুন।',
        };
      }

      // Format sender ID - should be with country code (e.g., 8809648904800)
      let senderId = smsConfig.senderId.replace(/[^\d]/g, '');
      if (!senderId.startsWith('880')) {
        senderId = '880' + senderId;
      }

      // BulkSMS BD API endpoint
      const apiUrl = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(smsConfig.apiKey)}&type=text&number=${formattedNumber}&senderid=${senderId}&message=${encodeURIComponent(message)}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
      });

      const data = await response.json().catch(async () => {
        // If JSON parse fails, try to get text response
        const text = await response.text().catch(() => '');
        return { error_message: text || 'Unknown error' };
      });

      // Check BulkSMS BD response
      if (data.response_code === 200 || data.success_message) {
        return {
          success: true,
          messageId: data.message_id || data.id || 'unknown',
          cost: data.cost || 0,
        };
      } else {
        // Handle error response
        const errorMsg = data.error_message || `Response code: ${data.response_code}`;
        
        // Check for IP whitelist error
        if (data.response_code === 1032 || errorMsg.includes('not Whitelisted')) {
          return {
            success: false,
            error: 'আপনার IP address BulkSMS BD dashboard-এ whitelist করা নেই। অনুগ্রহ করে IP address whitelist করুন।',
          };
        }

        return {
          success: false,
          error: errorMsg || 'SMS পাঠানো যায়নি।',
        };
      }
    }

    // Generic SMS API (for other providers)
    // Validate phone number format (should start with +)
    if (!phoneNumber.startsWith('+')) {
      return {
        success: false,
        error: 'ফোন নম্বরটি দেশের কোড সহ শুরু করতে হবে (যেমন: +8801712345678)',
      };
    }

    // Generic API call for other providers
    const apiUrl = smsConfig.apiUrl || 'https://api.example-sms.com/send';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${smsConfig.apiKey}`,
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        sender: smsConfig.senderId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `SMS API error: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.messageId || data.id || 'unknown',
      cost: data.cost || 0,
    };
  } catch (error: any) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error.message || 'SMS পাঠানো যায়নি। দয়া করে আবার চেষ্টা করুন।',
    };
  }
}

/**
 * Send bulk SMS
 * @param phoneNumbers Array of phone numbers
 * @param message SMS message text
 * @param config SMS API configuration
 * @returns Array of SMSResponse for each recipient
 */
export async function sendBulkSMS(
  phoneNumbers: string[],
  message: string,
  config?: SMSConfig
): Promise<SMSResponse[]> {
  const results: SMSResponse[] = [];

  // Send SMS to each recipient
  for (const phoneNumber of phoneNumbers) {
    const result = await sendSMS(phoneNumber, message, config);
    results.push(result);
    
    // Add small delay between requests to avoid rate limiting
    if (phoneNumbers.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Format phone number to international format
 * @param phone Phone number (can be local or international format)
 * @param countryCode Default country code (e.g., '880' for Bangladesh)
 * @returns Formatted phone number with + prefix
 */
export function formatPhoneNumber(phone: string, countryCode: string = '880'): string {
  if (!phone) return '';
  
  // Remove all spaces, dashes, and other non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If already has +, return as is (assuming it's already international)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If starts with 0, replace with country code
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Add country code if not present
  if (!cleaned.startsWith(countryCode)) {
    cleaned = countryCode + cleaned;
  }
  
  return '+' + cleaned;
}

/**
 * Get SMS template from settings and replace variables
 * @param templateId Template ID to fetch
 * @param variables Object with variable values to replace
 * @returns Formatted SMS message with variables replaced
 */
export async function getSMSTemplate(
  templateId: string,
  variables: Record<string, string>
): Promise<string | null> {
  try {
    const settings = await settingsQueries.getSettings();
    if (!settings || !(settings as any).smsTemplates) {
      return null;
    }

    const templates = (settings as any).smsTemplates;
    const template = templates.find((t: any) => t.id === templateId);
    
    if (!template) {
      return null;
    }

    // Replace all variables in the template message
    let message = template.message;
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), variables[key]);
    });

    return message;
  } catch (error) {
    console.error('Error loading SMS template:', error);
    return null;
  }
}

