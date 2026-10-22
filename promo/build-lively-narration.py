"""Regenerate tutorial narration. Only this written script is sent to the speech service."""
from pathlib import Path
import ast, asyncio, json
import edge_tts
source = Path('promo/build-screenshot-tutorial.py')
module = ast.parse(source.read_text())
scenes = next(ast.literal_eval(n.value) for n in module.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'scenes' for t in n.targets))
out = Path('promo/lively-tutorial'); out.mkdir(exist_ok=True)
scripts = [
"All those Shopee orders? Let’s turn them into a spreadsheet! Here’s how to get started with Trako Order Exporter.",
"First up: install Trako in Chrome, sign in to Shopee, and open My Purchases. Look for the little Trako panel. That’s where you’ll start!",
"Want more orders in your export? Scroll down to load them first. Tap Load More if it appears. Remember: Trako scans what’s already loaded on this page.",
"Ready? Click Export orders to CSV! Trako checks your loaded orders for completed purchases. Orders with other statuses are skipped.",
"Watch the progress right here, along with the estimated time left. You might see temporary order tabs while Trako checks details. Need to stop? Hit Cancel export.",
"Something got skipped? Check the product name and the reason underneath. An order still marked To Receive won’t be included. Want a fresh scan? Click Scan again. Load more orders first to include more!",
"When your file is ready, choose a folder, give it a name, and click Save. Nice and simple!",
"Now open the CSV in your spreadsheet app. Each product has its own row. Seeing hash marks? Widen the column! Some fields may stay blank if the details aren’t available.",
"And you’re done! Load your orders, scan with Trako, and save your CSV. Your order data stays in your browser and isn’t sent to Trako servers. Happy organizing!"
]
async def main():
 sem = asyncio.Semaphore(3)
 async def render(i):
  async with sem:
   path=out/f'voice-{i+1:02}.mp3'
   await edge_tts.Communicate(scripts[i],voice='en-US-JennyNeural',rate='+7%',pitch='+3Hz').save(str(path))
   step,title,body,_,stamp,crop,callout=scenes[i]
   return dict(step=step,title=title,body=body,narration=scripts[i],screenshot=f'/Users/dondonevangelistabautista/Desktop/ScreenRecord/Screenshot 2026-10-22 at {stamp}.png',crop=crop,callout=callout,audio=str(path.resolve()))
 records=await asyncio.gather(*(render(i) for i in range(len(scenes))))
 (out/'scenes.json').write_text(json.dumps(records,indent=2))
 print('Generated all nine neural narration segments.')
asyncio.run(main())
