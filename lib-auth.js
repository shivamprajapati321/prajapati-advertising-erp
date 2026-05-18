// ════════════════════════════════════════════════════════════════
// PRAJAPATI ERP - Authentication Library
// WhatsApp OTP Login & Session Management
// ════════════════════════════════════════════════════════════════

const AUTH = {
  // Check if user has access to specific module
  requireModule(module) {
    const session = getSession();
    
    if (!session) {
      window.location.href = '/login.html';
      return null;
    }

    // Module permissions check
    const moduleAccess = {
      orders: ['admin', 'sales', 'hr_sales', 'operation', 'execution_manager', 'dispatch'],
      printing: ['admin', 'printing', 'printing_manager', 'operation'],
      stitching: ['admin', 'stitching', 'stitching_manager', 'operation'],
      execution: ['admin', 'execution', 'execution_manager', 'operation'],
      dispatch: ['admin', 'dispatch', 'operation'],
      reports: ['admin', 'sales', 'hr_sales', 'operation'],
      team: ['admin'],
      dashboard: ['admin', 'sales', 'hr_sales', 'operation', 'printing', 'stitching', 'execution', 'dispatch', 'staff']
    };

    const allowedRoles = moduleAccess[module] || [];
    
    if (!allowedRoles.includes(session.role)) {
      console.error(`Access denied to ${module}. Your role: ${session.role}`);
      window.location.href = '/dashboard.html';
      return null;
    }

    return session;
  },

  // Check if authenticated
  isAuthenticated() {
    return getSession() !== null;
  },

  // Get current user
  getCurrentUser() {
    return getSession();
  },

  // Logout
  logout() {
    clearSession();
    window.location.href = '/login.html';
  }
};

// Auto-check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const publicPages = ['login.html', 'index.html', ''];

  if (!publicPages.includes(currentPage) && !AUTH.isAuthenticated()) {
    window.location.href = '/login.html';
  }
});
