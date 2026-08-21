<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 行拖拽排序（树形 / 分组）</h3>
    <div class="demo-switches">
      <label v-for="sw in SWITCHES" :key="sw.key" class="demo-switch">
        <input v-model="flags[sw.key]" type="checkbox" />
        <span class="demo-switch__track" />
        <span class="demo-switch__label">{{ sw.label }}</span>
      </label>
    </div>
    <div class="demo-hint" v-html="hint" />
    <div class="status-text">{{ status }}</div>
    <div style="width: 780px; height: 480px" class="demo-container">
      <!-- key 让开关一变就整表重建：列、groupConfig 与插件选项都是装载时定的 -->
      <VirtTableVue :key="tableKey" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  VirtTableVue,
  type RowMoveDetail,
  type VirtTableRowExtras,
  type VueTableColumn,
  vtRowDrag,
} from '@virt-table/vue';
import { faker } from '@faker-js/faker';

/** `VirtTableRowExtras` 带来内核写在行上的 `_rowType` / `_groupName` / `children` 等字段 */
interface Row extends VirtTableRowExtras<Row>, Record<string, unknown> {
  id: string;
  name: string;
  owner: string;
  /** 分组维度，**刻意与树结构正交**（树是「项目→模块→任务」，这是「归谁管」）*/
  region: string;
  progress: number;
}

const SWITCHES = [
  { key: 'tree', label: '树形' },
  { key: 'group', label: '分组（按区域）' },
  { key: 'crossLevel', label: '跨层级（关掉＝同级）' },
] as const;

const REGIONS = ['华东区', '华北区', '华南区'];

/** 三层树：项目 → 模块 → 任务。`region` 挂在项目上，子节点继承 */
function treeList(): Row[] {
  return Array.from({ length: 6 }, (_, p) => {
    const region = REGIONS[p % REGIONS.length]!;
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

/** 拍平（去掉 children）：关掉树形时用它，否则只剩 6 个根行可看 */
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

// 两份列表都只建一次：拖拽是就地改数据的，现拍平会让来回切开关像「顺序自己变了」
const nested = treeList();
const flat = flatten(nested);

const flags = reactive({ tree: true, group: false, crossLevel: true });
const status = ref('尚未拖动');
const tableKey = computed(() => `${flags.tree}-${flags.group}-${flags.crossLevel}`);
watch(tableKey, () => {
  status.value = '尚未拖动';
});

/** 三个开关彼此正交，任意组合都成立；提示按当前组合拼 */
const hint = computed(() => {
  const parts: string[] = [];
  const structural = flags.tree || flags.group;
  if (flags.crossLevel) {
    parts.push(
      '落在行的<b>上/下 1/3</b> 插到它前/后' +
        (structural ? '，落在<b>中间 1/3</b> 成为它的子节点' : ''),
    );
    if (structural) {
      parts.push('落在行与行之间时<b>左右移动指针</b>改插入层级（看指示线分段与箭头）');
    }
  } else {
    parts.push('<b>同级模式</b>：只能在同一父级的兄弟之间换位，树的形状拖不坏');
  }
  if (flags.tree) parts.push('拖带子节点的行会<b>先把它收起</b>');
  if (flags.group) {
    parts.push(
      '拖到<b>另一个分组</b>下会改写该行的 <code>region</code> 字段' +
        (flags.tree
          ? '（子树的 region 由本例在 <code>onRowMove</code> 里级联，核心只改被拖那一行）'
          : ''),
    );
  }
  if (!structural) parts.push('当前是扁平表，只有行序可调');
  return parts.join('；') + '。';
});

const columns = computed<VueTableColumn<Row>[]>(() => [
  { key: 'drag', title: '', width: 44, type: 'drag', fixed: 'left' },
  {
    key: 'name',
    title: '名称',
    width: 260,
    ...(flags.tree ? { type: 'tree' as const } : {}),
    // textOverflow：长文本不换行，否则行高从 40 变 61，缩进看着也乱
    textOverflow: 'ellipsis',
  },
  { key: 'region', title: '区域', width: 110 },
  { key: 'owner', title: '负责人', width: 160, textOverflow: 'ellipsis' },
  { key: 'progress', title: '进度', width: 90 },
]);

/** 把分组字段刷到整棵子树（核心只改被拖那一行，级联是业务决定的事） */
function cascadeRegion(row: Row): number {
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
}

const options = computed(() => ({
  plugins: [vtRowDrag({ crossLevel: flags.crossLevel })],
  list: flags.tree ? nested : flat,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  defaultExpandAll: true,
  ...(flags.group ? { groupConfig: [{ field: 'region' }] } : {}),
  // 组件的 options 不带泛型（行类型固定为 Record<string, unknown>），回调按那个签名收再窄化
  onRowMove: (detail: RowMoveDetail<Record<string, unknown>>) => {
    const { row, parentRow, prevRow } = detail as RowMoveDetail<Row>;
    let cascaded = 0;
    if (parentRow?._rowType === 'group' && row.children?.length) cascaded = cascadeRegion(row);
    const parent = parentRow
      ? parentRow._rowType === 'group'
        ? `分组「${parentRow._groupName}」`
        : `「${parentRow.name}」`
      : '根层';
    const after = prevRow ? `，排在「${prevRow.name}」之后` : '，排在最前';
    const tail = cascaded ? `，子树 ${cascaded} 行的 region 一并更新` : '';
    status.value = `把「${row.name}」移到 ${parent}${after}（region = ${row.region}）${tail}`;
  },
}));
</script>
