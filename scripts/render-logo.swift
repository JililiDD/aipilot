#!/usr/bin/env swift

import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct Palette {
    let arc: CGColor
    let cyan = CGColor(red: 0x18 / 255, green: 0xC9 / 255, blue: 0xE8 / 255, alpha: 1)
    let blue = CGColor(red: 0x28 / 255, green: 0x68 / 255, blue: 0xF0 / 255, alpha: 1)
    let violet = CGColor(red: 0x73 / 255, green: 0x57 / 255, blue: 0xE8 / 255, alpha: 1)
    let control = CGColor(red: 0x22 / 255, green: 0xC7 / 255, blue: 0xE8 / 255, alpha: 1)
}

private let lightPalette = Palette(
    arc: CGColor(red: 0x28 / 255, green: 0x68 / 255, blue: 0xF0 / 255, alpha: 1)
)
private let darkPalette = Palette(
    arc: CGColor(red: 0xEA / 255, green: 0xF4 / 255, blue: 1, alpha: 1)
)

func drawLogo(size: Int, palette: Palette, output: URL) throws {
    guard let context = CGContext(
        data: nil,
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        throw NSError(domain: "AIPilotLogo", code: 1)
    }

    let scale = CGFloat(size) / 1024
    context.scaleBy(x: scale, y: scale)
    context.setLineWidth(56)
    context.setLineCap(.round)
    context.setStrokeColor(palette.arc)

    for startAngle in stride(from: 20.0, through: 290.0, by: 90.0) {
        context.addArc(
            center: CGPoint(x: 512, y: 512),
            radius: 340,
            startAngle: CGFloat(startAngle * .pi / 180),
            endAngle: CGFloat((startAngle + 50) * .pi / 180),
            clockwise: false
        )
        context.strokePath()
    }

    func fillCircle(center: CGPoint, color: CGColor) {
        context.setFillColor(color)
        context.fillEllipse(in: CGRect(x: center.x - 72, y: center.y - 72, width: 144, height: 144))
    }

    fillCircle(center: CGPoint(x: 512, y: 904), color: palette.cyan)
    fillCircle(center: CGPoint(x: 904, y: 512), color: palette.violet)
    fillCircle(center: CGPoint(x: 512, y: 120), color: palette.cyan)
    fillCircle(center: CGPoint(x: 120, y: 512), color: palette.blue)

    let control = CGMutablePath()
    control.move(to: CGPoint(x: 476, y: 613))
    control.addCurve(
        to: CGPoint(x: 448, y: 596),
        control1: CGPoint(x: 458, y: 623),
        control2: CGPoint(x: 448, y: 616)
    )
    control.addLine(to: CGPoint(x: 448, y: 428))
    control.addCurve(
        to: CGPoint(x: 476, y: 411),
        control1: CGPoint(x: 448, y: 408),
        control2: CGPoint(x: 458, y: 401)
    )
    control.addLine(to: CGPoint(x: 621, y: 495))
    control.addCurve(
        to: CGPoint(x: 621, y: 529),
        control1: CGPoint(x: 650, y: 512),
        control2: CGPoint(x: 650, y: 512)
    )
    control.closeSubpath()
    context.addPath(control)
    context.setFillColor(palette.control)
    context.fillPath()

    guard let image = context.makeImage(),
          let destination = CGImageDestinationCreateWithURL(
              output as CFURL,
              UTType.png.identifier as CFString,
              1,
              nil
          ) else {
        throw NSError(domain: "AIPilotLogo", code: 2)
    }

    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else {
        throw NSError(domain: "AIPilotLogo", code: 3)
    }
}

let repository = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
try drawLogo(size: 1024, palette: lightPalette, output: repository.appendingPathComponent("assets/logo.png"))
try drawLogo(size: 1024, palette: darkPalette, output: repository.appendingPathComponent("assets/logo-dark.png"))
try drawLogo(size: 512, palette: lightPalette, output: repository.appendingPathComponent("assets/icon.png"))
