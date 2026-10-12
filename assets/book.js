// Booking form: require a service, then submit to Formspree with fetch (AJAX) and show
// an inline thank-you. If anything fails, fall back to the normal form POST.
(function () {
  var form = document.querySelector('.bform');
  if (!form) return;
  var msg = document.createElement('p');
  msg.setAttribute('role', 'status');
  msg.style.cssText = 'margin:12px 0 0;font-size:14px';
  form.appendChild(msg);

  form.addEventListener('submit', function (e) {
    if (!form.querySelector('input[name=service]:checked')) {
      e.preventDefault();
      alert('Please choose at least one service.');
      return;
    }
    if (!window.fetch || !window.FormData) return; // normal submit
    e.preventDefault();
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; msg.style.color = ''; msg.textContent = 'Sending...';
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('bad status');
        form.reset();
        msg.style.color = '#2f6f62';
        msg.textContent = 'Thank you! Your request was sent. We will contact you by phone or text to confirm.';
      })
      .catch(function () {
        msg.style.color = '#b3382c';
        msg.textContent = 'Sorry, that did not send. Please call or text (201) 942-1938 instead.';
      })
      .then(function () { btn.disabled = false; });
  });
})();
