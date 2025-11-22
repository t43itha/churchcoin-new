import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ConvexClientProvider } from "./providers/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
  const disableClerk = process.env.NEXT_PUBLIC_CLERK_DISABLE === "1";

  if (disableClerk) {
    return (
      <html lang="en">
        <body className={`${jetbrainsMono.variable} font-primary antialiased`}>
          {children}
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
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
