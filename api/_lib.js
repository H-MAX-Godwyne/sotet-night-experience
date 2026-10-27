const crypto = require("node:crypto");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(body));
}
function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing server configuration: ${name}`);
  return v;
}
function supabaseHeaders(extra = {}) {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}
async function db(path, options = {}) {
  const url = env("SUPABASE_URL").replace(/\/$/, "") + "/rest/v1/" + path;
  const response = await fetch(url, { ...options, headers: supabaseHeaders(options.headers || {}) });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) {
    const error = new Error("Database request failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return { data, response };
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function sign(payload) {
  const secret = env("SESSION_SECRET");
  if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verify(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", env("SESSION_SECRET")).update(body).digest("base64url");
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
function cookie(req, name) {
  const header = req.headers.cookie || "";
  const item = header.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}
function requireAdmin(req) {
  const payload = verify(cookie(req, "sotet_admin"));
  return payload && payload.role === "admin" ? payload : null;
}
function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `sotet_admin=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`);
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "sotet_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
}
function randomReference() {
  return "SOTET-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}
function validPhone(phone) {
  return /^(?:\+?254|0)7\d{8}$/.test(String(phone || "").replace(/[\s-]/g, ""));
}
module.exports = { json, env, db, safeEqual, sign, requireAdmin, setSessionCookie, clearSessionCookie, randomReference, validPhone };
