# Trako – Order Exporter: Chrome Web Store release

## Package

- Version: **0.2.2** (previous package: 0.2.1).
- File: `release/trako-order-exporter-0.2.2.zip`.
- Public release sites: **Shopee Philippines and Lazada Philippines**.
- Minimum Chrome version: 111.
- Build again with `python3 scripts/package-release.py`.
- The ZIP contains only runtime code and mascot assets. It excludes videos, screenshots, developer tools, tests, Git history, docs, and exported shopping data.

## Store listing: copy-ready fields

### Name

Trako – Order Exporter

### Short description (also in manifest)

Export online shopping orders to CSV locally. Supports Shopee PH and Lazada PH; SHEIN and other stores are planned.

### Suggested category and language

Productivity / English

### Detailed description

Turn your completed shopping orders into a CSV file with Trako – Order Exporter.

Trako helps you keep your online shopping purchases in one consistent CSV format. Its mascot panel appears automatically on supported shopping websites, so you can open My Orders and start an export from the page.

Supported now:
• Shopee Philippines
• Lazada Philippines

Planned platforms — not available in this version:
• SHEIN
• TikTok Shop
• Temu
• Pinduoduo (拼多多)

Exports for planned platforms will be added after their actual order pages have been implemented and validated. This version exports orders only from Shopee Philippines and Lazada Philippines.

How to use:
1. Sign in normally on Shopee Philippines or Lazada Philippines.
2. Open My Orders or My Purchases.
3. Load the orders you want to include by scrolling or using the shopping website’s Load More or pagination controls.
4. Select Export orders to CSV in the Trako panel.
5. Follow the progress, pause and continue when needed, or cancel the export.
6. Save the CSV and open it in your spreadsheet app. Use Scan again after loading more orders, or Retry scan after an error or cancellation.

What is exported:
• Completed orders on Shopee Philippines; received/completed orders on Lazada Philippines.
• One CSV row per readable product entry, with support for multiple products per order.
• Available order IDs, sellers, product names, variations, quantities, prices, order totals, statuses, purchase dates, delivery dates, tracking numbers, currency, and product image URLs.
• The same column format on both stores, with support for Chinese characters and quoted values.

Please note:
• Only orders already loaded on the history page are included. Trako does not automatically load your entire history.
• During export, Trako may open each loaded order’s detail page in a temporary background tab to read its status and dates, then close that tab.
• Pause finishes the current order before stopping. Continue resumes the same scan. Keep the shopping page open while paused.
• Cancelled or other non-completed orders are excluded. The panel shows available product names and reasons for skipped entries.
• Fields remain blank when the website does not expose readable values. CSV contains image links, not embedded images.
• Shopping-site layouts can change. Check your export against your order history.

Your order data is processed locally in your browser. Trako does not upload extracted orders to a server or collect passwords, cookies, or authentication tokens. All executable extension code is bundled in the extension package.

Trako is an independent tool and is not affiliated with or endorsed by Shopee or Lazada. SHEIN, TikTok Shop, Temu, and Pinduoduo are not supported in this public release.

Support: dondonbautista1223@gmail.com

### Support and privacy links

- Support: `mailto:dondonbautista1223@gmail.com` (use the contact email field if a web URL is required).
- Repository: https://github.com/Yquannn/Trako-chrome-extension
- Privacy policy: https://yquannn.github.io/Trako-chrome-extension/

Updated privacy-policy source is in `docs/index.html`. Deploy that source to GitHub Pages and confirm the URL shows the policy before submitting. Editing the local file does not update the hosted page.

## Privacy practices: factual declarations

### Single purpose

Help users export their own accessible completed shopping orders from Shopee Philippines and Lazada Philippines to a local CSV file.

### downloads permission justification

The downloads permission saves a CSV file locally when the user requests an export. It is not used to download or execute remote code.

### Website access justification

Content scripts run only on shopee.ph, www.shopee.ph, lazada.com.ph, www.lazada.com.ph, and my.lazada.com.ph. Access lets Trako display its panel, read rendered order information, and open normal order-detail pages for loaded orders during a user-requested export. Full-site paths allow the panel and Open My Orders shortcut to appear before the user reaches order history. No browsing-history, cookies, webRequest, or all-sites permission is requested.

The Lazada MAIN-world helper is a bundled local script. It resolves the destination of a rendered order’s normal click action so the extension can open the detail page without requiring popup-setting changes. It does not download JavaScript or call private order APIs.

### Remote code justification

Trako – Order Exporter does not download or execute remotely hosted JavaScript, WebAssembly, or executable instructions. All executable extension code is included in the uploaded package. Shopping pages continue to load their own resources normally; these are not downloaded as extension code.

### Data handling

Trako reads shopping-page content, including purchase and order information and product image URLs. That information is processed locally in browser memory and written to user-requested CSV downloads. It is not sent to the developer, analytics, advertisers, or an external processing server. Trako does not sell user data, use it for advertising, or use it for credit decisions. It does not maintain a separate persistent order database. Users delete downloaded CSV files themselves; uninstalling the extension does not delete those downloads.

Use these actual practices when completing the dashboard’s privacy fields. Do not describe the extension as never accessing user data: it accesses purchase information locally to provide its functionality.

## What changed in 0.2.2

- Updated the short and detailed descriptions to explain the supported platforms and distinguish planned integrations.
- No changes to extraction behavior or website permissions.

## What changed in 0.2.1

- Rebuilt the upload archive with portable ZIP metadata and manifest.json as the first root entry.
- Renamed to Trako – Order Exporter, with bundled mascot PNG icons.
- Added verified Lazada order-list extraction and detail-page dates in the shared CSV format.
- Added Pause / Continue, and improved cancellation and fresh retry handling.
- Added the on-page My Orders shortcut outside order history.
- Simplified the Lazada export summary and clarified product and order counts.
- Updated the popup instructions, support links, privacy-policy source, and release packaging.
- Limited public-package website access to Shopee Philippines and Lazada Philippines.

## Upload instructions

1. Open your existing Trako item in the Chrome Web Store Developer Dashboard. Keep the existing item to retain its extension ID.
2. Under Package, upload `release/trako-order-exporter-0.2.2.zip`. If the dashboard already has a version higher than 0.2.2, increase the manifest version and rebuild first.
3. Update the listing name, description, privacy practices, contact details, and privacy-policy URL using the copy above.
4. Add accurate screenshots of the release. Previous media is under `promo/`; it shows the earlier name/UI and should be refreshed before reuse. The mascot store icon is `assets/icon-128.png`.
5. Choose **Public** in Distribution when ready for a public release, then submit the item for review.

## Verification status and limits

A live Lazada export on October 23, 2026 produced 9 product entries from 8 received orders, all with purchase and delivery dates, and excluded a cancelled order. Other Lazada layout/status variants have not been verified. Shopee has prior validation in this project; not all page variants are covered. The newly added Pause / Continue, retry changes, automatic panel outside order history, and the refreshed release popup have not yet been checked in a live browser. This package is prepared for upload; preparation is not Chrome Web Store approval or publication.

## Official references

- https://developer.chrome.com/docs/webstore/update
- https://developer.chrome.com/docs/extensions/reference/manifest/icons
- https://developer.chrome.com/docs/webstore/program-policies/policies/
