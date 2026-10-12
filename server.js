'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderPage, renderLogin, renderAdmin } = require('./render');
const store = require('./store');

const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data');
const PUBLIC = path.join(__dirname, 'public');
const COOKIE = 'um_session';
const MAX_BODY = 1024 * 1024;

// ---------- storage ----------
const getContent = () => store.get('content');
const saveContent = (c) => store.set('content', c);
const getAdmin = () => store.get('admin');

function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') };
}
function checkPassword(pw, rec) {
  const a = Buffer.from(hashPassword(pw, rec.salt).hash, 'hex');
  const b = Buffer.from(rec.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// First run: create admin from env or a generated password (printed once).
let adminReady;
function ensureAdmin() {
  adminReady = adminReady || (async () => {
    if (await getAdmin()) return;
    const username = process.env.ADMIN_USER || 'admin';
    let pw = process.env.ADMIN_PASSWORD;
    let generated = false;
    if (!pw) { pw = crypto.randomBytes(9).toString('base64url'); generated = true; }
    await store.set('admin', { username, ...hashPassword(pw) });
    console.log('\n=== Admin account created ===');
    console.log('Username:', username);
    if (generated) console.log('Password:', pw, ' (shown once – change it in the admin panel)');
    console.log('=============================\n');
  })();
  return adminReady;
}

const SECRET = (() => {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.VERCEL) throw new Error('Set SESSION_SECRET in the Vercel project settings');
  const f = path.join(DATA, 'session-secret');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'));
  return fs.readFileSync(f, 'utf8');
})();

// ---------- sessions (signed cookie) ----------
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
function makeSession(user) {
  const csrf = crypto.randomBytes(16).toString('hex');
  const payload = Buffer.from(JSON.stringify({ u: user, c: csrf, e: Date.now() + 8 * 3600e3 })).toString('base64url');
  return payload + '.' + sign(payload);
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function getSession(req) {
  const tok = parseCookies(req)[COOKIE];
  if (!tok) return null;
  const [payload, sig] = tok.split('.');
  if (!payload || !sig) return null;
  const good = sign(payload);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return s.e > Date.now() ? s : null;
  } catch { return null; }
}
const cookieFlags = (req) =>
  'Path=/; HttpOnly; SameSite=Strict' + (req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '');

// ---------- rate limiting ----------
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => hits.clear(), 3600e3).unref();
const ip = (req) => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

// ---------- helpers ----------
const send = (res, code, body, headers = {}) => {
  res.writeHead(code, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    ...headers,
  });
  res.end(body);
};
const html = (res, body, code = 200) => send(res, code, body, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
const json = (res, obj, code = 200) => send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
const redirect = (res, to, extra = {}) => send(res, 303, '', { Location: to, ...extra });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}
const parseForm = (s) => Object.fromEntries(new URLSearchParams(s));

const str = (v, max = 500) => String(v == null ? '' : v).replace(/\r/g, '').slice(0, max).trim();
const safeUrl = (v) => {
  v = str(v, 500);
  return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(v) || v === '' ? v : '';
};

// Validate/normalise the editable content coming from the admin panel.
function sanitizeContent(inp, old) {
  const s = inp.site || {};
  const out = {
    site: {
      name: str(s.name, 80) || old.site.name,
      tagline: str(s.tagline, 120),
      phone: str(s.phone, 20).replace(/[^+\d]/g, ''),
      phoneDisplay: str(s.phoneDisplay, 30),
      email: str(s.email, 120),
      address1: str(s.address1, 120),
      address2: str(s.address2, 120),
      mapUrl: safeUrl(s.mapUrl),
      hours: str(s.hours, 200),
      payment: str(s.payment, 200),
      bookingUrl: safeUrl(s.bookingUrl),
      footerNote: str(s.footerNote, 300),
    },
    hero: { title: str(inp.hero?.title, 160), subtitle: str(inp.hero?.subtitle, 500), cta: str(inp.hero?.cta, 40) },
    about: { title: str(inp.about?.title, 160), body: str(inp.about?.body, 3000) },
    highlights: (inp.highlights || []).slice(0, 6).map((h) => ({ title: str(h.title, 60), text: str(h.text, 200) })).filter((h) => h.title),
    services: (inp.services || []).slice(0, 30).map((x) => ({ name: str(x.name, 80), desc: str(x.desc, 300), prices: str(x.prices, 120) })).filter((x) => x.name),
    servicesNote: str(inp.servicesNote, 300),
    reviewsIntro: str(inp.reviewsIntro, 200),
    reviews: old.reviews, // reviews are managed through the moderation endpoints
  };
  return out;
}

function sanitizeReview(r) {
  return {
    id: str(r.id, 40) || crypto.randomBytes(6).toString('hex'),
    name: str(r.name, 60),
    rating: Math.min(5, Math.max(1, parseInt(r.rating, 10) || 5)),
    text: str(r.text, 1000),
    date: str(r.date, 10) || new Date().toISOString().slice(0, 10),
    status: r.status === 'approved' ? 'approved' : 'pending',
  };
}

// ---------- static ----------
const MIME = { '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain', '.webp': 'image/webp' };
function serveStatic(req, res, pathname) {
  const file = path.normalize(path.join(PUBLIC, pathname));
  if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  send(res, 200, fs.readFileSync(file), {
    'Content-Type': (MIME[path.extname(file)] || 'application/octet-stream'),
    'Cache-Control': 'public, max-age=3600',
  });
  return true;
}

// ---------- routes ----------
const PAGES = ['/', '/services', '/about', '/contact'];

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname.replace(/\/+$/, '') || '/';
    const method = req.method;
    await ensureAdmin();

    if (method === 'GET' && serveStatic(req, res, p)) return;

    if (method === 'GET' && PAGES.includes(p)) {
      return html(res, renderPage(p, await getContent(), { sent: url.searchParams.get('review') === 'sent' }));
    }

    // public review submission -> pending moderation
    if (method === 'POST' && p === '/review') {
      if (limited('rev:' + ip(req), 3, 3600e3)) return html(res, 'Too many submissions. Please try again later.', 429);
      const f = parseForm(await readBody(req));
      if (f.website) return redirect(res, '/?review=sent#reviews'); // honeypot
      const r = sanitizeReview({ ...f, status: 'pending', id: '' });
      if (!r.name || r.text.length < 10) return redirect(res, '/#reviews');
      const c = await getContent();
      c.reviews.push(r);
      await saveContent(c);
      return redirect(res, '/?review=sent#reviews');
    }

    // ----- admin -----
    if (p === '/admin' && method === 'GET') {
      const s = getSession(req);
      if (!s) return html(res, renderLogin(url.searchParams.get('err') === '1'));
      return html(res, renderAdmin(await getContent(), s.c));
    }
    if (p === '/admin/login' && method === 'POST') {
      if (limited('login:' + ip(req), 8, 15 * 60e3)) return html(res, 'Too many attempts. Try again in 15 minutes.', 429);
      const f = parseForm(await readBody(req));
      const rec = await getAdmin();
      const ok = f.username === rec.username && checkPassword(f.password || '', rec);
      if (!ok) return redirect(res, '/admin?err=1');
      return redirect(res, '/admin', { 'Set-Cookie': `${COOKIE}=${encodeURIComponent(makeSession(rec.username))}; ${cookieFlags(req)}; Max-Age=28800` });
    }
    if (p === '/admin/logout' && method === 'POST') {
      return redirect(res, '/admin', { 'Set-Cookie': `${COOKIE}=; ${cookieFlags(req)}; Max-Age=0` });
    }

    if (p.startsWith('/api/admin/')) {
      const s = getSession(req);
      if (!s) return json(res, { error: 'Not logged in' }, 401);
      if (method !== 'GET' && req.headers['x-csrf-token'] !== s.c) return json(res, { error: 'Bad CSRF token' }, 403);

      if (p === '/api/admin/content' && method === 'GET') return json(res, await getContent());
      if (p === '/api/admin/content' && method === 'PUT') {
        const body = JSON.parse(await readBody(req));
        const c = sanitizeContent(body, await getContent());
        await saveContent(c);
        return json(res, { ok: true });
      }
      if (p === '/api/admin/reviews' && method === 'PUT') {
        const body = JSON.parse(await readBody(req));
        const c = await getContent();
        c.reviews = (body.reviews || []).slice(0, 500).map(sanitizeReview).filter((r) => r.name && r.text);
        await saveContent(c);
        return json(res, { ok: true });
      }
      if (p === '/api/admin/password' && method === 'POST') {
        const body = JSON.parse(await readBody(req));
        const rec = await getAdmin();
        if (!checkPassword(str(body.current, 200), rec)) return json(res, { error: 'Current password is incorrect' }, 400);
        const np = str(body.next, 200);
        if (np.length < 8) return json(res, { error: 'New password must be at least 8 characters' }, 400);
        const nu = str(body.username, 60) || rec.username;
        await store.set('admin', { username: nu, ...hashPassword(np) });
        return json(res, { ok: true });
      }
      return json(res, { error: 'Not found' }, 404);
    }

    html(res, renderPage('404', await getContent(), {}), 404);
  } catch (e) {
    console.error(e);
    json(res, { error: 'Server error' }, 500);
  }
});

if (require.main === module && !process.env.VERCEL) server.listen(PORT, () => console.log(`United Massage running on http://localhost:${PORT}`));
module.exports = server;
