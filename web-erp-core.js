import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = 'https://shafygjbffffjhwhmcgo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJzaGFmeWdqYmZmZmZmanh3aG1jZ28iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3NzkwNzYyMCwiZXhwIjoyMDkzNDgzNjywfQ.placeholder';
// The placeholder above prevents accidental broken secrets. Paste your real anon key below if you want direct live DB from this page.
const REAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYWZ5Z2piZmZmZmpod2htY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDc2MjAsImV4cCI6MjA5MzQ4MzYyMH0.sygn9BEjfdht2HFdclSDnn7H5GeYqHnmPXuEnDVIafE';
const supabase = createClient(SUPABASE_URL, REAL_ANON_KEY);

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());

let state = { role: localStorage.getItem('pa_erp_role') || 'Admin', orders: [], tasks: [], expenses: [], payments: [], logs: [], usingLocal: false };
const rolePolicy = {
  Admin:{finance:true,createOrder:true,expense:true,payment:true,hidden:false},
  Sales:{finance:false,createOrder:true,expense:false,payment:false,hidden:true},
  Operation:{finance:false,createOrder:false,expense:true,payment:false,hidden:true},
  Printing:{finance:false,createOrder:false,expense:false,payment:false,hidden:true},
  Stitching:{finance:false,createOrder:false,expense:false,payment:false,hidden:true},
  Execution:{finance:false,createOrder:false,expense:true,payment:false,hidden:true},
  Accountant:{finance:true,createOrder:false,expense:true,payment:true,hidden:false},
  Client:{finance:false,createOrder:false,expense:false,payment:false,hidden:true}
};
const panels = {dashboard:'CEO Dashboard',orders:'Order Master',production:'Printing & Stitching',execution:'Execution',expenses:'Expenses',accountant:'Accountant',client:'Client Progress',permissions:'Permissions'};

function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); }
function storeLocal(){ localStorage.setItem('phase4_local', JSON.stringify({orders:state.orders,tasks:state.tasks,expenses:state.expenses,payments:state.payments,logs:state.logs})); }
function loadLocal(){
  const saved = JSON.parse(localStorage.getItem('phase4_local') || '{}');
  if(saved.orders?.length){ Object.assign(state, saved, {usingLocal:true}); return; }
  const o1={id:uid(),project_code:'PA-2026-0001',client_name:'Demo Client - Society Tea',client_phone:'9876543210',city:'Pune',service_type:'Auto Rickshaw Hood Branding',quantity:200,order_amount:119800,status:'printing',payment_status:'advance_received',printing_progress:60,stitching_progress:20,execution_progress:0,assigned_operation:'Ravi Kumar',created_at:new Date().toISOString()};
  const o2={id:uid(),project_code:'PA-2026-0002',client_name:'Demo Client - Coaching Institute',client_phone:'9876500000',city:'Nagpur',service_type:'Back Panel Branding',quantity:500,order_amount:74500,status:'execution',payment_status:'pending',printing_progress:100,stitching_progress:100,execution_progress:35,assigned_operation:'Ravi Kumar',created_at:new Date().toISOString()};
  state.orders=[o1,o2];
  state.tasks=[{id:uid(),order_id:o1.id,task_type:'printing',assigned_to:'Vivek Kumar',quantity:120,rate:25,amount:3000,status:'in_progress',progress:60},{id:uid(),order_id:o1.id,task_type:'stitching',assigned_to:'Md Dulare',master_name:'Md Dulare',quantity:40,rate:15,amount:600,status:'in_progress',progress:20},{id:uid(),order_id:o2.id,task_type:'execution',assigned_to:'Team Ravi',location:'Nagpur',quantity:175,rate:100,amount:17500,status:'in_progress',progress:35}];
  state.expenses=[{id:uid(),order_id:o2.id,expense_date:new Date().toISOString().slice(0,10),team_name:'Team Ravi',location:'Nagpur',category:'Hotel',amount:2200,approval_status:'approved',payment_status:'unpaid'}];
  state.payments=[{id:uid(),order_id:o1.id,payment_type:'client_receipt',amount:50000,mode:'Bank',reference_no:'ADV001',paid_to_or_from:'Society Tea'}];
  state.logs=[{id:uid(),order_id:o1.id,actor:'System',action:'Order created',details:'Phase 4 demo order loaded',created_at:new Date().toISOString()}];
  state.usingLocal=true; storeLocal();
}
async function dbSelect(table){ const {data,error}=await supabase.from(table).select('*').order('created_at',{ascending:false}); if(error) throw error; return data||[]; }
async function loadData(){
  try{
    const [orders,tasks,expenses,payments,logs] = await Promise.all([dbSelect('phase4_orders'),dbSelect('phase4_tasks'),dbSelect('phase4_expenses'),dbSelect('phase4_payments'),dbSelect('phase4_activity_logs')]);
    state.orders=orders; state.tasks=tasks; state.expenses=expenses; state.payments=payments; state.logs=logs; state.usingLocal=false;
  }catch(e){ console.warn('Supabase unavailable, using local demo:', e.message); loadLocal(); toast('Supabase not connected or table missing. Local demo mode ON.'); }
  render();
}
async function insert(table, row){
  if(state.usingLocal){ row.id=uid(); row.created_at=new Date().toISOString(); const map={phase4_orders:'orders',phase4_tasks:'tasks',phase4_expenses:'expenses',phase4_payments:'payments',phase4_activity_logs:'logs'}; state[map[table]].unshift(row); storeLocal(); return row; }
  const {data,error}=await supabase.from(table).insert(row).select().single(); if(error) throw error; return data;
}
async function updateOrder(id, patch){
  if(state.usingLocal){ state.orders=state.orders.map(o=>o.id===id?{...o,...patch}:o); storeLocal(); return; }
  const {error}=await supabase.from('phase4_orders').update({...patch,updated_at:new Date().toISOString()}).eq('id',id); if(error) throw error;
}
async function log(order_id, action, details=''){ await insert('phase4_activity_logs',{order_id,actor:state.role,action,details}); }

function currentPolicy(){ return rolePolicy[state.role] || rolePolicy.Admin; }
function applyPermissions(){
  const p=currentPolicy(); localStorage.setItem('pa_erp_role', state.role);
  $$('.finance-only').forEach(el=>el.classList.toggle('hidden', !p.finance));
  $$('.no-finance').forEach(el=>el.classList.toggle('hidden', p.finance));
  $('#newOrderBtn').classList.toggle('hidden', !p.createOrder);
}
function orderName(id){ const o=state.orders.find(x=>x.id===id); return o ? o.project_code : 'Unknown'; }
function profitFor(o){
  const work=state.tasks.filter(t=>t.order_id===o.id).reduce((s,t)=>s+Number(t.amount ?? (t.quantity||0)*(t.rate||0)),0);
  const exp=state.expenses.filter(e=>e.order_id===o.id).reduce((s,e)=>s+Number(e.amount||0),0);
  const rec=state.payments.filter(p=>p.order_id===o.id && p.payment_type==='client_receipt').reduce((s,p)=>s+Number(p.amount||0),0);
  return {work,exp,rec,profit:Number(o.order_amount||0)-work-exp};
}
function badge(status){ const s=String(status||'new'); const c=s.includes('complete')||s.includes('done')?'b-done':s.includes('progress')||s.includes('printing')||s.includes('execution')?'b-progress':s.includes('hold')?'b-hold':'b-new'; return `<span class="badge ${c}">${s.replaceAll('_',' ')}</span>`; }
function progressBar(o){ const avg=Math.round(((o.printing_progress||0)+(o.stitching_progress||0)+(o.execution_progress||0))/3); return `<div class="progress"><span style="width:${avg}%"></span></div><small>${avg}% total</small>`; }

function renderMetrics(){
  const rev=state.orders.reduce((s,o)=>s+Number(o.order_amount||0),0); const costs=state.orders.reduce((s,o)=>{const p=profitFor(o);return s+p.work+p.exp},0); $('#mOrders').textContent=state.orders.length; $('#mRevenue').textContent=fmt(rev); $('#mCost').textContent=fmt(costs); $('#mProfit').textContent=fmt(rev-costs);
}
function renderSelects(){
  const opts=state.orders.map(o=>`<option value="${o.id}">${o.project_code} - ${o.client_name}</option>`).join('');
  $$('select[name="order_id"],#clientOrderSelect').forEach(s=>s.innerHTML=opts || '<option value="">Create order first</option>');
}
function renderOrders(){
  $('#orderRows').innerHTML=state.orders.map(o=>`<tr><td><strong>${o.project_code}</strong></td><td>${o.client_name}</td><td>${o.city||'-'}</td><td>${o.quantity||0}</td><td class="finance-only">${fmt(o.order_amount)}</td><td>${badge(o.status)}</td><td>${progressBar(o)}</td><td><button class="btn secondary" data-open-client="${o.id}">View</button></td></tr>`).join('') || '<tr><td colspan="8">No orders found</td></tr>';
}
function renderProfit(){
  $('#profitRows').innerHTML=state.orders.map(o=>{const p=profitFor(o); return `<tr><td>${o.project_code}</td><td>${o.client_name}</td><td>${fmt(o.order_amount)}</td><td>${fmt(p.work)}</td><td>${fmt(p.exp)}</td><td>${fmt(p.rec)}</td><td><strong>${fmt(p.profit)}</strong></td></tr>`}).join('');
}
function renderTimeline(){
  const logs=[...state.logs].slice(0,12); $('#timeline').innerHTML=logs.length?logs.map(l=>`<div class="time-item"><strong>${l.action}</strong><small>${orderName(l.order_id)} • ${l.actor||'System'} • ${new Date(l.created_at).toLocaleString('en-IN')}</small><p>${l.details||''}</p></div>`).join(''):'<p class="footer-note">No activity yet.</p>';
}
function renderKanban(){
  const cols=['printing','stitching','dispatch','reporting'];
  $('#kanban').innerHTML=cols.map(c=>`<div class="lane"><h3>${c.toUpperCase()}</h3>${state.tasks.filter(t=>t.task_type===c).map(t=>`<div class="job"><strong>${orderName(t.order_id)}</strong><small>${t.assigned_to||'-'} • Qty ${t.quantity||0}</small><br>${badge(t.status)}<div class="progress" style="margin-top:8px"><span style="width:${t.progress||0}%"></span></div><small>${t.progress||0}%</small></div>`).join('') || '<small>No jobs</small>'}</div>`).join('');
}
function renderExecution(){
  $('#executionRows').innerHTML=state.tasks.filter(t=>t.task_type==='execution').map(t=>`<tr><td>${orderName(t.order_id)}</td><td>${t.assigned_to||'-'}</td><td>${t.location||'-'}</td><td>${t.quantity||0}</td><td class="finance-only">${fmt(t.rate||0)}</td><td>${badge(t.status)}</td></tr>`).join('') || '<tr><td colspan="6">No execution entry</td></tr>';
}
function renderExpenses(){
  $('#expenseRows').innerHTML=state.expenses.map(e=>`<tr><td>${orderName(e.order_id)}</td><td>${e.expense_date||''}</td><td>${e.team_name||'-'}</td><td>${e.category}</td><td>${e.location||'-'}</td><td>${fmt(e.amount)}</td><td>${badge(e.approval_status||'pending')}</td></tr>`).join('') || '<tr><td colspan="7">No expense</td></tr>';
}
function renderPayments(){
  $('#paymentRows').innerHTML=state.payments.map(p=>`<tr><td>${orderName(p.order_id)}</td><td>${p.payment_type}</td><td>${fmt(p.amount)}</td><td>${p.mode||'-'}</td><td>${p.reference_no||'-'}</td></tr>`).join('') || '<tr><td colspan="5">No payment</td></tr>';
}
function renderClient(){
  const id=$('#clientOrderSelect').value || state.orders[0]?.id; const o=state.orders.find(x=>x.id===id); if(!o){ $('#clientTrack').innerHTML='<p>No order found.</p>'; return; }
  const steps=[['Order Confirmed',100],['Printing',o.printing_progress||0],['Stitching',o.stitching_progress||0],['Execution',o.execution_progress||0],['Reporting',o.execution_progress>=100?100:0],['Invoice / Payment',o.payment_status==='closed'?100:30]];
  $('#clientTrack').innerHTML=steps.map(([name,val])=>`<div class="track-step ${val>=100?'done':val>0?'active':''}"><strong>${name}</strong><span class="pill">${val}%</span></div>`).join('');
}
function renderPermissions(){
  $('#permissionRows').innerHTML=Object.entries(rolePolicy).map(([r,p])=>`<tr><td><strong>${r}</strong></td><td>${p.finance?'Yes':'No'}</td><td>${p.createOrder?'Yes':'No'}</td><td>${p.expense?'Yes':'No'}</td><td>${p.payment?'Yes':'No'}</td><td>${p.hidden?'Yes':'No'}</td></tr>`).join('');
}
function render(){ applyPermissions(); renderMetrics(); renderSelects(); renderOrders(); renderProfit(); renderTimeline(); renderKanban(); renderExecution(); renderExpenses(); renderPayments(); renderClient(); renderPermissions(); applyPermissions(); }

function switchPanel(id){ $$('.panel').forEach(p=>p.classList.toggle('active',p.id===id)); $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.panel===id)); $('#pageTitle').textContent=panels[id]||'ERP'; }

async function createOrder(e){
  e.preventDefault(); const f=Object.fromEntries(new FormData(e.target));
  const project_code='PA-'+new Date().getFullYear()+'-'+String(state.orders.length+1).padStart(4,'0');
  const row={project_code,client_name:f.client_name,client_phone:f.client_phone,city:f.city,service_type:f.service_type,quantity:Number(f.quantity||0),order_amount:Number(f.order_amount||0),status:'order_created',payment_status:'pending',printing_progress:0,stitching_progress:0,execution_progress:0,created_by:state.role,assigned_operation:f.assigned_operation};
  try{ const saved=await insert('phase4_orders',row); await log(saved.id,'Order created',`${saved.client_name} order created`); $('#orderModal').classList.remove('show'); e.target.reset(); await loadData(); toast('Order created successfully'); }catch(err){ toast(err.message); }
}
async function createTask(e){
  e.preventDefault(); const f=Object.fromEntries(new FormData(e.target));
  const rate= currentPolicy().finance ? Number(f.rate||0) : 0; const row={order_id:f.order_id,task_type:f.task_type,assigned_to:f.assigned_to,master_name:f.task_type==='stitching'?f.assigned_to:null,quantity:Number(f.quantity||0),rate,amount:Number(f.quantity||0)*rate,status:f.status,progress:Number(f.progress||0),notes:f.notes};
  try{ await insert('phase4_tasks',row); const patch={}; if(f.task_type==='printing') patch.printing_progress=row.progress; if(f.task_type==='stitching') patch.stitching_progress=row.progress; await updateOrder(f.order_id, patch); await log(f.order_id,`${f.task_type} entry added`,`${f.assigned_to} • Qty ${f.quantity}`); $('#taskModal').classList.remove('show'); e.target.reset(); await loadData(); toast('Production entry saved'); }catch(err){ toast(err.message); }
}
async function createExecution(e){
  e.preventDefault(); const f=Object.fromEntries(new FormData(e.target)); const rate=currentPolicy().finance?Number(f.rate||0):0; const progress=f.status==='completed'?100:f.status==='in_progress'?50:0;
  const row={order_id:f.order_id,task_type:'execution',assigned_to:f.assigned_to,location:f.location,quantity:Number(f.quantity||0),rate,amount:Number(f.quantity||0)*rate,status:f.status,progress};
  try{ await insert('phase4_tasks',row); await updateOrder(f.order_id,{execution_progress:progress,status:'execution'}); await log(f.order_id,'Execution entry added',`${f.assigned_to} at ${f.location}`); e.target.reset(); await loadData(); toast('Execution saved'); }catch(err){ toast(err.message); }
}
async function createExpense(e){
  e.preventDefault(); const f=Object.fromEntries(new FormData(e.target)); const p=currentPolicy(); if(!p.expense){ toast('This role cannot add expenses'); return; }
  const row={order_id:f.order_id,expense_date:new Date().toISOString().slice(0,10),work_type:'execution',team_name:f.team_name,location:f.location,category:f.category,amount:Number(f.amount||0),description:f.description,approval_status:state.role==='Admin'?'approved':'pending',payment_status:'unpaid',submitted_by:state.role};
  try{ await insert('phase4_expenses',row); await log(f.order_id,'Expense submitted',`${f.category} ${fmt(f.amount)}`); e.target.reset(); await loadData(); toast('Expense saved'); }catch(err){ toast(err.message); }
}
async function createPayment(e){
  e.preventDefault(); if(!currentPolicy().payment){ toast('This role cannot add payments'); return; } const f=Object.fromEntries(new FormData(e.target)); const row={...f,amount:Number(f.amount||0),created_by:state.role};
  try{ await insert('phase4_payments',row); await log(f.order_id,'Payment entry added',`${f.payment_type} ${fmt(f.amount)}`); e.target.reset(); await loadData(); toast('Payment saved'); }catch(err){ toast(err.message); }
}

window.addEventListener('DOMContentLoaded',()=>{
  $('#roleSelect').value=state.role;
  $('#nav').addEventListener('click',e=>{const b=e.target.closest('button[data-panel]'); if(b) switchPanel(b.dataset.panel);});
  $('#roleSelect').addEventListener('change',e=>{state.role=e.target.value; render(); toast(`${state.role} role view enabled`);});
  $('#refreshBtn').addEventListener('click',loadData);
  $('#newOrderBtn').addEventListener('click',()=>$('#orderModal').classList.add('show'));
  $('#addTaskBtn').addEventListener('click',()=>$('#taskModal').classList.add('show'));
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).classList.remove('show')));
  $('#orderForm').addEventListener('submit',createOrder);
  $('#taskForm').addEventListener('submit',createTask);
  $('#executionForm').addEventListener('submit',createExecution);
  $('#expenseForm').addEventListener('submit',createExpense);
  $('#paymentForm').addEventListener('submit',createPayment);
  $('#clientOrderSelect').addEventListener('change',renderClient);
  document.body.addEventListener('click',e=>{const b=e.target.closest('[data-open-client]'); if(b){ switchPanel('client'); $('#clientOrderSelect').value=b.dataset.openClient; renderClient(); }});
  loadData();
});
