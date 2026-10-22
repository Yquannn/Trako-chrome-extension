// Platform recognition is separate from extraction. Only Shopee has a focused
// order-list adapter; other recognized sites retain conservative DOM heuristics.
(() => {
  const rules = [
    { name: "Shopee Philippines", hosts: [/^(?:www\.)?shopee\.ph$/i], words: /my purchases?|purchase history|my orders|order details|track order/i },
    { name: "TikTok Shop", hosts: [/(^|\.)tiktok\.com$/i], words: /your orders|my orders|order history/i },
    { name: "Lazada Philippines", hosts: [/^(?:www\.)?lazada\.com\.ph$/i], words: /my orders|order history/i },
    { name: "SHEIN", hosts: [/(^|\.)shein\.[a-z.]+$/i], words: /my orders|order history/i },
    { name: "Temu", hosts: [/(^|\.)temu\.com$/i], words: /your orders|my orders|order history/i },
    { name: "Pinduoduo (拼多多)", hosts: [/(^|\.)(pinduoduo|yangkeduo)\.com$/i], words: /我的订单|全部订单|订单/i }
  ];
  const rule = rules.find(entry => entry.hosts.some(host => host.test(location.hostname)));
  const normalize = value => String(value || "").replace(/\s+/g, " ").trim();
  const deliveryTooltipDates = new WeakMap();
  const deliveryTooltipDatesByText = new Map();
  const isVisible = el => {
    if (!el) return false;
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.getClientRects().length > 0;
  };
  const textOf = el => normalize(el?.innerText);

  window.TrakoAdapters = {
    platform: rule?.name || "",
    isOrderPage() {
      if (!rule) return false;
      const pageText = `${location.pathname} ${document.title} ${(document.body?.innerText || "").slice(0, 8000)}`;
      return (rule.name === "Shopee Philippines" && /\/user\/purchase(?:\/|$)/i.test(location.pathname)) || rule.words.test(pageText);
    },
    extract() {
      if (!rule || !document.body) return { rows: [], scannedOrders: 0, skippedOrders: 0, skippedProducts: [] };
      if (rule.name === "Shopee Philippines") return extractShopee();
      return extractGeneric(rule.name);
    },
    getOrderLinks() {
      if (rule?.name !== "Shopee Philippines") return [];
      // Only collect detail links present in the currently rendered history.
      // Status is checked on the matching detail page, where Shopee exposes
      // the authoritative status for that order.
      const urls = [...document.querySelectorAll('a[href*="/user/purchase/order/"]')]
        .filter(isVisible)
        .map(anchor => new URL(anchor.getAttribute("href"), location.origin).href)
        .filter(url => new URL(url).origin === location.origin);
      return [...new Set(urls)];
    },
    setDeliveryTooltipDate(card, date) {
      if (!card || !date) return;
      deliveryTooltipDates.set(card, date);
      deliveryTooltipDatesByText.set(fingerprint(textOf(card)), date);
    },
    getCapturedTooltipDateCount() { return deliveryTooltipDatesByText.size; }
  };

  function visibleLeafTexts(root) {
    const elements = [...root.querySelectorAll("*")]
      .filter(el => el.children.length === 0 && isVisible(el))
      .map(textOf).filter(Boolean);
    const textNodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (isVisible(node.parentElement)) {
        const value = normalize(node.nodeValue);
        if (value) textNodes.push(value);
      }
    }
    return [...new Set([...elements, ...textNodes])];
  }

  function plausibleProductTitle(value) {
    return value.length >= 8 && value.length <= 300 &&
      !/^[A-Za-z0-9_.-]{8,32}$/.test(value) &&
      !/^(product image|image|chat|view shop|buy again|contact seller|seller centre|seller center|start selling|download|follow us on|notifications|help|my purchase|my account|my vouchers|my shopee coins|completed|cancelled)$/i.test(value) &&
      !/^(?:parcel|your parcel|order|delivery|seller)\b/i.test(value) &&
      !/\b(?:local logistics partner|further sorting|notified when|ready for delivery|out for delivery|delivery driver|parcel has been)\b/i.test(value) &&
      !/^(?:variation|order total|quantity|qty)\s*:/i.test(value) &&
      !/(?:₱|PHP)\s*[\d,]+/i.test(value) && !/^x\s*\d+$/i.test(value);
  }

  function extractShopee() {
    const currencyAmount = /(?:₱|PHP)\s*[\d,]+(?:\.\d{1,2})?/i;
    const totalLabel = /order\s*total\s*[:：]?\s*((?:₱|PHP)\s*[\d,]+(?:\.\d{1,2})?)/i;
    const orderIdPattern = /(?:order\s*(?:no\.?|number|id)|订单编号|订单号)\s*[.：:#]?\s*([A-Z0-9-]{6,})/i;
    const totalCount = el => [...textOf(el).matchAll(/order\s*total\s*[:：]?\s*(?:₱|PHP)\s*[\d,]+(?:\.\d{1,2})?/ig)].length;
    const hasVisibleImage = el => [...el.querySelectorAll("img")].some(isVisible);
    const isShopeeDetail = /\/user\/purchase\/order\//i.test(location.pathname);
    const totalElements = [...document.querySelectorAll("div, section, article, li")]
      .filter(el => isVisible(el) && totalLabel.test(textOf(el)) && textOf(el).length < 12000)
      .sort((a, b) => textOf(a).length - textOf(b).length);
    const cards = [];
    // Order Details pages show the timeline and tracking events outside the
    // compact list card. Treat the rendered detail document as one order so
    // its visible timeline dates can be read alongside the product section.
    if (isShopeeDetail && totalElements.length) {
      cards.push(document.body);
    } else for (const start of totalElements) {
      let card = start;
      // Expand from the total footer to the largest bounded ancestor that
      // still contains exactly one order total. This includes the order header
      // (seller, order ID and any dates) without absorbing neighboring orders.
      while (card.parentElement && card.parentElement !== document.body) {
        const parent = card.parentElement;
        const parentText = textOf(parent);
        if (parentText.length >= 12000 || totalCount(parent) !== 1) break;
        card = parent;
      }
      if (totalCount(card) !== 1 || !hasVisibleImage(card)) continue;
      if (cards.some(other => other === card || other.contains(card) || card.contains(other))) continue;
      cards.push(card);
    }

    const rows = [];
    let skippedOrders = 0;
    let excludedOrders = 0;
    const skippedProducts = [];
    const recordSkippedProduct = (name, reason) => {
      if (!name || /[©®]|all rights reserved|delivery address|barangay|\b(?:street|city|province)\b/i.test(name)) return;
      skippedProducts.push({ name, reason });
    };
    cards.forEach((card, index) => {
      const body = textOf(card);
      const orderId = body.match(orderIdPattern)?.[1] || "";
      const orderTotal = body.match(totalLabel)?.[1] || "";
      const detailHref = [...card.querySelectorAll('a[href*="/user/purchase/order/"]')]
        .map(anchor => anchor.getAttribute("href"))[0] || "";
      const routeOrderKey = detailHref.match(/\/user\/purchase\/order\/([^/?#]+)/i)?.[1] ||
        location.pathname.match(/\/user\/purchase\/order\/([^/?#]+)/i)?.[1] || "";
      const orderKey = routeOrderKey || orderId || `shopee-card-${index}-${fingerprint(body)}`;
      const orderStatus = body.match(/\b(COMPLETED|CANCELLED|CANCELED|TO PAY|TO SHIP|TO RECEIVE|RETURNED|REFUNDED|PROCESSING|PENDING)\b/i)?.[1] || "";
      const deliveryStatus = body.match(/\b(parcel\s+has\s+been\s+(?:delivered|shipped|picked up)|out for delivery|delivery failed|awaiting pickup|已送达|已签收|派送中)\b/i)?.[1] || "";
      const purchaseDate = labeledDate(body, /(?:order\s*date|purchase\s*date|purchased\s*on|order\s*placed|date\s*ordered|ordered\s*on|placed\s*on|date\s*purchased|paid\s*on|order\s*created(?:\s*on)?)\s*[:：]?\s*/i);
      const deliveryDate = labeledDate(body, /(?:delivery\s*date|date\s*delivered|delivered\s*on|delivered\s*at|parcel\s+has\s+been\s+delivered\s+on|received\s*on)\s*[:：]?\s*/i) ||
        dateFromEvent(card, /(?:delivered|parcel\s+has\s+been\s+delivered)/i) ||
        (/delivered/i.test(deliveryStatus) ? (deliveryTooltipDates.get(card) || deliveryTooltipDatesByText.get(fingerprint(body)) || "") : "");
      const trackingNumber = body.match(/(?:tracking(?:\s*(?:no\.?|number))?|waybill)\s*[:：#]?\s*([A-Z0-9-]{6,})/i)?.[1] ||
        (isShopeeDetail ? body.match(/\b(PH\d{10,})\b/i)?.[1] : "") || "";
      const images = [...card.querySelectorAll("img")].filter(img => isVisible(img) && (img.naturalWidth > 24 || img.width > 24));
      const itemScopes = [];

      for (const img of images) {
        let node = img.parentElement;
        let best = null;
        for (let depth = 0; depth < 9 && node && node !== card; depth++, node = node.parentElement) {
          const leaves = visibleLeafTexts(node).filter(plausibleProductTitle);
          if (!leaves.length || textOf(node).length > 2600) continue;
          best = node;
          const itemImages = [...node.querySelectorAll("img")].filter(image => isVisible(image) && (image.naturalWidth > 24 || image.width > 24));
          if (itemImages.length === 1 && (currencyAmount.test(textOf(node)) || /\bx\s*\d+\b|variation\s*:/i.test(textOf(node)))) break;
        }
        if (best) itemScopes.push(best);
      }
      const scopes = [...new Set(itemScopes)].filter(scope => !itemScopes.some(other => other !== scope && scope.contains(other)));
      const candidates = scopes.map(scope => {
        const itemText = textOf(scope);
        const image = [...scope.querySelectorAll("img")].find(isVisible);
        const title = visibleLeafTexts(scope).filter(plausibleProductTitle).sort((a, b) => b.length - a.length)[0] || "";
        const variation = itemText.match(/variation\s*:\s*(.+?)(?=\s+(?:x\s*\d+|₱|PHP|$))/i)?.[1] || "";
        const quantity = itemText.match(/\bx\s*(\d+)\b|quantity\s*[:：]?\s*(\d+)/i)?.slice(1).find(Boolean) || "";
        return { productName: title, productVariation: variation, quantity,
          unitPrice: window.TrakoCore.productUnitPrice(itemText),
          imageUrl: image?.currentSrc || image?.src || "" };
      }).filter(item => item.productName);
      if (orderStatus.toUpperCase() !== "COMPLETED") {
        skippedOrders++;
        excludedOrders++;
        const reason = orderStatus
          ? `Order status is ${orderStatus}. Only completed orders are exported.`
          : "Order status could not be identified. Only completed orders are exported.";
        if (candidates.length) candidates.forEach(item => recordSkippedProduct(item.productName, reason));
        else recordSkippedProduct("Product name unavailable", reason);
        return;
      }
      const items = candidates.filter(item => item.quantity || item.unitPrice);
      candidates.filter(item => !(item.quantity || item.unitPrice)).forEach(item =>
        recordSkippedProduct(item.productName, "Quantity and unit price were not readable on the page."));

      // The full details document also contains the delivery address and site
      // footer. Those can be mistaken for a seller name, so leave this
      // optional field blank on detail pages.
      const seller = isShopeeDetail ? "" : findSellerName(card, items.map(item => item.productName));
      if (!items.length) {
        skippedOrders++;
        if (!candidates.length) recordSkippedProduct("Product name unavailable", "No readable product name, quantity, or unit price was found.");
        return;
      }
      const currency = orderTotal.includes("₱") ? "PHP" : (orderTotal.match(/PHP/i)?.[0] || "");
      for (const item of items) rows.push({ platform: "Shopee Philippines", orderId, _orderKey: orderKey,
        sellerName: seller, productName: item.productName, productVariation: item.productVariation,
        quantity: item.quantity, unitPrice: item.unitPrice, orderTotal, orderStatus, deliveryStatus,
        purchaseDate, deliveryDate, trackingNumber, currency, imageUrl: item.imageUrl });
    });
    const uniqueSkippedProducts = [...new Map(skippedProducts.map(item => [`${item.name}|${item.reason}`, item])).values()];
    return { rows: window.TrakoCore.dedupeRows(rows), scannedOrders: cards.length, skippedOrders,
      excludedOrders, skippedProducts: uniqueSkippedProducts };
  }

  function findSellerName(card, productNames) {
    const leaves = visibleLeafTexts(card);
    const firstProductIndex = leaves.findIndex(value => productNames.includes(value));
    const candidates = leaves.slice(0, firstProductIndex < 0 ? 16 : firstProductIndex)
      .filter(value => value.length > 2 && value.length < 100 &&
        !/^(chat|view shop|buy again|contact seller|completed|cancelled|parcel\s)/i.test(value) &&
        !/^(?:go\s+to\s+)?(?:pdp|product\s+detail\s+page|order\s+item)$|^go\s+to\s+.*\bpdp\b/i.test(value) &&
        !/(?:₱|PHP)\s*[\d,]+/i.test(value) && !/order\s*total/i.test(value));
    return candidates.at(-1) || "";
  }

  function labeledDate(text, labelPattern) {
    const dateToken = "(20\\d{2}[./-]\\d{1,2}[./-]\\d{1,2}|\\d{1,2}[./-]\\d{1,2}[./-]20\\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\\s+\\d{1,2},?\\s+20\\d{2}|\\d{1,2}\\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\\s+20\\d{2})";
    const match = text.match(new RegExp(labelPattern.source + dateToken, "i"));
    return match ? window.TrakoCore.normalizeDate(match[1]) : "";
  }

  function dateFromEvent(root, eventPattern) {
    const candidates = [root, ...root.querySelectorAll("div, li, p, span, time")]
      .filter(el => isVisible(el) && textOf(el).length < 500 && eventPattern.test(textOf(el)) && window.TrakoCore.extractDateToken(textOf(el)))
      .sort((a, b) => textOf(a).length - textOf(b).length);
    return candidates.length ? window.TrakoCore.normalizeDate(window.TrakoCore.extractDateToken(textOf(candidates[0]))) : "";
  }

  function fingerprint(value) {
    let hash = 2166136261;
    for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return (hash >>> 0).toString(36);
  }

  function extractGeneric(platform) {
    const idPattern = /(?:order\s*(?:no\.?|number|id)|订单编号|订单号)\s*[:：#]?\s*([A-Z0-9-]{6,})/i;
    const candidates = [...document.querySelectorAll("article, [role=article], li, section, div")]
      .filter(el => isVisible(el) && el.children.length && idPattern.test(textOf(el)) && textOf(el).length < 12000)
      .sort((a, b) => textOf(a).length - textOf(b).length);
    const cards = candidates.filter(el => {
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        if (textOf(parent).length > 12000) break;
        if (idPattern.test(textOf(parent))) return false;
        parent = parent.parentElement;
      }
      return true;
    });
    const rows = [];
    let skippedOrders = 0;
    cards.forEach((card, index) => {
      const body = textOf(card);
      const orderId = body.match(idPattern)?.[1] || "";
      const orderKey = orderId || `generic-card-${index}-${fingerprint(body)}`;
      const productNames = [...card.querySelectorAll("[title], [aria-label], img[alt]")]
        .filter(isVisible).map(el => el.getAttribute("title") || el.getAttribute("aria-label") || el.getAttribute("alt") || "")
        .map(normalize).filter(name => name.length > 2 && !/^(logo|icon|avatar|banner)$/i.test(name));
      if (!productNames.length) { skippedOrders++; return; }
      const total = body.match(/(?:order\s*total|total|订单总额|实付款|合计)\s*[:：]?\s*((?:₱|PHP|US\$|\$|€|£|¥|￥|CNY|RMB)\s*[\d,]+(?:\.\d{1,2})?)/i)?.[1] || "";
      for (const productName of [...new Set(productNames)]) rows.push({ platform, orderId, _orderKey: orderKey,
        sellerName: "", productName, productVariation: "", quantity: "", unitPrice: "", orderTotal: total,
        orderStatus: "", deliveryStatus: "", purchaseDate: "", deliveryDate: "", trackingNumber: "",
        currency: (total.match(/₱|PHP|US\$|\$|€|£|¥|￥|CNY|RMB/i) || [""])[0], imageUrl: "" });
    });
    return { rows: window.TrakoCore.dedupeRows(rows), scannedOrders: cards.length, skippedOrders, excludedOrders: 0, skippedProducts: [] };
  }
})();
