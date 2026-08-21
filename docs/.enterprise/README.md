# 付费插件文档的共享正文

这个目录里**没有页面**，只有被 include 的正文片段。

## 为什么是这个形状

付费插件的使用文档走三段式 URL（`/{fw}/enterprise/<插件>`），与站里其它内容一致：
读者在 Vue 文档里点进甘特图，看到的应该是 Vue 的装载代码，不是先切一次框架。

但这些页与「功能」那些页不一样 —— 那边一页 24 行（一句话 + 一个 demo + 一张相关 API 表），
抄三遍的成本可以忽略；付费插件页是 250~530 行的**参考文档**（配置表、实例 API 表、CSS 类名、
注意事项），而其中**框架相关的只有两处**：`## 快速开始` 里的装载代码，和少数几段
「ref 上怎么拿到这些方法」。剩下 80% 以上三端逐字相同。

三份逐字相同的正文必然漂移 —— 本站自己就漂过（vanilla 与框架端的侧边栏长期对不上，
见 `config.ts` 里 `basicLinks` 那段头注）。所以：

- **框架无关的正文**放这里，一份；
- **每端的页面文件**只写 h1、状态条、demo 位、这一端的装载代码、以及 include 几行。

## 怎么 include

```md
<!--@include: @/.enterprise/views/s1.md-->
```

片段的命名是机械的：一页里**框架无关的段落**按出现顺序叫 `s0.md` / `s1.md` / …（下标是它在
原页里的段序，中间跳号是正常的 —— 那些位置是按框架分叉的代码块）；整页都框架无关、只有一段的
就叫 `body.md`。

`@` 解析到 `docs/`（VitePress 的 `processIncludes`，srcDir 相对）。片段是 `.md` 时
frontmatter 会被自动剥掉，所以片段里别写 frontmatter。include 可以嵌套。

## 两个坑

1. **路径写错是静默的。** `processIncludes` 命中不到文件时**原样返回那行注释**，只在
   `DEBUG=*` 下往 stderr 写一句。也就是说拼错路径的表现是页面里少了一整节，构建照样绿。
   `pnpm verify:enterprise`（`scripts/check-enterprise-docs.mjs`）就是补这一刀：扫所有页面里的
   `@include` 目标，缺一个就让构建红。迁移时真踩过 —— `names` 数组与段落错位，三端页面各少了
   后半篇，而构建全绿。

2. **点目录不会被扫成页面**，这是本目录名以 `.` 开头的唯一原因：VitePress 的
   `resolvePages()` 用 tinyglobby 扫 `**.md`，默认 `dot: false`。改名成 `enterprise-src/`
   会让每个片段都变成一个能被搜索到的裸页面。

## 片段里不能出现什么

- **框架相关的代码**（那是页面文件的事）
- **指向付费仓库的路径**（`packages/<x>/src/...`）—— 公开站上没有它的位置
- **指向付费仓库内部文档的链接**（`/guide/debug-stack` 那类）—— 那些页不在这个站里。
  注意本站的 `ignoreDeadLinks` 是**开着**的，VitePress 不会报，靠上面那个脚本查
- **写给插件作者的话**（「别绕过公开契约取核心私有成员」那类）—— 读者是客户，不是插件开发者

## 跨页链接必须用 `<ProLink>`

正文三端共用，所以片段里**不能**写死 `/vanilla/enterprise/undo` —— 那会把 Vue 读者踢到
vanilla 那一端。写 `<ProLink to="undo">撤销 / 重做</ProLink>`，它按当前框架拼路径。
指向核心自己的文档用 `core=`（`<ProLink core="api/instance">实例方法</ProLink>`），
指向无框架维度的页面（`/enterprise/`、`/demos/*`）用普通 markdown 链接即可。
