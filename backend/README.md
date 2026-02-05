# PennDash Email Verification System

A secure email verification system for PennDash that ensures only UPenn students can access the platform.

## 🏗️ Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│   React Frontend    │────▶│   Node.js Backend   │────▶│   Email Service     │
│   (Vite + React)    │     │   (Express + JWT)   │     │   (SMTP/SendGrid)   │
│                     │◀────│                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────────┐
                            │                     │
                            │      Supabase       │
                            │   (Orders Storage)  │
                            │                     │
                            └─────────────────────┘
```

## 🔐 How It Works

### Authentication Flow

1. **User enters Penn email** → Frontend validates `@upenn.edu` / `@*.upenn.edu` format
2. **Backend sends 6-digit code** → Email sent via configured SMTP service
3. **User enters verification code** → Backend validates code (15 min expiry, 5 attempts max)
4. **JWT session created** → Stored in localStorage, valid for 7 days
5. **User accesses dashboard** → Session verified on each page load

### Security Features

- ✅ Only Penn emails accepted (`@upenn.edu`, `@seas.upenn.edu`, `@wharton.upenn.edu`, etc.)
- ✅ 6-digit codes expire in 15 minutes
- ✅ Maximum 5 verification attempts per code
- ✅ Rate limiting: 5 emails per hour per address
- ✅ JWT tokens for session management
- ✅ Secure password-less authentication

## 📁 Project Structure

```
penndash/
├── backend/
│   ├── server.js          # Express server with auth endpoints
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment template
│
└── frontend/
    ├── src/
    │   ├── main.jsx       # React entry point
    │   └── PennDash.jsx   # Main app component
    ├── index.html         # HTML template
    ├── package.json       # Frontend dependencies
    └── vite.config.js     # Vite configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Gmail account (for development) or SendGrid/Mailgun (for production)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your settings (see Email Configuration below)
nano .env

# Start the server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Testing the Flow

1. Open `http://localhost:5173` in your browser
2. Enter a Penn email address
3. Check server console for verification code (in dev mode)
4. Enter the 6-digit code
5. You're logged in!

## 📧 Email Configuration

### Option 1: Gmail (Development)

1. Enable 2-Factor Authentication on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Update `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-character-app-password
```

### Option 2: SendGrid (Production - Recommended)

1. Create account at [SendGrid](https://sendgrid.com/)
2. Verify your sender domain
3. Create API key with Mail Send permissions
4. Update `.env`:

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=SG.xxxxxxxxxxxxxxxxxxxx
```

### Option 3: Mailgun

```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASS=your-mailgun-api-key
```

## 🔧 API Endpoints

### `POST /api/auth/send-code`

Send verification code to email.

**Request:**
```json
{
  "email": "pennkey@seas.upenn.edu"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification code sent to your email",
  "expiresIn": 900
}
```

**Response (Error):**
```json
{
  "error": "Please use a valid Penn email address",
  "code": "NOT_PENN_EMAIL"
}
```

### `POST /api/auth/verify-code`

Verify code and create session.

**Request:**
```json
{
  "email": "pennkey@seas.upenn.edu",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "email": "pennkey@seas.upenn.edu",
    "verified": true
  }
}
```

### `POST /api/auth/verify-session`

Validate existing session token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "email": "pennkey@seas.upenn.edu",
    "verified": true
  }
}
```

## 🛡️ Error Codes

| Code | Description |
|------|-------------|
| `INVALID_EMAIL` | Email format is invalid |
| `NOT_PENN_EMAIL` | Email is not a Penn address |
| `RATE_LIMITED` | Too many requests |
| `NO_CODE` | No verification code found |
| `CODE_EXPIRED` | Code has expired |
| `INVALID_CODE` | Wrong verification code |
| `TOO_MANY_ATTEMPTS` | Max attempts exceeded |
| `NO_TOKEN` | Authorization header missing |
| `INVALID_TOKEN` | Token invalid or expired |

## 🏭 Production Deployment

### Environment Variables

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<generate-secure-64-byte-hex-string>
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=<your-sendgrid-api-key>
EMAIL_FROM=PennDash <noreply@yourdomain.com>
FRONTEND_URL=https://penndash.com
```

### Generate Secure JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Recommended Hosting

- **Backend**: Railway, Render, Heroku, or AWS
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Database**: Use Redis for production session storage

### Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Set secure JWT secret (64+ bytes)
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting at infrastructure level
- [ ] Use Redis for verification code storage
- [ ] Set up monitoring and alerting
- [ ] Implement token refresh mechanism

## 📝 Database Schema (Optional)

If you want to persist verification data, create these tables in Supabase:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  verified_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification codes table
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table (optional, for token blacklisting)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🐛 Troubleshooting

### "Failed to send email"

1. Check your email credentials in `.env`
2. For Gmail, ensure you're using an App Password (not regular password)
3. Check if your email provider blocks SMTP from your IP

### "Connection failed"

1. Ensure backend is running on port 3001
2. Check CORS configuration matches your frontend URL
3. Try accessing `http://localhost:3001/api/health`

### Verification code not arriving

1. Check spam/junk folder
2. In dev mode, code is logged to server console
3. Verify email configuration is correct

## 📄 License

MIT License - Feel free to use this for your campus projects!

---

Built with ❤️ for Penn Students
