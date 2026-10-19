import { defineConfigWithTheme, type DefaultTheme } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';
import { logProMode, resolveProMode, type ProMode } from '../../build/pro-mode';
import { liveDemoCases } from './demoCases';
import {
  FRAMEWORKS,
  FRAMEWORK_LABELS,
  type Framework,
} from './shared/frameworks';

const deployBase = process.env.DEPLOY_BASE;

/**
 * 三个框架端各自的付费插件档位。
 *
 * 为什么文档站也要算一遍：档位是**微应用**的构建期变量（每个 app 的 `vite.config.ts` 自己
 * 判定），文档站的运行时读不到它。而 `ProDemo.vue` 必须知道 —— 否则在一个不含付费能力的
 * 构建里，它会照旧嵌一个 demo，读者看到的是**一张没有付费功能的表**，分不清是「这个插件
 * 就这样」还是「站坏了」。所以这里用**同一个解析器**算出来，`define` 进去。
 *
 * `phase` 按命令区分：`vitepress build` 时是 build（只认离线包），`dev` 时是 dev（吃源码）。
 * 与各 app 的 `command === 'build'` 判定等价 —— 两边必须一致，否则文档站说有、demo 里没有。
 *
 * ## 为什么走 `themeConfig` 而不是 `vite.define`
 *
 * 第一版用的是 `define: { __VT_PRO_MODE__: ... }`。**dev 下不生效** —— VitePress 的
 * dev server 不把用户的 `vite.define` 应用到主题组件的 SFC 转换上，于是浏览器里那句
 * `typeof __VT_PRO_MODE__ === 'undefined'` 为真、`ProDemo` 判成 `off`，
 * `pnpm dev` 时每个插件页都显示「本次构建不含付费能力」的占位卡。
 * 构建产物里 define 是生效的，所以这个 bug **只在 dev 下出现**，光验构建照不出来。
 *
 * `themeConfig` 会被序列化进站点数据，`useData().theme` 在 dev / build / SSR 三种情况下
 * 都拿得到，没有编译期替换这一层。
 */
const isDocsBuild = process.argv.includes('build');
const proModes = Object.fromEntries(
  FRAMEWORKS.map((fw) => {
    const mode = resolveProMode({
      appDir: fileURLToPath(new URL(`../apps/${fw}`, import.meta.url)),
      phase: isDocsBuild ? 'build' : 'dev',
      label: `docs → ${fw}`,
    });
    logProMode(`docs → ${fw}`, mode);
    return [fw, mode] as const;
  }),
);
const base = deployBase || '/';

/** packages/ 下的源码路径（文档站直接吃源码，不走 dist） */
const pkg = (p: string) =>
  fileURLToPath(new URL(`../../packages/${p}`, import.meta.url));

/**
 * 三端共用一份示例清单 —— 侧边栏的分类与条目在 vanilla / vue / react 之间**逐条对齐**。
 *
 * 之前 vanilla 与框架端各维护一份（`vanillaXxxLinks` / `sharedXxxLinks`），
 * 结果框架端长期少了增强功能、插件、单元格组件三整节。合成一份之后，
 * 新增示例只要在这里加一行，三端同时出现 —— 缺页会在 `pnpm build:docs` 时暴露。
 *
 * **分组名 = md 目录名 = playground demo 目录名**（`docs/apps/<fw>/src/components/<组>/`）。
 * 新增示例先想清楚它属于哪一组，三处一起放，别再出现「目录叫 feature、侧边栏叫增强功能」
 * 这种对不上的情况。
 *
 * 真正的框架差异走下面的 `frameworkOnlyCellLinks` / `thirdPartyLinks`：
 * 「组件渲染」是 Vue/React 特有能力，第三方组件库按框架各配一个，不强行对齐。
 */
const basicLinks = [
  { text: '基础表格', link: 'basic/basic' },
  { text: '边框', link: 'basic/border' },
  { text: '斑马纹', link: 'basic/stripe' },
  { text: '空态', link: 'basic/empty' },
  { text: '无表头', link: 'basic/no-header' },
  { text: '高亮', link: 'basic/highlight' },
  { text: '列宽拖拽', link: 'basic/resize' },
  { text: '冻结列', link: 'basic/fixed' },
  { text: '多级分组表头/表尾', link: 'basic/header-group' },
  { text: '自动换行', link: 'basic/wrap' },
  { text: '溢出隐藏', link: 'basic/overflow' },
  { text: '对齐方式', link: 'basic/align' },
  { text: '数据更新', link: 'basic/force-update' },
  { text: '响应式更新', link: 'basic/reactive' },
  { text: '暗夜模式', link: 'basic/theme' },
];

/**
 * 功能列（`col.type`）自己一组，**排在「单元格渲染」之前** —— 这个顺序照的是分层图：
 * 接管层（谁来画这一格）在内容层（画什么）之上，先决定「这一格归表格自己画」，
 * 才轮到内容从哪来。
 *
 * 组里只有一页：序号 / 勾选 / 单选原先散在基础功能（index-col、checkbox）与增强功能（radio）
 * 各占一页，讲的却是同一件事，已合成 `feature-columns/index.md`。`expand` / `tree` / `drag`
 * 各自带独立能力（展开行内容、树形数据、拖拽插件），留在原组。
 *
 * **link 末尾那个斜杠不能省**：目录里是 `index.md`，VitePress 的路由是
 * `/examples/feature-columns/`，不带斜杠会 404（同 `buildDemosSidebar` 里 `/demos/` 那条）。
 */
const featureColumnLinks = [
  { text: '功能列（序号/勾选/单选）', link: 'feature-columns/' },
];

/**
 * 单元格渲染 —— 「这一格画什么」是一件事，所以机制页与 19 个内置组件示例页同组。
 *
 * 拆成两组（原来的「高级功能」里放渲染粒度、另开一组「单元格组件」）时，读者没法看出
 * 组件**就是**列级 `render` + `renderEditor` 的一种装法 —— 它们不是优先级链上的另一档。
 */
const cellLinks = [
  { text: '渲染粒度（表级/列级/单元格级）', link: 'cell/render-levels' },
  { text: '单元格独立渲染', link: 'cell/cell-type-render' },
];

/** 内置单元格组件（`@virt-table/vanilla/components`）。分三段与组件的交互模型对应：
 *  编辑态（需装 vtCellEditor）/ 直接可点 / 纯展示，顺序与 components/index.ts 一致 */
const columnLinks = [
  { text: 'VtInput 文本输入', link: 'cell/vt-input' },
  { text: 'VtNumberInput 数字输入', link: 'cell/vt-number-input' },
  { text: 'VtTextarea 多行文本', link: 'cell/vt-textarea' },
  { text: 'VtSelect 下拉选择', link: 'cell/vt-select' },
  { text: 'VtSelect 多选', link: 'cell/vt-multi-select' },
  { text: 'VtPerson 人员', link: 'cell/vt-person' },
  { text: 'VtCascader 级联选择', link: 'cell/vt-cascader' },
  { text: 'VtAutocomplete 输入建议', link: 'cell/vt-autocomplete' },
  { text: 'VtDatePicker 日期选择', link: 'cell/vt-date-picker' },
  { text: 'VtDateRangePicker 日期范围', link: 'cell/vt-date-range-picker' },
  { text: 'VtTimePicker 时间选择', link: 'cell/vt-time-picker' },
  { text: 'VtCheckbox 布尔勾选', link: 'cell/vt-checkbox' },
  { text: 'VtSwitch 开关', link: 'cell/vt-switch' },
  { text: 'VtRate 星级评分', link: 'cell/vt-rate' },
  { text: 'VtActions 操作列', link: 'cell/vt-actions' },
  { text: 'VtTag 标签', link: 'cell/vt-tag' },
  { text: 'VtProgress 进度条', link: 'cell/vt-progress' },
  { text: 'VtLink 链接', link: 'cell/vt-link' },
  { text: 'VtImage 图片', link: 'cell/vt-image' },
];

/**
 * 高级功能 —— 原「高级功能」与「增强功能」合成一组。
 *
 * 那条界线从来没说清过：「树形懒加载」在增强、「树形」在高级；「高级筛选」在高级、
 * 「分页」在增强。两组都是「基础表格之上的一项完整能力」，合并后按主题排序：
 * 行列结构 → 数据 → 排序筛选 → 其他。
 */
const advancedLinks = [
  // 行列结构
  { text: '展开行', link: 'advanced/expand' },
  { text: '树形', link: 'advanced/tree' },
  { text: '分组', link: 'advanced/group' },
  { text: '树形 + 分组', link: 'advanced/group-tree' },
  { text: '固定行 pinned', link: 'advanced/pinned' },
  { text: '自动合计行', link: 'advanced/summary' },
  // 数据
  { text: '分页（客户端）', link: 'advanced/pagination-client' },
  { text: '分页（服务端）', link: 'advanced/pagination' },
  { text: '无限滚动', link: 'advanced/infinite' },
  { text: '服务端数据', link: 'advanced/server-data' },
  { text: '树形懒加载', link: 'advanced/lazy-tree' },
  { text: '状态持久化', link: 'advanced/state-persist' },
  { text: '滚动模型', link: 'advanced/scroll-model' },
  // 排序与筛选
  { text: '列排序', link: 'advanced/sort' },
  { text: '高级筛选（筛选管理器）', link: 'advanced/filter-builder' },
  // 其他
  { text: '加载态', link: 'advanced/loading' },
  { text: '编辑校验', link: 'advanced/validate' },
  { text: '国际化 i18n', link: 'advanced/i18n' },
  { text: '无障碍 ARIA', link: 'advanced/aria' },
];

// 插件示例（可选能力，按需 plugins 装载）；文件在 examples/plugins/ 与 apps/*/components/plugins/
const pluginLinks = [
  { text: 'vtCellEditor 单元格编辑', link: 'plugins/cells-render' },
  { text: 'vtCellSelection 单元格选区', link: 'plugins/cell-selection' },
  { text: 'vtClipboard 剪贴板', link: 'plugins/clipboard' },
  { text: 'vtSearch 表格搜索', link: 'plugins/search' },
  { text: 'vtContextMenu 右键菜单', link: 'plugins/context-menu' },
  { text: 'vtExport 导出 CSV/Excel', link: 'plugins/export' },
  { text: 'vtExport 打印', link: 'plugins/print' },
  { text: 'vtKeyboardNav 键盘导航', link: 'plugins/keyboard' },
  { text: 'vtColumnFilter 列筛选', link: 'plugins/filter' },
  { text: 'vtColumnFilter 富筛选类型', link: 'plugins/rich-filter' },
  { text: 'vtToolbar 工具栏', link: 'plugins/toolbar' },
  { text: 'vtFieldConfig 字段配置', link: 'plugins/column-visibility' },
  { text: 'vtColumnDrag 列拖拽排序', link: 'plugins/column-drag' },
  { text: 'vtRowDrag 行拖拽排序', link: 'plugins/row-drag' },
];

/**
 * 只在 Vanilla 侧出现的插件页。
 *
 * 这几个插件（列头菜单 / 导入 / 高级筛选 / 分组 / 排序 / 行高）**与框架完全无关** ——
 * Vue / React 端只是 `re-export`，装载与 API 一个字都不差，所以不给它们各造一份
 * 除 import 路径外毫无差别的页面。三端 toolbar 那页里指了路。
 *
 * 与 `frameworkOnlyCellLinks` 同一个机制：真正的框架差异才值得各配一页。
 */
const vanillaOnlyPluginLinks = [
  { text: 'vtColumnMenu 列头菜单', link: 'plugins/column-menu' },
  { text: 'vtImport 导入', link: 'plugins/import' },
  { text: 'vtFilterConfig 高级筛选', link: 'plugins/filter-config' },
  { text: 'vtGroupConfig 分组配置', link: 'plugins/group-config' },
  { text: 'vtSortConfig 排序配置', link: 'plugins/sort-config' },
  { text: 'vtRowHeightConfig 行高', link: 'plugins/row-height' },
];

/**
 * AI 插件单独成组 —— 这三个共享同一个前提：**模型的产出是流式的、按行到达的、要花钱的**，
 * 而虚拟化恰好把「只渲染看得见的行」变成「只为看得见的行付费」。
 *
 * `vtAIStream` 放这里而不是普通插件里：它解决的就是「agent 边跑边吐结果」那种表格
 * （列都得从首批数据推断出来），与 AI 链路是一件事。
 * 顶部导航的「AI 场景」页把这三个串成一条故事线。
 */
const aiPluginLinks = [
  { text: 'vtAIStream 流式表格', link: 'ai/ai-stream' },
  { text: 'vtAIColumn AI 列', link: 'ai/ai-column' },
  { text: 'vtAIQuery 自然语言查询', link: 'ai/ai-query' },
];

const mergeLinks = [
  { text: '表身合并', link: 'merge/body-merge' },
  { text: '按值自动合并', link: 'merge/auto-merge' },
  { text: '表头合并', link: 'merge/header-merge' },
  { text: '表尾合并', link: 'merge/footer-merge' },
  { text: '表头 + 表尾合并', link: 'merge/head-foot-merge' },
];

/**
 * Demos —— ag-grid 风格的「经典案例」：一个案例串起一整套能力，形态是可以直接对着
 * 需求抄的完整应用，而不是「示例」那种一个能力一页。
 *
 * **刻意不分框架**（路径里没有 `/{fw}/` 那一段）：案例动辄几百行，三端各写一遍必然
 * 只有 vanilla 那份是新的（「示例」的框架端曾经就长期少了三整节）。案例本体是框架无关
 * 的原生实现，Vue / React 里直接调同一份逻辑。
 *
 * 清单本体在 `demoCases.ts`（画廊组件也吃同一份，新增案例只改那里）；规划中的案例
 * 不进侧边栏，只在画廊里以置灰卡片出现。
 */
const demoCaseLinks = liveDemoCases().map((c) => ({
  text: c.title,
  link: `/demos/${c.slug}`,
}));

const FRAMEWORK_TITLE: Record<Framework, string> = {
  vanilla: '',
  vue: 'Vue ',
  react: 'React ',
};

/**
 * 「组件渲染」：在列 `render` 里直接返回 VNode / React 元素，由适配层负责挂载与回收。
 * vanilla 没有这层，所以这一条只给框架端 —— 不为了对齐而造一个空页。
 */
const frameworkOnlyCellLinks: Record<
  Framework,
  { text: string; link: string }[]
> = {
  vanilla: [],
  vue: [{ text: '组件渲染', link: 'cell/render' }],
  react: [{ text: '组件渲染', link: 'cell/render' }],
};

/**
 * 第三方组件库集成：各框架配自己那一家，vanilla 侧是一页占位说明
 * （原生 DOM 无需适配层，真要接哪家库看对应框架的示例）。
 */
const thirdPartyLinks: Record<Framework, { text: string; link: string }[]> = {
  vanilla: [{ text: '第三方组件库集成', link: 'cell/third-party' }],
  vue: [{ text: 'Element Plus 列渲染', link: 'cell/third-party' }],
  react: [{ text: 'Ant Design 列渲染', link: 'cell/third-party' }],
};

/**
 * 三端同一套分类与条目；差异只有上面两处按框架取的清单。
 *
 * 这些分类全部 `collapsed: true`：合进「文档」侧边栏后总条目上百，全展开就没法用了。
 * VitePress 会自动展开**含当前页**的那一组（`composables/sidebar.js` 里
 * `hasActiveLink → collapsed = false`），所以折起来不影响定位当前位置。
 */
function buildExamplesSidebar(fw: Framework) {
  const to = (demo: { text: string; link: string }) => ({
    text: demo.text,
    link: `/${fw}/examples/${demo.link}`,
  });

  return [
    {
      // 「功能」而不是「示例」：与 Demos 的「经典案例」对照 —— 这边一个能力一页，
      // 那边一个业务场景串十几项能力。叫「示例」时读者以为它不算文档。
      text: `${FRAMEWORK_TITLE[fw]}功能`,
      items: [
        { text: '基础功能', collapsed: true, items: basicLinks.map(to) },
        { text: '功能列', collapsed: true, items: featureColumnLinks.map(to) },
        {
          // 机制页 → 组件渲染（仅框架端）→ 19 个内置组件示例页 → 第三方库，
          // 从「怎么决定这一格画什么」走到「拿现成的画」
          text: '单元格渲染',
          collapsed: true,
          items: [
            ...cellLinks,
            ...frameworkOnlyCellLinks[fw],
            ...columnLinks,
            ...thirdPartyLinks[fw],
          ].map(to),
        },
        { text: '高级功能', collapsed: true, items: advancedLinks.map(to) },
        {
          text: '插件',
          collapsed: true,
          items: [
            ...pluginLinks,
            ...(fw === 'vanilla' ? vanillaOnlyPluginLinks : []),
          ].map(to),
        },
        { text: 'AI 插件', collapsed: true, items: aiPluginLinks.map(to) },
        { text: '合并单元格', collapsed: true, items: mergeLinks.map(to) },
      ],
    },
  ];
}

/** Demos 的侧边栏，无框架维度，全站共用一份 */
function buildDemosSidebar() {
  return [
    // 用 `/demos/` 而不是 `/demos/index`：后者与 VitePress 实际路由（index.md → `/demos/`）
    // 对不上，页脚的「下一页」会把总览页自己列成下一页
    { text: 'Demos', items: [{ text: '案例总览', link: '/demos/' }] },
    { text: '经典案例', items: demoCaseLinks },
  ];
}

/** 「AI 场景」tab：一页总览（内嵌可切换的在线 demo）+ 三个插件的完整示例 */
function buildAiSidebar(fw: Framework) {
  return [
    {
      text: 'AI 场景',
      items: [{ text: '总览 · 在线体验', link: `/${fw}/ai/index` }],
    },
    {
      text: '完整示例',
      items: aiPluginLinks.map((demo) => ({
        text: demo.text,
        link: `/${fw}/examples/${demo.link}`,
      })),
    },
  ];
}

function buildGuideSidebar(fw: 'vanilla' | 'vue' | 'react') {
  return [
    {
      text: '指南',
      items: [
        { text: '项目介绍', link: `/${fw}/guide/index` },
        { text: '快速开始', link: `/${fw}/guide/started` },
        // 单元格渲染那页已并入 `api/cell`：模型（四层 × 粒度）与参考表分两页讲，
        // 同一张 cellType 表就得维护两份，改一处漏一处。
        { text: '特殊说明', link: `/${fw}/guide/notes` },
      ],
    },
    {
      text: '深入',
      items: [
        { text: '架构设计', link: `/${fw}/guide/architecture` },
        { text: '设计决策', link: `/${fw}/guide/decisions` },
      ],
    },
  ];
}

/**
 * API 侧边栏 —— 按**作用对象**分组：表格级 → 列级 → 单元格级 → 其他。
 *
 * 从前是一页总览（vanilla 那份 1800 行），既翻不动也搜不准。拆页后**三端页名保持一致**：
 * `getFrameworkLink` 换框架时只替换第一段路径段，vanilla 有 `api/components` 而 vue 没有
 * 就会 404。所以 vue / react 侧那几页即使内容短，也要有一页真东西（封装层特有的部分）
 * 加一条指回 vanilla 的链接。
 */
function buildApiSidebar(fw: 'vanilla' | 'vue' | 'react') {
  const api = (slug: string, text: string) => ({
    text,
    link: `/${fw}/api/${slug}`,
  });

  return [
    {
      text: 'API',
      items: [
        api('index', '总览'),
        {
          text: '表格级',
          collapsed: true,
          items: [
            api('table', '表格配置'),
            api('instance', '实例方法'),
            api('data', '数据与远程'),
          ],
        },
        {
          text: '列级',
          collapsed: true,
          items: [
            api('column', '列配置'),
            api('group-header', '多级分组表头与表尾'),
          ],
        },
        {
          text: '单元格级',
          collapsed: true,
          items: [
            api('cell', '单元格渲染'),
            api('components', '单元格组件'),
            api('merge', '合并单元格'),
          ],
        },
        {
          text: '其他',
          collapsed: true,
          items: [api('plugins', '插件机制'), api('types', '类型定义')],
        },
      ],
    },
  ];
}

/**
 * 「使用文档」入口的侧边栏 —— 功能 + API 合成一份。
 *
 * 「一个能力一页带 demo」与「它的字段表」是同一件东西的两面（示例页底部的『相关 API』
 * 就指向后者），拆成两个顶栏入口只会让人来回跳。
 *
 * **「指南」不在这里** —— 它自己一个顶栏入口（见 `guideSidebars`）：项目介绍 / 快速开始 /
 * 特殊说明 / 架构设计 / 设计决策是「先读一遍」的东西，混进来会被下面上百条功能与 API
 * 条目压在最上面，读者根本不会往那儿看。
 */
function buildDocsSidebar(fw: Framework) {
  return [...buildExamplesSidebar(fw), ...buildApiSidebar(fw)];
}

/** 「指南」入口：三端各一份，只覆盖 `/{fw}/guide/` */
/**
 * 企业版（付费插件 `@virt-table-pro/*`）的侧边栏。
 *
 * 两段，顺序即阅读顺序：
 *
 * 1. **付费与授权** —— 「买不买、怎么买、许可怎么生效」。第一条就是无框架维度的定价页
 *    `/enterprise/`，它也是顶栏「企业版」的落地页。
 * 2. **插件文档** —— 每个插件怎么用。已发布的在前，「规划中」那四个占位包收在末尾一组
 *    （页面写的是计划中的 API 与在它发布之前怎么用核心公开 API 自己顶一下）。
 *    放进侧边栏而不是藏起来，是因为「什么时候会有」本身就是客户要问的问题。
 *
 * 正文三端共用一份（`docs/.enterprise/`，见那里的 README），只有装载代码按框架分叉。
 *
 * ## 为什么 `/enterprise/` 也要注册这份侧边栏
 *
 * 它没有 `/{fw}/` 那一段，落不进 `enterpriseSidebars` 的任何一个前缀 —— 结果是点「企业版」
 * 进来只有定价页正文，**看不到任何插件文档的入口**（第一版就是这样，等于把这批文档藏了）。
 * 那一份用 vanilla 的链接：静态配置没法按读者当前所在的框架端变，而点进去之后左上角的
 * 框架切换器能原地换端（`getFrameworkLink` 只替换第一段路径段）。
 */
function buildEnterpriseSidebar(fw: Framework) {
  const e = (slug: string, text: string) => ({
    text,
    link: `/${fw}/enterprise/${slug}`,
  });

  return [
    {
      text: '付费与授权',
      items: [
        { text: '授权模式与定价', link: '/enterprise/' },
        e('index', '开始使用付费插件'),
        e('license-model', '许可与授权'),
        e('license', '许可与角标'),
      ],
    },
    {
      text: '插件文档',
      items: [
        {
          text: '甘特图',
          collapsed: true,
          items: [
            // 目录页的路由是 `/enterprise/gantt/`，**尾斜杠不能省**（同 buildDemosSidebar）
            e('gantt/', '概览与快速开始'),
            e('gantt/data', '数据契约'),
            e('gantt/options', '配置项与外观'),
            e('gantt/interaction', '交互与写回'),
            e('gantt/internals', '内部机制'),
          ],
        },
        {
          text: '公式',
          collapsed: true,
          items: [
            e('formula/column', '计算列'),
            e('formula/cell', '单元格公式'),
            e('formula/expression', '语法与纯逻辑层'),
          ],
        },
        e('floating-image', '浮动图片'),
        // 命名视图：暂不作为付费能力出售，整条从付费清单里摘掉（2026-08-31）。
        // 页面文件 `docs/*/enterprise/views.md` 与 `.enterprise/views/*.md` 都留着，
        // 只是不再有入口 —— 想恢复出售把这一行取消注释即可（其余摘除点见那两个文件的同日注释）。
        // e('views', '命名视图'),
        e('undo', '撤销 / 重做'),
        e('xlsx', '真 xlsx 与 PDF 导出'),
        e('pivot', '透视表'),
        e('status-bar', '状态栏（选区聚合）'),
        // charts 一期只出了单元格迷你图，选区出图仍在规划中 —— 标题按**已实现的那部分**取，
        // 免得点进去看到「集成图表」却只有迷你图。规划中的部分在同一页的末尾交代。
        e('charts', '单元格迷你图'),
        {
          text: '规划中',
          collapsed: true,
          items: [e('collab', '协同')],
        },
      ],
    },
  ];
}

const guideSidebars = Object.fromEntries(
  FRAMEWORKS.map((fw) => [`/${fw}/guide/`, buildGuideSidebar(fw)] as const),
);

/** 「使用文档」入口：三端 × `examples` / `api` 两段 = 6 个前缀，指向同一份侧边栏 */
const docsSidebars = Object.fromEntries(
  FRAMEWORKS.flatMap((fw) => {
    const items = buildDocsSidebar(fw);
    return ['examples', 'api'].map((seg) => [`/${fw}/${seg}/`, items] as const);
  }),
);

/**
 * 企业版：三端各一份，**外加无框架前缀的 `/enterprise/`**。
 *
 * 最后那条是必须的：定价页是顶栏「企业版」的落地页，落不进 `/{fw}/enterprise/` 任何前缀，
 * 漏了它就等于让读者在一个没有侧边栏的页面上找插件文档（找不到）。
 */
const enterpriseSidebars = {
  ...Object.fromEntries(
    FRAMEWORKS.map(
      (fw) => [`/${fw}/enterprise/`, buildEnterpriseSidebar(fw)] as const,
    ),
  ),
  '/enterprise/': buildEnterpriseSidebar('vanilla'),
};

/**
 * 默认主题的 `themeConfig` 加上我们自己塞的字段。
 *
 * `defineConfig` 把 `themeConfig` 钉死成 `DefaultTheme.Config`，多一个 `proModes`
 * 就会被对象字面量的超额属性检查拦掉（TS2353）。VitePress 为这种情况另留了
 * `defineConfigWithTheme<T>` —— 走它才能把自定义字段带进站点数据里，
 * 同时保住默认主题那一堆字段的类型。
 */
type ThemeConfig = DefaultTheme.Config & {
  /** 各框架端的付费插件档位，`ProDemo.vue` 从 `useData().theme` 里读 */
  proModes: Record<string, ProMode>;
};

export default defineConfigWithTheme<ThemeConfig>({
  base,
  ignoreDeadLinks: true,
  title: 'VirtTable',
  description: 'A high-performance virtual list component for JavaScript',
  // apps/*/README.md 是三个微应用的开发说明，跟着 docs/ 一起被扫成了页面，
  // 搜索里会冒出「运行」「示例应用」这类跟组件无关的条目，且没有任何地方链向它们
  srcExclude: ['apps/*/README.md'],
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
  ],
  themeConfig: {
    /*
     * 各框架端的付费插件档位，给 `ProDemo.vue` 用（见上面 proModes 的注释）。
     * 放 themeConfig 而不是 `vite.define`：后者在 dev 下不作用于主题组件。
     */
    proModes,
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/kolarorz/virt-table',
      },
    ],
    logo: '/logo.svg',
    search: {
      provider: 'local',
      options: {
        /**
         * 给索引里的 h1 补上框架名。
         *
         * 三端功能页的标题逐条对齐（每端都有「基础表格」「列宽拖拽」「VtSelect 下拉选择」），
         * 默认索引出来的结果就是三条一模一样的标题，点进去才知道是哪一端的。这里在 h1
         * 后面接一个框架名：h1 那一条显示成「基础表格 · Vue 3」，页内各级标题的面包屑
         * 也跟着变成「基础表格 · Vue 3 › 用法」。
         *
         * `_render` 只作用于搜索索引，页面本身的标题不受影响。`/demos/*` 没有框架段
         * （经典案例三端共用一份），查不到 label 就不加，正是想要的结果。
         */
        _render(src, env, md) {
          const html = md.render(src, env);
          // 自己接手 _render 之后，VitePress 内置的这个开关就得自己兜
          if (env.frontmatter?.search === false) return '';
          const label =
            FRAMEWORK_LABELS[
              env.relativePath.split('/')[0] as keyof typeof FRAMEWORK_LABELS
            ];
          if (!label) return html;
          // 插在 header-anchor 之前（切分索引时正是取 <a> 前面的那段当标题）；
          // 万一以后锚点结构变了，这里匹配不上就只是少个框架名，不会丢内容
          return html.replace(
            /(<h1\b[^>]*>)([\s\S]*?)(<a\b[^>]*?class="header-anchor")/,
            `$1$2· ${label} $3`,
          );
        },
        miniSearch: {
          searchOptions: {
            /**
             * 当前在看哪一端，就把那一端的结果排前面。
             *
             * 不做过滤而只是降权：Vue / React 的组件渲染、vanilla 的原生装法本来就不一样，
             * 在 Vue 文档里搜 vanilla 的写法也该搜得到，只是不该压在前面。
             * `/demos/*` 不带框架段，两边都匹配不到，一律平权 —— 经典案例三端共用，
             * 不管在哪一端搜都该正常出现。
             *
             * 注意：这个函数会被序列化成字符串、在浏览器里重建执行，
             * **不能引用任何外部变量**，所以框架清单只能写死在正则里
             * （与 shared/frameworks.ts 的 FRAMEWORKS 保持一致；将来若加了
             * vue2 / react-legacy 这类带前缀的名字，长的要排在短的前面）。
             */
            boostDocument: (id: string) => {
              // 0.05 这个量级足以让本端的匹配全部排在前面，
              // 又不至于把别的端整段埋掉（React 文档里搜「插件」仍能翻到 vanilla 的写法）
              const re = /\/(vanilla|vue|react)\//;
              const page = re.exec(String(id));
              if (!page) return 1;
              const here =
                typeof location === 'undefined'
                  ? null
                  : re.exec(location.pathname);
              if (!here) return 1;
              return page[1] === here[1] ? 1 : 0.05;
            },
          },
        },
      },
    },
    // Demos 排在最前：第一次来的人先看「它能做成什么样」，再决定读不读文档
    nav: [
      { component: 'FwNavLink', props: { text: '经典案例', mod: 'demos' } },
      {
        component: 'FwNavLink',
        props: { text: 'AI 场景', mod: 'ai', badge: true },
      },
      { component: 'FwNavLink', props: { text: '指南', mod: 'guide' } },
      { component: 'FwNavLink', props: { text: '使用文档', mod: 'docs' } },
      /*
       * 「企业版」的落地页是 `/enterprise/` —— **无框架维度**的授权模式与定价页，
       * 所以用 VitePress 原生 nav item 而不是 `FwNavLink`（后者按当前框架拼路径）。
       *
       * 但它下面的**使用文档是带框架段的**（`/{fw}/enterprise/*`，装载代码按框架分叉），
       * 默认的 activeMatch 只认 `link` 自己那条路径，读者点进甘特图之后顶栏就不亮了。
       * 所以这里手写一条正则把两种路径都算进去。
       */
      {
        text: '企业版',
        link: '/enterprise/',
        activeMatch: '^/(enterprise/|(vanilla|vue|react)/enterprise/)',
      },
    ],
    sidebar: {
      // 「指南」自己一份（顶栏独立入口）
      ...guideSidebars,

      // 「使用文档」：examples / api 两段共用一份
      ...docsSidebars,

      // 企业版：付费插件的使用文档
      ...enterpriseSidebars,

      '/vanilla/ai/': buildAiSidebar('vanilla'),
      '/vue/ai/': buildAiSidebar('vue'),
      '/react/ai/': buildAiSidebar('react'),

      // 无框架前缀，全站一份
      '/demos/': buildDemosSidebar(),
    },
  },
  markdown: {
    /**
     * 给 Markdown 表格打上 `.vtd-table` 标记，让文档表格样式可以完全 class 化。
     *
     * 为什么必须这么干：demo 是 qiankun **同文档挂载**（非 iframe，见
     * theme/components/PlaygroundHost.vue），而 virt-table 渲染的是真实的
     * `<table>/<th>/<td>`。文档样式里任何裸元素选择器都会无差别命中 demo 里的表格，
     * 所以文档表格必须有自己的 class 才能与组件表格结构性隔离。
     *
     * 为什么覆盖 renderer rule 而不是用 `md.core.ruler` + `token.attrJoin`：
     * VitePress 1.6.4 把这条 rule 硬编码成了返回静态字符串（dist/node 的
     * `md.renderer.rules.table_open = () => '<table tabindex="0">\n'`），
     * 它**完全不读 token.attrs** —— 走 core ruler 加的 class 会被静默丢掉。
     * 而 `markdown.config(md)` 在 createMarkdownRenderer 的最末尾调用，
     * 晚于那次赋值，所以这里的覆盖能稳定生效。
     *
     * `tabindex="0"` 照抄 VitePress：表格是 `display: block; overflow-x: auto`，
     * 靠它让键盘用户能聚焦并横向滚动。**别删，也别挪**（没有 wrapper 接手）。
     */
    config(md) {
      md.renderer.rules.table_open = () =>
        '<table class="vtd-table" tabindex="0">\n';
    },
  },
  vite: {
    resolve: {
      // 用数组 + 正则而非对象：对象形式是**前缀**匹配，
      // `@virt-table/vanilla/plugins` 会被当成 `.../src/index.ts/plugins`
      alias: [
        {
          find: /^@virt-table\/vanilla\/plugins$/,
          replacement: pkg('vanilla/src/plugins/index.ts'),
        },
        {
          find: /^@virt-table\/vanilla\/components$/,
          replacement: pkg('vanilla/src/components/index.ts'),
        },
        {
          find: /^@virt-table\/vanilla\/(plugins|components)\/(.*)$/,
          replacement: pkg('vanilla/src/$1/$2'),
        },
        // 首页 hero 直接建真实实例，样式按文档里给用户的那个写法引入
        // （见 theme/components/home/HomeLiveTable.vue）。产物里它叫 core.css，
        // 源码里是 src/index.css —— 这条 alias 把两者对上，省掉一串 ../../..
        {
          find: /^@virt-table\/vanilla\/core\.css$/,
          replacement: pkg('vanilla/src/index.css'),
        },
        {
          find: /^@virt-table\/vanilla$/,
          replacement: pkg('vanilla/src/index.ts'),
        },
        {
          find: /^@virt-table\/react$/,
          replacement: pkg('react/src/index.ts'),
        },
        { find: /^@virt-table\/vue$/, replacement: pkg('vue/src/index.ts') },
      ],
    },
    /**
     * 联调本地 `virt-list` 时（`VT_LINK_LOCAL=1 pnpm dev:docs`）把它踢出预打包。
     *
     * 起因是 2026-08-14 排查移动端滚动时浪费掉的好几轮：改了
     * `node_modules/@virt-list/vanilla/dist` 的内容之后，**服务端明明是新代码，浏览器
     * 拿到的却一直是旧的**。原因是 vite 给预打包依赖发 `max-age=31536000, immutable`，
     * 靠 URL 上的 `?v=<browserHash>` 失效；而 browserHash 只由 **lockfile + vite config**
     * 算出，**不看依赖内容** —— 实测改 dist 后 `fileHash` 变了，`browserHash` 和
     * `lockfileHash` 一动不动。URL 不变 + immutable ⇒ 请求根本不发到服务器，
     * 清服务端缓存、重启 dev server 全都无效，只能靠浏览器硬刷新绕过。
     * （给副本改 version 号也不管用，试过。）
     *
     * 排除预打包之后它按普通源码模块服务，改完刷新即生效。默认不开：预打包本来
     * 是对的，dev 首屏请求数会多一些，只在联调期需要付这个代价。
     */
    optimizeDeps: {
      exclude: process.env.VT_LINK_LOCAL
        ? ['@virt-list/vanilla', '@virt-list/core']
        : [],
    },
  },
});
