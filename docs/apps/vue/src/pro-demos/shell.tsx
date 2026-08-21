import { defineComponent, h, ref, type Component } from 'vue';
import { setLicenseKey } from '@virt-table-pro/license';
import { resetProDemoGlobals, type ResetOptions } from '../../../pro-kit/shared/reset-globals';
import '../../../pro-kit/shared/pro-demo.css';

/**
 * 把付费插件 demo 接到微应用的示例契约上（Vue 端）。
 *
 * 微应用这边的契约是**一个组件**（`src/App.tsx` 的 `demoMap`），而付费 demo 通过
 * `emit('status', text)` 往状态行写字。这个文件就是那层适配，顺带做两件每个付费 demo 都要
 * 做的事：设授权密钥、引入外壳样式。
 *
 * **它是后续搬迁的杠杆**：付费仓库 playground 里还有 6 个 Vue demo 要搬过来，有了这层
 * 之后每个都是「拷过来、改一行 import、注册一条」。
 *
 * 写成 TSX 而不是 SFC：这个 app 的注册表（`App.tsx`）本身就是 TSX，一个只有五行模板的
 * 包装组件不值得多开一个 `.vue` 文件。
 *
 * 状态行放在 demo 之后渲染，靠 CSS 的 `order` 排到工具栏下面
 * （见 `pro-kit/shared/pro-demo.css`）—— demo 自己渲染工具栏/表格/补充信息，
 * 让它把状态行插在中间就得多约定一个插槽，不值得。
 */
export function withProDemoShell(demo: Component, options: ResetOptions = {}): Component {
  return defineComponent({
    name: 'ProDemoShell',
    setup() {
      const status = ref('');
      /*
       * 复位模块级单例（许可密钥、编辑桥接）。在 `setup` 里同步做，**不放 onMounted** ——
       * demo 的表格在它自己的 setup / onMounted 里建起来，复位晚于建表的话密钥还是上一个
       * demo 留下的，未授权角标不会出现，而那正是 license demo 要验的东西。
       */
      resetProDemoGlobals(setLicenseKey, options);

      return () =>
        h('div', { class: 'pro-demo-shell' }, [
          h(demo, { onStatus: (text: string) => (status.value = text) }),
          h('div', { class: 'pg-status' }, status.value),
        ]);
    },
  });
}
