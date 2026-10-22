import AppKit
import AVFoundation
import CoreVideo
import CoreMedia

struct Scene: Decodable {
 let step: String, title: String, body: String, narration: String, screenshot: String, callout: String, audio: String
 let crop: [Double]
}
let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let scenes = try JSONDecoder().decode([Scene].self, from: Data(contentsOf: root.appendingPathComponent("scenes.json")))
let W = 1920, H = 1080
let fps: Int32 = 24
let lively = root.lastPathComponent == "lively-tutorial"
let silent = root.appendingPathComponent("silent.mov"), output = root.appendingPathComponent(lively ? "trako-tutorial-lively.mp4" : "trako-tutorial-screenshots.mp4")
try? FileManager.default.removeItem(at: silent)
try? FileManager.default.removeItem(at: output)
func col(_ h: UInt32, _ a: CGFloat = 1) -> NSColor { NSColor(srgbRed: CGFloat((h >> 16)&255)/255, green: CGFloat((h >> 8)&255)/255, blue: CGFloat(h&255)/255, alpha:a) }
let ink=col(0x38231E), muted=col(0x80665D), red=col(0xED3027), cream=col(0xFFFAF4), border=col(0xF0D8CB)
func rect(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat)->CGRect { CGRect(x:x,y:CGFloat(H)-y-h,width:w,height:h) }
func box(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ fill:NSColor,_ radius:CGFloat=18,_ stroke:NSColor?=nil) {
 let p=NSBezierPath(roundedRect:rect(x,y,w,h),xRadius:radius,yRadius:radius); fill.setFill();p.fill()
 if let stroke { stroke.setStroke();p.lineWidth=2;p.stroke() }
}
func txt(_ s:String,_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ size:CGFloat,_ bold:Bool=false,_ color:NSColor=ink) {
 let font=NSFont(name:bold ? "AvenirNext-DemiBold":"AvenirNext-Medium",size:size) ?? NSFont.systemFont(ofSize:size)
 let p=NSMutableParagraphStyle(); p.lineSpacing=8
 (s as NSString).draw(in:rect(x,y,w,h),withAttributes:[.font:font,.foregroundColor:color,.paragraphStyle:p])
}
func cropImage(_ scene: Scene)->CGImage {
 let img=NSImage(contentsOfFile:scene.screenshot)!
 var r=CGRect(origin:.zero,size:img.size)
 let cg=img.cgImage(forProposedRect:&r,context:nil,hints:nil)!
 let c=scene.crop
 return cg.cropping(to:CGRect(x:c[0]*Double(cg.width),y:c[1]*Double(cg.height),width:c[2]*Double(cg.width),height:c[3]*Double(cg.height)))!
}
let images=scenes.map(cropImage)
let audios=scenes.map { AVURLAsset(url:URL(fileURLWithPath:$0.audio)) }
let durations=audios.map { ceil((CMTimeGetSeconds($0.duration)+(lively ? 0.55 : 1.2))*Double(fps))/Double(fps) }
let totalDuration=durations.reduce(0,+)
let mascot=NSImage(contentsOfFile:root.deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("assets/mascot-head.svg").path)

func render(_ index:Int,_ progress:Double,_ elapsed:Double)->CGImage {
 let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:W,pixelsHigh:H,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:rep)!
 let ctx=NSGraphicsContext.current!.cgContext
 col(0xFAF6F1).setFill();NSBezierPath(rect:CGRect(x:0,y:0,width:W,height:H)).fill()
 box(0,0,1920,12,red,0)
 mascot?.draw(in:rect(55,40,76,70))
 txt("Trako Order Exporter",147,53,900,50,32,true)
 txt("SHOPEE PHILIPPINES · QUICK TUTORIAL",147,98,1000,32,17,false,muted)
 txt(String(format:"%02d / %02d",index+1,scenes.count),1710,65,160,50,24,true,muted)
 let scene=scenes[index]
 box(56,185,510,48,col(0xFCE7DC),14)
 txt(scene.step.uppercased(),76,196,475,40,19,true,red)
 txt(scene.title,58,269,505,200,48,true)
 txt(scene.body,60,490,480,260,27,false,muted)
 box(60,792,474,100,col(0xFFFFFF),18,border)
 txt(scene.callout,82,813,430,70,22,true,red)
 box(610,184,1254,708,col(0xF0E6DF),24,border)
 let area=rect(632,206,1210,664)
 let img=images[index]
 let scale=min(area.width/CGFloat(img.width),area.height/CGFloat(img.height))
 // A gentle push-in keeps screenshots readable without changing their content.
 let zoom=1+0.018*progress
 let dw=CGFloat(img.width)*scale*zoom, dh=CGFloat(img.height)*scale*zoom
 ctx.saveGState();ctx.addPath(CGPath(roundedRect:area,cornerWidth:14,cornerHeight:14,transform:nil));ctx.clip()
 ctx.interpolationQuality = .high
 ctx.draw(img,in:CGRect(x:area.midX-dw/2,y:area.midY-dh/2,width:dw,height:dh))
 ctx.restoreGState()
 txt("ACTUAL SCREENSHOTS · PERSONAL ACCOUNT AREAS CROPPED",633,907,1200,30,15,false,muted)
 box(60,972,1800,6,border,3)
 box(60,972,max(8,1800*elapsed/totalDuration),6,red,3)
 txt("Load your orders  →  Scan with Trako  →  Save your CSV",60,1003,1500,40,20,false,muted)
 NSGraphicsContext.restoreGraphicsState()
 return rep.cgImage!
}

let writer=try AVAssetWriter(outputURL:silent,fileType:.mov)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:5_000_000,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel]])
let attrs:[String:Any]=[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true]
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:attrs)
writer.add(input);guard writer.startWriting() else { fatalError(writer.error!.localizedDescription) };writer.startSession(atSourceTime:.zero)
var frame:Int64=0
for idx in scenes.indices {
 let frames=Int((durations[idx]*Double(fps)).rounded())
 let preview=render(idx,0.5,Double(frame)/Double(fps))
 try NSBitmapImageRep(cgImage:preview).representation(using:.png,properties:[:])!.write(to:root.appendingPathComponent("scene-\(idx+1).png"))
 for f in 0..<frames {
  autoreleasepool {
   while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval:0.005) }
   var buffer:CVPixelBuffer?
   guard CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault,adaptor.pixelBufferPool!,&buffer)==kCVReturnSuccess,let pb=buffer else { fatalError("Buffer creation failed") }
   CVPixelBufferLockBaseAddress(pb,[])
   let bitmap=CGContext(data:CVPixelBufferGetBaseAddress(pb),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(pb),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
   bitmap.draw(render(idx,Double(f)/Double(frames),Double(frame)/Double(fps)),in:CGRect(x:0,y:0,width:W,height:H))
   CVPixelBufferUnlockBaseAddress(pb,[])
   guard adaptor.append(pb,withPresentationTime:CMTime(value:frame,timescale:fps)) else { fatalError(writer.error?.localizedDescription ?? "Append failed") }
   frame+=1
  }
 }
 print("Rendered scene \(idx+1)")
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else {fatalError(writer.error?.localizedDescription ?? "Encoding failed")}
let comp=AVMutableComposition(), asset=AVURLAsset(url:silent)
let vt=comp.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!
try vt.insertTimeRange(CMTimeRange(start:.zero,duration:asset.duration),of:asset.tracks(withMediaType:.video)[0],at:.zero)
let at=comp.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
var offset=0.0, captions="", transcript=""
func timestamp(_ t:Double)->String { let ms=Int((t*1000).rounded());return String(format:"%02d:%02d:%02d,%03d",ms/3600000,(ms/60000)%60,(ms/1000)%60,ms%1000) }
var cue=1
for i in scenes.indices {
 let a=audios[i]
 try at.insertTimeRange(CMTimeRange(start:.zero,duration:a.duration),of:a.tracks(withMediaType:.audio)[0],at:CMTime(seconds:offset+0.2,preferredTimescale:600))
 let sentences=scenes[i].narration.components(separatedBy:". ")
 let audioDuration=CMTimeGetSeconds(a.duration)
 let totalChars=sentences.reduce(0){$0+$1.count}
 var position=offset+0.2
 for sentence in sentences {
  let length=audioDuration*Double(sentence.count)/Double(totalChars)
  captions+="\(cue)\n\(timestamp(position)) --> \(timestamp(position+length))\n\(sentence)\n\n"
  position+=length;cue+=1
 }
 transcript+="\(scenes[i].step)\n\(scenes[i].narration)\n\n"
 offset+=durations[i]
}
try captions.write(to:root.appendingPathComponent("captions-en.srt"),atomically:true,encoding:.utf8)
try transcript.write(to:root.appendingPathComponent("narration.txt"),atomically:true,encoding:.utf8)
let exporter=AVAssetExportSession(asset:comp,presetName:AVAssetExportPresetHighestQuality)!
exporter.outputURL=output;exporter.outputFileType = .mp4;exporter.shouldOptimizeForNetworkUse=true
let exported=DispatchSemaphore(value:0);exporter.exportAsynchronously{exported.signal()};exported.wait()
guard exporter.status == .completed else {fatalError(exporter.error?.localizedDescription ?? "Export failed")}
try FileManager.default.removeItem(at:silent)
print("Created: \(output.path)\nDuration: \(totalDuration)s; 1920 × 1080, H.264 + narration")
