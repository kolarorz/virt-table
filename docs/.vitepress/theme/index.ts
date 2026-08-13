import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import PlaygroundHost from './components/PlaygroundHost.vue';
import FwNavLink from './components/FwNavLink.vue';
import ApiTable from './components/ApiTable.vue';
import AiScenarios from './components/AiScenarios.vue';
import HomeIndex from './components/home/HomeIndex.vue';
import Layout from './Layout.vue';
import './styles/design.css';
import './styles/playground.css';
// 文档表格独占一层 class 化样式，与 demo 里 virt-table 的真实 <table> 结构性隔离
import './styles/doc-table.css';
// 首页（index.md）自成一套版式，全部挂在 .vth-* 命名空间下
import './styles/home.css';

const theme: Theme = {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('PlaygroundHost', PlaygroundHost);
    app.component('FwNavLink', FwNavLink);
    app.component('ApiTable', ApiTable);
    app.component('AiScenarios', AiScenarios);
    app.component('HomeIndex', HomeIndex);
  },
};

export default theme;
