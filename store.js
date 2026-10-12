'use strict';
// Storage for editable site content.
//  - Vercel: Vercel Blob (set automatically when a Blob store is connected to the project,
//    via BLOB_READ_WRITE_TOKEN). The Vercel filesystem is read-only, so this is required there.
//  - Elsewhere (local / VPS): JSON files in ./data.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const FILES = { content: 'content.json', admin: 'admin.json' };
const seed = () => JSON.parse(fs.readFileSync(path.join(DATA, FILES.content), 'utf8'));

async function get(key) {
  if (useBlob) {
    if (key !== 'content') return null; // admin login lives in env vars on Vercel
    const { list } = require('@vercel/blob');
    const { blobs } = await list({ prefix: 'content.json', limit: 1 });
    if (!blobs.length) { const s = seed(); await set(key, s); return s; }
    const r = await fetch(blobs[0].url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('blob read failed: ' + r.status);
    return r.json();
  }
  const f = path.join(DATA, FILES[key]);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}

async function set(key, value) {
  if (useBlob) {
    if (key !== 'content') throw new Error('not supported');
    const { put } = require('@vercel/blob');
    await put('content.json', JSON.stringify(value), {
      access: 'public', addRandomSuffix: false, allowOverwrite: true,
      contentType: 'application/json', cacheControlMaxAge: 0,
    });
    return;
  }
  const f = path.join(DATA, FILES[key]);
  fs.writeFileSync(f + '.tmp', JSON.stringify(value, null, 2));
  fs.renameSync(f + '.tmp', f);
}

module.exports = { get, set, useBlob };
