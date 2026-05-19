# Phase 5 Web ERP Pro Upload Guide

## Upload to GitHub root
Upload these files in the root folder of your GitHub repository:

1. `phase5-erp-pro.html`
2. `phase5-erp-pro.css`
3. `phase5-erp-pro.js`
4. `phase5-professional-schema.sql`
5. `PHASE5-UPLOAD-GUIDE.md`

Do not upload inside a subfolder.

## Supabase
Open Supabase SQL Editor and run the full code from:

`phase5-professional-schema.sql`

Expected result: `Success. No rows returned`.

## Live URL
After Vercel deployment, open:

`https://prajapati-advertising-erp.vercel.app/phase5-erp-pro.html`

## What Phase 5 adds
- Professional web ERP control center
- Role preview and finance privacy engine
- Order Master
- Production kanban
- Execution control center
- Expense register
- Accounting queue
- Client portal preview
- Profit analytics
- Supabase schema for production use

## Testing roles
Use the Role Preview dropdown:
- Admin can see all finance
- Accountant can see all finance
- Sales can see client amount but not internal expense/profit
- Operation cannot see amount/payment/profit
- Printing/Stitching cannot see finance
- Client sees progress only

## Next development after this
1. Connect this UI to Supabase real fetch/insert/update.
2. Add login role mapping.
3. Add PDF reporting.
4. Add WhatsApp notifications.
5. Replace old scattered pages module-by-module.
