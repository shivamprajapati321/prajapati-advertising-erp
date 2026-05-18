// ═══════════════════════════════════════════════════════════════════════════
// PRAJAPATI ERP — PDF Generator Library
// Matches exact Zoho format from EST-000628.pdf and 3647.pdf
// ═══════════════════════════════════════════════════════════════════════════

const PDF = (function() {

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function fmtINR(num) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDate(d) {
    if (!d) return '';
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Document type label mapping
  function getDocLabel(doc, isInvoice) {
    if (isInvoice) return 'TAX INVOICE';
    const t = doc.document_type || 'estimate';
    if (t === 'proforma') return 'Proforma\nInvoice';
    if (t === 'quotation') return 'Quotation';
    return 'Proforma\nInvoice';  // default for estimate
  }

  // ═══════════════════════════════════════════════════════════════════════
  // QUOTATION/ESTIMATE PDF
  // ═══════════════════════════════════════════════════════════════════════
  function generateQuotationPDF(quote, items, settings, bank) {
    const docLabel = getDocLabel(quote, false);
    const html = buildPdfHTML({
      doc: quote,
      items: items || [],
      settings: settings || {},
      bank: bank || {},
      isInvoice: false,
      docLabel,
      docNumberLabel: '#',
      docNumberValue: quote.quote_number || '',
      dateLabel: 'Estimate Date',
      dateValue: fmtDate(quote.quote_date)
    });
    openPdfWindow(html, `${quote.quote_number}-${quote.customer_name}.pdf`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INVOICE PDF (Tax Invoice)
  // ═══════════════════════════════════════════════════════════════════════
  function generateInvoicePDF(invoice, items, settings, bank) {
    const html = buildPdfHTML({
      doc: invoice,
      items: items || [],
      settings: settings || {},
      bank: bank || {},
      isInvoice: true,
      docLabel: 'TAX INVOICE',
      docNumberLabel: 'Invoice #',
      docNumberValue: invoice.invoice_number || '',
      dateLabel: 'Invoice Date',
      dateValue: fmtDate(invoice.invoice_date),
      extraDates: [
        { label: 'Terms', value: invoice.payment_terms || 'Due on Receipt' },
        { label: 'Due Date', value: fmtDate(invoice.due_date) }
      ]
    });
    openPdfWindow(html, `INV-${invoice.invoice_number}-${invoice.customer_name}.pdf`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BUILD HTML — matches Zoho format exactly
  // ═══════════════════════════════════════════════════════════════════════
  function buildPdfHTML(opts) {
    const { doc, items, settings, bank, isInvoice, docLabel, docNumberLabel, docNumberValue, dateLabel, dateValue, extraDates } = opts;
    const isGst = doc.is_gst !== false;
    
    // Company logo block
    const companyLogo = settings.logo_url 
      ? `<img src="${escapeHtml(settings.logo_url)}" style="max-width:130px;max-height:60px;object-fit:contain">`
      : `<div style="display:flex;align-items:center;gap:6px"><div style="background:#0B1957;color:#FBBF24;padding:4px 10px;font-weight:800;font-size:14px;letter-spacing:0.5px">PRAJAPATI</div><span style="font-size:14px;color:#0B1957;font-weight:600">Advertising</span></div>`;

    // Signature block
    const signatureBlock = settings.signature_url
      ? `<img src="${escapeHtml(settings.signature_url)}" style="max-width:120px;max-height:60px;object-fit:contain">`
      : `<div style="font-size:10px;color:#94A3B8;font-style:italic;border-bottom:1px solid #94A3B8;padding-bottom:30px;width:160px">Signature</div>`;

    // Document title (top right - large text)
    const docTitleHTML = `<div style="font-size:32px;font-weight:400;color:#0F172A;text-align:right;line-height:1.1;white-space:pre-line">${docLabel}</div>`;

    // Doc meta (number, date, terms)
    let metaHTML = `
      <tr>
        <td style="padding:4px 8px;background:#F1F5F9;border:1px solid #CBD5E1;font-size:11px;font-weight:600">${docNumberLabel}</td>
        <td style="padding:4px 8px;border:1px solid #CBD5E1;font-size:11px"><strong>: ${escapeHtml(docNumberValue)}</strong></td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#F1F5F9;border:1px solid #CBD5E1;font-size:11px;font-weight:600">${dateLabel}</td>
        <td style="padding:4px 8px;border:1px solid #CBD5E1;font-size:11px"><strong>: ${escapeHtml(dateValue)}</strong></td>
      </tr>
    `;
    if (extraDates) {
      extraDates.forEach(e => {
        metaHTML += `
          <tr>
            <td style="padding:4px 8px;background:#F1F5F9;border:1px solid #CBD5E1;font-size:11px;font-weight:600">${e.label}</td>
            <td style="padding:4px 8px;border:1px solid #CBD5E1;font-size:11px"><strong>: ${escapeHtml(e.value)}</strong></td>
          </tr>
        `;
      });
    }

    // Items table headers (dynamic based on GST mode)
    let itemHeaderCols = '';
    let itemFooterTotals = '';
    
    if (isGst) {
      itemHeaderCols = `
        <th rowspan="2" style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:left;width:30px">#</th>
        <th rowspan="2" style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:left">Item & Description</th>
        <th rowspan="2" style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:center;width:55px">HSN<br>/SAC</th>
        <th rowspan="2" style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:right;width:50px">Qty</th>
        <th rowspan="2" style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:right;width:55px">Rate</th>
        <th colspan="2" style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:center">CGST</th>
        <th colspan="2" style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:center">SGST</th>
        <th rowspan="2" style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:right;width:75px">Amount</th>
      `;
    } else {
      itemHeaderCols = `
        <th style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:left;width:30px">#</th>
        <th style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:left">Item & Description</th>
        <th style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:right;width:55px">Qty</th>
        <th style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:right;width:60px">Unit</th>
        <th style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:right;width:65px">Rate</th>
        <th style="padding:6px 4px;border:1px solid #94A3B8;background:white;color:#0F172A;font-size:10px;font-weight:600;text-align:right;width:90px">Amount</th>
      `;
    }

    // Items rows
    const itemsHTML = items.map((item, idx) => {
      const amt = (item.quantity || 0) * (item.rate || 0);
      const cgstAmt = item.cgst_amount || (amt * (item.cgst_percent || 0) / 100);
      const sgstAmt = item.sgst_amount || (amt * (item.sgst_percent || 0) / 100);
      
      const imageCell = item.image_url 
        ? `<img src="${escapeHtml(item.image_url)}" style="max-width:60px;max-height:50px;object-fit:contain;display:block;margin-bottom:4px">`
        : '';
      
      if (isGst) {
        return `
          <tr>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:center;vertical-align:top">${idx + 1}</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;vertical-align:top">
              ${imageCell}
              <strong style="text-transform:uppercase">${escapeHtml(item.service_name)}</strong>
              ${item.description ? `<div style="margin-top:2px">${escapeHtml(item.description)}</div>` : ''}
            </td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:center;vertical-align:top">${escapeHtml(item.hsn_sac_code || '998361')}</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:right;vertical-align:top">${fmtINR(item.quantity)}</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:right;vertical-align:top">${fmtINR(item.rate)}</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:center;vertical-align:top;width:35px">${item.cgst_percent || 9}%</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:right;vertical-align:top;width:65px">${fmtINR(cgstAmt)}</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:center;vertical-align:top;width:35px">${item.sgst_percent || 9}%</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:right;vertical-align:top;width:65px">${fmtINR(sgstAmt)}</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:right;vertical-align:top;font-weight:600">${fmtINR(amt)}</td>
          </tr>
        `;
      } else {
        return `
          <tr>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:center;vertical-align:top">${idx + 1}</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;vertical-align:top">
              ${imageCell}
              <strong style="text-transform:uppercase">${escapeHtml(item.service_name)}</strong>
              ${item.description ? `<div style="margin-top:2px">${escapeHtml(item.description)}</div>` : ''}
            </td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:right;vertical-align:top">${fmtINR(item.quantity)}</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:right;vertical-align:top">${escapeHtml(item.unit || 'PCS')}</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:right;vertical-align:top">${fmtINR(item.rate)}</td>
            <td style="padding:8px 4px;border:1px solid #94A3B8;font-size:11px;text-align:right;vertical-align:top;font-weight:600">${fmtINR(amt)}</td>
          </tr>
        `;
      }
    }).join('');

    // Totals (right side)
    let totalsHTML = `
      <tr>
        <td style="padding:5px 10px;font-size:11px;text-align:right">Sub Total</td>
        <td style="padding:5px 10px;font-size:11px;text-align:right;font-weight:600;width:90px">${fmtINR(doc.subtotal)}</td>
      </tr>
    `;
    
    if (doc.discount_amount > 0) {
      totalsHTML += `
        <tr>
          <td style="padding:5px 10px;font-size:11px;text-align:right">Discount (${doc.discount_percent}%)</td>
          <td style="padding:5px 10px;font-size:11px;text-align:right;color:#DC2626">(-) ${fmtINR(doc.discount_amount)}</td>
        </tr>
      `;
    }
    
    if (isGst) {
      const cgstPct = settings.default_cgst_rate || 9;
      const sgstPct = settings.default_sgst_rate || 9;
      totalsHTML += `
        <tr>
          <td style="padding:5px 10px;font-size:11px;text-align:right">CGST${cgstPct} (${cgstPct}%)</td>
          <td style="padding:5px 10px;font-size:11px;text-align:right;font-weight:600">${fmtINR(doc.cgst_total)}</td>
        </tr>
        <tr>
          <td style="padding:5px 10px;font-size:11px;text-align:right">SGST${sgstPct} (${sgstPct}%)</td>
          <td style="padding:5px 10px;font-size:11px;text-align:right;font-weight:600">${fmtINR(doc.sgst_total)}</td>
        </tr>
      `;
    }
    
    if (doc.apply_tds && doc.tds_amount > 0) {
      totalsHTML += `
        <tr>
          <td style="padding:5px 10px;font-size:11px;text-align:right">${escapeHtml(doc.tds_label || 'Payment of contractors HUF/Indiv (1%)')}</td>
          <td style="padding:5px 10px;font-size:11px;text-align:right;color:#DC2626">(-) ${fmtINR(doc.tds_amount)}</td>
        </tr>
      `;
    }
    
    totalsHTML += `
      <tr>
        <td style="padding:8px 10px;font-size:13px;text-align:right;font-weight:800;border-top:2px solid #0F172A;border-bottom:2px solid #0F172A">Total</td>
        <td style="padding:8px 10px;font-size:13px;text-align:right;font-weight:800;border-top:2px solid #0F172A;border-bottom:2px solid #0F172A">₹${fmtINR(doc.grand_total)}</td>
      </tr>
    `;
    
    if (isInvoice) {
      const paymentMade = Number(doc.payment_made) || 0;
      const balanceDue = Number(doc.grand_total) - paymentMade;
      if (paymentMade > 0) {
        totalsHTML += `
          <tr>
            <td style="padding:5px 10px;font-size:11px;text-align:right">Payment Made</td>
            <td style="padding:5px 10px;font-size:11px;text-align:right;color:#DC2626">(-) ${fmtINR(paymentMade)}</td>
          </tr>
          <tr>
            <td style="padding:6px 10px;font-size:12px;text-align:right;font-weight:800">Balance Due</td>
            <td style="padding:6px 10px;font-size:12px;text-align:right;font-weight:800">₹${fmtINR(balanceDue)}</td>
          </tr>
        `;
      }
    }

    // Customer block
    const billToHTML = `
      <div style="font-size:11px">
        <strong style="font-size:13px;text-transform:uppercase">${escapeHtml(doc.customer_name)}</strong><br>
        ${doc.customer_address_line1 ? escapeHtml(doc.customer_address_line1) + '<br>' : ''}
        ${doc.customer_city || ''}<br>
        ${[doc.customer_city, doc.customer_state, settings.country || 'India'].filter(Boolean).join(',')}<br>
        ${[doc.customer_phone, doc.customer_phone_alt].filter(Boolean).map(p => '+91-' + p).join(', ')}<br>
        ${doc.customer_gstin ? `GSTIN-${escapeHtml(doc.customer_gstin)}` : ''}
      </div>
    `;
    
    const shipToHTML = `
      <div style="font-size:11px">
        <strong style="font-size:13px;text-transform:uppercase">${escapeHtml(doc.customer_name)}</strong><br>
        ,,<br> |<br>
        ${[doc.customer_phone, doc.customer_phone_alt].filter(Boolean).map(p => '+91-' + p).join(' , ')}<br>
        ${doc.customer_gstin ? `GSTIN-${escapeHtml(doc.customer_gstin)}` : ''}
      </div>
    `;

    // Bank details
    const bankHTML = bank && bank.account_holder_name ? `
      <div style="margin-top:14px;font-size:10px">
        <strong>Bank Account Details</strong><br>
        Account Holder Name: ${escapeHtml(bank.account_holder_name)}<br>
        Account Number: ${escapeHtml(bank.account_number)}<br>
        IFSC Code: ${escapeHtml(bank.ifsc_code)}<br>
        Bank Name: ${escapeHtml(bank.bank_name || '')}<br>
        Branch: ${escapeHtml(bank.branch || '')}
      </div>
    ` : '';

    // Notes
    const noteContent = isInvoice 
      ? (Number(doc.payment_made) >= Number(doc.grand_total) ? settings.invoice_note_paid : settings.invoice_note_unpaid)
      : settings.quotation_note;
    const customNote = doc.notes && doc.notes.trim() ? doc.notes : noteContent;
    
    const notesHTML = customNote ? `
      <div style="margin-top:14px;font-size:10px;line-height:1.5">
        <strong>Notes</strong><br>
        ${escapeHtml(customNote).replace(/\n/g, '<br>')}
      </div>
    ` : '';

    // Terms
    const termsContent = doc.terms_conditions || (isInvoice ? settings.invoice_terms : settings.quotation_terms) || '';
    const termsHTML = termsContent ? `
      <div style="margin-top:14px;font-size:10px;line-height:1.5">
        <strong>Terms & Conditions</strong><br>
        ${escapeHtml(termsContent).replace(/\n/g, '<br>')}
      </div>
    ` : '';

    // Total in words
    const totalInWords = doc.total_in_words || '';

    // ─── Build full HTML ───
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(docNumberValue)} - ${escapeHtml(doc.customer_name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px 40px; color: #0F172A; background: white; max-width: 850px; margin: 0 auto; font-size: 11px; }
  .no-print { background: #DBEAFE; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
  .no-print button { padding: 10px 20px; background: #2563EB; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; margin: 0 4px; }
  .no-print button.green { background: #10B981; }
  @media print { 
    body { padding: 15mm 20mm; max-width: none; } 
    .no-print { display: none; } 
    @page { size: A4; margin: 0; }
  }
  table { border-collapse: collapse; }
</style>
</head>
<body>

<div class="no-print">
  <button onclick="window.print()">🖨️ Print / Save as PDF</button>
  <button class="green" onclick="window.close()">✕ Close</button>
  <div style="margin-top:6px;font-size:11px;color:#1E40AF">💡 In print dialog, choose "Save as PDF" to download</div>
</div>

<!-- ═══ HEADER ═══ -->
<table style="width:100%;margin-bottom:0">
  <tr>
    <!-- Logo + Company info -->
    <td style="vertical-align:top;width:30%">
      ${companyLogo}
    </td>
    <td style="vertical-align:top;font-size:11px;line-height:1.5;padding:0 10px">
      <strong style="font-size:14px">${escapeHtml(settings.trade_name || 'prajapatiadvertising')}</strong><br>
      ${escapeHtml(settings.address_line1 || '')}<br>
      ${settings.address_line2 ? escapeHtml(settings.address_line2) + '<br>' : ''}
      ${escapeHtml(settings.city || 'Pune')}, ${escapeHtml(settings.state || 'Maharashtra')}, ${escapeHtml(settings.country || 'India')}<br>
      ${escapeHtml(settings.pincode || '411058')}, ${escapeHtml(settings.phone_primary || '')}<br>
      <strong>GSTIN ${escapeHtml(settings.gstin || '')}</strong>
    </td>
    <!-- Doc title -->
    <td style="vertical-align:top;text-align:right;width:30%;padding-top:10px">
      ${docTitleHTML}
    </td>
  </tr>
</table>

<!-- ═══ DOC META + PLACE OF SUPPLY ═══ -->
<table style="width:100%;margin-top:15px;border-collapse:collapse">
  <tr>
    <!-- Left side: doc # and date -->
    <td style="vertical-align:top;width:50%">
      <table style="width:100%;border-collapse:collapse">
        ${metaHTML}
      </table>
    </td>
    <!-- Right: Place of supply -->
    <td style="vertical-align:top;width:50%;padding-left:20px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:4px 8px;background:#F1F5F9;border:1px solid #CBD5E1;font-size:11px;font-weight:600;width:50%">Place Of Supply</td>
          <td style="padding:4px 8px;border:1px solid #CBD5E1;font-size:11px;text-align:right"><strong>: ${escapeHtml(doc.place_of_supply || 'Maharashtra (27)')}</strong></td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- ═══ BILL TO / SHIP TO ═══ -->
<table style="width:100%;margin-top:0;border-collapse:collapse">
  <tr>
    <td style="background:#F1F5F9;padding:6px 10px;border:1px solid #CBD5E1;font-size:11px;font-weight:700;width:50%">Bill To</td>
    <td style="background:#F1F5F9;padding:6px 10px;border:1px solid #CBD5E1;font-size:11px;font-weight:700">Ship To</td>
  </tr>
  <tr>
    <td style="padding:10px;border:1px solid #CBD5E1;vertical-align:top">${billToHTML}</td>
    <td style="padding:10px;border:1px solid #CBD5E1;vertical-align:top">${shipToHTML}</td>
  </tr>
</table>

<!-- ═══ ITEMS TABLE ═══ -->
<table style="width:100%;margin-top:14px;border-collapse:collapse">
  <thead>
    <tr style="background:white">${itemHeaderCols}</tr>
    ${isGst ? `
      <tr style="background:white">
        <th style="padding:4px;border:1px solid #94A3B8;font-size:9px;text-align:center;font-weight:600">%</th>
        <th style="padding:4px;border:1px solid #94A3B8;font-size:9px;text-align:center;font-weight:600">Amt</th>
        <th style="padding:4px;border:1px solid #94A3B8;font-size:9px;text-align:center;font-weight:600">%</th>
        <th style="padding:4px;border:1px solid #94A3B8;font-size:9px;text-align:center;font-weight:600">Amt</th>
      </tr>
    ` : ''}
  </thead>
  <tbody>
    ${itemsHTML}
  </tbody>
</table>

<!-- ═══ TOTALS + LEFT SIDE NOTES ═══ -->
<table style="width:100%;margin-top:14px;border-collapse:collapse">
  <tr>
    <!-- Left: Total in words + Notes + Terms + Bank -->
    <td style="vertical-align:top;width:55%;padding-right:14px">
      ${totalInWords ? `
        <div style="font-size:11px;margin-bottom:8px">
          <strong>Total In Words</strong><br>
          <em>${escapeHtml(totalInWords)}</em>
        </div>
      ` : ''}
      ${notesHTML}
      ${termsHTML}
      ${bankHTML}
    </td>
    
    <!-- Right: Totals breakdown -->
    <td style="vertical-align:top;width:45%">
      <table style="width:100%;border-collapse:collapse">
        ${totalsHTML}
      </table>
      
      <!-- Signature -->
      <div style="margin-top:30px;text-align:center">
        ${signatureBlock}
        <div style="font-size:11px;margin-top:6px;border-top:1px solid #94A3B8;padding-top:4px">Authorized Signature</div>
      </div>
    </td>
  </tr>
</table>

<!-- Footer -->
<div style="margin-top:30px;text-align:right;font-size:9px;color:#94A3B8">1</div>

</body>
</html>`;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Open PDF in new window
  // ═══════════════════════════════════════════════════════════════════════
  function openPdfWindow(html, filename) {
    const w = window.open('', '_blank', 'width=1024,height=768');
    if (!w) {
      alert('⚠️ Popup blocked! Please allow popups for this site to generate PDF.');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.document.title = filename;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RECEIPT PDF (Payment receipt)
  // ═══════════════════════════════════════════════════════════════════════
  function generateReceiptPDF(payment, invoice, settings, bank, totalPaid, balance) {
    const html = buildReceiptHTML(payment, invoice, settings, bank, totalPaid, balance);
    openPdfWindow(html, `Receipt-${payment.receipt_number}-${invoice.customer_name}.pdf`);
  }

  function buildReceiptHTML(payment, invoice, settings, bank, totalPaid, balance) {
    const methodLabels = {
      cash: '💵 Cash', upi: '📱 UPI', bank_transfer: '🏦 Bank Transfer',
      cheque: '📝 Cheque', card: '💳 Card', other: '📌 Other'
    };
    const methodLabel = methodLabels[payment.payment_method] || payment.payment_method;
    
    const companyLogo = settings.logo_url 
      ? `<img src="${escapeHtml(settings.logo_url)}" style="max-width:130px;max-height:60px;object-fit:contain">`
      : `<div style="display:flex;align-items:center;gap:6px"><div style="background:#0B1957;color:#FBBF24;padding:4px 10px;font-weight:800;font-size:14px;letter-spacing:0.5px">PRAJAPATI</div><span style="font-size:14px;color:#0B1957;font-weight:600">Advertising</span></div>`;
    
    const signatureBlock = settings.signature_url
      ? `<img src="${escapeHtml(settings.signature_url)}" style="max-width:120px;max-height:60px;object-fit:contain">`
      : `<div style="font-size:10px;color:#94A3B8;font-style:italic;border-bottom:1px solid #94A3B8;padding-bottom:30px;width:160px">Signature</div>`;
    
    const isPaidInFull = balance <= 0;
    
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt ${escapeHtml(payment.receipt_number)} - ${escapeHtml(invoice.customer_name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px 40px; color: #0F172A; background: white; max-width: 850px; margin: 0 auto; font-size: 11px; }
  .no-print { background: #DBEAFE; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
  .no-print button { padding: 10px 20px; background: #2563EB; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; margin: 0 4px; }
  .no-print button.green { background: #10B981; }
  .stamp-paid { color: #10B981; border: 3px solid #10B981; padding: 8px 14px; border-radius: 8px; font-weight: 800; font-size: 14px; letter-spacing: 0.1em; transform: rotate(-8deg); display: inline-block; opacity: 0.7; }
  @media print { 
    body { padding: 15mm 20mm; max-width: none; } 
    .no-print { display: none; } 
    @page { size: A4; margin: 0; }
  }
  table { border-collapse: collapse; }
</style>
</head>
<body>

<div class="no-print">
  <button onclick="window.print()">🖨️ Print / Save as PDF</button>
  <button class="green" onclick="window.close()">✕ Close</button>
  <div style="margin-top:6px;font-size:11px;color:#1E40AF">💡 In print dialog, choose "Save as PDF" to download</div>
</div>

<!-- ═══ HEADER ═══ -->
<table style="width:100%;margin-bottom:0">
  <tr>
    <td style="vertical-align:top;width:30%">
      ${companyLogo}
    </td>
    <td style="vertical-align:top;font-size:11px;line-height:1.5;padding:0 10px">
      <strong style="font-size:14px">${escapeHtml(settings.trade_name || 'prajapatiadvertising')}</strong><br>
      ${escapeHtml(settings.address_line1 || '')}<br>
      ${settings.address_line2 ? escapeHtml(settings.address_line2) + '<br>' : ''}
      ${escapeHtml(settings.city || 'Pune')}, ${escapeHtml(settings.state || 'Maharashtra')}, ${escapeHtml(settings.country || 'India')}<br>
      ${escapeHtml(settings.pincode || '411058')}, ${escapeHtml(settings.phone_primary || '')}<br>
      <strong>GSTIN ${escapeHtml(settings.gstin || '')}</strong>
    </td>
    <td style="vertical-align:top;text-align:right;width:30%;padding-top:10px">
      <div style="font-size:32px;font-weight:400;color:#0F172A;text-align:right;line-height:1.1">PAYMENT<br>RECEIPT</div>
    </td>
  </tr>
</table>

<!-- ═══ DOC META ═══ -->
<table style="width:100%;margin-top:15px;border-collapse:collapse">
  <tr>
    <td style="vertical-align:top;width:50%">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:4px 8px;background:#F1F5F9;border:1px solid #CBD5E1;font-size:11px;font-weight:600">Receipt #</td>
          <td style="padding:4px 8px;border:1px solid #CBD5E1;font-size:11px"><strong>: ${escapeHtml(payment.receipt_number)}</strong></td>
        </tr>
        <tr>
          <td style="padding:4px 8px;background:#F1F5F9;border:1px solid #CBD5E1;font-size:11px;font-weight:600">Date</td>
          <td style="padding:4px 8px;border:1px solid #CBD5E1;font-size:11px"><strong>: ${fmtDate(payment.payment_date)}</strong></td>
        </tr>
        <tr>
          <td style="padding:4px 8px;background:#F1F5F9;border:1px solid #CBD5E1;font-size:11px;font-weight:600">Reference Invoice</td>
          <td style="padding:4px 8px;border:1px solid #CBD5E1;font-size:11px"><strong>: #${escapeHtml(invoice.invoice_number)}</strong></td>
        </tr>
      </table>
    </td>
    <td style="vertical-align:top;width:50%;padding-left:20px">
      ${isPaidInFull ? '<div class="stamp-paid">✓ PAID IN FULL</div>' : ''}
    </td>
  </tr>
</table>

<!-- ═══ RECEIVED FROM ═══ -->
<table style="width:100%;margin-top:14px;border-collapse:collapse">
  <tr>
    <td style="background:#F1F5F9;padding:6px 10px;border:1px solid #CBD5E1;font-size:11px;font-weight:700">Received From</td>
  </tr>
  <tr>
    <td style="padding:14px;border:1px solid #CBD5E1;vertical-align:top">
      <div style="font-size:11px">
        <strong style="font-size:14px;text-transform:uppercase">${escapeHtml(payment.customer_name || invoice.customer_name)}</strong>
        ${invoice.customer_company ? `<br><span style="font-size:12px;color:#64748B;font-weight:600">${escapeHtml(invoice.customer_company)}</span>` : ''}
        ${invoice.customer_address_line1 ? '<br>' + escapeHtml(invoice.customer_address_line1) : ''}
        ${invoice.customer_city ? '<br>' + escapeHtml(invoice.customer_city) + (invoice.customer_state ? ', ' + escapeHtml(invoice.customer_state) : '') : ''}
        ${payment.customer_phone ? '<br>📞 +91-' + escapeHtml(payment.customer_phone) : ''}
        ${payment.customer_email ? '<br>✉️ ' + escapeHtml(payment.customer_email) : ''}
        ${payment.customer_gstin ? '<br>GSTIN: ' + escapeHtml(payment.customer_gstin) : ''}
      </div>
    </td>
  </tr>
</table>

<!-- ═══ AMOUNT BLOCK (highlighted) ═══ -->
<table style="width:100%;margin-top:14px;border-collapse:collapse;border:2px solid #10B981;border-radius:8px;background:linear-gradient(135deg,#D1FAE5,white)">
  <tr>
    <td style="padding:20px;text-align:center">
      <div style="font-size:11px;font-weight:800;color:#065F46;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px">Amount Received</div>
      <div style="font-family:'Courier New',monospace;font-size:36px;font-weight:800;color:#065F46;letter-spacing:-1px">₹${fmtINR(payment.amount)}</div>
      <div style="font-size:11px;color:#0F172A;margin-top:6px;font-weight:600;font-style:italic">${escapeHtml(payment.amount_in_words || '')}</div>
    </td>
  </tr>
</table>

<!-- ═══ PAYMENT DETAILS ═══ -->
<table style="width:100%;margin-top:14px;border-collapse:collapse">
  <tr>
    <td style="background:#F1F5F9;padding:6px 10px;border:1px solid #CBD5E1;font-size:11px;font-weight:700;width:50%">Payment Method</td>
    <td style="padding:8px 10px;border:1px solid #CBD5E1;font-size:12px;width:50%"><strong>${methodLabel}</strong></td>
  </tr>
  ${payment.reference_number ? `
    <tr>
      <td style="background:#F1F5F9;padding:6px 10px;border:1px solid #CBD5E1;font-size:11px;font-weight:700">Reference / Transaction ID</td>
      <td style="padding:8px 10px;border:1px solid #CBD5E1;font-size:12px;font-family:'Courier New',monospace"><strong>${escapeHtml(payment.reference_number)}</strong></td>
    </tr>
  ` : ''}
  <tr>
    <td style="background:#F1F5F9;padding:6px 10px;border:1px solid #CBD5E1;font-size:11px;font-weight:700">Payment Type</td>
    <td style="padding:8px 10px;border:1px solid #CBD5E1;font-size:12px"><strong>${(payment.payment_type || 'partial').toUpperCase()}</strong></td>
  </tr>
  ${payment.notes ? `
    <tr>
      <td style="background:#F1F5F9;padding:6px 10px;border:1px solid #CBD5E1;font-size:11px;font-weight:700">Notes</td>
      <td style="padding:8px 10px;border:1px solid #CBD5E1;font-size:12px">${escapeHtml(payment.notes)}</td>
    </tr>
  ` : ''}
</table>

<!-- ═══ INVOICE STATUS ═══ -->
<table style="width:100%;margin-top:14px;border-collapse:collapse">
  <tr>
    <td colspan="2" style="background:#0B1957;color:white;padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase">Invoice Status After This Payment</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;border:1px solid #CBD5E1;font-size:11px;width:50%">Total Invoice Amount:</td>
    <td style="padding:8px 12px;border:1px solid #CBD5E1;font-size:12px;text-align:right;font-family:'Courier New',monospace;font-weight:700">₹${fmtINR(invoice.grand_total)}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;border:1px solid #CBD5E1;font-size:11px">Total Received (incl. this):</td>
    <td style="padding:8px 12px;border:1px solid #CBD5E1;font-size:12px;text-align:right;font-family:'Courier New',monospace;font-weight:700;color:#065F46">₹${fmtINR(totalPaid)}</td>
  </tr>
  <tr>
    <td style="padding:10px 12px;border:1px solid #CBD5E1;font-size:13px;font-weight:800;background:${isPaidInFull ? '#D1FAE5' : '#FEE2E2'}">${isPaidInFull ? '✅ Balance Due:' : '⏳ Balance Due:'}</td>
    <td style="padding:10px 12px;border:1px solid #CBD5E1;font-size:14px;text-align:right;font-family:'Courier New',monospace;font-weight:800;background:${isPaidInFull ? '#D1FAE5' : '#FEE2E2'};color:${isPaidInFull ? '#065F46' : '#991B1B'}">₹${fmtINR(balance)}</td>
  </tr>
</table>

${bank && bank.account_holder_name ? `
  <div style="margin-top:18px;padding:12px;background:#F1F5F9;border-radius:6px;font-size:10px">
    <strong style="font-size:11px">Bank Account Details</strong><br>
    Account Holder: ${escapeHtml(bank.account_holder_name)} · 
    A/c No: ${escapeHtml(bank.account_number)} · 
    IFSC: ${escapeHtml(bank.ifsc_code)}<br>
    ${escapeHtml(bank.bank_name || '')} · ${escapeHtml(bank.branch || '')}
  </div>
` : ''}

<!-- ═══ SIGNATURE ═══ -->
<table style="width:100%;margin-top:30px">
  <tr>
    <td style="width:50%"></td>
    <td style="width:50%;text-align:center;vertical-align:bottom">
      ${signatureBlock}
      <div style="font-size:11px;margin-top:6px;border-top:1px solid #94A3B8;padding-top:4px">Authorized Signature</div>
    </td>
  </tr>
</table>

<!-- Footer -->
<div style="margin-top:30px;text-align:center;font-size:9px;color:#94A3B8;padding-top:14px;border-top:1px solid #E2E8F0">
  This is a system-generated receipt · Prajapati Advertising · GSTIN ${escapeHtml(settings.gstin || '')}<br>
  For queries: ${escapeHtml(settings.email || 'info@prajapatiadvertising.com')} · ${escapeHtml(settings.phone_primary || '')}
</div>

</body>
</html>`;
  }

  // Public API
  return {
    generateQuotationPDF,
    generateInvoicePDF,
    generateReceiptPDF
  };

})();
