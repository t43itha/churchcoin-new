import type { Metadata } from "next";
import { JetBrains_Mono, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ConvexClientProvider } from "./providers/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";

// Swiss Ledger Typography
// DM Sans: Headlines and body text - geometric, modern, trustworthy
const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// JetBrains Mono: Numbers and data - precision, financial clarity
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ChurchCoin - AI-First Church Finance Management",
  description: "Intelligent financial management platform designed specifically for small UK churches",
  keywords: ["church finance", "charity accounting", "gift aid", "UK churches", "financial management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
          <ConvexClientProvider>
            <SessionProvider>
              {children}
            </SessionProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
