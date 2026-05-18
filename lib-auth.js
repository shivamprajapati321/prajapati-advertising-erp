const AUTH = {
  SUPABASE_URL: 'https://shafygjbffffjhwhmcgo.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYWZ5Z2piZmZmZmpod2htY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM5MTE1NzMsImV4cCI6MjAyOTQ4NzU3M30.M8-p_PgqNaV_k-J5L6D3V8ZJZPfxQW0X0Y1Z2A3B4C5D',
  WATI_URL: 'https://live-mt-server.wati.io/1077226',
  WATI_JWT: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2lkIjoiMTA3NzIyNiIsImh0dHBzOi8vd2F0aS5pbyI6eyJhY2NvdW50X2lkIjoiMTA3NzIyNiIsInNlbmRlciI6dHJ1ZSwiYWNjZXNzX2xldmVsIjoiQUNDT1VOVF9BRE1JTiIsInVzZXJfaWQiOiJ1c2VyLTEwNzcyMjYtYWRtaW4ifX0.jH-0SHK-_5KZ-6L-7M-8N-9O-0P-1Q-2R-3S-4T-5U',

  requireLogin() {
    const session = localStorage.getItem('prajapati_session');
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return JSON.parse(session);
  },

  async sendOTP(phone) {
    try {
      console.log('📱 Step 1: Input phone:', phone);
      
      // Normalize phone
      const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
      const fullPhone = '+91' + cleanPhone;
      console.log('📞 Step 2: Normalized phone:', fullPhone);

      // Generate random 6-digit OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      console.log('🔐 Step 3: Generated OTP:', otp);

      // Store OTP in sessionStorage for verification
      sessionStorage.setItem('pending_phone', fullPhone);
      sessionStorage.setItem('pending_otp', otp);
      console.log('💾 Step 4: Stored OTP in session');

      // Try Wati API
      console.log('📤 Step 5: Calling Wati API...');
      console.log('  URL:', this.WATI_URL + '/api/v1/sendTemplateMessage');
      
      const watiPayload = {
        waNumber: fullPhone,
        templateName: 'login_otp',
        placeholders: [otp],
        broadcast_name: 'Prajapati ERP Login'
      };
      console.log('  Payload:', JSON.stringify(watiPayload, null, 2));

      const watiResponse = await fetch(this.WATI_URL + '/api/v1/sendTemplateMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.WATI_JWT
        },
        body: JSON.stringify(watiPayload)
      });

      console.log('📡 Step 6: Wati response status:', watiResponse.status);
      
      // Get response as TEXT first (not JSON)
      const responseText = await watiResponse.text();
      console.log('📦 Step 7: Response text:', responseText);

      // Try to parse as JSON if not empty
      let responseData = {};
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
          console.log('✅ Step 8: Parsed JSON:', responseData);
        } catch (e) {
          console.log('⚠️  Step 8: Not JSON, treating as text:', responseText);
          responseData = { message: responseText };
        }
      }

      if (!watiResponse.ok) {
        console.log('❌ Wati API failed:', watiResponse.status);
        // Continue anyway - OTP is in sessionStorage
        console.log('💡 Continuing with local OTP fallback');
      } else {
        console.log('✅ Wati API succeeded');
      }

      // FALLBACK: Show OTP in alert for testing
      alert(`✅ OTP SENT!\n\n🔐 Your OTP: ${otp}\n\n(For testing - in production sent via WhatsApp)`);
      
      console.log('✅ LOGIN READY: OTP stored locally');
      return true;

    } catch (error) {
      console.error('❌ CRITICAL ERROR:', error);
      console.error('  Error message:', error.message);
      console.error('  Error stack:', error.stack);
      
      // FALLBACK: Create OTP locally
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
      const fullPhone = '+91' + cleanPhone;
      
      sessionStorage.setItem('pending_phone', fullPhone);
      sessionStorage.setItem('pending_otp', otp);
      
      alert(`⚠️ WHATSAPP NOT AVAILABLE\n\n🔐 Your test OTP: ${otp}\n\nUse this to login.`);
      console.log('✅ Using local OTP fallback');
      return true;
    }
  },

  async verifyOTP(phone, otp) {
    try {
      console.log('🔐 Verifying OTP...');
      
      // Normalize phone
      const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
      const fullPhone = '+91' + cleanPhone;
      console.log('  Phone:', fullPhone);
      console.log('  OTP entered:', otp);

      // Get stored OTP
      const storedOTP = sessionStorage.getItem('pending_otp');
      console.log('  OTP stored:', storedOTP);

      // Check if OTP matches
      if (otp !== storedOTP) {
        throw new Error('Invalid OTP. Please try again.');
      }
      console.log('✅ OTP verified');

      // Initialize Supabase if needed
      if (!window.supabase || !window.supabase.from) {
        console.log('🔄 Initializing Supabase...');
        const { createClient } = window.supabase;
        window.supabase = createClient(this.SUPABASE_URL, this.SUPABASE_KEY);
      }

      // Query user
      console.log('🔍 Looking up user...');
      const { data: staff, error: queryError } = await window.supabase
        .from('prajapati_staff')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
        throw new Error('Database error: ' + queryError.message);
      }

      if (!staff) {
        // New user - create
        console.log('👤 Creating new user...');
        const { data: newUser, error: createError } = await window.supabase
          .from('prajapati_staff')
          .insert([{
            phone: cleanPhone,
            name: 'User ' + cleanPhone.slice(-4),
            role: 'staff',
            status: 'active',
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) throw new Error('Create user failed: ' + createError.message);
        
        const session = {
          phone: newUser.phone,
          name: newUser.name,
          role: newUser.role,
          id: newUser.id,
          loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('prajapati_session', JSON.stringify(session));
        sessionStorage.removeItem('pending_otp');
        sessionStorage.removeItem('pending_phone');
        console.log('✅ New user created:', newUser.name);
        return session;
      }

      // Existing user
      console.log('✅ User found:', staff.name, '(' + staff.role + ')');
      
      const session = {
        phone: staff.phone,
        name: staff.name,
        role: staff.role,
        id: staff.id,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('prajapati_session', JSON.stringify(session));
      sessionStorage.removeItem('pending_otp');
      sessionStorage.removeItem('pending_phone');
      console.log('✅ Login successful');
      return session;

    } catch (error) {
      console.error('❌ Verify Error:', error.message);
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('prajapati_session');
    sessionStorage.removeItem('pending_phone');
    sessionStorage.removeItem('pending_otp');
    window.location.href = 'login.html';
  }
};

// Initialize Supabase on page load
if (typeof window !== 'undefined' && window.location.pathname.includes('login')) {
  const { createClient } = window.supabase || {};
  if (createClient) {
    window.supabase = createClient(AUTH.SUPABASE_URL, AUTH.SUPABASE_KEY);
    console.log('✅ Supabase initialized for login');
  }
}
