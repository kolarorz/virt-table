# virt-table — Virtualized Data Grid for React, Vue and JavaScript

English · [简体中文](./README.md)

A data grid with row and column virtualization, merged cells, pinned rows and columns, and editing. React and Vue bindings share a framework-independent implementation.

**[Live large-table demos](https://kolarorz.github.io/virt-table/)** · [Merged cells](https://kolarorz.github.io/virt-table/vanilla/examples/merge/auto-merge) · [Business examples](https://kolarorz.github.io/virt-table/demos/)

The documentation site is currently in Chinese; this page provides an English starting point.

## Capabilities

- Row and column virtualization with dynamic row heights.
- Body, header and footer cell merging, including value-based merging.
- Pinned rows and columns, grouped headers and footers.
- Sorting, filtering, trees, grouping and pagination.
- Cell editing and validation, selection and column resizing.
- Optional plugins, built-in cell components, themes and localization.

Use it when you need a complete business table. For general lists, trees, grids or streaming chat, see [virt-list](https://github.com/kolarorz/virt-list). For Vue lists with native scrolling, see [vue-virt-list](https://github.com/kolarorz/vue-virt-list).

## Install

Choose the package matching your application:

```sh
npm install @virt-table/vanilla  # vanilla JavaScript
npm install @virt-table/react    # React 18+
npm install @virt-table/vue      # Vue 3
```

The framework bindings declare `@virt-table/vanilla` as a peer dependency. Ensure your package manager installs it; core styles and plugins are imported from that package.

## Vanilla JavaScript quick start

Create a container with an explicit height:

```html
<div id="table" style="width: 100%; height: 400px"></div>
```

```ts
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import '@virt-table/vanilla/core.css';

const list = Array.from({ length: 10000 }, (_, id) => ({
  id,
  name: `User ${id}`,
  age: 20 + (id % 40),
}));

const columns: VirtTableColumn[] = [
  { key: 'name', title: 'Name', width: 200 },
  { key: 'age', title: 'Age', width: 100 },
];

const table = new VirtTable(document.getElementById('table')!, {
  list,
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
});
```

See [React setup](https://kolarorz.github.io/virt-table/react/guide/started), [Vue setup](https://kolarorz.github.io/virt-table/vue/guide/started) and [package entry points](https://kolarorz.github.io/virt-table/vanilla/guide/notes).

## Open source and enterprise

The `@virt-table/*` core is [MIT-licensed](./LICENSE). Enterprise plugins under `@virt-table-pro/*` are licensed separately. Business demos may include enterprise features; review the [capability and licensing guide](https://kolarorz.github.io/virt-table/enterprise/) before choosing a demo as your starting point.

## Development

```sh
pnpm install
pnpm dev
pnpm test
```

[Contributing](./contributing/README.md) · [Changelog](./CHANGELOG.md) · [Report an issue](https://github.com/kolarorz/virt-table/issues)

If the project helps you, a GitHub star helps others discover it. Bug reports and reproducible examples are welcome.
