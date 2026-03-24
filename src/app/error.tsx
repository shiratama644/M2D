'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
        Something went wrong
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        An unexpected error occurred. Please try again.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn-small green" onClick={() => reset()}>
          Try again
        </button>
        <button className="btn-small green" onClick={() => router.push('/')}>
          Back to M2D
        </button>
      </div>
    </div>
  );
}
