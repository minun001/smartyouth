import type { Metadata, Viewport } from 'next';
import './globals.css';

const iconBasePath = process.env.GITHUB_PAGES === 'true' ? '/smartyouth' : '';

export const metadata: Metadata = {
  title: 'SmartYouth 운영상황판',
  description: '2026 아산 청소년 페스타 부스 실시간 운영 도구',
  icons: {
    icon: [
      { url: `${iconBasePath}/favicon.png`, sizes: '512x512', type: 'image/png' },
      { url: `${iconBasePath}/favicon.svg`, type: 'image/svg+xml' }
    ],
    apple: [{ url: `${iconBasePath}/apple-touch-icon.png`, sizes: '512x512', type: 'image/png' }]
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#12352f'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
