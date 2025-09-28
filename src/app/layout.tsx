import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./providers/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
    <html lang="en">
      <body className={`${jetbrainsMono.variable} font-primary antialiased`}>
        <ConvexClientProvider>
          <SessionProvider>{children}</SessionProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
