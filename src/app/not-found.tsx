'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

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
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
        404 – Page Not Found
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        The page you are looking for does not exist.
      </p>
      <button className="btn-small green" onClick={() => router.push('/')}>
        Back to M2D
      </button>
    </div>
  );
}
