import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtImport, vtToolbar } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/toolbar.css';

interface Row {
  [key: string]: unknown;
}

/**
 * `vtImport` 示例。
 *
 * 演示三条入口：工具栏那颗「导入」（弹文件选择器）、拖一个文件进来、以及不落地的
 * 「先看有哪些 sheet 再决定导哪张」。
 *
 * 底下备了一段内置 CSV —— 文档站上没人会真去找个 xlsx 来上传，但「导进来长什么样」
 * 得能一键看到。
 */
const SAMPLE_CSV = [
  '姓名,部门,入职日期,月薪',
  '陈静,研发,2021-03-01,24000',
  '李伟,设计,2022-07-15,18500',
  '王芳,销售,2020-11-02,21000',
  '赵鹏,研发,2023-01-09,16000',
].join('\n');

export function bootstrapTableImport(root: HTMLElement): () => void {
  /** 起手是一张**已经定义好列**的表 —— 默认导入只换行、不换列，这里要能看出区别 */
  const columns: VirtTableColumn<Row>[] = [
    { key: '姓名', title: '姓名', width: 130 },
    { key: '部门', title: '部门', width: 110 },
    { key: '入职日期', title: '入职日期', width: 140 },
    { key: '月薪', title: '月薪', width: 120, align: 'right' },
  ];

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="sample">导入内置示例 CSV</button>
      <button class="virt-table-btn" id="append">追加一次（append）</button>
      <button class="virt-table-btn" id="auto">按表头重推列（autoColumns）</button>
      <button class="virt-table-btn" id="sheets">只看有哪些 sheet</button>
      <button class="virt-table-btn" id="clear">清空</button>
    </div>
    <div class="demo-note" id="drop"
         style="margin:8px 0;padding:10px 12px;border:1px dashed var(--vp-c-divider);border-radius:6px;">
      把 .csv / .xlsx 拖到这里，或点工具栏上的「导入」选文件
    </div>
    <div style="width:820px;height:380px;" class="demo-container" id="c"></div>
    <div class="demo-note" id="hint" style="margin-top:8px;"></div>`;

  const container = root.querySelector('#c') as HTMLElement;
  const hint = root.querySelector('#hint') as HTMLElement;
  const drop = root.querySelector('#drop') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list: [],
    columns,
    itemKey: '姓名',
    estimatedSize: 40,
    fixedSize: true,
    border: true,
    stripe: true,
    emptyText: '还没有数据 —— 点上面那颗「导入内置示例 CSV」',
    plugins: [
      vtToolbar<Row>(),
      vtImport<Row>({
        // 导完把「几行几列、哪张 sheet」报出来。真实项目里这里通常是一个 toast
        onImported: (r) => {
          hint.textContent =
            `导入成功：${r.rows.length} 行 · ${r.keys.length} 列（${r.keys.join(' / ')}）` +
            ` · sheet「${r.sheetName}」` +
            (r.sheetNames.length > 1 ? `（共 ${r.sheetNames.length} 张）` : '') +
            (r.delimiter ? ` · 分隔符「${r.delimiter}」` : '');
        },
        // 不给 onError 的话解析失败只 console.warn，用户看不到
        onError: (e) => {
          hint.textContent = `导入失败：${e.message}`;
        },
      }),
    ],
  });

  const onSample = (): void => {
    void table.importFile(SAMPLE_CSV);
  };
  const onAppend = (): void => {
    void table.importFile(SAMPLE_CSV, { append: true });
  };
  const onAuto = (): void => {
    // 换一份表头完全不同的数据：开了 autoColumns 才会连列一起换掉
    void table.importFile('工号\t项目\t工时\n1001\t重构\t8\n1002\t联调\t6.5\n', {
      autoColumns: true,
    });
  };
  const onSheets = async (): Promise<void> => {
    // 只解析、不落表：多 sheet 的 xlsx 上用来先让用户挑一张
    const sheets = await table.readSheets();
    if (!sheets) return; // 用户按了取消
    hint.textContent = `这个文件里有 ${sheets.length} 张：${sheets
      .map((s) => `${s.name}（${Math.max(0, s.rows.length - 1)} 行）`)
      .join('、')}`;
  };
  const onClear = (): void => {
    table.setList([]);
    hint.textContent = '';
  };

  /*
   * 拖放：`vtImport` 不接管拖放（那会和「拖行排序」「拖列宽」抢事件），
   * 但 `importFile(file)` 什么都能喂，所以自己接一下就三行。
   */
  const onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    drop.style.borderColor = 'var(--vp-c-brand-1)';
  };
  const onDragLeave = (): void => {
    drop.style.borderColor = '';
  };
  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    drop.style.borderColor = '';
    const file = e.dataTransfer?.files?.[0];
    if (file) void table.importFile(file, { autoColumns: true });
  };

  const sampleBtn = root.querySelector('#sample') as HTMLButtonElement;
  const appendBtn = root.querySelector('#append') as HTMLButtonElement;
  const autoBtn = root.querySelector('#auto') as HTMLButtonElement;
  const sheetsBtn = root.querySelector('#sheets') as HTMLButtonElement;
  const clearBtn = root.querySelector('#clear') as HTMLButtonElement;
  sampleBtn.addEventListener('click', onSample);
  appendBtn.addEventListener('click', onAppend);
  autoBtn.addEventListener('click', onAuto);
  sheetsBtn.addEventListener('click', () => void onSheets());
  clearBtn.addEventListener('click', onClear);
  drop.addEventListener('dragover', onDragOver);
  drop.addEventListener('dragleave', onDragLeave);
  drop.addEventListener('drop', onDrop);

  return () => {
    sampleBtn.removeEventListener('click', onSample);
    appendBtn.removeEventListener('click', onAppend);
    autoBtn.removeEventListener('click', onAuto);
    clearBtn.removeEventListener('click', onClear);
    drop.removeEventListener('dragover', onDragOver);
    drop.removeEventListener('dragleave', onDragLeave);
    drop.removeEventListener('drop', onDrop);
    table.destroy();
    root.innerHTML = '';
  };
}
