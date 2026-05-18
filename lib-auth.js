// ════════════════════════════════════════════════════════════════
// PRAJAPATI ERP - Authentication Library
// WhatsApp OTP Login & Session Management
// ════════════════════════════════════════════════════════════════

const AUTH = {
  
  // 🔐 REQUIRE LOGIN - Redirect if not authenticated
  requireLogin() {
    const session = this.getCurrentUser();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  },

  // 👤 GET CURRENT USER from localStorage
  getCurrentUser() {
    try {
      const sessionData = localStorage.getItem('prajapati_session');
      if (sessionData) {
        return JSON.parse(sessionData);
      }
    } catch (e) {
      console.error('Error reading session:', e);
    }
    return null;
  },

  // ✅ CHECK IF AUTHENTICATED
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  },

  // 📱 SEND OTP via WhatsApp
  sendOTP(phone) {
    return new Promise((resolve, reject) => {
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store in session for verification
      sessionStorage.setItem('pending_otp', otp);
      sessionStorage.setItem('pending_phone', phone);
      sessionStorage.setItem('otp_timestamp', Date.now().toString());

      // Try to send via Wati (WhatsApp)
      const watiURL = CONFIG.WATI_URL;
      
      // Prepare message
      const message = `Your Prajapati ERP login OTP: ${otp}. Valid for 5 minutes.`;
      
      // Try sending via fetch (CORS may block)
      fetch(`${watiURL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          message: message
        })
      })
      .then(response => {
        if (response.ok) {
          console.log('✅ OTP sent via WhatsApp');
          resolve({ success: true, message: 'OTP sent to WhatsApp' });
        } else {
          throw new Error('Failed to send');
        }
      })
      .catch(error => {
        // Fallback: Show OTP in alert (for testing)
        console.warn('⚠️ WhatsApp send failed, using fallback:', error);
        alert(`OTP: ${otp}\n\n(WhatsApp send failed - showing here for testing)\n\nValidation will work with this OTP.`);
        resolve({ success: true, message: 'OTP displayed (fallback mode)' });
      });
    });
  },

  // ✅ VERIFY OTP
  verifyOTP(phone, otp) {
    return new Promise((resolve, reject) => {
      try {
        const pendingOTP = sessionStorage.getItem('pending_otp');
        const pendingPhone = sessionStorage.getItem('pending_phone');
        const otpTimestamp = parseInt(sessionStorage.getItem('otp_timestamp') || '0');
        
        // Check if OTP exists
        if (!pendingOTP) {
          reject(new Error('No OTP requested. Please send OTP first.'));
          return;
        }

        // Check if phone matches
        if (pendingPhone !== phone) {
          reject(new Error('Phone number does not match.'));
          return;
        }

        // Check if OTP expired (5 minutes)
        const ageInMinutes = (Date.now() - otpTimestamp) / (1000 * 60);
        if (ageInMinutes > 5) {
          reject(new Error('OTP expired. Please request a new one.'));
          return;
        }

        // Check if OTP matches
        if (pendingOTP !== otp) {
          reject(new Error('Invalid OTP. Please try again.'));
          return;
        }

        // ✅ OTP verified! Create session
        const sessionData = {
          id: 'user_' + phone.replace(/[^0-9]/g, ''),
          phone: phone,
          name: 'Shivam Prajapati', // Will come from Supabase later
          role: 'admin', // Will come from Supabase later
          loginTime: new Date().toISOString(),
          verified: true
        };

        // Save to localStorage
        localStorage.setItem('prajapati_session', JSON.stringify(sessionData));

        // Clear OTP from session
        sessionStorage.removeItem('pending_otp');
        sessionStorage.removeItem('pending_phone');
        sessionStorage.removeItem('otp_timestamp');

        console.log('✅ Authentication successful');
        resolve({ success: true, user: sessionData });

      } catch (error) {
        reject(error);
      }
    });
  },

  // 🚪 LOGOUT
  logout() {
    localStorage.removeItem('prajapati_session');
    sessionStorage.removeItem('pending_otp');
    sessionStorage.removeItem('pending_phone');
    sessionStorage.removeItem('otp_timestamp');
    window.location.href = 'login.html';
  },

  // 🔓 GET SUPABASE CLIENT
  async getSupabase() {
    if (!window.supabase) {
      console.error('Supabase not loaded');
      return null;
    }
    return window.supabase;
  },

  // 🛡️ CHECK MODULE ACCESS
  requireModule(module) {
    const session = this.getCurrentUser();
    
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }

    // Module permissions
    const moduleAccess = {
      orders: ['admin', 'sales', 'operation', 'execution_manager', 'dispatch'],
      printing: ['admin', 'printing', 'operation'],
      stitching: ['admin', 'stitching', 'operation'],
      execution: ['admin', 'execution', 'operation'],
      dispatch: ['admin', 'dispatch', 'operation'],
      dashboard: ['admin', 'sales', 'operation', 'printing', 'stitching', 'execution'],
      team: ['admin'],
      settings: ['admin'],
      reports: ['admin']
    };

    const allowedRoles = moduleAccess[module] || [];
    
    if (!allowedRoles.includes(session.role)) {
      console.error(`❌ Access denied to ${module}. Your role: ${session.role}`);
      window.location.href = 'dashboard.html';
      return null;
    }

    return session;
  }
};

// Auto-check authentication
document.addEventListener('DOMContentLoaded', function() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const publicPages = ['login.html', 'index.html', '', 'login'];

  // Don't check auth on public pages
  if (!publicPages.includes(currentPage)) {
    if (!AUTH.isAuthenticated()) {
      console.warn('⚠️ Not authenticated, redirecting to login');
      window.location.href = 'login.html';
    }
  }
});

console.log('✅ lib-auth.js loaded');
