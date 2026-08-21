import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

/**
 * 响应式更新 —— 「数据变了，表格怎么知道」。
 *
 * 通知表格只有两个出口：`setList()`（数据换了）与 `forceUpdate()`（只重画）。
 * 「换新数组」不是第三个出口，它只是**框架端 watch / effect 能认出来的信号**；
 * vanilla 没有那一层，所以这里可以直接看清两件事的成本差：
 *
 * 四档里前两档都以 `setList()` 收尾，区别只在要不要克隆每一行 —— 状态栏的
 * 「本轮新建对象」把这笔账写出来（10 万行 × 每轮一份克隆就是每轮 10 万个临时对象）。
 */

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
const DEFAULT_INTERVAL = 600;

function nowText(): string {
  return new Date().toLocaleTimeString();
}

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
 * 把一行推进一个轮次。
 *
 * `clone` 决定这一档的语义：true 返回新对象（配合 `list.map()` 克隆整份），
 * false 原地改写（同一批对象，不产生垃圾）。
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

export function bootstrapTableReactive(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'code', title: '代码', width: 130, fixed: 'left' },
    { key: 'name', title: '名称', width: 240 },
    { key: 'price', title: '最新价', width: 120, align: 'right' },
    { key: 'change', title: '涨跌幅', width: 120, align: 'right' },
    { key: 'tick', title: '轮次', width: 90, align: 'right' },
    { key: 'updatedAt', title: '更新于', width: 140 },
  ];

  root.innerHTML = `
    <h3 class="demo-title">响应式更新 — 数据变了，表格怎么知道</h3>
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-success" id="btnStart">开始刷新</button>
      <button class="virt-table-btn virt-table-btn-danger" id="btnStop">停止刷新</button>
      <label>更新方式：</label>
      <button class="virt-table-btn" id="modeClone">克隆整份 + setList()</button>
      <button class="virt-table-btn" id="modeSlice">原地改 + slice() + setList()</button>
      <button class="virt-table-btn" id="modeForce">原地改 + forceUpdate()</button>
      <button class="virt-table-btn" id="modeMutate">原地改（不通知）</button>
      <button class="virt-table-btn virt-table-btn-warning" id="btnManual">手动 forceUpdate()</button>
      <label>间隔(ms)：</label>
      <input id="inpInterval" type="number" min="200" step="200" value="${DEFAULT_INTERVAL}" style="width:82px" />
      <label>行数：</label>
      <input id="inpRows" type="number" min="100" step="500" value="${DEFAULT_ROWS}" style="width:92px" />
    </div>
    <div class="status-text" id="status"></div>
    <div class="status-text" id="hint"></div>
    <div style="width:900px;height:520px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;
  const hintEl = root.querySelector('#hint') as HTMLElement;
  const btnStart = root.querySelector('#btnStart') as HTMLButtonElement;
  const btnStop = root.querySelector('#btnStop') as HTMLButtonElement;
  const btnManual = root.querySelector('#btnManual') as HTMLButtonElement;
  const inpInterval = root.querySelector('#inpInterval') as HTMLInputElement;
  const inpRows = root.querySelector('#inpRows') as HTMLInputElement;
  const modeBtns: Record<Mode, HTMLButtonElement> = {
    clone: root.querySelector('#modeClone') as HTMLButtonElement,
    slice: root.querySelector('#modeSlice') as HTMLButtonElement,
    force: root.querySelector('#modeForce') as HTMLButtonElement,
    mutate: root.querySelector('#modeMutate') as HTMLButtonElement,
  };

  let list = createRows(DEFAULT_ROWS);
  let mode: Mode = 'force';
  let interval = DEFAULT_INTERVAL;
  let timer: ReturnType<typeof setInterval> | null = null;
  let dataTick = 0;
  let notifyCount = 0;
  let lastAlloc = 0;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    // 涨跌上色：只读行数据，不参与更新通道
    cellStyle: (col, row) => {
      if (col.key !== 'change' && col.key !== 'price') return '';
      return row.change.startsWith('-') ? 'color:#16a34a' : 'color:#dc2626';
    },
  });

  const HINTS: Record<Mode, string> = {
    clone:
      '克隆整份：list.map(row => ({ ...row })) 之后 setList() —— 每轮新建「行数」个临时对象。'
      + '巨量数据下这是最贵的一档（10 万行连续刷新时堆峰值能翻好几倍），只适合数据量小、或本来就走不可变数据流的场景。',
    slice:
      '原地改 + slice()：元素对象复用，只新建一个数组（n 个指针）。'
      + '换引用的意义只在于让框架端的 watch / effect 认出来 —— vanilla 直接 setList() 就行，这一档是给框架端看的便宜写法。',
    force:
      '原地改 + forceUpdate()：一个对象都不新建，也不换数组 —— 巨量数据高频刷新的首选。'
      + '前提是行集合没变（没增删、没改动参与排序/筛选的字段），那些情况必须走 setList()。',
    mutate:
      '原地改（不通知）：表格完全不知道数据动过，「轮次」列会停住（滚动出去再回来才会露出新值，见文档里的提醒）。'
      + '点「手动 forceUpdate()」即追上。',
  };

  function paintMode(): void {
    (Object.keys(modeBtns) as Mode[]).forEach((m) => {
      modeBtns[m].classList.toggle('virt-table-btn-primary', m === mode);
    });
    // 只有「原地改（不通知）」这一档需要手动补一刀
    btnManual.style.display = mode === 'mutate' ? '' : 'none';
    hintEl.textContent = HINTS[mode];
  }

  function paintStatus(): void {
    statusEl.textContent =
      `行数: ${list.length} | 数据已改: ${dataTick} 轮 | 已通知表格: ${notifyCount} 次`
      + ` | 本轮新建对象: ${lastAlloc} | 间隔: ${interval}ms | 状态: ${timer ? '刷新中' : '已停止'}`;
  }

  function tickOnce(): void {
    dataTick += 1;
    if (mode === 'clone') {
      // 最贵的一档：每行一个新对象
      list = list.map((row) => bump(row, dataTick, true));
      table.setList(list);
      lastAlloc = list.length;
      notifyCount += 1;
    } else {
      for (const row of list) bump(row, dataTick, false);
      if (mode === 'slice') {
        // 只新建一个数组，元素全部复用
        list = list.slice();
        table.setList(list);
        lastAlloc = 1;
        notifyCount += 1;
      } else if (mode === 'force') {
        table.forceUpdate();
        lastAlloc = 0;
        notifyCount += 1;
      } else {
        lastAlloc = 0;
      }
    }
    paintStatus();
  }

  function stop(): void {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    paintStatus();
  }

  function start(): void {
    if (timer) return;
    tickOnce();
    timer = setInterval(tickOnce, interval);
    paintStatus();
  }

  const onStart = () => start();
  const onStop = () => stop();

  const onManual = () => {
    table.forceUpdate();
    notifyCount += 1;
    paintStatus();
  };

  const onMode = (next: Mode) => () => {
    mode = next;
    paintMode();
  };
  const modeHandlers: Record<Mode, () => void> = {
    clone: onMode('clone'),
    slice: onMode('slice'),
    force: onMode('force'),
    mutate: onMode('mutate'),
  };

  const onIntervalChange = () => {
    const next = Number(inpInterval.value);
    if (!Number.isFinite(next) || next < 200) return;
    interval = next;
    if (timer) {
      // 改频率要重挂定时器，否则新值下一轮才生效
      clearInterval(timer);
      timer = setInterval(tickOnce, interval);
    }
    paintStatus();
  };

  const onRowsChange = () => {
    const next = Number(inpRows.value);
    if (!Number.isFinite(next) || next < 100) return;
    list = createRows(next);
    dataTick = 0;
    lastAlloc = next;
    table.setList(list);
    notifyCount += 1;
    paintStatus();
  };

  btnStart.addEventListener('click', onStart);
  btnStop.addEventListener('click', onStop);
  btnManual.addEventListener('click', onManual);
  (Object.keys(modeBtns) as Mode[]).forEach((m) => {
    modeBtns[m].addEventListener('click', modeHandlers[m]);
  });
  inpInterval.addEventListener('change', onIntervalChange);
  inpRows.addEventListener('change', onRowsChange);

  paintMode();
  paintStatus();

  return () => {
    stop();
    btnStart.removeEventListener('click', onStart);
    btnStop.removeEventListener('click', onStop);
    btnManual.removeEventListener('click', onManual);
    (Object.keys(modeBtns) as Mode[]).forEach((m) => {
      modeBtns[m].removeEventListener('click', modeHandlers[m]);
    });
    inpInterval.removeEventListener('change', onIntervalChange);
    inpRows.removeEventListener('change', onRowsChange);
    table.destroy();
    root.innerHTML = '';
  };
}
