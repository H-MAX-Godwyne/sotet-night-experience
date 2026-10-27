const { json, db, requireAdmin } = require("./_lib");
module.exports = async (req, res) => {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  if (!requireAdmin(req)) return json(res, 401, { error: "Please sign in again." });
  try {
    const status = String(req.query.status || "all");
    const allowed = ["all", "pending_payment", "payment_submitted", "paid", "rejected"];
    if (!allowed.includes(status)) return json(res, 400, { error: "Invalid status filter." });
    const filter = status === "all" ? "" : `&payment_status=eq.${status}`;
    const result = await db(`bookings?select=reference,customer_name,phone,email,ticket_type,quantity,unit_price,total_amount,payment_status,transaction_code,payment_submitted_at,verified_at,verified_by,admin_note,created_at&order=created_at.desc&limit=500${filter}`);
    return json(res, 200, { bookings: result.data || [] });
  } catch (e) {
    console.error("admin-bookings failed", e.status || "", e.details || e.message);
    return json(res, 500, { error: "Could not load bookings." });
  }
};
