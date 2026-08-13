import { faker } from '@faker-js/faker';
import {
  VirtTable,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import {
  vtClipboard,
  vtCellSelection,
} from '@virt-table/vanilla/plugins';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  city: string;
  score: number;
}

const depts = ['工程部', '设计部', '市场部', '财务部'];

const makeList = (): Row[] =>
  Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length]!,
    city: faker.location.city(),
    score: faker.number.int({ min: 0, max: 100 }),
  }));

/** 结构化 payload：演示自定义 MIME 往返（表内复制粘贴可保留原始类型） */
interface DemoPayload {
  kind: 'vt-demo';
  rowCount: number;
  colCount: number;
  cells: unknown[][];
}

export function bootstrapTableClipboard(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 70 },
    { key: 'name', title: '姓名', width: 170 },
    { key: 'dept', title: '部门', width: 130 },
    { key: 'city', title: '城市', width: 150 },
    { key: 'score', title: '分数', width: 100, align: 'right' },
  ];

  let list = makeList();
  /** 开启后复制会额外写入自定义 MIME 的结构化数据，粘贴时优先用它 */
  let usePayload = false;

  root.innerHTML = `
    <div class="demo-hint">
      拖选一片单元格 → <b>Ctrl/Cmd+C</b> 复制（TSV，可粘到 Excel）；
      选中目标左上角单元格 → <b>Ctrl/Cmd+V</b> 粘贴。粘贴行数超出数据时会自动补空行。
    </div>
    <div class="virt-table-controls">
      <label>
        <input type="checkbox" id="payload" />
        携带结构化 payload（自定义 MIME，保留原始类型）
      </label>
      <button type="button" class="virt-table-btn" id="reset">重置数据</button>
    </div>
    <div class="status-text" id="status">等待复制/粘贴…</div>
    <div style="width:760px;height:420px;" class="demo-container" id="c"></div>`;

  const container = root.querySelector('#c') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;
  const setStatus = (msg: string): void => { statusEl.textContent = msg; };

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    // 剪贴板以框选区域为单位，必须同时启用框选
    plugins: [vtCellSelection(), 
      vtClipboard<Row>({
        mimeType: 'application/x-vt-demo+json',

        onCopy: (ctx) => {
          const size = `${ctx.rows.length} 行 × ${ctx.columnIndexes.length} 列`;
          if (!usePayload) {
            setStatus(`已复制 ${size}（默认 TSV）`);
            return; // 返回 undefined → 用插件默认的 TSV
          }
          const payload: DemoPayload = {
            kind: 'vt-demo',
            rowCount: ctx.rows.length,
            colCount: ctx.columnIndexes.length,
            cells: ctx.rows.map((line) => [...line]),
          };
          setStatus(`已复制 ${size}（TSV + 结构化 payload）`);
          return { text: ctx.rows.map((l) => l.join('\t')).join('\n'), payload };
        },

        onPaste: (ctx) => {
          const payload = ctx.payload as DemoPayload | null;
          if (!payload || payload.kind !== 'vt-demo') {
            // 没有自定义 payload（例如从 Excel 粘来）→ 交回插件走默认 TSV 写回
            setStatus(`粘贴 ${ctx.rows.length} 行（默认 TSV 解析）`);
            return false;
          }
          setStatus(
            `粘贴 ${payload.rowCount} 行 × ${payload.colCount} 列（走结构化 payload）`,
          );
          return false; // 本示例仍交回默认写回，只是演示 payload 已拿到
        },
      }),
    ],
  });

  const payloadCb = root.querySelector('#payload') as HTMLInputElement;
  const onToggle = (): void => {
    usePayload = payloadCb.checked;
    setStatus(usePayload ? '复制将携带结构化 payload' : '复制只写 TSV');
  };
  const onReset = (): void => {
    list = makeList();
    table.setList(list);
    table.clearCellSelection();
    setStatus('数据已重置');
  };

  payloadCb.addEventListener('change', onToggle);
  root.querySelector('#reset')!.addEventListener('click', onReset);

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
