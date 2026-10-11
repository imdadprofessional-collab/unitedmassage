'use strict';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paras = (s) => String(s || '').split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const stars = (n) => '★'.repeat(n) + '<span class="off">' + '★'.repeat(5 - n) + '</span>';

const NAV = [['/', 'Home'], ['/services', 'Services'], ['/about', 'About'], ['/contact', 'Contact']];

function layout(c, path, title, body, desc) {
  const s = c.site;
  const ld = {
    '@context': 'https://schema.org', '@type': 'HealthAndBeautyBusiness', name: s.name,
    telephone: s.phone, address: { '@type': 'PostalAddress', streetAddress: s.address1, addressLocality: 'College Park', addressRegion: 'GA', postalCode: '30349', addressCountry: 'US' },
    paymentAccepted: 'Cash',
  };
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc || c.hero.subtitle)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head><body>
<header class="top"><div class="wrap bar">
  <a class="brand" href="/"><span class="mark">U</span><span>${esc(s.name)}</span></a>
  <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menu">
  <label for="nav-toggle" class="burger" aria-hidden="true"><i></i><i></i><i></i></label>
  <nav>${NAV.map(([h, l]) => `<a href="${h}"${h === path ? ' class="on"' : ''}>${l}</a>`).join('')}
  <a class="btn sm" href="${esc(s.bookingUrl)}">Book Now</a></nav>
</div></header>
<main>${body}</main>
<footer><div class="wrap cols">
  <div><div class="brand light"><span class="mark">U</span><span>${esc(s.name)}</span></div><p>${esc(s.tagline)}</p><p class="small">${esc(s.footerNote)}</p></div>
  <div><h4>Visit</h4><p>${esc(s.address1)}<br>${esc(s.address2)}</p><p>${esc(s.hours)}</p></div>
  <div><h4>Contact</h4><p><a href="tel:${esc(s.phone)}">${esc(s.phoneDisplay)}</a></p>${s.email ? `<p><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></p>` : ''}<p>${esc(s.payment)}</p></div>
</div><div class="wrap copy">© ${new Date().getFullYear()} ${esc(s.name)}. All rights reserved. · <a href="/admin">Admin</a></div></footer>
</body></html>`;
}

const servicesGrid = (list) => `<div class="grid3">${list.map((x) => `<article class="card"><h3>${esc(x.name)}</h3><p>${esc(x.desc)}</p><p class="price">${esc(x.prices)}</p></article>`).join('')}</div>`;

function reviewsSection(c, sent) {
  const ok = c.reviews.filter((r) => r.status === 'approved');
  const avg = ok.length ? (ok.reduce((a, r) => a + r.rating, 0) / ok.length).toFixed(1) : null;
  return `<section class="band" id="reviews"><div class="wrap">
  <h2>Guest Reviews</h2>
  ${avg ? `<p class="center lead"><span class="stars">${stars(Math.round(avg))}</span> ${avg} average from ${ok.length} review${ok.length > 1 ? 's' : ''}</p>` : `<p class="center lead">${esc(c.reviewsIntro)}</p>`}
  ${ok.length ? `<div class="grid3">${ok.map((r) => `<figure class="card review"><div class="stars">${stars(r.rating)}</div><blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)} · ${esc(r.date)}</figcaption></figure>`).join('')}</div>` : ''}
  ${sent ? '<p class="notice">Thank you! Your review was received and will appear after it is approved.</p>' : ''}
  <details class="revform"><summary class="btn ghost">Write a review</summary>
  <form method="post" action="/review">
    <label>Your name<input name="name" required maxlength="60"></label>
    <label>Rating<select name="rating"><option value="5">5 – Excellent</option><option value="4">4 – Good</option><option value="3">3 – Okay</option><option value="2">2 – Poor</option><option value="1">1 – Bad</option></select></label>
    <label>Your experience<textarea name="text" required minlength="10" maxlength="1000" rows="4"></textarea></label>
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="btn">Submit review</button>
    <p class="small">Reviews are checked before they are published.</p>
  </form></details>
</div></section>`;
}

const locationBlock = (s) => `<div class="loc"><h3>Find us</h3>
  <p><strong>${esc(s.address1)}</strong><br>${esc(s.address2)}</p>
  <p>${esc(s.hours)}</p><p>Call: <a href="tel:${esc(s.phone)}">${esc(s.phoneDisplay)}</a></p>
  <p><strong>Payment:</strong> ${esc(s.payment)}</p>
  <p><a class="btn" href="${esc(s.mapUrl)}" target="_blank" rel="noopener">Get directions</a> <a class="btn ghost" href="${esc(s.bookingUrl)}">Book online</a></p></div>`;

function renderPage(path, c, opts = {}) {
  const s = c.site;
  if (path === '/') {
    return layout(c, path, `${s.name} | Massage in College Park, GA`, `
<section class="hero"><div class="wrap">
  <p class="eyebrow">${esc(s.tagline)}</p>
  <h1>${esc(c.hero.title)}</h1><p class="lead">${esc(c.hero.subtitle)}</p>
  <p><a class="btn" href="${esc(s.bookingUrl)}">${esc(c.hero.cta)}</a> <a class="btn ghost light" href="tel:${esc(s.phone)}">Call ${esc(s.phoneDisplay)}</a></p>
</div></section>
<section class="wrap highlights">${c.highlights.map((h) => `<div><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p></div>`).join('')}</section>
<section class="wrap split"><div><h2>${esc(c.about.title)}</h2>${paras(c.about.body)}<p><a class="btn ghost" href="/about">Learn more</a></p></div>
  <div class="panel"><h3>Visit us</h3><p>${esc(s.address1)}<br>${esc(s.address2)}</p><p>${esc(s.hours)}</p><p>${esc(s.payment)}</p></div></section>
<section class="band alt"><div class="wrap"><h2>Our Services</h2>${servicesGrid(c.services.slice(0, 6))}<p class="center"><a class="btn ghost" href="/services">All services &amp; pricing</a></p></div></section>
${reviewsSection(c, opts.sent)}
<section class="cta"><div class="wrap"><h2>Ready to relax?</h2><p>${esc(s.payment)}</p><a class="btn light" href="${esc(s.bookingUrl)}">Book an Appointment</a></div></section>`);
  }
  if (path === '/services') {
    return layout(c, path, `Services | ${s.name}`, `<section class="page"><div class="wrap"><h1>Services &amp; Pricing</h1><p class="lead">${esc(c.servicesNote)}</p>${servicesGrid(c.services)}<p class="center"><a class="btn" href="${esc(s.bookingUrl)}">Book an Appointment</a></p></div></section>`);
  }
  if (path === '/about') {
    return layout(c, path, `About | ${s.name}`, `<section class="page"><div class="wrap narrow"><h1>${esc(c.about.title)}</h1>${paras(c.about.body)}<div class="highlights stack">${c.highlights.map((h) => `<div><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p></div>`).join('')}</div></div></section>`);
  }
  if (path === '/contact') {
    return layout(c, path, `Contact | ${s.name}`, `<section class="page"><div class="wrap narrow"><h1>Contact &amp; Location</h1>${locationBlock(s)}</div></section>`);
  }
  return layout(c, path, `Not found | ${s.name}`, `<section class="page"><div class="wrap narrow center"><h1>Page not found</h1><p><a class="btn" href="/">Back home</a></p></div></section>`);
}

const adminHead = (t) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${t}</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/admin.css"></head>`;

function renderLogin(err) {
  return `${adminHead('Admin login')}<body class="adminbg"><form class="login" method="post" action="/admin/login">
<h1>Admin login</h1>${err ? '<p class="error">Wrong username or password.</p>' : ''}
<label>Username<input name="username" autocomplete="username" required></label>
<label>Password<input name="password" type="password" autocomplete="current-password" required></label>
<button class="btn">Sign in</button><p class="small"><a href="/">← Back to site</a></p></form></body></html>`;
}

function renderAdmin(c, csrf) {
  return `${adminHead('Admin | Edit site')}<body class="adminbg"><meta name="csrf" content="${esc(csrf)}">
<div class="adminbar"><strong>Site editor</strong><span><a href="/" target="_blank">View site</a>
<form method="post" action="/admin/logout" class="inl"><button class="link">Log out</button></form></span></div>
<div id="app" class="adminwrap">Loading…</div><div id="toast"></div><script src="/admin.js"></script></body></html>`;
}

module.exports = { renderPage, renderLogin, renderAdmin };
