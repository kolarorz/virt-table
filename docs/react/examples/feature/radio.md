# React 单选行 radio

配置 `type: 'radio'` 列实现行单选（互斥），通过 `onRadioChange` 监听、ref 上的 `getSelectedRadio()` / `setSelectedRadio()` 读写选中行。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  type: 'radio';  // 特殊列类型：单选列
  fixed?: 'left' | 'right';  // 冻结列
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  onRadioChange?: (row: T) => void;  // 选中行变化回调
}

// 实例方法（ref 上调用）
tableRef.current?.getSelectedRadio();
tableRef.current?.setSelectedRadio(rowKey);  // 传 null 清除
```

## 示例

<PlaygroundHost framework="react" example-id="react-radio" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/feature/Radio.tsx
:::
