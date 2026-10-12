// Review carousel. Shows only genuine reviews listed in /assets/reviews.json.
// If the file is empty, the whole section stays hidden.
(function () {
  var sec = document.getElementById('reviews');
  if (!sec) return;
  fetch('/assets/reviews.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (list) {
    if (!Array.isArray(list)) return;
    list = list.filter(function (r) { return r && r.name && r.text && r.source; });
    if (!list.length) return;
    var track = document.getElementById('rtrack'), dots = document.getElementById('rdots');
    list.forEach(function (r, i) {
      var n = Math.max(1, Math.min(5, parseInt(r.rating, 10) || 5));
      var fig = document.createElement('figure'); fig.className = 'rcard';
      var st = document.createElement('div'); st.className = 'rstars'; st.setAttribute('aria-label', n + ' out of 5 stars');
      st.textContent = '★'.repeat(n);
      var q = document.createElement('blockquote'); q.textContent = '“' + r.text + '”';
      var c = document.createElement('figcaption'); c.textContent = r.name + ' · ' + r.source;
      fig.appendChild(st); fig.appendChild(q); fig.appendChild(c); track.appendChild(fig);
      var d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', 'Review ' + (i + 1));
      d.addEventListener('click', function () { go(i, true); }); dots.appendChild(d);
    });
    sec.hidden = false;
    var cur = 0, timer;
    function go(i, user) {
      cur = (i + list.length) % list.length;
      track.style.transform = 'translateX(-' + cur * 100 + '%)';
      Array.prototype.forEach.call(dots.children, function (d, k) { d.className = k === cur ? 'on' : ''; });
      if (user) restart();
    }
    function restart() {
      clearInterval(timer);
      if (list.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        timer = setInterval(function () { go(cur + 1); }, 5000);
    }
    sec.addEventListener('mouseenter', function () { clearInterval(timer); });
    sec.addEventListener('mouseleave', restart);
    go(0); restart();
  }).catch(function () {});
})();
