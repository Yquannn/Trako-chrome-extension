import AppKit
let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
guard let mascot = NSImage(contentsOf: root.appendingPathComponent("assets/mascot-head.svg")) else { fatalError("Mascot not found") }
for size in [16, 32, 48, 128] {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current!.imageInterpolation = .high
    let box = CGFloat(size), inset = box * 0.04
    let ratio = min((box - inset * 2) / mascot.size.width, (box - inset * 2) / mascot.size.height)
    let w = mascot.size.width * ratio, h = mascot.size.height * ratio
    mascot.draw(in: NSRect(x: (box-w)/2, y: (box-h)/2, width: w, height: h))
    NSGraphicsContext.restoreGraphicsState()
    try rep.representation(using: .png, properties: [:])!.write(to: root.appendingPathComponent("assets/icon-\(size).png"))
}
