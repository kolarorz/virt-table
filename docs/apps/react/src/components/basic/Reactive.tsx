/**
 * 响应式更新 —— 「数据变了，表格怎么知道」（React）。
 *
 * 表格自己不侦测数据变化，侦测交给 React：`@virt-table/react` 内部一个 effect 比较
 * `options.list` 的**引用**，变了就替你调 `setList()`。
 *
 * 但**换引用不是目的**，只是让那个 effect 认出来的信号。所以四档里真正要比的是成本：
 * 克隆整份每轮新建「行数」个对象；`slice()` 只新建一个数组；数据放 `useRef` 里
 * 直接 `forceUpdate()` 连宿主重渲染都省了 —— 巨量数据高频刷新走最后一档。
 */
import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

type Mode = 'clone' | 'slice' | 'force' | 'mutate';

interface Row {
  id: number;
  code: string;
  name: string;
  price: number;
  change: string;
  tick: number;
  updatedAt: string;
  [key: string]: unknown;
}

const DEFAULT_ROWS = 2000;

const nowText = () => new Date().toLocaleTimeString();

function createRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    code: `SEC-${String(i).padStart(5, '0')}`,
    name: faker.company.name(),
    price: Number(faker.finance.amount({ min: 10, max: 500, dec: 2 })),
    change: '+0.00%',
    tick: 0,
    updatedAt: nowText(),
  }));
}

/**
 * 把一行推进一个轮次。`clone` 为 true 时返回新对象（克隆整份那一档），
 * 为 false 时原地改写 —— 后者不产生垃圾，但 effect 里的比较也认不出来。
 */
function bump(row: Row, tick: number, clone: boolean): Row {
  const delta = (Math.random() - 0.5) * 6;
  const price = Number(Math.max(1, row.price * (1 + delta / 100)).toFixed(2));
  const change = `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`;
  const updatedAt = nowText();

  if (clone) return { ...row, price, change, tick, updatedAt };

  row.price = price;
  row.change = change;
  row.tick = tick;
  row.updatedAt = updatedAt;
  return row;
}

const columns: ReactTableColumn[] = [
  { key: 'code', title: '代码', width: 130, fixed: 'left' },
  { key: 'name', title: '名称', width: 240 },
  { key: 'price', title: '最新价', width: 120, align: 'right' },
  { key: 'change', title: '涨跌幅', width: 120, align: 'right' },
  { key: 'tick', title: '轮次', width: 90, align: 'right' },
  { key: 'updatedAt', title: '更新于', width: 140 },
];

const HINTS: Record<Mode, string> = {
  clone: '克隆整份：setRows(rows => rows.map(row => ({ ...row }))) —— effect 命中，但每轮新建「行数」个临时对象；巨量数据下堆峰值能翻好几倍，只适合数据量小或本来就走不可变数据流。',
  slice: '原地改 + slice()：元素对象全部复用，只新建一个数组（n 个指针）就能让 effect 命中 —— 想留在「框架自动同步」这条路上时的便宜写法。',
  force: '原地改 + forceUpdate()：数据放 useRef 里原地改，宿主一次都不重渲染，拿 ref 直接通知 —— 巨量数据高频刷新首选。前提是行集合没变（没增删、没改动参与排序/筛选的字段）。',
  mutate: '原地改（不通知）：引用没换，React 与表格都察觉不到，「轮次」列会停住 —— 点「手动 forceUpdate()」才追上。',
};

export default function ReactiveTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [list, setRows] = React.useState<Row[]>(() => createRows(DEFAULT_ROWS));
  const [mode, setMode] = React.useState<Mode>('force');
  const [interval, setIntervalMs] = React.useState(600);
  const [rowCount, setRowCount] = React.useState(DEFAULT_ROWS);
  const [dataTick, setDataTick] = React.useState(0);
  const [notifyCount, setNotifyCount] = React.useState(0);
  const [lastAlloc, setLastAlloc] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // 定时器里要读到最新的模式与数据，又不想每次变更都重挂定时器 —— 走 ref。
  // listRef 同时是 force / mutate 两档的数据入口：那两档刻意不让宿主重渲染。
  const modeRef = React.useRef(mode);
  modeRef.current = mode;
  const listRef = React.useRef(list);
  listRef.current = list;
  const tickRef = React.useRef(0);

  const tickOnce = React.useCallback(() => {
    tickRef.current += 1;
    const tick = tickRef.current;
    setDataTick(tick);

    if (modeRef.current === 'clone') {
      setRows((rows) => rows.map((row) => bump(row, tick, true)));
      setLastAlloc(listRef.current.length);
      setNotifyCount((n) => n + 1);
      return;
    }

    for (const row of listRef.current) bump(row, tick, false);
    if (modeRef.current === 'slice') {
      setRows(listRef.current.slice());
      setLastAlloc(1);
      setNotifyCount((n) => n + 1);
    } else if (modeRef.current === 'force') {
      tableRef.current?.forceUpdate();
      setLastAlloc(0);
      setNotifyCount((n) => n + 1);
    } else {
      setLastAlloc(0);
    }
  }, []);

  const start = () => {
    if (timerRef.current != null) return;
    tickOnce();
    timerRef.current = setInterval(tickOnce, interval);
    setRunning(true);
  };

  const stop = () => {
    if (timerRef.current == null) return;
    clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
  };

  React.useEffect(
    () => () => {
      if (timerRef.current != null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    },
    [],
  );

  const options = React.useMemo(
    () => ({
      list,
      itemKey: 'id',
      estimatedSize: 40,
      buffer: 4,
      border: true,
      // 涨跌上色：只读行数据，不参与更新通道
      cellStyle: (col: { key: string }, row: Record<string, unknown>) => {
        if (col.key !== 'change' && col.key !== 'price') return '';
        return String(row.change).startsWith('-') ? 'color:#16a34a' : 'color:#dc2626';
      },
    }),
    [list],
  );

  const modeBtn = (m: Mode, label: string) => (
    <button
      type="button"
      className={`virt-table-btn${mode === m ? ' virt-table-btn-primary' : ''}`}
      onClick={() => setMode(m)}
    >
      {label}
    </button>
  );

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 响应式更新 — 数据变了，表格怎么知道</h3>
      <div className="virt-table-controls">
        <button type="button" className="virt-table-btn virt-table-btn-success" disabled={running} onClick={start}>
          开始刷新
        </button>
        <button type="button" className="virt-table-btn virt-table-btn-danger" disabled={!running} onClick={stop}>
          停止刷新
        </button>
        <label>更新方式：</label>
        {modeBtn('clone', '克隆整份（effect 自动 setList）')}
        {modeBtn('slice', '原地改 + slice() 换引用')}
        {modeBtn('force', '原地改 + forceUpdate()')}
        {modeBtn('mutate', '原地改（不通知）')}
        {mode === 'mutate' && (
          <button
            type="button"
            className="virt-table-btn virt-table-btn-warning"
            onClick={() => {
              tableRef.current?.forceUpdate();
              setNotifyCount((n) => n + 1);
            }}
          >
            手动 forceUpdate()
          </button>
        )}
        <label>间隔(ms)：</label>
        <input
          type="number"
          min={200}
          step={200}
          value={interval}
          style={{ width: 82 }}
          onChange={(e) => {
            const next = Math.max(200, Number(e.target.value) || 200);
            setIntervalMs(next);
            if (timerRef.current != null) {
              // 改频率要重挂定时器，否则新值下一轮才生效
              clearInterval(timerRef.current);
              timerRef.current = setInterval(tickOnce, next);
            }
          }}
        />
        <label>行数：</label>
        <input
          type="number"
          min={100}
          step={500}
          value={rowCount}
          style={{ width: 92 }}
          onChange={(e) => {
            const next = Math.max(100, Number(e.target.value) || 100);
            setRowCount(next);
            tickRef.current = 0;
            setDataTick(0);
            setRows(createRows(next));
            setLastAlloc(next);
            setNotifyCount((n) => n + 1);
          }}
        />
      </div>
      <div className="status-text">
        行数: {list.length} | 数据已改: {dataTick} 轮 | 已通知表格: {notifyCount} 次 | 本轮新建对象: {lastAlloc} |
        间隔: {interval}ms | 状态: {running ? '刷新中' : '已停止'}
      </div>
      <div className="status-text">{HINTS[mode]}</div>
      <div style={{ width: 900, height: 520 }} className="demo-container">
        <VirtTableReact ref={tableRef} columns={columns} options={options} />
      </div>
    </div>
  );
}
