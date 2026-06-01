let client = null;

function getTwilio() {
  if (client) return client;
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token } = process.env;
  if (!sid || !token || sid.startsWith('AC0')) return null;
  try {
    client = require('twilio')(sid, token);
    return client;
  } catch { return null; }
}

async function sendSMSAlert(userName, userId, message) {
  const twilio = getTwilio();
  const { TWILIO_PHONE: from, KOMAL_PHONE: to } = process.env;
  if (!twilio || !from || !to) {
    console.log('📵 Twilio not configured — SMS skipped');
    return false;
  }
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const body = [
    '🚨 New KonnectAPI Alert',
    `👤 User: ${userName} (ID: ${userId})`,
    `❓ Question: ${message.slice(0, 130)}${message.length > 130 ? '...' : ''}`,
    `🕐 ${time}`,
    'Reply via your Admin Dashboard.'
  ].join('\n');
  try {
    const result = await twilio.messages.create({ body, from, to });
    console.log(`✅ SMS sent — SID: ${result.sid}`);
    return true;
  } catch (e) {
    console.error('❌ SMS failed:', e.message);
    return false;
  }
}

module.exports = { sendSMSAlert };
