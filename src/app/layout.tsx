import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "$TAP — Chop. Collect. Compete.",
  description:
    "$TAP is a competitive arcade game. Chop trees, dodge red candles, collect green candles, and climb the leaderboard.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#070d0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Titan+One&family=Rubik:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/assets/ui/avatar-default.png" type="image/png" />
      </head>
      <body>
        <Providers>
          <div className="page">
            <div className="site-art-backdrop" aria-hidden="true">
              <div className="site-art site-art-sky" />
              <div className="site-art site-art-far" />
              <div className="site-art site-art-mid" />
              <div className="site-art site-art-front" />
            </div>
            <Nav />
            <main className="page-main">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
