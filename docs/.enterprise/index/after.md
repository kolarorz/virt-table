## 三端是怎么支持的

付费插件本身**只有一份实现**（吃 `@virt-table/vanilla` 的插件契约）。框架端不需要各写一遍：

- **命令式 API** 靠每个包的类型声明扩展 `VirtTablePluginApi`。核心的 `VirtTable` 与
  React 的 `VirtTableRef` 都 extends 它，所以 `tableRef.current.saveView()` 直接有类型。
- **Vue 端**运行时一样正常（expose 出来的 Proxy 上方法都在），只是类型链路目前差一层：
  ref 的类型要自己交叉一个 `VirtTablePluginApi`。每页的 Vue 代码块里都写了怎么拼。

所以这些页每一页只有一份正文，真正随框架变的只有「怎么装上」与「怎么拿到实例」。

## 下一步

| 插件 | 做什么 |
| --- | --- |
| <ProLink to="gantt/">甘特图</ProLink> | 左表右轴、时间桶虚拟化、拖条改期、工作日历 |
| <ProLink to="formula/column">公式 · 计算列</ProLink> | 一列的值由同行其它列算出 |
| <ProLink to="formula/cell">公式 · 单元格公式</ProLink> | A1 记法、区域引用、依赖图、增量重算 |
| <ProLink to="floating-image">浮动图片</ProLink> | 贴在纸上、可拖可缩放旋转的图 |
| <ProLink to="undo">撤销 / 重做</ProLink> | 查询状态自动入栈，数据变更显式录制 |
| <ProLink to="xlsx">真 xlsx 与 PDF</ProLink> | zip + OOXML：样式/合并/多级表头/冻结/多 sheet，与打印排版 |
| <ProLink to="pivot">透视表</ProLink> | 行列维度分组聚合、交叉分析、小计与总计 |
| <ProLink to="license">许可与角标</ProLink> | 密钥怎么设、未授权时会发生什么 |

<!-- 命名视图暂不出售，从上面这张表里摘掉了一行（2026-08-31，恢复清单见 docs/enterprise/index.md 的同日注释）。
注释放在表格**外面**：markdown 表格里夹一行 HTML 注释会把表截成两半。
| <ProLink to="views">命名视图</ProLink> | 列宽/列序/排序/筛选/分页存成可切换的视图 |
-->

规划中：<ProLink to="charts">集成图表</ProLink> · <ProLink to="collab">协同</ProLink>
