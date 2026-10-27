const PRICE = { advance_regular:350, advance_couple:600, gate_regular:400, gate_couple:700 };
const LABEL = { advance_regular:"Advance Regular", advance_couple:"Advance Couple", gate_regular:"Gate Regular", gate_couple:"Gate Couple" };
const $ = (s) => document.querySelector(s);
let selectedTicket = "advance_regular";
let currentBooking = null;

function money(n){return "KSh " + Number(n).toLocaleString("en-KE")}
function showMessage(el, text, kind=""){el.textContent=text;el.className="notice"+(kind?" "+kind:"")}
function setBusy(button,busy,label){button.disabled=busy;button.innerHTML=busy?"Please wait…":label}
function selectTicket(type){
  selectedTicket=type;
  document.querySelectorAll(".ticket-card").forEach(card=>card.classList.toggle("selected",card.dataset.ticket===type));
  updateTotal();
}
function updateTotal(){const qty=Number($("#quantity").value||1);$("#total").textContent=money(PRICE[selectedTicket]*qty)}
document.querySelectorAll(".ticket-card").forEach(card=>card.addEventListener("click",()=>selectTicket(card.dataset.ticket)));
$("#quantity").addEventListener("change",updateTotal);

$("#booking-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget, button=$("#book-button");
  showMessage($("#booking-message"),"");
  setBusy(button,true,"Create booking →");
  const data=Object.fromEntries(new FormData(form));
  data.ticketType=selectedTicket;data.quantity=Number(data.quantity);
  try{
    const response=await fetch("/api/create-booking",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"Could not create booking.");
    currentBooking=result.booking;
    $("#payment-booking-reference").value=currentBooking.reference;
    $("#booking-summary").innerHTML=`<div><small>BOOKING REFERENCE</small><strong>${escapeHtml(currentBooking.reference)}</strong></div><div><small>AMOUNT DUE</small><strong>${money(currentBooking.total)}</strong></div><div><small>TICKET</small><strong>${escapeHtml(LABEL[currentBooking.ticketType])} × ${currentBooking.quantity}</strong></div><div><small>STATUS</small><strong>Awaiting payment</strong></div>`;
    const dest=window.EVENT_PAYMENT_DESTINATION;
    $("#pay-destination").textContent=dest||"Ask the organiser for the official M-Pesa Till or Paybill";
    $("#pay-reference").textContent=window.EVENT_PAYMENT_REFERENCE||"SOTET";
    $("#payment-section").classList.remove("hidden");
    $("#ticket-result").classList.add("hidden");
    showMessage($("#booking-message"),"Booking created. Save your reference and follow the payment instructions below.","success");
    $("#payment-section").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(err){showMessage($("#booking-message"),err.message,"error")}
  finally{setBusy(button,false,"Create booking →")}
});

$("#payment-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const button=$("#payment-button");showMessage($("#payment-message"),"");setBusy(button,true,"Submit for verification →");
  const data=Object.fromEntries(new FormData(e.currentTarget));
  data.transactionCode=String(data.transactionCode||"").trim().toUpperCase();
  try{
    const response=await fetch("/api/submit-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not submit transaction.");
    showMessage($("#payment-message"),result.message,"success");
    renderTicket(currentBooking,data.transactionCode,"payment_submitted");
  }catch(err){showMessage($("#payment-message"),err.message,"error")}
  finally{setBusy(button,false,"Submit for verification →")}
});

function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderTicket(b,code,status){
  if(!b)return;
  const paid=status==="paid";
  $("#ticket-result").innerHTML=`<article class="digital-ticket"><div class="ticket-result-head"><h2>SOTET NIGHT EXPERIENCE</h2><p>NYERI EDITION · 31 OCTOBER 2026 · DEKUT FREEDOM HALL</p><span class="ticket-status ${paid?"paid":""}">${paid?"PAID · CONFIRMED":status==="payment_submitted"?"PAYMENT SUBMITTED · PENDING VERIFICATION":"AWAITING PAYMENT"}</span></div><div class="ticket-body"><div class="ticket-fields"><div><small>BOOKING REFERENCE</small><strong class="ticket-ref">${escapeHtml(b.reference)}</strong></div><div><small>GUEST</small><strong>${escapeHtml(b.name)}</strong></div><div><small>TICKET</small><strong>${escapeHtml(LABEL[b.ticketType])} × ${b.quantity}</strong></div><div><small>AMOUNT</small><strong>${money(b.total)}</strong></div><div><small>TRANSACTION CODE</small><strong>${escapeHtml(code||"Not submitted")}</strong></div><div><small>STATUS</small><strong>${paid?"Paid":status==="payment_submitted"?"Awaiting organiser verification":"Awaiting payment"}</strong></div></div><div class="ticket-ref">✦</div><div class="ticket-note">${paid?"Payment verified by the event organiser. Keep this ticket and booking reference for entry.":"This is a booking receipt, not yet a valid entry ticket. Keep your reference. Entry is confirmed only after the organiser verifies payment."}</div></div></article><div class="ticket-actions"><button class="button button-primary" id="print-ticket">Print / Save ticket</button><button class="button button-outline" id="check-again">I have my reference</button></div>`;
  $("#ticket-result").classList.remove("hidden");
  $("#print-ticket").addEventListener("click",()=>window.print());
  $("#check-again").addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})});
  $("#ticket-result").scrollIntoView({behavior:"smooth",block:"start"});
}
