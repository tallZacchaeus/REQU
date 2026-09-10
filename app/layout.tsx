import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Source_Sans_3 } from "next/font/google"

import { AppShell } from "@/components/app/shell"
import { ToastProvider } from "@/components/app/toast"
import { SessionProvider } from "@/lib/session"
import { RequisitionStore } from "@/lib/store"

import "./globals.css"

// Source Sans is a civic/administrative workhorse with real tabular figures —
// it reads like a document rather than a product.
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

// Reserved for reference numbers only. Mono IDs are the cheapest way to make
// an admin system feel like a record system.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "REQU · Requisitions",
  description:
    "Church Worker Management System — raise, submit and track programme funding requisitions.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a1520",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SessionProvider>
          <RequisitionStore>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </RequisitionStore>
        </SessionProvider>
      </body>
    </html>
  )
}
