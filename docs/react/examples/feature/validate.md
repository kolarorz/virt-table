# React 编辑校验

为列（或 `VtInput` / `VtNumberInput` 等单元格组件）配置 `validator`，编辑时非法值实时标红并提示；ref 上的 `validateAll()` 可在保存前批量校验，返回所有未通过项。

单元格组件与 `vtCellEditor` 插件都与框架无关，React 侧直接引用 vanilla 的实现。

## 使用的 API

```ts
import { VtInput, VtNumberInput } from '@virt-table/vanilla/components';
import { vtCellEditor } from '@virt-table/react';

// 列（或组件工厂）上声明校验器：返回 true 通过，返回字符串即错误文案
VtInput<Row>({
  key: 'name',
  title: '姓名（必填）',
  width: 200,
  validator: (v) => (String(v ?? '').trim() ? true : '姓名不能为空'),
});

type Options = {
  plugins: [vtCellEditor()];  // 编辑态需要它
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
}

// 实例方法（ref 上调用）：批量校验，返回 [{ row, colKey, message }]
tableRef.current?.validateAll();
```

## 示例

<PlaygroundHost framework="react" example-id="react-validate" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/feature/Validate.tsx
:::
