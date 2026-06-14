export default function ManagerTemplateWorkspaceChrome() {
  return <style>{`
    .manager-template-client-flow {
      display: grid;
      gap: 16px;
    }
    .merged-template-command {
      display: grid !important;
      grid-template-columns: minmax(0, 1.12fr) minmax(360px, .88fr);
      align-items: center !important;
      gap: 20px !important;
      padding: 22px 24px !important;
      border-radius: 24px !important;
    }
    .merged-template-command-copy {
      display: grid;
      gap: 7px;
      min-width: 0;
    }
    .merged-template-command-copy .eyebrow {
      margin: 0;
    }
    .merged-template-command-copy strong {
      display: block;
      color: #0f172a;
      font-size: clamp(24px, 2.2vw, 34px);
      line-height: 1;
      letter-spacing: -0.055em;
    }
    .merged-template-command-copy span {
      display: block;
      max-width: 780px;
      color: #50627a;
      font-size: 14px;
      line-height: 1.45;
    }
    .merged-template-command-metrics {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 9px;
      align-items: stretch;
    }
    .merged-template-command-metrics > span {
      min-height: 64px;
      display: grid !important;
      align-content: center;
      gap: 4px;
      padding: 11px 12px;
      border: 1px solid #dbe3ef;
      border-radius: 16px;
      background: #f8fafc;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
    }
    .merged-template-command-metrics > span b {
      display: block;
      color: #0f172a;
      font-size: 18px;
      line-height: 1;
      letter-spacing: -0.035em;
    }
    .merged-template-command-metrics > span small {
      display: block;
      color: #5b6f89;
      font-size: 10px;
      font-weight: 850;
      letter-spacing: .09em;
      text-transform: uppercase;
    }
    .merged-template-command-metrics .manager-round-chip {
      border-color: #b7ead0;
      background: #effaf4;
    }
    .manager-template-direct-actions {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 8px !important;
    }
    .manager-upload-action {
      min-height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 14px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: #0f172a;
      color: white;
      font-size: 12px;
      font-weight: 850;
      letter-spacing: .02em;
      cursor: pointer;
      box-shadow: 0 12px 24px rgba(15, 23, 42, .12);
    }
    .manager-upload-action:hover {
      background: #020617;
      border-color: #020617;
    }
    .manager-upload-action input[type=file],
    .manager-upload-input {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(0 0 0 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
      padding: 0 !important;
      margin: -1px !important;
    }
    .manager-template-direct-actions .remove-node {
      min-height: 38px;
      padding: 0 13px !important;
      border-radius: 12px !important;
      font-size: 12px !important;
      font-weight: 800 !important;
    }
    @media (max-width: 1180px) {
      .merged-template-command {
        grid-template-columns: 1fr;
      }
      .merged-template-command-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 640px) {
      .merged-template-command {
        padding: 18px !important;
      }
      .merged-template-command-metrics {
        grid-template-columns: 1fr;
      }
      .manager-template-direct-actions {
        justify-content: flex-start !important;
      }
    }
  `}</style>;
}
