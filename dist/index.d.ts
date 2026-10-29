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
        : {
            getLabel: (
              option: T,
              meta: MultiSelect.MultiSelectLabelMeta
            ) => React.ReactNode
          }) &
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
    /**
     * or a loader, as for `loadOptions`: it loads them the first time they show (the group's title opens it, a submenu
     * opens, a plain group's menu opens), and the next part as their end scrolls into view. Its `search` is the search
     * text for groups in what `loadOptions` loaded or in `options` with `onSearch`, else `''`. `renderGroupTitle` then gets a copy of the
     * group, `childs` the options loaded so far, as it does of a group around it
     */
    childs: ReadonlyArray<T | MultiSelectGroup<T>> | MultiSelectLoader<T>
    /** shown when `childs` is empty */
    emptyDataLabel?: React.ReactNode
    /**
     * at the top of its rows: of a submenu's popover, a collapsible group's body, a plain group's rows after its
     * title. Not an option: no role, as `emptyDataLabel`, and the highlight passes it. Text, not controls, as it is
     * in the listbox: those go in `menuHeader` and `menuFooter`. A row with `renderList`
     */
    header?: React.ReactNode
    /** as `header`, at the bottom of its rows */
    footer?: React.ReactNode
    /** `'group'` only: the title shows and hides `childs`, on click or Enter */
    collapsible?: boolean
    /** with `collapsible`, `childs` start hidden */
    collapsed?: boolean
    /**
     * on its title row, as an option's on its row. The rest of it from there: `.msl-grp:has(> .vip)` a group's box,
     * `.vip + .msl-grp-body` a collapsible group's rows, `.vip + .msl-submenu` a submenu's popover
     */
    style?: React.CSSProperties
    /** extra class names, on its title row */
    classes?: string
    /** as the dropdown's `loading`, for an array of `childs` you load */
    loading?: boolean
    /** as the dropdown's `onLoadMore`, for an array of `childs`: called as their end shows, or on a click with `loadMoreLabel` */
    onLoadMore?: () => void
    /** as the dropdown's `loadError`, for an array of `childs` */
    loadError?: unknown
    /** as the dropdown's `loadMoreLabel`, for this group's `childs`, loaded or a loader's. Default: the dropdown's */
    loadMoreLabel?: React.ReactNode
    /** your own fields ride along, e.g. an icon to read back in `renderGroupTitle` */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }

  /**
   * classes per element, added after its `msl-*` class: style every part with Tailwind or other utility CSS.
   * State is in attributes: options have `aria-selected`, `aria-disabled` and `data-focused` (the keyboard highlight),
   * submenu titles (options too) and collapsible group titles `aria-expanded` and `data-focused`,
   * the open control `data-open` and, opening upward, `data-up`, the wrapper `data-disabled` and, while a list loads, `data-loading`, a fixed value's chip `data-fixed`.
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
    /** `msl-chip`, default chips only. A `fixed` value's has `data-fixed` and no delete button, as `maxChips`' chip of the rest, with `data-more` */
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
    /**
     * `msl-loading`: the row at the end of a list while it loads or has more to load (`loadingLabel`), with more and a
     * `loadMoreLabel` a button (`data-more`, also `msl-option`), or after it failed (`errorLabel`, with `data-error`)
     */
    loading?: string
    /** `msl-menu-header`: `menuHeader`'s box, in the open box before the listbox */
    menuHeader?: string
    /** `msl-menu-footer`: `menuFooter`'s box, in the open box after the listbox */
    menuFooter?: string
    /** `msl-grp-header`: a group's `header`, also `msl-option msl-option-disable` like an empty group's label */
    groupHeader?: string
    /** `msl-grp-footer`: a group's `footer`, as `groupHeader` */
    groupFooter?: string
    /** `msl-select-all`: `selectAll`'s row, also `msl-option` */
    selectAll?: string
  }

  /** what a loader gets */
  interface MultiSelectLoadRequest {
    /**
     * the search text, trimmed, commas removed; `''` without one, and for a group outside what `loadOptions` loaded
     * unless in `options` with `onSearch`
     */
    search: string
    /** the `next` the list's last part came with, `undefined` for the first part: a page number, an offset, a cursor */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next?: any
    /**
     * aborts once another search takes its place, the search clears (as the menu closes) or the dropdown unmounts: pass it
     * to `fetch`. To wait for typing to pause, `await` a timeout, then `signal.throwIfAborted()`. A list that only leaves the
     * view (its group or submenu closes, the menu closes) loads on
     */
    signal: AbortSignal
  }

  /** what a loader returns, or resolves to: the options, or with `next` (truthy) there are more, which load as the list's end scrolls into view */
  type MultiSelectLoaded<T = MultiSelectOption> =
    | ReadonlyArray<T | MultiSelectGroup<T>>
    | {
        options: ReadonlyArray<T | MultiSelectGroup<T>>
        next?: unknown
      }

  /** loads a list of options, a part at a time: `loadOptions`, or a group's `childs` */
  type MultiSelectLoader<T = MultiSelectOption> = (
    request: MultiSelectLoadRequest
  ) => MultiSelectLoaded<T> | PromiseLike<MultiSelectLoaded<T>>

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
    /** its place among the selected values, from 0 */
    index: number
    /** how many values are selected, those past `maxChips` too */
    total: number
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
    /**
     * the group or submenu as in `options`; `customValue`'s group of created values too, whose options are `{ label, value }`.
     * One with a loader in it comes as a copy, its loaders' `childs` the options loaded so far
     */
    group: MultiSelectGroup<
      | T
      | ([C] extends [false]
          ? never
          : Exclude<{ label: string; value: string }, T>)
    > & {
      childs: ReadonlyArray<
        | T
        | ([C] extends [false]
            ? never
            : Exclude<{ label: string; value: string }, T>)
        | MultiSelectGroup<
            | T
            | ([C] extends [false]
                ? never
                : Exclude<{ label: string; value: string }, T>)
          >
      >
    }
    /** its `title` */
    title: React.ReactNode
    /**
     * the options in it, those in nested groups and submenus too, disabled ones included, and those `hideSelected` hides.
     * Of a loader's, those loaded
     */
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
    /**
     * selects every enabled option in it, nested ones and those loaded too, up to `limit`, unless none is left to
     * pick: then deselects them but fixed ones. One `onChange`. For a checkbox in a plain group's title: checked when
     * `selected === total`. A collapsible group's or a submenu's title is an option, read as text: no checkbox there
     */
    toggle: () => void
  }

  /** what `menuHeader` and `menuFooter` get as functions: the options the menu lists, and actions on them */
  interface MultiSelectMenuProps<
    T = MultiSelectOption,
    C extends boolean = boolean
  > {
    /** the search text, trimmed, commas removed */
    search: string
    /**
     * the enabled options the menu lists, flat: a search's results, those loaded so far, those in closed groups and
     * submenus too. A created value's option is `{ label: value, value }`
     */
    options: Array<
      | T
      | ([C] extends [false]
          ? never
          : Exclude<{ label: string; value: string }, T>)
    >
    /** how many of them are selected */
    selected: number
    /** selects those of them not selected yet, up to `limit` (one in single select). One `onChange` */
    selectAll: () => void
    /** deselects them but fixed ones. One `onChange` */
    deselectAll: () => void
  }

  /** what `getLabel` gets after the option: where the label shows */
  interface MultiSelectLabelMeta {
    /** `'menu'`: an option's row. `'value'`: a chip (customChip's `label`) or the single value */
    context: 'menu' | 'value'
    /** the search text, trimmed, commas removed, for the menu's rows. `''` for values, and for the text search read */
    search: string
    /** the option is selected: always for values. `false` for the text search read */
    selected: boolean
  }

  /** what `renderList` gets: the rows of the open menu, or of an open submenu, for a virtual list library to render */
  interface MultiSelectListProps {
    /**
     * how many rows: options, the titles of groups and submenus, an empty group's label, a group's header and footer,
     * and a list's end row (loading, failed or load more), groups flattened
     */
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
    /**
     * any shape T, read by `getLabel` and `getValue`; its `disabled`, `fixed`, `style`, `classes` and `type` keep their
     * meaning. With `loadOptions` they are not listed: they name values the loads haven't, such as the selected ones.
     * With `onSearch` they are the search's results
     */
    options?: ReadonlyArray<T | MultiSelectGroup<T>>
    /**
     * loads the menu's options: when it first opens, for each search text (`filterOption` unused), and the next part as
     * the list's end scrolls into view, or the keyboard reaches it. A list loads once, and stays for the life of the
     * dropdown, as do its options for naming values: give it a new `loadKey` to load afresh. A load that throws or
     * rejects (one that returns no options, with a TypeError) shows `errorLabel`, which loads again on a click, the
     * keyboard reaching it, or the list showing again
     */
    loadOptions?: MultiSelectLoader<T>
    /**
     * changed (by `Object.is`), every loaded list goes, loadOptions' and groups' loaders', loads on the way stop, and the
     * lists showing load again. The selection, the open menu and focus stay, and the dropped options keep naming
     * the values picked from them. For a dropdown that depends on another: `loadKey={country}`
     */
    loadKey?: unknown
    /**
     * with `loadOptions`, its first list (search `''`) loads before the menu first opens: on mount, and as `loadKey`
     * changes (`true`), or as the pointer enters or focus arrives (`'intent'`)
     */
    preload?: boolean | 'intent'
    /**
     * px: the next part loads once a list's end is that close to coming into view, for every list in any scroller,
     * `renderList`'s too: a box that far up over the end row is observed. Not with `loadMoreLabel`. Default: `0`
     */
    loadAhead?: number
    /**
     * the search text as it changes, trimmed, commas removed: `''` once cleared (a pick, the menu closing). Your data
     * layer searches: the dropdown filters nothing (`filterOption` unused), `options` are the results, and every search's
     * options keep naming values once it moves on. A group's loader in them gets it as its `search`. With `loadOptions`,
     * it only tells
     */
    onSearch?: (search: string) => void
    /** you are loading `options`: the end row shows `loadingLabel`, the listbox has `aria-busy`. Not with `loadOptions` */
    loading?: boolean
    /**
     * there are more options to load: the end row shows `loadingLabel`, and calls this as it scrolls into view, as the
     * keyboard passes it, or as `loading` ends with it still in view. Never while `loading`: pass that too. Pass this only
     * while there are more. Not with `loadOptions`
     */
    onLoadMore?: () => void
    /**
     * your last load failed, truthy: the error itself (`q.error`), or `true`. The end row shows `errorLabel`, which gets
     * it (`data-error`, unless `loading` again), and calls `onLoadMore` on a click, as the keyboard passes it, or as the
     * menu opens, not as it comes into view. Not with `loadOptions`
     */
    loadError?: unknown
    /** the row at the end of a list while it loads, or has more to load. Default: `'Loading...'` */
    loadingLabel?: React.ReactNode
    /**
     * a list with more to load ends in a button with this label, which loads the next part on a click or as the keyboard
     * passes it, not as it scrolls into view. A loader's first part still loads as the list shows
     */
    loadMoreLabel?: React.ReactNode
    /**
     * the row at the end of a list whose load failed. Or a function of what the load threw or rejected with (a falsy
     * one is `true`), or of `loadError`, and a retry: then the row doesn't load again on a click, your retry button does,
     * while the keyboard passing it and the list showing again still do. Default: `'Failed to load. Retry'`
     */
    errorLabel?:
      | React.ReactNode
      | ((error: unknown, retry: () => void) => React.ReactNode)
    /**
     * initial selection, as option values or the options themselves, which name their values. Later changes are ignored:
     * use `value`, or a new `key` to reset. Values missing from `options` show once options have them, or under Custom
     * Values with `customValue`
     */
    defaultValue?: ReadonlyArray<string | T>
    /**
     * controlled selection, as option values or the options themselves: update it from `onChange`, its values or its
     * options. An option names its value when `options` don't have it, as async ones may not
     */
    value?: ReadonlyArray<string | T>
    /** the selected values and their options; a created value's option is `{ label: value, value }`, or what `onCreate` made */
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
     * what an option shows in the menu, chips and single value, told apart by `meta`: highlight the search in the
     * menu, mark selected rows. Default: its `label`. Search uses its text, as returned for
     * `{ context: 'menu', search: '', selected: false }`, the tooltip the row's label text; either else the option's
     * `label`. Not called for the `{ label, value }` options `customValue` creates
     */
    getLabel?: (option: T, meta: MultiSelectLabelMeta) => React.ReactNode
    /** an option's value, as in `value`, `defaultValue` and `onChange`. Default: its `value`. Not called for created values */
    getValue?: (option: T) => string
    /**
     * whether an option matches the search text (trimmed, commas removed). Default: its label text or value contains it,
     * ignoring case. Not called for created values
     */
    filterOption?: (option: T, search: string) => boolean
    /**
     * selected options leave the menu, and search results: a group, a collapsible group or a submenu with none left
     * goes too, title and all (an empty one stays, with its `emptyDataLabel`). Nothing left shows `emptyDataLabel`,
     * or `selectAll`'s row, selected, which deselects them.
     * A loader's list keeps its end row while it may load more
     */
    hideSelected?: boolean
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
     * chips for the first this many values, then one `msl-chip` with `data-more` and no delete button for the rest,
     * which opens the menu on a click as the control does. The rest stay selected: in `onChange`, the hidden input,
     * Backspace (the last value that isn't `fixed`, shown or not). `customChip` renders the shown ones. Not with `disableChip`
     */
    maxChips?: number
    /** the rest's chip with `maxChips`, from how many values it holds. Default: `(n) => '+' + n` */
    moreChipsLabel?: (hidden: number) => React.ReactNode
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
     * spread onto the wrapper div, which then sets its own onClick, tabIndex, style, className, data-disabled and data-loading,
     * its onKeyDown, onFocus, onPointerEnter and onBlur after calling yours, plus the combobox role and aria attributes when there is no search field.
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
    /** shown when there are no options or no search results. Or a function of the search text: `'Type 2 letters'` */
    emptyDataLabel?: React.ReactNode | ((search: string) => React.ReactNode)
    /** create options by typing and pressing Enter or comma */
    customValue?: C
    /** the label of the option that creates the typed text. Default: `Create "text"` */
    createLabel?: (text: string) => string
    /** with `customValue`, whether the typed text can be created, a valid email say: else no Create, and Enter or a comma creates nothing */
    canCreate?: (text: string) => boolean
    /**
     * with `customValue`, creating calls it in place of making `{ label: text, value: text }`. An option it returns is
     * selected and names its value, a string is selected as the value; both are listed with the created values (once
     * deselected too), until `options` have them. `false` or nothing: nothing is created, the text stays.
     * A promise: meanwhile the Create row shows `loadingLabel`, with `aria-busy` and `aria-disabled`, and the text isn't
     * created twice; what it resolves to is selected then, but over a single select's value picked meanwhile: it is listed.
     * Once it rejects, the row shows `errorLabel` with `data-error`, and creates again
     */
    onCreate?: (
      text: string
    ) =>
      | T
      | string
      | false
      | null
      | undefined
      | PromiseLike<T | string | false | null | undefined>
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
    /**
     * in the open box before the listbox (after a `searchInMenu` field), outside it: buttons, a field, a count. Or a
     * function of the options the menu lists, with `selectAll` and `deselectAll` on them. Its clicks keep focus where it
     * is, but on a form field, and its keys are its own. Not part of the keyboard highlight; Tab reaches what in it is
     * tabbable. `msl-menu-header`
     */
    menuHeader?:
      | React.ReactNode
      | ((menu: MultiSelectMenuProps<T, C>) => React.ReactNode)
    /** as `menuHeader`, after the listbox. `msl-menu-footer` */
    menuFooter?:
      | React.ReactNode
      | ((menu: MultiSelectMenuProps<T, C>) => React.ReactNode)
    /**
     * multi select: a row atop the options, the first the keyboard reaches, with this label (`true`: `'Select all'`).
     * It selects every enabled option the menu lists (a search's results, those loaded so far, in groups too), up to
     * `limit`, or once none is left to pick deselects them but fixed ones: it has `aria-selected` then. Hidden while
     * the menu lists none, but for those `hideSelected` hides. `msl-option msl-select-all`
     */
    selectAll?: React.ReactNode
    /** after the menu opens. With `open`, the dropdown asks to open it: on a click, a key, a search */
    onMenuOpen?: () => void
    /** after the menu closes. With `open`, the dropdown asks to close it: Escape, a click or focus outside, a pick with `closeOnSelect` */
    onMenuClose?: () => void
    /**
     * the menu is open exactly while this is true: set it from `onMenuOpen` and `onMenuClose`, which then only ask.
     * Opened from outside, focus stays where it is; opened from the dropdown, it moves to the search field as ever
     */
    open?: boolean
    /** the search field's text, yours: set it from `onSearchChange`. Searching, `onSearch` and `loadOptions` follow it */
    search?: string
    /**
     * the search field's text as it changes, raw: as typed or pasted (`'input'`), `''` once a pick clears it (`'pick'`)
     * or the menu closes (`'close'`). With `search`, ignore `'pick'` to keep the search after a pick
     */
    onSearchChange?: (text: string, reason: 'input' | 'pick' | 'close') => void
    /** after the clear button empties the value, but for `fixed` values. It shows only while there is one to remove */
    onClear?: () => void
  }
}

export = MultiSelect
