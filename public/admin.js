(function () {
  'use strict';
  var csrf = document.querySelector('meta[name=csrf]').content;
  var app = document.getElementById('app');
  var data;

  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.style.display = 'block';
    setTimeout(function () { t.style.display = 'none'; }, 2500);
  }
  function api(method, url, body) {
    return fetch(url, {
      method: method, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (r.status === 401) { location.reload(); throw new Error('login'); }
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Error'); return j; });
    });
  }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function field(label, obj, key, opts) {
    opts = opts || {};
    var input = el(opts.area ? 'textarea' : 'input', { rows: opts.rows || 3, maxlength: opts.max || 500 });
    input.value = obj[key] || '';
    input.addEventListener('input', function () { obj[key] = input.value; });
    return el('label', { text: label }, [input]);
  }
  function fs(title, kids) { return el('fieldset', {}, [el('legend', { text: title })].concat(kids)); }
  function btn(text, fn, cls) { return el('button', { type: 'button', class: 'btn sm ' + (cls || ''), text: text, onclick: fn }); }

  function listEditor(arr, makeNew, fields, addLabel, rerender) {
    var box = el('div');
    arr.forEach(function (item, i) {
      var kids = fields.map(function (f) { return field(f[1], item, f[0], { area: f[2] }); });
      kids.push(btn('Remove', function () { arr.splice(i, 1); rerender(); }, 'danger'));
      box.appendChild(el('div', { class: 'item' }, kids));
    });
    box.appendChild(btn(addLabel, function () { arr.push(makeNew()); rerender(); }));
    return box;
  }

  function render() {
    app.textContent = '';
    var s = data.site;
    app.appendChild(fs('Contact & business info', [
      el('div', { class: 'row' }, [field('Business name', s, 'name'), field('Tagline', s, 'tagline')]),
      el('div', { class: 'row' }, [field('Phone (digits, e.g. +12019421938)', s, 'phone'), field('Phone as shown on site', s, 'phoneDisplay')]),
      el('div', { class: 'row' }, [field('Street address', s, 'address1'), field('City, state, ZIP', s, 'address2')]),
      el('div', { class: 'row' }, [field('Email (optional)', s, 'email'), field('Hours', s, 'hours')]),
      field('Google Maps link', s, 'mapUrl'),
      field('Payment info', s, 'payment'),
      field('Booking / payment link (used by every “Book” button)', s, 'bookingUrl'),
      field('Footer note', s, 'footerNote', { area: true, rows: 2 })
    ]));
    app.appendChild(fs('Home page banner', [
      field('Headline', data.hero, 'title'), field('Sub-text', data.hero, 'subtitle', { area: true, max: 500 }), field('Button text', data.hero, 'cta')
    ]));
    app.appendChild(fs('About section', [
      field('Title', data.about, 'title'), field('Text (blank line = new paragraph)', data.about, 'body', { area: true, rows: 8, max: 3000 })
    ]));
    app.appendChild(fs('Highlights (max 6)', [listEditor(data.highlights, function () { return { title: '', text: '' }; }, [['title', 'Title'], ['text', 'Text']], '+ Add highlight', render)]));
    app.appendChild(fs('Services & prices', [
      field('Note shown above services page', data, 'servicesNote'),
      listEditor(data.services, function () { return { name: '', desc: '', prices: '' }; }, [['name', 'Name'], ['desc', 'Description', true], ['prices', 'Prices']], '+ Add service', render)
    ]));
    app.appendChild(fs('Reviews section', [field('Intro text (shown while there are no approved reviews)', data, 'reviewsIntro')]));
    app.appendChild(el('div', { class: 'savebar' }, [btn('Save all changes', save)]));

    // reviews moderation
    var rv = [];
    if (!data.reviews.length) rv.push(el('p', { text: 'No reviews yet. Visitor submissions appear here for approval.' }));
    data.reviews.forEach(function (r, i) {
      rv.push(el('div', { class: 'item' }, [
        el('p', {}, [el('strong', { text: r.name + ' · ' + r.rating + '★ · ' + r.date + ' ' }), el('span', { class: 'tag ' + r.status, text: r.status })]),
        el('p', { text: r.text }),
        btn(r.status === 'approved' ? 'Unpublish' : 'Approve', function () { r.status = r.status === 'approved' ? 'pending' : 'approved'; saveReviews(); }),
        btn('Delete', function () { if (confirm('Delete this review?')) { data.reviews.splice(i, 1); saveReviews(); } }, 'danger')
      ]));
    });
    app.appendChild(fs('Review moderation (changes save immediately)', rv));

    // account
    var acct = { username: '', current: '', next: '' };
    app.appendChild(fs('Change login', [
      field('New username (leave blank to keep)', acct, 'username'), field('Current password', acct, 'current'), field('New password (8+ chars)', acct, 'next'),
      btn('Update login', function () {
        api('POST', '/api/admin/password', acct).then(function () { toast('Login updated'); acct.current = acct.next = ''; render(); }).catch(function (e) { toast(e.message); });
      })
    ]));
    app.querySelectorAll('input').forEach(function (i) { if (/password|current/i.test(i.parentNode.textContent)) i.type = 'password'; });
  }

  function save() {
    api('PUT', '/api/admin/content', data).then(function () { toast('Saved ✔'); }).catch(function (e) { toast(e.message); });
  }
  function saveReviews() {
    api('PUT', '/api/admin/reviews', { reviews: data.reviews }).then(function () { toast('Reviews updated'); render(); }).catch(function (e) { toast(e.message); });
  }

  api('GET', '/api/admin/content').then(function (d) { data = d; render(); });
})();
