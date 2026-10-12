import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// The real production domain — used to resolve every relative canonical/
// OG/Twitter URL below. Falls back to the env var so a Vercel preview
// deployment still gets valid (if different) absolute URLs instead of
// silently resolving against examplecontent.co.nz.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://examplecontent.co.nz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Example Content — Photo & Video Production Studio, Auckland NZ",
    template: "%s | Example Content",
  },
  description:
    "Example Content is an Auckland-based photo and video production studio specialising in architectural, commercial and event content across Auckland, Waikato and the Bay of Plenty — available nationwide.",
  keywords: [
    "property videography Auckland",
    "real estate photography Auckland",
    "architectural photography New Zealand",
    "commercial video production Auckland",
    "event videography Auckland",
    "construction site update photography",
  ],
  authors: [{ name: "Example Content" }],
  alternates: { canonical: "/" },
  icons: { icon: "/icon.png" },
  openGraph: {
    type: "website",
    locale: "en_NZ",
    url: "/",
    siteName: "Example Content",
    title: "Example Content — Photo & Video Production Studio, Auckland NZ",
    description:
      "Architectural, commercial and event photo and video production across Auckland, Waikato and the Bay of Plenty — available nationwide.",
    images: [{ url: "/images/work/wolfbrook/1.jpg", width: 2000, height: 1125, alt: "Example Content — photo and video production" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Example Content — Photo & Video Production Studio, Auckland NZ",
    description:
      "Architectural, commercial and event photo and video production across Auckland, Waikato and the Bay of Plenty — available nationwide.",
    images: ["/images/work/wolfbrook/1.jpg"],
  },
  robots: { index: true, follow: true },
};

// LocalBusiness structured data — static and site-wide (not per-page),
// so every page carries the same business identity for search engines
// without needing its own copy of this block.
const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Example Content",
  description:
    "Photo and video production studio specialising in architectural, commercial and event content.",
  url: SITE_URL,
  email: "cody@examplecontent.co.nz",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Auckland",
    addressCountry: "NZ",
  },
  areaServed: ["Auckland", "Waikato", "Bay of Plenty", "New Zealand"],
  sameAs: ["https://vimeo.com/user158762674"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-NZ"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
