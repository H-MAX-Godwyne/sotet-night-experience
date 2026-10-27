const { json, db } = require("./_lib");
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const { reference, transactionCode } = req.body || {};
    const ref = String(reference || "").trim().toUpperCase();
    const code = String(transactionCode || "").trim().toUpperCase();
    if (!/^SOTET-[A-F0-9]{8}$/.test(ref)) return json(res, 400, { error: "Enter a valid booking reference." });
    if (!/^[A-Z0-9]{8,16}$/.test(code)) return json(res, 400, { error: "Enter the M-Pesa transaction code shown in your message." });
    const found = await db(`bookings?reference=eq.${encodeURIComponent(ref)}&select=reference,payment_status,total_amount,transaction_code`);
    const booking = found.data && found.data[0];
    if (!booking) return json(res, 404, { error: "Booking reference not found." });
    if (booking.payment_status === "paid") return json(res, 409, { error: "This booking is already marked paid." });
    if (booking.transaction_code && booking.transaction_code !== code) return json(res, 409, { error: "A transaction code has already been submitted for this booking. Contact the organiser if it is incorrect." });
    const update = await db(`bookings?reference=eq.${encodeURIComponent(ref)}&payment_status=eq.pending_payment`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ transaction_code: code, payment_status: "payment_submitted", payment_submitted_at: new Date().toISOString() })
    });
    if (!update.data || !update.data.length) {
      const current = await db(`bookings?reference=eq.${encodeURIComponent(ref)}&select=payment_status`);
      if (current.data?.[0]?.payment_status === "payment_submitted") return json(res, 409, { error: "A payment claim has already been submitted. Please wait for verification." });
      return json(res, 409, { error: "This booking cannot accept a payment claim in its current state." });
    }
    return json(res, 200, { message: "Transaction code submitted for organiser verification. Your ticket is NOT confirmed as paid yet.", status: "payment_submitted" });
  } catch (e) {
    console.error("submit-payment failed", e.status || "", e.details || e.message);
    if (e.status === 409) return json(res, 409, { error: "That transaction code may already be in use. Contact the organiser if you need help." });
    return json(res, 500, { error: "Could not submit the payment claim. Please try again later." });
  }
};
