import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"

const ppNeueMontreal = localFont({
  src: "../public/fonts/PPNeueMontreal-Medium.ttf",
  variable: "--font-pp-neue-montreal",
  display: "swap",
})

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={ppNeueMontreal.variable}>
      <body className="font-pp-neue-montreal font-medium">{children}</body>
    </html>
  )
}
