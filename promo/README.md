# Chrome Web Store tutorial video

**Video:** `trako-order-exporter-tutorial.mp4`  
**Captions:** `captions.srt`  
**Thumbnail:** `thumbnail.png`  
**Format:** MP4, 1280 × 720 (16:9), H.264, about 55 seconds, English voice-over.

This tutorial demonstrates the Shopee Philippines flow. The on-screen order cards are generic illustrations, not real account data. The narration explains that Trako scans only orders currently loaded on the page, exports completed orders, and may leave fields blank when Shopee does not render them in order history.

## Add it to the Chrome Web Store listing

1. Upload `trako-order-exporter-tutorial.mp4` to your YouTube channel.
2. Set the video visibility to **Unlisted** or **Public** so reviewers and users with the link can play it.
3. Upload `captions.srt` as English subtitles in YouTube Studio if desired.
4. Paste the YouTube video URL into the listing's **Global promo video** field.
5. Upload `thumbnail.png` as a listing screenshot only if you want to use it as a separate promo image; the listing screenshot requirements may differ from the video thumbnail.

## Suggested YouTube details

**Title**  
Trako Order Exporter Tutorial | Export Shopee Philippines Orders to CSV

**Description**  
Learn how to use Trako Order Exporter with Shopee Philippines. Load the orders you want included, scan the orders already visible on the page, and save the CSV. Only completed orders are exported. Available fields depend on what Shopee displays in order history. Order data is processed locally in your browser and is not sent to Trako servers.

## Rebuild

On macOS, with the system `say` command and Swift available:

```sh
say -v Samantha -r 160 -f promo/narration.txt -o promo/narration.aiff
swift promo/make-tutorial.swift "$PWD/promo" "$PWD/promo/narration.aiff"
```

The video is a local tutorial asset. It has not been uploaded to YouTube or submitted to the Chrome Web Store.
