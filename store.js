'use strict';
// Key/value storage: Supabase REST when configured (needed on Vercel, where the
// filesystem is read-only), otherwise JSON files in ./data (local / VPS).
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const useDb = !!(SB_URL && SB_KEY);
const FILES = { content: 'content.json', admin: 'admin.json' };

const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };

async function get(key) {
  if (useDb) {
    const r = await fetch(`${SB_URL}/rest/v1/site_kv?key=eq.${key}&select=value`, { headers });
    if (!r.ok) throw new Error('db read failed: ' + r.status);
    const rows = await r.json();
    if (rows.length) return rows[0].value;
    if (key === 'content') { // seed from the bundled default
      const seed = JSON.parse(fs.readFileSync(path.join(DATA, FILES.content), 'utf8'));
      await set(key, seed);
      return seed;
    }
    return null;
  }
  const f = path.join(DATA, FILES[key]);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}

async function set(key, value) {
  if (useDb) {
    const r = await fetch(`${SB_URL}/rest/v1/site_kv?on_conflict=key`, {
      method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key, value }),
    });
    if (!r.ok) throw new Error('db write failed: ' + r.status);
    return;
  }
  const f = path.join(DATA, FILES[key]);
  fs.writeFileSync(f + '.tmp', JSON.stringify(value, null, 2));
  fs.renameSync(f + '.tmp', f);
}

module.exports = { get, set, useDb };
