import React, { useState, useEffect } from 'react';

// ============================================
// SUPABASE CONFIGURATION
// ============================================
// Replace these with your Supabase project credentials
const SUPABASE_URL = 'https://lpvhvotwyovwnahdqqod.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T_1ryXZH6YmVytmcoZwTGw_wAV4oCxD';

// Simple Supabase client (no npm package needed)
const supabase = {
  auth: {
    signInWithOtp: async ({ email }) => {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, create_user: true }),
      });
      if (!response.ok) {
        const error = await response.json();
        return { error };
      }
      return { error: null };
    },
    verifyOtp: async ({ email, token, type }) => {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, token, type }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { data: null, error: data };
      }
      return { data, error: null };
    },
    getSession: async () => {
      const session = localStorage.getItem('penndash_session');
      return { data: { session: session ? JSON.parse(session) : null } };
    },
    signOut: async () => {
      localStorage.removeItem('penndash_session');
      return { error: null };
    },
  },
  from: (table) => ({
    select: async (columns = '*') => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      const data = await response.json();
      return { data, error: response.ok ? null : data };
    },
    insert: async (rows) => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(rows),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : data };
    },
    update: async (updates) => ({
      eq: async (column, value) => {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(updates),
        });
        const data = await response.json();
        return { data, error: response.ok ? null : data };
      },
    }),
    delete: () => ({
      eq: async (column, value) => {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        return { error: response.ok ? null : await response.json() };
      },
    }),
  }),
};

// ============================================
// CONSTANTS
// ============================================
const DINING_HALLS = [
  'Hill House',
  '1920 Commons',
  'Houston Market',
  'Falk Dining Commons',
  'Lauder College House',
  'Kings Court English House',
  'Accenture Café',
  'Pret A Manger',
  'Joe\'s Café',
  'McClelland Express'
];

const DORMS = [
  'Hill College House',
  'Kings Court English House',
  'Fisher Hassenfeld College House',
  'Ware College House',
  'Riepe College House',
  'Harnwell College House',
  'Harrison College House',
  'Rodin College House',
  'Lauder College House',
  'Gregory College House',
  'Stouffer College House',
  'Du Bois College House',
  'Sansom Place East',
  'Sansom Place West',
  'The Radian',
  'Chestnut Hall'
];

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function PennDash() {
  const [currentView, setCurrentView] = useState('login');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [newOrder, setNewOrder] = useState({
    amount: '',
    diningHall: '',
    dorm: '',
    details: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Load orders when user is logged in
  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setCurrentView('dashboard');
    }
    setInitialLoading(false);
  };

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*');
    
    if (!error && data) {
      // Sort by amount (lowest first)
      const sortedOrders = data.sort((a, b) => a.amount - b.amount);
      setOrders(sortedOrders);
    }
  };

  const validateEmail = (email) => {
    const lowerEmail = email.toLowerCase();
    return lowerEmail.endsWith('.upenn.edu') || lowerEmail.endsWith('@upenn.edu');
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateEmail(email)) {
      setError('Please use a valid Penn email address (@upenn.edu, @seas.upenn.edu, @wharton.upenn.edu, etc.)');
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase(),
    });
    
    setLoading(false);
    
    if (error) {
      setError('Failed to send verification code. Please try again.');
      return;
    }
    
    setCurrentView('verification');
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase(),
      token: verificationCode,
      type: 'email',
    });
    
    setLoading(false);
    
    if (error) {
      setError('Invalid verification code. Please check your email and try again.');
      return;
    }
    
    // Save session
    if (data?.session) {
      localStorage.setItem('penndash_session', JSON.stringify(data.session));
    }
    
    setUser(data.user || { email: email.toLowerCase() });
    setCurrentView('dashboard');
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase(),
    });
    
    setLoading(false);
    
    if (error) {
      setError('Failed to resend code. Please try again.');
    } else {
      setError('');
      alert('A new verification code has been sent to your email!');
    }
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newOrder.amount || !newOrder.diningHall || !newOrder.dorm) {
      setError('Please fill in all required fields');
      return;
    }
    
    const amount = parseFloat(newOrder.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid dollar amount');
      return;
    }
    
    setLoading(true);
    
    const order = {
      user_email: user.email,
      amount: amount,
      dining_hall: newOrder.diningHall,
      dorm: newOrder.dorm,
      details: newOrder.details,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('orders')
      .insert([order]);
    
    setLoading(false);
    
    if (error) {
      setError('Failed to post order. Please try again.');
      return;
    }
    
    setNewOrder({ amount: '', diningHall: '', dorm: '', details: '' });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    loadOrders();
  };

  const handleCancelOrder = async (orderId) => {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);
    
    if (!error) {
      loadOrders();
    }
  };

  const handleClaimOrder = async (orderId) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'claimed', claimed_by: user.email })
      .eq('id', orderId);
    
    if (!error) {
      loadOrders();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEmail('');
    setVerificationCode('');
    setCurrentView('login');
  };

  // Initial loading state
  if (initialLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading PennDash...</p>
        </div>
      </div>
    );
  }

  // Login View
  if (currentView === 'login') {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <div style={styles.logoSection}>
            <div style={styles.logo}>
              <span style={styles.logoIcon}>🍽️</span>
              <span style={styles.logoText}>PennDash</span>
            </div>
            <p style={styles.tagline}>Campus Food Delivery by Students, for Students</p>
          </div>
          
          <form onSubmit={handleEmailSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Login with your Penn Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pennkey@seas.upenn.edu"
                style={styles.input}
                disabled={loading}
              />
            </div>
            
            {error && <p style={styles.error}>{error}</p>}
            
            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? 'Sending Code...' : 'Continue'}
            </button>
          </form>
          
          <div style={styles.footer}>
            <p style={styles.footerText}>
              We'll send a verification code to your Penn email
            </p>
            <p style={styles.footerSubtext}>
              Accepts @upenn.edu, @seas.upenn.edu, @wharton.upenn.edu, @sas.upenn.edu
            </p>
          </div>
        </div>
        
        <div style={styles.decorativeCircle1}></div>
        <div style={styles.decorativeCircle2}></div>
      </div>
    );
  }

  // Verification View
  if (currentView === 'verification') {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <div style={styles.logoSection}>
            <div style={styles.logo}>
              <span style={styles.logoIcon}>📧</span>
              <span style={styles.logoText}>Check Your Email</span>
            </div>
          </div>
          
          <div style={styles.verificationInfo}>
            <p style={styles.verificationText}>
              We sent a 6-digit verification code to:
            </p>
            <p style={styles.emailDisplay}>{email}</p>
            <p style={styles.verificationHint}>
              Check your inbox (and spam folder) for the code
            </p>
          </div>
          
          <form onSubmit={handleVerification} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                style={styles.codeInput}
                maxLength={6}
                disabled={loading}
              />
            </div>
            
            {error && <p style={styles.error}>{error}</p>}
            
            <button type="submit" style={styles.primaryButton} disabled={loading || verificationCode.length !== 6}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            
            <button 
              type="button" 
              onClick={handleResendCode}
              style={styles.linkButton}
              disabled={loading}
            >
              Didn't receive the code? Resend
            </button>
            
            <button 
              type="button" 
              onClick={() => {
                setCurrentView('login');
                setError('');
                setVerificationCode('');
              }}
              style={styles.secondaryButton}
            >
              ← Use a different email
            </button>
          </form>
        </div>
        
        <div style={styles.decorativeCircle1}></div>
        <div style={styles.decorativeCircle2}></div>
      </div>
    );
  }

  // Dashboard View
  const openOrders = orders.filter(o => o.status === 'open');
  const myOrders = orders.filter(o => o.user_email === user.email);
  const claimedByMe = orders.filter(o => o.claimed_by === user.email);

  return (
    <div style={styles.dashboardContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🍽️</span>
            <span style={styles.logoTextSmall}>PennDash</span>
          </div>
          <div style={styles.userInfo}>
            <span style={styles.userEmail}>{user.email}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* New Order Form */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Request a Delivery</h2>
          <div style={styles.orderFormCard}>
            <form onSubmit={handleOrderSubmit} style={styles.orderForm}>
              <div style={styles.formRow}>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Amount You'll Pay ($) *</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0.50"
                    value={newOrder.amount}
                    onChange={(e) => setNewOrder({...newOrder, amount: e.target.value})}
                    placeholder="5.00"
                    style={styles.formInput}
                    disabled={loading}
                  />
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Dining Hall *</label>
                  <select
                    value={newOrder.diningHall}
                    onChange={(e) => setNewOrder({...newOrder, diningHall: e.target.value})}
                    style={styles.formSelect}
                    disabled={loading}
                  >
                    <option value="">Select dining hall...</option>
                    {DINING_HALLS.map(hall => (
                      <option key={hall} value={hall}>{hall}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Deliver To (Dorm) *</label>
                  <select
                    value={newOrder.dorm}
                    onChange={(e) => setNewOrder({...newOrder, dorm: e.target.value})}
                    style={styles.formSelect}
                    disabled={loading}
                  >
                    <option value="">Select dorm...</option>
                    {DORMS.map(dorm => (
                      <option key={dorm} value={dorm}>{dorm}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={styles.formField}>
                <label style={styles.formLabel}>Order Details (Optional)</label>
                <textarea
                  value={newOrder.details}
                  onChange={(e) => setNewOrder({...newOrder, details: e.target.value})}
                  placeholder="e.g., 2 chicken sandwiches, 1 salad, room 305"
                  style={styles.formTextarea}
                  disabled={loading}
                />
              </div>
              
              {error && <p style={styles.formError}>{error}</p>}
              {showSuccess && <p style={styles.formSuccess}>✓ Order posted successfully!</p>}
              
              <button type="submit" style={styles.submitButton} disabled={loading}>
                {loading ? 'Posting...' : 'Post Delivery Request'}
              </button>
            </form>
          </div>
        </section>

        {/* Available Orders */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Available Deliveries
            <span style={styles.orderCount}>{openOrders.length} open</span>
          </h2>
          
          {openOrders.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p style={styles.emptyText}>No delivery requests right now. Check back soon!</p>
            </div>
          ) : (
            <div style={styles.ordersGrid}>
              {openOrders.map(order => (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.orderHeader}>
                    <span style={styles.orderAmount}>${order.amount.toFixed(2)}</span>
                    <span style={styles.orderTime}>
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={styles.orderDetails}>
                    <div style={styles.orderRoute}>
                      <span style={styles.routeFrom}>📍 {order.dining_hall}</span>
                      <span style={styles.routeArrow}>→</span>
                      <span style={styles.routeTo}>🏠 {order.dorm}</span>
                    </div>
                    {order.details && (
                      <p style={styles.orderNotes}>{order.details}</p>
                    )}
                  </div>
                  <div style={styles.orderActions}>
                    {order.user_email === user.email ? (
                      <button 
                        onClick={() => handleCancelOrder(order.id)}
                        style={styles.cancelButton}
                      >
                        Cancel Request
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleClaimOrder(order.id)}
                        style={styles.claimButton}
                      >
                        Claim Delivery
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Activity */}
        {(myOrders.length > 0 || claimedByMe.length > 0) && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>My Activity</h2>
            
            {myOrders.length > 0 && (
              <div style={styles.activitySection}>
                <h3 style={styles.activityTitle}>My Requests</h3>
                <div style={styles.activityList}>
                  {myOrders.map(order => (
                    <div key={order.id} style={styles.activityItem}>
                      <div style={styles.activityInfo}>
                        <span style={styles.activityAmount}>${order.amount.toFixed(2)}</span>
                        <span style={styles.activityRoute}>
                          {order.dining_hall} → {order.dorm}
                        </span>
                      </div>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: order.status === 'claimed' ? '#10b981' : '#f59e0b'
                      }}>
                        {order.status === 'claimed' ? 'Being Delivered' : 'Waiting'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {claimedByMe.length > 0 && (
              <div style={styles.activitySection}>
                <h3 style={styles.activityTitle}>Deliveries I'm Making</h3>
                <div style={styles.activityList}>
                  {claimedByMe.map(order => (
                    <div key={order.id} style={styles.activityItem}>
                      <div style={styles.activityInfo}>
                        <span style={styles.activityAmount}>${order.amount.toFixed(2)}</span>
                        <span style={styles.activityRoute}>
                          {order.dining_hall} → {order.dorm}
                        </span>
                      </div>
                      <span style={{...styles.statusBadge, backgroundColor: '#3b82f6'}}>
                        In Progress
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      
      {/* Footer */}
      <footer style={styles.dashboardFooter}>
        <p>PennDash © 2026 • Made for Penn Students</p>
      </footer>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  // Login/Verification Styles
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #011F5B 0%, #1a3a7a 50%, #990000 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '"Source Sans Pro", -apple-system, BlinkMacSystemFont, sans-serif'
  },
  loadingCard: {
    background: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '24px',
    padding: '48px',
    textAlign: 'center',
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#011F5B',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '16px',
    margin: 0,
  },
  loginCard: {
    background: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '24px',
    padding: '48px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
    position: 'relative',
    zIndex: 10
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '36px'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '12px'
  },
  logoIcon: {
    fontSize: '42px'
  },
  logoText: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#011F5B',
    letterSpacing: '-1px'
  },
  logoTextSmall: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#011F5B',
    letterSpacing: '-0.5px'
  },
  tagline: {
    color: '#64748b',
    fontSize: '16px',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  input: {
    padding: '16px 20px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit'
  },
  codeInput: {
    padding: '20px',
    fontSize: '28px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    textAlign: 'center',
    letterSpacing: '12px',
    fontFamily: '"SF Mono", "Monaco", monospace',
    fontWeight: '600'
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    margin: 0,
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca'
  },
  primaryButton: {
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #011F5B 0%, #1a3a7a 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit'
  },
  secondaryButton: {
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#64748b',
    background: 'transparent',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  linkButton: {
    padding: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#011F5B',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'underline',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center'
  },
  footerText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0'
  },
  footerSubtext: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0
  },
  decorativeCircle1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'rgba(153, 0, 0, 0.15)',
    top: '-100px',
    right: '-100px'
  },
  decorativeCircle2: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'rgba(1, 31, 91, 0.2)',
    bottom: '-50px',
    left: '-50px'
  },
  verificationInfo: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  verificationText: {
    color: '#64748b',
    fontSize: '15px',
    margin: '0 0 8px 0'
  },
  emailDisplay: {
    color: '#011F5B',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 12px 0'
  },
  verificationHint: {
    color: '#94a3b8',
    fontSize: '13px',
    margin: 0,
  },

  // Dashboard Styles
  dashboardContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '"Source Sans Pro", -apple-system, BlinkMacSystemFont, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #011F5B 0%, #1a3a7a 100%)',
    padding: '16px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px'
  },
  logoutButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#011F5B',
    backgroundColor: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px'
  },
  section: {
    marginBottom: '40px'
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  orderCount: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    padding: '4px 12px',
    borderRadius: '20px'
  },
  orderFormCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid #e2e8f0'
  },
  orderForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px'
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  formInput: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    fontFamily: 'inherit'
  },
  formSelect: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    fontFamily: 'inherit',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  formTextarea: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    fontFamily: 'inherit',
    minHeight: '80px',
    resize: 'vertical'
  },
  formError: {
    color: '#dc2626',
    fontSize: '14px',
    margin: 0,
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px'
  },
  formSuccess: {
    color: '#059669',
    fontSize: '14px',
    margin: 0,
    padding: '12px 16px',
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    fontWeight: '500'
  },
  submitButton: {
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #990000 0%, #c41e3a 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    alignSelf: 'flex-start'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '2px dashed #e2e8f0'
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px'
  },
  emptyText: {
    color: '#64748b',
    fontSize: '16px',
    margin: 0
  },
  ordersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  orderCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  orderAmount: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#059669'
  },
  orderTime: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: '500'
  },
  orderDetails: {
    marginBottom: '20px'
  },
  orderRoute: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '12px'
  },
  routeFrom: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b'
  },
  routeArrow: {
    color: '#94a3b8',
    fontSize: '18px'
  },
  routeTo: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b'
  },
  orderNotes: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontStyle: 'italic'
  },
  orderActions: {
    display: 'flex',
    gap: '12px'
  },
  claimButton: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #011F5B 0%, #1a3a7a 100%)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  cancelButton: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '10px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  activitySection: {
    marginBottom: '24px'
  },
  activityTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '12px'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  activityInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  activityAmount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#059669'
  },
  activityRoute: {
    fontSize: '14px',
    color: '#64748b'
  },
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white'
  },
  dashboardFooter: {
    textAlign: 'center',
    padding: '24px',
    color: '#94a3b8',
    fontSize: '14px',
    borderTop: '1px solid #e2e8f0'
  }
};

// Add keyframes for spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
