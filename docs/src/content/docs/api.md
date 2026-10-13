---
title: API
description: Props, events and types of react-multiple-select-dropdown-lite.
---

## Props

| Prop                | Type                                        | Default           | Description                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`           | `(MultiSelectOption \| MultiSelectGroup)[]` | an "Empty" option | Options and [groups](../examples/#groups).                                                                                                                                                                                   |
| `defaultValue`      | `string[]`                                  |                   | Initial selection, as option values. Resolves once `options` load; later changes are ignored (use `value`, or a new `key` to reset). Values not in `options` are left out, or listed under Custom Values with `customValue`. |
| `value`             | `string[]`                                  |                   | Controlled selection, as option values. Update it from `onChange`.                                                                                                                                                           |
| `onChange`          | `(values, options) => void`                 |                   | Called after every change with the selected values (`string[]`) and their option objects (`MultiSelectOption[]`). A created value's option is `{ label: value, value }`.                                                     |
| `singleSelect`      | `boolean`                                   | `false`           | Allow one value only.                                                                                                                                                                                                        |
| `customValue`       | `boolean`                                   | `false`           | Create options by typing and pressing Enter or comma.                                                                                                                                                                        |
| `limit`             | `number \| null`                            | `null`            | Maximum number of values. The wrapper gets `msl-limit-reached` once it is hit.                                                                                                                                               |
| `closeOnSelect`     | `boolean`                                   | unset             | Close the menu after a pick. Unset: single select closes, multi select stays open.                                                                                                                                           |
| `placeholder`       | `string`                                    | `'Select...'`     | Placeholder text.                                                                                                                                                                                                            |
| `disableChip`       | `boolean`                                   | `false`           | Show one label, or a count, instead of chips.                                                                                                                                                                                |
| `chipAlternateText` | `string`                                    | `'Item Selected'` | Text after the count with `disableChip`: "3 Item Selected".                                                                                                                                                                  |
| `disableSearch`     | `boolean`                                   | `false`           | Hide the search input.                                                                                                                                                                                                       |
| `clearable`         | `boolean`                                   | `true`            | Show the clear button.                                                                                                                                                                                                       |
| `clearAll`          | `boolean`                                   | `false`           | Clears the value when it turns `true`.                                                                                                                                                                                       |
| `downArrow`         | `boolean`                                   | `true`            | Show the down arrow.                                                                                                                                                                                                         |
| `downArrowIcon`     | `ReactNode`                                 | SVG               | Custom down arrow.                                                                                                                                                                                                           |
| `closeIcon`         | `ReactNode`                                 | SVG               | Custom clear icon.                                                                                                                                                                                                           |
| `disabled`          | `boolean`                                   | `false`           | Disable the dropdown.                                                                                                                                                                                                        |
| `emptyDataLabel`    | `string`                                    | `'No Data Found'` | Shown when there are no options or no search results.                                                                                                                                                                        |
| `largeData`         | `boolean`                                   | `false`           | Render options only while the menu is open.                                                                                                                                                                                  |
| `name`              | `string`                                    | `''`              | Name of the hidden input, for forms. Its value is the comma joined selection.                                                                                                                                                |
| `className`         | `string`                                    |                   | Extra class on the wrapper.                                                                                                                                                                                                  |
| `style`             | `CSSProperties`                             | `{}`              | Inline style on the wrapper.                                                                                                                                                                                                 |
| `attr`              | `HTMLAttributes`                            |                   | Props for the wrapper div, such as `id` or `data-*`. `aria-label` / `aria-labelledby` name the dropdown for [screen readers](../accessibility/).                                                                             |

## Events

| Prop          | Called                                                    |
| ------------- | --------------------------------------------------------- |
| `onChange`    | after any change, with the new values and their options   |
| `onMenuOpen`  | when the menu opens                                       |
| `onMenuClose` | when the menu closes (outside click, Escape, Tab, a pick) |
| `onClear`     | after the clear button empties the value (not `clearAll`) |

## Types

```ts
interface MultiSelectOption {
  label: string | React.ReactElement // a JSX label also needs `title`
  value: string
  title?: string
  disabled?: boolean
  style?: React.CSSProperties
  classes?: string // extra class names
  [key: string]: any // your own fields, returned in onChange's options
}

interface MultiSelectGroup {
  type: 'group'
  title: string
  childs: (MultiSelectOption | MultiSelectGroup)[]
  emptyDataLabel?: string // shown when childs is empty
}
```
