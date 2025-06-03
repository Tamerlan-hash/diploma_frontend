import { AuthProvider } from '@/context/AuthContext';
import { MainHeader } from '@/components/Header';
import { PWAInitializer } from '@/components/PWAInitializer';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Smart Parking App',
  description: 'Find your parking spot easily',
  manifest: '/manifest.json',
  themeColor: '#000000',
  applicationName: 'Smart Parking App',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Smart Parking App',
  },
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'Smart Parking App',
    title: 'Smart Parking App',
    description: 'Find your parking spot easily',
    images: [
      {
        url: '/screenshots/screenshot-desktop.png',
        width: 1280,
        height: 720,
        alt: 'Smart Parking App Screenshot',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <MainHeader />
          {children}
          <PWAInitializer />
        </body>
      </html>
    </AuthProvider>
  );
}
