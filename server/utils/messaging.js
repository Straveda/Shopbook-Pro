// FILE: utils/messaging.js
// WhatsApp and SMS integration helper functions

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const SMS_API_URL = process.env.SMS_API_URL || 'https://api.twilio.com/2010-04-01';
const SMS_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const SMS_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SMS_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

// Alternative: India-specific SMS providers
const MSG91_API_KEY = process.env.MSG91_API_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;

/**
 * Send WhatsApp message using Meta WhatsApp Business API
 * @param {string} to - Recipient phone number (with country code, e.g., 919876543210)
 * @param {string} message - Message text
 * @returns {Promise<object>} Response from WhatsApp API
 */
export async function sendWhatsAppMessage(to, message) {
  try {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('⚠️ WhatsApp credentials not configured');
      return { success: false, error: 'WhatsApp not configured' };
    }

    // Format phone number (remove any spaces, dashes, or +)
    const formattedPhone = to.replace(/[\s\-+]/g, '');
    
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp message sent:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ WhatsApp error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS using Twilio
 * @param {string} to - Recipient phone number (with country code)
 * @param {string} message - Message text
 * @returns {Promise<object>} Response from Twilio API
 */
export async function sendSMSTwilio(to, message) {
  try {
    if (!SMS_ACCOUNT_SID || !SMS_AUTH_TOKEN || !SMS_FROM_NUMBER) {
      console.warn('⚠️ Twilio credentials not configured');
      return { success: false, error: 'Twilio not configured' };
    }

    const formattedPhone = to.startsWith('+') ? to : `+${to}`;
    
    const response = await axios.post(
      `${SMS_API_URL}/Accounts/${SMS_ACCOUNT_SID}/Messages.json`,
      new URLSearchParams({
        To: formattedPhone,
        From: SMS_FROM_NUMBER,
        Body: message
      }),
      {
        auth: {
          username: SMS_ACCOUNT_SID,
          password: SMS_AUTH_TOKEN
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ SMS sent (Twilio):', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Twilio error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS using MSG91 (India-specific provider)
 * @param {string} to - Recipient phone number (10 digits for India)
 * @param {string} message - Message text
 * @returns {Promise<object>} Response from MSG91 API
 */
export async function sendSMSMsg91(to, message) {
  try {
    if (!MSG91_API_KEY || !MSG91_SENDER_ID) {
      console.warn('⚠️ MSG91 credentials not configured');
      return { success: false, error: 'MSG91 not configured' };
    }

    // Remove country code if present (MSG91 expects 10 digits for India)
    const phoneNumber = to.replace(/^(\+91|91)/, '');
    
    const response = await axios.post(
      'https://api.msg91.com/api/v5/flow/',
      {
        sender: MSG91_SENDER_ID,
        mobiles: phoneNumber,
        message: message,
        route: '4', // Transactional route
      },
      {
        headers: {
          'authkey': MSG91_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SMS sent (MSG91):', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ MSG91 error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main function to send reminder (automatically chooses channel)
 * @param {string} channel - 'whatsapp' or 'sms'
 * @param {string} to - Recipient phone number
 * @param {string} message - Message text
 * @returns {Promise<object>} Response
 */
export async function sendReminder(channel, to, message) {
  console.log(`📱 Sending ${channel} reminder to ${to}`);
  
  if (channel === 'whatsapp') {
    return await sendWhatsAppMessage(to, message);
  } else if (channel === 'sms') {
    // Try MSG91 first (better for India), fallback to Twilio
    const result = await sendSMSMsg91(to, message);
    if (!result.success) {
      console.log('📱 Trying Twilio as fallback...');
      return await sendSMSTwilio(to, message);
    }
    return result;
  } else {
    return { success: false, error: 'Invalid channel' };
  }
}

/**
 * Format phone number for Indian users
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number with country code
 */
export function formatPhoneNumber(phone) {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it's 10 digits, assume it's Indian number and add country code
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  // Remove leading + if present
  cleaned = cleaned.replace(/^\+/, '');
  
  return cleaned;
}

/**
 * Validate phone number
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid
 */
export function isValidPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// Example usage in reminder route:
/*
import { sendReminder, formatPhoneNumber } from '../utils/messaging.js';

// In your send reminder endpoint:
router.post('/:id/send', async (req, res) => {
  const reminder = await db.collection('reminders').findOne({ _id: new ObjectId(id) });
  
  const formattedPhone = formatPhoneNumber(reminder.customerPhone);
  const result = await sendReminder(reminder.channel, formattedPhone, reminder.message);
  
  if (result.success) {
    // Update reminder status to 'sent'
    await db.collection('reminders').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'sent', sentAt: new Date() } }
    );
    res.json({ success: true, message: 'Reminder sent' });
  } else {
    // Update reminder status to 'failed'
    await db.collection('reminders').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'failed' } }
    );
    res.status(500).json({ success: false, message: 'Failed to send reminder' });
  }
});
*/

export default {
  sendWhatsAppMessage,
  sendSMSTwilio,
  sendSMSMsg91,
  sendReminder,
  formatPhoneNumber,
  isValidPhoneNumber
};