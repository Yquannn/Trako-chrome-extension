# Trako Order Exporter

Trako is a local Chrome Manifest V3 extension. On Shopee Philippines' My Purchases page, it scans order cards currently loaded in the rendered page and exports one CSV row per readable product. It does not send order data to a server or read passwords, cookies, or authentication tokens.

## Install and use

1. In Chrome, open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and choose this project folder.
3. Open `https://shopee.ph/user/purchase/` while signed in normally. Trako follows the order detail links visible on the loaded history page in background tabs, then combines the readable results into one CSV.
4. Reload the extension and refresh the Shopee page after installing or updating it.
5. Trako reads only orders already loaded on the page; it does not scroll or click **Load More** or pagination controls. Load more orders yourself before exporting again if you want to include them. When Trako detects a supported purchase history page, its mascot-themed panel appears automatically on the page. Click **Export orders to CSV** in that panel; there is no need to open the browser extension menu. The panel stays visible until you close it. For Shopee, it shows orders processed and an estimated time remaining while detail links are visited one at a time. Use **Cancel export** to stop between orders.

The CSV has stable columns for platform, order ID, seller, product, variation, quantity, product price, order total, order status, delivery status, purchase date, delivery date, tracking number, currency, and image URL. Fields that are not shown or confidently readable remain blank. CSV can contain an image URL but cannot embed the image itself.

## Extraction behavior and limits

- The extension reads visible DOM content and image URLs from the current page. It does not call private endpoints, inspect authentication data, or transmit order information.
- On Shopee, Trako opens each visible order detail link found on the currently loaded history page in an inactive background tab to check that order's status. It exports product rows only when that detail page shows **COMPLETED**, reads visible **Order Placed** and **Delivered** timestamps when available, then closes the tab. It does not bypass verification or access controls. If an order is not completed, it is excluded; if its detail page cannot be read, it is counted as unreadable.
- Only order cards currently loaded in the page are scanned. Trako does not scroll the page or activate “load more” or pagination controls; load more orders yourself and export again to include them. The popup reports detected, extracted, and skipped card counts.
- Shopee order-list markup can change. Check the exported file against the page. Shopee support has not been verified across all account/page variants. Other recognized shopping sites still use generic heuristics and are not verified integrations.

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
# Trako-chrome-extension
