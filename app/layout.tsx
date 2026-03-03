import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Customs Service - NSW Mock",
  description: "Mock customs service for NSW workflow testing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}