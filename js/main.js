  // ---------- Scroll lock (used by the splash, the album lightbox and the gift dialog) ----------
  // Fixes the page in place at its current scroll offset instead of just
  // setting overflow:hidden, which snaps the page back to the top.
  // Each caller locks under its own key, so locking twice under one key (a double tap, say)
  // can never leave the page stuck: one unlock per key always releases it.
  var scrollLockY = 0;
  var scrollLocks = {};
  function scrollLockCount() { return Object.keys(scrollLocks).length; }
  function lockScroll(key) {
    key = key || 'default';
    if (scrollLocks[key]) return;
    if (scrollLockCount() === 0) {
      scrollLockY = window.scrollY || window.pageYOffset || 0;
      document.body.style.top = -scrollLockY + 'px';
      document.body.classList.add('scroll-lock');
    }
    scrollLocks[key] = true;
  }
  function unlockScroll(key) {
    key = key || 'default';
    if (!scrollLocks[key]) return;
    delete scrollLocks[key];
    if (scrollLockCount() === 0) {
      document.body.classList.remove('scroll-lock');
      document.body.style.top = '';
      // 'instant' matters: html has scroll-behavior:smooth, which would otherwise animate the restore.
      window.scrollTo({ top: scrollLockY, left: 0, behavior: 'instant' });
    }
  }

  // ---------- Opening splash ----------
  lockScroll('splash');
  var splash = document.getElementById('splash');
  var splashOpening = false;
  document.getElementById('splash-open').addEventListener('click', function () {
    if (splashOpening) return;
    splashOpening = true;
    splash.classList.add('is-hidden');           // cover fades + eases forward (1s)
    document.documentElement.classList.remove('is-closed'); // invitation rises in behind it (starts after 0.3s)
    splash.setAttribute('aria-hidden', 'true');
    musicPlay();                                 // "Lễ Đường" starts with the opening (this tap is the user gesture)
    unlockScroll('splash');
    // Once the fade has finished, drop the cover from rendering entirely
    // (its blur and floating glyphs would otherwise keep costing frames).
    setTimeout(function () { splash.style.display = 'none'; }, 1100);
  });

  // ---------- Countdown ----------
  // Wedding date/time, Vietnam Standard Time (UTC+7).
  var WEDDING_DATE = new Date('2026-10-25T10:00:00+07:00');

  function updateCountdown() {
    var now = new Date();
    var diff = Math.max(0, WEDDING_DATE.getTime() - now.getTime());
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    document.getElementById('cd-days').textContent = pad(days);
    document.getElementById('cd-hours').textContent = pad(hours);
    document.getElementById('cd-mins').textContent = pad(mins);
    document.getElementById('cd-secs').textContent = pad(secs);
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ---------- Scroll progress bar ----------
  var progressBar = document.getElementById('progress-bar');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement;
      var scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      progressBar.style.width = Math.min(100, Math.max(0, scrolled * 100)) + '%';
      ticking = false;
    });
  }
  document.addEventListener('scroll', onScroll, { passive: true });

  // ---------- Reveal-on-scroll ----------
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  // ---------- Background music: "Lễ Đường" ----------
  // Starts when the guest taps "Mở Thiệp" (that tap is the user gesture browsers require),
  // fades in, loops, and is controlled by the floating note button. It pauses while the tab
  // is hidden and resumes on return, but only if the guest hadn't turned it off.
  var MUSIC_SRC = 'audio/le_duong.mp3';
  var MUSIC_VOLUME = 0.9;        // 0–1 (ignored on iOS, where the device volume rules)
  var bgMusic = new Audio(MUSIC_SRC);
  bgMusic.loop = true;
  bgMusic.preload = 'auto';        // buffer while the cover is showing so it starts instantly
  bgMusic.volume = 0;
  var musicWanted = false;         // what the guest asked for (button / opening the card)
  var musicFadeTimer = null;
  var musicToggle = document.getElementById('music-toggle');
  var iconOff = document.getElementById('icon-note-off');
  var iconOn = document.getElementById('icon-note-on');

  function musicSetUi(on) {
    musicToggle.setAttribute('aria-pressed', String(on));
    iconOff.hidden = on;
    iconOn.hidden = !on;
    if (!musicToggle.disabled) musicToggle.setAttribute('aria-label', on ? 'Tắt nhạc nền' : 'Bật nhạc nền');
  }
  function musicFadeTo(target, ms, done) {
    clearInterval(musicFadeTimer);
    var from = bgMusic.volume, t0 = performance.now();
    musicFadeTimer = setInterval(function () {
      var k = Math.min(1, (performance.now() - t0) / ms);
      bgMusic.volume = from + (target - from) * k;
      if (k === 1) { clearInterval(musicFadeTimer); if (done) done(); }
    }, 50);
  }
  function musicPlay() {
    musicWanted = true;
    musicSetUi(true);
    var p = bgMusic.play();
    // If the browser refuses (autoplay policy, missing file), fall back to "off" so the button stays honest.
    if (p && p.catch) p.catch(function () { musicWanted = false; musicSetUi(false); });
    musicFadeTo(MUSIC_VOLUME, 2000);
  }
  function musicPause() {
    musicWanted = false;
    musicSetUi(false);
    musicFadeTo(0, 700, function () { bgMusic.pause(); });
  }

  musicToggle.addEventListener('click', function () { if (musicWanted) musicPause(); else musicPlay(); });
  document.addEventListener('visibilitychange', function () {
    if (!musicWanted) return;
    if (document.hidden) bgMusic.pause();
    else { var p = bgMusic.play(); if (p && p.catch) p.catch(function () {}); }
  });
  bgMusic.addEventListener('error', function () {
    musicWanted = false;
    musicSetUi(false);
    musicToggle.disabled = true;
    musicToggle.setAttribute('aria-label', 'Không tải được nhạc nền');
    musicToggle.style.opacity = '0.5';
  });

  // ---------- Photo album coverflow ----------
  // The centre photo is sharp; its neighbours sit either side, dimmed and blurred.
  // Nothing locks input while a move is in flight (CSS transitions simply retarget),
  // so taps and swipes always respond immediately.
  var albumStage = document.getElementById('album-stage');
  var albumSlides = Array.prototype.slice.call(document.querySelectorAll('.album-slide'));
  var albumTotal = albumSlides.length;
  var albumCurrent = 0;
  var albumDotsEl = document.getElementById('album-dots');
  var albumHover = false;
  var albumInView = false;
  var albumLightboxOpen = false;
  var albumAutoDelay = 4000;
  var albumTimer = null;

  var albumDots = albumSlides.map(function (_, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'album-dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute('aria-label', 'Chuyển tới ảnh ' + (i + 1));
    dot.addEventListener('click', function () { albumGo(i); });
    albumDotsEl.appendChild(dot);
    return dot;
  });

  function renderAlbum() {
    albumSlides.forEach(function (slide, i) {
      var offset = i - albumCurrent;
      if (offset > albumTotal / 2) offset -= albumTotal;
      if (offset < -albumTotal / 2) offset += albumTotal;
      var abs = Math.abs(offset);
      var x = (offset < 0 ? -1 : 1) * Math.min(abs, 2) * 185;   // far photos park at ±2 instead of flying off
      var scale = Math.max(1 - abs * 0.22, 0.62);
      var opacity = abs > 1 ? 0 : abs === 0 ? 1 : 0.45;
      slide.style.transform = 'translate(-50%, -50%) translateX(' + x + 'px) scale(' + scale + ')';
      slide.style.opacity = String(opacity);
      slide.style.filter = abs === 0 ? 'blur(0)' : 'blur(' + Math.min(abs * 1.4, 3) + 'px)';
      slide.style.zIndex = String(20 - abs);
      slide.style.pointerEvents = abs > 1 ? 'none' : 'auto';
      slide.classList.toggle('is-active', offset === 0);
    });
    albumDots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === albumCurrent); });
  }

  // Auto-advance, slow and unhurried. It only runs while the album is on screen and
  // nothing is holding it (mouse over it, lightbox open, tab hidden); any of those
  // changing, or any manual move, re-arms a full delay.
  function albumSyncPause() {
    clearTimeout(albumTimer);
    if (albumHover || !albumInView || albumLightboxOpen || document.hidden) return;
    albumTimer = setTimeout(function () { albumGo(albumCurrent + 1); }, albumAutoDelay);
  }

  function albumGo(index) {
    index = (index + albumTotal) % albumTotal;
    if (index !== albumCurrent) {
      albumCurrent = index;
      renderAlbum();
      // Warm up both neighbours so the next move never waits on the network.
      albumSlides[(index + 1) % albumTotal].loading = 'eager';
      albumSlides[(index - 1 + albumTotal) % albumTotal].loading = 'eager';
    }
    albumSyncPause();
  }

  document.querySelector('.album-prev').addEventListener('click', function () { albumGo(albumCurrent - 1); });
  document.querySelector('.album-next').addEventListener('click', function () { albumGo(albumCurrent + 1); });
  albumSlides.forEach(function (slide, i) {
    slide.addEventListener('click', function () {
      if (i === albumCurrent) openLightbox(); else albumGo(i);
    });
  });

  // Pause while a mouse is over the album (touch taps must not leave it stuck paused).
  albumStage.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { albumHover = true; albumSyncPause(); } });
  albumStage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { albumHover = false; albumSyncPause(); } });
  document.addEventListener('visibilitychange', albumSyncPause);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      albumInView = entries[0].isIntersecting;
      albumSyncPause();
    }, { threshold: 0.35 }).observe(albumStage);
  } else {
    albumInView = true;
  }

  renderAlbum();
  albumSyncPause();

  // ---------- Album lightbox (tap the photo to zoom) ----------
  var lightbox = document.getElementById('album-lightbox');
  var lightboxImg = document.getElementById('album-lightbox-img');
  var lightboxClose = document.getElementById('album-lightbox-close');
  var lightboxCount = document.getElementById('album-lightbox-count');
  var lightboxReturnFocus = null;
  var lightboxSwapTimer = null;

  function showLightboxSlide() {
    var slide = albumSlides[albumCurrent];
    lightboxImg.src = slide.currentSrc || slide.src;
    lightboxImg.alt = slide.alt;
    lightboxCount.textContent = (albumCurrent + 1) + ' / ' + albumTotal;
  }

  // Previous/next inside the lightbox also moves the coverflow, so closing lands on the same photo.
  function lightboxStep(dir) {
    albumGo(albumCurrent + dir);
    clearTimeout(lightboxSwapTimer);
    lightboxImg.classList.add('is-swapping');
    lightboxSwapTimer = setTimeout(function () {
      showLightboxSlide();
      lightboxImg.classList.remove('is-swapping');
    }, 150);
  }

  function openLightbox() {
    if (albumLightboxOpen) return;
    showLightboxSlide();
    lightboxReturnFocus = document.activeElement;
    lightbox.setAttribute('aria-hidden', 'false');
    lightbox.classList.add('is-visible');
    lockScroll('lightbox');
    albumLightboxOpen = true;
    albumSyncPause();
    // A hidden → visible transition only counts as visible once it has started, so focus a beat later.
    setTimeout(function () { if (albumLightboxOpen) lightboxClose.focus({ preventScroll: true }); }, 60);
  }
  function closeLightbox() {
    if (!albumLightboxOpen) return;
    lightbox.classList.remove('is-visible');
    lightbox.setAttribute('aria-hidden', 'true');
    unlockScroll('lightbox');
    albumLightboxOpen = false;
    albumSyncPause();
    if (lightboxReturnFocus && lightboxReturnFocus.focus) lightboxReturnFocus.focus({ preventScroll: true });
  }
  // (Slide taps are handled once, in the coverflow block above: centre photo → openLightbox, others → albumGo.)
  lightboxClose.addEventListener('click', closeLightbox);
  document.querySelector('.album-lightbox-prev').addEventListener('click', function () { lightboxStep(-1); });
  document.querySelector('.album-lightbox-next').addEventListener('click', function () { lightboxStep(1); });

  // Swipe inside the lightbox. A swipe also fires a click afterwards, which must not close it.
  var lightboxTouchX = null, lightboxTouchY = null, lightboxSwiped = false;
  lightbox.addEventListener('touchstart', function (e) {
    lightboxTouchX = e.touches[0].clientX; lightboxTouchY = e.touches[0].clientY;
    lightboxSwiped = false;
  }, { passive: true });
  lightbox.addEventListener('touchend', function (e) {
    if (lightboxTouchX === null) return;
    var dx = e.changedTouches[0].clientX - lightboxTouchX;
    var dy = e.changedTouches[0].clientY - lightboxTouchY;
    lightboxTouchX = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      lightboxSwiped = true;
      lightboxStep(dx < 0 ? 1 : -1);
    }
  });

  lightbox.addEventListener('click', function (e) {
    if (lightboxSwiped) { lightboxSwiped = false; return; }
    if (e.target.closest('.album-lightbox-close, .album-lightbox-nav')) return;
    closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
    if (!albumLightboxOpen) return;
    if (e.key === 'ArrowLeft') lightboxStep(-1);
    if (e.key === 'ArrowRight') lightboxStep(1);
  });

  // Swipe (touch): horizontal movement only, so vertical page scrolling is untouched.
  var albumTouchX = null, albumTouchY = null;
  albumStage.addEventListener('touchstart', function (e) {
    albumTouchX = e.touches[0].clientX; albumTouchY = e.touches[0].clientY;
  }, { passive: true });
  albumStage.addEventListener('touchend', function (e) {
    if (albumTouchX === null) return;
    var dx = e.changedTouches[0].clientX - albumTouchX;
    var dy = e.changedTouches[0].clientY - albumTouchY;
    albumTouchX = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) albumGo(albumCurrent + (dx < 0 ? 1 : -1));
  });

  // Left/right arrow keys, only while the album is on screen and the lightbox is closed.
  document.addEventListener('keydown', function (e) {
    if (!albumInView || albumLightboxOpen) return;
    var tag = (document.activeElement || {}).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowLeft') albumGo(albumCurrent - 1);
    if (e.key === 'ArrowRight') albumGo(albumCurrent + 1);
  });

  // ---------- Gift box ----------
  // Hai tab QR (Chú rể / Cô dâu): ảnh lấy từ thư mục qr/.
  var giftTabs = document.querySelectorAll('.gift-tab');
  var giftPanels = document.querySelectorAll('.gift-panel');
  function giftSelectTab(name) {
    giftTabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    giftPanels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
  }
  giftTabs.forEach(function (t) {
    t.addEventListener('click', function () { giftSelectTab(t.getAttribute('data-tab')); });
  });

  var giftBoxEl = document.getElementById('gift-box');
  var giftModal = document.getElementById('gift-modal');
  var giftCloseEl = document.getElementById('gift-close');
  var giftBusy = false;      // true from the tap until the dialog has opened
  var giftIsOpen = false;
  var giftHeartColors = ['#6B1E2A', '#B8893F'];
  var GIFT_HEART_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.4 3.2 5 6.6 5c2 0 3.6 1.1 5.4 3 1.8-1.9 3.4-3 5.4-3 3.4 0 5.4 3.4 4.1 6.8C19.5 16.4 12 21 12 21Z"/></svg>';

  // Hearts drift up from the tap point (or from the present's centre for keyboard taps).
  function giftSpawnHearts(e) {
    var rect = giftBoxEl.getBoundingClientRect();
    var fromPointer = e && e.detail > 0;
    var cx = fromPointer ? e.clientX - rect.left : rect.width / 2;
    var cy = fromPointer ? e.clientY - rect.top : rect.height / 2;
    for (var i = 0; i < 5; i++) {
      var heart = document.createElement('span');
      heart.className = 'gift-heart';
      heart.innerHTML = GIFT_HEART_SVG;
      heart.style.color = giftHeartColors[i % giftHeartColors.length];
      heart.style.left = (cx + (Math.random() * 40 - 20)) + 'px';
      heart.style.top = cy + 'px';
      heart.style.animationDelay = (i * 60) + 'ms';
      giftBoxEl.appendChild(heart);
      setTimeout(function (h) { h.remove(); }, 1700, heart);
    }
  }

  function giftOpen() {
    giftModal.setAttribute('aria-hidden', 'false');
    giftModal.classList.add('is-open');
    lockScroll('gift');
    giftSelectTab('bride');
    giftIsOpen = true;
    // A hidden → visible transition only counts as visible once it has started, so focus a beat later.
    setTimeout(function () { if (giftIsOpen) giftCloseEl.focus({ preventScroll: true }); }, 60);
  }
  function giftClose() {
    if (!giftIsOpen) return;
    giftModal.classList.remove('is-open');
    giftModal.setAttribute('aria-hidden', 'true');
    unlockScroll('gift');
    giftIsOpen = false;
    giftBusy = false;
    giftBoxEl.focus({ preventScroll: true });
  }

  giftBoxEl.addEventListener('click', function (e) {
    if (giftBusy) return;
    giftBusy = true;
    giftSpawnHearts(e);
    giftBoxEl.classList.add('is-hopping');
    // Let the present hop first, then bring up the QR.
    setTimeout(function () {
      giftBoxEl.classList.remove('is-hopping');
      giftOpen();
    }, 400);
  });
  giftCloseEl.addEventListener('click', giftClose);
  giftModal.addEventListener('click', function (e) { if (e.target === giftModal) giftClose(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') giftClose(); });
