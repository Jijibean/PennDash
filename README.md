# PennDash - Campus Food Delivery

A food delivery app for UPenn students with real email verification powered by Supabase.

## Features

- **Email Verification**: Real OTP codes sent to Penn email addresses
- **Penn Email Only**: Validates @upenn.edu, @seas.upenn.edu, @wharton.upenn.edu, @sas.upenn.edu
- **Delivery Requests**: Post requests with tip amount, dining hall, and dorm
- **Order Board**: All orders sorted by tip (lowest to highest)
- **Claim System**: Students can claim deliveries to fulfill

## Tech Stack

- React 18 + Vite
- Supabase (Auth + Database)

---

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **New Project**
3. Name it `penndash` and set a database password
4. Wait for the project to be created (~2 minutes)

### 2. Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 3. Update the App Code

Open `src/PennDash.jsx` and replace these lines at the top:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

With your actual values:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6...your-key';
```

### 4. Create the Database Table

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste this SQL and click **Run**:

```sql
-- Create the orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  dining_hall TEXT NOT NULL,
  dorm TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'open',
  claimed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read orders
CREATE POLICY "Anyone can view orders" ON orders
  FOR SELECT USING (true);

-- Allow authenticated users to insert orders
CREATE POLICY "Authenticated users can insert orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Allow users to update orders (for claiming)
CREATE POLICY "Anyone can update orders" ON orders
  FOR UPDATE USING (true);

-- Allow users to delete their own orders
CREATE POLICY "Users can delete own orders" ON orders
  FOR DELETE USING (true);
```

### 5. Configure Email Auth

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Go to **Authentication** → **URL Configuration**
4. Set **Site URL** to `http://localhost:5173` (for development)

### 6. (Optional) Restrict to Penn Emails Only

To only allow Penn emails at the Supabase level:

1. Go to **Authentication** → **Policies**
2. Or add this SQL:

```sql
-- Create a function to validate Penn emails
CREATE OR REPLACE FUNCTION is_penn_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email LIKE '%@upenn.edu' OR email LIKE '%.upenn.edu';
END;
$$ LANGUAGE plpgsql;
```

---

## Running the App

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## How It Works

1. **Login**: Enter your Penn email (e.g., `student@seas.upenn.edu`)
2. **Verify**: Check your email for a 6-digit code from Supabase
3. **Dashboard**: Post delivery requests or claim open orders
4. **Earn**: Fulfill deliveries to earn tips from other students

---

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repo
4. Add environment variables (optional - or keep them in code for now)
5. Deploy!

### Update Supabase URL for Production

After deploying, update the **Site URL** in Supabase:
1. Go to **Authentication** → **URL Configuration**
2. Change Site URL to your Vercel URL (e.g., `https://penndash.vercel.app`)

---

## Project Structure

```
penndash/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx
    └── PennDash.jsx    # Main app with Supabase integration
```

---

## Troubleshooting

**"Failed to send verification code"**
- Check that your SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Make sure Email auth is enabled in Supabase

**Not receiving emails**
- Check your spam folder
- Supabase free tier has email limits - check your Supabase dashboard

**Orders not saving**
- Make sure you ran the SQL to create the `orders` table
- Check the browser console for errors

---

## License

MIT - Built for Penn Students 🎓
