import { faker } from '@faker-js/faker';
import {
  VirtTable,
  type RowMoveDetail,
  type VirtTableColumn,
  type VirtTableRowExtras,
} from '@virt-table/vanilla';
import { vtRowDrag } from '@virt-table/vanilla/plugins';

/**
 * `VirtTableRowExtras` 把内核写在行上的那批下划线字段（`_rowType` / `_groupName` /
 * `_treeLevel` / `children` …）带进类型，省掉一堆 `as any`。
 */
interface Row extends VirtTableRowExtras<Row> {
  id: string;
  name: string;
  owner: string;
  /**
   * 分组维度。**刻意与树结构正交** —— 它是「归谁管」，树是「项目 → 模块 → 任务」，
   * 两者同时开才有意义（否则按树的层级字段分组，每个分组下只会有一个根节点）。
   */
  region: string;
  progress: number;
}

const REGIONS = ['华东区', '华北区', '华南区'];

/** 三层树：项目 → 模块 → 任务。`region` 挂在项目上，子节点继承（拍平后分组才说得通） */
function treeList(): Row[] {
  return Array.from({ length: 6 }, (_, p) => {
    const region = REGIONS[p % REGIONS.length];
    return {
      id: `p${p}`,
      name: `项目 ${String.fromCharCode(65 + p)}`,
      owner: faker.person.fullName(),
      region,
      progress: faker.number.int({ min: 10, max: 100 }),
      children: Array.from({ length: 2 }, (_, m) => ({
        id: `p${p}m${m}`,
        name: `模块 ${m + 1}`,
        owner: faker.person.fullName(),
        region,
        progress: faker.number.int({ min: 10, max: 100 }),
        children: Array.from({ length: 3 }, (_, t) => ({
          id: `p${p}m${m}t${t}`,
          name: `任务 ${t + 1}`,
          owner: faker.person.fullName(),
          region,
          progress: faker.number.int({ min: 10, max: 100 }),
        })),
      })),
    };
  });
}

/** 同一批行拍平成一维（去掉 children）：关掉树形时用它，否则只剩 6 个根行可看 */
function flatten(rows: Row[]): Row[] {
  const out: Row[] = [];
  const walk = (list: Row[]): void => {
    for (const r of list) {
      const { children, ...rest } = r;
      out.push(rest as Row);
      if (children?.length) walk(children);
    }
  };
  walk(rows);
  return out;
}

interface Flags {
  tree: boolean;
  group: boolean;
  crossLevel: boolean;
}

/** 三个开关**彼此正交**，任意组合都成立；提示按当前组合拼 */
function hintFor(f: Flags): string {
  const parts: string[] = [];
  if (f.crossLevel) {
    parts.push(
      '落在行的<b>上/下 1/3</b> 插到它前/后' +
        (f.tree || f.group ? '，落在<b>中间 1/3</b> 成为它的子节点' : ''),
    );
    if (f.tree || f.group) {
      parts.push('落在行与行之间时<b>左右移动指针</b>改插入层级（看指示线分段与箭头）');
    }
  } else {
    parts.push('<b>同级模式</b>：只能在同一父级的兄弟之间换位，树的形状拖不坏');
  }
  if (f.tree) parts.push('拖带子节点的行会<b>先把它收起</b>');
  if (f.group) {
    parts.push(
      '拖到<b>另一个分组</b>下会改写该行的 <code>region</code> 字段' +
        (f.tree ? '（子树的 region 由本例在 <code>onRowMove</code> 里级联，核心只改被拖那一行）' : ''),
    );
  }
  if (!f.tree && !f.group) parts.push('当前是扁平表，只有行序可调');
  return parts.join('；') + '。';
}

export function bootstrapTableRowDrag(root: HTMLElement): () => void {
  const flags: Flags = { tree: true, group: false, crossLevel: true };
  /*
   * 两份列表都在启动时就建好，之后各自独立。
   *
   * 不在 `build()` 里现拍平：拖拽是**就地改数据**的（核心写回 `_originList`），
   * 现拍平会拿已经被拖过的树重新生成，来回切开关时看着像「顺序自己变了」。
   */
  const nested = treeList();
  const flat = flatten(nested);
  let table: VirtTable<Row> | null = null;

  const sw = (key: keyof Flags, label: string, on: boolean): string => `
    <label class="demo-switch">
      <input type="checkbox" data-flag="${key}"${on ? ' checked' : ''}>
      <span class="demo-switch__track"></span>
      <span class="demo-switch__label">${label}</span>
    </label>`;

  root.innerHTML = `
    <div class="demo-switches">
      ${sw('tree', '树形', flags.tree)}
      ${sw('group', '分组（按区域）', flags.group)}
      ${sw('crossLevel', '跨层级（关掉＝同级）', flags.crossLevel)}
    </div>
    <div class="demo-hint" id="hint"></div>
    <div class="status-text" id="status">尚未拖动</div>
    <div style="width:780px;height:480px;" class="demo-container" id="c"></div>`;

  const container = root.querySelector('#c') as HTMLElement;
  const hint = root.querySelector('#hint') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;

  /** 把分组字段往下带一层层刷到整棵子树（见下面 onRowMove 的注释） */
  const cascadeRegion = (row: Row): number => {
    let n = 0;
    const walk = (list: Row[] | undefined): void => {
      for (const r of list ?? []) {
        r.region = row.region;
        n++;
        walk(r.children);
      }
    };
    walk(row.children);
    return n;
  };

  const onRowMove = ({ row, parentRow, prevRow }: RowMoveDetail<Row>): void => {
    /*
     * 核心只改**被拖那一行**的分组字段 —— 分组只作用于根行，后代的字段值不影响它们的位置，
     * 而静默改写一整棵子树的数据太重（`region` 也可能是逐行不同的业务字段）。
     *
     * 所以「整棵子树跟着换区域」这件事该由业务决定。本例的 `region` 是整个项目的属性，
     * 就在这里补一次级联，顺手演示这个位置该干什么。
     */
    let cascaded = 0;
    if (parentRow?._rowType === 'group' && row.children?.length) {
      cascaded = cascadeRegion(row);
      table?.forceUpdate();
    }

    const parent = parentRow
      ? parentRow._rowType === 'group'
        ? `分组「${parentRow._groupName}」`
        : `「${parentRow.name}」`
      : '根层';
    const after = prevRow ? `，排在「${prevRow.name}」之后` : '，排在最前';
    const tail = cascaded ? `，子树 ${cascaded} 行的 region 一并更新` : '';
    status.textContent = `把「${row.name}」移到 ${parent}${after}（region = ${row.region}）${tail}`;
  };

  /** 开关改了就整表重建：列、`groupConfig` 与插件选项都是装载时定的 */
  const build = (): void => {
    table?.destroy();
    hint.innerHTML = hintFor(flags);
    status.textContent = '尚未拖动';

    const columns: VirtTableColumn<Row>[] = [
      { key: 'drag', title: '', width: 44, type: 'drag', fixed: 'left' },
      {
        key: 'name',
        title: '名称',
        width: 260,
        // 关掉树形就是普通列（没有 type:'tree' 时核心不会展开 children）
        ...(flags.tree ? { type: 'tree' as const } : {}),
        // textOverflow：长文本不换行，否则行高从 40 变 61，缩进看着也乱
        textOverflow: 'ellipsis',
      },
      { key: 'region', title: '区域', width: 110 },
      { key: 'owner', title: '负责人', width: 160, textOverflow: 'ellipsis' },
      { key: 'progress', title: '进度', width: 90 },
    ];

    table = new VirtTable<Row>(container, {
      plugins: [vtRowDrag({ crossLevel: flags.crossLevel })],
      list: flags.tree ? nested : flat,
      columns,
      itemKey: 'id',
      estimatedSize: 40,
      buffer: 6,
      border: true,
      defaultExpandAll: true,
      ...(flags.group ? { groupConfig: [{ field: 'region' }] } : {}),
      onRowMove,
    });
  };

  for (const box of root.querySelectorAll<HTMLInputElement>('input[data-flag]')) {
    box.addEventListener('change', () => {
      flags[box.dataset.flag as keyof Flags] = box.checked;
      build();
    });
  }
  build();

  return () => {
    table?.destroy();
    root.innerHTML = '';
  };
}
