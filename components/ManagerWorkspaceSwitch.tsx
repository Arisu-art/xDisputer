import ConsoleNavLink from './ConsoleNavLink';

export default function ManagerWorkspaceSwitch({ target = '/manager-workspace', reverse = false }: { target?: string; reverse?: boolean }) {
  return <div className="manager-workspace-switch-card">
    <ConsoleNavLink className="manager-workspace-switch-button" href={target}>
      <span className="manager-workspace-switch-pulse" aria-hidden="true" />
      <span className="manager-workspace-switch-copy">
        <strong>{reverse ? 'Switch mode' : 'Switch mode'}</strong>
        <small>{reverse ? 'Operations console' : 'Manager workspace'}</small>
      </span>
    </ConsoleNavLink>
    <style>{`
      .manager-workspace-switch-card {
        margin-top: auto;
        padding-top: 18px;
        border-top: 1px solid rgba(100, 116, 139, .18);
      }
      .manager-workspace-switch-button {
        position: relative;
        width: 100%;
        min-height: 62px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 18px;
        color: #eff6ff;
        text-decoration: none;
        background: linear-gradient(135deg, #2563eb, #7c3aed);
        box-shadow: 0 16px 36px rgba(37, 99, 235, .28);
        transform: translateZ(0);
        overflow: hidden;
        isolation: isolate;
        animation: managerSwitchLift 2400ms ease-in-out infinite;
      }
      .manager-workspace-switch-button::after {
        content: '';
        position: absolute;
        inset: -45% -25%;
        z-index: -1;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.34), transparent);
        transform: translateX(-65%) rotate(12deg);
        animation: managerSwitchShine 3000ms ease-in-out infinite;
      }
      .manager-workspace-switch-button:hover,
      .manager-workspace-switch-button:focus-visible {
        transform: translateY(-2px);
        box-shadow: 0 20px 46px rgba(37, 99, 235, .38);
      }
      .manager-workspace-switch-pulse {
        width: 14px;
        height: 14px;
        flex: none;
        border-radius: 999px;
        background: #bbf7d0;
        box-shadow: 0 0 0 0 rgba(187, 247, 208, .72);
        animation: managerSwitchPulse 1600ms ease-out infinite;
      }
      .manager-workspace-switch-copy {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .manager-workspace-switch-copy strong {
        font-size: 13px;
        line-height: 1.1;
        letter-spacing: .02em;
        text-transform: uppercase;
      }
      .manager-workspace-switch-copy small {
        color: rgba(239, 246, 255, .86);
        font-size: 12px;
        line-height: 1.2;
      }
      @keyframes managerSwitchPulse {
        0% { box-shadow: 0 0 0 0 rgba(187, 247, 208, .72); }
        70% { box-shadow: 0 0 0 12px rgba(187, 247, 208, 0); }
        100% { box-shadow: 0 0 0 0 rgba(187, 247, 208, 0); }
      }
      @keyframes managerSwitchShine {
        0%, 35% { transform: translateX(-75%) rotate(12deg); }
        62%, 100% { transform: translateX(95%) rotate(12deg); }
      }
      @keyframes managerSwitchLift {
        0%, 100% { translate: 0 0; }
        50% { translate: 0 -2px; }
      }
    `}</style>
  </div>;
}
