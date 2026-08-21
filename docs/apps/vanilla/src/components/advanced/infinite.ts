import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn, type DataRequest, type DataResponse } from '@virt-table/vanilla';

interface Row { id: number; name: string; dept: string; qty: number; price: number }

/**
 * 无限滚动示例：`infinite` + `loadData` 糖层。
 *
 * 表格负责编排：滚到底自动取下一批、在途去重（toBottom 每次滚动都会触发）、
 * 竞态作废、底部状态条四态（加载中 / 加载更多 / 没有更多 / 失败重试）。
 * 用户只负责 `loadData` 里怎么发请求。
 *
 * 这里用 3000 条本地数据 + 400ms 延迟模拟服务端；「注入故障」勾上后下一次请求会失败，
 * 可以看到底部条切到错误态并给出重试按钮（已加载的数据不会丢）。
 */
export function bootstrapTableInfinite(root: HTMLElement): () => void {
  const depts = ['工程部', '设计部', '市场部', '财务部'];
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: '姓名', width: 220 },
    { key: 'dept', title: '部门', width: 160 },
    { key: 'qty', title: '数量', width: 140, align: 'right' },
    { key: 'price', title: '单价', width: 140, align: 'right' },
  ];

  // 模拟服务端数据（真实场景中在后端）
  const TOTAL = 3000;
  const db: Row[] = Array.from({ length: TOTAL }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length],
    qty: faker.number.int({ min: 1, max: 20 }),
    price: faker.number.int({ min: 5, max: 500 }),
  }));

  let failNext = false;
  let reqSeq = 0;

  root.innerHTML = `
    <div class="demo-hint">滚到底部自动加载下一批(每批 50 条,共 3000 条)。表格内部已做在途去重与竞态处理,底部状态条自动展示加载中/没有更多/失败重试。</div>
    <div class="virt-table-controls">
      <label><input type="checkbox" id="manual" /> 手动模式（只显示「加载更多」按钮）</label>
      <label><input type="checkbox" id="both" /> 双向加载（从第 1500 条开始，可向上加载更早数据）</label>
      <label><input type="checkbox" id="fail" /> 注入故障（下一次请求失败）</label>
      <button id="reload">重新加载</button>
      <span id="stat" class="demo-note"></span>
    </div>
    <div style="width:820px;height:460px;" class="demo-container" id="c"></div>
    <div id="log" class="status-text" style="margin-top:12px;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;"></div>`;

  const container = root.querySelector('#c') as HTMLElement;
  const manualEl = root.querySelector('#manual') as HTMLInputElement;
  const bothEl = root.querySelector('#both') as HTMLInputElement;
  const failEl = root.querySelector('#fail') as HTMLInputElement;
  const reloadEl = root.querySelector('#reload') as HTMLButtonElement;
  const statEl = root.querySelector('#stat') as HTMLElement;
  const logEl = root.querySelector('#log') as HTMLElement;

  const logs: string[] = [];
  const log = (msg: string): void => {
    logs.unshift(msg);
    logEl.textContent = logs.slice(0, 6).join('\n');
  };

  /**
   * 模拟服务端：延迟 + 可注入失败。
   *
   * 双向模式用**游标**表达位置（真实的向上加载场景通常也是游标）：
   * cursor / prevCursor 为「数据库里的绝对下标」，返回 null 即该方向到头。
   */
  const START = 1500; // 双向模式的起始位置（db 中间）
  let downAt = START; // 已向下取到哪
  let upAt = START;   // 已向上取到哪

  const loadData = (req: DataRequest): Promise<DataResponse<Row>> => {
    const seq = ++reqSeq;
    const both = bothEl.checked;
    log(`#${seq} ${req.reason} offset=${req.offset} pageSize=${req.pageSize}${both ? ` cursor=${req.cursor} prevCursor=${req.prevCursor}` : ''}`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (failNext) {
          failNext = false;
          failEl.checked = false;
          log(`#${seq} ✗ 失败（可点重试）`);
          reject(new Error('mock network error'));
          return;
        }

        if (!both) {
          const rows = db.slice(req.offset, req.offset + req.pageSize);
          log(`#${seq} ✓ 返回 ${rows.length} 条`);
          // 返回 total，表格据此判定 hasMore（也可以只返回 cursor 或什么都不返回）
          resolve({ rows, total: TOTAL });
          return;
        }

        // ---- 双向（游标）模式 ----
        if (req.channel === 'prev') {
          const end = upAt;
          const start = Math.max(0, end - req.pageSize);
          upAt = start;
          const rows = db.slice(start, end);
          log(`#${seq} ✓ 向上返回 ${rows.length} 条 [${start}, ${end})`);
          resolve({ rows, prevCursor: start > 0 ? String(start) : null });
          return;
        }
        if (req.channel === 'more') {
          const start = downAt;
          const end = Math.min(TOTAL, start + req.pageSize);
          downAt = end;
          const rows = db.slice(start, end);
          log(`#${seq} ✓ 向下返回 ${rows.length} 条 [${start}, ${end})`);
          resolve({ rows, cursor: end < TOTAL ? String(end) : null });
          return;
        }
        // 首屏：从中间取一批，两个方向都还有数据
        downAt = START + req.pageSize;
        upAt = START;
        const rows = db.slice(START, downAt);
        log(`#${seq} ✓ 首屏返回 ${rows.length} 条 [${START}, ${downAt})`);
        resolve({ rows, cursor: String(downAt), prevCursor: String(START) });
      }, 400);
    });
  };

  let table: VirtTable<Row> | null = null;

  const create = (): void => {
    table?.destroy();
    table = new VirtTable<Row>(container, {
      list: [],
      columns,
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true, // 固定行高：追加时滚动条不会因为重新测量而抖动
      buffer: 6,
      border: true,
      infinite: {
        pageSize: 50,
        distance: 200,
        manual: manualEl.checked,
        direction: bothEl.checked ? 'both' : 'down',
      },
      loadData,
      onRemoteStateChange: (st) => {
        const total = st.total < 0 ? '?' : st.total;
        statEl.textContent =
          `已加载 ${st.loadedCount}/${total} 条${st.hasMore ? '' : ' · 向下到底'}` +
          (bothEl.checked ? `${st.hasPrev ? '' : ' · 向上到头'}` : ` · 第 ${st.page} 批`);
      },
      onLoadError: (err) => log(`onLoadError: ${(err as Error).message}`),
    });
  };

  create();
  manualEl.addEventListener('change', create);
  bothEl.addEventListener('change', () => {
    downAt = START;
    upAt = START;
    create();
  });
  reloadEl.addEventListener('click', () => table?.reload());
  failEl.addEventListener('change', () => {
    failNext = failEl.checked;
  });

  return () => {
    table?.destroy();
    table = null;
    root.innerHTML = '';
  };
}
