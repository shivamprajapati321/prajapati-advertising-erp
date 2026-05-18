// ═══════════════════════════════════════════════════════════════════════════
// PRAJAPATI ERP — WhatsApp Library v2 (Wati API + Web fallback chooser)
// 
// Features:
//   1. Fixed JSON parse error (handles empty Wati responses safely)
//   2. Dual-option chooser modal (Wati Direct OR WhatsApp Web)
//   3. Better error handling
//   4. Auto-logs all sends to prajapati_whatsapp_log
// ═══════════════════════════════════════════════════════════════════════════

const WA = (function() {
  
  // Wati credentials
  const WATI_BASE = 'https://live-mt-server.wati.io/1077226';
  const WATI_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4ZjBjOWM2NS1lOTlkLTRiNTYtOTQ1YS1hY2YyZWY1MjFjMmIiLCJ1bmlxdWVfbmFtZSI6ImluZm9AcHJhamFwYXRpYWR2ZXJ0aXNpbmcuY29tIiwibmFtZWlkIjoiaW5mb0BwcmFqYXBhdGlhZHZlcnRpc2luZy5jb20iLCJlbWFpbCI6ImluZm9AcHJhamFwYXRpYWR2ZXJ0aXNpbmcuY29tIiwiYXV0aF90aW1lIjoiMTAvMjAvMjAyNSAxMjozNDoxNCIsInRlbmFudF9pZCI6IjEwNzcyMjYiLCJkYl9uYW1lIjoibXQtcHJvZC1UZW5hbnRzIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcyI6IkFETUlOSVNUUkFUT1IiLCJleHAiOjI1MzQwMjMwMDgwMCwiaXNzIjoiQ2xhcmVfQUkiLCJhdWQiOiJDbGFyZV9BSSJ9.usS7xqs6rhjkBjtnXfAbfHt7ZCCfBAXj6HNv6WYUw2M';
  
  function formatPhone(phone) {
    if (!phone) return null;
    let p = String(phone).replace(/[^0-9]/g, '');
    if (p.length === 10) p = '91' + p;
    if (p.length === 12 && p.startsWith('91')) return p;
    return null;
  }
  
  // Safe JSON parse - handles empty/non-JSON responses
  async function safeJsonParse(response) {
    try {
      const text = await response.text();
      if (!text || text.trim() === '') {
        return { result: false, message: 'Empty response from API', _empty: true };
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        return { result: false, message: 'Non-JSON response', _raw: text };
      }
    } catch (e) {
      return { result: false, message: 'Failed to read response' };
    }
  }
  
  async function sendTextMessage(phone, message, sessionInfo = null) {
    const formattedPhone = formatPhone(phone);
    if (!formattedPhone) throw new Error('Invalid phone number');
    
    try {
      const response = await fetch(`${WATI_BASE}/api/v1/sendSessionMessage/${formattedPhone}`, {
        method: 'POST',
        headers: {
          'Authorization': WATI_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `messageText=${encodeURIComponent(message)}`
      });
      
      const data = await safeJsonParse(response);
      
      if (!response.ok) {
        throw new Error(data.message || `Wati API HTTP ${response.status}`);
      }
      if (data._empty) {
        throw new Error('Wati session expired (customer hasn\'t messaged in 24hrs). Use WhatsApp Web instead.');
      }
      if (data.result === false) {
        throw new Error(data.message || 'Wati API returned failure');
      }
      
      if (sessionInfo) {
        await logMessage({
          phone: formattedPhone,
          message_type: sessionInfo.messageType || 'text',
          message_text: message,
          status: 'sent',
          wati_message_id: data.id || null,
          sent_by: sessionInfo.staffId,
          sent_by_name: sessionInfo.name,
          customer_name: sessionInfo.customerName,
          customer_id: sessionInfo.customerId,
          lead_id: sessionInfo.leadId,
          quote_id: sessionInfo.quoteId,
          invoice_id: sessionInfo.invoiceId
        });
      }
      
      return { success: true, data };
    } catch (e) {
      if (sessionInfo) {
        await logMessage({
          phone: formattedPhone,
          message_type: 'text',
          message_text: message,
          status: 'failed',
          error_message: e.message,
          sent_by: sessionInfo.staffId,
          sent_by_name: sessionInfo.name,
          customer_name: sessionInfo.customerName
        }).catch(() => {});
      }
      console.error('WhatsApp send error:', e);
      throw e;
    }
  }
  
  async function sendDocument(phone, pdfBlob, filename, caption = '', metadata = null) {
    const formattedPhone = formatPhone(phone);
    if (!formattedPhone) throw new Error('Invalid phone number');
    
    try {
      const formData = new FormData();
      formData.append('file', pdfBlob, filename);
      if (caption) formData.append('caption', caption);
      
      const response = await fetch(`${WATI_BASE}/api/v1/sendSessionFile/${formattedPhone}`, {
        method: 'POST',
        headers: { 'Authorization': WATI_TOKEN },
        body: formData
      });
      
      const data = await safeJsonParse(response);
      
      if (!response.ok || data._empty || data.result === false) {
        throw new Error(data.message || `Wati API error: ${response.status}`);
      }
      
      if (metadata) {
        await logMessage({
          phone: formattedPhone,
          message_type: metadata.type || 'document',
          message_text: caption,
          attachment_type: 'pdf',
          attachment_filename: filename,
          status: 'sent',
          wati_message_id: data.id || null,
          sent_by: metadata.staffId,
          sent_by_name: metadata.staffName,
          customer_name: metadata.customerName,
          customer_id: metadata.customerId,
          quote_id: metadata.quoteId,
          invoice_id: metadata.invoiceId
        });
      }
      
      return { success: true, data };
    } catch (e) {
      console.error('WhatsApp document send error:', e);
      throw e;
    }
  }
  
  async function logMessage(payload) {
    try {
      await sb().from('prajapati_whatsapp_log').insert({
        ...payload,
        sent_at: ['sent','sent_via_web'].includes(payload.status) ? new Date().toISOString() : null
      });
    } catch (e) {
      console.warn('WA log error:', e);
    }
  }
  
  // Message builders
  function buildQuoteMessage(quote, settings) {
    return `🙏 Namaste ${quote.customer_name}!\n\n` +
      `Aapke liye quotation taiyaar hai:\n` +
      `📋 Quote #: ${quote.quote_number}\n` +
      `💰 Amount: ₹${Number(quote.grand_total).toLocaleString('en-IN')}\n` +
      `📅 Valid till: ${new Date(quote.validity_date).toLocaleDateString('en-IN')}\n\n` +
      `Quote PDF attached above. Koi bhi prashn ho to message kariye!\n\n` +
      `Thanks,\n${settings.company_name || 'Prajapati Advertising'}\n` +
      `${settings.phone_primary || '+91 99 22 138 138'}\n` +
      `${settings.website || 'www.prajapatiadvertising.com'}`;
  }
  
  function buildInvoiceMessage(invoice, settings) {
    const balance = Number(invoice.grand_total) - Number(invoice.payment_made || 0);
    return `🙏 Namaste ${invoice.customer_name}!\n\n` +
      `Aapka tax invoice taiyaar hai:\n` +
      `🧾 Invoice #: ${invoice.invoice_number}\n` +
      `💰 Amount: ₹${Number(invoice.grand_total).toLocaleString('en-IN')}\n` +
      `${balance > 0 ? `⏳ Pending: ₹${balance.toLocaleString('en-IN')}\n` : '✅ Fully Paid\n'}` +
      `📅 Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}\n\n` +
      `Invoice PDF attached. Bank details:\n` +
      `Account: 917020057143757\nIFSC: UTIB0002652 (Axis Bank)\n\n` +
      `Thanks,\n${settings.company_name || 'Prajapati Advertising'}\n` +
      `${settings.phone_primary || '+91 99 22 138 138'}`;
  }
  
  function buildReceiptMessage(payment, invoice, settings) {
    return `🙏 Namaste ${payment.customer_name || invoice.customer_name}!\n\n` +
      `✅ Payment received - Receipt attached\n\n` +
      `🧾 Receipt #: ${payment.receipt_number}\n` +
      `💰 Amount: ₹${Number(payment.amount).toLocaleString('en-IN')}\n` +
      `📅 Date: ${new Date(payment.payment_date).toLocaleDateString('en-IN')}\n` +
      `🏦 Method: ${payment.payment_method}\n` +
      `📋 Invoice Ref: #${invoice.invoice_number}\n\n` +
      `Thank you for your business!\n\n` +
      `${settings.company_name || 'Prajapati Advertising'}\n` +
      `${settings.phone_primary || '+91 99 22 138 138'}`;
  }
  
  function buildPaymentReminder(invoice, settings) {
    const balance = Number(invoice.grand_total) - Number(invoice.payment_made || 0);
    const daysOverdue = invoice.due_date 
      ? Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000))
      : 0;
    
    return `🙏 Namaste ${invoice.customer_name}!\n\n` +
      `Friendly reminder for pending payment:\n\n` +
      `🧾 Invoice #: ${invoice.invoice_number}\n` +
      `💰 Total: ₹${Number(invoice.grand_total).toLocaleString('en-IN')}\n` +
      `✅ Paid: ₹${Number(invoice.payment_made || 0).toLocaleString('en-IN')}\n` +
      `⏳ Pending: ₹${balance.toLocaleString('en-IN')}\n` +
      `${daysOverdue > 0 ? `🚨 Overdue by ${daysOverdue} days\n\n` : '\n'}` +
      `Bank details:\n` +
      `Account: 917020057143757\nIFSC: UTIB0002652 (Axis Bank)\n` +
      `Account Name: Prajapati Advertising\n\n` +
      `Payment ki receipt mil jayegi turant. Koi prashn ho to call kariye:\n` +
      `${settings.phone_primary || '+91 99 22 138 138'}\n\n` +
      `Dhanyawad,\n${settings.company_name || 'Prajapati Advertising'}`;
  }
  
  function openWhatsAppWeb(phone, message) {
    const formattedPhone = formatPhone(phone);
    if (!formattedPhone) {
      alert('Invalid phone number');
      return;
    }
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }
  
  // ⭐ NEW: Dual-option chooser modal
  function showSendChooser(options) {
    const {
      phone,
      message,
      customerName = 'Customer',
      sessionInfo = null,
      onSuccess = null,
      onCancel = null
    } = options;
    
    const existing = document.getElementById('wa-chooser-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'wa-chooser-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(11,25,87,0.65);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
    
    const previewText = message.length > 200 ? message.substring(0, 200) + '...' : message;
    
    modal.innerHTML = `
      <div style="background:white;border-radius:16px;max-width:520px;width:100%;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.3);font-family:'Plus Jakarta Sans',sans-serif">
        <div style="padding:18px 22px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:18px;font-weight:800;color:#0B1957">💬 Send WhatsApp</div>
            <div style="font-size:12px;color:#6B7280;font-weight:600;margin-top:2px">To: ${customerName} · ${phone}</div>
          </div>
          <div id="wa-chooser-close" style="width:30px;height:30px;border-radius:8px;background:#F3F4F6;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px">✕</div>
        </div>
        <div style="padding:18px 22px;background:#F9FAFB;border-bottom:1px solid #E5E7EB">
          <div style="font-size:11px;font-weight:800;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px">Message Preview</div>
          <div id="wa-msg-preview" style="background:white;padding:12px;border-radius:8px;border:1px solid #E5E7EB;font-size:12px;color:#1F2937;font-weight:500;white-space:pre-wrap;max-height:150px;overflow-y:auto">${previewText.replace(/</g, '&lt;')}</div>
          <button id="wa-edit-msg-btn" style="margin-top:8px;background:none;border:none;color:#2563EB;font-size:11px;font-weight:700;cursor:pointer;text-decoration:underline">✏️ Edit message</button>
        </div>
        <div style="padding:18px 22px;display:flex;flex-direction:column;gap:10px">
          <button id="wa-send-web-btn" style="background:linear-gradient(135deg,#25D366,#128C7E);color:white;border:none;padding:14px 18px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:12px;text-align:left;transition:all 0.2s;font-family:inherit">
            <div style="font-size:24px">🌐</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:800">Open WhatsApp Web ⭐ Recommended</div>
              <div style="font-size:11px;font-weight:600;opacity:0.9;margin-top:2px">Works for any customer • Pre-filled message</div>
            </div>
            <div style="font-size:18px">→</div>
          </button>
          <button id="wa-send-wati-btn" style="background:white;color:#1F2937;border:2px solid #25D366;padding:14px 18px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:12px;text-align:left;transition:all 0.2s;font-family:inherit">
            <div style="font-size:24px">⚡</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:800">Send via Wati API</div>
              <div style="font-size:11px;font-weight:600;color:#6B7280;margin-top:2px">Only if customer messaged in 24hrs • Auto-logged</div>
            </div>
            <div style="font-size:18px;color:#25D366">→</div>
          </button>
        </div>
        <div style="padding:12px 22px;background:#FFF7ED;border-top:1px solid #FED7AA;font-size:11px;color:#9A3412;font-weight:600">
          💡 <strong>For new leads, use WhatsApp Web.</strong> Wati direct works only if customer messaged you in last 24hrs.
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    let currentMessage = message;
    
    document.getElementById('wa-chooser-close').onclick = () => {
      modal.remove();
      if (onCancel) onCancel();
    };
    
    document.getElementById('wa-edit-msg-btn').onclick = () => {
      const newMsg = prompt('Edit message:', currentMessage);
      if (newMsg !== null && newMsg.trim() !== '') {
        currentMessage = newMsg;
        const preview = newMsg.length > 200 ? newMsg.substring(0, 200) + '...' : newMsg;
        document.getElementById('wa-msg-preview').textContent = preview;
      }
    };
    
    document.getElementById('wa-send-wati-btn').onclick = async () => {
      const btn = document.getElementById('wa-send-wati-btn');
      btn.disabled = true;
      btn.innerHTML = '<div style="font-size:24px">⏳</div><div style="flex:1"><div style="font-size:14px;font-weight:800">Sending via Wati...</div></div>';
      
      try {
        await sendTextMessage(phone, currentMessage, sessionInfo);
        modal.remove();
        if (typeof UI !== 'undefined') UI.toast('✅ Sent via Wati!', 'success');
        if (onSuccess) onSuccess('wati');
      } catch (e) {
        btn.disabled = false;
        btn.innerHTML = `
          <div style="font-size:24px">⚡</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:800">Send via Wati API</div>
            <div style="font-size:11px;font-weight:600;color:#6B7280;margin-top:2px">Only if customer messaged in 24hrs • Auto-logged</div>
          </div>
          <div style="font-size:18px;color:#25D366">→</div>
        `;
        if (typeof UI !== 'undefined') UI.toast(`❌ ${e.message}`, 'error');
        
        // Highlight Web option (it's now the green button)
        const webBtn = document.getElementById('wa-send-web-btn');
        if (webBtn) {
          webBtn.style.boxShadow = '0 0 20px rgba(37, 211, 102, 0.6)';
          webBtn.style.transform = 'scale(1.03)';
        }
      }
    };
    
    document.getElementById('wa-send-web-btn').onclick = () => {
      openWhatsAppWeb(phone, currentMessage);
      
      if (sessionInfo) {
        logMessage({
          phone: formatPhone(phone),
          customer_name: sessionInfo.customerName || customerName,
          customer_id: sessionInfo.customerId,
          lead_id: sessionInfo.leadId,
          quote_id: sessionInfo.quoteId,
          invoice_id: sessionInfo.invoiceId,
          message_type: sessionInfo.messageType || 'text',
          message_text: currentMessage,
          status: 'sent_via_web',
          sent_by: sessionInfo.staffId,
          sent_by_name: sessionInfo.name
        }).catch(() => {});
      }
      
      modal.remove();
      if (typeof UI !== 'undefined') UI.toast('🌐 WhatsApp Web opened in new tab', 'info');
      if (onSuccess) onSuccess('web');
    };
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        if (onCancel) onCancel();
      }
    });
  }
  
  async function getSendHistory(filter = {}) {
    let query = sb().from('prajapati_whatsapp_log').select('*').order('created_at', { ascending: false });
    if (filter.customer_id) query = query.eq('customer_id', filter.customer_id);
    if (filter.invoice_id) query = query.eq('invoice_id', filter.invoice_id);
    if (filter.quote_id) query = query.eq('quote_id', filter.quote_id);
    if (filter.phone) query = query.eq('phone', formatPhone(filter.phone));
    const { data } = await query.limit(50);
    return data || [];
  }
  
  return {
    formatPhone,
    sendTextMessage,
    sendDocument,
    openWhatsAppWeb,
    showSendChooser,
    logMessage,
    buildQuoteMessage,
    buildInvoiceMessage,
    buildReceiptMessage,
    buildPaymentReminder,
    getSendHistory
  };
})();
