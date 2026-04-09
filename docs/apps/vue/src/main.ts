import './style.css';
import { createApp, type App } from 'vue';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import AppComp from './App';

let app: App<Element> | null = null;

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
  app?.unmount();
  app = createApp(AppComp, { exampleId: props?.exampleId ?? 'vue-basic' });
  app.mount(container);
}

renderWithQiankun({
  bootstrap: () => Promise.resolve(),
  mount: (props) => {
    render(props);
    return Promise.resolve();
  },
  unmount: () => {
    app?.unmount();
    app = null;
    return Promise.resolve();
  },
  update: (props) => {
    render(props);
    return Promise.resolve();
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render();
}
