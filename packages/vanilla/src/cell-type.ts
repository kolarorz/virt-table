/**
 * 内置**内容类型**渲染（列上的 `cellType`）。
 *
 * 与 `col.type` 的分工别搞混，两者都叫 type 但完全不是一回事：
 *   - `col.type`     —— **功能列**（序号 / 勾选 / 单选 / 拖拽 / 展开 / 树形），独占单元格
 *   - `col.cellType` —— **内容类型**（文本 / 数字 / 富文本 / 图片 / 标签 / 布尔），只管
 *                       「这个值该画成什么样」，因此照常吃 `textOverflow`、`mergeKey` 等
 *                       容器能力，也随时能被 `render` 覆盖
 *
 * 这套类型原先只存在于 `spreadsheet.ts`：几个导出的纯函数 + 一个核心不认识的行数据字段
 * `_sheetCells`，使用方得自己在 `col.render` 里接线。升进核心后 spreadsheet 复用同一份
 * 渲染器（见 `renderSpreadsheetCellHtml`），差别只剩它额外带的样式字段（bgColor 等）。
 *
 * 返回**判别式结果**而不是 HTML 字符串：`text` 走 `textContent`，只有 `rich-text` 才走
 * `innerHTML`。旧实现统一拼字符串、靠 `escapeHtml` 兜底，等于把转义责任散落在每个分支里，
 * 漏一处就是 XSS。
 */

/** 内容类型（`col.cellType`） */
export type CellContentType =
  | 'text'
  | 'number'
  | 'rich-text'
  | 'image'
  | 'option'
  | 'checkbox';

/** `cellType: 'image'` 的结构化取值；也接受直接给 URL 字符串 */
export interface CellImageValue {
  url: string;
  alt?: string;
}

/** `cellType: 'option'` 的结构化取值；也接受直接给标签字符串 */
export interface CellOptionValue {
  label?: string;
  /** 标签主色；底色由它派生（`color-mix`），不支持时回落到浅灰底 */
  color?: string;
}

/**
 * 渲染结果。分三种是为了让调用方**按种类**装填，而不是一律 `innerHTML`。
 */
export type CellContentResult =
  | { kind: 'text'; text: string }
  | { kind: 'html'; html: string }
  | { kind: 'node'; node: HTMLElement };

const asText = (v: unknown): string => (v == null ? '' : String(v));

/**
 * 按内容类型把值渲染成可装填的结果。类型不认识时返回 `null`，由调用方回落到默认取值。
 */
export function renderCellContent(
  type: CellContentType,
  value: unknown,
): CellContentResult | null {
  switch (type) {
    case 'text':
    case 'number':
      // number 不做千分位/精度：那是格式化职责，用 `render` 或先处理数据。
      // 纵向对齐靠全局 `font-variant-numeric: tabular-nums`（见 index.css §4）
      return { kind: 'text', text: asText(value) };

    case 'rich-text':
      return { kind: 'html', html: asText(value) };

    case 'image': {
      const raw = value as CellImageValue | string | null | undefined;
      const url = typeof raw === 'string' ? raw : raw?.url;
      if (!url) return { kind: 'text', text: '' };
      const img = document.createElement('img');
      img.className = 'vt-cell-image';
      img.src = url;
      img.alt = (typeof raw === 'string' ? '' : raw?.alt) ?? '';
      img.loading = 'lazy';
      return { kind: 'node', node: img };
    }

    case 'option': {
      const raw = value as CellOptionValue | string | null | undefined;
      const label = typeof raw === 'string' ? raw : (raw?.label ?? '');
      if (!label) return { kind: 'text', text: '' };
      const tag = document.createElement('span');
      tag.className = 'vt-cell-option';
      tag.textContent = label;
      const color = typeof raw === 'string' ? undefined : raw?.color;
      // 走自定义属性而不是直接写 background/color：底色在 CSS 里由它 color-mix 派生，
      // 换主题/换主色时不用改这里
      if (color) tag.style.setProperty('--vt-cell-option-color', color);
      return { kind: 'node', node: tag };
    }

    case 'checkbox': {
      const wrap = document.createElement('span');
      wrap.className = 'vt-cell-bool';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'vt-checkbox';
      box.checked = !!value;
      box.disabled = true;
      wrap.appendChild(box);
      return { kind: 'node', node: wrap };
    }

    default:
      return null;
  }
}

/** 内容类型对应的纯文本（导出 / 复制 / tooltip 用） */
export function cellContentText(type: CellContentType, value: unknown): string {
  switch (type) {
    case 'checkbox':
      return value ? 'TRUE' : 'FALSE';
    case 'option': {
      const raw = value as CellOptionValue | string | null | undefined;
      return typeof raw === 'string' ? raw : asText(raw?.label);
    }
    case 'image': {
      const raw = value as CellImageValue | string | null | undefined;
      return typeof raw === 'string' ? raw : asText(raw?.alt ?? raw?.url);
    }
    default:
      return asText(value);
  }
}
