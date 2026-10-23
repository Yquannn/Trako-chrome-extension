// Lazada Philippines desktop My Orders layout, inspected on 2026-10-23.
// Reads rendered order cards only; never reads embedded account/session state.
(() => {
  const clean = value => String(value || "").replace(/\s+/g, " ").trim();
  const visible = element => element && element.getClientRects().length > 0 &&
    getComputedStyle(element).display !== "none" && getComputedStyle(element).visibility !== "hidden";
  const text = element => visible(element) ? clean(element.innerText) : "";
  const field = (root, selector) => text(root.querySelector(selector));
  const terminalStatus = /^(received|completed|delivered)$/i;
  function dateAfter(value, label) {
    const match = value.match(label);
    return match ? window.TrakoCore.normalizeDate(window.TrakoCore.extractDateToken(value.slice(match.index + match[0].length, match.index + match[0].length + 65))) : "";
  }

  let scanTargets = [];
  window.TrakoLazada = {
    prepare() {
      const extraction = this.extract();
      scanTargets = [];
      const cards = [...document.querySelectorAll('.order-list .orders [tag="order-component"]')].filter(visible);
      cards.forEach((card, index) => {
        const rows = extraction.rows.filter(row => row._orderKey === `lazada-card-${index}`);
        if (!rows.length) return;
        const shop = [...card.querySelectorAll('.shop')].find(shop =>
          terminalStatus.test(field(shop, '.shop-header .shop-right-status')));
        const target = shop?.querySelector('.item-main .item-title');
        if (target) scanTargets.push({ node: target, key: `lazada-card-${index}` });
      });
      return { ...extraction, targets: scanTargets.map(({ key }) => key) };
    },
    open(key) {
      const target = scanTargets.find(target => target.key === key)?.node;
      if (!target?.isConnected || !visible(target)) throw new Error('The loaded order changed. Please scan again.');
      let url = '';
      const receive = event => { if (typeof event.detail === 'string') url = event.detail; };
      target.addEventListener('trako-lazada-resolved', receive, { once: true });
      try { target.dispatchEvent(new CustomEvent('trako-lazada-resolve', { bubbles: true })); }
      finally { target.removeEventListener('trako-lazada-resolved', receive); }
      if (!url) throw new Error('The order navigation could not be resolved. Refresh Lazada and retry.');
      return url;
    },
    detail() {
      if (!/^\/customer\/order\/view\/?$/.test(location.pathname)) throw new Error('The Lazada order details page did not open.');
      const root = document.querySelector('.page-root');
      const info = root?.querySelector('.detail-info');
      const status = root ? field(root, '.shop-header .shop-right-status') : '';
      const orderId = info ? field(info, '.order-number').match(/\bOrder\s+(\d{8,})/i)?.[1] || '' : '';
      if (!orderId || !status) return { ready: false };
      const infoText = text(info);
      return { ready: true, eligible: terminalStatus.test(status), metadata: {
        orderId, orderStatus: status, deliveryStatus: status,
        purchaseDate: dateAfter(infoText, /\bPlaced on\s*/i),
        deliveryDate: dateAfter(infoText, /\bDelivered on\s*/i)
      }};
    },
    extract() {
      const cards = [...document.querySelectorAll('.order-list .orders [tag="order-component"]')].filter(visible);
      const rows = [], skippedProducts = [];
      let skippedOrders = 0, excludedOrders = 0;
      cards.forEach((card, cardIndex) => {
        const shops = [...card.querySelectorAll('.shop')].filter(visible);
        let exported = false, eligible = false;
        const cardText = text(card);
        const orderId = cardText.match(/\border\s*(?:#|id|number|no\.?)\s*[:#.]?\s*(\d{8,})/i)?.[1] || "";
        const purchaseDate = dateAfter(cardText, /\b(?:placed on|order placed|order date|purchase date)\s*:?\s*/i);
        const deliveryDate = dateAfter(cardText, /\b(?:delivered on|received on|delivery date)\s*:?\s*/i);
        const orderTotal = cardText.match(/\border\s*total\s*:?\s*((?:₱|PHP)\s*[\d,]+(?:\.\d{1,2})?)/i)?.[1] || "";
        shops.forEach(shop => {
          const status = field(shop, '.shop-header .shop-right-status');
          const sellerName = field(shop, '.shop-header .shop-left-info-name');
          const isCompleted = terminalStatus.test(status);
          if (isCompleted) eligible = true;
          const items = [...shop.querySelectorAll('.shop-body .order-item')].filter(visible);
          for (const item of items) {
            const productName = field(item, '.item-main .item-title');
            if (!isCompleted) {
              if (productName) skippedProducts.push({ name: productName, reason: status
                ? `Order status is ${status}. Only received or completed orders are exported.`
                : 'The order status could not be read. Only received or completed orders are exported.' });
              continue;
            }
            const quantity = field(item, '.item-quantity').match(/\bqty\s*:\s*(\d+)\b/i)?.[1] || "";
            const unitPrice = field(item, '.item-status .item-price').match(/(?:₱|PHP)\s*[\d,]+(?:\.\d{1,2})?/i)?.[0] || "";
            const image = [...item.querySelectorAll('.item-pic img')].find(visible);
            if (!productName || !quantity) {
              skippedProducts.push({ name: productName || 'Product name unavailable', reason: 'The product name or quantity could not be read on this order card.' });
              continue;
            }
            // Optional amounts stay blank, including gifts with no rendered price.
            // The item price is not substituted for an order total.
            rows.push({ platform: 'Lazada Philippines', orderId, _orderKey: `lazada-card-${cardIndex}`,
              sellerName, productName, productVariation: field(item, '.item-main .item-sku'),
              quantity, unitPrice, orderTotal, orderStatus: status, deliveryStatus: status,
              purchaseDate, deliveryDate, trackingNumber: '', currency: 'PHP',
              imageUrl: image?.currentSrc || image?.src || '' });
            exported = true;
          }
        });
        if (!eligible) excludedOrders++;
        else if (!exported) skippedOrders++;
      });
      return { rows, scannedOrders: cards.length, skippedOrders, excludedOrders, skippedProducts };
    }
  };
})();
