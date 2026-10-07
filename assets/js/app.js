/* ==========================================================================
   NovaCart — storefront application logic
   --------------------------------------------------------------------------
   Sections
   01. Helpers
   02. State & persistence
   03. Catalogue rendering (filters, search, sort)
   04. Wishlist
   05. Cart & totals
   06. Drawer, modals & focus management
   07. Quick view
   08. Checkout flow
   09. Toasts
   10. Theme
   11. Boot
   ========================================================================== */
(function () {
  'use strict';

  /* 01. Helpers ----------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const money = (n) =>
    new Intl.NumberFormat(STORE_CONFIG.currency === 'USD' ? 'en-US' : 'en-US', {
      style: 'currency',
      currency: STORE_CONFIG.currency
    }).format(n);

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const starsMarkup = (rating) => {
    let out = '';
    for (let i = 1; i <= 5; i += 1) {
      const fill = rating >= i ? 'currentColor' : 'none';
      out +=
        '<svg viewBox="0 0 24 24" fill="' + fill + '" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
        '<path d="m12 3.6 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.8l5.9-.9z" /></svg>';
    }
    return out;
  };

  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        /* storage full or blocked — the store still works for this session */
      }
    }
  };

  const ICONS = {
    success:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.4 2.4 2.4 4.6-5"/></svg>',
    info:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.6"/></svg>',
    warn:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 4.5 3 19.5h18z"/><path d="M12 10v4M12 17v.5"/></svg>'
  };

  /* 02. State & persistence ------------------------------------------------ */
  const KEYS = {
    cart: 'novacart.cart.v1',
    wishlist: 'novacart.wishlist.v1',
    coupon: 'novacart.coupon.v1',
    theme: 'novacart.theme.v1'
  };

  const state = {
    cart: storage.get(KEYS.cart, []), // [{ id, qty }]
    wishlist: storage.get(KEYS.wishlist, []),
    coupon: storage.get(KEYS.coupon, null),
    filters: { query: '', category: 'All', maxPrice: Infinity, sort: 'featured', wishlistOnly: false }
  };

  const persist = () => {
    storage.set(KEYS.cart, state.cart);
    storage.set(KEYS.wishlist, state.wishlist);
    storage.set(KEYS.coupon, state.coupon);
  };

  /* 03. Catalogue rendering ------------------------------------------------ */
  const grid = $('#productGrid');
  const chipsWrap = $('#categoryChips');
  const resultCount = $('#resultCount');
  const searchInput = $('#searchInput');
  const sortSelect = $('#sortSelect');
  const priceRange = $('#priceRange');
  const priceOutput = $('#priceOutput');

  const CATEGORIES = ['All', ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];

  /* Built once, then only re-synced — rebuilding would drop keyboard focus. */
  function renderChips() {
    chipsWrap.innerHTML =
      CATEGORIES.map(
        (cat) =>
          '<button class="chip" type="button" data-category="' + escapeHtml(cat) + '">' +
          escapeHtml(cat) +
          '</button>'
      ).join('') +
      '<button class="chip" type="button" data-wishlist-chip></button>';
    syncChipState();
  }

  function syncChipState() {
    const wishCount = state.wishlist.length;
    $$('[data-category]', chipsWrap).forEach((chip) => {
      const active = state.filters.category === chip.dataset.category && !state.filters.wishlistOnly;
      chip.setAttribute('aria-pressed', String(active));
    });
    const wishChip = $('[data-wishlist-chip]', chipsWrap);
    if (wishChip) {
      wishChip.setAttribute('aria-pressed', String(state.filters.wishlistOnly));
      wishChip.textContent = '\u2665 Wishlist' + (wishCount ? ' (' + wishCount + ')' : '');
    }
  }

  function visibleProducts() {
    const { query, category, maxPrice, sort, wishlistOnly } = state.filters;
    const q = query.trim().toLowerCase();

    let list = PRODUCTS.filter((p) => {
      if (wishlistOnly && !state.wishlist.includes(p.id)) return false;
      if (category !== 'All' && p.category !== category) return false;
      if (p.price > maxPrice) return false;
      if (!q) return true;
      return (p.name + ' ' + p.category + ' ' + p.blurb).toLowerCase().includes(q);
    });

    const sorters = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      name: (a, b) => a.name.localeCompare(b.name),
      featured: (a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0) || b.rating - a.rating
    };
    return list.sort(sorters[sort] || sorters.featured);
  }

  function cardMarkup(p) {
    const onSale = p.oldPrice && p.oldPrice > p.price;
    const saving = onSale ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const wished = state.wishlist.includes(p.id);
    const stockClass = p.stock === 0 ? 'out' : p.stock < 12 ? 'low' : '';
    const stockText = p.stock === 0 ? 'Out of stock' : p.stock < 12 ? 'Only ' + p.stock + ' left' : 'In stock';

    return (
      '<article class="card" data-id="' + p.id + '">' +
        '<div class="card-media">' +
          '<img src="' + p.image + '" alt="' + escapeHtml(p.name) + '" loading="lazy" width="600" height="600" />' +
          '<div class="card-flags">' +
            (onSale ? '<span class="flag flag-sale">-' + saving + '%</span>' : '') +
            (p.badge === 'new' ? '<span class="flag flag-new">New</span>' : '') +
          '</div>' +
          '<button class="wish-btn" type="button" data-wish="' + p.id + '" aria-pressed="' + wished + '" ' +
            'aria-label="' + (wished ? 'Remove from' : 'Add to') + ' wishlist">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.7-7.5-9.8A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 3.1c0 5.1-7.5 9.8-7.5 9.8Z"/></svg>' +
          '</button>' +
          '<button class="quick-btn" type="button" data-quick="' + p.id + '">Quick view</button>' +
        '</div>' +
        '<div class="card-body">' +
          '<span class="card-cat">' + escapeHtml(p.category) + '</span>' +
          '<h3 class="card-title">' + escapeHtml(p.name) + '</h3>' +
          '<p class="card-desc">' + escapeHtml(p.blurb) + '</p>' +
          '<div class="rating"><span class="stars">' + starsMarkup(p.rating) + '</span>' +
            '<span>' + p.rating.toFixed(1) + ' (' + p.reviews + ')</span></div>' +
          '<div class="price-row">' +
            '<span class="price">' + money(p.price) +
              (onSale ? '<span class="price-old">' + money(p.oldPrice) + '</span>' : '') +
            '</span>' +
            '<span class="stock ' + stockClass + '">' + stockText + '</span>' +
          '</div>' +
          '<button class="btn btn-primary add-btn" type="button" data-add="' + p.id + '"' +
            (p.stock === 0 ? ' disabled' : '') + '>' +
            (p.stock === 0 ? 'Out of stock' : 'Add to cart') +
          '</button>' +
        '</div>' +
      '</article>'
    );
  }

  function renderGrid() {
    const list = visibleProducts();

    grid.innerHTML = list.length
      ? list.map(cardMarkup).join('')
      : '<div class="empty-state"><strong>No products match those filters</strong>' +
        'Try a different keyword, raise the price limit, or reset the filters.</div>';

    const noun = list.length === 1 ? 'product' : 'products';
    resultCount.innerHTML =
      'Showing <strong>' + list.length + '</strong> ' + noun +
      (state.filters.category !== 'All' ? ' in <strong>' + escapeHtml(state.filters.category) + '</strong>' : '') +
      (state.filters.wishlistOnly ? ' from your <strong>wishlist</strong>' : '');

    revealCards();
  }

  function revealCards() {
    const cards = $$('.card', grid);
    if (!('IntersectionObserver' in window)) {
      cards.forEach((c) => c.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.animationDelay = Math.min(entry.target.dataset.i || 0, 6) * 45 + 'ms';
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -40px 0px' }
    );
    cards.forEach((c, i) => {
      c.dataset.i = i % 8;
      io.observe(c);
    });
  }

  function applyFilter(patch) {
    Object.assign(state.filters, patch);
    syncChipState();
    renderGrid();
  }

  /* 04. Wishlist ----------------------------------------------------------- */
  function toggleWish(id) {
    const i = state.wishlist.indexOf(id);
    if (i === -1) {
      state.wishlist.push(id);
      toast(byId(id).name + ' saved to your wishlist', 'info');
    } else {
      state.wishlist.splice(i, 1);
      toast(byId(id).name + ' removed from your wishlist', 'info');
    }
    persist();
    syncWishUI();
  }

  function syncWishUI() {
    const badge = $('#wishBadge');
    const count = state.wishlist.length;
    badge.textContent = count;
    badge.classList.toggle('is-visible', count > 0);

    $$('[data-wish]').forEach((btn) => {
      const on = state.wishlist.includes(btn.dataset.wish);
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', (on ? 'Remove from' : 'Add to') + ' wishlist');
    });

    syncChipState();
  }

  /* 05. Cart & totals ------------------------------------------------------ */
  const cartItemsEl = $('#cartItems');
  const cartBadge = $('#cartBadge');

  function cartLines() {
    return state.cart
      .map((line) => ({ ...line, product: byId(line.id) }))
      .filter((line) => line.product);
  }

  function totals() {
    const lines = cartLines();
    const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
    const count = lines.reduce((sum, l) => sum + l.qty, 0);

    let discount = 0;
    let shipping =
      subtotal === 0 || subtotal >= STORE_CONFIG.freeShippingThreshold ? 0 : STORE_CONFIG.shippingFlat;

    if (state.coupon) {
      const c = COUPONS[state.coupon];
      if (c && c.type === 'percent') discount = (subtotal * c.value) / 100;
      if (c && c.type === 'shipping' && subtotal > 0) shipping = 0;
    }

    const taxable = Math.max(subtotal - discount, 0);
    const tax = taxable * STORE_CONFIG.taxRate;
    return { lines, subtotal, discount, shipping, tax, count, total: taxable + shipping + tax };
  }

  function addToCart(id, qty = 1) {
    const product = byId(id);
    if (!product) return;
    if (product.stock === 0) {
      toast(product.name + ' is out of stock', 'warn');
      return;
    }
    const line = state.cart.find((l) => l.id === id);
    const nextQty = (line ? line.qty : 0) + qty;
    const capped = Math.min(nextQty, product.stock);

    if (line) line.qty = capped;
    else state.cart.push({ id, qty: capped });

    if (capped < nextQty) toast('Only ' + product.stock + ' units available', 'warn');

    persist();
    renderCart({ bump: true, open: true });
    toast(product.name + ' added to cart', 'success');
  }

  function setQty(id, qty) {
    const line = state.cart.find((l) => l.id === id);
    if (!line) return;
    const product = byId(id);
    if (qty <= 0) return removeFromCart(id);
    line.qty = clamp(qty, 1, product.stock);
    persist();
    renderCart();
  }

  function removeFromCart(id) {
    const product = byId(id);
    state.cart = state.cart.filter((l) => l.id !== id);
    persist();
    renderCart();
    if (product) toast(product.name + ' removed from cart', 'warn');
  }

  function renderCart(opts = {}) {
    const t = totals();

    cartItemsEl.innerHTML = t.lines.length
      ? t.lines
          .map(
            (l) =>
              '<div class="cart-item" data-id="' + l.id + '">' +
                '<img src="' + l.product.image + '" alt="' + escapeHtml(l.product.name) + '" loading="lazy" />' +
                '<div>' +
                  '<h3>' + escapeHtml(l.product.name) + '</h3>' +
                  '<div class="unit">' + money(l.product.price) + ' each</div>' +
                  '<div class="qty">' +
                    '<button type="button" data-dec="' + l.id + '" aria-label="Decrease quantity of ' + escapeHtml(l.product.name) + '">−</button>' +
                    '<span>' + l.qty + '</span>' +
                    '<button type="button" data-inc="' + l.id + '" aria-label="Increase quantity of ' + escapeHtml(l.product.name) + '">+</button>' +
                  '</div>' +
                '</div>' +
                '<div style="text-align:right">' +
                  '<div class="line-total">' + money(l.product.price * l.qty) + '</div>' +
                  '<button class="remove-btn" type="button" data-remove="' + l.id + '" aria-label="Remove ' + escapeHtml(l.product.name) + '">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
                    '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>' +
                  '</button>' +
                '</div>' +
              '</div>'
          )
          .join('')
      : '<div class="cart-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
        '<path d="M4 5h2.2l2 12h10.2l1.6-8.4H7"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/></svg>' +
        '<p>Your cart is empty.</p>' +
        '<button class="btn btn-ghost" type="button" id="emptyShopBtn">Start shopping</button>' +
        '</div>';

    $('#cartSubtotal').textContent = money(t.subtotal);
    $('#cartShipping').textContent = t.subtotal === 0 ? '—' : t.shipping === 0 ? 'Free' : money(t.shipping);
    $('#cartTotal').textContent = money(t.total);
    $('#cartItemCount').textContent = t.count ? '(' + t.count + ' item' + (t.count > 1 ? 's' : '') + ')' : '';

    const discountRow = $('#discountRow');
    discountRow.hidden = t.discount <= 0;
    if (t.discount > 0) {
      $('#discountLabel').textContent = 'Discount (' + (COUPONS[state.coupon]?.label || '') + ')';
      $('#cartDiscount').textContent = '−' + money(t.discount);
    }

    // Free-shipping progress hint
    const remaining = STORE_CONFIG.freeShippingThreshold - t.subtotal;
    const hint = $('#freeShipHint');
    if (t.subtotal === 0) hint.textContent = 'Spend ' + money(STORE_CONFIG.freeShippingThreshold) + ' to unlock free shipping.';
    else if (remaining > 0) hint.innerHTML = 'Add <strong>' + money(remaining) + '</strong> more to unlock free shipping.';
    else hint.innerHTML = '\uD83C\uDF89 You have unlocked <strong>free shipping</strong>.';

    $('#checkoutBtn').disabled = t.lines.length === 0;

    // Badge
    cartBadge.textContent = t.count;
    cartBadge.classList.toggle('is-visible', t.count > 0);
    if (opts.bump) {
      cartBadge.classList.remove('is-bump');
      void cartBadge.offsetWidth;
      cartBadge.classList.add('is-bump');
    }

    syncWishUI();
    if (opts.open) openDrawer();
  }

  /* 06. Drawer, modals & focus management ---------------------------------- */
  const drawer = $('#cartDrawer');
  const overlay = $('#overlay');
  let lastFocused = null;

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function openDrawer() {
    lastFocused = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    $('#cartBtn').setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    const first = $(FOCUSABLE, drawer);
    if (first) first.focus({ preventScroll: true });
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-open');
    setTimeout(() => {
      if (!$$('.modal.is-open').length) overlay.hidden = true;
    }, 300);
    $('#cartBtn').setAttribute('aria-expanded', 'false');
    if (!$$('.modal.is-open').length) document.body.classList.remove('no-scroll');
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus({ preventScroll: true });
  }

  function openModal(el) {
    // Only one modal at a time, so Escape always closes what the user sees.
    $$('.modal.is-open').forEach((other) => {
      if (other !== el) closeModal(other);
    });
    lastFocused = document.activeElement;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-open'));
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    document.body.classList.add('no-scroll');
    const first = $(FOCUSABLE, el);
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
  }

  function closeModal(el) {
    el.classList.remove('is-open');
    setTimeout(() => {
      el.hidden = true;
      if (!$$('.modal.is-open').length && !drawer.classList.contains('is-open')) {
        overlay.classList.remove('is-open');
        overlay.hidden = true;
        document.body.classList.remove('no-scroll');
      }
    }, 280);
    if (!drawer.classList.contains('is-open') && !$$('.modal.is-open').length) {
      document.body.classList.remove('no-scroll');
    }
  }

  function closeTopLayer() {
    if ($$('.modal.is-open').length) {
      closeModal($$('.modal.is-open').pop());
      return true;
    }
    if (drawer.classList.contains('is-open')) {
      closeDrawer();
      return true;
    }
    return false;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && closeTopLayer()) e.preventDefault();
    if (e.key !== 'Tab') return;
    const layer = $$('.modal.is-open').pop() || (drawer.classList.contains('is-open') ? drawer : null);
    if (!layer) return;
    const items = $$(FOCUSABLE, layer).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  overlay.addEventListener('click', () => {
    if ($$('.modal.is-open').length) closeModal($$('.modal.is-open').pop());
    else closeDrawer();
  });

  /* 07. Quick view --------------------------------------------------------- */
  const quickView = $('#quickView');
  let quickViewId = null;

  function showQuickView(id) {
    const p = byId(id);
    if (!p) return;
    quickViewId = id;
    const onSale = p.oldPrice && p.oldPrice > p.price;

    $('#qvImage').src = p.image;
    $('#qvImage').alt = p.name;
    $('#qvCategory').textContent = p.category;
    $('#qvName').textContent = p.name;
    $('#qvRating').textContent = p.rating.toFixed(1) + ' · ' + p.reviews + ' reviews';
    $('#qvStars').innerHTML = starsMarkup(p.rating);
    $('#qvPrice').innerHTML =
      money(p.price) + (onSale ? '<span class="price-old">' + money(p.oldPrice) + '</span>' : '');
    $('#qvDesc').textContent = p.blurb_long;
    $('#qvSpecs').innerHTML = p.specs.map((s) => '<li>' + escapeHtml(s) + '</li>').join('');

    const stock = $('#qvStock');
    stock.className = 'stock ' + (p.stock === 0 ? 'out' : p.stock < 12 ? 'low' : '');
    stock.textContent = p.stock === 0 ? 'Out of stock' : p.stock < 12 ? 'Only ' + p.stock + ' left in stock' : 'In stock · ships within 48 hours';

    const addBtn = $('#qvAdd');
    addBtn.disabled = p.stock === 0;
    addBtn.textContent = p.stock === 0 ? 'Out of stock' : 'Add to cart';

    const wished = state.wishlist.includes(id);
    const wishBtn = $('#qvWish');
    wishBtn.textContent = wished ? 'Saved to wishlist ✓' : 'Save for later';

    openModal(quickView);
  }

  /* 08. Checkout flow ------------------------------------------------------ */
  const checkoutModal = $('#checkoutModal');
  const successModal = $('#successModal');

  function renderOrderSummary() {
    const t = totals();
    const rows = t.lines
      .map(
        (l) =>
          '<li><span>' + escapeHtml(l.product.name) + ' × ' + l.qty + '</span><span>' +
          money(l.product.price * l.qty) + '</span></li>'
      )
      .join('');
    $('#orderSummary').innerHTML =
      '<ul>' + rows + '</ul>' +
      '<li class="summary-row"><span>Subtotal</span><span>' + money(t.subtotal) + '</span></li>' +
      (t.discount > 0
        ? '<li class="summary-row discount"><span>Discount</span><span>−' + money(t.discount) + '</span></li>'
        : '') +
      '<li class="summary-row"><span>Shipping</span><span>' + (t.shipping === 0 ? 'Free' : money(t.shipping)) + '</span></li>' +
      '<li class="summary-row"><span>Estimated tax</span><span>' + money(t.tax) + '</span></li>' +
      '<li class="summary-row total"><span>Total</span><span>' + money(t.total) + '</span></li>';
  }

  function openCheckout() {
    const t = totals();
    if (!t.lines.length) {
      toast('Your cart is empty', 'warn');
      return;
    }
    closeDrawer();
    renderOrderSummary();
    setTimeout(() => openModal(checkoutModal), 260);
  }

  function validateCheckout() {
    const form = $('#checkoutForm');
    const checks = [
      ['#fullName', (v) => v.trim().length >= 2, 'Please enter your full name'],
      ['#email', (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()), 'Please enter a valid email address'],
      ['#address', (v) => v.trim().length >= 5, 'Please enter your street address'],
      ['#city', (v) => v.trim().length >= 2, 'Please enter your city'],
      ['#postcode', (v) => v.trim().length >= 3, 'Please enter your postcode']
    ];

    let firstBad = null;
    checks.forEach(([sel, test, message]) => {
      const field = $(sel);
      const ok = test(field.value);
      field.setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstBad) firstBad = { field, message };
    });

    if (firstBad) {
      toast(firstBad.message, 'warn');
      firstBad.field.focus();
      return false;
    }
    // Card is optional in this demo, but if filled it must look plausible.
    const card = $('#card');
    const digits = card.value.replace(/\D/g, '');
    if (card.value.trim() && digits.length < 12) {
      card.setAttribute('aria-invalid', 'true');
      toast('Card number looks too short (demo only)', 'warn');
      card.focus();
      return false;
    }
    card.setAttribute('aria-invalid', 'false');
    form.dataset.valid = 'true';
    return true;
  }

  function placeOrder(e) {
    e.preventDefault();
    if (!validateCheckout()) return;

    const t = totals();
    const orderId = 'NC-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' +
      Math.floor(Math.random() * 900 + 100);
    const email = $('#email').value.trim();
    const eta = new Date(Date.now() + 3 * 864e5).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    closeModal(checkoutModal);

    setTimeout(() => {
      $('#orderId').textContent = 'Order ' + orderId;
      $('#successDetail').innerHTML =
        '<strong>' + t.count + ' item' + (t.count > 1 ? 's' : '') + '</strong> · ' + money(t.total) +
        '<br />Confirmation sent to ' + escapeHtml(email) +
        '<br />Estimated delivery ' + eta;

      state.cart = [];
      state.coupon = null;
      $('#couponInput').value = '';
      $('#couponNote').textContent = '';
      $('#couponNote').className = 'coupon-note';
      persist();
      renderCart();
      $('#checkoutForm').reset();

      openModal(successModal);
      toast('Order placed successfully', 'success');
    }, 280);
  }

  /* 09. Toasts ------------------------------------------------------------- */
  const toastStack = $('#toastStack');

  function toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = (ICONS[type] || ICONS.info) + '<span>' + escapeHtml(message) + '</span>';
    toastStack.appendChild(el);

    const remove = () => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 300);
    };
    const timer = setTimeout(remove, 3000);
    el.addEventListener('click', () => {
      clearTimeout(timer);
      remove();
    });
  }

  /* 10. Theme -------------------------------------------------------------- */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    storage.set(KEYS.theme, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0d111c' : '#5b7cfa');
  }

  function initTheme() {
    const saved = storage.get(KEYS.theme, null);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved || (prefersDark ? 'dark' : 'light'));
  }

  /* 11. Boot --------------------------------------------------------------- */
  function bindEvents() {
    // Catalogue: delegated card actions
    grid.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      const quick = e.target.closest('[data-quick]');
      const wish = e.target.closest('[data-wish]');
      if (add) addToCart(add.dataset.add);
      else if (quick) showQuickView(quick.dataset.quick);
      else if (wish) toggleWish(wish.dataset.wish);
    });

    // Filters
    searchInput.addEventListener('input', () => applyFilter({ query: searchInput.value }));
    sortSelect.addEventListener('change', () => applyFilter({ sort: sortSelect.value }));

    chipsWrap.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      if (chip.hasAttribute('data-wishlist-chip')) {
        applyFilter({ wishlistOnly: !state.filters.wishlistOnly });
      } else {
        applyFilter({ category: chip.dataset.category, wishlistOnly: false });
      }
    });

    const maxPrice = Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)) / 10) * 10;
    priceRange.max = maxPrice;
    priceRange.value = maxPrice;
    priceRange.addEventListener('input', () => {
      const v = Number(priceRange.value);
      priceOutput.textContent = v >= maxPrice ? 'Any' : 'Up to ' + money(v);
      applyFilter({ maxPrice: v >= maxPrice ? Infinity : v });
    });

    $('#resetFilters').addEventListener('click', () => {
      searchInput.value = '';
      sortSelect.value = 'featured';
      priceRange.value = priceRange.max;
      priceOutput.textContent = 'Any';
      applyFilter({ query: '', category: 'All', maxPrice: Infinity, sort: 'featured', wishlistOnly: false });
      toast('Filters reset', 'info');
    });

    // Category jump links (nav + footer)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-jump-category]');
      if (!link) return;
      const cat = link.dataset.jumpCategory;
      if (CATEGORIES.includes(cat)) {
        searchInput.value = '';
        applyFilter({ category: cat, query: '', wishlistOnly: false });
      }
    });

    // Hero deal button — filters down to the biggest saving
    $('#heroDealBtn').addEventListener('click', () => {
      const deal = PRODUCTS.filter((p) => p.oldPrice).sort(
        (a, b) => 1 - a.price / a.oldPrice - (1 - b.price / b.oldPrice)
      )[0];
      $('#catalogue').scrollIntoView({ behavior: 'smooth' });
      if (deal) {
        searchInput.value = deal.name;
        applyFilter({ query: deal.name, category: 'All', wishlistOnly: false });
        toast("Today's best deal: " + deal.name, 'success');
      }
    });

    // Cart drawer
    $('#cartBtn').addEventListener('click', () =>
      drawer.classList.contains('is-open') ? closeDrawer() : openDrawer()
    );
    $('#cartClose').addEventListener('click', closeDrawer);
    $('#clearCart').addEventListener('click', () => {
      if (!state.cart.length) return toast('Your cart is already empty', 'info');
      state.cart = [];
      persist();
      renderCart();
      toast('Cart cleared', 'warn');
    });

    cartItemsEl.addEventListener('click', (e) => {
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      const rm = e.target.closest('[data-remove]');
      const empty = e.target.closest('#emptyShopBtn');
      if (inc) setQty(inc.dataset.inc, (state.cart.find((l) => l.id === inc.dataset.inc)?.qty || 0) + 1);
      else if (dec) setQty(dec.dataset.dec, (state.cart.find((l) => l.id === dec.dataset.dec)?.qty || 0) - 1);
      else if (rm) removeFromCart(rm.dataset.remove);
      else if (empty) {
        closeDrawer();
        $('#catalogue').scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Coupons
    $('#couponApply').addEventListener('click', () => {
      const code = $('#couponInput').value.trim().toUpperCase();
      const note = $('#couponNote');
      if (!code) {
        note.className = 'coupon-note bad';
        note.textContent = 'Enter a coupon code first.';
        return;
      }
      if (COUPONS[code]) {
        state.coupon = code;
        persist();
        note.className = 'coupon-note ok';
        note.textContent = '✓ ' + COUPONS[code].label;
        renderCart();
        toast('Coupon ' + code + ' applied', 'success');
      } else {
        state.coupon = null;
        persist();
        note.className = 'coupon-note bad';
        note.textContent = 'That code is not valid. Try NOVA10, SAVE20 or FREESHIP.';
        renderCart();
        toast('Invalid coupon code', 'warn');
      }
    });
    $('#couponInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#couponApply').click();
      }
    });

    // Quick view actions
    $('#qvAdd').addEventListener('click', () => {
      if (!quickViewId) return;
      addToCart(quickViewId);
      closeModal(quickView);
    });
    $('#qvWish').addEventListener('click', () => {
      if (!quickViewId) return;
      toggleWish(quickViewId);
      $('#qvWish').textContent = state.wishlist.includes(quickViewId)
        ? 'Saved to wishlist ✓'
        : 'Save for later';
    });

    // Modal closing
    $$('[data-close-modal]').forEach((btn) =>
      btn.addEventListener('click', () => closeModal(btn.closest('.modal')))
    );
    $('#successClose').addEventListener('click', () => {
      closeModal(successModal);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Checkout
    $('#checkoutBtn').addEventListener('click', openCheckout);
    $('#checkoutForm').addEventListener('submit', placeOrder);
    $$('#checkoutForm .field').forEach((f) =>
      f.addEventListener('input', () => f.setAttribute('aria-invalid', 'false'))
    );

    // Header extras
    $('#wishlistBtn').addEventListener('click', () => {
      applyFilter({ wishlistOnly: true });
      $('#catalogue').scrollIntoView({ behavior: 'smooth' });
      toast(state.wishlist.length ? 'Showing your wishlist' : 'Your wishlist is empty', 'info');
    });

    $('#themeToggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
      toast(next === 'dark' ? 'Dark theme on' : 'Light theme on', 'info');
    });

    $('#newsletterForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#newsletterEmail').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
        toast('Please enter a valid email address', 'warn');
        return;
      }
      $('#newsletterForm').reset();
      toast('Subscribed — welcome to NovaCart', 'success');
    });
  }

  function init() {
    initTheme();
    $('#year').textContent = new Date().getFullYear();
    $('#statProducts').textContent = PRODUCTS.length;
    renderChips();
    renderGrid();
    renderCart();
    syncWishUI();
    bindEvents();

    // Restore an applied coupon from a previous visit.
    if (state.coupon && COUPONS[state.coupon]) {
      $('#couponInput').value = state.coupon;
      $('#couponNote').className = 'coupon-note ok';
      $('#couponNote').textContent = '✓ ' + COUPONS[state.coupon].label;
    }

    console.info(
      '%cNovaCart%c ready · ' + PRODUCTS.length + ' products\nCoupons: NOVA10 · SAVE20 · FREESHIP',
      'font-weight:bold;color:#5b7cfa',
      'color:inherit'
    );
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
