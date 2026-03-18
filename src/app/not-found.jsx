import Link from 'next/link';

/**
 * Rendered by Next.js when `notFound()` is called or a route cannot be matched.
 */
export default function NotFound() {
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
      <Link href="/" className="btn-small green">
        Back to M2D
      </Link>
    </div>
  );
}
