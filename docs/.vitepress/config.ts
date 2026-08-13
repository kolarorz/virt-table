import { defineConfig } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';

const deployBase = process.env.DEPLOY_BASE;
const base = deployBase || '/';

/** packages/ 下的源码路径（文档站直接吃源码，不走 dist） */
const pkg = (p: string) => fileURLToPath(new URL(`../../packages/${p}`, import.meta.url));

/**
 * 三端共用一份示例清单 —— 侧边栏的分类与条目在 vanilla / vue / react 之间**逐条对齐**。
 *
 * 之前 vanilla 与框架端各维护一份（`vanillaXxxLinks` / `sharedXxxLinks`），
 * 结果框架端长期少了增强功能、插件、单元格组件三整节。合成一份之后，
 * 新增示例只要在这里加一行，三端同时出现 —— 缺页会在 `pnpm build:docs` 时暴露。
 *
 * 真正的框架差异走下面的 `frameworkOnlyBasicLinks` / `thirdPartyLinks`：
 * 「组件渲染」是 Vue/React 特有能力，第三方组件库按框架各配一个，不强行对齐。
 */
const demoLinks = [
  { text: '基础表格', link: 'basic/basic' },
  { text: '边框', link: 'basic/border' },
  { text: '斑马纹', link: 'basic/stripe' },
  { text: '空态', link: 'basic/empty' },
  { text: '无表头', link: 'basic/no-header' },
  { text: '高亮', link: 'basic/highlight' },
  { text: '索引列', link: 'basic/index-col' },
  { text: '复选框', link: 'basic/checkbox' },
  { text: '列宽拖拽', link: 'basic/resize' },
  { text: '冻结列', link: 'basic/fixed' },
  { text: '多级分组表头/表尾', link: 'basic/header-group' },
  { text: '自动换行', link: 'basic/wrap' },
  { text: '溢出隐藏', link: 'basic/overflow' },
  { text: '对齐方式', link: 'basic/align' },
  { text: '数据更新', link: 'basic/force-update' },
  { text: '暗夜模式', link: 'basic/theme' },
];

const advancedLinks = [
  { text: '展开行', link: 'advanced/expand' },
  { text: '树形', link: 'advanced/tree' },
  { text: '分组', link: 'advanced/group' },
  { text: '树形 + 分组', link: 'advanced/group-tree' },
  { text: '高级筛选（筛选管理器）', link: 'advanced/filter-builder' },
  { text: '列排序', link: 'advanced/sort' },
  { text: '单元格独立渲染', link: 'advanced/cell-type-render' },
];

const featureLinks = [
  { text: '加载态', link: 'feature/loading' },
  { text: '自动合计行', link: 'feature/summary' },
  { text: '固定行 pinned', link: 'feature/pinned' },
  { text: '单选行 radio', link: 'feature/radio' },
  { text: '编辑校验', link: 'feature/validate' },
  { text: '国际化 i18n', link: 'feature/i18n' },
  { text: '分页（客户端）', link: 'feature/pagination-client' },
  { text: '分页（服务端）', link: 'feature/pagination' },
  { text: '无限滚动', link: 'feature/infinite' },
  { text: '服务端数据', link: 'feature/server-data' },
  { text: '树形懒加载', link: 'feature/lazy-tree' },
  { text: '无障碍 ARIA', link: 'feature/aria' },
];

// 插件示例（可选能力，按需 plugins 装载）；文件在 examples/plugins/ 与 apps/*/components/plugins/
const pluginLinks = [
  { text: 'vtCellEditor 单元格编辑', link: 'plugins/cells-render' },
  { text: 'vtCellSelection 单元格选区', link: 'plugins/cell-selection' },
  { text: 'vtClipboard 剪贴板', link: 'plugins/clipboard' },
  { text: 'vtColumnDrag 列拖拽排序', link: 'plugins/column-drag' },
  { text: 'vtColumnFilter 列筛选', link: 'plugins/filter' },
  { text: 'vtColumnFilter 富筛选类型', link: 'plugins/rich-filter' },
  { text: 'vtColumnPanel 列显隐/列设置', link: 'plugins/column-visibility' },
  { text: 'vtContextMenu 右键菜单', link: 'plugins/context-menu' },
  { text: 'vtExport 导出 CSV/Excel', link: 'plugins/export' },
  { text: 'vtExport 打印', link: 'plugins/print' },
  { text: 'vtKeyboardNav 键盘导航', link: 'plugins/keyboard' },
  { text: 'vtRowDrag 行拖拽排序', link: 'plugins/row-drag' },
  { text: 'vtSearch 表格搜索', link: 'plugins/search' },
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
  { text: 'vtAIStream 流式表格', link: 'plugins/ai-stream' },
  { text: 'vtAIColumn AI 列', link: 'plugins/ai-column' },
  { text: 'vtAIQuery 自然语言查询', link: 'plugins/ai-query' },
];

const mergeLinks = [
  { text: '表身合并', link: 'merge/body-merge' },
  { text: '按值自动合并', link: 'merge/auto-merge' },
  { text: '表头合并', link: 'merge/header-merge' },
  { text: '表尾合并', link: 'merge/footer-merge' },
  { text: '表头 + 表尾合并', link: 'merge/head-foot-merge' },
];

// 内置单元格组件（`@virt-table/vanilla/components`）。分三段与组件的交互模型对应：
// 编辑态（需装 vtCellEditor）/ 直接可点 / 纯展示，顺序与 components/index.ts 一致
const columnLinks = [
  { text: 'VtInput 文本输入', link: 'column/vt-input' },
  { text: 'VtNumberInput 数字输入', link: 'column/vt-number-input' },
  { text: 'VtTextarea 多行文本', link: 'column/vt-textarea' },
  { text: 'VtSelect 下拉选择', link: 'column/vt-select' },
  { text: 'VtSelect 多选', link: 'column/vt-multi-select' },
  { text: 'VtPerson 人员', link: 'column/vt-person' },
  { text: 'VtCascader 级联选择', link: 'column/vt-cascader' },
  { text: 'VtAutocomplete 输入建议', link: 'column/vt-autocomplete' },
  { text: 'VtDatePicker 日期选择', link: 'column/vt-date-picker' },
  { text: 'VtDateRangePicker 日期范围', link: 'column/vt-date-range-picker' },
  { text: 'VtTimePicker 时间选择', link: 'column/vt-time-picker' },
  { text: 'VtCheckbox 布尔勾选', link: 'column/vt-checkbox' },
  { text: 'VtSwitch 开关', link: 'column/vt-switch' },
  { text: 'VtRate 星级评分', link: 'column/vt-rate' },
  { text: 'VtActions 操作列', link: 'column/vt-actions' },
  { text: 'VtProgress 进度条', link: 'column/vt-progress' },
  { text: 'VtLink 链接', link: 'column/vt-link' },
];

type Framework = 'vanilla' | 'vue' | 'react';

const FRAMEWORK_TITLE: Record<Framework, string> = {
  vanilla: '',
  vue: 'Vue ',
  react: 'React ',
};

/**
 * 「组件渲染」：在列 `render` 里直接返回 VNode / React 元素，由适配层负责挂载与回收。
 * vanilla 没有这层，所以这一条只给框架端 —— 不为了对齐而造一个空页。
 */
const frameworkOnlyBasicLinks: Record<Framework, { text: string; link: string }[]> = {
  vanilla: [],
  vue: [{ text: '组件渲染', link: 'render' }],
  react: [{ text: '组件渲染', link: 'render' }],
};

/**
 * 第三方组件库集成：各框架配自己那一家，vanilla 侧是一页占位说明
 * （原生 DOM 无需适配层，真要接哪家库看对应框架的示例）。
 */
const thirdPartyLinks: Record<Framework, { text: string; link: string }[]> = {
  vanilla: [{ text: '第三方组件库集成', link: 'third-party/cell-edit' }],
  vue: [{ text: 'Element Plus 列渲染', link: 'third-party/cell-edit' }],
  react: [{ text: 'Ant Design 列渲染', link: 'third-party/cell-edit' }],
};

/** 三端同一套分类与条目；差异只有上面两处按框架取的清单 */
function buildExamplesSidebar(fw: Framework) {
  const to = (demo: { text: string; link: string }) => ({
    text: demo.text,
    link: `/${fw}/examples/${demo.link}`,
  });

  return [
    {
      text: `${FRAMEWORK_TITLE[fw]}Table 示例`,
      items: [
        {
          text: '基础功能',
          collapsed: false,
          items: [...demoLinks, ...frameworkOnlyBasicLinks[fw]].map(to),
        },
        { text: '高级功能', collapsed: false, items: advancedLinks.map(to) },
        { text: '增强功能', collapsed: false, items: featureLinks.map(to) },
        { text: '插件', collapsed: false, items: pluginLinks.map(to) },
        { text: 'AI 插件', collapsed: false, items: aiPluginLinks.map(to) },
        { text: '合并单元格', collapsed: false, items: mergeLinks.map(to) },
        { text: '单元格组件（开发中）', collapsed: false, items: columnLinks.map(to) },
        { text: '第三方组件', collapsed: false, items: thirdPartyLinks[fw].map(to) },
        {
          text: '实验阶段',
          collapsed: false,
          items: [{ text: '电子表格', link: 'experimental/spreadsheet' }].map(to),
        },
      ],
    },
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
        { text: '单元格渲染', link: `/${fw}/guide/cell-render` },
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

function buildApiSidebar(fw: 'vanilla' | 'vue' | 'react') {
  return [
    {
      text: 'API',
      items: [{ text: '总览', link: `/${fw}/api/index` }],
    },
  ];
}

export default defineConfig({
  base,
  ignoreDeadLinks: true,
  title: 'VirtTable',
  description: 'A high-performance virtual list component for JavaScript',
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }]],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { component: 'FwNavLink', props: { text: '指南', mod: 'guide' } },
      { component: 'FwNavLink', props: { text: 'AI 场景', mod: 'ai' } },
      { component: 'FwNavLink', props: { text: '示例', mod: 'examples' } },
      { component: 'FwNavLink', props: { text: 'API', mod: 'api' } },
    ],
    sidebar: {
      '/vanilla/guide/': buildGuideSidebar('vanilla'),
      '/vue/guide/': buildGuideSidebar('vue'),
      '/react/guide/': buildGuideSidebar('react'),

      '/vanilla/ai/': buildAiSidebar('vanilla'),
      '/vue/ai/': buildAiSidebar('vue'),
      '/react/ai/': buildAiSidebar('react'),

      '/vanilla/examples/': buildExamplesSidebar('vanilla'),
      '/vue/examples/': buildExamplesSidebar('vue'),
      '/react/examples/': buildExamplesSidebar('react'),

      '/vanilla/api/': buildApiSidebar('vanilla'),
      '/vue/api/': buildApiSidebar('vue'),
      '/react/api/': buildApiSidebar('react'),
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
      md.renderer.rules.table_open = () => '<table class="vtd-table" tabindex="0">\n';
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
        { find: /^@virt-table\/vanilla$/, replacement: pkg('vanilla/src/index.ts') },
        { find: /^@virt-table\/react$/, replacement: pkg('react/src/index.ts') },
        { find: /^@virt-table\/vue$/, replacement: pkg('vue/src/index.ts') },
      ],
    },
  },
});
