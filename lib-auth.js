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
      console.log('📱 Sending OTP to:', phone);
      
      // Normalize phone: remove +91, spaces, dashes
      const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
      const fullPhone = '+91' + cleanPhone;
      
      console.log('📞 Normalized to:', fullPhone);

      // Call Wati API
      const response = await fetch(this.WATI_URL + '/api/v1/sendTemplateMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.WATI_JWT
        },
        body: JSON.stringify({
          waNumber: fullPhone,
          templateName: 'login_otp',
          placeholders: ['123456'],
          broadcast_name: 'Prajapati ERP Login'
        })
      });

      console.log('📡 Wati response:', response.status);
      const data = await response.json();
      console.log('📦 Response body:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP: ' + response.status);
      }

      // Store pending phone for OTP verification
      sessionStorage.setItem('pending_phone', fullPhone);
      console.log('✅ OTP sent successfully');
      return true;
    } catch (error) {
      console.error('❌ OTP Send Error:', error);
      alert('❌ OTP Send Failed:\n' + error.message);
      return false;
    }
  },

  async verifyOTP(phone, otp) {
    try {
      console.log('🔐 Verifying OTP:', otp);
      
      // Normalize phone
      const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
      const fullPhone = '+91' + cleanPhone;

      // For MVP: accept any 6-digit OTP that matches pattern
      // In production: verify against sent OTP
      if (!/^\d{6}$/.test(otp)) {
        throw new Error('Invalid OTP format. Must be 6 digits.');
      }

      // Query Supabase for user
      const { data: staff, error: queryError } = await window.supabase
        .from('prajapati_staff')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      if (queryError) {
        // New user - create entry
        console.log('👤 New user, creating account...');
        const { data: newUser, error: createError } = await window.supabase
          .from('prajapati_staff')
          .insert([{
            phone: cleanPhone,
            name: 'User ' + cleanPhone.slice(-4),
            role: 'staff',
            status: 'active'
          }])
          .select()
          .single();

        if (createError) throw createError;
        
        const session = {
          phone: newUser.phone,
          name: newUser.name,
          role: newUser.role,
          id: newUser.id,
          loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('prajapati_session', JSON.stringify(session));
        console.log('✅ New user created and logged in');
        return session;
      }

      // Existing user - verify role
      console.log('✅ User found:', staff.name, '(' + staff.role + ')');
      
      const session = {
        phone: staff.phone,
        name: staff.name,
        role: staff.role,
        id: staff.id,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('prajapati_session', JSON.stringify(session));
      sessionStorage.removeItem('pending_phone');
      console.log('✅ Login successful');
      return session;
    } catch (error) {
      console.error('❌ OTP Verify Error:', error);
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('prajapati_session');
    sessionStorage.removeItem('pending_phone');
    window.location.href = 'login.html';
  }
};

// Initialize Supabase
if (typeof window !== 'undefined') {
  window.supabase = window.supabase || {};
  if (!window.supabase.from) {
    const { createClient } = window.supabase || {};
    if (createClient) {
      window.supabase = createClient(AUTH.SUPABASE_URL, AUTH.SUPABASE_KEY);
    }
  }
}
