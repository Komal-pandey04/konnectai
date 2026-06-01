const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'konnectapi.db.json');
let db = null;

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data).toString('base64'));
}

async function initDB() {
  const SQL = await initSqlJs();
  const existing = fs.existsSync(DB_PATH)
    ? Buffer.from(fs.readFileSync(DB_PATH, 'utf8'), 'base64')
    : null;

  db = existing ? new SQL.Database(existing) : new SQL.Database();

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    ai_reply TEXT,
    sender TEXT DEFAULT 'user',
    message_type TEXT DEFAULT 'normal',
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sensitive_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    manual_reply TEXT,
    sms_sent INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT (datetime('now')),
    replied_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Indexes for performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sensitive_user_id ON sensitive_messages(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sensitive_status ON sensitive_messages(status)`);

  saveDB();

  // Seed demo user and admin
  const demoHash = await bcrypt.hash('demo123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  dbRun(`INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    ['Demo User', 'demo@konnect.ai', demoHash, 'user']);
  dbRun(`INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    ['Komal Pandey', 'komal@konnect.ai', adminHash, 'admin']);

  saveDB();
  console.log('✅ Database initialized (users: demo@konnect.ai/demo123, admin: komal@konnect.ai/admin123)');
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  const idRow = db.exec('SELECT last_insert_rowid() as id');
  const id = idRow[0]?.values[0][0];
  const changes = db.getRowsModified();
  saveDB();
  return { id, changes };
}

function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

module.exports = { initDB, dbRun, dbGet, dbAll };
