/* PRAJAPATI ERP PHASE 3 PROFESSIONAL CORE - no framework, safe to deploy on Vercel */
const ERP_SESSION_KEY = 'prajapati_erp_session';
const ERP_DB_KEY = 'prajapati_phase3_demo_db_v1';

const ERP_ROLES = {
  admin: { label:'Admin', canSeeFinance:true, canApprove:true, modules:['all'] },
  accountant: { label:'Accountant', canSeeFinance:true, canApprove:true, modules:['invoice','payments','expenses','reports'] },
  sales: { label:'Sales', canSeeFinance:false, canApprove:false, modules:['leads','quotations','orders','client_progress'] },
  operation: { label:'Operation Manager', canSeeFinance:false, canApprove:false, modules:['orders','operation','printing','stitching','execution','dispatch','reports'] },
  printing: { label:'Printing Operator', canSeeFinance:false, canApprove:false, modules:['printing'] },
  stitching: { label:'Stitching Manager', canSeeFinance:false, canApprove:false, modules:['stitching'] },
  execution: { label:'Execution Manager', canSeeFinance:false, canApprove:false, modules:['execution','expenses','reports'] },
  client: { label:'Client View', canSeeFinance:false, canApprove:false, modules:['client_progress'] }
};

const STAGES = ['Lead','Quotation','Order','Invoice','Printing','Stitching','Execution','Reporting','Payment Close'];
const MONEY_FIELDS = new Set(['invoiceAmount','clientAmount','profit','internalCost','rate','amount','totalExpense','paidAmount']);

function ensureSession(){
  let s = localStorage.getItem(ERP_SESSION_KEY);
  if(!s){
    s = JSON.stringify({name:'Shivam Prajapati', role:'admin', loginTime:new Date().toISOString()});
    localStorage.setItem(ERP_SESSION_KEY, s);
  }
  return JSON.parse(s);
}
function setRole(role){ const s = ensureSession(); s.role = role; localStorage.setItem(ERP_SESSION_KEY, JSON.stringify(s)); location.reload(); }
function roleInfo(){ const s = ensureSession(); return ERP_ROLES[s.role] || ERP_ROLES.admin; }
function canSeeFinance(){ return roleInfo().canSeeFinance; }
function money(v){ return '₹' + Number(v||0).toLocaleString('en-IN'); }
function safeMoney(v){ return canSeeFinance() ? money(v) : '<span class="money hidden">₹00,000</span>'; }
function today(){ return new Date().toISOString().slice(0,10); }
function uid(prefix){ return `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random()*90000)+10000)}`; }
function toast(msg){ const t=document.createElement('div'); t.textContent=msg; t.style.cssText='position:fixed;right:22px;bottom:22px;background:#0f172a;color:#fff;padding:13px 16px;border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.22);z-index:999;font-weight:800'; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); }

function seedDB(){
  return {
    orders:[{
      id:'PA-2026-00045', client:'Society Tea', city:'Pune', service:'Auto Rickshaw Hood Branding', qty:500,
      invoiceAmount:325000, status:'Execution', stageIndex:6, paymentStatus:'Part Payment', clientVisible:true,
      salesOwner:'Shamali Bodhe', operationOwner:'Ravi Kumar', deadline:'2026-05-25', createdAt:'2026-05-19'
    },{
      id:'PA-2026-00046', client:'Aakash Institute', city:'Nashik', service:'Back Panel + Hood Combo', qty:300,
      invoiceAmount:210000, status:'Printing', stageIndex:4, paymentStatus:'Pending', clientVisible:true,
      salesOwner:'Rajendra Yelwande', operationOwner:'Ravi Kumar', deadline:'2026-05-27', createdAt:'2026-05-19'
    }],
    printing:[{orderId:'PA-2026-00045', operator:'Vivek Kumar', material:'600 GSM Rexin', artwork:'Approved', qty:500, completed:500, status:'Completed', qc:'Passed'}, {orderId:'PA-2026-00046', operator:'Anurag Gautam', material:'0.6mm Rexin', artwork:'Approved', qty:300, completed:120, status:'In Progress', qc:'Pending'}],
    stitching:[{orderId:'PA-2026-00045', manager:'Rekha Prajapati', master:'Md Dulare', qty:500, completed:440, rate:15, status:'In Progress', qc:'Pending'}],
    execution:[{orderId:'PA-2026-00045', manager:'Ravi Kumar', team:'Team A', location:'Swargate Pune', work:'Hood Fitting', qty:180, completed:140, rate:90, status:'In Progress', reportDate:today()}],
    expenses:[{id:'EXP-1001', orderId:'PA-2026-00045', team:'Team A', location:'Swargate Pune', category:'Food', amount:850, status:'Approved', paidStatus:'Paid', date:today()}, {id:'EXP-1002', orderId:'PA-2026-00045', team:'Team A', location:'Swargate Pune', category:'Auto', amount:1200, status:'Pending', paidStatus:'Unpaid', date:today()}],
    payments:[{id:'PAY-1001', orderId:'PA-2026-00045', type:'Client Receipt', amount:150000, mode:'Bank', status:'Received', date:'2026-05-19'}, {id:'PAY-1002', orderId:'PA-2026-00045', type:'Expense Payment', amount:850, mode:'Cash', status:'Paid', date:today()}],
    activity:[{orderId:'PA-2026-00045', time:'10:15 AM', text:'Order created by Sales'}, {orderId:'PA-2026-00045', time:'11:20 AM', text:'Operation assigned printing to Vivek Kumar'}, {orderId:'PA-2026-00045', time:'02:45 PM', text:'Printing completed and sent to stitching'}, {orderId:'PA-2026-00045', time:'05:30 PM', text:'Execution Team A submitted daily report'}]
  };
}
function db(){ let data=localStorage.getItem(ERP_DB_KEY); if(!data){ data=JSON.stringify(seedDB()); localStorage.setItem(ERP_DB_KEY,data); } return JSON.parse(data); }
function saveDB(data){ localStorage.setItem(ERP_DB_KEY, JSON.stringify(data)); }
function resetDemo(){ localStorage.removeItem(ERP_DB_KEY); location.reload(); }
function addActivity(data, orderId, text){ data.activity.unshift({orderId,time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),text}); }

function calcOrderCost(data, orderId){
  const stitching = data.stitching.filter(x=>x.orderId===orderId).reduce((s,x)=>s+(Number(x.completed||0)*Number(x.rate||0)),0);
  const execution = data.execution.filter(x=>x.orderId===orderId).reduce((s,x)=>s+(Number(x.completed||0)*Number(x.rate||0)),0);
  const expenses = data.expenses.filter(x=>x.orderId===orderId).reduce((s,x)=>s+Number(x.amount||0),0);
  const printing = data.printing.filter(x=>x.orderId===orderId).reduce((s,x)=>s+(Number(x.completed||0)*35),0); // editable in DB later
  return {printing, stitching, execution, expenses, total:printing+stitching+execution+expenses};
}

function renderRoleSwitcher(){
  const session = ensureSession();
  return `<select class="role-switch" onchange="setRole(this.value)" title="Testing role switch">
    ${Object.keys(ERP_ROLES).map(r=>`<option value="${r}" ${session.role===r?'selected':''}>${ERP_ROLES[r].label}</option>`).join('')}
  </select>`;
}
function renderSidebar(active='workflow'){
  const links = [
    ['workflow','🏠','ERP Control','erp-workflow-pro.html'],['orders','📦','Order Master','erp-workflow-pro.html#orders'],['operation','🧭','Operation','erp-workflow-pro.html#operation'],['printing','🖨️','Printing','erp-workflow-pro.html#printing'],['stitching','✂️','Stitching','erp-workflow-pro.html#stitching'],['execution','🎬','Execution','erp-workflow-pro.html#execution'],['expenses','🧾','Expenses','erp-workflow-pro.html#expenses'],['client','👁️','Client Progress','erp-workflow-pro.html#client'],['accounts','💳','Accounts','erp-workflow-pro.html#accounts']
  ];
  return `<aside class="sidebar"><div class="brand"><div class="brand-mark">🚕</div><div><h1>PRAJAPATI ERP</h1><p>Professional Operations OS</p></div></div><div class="nav-section"><p class="nav-title">Workflow</p><nav class="nav">${links.map(l=>`<a class="${l[0]===active?'active':''}" href="${l[3]}">${l[1]} ${l[2]}</a>`).join('')}</nav></div><div class="nav-section"><p class="nav-title">Old System</p><nav class="nav"><a href="../dashboard.html">↩ Existing Dashboard</a><a href="../orders.html">📋 Existing Orders</a></nav></div></aside>`;
}

function exportPDF(){ window.print(); }
function csvDownload(filename, rows){
  const csv = rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href);
}
