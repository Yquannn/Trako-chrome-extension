(() => {
  const columns = [
    ["platform", "platform"], ["orderId", "order_id"], ["sellerName", "seller_name"],
    ["productName", "product_name"], ["productVariation", "variation"], ["quantity", "quantity"],
    ["unitPrice", "product_price"], ["orderTotal", "order_total"], ["orderStatus", "order_status"],
    ["deliveryStatus", "delivery_status"], ["purchaseDate", "purchase_date"],
    ["deliveryDate", "delivery_date"], ["trackingNumber", "tracking_number"],
    ["currency", "currency"], ["imageUrl", "image_url"]
  ];

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function toCsv(rows) {
    return [columns.map(([, label]) => csvCell(label)).join(","),
      ...rows.map(row => columns.map(([key]) => csvCell(row[key])).join(","))].join("\r\n");
  }

  function normalizeDate(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    let match = text.match(/\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/);
    if (match) return validIso(+match[1], +match[2], +match[3]);
    match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
    if (match) {
      const first = +match[1], second = +match[2], year = +match[3];
      // Shopee's Order Details timeline uses MM/DD/YYYY. If only one order is
      // possible, resolve the unambiguous day/month; ambiguous values use MM/DD.
      if (first > 12) return validIso(year, second, first);
      return validIso(year, first, second);
    }
    const monthMap = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    match = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(20\d{2})\b/i);
    if (match) return validIso(+match[3], monthMap[match[1].slice(0, 3).toLowerCase()], +match[2]);
    match = text.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(20\d{2})\b/i);
    if (match) return validIso(+match[3], monthMap[match[2].slice(0, 3).toLowerCase()], +match[1]);
    return "";
  }

  function extractDateToken(value) {
    return String(value ?? "").match(/\b20\d{2}[./-]\d{1,2}[./-]\d{1,2}\b|\b\d{1,2}[./-]\d{1,2}[./-]20\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2},?\s+20\d{2}\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+20\d{2}\b/i)?.[0] || "";
  }

  function productUnitPrice(value) {
    const withoutTotal = String(value ?? "").replace(/order\s*total\s*[:：]?\s*(?:₱|PHP)\s*[\d,]+(?:\.\d{1,2})?/ig, " ");
    return [...withoutTotal.matchAll(/(?:₱|PHP)\s*[\d,]+(?:\.\d{1,2})?/ig)].map(match => match[0]).at(-1) || "";
  }

  function validIso(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function dedupeRows(rows) {
    const seen = new Set();
    return rows.filter(row => {
      const order = row.orderId || row._orderKey || "";
      const product = [row.productId, row.productName, row.productVariation, row.quantity, row.unitPrice, row.imageUrl].join("|");
      const key = `${order}|${product}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function summarize(rows, scannedOrders, skippedOrders) {
    const uniqueRows = dedupeRows(rows);
    const namedRows = uniqueRows.filter(row => String(row.productName || "").trim());
    const orderKeys = new Set(namedRows.map(row => row.orderId || row._orderKey).filter(Boolean));
    return {
      ordersFound: scannedOrders,
      ordersExtracted: orderKeys.size,
      ordersSkipped: skippedOrders,
      rowsExported: namedRows.length,
      ordersWithDeliveryStatus: new Set(uniqueRows.filter(row => row.deliveryStatus).map(row => row.orderId || row._orderKey).filter(Boolean)).size,
      ordersWithDeliveryDate: new Set(uniqueRows.filter(row => row.deliveryDate).map(row => row.orderId || row._orderKey).filter(Boolean)).size
    };
  }

  const api = { columns, csvCell, toCsv, normalizeDate, extractDateToken, productUnitPrice, dedupeRows, summarize };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.TrakoCore = api;
  if (typeof globalThis !== "undefined") globalThis.TrakoCore = api;
})();
