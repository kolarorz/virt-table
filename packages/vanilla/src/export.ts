/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 导出相关纯逻辑：CSV 转义/拼接、HTML 表格生成。
 * Blob 创建与浏览器下载留在 VirtTable（依赖 DOM），此处保持可单测。
 */

/** CSV 单元格转义：含分隔符/引号/换行时用双引号包裹，内部引号翻倍 */
export function escapeCsvCell(value: unknown, delimiter = ','): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** 二维数组拼为 CSV 文本（CRLF 换行，Excel 友好） */
export function rowsToCsv(rows: string[][], delimiter = ','): string {
  return rows.map((r) => r.map((c) => escapeCsvCell(c, delimiter)).join(delimiter)).join('\r\n');
}

/** 生成带 UTF-8 BOM 的 CSV 文本（Excel 正确识别中文） */
export function toCsvString(rows: string[][], delimiter = ','): string {
  return '﻿' + rowsToCsv(rows, delimiter);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 生成 HTML 表格字符串（可作为 .xls 用 Excel 打开，或用于打印） */
export function rowsToHtmlTable(header: string[], rows: string[][]): string {
  const thead = header.length
    ? `<thead><tr>${header.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`
    : '';
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table border="1" style="border-collapse:collapse">${thead}<tbody>${body}</tbody></table>`;
}

/** 包裹成一个可被 Excel 识别的 HTML 文档 */
export function toExcelHtml(header: string[], rows: string[][], title = 'Sheet'): string {
  return (
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">' +
    `<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>` +
    `<body>${rowsToHtmlTable(header, rows)}</body></html>`
  );
}
