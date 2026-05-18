// ════════════════════════════════════════════════════════════════
// PRAJAPATI ERP - Customer Search Library
// Autocomplete & Customer Lookup
// ════════════════════════════════════════════════════════════════

const CUSTSEARCH = {
  config: {
    inputEl: null,
    placeholder: 'Search customers...',
    onSelect: null,
    minChars: 2
  },

  attach(options) {
    this.config = { ...this.config, ...options };
    const input = this.config.inputEl;
    
    if (!input) return;

    // Add autocomplete list
    const listEl = document.createElement('div');
    listEl.id = 'customer-search-list';
    listEl.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid var(--line);
      border-radius: 8px;
      max-height: 250px;
      overflow-y: auto;
      display: none;
      z-index: 1000;
      width: ${input.offsetWidth}px;
      margin-top: 4px;
    `;
    
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(listEl);

    // Input listener
    input.addEventListener('input', async (e) => {
      const query = e.target.value.trim();
      
      if (query.length < this.config.minChars) {
        listEl.style.display = 'none';
        return;
      }

      await this.search(query, listEl);
    });

    // Close on blur
    input.addEventListener('blur', () => {
      setTimeout(() => listEl.style.display = 'none', 200);
    });
  },

  async search(query, listEl) {
    try {
      const { data, error } = await sb()
        .from('prajapati_staff')
        .select('id, name, phone')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (error) throw error;

      this.renderList(data || [], listEl);
    } catch (err) {
      console.error('Customer search error:', err);
      listEl.style.display = 'none';
    }
  },

  renderList(customers, listEl) {
    if (customers.length === 0) {
      listEl.innerHTML = '<div style="padding:12px;text-align:center;color:var(--mute);font-size:12px;">No customers found</div>';
      listEl.style.display = 'block';
      return;
    }

    listEl.innerHTML = customers.map(c => `
      <div onclick="CUSTSEARCH.selectCustomer('${c.id}', '${c.name}', '${c.phone}')" 
           style="padding:12px;border-bottom:1px solid var(--line);cursor:pointer;transition:all 0.2s;font-size:13px;font-weight:600;color:var(--ink);"
           onmouseover="this.style.background='var(--soft)'"
           onmouseout="this.style.background='transparent'">
        <div>${c.name}</div>
        <div style="font-size:11px;color:var(--mute);margin-top:4px">${c.phone}</div>
      </div>
    `).join('');

    listEl.style.display = 'block';
  },

  selectCustomer(id, name, phone) {
    this.config.inputEl.value = name;
    
    document.getElementById('customer-search-list').style.display = 'none';

    if (this.config.onSelect) {
      this.config.onSelect({
        id,
        name,
        phone,
        lead_id: null,
        quote_id: null,
        invoice_id: null
      });
    }
  }
};
