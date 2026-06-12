export default function MasterAccountsLoading() {
  return (
    <main className="admin-monitor-page native-console master-ops-console">
      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero master-compact-hero">
          <div>
            <p>Master account directory</p>
            <h1>Loading workspace accounts.</h1>
            <span>Preparing the paginated account directory...</span>
          </div>
        </header>
        <section className="admin-monitor-card native-operation-card console-loading-panel" />
      </section>
    </main>
  );
}
