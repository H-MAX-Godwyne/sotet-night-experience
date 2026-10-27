const { json, db, randomReference, validPhone } = require("./_lib");
const PRICES = { advance_regular: 350, advance_couple: 600, gate_regular: 400, gate_couple: 700 };
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const { name, phone, email = "", ticketType, quantity } = req.body || {};
    const cleanName = String(name || "").trim();
    const cleanPhone = String(phone || "").replace(/[\s-]/g, "");
    const cleanEmail = String(email || "").trim().slice(0, 254);
    const qty = Number(quantity);
    if (cleanName.length < 2 || cleanName.length > 100) return json(res, 400, { error: "Enter your full name." });
    if (!validPhone(cleanPhone)) return json(res, 400, { error: "Enter a valid Kenyan mobile number, e.g. 07XXXXXXXX." });
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return json(res, 400, { error: "Enter a valid email address or leave it blank." });
    if (!PRICES[ticketType]) return json(res, 400, { error: "Choose a valid ticket category." });
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return json(res, 400, { error: "Choose between 1 and 10 tickets." });
    const unit = PRICES[ticketType];
    let booking;
    for (let i = 0; i < 4; i++) {
      const reference = randomReference();
      const result = await db("bookings", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify([{
          reference, customer_name: cleanName, phone: cleanPhone, email: cleanEmail || null,
          ticket_type: ticketType, quantity: qty, unit_price: unit, total_amount: unit * qty,
          payment_status: "pending_payment"
        }])
      });
      booking = result.data && result.data[0];
      if (booking) break;
    }
    if (!booking) return json(res, 500, { error: "Could not create booking. Please try again." });
    return json(res, 201, { booking: { reference: booking.reference, name: booking.customer_name, ticketType: booking.ticket_type, quantity: booking.quantity, unitPrice: booking.unit_price, total: booking.total_amount, status: booking.payment_status, createdAt: booking.created_at } });
  } catch (e) {
    console.error("create-booking failed", e.status || "", e.details || e.message);
    return json(res, 500, { error: "Booking service is temporarily unavailable. Please try again later." });
  }
};
