import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { AlertProvider } from "@/contexts/AlertContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import FaviconUpdater from "@/components/FaviconUpdater";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";
import ServiceWorkerInitializer from "@/components/ServiceWorkerInitializer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Iqra Education System",
  description: "Comprehensive education management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalErrorHandler />
        <FaviconUpdater />
        <ErrorBoundary>
          <ServiceWorkerInitializer />
          <AlertProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </AlertProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
