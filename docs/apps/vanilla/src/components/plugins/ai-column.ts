import { faker } from '@faker-js/faker';
import { VirtTable } from '@virt-table/vanilla';
import { vtAIColumn } from '@virt-table/vanilla/plugins';

/**
 * vtAIColumn：一列的值由模型从同行其他列算出来，边算边写。
 *
 * ⚠️ 这个 demo 的 `compute` 是**本地模板 + 假延迟**，不是真在调模型 ——
 * 文档站不该要求访客准备 API key。它演示的是调度：**只为屏幕上看得见的行付钱**。
 *
 * 右上角那个计数器是重点：表里 **5 万行**，但「已调用」永远只随你滚过的行增长。
 * 全量跑一遍是 5 万次模型调用，虚拟化让它变成「二十来次 × 你实际看过的屏数」。
 * 不虚拟化的表格做不到这个优化 —— 它们的 DOM 里所有行都在，没有「可见」可用。
 *
 * 接真实模型（流式）：
 *
 * ```ts
 * vtAIColumn({
 *   column: { key: 'summary', title: 'AI 摘要', width: 280 },
 *   async *compute(row, { signal }) {
 *     const res = await fetch('/api/summarize', {
 *       method: 'POST',
 *       body: JSON.stringify({ text: row.content }),
 *       signal,
 *     });
 *     const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
 *     for (;;) {
 *       const { value, done } = await reader.read();
 *       if (done) break;
 *       yield value;          // 逐段写进单元格
 *     }
 *   },
 * })
 * ```
 */

const TONE = ['积极', '中性', '偏负面'];
const THEME = ['物流时效', '客服响应', '包装完好度', '价格敏感', '功能诉求', '退换货流程'];
const ACTION = ['建议跟进', '可归档', '需人工介入', '转产品需求'];

/** 假装是模型：按行内容拼一句「摘要」，逐字吐出来 */
async function* fakeSummarize(row: Record<string, any>, signal: AbortSignal) {
  // 真实模型的首字延迟
  await sleep(180 + Math.random() * 420, signal);

  const tone = TONE[row.id % TONE.length];
  const theme = THEME[row.id % THEME.length];
  const action = ACTION[row.id % ACTION.length];
  const text = `${tone}反馈，聚焦${theme}；${action}。`;

  // 逐字吐，模拟 token 流
  for (const ch of text) {
    await sleep(18 + Math.random() * 30, signal);
    if (signal.aborted) return;
    yield ch;
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      const e = new Error('aborted');
      e.name = 'AbortError';
      reject(e);
    });
  });
}

export function bootstrapTableAiColumn(root: HTMLElement): () => void {
  const rowCount = 50000;

  faker.seed(20260812);
  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    ticket: `FB-${String(100000 + i)}`,
    customer: faker.person.fullName(),
    channel: faker.helpers.arrayElement(['App', '网页', '电话', '邮件']),
    content: faker.lorem.sentence({ min: 8, max: 18 }),
    createdAt: faker.date.between({ from: '2026-01-01', to: '2026-08-01' }).toISOString().slice(0, 10),
  }));

  root.innerHTML = `
    <div class="demo-toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;">
      <button type="button" id="btnComputeAll" style="cursor:pointer;font-size:13px;padding:4px 14px;border-radius:6px;border:1px solid var(--vp-c-divider,#ddd);background:transparent;color:inherit;">为当前屏重算</button>
      <button type="button" id="btnClear" style="cursor:pointer;font-size:13px;padding:4px 14px;border-radius:6px;border:1px solid var(--vp-c-divider,#ddd);background:transparent;color:inherit;">清空已生成</button>
      <span id="aiStat" style="font-size:12px;opacity:.75;margin-left:4px;font-variant-numeric:tabular-nums;"></span>
    </div>
    <div style="font-size:12px;opacity:.6;margin-bottom:8px;">
      表里 <strong>5 万行</strong>，但只有滚到的行才会触发生成 —— 看右边计数器：<strong>已调用</strong>
      永远只随你滚过的屏数增长，而不是 5 万。滚走时未完成的请求会被 abort（<strong>已取消</strong>）。
    </div>
    <div style="width:100%;height:520px;" class="demo-container" id="tableContainer"></div>
  `;
  const container = root.querySelector('#tableContainer') as HTMLElement;
  const statEl = root.querySelector('#aiStat') as HTMLElement;

  let calls = 0;
  let cancelled = 0;

  const renderStat = () => {
    if (!table) return; // 见下：首帧回调可能早于实例赋值
    const s = table.getAIColumnStats();
    statEl.innerHTML =
      `共 <strong>${rowCount.toLocaleString()}</strong> 行 · ` +
      `已调用 <strong>${calls}</strong> 次 · ` +
      `已完成 ${s.done} · 在途 ${s.inflight} · 排队 ${s.queued} · 已取消 ${cancelled}`;
  };

  // 刻意用 let + 后赋值：插件的回调可能在 `new VirtTable()` 返回前就触发
  // （首帧 onRendered 在构造函数内派发），const 绑定那时还在 TDZ 里。
  // 插件侧已经用 onMounted 闸门挡住了自动计算，这里再兜一层，免得手动调用踩到。
  let table: VirtTable<any>;
  table = new VirtTable(container, {
    list,
    columns: [
      { key: 'idx', title: '#', width: 64, type: 'index' },
      { key: 'ticket', title: '工单号', width: 120 },
      { key: 'customer', title: '客户', width: 130 },
      { key: 'channel', title: '渠道', width: 90 },
      { key: 'content', title: '反馈内容', width: 300, textOverflow: 'tooltip' },
      { key: 'createdAt', title: '提交日期', width: 120 },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    plugins: [
      vtAIColumn({
        column: { key: 'aiSummary', title: 'AI 摘要（流式生成）', width: 280 },
        concurrency: 4,
        compute(row, { signal }) {
          calls++;
          signal.addEventListener('abort', () => {
            cancelled++;
          });
          return fakeSummarize(row, signal);
        },
        onCellChange: () => renderStat(),
      }),
    ],
  });

  renderStat();

  root.querySelector('#btnComputeAll')!.addEventListener('click', () => {
    // 当前屏每格强制重算
    for (const key of Object.keys(table.getAIColumnValues())) table.recomputeAIColumn(key);
    table.computeAIColumn();
    renderStat();
  });

  root.querySelector('#btnClear')!.addEventListener('click', () => {
    table.clearAIColumn();
    calls = 0;
    cancelled = 0;
    renderStat();
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
