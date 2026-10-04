import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const satoshi = localFont({
  src: [
    { path: "./fonts/satoshi-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/satoshi-medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/satoshi-bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Folio — Your LaTeX workspace",
  description:
    "Write LaTeX, preview real PDFs, and manage your team's projects.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={satoshi.variable}>
      <body>
        {children}
        {process.env.NODE_ENV === "development" && (
          <>
            {/* Impeccable injects its local helper inside this development-only fragment. */}
          </>
        )}
      </body>
    </html>
  );
}
