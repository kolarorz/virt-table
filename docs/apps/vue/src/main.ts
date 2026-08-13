import './style.css';
import { createApp, type App } from 'vue';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import AppComp from './App';

const appMap = new Map<Element, App<Element>>();

function getContainer(props?: { container?: Element }) {
  return (
    props?.container?.querySelector('#vue-root') ??
    document.getElementById('vue-root') ??
    document.getElementById('app')
  );
}

function render(props?: { container?: Element; exampleId?: string }) {
  const container = getContainer(props);
  if (!container) return;
  const key = props?.container;
  if (key) {
    const prevApp = appMap.get(key);
    prevApp?.unmount();
  }
  const app = createApp(AppComp, { exampleId: props?.exampleId ?? 'vue-basic' });
  app.mount(container);
  if (key) appMap.set(key, app);
}

renderWithQiankun({
  bootstrap: () => Promise.resolve(),
  mount: (props) => {
    render(props);
    return Promise.resolve();
  },
  unmount: (props) => {
    const key = props?.container;
    if (key) {
      const app = appMap.get(key);
      app?.unmount();
      appMap.delete(key);
    }
    return Promise.resolve();
  },
  update: (props) => {
    render(props);
    return Promise.resolve();
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  // 独立运行（非 qiankun 挂载）时支持 ?example=xxx 直接打开某个示例，便于本地调试
  const exampleId = new URLSearchParams(location.search).get('example') ?? undefined;
  render(exampleId ? { exampleId } : undefined);
}
