import { defineConfig } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';

const vanillaDemoLinks = [
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
  { text: '溢出隐藏', link: 'basic/overflow' },
  { text: '自动换行', link: 'basic/wrap' },
  { text: '对齐方式', link: 'basic/align' },
];

const vanillaAdvancedLinks = [
  { text: '展开行', link: 'advanced/expand' },
  { text: '树形', link: 'advanced/tree' },
  { text: '分组', link: 'advanced/group' },
  { text: '树形 + 分组', link: 'advanced/group-tree' },
  { text: '单元格选区', link: 'advanced/cell-selection' },
  { text: '表格搜索', link: 'advanced/search' },
  { text: '单元格编辑', link: 'advanced/cells' },
  { text: '列筛选', link: 'advanced/filter' },
];

const vanillaMergeLinks = [
  { text: '表身合并', link: 'merge/body-merge' },
  { text: '表头合并', link: 'merge/header-merge' },
  { text: '表尾合并', link: 'merge/footer-merge' },
  { text: '表头 + 表尾合并', link: 'merge/head-foot-merge' },
];

const vueLinks = [
  { text: '基础表格', link: 'basic' },
  { text: '组件渲染', link: 'render' },
];

const reactLinks = [
  { text: '基础表格', link: 'basic' },
  { text: '组件渲染', link: 'render' },
];

function buildVanillaExamplesSidebar() {
  return [
    {
      text: 'Table 示例',
      items: [
        {
          text: '基础功能',
          collapsed: false,
          items: vanillaDemoLinks.map((demo) => ({ text: demo.text, link: `/vanilla/examples/${demo.link}` })),
        },
        {
          text: '高级功能',
          collapsed: false,
          items: vanillaAdvancedLinks.map((demo) => ({ text: demo.text, link: `/vanilla/examples/${demo.link}` })),
        },
        {
          text: '合并单元格',
          collapsed: false,
          items: vanillaMergeLinks.map((demo) => ({ text: demo.text, link: `/vanilla/examples/${demo.link}` })),
        },
        {
          text: '实验阶段',
          collapsed: false,
          items: [{ text: '电子表格', link: '/vanilla/examples/experimental/spreadsheet' }]        },
      ],
    },
  ];
}

function buildSimpleExamplesSidebar(
  framework: 'vanilla' | 'vue' | 'react',
  title: string,
  links: { text: string; link: string }[],
) {
  return [
    {
      text: `${title} 示例`,
      items: links.map((demo) => ({ text: demo.text, link: `/${framework}/examples/${demo.link}` })),
    },
  ];
}

function buildGuideSidebar(fw: 'vanilla' | 'vue' | 'react') {
  return [
    {
      text: '指南',
      items: [{ text: '快速开始', link: `/${fw}/guide/index` }],
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
  base: process.env.DEPLOY_BASE || '/',
  ignoreDeadLinks: true,
  title: 'virt-table',
  description: 'A high-performance virtual list component for JavaScript',
  themeConfig: {
    nav: [
      { component: 'FwNavLink', props: { text: '指南', mod: 'guide' } },
      { component: 'FwNavLink', props: { text: '示例', mod: 'examples' } },
      { component: 'FwNavLink', props: { text: 'API', mod: 'api' } },
    ],
    sidebar: {
      '/vanilla/guide/': buildGuideSidebar('vanilla'),
      '/vue/guide/': buildGuideSidebar('vue'),
      '/react/guide/': buildGuideSidebar('react'),

      '/vanilla/examples/': buildVanillaExamplesSidebar(),
      '/vue/examples/': buildSimpleExamplesSidebar('vue', 'Vue', vueLinks),
      '/react/examples/': buildSimpleExamplesSidebar('react', 'React', reactLinks),

      '/vanilla/api/': buildApiSidebar('vanilla'),
      '/vue/api/': buildApiSidebar('vue'),
      '/react/api/': buildApiSidebar('react'),
    },
  },
  vite: {
    resolve: {
      alias: {
        '@virt-table/vanilla': fileURLToPath(new URL('../../packages/vanilla/src/index.ts', import.meta.url)),
        '@virt-table/react': fileURLToPath(new URL('../../packages/react/src/index.ts', import.meta.url)),
        '@virt-table/vue': fileURLToPath(new URL('../../packages/vue/src/index.ts', import.meta.url)),
      },
    },
  },
});
