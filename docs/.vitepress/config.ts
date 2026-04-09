import { defineConfig } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: process.env.DEPLOY_BASE || '/',
  ignoreDeadLinks: true,
  title: 'virt-table',
  description: 'A high-performance virtual list component for JavaScript',
  themeConfig: {
    nav: [
      { text: 'Pure JS', link: '/examples/js/basic', activeMatch: '^/examples/js/' },
      { text: 'Vue', link: '/examples/vue/basic', activeMatch: '^/examples/vue/' },
      { text: 'React', link: '/examples/react/basic', activeMatch: '^/examples/react/' },
    ],
    sidebar: {
      '/examples/js/': [
        {
          text: 'Table 示例',
          items: [
            {
              text: '基础功能',
              collapsed: false,
              items: [
                { text: '基础表格', link: '/examples/js/basic' },
                { text: '边框', link: '/examples/js/border' },
                { text: '斑马纹', link: '/examples/js/stripe' },
                { text: '空态', link: '/examples/js/empty' },
                { text: '无表头', link: '/examples/js/no-header' },
                { text: '高亮', link: '/examples/js/highlight' },
                { text: '索引列', link: '/examples/js/index' },
                { text: '复选框', link: '/examples/js/checkbox' },
                { text: '列宽拖拽', link: '/examples/js/resize' },
                { text: '冻结列', link: '/examples/js/fixed' },
                { text: '溢出隐藏', link: '/examples/js/overflow' },
                { text: '自动换行', link: '/examples/js/wrap' },
                { text: '对齐方式', link: '/examples/js/align' },
              ],
            },
            {
              text: '高级功能',
              collapsed: false,
              items: [
                { text: '展开行', link: '/examples/js/expand' },
                { text: '树形', link: '/examples/js/tree' },
                { text: '分组', link: '/examples/js/group' },
                { text: '树形 + 分组', link: '/examples/js/group-tree' },
                { text: '单元格选区', link: '/examples/js/cell-selection' },
                { text: '表格搜索', link: '/examples/js/search' },
                { text: '单元格编辑', link: '/examples/js/cells' },
                { text: '列筛选', link: '/examples/js/filter' },
              ],
            },
            {
              text: '合并单元格',
              collapsed: false,
              items: [
                { text: '表身合并', link: '/examples/js/merge' },
                { text: '表头合并', link: '/examples/js/header-merge' },
                { text: '表尾合并', link: '/examples/js/footer-merge' },
                { text: '表头 + 表尾合并', link: '/examples/js/head-foot-merge' },
              ],
            },
            { text: '电子表格(实验室)', link: '/examples/js/spreadsheet' },
          ]
        },
      ],
      '/examples/vue/': [
        {
          text: 'Vue 示例',
          items: [
            { text: '基础表格', link: '/examples/vue/basic' },
            { text: '组件渲染', link: '/examples/vue/render' },
          ],
        },
      ],
      '/examples/react/': [
        {
          text: 'React 示例',
          items: [
            { text: '基础表格', link: '/examples/react/basic' },
            { text: '组件渲染', link: '/examples/react/render' },
          ],
        },
      ],
    },
  },
  vite: {
    resolve: {
      alias: {
        // 后面会摘出去
        '@virt-list/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),

        '@virt-table/js': fileURLToPath(new URL('../../packages/js/src/index.ts', import.meta.url)),
        '@virt-table/react': fileURLToPath(new URL('../../packages/react/src/index.ts', import.meta.url)),
        '@virt-table/vue': fileURLToPath(new URL('../../packages/vue/src/index.ts', import.meta.url)),
      },
    },
  },
});
