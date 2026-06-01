const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database');
const { adminMiddleware } = require('../middleware/auth');
const router = express.Router();

// All admin routes require admin role
router.use(adminMiddleware);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  try {
    const totalUsers = dbGet('SELECT COUNT(*) as c FROM users WHERE role != "admin"')?.c || 0;
    const totalMessages = dbGet('SELECT COUNT(*) as c FROM messages')?.c || 0;
    const totalSensitive = dbGet('SELECT COUNT(*) as c FROM sensitive_messages')?.c || 0;
    const pendingReplies = dbGet("SELECT COUNT(*) as c FROM sensitive_messages WHERE status='pending'")?.c || 0;
    const todayMessages = dbGet(
      "SELECT COUNT(*) as c FROM messages WHERE timestamp >= datetime('now', '-1 day')"
    )?.c || 0;

    res.json({ totalUsers, totalMessages, totalSensitive, pendingReplies, todayMessages });
  } catch (e) { res.status(500).json({ error: 'Stats failed' }); }
});

// GET /api/admin/pending-messages
router.get('/pending-messages', (req, res) => {
  try {
    const messages = dbAll(`
      SELECT sm.id, sm.message, sm.status, sm.manual_reply, sm.sms_sent,
             sm.timestamp, sm.replied_at,
             u.name as user_name, u.email as user_email, u.id as user_id
      FROM sensitive_messages sm
      JOIN users u ON sm.user_id = u.id
      ORDER BY sm.timestamp DESC
    `);
    res.json({ messages, pendingCount: messages.filter(m => m.status === 'pending').length });
  } catch (e) { res.status(500).json({ error: 'Fetch failed' }); }
});

// GET /api/admin/all-messages
router.get('/all-messages', (req, res) => {
  try {
    const messages = dbAll(`
      SELECT m.id, m.message, m.ai_reply, m.message_type, m.timestamp,
             u.name as user_name, u.email as user_email
      FROM messages m JOIN users u ON m.user_id = u.id
      ORDER BY m.timestamp DESC LIMIT 200
    `);
    res.json({ messages });
  } catch (e) { res.status(500).json({ error: 'Fetch failed' }); }
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  try {
    const users = dbAll(`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
             COUNT(m.id) as message_count
      FROM users u LEFT JOIN messages m ON m.user_id = u.id
      WHERE u.role != 'admin'
      GROUP BY u.id ORDER BY u.created_at DESC
    `);
    res.json({ users });
  } catch (e) { res.status(500).json({ error: 'Fetch failed' }); }
});

// POST /api/admin/manual-reply
router.post('/manual-reply', async (req, res) => {
  const { sensitiveMessageId, reply } = req.body;
  if (!sensitiveMessageId || !String(reply || '').trim())
    return res.status(400).json({ error: 'ID and reply are required' });

  try {
    const msg = dbGet(`
      SELECT sm.*, u.name as user_name
      FROM sensitive_messages sm JOIN users u ON sm.user_id = u.id
      WHERE sm.id = ?
    `, [sensitiveMessageId]);

    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.status === 'replied') return res.status(400).json({ error: 'Already replied' });

    const cleanReply = String(reply).trim().slice(0, 1000);

    dbRun(
      `UPDATE sensitive_messages SET status='replied', manual_reply=?, replied_at=datetime('now') WHERE id=?`,
      [cleanReply, sensitiveMessageId]
    );
    dbRun(
      `INSERT INTO messages (user_id, message, ai_reply, message_type) VALUES (?, ?, ?, ?)`,
      [msg.user_id, '[Sensitive question — forwarded to Komal]', '💬 Komal here! ' + cleanReply, 'human']
    );

    // Real-time push via Socket.io
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const targetSocket = connectedUsers?.get(String(msg.user_id));
    if (io && targetSocket) {
      io.to(targetSocket).emit('komal_reply', {
        reply: '💬 Komal here! ' + cleanReply,
        type: 'human',
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, deliveredRealtime: !!targetSocket });
  } catch (e) {
    console.error('Manual reply error:', e);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// DELETE /api/admin/message/:id
router.delete('/message/:id', (req, res) => {
  try {
    dbRun('DELETE FROM sensitive_messages WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Delete failed' }); }
});

module.exports = router;
