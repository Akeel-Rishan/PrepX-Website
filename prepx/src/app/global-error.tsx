'use client';

import type { ErrorBoundaryProps } from '@/components/application-error';

/** Independent of layouts, providers, fonts and shared UI. */
export default function GlobalError({ reset }: ErrorBoundaryProps): React.JSX.Element {
  const action = { display: 'inline-block', padding: '14px 20px', borderRadius: 10,
    border: '2px solid #93c5fd', background: '#1d4ed8', color: '#fff',
    font: 'inherit', cursor: 'pointer', textDecoration: 'underline' };
  return (
    <html lang="en">
      <head>
        <title>Something went wrong | PrepX</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, background: '#0b172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '15vh 24px' }}>
          <p style={{ color: '#fcd34d' }}>PrepX · Examination Results Portal</p>
          <h1>Something went wrong</h1>
          <p style={{ lineHeight: 1.7 }}>We could not complete this request right now. Please try again or return to the home page.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 32 }}>
            <button type="button" style={action} onClick={reset}>Try again</button>
            {/* A full document navigation must recover even when the root router/layout failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={action}>Return home</a>
          </div>
        </main>
      </body>
    </html>
  );
}
