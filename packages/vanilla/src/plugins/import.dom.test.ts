// @vitest-environment happy-dom
/**
 * `vtImport`：拿文件 → 落表 → 报结果。
 *
 * 解析本体在 `sheet-import.test.ts` 里穷举过了（42 条，含真造 zip 往返），这里只验**接线**：
 * 落表走的是 `setList` / `appendRows` / `setColumns` 哪一条、`autoColumns` 的先后顺序、
 * `transform` 能不能拦、以及**失败时不把页面炸掉**。
 *
 * 文件选择器那条路（`importFile()` 不传参）在 happy-dom 里点不出真实对话框，
 * 所以那部分只验「取消时 resolve(null) 而不是永远悬着」—— 那才是会咬人的地方
 * （Promise 悬着的表现是「点了导入没反应」）。
 *
 * 写法说明见 AGENTS.md §5.1。
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions } from '../index';
import { vtImport } from './import';
import { vtToolbar } from './toolbar';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

type Row = Record<string, any>;

function mount(
  plugins: NonNullable<VirtTableOptions<Row>['plugins']>,
  extra: Partial<VirtTableOptions<Row>> = {},
) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  /** 观测口：当前展示列表只在 PluginContext 上 */
  let read: () => Row[] = () => [];
  const probe = {
    name: 'probe',
    setup: (ctx: any) => {
      read = () => ctx.getList();
    },
  };
  const table = new VirtTable<Row>(box, {
    list: [{ id: 1, name: '原有' }],
    columns: [
      { key: 'id', title: 'ID', width: 80 },
      { key: 'name', title: '名称', width: 160 },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    fixedSize: true,
    buffer: 0,
    renderControl: () => ({ begin: 0, end: 9 }),
    plugins: [...plugins, probe as any],
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return {
    box,
    table,
    /** 工具栏的 shell 包在 `.vt-root` **外**层，所以按钮要从 `box` 查而不是 `root` */
    buttons: (): string[] =>
      [...box.querySelectorAll('.vt-toolbar-button')].map((b) => b.textContent?.trim() ?? ''),
    displayed: (): Row[] => read(),
  };
}

const CSV = '姓名,年龄\n甲,30\n乙,28\n';

describe('vtImport · CSV', () => {
  it('导进来的行落进表格，键就是表头文字', async () => {
    const { table, displayed } = mount([vtImport<Row>()]);
    const r = await table.importFile(CSV);
    expect(r?.keys).toEqual(['姓名', '年龄']);
    expect(r?.rows).toHaveLength(2);
    expect(displayed()).toHaveLength(2);
    expect(displayed()[0].姓名).toBe('甲');
  });

  it('纯数字转成 number（否则排序会按字符串比，10 排在 2 前面）', async () => {
    const { table } = mount([vtImport<Row>()]);
    const r = await table.importFile('n\n10\n2\n');
    expect(r?.rows.map((x) => x.n)).toEqual([10, 2]);
  });

  it('分号分隔（中文 Windows 的 Excel 默认）自动嗅出来', async () => {
    const { table } = mount([vtImport<Row>()]);
    const r = await table.importFile('姓名;年龄\n甲;30');
    expect(r?.keys).toEqual(['姓名', '年龄']);
  });

  it('delimiter 可显式指定', async () => {
    const { table } = mount([vtImport<Row>()]);
    const r = await table.importFile('a|b\n1|2', { delimiter: '|' });
    expect(r?.keys).toEqual(['a', 'b']);
    expect(r?.delimiter).toBe('|');
  });

  it('sheetName 是 csv，sheetNames 只有一项', async () => {
    const { table } = mount([vtImport<Row>()]);
    const r = await table.importFile(CSV);
    expect(r?.sheetName).toBe('csv');
    expect(r?.sheetNames).toEqual(['csv']);
  });

  it('Blob / ArrayBuffer / Uint8Array 都能喂', async () => {
    const { table } = mount([vtImport<Row>()]);
    const bytes = new TextEncoder().encode(CSV);
    expect((await table.importFile(bytes))?.rows).toHaveLength(2);
    expect((await table.importFile(bytes.buffer as ArrayBuffer))?.rows).toHaveLength(2);
    expect((await table.importFile(new Blob([CSV])))?.rows).toHaveLength(2);
  });
});

describe('vtImport · 落表方式', () => {
  it('默认替换（setList）', async () => {
    const { table, displayed } = mount([vtImport<Row>()]);
    await table.importFile(CSV);
    expect(displayed()).toHaveLength(2);
    expect(displayed().some((r) => r.name === '原有')).toBe(false);
  });

  it('append: true 追加（appendRows）', async () => {
    const { table, displayed } = mount([vtImport<Row>()]);
    await table.importFile(CSV, { append: true });
    expect(displayed()).toHaveLength(3);
    expect(displayed()[0].name).toBe('原有');
  });

  it('默认**不换列** —— 往已定义好的表里灌数据', async () => {
    const { table } = mount([vtImport<Row>()]);
    await table.importFile(CSV);
    expect(table.getLeafColumns().map((c) => c.key)).toEqual(['id', 'name']);
  });

  it('autoColumns: true 才按表头推断并换列', async () => {
    const { table } = mount([vtImport<Row>()]);
    await table.importFile(CSV, { autoColumns: true });
    expect(table.getLeafColumns().map((c) => c.key)).toEqual(['姓名', '年龄']);
  });

  it('autoColumns 时列**先**换、行**后**落（否则首帧拿旧列画新数据）', async () => {
    const seen: string[] = [];
    const spy = {
      name: 'orderProbe',
      setup: (ctx: any) => {
        ctx.on('onColumnsChanged', () => seen.push('columns'));
        ctx.on('onDataChanged', () => seen.push('data'));
      },
    };
    const { table } = mount([vtImport<Row>(), spy as any]);
    seen.length = 0;
    await table.importFile(CSV, { autoColumns: true });
    expect(seen.indexOf('columns')).toBeLessThan(seen.lastIndexOf('data'));
  });

  it('零行时不换列（没有样本可推断）', async () => {
    const { table } = mount([vtImport<Row>()]);
    await table.importFile('只有表头\n', { autoColumns: true });
    expect(table.getLeafColumns().map((c) => c.key)).toEqual(['id', 'name']);
  });
});

describe('vtImport · transform', () => {
  it('能改写行', async () => {
    const { table, displayed } = mount([vtImport<Row>()]);
    await table.importFile(CSV, {
      transform: (rows) => rows.map((r, i) => ({ ...r, id: i + 100 })),
    });
    expect(displayed().map((r) => r.id)).toEqual([100, 101]);
  });

  it('能过滤', async () => {
    const { table, displayed } = mount([vtImport<Row>()]);
    await table.importFile(CSV, { transform: (rows) => rows.filter((r) => r.年龄 > 29) });
    expect(displayed()).toHaveLength(1);
  });

  it('返回 false 取消这次导入（表格一行都不动）', async () => {
    const { table, displayed } = mount([vtImport<Row>()]);
    const r = await table.importFile(CSV, { transform: () => false });
    expect(r).toBeNull();
    expect(displayed()).toHaveLength(1);
    expect(displayed()[0].name).toBe('原有');
  });

  it('拿得到 sheet 与 keys（用来自己做校验）', async () => {
    const seen: unknown[] = [];
    const { table } = mount([vtImport<Row>()]);
    await table.importFile(CSV, {
      transform: (rows, c) => {
        seen.push([c.sheet.name, c.keys]);
        return rows;
      },
    });
    expect(seen[0]).toEqual(['csv', ['姓名', '年龄']]);
  });
});

describe('vtImport · 选项与回调', () => {
  it('插件级 defaults 作为默认值，逐次调用可覆盖', async () => {
    const { table } = mount([vtImport<Row>({ defaults: { autoColumns: true } })]);
    await table.importFile(CSV);
    expect(table.getLeafColumns().map((c) => c.key)).toEqual(['姓名', '年龄']);

    // 这一次显式关掉
    const { table: t2 } = mount([vtImport<Row>({ defaults: { autoColumns: true } })]);
    await t2.importFile(CSV, { autoColumns: false });
    expect(t2.getLeafColumns().map((c) => c.key)).toEqual(['id', 'name']);
  });

  it('onImported 拿到已经落表的那批行', async () => {
    const spy = vi.fn();
    const { table } = mount([vtImport<Row>({ onImported: spy })]);
    await table.importFile(CSV);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].rows).toHaveLength(2);
  });

  it('skipRows 跳过表头之前的标题行', async () => {
    const { table } = mount([vtImport<Row>()]);
    const r = await table.importFile('2026 年度\n姓名,年龄\n甲,30', { skipRows: 1 });
    expect(r?.keys).toEqual(['姓名', '年龄']);
    expect(r?.rows).toHaveLength(1);
  });
});

describe('vtImport · 失败不炸页面', () => {
  it('空文件：走 onError，表格不动', async () => {
    const onError = vi.fn();
    const { table, displayed } = mount([vtImport<Row>({ onError })]);
    await expect(table.importFile('')).rejects.toThrow();
    expect(onError).toHaveBeenCalledOnce();
    expect(displayed()).toHaveLength(1);
  });

  it('没给 onError 时只 warn（不静默）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { table } = mount([vtImport<Row>()]);
    await expect(table.importFile('')).rejects.toThrow();
    expect(warn.mock.calls.flat().join(' ')).toContain('vtImport');
  });

  it('不是 xlsx 的 zip：报「没读出 sheet」而不是读出空表', async () => {
    const onError = vi.fn();
    const { table } = mount([vtImport<Row>({ onError })]);
    // PK\x03\x04 开头但不是 xlsx
    const fake = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    await expect(table.importFile(fake)).rejects.toThrow();
    expect(onError.mock.calls[0][0].message).toMatch(/sheet|DecompressionStream/);
  });
});

describe('vtImport · 工具栏', () => {
  it('装了 vtToolbar 就有一颗「导入」', () => {
    const { buttons } = mount([vtImport<Row>(), vtToolbar<Row>()]);
    expect(buttons()).toContain('导入');
  });

  it('toolbar: false 只留 API', () => {
    const { buttons, table } = mount([vtImport<Row>({ toolbar: false }), vtToolbar<Row>()]);
    expect(buttons()).not.toContain('导入');
    expect(typeof table.importFile).toBe('function');
  });

  it('toolbarText 可改文案', () => {
    const { buttons } = mount([vtImport<Row>({ toolbarText: '上传数据' }), vtToolbar<Row>()]);
    expect(buttons()).toContain('上传数据');
  });

  it('没装工具栏时不报错，API 照旧', async () => {
    const { table } = mount([vtImport<Row>()]);
    expect((await table.importFile(CSV))?.rows).toHaveLength(2);
  });

  it('destroy 后工具栏项不残留', () => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Row>(box, {
      list: [],
      columns: [{ key: 'id', title: 'ID', width: 80 }],
      itemKey: 'id',
      estimatedSize: 40,
      plugins: [vtImport<Row>(), vtToolbar<Row>()],
    } as VirtTableOptions<Row>);
    expect(box.querySelector('.vt-toolbar')?.textContent).toContain('导入');
    table.destroy();
    box.remove();
    expect(document.querySelector('.vt-toolbar')).toBeNull();
  });
});

describe('vtImport · readSheets（只解析不落表）', () => {
  it('返回 sheet 列表，表格一行都不动', async () => {
    const { table, displayed } = mount([vtImport<Row>()]);
    const sheets = await table.readSheets(CSV);
    expect(sheets).toHaveLength(1);
    expect(sheets?.[0].name).toBe('csv');
    expect(displayed()).toHaveLength(1);
    expect(displayed()[0].name).toBe('原有');
  });
});


describe('vtImport · 主键校验与原子拒绝', () => {
  it('缺少主键时补齐，所有导入行都有独立 DOM', async () => {
    const { table, box } = mount([vtImport<Row>()]);
    const result = await table.importFile(CSV, { autoColumns: true });
    expect(new Set(result!.rows.map(r => String(r.id))).size).toBe(2);
    expect(result!.rows.every(r => r.id != null)).toBe(true);
    expect(box.querySelectorAll('tbody tr.vt-tr')).toHaveLength(2);
  });

  it('保留 0 和显式主键，生成值避开本批后续主键且不修改 transform 返回值', async () => {
    const { table } = mount([vtImport<Row>()]);
    const rows = [{ id: null }, { id: '__vt_import_1' }, { id: 0 }, { id: '' }];
    const result = await table.importFile(CSV, { transform: () => rows });
    expect(new Set(result!.rows.map(r => String(r.id))).size).toBe(4);
    expect(result!.rows[1].id).toBe('__vt_import_1');
    expect(result!.rows[2].id).toBe(0);
    expect(rows[0].id).toBeNull();
    expect(rows[3].id).toBe('');
  });

  it('显式主键重复时整次拒绝，列、源数据和回调均不提交', async () => {
    const onImported = vi.fn();
    const onError = vi.fn();
    const { table, displayed } = mount([vtImport<Row>({ onImported, onError })]);
    const columns = table.getAllColumns();
    const before = displayed();
    await expect(table.importFile(CSV, {
      autoColumns: true,
      transform: () => [{ id: 1, x: 'a' }, { id: '1', x: 'b' }],
    })).rejects.toThrow('主键 id 重复');
    expect(table.getAllColumns()).toEqual(columns);
    expect(displayed()).toBe(before);
    expect(onImported).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('追加校验覆盖筛选隐藏的源行，并允许替换时复用旧主键', async () => {
    const { table } = mount([vtImport<Row>()]);
    table.setColumnFilter('name', ['不存在']);
    await expect(table.importFile('id,name\n1,新行', { append: true, autoColumns: true }))
      .rejects.toThrow('主键 id 重复');
    expect(table.getSourceRowCount()).toBe(1);
    await expect(table.importFile('id,name\n1,新行')).resolves.not.toBeNull();
  });

  it('连续追加自动主键不冲突，分页隐藏的源行也参与校验', async () => {
    const { table } = mount([vtImport<Row>()], {
      list: [{id: '__vt_import_1', name: 'a'}, {id: 9, name: 'b'}],
      pagination: { pageSize: 1 },
    });
    await table.importFile(CSV, { append: true });
    await table.importFile(CSV, { append: true });
    expect(new Set(table.getSourceRowKeys()).size).toBe(6);
    await expect(table.importFile('id,name\n9,重复', { append: true })).rejects.toThrow('重复');
    expect(table.getSourceRowCount()).toBe(6);
  });

  it('自定义主键与折叠子行同样校验', async () => {
    const { table } = mount([vtImport<Row>()], {
      itemKey: 'uid', list: [{ uid: 'parent', children: [{ uid: 'child' }] }],
    });
    await expect(table.importFile('uid,name\nchild,重复', { append: true })).rejects.toThrow('重复');
    const result = await table.importFile(CSV, { transform: () => [{children: [{}]}] });
    expect(result!.rows[0].uid).toBeTruthy();
    expect(result!.rows[0].children[0].uid).toBeTruthy();
    expect(new Set(table.getSourceRowKeys()).size).toBe(2);
  });
});
