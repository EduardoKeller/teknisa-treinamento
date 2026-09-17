
(function() {
  var home = document.getElementById('home');
  var sections = Array.prototype.slice.call(document.querySelectorAll('.section-view'));
  var sideLinks = Array.prototype.slice.call(document.querySelectorAll('.side-link'));
  var sidebar = document.getElementById('sidebar');
  var sidebarToggle = document.getElementById('sidebarToggle');
  var sidebarBackdrop = document.getElementById('sidebarBackdrop');

  function setActiveLink(target) {
    sideLinks.forEach(function(link) {
      link.classList.toggle('active', link.getAttribute('data-target') === target);
    });
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.hidden = true;
    sidebarToggle.setAttribute('aria-expanded', 'false');
  }

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarBackdrop.hidden = false;
    sidebarToggle.setAttribute('aria-expanded', 'true');
  }

  function showHome() {
    home.hidden = false;
    sections.forEach(function(s) { s.hidden = true; });
    window.scrollTo(0, 0);
    history.replaceState(null, '', location.pathname);
    setActiveLink('home');
    closeSidebar();
  }

  function showSection(id) {
    var target = document.getElementById('sec-' + id);
    if (!target) return;
    home.hidden = true;
    sections.forEach(function(s) { s.hidden = (s !== target); });
    window.scrollTo(0, 0);
    history.replaceState(null, '', '#' + id);
    setActiveLink(id);
    closeSidebar();
  }

  sideLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var target = link.getAttribute('data-target');
      if (target === 'home') showHome();
      else showSection(target);
    });
  });

  document.querySelectorAll('.back-btn').forEach(function(btn) {
    btn.addEventListener('click', showHome);
  });

  sidebarToggle.addEventListener('click', function() {
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  });
  sidebarBackdrop.addEventListener('click', closeSidebar);

  var backToTop = document.getElementById('backToTop');
  function updateBackToTop() {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  }
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  backToTop.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  updateBackToTop();

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
  } else {
    setActiveLink('home');
  }
})();
