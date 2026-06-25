import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SUPABASE_URL = 'https://lpvhvotwyovwnahdqqod.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwdmh2b3R3eW92d25haGRxcW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNjg4OTUsImV4cCI6MjA4NDg0NDg5NX0.T2hd8Grico2Q3o0FW62e9SxUCMMTYFurhFP5gR-6zHc';
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE';

// Initialized once at module level (not inside a component) per Stripe docs.
const stripePromise = STRIPE_PUBLISHABLE_KEY !== 'pk_test_YOUR_KEY_HERE'
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

// ============================================
// AUTH SERVICE
// ============================================
const authService = {
  sendCode: async (email) => { const r = await fetch(`${API_URL}/api/auth/send-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); return r.json(); },
  verifyCode: async (email, code) => { const r = await fetch(`${API_URL}/api/auth/verify-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) }); return r.json(); },
  verifySession: async (token) => { const r = await fetch(`${API_URL}/api/auth/verify-session`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }); return r.json(); },
  saveSession: (token, user) => localStorage.setItem('penndash_session', JSON.stringify({ token, user, savedAt: Date.now() })),
  getSession: () => { const s = localStorage.getItem('penndash_session'); return s ? JSON.parse(s) : null; },
  clearSession: () => localStorage.removeItem('penndash_session'),
  getToken: () => { const s = localStorage.getItem('penndash_session'); return s ? JSON.parse(s).token : null; }
};

// ============================================
// STRIPE SERVICE
// ============================================
const stripeService = {
  getAccountStatus: async () => {
    const r = await fetch(`${API_URL}/api/stripe/account-status`, {
      headers: { 'Authorization': `Bearer ${authService.getToken()}` }
    });
    return r.json();
  },
  createConnectAccount: async () => {
    const r = await fetch(`${API_URL}/api/stripe/create-connect-account`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authService.getToken()}` }
    });
    return r.json();
  },
  getDashboardLink: async () => {
    const r = await fetch(`${API_URL}/api/stripe/dashboard-link`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authService.getToken()}` }
    });
    return r.json();
  },
  createPayment: async (orderId, amount, delivererEmail) => {
    const r = await fetch(`${API_URL}/api/stripe/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authService.getToken()}` },
      body: JSON.stringify({ orderId, amount, delivererEmail })
    });
    return r.json();
  },
  getPaymentStatus: async (paymentIntentId) => {
    const r = await fetch(`${API_URL}/api/stripe/payment-status/${paymentIntentId}`, {
      headers: { 'Authorization': `Bearer ${authService.getToken()}` }
    });
    return r.json();
  }
};

// ============================================
// SUPABASE CLIENT
// ============================================
const supabase = {
  from: (table) => ({
    select: async (columns = '*') => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}`, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }); const t = await r.text(); return { data: t ? JSON.parse(t) : [], error: r.ok ? null : t }; },
    selectWhere: async (columns = '*', filters = {}) => { let url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns}`; Object.entries(filters).forEach(([k, v]) => { url += `&${k}=eq.${encodeURIComponent(v)}`; }); const r = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }); const t = await r.text(); return { data: t ? JSON.parse(t) : [], error: r.ok ? null : t }; },
    selectOr: async (columns = '*', orConds = []) => { const url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns}&or=(${encodeURIComponent(orConds.join(','))})`; const r = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }); const t = await r.text(); return { data: t ? JSON.parse(t) : [], error: r.ok ? null : t }; },
    insert: async (rows) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Prefer': 'return=representation' }, body: JSON.stringify(rows) }); const t = await r.text(); return { data: t ? JSON.parse(t) : null, error: r.ok ? null : t }; },
    update: (updates) => ({ eq: async (col, val) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Prefer': 'return=representation' }, body: JSON.stringify(updates) }); const t = await r.text(); return { data: t ? JSON.parse(t) : null, error: r.ok ? null : t }; } }),
    delete: () => ({ eq: async (col, val) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, { method: 'DELETE', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }); return { error: r.ok ? null : 'Delete failed' }; } })
  })
};

// ============================================
// CONSTANTS
// ============================================
const DINING_HALLS = ['Houston Market', 'Accenture Café', 'Pret A Manger', "Joe's Café", 'McClelland Express'];
const DORMS = ['Hill College House', 'Kings Court English House', 'Fisher Hassenfeld College House', 'Ware College House', 'Riepe College House', 'Harnwell College House', 'Harrison College House', 'Rodin College House', 'Lauder College House', 'Gregory College House', 'Stouffer College House', 'Du Bois College House', 'Sansom Place East', 'Sansom Place West', 'The Radian', 'Chestnut Hall'];
const DELIVERY_TIMES = [
  { value: 'ASAP', label: 'ASAP', minutes: 0 },
  { value: '15min', label: '15 minutes', minutes: 15 },
  { value: '30min', label: '30 minutes', minutes: 30 },
  { value: '45min', label: '45 minutes', minutes: 45 },
  { value: '1hr', label: '1 hour', minutes: 60 },
  { value: '2hr', label: '2 hours', minutes: 120 }
];

// ============================================
// PAYMENT MODAL COMPONENT (real Stripe Elements)
// ============================================

// Inner form — must live inside <Elements> so useStripe/useElements work.
function StripePaymentForm({ order, clientSecret, breakdown, onClose, onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const platformFee = breakdown?.platformFee ?? (order.amount * 0.05);
  const delivererReceives = breakdown?.delivererReceives ?? (order.amount - platformFee);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      setError('Payment not ready yet — please wait a moment.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    });

    if (stripeError) {
      setError(stripeError.message || 'Payment failed. Please try again.');
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      // Update locally — the webhook also does this server-side as a backup.
      await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id);
      setPaymentSuccess(true);
      setTimeout(() => { onPaymentSuccess(); onClose(); }, 2000);
    }
    setLoading(false);
  };

  if (paymentSuccess) {
    return (
      <div style={modalStyles.successContent}>
        <span style={{ fontSize: '64px' }}>✅</span>
        <h2 style={{ color: '#059669', margin: '16px 0' }}>Payment Successful!</h2>
        <p style={{ color: '#64748b' }}>Your deliverer has been notified.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={modalStyles.orderSummary}>
        <div style={modalStyles.summaryRow}>
          <span style={{ color: '#374151', fontWeight: '500' }}>Order from {order.dining_hall}</span>
          <span style={{ fontWeight: '700', color: '#111827' }}>${order.amount?.toFixed(2)}</span>
        </div>
        <div style={modalStyles.summaryRow}>
          <span style={{ color: '#6B7280', fontSize: '14px' }}>Deliver to {order.dorm}</span>
        </div>
        <div style={modalStyles.divider}></div>
        <div style={modalStyles.summaryRow}>
          <span style={{ color: '#9CA3AF', fontSize: '14px' }}>Platform fee (5%)</span>
          <span style={{ color: '#9CA3AF', fontSize: '14px' }}>-${platformFee.toFixed(2)}</span>
        </div>
        <div style={modalStyles.summaryRow}>
          <span style={{ color: '#9CA3AF', fontSize: '14px' }}>Deliverer receives</span>
          <span style={{ color: '#059669', fontSize: '14px', fontWeight: '600' }}>${delivererReceives.toFixed(2)}</span>
        </div>
      </div>

      <div style={modalStyles.cardForm}>
        <div style={modalStyles.formField}>
          <label style={modalStyles.label}>Card Details</label>
          <div style={modalStyles.stripeCardWrapper}>
            <CardElement options={{
              style: {
                base: { fontSize: '16px', color: '#111827', fontFamily: 'Inter, inherit', '::placeholder': { color: '#9CA3AF' } },
                invalid: { color: '#dc2626' }
              }
            }} />
          </div>
        </div>
      </div>

      {error && <p style={modalStyles.error}>{error}</p>}

      <button
        type="submit"
        disabled={loading || !stripe || !clientSecret}
        style={{ ...modalStyles.payButton, opacity: (loading || !stripe || !clientSecret) ? 0.6 : 1 }}
      >
        {loading ? 'Processing...' : `Pay $${order.amount?.toFixed(2)}`}
      </button>
      <p style={modalStyles.secureNote}>🔒 Secured by Stripe</p>
    </form>
  );
}

function PaymentModal({ order, onClose, onPaymentSuccess }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [initError, setInitError] = useState('');
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    stripeService.createPayment(order.id, order.amount, order.claimed_by)
      .then(result => {
        if (result.error) {
          setInitError(result.error);
        } else {
          setClientSecret(result.clientSecret);
          setBreakdown(result.breakdown);
        }
        setInitLoading(false);
      })
      .catch(() => {
        setInitError('Failed to initialize payment. Please try again.');
        setInitLoading(false);
      });
  }, []);

  const body = () => {
    if (!stripePromise) {
      return (
        <div style={{ padding: '24px' }}>
          <p style={modalStyles.error}>
            Stripe is not configured. Add <code>VITE_STRIPE_PUBLISHABLE_KEY</code> to your <code>.env</code> file and restart the dev server.
          </p>
          <button onClick={onClose} style={{ ...modalStyles.payButton, background: '#6B7280' }}>Close</button>
        </div>
      );
    }
    if (initLoading) {
      return <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>Preparing payment...</div>;
    }
    if (initError) {
      return (
        <div style={{ padding: '24px' }}>
          <p style={modalStyles.error}>{initError}</p>
          <button onClick={onClose} style={{ ...modalStyles.payButton, background: '#6B7280', width: 'calc(100% - 48px)', margin: '0 24px' }}>Close</button>
        </div>
      );
    }
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <StripePaymentForm
          order={order}
          clientSecret={clientSecret}
          breakdown={breakdown}
          onClose={onClose}
          onPaymentSuccess={onPaymentSuccess}
        />
      </Elements>
    );
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Pay for Delivery</h2>
          <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        </div>
        {body()}
      </div>
    </div>
  );
}

// ============================================
// STRIPE SETUP MODAL
// ============================================
function StripeSetupModal({ onClose, onSetupComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await stripeService.createConnectAccount();
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // Redirect to Stripe onboarding
      window.location.href = result.url;
    } catch (err) {
      setError('Failed to start setup. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Set Up Payments</h2>
          <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        </div>

        <div style={modalStyles.setupContent}>
          <span style={{ fontSize: '48px', display: 'block', textAlign: 'center', marginBottom: '16px' }}>🏦</span>
          <p style={{ textAlign: 'center', color: '#4B5563', marginBottom: '24px', lineHeight: 1.6 }}>
            To receive payments for deliveries, you need to connect your bank account through Stripe.
          </p>

          <div style={modalStyles.benefitsList}>
            <div style={modalStyles.benefitItem}>✅ Get paid directly to your bank</div>
            <div style={modalStyles.benefitItem}>✅ Secure & instant transfers</div>
            <div style={modalStyles.benefitItem}>✅ Track your earnings</div>
            <div style={modalStyles.benefitItem}>✅ Only takes 2 minutes</div>
          </div>

          {error && <p style={modalStyles.error}>{error}</p>}

          <button
            onClick={handleSetup}
            disabled={loading}
            style={{ ...modalStyles.payButton, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Loading...' : 'Set Up with Stripe →'}
          </button>

          <p style={modalStyles.secureNote}>🔒 You'll be redirected to Stripe's secure setup</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CHAT POPUP COMPONENT
// ============================================
function ChatPopup({ chat, currentUser, onClose, onSendMessage, messages, onMinimize, isMinimized }) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const otherUser = chat.requester_email === currentUser ? chat.deliverer_email : chat.requester_email;
  const otherUserName = otherUser.split('@')[0];

  useEffect(() => {
    if (!isMinimized) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isMinimized]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(chat.id, newMessage.trim());
      setNewMessage('');
    }
  };

  if (isMinimized) {
    return (
      <div style={chatStyles.minimizedChat} onClick={onMinimize}>
        <div style={chatStyles.minimizedAvatar}>{otherUserName[0].toUpperCase()}</div>
        <span style={chatStyles.minimizedName}>{otherUserName}</span>
      </div>
    );
  }

  return (
    <div style={chatStyles.chatPopup}>
      <div style={chatStyles.chatHeader}>
        <div style={chatStyles.chatHeaderInfo}>
          <div style={chatStyles.chatAvatar}>{otherUserName[0].toUpperCase()}</div>
          <div style={chatStyles.chatHeaderText}>
            <span style={chatStyles.chatHeaderName}>{otherUserName}</span>
            <span style={chatStyles.chatHeaderSub}>${chat.order_amount?.toFixed(2)} · {chat.dining_hall}</span>
          </div>
        </div>
        <div style={chatStyles.chatHeaderActions}>
          <button onClick={onMinimize} style={chatStyles.chatHeaderBtn}>−</button>
          <button onClick={onClose} style={chatStyles.chatHeaderBtn}>✕</button>
        </div>
      </div>
      <div style={chatStyles.orderBanner}>
        <span>🍽️</span>
        <span style={chatStyles.orderBannerText}>
          {chat.requester_email === currentUser
            ? `${otherUserName} is delivering your order`
            : `You're delivering to ${otherUserName}`}
        </span>
      </div>
      <div style={chatStyles.messagesContainer}>
        {messages.length === 0 ? (
          <div style={chatStyles.emptyMessages}>
            <span style={{ fontSize: '32px' }}>👋</span>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_email === currentUser;
            return (
              <div key={msg.id || i} style={{ ...chatStyles.messageRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                {!isMe && <div style={chatStyles.messageAvatar}>{otherUserName[0].toUpperCase()}</div>}
                <div style={{ ...chatStyles.messageBubble, ...(isMe ? chatStyles.messageBubbleMine : chatStyles.messageBubbleTheirs) }}>
                  <p style={chatStyles.messageText}>{msg.content}</p>
                  <span style={{ ...chatStyles.messageTime, color: isMe ? 'rgba(255,255,255,0.65)' : '#9CA3AF' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} style={chatStyles.inputContainer}>
        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." style={chatStyles.messageInput} />
        <button type="submit" disabled={!newMessage.trim()} style={{ ...chatStyles.sendButton, opacity: newMessage.trim() ? 1 : 0.5 }}>➤</button>
      </form>
    </div>
  );
}

// ============================================
// VERIFICATION CODE INPUT
// ============================================
function VerificationCodeInput({ length = 6, value, onChange, disabled }) {
  const inputRefs = useRef([]);
  const digits = value.split('').concat(Array(length - value.length).fill(''));

  const handleChange = (i, e) => {
    const d = e.target.value.replace(/\D/g, '').slice(-1);
    const newD = [...digits];
    newD[i] = d;
    onChange(newD.join('').slice(0, length));
    if (d && i < length - 1) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  return (
    <div style={styles.codeInputContainer}>
      {Array(length).fill(0).map((_, i) => (
        <input
          key={i}
          ref={el => inputRefs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          style={{ ...styles.codeInput, ...(digits[i] ? styles.codeInputFilled : {}) }}
        />
      ))}
    </div>
  );
}

// ============================================
// LANDING PAGE STYLES
// ============================================
const ls = {
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
    padding: '16px 32px',
    background: 'rgba(1,31,91,0.92)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)'
  },
  navInner: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navLogo: { fontSize: '22px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' },
  navLoginBtn: {
    padding: '10px 22px', fontSize: '14px', fontWeight: '700',
    color: '#011F5B', backgroundColor: 'white',
    border: 'none', borderRadius: '10px', cursor: 'pointer',
    letterSpacing: '-0.2px'
  },

  hero: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(rgba(1,31,91,0.82), rgba(1,31,91,0.82)), url("https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&w=1400&q=80")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '120px 24px 100px',
    position: 'relative', overflow: 'hidden'
  },
  heroInner: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', maxWidth: '820px', width: '100%', zIndex: 1, gap: '0px'
  },
  heroH1: {
    fontSize: '68px', fontWeight: '800', color: 'white',
    lineHeight: 1.05, letterSpacing: '-2px', margin: '0 0 24px'
  },
  heroSub: {
    fontSize: '20px', color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.65, margin: '0 0 40px', maxWidth: '520px'
  },
  heroBtns: { display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '56px', flexWrap: 'wrap' },
  heroCtaFill: {
    padding: '16px 32px', fontSize: '16px', fontWeight: '700',
    color: 'white', background: '#011F5B',
    border: '2px solid rgba(255,255,255,0.25)',
    borderRadius: '12px', cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
  },
  heroCtaOutline: {
    padding: '16px 32px', fontSize: '16px', fontWeight: '700',
    color: 'white', background: 'transparent',
    border: '2px solid rgba(255,255,255,0.4)',
    borderRadius: '12px', cursor: 'pointer'
  },

  bidBoard: {
    width: '100%', maxWidth: '420px',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '20px', overflow: 'hidden',
    margin: '0 auto'
  },
  bidBoardHeader: {
    padding: '14px 20px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    fontSize: '11px', fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: '1.5px', textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', gap: '8px'
  },
  bidDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block', animation: 'pd-pulse 1.5s ease-in-out infinite' },
  bidRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  bidRowHot: { backgroundColor: 'rgba(34,197,94,0.08)' },
  bidAmount: { fontSize: '26px', fontWeight: '800', minWidth: '52px' },
  bidDetails: { flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' },
  bidHall: { fontSize: '14px', fontWeight: '600', color: 'white' },
  bidDorm: { fontSize: '12px', color: 'rgba(255,255,255,0.4)' },
  hotBadge: { padding: '4px 10px', backgroundColor: 'rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' },
  bidBoardFooter: { padding: '12px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontStyle: 'italic' },

  scrollIndicator: { position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', animation: 'pd-bounce 2s ease-in-out infinite' },
  scrollText: { fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '600', color: 'rgba(255,255,255,0.3)' },
  scrollArrow: { fontSize: '18px', color: 'rgba(255,255,255,0.3)' },

  sectionLight: { padding: '100px 24px', backgroundColor: 'white' },
  sectionDark: { padding: '100px 24px', backgroundColor: '#011F5B' },
  sectionGray: { padding: '100px 24px', backgroundColor: '#F1F5F9' },
  sectionInner: { maxWidth: '1100px', margin: '0 auto' },
  sectionLabel: { display: 'inline-block', padding: '5px 14px', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '20px', fontSize: '11px', fontWeight: '700', marginBottom: '20px', letterSpacing: '0.8px', textTransform: 'uppercase' },
  sectionLabelLight: { display: 'inline-block', padding: '5px 14px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: '20px', fontSize: '11px', fontWeight: '700', marginBottom: '20px', letterSpacing: '0.8px', textTransform: 'uppercase' },
  sectionH2: { fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '800', color: '#111827', lineHeight: 1.15, margin: '0 0 16px', letterSpacing: '-0.5px' },
  sectionSub: { fontSize: '18px', color: '#6B7280', lineHeight: 1.65, margin: '0 0 56px', maxWidth: '560px' },

  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '36px' },
  stepCard: { padding: '32px', backgroundColor: '#F9FAFB', borderRadius: '16px', border: '1px solid #E5E7EB' },
  stepCardDark: { padding: '32px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.09)' },
  stepNum: { fontSize: '13px', fontWeight: '800', color: '#D1D5DB', letterSpacing: '2px', marginBottom: '16px' },
  stepNumDark: { fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px', marginBottom: '16px' },
  stepTitle: { fontSize: '19px', fontWeight: '700', color: '#111827', margin: '0 0 10px' },
  stepDesc: { fontSize: '15px', color: '#6B7280', lineHeight: 1.65, margin: 0 },

  calloutBox: { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '20px 24px', backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '12px', fontSize: '15px', color: '#713f12', lineHeight: 1.55 },
  calloutIcon: { fontSize: '20px', flexShrink: 0, marginTop: '2px' },
  earningCallout: { padding: '24px 28px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px' },
  earningLabel: { fontSize: '11px', fontWeight: '800', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block', marginBottom: '8px' },
  earningText: { fontSize: '18px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 },

  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '48px' },
  featureCard: { padding: '32px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  featureIcon: { fontSize: '32px', display: 'block', marginBottom: '18px' },
  featureTitle: { fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 10px' },
  featureDesc: { fontSize: '15px', color: '#6B7280', lineHeight: 1.65, margin: 0 },

  ctaSection: { padding: '120px 24px', background: 'linear-gradient(150deg, #011F5B 0%, #000d2e 100%)', textAlign: 'center' },
  ctaContent: { maxWidth: '620px', margin: '0 auto' },
  ctaH2: { fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: '800', color: 'white', lineHeight: 1.15, letterSpacing: '-0.5px', margin: '0 0 20px' },
  ctaSub: { fontSize: '18px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: '0 0 40px' },
  ctaButton: {
    padding: '18px 44px', fontSize: '18px', fontWeight: '700',
    color: 'white', background: 'linear-gradient(135deg, #990000, #c41e3a)',
    border: 'none', borderRadius: '14px', cursor: 'pointer',
    boxShadow: '0 8px 32px rgba(153,0,0,0.4)'
  },
  ctaNote: { marginTop: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2px' },
};

// ============================================
// LANDING PAGE COMPONENT
// ============================================
function LandingPage({ onGetStarted }) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('pd-visible'); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.pd-animate').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const BIDS = [
    { amount: 14, hall: 'Houston Market',  dorm: 'Hill College House',     hot: true  },
    { amount: 9,  hall: 'Pret A Manger',   dorm: 'Rodin College House',    hot: false },
    { amount: 5,  hall: "Joe's Café",       dorm: 'Harrison College House', hot: false },
  ];

  const REQUESTER_STEPS = [
    { num: '01', title: 'Pick your spot',   desc: 'Choose a dining hall and where on campus you want the order dropped off.' },
    { num: '02', title: 'Set your bid',     desc: "Name your price. Higher bids get claimed first — it's a live marketplace. Think of it like tipping upfront." },
    { num: '03', title: 'Get it delivered', desc: 'A fellow student claims your order, grabs the food, and delivers it. Chat in-app to coordinate.' },
  ];

  const DELIVERER_STEPS = [
    { num: '01', title: 'Browse open orders',  desc: "See all open delivery requests sorted by bid amount. Filter by dining hall to find orders near where you're heading." },
    { num: '02', title: 'Claim what pays',     desc: "Pick the orders worth your time. You're in control — no minimums, no commitment, no routes assigned to you." },
    { num: '03', title: 'Get paid instantly',  desc: 'Connect your bank via Stripe. 95% of the bid amount goes straight to you. We take a 5% platform fee.' },
  ];

  const FEATURES = [
    { icon: '🎓', title: 'Penn Email Only',        desc: 'Login is gated to verified .edu addresses. Every person on the platform is a real Penn student.' },
    { icon: '🔒', title: 'Secure Payments',        desc: 'Payments are processed by Stripe — the same infrastructure used by Amazon and Shopify. Your card data never touches our servers.' },
    { icon: '💬', title: 'Built-in Chat',          desc: 'Every order opens a private chat between requester and deliverer. Coordinate delivery details in real time.' },
    { icon: '⚡', title: 'Bid-Based Marketplace',  desc: 'No fixed delivery fee. The bid is the fee. Higher bids attract faster delivery — the market self-regulates.' },
  ];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={ls.nav}>
        <div style={ls.navInner}>
          <div style={ls.navLogo}>🍽️ PennDash</div>
          <button onClick={onGetStarted} style={ls.navLoginBtn}>Log In →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={ls.hero}>
        <div style={ls.heroInner}>
          <h1 className="pd-animate" style={ls.heroH1}>
            Campus Food, Delivered<br />by Penn Students
          </h1>
          <p className="pd-animate pd-delay-1" style={ls.heroSub}>
            Post your order from any Penn dining hall. Set your bid. A fellow Quaker delivers it.
          </p>
          <div className="pd-animate pd-delay-2" style={ls.heroBtns}>
            <button onClick={onGetStarted} style={ls.heroCtaFill}>Get Food Delivered</button>
            <button onClick={onGetStarted} style={ls.heroCtaOutline}>Start Earning</button>
          </div>

          {/* Live bid board */}
          <div className="pd-animate pd-delay-3" style={ls.bidBoard}>
            <div style={ls.bidBoardHeader}>
              <span style={ls.bidDot}></span>
              Live Bids
            </div>
            {BIDS.map((o, i) => (
              <div key={i} style={{ ...ls.bidRow, ...(o.hot ? ls.bidRowHot : {}) }}>
                <span style={{ ...ls.bidAmount, color: o.hot ? '#22c55e' : '#9CA3AF' }}>${o.amount}</span>
                <div style={ls.bidDetails}>
                  <span style={ls.bidHall}>{o.hall}</span>
                  <span style={ls.bidDorm}>→ {o.dorm}</span>
                </div>
                {o.hot && <span style={ls.hotBadge}>⚡ Top Bid</span>}
              </div>
            ))}
            <div style={ls.bidBoardFooter}>Higher bid = picked up faster</div>
          </div>
        </div>

        <div style={ls.scrollIndicator}>
          <span style={ls.scrollText}>Scroll to learn more</span>
          <span style={ls.scrollArrow}>↓</span>
        </div>
      </section>

      {/* ── HOW IT WORKS: REQUESTER ── */}
      <section style={ls.sectionLight}>
        <div style={ls.sectionInner}>
          <div className="pd-animate" style={ls.sectionLabel}>For Requesters</div>
          <h2 className="pd-animate" style={ls.sectionH2}>Getting food has never been easier</h2>
          <p className="pd-animate" style={ls.sectionSub}>
            No app downloads. No subscriptions. Just post your order and let the marketplace work.
          </p>
          <div style={ls.stepsGrid}>
            {REQUESTER_STEPS.map((s, i) => (
              <div key={i} className={`pd-animate pd-delay-${i + 1}`} style={ls.stepCard}>
                <div style={ls.stepNum}>{s.num}</div>
                <h3 style={ls.stepTitle}>{s.title}</h3>
                <p style={ls.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="pd-animate" style={ls.calloutBox}>
            <span style={ls.calloutIcon}>💡</span>
            <span>
              <strong>Higher bid = faster pickup</strong> — it's a live marketplace. Orders are sorted by bid amount — a $14 bid rises to the top of the list.
            </span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS: DELIVERER ── */}
      <section style={ls.sectionDark}>
        <div style={ls.sectionInner}>
          <div className="pd-animate" style={ls.sectionLabelLight}>For Deliverers</div>
          <h2 className="pd-animate" style={{ ...ls.sectionH2, color: 'white' }}>Earn money on every campus run</h2>
          <p className="pd-animate" style={{ ...ls.sectionSub, color: 'rgba(255,255,255,0.6)' }}>
            Already heading to Houston? Pick up an order on the way and earn real money doing it.
          </p>
          <div style={ls.stepsGrid}>
            {DELIVERER_STEPS.map((s, i) => (
              <div key={i} className={`pd-animate pd-delay-${i + 1}`} style={ls.stepCardDark}>
                <div style={ls.stepNumDark}>{s.num}</div>
                <h3 style={{ ...ls.stepTitle, color: 'white' }}>{s.title}</h3>
                <p style={{ ...ls.stepDesc, color: 'rgba(255,255,255,0.55)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="pd-animate" style={ls.earningCallout}>
            <span style={ls.earningLabel}>Example earnings</span>
            <span style={ls.earningText}>
              3 deliveries × $10 avg bid = <strong style={{ color: '#22c55e' }}>$28.50 straight to your bank</strong>
            </span>
          </div>
        </div>
      </section>

      {/* ── WHY PENNDASH ── */}
      <section style={ls.sectionGray}>
        <div style={ls.sectionInner}>
          <div className="pd-animate" style={ls.sectionLabel}>Why PennDash</div>
          <h2 className="pd-animate" style={ls.sectionH2}>Why Penn students love PennDash</h2>
          <div style={ls.featuresGrid}>
            {FEATURES.map((f, i) => (
              <div key={i} className={`pd-animate pd-delay-${(i % 2) + 1}`} style={ls.featureCard}>
                <span style={ls.featureIcon}>{f.icon}</span>
                <h3 style={ls.featureTitle}>{f.title}</h3>
                <p style={ls.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={ls.ctaSection}>
        <div className="pd-animate" style={ls.ctaContent}>
          <h2 style={ls.ctaH2}>Ready to get started?</h2>
          <p style={ls.ctaSub}>
            Join Penn students already using PennDash to get food delivered — and to earn money while doing it.
          </p>
          <button onClick={onGetStarted} style={ls.ctaButton}>
            Log In with Penn Email →
          </button>
          <p style={ls.ctaNote}>Free to join · Penn email required · Payments via Stripe</p>
        </div>
      </section>

    </div>
  );
}

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function PennDash() {
  const [currentView, setCurrentView] = useState('home');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState('');
  const [orders, setOrders] = useState([]);
  const [newOrder, setNewOrder] = useState({ amount: '', diningHall: '', dorm: '', details: '', deliveryTime: 'ASAP' });
  const [sortBy, setSortBy] = useState('amount');
  const [sortDir, setSortDir] = useState('desc');
  const [showSuccess, setShowSuccess] = useState(false);
  const [chats, setChats] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [minimizedChats, setMinimizedChats] = useState([]);
  const [chatMessages, setChatMessages] = useState({});

  // Stripe state
  const [stripeStatus, setStripeStatus] = useState({ connected: false, canReceivePayments: false });
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);

  // Toast notification (3-second auto-dismiss)
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // New dashboard state
  const [activeTab, setActiveTab] = useState('discover');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => { checkExistingSession(); }, []);

  useEffect(() => {
    // Check for Stripe redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success')) {
      window.history.replaceState({}, '', window.location.pathname);
      loadStripeStatus();
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadChats();
      loadStripeStatus();
      const interval = setInterval(() => {
        loadChats();
        loadOrders();
        openChats.forEach(id => loadMessages(id));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user, openChats]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const loadStripeStatus = async () => {
    try {
      const status = await stripeService.getAccountStatus();
      setStripeStatus(status);
    } catch (err) {
      console.error('Failed to load Stripe status:', err);
    }
  };

  const checkExistingSession = async () => {
    const s = authService.getSession();
    if (s?.token) {
      try {
        const r = await authService.verifySession(s.token);
        if (r.valid && r.user) {
          setUser(r.user);
          setCurrentView('dashboard');
        } else {
          authService.clearSession();
        }
      } catch {
        authService.clearSession();
      }
    }
    setInitialLoading(false);
  };

  const validateEmail = (e) => e.toLowerCase().endsWith('.upenn.edu') || e.toLowerCase().endsWith('@upenn.edu');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDevCode('');
    if (!validateEmail(email)) {
      setError('Please use a valid Penn email');
      return;
    }
    setLoading(true);
    try {
      const r = await authService.sendCode(email.toLowerCase().trim());
      if (r.success) {
        setCurrentView('verify');
        setCountdown(60);
        if (r.devCode) setDevCode(r.devCode);
      } else {
        setError(r.error || 'Failed to send code');
      }
    } catch {
      setError('Connection failed. Is the server running?');
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    if (verificationCode.length !== 6) {
      setError('Enter 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const r = await authService.verifyCode(email.toLowerCase().trim(), verificationCode);
      if (r.success && r.token) {
        authService.saveSession(r.token, r.user);
        setUser(r.user);
        setCurrentView('dashboard');
        setVerificationCode('');
      } else {
        setError(r.error || 'Verification failed');
      }
    } catch {
      setError('Connection failed');
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    setError('');
    setDevCode('');
    setLoading(true);
    try {
      const r = await authService.sendCode(email.toLowerCase().trim());
      if (r.success) {
        setCountdown(60);
        setVerificationCode('');
        if (r.devCode) setDevCode(r.devCode);
      } else {
        setError(r.error);
      }
    } catch {
      setError('Connection failed');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    authService.clearSession();
    setUser(null);
    setEmail('');
    setVerificationCode('');
    setCurrentView('home');
    setChats([]);
    setOpenChats([]);
    setStripeStatus({ connected: false, canReceivePayments: false });
  };

  const loadOrders = async () => {
    const { data } = await supabase.from('orders').select('*');
    if (data) setOrders(data);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setOrderError('');
    setError('');
    if (!newOrder.amount || !newOrder.diningHall || !newOrder.dorm) {
      setOrderError('Fill all required fields');
      return;
    }
    const amt = parseFloat(newOrder.amount);
    if (isNaN(amt) || amt <= 0) {
      setOrderError('Invalid amount');
      return;
    }
    setLoading(true);
    const { error: insertErr } = await supabase.from('orders').insert([{
      user_email: user.email,
      amount: amt,
      dining_hall: newOrder.diningHall,
      dorm: newOrder.dorm,
      details: newOrder.details,
      delivery_time: newOrder.deliveryTime,
      status: 'open',
      payment_status: 'pending',
      created_at: new Date().toISOString()
    }]);
    setLoading(false);
    if (insertErr) {
      setOrderError('Failed to post order');
      return;
    }
    setNewOrder({ amount: '', diningHall: '', dorm: '', details: '', deliveryTime: 'ASAP' });
    setShowOrderModal(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    loadOrders();
  };

  const handleCancelOrder = async (id) => {
    await supabase.from('orders').delete().eq('id', id);
    loadOrders();
  };

  const handleClaimOrder = async (order) => {
    // Check if user has Stripe set up
    if (!stripeStatus.canReceivePayments) {
      setShowStripeSetup(true);
      return;
    }

    const { error: claimErr } = await supabase.from('orders').update({ status: 'claimed', claimed_by: user.email }).eq('id', order.id);
    if (claimErr) {
      showToast('Failed to claim order — please try again.');
      return;
    }

    const { data: newChat, error: chatError } = await supabase.from('chats').insert([{
      order_id: order.id,
      requester_email: order.user_email,
      deliverer_email: user.email,
      order_amount: order.amount,
      dining_hall: order.dining_hall,
      dorm: order.dorm,
      created_at: new Date().toISOString(),
      status: 'active'
    }]);

    if (chatError) showToast('Order claimed but chat failed to open. Refresh the page.');

    if (newChat?.[0]) {
      setOpenChats(p => [...p, newChat[0].id]);
      loadChats();
    }
    loadOrders();
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      const token = authService.getToken();
      const r = await fetch(`${API_URL}/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await r.json();
      if (!r.ok) {
        showToast(result.error || 'Failed to mark as delivered.');
        return;
      }
      showToast('Order marked as delivered!');
      loadOrders();
    } catch {
      showToast('Connection error — please try again.');
    }
  };

  const handlePayOrder = (order) => {
    setSelectedOrderForPayment(order);
    setShowPaymentModal(true);
  };

  const handleOpenStripeDashboard = async () => {
    const result = await stripeService.getDashboardLink();
    if (result.url) {
      window.open(result.url, '_blank');
    }
  };

  const loadChats = async () => {
    const { data } = await supabase.from('chats').selectOr('*', [
      `requester_email.eq.${user.email}`,
      `deliverer_email.eq.${user.email}`
    ]);
    if (data) setChats(data.filter(c => c.status === 'active'));
  };

  const loadMessages = async (chatId) => {
    const { data } = await supabase.from('messages').selectWhere('*', { chat_id: chatId });
    if (data) {
      setChatMessages(p => ({
        ...p,
        [chatId]: data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      }));
    }
  };

  const handleSendMessage = async (chatId, content) => {
    const msg = {
      chat_id: chatId,
      sender_email: user.email,
      content,
      created_at: new Date().toISOString()
    };
    setChatMessages(p => ({
      ...p,
      [chatId]: [...(p[chatId] || []), { ...msg, id: 'temp-' + Date.now() }]
    }));
    await supabase.from('messages').insert([msg]);
    loadMessages(chatId);
  };

  const handleOpenChat = (chatId) => {
    if (!openChats.includes(chatId)) {
      setOpenChats(p => [...p, chatId]);
      loadMessages(chatId);
    }
    setMinimizedChats(p => p.filter(id => id !== chatId));
  };

  const handleCloseChat = (chatId) => {
    setOpenChats(p => p.filter(id => id !== chatId));
    setMinimizedChats(p => p.filter(id => id !== chatId));
  };

  const handleMinimizeChat = (chatId) => {
    setMinimizedChats(p => p.includes(chatId) ? p.filter(id => id !== chatId) : [...p, chatId]);
  };

  const formatTime = (d) => {
    const diff = Math.floor((new Date() - new Date(d)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(d).toLocaleDateString();
  };

  const getTimeMinutes = (timeValue) => {
    const found = DELIVERY_TIMES.find(t => t.value === timeValue);
    return found ? found.minutes : 0;
  };

  const getDeliveryByTime = (createdAt, deliveryTime) => {
    const orderDate = new Date(createdAt);
    const minutes = getTimeMinutes(deliveryTime);
    if (minutes === 0) return 'ASAP';
    const deliveryDate = new Date(orderDate.getTime() + minutes * 60000);
    return deliveryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ============================================
  // RENDER: HOME (Landing Page)
  // ============================================
  if (currentView === 'home' && !initialLoading) {
    return <LandingPage onGetStarted={() => setCurrentView('login')} />;
  }

  // ============================================
  // RENDER: LOADING
  // ============================================
  if (initialLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <p style={{ color: '#6B7280', fontSize: '15px' }}>Loading PennDash...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: LOGIN (split-screen)
  // ============================================
  if (currentView === 'login') {
    return (
      <div style={styles.splitScreen}>
        {/* Left panel */}
        <div style={styles.splitLeft}>
          <div style={styles.splitLeftContent}>
            <div style={styles.splitLeftLogo}>
              <span style={{ fontSize: '52px', display: 'block', marginBottom: '16px' }}>🍽️</span>
              <div style={styles.splitLeftBrand}>PennDash</div>
              <p style={styles.splitLeftTagline}>The Penn campus delivery marketplace</p>
            </div>
            <div style={styles.splitLeftBullets}>
              <div style={styles.splitLeftBullet}><span style={styles.checkmark}>✓</span> Bid-based delivery pricing</div>
              <div style={styles.splitLeftBullet}><span style={styles.checkmark}>✓</span> Verified Penn students only</div>
              <div style={styles.splitLeftBullet}><span style={styles.checkmark}>✓</span> Secure Stripe payments</div>
            </div>
            <p style={styles.splitLeftFooter}>Built for Quakers, by Quakers</p>
          </div>
        </div>

        {/* Right panel */}
        <div style={styles.splitRight}>
          <div style={styles.splitRightInner}>
            <button onClick={() => setCurrentView('home')} style={styles.backBtn}>← Back</button>
            <h1 style={styles.authHeading}>Welcome back</h1>
            <p style={styles.authSubheading}>Enter your Penn email to continue</p>
            <form onSubmit={handleEmailSubmit} style={styles.authForm}>
              <div style={styles.authInputGroup}>
                <label style={styles.authLabel}>Penn Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pennkey@seas.upenn.edu"
                  style={styles.authInput}
                  disabled={loading}
                  autoFocus
                />
              </div>
              {error && <p style={styles.authError}>{error}</p>}
              <button type="submit" style={styles.authBtn} disabled={loading}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
            <p style={styles.authSecure}>🔒 Secure Penn email verification</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: VERIFY (split-screen)
  // ============================================
  if (currentView === 'verify') {
    return (
      <div style={styles.splitScreen}>
        {/* Left panel */}
        <div style={styles.splitLeft}>
          <div style={styles.splitLeftContent}>
            <div style={styles.splitLeftLogo}>
              <span style={{ fontSize: '52px', display: 'block', marginBottom: '16px' }}>🍽️</span>
              <div style={styles.splitLeftBrand}>PennDash</div>
              <p style={styles.splitLeftTagline}>The Penn campus delivery marketplace</p>
            </div>
            <div style={styles.splitLeftBullets}>
              <div style={styles.splitLeftBullet}><span style={styles.checkmark}>✓</span> Bid-based delivery pricing</div>
              <div style={styles.splitLeftBullet}><span style={styles.checkmark}>✓</span> Verified Penn students only</div>
              <div style={styles.splitLeftBullet}><span style={styles.checkmark}>✓</span> Secure Stripe payments</div>
            </div>
            <p style={styles.splitLeftFooter}>Built for Quakers, by Quakers</p>
          </div>
        </div>

        {/* Right panel */}
        <div style={styles.splitRight}>
          <div style={styles.splitRightInner}>
            <button onClick={() => { setCurrentView('login'); setError(''); }} style={styles.backBtn}>← Back</button>
            <h1 style={styles.authHeading}>Check your inbox</h1>
            <p style={styles.authSubheading}>We sent a 6-digit code to <strong>{email}</strong></p>
            <form onSubmit={handleVerifyCode} style={styles.authForm}>
              <VerificationCodeInput value={verificationCode} onChange={setVerificationCode} disabled={loading} />
              {error && <p style={styles.authError}>{error}</p>}
              {devCode && (
                <div style={styles.devModeBox}>
                  <p>🧪 Dev code: <strong>{devCode}</strong></p>
                </div>
              )}
              <button type="submit" style={{ ...styles.authBtn, opacity: verificationCode.length !== 6 ? 0.6 : 1 }} disabled={loading || verificationCode.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
            <div style={styles.verifyLinks}>
              <button onClick={handleResendCode} disabled={countdown > 0} style={{ ...styles.linkButton, opacity: countdown > 0 ? 0.5 : 1 }}>
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
              </button>
              <span style={{ color: '#D1D5DB' }}>·</span>
              <button onClick={() => { setCurrentView('login'); setError(''); }} style={styles.linkButton}>
                Use different email
              </button>
            </div>
            <p style={styles.authSecure}>🔒 Secure Penn email verification</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: DASHBOARD
  // ============================================
  const openOrders = orders.filter(o => o.status === 'open').sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'amount') comparison = (b.amount || 0) - (a.amount || 0);
    else if (sortBy === 'time') comparison = getTimeMinutes(a.delivery_time) - getTimeMinutes(b.delivery_time);
    else if (sortBy === 'created_at') comparison = new Date(b.created_at) - new Date(a.created_at);
    return sortDir === 'desc' ? comparison : -comparison;
  });

  const myOrders = orders.filter(o => o.user_email === user.email);
  const claimedOrders = orders.filter(o => o.claimed_by === user.email);

  const myOpenOrders = myOrders.filter(o => o.status === 'open');
  const myAwaitingPayment = myOrders.filter(o => o.status === 'claimed' && o.payment_status !== 'paid');
  const myAwaitingDelivery = myOrders.filter(o => o.payment_status === 'paid' && o.status !== 'delivered');
  const deliveringOrders = claimedOrders.filter(o => o.status !== 'delivered');

  const firstName = user.email.split('@')[0];
  const userInitial = firstName[0].toUpperCase();

  const myOrdersCount = myOpenOrders.length + myAwaitingPayment.length + myAwaitingDelivery.length;
  const deliveringCount = deliveringOrders.length;
  const messagesCount = chats.length;

  return (
    <div style={styles.dashboardContainer}>
      {/* Toast notification */}
      {toast && <div style={styles.toast}>{toast}</div>}
      {showSuccess && <div style={{ ...styles.toast, backgroundColor: '#059669' }}>Order posted successfully!</div>}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          {/* Logo */}
          <div style={styles.headerLogo}>
            <span style={{ fontSize: '22px' }}>🍽️</span>
            <span style={styles.logoTextSmall}>PennDash</span>
          </div>

          {/* Tab bar */}
          <nav style={styles.tabBar}>
            {[
              { key: 'discover', label: 'Discover', badge: openOrders.length > 0 ? openOrders.length : null },
              { key: 'my-orders', label: 'My Orders', badge: myOrdersCount > 0 ? myOrdersCount : null },
              { key: 'delivering', label: 'Delivering', badge: deliveringCount > 0 ? deliveringCount : null },
              { key: 'messages', label: 'Messages', badge: messagesCount > 0 ? messagesCount : null },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{ ...styles.tabBtn, ...(activeTab === tab.key ? styles.tabBtnActive : {}) }}
              >
                {tab.label}
                {tab.badge && (
                  <span style={{ ...styles.tabBadge, ...(activeTab === tab.key ? styles.tabBadgeActive : {}) }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div style={styles.headerRight}>
            <span style={styles.headerName}>{firstName}</span>
            {stripeStatus.canReceivePayments ? (
              <button onClick={handleOpenStripeDashboard} style={styles.earningsBtn}>
                Earnings
              </button>
            ) : (
              <button onClick={() => setShowStripeSetup(true)} style={styles.setupBtn}>
                Set Up Payments
              </button>
            )}
            <div style={styles.avatarCircle} title={user.email} onClick={handleLogout}>
              {userInitial}
            </div>
          </div>
        </div>
      </header>

      <main style={styles.main}>

        {/* ── DISCOVER TAB ── */}
        {activeTab === 'discover' && (
          <div>
            {/* Sort bar */}
            <div style={styles.sortBar}>
              <div style={styles.sortGroup}>
                <span style={styles.sortLabel}>Sort by</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.sortSelect}>
                  <option value="amount">Amount ($)</option>
                  <option value="time">Delivery Time</option>
                  <option value="created_at">Date Posted</option>
                </select>
              </div>
              <div style={styles.sortGroup}>
                <span style={styles.sortLabel}>Order</span>
                <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} style={styles.sortSelect}>
                  <option value="desc">{sortBy === 'time' ? 'Urgent First' : 'High to Low'}</option>
                  <option value="asc">{sortBy === 'time' ? 'Flexible First' : 'Low to High'}</option>
                </select>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#9CA3AF', fontWeight: '500' }}>
                {openOrders.length} open {openOrders.length === 1 ? 'order' : 'orders'}
              </span>
            </div>

            {openOrders.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>🍔</span>
                <p style={styles.emptyTitle}>No orders yet</p>
                <p style={styles.emptyDesc}>Be the first to post one!</p>
              </div>
            ) : (
              <div style={styles.ordersGrid}>
                {openOrders.map(order => {
                  const isOwn = order.user_email === user.email;
                  const timeBadge = order.delivery_time === 'ASAP' ? 'ASAP' : order.delivery_time;
                  return (
                    <div key={order.id} style={styles.orderCard}>
                      <div style={styles.orderCardTop}>
                        <div style={styles.orderHall}>
                          <span style={{ marginRight: '6px' }}>🏪</span>
                          {order.dining_hall}
                        </div>
                        <span style={{
                          ...styles.timeBadge,
                          backgroundColor: order.delivery_time === 'ASAP' ? '#FEF3C7' : '#EFF6FF',
                          color: order.delivery_time === 'ASAP' ? '#92400E' : '#1D4ED8'
                        }}>
                          {timeBadge}
                        </span>
                      </div>

                      <div style={styles.orderAmount}>${order.amount?.toFixed(2)}</div>

                      <div style={styles.orderRoute}>
                        <span style={{ fontSize: '14px' }}>📍</span>
                        <span style={styles.orderRouteText}>→ {order.dorm}</span>
                      </div>

                      {order.details && (
                        <p style={styles.orderNotes}>"{order.details}"</p>
                      )}

                      <div style={styles.orderCardFooter}>
                        <span style={styles.orderTime}>{formatTime(order.created_at)}</span>
                      </div>

                      <div style={styles.orderDivider} />

                      {isOwn ? (
                        <button onClick={() => handleCancelOrder(order.id)} style={styles.cancelButton}>
                          Cancel Order
                        </button>
                      ) : (
                        <button onClick={() => handleClaimOrder(order)} style={styles.claimButton}>
                          {stripeStatus.canReceivePayments ? 'Claim & Deliver →' : '⚡ Set Up to Claim'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MY ORDERS TAB ── */}
        {activeTab === 'my-orders' && (
          <div style={styles.tabContent}>
            {myOpenOrders.length > 0 && (
              <div style={styles.subSection}>
                <h2 style={styles.subSectionTitle}>Open Orders</h2>
                <div style={styles.activityList}>
                  {myOpenOrders.map(order => (
                    <div key={order.id} style={styles.activityItem}>
                      <div style={styles.activityInfo}>
                        <div style={styles.activityIcon}>🏪</div>
                        <div>
                          <div style={styles.activityMain}>${order.amount?.toFixed(2)} · {order.dining_hall}</div>
                          <div style={styles.activitySub}>→ {order.dorm} · {formatTime(order.created_at)}</div>
                        </div>
                      </div>
                      <button onClick={() => handleCancelOrder(order.id)} style={styles.cancelBtnSmall}>Cancel</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myAwaitingPayment.length > 0 && (
              <div style={styles.subSection}>
                <h2 style={styles.subSectionTitle}>Awaiting Payment</h2>
                <div style={styles.activityList}>
                  {myAwaitingPayment.map(order => (
                    <div key={order.id} style={styles.activityItem}>
                      <div style={styles.activityInfo}>
                        <div style={styles.activityIcon}>💳</div>
                        <div>
                          <div style={styles.activityMain}>${order.amount?.toFixed(2)} · {order.dining_hall}</div>
                          <div style={styles.activitySub}>Claimed by {order.claimed_by?.split('@')[0]}</div>
                        </div>
                      </div>
                      <button onClick={() => handlePayOrder(order)} style={styles.payNowButton}>Pay Now</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myAwaitingDelivery.length > 0 && (
              <div style={styles.subSection}>
                <h2 style={styles.subSectionTitle}>Awaiting Delivery</h2>
                <div style={styles.activityList}>
                  {myAwaitingDelivery.map(order => (
                    <div key={order.id} style={styles.activityItem}>
                      <div style={styles.activityInfo}>
                        <div style={styles.activityIcon}>📦</div>
                        <div>
                          <div style={styles.activityMain}>${order.amount?.toFixed(2)} · {order.dining_hall}</div>
                          <div style={styles.activitySub}>Delivery by {order.claimed_by?.split('@')[0]}</div>
                        </div>
                      </div>
                      <button onClick={() => handleMarkDelivered(order.id)} style={styles.confirmButton}>
                        Confirm Received
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myOrdersCount === 0 && (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📋</span>
                <p style={styles.emptyTitle}>No orders yet</p>
                <p style={styles.emptyDesc}>Post a delivery request using the button below</p>
              </div>
            )}
          </div>
        )}

        {/* ── DELIVERING TAB ── */}
        {activeTab === 'delivering' && (
          <div style={styles.tabContent}>
            {deliveringOrders.length > 0 ? (
              <div style={styles.activityList}>
                {deliveringOrders.map(order => (
                  <div key={order.id} style={styles.activityItem}>
                    <div style={styles.activityInfo}>
                      <div style={styles.activityIcon}>🚴</div>
                      <div>
                        <div style={styles.activityMain}>${order.amount?.toFixed(2)} · {order.dining_hall} → {order.dorm}</div>
                        {order.payment_status === 'paid' ? (
                          <div style={{ ...styles.activitySub, color: '#059669' }}>Paid — ready to deliver</div>
                        ) : (
                          <div style={{ ...styles.activitySub, color: '#D97706' }}>Waiting for payment</div>
                        )}
                      </div>
                    </div>
                    {order.payment_status === 'paid' ? (
                      <button onClick={() => handleMarkDelivered(order.id)} style={styles.deliveredButton}>
                        Mark Delivered
                      </button>
                    ) : (
                      <span style={styles.waitingChip}>Awaiting payment</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>🚴</span>
                <p style={styles.emptyTitle}>No active deliveries</p>
                <p style={styles.emptyDesc}>Go to Discover to claim an order</p>
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {activeTab === 'messages' && (
          <div style={styles.tabContent}>
            {chats.length > 0 ? (
              <div style={styles.activityList}>
                {chats.map(chat => {
                  const other = chat.requester_email === user.email ? chat.deliverer_email : chat.requester_email;
                  const otherName = other.split('@')[0];
                  return (
                    <div key={chat.id} style={styles.activityItem}>
                      <div style={styles.activityInfo}>
                        <div style={chatStyles.chatListAvatar}>{otherName[0].toUpperCase()}</div>
                        <div>
                          <div style={styles.activityMain}>{otherName}</div>
                          <div style={styles.activitySub}>${chat.order_amount?.toFixed(2)} · {chat.dining_hall}</div>
                        </div>
                      </div>
                      <button onClick={() => handleOpenChat(chat.id)} style={styles.openChatBtn}>Open Chat</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>💬</span>
                <p style={styles.emptyTitle}>No active chats</p>
                <p style={styles.emptyDesc}>Chats open automatically when an order is claimed</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Post Order button */}
      <button
        style={styles.fabButton}
        onClick={() => { setShowOrderModal(true); setOrderError(''); }}
      >
        <span style={{ fontSize: '22px', lineHeight: 1 }}>+</span>
        <span style={{ fontSize: '14px', fontWeight: '700' }}>Post Order</span>
      </button>

      {/* Order Form Modal */}
      {showOrderModal && (
        <div style={modalStyles.overlay} onClick={() => setShowOrderModal(false)}>
          <div style={{ ...modalStyles.modal, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <h2 style={modalStyles.title}>Post a Delivery Request</h2>
              <button onClick={() => setShowOrderModal(false)} style={modalStyles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleOrderSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={styles.modalFieldRow}>
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Bid Amount *</label>
                  <div style={styles.amountInputWrap}>
                    <span style={styles.amountPrefix}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newOrder.amount}
                      onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                      placeholder="0.00"
                      style={styles.amountInput}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Dining Hall *</label>
                <select
                  value={newOrder.diningHall}
                  onChange={(e) => setNewOrder({ ...newOrder, diningHall: e.target.value })}
                  style={styles.modalSelect}
                >
                  <option value="">Select a dining hall...</option>
                  {DINING_HALLS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Deliver To *</label>
                <select
                  value={newOrder.dorm}
                  onChange={(e) => setNewOrder({ ...newOrder, dorm: e.target.value })}
                  style={styles.modalSelect}
                >
                  <option value="">Select a dorm...</option>
                  {DORMS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Delivery Time *</label>
                <select
                  value={newOrder.deliveryTime}
                  onChange={(e) => setNewOrder({ ...newOrder, deliveryTime: e.target.value })}
                  style={styles.modalSelect}
                >
                  {DELIVERY_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Order Details (Optional)</label>
                <textarea
                  value={newOrder.details}
                  onChange={(e) => setNewOrder({ ...newOrder, details: e.target.value })}
                  placeholder="e.g., 2 sandwiches and a drink, room 305..."
                  style={styles.modalTextarea}
                />
              </div>

              {orderError && <p style={styles.modalError}>{orderError}</p>}

              <div style={{ padding: '12px 16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '13px', color: '#92400E' }}>
                💡 Higher bids get picked up faster
              </div>

              <button type="submit" style={styles.modalSubmitBtn} disabled={loading}>
                {loading ? 'Posting...' : 'Post Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Chat Popups */}
      <div style={chatStyles.chatContainer}>
        {openChats.map((chatId, i) => {
          const chat = chats.find(c => c.id === chatId);
          if (!chat) return null;
          return (
            <div key={chatId} style={{ ...chatStyles.chatWrapper, right: `${20 + i * 340}px` }}>
              <ChatPopup
                chat={chat}
                currentUser={user.email}
                messages={chatMessages[chatId] || []}
                onClose={() => handleCloseChat(chatId)}
                onMinimize={() => handleMinimizeChat(chatId)}
                onSendMessage={handleSendMessage}
                isMinimized={minimizedChats.includes(chatId)}
              />
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showStripeSetup && (
        <StripeSetupModal
          onClose={() => setShowStripeSetup(false)}
          onSetupComplete={() => {
            setShowStripeSetup(false);
            loadStripeStatus();
          }}
        />
      )}

      {showPaymentModal && selectedOrderForPayment && (
        <PaymentModal
          order={selectedOrderForPayment}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedOrderForPayment(null);
          }}
          onPaymentSuccess={() => {
            loadOrders();
          }}
        />
      )}
    </div>
  );
}

// ============================================
// MODAL STYLES
// ============================================
const modalStyles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' },
  modal: { backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 24px', borderBottom: '1px solid #F3F4F6' },
  title: { margin: 0, fontSize: '20px', fontWeight: '700', color: '#111827' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9CA3AF', padding: '4px', lineHeight: 1, borderRadius: '6px' },
  orderSummary: { padding: '20px 24px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  divider: { height: '1px', backgroundColor: '#E5E7EB', margin: '12px 0' },
  cardForm: { padding: '20px 24px' },
  formField: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' },
  input: { width: '100%', padding: '14px 16px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  error: { color: '#DC2626', fontSize: '14px', margin: '0 24px 16px', padding: '12px 16px', backgroundColor: '#FEF2F2', borderRadius: '8px' },
  payButton: { width: 'calc(100% - 48px)', margin: '0 24px 16px', padding: '16px 24px', fontSize: '16px', fontWeight: '600', color: 'white', background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit' },
  secureNote: { textAlign: 'center', color: '#9CA3AF', fontSize: '13px', padding: '0 24px 24px' },
  successContent: { padding: '48px 24px', textAlign: 'center' },
  setupContent: { padding: '24px' },
  benefitsList: { marginBottom: '24px' },
  benefitItem: { padding: '12px 16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '8px', color: '#166534', fontSize: '14px', fontWeight: '500' },
  stripeCardWrapper: { border: '2px solid #E5E7EB', borderRadius: '10px', padding: '14px 16px', backgroundColor: 'white', marginTop: '6px' }
};

// ============================================
// CHAT STYLES
// ============================================
const chatStyles = {
  chatContainer: { position: 'fixed', bottom: 0, right: 0, zIndex: 1000, pointerEvents: 'none' },
  chatWrapper: { position: 'fixed', bottom: 0, pointerEvents: 'auto' },
  chatPopup: { width: '320px', height: '460px', backgroundColor: 'white', borderRadius: '14px 14px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  minimizedChat: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', backgroundColor: '#011F5B', borderRadius: '12px 12px 0 0', cursor: 'pointer', color: 'white', minWidth: '200px' },
  minimizedAvatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700' },
  minimizedName: { fontWeight: '600', fontSize: '14px' },
  chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: '#011F5B', color: 'white' },
  chatHeaderInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  chatAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700' },
  chatHeaderText: { display: 'flex', flexDirection: 'column', gap: '1px' },
  chatHeaderName: { fontWeight: '700', fontSize: '14px' },
  chatHeaderSub: { fontSize: '11px', opacity: 0.65 },
  chatHeaderActions: { display: 'flex', gap: '4px' },
  chatHeaderBtn: { width: '28px', height: '28px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600' },
  orderBanner: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#EFF6FF', borderBottom: '1px solid #DBEAFE' },
  orderBannerText: { fontSize: '12px', color: '#1D4ED8', fontWeight: '500' },
  messagesContainer: { flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#F9FAFB' },
  emptyMessages: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', textAlign: 'center' },
  messageRow: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
  messageAvatar: { width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#4B5563', flexShrink: 0 },
  messageBubble: { maxWidth: '76%', padding: '10px 14px', borderRadius: '18px' },
  messageBubbleMine: { backgroundColor: '#011F5B', color: 'white', borderBottomRightRadius: '4px' },
  messageBubbleTheirs: { backgroundColor: 'white', color: '#111827', borderBottomLeftRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  messageText: { margin: 0, fontSize: '14px', lineHeight: '1.45', wordBreak: 'break-word' },
  messageTime: { fontSize: '10px', marginTop: '4px', display: 'block' },
  inputContainer: { display: 'flex', gap: '8px', padding: '12px 14px', backgroundColor: 'white', borderTop: '1px solid #F3F4F6' },
  messageInput: { flex: 1, padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: '22px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#F9FAFB' },
  sendButton: { width: '38px', height: '38px', borderRadius: '50%', border: 'none', backgroundColor: '#011F5B', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 },
  openChatButton: { padding: '8px 14px', backgroundColor: '#011F5B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  chatListAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#011F5B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', marginRight: '14px', flexShrink: 0 }
};

// ============================================
// MAIN STYLES
// ============================================
const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #011F5B 0%, #01174a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  loadingCard: { background: 'white', padding: '48px', borderRadius: '20px', textAlign: 'center' },
  spinner: { width: '40px', height: '40px', border: '3px solid #F3F4F6', borderTopColor: '#011F5B', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' },

  // Split-screen auth
  splitScreen: { display: 'flex', minHeight: '100vh' },
  splitLeft: {
    width: '40%', minHeight: '100vh',
    background: 'linear-gradient(160deg, #011F5B 0%, #01174a 50%, #000d2e 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '48px 40px',
    '@media (max-width: 768px)': { display: 'none' }
  },
  splitLeftContent: { display: 'flex', flexDirection: 'column', gap: '0', height: '100%', justifyContent: 'space-between', maxWidth: '320px' },
  splitLeftLogo: { marginBottom: '48px' },
  splitLeftBrand: { fontSize: '36px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px', marginBottom: '10px' },
  splitLeftTagline: { fontSize: '16px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 },
  splitLeftBullets: { display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '48px' },
  splitLeftBullet: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  checkmark: { width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#86EFAC', flexShrink: 0 },
  splitLeftFooter: { fontSize: '13px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2px' },

  splitRight: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', backgroundColor: 'white' },
  splitRightInner: { width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column' },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: '14px', fontWeight: '500', cursor: 'pointer', padding: '0', marginBottom: '32px', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px' },
  authHeading: { fontSize: '28px', fontWeight: '800', color: '#111827', margin: '0 0 8px', letterSpacing: '-0.5px' },
  authSubheading: { fontSize: '15px', color: '#6B7280', margin: '0 0 32px', lineHeight: 1.5 },
  authForm: { display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' },
  authInputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  authLabel: { fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.2px' },
  authInput: { padding: '14px 16px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '12px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s', width: '100%', boxSizing: 'border-box' },
  authError: { color: '#DC2626', fontSize: '14px', margin: 0, padding: '12px 16px', backgroundColor: '#FEF2F2', borderRadius: '8px' },
  authBtn: { padding: '15px 24px', fontSize: '16px', fontWeight: '700', color: 'white', background: 'linear-gradient(135deg, #990000, #c41e3a)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', width: '100%' },
  authSecure: { textAlign: 'center', color: '#9CA3AF', fontSize: '13px', marginTop: '20px' },
  verifyLinks: { display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginTop: '16px' },
  linkButton: { background: 'none', border: 'none', color: '#011F5B', fontSize: '14px', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' },
  devModeBox: { backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '10px', padding: '14px', textAlign: 'center', fontSize: '14px' },
  codeInputContainer: { display: 'flex', gap: '8px', justifyContent: 'center' },
  codeInput: { width: '52px', height: '64px', fontSize: '24px', fontWeight: '700', textAlign: 'center', border: '2px solid #E5E7EB', borderRadius: '12px', outline: 'none', fontFamily: 'inherit' },
  codeInputFilled: { borderColor: '#011F5B', backgroundColor: '#F8FAFC' },

  // Dashboard
  dashboardContainer: { minHeight: '100vh', backgroundColor: '#F9FAFB' },
  header: { backgroundColor: 'white', borderBottom: '1px solid #F3F4F6', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 },
  headerContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0', height: '60px' },
  headerLogo: { display: 'flex', alignItems: 'center', gap: '8px', marginRight: '32px', flexShrink: 0 },
  logoTextSmall: { fontSize: '18px', fontWeight: '800', color: '#011F5B', letterSpacing: '-0.3px' },

  // Tab bar
  tabBar: { display: 'flex', alignItems: 'center', flex: 1, gap: '0', height: '100%' },
  tabBtn: {
    padding: '0 18px', height: '60px',
    background: 'none', border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '14px', fontWeight: '500',
    color: '#6B7280', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
    whiteSpace: 'nowrap', fontFamily: 'inherit',
    transition: 'color 0.15s, border-color 0.15s'
  },
  tabBtnActive: { color: '#011F5B', borderBottomColor: '#011F5B', fontWeight: '600' },
  tabBadge: { padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: '#F3F4F6', color: '#6B7280' },
  tabBadgeActive: { backgroundColor: '#011F5B', color: 'white' },

  headerRight: { display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexShrink: 0 },
  headerName: { fontSize: '14px', fontWeight: '600', color: '#374151' },
  earningsBtn: { padding: '7px 14px', fontSize: '13px', fontWeight: '600', color: 'white', backgroundColor: '#059669', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' },
  setupBtn: { padding: '7px 14px', fontSize: '13px', fontWeight: '600', color: 'white', backgroundColor: '#D97706', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' },
  avatarCircle: { width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#011F5B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 },

  main: { maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 100px' },
  tabContent: { display: 'flex', flexDirection: 'column', gap: '32px' },
  subSection: { display: 'flex', flexDirection: 'column', gap: '12px' },
  subSectionTitle: { fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 },

  // Sort bar
  sortBar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  sortGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  sortLabel: { fontSize: '13px', fontWeight: '500', color: '#9CA3AF' },
  sortSelect: { padding: '8px 12px', fontSize: '14px', border: '1.5px solid #E5E7EB', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer', color: '#374151', fontFamily: 'inherit', outline: 'none' },

  // Order cards (food-delivery style)
  ordersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  orderCard: { background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', gap: '10px' },
  orderCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  orderHall: { fontSize: '14px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center' },
  timeBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  orderAmount: { fontSize: '32px', fontWeight: '800', color: '#059669', letterSpacing: '-0.5px', lineHeight: 1.1 },
  orderRoute: { display: 'flex', alignItems: 'center', gap: '6px' },
  orderRouteText: { fontSize: '14px', color: '#4B5563', fontWeight: '500' },
  orderNotes: { fontSize: '13px', color: '#6B7280', margin: 0, padding: '10px 12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontStyle: 'italic', lineHeight: 1.5 },
  orderCardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
  orderTime: { fontSize: '12px', color: '#9CA3AF', fontWeight: '500' },
  orderDivider: { height: '1px', backgroundColor: '#F3F4F6', margin: '4px 0' },
  claimButton: { width: '100%', padding: '12px 20px', fontSize: '15px', fontWeight: '700', color: 'white', background: 'linear-gradient(135deg, #011F5B, #1a3a7a)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },
  cancelButton: { width: '100%', padding: '12px 20px', fontSize: '14px', fontWeight: '600', color: '#DC2626', backgroundColor: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' },

  // Activity items
  activityList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  activityItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F3F4F6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', gap: '12px' },
  activityInfo: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 },
  activityIcon: { fontSize: '24px', flexShrink: 0 },
  activityMain: { fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 2px' },
  activitySub: { fontSize: '13px', color: '#6B7280', margin: 0 },

  // Action buttons
  payNowButton: { padding: '9px 18px', fontSize: '13px', fontWeight: '700', color: 'white', background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 },
  deliveredButton: { padding: '9px 18px', fontSize: '13px', fontWeight: '700', color: 'white', background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 },
  confirmButton: { padding: '9px 18px', fontSize: '13px', fontWeight: '700', color: 'white', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 },
  cancelBtnSmall: { padding: '7px 14px', fontSize: '13px', fontWeight: '600', color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  waitingChip: { padding: '6px 12px', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '20px', fontSize: '12px', fontWeight: '600', flexShrink: 0 },
  openChatBtn: { padding: '9px 18px', fontSize: '13px', fontWeight: '700', color: '#011F5B', backgroundColor: '#EFF6FF', border: '1.5px solid #DBEAFE', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 },

  // Empty state
  emptyState: { textAlign: 'center', padding: '80px 20px', backgroundColor: 'white', borderRadius: '16px', border: '2px dashed #E5E7EB' },
  emptyIcon: { fontSize: '52px', display: 'block', marginBottom: '16px' },
  emptyTitle: { fontSize: '18px', fontWeight: '700', color: '#374151', margin: '0 0 8px' },
  emptyDesc: { fontSize: '15px', color: '#9CA3AF', margin: 0 },

  // Floating action button
  fabButton: {
    position: 'fixed', bottom: '28px', right: '28px',
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '14px 22px',
    background: 'linear-gradient(135deg, #990000, #c41e3a)',
    color: 'white', border: 'none', borderRadius: '28px',
    cursor: 'pointer', zIndex: 500,
    boxShadow: '0 4px 20px rgba(153,0,0,0.4)',
    fontFamily: 'inherit', fontWeight: '700',
    fontSize: '14px'
  },

  // Toast
  toast: { position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#111827', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', pointerEvents: 'none', whiteSpace: 'nowrap' },

  // Modal form fields
  modalField: { display: 'flex', flexDirection: 'column', gap: '6px' },
  modalFieldRow: { display: 'flex', gap: '14px' },
  modalLabel: { fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.2px' },
  modalSelect: { padding: '12px 14px', fontSize: '15px', border: '2px solid #E5E7EB', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', backgroundColor: 'white', color: '#111827', cursor: 'pointer' },
  modalTextarea: { padding: '12px 14px', fontSize: '15px', border: '2px solid #E5E7EB', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', minHeight: '80px', resize: 'vertical', color: '#111827' },
  modalError: { color: '#DC2626', fontSize: '14px', margin: 0, padding: '12px 14px', backgroundColor: '#FEF2F2', borderRadius: '8px' },
  modalSubmitBtn: { padding: '14px 24px', fontSize: '16px', fontWeight: '700', color: 'white', background: 'linear-gradient(135deg, #011F5B, #1a3a7a)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', marginTop: '4px' },
  amountInputWrap: { display: 'flex', alignItems: 'center', border: '2px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', backgroundColor: 'white' },
  amountPrefix: { padding: '12px 14px', fontSize: '20px', fontWeight: '700', color: '#059669', backgroundColor: '#F0FDF4', borderRight: '2px solid #E5E7EB', flexShrink: 0 },
  amountInput: { flex: 1, padding: '12px 14px', fontSize: '20px', fontWeight: '700', border: 'none', outline: 'none', fontFamily: 'inherit', color: '#059669' },
};

// Add keyframes + landing page animation classes
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pd-bounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(10px); } }
    @keyframes pd-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .pd-animate { opacity: 0; transform: translateY(36px); transition: opacity 0.7s ease, transform 0.7s ease; }
    .pd-animate.pd-visible { opacity: 1; transform: translateY(0); }
    .pd-delay-1 { transition-delay: 0.1s; }
    .pd-delay-2 { transition-delay: 0.2s; }
    .pd-delay-3 { transition-delay: 0.32s; }
  `;
  document.head.appendChild(style);
}
