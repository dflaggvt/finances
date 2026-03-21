import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bill Manager",
  description: "Household bill management and cash flow tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
