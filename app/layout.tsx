import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bingo Master Dashboard",
  description: "بینگۆ مستەر داشبۆرد",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ckb">
      <body className="bg-white antialiased">{children}</body>
    </html>
  );
}
