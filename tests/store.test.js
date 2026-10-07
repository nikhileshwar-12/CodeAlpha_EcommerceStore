/* ==========================================================================
   NovaCart — end-to-end storefront test suite
   --------------------------------------------------------------------------
   Boots the real index.html inside jsdom against a local static server and
   drives the UI the way a shopper would: filter, search, sort, wishlist,
   add to cart, apply a coupon, quick-view and check out.

   Run with:  npm test          (requires `npm install` once)
   ========================================================================== */

const { JSDOM } = require('jsdom');
const { createServer } = require('../tools/serve');

const results = [];

function check(label, condition, detail = '') {
  results.push({ label, pass: Boolean(condition) });
  const mark = condition ? '\u001b[32mPASS\u001b[0m' : '\u001b[31mFAIL\u001b[0m';
  console.log(`  ${mark}  ${label}${detail ? '  \u001b[90m→ ' + detail + '\u001b[0m' : ''}`);
}

function group(title) {
  console.log(`\n\u001b[1m${title}\u001b[0m`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const dom = await JSDOM.fromURL(`${base}/index.html`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
  });
  await new Promise((r) => dom.window.addEventListener('load', r));
  await sleep(400);
  // jsdom does not implement scrolling; stub it so the console stays clean.
  dom.window.scrollTo = () => {};
  dom.window.Element.prototype.scrollIntoView = () => {};

  const { window } = dom;
  const doc = window.document;
  const $ = (sel) => doc.querySelector(sel);
  const $$ = (sel) => Array.from(doc.querySelectorAll(sel));
  const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const setValue = (sel, value, evt = 'input') => {
    const el = $(sel);
    el.value = value;
    el.dispatchEvent(new window.Event(evt, { bubbles: true }));
    return el;
  };
  const money = (text) => parseFloat(text.replace(/[^0-9.]/g, '')) || 0;

  console.log('\n\u001b[1mNovaCart storefront tests\u001b[0m');

  group('Catalogue');
  check('renders every product as a card', $$('.card').length === 14, `${$$('.card').length} cards`);
  check('renders a chip per category plus wishlist', $$('.chip').length === 8);
  check('announces the result count', /Showing/.test($('#resultCount').textContent), $('#resultCount').textContent.trim());
  check('cards show image, rating and price', $$('.card').every((c) => c.querySelector('img') && c.querySelector('.stars') && c.querySelector('.price')));

  group('Filtering, search & sort');
  const audioChip = $('[data-category="Audio"]');
  click(audioChip);
  check('category filter narrows the grid', $$('.card').length === 2, `${$$('.card').length} cards`);
  check('active chip exposes aria-pressed', audioChip.getAttribute('aria-pressed') === 'true');
  check('chips keep their DOM node (focus is preserved)', $('[data-category="Audio"]') === audioChip);

  click($('#resetFilters'));
  check('reset restores the full catalogue', $$('.card').length === 14);

  setValue('#searchInput', 'wallet');
  check('keyword search matches', $$('.card').length === 1, $$('.card')[0]?.dataset.id);
  setValue('#searchInput', 'zzzz');
  check('empty result state is shown', !!$('.empty-state'));
  click($('#resetFilters'));

  setValue('#sortSelect', 'price-asc', 'change');
  const ascending = $$('.card .price').map((p) => money(p.textContent));
  check('sorts price ascending', ascending.every((p, i) => i === 0 || ascending[i - 1] <= p), ascending.slice(0, 4).join(' → '));

  const range = $('#priceRange');
  range.value = 50;
  range.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('price ceiling filters the grid', $$('.card .price').every((p) => money(p.textContent) <= 50), `${$$('.card').length} under $50`);
  click($('#resetFilters'));

  group('Wishlist');
  click($('[data-wish]'));
  check('badge reflects the saved item', $('#wishBadge').textContent === '1' && $('#wishBadge').classList.contains('is-visible'));
  check('wishlist persists to storage', JSON.parse(window.localStorage.getItem('novacart.wishlist.v1')).length === 1);
  click($('#wishlistBtn'));
  check('wishlist view filters the grid', $$('.card').length === 1 && $('[data-wishlist-chip]').getAttribute('aria-pressed') === 'true');
  click($('[data-wishlist-chip]'));
  check('toggling the wishlist chip restores all products', $$('.card').length === 14);

  group('Cart');
  click($('[data-add]'));
  check('badge shows the added item', $('#cartBadge').textContent === '1');
  check('drawer opens automatically', $('#cartDrawer').classList.contains('is-open'));
  check('line item renders with an image', $$('.cart-item').length === 1 && !!$('.cart-item img'));
  check('subtotal is calculated', money($('#cartSubtotal').textContent) > 0, $('#cartSubtotal').textContent.trim());
  check('checkout is enabled', $('#checkoutBtn').disabled === false);

  click($('[data-inc]'));
  check('increment raises quantity', $('.cart-item .qty span').textContent === '2');
  click($('[data-dec]'));
  check('decrement lowers quantity', $('.cart-item .qty span').textContent === '1');
  click($('[data-remove]'));
  check('removing empties the cart', $$('.cart-item').length === 0 && $('#cartBadge').textContent === '0');
  click($('#cartClose'));

  group('Coupons & shipping');
  // The $32 bottle sits below the $100 free-shipping threshold on purpose.
  click($('[data-id="trail-bottle"] [data-add]'));
  check('below-threshold order is charged shipping', $('#cartShipping').textContent === '$9.99', $('#cartShipping').textContent.trim());
  setValue('#couponInput', 'NOPE');
  click($('#couponApply'));
  check('unknown coupon is rejected', $('#couponNote').classList.contains('bad'));
  setValue('#couponInput', 'NOVA10');
  click($('#couponApply'));
  check('NOVA10 is accepted', $('#couponNote').classList.contains('ok'), '✓ 10% off your order');
  const subtotal = money($('#cartSubtotal').textContent);
  const discount = money($('#cartDiscount').textContent);
  check('discount is exactly 10%', Math.abs(discount - subtotal * 0.1) < 0.01, `${discount} of ${subtotal}`);
  check('free-shipping progress hint renders', /unlock free shipping/.test($('#freeShipHint').textContent), $('#freeShipHint').textContent.trim());
  click($('[data-id="aurora-headphones"] [data-add]'));
  check('spending over $100 unlocks free shipping', /unlocked/.test($('#freeShipHint').textContent), $('#freeShipHint').textContent.trim());
  setValue('#couponInput', 'FREESHIP');
  click($('#couponApply'));
  check('FREESHIP zeroes shipping', $('#cartShipping').textContent === 'Free');

  group('Quick view');
  click($('[data-quick]'));
  await sleep(150);
  check('modal opens', $('#quickView').classList.contains('is-open'));
  check('modal is populated', $('#qvName').textContent.length > 0 && $('#qvSpecs').children.length >= 3, $('#qvName').textContent);
  check('modal is focusable dialog', $('#quickView').getAttribute('aria-modal') === 'true');
  click($('#qvAdd'));
  await sleep(80);
  check('adding from quick view closes it', !$('#quickView').classList.contains('is-open'));

  group('Checkout');
  click($('#cartBtn'));
  await sleep(60);
  click($('#checkoutBtn'));
  await sleep(400);
  check('checkout modal opens above the drawer', $('#checkoutModal').classList.contains('is-open'));
  check('order summary itemises the cart', $$('#orderSummary li').length >= 4);

  $('#checkoutForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(60);
  check('blank form is blocked', !$('#successModal').classList.contains('is-open'));
  check('invalid field is flagged', $('#fullName').getAttribute('aria-invalid') === 'true');

  setValue('#email', 'not-an-email');
  $('#checkoutForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  check('malformed email is caught', $('#email').getAttribute('aria-invalid') === 'true');

  setValue('#fullName', 'Ada Lovelace');
  setValue('#email', 'ada@example.com');
  setValue('#address', '12 Engine Way');
  setValue('#city', 'London');
  setValue('#postcode', 'EC1A 1BB');
  setValue('#card', '4242424242424242');
  $('#checkoutForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(500);
  check('success panel is shown', $('#successModal').classList.contains('is-open'));
  check('order id is generated', /NC-[A-Z0-9]+-\d{3}/.test($('#orderId').textContent), $('#orderId').textContent.trim());
  check('confirmation echoes the email', /ada@example.com/.test($('#successDetail').textContent));
  check('cart is emptied after ordering', $('#cartBadge').textContent === '0' && $$('.cart-item').length === 0);
  check('storage is cleared too', JSON.parse(window.localStorage.getItem('novacart.cart.v1')).length === 0);

  group('Theme & accessibility');
  const before = doc.documentElement.getAttribute('data-theme');
  click($('#themeToggle'));
  const after = doc.documentElement.getAttribute('data-theme');
  check('theme toggles', before !== after, `${before} → ${after}`);
  check('theme choice persists', window.localStorage.getItem('novacart.theme.v1') === JSON.stringify(after));
  check('skip link exists', !!$('.skip-link'));
  check('product images all carry alt text', $$('.card img').every((i) => i.hasAttribute('alt')));
  check('icon-only buttons have labels', $$('.icon-btn').every((b) => b.getAttribute('aria-label')));
  check('every button has an accessible name', $$('button').every((b) => (b.textContent || '').trim() || b.getAttribute('aria-label')));
  check('toasts use an aria-live region', $('#toastStack').getAttribute('aria-live') === 'polite');

  group('Escape-key handling');
  click($('#successClose'));
  await sleep(350);
  check('continue-shopping closes the success panel', !$('#successModal').classList.contains('is-open'));
  click($('[data-quick]'));
  await sleep(120);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(350);
  check('Escape closes the top layer', !$('#quickView').classList.contains('is-open'));

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n${failed.length ? '\u001b[31m' : '\u001b[32m'}${results.length - failed.length}/${results.length} checks passed\u001b[0m\n`
  );
  if (failed.length) {
    console.log('Failing checks:');
    failed.forEach((f) => console.log('  · ' + f.label));
  }

  dom.window.close();
  server.close();
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error('\nTest run crashed:\n', err);
  process.exit(2);
});
