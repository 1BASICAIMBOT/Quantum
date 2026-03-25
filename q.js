/**
 * Quantum Snippet — Express Backend
 * Routes: /api/bookings, /api/contact, /api/admin/*
 * Email: Nodemailer via Gmail App Password
 * Storage: SQLite (zero-config, single file DB)
 *
 * Setup:
 *   npm install express cors nodemailer better-sqlite3 dotenv
 *   node server.js
 */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const Database   = require('better-sqlite3');
const path       = require('path');
const crypto     = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serve index.html & admin.html

// ─── Database ─────────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'qs_data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL,
    date_key  TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status    TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    business   TEXT,
    service    TEXT,
    message    TEXT,
    status     TEXT DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_slot ON bookings(date_key, time_slot);
`);

// ─── Email Transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,   // your Gmail address
    pass: process.env.EMAIL_PASS,   // Gmail App Password (not your login password)
  },
});

async function sendEmail(to, subject, html) {
  if (!process.env.EMAIL_USER) {
    console.log('[email skipped — EMAIL_USER not set]', subject);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Quantum Snippet" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[email error]', err.message);
  }
}

// ─── Admin Auth Middleware ────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  const secret = process.env.ADMIN_SECRET || 'qs-admin-2025';
  if (!token || token !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── Rate limiting (simple in-memory) ────────────────────────────────────────
const rateLimits = new Map();
function rateLimit(windowMs = 60000, max = 5) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const record = rateLimits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }
    record.count++;
    rateLimits.set(key, record);
    if (record.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/bookings/slots?month=YYYY-M
 * Returns all booked date_key+time_slot combos for a given month
 * so the frontend can grey out taken slots.
 */
app.get('/api/bookings/slots', (req, res) => {
  const { month } = req.query; // e.g. "2025-5"
  if (!month) return res.status(400).json({ error: 'month required' });
  const rows = db.prepare(
    `SELECT date_key, time_slot FROM bookings
     WHERE date_key LIKE ? AND status != 'cancelled'`
  ).all(`${month}-%`);
  res.json({ booked: rows });
});

/**
 * POST /api/bookings
 * Body: { name, email, dateKey, timeSlot }
 */
app.post('/api/bookings', rateLimit(60000, 3), (req, res) => {
  const { name, email, dateKey, timeSlot } = req.body;

  // Validation
  if (!name || !email || !dateKey || !timeSlot) {
    return res.status(400).json({ error: 'All fields required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email.' });
  }

  // Check slot availability
  const existing = db.prepare(
    `SELECT id FROM bookings WHERE date_key=? AND time_slot=? AND status != 'cancelled'`
  ).get(dateKey, timeSlot);
  if (existing) {
    return res.status(409).json({ error: 'That slot is already booked. Please pick another time.' });
  }

  // Save
  const insert = db.prepare(
    `INSERT INTO bookings (name, email, date_key, time_slot) VALUES (?, ?, ?, ?)`
  );
  const info = insert.run(name, email, dateKey, timeSlot);

  // Parse date for readable display
  const [year, month, day] = dateKey.split('-').map(Number);
  const dateObj = new Date(year, month, day);
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const displayStr = `${dateStr} at ${timeSlot}`;

  // Email to client
  sendEmail(email, 'Your consultation is booked — Quantum Snippet', `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff;">
      <div style="background:#C9A84C;padding:28px 32px;">
        <h1 style="margin:0;color:#000;font-size:22px;">Quantum Snippet</h1>
      </div>
      <div style="padding:32px;">
        <p style="font-size:16px;">Hi <strong>${name}</strong>,</p>
        <p>Your free 30-minute consultation has been confirmed.</p>
        <div style="background:#f8f6f1;border-left:3px solid #C9A84C;padding:18px 22px;margin:24px 0;border-radius:2px;">
          <strong style="display:block;margin-bottom:4px;font-size:15px;">📅 ${displayStr}</strong>
          <span style="font-size:13px;color:#666;">Free 30-min strategy call</span>
        </div>
        <p style="color:#555;font-size:14px;">We'll reach out with a calendar invite and call details shortly. Looking forward to chatting!</p>
        <p style="font-size:14px;color:#555;">— The Quantum Snippet Team</p>
      </div>
      <div style="background:#f0ede6;padding:16px 32px;font-size:12px;color:#888;text-align:center;">
        quantumsnippet.xyz · (419) 290-2449
      </div>
    </div>
  `);

  // Notification to owner
  sendEmail(
    process.env.OWNER_EMAIL || process.env.EMAIL_USER,
    `🗓 New Booking: ${name} — ${displayStr}`,
    `
    <div style="font-family:sans-serif;max-width:560px;">
      <h2 style="color:#C9A84C;">New Booking #${info.lastInsertRowid}</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <tr><td style="padding:8px 0;color:#666;width:100px;">Name</td><td><strong>${name}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#666;">Email</td><td>${email}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Date/Time</td><td>${displayStr}</td></tr>
      </table>
    </div>
  `
  );

  res.json({ ok: true, id: info.lastInsertRowid, display: displayStr });
});

/**
 * POST /api/contact
 * Body: { name, email, business, service, message }
 */
app.post('/api/contact', rateLimit(60000, 3), (req, res) => {
  const { name, email, business, service, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email.' });
  }

  const insert = db.prepare(
    `INSERT INTO contacts (name, email, business, service, message) VALUES (?, ?, ?, ?, ?)`
  );
  const info = insert.run(name, email, business || '', service || '', message || '');

  // Auto-reply to lead
  sendEmail(email, 'We got your message — Quantum Snippet', `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:#C9A84C;padding:28px 32px;">
        <h1 style="margin:0;color:#000;font-size:22px;">Quantum Snippet</h1>
      </div>
      <div style="padding:32px;">
        <p style="font-size:16px;">Hi <strong>${name}</strong>,</p>
        <p>Thanks for reaching out! We've received your message and will get back to you within <strong>24 hours</strong>.</p>
        <p style="color:#555;font-size:14px;">In the meantime, feel free to browse our work or book a free consultation call directly.</p>
        <a href="https://quantumsnippet.xyz/#booking" style="display:inline-block;margin-top:16px;background:#C9A84C;color:#000;padding:14px 28px;border-radius:2px;font-weight:600;text-decoration:none;font-size:13px;letter-spacing:.08em;">Book a Free Call</a>
        <p style="margin-top:28px;font-size:14px;color:#555;">— The Quantum Snippet Team</p>
      </div>
      <div style="background:#f0ede6;padding:16px 32px;font-size:12px;color:#888;text-align:center;">
        quantumsnippet.xyz · (419) 290-2449
      </div>
    </div>
  `);

  // Notification to owner
  sendEmail(
    process.env.OWNER_EMAIL || process.env.EMAIL_USER,
    `✉️ New Lead: ${name} — ${service || 'No service selected'}`,
    `
    <div style="font-family:sans-serif;max-width:560px;">
      <h2 style="color:#C9A84C;">New Contact #${info.lastInsertRowid}</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <tr><td style="padding:8px 0;color:#666;width:100px;">Name</td><td><strong>${name}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#666;">Email</td><td>${email}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Business</td><td>${business || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Service</td><td>${service || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#666;vertical-align:top;">Message</td><td>${message || '—'}</td></tr>
      </table>
    </div>
  `
  );

  res.json({ ok: true, id: info.lastInsertRowid });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES (protected)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/bookings */
app.get('/api/admin/bookings', adminAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT * FROM bookings ORDER BY created_at DESC`
  ).all();
  res.json(rows);
});

/** GET /api/admin/contacts */
app.get('/api/admin/contacts', adminAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT * FROM contacts ORDER BY created_at DESC`
  ).all();
  res.json(rows);
});

/** GET /api/admin/stats */
app.get('/api/admin/stats', adminAuth, (req, res) => {
  const totalBookings  = db.prepare(`SELECT COUNT(*) as c FROM bookings`).get().c;
  const totalContacts  = db.prepare(`SELECT COUNT(*) as c FROM contacts`).get().c;
  const newContacts    = db.prepare(`SELECT COUNT(*) as c FROM contacts WHERE status='new'`).get().c;
  const pendingBookings = db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE status='pending'`).get().c;
  const todayBookings  = db.prepare(
    `SELECT COUNT(*) as c FROM bookings WHERE date(created_at)=date('now')`
  ).get().c;
  res.json({ totalBookings, totalContacts, newContacts, pendingBookings, todayBookings });
});

/** PATCH /api/admin/bookings/:id — update status */
app.patch('/api/admin/bookings/:id', adminAuth, (req, res) => {
  const { status } = req.body;
  if (!['pending','confirmed','cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare(`UPDATE bookings SET status=? WHERE id=?`).run(status, req.params.id);
  res.json({ ok: true });
});

/** PATCH /api/admin/contacts/:id — update status */
app.patch('/api/admin/contacts/:id', adminAuth, (req, res) => {
  const { status } = req.body;
  if (!['new','read','replied','closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare(`UPDATE contacts SET status=? WHERE id=?`).run(status, req.params.id);
  res.json({ ok: true });
});

/** DELETE /api/admin/bookings/:id */
app.delete('/api/admin/bookings/:id', adminAuth, (req, res) => {
  db.prepare(`DELETE FROM bookings WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

/** DELETE /api/admin/contacts/:id */
app.delete('/api/admin/contacts/:id', adminAuth, (req, res) => {
  db.prepare(`DELETE FROM contacts WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ Quantum Snippet server running on http://localhost:${PORT}`);
  console.log(`   Admin dashboard: http://localhost:${PORT}/admin.html`);
  console.log(`   Admin token: ${process.env.ADMIN_SECRET || 'qs-admin-2025'}\n`);
});
