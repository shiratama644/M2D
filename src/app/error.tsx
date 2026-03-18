'use client';

export default function Error({ reset }: { reset: () => void }) {
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
      <button className="btn-small green" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
