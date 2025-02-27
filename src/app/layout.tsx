import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthCare Digital Twin",
  description: "A demo app written by Rassifarhat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
