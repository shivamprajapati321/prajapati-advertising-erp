# Prajapati Advertising ERP - Phase 4 Web ERP Core

## Goal
This phase focuses only on the web ERP. Android/APK will come later after web workflow is stable.

## Files to Upload to GitHub Root
Upload these 5 files in the root of your GitHub repo:

1. `web-erp-core.html`
2. `web-erp-core.css`
3. `web-erp-core.js`
4. `phase4-web-erp-schema.sql`
5. `PHASE4-UPLOAD-GUIDE.md`

Correct upload path:

```text
/web-erp-core.html
/web-erp-core.css
/web-erp-core.js
/phase4-web-erp-schema.sql
/PHASE4-UPLOAD-GUIDE.md
```

Do not upload inside a separate folder unless you want URL path to include that folder.

---

## Step 1 - Run Supabase SQL

Open Supabase SQL editor:

```text
https://supabase.com/dashboard/project/shafygjbffffjhwhmcgo/sql/new
```

Copy full code from:

```text
phase4-web-erp-schema.sql
```

Paste and click **RUN**.

Expected result:

```text
Success. No rows returned
```

Then check Table Editor. You should see:

- `phase4_orders`
- `phase4_tasks`
- `phase4_expenses`
- `phase4_payments`
- `phase4_activity_logs`
- `phase4_project_profitability` view

---

## Step 2 - Upload Files to GitHub

Go to GitHub repo:

```text
https://github.com/shivamprajapati321/prajapati-advertising-erp
```

Click:

```text
Add file → Upload files
```

Drag the 5 files and commit:

```text
Phase 4 Web ERP Core
```

---

## Step 3 - Open Live Page

After Vercel deploy completes, open:

```text
https://prajapati-advertising-erp.vercel.app/web-erp-core.html
```

---

## Step 4 - Test Role Privacy

Top-right role dropdown se roles test karo:

### Admin
Can see revenue, cost, profit, payments.

### Sales
Can create order but cannot see internal cost, expense, team rate, profit.

### Operation
Can track work and add expenses but cannot see client amount/payment/profit.

### Printing
Can see production work only. Finance hidden.

### Stitching
Can see stitching work only. Finance hidden.

### Execution
Can add execution and expenses. Finance hidden.

### Accountant
Can see finance and add payments.

### Client
Can see only progress. No internal cost.

---

## Step 5 - Test Full Flow

1. Create order from Admin or Sales role.
2. Add printing entry.
3. Add stitching entry with master name and quantity.
4. Add execution entry with team/location/quantity.
5. Add expenses like hotel, food, auto, bus, petrol.
6. Accountant adds payment.
7. Check CEO Dashboard profitability.
8. Open Client Progress view.

---

## Important Business Logic

The correct business flow is:

```text
Lead → Quotation → Order → Printing → Stitching → Execution → Reporting → Expense Approval → Payment → Profitability → Close
```

This file starts the web ERP core for:

- Order Master
- Role-based finance privacy
- Production tracking
- Execution tracking
- Expense tracking
- Accountant payment desk
- Client progress tracking
- Project profitability

---

## If Supabase Error Shows

The page has local demo fallback. If tables are not created or Supabase policy is blocked, it will still work in local demo mode.

Fix checklist:

1. Run `phase4-web-erp-schema.sql` again.
2. Confirm tables exist in Supabase Table Editor.
3. Confirm file names are exact.
4. Clear browser cache and refresh.

---

## Next Phase After This

Once this is live and tested, next web phases:

1. Convert existing CRM/Quotation/Invoice to same Order Master.
2. Add real Supabase login instead of local session.
3. Add PDF quotation/invoice/report generation.
4. Add client portal token link.
5. Add Wati WhatsApp notifications.
6. Add advanced analytics dashboard.
