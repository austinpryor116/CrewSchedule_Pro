import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "CrewSchedule Pro - Airline Crew Schedule & CBA Suite",
  description: "Cell-phone optimized airline pilot & flight attendant schedule, FAR 117 legality, CBA pay calculator, and dispatch weather suite.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CrewSchedule Pro",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased selection:bg-sky-500 selection:text-white`}
    >
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: ws: wss: data: blob:;"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className="h-full w-full overflow-hidden flex flex-col bg-[#f8fafc] text-slate-900 select-none touch-manipulation">
        {children}
      </body>
    </html>
  );
}

