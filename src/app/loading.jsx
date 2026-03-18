/**
 * Shown by Next.js while the async Server Component (page.jsx) is resolving.
 * Uses the same loader animation as the rest of the app.
 */
export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <div className="loader-dots">
        <div /><div /><div /><div />
      </div>
    </div>
  );
}
