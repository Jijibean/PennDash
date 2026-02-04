import React, { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SUPABASE_URL = 'https://lpvhvotwyovwnahdqqod.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwdmh2b3R3eW92d25haGRxcW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNjg4OTUsImV4cCI6MjA4NDg0NDg5NX0.T2hd8Grico2Q3o0FW62e9SxUCMMTYFurhFP5gR-6zHc';

const authService = {
  sendCode: async (email) => { const r = await fetch(`${API_URL}/api/auth/send-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); return r.json(); },
  verifyCode: async (email, code) => { const r = await fetch(`${API_URL}/api/auth/verify-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) }); return r.json(); },
  verifySession: async (token) => { const r = await fetch(`${API_URL}/api/auth/verify-session`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }); return r.json(); },
  saveSession: (token, user) => localStorage.setItem('penndash_session', JSON.stringify({ token, user, savedAt: Date.now() })),
  getSession: () => { const s = localStorage.getItem('penndash_session'); return s ? JSON.parse(s) : null; },
  clearSession: () => localStorage.removeItem('penndash_session')
};

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
            <span style={chatStyles.chatHeaderSub}>${chat.order_amount?.toFixed(2)} • {chat.dining_hall}</span>
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
            <p>Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_email === currentUser;
            return (
              <div key={msg.id || i} style={{ ...chatStyles.messageRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                {!isMe && <div style={chatStyles.messageAvatar}>{otherUserName[0].toUpperCase()}</div>}
                <div style={{ ...chatStyles.messageBubble, ...(isMe ? chatStyles.messageBubbleMine : chatStyles.messageBubbleTheirs) }}>
                  <p style={chatStyles.messageText}>{msg.content}</p>
                  <span style={{ ...chatStyles.messageTime, color: isMe ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>
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

export default function PennDash() {
  const [currentView, setCurrentView] = useState('login');
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
  const [sortBy, setSortBy] = useState('amount'); // 'amount', 'time', 'created_at'
  const [sortDir, setSortDir] = useState('desc');
  const [showSuccess, setShowSuccess] = useState(false);
  const [chats, setChats] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [minimizedChats, setMinimizedChats] = useState([]);
  const [chatMessages, setChatMessages] = useState({});

  useEffect(() => { checkExistingSession(); }, []);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadChats();
      const interval = setInterval(() => {
        loadChats();
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
    setCurrentView('login');
    setChats([]);
    setOpenChats([]);
  };

  const loadOrders = async () => {
    const { data } = await supabase.from('orders').select('*');
    if (data) setOrders(data);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newOrder.amount || !newOrder.diningHall || !newOrder.dorm) {
      setError('Fill all required fields');
      return;
    }
    const amt = parseFloat(newOrder.amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Invalid amount');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('orders').insert([{
      user_email: user.email,
      amount: amt,
      dining_hall: newOrder.diningHall,
      dorm: newOrder.dorm,
      details: newOrder.details,
      delivery_time: newOrder.deliveryTime,
      status: 'open',
      created_at: new Date().toISOString()
    }]);
    setLoading(false);
    if (error) {
      setError('Failed to post order');
      return;
    }
    setNewOrder({ amount: '', diningHall: '', dorm: '', details: '', deliveryTime: 'ASAP' });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    loadOrders();
  };

  const handleCancelOrder = async (id) => {
    await supabase.from('orders').delete().eq('id', id);
    loadOrders();
  };

  const handleClaimOrder = async (order) => {
    const { error } = await supabase.from('orders').update({ status: 'claimed', claimed_by: user.email }).eq('id', order.id);
    if (error) return;
    
    const { data: newChat } = await supabase.from('chats').insert([{
      order_id: order.id,
      requester_email: order.user_email,
      deliverer_email: user.email,
      order_amount: order.amount,
      dining_hall: order.dining_hall,
      dorm: order.dorm,
      created_at: new Date().toISOString(),
      status: 'active'
    }]);
    
    if (newChat?.[0]) {
      setOpenChats(p => [...p, newChat[0].id]);
      loadChats();
    }
    loadOrders();
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

  if (initialLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <p>Loading PennDash...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'login') {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <div style={styles.logoSection}>
            <div style={styles.logo}>
              <span style={styles.logoIcon}>🍽️</span>
              <span style={styles.logoText}>PennDash</span>
            </div>
            <p style={styles.tagline}>Campus Food Delivery</p>
          </div>
          <form onSubmit={handleEmailSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Penn Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pennkey@seas.upenn.edu"
                style={styles.input}
                disabled={loading}
                autoFocus
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
          <div style={styles.footer}>
            <div style={styles.secureNotice}>🔒 Secure Penn email verification</div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'verify') {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <div style={styles.logoSection}>
            <div style={styles.logo}>
              <span style={styles.logoIcon}>📧</span>
              <span style={styles.logoText}>Check Email</span>
            </div>
            <p style={styles.tagline}>Code sent to <strong>{email}</strong></p>
          </div>
          <form onSubmit={handleVerifyCode} style={styles.form}>
            <VerificationCodeInput value={verificationCode} onChange={setVerificationCode} disabled={loading} />
            {error && <p style={styles.error}>{error}</p>}
            {devCode && (
              <div style={styles.devModeBox}>
                <p>🧪 Dev code: <strong>{devCode}</strong></p>
              </div>
            )}
            <button type="submit" style={styles.primaryButton} disabled={loading || verificationCode.length !== 6}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>
          <div style={styles.verifyFooter}>
            <button onClick={handleResendCode} disabled={countdown > 0} style={{ ...styles.linkButton, opacity: countdown > 0 ? 0.5 : 1 }}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
            <span> • </span>
            <button onClick={() => { setCurrentView('login'); setError(''); }} style={styles.linkButton}>
              Different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getTimeMinutes = (timeValue) => {
    const found = DELIVERY_TIMES.find(t => t.value === timeValue);
    return found ? found.minutes : 0;
  };

  const openOrders = orders.filter(o => o.status === 'open').sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'amount') {
      comparison = (b.amount || 0) - (a.amount || 0);
    } else if (sortBy === 'time') {
      comparison = getTimeMinutes(a.delivery_time) - getTimeMinutes(b.delivery_time);
    } else if (sortBy === 'created_at') {
      comparison = new Date(b.created_at) - new Date(a.created_at);
    }
    return sortDir === 'desc' ? comparison : -comparison;
  });

  return (
    <div style={styles.dashboardContainer}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLogo}>
            <span>🚀</span>
            <span style={styles.logoTextSmall}>PennDash</span>
          </div>
          <div style={styles.userInfo}>
            <span style={styles.verifiedBadge}>✓ Verified</span>
            <span style={styles.userEmail}>{user.email}</span>
            {chats.length > 0 && <span style={styles.chatIndicator}>💬 {chats.length}</span>}
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Request a Delivery</h2>
          <div style={styles.orderFormCard}>
            <form onSubmit={handleOrderSubmit} style={styles.orderForm}>
              <div style={styles.formRow}>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrder.amount}
                    onChange={(e) => setNewOrder({...newOrder, amount: e.target.value})}
                    placeholder="5.00"
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Dining Hall *</label>
                  <select
                    value={newOrder.diningHall}
                    onChange={(e) => setNewOrder({...newOrder, diningHall: e.target.value})}
                    style={styles.formSelect}
                  >
                    <option value="">Select...</option>
                    {DINING_HALLS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Deliver To *</label>
                  <select
                    value={newOrder.dorm}
                    onChange={(e) => setNewOrder({...newOrder, dorm: e.target.value})}
                    style={styles.formSelect}
                  >
                    <option value="">Select...</option>
                    {DORMS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Delivery Time *</label>
                  <select
                    value={newOrder.deliveryTime}
                    onChange={(e) => setNewOrder({...newOrder, deliveryTime: e.target.value})}
                    style={styles.formSelect}
                  >
                    {DELIVERY_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Details (Optional)</label>
                <textarea
                  value={newOrder.details}
                  onChange={(e) => setNewOrder({...newOrder, details: e.target.value})}
                  placeholder="e.g., 2 sandwiches, room 305"
                  style={styles.formTextarea}
                />
              </div>
              {error && <p style={styles.formError}>{error}</p>}
              {showSuccess && <p style={styles.formSuccess}>✓ Order posted!</p>}
              <button type="submit" style={styles.submitButton}>
                {loading ? 'Posting...' : 'Post Delivery Request'}
              </button>
            </form>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Available Deliveries
            <span style={styles.orderCount}>{openOrders.length} open</span>
          </h2>
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
          </div>
          {openOrders.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p>No delivery requests available</p>
            </div>
          ) : (
            <div style={styles.ordersGrid}>
              {openOrders.map(order => (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.orderHeader}>
                    <span style={styles.orderAmount}>${order.amount?.toFixed(2)}</span>
                    <div style={styles.orderMeta}>
                      <span style={styles.deliveryTimeBadge}>{order.delivery_time || 'ASAP'}</span>
                      <span style={styles.orderTime}>{formatTime(order.created_at)}</span>
                    </div>
                  </div>
                  <div style={styles.orderDetails}>
                    <div style={styles.orderRoute}>
                      <span style={styles.routeFrom}>{order.dining_hall}</span>
                      <span style={styles.routeArrow}>→</span>
                      <span style={styles.routeTo}>{order.dorm}</span>
                    </div>
                    {order.details && <p style={styles.orderNotes}>"{order.details}"</p>}
                  </div>
                  <div style={styles.orderActions}>
                    {order.user_email === user.email ? (
                      <button onClick={() => handleCancelOrder(order.id)} style={styles.cancelButton}>Cancel</button>
                    ) : (
                      <button onClick={() => handleClaimOrder(order)} style={styles.claimButton}>Claim & Chat</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {chats.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>💬 Active Chats</h2>
            <div style={styles.activityList}>
              {chats.map(chat => {
                const other = chat.requester_email === user.email ? chat.deliverer_email : chat.requester_email;
                return (
                  <div key={chat.id} style={styles.activityItem}>
                    <div style={styles.activityInfo}>
                      <div style={chatStyles.chatListAvatar}>{other.split('@')[0][0].toUpperCase()}</div>
                      <div>
                        <strong>{other.split('@')[0]}</strong><br/>
                        <span style={{color:'#64748b'}}>${chat.order_amount?.toFixed(2)} • {chat.dining_hall}</span>
                      </div>
                    </div>
                    <button onClick={() => handleOpenChat(chat.id)} style={chatStyles.openChatButton}>💬 Open</button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

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
    </div>
  );
}

const chatStyles = {
  chatContainer: { position: 'fixed', bottom: 0, right: 0, zIndex: 1000, pointerEvents: 'none' },
  chatWrapper: { position: 'fixed', bottom: 0, pointerEvents: 'auto' },
  chatPopup: { width: '320px', height: '450px', backgroundColor: 'white', borderRadius: '12px 12px 0 0', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  minimizedChat: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: '#011F5B', borderRadius: '12px 12px 0 0', cursor: 'pointer', color: 'white', minWidth: '200px' },
  minimizedAvatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600' },
  minimizedName: { fontWeight: '600', fontSize: '14px' },
  chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#011F5B', color: 'white' },
  chatHeaderInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  chatAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '600' },
  chatHeaderText: { display: 'flex', flexDirection: 'column' },
  chatHeaderName: { fontWeight: '600', fontSize: '14px' },
  chatHeaderSub: { fontSize: '11px', opacity: 0.8 },
  chatHeaderActions: { display: 'flex', gap: '4px' },
  chatHeaderBtn: { width: '28px', height: '28px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' },
  orderBanner: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#f0f9ff', borderBottom: '1px solid #e0f2fe' },
  orderBannerText: { fontSize: '12px', color: '#0369a1' },
  messagesContainer: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc' },
  emptyMessages: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center' },
  messageRow: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
  messageAvatar: { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: '#475569', flexShrink: 0 },
  messageBubble: { maxWidth: '75%', padding: '10px 14px', borderRadius: '16px' },
  messageBubbleMine: { backgroundColor: '#011F5B', color: 'white', borderBottomRightRadius: '4px' },
  messageBubbleTheirs: { backgroundColor: 'white', color: '#1e293b', borderBottomLeftRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  messageText: { margin: 0, fontSize: '14px', lineHeight: '1.4', wordBreak: 'break-word' },
  messageTime: { fontSize: '10px', marginTop: '4px', display: 'block' },
  inputContainer: { display: 'flex', gap: '8px', padding: '12px 16px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0' },
  messageInput: { flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '20px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' },
  sendButton: { width: '40px', height: '40px', borderRadius: '50%', border: 'none', backgroundColor: '#011F5B', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
  openChatButton: { padding: '8px 14px', backgroundColor: '#011F5B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  chatListAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#011F5B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '600', marginRight: '12px' }
};

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #011F5B 0%, #1a3a7a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  loadingCard: { background: 'white', padding: '48px', borderRadius: '20px', textAlign: 'center' },
  spinner: { width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#011F5B', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' },
  loginCard: { background: 'white', borderRadius: '24px', padding: '48px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' },
  logoSection: { textAlign: 'center', marginBottom: '36px' },
  logo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' },
  logoIcon: { fontSize: '36px' },
  logoText: { fontSize: '32px', fontWeight: '700', color: '#011F5B' },
  tagline: { color: '#64748b', fontSize: '16px', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#374151' },
  input: { padding: '16px 20px', fontSize: '16px', border: '2px solid #e5e7eb', borderRadius: '12px', outline: 'none', fontFamily: 'inherit' },
  error: { color: '#dc2626', fontSize: '14px', margin: 0, padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '8px' },
  primaryButton: { padding: '16px 24px', fontSize: '16px', fontWeight: '600', color: 'white', background: 'linear-gradient(135deg, #990000, #c41e3a)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit' },
  codeInputContainer: { display: 'flex', gap: '8px', justifyContent: 'center' },
  codeInput: { width: '52px', height: '64px', fontSize: '24px', fontWeight: '700', textAlign: 'center', border: '2px solid #e5e7eb', borderRadius: '12px', outline: 'none', fontFamily: 'inherit' },
  codeInputFilled: { borderColor: '#011F5B', backgroundColor: '#f8fafc' },
  devModeBox: { backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '12px', padding: '16px', textAlign: 'center' },
  footer: { marginTop: '32px', textAlign: 'center' },
  secureNotice: { display: 'inline-flex', padding: '8px 16px', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '20px', fontSize: '13px', fontWeight: '500' },
  verifyFooter: { marginTop: '24px', textAlign: 'center' },
  linkButton: { background: 'none', border: 'none', color: '#011F5B', fontSize: '14px', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' },
  dashboardContainer: { minHeight: '100vh', backgroundColor: '#f8fafc' },
  header: { background: 'linear-gradient(135deg, #011F5B, #1a3a7a)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100 },
  headerContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerLogo: { display: 'flex', alignItems: 'center', gap: '10px', color: 'white', fontSize: '24px' },
  logoTextSmall: { fontSize: '22px', fontWeight: '700', color: 'white' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  verifiedBadge: { padding: '4px 12px', backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  chatIndicator: { padding: '4px 12px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  userEmail: { color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' },
  logoutButton: { padding: '8px 16px', fontSize: '14px', fontWeight: '500', color: '#011F5B', backgroundColor: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' },
  section: { marginBottom: '40px' },
  sectionTitle: { fontSize: '22px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' },
  orderCount: { fontSize: '14px', fontWeight: '500', color: '#64748b', backgroundColor: '#e2e8f0', padding: '4px 12px', borderRadius: '20px' },
  sortBar: { display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  sortGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  sortLabel: { fontSize: '14px', fontWeight: '500', color: '#64748b' },
  sortSelect: { padding: '8px 12px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer' },
  orderFormCard: { background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  orderForm: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' },
  formField: { display: 'flex', flexDirection: 'column', gap: '8px' },
  formLabel: { fontSize: '13px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' },
  formInput: { padding: '14px 16px', fontSize: '16px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit' },
  formSelect: { padding: '14px 16px', fontSize: '16px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', backgroundColor: 'white' },
  formTextarea: { padding: '14px 16px', fontSize: '16px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', minHeight: '80px', resize: 'vertical' },
  formError: { color: '#dc2626', fontSize: '14px', margin: 0, padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '8px' },
  formSuccess: { color: '#059669', fontSize: '14px', margin: 0, padding: '12px 16px', backgroundColor: '#ecfdf5', borderRadius: '8px', fontWeight: '500' },
  submitButton: { padding: '16px 24px', fontSize: '16px', fontWeight: '600', color: 'white', background: 'linear-gradient(135deg, #990000, #c41e3a)', border: 'none', borderRadius: '12px', cursor: 'pointer', alignSelf: 'flex-start' },
  emptyState: { textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' },
  emptyIcon: { fontSize: '48px', display: 'block', marginBottom: '16px' },
  ordersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  orderCard: { background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  orderMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
  deliveryTimeBadge: { padding: '4px 10px', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  orderAmount: { fontSize: '28px', fontWeight: '700', color: '#059669' },
  orderTime: { fontSize: '13px', color: '#94a3b8', fontWeight: '500' },
  orderDetails: { marginBottom: '20px' },
  orderRoute: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' },
  routeFrom: { fontSize: '15px', fontWeight: '600', color: '#1e293b' },
  routeArrow: { color: '#94a3b8', fontSize: '18px' },
  routeTo: { fontSize: '15px', fontWeight: '600', color: '#1e293b' },
  orderNotes: { fontSize: '14px', color: '#64748b', margin: 0, padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontStyle: 'italic' },
  orderActions: { display: 'flex', gap: '12px' },
  claimButton: { flex: 1, padding: '12px 20px', fontSize: '15px', fontWeight: '600', color: 'white', background: 'linear-gradient(135deg, #011F5B, #1a3a7a)', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  cancelButton: { flex: 1, padding: '12px 20px', fontSize: '15px', fontWeight: '500', color: '#dc2626', backgroundColor: '#fef2f2', border: '2px solid #fecaca', borderRadius: '10px', cursor: 'pointer' },
  activityList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  activityItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' },
  activityInfo: { display: 'flex', alignItems: 'center' }
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
