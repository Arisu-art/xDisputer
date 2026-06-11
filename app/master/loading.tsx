export default function MasterLoading() {
  return (
    <main className="admin-monitor-page native-console master-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Loading console</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Loading master navigation">
          <span className="console-loading-line" />
          <span className="console-loading-line" />
          <span className="console-loading-line" />
          <span className="console-loading-line" />
          <span className="console-loading-line" />
        </nav>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero master-compact-hero">
          <div>
            <p>Loading</p>
            <h1>Preparing command center.</h1>
            <span>Loading master operations data...</span>
          </div>
        </header>

        <section className="admin-monitor-stats master-monitoring-stats">
          <article className="console-loading-card" />
          <article className="console-loading-card" />
          <article className="console-loading-card" />
          <article className="console-loading-card" />
        </section>

        <section className="admin-monitor-card native-operation-card console-loading-panel" />
      </section>
    </main>
  );
}
