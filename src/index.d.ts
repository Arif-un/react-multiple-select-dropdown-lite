// Public types, shipped as dist/index.d.ts (copied by vite.config.mjs).
// Hand-written because dist/index.js is `module.exports = MultiSelect`, which only `export =` describes.
// Written against the React 18 types.
import * as React from 'react'

// T: the option shape, inferred from `options`. A shape without a string label or value requires
// getLabel or getValue: the defaults would read undefined. [T]: a union of shapes is checked as a whole.
// C: `customValue`, false when unset, so onChange's options hold created values only when it can be on
declare const MultiSelect: {
  <T = MultiSelect.MultiSelectOption, C extends boolean = false>(
    props: MultiSelect.MultiSelectProps<T, C> &
      ([T] extends [{ label: string }]
        ? unknown
        : { getLabel: (option: T) => React.ReactNode }) &
      ([T] extends [{ value: string }]
        ? unknown
        : { getValue: (option: T) => string })
  ): React.ReactElement
  // React.ComponentProps, memo and HOCs read the last signature: from the generic one they get T = unknown
  (props: MultiSelect.MultiSelectProps): React.ReactElement
}

declare namespace MultiSelect {
  interface MultiSelectOption {
    /** shown, searched and the `title` tooltip, unless `getLabel` says otherwise */
    label: string
    value: string
    disabled?: boolean
    /**
     * selected, it stays: its chip has no delete button (`data-fixed` on default chips), and Backspace, the clear button
     * and the menu skip it, where it shows `aria-disabled`. In single select it locks the value: the other options are
     * disabled, picking one only calls `onChange`, the value unchanged, and the combobox has `aria-readonly`.
     * Unselected, it can still be picked
     */
    fixed?: boolean
    style?: React.CSSProperties
    /** extra class names */
    classes?: string
    /** your own fields ride along, e.g. to read back from `onChange`'s options */
    // any, not unknown: interfaces get no implicit index signature, so unknown would reject them
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }

  interface MultiSelectGroup<T = MultiSelectOption> {
    /**
     * `'group'`: `childs` listed under `title`. `'submenu'`: `title` is a row that opens `childs` in a popover beside it,
     * on hover, click, Enter or Right Arrow. Submenus nest. Typed string so groups kept in variables (where TS widens it) still compile
     */
    type: string
    title: React.ReactNode
    childs: ReadonlyArray<T | MultiSelectGroup<T>>
    /** shown when `childs` is empty */
    emptyDataLabel?: React.ReactNode
    /** `'group'` only: the title shows and hides `childs`, on click or Enter */
    collapsible?: boolean
    /** with `collapsible`, `childs` start hidden */
    collapsed?: boolean
  }

  /**
   * classes per element, added after its `msl-*` class: style every part with Tailwind or other utility CSS.
   * State is in attributes: options have `aria-selected`, `aria-disabled` and `data-focused` (the keyboard highlight),
   * submenu titles (options too) and collapsible group titles `aria-expanded` and `data-focused`,
   * the open control `data-open` and, opening upward, `data-up`, the wrapper `data-disabled`, a fixed value's chip `data-fixed`.
   * What closes has `data-closing` until the CSS animations and transitions that starts end: the control,
   * still `data-open`, a closed submenu's inert copy, and the inert copy of a collapsed group's rows
   */
  interface MultiSelectClassNames {
    /**
     * `msl`: the box with the values, the search field and the buttons. Open, it holds the options too, after them
     * (before, with `data-up`), in the top layer over the wrapper
     */
    control?: string
    /** `msl-input-wrp`: chips, single value and search field */
    values?: string
    /** `msl-input`: the search field, or the placeholder when there is none */
    input?: string
    /** `msl-search`: the box around the search field with `searchInMenu`, atop the options */
    search?: string
    /** `msl-single-value`: the value with `singleSelect`, or the count with `disableChip` */
    singleValue?: string
    /** `msl-chip`, default chips only. A `fixed` value's has `data-fixed` and no delete button */
    chip?: string
    /** `msl-chip-delete`, default chips only */
    chipDelete?: string
    /** `msl-actions`: the clear and arrow buttons */
    actions?: string
    /** `msl-clear-btn` */
    clearButton?: string
    /** `msl-arrow-btn` */
    arrowButton?: string
    /** `msl-options`: the listbox. Its height is up to you: it gets `--msl-menu-room`, the room the viewport leaves */
    menu?: string
    /** `msl-grp`: a group's `role="group"` box, its title and childs. With `renderList`, a box around each of its rows */
    group?: string
    /** `msl-grp-title`. A collapsible group's has `aria-expanded` */
    groupTitle?: string
    /** `msl-expand-icn` in a collapsible group's title, around `groupIcon` */
    groupIcon?: string
    /**
     * `msl-grp-body`: a collapsible group's childs, after its title, in one inner `<div>`: a grid row of that
     * from `0fr` to `1fr` animates the height. Collapsing, an inert copy with `data-closing` takes its place. Not with `renderList`
     */
    groupBody?: string
    /** `msl-option`, and a submenu's title, which has `aria-expanded` */
    option?: string
    /** `msl-expand-icn` in a submenu's title, around `submenuIcon` */
    submenuIcon?: string
    /**
     * `msl-submenu`: a submenu's `role="group"` box, a popover in the top layer. The stylesheet places it beside its title
     * with CSS anchor positioning (the title is its `position-anchor`), flipping to the other side where there is no room
     */
    submenu?: string
    /** `emptyDataLabel`, and an empty group's */
    empty?: string
  }

  interface MultiSelectChipProps<
    T = MultiSelectOption,
    C extends boolean = boolean
  > {
    /** what `getLabel` returns for the option */
    label: React.ReactNode
    value: string
    /** a created value's option is `{ label: value, value }` */
    option:
      | T
      | ([C] extends [false]
          ? never
          : Exclude<{ label: string; value: string }, T>)
    /** the select is disabled: take delete buttons out of the tab order */
    disabled: boolean
    /** the option is `fixed`: render no delete button */
    fixed: boolean
    /** the select's `classNames` (`{}` when unset) */
    classNames: MultiSelectClassNames
    /** removes this value; does nothing while disabled or fixed */
    onDelete: () => void
  }

  /** what `renderGroupTitle` gets for a group's or a submenu's title */
  interface MultiSelectGroupTitleProps<
    T = MultiSelectOption,
    C extends boolean = boolean
  > {
    /** the group or submenu as in `options`; `customValue`'s group of created values too, whose options are `{ label, value }` */
    group: MultiSelectGroup<
      | T
      | ([C] extends [false]
          ? never
          : Exclude<{ label: string; value: string }, T>)
    >
    /** its `title` */
    title: React.ReactNode
    /** the options in it, those in nested groups and submenus too, disabled ones included */
    total: number
    /** how many of those are selected */
    selected: number
    /** a collapsible group shows its childs, a submenu is open. Always `true` for a plain group */
    open: boolean
    /**
     * the `msl-expand-icn` span with `groupIcon` or `submenuIcon` in it: place it, or leave it out. The stylesheet's
     * `margin-inline-start: auto` holds it at the end of the row. `null` for a plain group
     */
    icon: React.ReactNode
  }

  /** what `renderList` gets: the rows of the open menu, or of an open submenu, for a virtual list library to render */
  interface MultiSelectListProps {
    /** how many rows: options and the titles of groups and submenus (and an empty group's label), groups flattened */
    count: number
    /**
     * renders row `index`, in a `display: contents` box. Rows in a group come in a `msl-grp` box per group in that, so they
     * indent as in the group, but no `role="group"` holds them. Nothing for an index past the end
     */
    row: (index: number) => React.ReactNode
    /** the keyboard highlight's row, -1 for none or one in another list: scroll it into view as it moves (arrow keys, Home, End) */
    activeIndex: number
  }

  interface MultiSelectProps<
    T = MultiSelectOption,
    C extends boolean = boolean
  > {
    /** any shape T, read by `getLabel` and `getValue`; its `disabled`, `fixed`, `style`, `classes` and `type` keep their meaning */
    options?: ReadonlyArray<T | MultiSelectGroup<T>>
    /**
     * initial selection, as option values. Later changes are ignored: use `value`, or a new `key` to reset.
     * Values missing from `options` show once options have them, or under Custom Values with `customValue`
     */
    defaultValue?: readonly string[]
    /** controlled selection, as option values: update it from `onChange` */
    value?: readonly string[]
    /** the selected values and their options; a created value's option is `{ label: value, value }` */
    onChange?: (
      values: string[],
      // with customValue, a T that can't hold a created option must be narrowed
      options: Array<
        | T
        | ([C] extends [false]
            ? never
            : Exclude<{ label: string; value: string }, T>)
      >
    ) => void
    /**
     * what an option shows in the menu, chips and single value. Default: its `label`.
     * Search and the tooltip use it when it returns text, else the option's `label`.
     * Not called for values created by `customValue`
     */
    getLabel?: (option: T) => React.ReactNode
    /** an option's value, as in `value`, `defaultValue` and `onChange`. Default: its `value`. Not called for created values */
    getValue?: (option: T) => string
    /**
     * whether an option matches the search text (trimmed, commas removed). Default: its label text or value contains it,
     * ignoring case. Not called for created values
     */
    filterOption?: (option: T, search: string) => boolean
    singleSelect?: boolean
    clearable?: boolean
    downArrow?: boolean
    downArrowIcon?: React.ReactNode
    closeIcon?: React.ReactNode
    /**
     * after a collapsible group's title, in `msl-expand-icn` (`aria-hidden`). Draw it pointing to the inline end: the
     * stylesheet turns it down while the group is open, and to the left right to left. In a `<bdo dir="ltr">`, so the
     * browser doesn't mirror a text arrow such as `›` as well. Default: the arrow button's chevron, `msl-chevron-icn`
     */
    groupIcon?: React.ReactNode
    /** after a submenu's title, in `msl-expand-icn` (`aria-hidden`), pointing to the inline end. Default: the arrow button's chevron, `msl-chevron-icn` */
    submenuIcon?: React.ReactNode
    /** on the wrapper */
    className?: string
    /** classes for each element inside, e.g. Tailwind utilities */
    classNames?: MultiSelectClassNames
    placeholder?: string
    disableChip?: boolean
    /** with `disableChip`, shown after the count: "2 Item Selected" */
    chipAlternateText?: React.ReactNode
    /**
     * renders each chip; a render function, not a component, so no hooks in it: render a component that has them,
     * `(p) => <MyChip key={p.value} {...p} />`. Chips are keyed by position: `key={p.value}` resets a chip's state when
     * its value moves, instead of handing it to the next value. Clicks and keys inside it don't open the menu.
     * Default: the `msl-chip` markup
     */
    // $$typeof: memo / forwardRef components type as callable but are objects
    customChip?: ((props: MultiSelectChipProps<T, C>) => React.ReactNode) & {
      $$typeof?: never
    }
    /** name of the hidden input, for forms: it holds the selected values joined by commas */
    name?: string
    /** on the wrapper. While the menu is open, it gets the control's height as an inline `min-height` */
    style?: React.CSSProperties
    /**
     * spread onto the wrapper div, which then sets its own onClick, onKeyDown (after calling yours), tabIndex, style, className and data-disabled,
     * plus the combobox role and aria attributes when there is no search field.
     * Its `aria-*` attributes are also copied to the search field, which is the combobox otherwise
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attr?: React.HTMLAttributes<HTMLDivElement> & { [key: string]: any }
    disabled?: boolean
    /**
     * max selected values in multi select, `null` for no limit. The wrapper gets `msl-limit-reached` once hit,
     * and unselected options `aria-disabled` and `msl-option-disable`; picking one only calls `onChange`, the value unchanged
     */
    limit?: number | null
    /** shown when there are no options or no search results */
    emptyDataLabel?: React.ReactNode
    /** create options by typing and pressing Enter or comma */
    customValue?: C
    /** the label of the option that creates the typed text. Default: `Create "text"` */
    createLabel?: (text: string) => string
    /** title of the group listing created values. Default: `'Custom Values'` */
    customValuesTitle?: React.ReactNode
    /** the clear button's `aria-label`. Default: `'Clear'` */
    clearLabel?: string
    /** close the menu after picking an option. Unset: closes with `singleSelect`, stays open otherwise */
    closeOnSelect?: boolean
    disableSearch?: boolean
    /**
     * the search field heads the open menu instead of following the values: the closed control shows only
     * the values, or `placeholder`. Single select and `disableChip` can then search with a value selected
     */
    searchInMenu?: boolean
    /** the search field's placeholder with `searchInMenu`. Default: `'Search...'` */
    searchPlaceholder?: string
    /** Backspace in the empty search field removes the last chip that isn't `fixed`. Default: `true`; `false` leaves the chip delete buttons */
    deleteOnBackspace?: boolean
    /**
     * renders the open list's rows yourself, e.g. through the virtual list library of your choice for long lists:
     * `(list) => <MyVirtualList {...list} />`. A render function, not a component, so no hooks in it. What it returns goes in
     * the listbox (`msl-options`, then with `data-custom`), which the stylesheet makes a flex column: a scroller in it
     * shrinks to the menu's height. An open submenu's rows go through it too, in its popover after its title (`msl-submenu`,
     * also with `data-custom`, and as wide as `--msl-input-width`). Not called while `emptyDataLabel` shows
     */
    renderList?: (list: MultiSelectListProps) => React.ReactNode
    /**
     * renders a group's or a submenu's title row, in place of its `title` and the icon after it:
     * `({ title, total, icon }) => <>{title} ({total}){icon}</>`. A render function, not a component, so no hooks in it.
     * The row keeps its `msl-grp-title` or `msl-option` box and attributes
     */
    renderGroupTitle?: (
      props: MultiSelectGroupTitleProps<T, C>
    ) => React.ReactNode
    onMenuOpen?: () => void
    onMenuClose?: () => void
    /** after the clear button empties the value, but for `fixed` values. It shows only while there is one to remove */
    onClear?: () => void
  }
}

export = MultiSelect
