# virt-table

## 运行

```sh
pnpm i
```

```sh
pnpm dev
```

## 项目目录

```text
.
├─ docs/          # VitePress 文档站点 + playground 宿主
│  ├─ apps/       # 文档内微应用（react/vue/js）
│  │  ├─ js/         # JS 应用
│  │  ├─ react/      # React 应用
│  │  └─ vue/        # Vue 应用
│  ├─ js/         # JS 文档
│  ├─ react/      # React 文档
│  └─ vue/        # Vue 文档
├─ packages/      # npm 发布包（见下方详细说明）
│  ├─ core/
│  ├─ dom/
│  ├─ react/
│  ├─ vue/
│  └─ js/
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

## packages 目录结构

```text
packages/
├─ core/                          # @virt-list/core — 框架无关的虚拟滚动算法内核
│  └─ src/
│     ├─ index.ts                 # 包入口，导出 VirtListCore + 类型
│     ├─ VirtListCore.ts          # 纯算法实现：可视区域计算、缓冲区管理、滚动定位
│     └─ types.ts                 # 公共类型定义（VirtListOptions, ReactiveData, SlotSize 等）
│
├─ dom/                           # @virt-list/dom — 基于原生 DOM 的虚拟列表实现
│  └─ src/
│     ├─ index.ts                 # 包入口，导出 VirtListDOM + 框架适配器工具
│     ├─ VirtListDOM.ts           # DOM 操作封装：容器创建、ResizeObserver、滚动条、DOM 渲染
│     ├─ utils.ts                 # DOM 工具函数（样式合并、属性设置等）
│     ├─ reactAdapter.ts          # React ↔ VirtListDOM 桥接工具
│     └─ vueAdapter.ts            # Vue ↔ VirtListDOM 桥接工具
│
├─ react/                         # @virt-table/react — React 虚拟表格组件
│  └─ src/
│     └─ index.ts
│
├─ vue/                           # @virt-table/vue — Vue 虚拟表格组件
│  └─ src/
│     └─ index.ts
│
└─ js/                            # @virt-table/js — 纯 JS 虚拟表格
   └─ src/
      ├─ index.ts                 # VirtTable 类：自定义 table DOM + VirtListCore 驱动纵向虚拟滚动
      ├─ merge.ts                 # 合并单元格算法
      └─ index.css                # 表格样式
```

### 包依赖关系

```text
@virt-list/core        ← 零依赖，纯算法
    ↑
@virt-list/dom         ← 依赖 core，面向无框架 / 纯 JS 用户
@virt-table/js         ← 依赖 core，纯 JS 虚拟表格
@virt-table/react      ← 依赖 core，peerDep: react ≥17
@virt-table/vue        ← 依赖 core，peerDep: vue ≥2.7
```

### 面向用户的使用方式

| 用户类型       | 推荐包              | 导入示例                                            |
| -------------- | ------------------- | --------------------------------------------------- |
| 纯 JS 表格     | `@virt-table/js`    | `import { VirtTable } from '@virt-table/js'`        |
| Vue 表格       | `@virt-table/vue`   | `import { VirtTable } from '@virt-table/vue'`       |
| React 表格     | `@virt-table/react` | `import { VirtTable } from '@virt-table/react'`     |
| 纯 JS 虚拟列表 | `@virt-list/dom`    | `import { VirtListDOM } from '@virt-list/dom'`      |
| 高级自定义     | `@virt-list/core`   | `import { VirtListCore } from '@virt-list/core'`    |
