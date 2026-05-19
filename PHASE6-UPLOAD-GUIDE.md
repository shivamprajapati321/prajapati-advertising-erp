# Prajapati Advertising ERP - Phase 6 Command Center Upload Guide

## Upload these files to GitHub root

- phase6-command-center.html
- phase6-command-center.css
- phase6-command-center.js
- phase6-schema.sql
- PHASE6-UPLOAD-GUIDE.md

## GitHub Upload

1. Open GitHub repo: `prajapati-advertising-erp`
2. Click **Add file → Upload files**
3. Upload the 5 files above in ROOT folder
4. Commit message: `Add Phase 6 Command Center`
5. Click **Commit changes**

## Supabase

1. Open Supabase SQL Editor
2. Open `phase6-schema.sql`
3. Copy full SQL
4. Paste and click **Run**
5. Expected result: `Success. No rows returned`

## Live URL after Vercel deploy

`https://prajapati-advertising-erp.vercel.app/phase6-command-center.html`

## What Phase 6 Adds

- Approval Center
- Project profitability summary
- Document center
- Notification rules
- Audit logs
- Role-based finance hiding
- Client-safe progress preview
- CSV export for profitability

## Role Privacy

Finance is visible only for:
- Admin
- Accountant

Finance is hidden for:
- Sales
- Operation
- Printing
- Stitching
- Execution
- Client

## Testing Checklist

- Change role dropdown and verify amount visibility
- Create demo project
- Approve pending approval
- Export profitability CSV
- Generate document demo
- Trigger notification demo
- Copy client link
