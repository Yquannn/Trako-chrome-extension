# Trako – Order Exporter

Trako is a local Chrome Manifest V3 extension. On Shopee Philippines and Lazada Philippines order history pages, it scans order cards currently loaded in the rendered page and exports one CSV row per readable product. It does not send order data to a server or read passwords, cookies, or authentication tokens.

## Install and use

1. In Chrome, open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and choose this project folder.
3. Open `https://shopee.ph/user/purchase/` while signed in normally. Trako follows the order detail links visible on the loaded history page in background tabs, then combines the readable results into one CSV.
4. Reload the extension and refresh the Shopee page after installing or updating it.
5. Trako reads only orders already loaded on the page; it does not scroll or click **Load More** or pagination controls. Load more orders yourself before exporting again if you want to include them. Trako’s mascot panel appears automatically on Shopee Philippines and Lazada Philippines. Outside order history, use **Open My Orders** on Shopee or Lazada, then sign in normally. Export is available only on the order page for verified stores. Other stores are not enabled in this public release. Click **Export orders to CSV** in that panel; there is no need to open the browser extension menu. The panel stays visible until you close it. For Shopee, it shows orders processed and an estimated time remaining while detail links are visited one at a time. Use **Pause** to finish the current order and stop before opening another one, then **Continue** to resume the same scan. **Cancel export** stops the scan and closes its current detail tab. **Retry scan** after an error or cancellation starts a fresh scan of the currently loaded orders; **Scan again** does the same after completion. Pause and Continue are available for Shopee and Lazada. Keep the order history page open while paused.

The CSV has stable columns for platform, order ID, seller, product, variation, quantity, product price, order total, order status, delivery status, purchase date, delivery date, tracking number, currency, and image URL. Fields that are not shown or confidently readable remain blank. CSV can contain an image URL but cannot embed the image itself.

## Extraction behavior and limits

### Lazada Philippines

Open `https://my.lazada.com.ph/customer/order/index/` while signed in. Trako reads only the order cards currently loaded on this page and uses the same CSV columns as Shopee. Select **Export orders to CSV** in the on-page panel. Use **Scan again** after loading more orders or changing the order list. Load More and pagination are manual. Trako opens the normal detail page for each loaded received/completed order, reads its dates, and closes that tab. Use **Cancel export** to stop; no further orders will be opened.

The dedicated `lazada-adapter.js` reads the actual desktop order-card fields for seller, product title, variation, item price, quantity, product image URL, and order status. **Received**, **Completed**, and **Delivered** are treated as completed statuses; cancelled and other statuses are excluded with product names and reasons. The Received layout was verified on a signed-in Lazada page on October 23, 2026: 9 product rows from 8 received orders, including a gift, with 1 cancelled order excluded. The subsequent full export captured delivery status, purchase date, and delivery date for all 9 product rows from those 8 received orders. Other Lazada layout/status variants have not been live-verified.

Purchase dates come from **Placed on** and delivery dates from **Delivered on** in the rendered detail page. Delivery status uses Lazada’s displayed status (for example, **Received**). Order IDs are read from the detail page. If details cannot be read, list data is retained and the panel reports missing details and date counts. Tracking numbers and order totals remain blank when not available to the adapter. Item prices are not substituted for order totals. A gift with no displayed price retains a blank price. Trako does not read embedded account data, private APIs, cookies, or authentication tokens.

### Shopee and other sites

- The extension reads visible DOM content and image URLs from the current page. It does not call private endpoints, inspect authentication data, or transmit order information.
- On Shopee, Trako opens each visible order detail link found on the currently loaded history page in an inactive background tab to check that order's status. It exports product rows only when that detail page shows **COMPLETED**, reads visible **Order Placed** and **Delivered** timestamps when available, then closes the tab. It does not bypass verification or access controls. If an order is not completed, it is excluded; if its detail page cannot be read, it is counted as unreadable.
- Only order cards currently loaded in the page are scanned. Trako does not scroll the page or activate “load more” or pagination controls; load more orders yourself and export again to include them. The popup reports detected, extracted, and skipped card counts.
- Shopping-site markup can change. Check the exported file against the page. Shopee and Lazada have not been verified across all account/page variants. SHEIN, TikTok Shop, Temu, and Pinduoduo are not enabled in the public package. Their adapters remain unverified; the public package requests site access only for Shopee Philippines and Lazada Philippines. SHEIN All Orders was inspected on October 23, 2026, but the available account had an empty order history. Recommendations are not exported.

## Troubleshooting

- **Unsupported or inactive tab:** use a supported site, reload Trako at `chrome://extensions`, and refresh the shopping page so its content script loads.
- **No order cards detected:** make sure the purchase history is open and has finished loading. Scroll or use the site's own load-more/pagination controls, then export again.
- **Some orders skipped:** those cards did not contain readable product text/image information under the current page layout. Compare the skipped count with the visible cards.
- **Dates blank or orders skipped:** make sure the history page is fully loaded and that its order cards contain links to `/user/purchase/order/...`. Refresh the extension and the Shopee page before exporting. Detail tabs are opened one at a time and closed after reading.
- **Product image missing:** CSV records contain an image URL only when the rendered card exposes an image element and usable URL. Spreadsheet applications do not display that URL as an embedded image.
- **Text appears cut off in WPS/Excel:** CSV does not store column widths. Use AutoFit Column Width or widen the columns; the cell content may be longer than what is currently visible.

## Developer checks

Run the built-in Node.js tests with:

```sh
node --test
```

The tests cover CSV quoting/Unicode, date normalization including missing and invalid dates, duplicate products, and multiple products in one order. They do not replace validation against a live signed-in Shopee purchase page.

## Shared CSV columns

All verified platform adapters export through `export-core.js` with this exact header and order:

```csv
platform,order_id,seller_name,product_name,variation,quantity,product_price,order_total,order_status,delivery_status,purchase_date,delivery_date,tracking_number,currency,image_url
```

Missing optional values are empty cells. A platform's own status label is preserved. Sharing this format does not mean that an unverified shopping site has a working extraction adapter.

## Chrome Web Store release

Current package: **0.2.0**, named **Trako – Order Exporter**.

Run `python3 scripts/package-release.py` to generate `release/trako-order-exporter-0.2.0.zip`. The ZIP includes only the extension runtime and mascot assets, with `manifest.json` at the root. Promo videos, screenshots, docs, tests, Git history, and local exports are excluded.

See `CHROMEWEBSTORE.md` for listing copy, release notes, privacy/permission details, and upload instructions. Upload the ZIP to the existing Chrome Web Store item to keep its extension ID. Local preparation does not publish the update or deploy the privacy-policy site.
