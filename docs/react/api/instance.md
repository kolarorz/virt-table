# 实例方法

通过 `ref`（类型 `VirtTableRef`）访问组件暴露的方法。插件注入的方法会自动透出到同一个 ref 上。

| 方法                 | 参数                                           | 返回值                                                        | 说明                                  |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| `getTable`           | —                                              | `VirtTable \| null`                                           | 获取底层 Vanilla 实例                 |
| `scrollToIndex`      | `index: number`                                | `void`                                                        | 滚动到指定行                          |
| `scrollIntoView`     | `index: number`                                | `void`                                                        | 将行滚入可视区域                      |
| `scrollToTop`        | —                                              | `void`                                                        | 滚动到顶部                            |
| `scrollToBottom`     | —                                              | `void`                                                        | 滚动到底部                            |
| `scrollToOffset`     | `offset: number`                               | `void`                                                        | 滚动到像素偏移                        |
| `scrollToCell`       | `row: number, col: number`                     | `void`                                                        | 滚动到单元格                          |
| `reset`              | —                                              | `void`                                                        | 重置虚拟滚动                          |
| `setList`            | `list: Record<string, unknown>[]`              | `void`                                                        | 更新数据                              |
| `setColumns`         | `columns: ReactTableColumn[]`                  | `void`                                                        | 更新列（支持 ReactNode 渲染）         |
| `setMerges`          | `merges: MergeCell[]`                          | `void`                                                        | 更新表体合并                          |
| `getMerges`          | —                                              | `MergeCell[]`                                                 | 静态合并配置（不含自动合并）          |
| `getEffectiveMerges` | `rowBegin?, rowEnd?`                           | `MergeCell[]`                                                 | 实际生效的合并块（含自动合并真实段）  |
| `setHeaderMerges`    | `merges: MergeCell[], headerData?: string[][]` | `void`                                                        | 更新表头合并                          |
| `setFooterData`      | `data: string[][], merges?: MergeCell[]`       | `void`                                                        | 更新表尾                              |
| `forceUpdate`        | —                                              | `void`                                                        | 强制重渲染（含编辑态 React 组件刷新） |
| `getCheckedRows`     | —                                              | `Record<string, unknown>[] \| undefined`                      | 勾选行数据（按当前 `list` 过滤）      |
| `getCheckedKeys`     | —                                              | `string[] \| undefined`                                       | 全部已勾选 key（含不在当前页的）      |
| `getState`           | —                                              | `VirtTableState \| undefined`                                  | 导出可持久化视图状态 |
| `setState`           | `state: VirtTableState \| null`                | `boolean \| undefined`                                        | 应用状态（只应用出现的字段） |
| `setCheckedRows`     | `keys: string[]`                               | `void`                                                        | 设置勾选                              |
| `clearCheckedRows`   | —                                              | `void`                                                        | 清除勾选                              |
| `setActiveCell`      | `rowKey: string \| null, colKey: string \| null` | `void`                                                      | 标记激活态（当前单元格描边），`null` 清除 |
| `getActiveCell`      | —                                              | `{ rowKey, colKey } \| null \| undefined`                     | 当前激活的单元格                      |
| `toggleExpand`       | `rowKey: string`                               | `void`                                                        | 切换展开行                            |
| `toggleFold`         | `rowKey: string`                               | `void`                                                        | 切换树/分组折叠                       |
| `expandAll`          | —                                              | `void`                                                        | 全部展开                              |
| `collapseAll`        | —                                              | `void`                                                        | 全部折叠                              |
| `setColumnFilter`    | `key: string, vals: unknown[]`                 | `void`                                                        | 设置列筛选                            |
| `clearAllFilters`    | —                                              | `void`                                                        | 清除筛选                              |
| `getActiveFilters`   | —                                              | `Record<string, unknown[]> \| undefined`                      | 获取当前筛选                          |
| `getCellSelection`   | —                                              | `{ startRow, startCol, endRow, endCol } \| null \| undefined` | 获取框选区域                          |
| `clearCellSelection` | —                                              | `void`                                                        | 清除框选                              |
| `getLeafColumns`     | —                                              | `ReactTableColumn[] \| undefined`                            | 全量叶子列（含隐藏）                  |
| `getHeaderDepth`     | —                                              | `number \| undefined`                                         | 表头行数（= 列树深度）                |
| `hideContextMenu`    | —                                              | `void`                                                        | 隐藏右键菜单（`vtContextMenu` 插件注入，ref 自动透传）|
| `reload`             | —                                              | `void`                                                        | 清空并重新取第一批                    |
| `refresh`            | —                                              | `void`                                                        | 重拉已加载区间，保留滚动位置          |
| `loadMore`           | —                                              | `void`                                                        | 手动加载下一批                        |
| `loadPrev`           | —                                              | `void`                                                        | 手动加载更早一批                      |
| `retryLoad`          | —                                              | `void`                                                        | 重试上次失败的请求                    |
| `getRemoteState`     | —                                              | `RemoteState \| null \| undefined`                            | 远程状态快照                          |
| `setLoadData`        | `loadData`                                     | `void`                                                        | 运行时替换取数实现                    |
| `appendRows`         | `rows`                                         | `void`                                                        | 手动追加数据                          |
| `prependRows`        | `rows`                                         | `void`                                                        | 手动前插数据（含滚动补偿）            |
| `setHasMore`         | `hasMore: boolean, dir?: 'down' \| 'up'`       | `void`                                                        | 手动控制触发闸门                      |
| `setCursor`          | `cursor: string \| null, dir?: 'down' \| 'up'` | `void`                                                        | 手动推进游标                          |
| `loadChildrenFor`    | `rowKey: string`                               | `void`                                                        | 主动取某树节点的子节点                          |
| `resetLazyNode`      | `rowKey: string, clearChildren?: boolean`      | `void`                                                        | 清缓存，下次展开重取                            |
