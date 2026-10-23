const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../export-core.js");

test("CSV quotes commas, quotes, and embedded newlines while preserving Unicode", () => {
  const csv = core.toCsv([{ platform: "拼多多", orderId: 'A,"B', sellerName: "Line 1\nLine 2" }]);
  assert.match(csv, /"拼多多"/);
  assert.match(csv, /"A,""B"/);
  assert.match(csv, /"Line 1\nLine 2"/);
});

test("missing or invalid dates stay blank; valid dates normalize to YYYY-MM-DD", () => {
  assert.equal(core.normalizeDate(""), "");
  assert.equal(core.normalizeDate("unknown"), "");
  assert.equal(core.normalizeDate("2026/4/9"), "2026-04-09");
  assert.equal(core.normalizeDate("09/04/2026"), "2026-09-04");
  assert.equal(core.normalizeDate("24/11/2025"), "2025-11-24");
  assert.equal(core.normalizeDate("11/18/2025 12:03"), "2025-11-18");
  assert.equal(core.extractDateToken("Order Placed 11/18/2025 12:03"), "11/18/2025");
  assert.equal(core.normalizeDate("Oct 21, 2026"), "2026-10-21");
  assert.equal(core.normalizeDate("21 October 2026"), "2026-10-21");
  assert.equal(core.normalizeDate("31/02/2026"), "");
});

test("product price extraction excludes the order total", () => {
  assert.equal(core.productUnitPrice("Product ₱385 Order Total: ₱398"), "₱385");
  assert.equal(core.productUnitPrice("Old ₱6,290 Sale ₱3,980 Order Total: ₱3,110"), "₱3,980");
  assert.equal(core.productUnitPrice("Order Total: ₱398"), "");
});

test("duplicate order products are removed while distinct products in one order remain", () => {
  const rows = [
    { orderId: "O1", productName: "Tea", productVariation: "Green", quantity: "1", unitPrice: "₱10" },
    { orderId: "O1", productName: "Tea", productVariation: "Green", quantity: "1", unitPrice: "₱10" },
    { orderId: "O1", productName: "Coffee", productVariation: "Dark", quantity: "2", unitPrice: "₱20" }
  ];
  assert.equal(core.dedupeRows(rows).length, 2);
});

test("summary counts product rows and order level delivery details", () => {
  const rows = [
    { _orderKey: "A", productName: "one", deliveryStatus: "Parcel delivered", deliveryDate: "2026-04-01" },
    { _orderKey: "A", productName: "two", deliveryStatus: "Parcel delivered", deliveryDate: "2026-04-01" },
    { _orderKey: "B", productName: "three", deliveryStatus: "", deliveryDate: "" }
  ];
  assert.deepEqual(core.summarize(rows, 3, 0), {
    ordersFound: 3, ordersExtracted: 2, ordersSkipped: 0, rowsExported: 3,
    ordersWithDeliveryStatus: 1, ordersWithDeliveryDate: 1
  });
});

test("all platform CSVs keep the Shopee column names and order, even with missing optional fields", () => {
  const header = '"platform","order_id","seller_name","product_name","variation","quantity","product_price","order_total","order_status","delivery_status","purchase_date","delivery_date","tracking_number","currency","image_url"';
  for (const platform of ['Shopee Philippines', 'Lazada Philippines', 'SHEIN', 'TikTok Shop', 'Temu', 'Pinduoduo (拼多多)']) {
    const csv = core.toCsv([{ platform }]);
    const [actualHeader, row] = csv.split('\r\n');
    assert.equal(actualHeader, header, platform);
    assert.equal(row, `"${platform}","","","","","","","","","","","","","",""`);
  }
});
