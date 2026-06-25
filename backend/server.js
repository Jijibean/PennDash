// ============================================
// PENNDASH BACKEND SERVER
// With Stripe Connect Integration
// ============================================

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',

  // Stripe Configuration
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_KEY_HERE',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_YOUR_WEBHOOK_SECRET',
  PLATFORM_FEE_PERCENT: 5, // Your 5% cut

  // Email configuration
  EMAIL: {
    HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    PORT: process.env.EMAIL_PORT || 587,
    SECURE: false,
    USER: process.env.EMAIL_USER || '',
    PASS: process.env.EMAIL_PASS || '',
    FROM: process.env.EMAIL_FROM || 'PennDash <noreply@penndash.com>'
  },

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',

  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  VERIFICATION_EXPIRY_MINUTES: 15,
  MAX_EMAILS_PER_HOUR: 5
};

// ============================================
// SUPABASE CLIENT (uses native fetch, Node 18+)
// Falls back gracefully when env vars not set.
// ============================================
const dbAvailable = () => !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_SERVICE_ROLE_KEY);

const db = {
  from: (table) => {
    const headers = {
      'apikey': CONFIG.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    const base = `${CONFIG.SUPABASE_URL}/rest/v1/${table}`;

    return {
      select: async (columns = '*', filters = {}) => {
        if (!dbAvailable()) return [];
        let url = `${base}?select=${columns}`;
        Object.entries(filters).forEach(([k, v]) => { url += `&${k}=eq.${encodeURIComponent(v)}`; });
        try {
          const r = await fetch(url, { headers });
          return r.ok ? r.json() : [];
        } catch { return []; }
      },
      upsert: async (data, onConflict) => {
        if (!dbAvailable()) return null;
        const url = `${base}?on_conflict=${onConflict}`;
        try {
          const r = await fetch(url, { method: 'POST', headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' }, body: JSON.stringify(data) });
          return r.ok ? r.json() : null;
        } catch { return null; }
      },
      update: async (data, col, val) => {
        if (!dbAvailable()) return null;
        try {
          const r = await fetch(`${base}?${col}=eq.${encodeURIComponent(val)}`, { method: 'PATCH', headers, body: JSON.stringify(data) });
          return r.ok ? r.json() : null;
        } catch { return null; }
      }
    };
  }
};

// Initialize Stripe
const stripe = new Stripe(CONFIG.STRIPE_SECRET_KEY);

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: [CONFIG.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Raw body for Stripe webhooks (must be before express.json())
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ============================================
// IN-MEMORY STORAGE
// verificationCodes and rateLimits are intentionally ephemeral (short-lived).
// userStripeAccounts is a write-through cache; Supabase is the source of truth
// when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
// ============================================
const verificationCodes = new Map();
const verifiedUsers = new Map();
const rateLimits = new Map();
const userStripeAccounts = new Map(); // email -> stripe_account_id (cache)
const pendingPayments = new Map();    // payment_intent_id -> order details

// ============================================
// STRIPE ACCOUNT HELPERS (Supabase-backed)
// ============================================
async function getStripeAccountId(email) {
  const cached = userStripeAccounts.get(email.toLowerCase());
  if (cached) return cached;

  const rows = await db.from('users').select('stripe_account_id', { email: email.toLowerCase() });
  const accountId = rows?.[0]?.stripe_account_id || null;
  if (accountId) userStripeAccounts.set(email.toLowerCase(), accountId);
  return accountId;
}

async function setStripeAccountId(email, accountId) {
  userStripeAccounts.set(email.toLowerCase(), accountId);
  await db.from('users').upsert(
    { email: email.toLowerCase(), stripe_account_id: accountId, updated_at: new Date().toISOString() },
    'email'
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isValidPennEmail(email) {
  const lowerEmail = email.toLowerCase().trim();
  return lowerEmail.endsWith('.upenn.edu') || lowerEmail.endsWith('@upenn.edu');
}

function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function generateSessionToken(email) {
  return jwt.sign({ email: email.toLowerCase(), iat: Math.floor(Date.now() / 1000) }, CONFIG.JWT_SECRET, { expiresIn: '7d' });
}

function verifySessionToken(token) {
  try {
    return jwt.verify(token, CONFIG.JWT_SECRET);
  } catch {
    return null;
  }
}

function checkRateLimit(email) {
  const now = Date.now();
  const limit = rateLimits.get(email.toLowerCase());
  
  if (!limit || now > limit.resetAt) {
    rateLimits.set(email.toLowerCase(), { count: 1, resetAt: now + 3600000 });
    return { allowed: true };
  }
  
  if (limit.count >= CONFIG.MAX_EMAILS_PER_HOUR) {
    return { allowed: false, minutesLeft: Math.ceil((limit.resetAt - now) / 60000) };
  }
  
  limit.count++;
  return { allowed: true };
}

function createTransporter() {
  return nodemailer.createTransport({
    host: CONFIG.EMAIL.HOST,
    port: CONFIG.EMAIL.PORT,
    secure: CONFIG.EMAIL.SECURE,
    auth: { user: CONFIG.EMAIL.USER, pass: CONFIG.EMAIL.PASS }
  });
}

async function sendVerificationEmail(email, code) {
  const transporter = createTransporter();
  return transporter.sendMail({
    from: CONFIG.EMAIL.FROM,
    to: email,
    subject: '🍽️ PennDash - Verify Your Penn Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #011F5B;">🍽️ PennDash</h1>
        <p>Your verification code is:</p>
        <h2 style="font-size: 36px; letter-spacing: 8px; color: #011F5B; background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px;">${code}</h2>
        <p>This code expires in ${CONFIG.VERIFICATION_EXPIRY_MINUTES} minutes.</p>
      </div>
    `,
    text: `Your PennDash verification code is: ${code}`
  });
}

// Auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const decoded = verifySessionToken(authHeader.substring(7));
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.userEmail = decoded.email;
  next();
}

// ============================================
// AUTH ROUTES (existing)
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', stripe: !!CONFIG.STRIPE_SECRET_KEY, timestamp: new Date().toISOString() });
});

app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidPennEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Please use a valid Penn email address' });
    }
    
    const rateCheck = checkRateLimit(normalizedEmail);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: `Too many requests. Try again in ${rateCheck.minutesLeft} minutes.` });
    }
    
    const code = generateVerificationCode();
    verificationCodes.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + CONFIG.VERIFICATION_EXPIRY_MINUTES * 60000,
      attempts: 0
    });
    
    try {
      await sendVerificationEmail(normalizedEmail, code);
      res.json({ success: true, message: 'Verification code sent' });
    } catch (emailError) {
      console.log(`[DEV] Verification code for ${normalizedEmail}: ${code}`);
      res.json({ success: true, message: 'Code sent (check console in dev)', devCode: code });
    }
  } catch (error) {
    console.error('[AUTH] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
    
    const normalizedEmail = email.toLowerCase().trim();
    const verification = verificationCodes.get(normalizedEmail);
    
    if (!verification) return res.status(400).json({ error: 'No code found. Request a new one.' });
    if (Date.now() > verification.expiresAt) {
      verificationCodes.delete(normalizedEmail);
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }
    if (verification.attempts >= 5) {
      verificationCodes.delete(normalizedEmail);
      return res.status(400).json({ error: 'Too many attempts. Request a new code.' });
    }
    
    if (verification.code !== code.toString().trim()) {
      verification.attempts++;
      return res.status(400).json({ error: 'Invalid code', attemptsRemaining: 5 - verification.attempts });
    }
    
    const sessionToken = generateSessionToken(normalizedEmail);
    verifiedUsers.set(normalizedEmail, { verifiedAt: new Date().toISOString() });
    verificationCodes.delete(normalizedEmail);
    
    res.json({ success: true, token: sessionToken, user: { email: normalizedEmail, verified: true } });
  } catch (error) {
    console.error('[AUTH] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/verify-session', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const decoded = verifySessionToken(authHeader.substring(7));
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });
  
  // Include stripe account status
  const stripeAccountId = await getStripeAccountId(decoded.email);
  
  res.json({ 
    valid: true, 
    user: { 
      email: decoded.email, 
      verified: true,
      stripeAccountId: stripeAccountId || null
    } 
  });
});

// ============================================
// STRIPE CONNECT ROUTES
// ============================================

// Check if user has connected Stripe account
app.get('/api/stripe/account-status', requireAuth, async (req, res) => {
  try {
    const stripeAccountId = await getStripeAccountId(req.userEmail);
    
    if (!stripeAccountId) {
      return res.json({ connected: false, canReceivePayments: false });
    }
    
    const account = await stripe.accounts.retrieve(stripeAccountId);
    
    res.json({
      connected: true,
      canReceivePayments: account.charges_enabled && account.payouts_enabled,
      accountId: stripeAccountId,
      detailsSubmitted: account.details_submitted
    });
  } catch (error) {
    console.error('[STRIPE] Account status error:', error);
    res.status(500).json({ error: 'Failed to check account status' });
  }
});

// Create Stripe Connect onboarding link (for deliverers to receive payments)
app.post('/api/stripe/create-connect-account', requireAuth, async (req, res) => {
  try {
    let accountId = await getStripeAccountId(req.userEmail);

    if (!accountId) {
      // Create new Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: req.userEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_type: 'individual',
        metadata: { penndash_email: req.userEmail }
      });

      accountId = account.id;
      await setStripeAccountId(req.userEmail, accountId);
      console.log(`[STRIPE] Created account ${accountId} for ${req.userEmail}`);
    }
    
    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${CONFIG.FRONTEND_URL}?stripe_refresh=true`,
      return_url: `${CONFIG.FRONTEND_URL}?stripe_success=true`,
      type: 'account_onboarding'
    });
    
    res.json({ url: accountLink.url, accountId });
  } catch (error) {
    console.error('[STRIPE] Create account error:', error);
    res.status(500).json({ error: 'Failed to create Stripe account' });
  }
});

// Create Stripe dashboard link (for deliverers to view earnings)
app.post('/api/stripe/dashboard-link', requireAuth, async (req, res) => {
  try {
    const stripeAccountId = await getStripeAccountId(req.userEmail);
    
    if (!stripeAccountId) {
      return res.status(400).json({ error: 'No Stripe account found. Set up payments first.' });
    }
    
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
    res.json({ url: loginLink.url });
  } catch (error) {
    console.error('[STRIPE] Dashboard link error:', error);
    res.status(500).json({ error: 'Failed to create dashboard link' });
  }
});

// Create payment intent (requester pays for an order)
app.post('/api/stripe/create-payment', requireAuth, async (req, res) => {
  try {
    const { orderId, amount, delivererEmail } = req.body;
    
    if (!orderId || !amount || !delivererEmail) {
      return res.status(400).json({ error: 'Missing required fields: orderId, amount, delivererEmail' });
    }
    
    // Get deliverer's Stripe account
    const delivererStripeId = await getStripeAccountId(delivererEmail);
    
    if (!delivererStripeId) {
      return res.status(400).json({ 
        error: 'Deliverer has not set up payments yet',
        code: 'DELIVERER_NOT_SETUP'
      });
    }
    
    // Verify deliverer can receive payments
    const delivererAccount = await stripe.accounts.retrieve(delivererStripeId);
    if (!delivererAccount.charges_enabled) {
      return res.status(400).json({ 
        error: 'Deliverer account is not fully set up',
        code: 'DELIVERER_INCOMPLETE'
      });
    }
    
    // Calculate amounts (Stripe uses cents)
    const totalAmountCents = Math.round(amount * 100);
    const platformFeeCents = Math.round(totalAmountCents * CONFIG.PLATFORM_FEE_PERCENT / 100);
    
    // Create payment intent with automatic transfer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: delivererStripeId
      },
      metadata: {
        order_id: orderId.toString(),
        requester_email: req.userEmail,
        deliverer_email: delivererEmail,
        platform_fee_percent: CONFIG.PLATFORM_FEE_PERCENT.toString()
      }
    });
    
    // Store payment details for webhook
    pendingPayments.set(paymentIntent.id, {
      orderId,
      requesterEmail: req.userEmail,
      delivererEmail,
      amount,
      platformFee: platformFeeCents / 100,
      createdAt: new Date().toISOString()
    });
    
    console.log(`[STRIPE] Payment intent ${paymentIntent.id} created for order ${orderId}`);
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      breakdown: {
        total: amount,
        platformFee: platformFeeCents / 100,
        stripeFee: Math.round((totalAmountCents * 0.029 + 30)) / 100, // Estimated
        delivererReceives: (totalAmountCents - platformFeeCents) / 100
      }
    });
  } catch (error) {
    console.error('[STRIPE] Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment: ' + error.message });
  }
});

// Get payment status
app.get('/api/stripe/payment-status/:paymentIntentId', requireAuth, async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(req.params.paymentIntentId);
    
    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      paid: paymentIntent.status === 'succeeded'
    });
  } catch (error) {
    console.error('[STRIPE] Payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

// Stripe webhook handler
app.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, CONFIG.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[STRIPE] Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`[STRIPE] ✅ Payment succeeded: ${paymentIntent.id}`);

      // Use metadata on the intent (always available, even if server restarted)
      const orderId = paymentIntent.metadata?.order_id;
      const delivererEmail = paymentIntent.metadata?.deliverer_email;
      const requesterEmail = paymentIntent.metadata?.requester_email;

      if (orderId) {
        const updated = await db.from('orders').update({ payment_status: 'paid' }, 'id', orderId);
        if (updated) {
          console.log(`[STRIPE] ✅ Order ${orderId} marked paid in Supabase`);
        } else {
          console.warn(`[STRIPE] ⚠️  Could not update Supabase for order ${orderId} — check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars`);
        }
      }

      // Also log from in-memory cache if available
      const cached = pendingPayments.get(paymentIntent.id);
      if (cached) {
        console.log(`[STRIPE] Order ${cached.orderId} paid — deliverer: ${cached.delivererEmail}, amount: $${cached.amount}`);
        pendingPayments.delete(paymentIntent.id);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const failedIntent = event.data.object;
      console.log(`[STRIPE] ❌ Payment failed: ${failedIntent.id}`);
      const orderId = failedIntent.metadata?.order_id;
      if (orderId) {
        await db.from('orders').update({ payment_status: 'failed' }, 'id', orderId);
      }
      break;
    }

    case 'account.updated': {
      const account = event.data.object;
      console.log(`[STRIPE] Account ${account.id} updated. Charges enabled: ${account.charges_enabled}`);
      break;
    }

    default:
      console.log(`[STRIPE] Event: ${event.type}`);
  }
  
  res.json({ received: true });
});

// ============================================
// ORDER LIFECYCLE ROUTES
// ============================================

// Mark an order as delivered. Either the deliverer or requester can confirm.
app.post('/api/orders/:orderId/complete', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Fetch the order to verify the caller is a participant
    const rows = await db.from('orders').select('*', { id: orderId });
    const order = rows?.[0];

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (req.userEmail !== order.claimed_by && req.userEmail !== order.user_email) {
      return res.status(403).json({ error: 'Only the requester or deliverer can complete this order' });
    }
    if (order.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Order must be paid before it can be marked delivered' });
    }

    await db.from('orders').update(
      { status: 'delivered', delivered_at: new Date().toISOString() },
      'id',
      orderId
    );

    console.log(`[ORDER] ✅ Order ${orderId} marked delivered by ${req.userEmail}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[ORDER] Complete error:', error);
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🍽️  PennDash Backend Server                                 ║
║                                                               ║
║   Server: http://localhost:${PORT}                              ║
║   Health: http://localhost:${PORT}/api/health                   ║
║                                                               ║
║   Stripe Connected: ${CONFIG.STRIPE_SECRET_KEY.startsWith('sk_') ? '✅ Yes' : '❌ No - Add STRIPE_SECRET_KEY'}             ║
║   Platform Fee: ${CONFIG.PLATFORM_FEE_PERCENT}%                                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
