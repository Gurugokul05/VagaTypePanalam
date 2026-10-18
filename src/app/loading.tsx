export default function Loading() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading page">
      <div className="skeleton-col skeleton-col-left">
        <div className="skeleton skeleton-card" style={{ height: 168 }} />
        <div className="skeleton skeleton-card" style={{ height: 150 }} />
        <div className="skeleton skeleton-card" style={{ height: 180 }} />
      </div>

      <div className="skeleton-col skeleton-col-center">
        <div className="skeleton" style={{ height: 40, width: 320, margin: "0 auto", borderRadius: 999 }} />
        <div className="skeleton" style={{ height: 48, width: 380, margin: "0 auto 16px", borderRadius: 999 }} />
        <div className="skeleton skeleton-card" style={{ height: 220 }} />
        <div className="skeleton skeleton-card" style={{ height: 210, marginTop: 16 }} />
      </div>

      <div className="skeleton-col skeleton-col-right">
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
        <div className="skeleton skeleton-card" style={{ height: 130 }} />
      </div>

      <style>{`
        .skeleton-page {
          display: grid;
          grid-template-columns: 280px 1fr 280px;
          gap: 2rem;
          max-width: 1440px;
          margin: 0 auto;
          padding: 3rem 2rem;
          min-height: calc(100vh - 56px);
        }
        .skeleton-col {
          display: flex;
          flex-direction: column;
        }
        .skeleton-card {
          border-radius: 1rem;
        }
        @media (max-width: 1200px) {
          .skeleton-page { grid-template-columns: 240px 1fr 240px; gap: 1.5rem; }
        }
        @media (max-width: 1024px) {
          .skeleton-page { grid-template-columns: 1fr; padding: 1.5rem 1rem; }
          .skeleton-col-left, .skeleton-col-right { display: none; }
        }
      `}</style>
    </div>
  );
}
