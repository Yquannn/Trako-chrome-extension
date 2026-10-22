# Trako tutorial using actual screenshots

Use **trako-tutorial-screenshots.mp4** for the new tutorial.

- 1920 × 1080, 16:9, 24 fps, H.264 MP4 with English narration.
- About 1 minute 35 seconds.
- Uses the supplied October 22 screenshots, Trako mascot, warm colors, large instructions, and gentle zooms.
- Explains opening My Purchases, loading orders, exporting, progress and cancellation, skipped-product reasons, Scan again, saving the CSV, and opening it in a spreadsheet.
- Screenshots are cropped to remove profile names, browser chrome, and the Save dialog's home-directory name. Product and order information shown inside the selected screenshot areas remains visible.
- Screenshots are examples of the UI and do not prove that every field or order was extracted correctly. The older screenshot containing Seller Centre as a product was not used.
- English subtitles: **captions-en.srt**. Sentence timings are estimated from each narrated scene; the main instructions are also visible in the video.
- Narration script: **narration.txt**. Voice: macOS Samantha, with short sentences and clear pauses between scenes.

## Suggested YouTube title

How to Use Trako Order Exporter | Shopee Philippines CSV Tutorial

## Suggested description

Learn how to export your Shopee Philippines purchase history with Trako Order Exporter. Open My Purchases, load the orders you want included, select Export orders to CSV, and save your file. This guide also shows progress, skipped-product reasons, cancellation, and Scan again.

Available details depend on what Shopee renders on the page. Some fields may be blank. Your order data is processed locally in your browser and is not sent to Trako servers.

## Publishing

Upload the MP4 to YouTube and use the resulting video URL in the Global promo video field shown in your Chrome Web Store screenshot. Upload captions-en.srt as English subtitles if desired. Nothing has been uploaded or submitted automatically.

## Rebuild on macOS

From the extension project root:

```sh
python3 promo/build-screenshot-tutorial.py
swift promo/make-screenshot-tutorial.swift "$PWD/promo/screenshot-tutorial"
```

The supplied screenshot paths must still exist for a rebuild.
