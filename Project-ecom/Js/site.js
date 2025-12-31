// site.js — combined site-wide behaviors (merged index.js + site.js)
// Features:
// - Navbar scrolled class on scroll
// - Highlights active nav link
// - Smooth internal link scrolling
// - Pause/resume carousel on hover
// - Reveal cards on scroll (adds .in-view)
// - Add-to-cart handling with badge + toast
// - Basic form validation

(function () {
  'use strict';

  // Helper: throttle
  function throttle(fn, wait) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      }
    };
  }

  /* NAVBAR */
  const navbar = document.querySelector('.navbar');
  function handleNavScroll() {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }
  window.addEventListener('scroll', throttle(handleNavScroll, 100));
  handleNavScroll();

  function setActiveNav() {
    const links = document.querySelectorAll('.navbar .nav-link');
    const path = window.location.pathname.split('/').pop() || 'index.html';
    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const hrefFile = href.split('/').pop();
      if (hrefFile === path) a.classList.add('active'); else a.classList.remove('active');
    });
  }
  setActiveNav();

  /* SMOOTH SCROLL FOR INTERNAL LINKS */
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  /* REVEAL CARDS */
  function setupRevealCards() {
    const cards = document.querySelectorAll('.products-page .card, .home-page .card, .about-hero');
    if (!cards.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    cards.forEach((c) => observer.observe(c));
  }
  setupRevealCards();

  /* PAUSE CAROUSEL ON HOVER */
  const carouselEl = document.querySelector('#carouselExampleCaptions');
  if (carouselEl && typeof bootstrap !== 'undefined') {
    carouselEl.addEventListener('mouseenter', () => {
      const carousel = bootstrap.Carousel.getInstance(carouselEl) || new bootstrap.Carousel(carouselEl);
      carousel.pause();
    });
    carouselEl.addEventListener('mouseleave', () => {
      const carousel = bootstrap.Carousel.getInstance(carouselEl) || new bootstrap.Carousel(carouselEl);
      carousel.cycle();
    });
  }

  /* ADD TO CART + TOAST */
  function findBadgeForIcon(iconClass) {
    const icon = document.querySelector('.navbar .' + iconClass);
    if (!icon) return null;
    const parent = icon.closest('.position-relative');
    if (!parent) return null;
    return parent.querySelector('.badge');
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.style.position = 'fixed';
    toast.style.right = '18px';
    toast.style.top = '78px';
    toast.style.background = '#0f172a';
    toast.style.color = '#fff';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 10px 26px rgba(15,23,42,0.12)';
    toast.style.zIndex = '2000';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .22s ease, transform .22s ease';
    toast.textContent = message;

    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      setTimeout(() => toast.remove(), 300);
    }, 1600);
  }

  /* CART / FAVORITES STORAGE HELPERS */
  function getCart() { return JSON.parse(localStorage.getItem('ecom_cart') || '[]'); }
  function saveCart(cart) { localStorage.setItem('ecom_cart', JSON.stringify(cart)); }
  function addToCartItem(item) {
    const cart = getCart();
    const existing = cart.find(c => c.id === item.id);
    if (existing) existing.qty = (existing.qty || 0) + (item.qty || 1);
    else cart.push({ ...item, qty: item.qty || 1 });
    saveCart(cart);
    updateCartBadge();
  }
  function updateCartQty(id, qty) {
    const cart = getCart();
    const idx = cart.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (qty <= 0) { cart.splice(idx, 1); } else { cart[idx].qty = qty; }
    saveCart(cart);
    updateCartBadge();
  }
  function removeFromCart(id) { const cart = getCart(); const idx = cart.findIndex(c => c.id === id); if (idx !== -1) { cart.splice(idx, 1); saveCart(cart); updateCartBadge(); } }
  function clearCart() { localStorage.removeItem('ecom_cart'); updateCartBadge(); }

  function getFavorites() { return JSON.parse(localStorage.getItem('ecom_favorites') || '[]'); }
  function saveFavorites(favs) { localStorage.setItem('ecom_favorites', JSON.stringify(favs)); }

  function refreshFavoriteButtonStates() {
    document.querySelectorAll('.btn-fav').forEach(btn => {
      const card = btn.closest('.card');
      const id = card ? (card.getAttribute('data-id') || '') : '';
      const icon = btn.querySelector('i');
      const fav = id && isFavorite(id);
      if (fav) {
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-danger', 'text-white');
        if (icon) icon.className = 'bi bi-heart-fill';
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('title', 'Remove from favorites');
      } else {
        btn.classList.remove('btn-danger', 'text-white');
        btn.classList.add('btn-outline-secondary');
        if (icon) icon.className = 'bi bi-heart';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('title', 'Add to favorites');
      }
    });
  }

  function clearFavorites() { localStorage.removeItem('ecom_favorites'); updateFavBadge(); refreshFavoriteButtonStates(); }

  function toggleFavorite(item) {
    const favs = getFavorites();
    const idx = favs.findIndex(f => f.id === item.id);
    const added = idx === -1;
    if (added) { favs.push(item); } else { favs.splice(idx, 1); }
    saveFavorites(favs);
    updateFavBadge();
    refreshFavoriteButtonStates();
    return added;
  }
  function isFavorite(id) { return getFavorites().some(f => f.id === id); }

  function updateCartBadge() {
    const badge = document.getElementById('badge-cart') || findBadgeForIcon('bi-cart3');
    const cart = getCart();
    const total = cart.reduce((s, c) => s + (c.qty || 0), 0);
    if (badge) badge.textContent = total;
  }
  function updateFavBadge() {
    const badge = document.getElementById('badge-fav') || findBadgeForIcon('bi-heart');
    const favs = getFavorites();
    if (badge) badge.textContent = favs.length;
  }

  function setupAddToCart() {
    const addButtons = document.querySelectorAll('.btn-add, [data-add-to-cart], .btn-view');
    if (!addButtons.length) return;

    addButtons.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const card = btn.closest('.card');
        const titleEl = card ? card.querySelector('.card-title, h5') : null;
        const title = titleEl ? titleEl.textContent.trim() : 'Item';

        // read product metadata from card data attributes
        const id = card ? (card.getAttribute('data-id') || title) : title;
        const price = card ? parseFloat(card.getAttribute('data-price') || '0') : 0;
        const img = card ? card.getAttribute('data-img') || '' : '';

        addToCartItem({ id, title, price, img, qty: 1 });

        showToast(`${title} added to cart`);
        btn.style.transform = 'translateY(-3px) scale(0.99)';
        setTimeout(() => (btn.style.transform = ''), 160);
      });

      btn.addEventListener('keyup', function (e) {
        if (e.key === 'Enter' || e.key === ' ') btn.click();
      });
    });
  }
  setupAddToCart();

  function setupFavoriteButtons() {
    const favButtons = document.querySelectorAll('.btn-fav');
    if (!favButtons.length) return;
    // ensure visual state matches storage
    refreshFavoriteButtonStates();
    favButtons.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const card = btn.closest('.card');
        const titleEl = card ? card.querySelector('.card-title, h5') : null;
        const title = titleEl ? titleEl.textContent.trim() : 'Item';
        const id = card ? (card.getAttribute('data-id') || title) : title;
        const price = card ? parseFloat(card.getAttribute('data-price') || '0') : 0;
        const img = card ? card.getAttribute('data-img') || '' : '';
        const added = toggleFavorite({ id, title, price, img });
        showToast(added ? `${title} added to favorites` : `${title} removed from favorites`);
      });
      btn.addEventListener('keyup', function (e) { if (e.key === 'Enter' || e.key === ' ') btn.click(); });
    });
  }
  setupFavoriteButtons();

  function renderCartPage() {
    const el = document.getElementById('cartContainer');
    if (!el) return;
    const cart = getCart();
    if (!cart.length) { el.innerHTML = '<p class="text-muted">Your cart is empty. Browse <a href="products.html">products</a> to add items.</p>'; return; }

    const rows = cart.map(item => `
      <div class="card mb-3">
        <div class="row g-0 align-items-center">
          <div class="col-auto p-3"><img src="${item.img || 'https://via.placeholder.com/80'}" width="84" height="84" alt="${item.title}" class="rounded" /></div>
          <div class="col">
            <div class="card-body py-2">
              <h6 class="card-title mb-1">${item.title}</h6>
              <div class="text-muted small">Price: $${(item.price || 0).toFixed(2)}</div>
            </div>
          </div>
          <div class="col-auto p-3">
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-outline-secondary btn-sm btn-decrease" data-id="${item.id}"><i class="bi bi-dash"></i></button>
              <input class="form-control form-control-sm text-center qty-input" data-id="${item.id}" style="width:56px;" value="${item.qty}" />
              <button class="btn btn-outline-secondary btn-sm btn-increase" data-id="${item.id}"><i class="bi bi-plus"></i></button>
            </div>
            <div class="mt-2 text-end"><button class="btn btn-link btn-sm text-danger btn-remove" data-id="${item.id}">Remove</button></div>
          </div>
        </div>
      </div>
    `).join('');

    const total = cart.reduce((s, c) => s + (c.qty || 0) * (c.price || 0), 0);
    el.innerHTML = `
      <div>${rows}</div>
      <div class="card p-3 mt-3">
        <div class="d-flex justify-content-between align-items-center">
          <div><strong>Total</strong></div>
          <div><strong>$${total.toFixed(2)}</strong></div>
        </div>
        <div class="mt-3 d-flex gap-2 justify-content-end">
          <button class="btn btn-outline-secondary" id="clearCartBtn">Clear cart</button>
          <button class="btn btn-primary" id="checkoutBtn">Proceed to checkout</button>
        </div>
      </div>
    `;

    // attach handlers
    el.querySelectorAll('.btn-remove').forEach(b => b.addEventListener('click', (e) => { removeFromCart(b.getAttribute('data-id')); renderCartPage(); }));
    el.querySelectorAll('.btn-decrease').forEach(b => b.addEventListener('click', (e) => { const id = b.getAttribute('data-id'); const input = el.querySelector(`.qty-input[data-id="${id}"]`); const val = Math.max(0, parseInt(input.value, 10) - 1); input.value = val; updateCartQty(id, val); renderCartPage(); }));
    el.querySelectorAll('.btn-increase').forEach(b => b.addEventListener('click', (e) => { const id = b.getAttribute('data-id'); const input = el.querySelector(`.qty-input[data-id="${id}"]`); const val = Math.max(0, parseInt(input.value, 10) + 1); input.value = val; updateCartQty(id, val); renderCartPage(); }));
    el.querySelectorAll('.qty-input').forEach(input => input.addEventListener('change', () => { const id = input.getAttribute('data-id'); const val = Math.max(0, parseInt(input.value, 10) || 0); updateCartQty(id, val); renderCartPage(); }));
    const clearBtn = document.getElementById('clearCartBtn'); if (clearBtn) { clearBtn.addEventListener('click', () => { if (confirm('Clear cart?')) { clearCart(); renderCartPage(); showToast('Cart cleared'); } }); }
    const checkoutBtn = document.getElementById('checkoutBtn'); if (checkoutBtn) { checkoutBtn.addEventListener('click', () => { showToast('Checkout not implemented in demo'); }); }
  }

  function renderFavoritesPage() {
    const el = document.getElementById('favoritesContainer');
    if (!el) return;
    const favs = getFavorites();
    if (!favs.length) { el.innerHTML = '<p class="text-muted">No favorites yet. Click the heart on a product to save it.</p>'; return; }
    const cards = favs.map(item => `
      <div class="card mb-3">
        <div class="row g-0 align-items-center">
          <div class="col-auto p-3"><img src="${item.img || 'https://via.placeholder.com/80'}" width="84" height="84" alt="${item.title}" class="rounded" /></div>
          <div class="col">
            <div class="card-body py-2">
              <h6 class="card-title mb-1">${item.title}</h6>
              <div class="text-muted small">$${(item.price || 0).toFixed(2)}</div>
            </div>
          </div>
          <div class="col-auto p-3">
            <div class="d-flex flex-column gap-2">
              <button class="btn btn-sm btn-outline-primary btn-add-from-fav" data-id="${item.id}">Add to cart</button>
              <button class="btn btn-sm btn-outline-danger btn-remove-fav" data-id="${item.id}">Remove</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    el.innerHTML = `<div class="mb-3 d-flex justify-content-between align-items-center"><h5 class="mb-0">Saved items</h5><button class="btn btn-sm btn-outline-danger" id="clearFavsBtn">Clear favorites</button></div>${cards}`;
    el.querySelectorAll('.btn-remove-fav').forEach(b => b.addEventListener('click', () => { toggleFavorite({ id: b.getAttribute('data-id') }); renderFavoritesPage(); showToast('Removed from favorites'); }));
    el.querySelectorAll('.btn-add-from-fav').forEach(b => b.addEventListener('click', () => { const id = b.getAttribute('data-id'); const favs = getFavorites(); const item = favs.find(f => f.id === id); if (item) { addToCartItem({ ...item, qty: 1 }); showToast('Added to cart'); renderFavoritesPage(); } }));
    const clearBtn = document.getElementById('clearFavsBtn'); if (clearBtn) { clearBtn.addEventListener('click', () => { if (confirm('Clear all favorites?')) { clearFavorites(); renderFavoritesPage(); showToast('Favorites cleared'); } }); }
  }

  // update badges on load
  document.addEventListener('DOMContentLoaded', function () {
    updateCartBadge();
    updateFavBadge();
    renderCartPage();
    renderFavoritesPage();
    refreshFavoriteButtonStates();
  });

  /* PASSWORD TOGGLE (for login / signup) */
  function setupPasswordToggles() {
    const toggles = document.querySelectorAll('.input-icon .bi');
    toggles.forEach((t) => {
      const input = t.parentElement && t.parentElement.querySelector('input[type="password"]');
      if (!input) return;
      t.tabIndex = 0;
      t.setAttribute('role', 'button');
      t.setAttribute('aria-pressed', 'false');
      t.setAttribute('title', 'Show password');
      t.addEventListener('click', function () {
        if (input.type === 'password') { input.type = 'text'; t.classList.remove('bi-eye'); t.classList.add('bi-eye-slash'); t.setAttribute('aria-pressed', 'true'); t.setAttribute('title', 'Hide password'); }
        else { input.type = 'password'; t.classList.remove('bi-eye-slash'); t.classList.add('bi-eye'); t.setAttribute('aria-pressed', 'false'); t.setAttribute('title', 'Show password'); }
      });
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); } });
    });
  }

  /* FORM VALIDATION */
  function setupFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach((form) => {
      form.addEventListener('submit', function (e) {
        let valid = true;
        const inputs = form.querySelectorAll('[required]');
        inputs.forEach((inp) => {
          if (!inp.value.trim()) {
            valid = false;
            inp.classList.add('is-invalid');
            let msg = inp.nextElementSibling;
            if (!msg || !msg.classList.contains('invalid-feedback')) {
              msg = document.createElement('div');
              msg.className = 'invalid-feedback';
              msg.textContent = 'This field is required.';
              inp.insertAdjacentElement('afterend', msg);
            }
          } else {
            inp.classList.remove('is-invalid');
            const next = inp.nextElementSibling;
            if (next && next.classList.contains('invalid-feedback')) next.remove();
          }
        });
        if (!valid) e.preventDefault();
      });
    });
  }
  setupFormValidation();

  /* ===== REAL-TIME VALIDATION & UI HELPERS ===== */
  const USE_MOCK_API = true; // toggle to simulate network calls
  const API_DELAY = 420;

  async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  const mockApi = {
    async register({ name, email, password }) {
      await sleep(API_DELAY);
      const users = getUsers();
      const emailLower = (email || '').toLowerCase();
      if (users.some(u => u.email === emailLower)) throw new Error('exists');
      const passwordHash = await hashPassword(password);
      const user = { id: Date.now(), name: (name || '').trim(), email: emailLower, passwordHash, created: new Date().toISOString() };
      users.push(user);
      saveUsers(users);
      return { ok: true, user: { id: user.id, name: user.name, email: user.email } };
    },
    async login({ email, password }) {
      await sleep(API_DELAY);
      const users = getUsers();
      const emailLower = (email || '').toLowerCase();
      const user = users.find(u => u.email === emailLower);
      if (!user) throw new Error('no-account');
      const hash = await hashPassword(password);
      if (hash !== user.passwordHash) throw new Error('bad-password');
      return { ok: true, user: { id: user.id, name: user.name, email: user.email } };
    },
    async listUsers() { await sleep(120); return getUsers(); }
  };

  function setInputValidState(input, valid, msg) {
    if (valid) {
      input.classList.remove('is-invalid');
      const next = input.nextElementSibling;
      if (next && next.classList.contains('invalid-feedback')) next.remove();
    } else {
      input.classList.add('is-invalid');
      let next = input.nextElementSibling;
      if (!next || !next.classList.contains('invalid-feedback')) {
        next = document.createElement('div');
        next.className = 'invalid-feedback';
        input.insertAdjacentElement('afterend', next);
      }
      next.textContent = msg || 'This field is required.';
    }
  }

  function passwordStrength(password) {
    let score = 0;
    if (!password) return { score, label: 'Too short' };
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    const labels = ['Very weak', 'Weak', 'Okay', 'Good', 'Strong'];
    return { score, label: labels[Math.min(score, labels.length - 1)] };
  }

  function attachRealtimeValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach((form) => {
      form.querySelectorAll('input[required], textarea[required]').forEach((input) => {
        input.addEventListener('input', function (e) {
          const value = input.value.trim();
          if (!value) { setInputValidState(input, false, 'This field is required.'); return; }
          // email specific
          if (input.type === 'email') {
            const ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
            setInputValidState(input, ok, ok ? '' : 'Enter a valid email address');
            return;
          }
          // password strength
          if (input.type === 'password' && input.id.toLowerCase().includes('pass')) {
            const meterId = input.id + '-strength';
            let meter = document.getElementById(meterId);
            if (!meter) {
              meter = document.createElement('div'); meter.id = meterId; meter.className = 'pw-strength mt-2'; input.insertAdjacentElement('afterend', meter);
            }
            const res = passwordStrength(value);
            meter.innerHTML = `<div class="pw-bar" data-score="${res.score}"></div><small class="text-muted">${res.label}</small>`;
            setInputValidState(input, value.length >= 6, value.length >= 6 ? '' : 'Password too short (min 6 chars)');
            return;
          }
          // default: valid
          setInputValidState(input, true, '');
        });
      });
    });
  }

  function showModal({ title = '', html = '', size = 'md', onClose } = {}) {
    // Use Bootstrap modal if available
    try {
      if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        const modalId = 'modal-' + Math.random().toString(36).slice(2, 9);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
          <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-${size}">
              <div class="modal-content">
                <div class="modal-header"><h5 class="modal-title">${title}</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
                <div class="modal-body">${html}</div>
              </div>
            </div>
          </div>`;
        document.body.appendChild(wrapper);
        const el = wrapper.querySelector('.modal');
        const m = new bootstrap.Modal(el);
        el.addEventListener('hidden.bs.modal', () => { wrapper.remove(); if (typeof onClose === 'function') onClose(); });
        m.show();
        return m;
      }
    } catch (err) { console.debug('Bootstrap modal failed - fallback', err); }
    // fallback simple modal
    const overlay = document.createElement('div'); overlay.className = 'simple-modal'; overlay.innerHTML = `<div class="simple-modal-inner"><h4>${title}</h4><div>${html}</div><button class="btn btn-primary simple-modal-close">Close</button></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.simple-modal-close').addEventListener('click', () => { overlay.remove(); if (typeof onClose === 'function') onClose(); });
    return { close: () => overlay.remove() };
  }

  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach((root) => {
      const tabs = root.querySelectorAll('[data-tab]');
      tabs.forEach((t) => t.addEventListener('click', (e) => {
        e.preventDefault();
        const key = t.getAttribute('data-tab');
        root.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        root.querySelectorAll('[data-panel]').forEach(p => p.style.display = p.getAttribute('data-panel') === key ? '' : 'none');
      }));
    });
  }

  function initAccordion() {
    document.querySelectorAll('[data-accordion]').forEach((acc) => {
      acc.querySelectorAll('[data-acc-toggle]').forEach((btn) => {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          const target = document.getElementById(btn.getAttribute('data-acc-toggle'));
          if (!target) return;
          const open = target.style.display !== 'none' && target.style.display !== '';
          target.style.display = open ? 'none' : '';
          btn.classList.toggle('open', !open);
        });
      });
    });
  }

  // Initialize realtime validation and UI helpers
  attachRealtimeValidation();
  initTabs();
  initAccordion();


  /* ===== AUTH: Signup / Login / Logout (client-side demo) ===== */
  async function hashPassword(password) {
    if (!password) return '';
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getUsers() { return JSON.parse(localStorage.getItem('ecom_users') || '[]'); }
  function saveUsers(users) { localStorage.setItem('ecom_users', JSON.stringify(users)); }
  function getCurrentUser() { return JSON.parse(localStorage.getItem('ecom_currentUser') || 'null'); }
  function setCurrentUser(user) { if (!user) return; localStorage.setItem('ecom_currentUser', JSON.stringify(user)); console.debug('setCurrentUser', user); updateAuthUI(); }
  function logoutUser() { console.debug('logoutUser'); localStorage.removeItem('ecom_currentUser'); updateAuthUI(); showToast('Signed out'); }

  async function createUser({ name, email, password }) {
    try {
      if (USE_MOCK_API) {
        const res = await mockApi.register({ name, email, password });
        setCurrentUser(res.user);
        return { ok: true, user: res.user };
      }
      // fallback direct localStorage
      const users = getUsers();
      const emailLower = (email || '').toLowerCase();
      if (users.some(u => u.email === emailLower)) { showToast('Email already registered'); return { ok: false, error: 'exists' }; }
      const passHash = await hashPassword(password);
      const user = { id: Date.now(), name: (name || '').trim(), email: emailLower, passwordHash: passHash, created: new Date().toISOString() };
      users.push(user);
      saveUsers(users);
      setCurrentUser({ id: user.id, name: user.name, email: user.email });
      return { ok: true, user };
    } catch (err) {
      if (err && err.message === 'exists') { showToast('Email already registered'); return { ok: false, error: 'exists' }; }
      console.error('createUser error', err);
      showToast('Signup failed');
      return { ok: false, error: 'unknown' };
    }
  }

  async function attemptLogin(email, password) {
    try {
      if (USE_MOCK_API) {
        const res = await mockApi.login({ email, password });
        setCurrentUser(res.user);
        return true;
      }
      const users = getUsers();
      const emailLower = (email || '').toLowerCase();
      const user = users.find(u => u.email === emailLower);
      if (!user) { showToast('No account with that email'); return false; }
      const hash = await hashPassword(password);
      if (hash !== user.passwordHash) { showToast('Incorrect password'); return false; }
      setCurrentUser({ id: user.id, name: user.name, email: user.email });
      return true;
    } catch (err) {
      if (err && err.message === 'no-account') { showToast('No account with that email'); return false; }
      if (err && err.message === 'bad-password') { showToast('Incorrect password'); return false; }
      console.error('login error', err);
      showToast('Login failed');
      return false;
    }
  }

  function updateAuthUI() {
    const user = getCurrentUser();
    const link = document.getElementById('navUserLink');
    const menu = document.getElementById('navUserMenu');
    if (!link || !menu) return;

    if (user) {
      // show avatar + name + logout
      link.href = '#';
      link.setAttribute('data-bs-toggle', 'dropdown');
      link.innerHTML = `<span class="nav-user-avatar">${(user.name || user.email || 'U').trim().charAt(0).toUpperCase()}</span>`;
      menu.innerHTML = `
        <li><h6 class="dropdown-header">Hello, ${user.name || user.email}</h6></li>
        <li><a class="dropdown-item" href="#" id="navProfile">Profile</a></li>
        <li><a class="dropdown-item" href="#" id="navLogout">Sign out</a></li>
      `;
      // attach logout handler
      const logoutBtn = document.getElementById('navLogout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logoutUser(); });
      }
      const profileBtn = document.getElementById('navProfile');
      if (profileBtn) { profileBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'profile.html'; }); }
    } else {
      // not signed in: show default icon and sign in/up links
      link.href = 'login.html';
      link.setAttribute('data-bs-toggle', 'dropdown');
      link.innerHTML = `<i class="bi bi-person-circle fs-5 nav-user-icon" aria-hidden="true"></i>`;
      menu.innerHTML = `
        <li><a class="dropdown-item" href="login.html">Sign in</a></li>
        <li><a class="dropdown-item" href="signup.html">Sign up</a></li>
      `;
    }
  }

  // Handle signup / login form submissions using progressive enhancement
  
  document.addEventListener('submit', async function (e) {
    const form = e.target;
    if (form.id === 'signupForm') {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const name = (document.getElementById('signupName') || {}).value || '';
      const email = (document.getElementById('signupEmail') || {}).value || '';
      const password = (document.getElementById('signupPassword') || {}).value || '';
      const confirm = (document.getElementById('signupConfirm') || {}).value || '';
      if (!name || !email || !password) { showToast('Please complete all fields'); return; }
      if (password !== confirm) { showToast("Passwords don't match"); return; }
      if (btn) { btn.disabled = true; const original = btn.textContent; btn.textContent = 'Creating...'; }
      const res = await createUser({ name, email, password });
      if (btn) { btn.disabled = false; btn.textContent = 'Create account'; }
      if (res.ok) { setTimeout(() => { window.location.href = 'index.html'; }, 700); }
    }

    if (form.id === 'loginForm') {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const email = (document.getElementById('email') || {}).value || '';
      const password = (document.getElementById('password') || {}).value || '';
      if (!email || !password) { showToast('Please enter email and password'); return; }
      if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
      const ok = await attemptLogin(email, password);
      if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
      if (ok) { setTimeout(() => { window.location.href = 'index.html'; }, 600); }
    }
  });

  // Initialize auth UI on load and other auth helpers
  document.addEventListener('DOMContentLoaded', function () {
    updateAuthUI();
    setupPasswordToggles();
    // Focus first field on auth pages
    const email = document.getElementById('email');
    const signupName = document.getElementById('signupName');
    if (email) email.focus();
    else if (signupName) signupName.focus();
  });

})();
