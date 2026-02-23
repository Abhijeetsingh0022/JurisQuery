import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { cn } from "@/lib/utils";
import QueryProvider from "@/components/providers/QueryProvider";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JurisQuery | Intelligent Legal Assistant",
  description: "Simplify complex document analysis with JurisQuery.ai. Upload contracts, ask questions, and get instant, citation-backed answers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          footerPagesLink: "hidden",
        },
      }}
    >
      <html lang="en">
        <body
          className={cn(
            outfit.variable,
            playfair.variable,
            "antialiased bg-background text-foreground font-sans"
          )}
        >
          <QueryProvider>
            {children}
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
