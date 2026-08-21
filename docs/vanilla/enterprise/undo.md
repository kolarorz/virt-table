# 撤销 / 重做

<ProPkgStatus pkg="@virt-table-pro/undo" status="shipped" css="none" />

<ProDemo pkg="@virt-table-pro/undo" example-id="pro-undo" />

<!--@include: @/.enterprise/undo/s0.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtUndo, type HistoryChangeInfo } from '@virt-table-pro/undo';

const undoBtn = document.querySelector<HTMLButtonElement>('#undo')!;
const redoBtn = document.querySelector<HTMLButtonElement>('#redo')!;

const table = new VirtTable(el, {
  list: rows,
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [
    vtUndo({
      limit: 100,
      onChange: (info: HistoryChangeInfo) => {
        undoBtn.disabled = !info.canUndo;
        redoBtn.disabled = !info.canRedo;
        // labels 两侧都是「离当前最近的排最前」，取 [0] 就是下一步会发生的事
        undoBtn.title = info.canUndo ? `撤销：${info.labels.undo[0]}` : '没有可撤销的操作';
      },
    }),
  ],
});

undoBtn.onclick = () => table.undo();
redoBtn.onclick = () => table.redo();
```

::: warning onChange 会在挂载时就调一次
`vtUndo` 在 `onMounted`（构造函数末尾）就会调一次 `onChange`。所以按钮变量要在
`new VirtTable` **之前**建好，否则回调里碰到的是 TDZ。
:::

<!--@include: @/.enterprise/undo/s1.md-->

```ts
import { vtCellEditor } from '@virt-table/vanilla/plugins';

// renderEditor 只在用户真的点开编辑时才被调用，所以闭包里引用 table 是安全的
const table = new VirtTable(el, {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40,
  columns: [
    {
      key: 'amount',
      title: '金额',
      width: 140,
      renderEditor: ({ row, value }) => {
        const input = document.createElement('input');
        input.value = String(value ?? '');
        input.addEventListener('change', () => {
          const before = row.amount;
          const after = Number(input.value);
          row.amount = after; // 使用方自己写回（核心不管这一步）
          table.forceUpdate(); // 改的是行对象，表格不会自己知道

          table.recordChange({
            label: '编辑 金额',
            undo: () => {
              row.amount = before;
              table.forceUpdate();
            },
            redo: () => {
              row.amount = after;
              table.forceUpdate();
            },
          });
        });
        return input;
      },
    },
  ],
  plugins: [vtUndo(), vtCellEditor()],
});
```

<!--@include: @/.enterprise/undo/s2.md-->
