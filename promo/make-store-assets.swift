import AppKit
let base=URL(fileURLWithPath:CommandLine.arguments[1],isDirectory:true)
let target=base.appendingPathComponent("promo/chrome-web-store",isDirectory:true)
let mascot=NSImage(contentsOf:base.appendingPathComponent("assets/mascot-head.svg"))!
var canvasH:CGFloat=800
func color(_ h:UInt32)->NSColor {NSColor(srgbRed:CGFloat((h>>16)&255)/255,green:CGFloat((h>>8)&255)/255,blue:CGFloat(h&255)/255,alpha:1)}
let ink=color(0x38231E),muted=color(0x80665D),red=color(0xED3027),border=color(0xEED6C8),bg=color(0xFFFAF4)
func frame(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat)->CGRect{CGRect(x:x,y:canvasH-y-h,width:w,height:h)}
func box(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ c:NSColor,_ r:CGFloat=18,_ stroke:NSColor?=nil){let p=NSBezierPath(roundedRect:frame(x,y,w,h),xRadius:r,yRadius:r);c.setFill();p.fill();if let stroke {stroke.setStroke();p.lineWidth=1.5;p.stroke()}}
func text(_ s:String,_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ size:CGFloat,_ bold:Bool=false,_ tint:NSColor=ink){let style=NSMutableParagraphStyle();style.lineSpacing=5;let f=NSFont(name:bold ? "AvenirNext-DemiBold":"AvenirNext-Medium",size:size) ?? NSFont.systemFont(ofSize:size);(s as NSString).draw(in:frame(x,y,w,h),withAttributes:[.font:f,.foregroundColor:tint,.paragraphStyle:style])}
func create(_ name:String,_ w:Int,_ h:Int,_ draw:()->Void)throws {canvasH=CGFloat(h);let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:w,pixelsHigh:h,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!;NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:rep)!;bg.setFill();NSBezierPath(rect:CGRect(x:0,y:0,width:w,height:h)).fill();draw();NSGraphicsContext.restoreGraphicsState();try rep.representation(using:.jpeg,properties:[.compressionFactor:0.95])!.write(to:target.appendingPathComponent(name))}
func screenshot(_ stamp:String,_ c:[Double],_ area:CGRect){let url=URL(fileURLWithPath:"/Users/dondonevangelistabautista/Desktop/ScreenRecord/Screenshot 2026-10-22 at \(stamp).png");let img=NSImage(contentsOf:url)!;var bounds=CGRect(origin:.zero,size:img.size);let original=img.cgImage(forProposedRect:&bounds,context:nil,hints:nil)!;let image=original.cropping(to:CGRect(x:c[0]*Double(original.width),y:c[1]*Double(original.height),width:c[2]*Double(original.width),height:c[3]*Double(original.height)))!;let scale=min(area.width/CGFloat(image.width),area.height/CGFloat(image.height));let dw=CGFloat(image.width)*scale,dh=CGFloat(image.height)*scale;let ctx=NSGraphicsContext.current!.cgContext;ctx.saveGState();ctx.interpolationQuality = .high;ctx.draw(image,in:frame(area.minX+(area.width-dw)/2,area.minY+(area.height-dh)/2,dw,dh));ctx.restoreGState()}
let cards:[(String,String,String,String,String,[Double],String)]=[
("01-export.jpg","EXPORT FROM SHOPEE","Your orders.\nReady for CSV.","Open My Purchases and select\nExport orders to CSV.","11.20.29",[0.78,0.675,0.21,0.238],"Start from the Trako panel on your purchase history page."),
("02-progress.jpg","STAY IN CONTROL","Follow the scan\nas it happens.","See progress and estimated time.\nCancel export when you need to stop.","11.21.22",[0.78,0.687,0.21,0.225],"Keep the page open while Trako checks the loaded orders."),
("03-results.jpg","UNDERSTAND THE RESULTS","See what was\nskipped and why.","Review product names and reasons.\nSelect Scan again to retry.","11.21.06",[0.78,0.483,0.21,0.431],"Completed orders are eligible for export. Other statuses are skipped."),
("04-save.jpg","SAVE YOUR EXPORT","A CSV file\nyou can keep.","Choose a folder and save your export.\nOpen it in your spreadsheet app.","11.21.44",[0.292,0.201,0.376,0.373],"Available order details are exported locally in your browser."),
("05-spreadsheet.jpg","REVIEW YOUR DATA","One product\nper row.","Review the available order details.\nWiden columns to read long values.","11.21.50",[0.104,0.225,0.50,0.16],"Only loaded orders are scanned. Some fields may be blank when unavailable.")]
for (i,card) in cards.enumerated(){try create(card.0,1280,800){
 box(0,0,1280,8,red,0);mascot.draw(in:frame(42,31,66,62));text("Trako Order Exporter",121,41,850,42,28,true);text("SHOPEE PHILIPPINES",123,82,650,28,13,false,muted)
 box(45,149,365,37,color(0xFCE8DF),10);text(card.1,61,157,330,30,14,true,red)
 text(card.2,46,218,380,190,39,true);text(card.3,48,438,370,155,22,false,muted)
 box(452,144,783,542,color(0xF2E8E0),24,border)
 screenshot(card.4,card.5,CGRect(x:470,y:162,width:747,height:506))
 box(46,718,1188,1,border,0);text(card.6,48,741,1100,45,16,false,muted);text("\(i+1) / 5",1160,741,80,40,16,true,muted)
}}
try create("small-promo-440x280.jpg",440,280){
 box(0,0,440,7,red,0);mascot.draw(in:frame(28,30,90,84));text("Trako",134,40,260,50,34,true);text("Order Exporter",136,88,280,40,21,true,muted)
 text("Your Shopee orders.\nReady for CSV.",29,147,386,95,28,true)
 text("Local export for your purchase history",30,249,390,25,13,false,muted)
}
try create("marquee-promo-1400x560.jpg",1400,560){
 box(0,0,1400,10,red,0);mascot.draw(in:frame(66,74,138,130));text("Trako Order Exporter",230,94,1000,66,44,true);text("SHOPEE PHILIPPINES",234,165,800,42,18,false,red)
 text("Your orders. Ready for CSV.",71,264,1240,95,58,true)
 text("Load your orders. Scan with Trako. Save your CSV.",76,375,1250,60,27,false,muted)
 box(76,463,1248,1,border,0);text("Order data is processed in your browser.",77,486,1100,40,19,false,muted)
}
print("Created 5 screenshots and 2 promotional tiles in \(target.path)")
