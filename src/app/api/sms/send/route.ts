import { NextRequest, NextResponse } from 'next/server';
import { getSMSConfigFromSettings, sendBulkSMS, formatPhoneNumber } from '@/lib/sms-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumbers, message } = body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Phone numbers are required' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get SMS configuration from settings
    const smsConfig = await getSMSConfigFromSettings();
    
    if (!smsConfig || !smsConfig.apiKey) {
      return NextResponse.json(
        { success: false, error: 'SMS API কনফিগার করা নেই। অনুগ্রহ করে সেটিংস পেজে SMS Gateway কনফিগার করুন।' },
        { status: 400 }
      );
    }

    // Format phone numbers
    const formattedNumbers = phoneNumbers
      .filter(Boolean)
      .map(phone => formatPhoneNumber(phone));

    if (formattedNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Valid phone numbers are required' },
        { status: 400 }
      );
    }

    // Send SMS via server (server IP will be used)
    const smsResults = await sendBulkSMS(formattedNumbers, message, smsConfig);

    return NextResponse.json({
      success: true,
      results: smsResults,
    });
  } catch (error: any) {
    console.error('SMS API route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'SMS পাঠানো যায়নি' },
      { status: 500 }
    );
  }
}

