import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

interface Row extends Record<string, unknown> {
  id: string;
  name: string;
  role: string;
  count: number;
  /** 服务端告知「可能有子节点」，决定未加载时是否显示展开箭头 */
  hasChildren?: boolean;
  children?: Row[];
}

/**
 * 树形子节点懒加载：`loadChildren` + `hasChildren`。
 *
 * 首屏只给根节点；首次展开某节点时才去取它的子节点，取数期间该节点箭头变 spinner。
 * 同一节点在途只请求一次；返回空数组记为「确实没有子节点」，箭头变叶子且不再请求。
 * 失败会回到折叠态，再点一次即重试。
 */
export function bootstrapTableLazyTree(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'name', title: '名称', width: 320, type: 'tree' },
    { key: 'role', title: '类型', width: 160 },
    { key: 'count', title: '数量', width: 120, align: 'right' },
  ];

  // 模拟服务端：按父节点 id 造子节点（3 层，第 3 层为叶子）
  const makeChildren = (parent: Row, level: number): Row[] => {
    const count = level >= 3 ? 0 : 3 + ((parent.name.length + level) % 3);
    return Array.from({ length: count }, (_, i) => ({
      id: `${parent.id}-${i + 1}`,
      name: level === 1 ? `${parent.name} / 小组 ${i + 1}` : faker.person.fullName(),
      role: level === 1 ? '小组' : '成员',
      count: faker.number.int({ min: 1, max: 99 }),
      // 第 3 层不再有子节点
      hasChildren: level < 2,
    }));
  };

  const rootRows: Row[] = ['工程部', '设计部', '市场部', '财务部'].map((d, i) => ({
    id: `d${i + 1}`,
    name: d,
    role: '部门',
    count: faker.number.int({ min: 10, max: 99 }),
    hasChildren: true,
  }));

  let failNext = false;
  let reqSeq = 0;

  root.innerHTML = `
    <div class="demo-hint">首屏只加载 4 个根节点。点箭头展开时才去取子节点(箭头位置显示 spinner),同一节点在途只请求一次;返回空数组的节点会变成叶子。</div>
    <div class="virt-table-controls">
      <label><input type="checkbox" id="fail" /> 注入故障（下一次展开失败）</label>
      <button id="reset">重置「工程部」缓存（下次展开重新取数）</button>
      <span id="stat" class="demo-note"></span>
    </div>
    <div style="width:760px;height:460px;" class="demo-container" id="c"></div>
    <div id="log" class="status-text" style="margin-top:12px;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;"></div>`;

  const container = root.querySelector('#c') as HTMLElement;
  const failEl = root.querySelector('#fail') as HTMLInputElement;
  const statEl = root.querySelector('#stat') as HTMLElement;
  const logEl = root.querySelector('#log') as HTMLElement;
  const logs: string[] = [];
  const log = (msg: string): void => {
    logs.unshift(msg);
    logEl.textContent = logs.slice(0, 6).join('\n');
  };

  let loadedNodes = 0;

  const table = new VirtTable<Row>(container, {
    list: rootRows,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    // 未加载时靠 hasChildren 判断要不要给箭头（默认就是读 row.hasChildren，这里显式写出）
    hasChildren: (row) => !!row.hasChildren,
    loadChildren: (row, ctx) => {
      const seq = ++reqSeq;
      log(`#${seq} loadChildren(${row.name}) level=${ctx.level}`);
      return new Promise<Row[]>((resolve, reject) => {
        setTimeout(() => {
          if (failNext) {
            failNext = false;
            failEl.checked = false;
            log(`#${seq} ✗ 失败（再点一次即重试）`);
            reject(new Error('mock network error'));
            return;
          }
          const kids = makeChildren(row, ctx.level);
          log(`#${seq} ✓ 返回 ${kids.length} 个子节点`);
          resolve(kids);
        }, 500);
      });
    },
    onChildrenLoaded: (row, children) => {
      loadedNodes += 1;
      statEl.textContent = `已展开取数 ${loadedNodes} 个节点 · 最近：${row.name}（${children.length} 个子节点）`;
    },
    onChildrenLoadError: (row, err) => {
      statEl.textContent = `「${row.name}」取子节点失败：${(err as Error).message}`;
    },
  });

  failEl.addEventListener('change', () => {
    failNext = failEl.checked;
  });
  (root.querySelector('#reset') as HTMLButtonElement).addEventListener('click', () => {
    table.resetLazyNode('d1');
    log('resetLazyNode(d1)：已清缓存与 children');
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
