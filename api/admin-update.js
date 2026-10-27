const { json, db, requireAdmin } = require("./_lib");
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!requireAdmin(req)) return json(res, 401, { error: "Please sign in again." });
  try {
    const { reference, action, note = "" } = req.body || {};
    const ref = String(reference || "").trim().toUpperCase();
    if (!/^SOTET-[A-F0-9]{8}$/.test(ref)) return json(res, 400, { error: "Invalid booking reference." });
    if (!["approve", "reject"].includes(action)) return json(res, 400, { error: "Invalid action." });
    const lookup = await db(`bookings?reference=eq.${encodeURIComponent(ref)}&select=reference,payment_status,transaction_code`);
    const booking = lookup.data?.[0];
    if (!booking) return json(res, 404, { error: "Booking not found." });
    if (booking.payment_status !== "payment_submitted" || !booking.transaction_code) return json(res, 409, { error: "Only submitted payment claims can be verified." });
    const patch = action === "approve" ? {
      payment_status: "paid", verified_at: new Date().toISOString(), verified_by: "admin", admin_note: String(note).slice(0,500)
    } : {
      payment_status: "rejected", verified_at: new Date().toISOString(), verified_by: "admin", admin_note: String(note).slice(0,500)
    };
    const updated = await db(`bookings?reference=eq.${encodeURIComponent(ref)}&payment_status=eq.payment_submitted`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch)
    });
    if (!updated.data?.length) return json(res, 409, { error: "Booking status changed. Refresh and check again." });
    return json(res, 200, { ok: true, status: patch.payment_status });
  } catch (e) {
    console.error("admin-update failed", e.status || "", e.details || e.message);
    return json(res, 500, { error: "Could not update the booking." });
  }
};
