import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { headers } from 'next/headers';

import './globals.css';

const themeScript = `
  try {
    var savedTheme = localStorage.getItem('prepx-theme');
    var pathname = window.location.pathname;
    var isAdminPage = /^\\/admin(?:\\/|$)/.test(pathname);
    var isLoginPage = /^\\/admin\\/login\\/?$/.test(pathname);
    var useDark = !isLoginPage && (savedTheme === 'dark' || (!savedTheme && !isAdminPage && window.matchMedia('(prefers-color-scheme: dark)').matches));
    document.documentElement.classList.toggle('dark', useDark);
    document.documentElement.style.colorScheme = useDark ? 'dark' : 'light';
  } catch (_) {}
`;

const inter = localFont({
  src: './fonts/InterVariable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
});

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'PrepX';
const configuredAppUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
let metadataBase: URL | undefined;
if (configuredAppUrl) {
  try {
    metadataBase = new URL(configuredAppUrl);
  } catch {
    // The production environment audit rejects invalid URLs. Keeping metadata
    // renderable here gives error boundaries and /api/health a chance to report.
  }
}

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: `${appName} | Examination Results`,
    template: `%s | ${appName}`,
  },
  description: `O/L Model Examination Results Portal by ${appName}.`,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<React.JSX.Element> {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Browsers hide the nonce content attribute before hydration while
            retaining script.nonce for CSP. Suppress only this expected mismatch. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
