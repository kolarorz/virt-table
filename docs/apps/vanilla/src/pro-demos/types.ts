/**
 * vanilla 端付费插件 demo 的契约。
 *
 * **与付费仓库 playground 那份逐字相同**，这是有意的：那边的 demo 正在往这里搬，
 * 契约一致意味着搬迁是「拷过来、改一行 import」而不是重写。
 *
 * 外壳（`shell.ts`）负责 DOM 骨架与样式，demo 只管「装哪个插件、加哪几个按钮、怎么演示」。
 *
 * ## 为什么每个 demo 自己 new 一张表
 *
 * 这些 demo 存在的理由是**证明每个付费插件能独立工作**：一个 demo 就是一张只装了那一个
 * 插件的新表。共用一张表再动态增删插件做不到（核心的插件是构造期一次性安装，没有运行时
 * 卸载单个插件的入口），而且共用会让「A 的 bug 只在装了 B 时出现」这类问题永远藏着 ——
 * 那是 open-core 最贵的一类 bug。
 */

export interface DemoHost {
  /** 表格容器，已经有高度（`.pg-table`），直接 `new VirtTable(el, ...)` */
  tableEl: HTMLElement;
  /** demo 自己的按钮栏，往里 append 即可 */
  toolbarEl: HTMLElement;
  /** 补充信息区（历史列表、当前视图名这类） */
  asideEl: HTMLElement;
  /** 状态文字 */
  setStatus(text: string): void;
  /** 造一个统一样式的按钮并挂进 toolbar */
  button(label: string, onClick: (btn: HTMLButtonElement) => void): HTMLButtonElement;
  /**
   * 造一个开关（勾选框 + 文字）并挂进 toolbar。
   *
   * 与 `button` 分开是因为语义不同：按钮是「做一件事」，开关是「一个状态开着还是关着」。
   * 几个互不相关的布尔状态用一串「A / B / C」轮换按钮表达，用户永远猜不到当前是哪一档。
   */
  switch(label: string, checked: boolean, onChange: (checked: boolean) => void): HTMLInputElement;
}

export interface DemoInstance {
  /** 销毁表格与自建监听。外壳在卸载时调用，之后会把 DOM 清空 */
  destroy(): void;
}

export interface ProDemo {
  /** 示例 id 的后半段：注册进微应用时会加上 `pro-` 前缀（见 `index.ts`） */
  id: string;
  /**
   * 挂载前怎么处理演示密钥，默认 `'apply'`（注入，于是没有未授权角标）。
   *
   * `license` demo 用 `'reset'`：它演示的就是「角标出现 → 注入密钥 → 角标消失」，
   * 一进来就带着密钥的话第一步永远看不到。见 `pro-kit/shared/reset-globals.ts`。
   */
  license?: 'apply' | 'reset';
  mount(host: DemoHost): DemoInstance;
}
