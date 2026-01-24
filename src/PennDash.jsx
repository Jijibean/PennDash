import React, { useState, useEffect } from 'react';

// ============================================
// SUPABASE CONFIGURATION
// ============================================
// Replace these with your Supabase project credentials
const SUPABASE_URL = 'https://lpvhvotwyovwnahdqqod.supabase.co'; // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwdmh2b3R3eW92d25haGRxcW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNjg4OTUsImV4cCI6MjA4NDg0NDg5NX0.T2hd8Grico2Q3o0FW62e9SxUCMMTYFurhFP5gR-6zHc';

// Simple Supabase client (no npm package needed)
const supabase = {
  auth: {
    signInWithMagicLink: async ({ email }) => {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/magiclink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ 
          email, 
          create_user: true,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        return { error };
      }
      return { error: null };
    },
    getSession: async () => {
      const session = localStorage.getItem('penndash_session');
      return { data: { session: session ? JSON.parse(session) : null } };
    },
    getUser: async () => {
      const session = localStorage.getItem('penndash_session');
      if (session) {
        const parsed = JSON.parse(session);
        return { data: { user: parsed.user }, error: null };
      }
      return { data: { user: null }, error: null };
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
      
      const text = await response.text();
      let data = [];
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('JSON parse error:', e);
        }
      }
      
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
      
      // Handle empty responses
      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('JSON parse error:', e);
        }
      }
      
      return { data, error: response.ok ? null : (data || { message: 'Request failed' }) };
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
        
        const text = await response.text();
        let data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error('JSON parse error:', e);
          }
        }
        
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
        return { error: response.ok ? null : { message: 'Delete failed' } };
      },
    }),
  }),
};

// ============================================
// CONSTANTS
// ============================================
const DINING_HALLS = [
  'Houston Market',
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
  const [emailSent, setEmailSent] = useState(false);


// Sorting controls for Available Deliveries
const [sortPrimary, setSortPrimary] = useState('amount'); // amount | dining_hall | dorm | created_at
const [sortSecondary, setSortSecondary] = useState(''); // '' for none, or same keys
const [sortDir, setSortDir] = useState('desc'); // asc | desc

const compareField = (a, b, key) => {
  if (key === 'amount') return (a.amount ?? 0) - (b.amount ?? 0);

  if (key === 'dining_hall') {
    return String(a.dining_hall ?? '').localeCompare(String(b.dining_hall ?? ''), undefined, {
      sensitivity: 'base',
    });
  }

  if (key === 'dorm') {
    return String(a.dorm ?? '').localeCompare(String(b.dorm ?? ''), undefined, {
      sensitivity: 'base',
    });
  }

  if (key === 'created_at') {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  }

  return 0;
};

const compareOrders = (a, b, keys, dir) => {
  const direction = dir === 'asc' ? 1 : -1;
  for (const key of keys.filter(Boolean)) {
    const c = compareField(a, b, key);
    if (c !== 0) return c * direction;
  }
  return 0;
};
  // Check for magic link callback or existing session on mount
  useEffect(() => {
    handleMagicLinkCallback();
  }, []);

  // Handle the magic link callback from Supabase
  const handleMagicLinkCallback = async () => {
    // Check URL hash for access_token (magic link callback)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (accessToken) {
        // Decode the JWT to get user info
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const session = {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
              id: payload.sub,
              email: payload.email,
            }
          };
          localStorage.setItem('penndash_session', JSON.stringify(session));
          setUser(session.user);
          setCurrentView('dashboard');
          // Clean up the URL
          window.history.replaceState(null, '', window.location.pathname);
        } catch (e) {
          console.error('Error parsing token:', e);
        }
      }
      setInitialLoading(false);
      return;
    }
    
    // Check for existing session
    checkSession();
  };

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
      setOrders(data);
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
    
    // DEMO MODE: Skip email verification, go straight to dashboard
    const demoSession = {
      access_token: 'demo_token',
      user: {
        id: 'demo_' + Date.now(),
        email: email.toLowerCase(),
      }
    };
    localStorage.setItem('penndash_session', JSON.stringify(demoSession));
    setUser(demoSession.user);
    setCurrentView('dashboard');
  };

  const handleResendLink = async () => {
    setError('');
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithMagicLink({
      email: email.toLowerCase(),
    });
    
    setLoading(false);
    
    if (error) {
      setError('Failed to resend link. Please try again.');
    } else {
      alert('A new login link has been sent to your email!');
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
    setEmailSent(false);
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
              />
            </div>
            
            {error && <p style={styles.error}>{error}</p>}
            
            <button type="submit" style={styles.primaryButton}>
              Continue
            </button>
          </form>
          
          <div style={styles.footer}>
            <div style={styles.demoNotice}>
              <span>🧪 Demo Mode - No email verification required</span>
            </div>
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

  // Dashboard View
  const openOrders = orders.filter(o => o.status === 'open');
  const sortedOpenOrders = [...openOrders].sort((a, b) =>
    compareOrders(a, b, [sortPrimary, sortSecondary], sortDir)
  );
  const myOrders = orders.filter(o => o.user_email === user.email);
  const claimedByMe = orders.filter(o => o.claimed_by === user.email);

  return (
    <div style={styles.dashboardContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLogo}>
            <span style={styles.headerLogoIcon}>🚀</span>
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
                    step="0.01"
                    min="0.01"
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
<div style={styles.sortBar}>
  <div style={styles.sortGroup}>
    <span style={styles.sortLabel}>Sort by</span>
    <select
      value={sortPrimary}
      onChange={(e) => setSortPrimary(e.target.value)}
      style={styles.sortSelect}
    >
      <option value="amount">Amount ($)</option>
      <option value="created_at">Time Posted</option>
    </select>
  </div>

  <div style={styles.sortGroup}>
    <span style={styles.sortLabel}>Then by</span>
    <select
      value={sortSecondary}
      onChange={(e) => setSortSecondary(e.target.value)}
      style={styles.sortSelect}
    >
      <option value="">None</option>
      <option value="amount">Amount ($)</option>
      <option value="created_at">Time Posted</option>
    </select>
  </div>

  <div style={styles.sortGroup}>
    <span style={styles.sortLabel}>Direction</span>
    <select
      value={sortDir}
      onChange={(e) => setSortDir(e.target.value)}
      style={styles.sortSelect}
    >
      <option value="desc">Descending</option>
      <option value="asc">Ascending</option>
    </select>
  </div>
</div>

          
          {openOrders.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p style={styles.emptyText}>No delivery requests right now. Check back soon!</p>
            </div>
          ) : (
            <div style={styles.ordersGrid}>
              {sortedOpenOrders.map(order => (
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
    color: 'white',
    letterSpacing: '-0.5px'
  },
  headerLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerLogoIcon: {
    fontSize: '28px',
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
  demoNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#92400e',
    marginBottom: '12px',
    border: '1px solid #fcd34d'
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
sortBar: {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: '16px'
},
sortGroup: {
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
},
sortLabel: {
  fontSize: '13px',
  fontWeight: 600,
  color: '#475569'
},
sortSelect: {
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  backgroundColor: 'white',
  fontSize: '14px',
  outline: 'none'
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
