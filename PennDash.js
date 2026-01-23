import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

// UPenn Dining Halls
const DINING_HALLS = [
  "1920 Commons",
  "Houston Market",
  "Hill House",
  "Lauder College House",
  "Kings Court English House",
  "Quaker Kitchen",
  "Pret a Manger",
  "Joe's Cafe"
];

// UPenn Dorms
const DORMS = [
  "Hill College House",
  "Kings Court English House",
  "Lauder College House",
  "Stouffer College House",
  "Fisher Hassenfeld College House",
  "Ware College House",
  "Riepe College House",
  "Gregory College House",
  "Harnwell College House",
  "Harrison College House",
  "Rodin College House",
  "Du Bois College House",
  "Sansom Place East",
  "Sansom Place West"
];

// Mock users database
const MOCK_USERS = {
  "student@upenn.edu": { password: "penn123", name: "Alex Chen", verified: true },
  "quaker@seas.upenn.edu": { password: "go_quakers", name: "Jordan Smith", verified: true }
};

export default function PennDash() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login');
  const [orders, setOrders] = useState([
    { id: 1, user: "Mike R.", diningHall: "1920 Commons", dorm: "Hill College House", amount: 3, description: "Chicken tenders and fries", time: "12:30 PM", status: "open" },
    { id: 2, user: "Sarah K.", diningHall: "Houston Market", dorm: "Harnwell College House", amount: 5, description: "Burrito bowl", time: "1:15 PM", status: "open" },
    { id: 3, user: "David L.", diningHall: "Hill House", dorm: "Rodin College House", amount: 2, description: "Pizza slice x2", time: "11:45 AM", status: "open" },
    { id: 4, user: "Emma W.", diningHall: "Quaker Kitchen", dorm: "Harrison College House", amount: 7, description: "Salad bar + drink", time: "12:00 PM", status: "open" },
    { id: 5, user: "Chris P.", diningHall: "1920 Commons", dorm: "Gregory College House", amount: 4, description: "Pasta station", time: "1:30 PM", status: "open" }
  ]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');

  // Verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingUser, setPendingUser] = useState(null);

  // New order form state
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newDiningHall, setNewDiningHall] = useState('');
  const [newDorm, setNewDorm] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleLogin = () => {
    if (!loginEmail.endsWith('@upenn.edu') && !loginEmail.endsWith('@seas.upenn.edu') && !loginEmail.endsWith('@wharton.upenn.edu')) {
      setLoginError('Please use a valid UPenn email address');
      return;
    }

    const user = MOCK_USERS[loginEmail];
    if (user && user.password === loginPassword) {
      setCurrentUser({ email: loginEmail, name: user.name });
      setView('dashboard');
      setLoginError('');
    } else {
      setLoginError('Invalid email or password');
    }
  };

  const handleSignup = () => {
    if (!signupEmail.endsWith('@upenn.edu') && !signupEmail.endsWith('@seas.upenn.edu') && !signupEmail.endsWith('@wharton.upenn.edu')) {
      setSignupError('Please use a valid UPenn email address');
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters');
      return;
    }

    setPendingUser({ email: signupEmail, name: signupName, password: signupPassword });
    setView('verify');
    setSignupError('');
  };

  const handleVerification = () => {
    if (verificationCode.length === 6) {
      MOCK_USERS[pendingUser.email] = {
        password: pendingUser.password,
        name: pendingUser.name,
        verified: true
      };
      setCurrentUser({ email: pendingUser.email, name: pendingUser.name });
      setView('dashboard');
    }
  };

  const handleNewOrder = () => {
    if (!newDiningHall || !newDorm || !newAmount || !newDescription) {
      return;
    }
    const newOrder = {
      id: Date.now(),
      user: currentUser.name.split(' ')[0] + ' ' + (currentUser.name.split(' ')[1]?.[0] || '') + '.',
      diningHall: newDiningHall,
      dorm: newDorm,
      amount: parseFloat(newAmount),
      description: newDescription,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      status: 'open'
    };
    setOrders([...orders, newOrder]);
    setShowNewOrder(false);
    setNewDiningHall('');
    setNewDorm('');
    setNewAmount('');
    setNewDescription('');
  };

  const handleAcceptOrder = (orderId) => {
    setOrders(orders.map(order =>
      order.id === orderId ? { ...order, status: 'accepted', acceptedBy: currentUser.name } : order
    ));
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setView('login');
    setLoginEmail('');
    setLoginPassword('');
  };

  // Sort orders by amount (least to most)
  const sortedOrders = [...orders].sort((a, b) => a.amount - b.amount);
  const openOrders = sortedOrders.filter(o => o.status === 'open');

  // Login Screen
  if (view === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centerContainer}
        >
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoEmoji}>🍽️</Text>
              </View>
              <Text style={styles.logoText}>PennDash</Text>
            </View>
            <Text style={styles.subtitle}>Dining hall delivery for Quakers</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Penn Email</Text>
              <TextInput
                style={styles.input}
                placeholder="pennkey@upenn.edu"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
              />
            </View>

            {loginError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <View style={styles.switchAuth}>
              <Text style={styles.switchAuthText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => setView('signup')}>
                <Text style={styles.switchAuthLink}>Sign up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Demo credentials:</Text>
              <Text style={styles.demoText}>student@upenn.edu / penn123</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Signup Screen
  if (view === 'signup') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centerContainer}
        >
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoEmoji}>🍽️</Text>
              </View>
              <Text style={styles.logoText}>PennDash</Text>
            </View>
            <Text style={styles.subtitle}>Create your account</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={signupName}
                onChangeText={setSignupName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Penn Email</Text>
              <TextInput
                style={styles.input}
                placeholder="pennkey@upenn.edu"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={signupEmail}
                onChangeText={setSignupEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={signupPassword}
                onChangeText={setSignupPassword}
                secureTextEntry
              />
            </View>

            {signupError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{signupError}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </TouchableOpacity>

            <View style={styles.switchAuth}>
              <Text style={styles.switchAuthText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => setView('login')}>
                <Text style={styles.switchAuthLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Verification Screen
  if (view === 'verify') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centerContainer}
        >
          <View style={styles.card}>
            <View style={styles.verifyIcon}>
              <Text style={{ fontSize: 32 }}>✉️</Text>
            </View>
            <Text style={styles.verifyTitle}>Verify your email</Text>
            <Text style={styles.verifySubtitle}>
              We sent a code to <Text style={{ color: '#fff', fontWeight: '600' }}>{pendingUser?.email}</Text>
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={verificationCode}
                onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, verificationCode.length !== 6 && styles.disabledButton]}
              onPress={handleVerification}
              disabled={verificationCode.length !== 6}
            >
              <Text style={styles.primaryButtonText}>Verify Email</Text>
            </TouchableOpacity>

            <Text style={styles.demoText}>For demo, enter any 6 digits (e.g., 123456)</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Dashboard Screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogo}>
            <Text style={{ fontSize: 18 }}>🍽️</Text>
          </View>
          <Text style={styles.headerTitle}>PennDash</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentUser?.name}</Text>
            <Text style={styles.userEmail}>{currentUser?.email}</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Open Orders</Text>
            <Text style={styles.statValue}>{openOrders.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Avg. Tip</Text>
            <Text style={styles.statValue}>
              ${(openOrders.reduce((a, b) => a + b.amount, 0) / openOrders.length || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Best Offer</Text>
            <Text style={[styles.statValue, { color: '#4ade80' }]}>
              ${Math.max(...openOrders.map(o => o.amount), 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Delivery Requests</Text>
            <Text style={styles.sectionSubtitle}>Sorted by tip (low → high)</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowNewOrder(true)}>
            <Text style={styles.addButtonText}>+ Request</Text>
          </TouchableOpacity>
        </View>

        {/* Orders List */}
        {openOrders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderTop}>
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>${order.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.orderInfo}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderUser}>{order.user}</Text>
                  <Text style={styles.orderTime}>{order.time}</Text>
                </View>
                <Text style={styles.orderDescription}>{order.description}</Text>
                <View style={styles.tagContainer}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>📍 {order.diningHall}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>🏠 {order.dorm}</Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptOrder(order.id)}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        ))}

        {openOrders.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🍕</Text>
            <Text style={styles.emptyTitle}>No open delivery requests</Text>
            <Text style={styles.emptyText}>Be the first to request a delivery!</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* New Order Modal */}
      <Modal
        visible={showNewOrder}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewOrder(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request a Delivery</Text>
              <TouchableOpacity onPress={() => setShowNewOrder(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dining Hall</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newDiningHall}
                    onValueChange={setNewDiningHall}
                    style={styles.picker}
                    dropdownIconColor="rgba(255,255,255,0.5)"
                  >
                    <Picker.Item label="Select dining hall..." value="" color="#999" />
                    {DINING_HALLS.map(hall => (
                      <Picker.Item key={hall} label={hall} value={hall} color="#000" />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Dorm</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newDorm}
                    onValueChange={setNewDorm}
                    style={styles.picker}
                    dropdownIconColor="rgba(255,255,255,0.5)"
                  >
                    <Picker.Item label="Select your dorm..." value="" color="#999" />
                    {DORMS.map(dorm => (
                      <Picker.Item key={dorm} label={dorm} value={dorm} color="#000" />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tip Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={newAmount}
                  onChangeText={setNewAmount}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputHint}>Higher tips get picked up faster!</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Order Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Chicken tenders with fries"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={newDescription}
                  onChangeText={setNewDescription}
                />
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleNewOrder}>
                <Text style={styles.primaryButtonText}>Submit Request</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#011F5B',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#990000',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoEmoji: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  errorBox: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#990000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchAuth: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchAuthText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  switchAuthLink: {
    color: '#e57373',
    fontSize: 14,
    fontWeight: '600',
  },
  demoBox: {
    marginTop: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  demoTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  demoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  verifyIcon: {
    width: 72,
    height: 72,
    backgroundColor: 'rgba(153,0,0,0.15)',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  verifyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  verifySubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    backgroundColor: '#990000',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userEmail: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  signOutButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  signOutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#990000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  orderTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  priceBadge: {
    backgroundColor: '#990000',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginRight: 14,
  },
  priceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  orderInfo: {
    flex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderUser: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 10,
  },
  orderTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  orderDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 10,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  acceptButton: {
    backgroundColor: '#166534',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#011F5B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 24,
  },
  pickerContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  inputHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 6,
  },
});
