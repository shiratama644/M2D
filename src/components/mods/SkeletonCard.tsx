/**
 * Placeholder card shown while mod search results are loading.
 * Mirrors the visual dimensions of ModCard so the layout does not shift.
 */
export default function SkeletonCard() {
  return (
    <div className="mod-card skeleton-card" aria-hidden="true">
      <div className="skeleton-checkbox" />
      <div className="skeleton-icon" />
      <div className="mod-info">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-meta">
          <div className="skeleton-line skeleton-meta-item" />
          <div className="skeleton-line skeleton-meta-item" />
        </div>
      </div>
    </div>
  );
}
