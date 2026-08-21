/**
 * 图片查看器的**公开入口**：`@virt-table/vanilla/components/image-viewer`
 *
 * ```ts
 * import { openImageViewer } from '@virt-table/vanilla/components/image-viewer';
 * import '@virt-table/vanilla/components/image-viewer.css';
 * ```
 *
 * ## 为什么单独开一个子路径
 *
 * 查看器本身（`_image-viewer.ts`）是给内置组件 `VtImage` 写的，但它与单元格没有任何耦合
 * —— 铺满视口的模态浮层 + 一条空闲期取图队列，任何「有一张图要放大看」的场景都用得上。
 * 第一个外部消费者是付费包 `@virt-table-pro/floating-image`（全表浮动图片，点图看大图）。
 *
 * 那个包只能吃核心的**公开契约**（见 pro 仓库 AGENTS.md 第一条：碰私有成员的话，核心每次
 * 重构都会在客户侧炸掉而 CI 抓不到）。于是按那条约定的做法，把能力在核心沉淀成公开 API
 * ——就是这个文件。
 *
 * **不从 `@virt-table/vanilla/components` barrel 走**：那个入口带着 19 个单元格组件与
 * 整份 `components.css`（55 kB JS + 40 kB CSS）。只想弹一个查看器的使用方不该为此付钱，
 * 所以这里是独立入口、独立 CSS（`image-viewer.css`，barrel 也 `@import` 它，两边内容完全
 * 相同、同时引入无副作用）。
 *
 * 那份 CSS **刻意不带下划线前缀**（`components/` 下的内部件都叫 `_xxx`）：它随这个入口
 * 一起是公开面，文件名与 exports 里的 `./components/image-viewer.css` 对齐，
 * 于是「吃源码的链路」（本仓库 playground 的 alias）与「吃产物的链路」（客户、以及
 * 付费包）引的是同一个路径，不会出现「monorepo 内引得动、装到用户项目里 404」。
 */
import './image-viewer.css';

export {
  openImageViewer,
  closeImageViewer,
  type ViewerImage,
  type ImageViewerOptions,
} from './_image-viewer';
