import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  type AIQueryResolveInput,
  vtAIQuery,
  vtColumnFilter,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

/**
 * vtAIQuery：一句话 → 筛选 / 排序 / 列显隐。
 *
 * ⚠️ 这个 demo 里的 `resolve` 是**本地关键词规则**，不是真的在调模型 ——
 * 文档站不该要求访客准备 API key，也不该把 key 放进前端。它的作用是演示
 * 「模型产出 JSON → 插件校验纠错 → setState 落地」这条链路，故意包含了几种
 * 真实模型常犯的偏差（填 label 而不是 value、数字写成字符串、幻觉列名），
 * 好让你看见校验层在干什么。
 *
 * 接真实模型时把 `resolve` 换成一次请求就行，插件其余部分不用动 ——
 * 服务端把 `prompt` 作为 system message、`jsonSchema` 作为 tool 的 `input_schema`，
 * 把模型返回的参数对象原样回给前端。完整说明见 Vanilla 侧同名示例。
 */
const REGIONS = [
  { label: '华东区', value: 'east' },
  { label: '华南区', value: 'south' },
  { label: '华北区', value: 'north' },
  { label: '西南区', value: 'west' },
];

const INDUSTRIES = [
  { label: '制造业', value: 'manufacturing' },
  { label: '零售', value: 'retail' },
  { label: '金融', value: 'finance' },
  { label: '医疗', value: 'health' },
];

/** 中文数量词 → 数字，让「一百万」这类说法也能被规则识别 */
function parseAmount(text: string): number | null {
  const cn = text.match(/([\d.]+)\s*(万|百万|千万|亿)/);
  if (cn) {
    const n = Number(cn[1]);
    const unit = { 万: 1e4, 百万: 1e6, 千万: 1e7, 亿: 1e8 }[cn[2] as string]!;
    return n * unit;
  }
  const plain = text.match(/([\d,]+)/);
  return plain ? Number(plain[1]!.replace(/,/g, '')) : null;
}

/** 可被「只看这几列 / 重置」摆布的数据列（功能列 idx 不在其列） */
const ALL_COLUMN_KEYS = ['customer', 'region', 'industry', 'amount', 'signedAt', 'status'];

/**
 * 假装是模型：认几种常见句式，产出 AIQuery 形状的 JSON。
 *
 * 刻意保留的「模型口音」——校验层会把它们一一纠正，你能在反馈区看到：
 *   · 大区填 label（`'华东区'`）而不是候选值（`'east'`）
 *   · 金额填字符串（`'1000000'`）而不是数字
 *   · 提到「毛利」时产出一个并不存在的 `profit` 列
 */
function fakeModel(text: string): Record<string, any> {
  const conditions: any[] = [];
  const said: string[] = [];

  for (const r of REGIONS) {
    if (text.includes(r.label) || text.includes(r.label.replace(/区$/, ''))) {
      // 口音①：填的是用户说的词，不是候选值
      conditions.push({ kind: 'condition', colKey: 'region', operator: 'in', value: [r.label] });
      said.push(r.label);
    }
  }

  for (const ind of INDUSTRIES) {
    if (text.includes(ind.label)) {
      conditions.push({ kind: 'condition', colKey: 'industry', operator: 'in', value: [ind.value] });
      said.push(ind.label);
    }
  }

  const amount = parseAmount(text);
  if (amount !== null && /大于|超过|高于|以上|多于|>/.test(text)) {
    // 口音②：数字写成了字符串
    conditions.push({ kind: 'condition', colKey: 'amount', operator: 'gt', value: String(amount) });
    said.push(`销售额 > ${amount.toLocaleString()}`);
  } else if (amount !== null && /小于|低于|不到|以下|少于|</.test(text)) {
    conditions.push({ kind: 'condition', colKey: 'amount', operator: 'lt', value: String(amount) });
    said.push(`销售额 < ${amount.toLocaleString()}`);
  }

  if (/毛利/.test(text)) {
    // 口音③：幻觉出一个数据里没有的列
    conditions.push({ kind: 'condition', colKey: 'profit', operator: 'gt', value: 0 });
  }

  if (/未签约|没签约|待跟进/.test(text)) {
    conditions.push({ kind: 'condition', colKey: 'status', operator: 'in', value: ['pending'] });
    said.push('未签约');
  }

  const sort: any[] = [];
  if (/销售额|金额/.test(text) && /降序|从高到低|最高|倒序/.test(text)) {
    sort.push({ colKey: 'amount', order: 'desc' });
    said.push('按销售额降序');
  } else if (/销售额|金额/.test(text) && /升序|从低到高|最低/.test(text)) {
    sort.push({ colKey: 'amount', order: 'asc' });
    said.push('按销售额升序');
  }
  if (/最近|最新|日期.*降序/.test(text)) {
    sort.push({ colKey: 'signedAt', order: 'desc' });
    said.push('按签约日期从近到远');
  }

  const columns: string[] = [];
  if (/只看|只显示|只要/.test(text)) {
    if (/名称|客户/.test(text)) columns.push('customer');
    if (/大区|区域/.test(text)) columns.push('region');
    if (/销售额|金额/.test(text)) columns.push('amount');
    if (/日期|时间/.test(text)) columns.push('signedAt');
    if (/行业/.test(text)) columns.push('industry');
    if (columns.length > 0) said.push(`只看 ${columns.length} 列`);
  }

  const out: Record<string, any> = {
    explanation:
      said.length > 0 ? said.join('、') : '没有识别出条件（本地规则的能力有限，换真模型会好很多）',
  };
  if (conditions.length > 0) out.filter = { kind: 'group', logic: 'and', children: conditions };
  if (sort.length > 0) out.sort = sort;
  if (columns.length > 0) out.columns = columns;
  // 「重置」要把三样一起还原 —— 只清筛选的话，之前「只看两列」留下的列显隐还在，
  // 用户会觉得没清干净。三个字段各自的「空值」语义：null / [] / 全部列
  if (/重置|全部显示|恢复默认/.test(text)) {
    out.filter = null;
    out.sort = [];
    out.columns = ALL_COLUMN_KEYS.slice();
    out.explanation = '已重置筛选、排序与列显隐';
  } else if (/清空|取消筛选/.test(text)) {
    out.filter = null;
    out.explanation = '已清空筛选条件';
  }
  return out;
}

const PRESETS = [
  '华东区销售额超过 500 万的客户',
  '金融行业的，按销售额从高到低',
  '只看客户名称和销售额',
  '西南区未签约的，按签约日期最近排',
  '毛利大于 0 的',
  '重置全部',
];

const ROW_COUNT = 100000;

const columns: ReactTableColumn[] = [
  { key: 'idx', title: '#', width: 64, type: 'index' },
  { key: 'customer', title: '客户名称', width: 200 },
  {
    key: 'region',
    title: '大区',
    width: 110,
    sortable: true,
    filterType: 'enum',
    filters: REGIONS.map((r) => ({ label: r.label, value: r.value })),
  },
  {
    key: 'industry',
    title: '行业',
    width: 110,
    filterType: 'enum',
    filters: INDUSTRIES.map((i) => ({ label: i.label, value: i.value })),
  },
  { key: 'amount', title: '销售额', width: 140, sortable: true, filterType: 'number-range' },
  { key: 'signedAt', title: '签约日期', width: 130, sortable: true, filterType: 'date-range' },
  {
    key: 'status',
    title: '状态',
    width: 100,
    filterType: 'enum',
    filters: [
      { label: '已签约', value: 'signed' },
      { label: '未签约', value: 'pending' },
    ],
  },
];

// 懒生成 10 万行：App 会静态 import 全部示例模块，放在模块顶层会拖慢整站首屏
let _db: Record<string, unknown>[] | null = null;
const getList = (): Record<string, unknown>[] => {
  if (_db) return _db;
  faker.seed(20260812);
  _db = Array.from({ length: ROW_COUNT }, (_, i) => ({
    id: i,
    customer: faker.company.name(),
    region: faker.helpers.arrayElement(REGIONS).value,
    industry: faker.helpers.arrayElement(INDUSTRIES).value,
    amount: faker.number.int({ min: 10_000, max: 20_000_000 }),
    signedAt: faker.date
      .between({ from: '2024-01-01', to: '2026-08-01' })
      .toISOString()
      .slice(0, 10),
    status: faker.helpers.arrayElement(['signed', 'pending']),
  }));
  return _db;
};

export default function AITable() {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<VirtTableRef>(null);
  const list = React.useMemo(getList, []);
  const plugins = React.useMemo(
    () => [
      vtColumnFilter(),
      vtAIQuery({
        async resolve({ text }: AIQueryResolveInput) {
          // 真实链路是一次网络往返，这里也给点延迟，好看到「正在理解…」的状态
          await new Promise((r) => setTimeout(r, 240));
          return fakeModel(text);
        },
      }),
    ],
    [],
  );

  React.useEffect(() => {
    tableRef.current?.openAIQueryBar();
  }, []);

  const runPreset = (text: string): void => {
    tableRef.current?.openAIQueryBar();
    // 输入条是插件自绘的 DOM，把预设句子填进去，让人看清这句话是怎么被处理的
    const input = rootRef.current?.querySelector<HTMLInputElement>('.vt-ai-input');
    if (input) input.value = text;
    tableRef.current?.askAITable(text).catch(() => {});
  };

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 自然语言查询</h3>
      <div className="virt-table-controls">
        <span className="demo-note">试试：</span>
        {PRESETS.map((p) => (
          <button key={p} type="button" className="virt-table-btn" onClick={() => runPreset(p)}>
            {p}
          </button>
        ))}
      </div>
      <div className="demo-hint">
        Cmd/Ctrl + K
        唤出输入条。本 demo 用本地关键词规则模拟模型输出（含几种常见偏差），演示的是校验与落地链路。
      </div>
      <div ref={rootRef} style={{ width: '100%', height: 560 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 6, border: true, plugins }}
        />
      </div>
    </div>
  );
}
