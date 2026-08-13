import { VirtTable } from '@virt-table/vanilla';
import { vtAIStream } from '@virt-table/vanilla/plugins';

/**
 * vtAIStream：一边收数据一边渲染，列自己长出来。
 *
 * 这个 demo 模拟的是「agent 跑完一段任务，把结果一行一行吐回来」——
 * 表格初始**没有任何列配置**（`columns: []`），首批数据到达时由
 * `inferColumns()` 推断出列（类型、标题、宽度、对齐都是算出来的）。
 *
 * 换成真实数据源只需替换这个生成器，比如吃 SSE：
 *
 * ```ts
 * async function* rowsFromSSE(url: string) {
 *   const res = await fetch(url);
 *   const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
 *   let buf = '';
 *   for (;;) {
 *     const { value, done } = await reader.read();
 *     if (done) break;
 *     buf += value;
 *     const lines = buf.split('\n');
 *     buf = lines.pop()!;
 *     for (const line of lines) {
 *       if (line.startsWith('data: ')) yield JSON.parse(line.slice(6));
 *     }
 *   }
 * }
 * await table.consumeAIStream(rowsFromSSE('/api/rows'));
 * ```
 */

const FIRST_NAMES = ['林', '陈', '王', '李', '张', '刘', '黄', '周', '吴', '徐'];
const GIVEN = ['明', '静', '磊', '娜', '强', '敏', '杰', '芳', '涛', '燕'];
const CITIES = ['上海', '北京', '深圳', '杭州', '成都', '广州', '武汉', '西安'];
const CHANNELS = ['官网', '小程序', '门店', '电话', '第三方平台'];
const STATUS = ['已完成', '处理中', '待审核', '已取消'];

/** 一条「agent 抓回来的」记录。注意 key 是 camelCase，标题由 humanizeKey 推出来 */
function makeRow(i: number) {
  const rnd = (n: number) => Math.floor(Math.random() * n);
  return {
    id: i,
    orderNo: `SO${String(202600000 + i)}`, // 纯数字串：不该被当成数字右对齐
    customerName: FIRST_NAMES[rnd(FIRST_NAMES.length)] + GIVEN[rnd(GIVEN.length)],
    city: CITIES[rnd(CITIES.length)],
    channel: CHANNELS[rnd(CHANNELS.length)],
    amount: rnd(980000) + 2000, // 数字：应当右对齐 + 千分位
    settled: Math.random() > 0.4, // 布尔：应当居中
    createdAt: new Date(Date.now() - rnd(86400000 * 90)).toISOString().slice(0, 10), // 日期
    status: STATUS[rnd(STATUS.length)],
  };
}

export function bootstrapTableAIStream(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="demo-toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;">
      <button type="button" id="btnStart" style="cursor:pointer;font-size:13px;padding:4px 14px;border-radius:6px;border:1px solid var(--vp-c-divider,#ddd);background:transparent;color:inherit;">开始接收</button>
      <button type="button" id="btnStop" style="cursor:pointer;font-size:13px;padding:4px 14px;border-radius:6px;border:1px solid var(--vp-c-divider,#ddd);background:transparent;color:inherit;">停止</button>
      <button type="button" id="btnBurst" style="cursor:pointer;font-size:13px;padding:4px 14px;border-radius:6px;border:1px solid var(--vp-c-divider,#ddd);background:transparent;color:inherit;">灌 2 万行</button>
      <button type="button" id="btnReset" style="cursor:pointer;font-size:13px;padding:4px 14px;border-radius:6px;border:1px solid var(--vp-c-divider,#ddd);background:transparent;color:inherit;">清空重来</button>
      <span id="streamStat" style="font-size:12px;opacity:.7;margin-left:4px;font-variant-numeric:tabular-nums;"></span>
    </div>
    <div style="font-size:12px;opacity:.6;margin-bottom:8px;">
      表格初始<strong>没有列配置</strong>，列是首批数据到达时推断出来的（金额右对齐 + 千分位、结清居中、
      订单号虽是数字串但不右对齐）。接收中往上滚会脱离底部跟随，滚回底部自动恢复。
    </div>
    <div style="width:100%;height:520px;" class="demo-container" id="tableContainer"></div>
  `;
  const container = root.querySelector('#tableContainer') as HTMLElement;
  const statEl = root.querySelector('#streamStat') as HTMLElement;

  const table = new VirtTable(container, {
    list: [],
    columns: [], // 故意留空 —— 列由 vtAIStream 推断
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    emptyText: '等待数据…点上方「开始接收」',
    plugins: [
      vtAIStream({
        // 给数字列配上千分位（inferColumns 推出 cellType: 'number' 后由核心渲染）
        inferOptions: { minWidth: 96 },
        onStateChange(state) {
          statEl.textContent =
            state.status === 'idle'
              ? ''
              : `${state.status} · 已落地 ${state.received.toLocaleString()} 行` +
                (state.buffered > 0 ? ` · 缓冲 ${state.buffered}` : '') +
                (state.following ? '' : ' · 已脱离跟随');
        },
      }),
    ],
  });

  let seq = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /** 模拟「模型逐条吐结果」：每 40ms 来 1~6 行，节奏不均匀 */
  const startTrickle = () => {
    stopped = false;
    table.startAIStream();
    const step = () => {
      if (stopped) return;
      const n = 1 + Math.floor(Math.random() * 6);
      table.pushAIStreamRows(Array.from({ length: n }, () => makeRow(seq++)));
      timer = setTimeout(step, 30 + Math.random() * 60);
    };
    step();
  };

  const stop = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
    table.endAIStream();
  };

  root.querySelector('#btnStart')!.addEventListener('click', () => {
    if (!stopped && timer) return;
    startTrickle();
  });
  root.querySelector('#btnStop')!.addEventListener('click', stop);

  // 一次灌很多：验证批量落地不会把一帧撑爆（maxRowsPerFlush 会分批）
  root.querySelector('#btnBurst')!.addEventListener('click', () => {
    table.pushAIStreamRows(Array.from({ length: 20000 }, () => makeRow(seq++)));
  });

  root.querySelector('#btnReset')!.addEventListener('click', () => {
    stop();
    seq = 0;
    table.setList([]);
    table.setColumns([]);
    table.startAIStream();
    statEl.textContent = '';
  });

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    table.destroy();
    root.innerHTML = '';
  };
}
