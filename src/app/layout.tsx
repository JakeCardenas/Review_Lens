import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ReviewLens", template: "%s | ReviewLens" },
  description: "Upload a CSV of customer reviews to see sentiment, common topics and trends without reading every review.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0b100d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="gutter mx-auto w-full max-w-6xl pb-32 pt-6 sm:pb-16 sm:pt-8">
          {children}
        </main>
        <Toaster position="top-center" closeButton offset={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)" }} />
      </body>
    </html>
  );
}
