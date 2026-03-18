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
