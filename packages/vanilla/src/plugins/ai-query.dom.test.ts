// @vitest-environment happy-dom
/** vtAIQuery 的落地链路：模型产物 → 校验 → setState → 真实渲染。写法说明见 AGENTS.md §5.1 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions } from '../index';
import { vtAIQuery } from './ai-query';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

const LIST: Row[] = [
  { id: 1, name: '甲公司', region: 'east', amount: 300 },
  { id: 2, name: '乙公司', region: 'south', amount: 1200 },
  { id: 3, name: '丙公司', region: 'east', amount: 900 },
  { id: 4, name: '丁公司', region: 'south', amount: 150 },
];

/** `resolve` 直接吐一个预设的模型产物，不碰网络 */
function mount(resolve: (input: any) => Promise<unknown>, extra: Partial<VirtTableOptions<Row>> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list: LIST.slice(),
    columns: [
      { key: 'idx', title: '序号', width: 60, type: 'index' },
      { key: 'name', title: '客户名称', width: 120 },
      {
        key: 'region',
        title: '大区',
        width: 100,
        filterType: 'enum',
        filters: [
          { label: '华东区', value: 'east' },
          { label: '华南区', value: 'south' },
        ],
      },
      { key: 'amount', title: '销售额', width: 100, filterType: 'number-range' },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 9 }),
    plugins: [vtAIQuery({ resolve })],
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

/** 当前渲染出来的行，按某列取值 */
const cells = (box: HTMLElement, colKey: string): string[] =>
  [...box.querySelectorAll<HTMLElement>(`tbody td[data-col-key="${colKey}"]`)].map(
    (td) => td.textContent?.trim() ?? '',
  );

const visibleCols = (box: HTMLElement): string[] =>
  [...box.querySelectorAll<HTMLElement>('thead th[data-col-key]')].map((th) => th.dataset.colKey!);

describe('vtAIQuery 落地链路', () => {
  it('筛选条件真的改变渲染出的行', async () => {
    const { box, table } = mount(async () => ({
      filter: { kind: 'group', logic: 'and', children: [{ kind: 'condition', colKey: 'amount', operator: 'gt', value: 500 }] },
      explanation: '销售额大于 500',
    }));
    expect(cells(box, 'name')).toHaveLength(4);
    await table.askAITable('销售额超过 500 的');
    expect(cells(box, 'name')).toEqual(['乙公司', '丙公司']);
  });

  it('排序真的改变行顺序', async () => {
    const { box, table } = mount(async () => ({ sort: [{ colKey: 'amount', order: 'desc' }] }));
    await table.askAITable('按销售额从高到低');
    expect(cells(box, 'amount')).toEqual(['1200', '900', '300', '150']);
  });

  it('「只看这几列」隐藏其余列，功能列不受影响', async () => {
    const { box, table } = mount(async () => ({ columns: ['name', 'amount'] }));
    expect(visibleCols(box)).toEqual(['idx', 'name', 'region', 'amount']);
    await table.askAITable('只看客户名称和销售额');
    expect(visibleCols(box)).toEqual(['idx', 'name', 'amount']);
  });

  it('筛选 + 排序 + 列显隐一次落地', async () => {
    const { box, table } = mount(async () => ({
      filter: { kind: 'group', logic: 'and', children: [{ kind: 'condition', colKey: 'region', operator: 'in', value: ['east'] }] },
      sort: [{ colKey: 'amount', order: 'desc' }],
      columns: ['name', 'amount'],
    }));
    await table.askAITable('华东区的，按销售额降序，只看名称和金额');
    expect(cells(box, 'name')).toEqual(['丙公司', '甲公司']);
    expect(visibleCols(box)).toEqual(['idx', 'name', 'amount']);
  });

  it('枚举列的 label 被回译成 value，筛选才真的命中', async () => {
    const { box, table } = mount(async () => ({
      // 模型填了用户说的「华东区」而不是候选值 east —— 不回译的话这里会筛出 0 行
      filter: { kind: 'group', logic: 'and', children: [{ kind: 'condition', colKey: 'region', operator: 'in', value: ['华东区'] }] },
    }));
    const r = await table.askAITable('华东区的客户');
    expect(cells(box, 'name')).toEqual(['甲公司', '丙公司']);
    expect(r.issues.some((i) => i.level === 'warn' && i.message.includes('回译'))).toBe(true);
  });
});

describe('vtAIQuery 撤销', () => {
  it('undoAIQuery 恢复到应用前的视图', async () => {
    const { box, table } = mount(async () => ({
      filter: { kind: 'group', logic: 'and', children: [{ kind: 'condition', colKey: 'amount', operator: 'gt', value: 500 }] },
      columns: ['name'],
    }));
    await table.askAITable('销售额大于 500，只看名称');
    expect(cells(box, 'name')).toEqual(['乙公司', '丙公司']);
    expect(table.undoAIQuery()).toBe(true);
    expect(cells(box, 'name')).toHaveLength(4);
    expect(visibleCols(box)).toEqual(['idx', 'name', 'region', 'amount']);
  });

  it('没有可撤销的应用时返回 false', () => {
    const { table } = mount(async () => ({}));
    expect(table.undoAIQuery()).toBe(false);
  });

  it('撤销后不能重复撤销（快照已消费）', async () => {
    const { table } = mount(async () => ({ sort: [{ colKey: 'amount', order: 'desc' }] }));
    await table.askAITable('降序');
    expect(table.undoAIQuery()).toBe(true);
    expect(table.undoAIQuery()).toBe(false);
  });

  it('撤销会还原用户自己拖出来的列宽，而不是回落到默认值', async () => {
    const { table } = mount(async () => ({ columns: ['name'] }));
    // 模拟用户先拖过列宽：状态里存的是逻辑宽度，撤销应当原样带回
    table.setState({ ...table.getState(), columns: table.getState().columns!.map((c) => (c.key === 'region' ? { ...c, width: 222 } : c)) });
    await table.askAITable('只看名称');
    table.undoAIQuery();
    expect(table.getState().columns!.find((c) => c.key === 'region')!.width).toBe(222);
  });
});

describe('vtAIQuery 错误与边界', () => {
  it('幻觉列名不改动表格，并如实报 error', async () => {
    const { box, table } = mount(async () => ({
      filter: { kind: 'group', logic: 'and', children: [{ kind: 'condition', colKey: 'profit', operator: 'gt', value: 1 }] },
    }));
    const r = await table.askAITable('毛利大于 1');
    expect(r.applied).toBe(false);
    expect(r.issues.filter((i) => i.level === 'error')).toHaveLength(1);
    expect(cells(box, 'name')).toHaveLength(4);
  });

  it('resolve 抛错时 reject，并回调 onError', async () => {
    const onError = vi.fn();
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Row>(box, {
      list: LIST.slice(),
      columns: [{ key: 'name', title: '客户名称', width: 120 }],
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderControl: () => ({ begin: 0, end: 9 }),
      plugins: [vtAIQuery({ resolve: async () => { throw new Error('网关 502'); }, onError })],
    } as VirtTableOptions<Row>);
    cleanups.push(() => {
      table.destroy();
      box.remove();
    });

    await expect(table.askAITable('随便问问')).rejects.toThrow('网关 502');
    expect(onError).toHaveBeenCalledOnce();
  });

  it('confirm 返回 false 则不应用', async () => {
    const { box, table } = mount(async () => ({ sort: [{ colKey: 'amount', order: 'desc' }] }));
    table.destroy();

    const box2 = document.createElement('div');
    document.body.appendChild(box2);
    const t2 = new VirtTable<Row>(box2, {
      list: LIST.slice(),
      columns: [
        { key: 'name', title: '客户名称', width: 120 },
        { key: 'amount', title: '销售额', width: 100 },
      ],
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderControl: () => ({ begin: 0, end: 9 }),
      plugins: [
        vtAIQuery({
          resolve: async () => ({ sort: [{ colKey: 'amount', order: 'desc' }] }),
          confirm: () => false,
        }),
      ],
    } as VirtTableOptions<Row>);
    cleanups.push(() => {
      t2.destroy();
      box2.remove();
    });

    const r = await t2.askAITable('降序');
    expect(r.applied).toBe(false);
    expect(cells(box2, 'amount')).toEqual(['300', '1200', '900', '150']);
    void box;
  });

  it('新一轮查询作废上一轮，晚到的旧结果不会覆盖新结果', async () => {
    let call = 0;
    const { box, table } = mount(async ({ signal }) => {
      call++;
      const mine = call;
      // 第一轮故意慢：它回来时第二轮已经落地了
      await new Promise((r) => setTimeout(r, mine === 1 ? 30 : 0));
      if (signal.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      return mine === 1
        ? { sort: [{ colKey: 'amount', order: 'asc' }] }
        : { sort: [{ colKey: 'amount', order: 'desc' }] };
    });

    const slow = table.askAITable('升序');
    const fast = table.askAITable('改成降序');
    await Promise.all([slow.catch(() => {}), fast]);
    expect(cells(box, 'amount')).toEqual(['1200', '900', '300', '150']);
  });
});

describe('vtAIQuery schema 输出', () => {
  it('getAITableSchema 跳过功能列', () => {
    const { table } = mount(async () => ({}));
    expect(table.getAITableSchema().columns.map((c) => c.key)).toEqual(['name', 'region', 'amount']);
  });

  it('schema 跟随列显隐之外的列结构变化', () => {
    const { table } = mount(async () => ({}));
    table.setColumns([
      { key: 'name', title: '客户名称', width: 120 },
      { key: 'note', title: '备注', width: 120 },
    ]);
    expect(table.getAITableSchema().columns.map((c) => c.key)).toEqual(['name', 'note']);
  });

  it('getAIToolSchema 用 enum 收窄列 key', () => {
    const { table } = mount(async () => ({}));
    const js = table.getAIToolSchema() as any;
    expect(js.$defs.condition.properties.colKey.enum).toEqual(['name', 'region', 'amount']);
  });

  it('getAIPromptContext 带上枚举候选的 label=value', () => {
    const { table } = mount(async () => ({}));
    expect(table.getAIPromptContext()).toContain('华东区="east"');
  });

  it('applyAIQuery 跳过模型直接应用，同样走校验', () => {
    const { box, table } = mount(async () => ({}));
    const r = table.applyAIQuery({
      filter: { kind: 'group', logic: 'and', children: [{ kind: 'condition', colKey: 'amount', operator: 'gt', value: 500 }] },
    });
    expect(r.applied).toBe(true);
    expect(cells(box, 'name')).toEqual(['乙公司', '丙公司']);
  });
});

describe('vtAIQuery UI', () => {
  it('默认挂输入条，Escape 关闭', () => {
    const { box, table } = mount(async () => ({}));
    const panel = box.querySelector<HTMLElement>('.vt-ai-panel')!;
    expect(panel).toBeTruthy();
    expect(panel.style.display).toBe('none');
    table.openAIQueryBar();
    expect(panel.style.display).toBe('');
    box.querySelector('.vt-ai-input')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(panel.style.display).toBe('none');
  });

  it('mod+K 开关输入条', () => {
    const { box } = mount(async () => ({}));
    const panel = box.querySelector<HTMLElement>('.vt-ai-panel')!;
    const press = () =>
      box.querySelector('.vt-root')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }),
      );
    press();
    expect(panel.style.display).toBe('');
    press();
    expect(panel.style.display).toBe('none');
  });

  it('ui: false 时不建 DOM，命令式 API 照常可用', async () => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Row>(box, {
      list: LIST.slice(),
      columns: [
        { key: 'name', title: '客户名称', width: 120 },
        { key: 'amount', title: '销售额', width: 100 },
      ],
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderControl: () => ({ begin: 0, end: 9 }),
      plugins: [vtAIQuery({ ui: false, resolve: async () => ({ sort: [{ colKey: 'amount', order: 'desc' }] }) })],
    } as VirtTableOptions<Row>);
    cleanups.push(() => {
      table.destroy();
      box.remove();
    });
    expect(box.querySelector('.vt-ai-panel')).toBeNull();
    await table.askAITable('降序');
    expect(cells(box, 'amount')).toEqual(['1200', '900', '300', '150']);
  });

  it('输入框回车触发查询，反馈区显示模型复述', async () => {
    const { box, table } = mount(async () => ({ sort: [{ colKey: 'amount', order: 'desc' }], explanation: '按销售额降序' }));
    table.openAIQueryBar();
    const input = box.querySelector<HTMLInputElement>('.vt-ai-input')!;
    input.value = '按销售额降序';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(box.querySelector('.vt-ai-explanation')?.textContent).toBe('按销售额降序');
    });
    expect(box.querySelector('.vt-ai-undo')).toBeTruthy();
  });

  it('销毁后移除 DOM', () => {
    const { box, table } = mount(async () => ({}));
    table.destroy();
    expect(box.querySelector('.vt-ai-panel')).toBeNull();
  });
});
