'use strict';
// Smoke test: boots the server on a temp data dir copy and exercises the main flows.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASSWORD = 'test-pass-123';
process.env.SESSION_SECRET = 'x'.repeat(32);
const adminFile = path.join(__dirname, 'data', 'admin.json');
const contentFile = path.join(__dirname, 'data', 'content.json');
const backup = fs.readFileSync(contentFile);
const hadAdmin = fs.existsSync(adminFile);
if (hadAdmin) fs.renameSync(adminFile, adminFile + '.bak');
const server = require('./server');

(async () => {
  try {
    await new Promise((r) => server.listen(0, r));
    const base = 'http://127.0.0.1:' + server.address().port;
    for (const p of ['/', '/services', '/about', '/contact', '/style.css']) {
      const r = await fetch(base + p); assert.strictEqual(r.status, 200, p);
    }
    const home = await (await fetch(base + '/')).text();
    assert(home.includes('3100 Godby Rd') && home.includes('College Park, GA 30349'));
    assert((await fetch(base + '/api/admin/content')).status === 401);
    assert((await fetch(base + '/data/admin.json')).status === 404);

    let r = await fetch(base + '/admin/login', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'username=admin&password=bad' });
    assert(r.headers.get('location').includes('err=1'));
    r = await fetch(base + '/admin/login', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'username=admin&password=test-pass-123' });
    const cookie = r.headers.get('set-cookie').split(';')[0];
    const page = await (await fetch(base + '/admin', { headers: { cookie } })).text();
    const csrf = page.match(/name="csrf" content="([^"]+)"/)[1];

    const c = await (await fetch(base + '/api/admin/content', { headers: { cookie } })).json();
    c.site.address1 = '1 Test <b>St</b>';
    assert((await fetch(base + '/api/admin/content', { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(c) })).status === 403, 'csrf required');
    r = await fetch(base + '/api/admin/content', { method: 'PUT', headers: { cookie, 'x-csrf-token': csrf, 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    assert(r.status === 200);
    const home2 = await (await fetch(base + '/')).text();
    assert(home2.includes('1 Test &lt;b&gt;St&lt;/b&gt;'), 'edits show on site, escaped');

    await fetch(base + '/review', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'name=Sam&rating=5&text=Really+relaxing+visit' });
    assert(!(await (await fetch(base + '/')).text()).includes('Really relaxing'), 'pending review hidden');
    const c2 = await (await fetch(base + '/api/admin/content', { headers: { cookie } })).json();
    c2.reviews[0].status = 'approved';
    await fetch(base + '/api/admin/reviews', { method: 'PUT', headers: { cookie, 'x-csrf-token': csrf, 'Content-Type': 'application/json' }, body: JSON.stringify({ reviews: c2.reviews }) });
    assert((await (await fetch(base + '/')).text()).includes('Really relaxing'), 'approved review shown');
    console.log('All tests passed');
  } catch (e) { console.error(e); process.exitCode = 1; }
  finally {
    fs.writeFileSync(contentFile, backup);
    fs.rmSync(adminFile, { force: true });
    if (hadAdmin) fs.renameSync(adminFile + '.bak', adminFile);
    server.close(); process.exit(process.exitCode || 0);
  }
})();
