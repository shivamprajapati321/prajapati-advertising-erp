// ════════════════════════════════════════════════════════════════
// PRAJAPATI ERP - UI Components Library
// Sidebar, Topbar, Toast, and Common UI Elements
// ════════════════════════════════════════════════════════════════

const UI = {
  
  // Render sidebar navigation
  renderSidebar(currentPage) {
    const session = AUTH.getCurrentUser();
    const role = session?.role || 'staff';
    
    const sidebarHTML = `
      <div style="display:flex;flex-direction:column;height:100%;padding:16px;gap:24px;overflow-y:auto">
        
        <!-- Logo -->
        <div style="padding:12px 0;border-bottom:1px solid var(--line)">
          <div style="font-size:16px;font-weight:800;color:var(--accent);margin-bottom:4px">📦 PRAJAPATI</div>
          <div style="font-size:11px;color:var(--mute);font-weight:600">ERP System</div>
        </div>

        <!-- Main Menu -->
        <div>
          <div style="font-size:10px;font-weight:800;color:var(--mute);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Main</div>
          <a href="dashboard.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;margin-bottom:6px;transition:all 0.2s;${currentPage === 'dashboard.html' ? 'background:var(--accent);color:white' : 'background:transparent;'}">📊 Dashboard</a>
          <a href="orders.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;margin-bottom:6px;transition:all 0.2s;${currentPage === 'orders.html' ? 'background:var(--accent);color:white' : 'background:transparent;'}">📋 Orders</a>
        </div>

        <!-- Sales Menu -->
        ${['admin', 'sales', 'hr_sales'].includes(role) ? `
        <div>
          <div style="font-size:10px;font-weight:800;color:var(--mute);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Sales</div>
          <a href="leads.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;margin-bottom:6px;${currentPage === 'leads.html' ? 'background:var(--accent);color:white' : ''}">🎯 Leads CRM</a>
          <a href="customers.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;margin-bottom:6px;${currentPage === 'customers.html' ? 'background:var(--accent);color:white' : ''}">👥 Customers</a>
          <a href="quotations.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;margin-bottom:6px;${currentPage === 'quotations.html' ? 'background:var(--accent);color:white' : ''}">📄 Quotations</a>
          <a href="invoices.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;${currentPage === 'invoices.html' ? 'background:var(--accent);color:white' : ''}">💰 Invoices</a>
        </div>
        ` : ''}

        <!-- Operations Menu -->
        ${['admin', 'operation', 'printing', 'printing_manager', 'stitching', 'stitching_manager', 'execution', 'execution_manager', 'dispatch'].includes(role) ? `
        <div>
          <div style="font-size:10px;font-weight:800;color:var(--mute);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Operations</div>
          <a href="printing.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;margin-bottom:6px;${currentPage === 'printing.html' ? 'background:var(--accent);color:white' : ''}">🖨️ Printing</a>
          <a href="stitching.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;margin-bottom:6px;${currentPage === 'stitching.html' ? 'background:var(--accent);color:white' : ''}">✂️ Stitching</a>
          <a href="execution.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;margin-bottom:6px;${currentPage === 'execution.html' ? 'background:var(--accent);color:white' : ''}">🚀 Execution</a>
          <a href="dispatch.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;${currentPage === 'dispatch.html' ? 'background:var(--accent);color:white' : ''}">🚚 Dispatch</a>
        </div>
        ` : ''}

        <!-- Finance Menu -->
        ${['admin', 'sales', 'hr_sales', 'operation'].includes(role) ? `
        <div>
          <div style="font-size:10px;font-weight:800;color:var(--mute);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Finance</div>
          <a href="reports.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;${currentPage === 'reports.html' ? 'background:var(--accent);color:white' : ''}">📊 Reports</a>
        </div>
        ` : ''}

        <!-- Admin Menu -->
        ${role === 'admin' ? `
        <div>
          <div style="font-size:10px;font-weight:800;color:var(--mute);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Admin</div>
          <a href="team.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;margin-bottom:6px;${currentPage === 'team.html' ? 'background:var(--accent);color:white' : ''}">👥 Team Management</a>
          <a href="settings.html" style="display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--ink);font-weight:600;font-size:13px;${currentPage === 'settings.html' ? 'background:var(--accent);color:white' : ''}">⚙️ Settings</a>
        </div>
        ` : ''}

        <!-- Spacer -->
        <div style="flex:1"></div>

        <!-- User Info & Logout -->
        <div style="border-top:1px solid var(--line);padding-top:12px">
          <div style="font-size:12px;color:var(--ink);font-weight:600;margin-bottom:8px">${session?.name || 'User'}</div>
          <div style="font-size:11px;color:var(--mute);margin-bottom:12px">${session?.phone || 'N/A'}</div>
          <button onclick="AUTH.logout()" style="width:100%;padding:8px 12px;background:var(--red-soft);color:var(--red-dk);border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;transition:all 0.2s;">🚪 Logout</button>
        </div>

      </div>
    `;
    
    return sidebarHTML;
  },

  // Render topbar
  renderTopbar(title) {
    const session = AUTH.getCurrentUser();
    
    const topbarHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid var(--line)">
        <div style="font-size:16px;font-weight:800;color:var(--ink)">${title}</div>
        <div style="display:flex;gap:12px;align-items:center">
          <div style="text-align:right;font-size:12px">
            <div style="color:var(--ink);font-weight:600">${session?.name || 'User'}</div>
            <div style="color:var(--mute);font-size:10px;text-transform:uppercase">${session?.role || 'staff'}</div>
          </div>
          <div style="width:36px;height:36px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:14px">
            ${(session?.name || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    `;
    
    return topbarHTML;
  },

  // Toast notification
  toast(message, type = 'info') {
    const toastId = 'toast-' + Date.now();
    const colors = {
      success: { bg: '#e8f5e9', text: '#2e7d32', icon: '✅' },
      error: { bg: '#ffebee', text: '#c62828', icon: '❌' },
      warning: { bg: '#fff3e0', text: '#e65100', icon: '⚠️' },
      info: { bg: '#e3f2fd', text: '#1565c0', icon: 'ℹ️' }
    };
    
    const color = colors[type] || colors.info;
    
    const toastEl = document.createElement('div');
    toastEl.id = toastId;
    toastEl.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${color.bg};
      color: ${color.text};
      padding: 14px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
    `;
    
    toastEl.textContent = `${color.icon} ${message}`;
    document.body.appendChild(toastEl);
    
    setTimeout(() => {
      toastEl.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toastEl.remove(), 300);
    }, 3000);
  }
};

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);
