// Require at least one service before the booking form is submitted.
(function () {
  var form = document.querySelector('.bform');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    if (!form.querySelector('input[name=service]:checked')) {
      e.preventDefault();
      alert('Please choose at least one service.');
    }
  });
})();
