import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '../../../../lib/saas/session';
import { listManagerReportData, moneyText, parseManagerReportInput, type ManagerReportData } from '../../../../lib/manager-console/manager-reporting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function dateText(value: string) {
  if (!value) return '';
  try { return new Intl.DateTimeFormat('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); } catch { return ''; }
}

function row(cells: unknown[]) {
  return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
}

function head(cells: unknown[]) {
  return `<tr>${cells.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr>`;
}

function table(title: string, headers: string[], rows: unknown[][]) {
  return `<h2>${escapeHtml(title)}</h2><table>${head(headers)}${rows.map(row).join('')}</table>`;
}

function reportTables(report: ManagerReportData) {
  const summaryRows = [
    ['Report type', report.input.type],
    ['Date range', `${report.input.range.fromDate} to ${report.input.range.toDate}`],
    ['Disputers', report.totals.userCount],
    ['Active Disputers', report.totals.activeUsers],
    ['Output items', report.totals.totalOutputItems],
    ['Approved rows', report.totals.approvedRows],
    ['Pending rows', report.totals.pendingRows],
    ['Returned rows', report.totals.returnedRows],
    ['Estimated pay', moneyText(report.totals.estimatedPayTotal)]
  ];

  const userRows = report.users.map((item) => [item.name, item.email, item.status, item.employmentType, item.outputLimit ?? 'Needs Master cap', item.outputs, item.approvedOutputs, item.pendingOutputs, item.returnedOutputs, moneyText(item.estimatedPay)]);
  const salaryRows = report.users.map((item) => [item.name, item.employmentType, moneyText(item.baseSalary), moneyText(item.perOutputRate), item.approvedOutputs, item.pendingOutputs, moneyText(item.estimatedPay)]);
  const outputRows = report.outputs.map((item) => [dateText(item.createdAt), item.disputerName, item.clientName, item.roundLabel, item.status, item.outputType, item.outputCount, moneyText(item.rateAmount), moneyText(item.estimatedPay)]);

  const parts = [table('Summary', ['Metric', 'Value'], summaryRows)];
  if (report.input.type === 'salary') parts.push(table('Salary', ['Disputer', 'Type', 'Base salary', 'Rate', 'Approved outputs', 'Pending outputs', 'Estimated pay'], salaryRows));
  else if (report.input.type === 'users') parts.push(table('Users', ['Disputer', 'Email', 'Status', 'Type', 'Daily cap', 'Outputs', 'Approved', 'Pending', 'Returned', 'Estimated pay'], userRows));
  else if (report.input.type === 'outputs') parts.push(table('Outputs', ['Date', 'Disputer', 'Letter client', 'Round', 'Status', 'Output type', 'Count', 'Rate', 'Pay'], outputRows));
  else {
    parts.push(table('Users', ['Disputer', 'Email', 'Status', 'Type', 'Daily cap', 'Outputs', 'Approved', 'Pending', 'Returned', 'Estimated pay'], userRows));
    parts.push(table('Outputs', ['Date', 'Disputer', 'Letter client', 'Round', 'Status', 'Output type', 'Count', 'Rate', 'Pay'], outputRows));
  }
  return parts.join('<br />');
}

function workbook(report: ManagerReportData, managerEmail: string) {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    body{font-family:Arial,sans-serif;color:#0f172a} h1{font-size:22px;margin:0 0 4px} h2{margin:22px 0 8px;font-size:16px;color:#1d4ed8} .meta{color:#64748b;margin-bottom:18px} table{border-collapse:collapse;width:100%;margin-bottom:12px} th{background:#1d4ed8;color:#fff;text-align:left} th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px} tr:nth-child(even) td{background:#f8fafc}.num{text-align:right}
  </style></head><body><h1>xDisputer Manager Report</h1><div class="meta">Manager: ${escapeHtml(managerEmail)} · Range: ${escapeHtml(report.input.range.fromDate)} to ${escapeHtml(report.input.range.toDate)}</div>${reportTables(report)}</body></html>`;
}

export async function GET(request: NextRequest) {
  const { user, profile, supabase } = await requireRole('manager');
  const params = request.nextUrl.searchParams;
  const input = parseManagerReportInput({ reportType: params.get('reportType') || undefined, from: params.get('from') || undefined, to: params.get('to') || undefined });
  const report = await listManagerReportData(supabase, user.id, input);
  const filename = `xdisputer-${input.type}-report-${input.range.fromDate}-to-${input.range.toDate}.xls`;
  return new NextResponse(workbook(report, profile?.email || user.email || 'Manager'), {
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  });
}
