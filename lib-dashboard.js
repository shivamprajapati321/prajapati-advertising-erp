// ═══════════════════════════════════════════════════════════════════════════
// PRAJAPATI ERP — Dashboard Data Library
// Calculates role-specific stats for dashboards
// ═══════════════════════════════════════════════════════════════════════════

const DASH = (function() {
  
  // Date helpers
  function getMonthRange(year, month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10)
    };
  }
  
  function getCurrentMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  
  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }
  
  function dayOfMonth() {
    return new Date().getDate();
  }
  
  // ═══════════════════════════════════════════════════════
  // PERSONAL STATS (for sales role)
  // ═══════════════════════════════════════════════════════
  async function getPersonalStats(staffId, staffName) {
    const { year, month } = getCurrentMonth();
    const range = getMonthRange(year, month);
    
    try {
      // Fetch in parallel
      const [leadsRes, leadsLastMonthRes, quotesRes, quotesLastMonthRes, invoicesRes, paymentsRes, targetRes] = await Promise.all([
        // Current month leads
        sb().from('prajapati_leads')
          .select('id, name, stage, budget_estimate, created_at')
          .eq('assigned_to', staffId)
          .gte('created_at', range.start)
          .lte('created_at', range.end + 'T23:59:59'),
        
        // Last month leads
        sb().from('prajapati_leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', staffId)
          .gte('created_at', getMonthRange(year, month - 1 || 12).start)
          .lt('created_at', range.start),
        
        // Current month quotes
        sb().from('prajapati_quotations')
          .select('id, quote_number, customer_name, grand_total, status, created_at')
          .eq('created_by', staffId)
          .gte('created_at', range.start)
          .lte('created_at', range.end + 'T23:59:59'),
        
        // Last month quotes
        sb().from('prajapati_quotations')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', staffId)
          .gte('created_at', getMonthRange(year, month - 1 || 12).start)
          .lt('created_at', range.start),
        
        // Current month invoices
        sb().from('prajapati_invoices')
          .select('id, invoice_number, customer_name, grand_total, payment_made, payment_status, created_at')
          .eq('created_by', staffId)
          .gte('created_at', range.start)
          .lte('created_at', range.end + 'T23:59:59'),
        
        // Current month payments received (revenue)
        sb().from('prajapati_payments')
          .select('id, amount, payment_date, customer_name')
          .eq('created_by', staffId)
          .eq('status', 'received')
          .gte('payment_date', range.start)
          .lte('payment_date', range.end),
        
        // Current month target
        sb().from('prajapati_targets')
          .select('*')
          .eq('staff_id', staffId)
          .eq('period_type', 'monthly')
          .eq('period_year', year)
          .eq('period_month', month)
          .eq('is_active', true)
          .maybeSingle()
      ]);
      
      const leads = leadsRes.data || [];
      const quotes = quotesRes.data || [];
      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];
      const target = targetRes.data;
      
      // Calculate revenue (from paid invoices)
      const revenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const invoicesValue = invoices.reduce((s, i) => s + (Number(i.grand_total) || 0), 0);
      
      // Conversion rate: leads → invoices in current month
      const conversionRate = leads.length > 0 ? Math.round((invoices.length / leads.length) * 100) : 0;
      
      // Pipeline funnel (lead stages)
      const funnel = {
        new: leads.filter(l => l.stage === 'new'),
        contacted: leads.filter(l => l.stage === 'contacted'),
        quoted: leads.filter(l => l.stage === 'quoted'),
        negotiating: leads.filter(l => l.stage === 'negotiating'),
        won: leads.filter(l => l.stage === 'won'),
        lost: leads.filter(l => l.stage === 'lost')
      };
      
      return {
        period: { year, month, name: new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }) },
        leads: {
          count: leads.length,
          lastMonthCount: leadsLastMonthRes.count || 0,
          totalValue: leads.reduce((s, l) => s + (Number(l.budget_estimate) || 0), 0)
        },
        quotes: {
          count: quotes.length,
          lastMonthCount: quotesLastMonthRes.count || 0,
          totalValue: quotes.reduce((s, q) => s + (Number(q.grand_total) || 0), 0),
          accepted: quotes.filter(q => q.status === 'accepted').length,
          pending: quotes.filter(q => ['draft', 'sent'].includes(q.status)).length
        },
        invoices: {
          count: invoices.length,
          totalValue: invoicesValue,
          paid: invoices.filter(i => i.payment_status === 'paid').length,
          unpaid: invoices.filter(i => i.payment_status === 'unpaid').length,
          partial: invoices.filter(i => i.payment_status === 'partial').length,
          outstanding: invoices.reduce((s, i) => s + (Number(i.grand_total) - Number(i.payment_made || 0)), 0)
        },
        revenue: {
          total: revenue,
          payments: payments
        },
        conversionRate,
        target: target,
        funnel
      };
    } catch (e) {
      console.error('getPersonalStats error:', e);
      return null;
    }
  }
  
  // ═══════════════════════════════════════════════════════
  // TEAM LEADERBOARD (for sales role + admin)
  // ═══════════════════════════════════════════════════════
  async function getLeaderboard() {
    const { year, month } = getCurrentMonth();
    const range = getMonthRange(year, month);
    
    try {
      // Get all sales-eligible staff
      const { data: salesStaff } = await sb()
        .from('prajapati_staff')
        .select('id, name, role, department')
        .eq('status', 'active')
        .in('role', ['admin', 'hr_sales', 'sales', 'operations_manager']);
      
      // Get all payments this month grouped by staff
      const { data: payments } = await sb()
        .from('prajapati_payments')
        .select('created_by, amount')
        .eq('status', 'received')
        .gte('payment_date', range.start)
        .lte('payment_date', range.end);
      
      // Get all targets
      const { data: targets } = await sb()
        .from('prajapati_targets')
        .select('staff_id, revenue_target')
        .eq('period_type', 'monthly')
        .eq('period_year', year)
        .eq('period_month', month)
        .eq('is_active', true);
      
      const targetMap = new Map();
      (targets || []).forEach(t => targetMap.set(t.staff_id, t.revenue_target));
      
      // Calculate revenue per staff
      const revenueMap = new Map();
      (payments || []).forEach(p => {
        if (!p.created_by) return;
        revenueMap.set(p.created_by, (revenueMap.get(p.created_by) || 0) + Number(p.amount));
      });
      
      // Build leaderboard
      const leaderboard = (salesStaff || []).map(s => {
        const revenue = revenueMap.get(s.id) || 0;
        const target = targetMap.get(s.id) || 0;
        const achievement = target > 0 ? Math.round((revenue / target) * 100) : 0;
        return {
          staffId: s.id,
          name: s.name,
          role: s.role,
          revenue,
          target,
          achievement
        };
      }).sort((a, b) => b.revenue - a.revenue);
      
      return leaderboard;
    } catch (e) {
      console.error('getLeaderboard error:', e);
      return [];
    }
  }
  
  // ═══════════════════════════════════════════════════════
  // RECENT ACTIVITY FEED
  // ═══════════════════════════════════════════════════════
  async function getRecentActivity(staffId = null, limit = 10) {
    try {
      let query = sb()
        .from('prajapati_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (staffId) {
        query = query.eq('staff_id', staffId);
      }
      
      const { data } = await query;
      return data || [];
    } catch (e) {
      console.error('getRecentActivity error:', e);
      return [];
    }
  }
  
  // ═══════════════════════════════════════════════════════
  // TODAY'S ACTION ITEMS (urgent tasks)
  // ═══════════════════════════════════════════════════════
  async function getTodaysActions(staffId) {
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = today;
    const todayEnd = today + 'T23:59:59';
    
    try {
      const [hotLeadsRes, expiringQuotesRes, pendingPaymentsRes, oldLeadsRes] = await Promise.all([
        // Hot leads: high priority, not contacted in 3+ days
        sb().from('prajapati_leads')
          .select('id, lead_id, name, company, phone, priority, stage, created_at, last_contacted_at')
          .eq('assigned_to', staffId)
          .in('stage', ['new', 'contacted'])
          .in('priority', ['high', 'urgent'])
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Quotes expiring today/tomorrow
        sb().from('prajapati_quotations')
          .select('id, quote_number, customer_name, customer_phone, grand_total, validity_date, status')
          .eq('created_by', staffId)
          .in('status', ['draft', 'sent'])
          .lte('validity_date', new Date(Date.now() + 86400000).toISOString().slice(0, 10))
          .order('validity_date'),
        
        // Unpaid invoices
        sb().from('prajapati_invoices')
          .select('id, invoice_number, customer_name, customer_phone, grand_total, balance_due, due_date, payment_status')
          .eq('created_by', staffId)
          .eq('payment_status', 'unpaid')
          .order('due_date')
          .limit(5),
        
        // Stale leads (no contact in 7+ days)
        sb().from('prajapati_leads')
          .select('id, lead_id, name, company, phone, stage, created_at, last_contacted_at')
          .eq('assigned_to', staffId)
          .in('stage', ['new', 'contacted', 'quoted', 'negotiating'])
          .lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
          .order('created_at')
          .limit(5)
      ]);
      
      return {
        hotLeads: hotLeadsRes.data || [],
        expiringQuotes: expiringQuotesRes.data || [],
        pendingPayments: pendingPaymentsRes.data || [],
        staleLeads: oldLeadsRes.data || []
      };
    } catch (e) {
      console.error('getTodaysActions error:', e);
      return { hotLeads: [], expiringQuotes: [], pendingPayments: [], staleLeads: [] };
    }
  }
  
  // ═══════════════════════════════════════════════════════
  // ADMIN-WIDE STATS
  // ═══════════════════════════════════════════════════════
  async function getAdminStats() {
    const { year, month } = getCurrentMonth();
    const range = getMonthRange(year, month);
    const lastMonthRange = getMonthRange(year, month - 1 || 12);
    
    try {
      const [leadsRes, quotesRes, invoicesRes, paymentsRes, lastMonthPaymentsRes, allInvoicesRes] = await Promise.all([
        sb().from('prajapati_leads').select('id, stage, budget_estimate, created_at').gte('created_at', range.start),
        sb().from('prajapati_quotations').select('id, grand_total, status, created_at').gte('created_at', range.start),
        sb().from('prajapati_invoices').select('id, grand_total, payment_made, payment_status, created_at').gte('created_at', range.start),
        sb().from('prajapati_payments').select('amount, payment_method, payment_date').eq('status', 'received').gte('payment_date', range.start).lte('payment_date', range.end),
        sb().from('prajapati_payments').select('amount').eq('status', 'received').gte('payment_date', lastMonthRange.start).lte('payment_date', lastMonthRange.end),
        sb().from('prajapati_invoices').select('id, grand_total, payment_made, balance_due, payment_status, customer_name')
      ]);
      
      const leads = leadsRes.data || [];
      const quotes = quotesRes.data || [];
      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];
      const lastMonthPayments = lastMonthPaymentsRes.data || [];
      const allInvoices = allInvoicesRes.data || [];
      
      const revenue = payments.reduce((s, p) => s + Number(p.amount), 0);
      const lastMonthRevenue = lastMonthPayments.reduce((s, p) => s + Number(p.amount), 0);
      const totalOutstanding = allInvoices.reduce((s, i) => s + (Number(i.balance_due) || 0), 0);
      
      // Payment method breakdown
      const paymentMethods = {};
      payments.forEach(p => {
        paymentMethods[p.payment_method] = (paymentMethods[p.payment_method] || 0) + Number(p.amount);
      });
      
      // Top customers (by total invoice value)
      const customerMap = new Map();
      allInvoices.forEach(i => {
        const key = i.customer_name;
        if (!customerMap.has(key)) {
          customerMap.set(key, { name: key, invoiceCount: 0, totalValue: 0, paid: 0, balance: 0 });
        }
        const c = customerMap.get(key);
        c.invoiceCount++;
        c.totalValue += Number(i.grand_total) || 0;
        c.paid += Number(i.payment_made) || 0;
        c.balance += Number(i.balance_due) || 0;
      });
      const topCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);
      
      return {
        period: { year, month, name: new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }) },
        leads: { count: leads.length, totalValue: leads.reduce((s, l) => s + (Number(l.budget_estimate) || 0), 0) },
        quotes: { count: quotes.length, totalValue: quotes.reduce((s, q) => s + (Number(q.grand_total) || 0), 0) },
        invoices: { count: invoices.length, totalValue: invoices.reduce((s, i) => s + (Number(i.grand_total) || 0), 0) },
        revenue: { total: revenue, lastMonth: lastMonthRevenue, growth: lastMonthRevenue > 0 ? Math.round(((revenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0 },
        outstanding: totalOutstanding,
        paymentMethods,
        topCustomers,
        funnel: {
          new: leads.filter(l => l.stage === 'new').length,
          contacted: leads.filter(l => l.stage === 'contacted').length,
          quoted: leads.filter(l => l.stage === 'quoted').length,
          negotiating: leads.filter(l => l.stage === 'negotiating').length,
          won: leads.filter(l => l.stage === 'won').length
        }
      };
    } catch (e) {
      console.error('getAdminStats error:', e);
      return null;
    }
  }
  
  // ═══════════════════════════════════════════════════════
  // SET TARGET (admin only)
  // ═══════════════════════════════════════════════════════
  async function setTarget(staffId, staffName, year, month, targets, adminId, adminName) {
    const payload = {
      staff_id: staffId,
      staff_name: staffName,
      period_type: 'monthly',
      period_year: year,
      period_month: month,
      revenue_target: targets.revenue || null,
      leads_target: targets.leads || null,
      quotes_target: targets.quotes || null,
      invoices_target: targets.invoices || null,
      conversion_rate_target: targets.conversion || null,
      notes: targets.notes || null,
      is_active: true,
      created_by: adminId,
      created_by_name: adminName,
      updated_at: new Date().toISOString()
    };
    
    // Upsert (update if exists, insert if not)
    const { error } = await sb()
      .from('prajapati_targets')
      .upsert(payload, { onConflict: 'staff_id,period_type,period_year,period_month' });
    
    if (error) throw error;
    return true;
  }
  
  // ═══════════════════════════════════════════════════════
  // GET ALL TARGETS (admin view)
  // ═══════════════════════════════════════════════════════
  async function getAllTargets(year, month) {
    try {
      const { data } = await sb()
        .from('prajapati_targets')
        .select('*')
        .eq('period_type', 'monthly')
        .eq('period_year', year)
        .eq('period_month', month)
        .eq('is_active', true)
        .order('staff_name');
      return data || [];
    } catch (e) {
      console.error('getAllTargets error:', e);
      return [];
    }
  }
  
  // ═══════════════════════════════════════════════════════
  // FORMAT HELPERS
  // ═══════════════════════════════════════════════════════
  function fmtINR(num) {
    if (!num) return '₹0';
    const n = Number(num);
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + 'Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
  
  function fmtINRFull(num) {
    if (!num) return '₹0';
    return '₹' + Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
  
  function timeAgo(dateStr) {
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hrs ago';
    if (seconds < 86400 * 7) return Math.floor(seconds / 86400) + ' days ago';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }
  
  return {
    getPersonalStats,
    getLeaderboard,
    getRecentActivity,
    getTodaysActions,
    getAdminStats,
    setTarget,
    getAllTargets,
    fmtINR,
    fmtINRFull,
    timeAgo,
    daysInMonth,
    dayOfMonth,
    getCurrentMonth
  };
})();
