# Quantum Snippet Backend — Setup Guide

## What you get
| File | Purpose |
|------|---------|
| `server.js` | Express backend — bookings, contacts, email, admin API |
| `public/index.html` | Your website, now talking to the backend |
| `public/admin.html` | Admin dashboard at `/admin.html` |
| `package.json` | Node dependencies |
| `.env.example` | Config template |

---

## Step 1 — Install Node.js
Download from https://nodejs.org (LTS version).  
Verify: `node -v` should print v18 or higher.

---

## Step 2 — Install dependencies
```bash
cd /path/to/your/project
npm install
```

---

## Step 3 — Configure environment
```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
PORT=3001
ALLOWED_ORIGIN=https://quantumsnippet.xyz   # your domain, or * for dev

EMAIL_USER=you@gmail.com       # Gmail address
EMAIL_PASS=xxxx xxxx xxxx xxxx # Gmail App Password (see note below)
OWNER_EMAIL=you@gmail.com      # where booking/contact alerts go

ADMIN_SECRET=pick-a-strong-secret-here
```

### Gmail App Password
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification if not already on
3. Search "App passwords" → create one for "Mail"
4. Paste the 16-char code as `EMAIL_PASS`

---

## Step 4 — Run the server
```bash
# Production
node server.js

# Development (auto-restarts on file changes)
npm run dev
```

You'll see:
```
✅ Quantum Snippet server running on http://localhost:3001
   Admin dashboard: http://localhost:3001/admin.html
   Admin token: your-secret-here
```

Open http://localhost:3001 — your site is live.  
Open http://localhost:3001/admin.html — admin dashboard.

---

## Step 5 — Connect your frontend (production only)
In `public/index.html`, find this line near the bottom:
```js
const API_BASE = '';
```
Change it to your server's public URL:
```js
const API_BASE = 'https://api.quantumsnippet.xyz';
```

---

## Deploying to a real server

### Option A — Railway (easiest, free tier available)
1. Push your project folder to a GitHub repo
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add your `.env` variables in the Railway dashboard
4. Railway gives you a URL like `https://qs-backend.up.railway.app`
5. Set `API_BASE` in `index.html` to that URL

### Option B — VPS (DigitalOcean / Linode)
```bash
# On your server
git clone your-repo
cd your-repo
npm install
cp .env.example .env && nano .env  # fill in values

# Install PM2 to keep it running
npm install -g pm2
pm2 start server.js --name qs-backend
pm2 save && pm2 startup
```

### Option C — Same server as your website (Nginx reverse proxy)
If your site runs on the same server, add to your Nginx config:
```nginx
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## Admin Dashboard
- URL: `yoursite.com/admin.html`
- Password: whatever you set as `ADMIN_SECRET` in `.env`
- Features:
  - Live stats (total bookings, new leads, booked today)
  - View all bookings — update status (Pending / Confirmed / Cancelled)
  - View all contact leads — update status (New / Read / Replied / Closed)
  - Delete any record
  - Click any email address to open your mail client

---

## API Endpoints (for reference)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/bookings/slots?month=YYYY-M` | None | Get booked slots for a month |
| POST | `/api/bookings` | None | Submit a booking |
| POST | `/api/contact` | None | Submit a contact form |
| GET | `/api/admin/bookings` | Token | All bookings |
| GET | `/api/admin/contacts` | Token | All contacts |
| GET | `/api/admin/stats` | Token | Dashboard stats |
| PATCH | `/api/admin/bookings/:id` | Token | Update booking status |
| PATCH | `/api/admin/contacts/:id` | Token | Update contact status |
| DELETE | `/api/admin/bookings/:id` | Token | Delete booking |
| DELETE | `/api/admin/contacts/:id` | Token | Delete contact |

Admin requests require header: `x-admin-token: your-secret`

---

## Data storage
All data lives in `qs_data.db` — a single SQLite file in your project folder.  
Back it up by just copying that file. No database server needed.
