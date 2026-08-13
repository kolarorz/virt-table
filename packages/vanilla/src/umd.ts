/**
 * UMD 全量入口（仅供 `vite.config.umd.ts` 使用，不出现在 package.json exports 里）。
 *
 * `<script>` 场景没有按需引入的余地，所以这里把三个子入口全摊平到一个
 * `window.VirtTable` 上。走打包器的使用方请直接引子路径，别引这个文件。
 */
export * from './index';
export * from './plugins';
export * from './components';
