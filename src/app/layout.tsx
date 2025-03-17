
import type { Metadata } from "next";
import "./globals.css";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";
// ElementsProvider removed - using zustand directly

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
      <body className={`antialiased`}>
        <EventProvider>
          <TranscriptProvider>
            {children}
          </TranscriptProvider>
        </EventProvider>
      </body>
    </html>
  );
}
