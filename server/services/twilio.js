import twilio from 'twilio';
import User from '../models/User.js';

let client = null;

function getClient() {
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

export async function notifyAdmin(message) {
  const twilioClient = getClient();
  if (!twilioClient) {
    console.log('[Twilio not configured] Would have sent:', message);
    return;
  }

  const admin = await User.findOne({ role: 'admin', phone: { $exists: true, $ne: '' } });
  if (!admin?.phone) {
    console.log('[No admin phone set] Would have sent:', message);
    return;
  }

  try {
    await twilioClient.messages.create({
      body: `[YE Rosters] ${message}`,
      from: process.env.TWILIO_FROM,
      to: admin.phone,
    });
    console.log('SMS sent to admin:', message);
  } catch (err) {
    console.error('Failed to send SMS:', err.message);
  }
}
