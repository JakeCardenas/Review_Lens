import type { Metadata, Viewport } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Rounded Nunito for headings, numbers and buttons; Nunito Sans for reading. Self-hosted at build time.
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ReviewLens", template: "%s | ReviewLens" },
  description: "Upload a CSV of customer reviews to see sentiment, common topics and trends without reading every review.",
  applicationName: "ReviewLens",
  appleWebApp: { title: "ReviewLens", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${nunitoSans.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="gutter mx-auto w-full max-w-[75rem] flex-1 pb-20 pt-8 sm:pt-12">
          {children}
        </main>
        <SiteFooter />
        <Toaster
          position="top-center"
          theme="light"
          closeButton
          offset={{ top: "calc(env(safe-area-inset-top, 0px) + 72px)" }}
          toastOptions={{ classNames: { toast: "rounded-card! border! border-line! font-sans! font-bold! text-ink! shadow-float!" } }}
        />
      </body>
    </html>
  );
}
