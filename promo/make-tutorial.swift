import AppKit
import AVFoundation
import CoreVideo
import CoreMedia
import ImageIO

let width = 1280
let height = 720
let fps: Int32 = 30
let outDir = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let audioURL = URL(fileURLWithPath: CommandLine.arguments[2])
let silentURL = outDir.appendingPathComponent("tutorial-silent.mov")
let finalURL = outDir.appendingPathComponent("trako-order-exporter-tutorial.mp4")
try? FileManager.default.removeItem(at: silentURL)
try? FileManager.default.removeItem(at: finalURL)

struct Scene {
  let eyebrow: String
  let title: String
  let lines: [String]
  let visual: String
  let duration: Double
}
let scenes = [
  Scene(eyebrow: "SHOPEE PHILIPPINES WALKTHROUGH", title: "Your orders.\nOne clear CSV.", lines: ["A quick guide to exporting your\nShopee purchase history with Trako."], visual: "cover", duration: 5),
  Scene(eyebrow: "01  ·  OPEN YOUR HISTORY", title: "Start on Shopee", lines: ["Install Trako from the Chrome Web Store.", "Sign in to Shopee normally, then open\nMy Purchases."], visual: "history", duration: 8),
  Scene(eyebrow: "02  ·  LOAD WHAT YOU NEED", title: "Load your orders", lines: ["Scroll through the history.", "Choose Load More when it appears.", "Trako reads orders currently loaded\non the page."], visual: "load", duration: 7),
  Scene(eyebrow: "03  ·  EXPORT", title: "Scan and export", lines: ["Open the Trako panel and select\nExport orders to CSV.", "Completed orders are eligible. Other\nstatuses are skipped.", "Cancel, retry, or scan again anytime."], visual: "scan", duration: 14),
  Scene(eyebrow: "04  ·  SAVE YOUR FILE", title: "Open the CSV", lines: ["Save the download, then open it in\nyour spreadsheet app.", "Trako includes details it can read from\nthe rendered page. Some fields or dates\nmay be blank if Shopee doesn't show them."], visual: "csv", duration: 12),
  Scene(eyebrow: "PRIVATE BY DESIGN", title: "Your data stays yours", lines: ["Order data is processed in your browser\nand is not sent to Trako servers.", "Export only your own purchase history.", "Trako Order Exporter"], visual: "privacy", duration: 9)
]

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
  NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: alpha)
}
let ink = color(0x38231E), sub = color(0x80665D), red = color(0xF04435), pale = color(0xFFF7F0), cream = color(0xFFFCF8), line = color(0xF0D9CE), green = color(0x2AAB76), blue = color(0x315CD6)
func rounded(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ radius: CGFloat, _ fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
  let rect = CGRect(x: x, y: CGFloat(height) - y - h, width: w, height: h)
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
  fill.setFill(); path.fill()
  if let stroke { stroke.setStroke(); path.lineWidth = lineWidth; path.stroke() }
}
func text(_ value: String, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ size: CGFloat, _ fontName: String = "AvenirNext-Medium", _ tint: NSColor = ink) {
  let font = NSFont(name: fontName, size: size) ?? NSFont.systemFont(ofSize: size, weight: .medium)
  let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: tint]
  let rect = CGRect(x: x, y: CGFloat(height) - y - 150, width: w, height: 150)
  (value as NSString).draw(in: rect, withAttributes: attrs)
}
func circle(_ x: CGFloat, _ y: CGFloat, _ diameter: CGFloat, _ fill: NSColor) {
  let rect = CGRect(x: x, y: CGFloat(height) - y - diameter, width: diameter, height: diameter)
  fill.setFill(); NSBezierPath(ovalIn: rect).fill()
}
func lineDraw(_ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat, _ tint: NSColor, _ thickness: CGFloat = 2) {
  let p = NSBezierPath(); p.move(to: CGPoint(x: x1, y: CGFloat(height) - y1)); p.line(to: CGPoint(x: x2, y: CGFloat(height) - y2)); tint.setStroke(); p.lineWidth = thickness; p.stroke()
}
func pill(_ label: String, x: CGFloat, y: CGFloat, w: CGFloat, fill: NSColor, tint: NSColor) {
  rounded(x, y, w, 30, 15, fill)
  text(label, x + 13, y + 7, w - 20, 13, "AvenirNext-DemiBold", tint)
}
func drawBrowser() {
  rounded(675, 118, 535, 480, 18, cream, stroke: line)
  rounded(675, 118, 535, 50, 18, color(0xF3E9E3))
  circle(696, 136, 12, color(0xFC655A)); circle(716, 136, 12, color(0xF3C45A)); circle(736, 136, 12, color(0x6FC486))
  rounded(770, 129, 405, 28, 13, color(0xFFFFFF))
  text("shopee.ph/user/purchase/", 787, 136, 365, 16, "AvenirNext-Medium", sub)
  rounded(695, 185, 495, 56, 12, color(0xFFF0E8))
  text("My Purchases", 716, 201, 200, 20, "AvenirNext-DemiBold", ink)
  text("All       To Pay       To Ship       Completed", 715, 222, 455, 14, "AvenirNext-Medium", sub)
  lineDraw(713, 244, 1170, 244, line)
  for idx in 0..<3 {
    let top = CGFloat(263 + idx * 91)
    rounded(695, top, 495, 76, 10, color(0xFFFFFF), stroke: line)
    rounded(708, top + 12, 50, 50, 8, color(0xF6E9E2))
    text("Order item", 775, top + 15, 220, 16, "AvenirNext-DemiBold", ink)
    text("Product details on Shopee", 775, top + 38, 250, 14, "AvenirNext-Medium", sub)
    pill(idx == 1 ? "COMPLETED" : "ORDER", x: 1050, y: top + 21, w: idx == 1 ? 112 : 78, fill: idx == 1 ? color(0xE7F7EF) : color(0xF4EFEC), tint: idx == 1 ? green : sub)
  }
}
func drawPanel(_ showProgress: Bool = false) {
  rounded(890, 236, 300, 326, 16, cream, stroke: line, lineWidth: 2)
  circle(912, 254, 36, pale); text("T", 924, 260, 18, 20, "AvenirNext-Bold", red)
  text("Trako Order Exporter", 958, 257, 210, 17, "AvenirNext-DemiBold", ink)
  text(showProgress ? "Checking loaded orders…" : "Ready to export", 912, 306, 240, 15, "AvenirNext-Medium", sub)
  if showProgress {
    rounded(912, 343, 252, 10, 5, line); rounded(912, 343, 169, 10, 5, red)
    text("Progress visible on the page", 912, 366, 240, 14, "AvenirNext-Medium", sub)
    rounded(912, 397, 252, 57, 10, color(0xFFFFFF), stroke: line)
    text("Skipped product", 927, 407, 220, 14, "AvenirNext-DemiBold", ink)
    text("A reason is shown when available", 927, 428, 225, 12, "AvenirNext-Medium", sub)
    rounded(912, 470, 252, 36, 8, color(0xFFFFFF), stroke: line)
    text("Retry scan", 1000, 479, 120, 16, "AvenirNext-DemiBold", red)
  } else {
    text("Only currently loaded orders are included.", 912, 343, 252, 14, "AvenirNext-Medium", sub)
    rounded(912, 390, 252, 48, 10, red)
    text("Export orders to CSV", 958, 405, 180, 17, "AvenirNext-DemiBold", color(0xFFFFFF))
    rounded(912, 454, 252, 40, 9, color(0xFFFFFF), stroke: line)
    text("Scan again", 995, 465, 110, 15, "AvenirNext-DemiBold", sub)
  }
}
func drawVisual(_ visual: String) {
  switch visual {
  case "cover":
    rounded(688, 185, 488, 352, 24, cream, stroke: line, lineWidth: 2)
    circle(725, 221, 76, red); text("T", 750, 236, 35, 40, "AvenirNext-Bold", color(0xFFFFFF))
    text("Trako Order", 826, 229, 300, 27, "AvenirNext-DemiBold", ink)
    text("Exporter", 826, 268, 300, 27, "AvenirNext-DemiBold", red)
    text("Local CSV export for your\nShopee Philippines history", 726, 350, 400, 20, "AvenirNext-Medium", sub)
    pill("CHROME EXTENSION", x: 726, y: 454, w: 188, fill: color(0xFFF0E8), tint: red)
  case "history", "load":
    drawBrowser()
    if visual == "load" {
      rounded(820, 534, 272, 42, 10, blue)
      text("Load More orders", 884, 545, 200, 17, "AvenirNext-DemiBold", color(0xFFFFFF))
    }
  case "scan":
    drawBrowser(); drawPanel(true)
    rounded(906, 160, 258, 44, 9, red)
    text("Export orders to CSV", 949, 173, 190, 16, "AvenirNext-DemiBold", color(0xFFFFFF))
  case "csv":
    rounded(706, 171, 473, 383, 17, cream, stroke: line, lineWidth: 2)
    rounded(706, 171, 473, 62, 17, color(0xF3E9E3))
    text("trako-shopee-orders.csv", 734, 193, 400, 20, "AvenirNext-DemiBold", ink)
    let cols: [(String, CGFloat)] = [("Platform", 126), ("Order ID", 108), ("Product", 135), ("Quantity", 95)]
    var x: CGFloat = 724
    for (label, cw) in cols { rounded(x, 256, cw, 43, 6, color(0xFFF0E8)); text(label, x + 9, 270, cw - 12, 13, "AvenirNext-DemiBold", red); x += cw + 5 }
    for row in 0..<4 {
      var cx: CGFloat = 724
      for (_, cw) in cols { rounded(cx, CGFloat(311 + row * 43), cw, 34, 4, color(0xFFFFFF), stroke: line); cx += cw + 5 }
    }
    text("One product per row · available fields included", 733, 505, 420, 15, "AvenirNext-Medium", sub)
  default:
    rounded(706, 167, 485, 395, 22, cream, stroke: line, lineWidth: 2)
    circle(901, 210, 92, color(0xE8F7EF)); text("LOCAL", 920, 245, 70, 15, "AvenirNext-Bold", green)
    rounded(746, 350, 180, 68, 12, color(0xFFF0E8)); text("Your browser", 779, 375, 140, 17, "AvenirNext-DemiBold", ink)
    rounded(983, 350, 170, 68, 12, color(0xF0F3FF)); text("CSV file", 1027, 375, 100, 17, "AvenirNext-DemiBold", blue)
    lineDraw(931, 384, 978, 384, red, 4)
    text("No account connection. No server upload.", 745, 470, 420, 17, "AvenirNext-Medium", sub)
  }
}
func render(_ scene: Scene, index: Int) -> CGImage {
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  let ctx = NSGraphicsContext(bitmapImageRep: rep)!
  NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = ctx
  color(0xFAF7F3).setFill(); NSBezierPath(rect: CGRect(x: 0, y: 0, width: width, height: height)).fill()
  rounded(0, 0, 1280, 10, 0, red)
  circle(48, 45, 34, red); text("T", 59, 49, 16, 22, "AvenirNext-Bold", color(0xFFFFFF))
  text("TRAKO", 92, 50, 120, 16, "AvenirNext-DemiBold", ink)
  text("ORDER EXPORTER", 212, 51, 210, 13, "AvenirNext-Medium", sub)
  text("\(index + 1) / \(scenes.count)", 1150, 52, 90, 13, "AvenirNext-DemiBold", sub)
  text(scene.eyebrow, 54, 156, 565, 14, "AvenirNext-DemiBold", red)
  text(scene.title, 54, 198, 570, 38, "AvenirNext-Bold", ink)
  let y: CGFloat = scene.title.contains("\n") ? 310 : 281
  for (i, line) in scene.lines.enumerated() { text(line, 56, y + CGFloat(i) * 56, 555, 19, "AvenirNext-Medium", sub) }
  drawVisual(scene.visual)
  rounded(54, 641, 1172, 1, 0, line)
  rounded(54, 658, CGFloat(1172 * (index + 1)) / CGFloat(scenes.count), 5, 3, red)
  NSGraphicsContext.restoreGraphicsState()
  return rep.cgImage!
}

let writer = try AVAssetWriter(outputURL: silentURL, fileType: .mov)
let videoSettings: [String: Any] = [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height, AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 2_500_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
input.expectsMediaDataInRealTime = false
let attrs: [String: Any] = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height, kCVPixelBufferCGImageCompatibilityKey as String: true, kCVPixelBufferCGBitmapContextCompatibilityKey as String: true]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attrs)
guard writer.canAdd(input) else { fatalError("Cannot add video input") }
writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)
var frame: Int64 = 0
for (idx, scene) in scenes.enumerated() {
  let image = render(scene, index: idx)
  let preview = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])!
  try preview.write(to: URL(fileURLWithPath: "/tmp/trako-tutorial-frame-\(idx + 1).png"))
  let count = Int(scene.duration * Double(fps))
  for _ in 0..<count {
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.005) }
    var buffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, adaptor.pixelBufferPool!, &buffer)
    guard let pb = buffer else { fatalError("Pixel buffer allocation failed") }
    CVPixelBufferLockBaseAddress(pb, [])
    let bitmap = CGContext(data: CVPixelBufferGetBaseAddress(pb), width: width, height: height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
    bitmap.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    CVPixelBufferUnlockBaseAddress(pb, [])
    let time = CMTime(value: frame, timescale: fps)
    if !adaptor.append(pb, withPresentationTime: time) { fatalError(writer.error?.localizedDescription ?? "Frame append failed") }
    frame += 1
  }
}
input.markAsFinished()
let videoFinished = DispatchSemaphore(value: 0)
writer.finishWriting { videoFinished.signal() }
videoFinished.wait()
if writer.status != .completed { fatalError(writer.error?.localizedDescription ?? "Video encoding failed") }

let composition = AVMutableComposition()
let sourceVideo = AVURLAsset(url: silentURL)
let sourceAudio = AVURLAsset(url: audioURL)
guard let videoTrack = sourceVideo.tracks(withMediaType: .video).first,
      let compVideo = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else { fatalError("Video track missing") }
try compVideo.insertTimeRange(CMTimeRange(start: .zero, duration: sourceVideo.duration), of: videoTrack, at: .zero)
if let audioTrack = sourceAudio.tracks(withMediaType: .audio).first,
   let compAudio = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
  try compAudio.insertTimeRange(CMTimeRange(start: .zero, duration: min(sourceAudio.duration, sourceVideo.duration)), of: audioTrack, at: .zero)
}
guard let session = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else { fatalError("Could not create export session") }
session.outputURL = finalURL
session.outputFileType = .mp4
session.shouldOptimizeForNetworkUse = true
let exportDone = DispatchSemaphore(value: 0)
session.exportAsynchronously { exportDone.signal() }
exportDone.wait()
if session.status != .completed { fatalError(session.error?.localizedDescription ?? "MP4 export failed") }
try? FileManager.default.removeItem(at: silentURL)
print("Created \(finalURL.path)")
print("Duration: \(CMTimeGetSeconds(sourceVideo.duration)) seconds; narration: \(CMTimeGetSeconds(sourceAudio.duration)) seconds")
