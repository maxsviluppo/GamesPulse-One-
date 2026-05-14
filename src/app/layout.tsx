import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "GamesPulse | Your Daily Gaming Intel",
  description: "Il polso del gaming in tempo reale. Notizie, video, trailer e recensioni dai principali siti italiani e internazionali aggregati in un'unica esperienza premium.",
  metadataBase: new URL("https://www.gamespulse.it"),
  openGraph: {
    title: "GamesPulse | Your Daily Gaming Intel",
    description: "Il polso del gaming in tempo reale. Notizie, video, trailer e recensioni dai principali siti aggregati.",
    url: "https://www.gamespulse.it",
    siteName: "GamesPulse",
    images: [
      {
        url: "/spotsmart.png",
        width: 1200,
        height: 630,
        alt: "GamesPulse Preview",
      },
    ],
    locale: "it_IT",
    type: "website",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full antialiased bg-black text-white">
      <body className="min-h-full flex flex-col overflow-x-hidden select-none">
        {children}
      </body>
    </html>
  );
}
