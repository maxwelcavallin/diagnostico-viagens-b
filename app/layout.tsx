import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import MetaPixel from "@/components/MetaPixel"
import GTM, { GTMNoScript } from "@/components/GTM"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover é obrigatório para env(safe-area-inset-*) funcionar no Safari iOS
  viewportFit: "cover",
  themeColor: "#111111",
}

export const metadata: Metadata = {
  title: "Diagnóstico de Viagens | Viagente",
  description:
    "Descubra quanto as suas viagens estão custando a mais. E receba a análise de um estrategista, não de um robô.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <GTM />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className={`${inter.variable} antialiased`} style={{ fontFamily: "var(--font-inter)" }}>
        <GTMNoScript />
        <MetaPixel />
        {children}
      </body>
    </html>
  )
}
