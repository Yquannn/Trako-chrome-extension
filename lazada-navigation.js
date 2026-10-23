// Runs with the page's UI handlers so a normal rendered product click can
// resolve its navigation URL without creating a browser-blocked popup.
(() => {
  document.addEventListener('trako-lazada-resolve', event => {
    const target = event.target;
    if (!(target instanceof Element) || !target.matches('.item-main .item-title') ||
        !target.closest('.order-list .orders [tag="order-component"]')) return;
    const originalOpen = window.open;
    let destination = '';
    try {
      window.open = function(url) {
        try {
          const parsed = new URL(String(url), location.href);
          if (parsed.origin === location.origin && /^\/customer\/order\/view\/?$/.test(parsed.pathname)) {
            destination = parsed.href;
            return null;
          }
        } catch (_) { /* no valid order navigation */ }
        return null;
      };
      target.click();
    } finally {
      window.open = originalOpen;
      target.dispatchEvent(new CustomEvent('trako-lazada-resolved', { detail: destination }));
    }
  });
})();
