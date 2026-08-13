---
layout: home

# markdownStyles: false 是**功能性设置，不是排版偏好**。
#
# 它让 VPHome 跳过 VPHomeContent 那层 `<div class="vp-doc container">` 包装，
# 于是首页正文不带 `.vp-doc`。必须如此：hero 里嵌的是**真实的 VirtTable 实例**
# （theme/components/home/HomeLiveTable.vue），而 VitePress 自带的
# `.vp-doc table`(0,1,1) 会压过 `.vt-table`(0,1,0) —— `display: table` 被顶成
# block、单元格内边距被顶成 8/16px，colgroup 列宽体系与虚拟滚动的行高账本一起崩。
#
# 顺带也让首页能自己控制版心（不吃 1280px + 64px 的文档容器）。
markdownStyles: false
---

<HomeIndex />
