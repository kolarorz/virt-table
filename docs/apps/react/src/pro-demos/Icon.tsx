import { ICON_SVG_ATTRS } from '../../../pro-kit/shared/icons';

/**
 * 小图标（React 端的外壳）。**path 数据来自 `shared/icons.ts`，三端共用一份** ——
 * 这里只负责把它包成 JSX，不做设计。
 *
 * 用 JSX 而不是 `dangerouslySetInnerHTML`：SVG 就是普通标签，没必要为它开一个绕过
 * React 转义的口子。
 */
export function Icon({ paths }: { paths: string[] }) {
  return (
    <svg {...ICON_SVG_ATTRS} aria-hidden="true">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
