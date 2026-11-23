/** CSV / Excel / PDF(print) export helpers. */

export type Cell = string | number | boolean | undefined | null;

export function toCSV(rows: Record<string, Cell>[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0] ?? {});
  const esc = (v: Cell) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
}

/** Excel opens an HTML table saved as .xls, which keeps this dependency-free. */
export function toExcelHTML(rows: Record<string, Cell>[], columns?: string[]): string {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  const esc = (v: Cell) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  return `<table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function download(filename: string, content: string, mime: string) {
  if (typeof document === "undefined") return;
  // BOM keeps Bangla text intact in Excel.
  const blob = new Blob(["﻿", content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCSV(name: string, rows: Record<string, Cell>[], columns?: string[]) {
  download(`${name}.csv`, toCSV(rows, columns), "text/csv");
}

export function downloadExcel(name: string, rows: Record<string, Cell>[], columns?: string[]) {
  download(`${name}.xls`, toExcelHTML(rows, columns), "application/vnd.ms-excel");
}

/** PDF export uses the browser's "Save as PDF" print dialog with print styles. */
export function printPDF() {
  if (typeof window !== "undefined") window.print();
}
