import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  vtAIColumn,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

/**
 * vtAIColumn：一列的值由模型从同行其他列算出来，边算边写。
 *
 * ⚠️ 这个 demo 的 `compute` 是**本地模板 + 假延迟**，不是真在调模型 ——
 * 文档站不该要求访客准备 API key。它演示的是调度：**只为屏幕上看得见的行付钱**。
 *
 * 计数器是重点：表里 **5 万行**，但「已调用」永远只随你滚过的行增长。
 * 全量跑一遍是 5 万次模型调用，虚拟化让它变成「二十来次 × 你实际看过的屏数」。
 * 不虚拟化的表格做不到这个优化 —— 它们的 DOM 里所有行都在，没有「可见」可用。
 *
 * 接真实模型时把 `compute` 换成流式请求（async generator，逐段 yield）即可。
 */
const TONE = ['积极', '中性', '偏负面'];
const THEME = ['物流时效', '客服响应', '包装完好度', '价格敏感', '功能诉求', '退换货流程'];
const ACTION = ['建议跟进', '可归档', '需人工介入', '转产品需求'];

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

const ROW_COUNT = 50000;

const columns: ReactTableColumn[] = [
  { key: 'idx', title: '#', width: 64, type: 'index' },
  { key: 'ticket', title: '工单号', width: 120 },
  { key: 'customer', title: '客户', width: 130 },
  { key: 'channel', title: '渠道', width: 90 },
  { key: 'content', title: '反馈内容', width: 300, textOverflow: 'tooltip' },
  { key: 'createdAt', title: '提交日期', width: 120 },
];

// 懒生成 5 万行：App 会静态 import 全部示例模块
let _db: Record<string, unknown>[] | null = null;
const getList = (): Record<string, unknown>[] => {
  if (_db) return _db;
  faker.seed(20260812);
  _db = Array.from({ length: ROW_COUNT }, (_, i) => ({
    id: i,
    ticket: `FB-${String(100000 + i)}`,
    customer: faker.person.fullName(),
    channel: faker.helpers.arrayElement(['App', '网页', '电话', '邮件']),
    content: faker.lorem.sentence({ min: 8, max: 18 }),
    createdAt: faker.date
      .between({ from: '2026-01-01', to: '2026-08-01' })
      .toISOString()
      .slice(0, 10),
  }));
  return _db;
};

export default function AIColumnTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [stat, setStat] = React.useState('');
  const callsRef = React.useRef(0);
  const cancelledRef = React.useRef(0);
  const list = React.useMemo(getList, []);

  const renderStat = React.useCallback(() => {
    const s = tableRef.current?.getAIColumnStats();
    if (!s) return;
    setStat(
      `共 ${ROW_COUNT.toLocaleString()} 行 · 已调用 ${callsRef.current} 次 · ` +
        `已完成 ${s.done} · 在途 ${s.inflight} · 排队 ${s.queued} · 已取消 ${cancelledRef.current}`,
    );
  }, []);

  const plugins = React.useMemo(
    () => [
      vtAIColumn({
        column: { key: 'aiSummary', title: 'AI 摘要（流式生成）', width: 280 },
        concurrency: 4,
        compute(row: Record<string, any>, { signal }: { signal: AbortSignal }) {
          callsRef.current++;
          signal.addEventListener('abort', () => {
            cancelledRef.current++;
          });
          return fakeSummarize(row, signal);
        },
        onCellChange: () => renderStat(),
      }),
    ],
    [renderStat],
  );

  React.useEffect(renderStat, [renderStat]);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React AI 列</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          onClick={() => {
            // 当前屏每格强制重算
            const values = tableRef.current?.getAIColumnValues() ?? {};
            for (const key of Object.keys(values)) tableRef.current?.recomputeAIColumn(key);
            tableRef.current?.computeAIColumn();
            renderStat();
          }}
        >
          为当前屏重算
        </button>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => {
            tableRef.current?.clearAIColumn();
            callsRef.current = 0;
            cancelledRef.current = 0;
            renderStat();
          }}
        >
          清空已生成
        </button>
        <span className="demo-note" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {stat}
        </span>
      </div>
      <div className="demo-hint">
        表里 <strong>5 万行</strong>，但只有滚到的行才会触发生成 —— 看上面的计数器：
        <strong>已调用</strong> 永远只随你滚过的屏数增长，而不是 5 万。滚走时未完成的请求会被
        abort（<strong>已取消</strong>）。
      </div>
      <div style={{ width: '100%', height: 520 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4, border: true, plugins }}
        />
      </div>
    </div>
  );
}
