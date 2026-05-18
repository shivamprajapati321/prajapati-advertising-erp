const AUTH = {
  
  async getSupabase() {
    if (window.supabase && window.supabase.from) {
      return window.supabase;
    }
    
    const { createClient } = window.supabase;
    if (!createClient) {
      throw new Error('Supabase library not loaded');
    }

    window.supabase = createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );
    
    console.log('✅ Supabase client created');
    return window.supabase;
  },

  getCurrentUser() {
    const session = localStorage.getItem('prajapati_session');
    if (!session) {
      return null;
    }
    try {
      return JSON.parse(session);
    } catch (e) {
      console.error('Failed to parse session:', e);
      return null;
    }
  },

  requireLogin() {
    const session = this.getCurrentUser();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
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

      // Try Wati API (optional - may fail, but continue)
      try {
        console.log('📤 Step 5: Calling Wati API...');
        
        const watiPayload = {
          waNumber: fullPhone,
          templateName: 'login_otp',
          placeholders: [otp],
          broadcast_name: 'Prajapati ERP Login'
        };

        const watiResponse = await fetch(CONFIG.WATI_URL + '/api/v1/sendTemplateMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': CONFIG.WATI_JWT
          },
          body: JSON.stringify(watiPayload)
        });

        console.log('📡 Wati response status:', watiResponse.status);
        
        const responseText = await watiResponse.text();
        console.log('📦 Wati response:', responseText);

        if (watiResponse.ok) {
          console.log('✅ Wati API succeeded');
        } else {
          console.log('⚠️  Wati API failed (non-blocking)');
        }
      } catch (watiError) {
        console.log('⚠️  Wati error (non-blocking):', watiError.message);
      }

      // Fallback: Show OTP in alert
      alert(`✅ OTP GENERATED!\n\n🔐 Your OTP: ${otp}\n\n(In production sent via WhatsApp)`);
      
      console.log('✅ OTP ready for verification');
      return true;

    } catch (error) {
      console.error('❌ CRITICAL ERROR:', error);
      
      // Emergency fallback
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
      const fullPhone = '+91' + cleanPhone;
      
      sessionStorage.setItem('pending_phone', fullPhone);
      sessionStorage.setItem('pending_otp', otp);
      
      alert(`⚠️ USING TEST OTP\n\n🔐 Your OTP: ${otp}`);
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

      // Get Supabase client
      console.log('🔄 Initializing Supabase...');
      const supabase = await this.getSupabase();
      
      if (!supabase || !supabase.from) {
        throw new Error('Supabase client not available');
      }

      // Query user
      console.log('🔍 Looking up user with phone:', cleanPhone);
      const { data: staff, error: queryError } = await supabase
        .from('prajapati_staff')
        .select('id, phone, name, role, status')
        .eq('phone', cleanPhone)
        .limit(1);

      console.log('  Query error:', queryError);
      console.log('  Query data:', staff);

      if (queryError) {
        throw new Error('Database error: ' + queryError.message);
      }

      let user = staff && staff.length > 0 ? staff[0] : null;

      if (!user) {
        // New user - create
        console.log('👤 Creating new user...');
        const { data: newUser, error: createError } = await supabase
          .from('prajapati_staff')
          .insert([{
            phone: cleanPhone,
            name: 'User ' + cleanPhone.slice(-4),
            role: 'staff',
            status: 'active'
          }])
          .select()
          .limit(1);

        console.log('  Create error:', createError);
        console.log('  Created user:', newUser);

        if (createError) {
          throw new Error('Create user failed: ' + createError.message);
        }

        user = newUser && newUser.length > 0 ? newUser[0] : null;
        if (!user) {
          throw new Error('User creation returned empty');
        }
      }

      console.log('✅ User verified:', user.name, '(' + user.role + ')');
      
      const session = {
        phone: user.phone,
        name: user.name,
        role: user.role,
        id: user.id,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('prajapati_session', JSON.stringify(session));
      sessionStorage.removeItem('pending_otp');
      sessionStorage.removeItem('pending_phone');
      
      console.log('✅ Login successful');
      return session;

    } catch (error) {
      console.error('❌ Verify Error:', error.message);
      console.error('   Stack:', error.stack);
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

console.log('✅ AUTH module loaded');
