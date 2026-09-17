
(function() {
  var home = document.getElementById('home');
  var sections = Array.prototype.slice.call(document.querySelectorAll('.section-view'));

  function showHome() {
    home.hidden = false;
    sections.forEach(function(s) { s.hidden = true; });
    window.scrollTo(0, 0);
    history.replaceState(null, '', location.pathname);
  }

  function showSection(id) {
    var target = document.getElementById('sec-' + id);
    if (!target) return;
    home.hidden = true;
    sections.forEach(function(s) { s.hidden = (s !== target); });
    window.scrollTo(0, 0);
    history.replaceState(null, '', '#' + id);
  }

  document.querySelectorAll('.sec-card').forEach(function(btn) {
    btn.addEventListener('click', function() { showSection(btn.getAttribute('data-target')); });
  });

  document.querySelectorAll('.back-btn').forEach(function(btn) {
    btn.addEventListener('click', showHome);
  });

  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  document.querySelectorAll('.shot').forEach(function(fig) {
    fig.addEventListener('click', function() {
      lightboxImg.src = fig.getAttribute('data-src');
      lightboxImg.alt = fig.querySelector('img').alt;
      lightbox.hidden = false;
    });
  });
  function closeLightbox() { lightbox.hidden = true; lightboxImg.src = ''; }
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function(e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLightbox(); });

  var hash = location.hash.replace('#', '');
  if (hash && document.getElementById('sec-' + hash)) {
    showSection(hash);
  }
})();
