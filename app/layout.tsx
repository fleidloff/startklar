import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-game" });

export const metadata: Metadata = {
  title: "Flughafen-Manager: Startklar!",
  description: "Ein entspanntes Flughafen-Spiel für Kinder: Flugzeuge landen, abfertigen und in die Welt schicken.",
  appleWebApp: { capable: true, title: "Startklar!" },
};

export const viewport: Viewport = {
  themeColor: "#8fd0f5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={fredoka.variable}>
      <body>{children}</body>
    </html>
  );
}
