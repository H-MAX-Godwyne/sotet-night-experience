const { json, env, safeEqual, sign, setSessionCookie } = require("./_lib");
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const { password } = req.body || {};
    if (!safeEqual(password, env("ADMIN_PASSWORD"))) {
      await new Promise(r => setTimeout(r, 350));
      return json(res, 401, { error: "Invalid password." });
    }
    setSessionCookie(res, sign({ role: "admin", exp: Date.now() + 8 * 60 * 60 * 1000 }));
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("admin-login failed", e.message);
    return json(res, 500, { error: "Admin sign-in is not configured correctly." });
  }
};
