// ==============================================================================
// 脚本名称：svg_rasterize.swift
// 核心功能：用手写 SVG 精确栅格化出 PNG（保留原作者排版与配色）
// ------------------------------------------------------------------------------
// 为什么需要它：macOS 自带的 qlmanage 对"细长比例"的 SVG 会做非等比拉伸，
//              出图会变形，不能用于交付；本脚本走系统 WebKit 精确渲染，
//              尺寸与 SVG 的 width/height 完全一致。
// 使用方式：由 scripts/svg2png.sh 自动编译并调用，也可直接
//          swiftc -O scripts/svg_rasterize.swift -o <二进制> 后传参调用。
// 参数：<输入.svg> <输出.png> <宽> <高>
// ==============================================================================

import AppKit
import WebKit

let args = CommandLine.arguments
guard args.count >= 5 else {
    print("用法: svg_rasterize <in.svg> <out.png> <宽> <高>")
    exit(2)
}
let inPath = args[1]
let outPath = args[2]
let w = Double(args[3]) ?? 1120
let h = Double(args[4]) ?? 1560

let svg: String
do {
    svg = try String(contentsOfFile: inPath, encoding: .utf8)
} catch {
    print("读取失败: \(inPath)")
    exit(1)
}

let html = """
<html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}</style>
</head><body>\(svg)</body></html>
"""

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

final class NavDelegate: NSObject, WKNavigationDelegate {
    var finished = false
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { finished = true }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("加载失败: \(error.localizedDescription)")
        exit(1)
    }
}

let view = WKWebView(frame: NSRect(x: 0, y: 0, width: w, height: h))
let nav = NavDelegate()
view.navigationDelegate = nav
view.loadHTMLString(html, baseURL: URL(fileURLWithPath: inPath).deletingLastPathComponent())

let limit = Date().addingTimeInterval(20)
while !nav.finished && Date() < limit {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05))
}
if !nav.finished {
    print("渲染超时: \(inPath)")
    exit(1)
}

let snapshotConfig = WKSnapshotConfiguration()
snapshotConfig.rect = NSRect(x: 0, y: 0, width: w, height: h)

var snapshotDone = false
view.takeSnapshot(with: snapshotConfig) { image, error in
    defer { snapshotDone = true }
    guard let image = image,
          let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:]) else {
        print("快照失败: \(error?.localizedDescription ?? "未知原因")")
        exit(1)
    }
    do {
        try png.write(to: URL(fileURLWithPath: outPath))
        print("已输出 \(outPath) \(Int(image.size.width))x\(Int(image.size.height))")
    } catch {
        print("写入失败: \(outPath)")
        exit(1)
    }
}
while !snapshotDone && Date() < limit.addingTimeInterval(15) {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05))
}
