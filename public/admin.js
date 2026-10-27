const $ = s => document.querySelector(s);
const labels={advance_regular:"Advance Regular",advance_couple:"Advance Couple",gate_regular:"Gate Regular",gate_couple:"Gate Couple"};
function money(n){return "KSh "+Number(n).toLocaleString("en-KE")}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function msg(el,text,kind=""){el.textContent=text;el.className="notice"+(kind?" "+kind:"")}
async function api(path,opts={}){const r=await fetch(path,{credentials:"same-origin",...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})}});const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");return d}
$("#login-form").addEventListener("submit",async e=>{e.preventDefault();const b=e.currentTarget.querySelector("button");b.disabled=true;msg($("#login-message"),"");try{await api("/api/admin-login",{method:"POST",body:JSON.stringify({password:new FormData(e.currentTarget).get("password")})});$("#login-panel").classList.add("hidden");$("#dashboard").classList.remove("hidden");await load()}catch(err){msg($("#login-message"),err.message,"error")}finally{b.disabled=false}});
$("#logout-button").addEventListener("click",async()=>{try{await api("/api/admin-logout",{method:"POST",body:"{}"})}catch{}$("#dashboard").classList.add("hidden");$("#login-panel").classList.remove("hidden");msg($("#login-message"),"You have signed out.","success")});
$("#refresh-button").addEventListener("click",load);
$("#status-filter").addEventListener("change",load);
async function load(){
  msg($("#admin-message"),"");
  try{
    const d=await api("/api/admin-bookings?status="+encodeURIComponent($("#status-filter").value));
    const all=d.bookings||[];
    $("#stat-bookings").textContent=all.length;
    $("#stat-pending").textContent=all.filter(x=>x.payment_status==="payment_submitted").length;
    $("#stat-paid").textContent=all.filter(x=>x.payment_status==="paid").length;
    $("#stat-revenue").textContent=money(all.filter(x=>x.payment_status==="paid").reduce((sum,x)=>sum+Number(x.total_amount),0));
    const list=$("#bookings-list");
    if(!all.length){list.innerHTML='<div class="empty-state">No bookings found for this filter.</div>';return}
    list.innerHTML=all.map(b=>`<article class="booking-row"><div><h3>${esc(b.customer_name)} <span class="status-pill ${b.payment_status}">${esc(b.payment_status.replaceAll("_"," ").toUpperCase())}</span></h3><p class="ref">${esc(b.reference)} · ${esc(labels[b.ticket_type]||b.ticket_type)} × ${b.quantity}</p><p>${esc(b.phone)}${b.email?" · "+esc(b.email):""} · ${money(b.total_amount)}</p><div class="booking-meta"><span>Created: ${new Date(b.created_at).toLocaleString()}</span><span>Txn: <b>${esc(b.transaction_code||"Not submitted")}</b></span></div>${b.admin_note?`<p class="admin-note">Admin note: ${esc(b.admin_note)}</p>`:""}</div><div class="row-actions">${b.payment_status==="payment_submitted"?`<button class="button button-approve" data-action="approve" data-ref="${esc(b.reference)}">Approve as paid</button><button class="button button-reject" data-action="reject" data-ref="${esc(b.reference)}">Reject claim</button>`:""}${b.payment_status==="paid"?`<button class="button button-outline" data-action="print" data-ref="${esc(b.reference)}">Print receipt</button>`:""}</div></article>`).join("");
    list.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>handleAction(btn)));
  }catch(e){if(e.message.toLowerCase().includes("sign in")){ $("#dashboard").classList.add("hidden");$("#login-panel").classList.remove("hidden");msg($("#login-message"),"Your session expired. Please sign in again.","error")}else msg($("#admin-message"),e.message,"error")}
}
async function handleAction(btn){
  const {action,ref}=btn.dataset;
  if(action==="print"){window.print();return}
  const verb=action==="approve"?"approve this transaction as paid":"reject this payment claim";
  if(!confirm(`Have you checked the official M-Pesa statement and do you want to ${verb} for ${ref}?`))return;
  const note=prompt("Optional admin note (do not enter sensitive information):","")||"";
  btn.disabled=true;
  try{await api("/api/admin-update",{method:"POST",body:JSON.stringify({reference:ref,action,note})});msg($("#admin-message"),action==="approve"?"Booking marked paid after admin approval.":"Payment claim rejected.","success");await load()}
  catch(e){msg($("#admin-message"),e.message,"error");btn.disabled=false}
}
