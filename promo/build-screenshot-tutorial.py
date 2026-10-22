from pathlib import Path
import json, subprocess
out=Path('promo/screenshot-tutorial'); out.mkdir(exist_ok=True)
scenes=[
('Meet Trako', 'Your Shopee orders,\nready for a spreadsheet.', 'A simple guide to exporting your purchase history.', 'Want your Shopee orders in a spreadsheet? Let’s do it with Trako Order Exporter. Here’s how.', '11.20.29', [.775,.674,.217,.24], 'Export orders to CSV'),
('1 · Open My Purchases', 'Start with your\npurchase history.', 'Install Trako, sign in to Shopee normally, and open My Purchases.', 'First, install Trako in Chrome. Sign in to Shopee as usual, then open My Purchases. The Trako panel appears on the page, ready when you are.', '11.20.29', [.28,.227,.71,.697], 'Trako appears on the page'),
('2 · Load your orders', 'Load the orders\nyou want included.', 'Scroll down. Use Load More if available. Only loaded orders are scanned.', 'Before you start, scroll down to load the orders you want. If Shopee shows a Load More button, use it. Trako scans only the orders already loaded on this page.', '11.21.22', [.28,.227,.55,.65], 'Load first. Then export.'),
('3 · Start the export', 'One button\nstarts the scan.', 'Select Export orders to CSV in the on-page Trako panel.', 'Ready? Click Export orders to CSV. Trako checks the loaded orders. The export is designed for completed orders, so other order statuses are skipped.', '11.20.29', [.775,.674,.217,.24], 'Click Export orders to CSV'),
('4 · Watch the progress', 'See the progress\nand estimated time.', 'Keep this page open. Select Cancel export to stop the scan.', 'You can follow the progress and estimated time right in the panel. Trako may open temporary order tabs while checking details. Need to stop? Click Cancel export.', '11.21.22', [.775,.686,.217,.226], 'Progress • Time remaining • Cancel'),
('5 · Check the results', 'Understand what\nwas skipped.', 'Read the product name and reason. Select Scan again when you need a fresh scan.', 'When the scan finishes, check the result. Skipped products include a reason, like an order that is still To Receive. To try again, click Scan again. Load more orders first if you want to include more.', '11.21.06', [.775,.482,.217,.431], 'Review the reason. Scan again if needed.'),
('6 · Save the CSV', 'Choose where\nto save your file.', 'Confirm the filename, choose a folder, then select Save.', 'Next, choose a folder for your CSV and click Save. Give the file a name you’ll recognize, so it’s easy to find later.', '11.21.44', [.292,.201,.376,.373], 'Choose a folder → Save'),
('7 · Open your spreadsheet', 'Your export\nis ready to review.', 'Open the CSV in Excel, Google Sheets, or WPS. Widen columns to read long values.', 'Open the CSV in your spreadsheet app. Each product gets its own row, with the details Trako could read. Widen narrow columns if you see hash marks. Some fields can stay blank when they aren’t available.', '11.21.50', [.104,.225,.50,.16], 'One product per row • Available details'),
('You’re all set', 'Load. Scan.\nSave your CSV.', 'Your order data is processed in your browser and is not sent to Trako servers.', 'And that’s it! Load your orders, scan with Trako, and save your CSV. Your order data stays in your browser and is not sent to Trako servers.', '11.20.29', [.775,.674,.217,.24], 'Trako Order Exporter')
]
records=[]
for i,(step,title,body,narration,stamp,crop,callout) in enumerate(scenes):
 p=out/f'voice-{i+1:02}.aiff'
 subprocess.run(['say','-v','Samantha','-r','166','-o',str(p),narration],check=True)
 records.append(dict(step=step,title=title,body=body,narration=narration,screenshot=f'/Users/dondonevangelistabautista/Desktop/ScreenRecord/Screenshot 2026-10-22 at {stamp}.png',crop=crop,callout=callout,audio=str(p.resolve())))
(out/'scenes.json').write_text(json.dumps(records,indent=2))
