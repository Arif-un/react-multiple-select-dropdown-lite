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
    style?: React.CSSProperties
    /** extra class names */
    classes?: string
    /** your own fields ride along, e.g. to read back from `onChange`'s options */
    // any, not unknown: interfaces get no implicit index signature, so unknown would reject them
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }

  interface MultiSelectGroup<T = MultiSelectOption> {
    /** always 'group'; typed string so groups kept in variables (where TS widens it) still compile */
    type: string
    title: React.ReactNode
    childs: ReadonlyArray<T | MultiSelectGroup<T>>
    /** shown when `childs` is empty */
    emptyDataLabel?: React.ReactNode
  }

  /**
   * classes per element, added after its `msl-*` class: style every part with Tailwind or other utility CSS.
   * State is in attributes: options have `aria-selected`, `aria-disabled` and `data-focused` (the keyboard highlight),
   * the open control `data-open` and, opening upward, `data-up`, the wrapper `data-disabled`
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
    /** `msl-chip`, default chips only */
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
    /** `msl-grp`: a group's `role="group"` box, its title and childs */
    group?: string
    /** `msl-grp-title` */
    groupTitle?: string
    /** `msl-option` */
    option?: string
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
    /** the select's `classNames` (`{}` when unset) */
    classNames: MultiSelectClassNames
    /** removes this value; does nothing while disabled */
    onDelete: () => void
  }

  interface MultiSelectProps<
    T = MultiSelectOption,
    C extends boolean = boolean
  > {
    /** any shape T, read by `getLabel` and `getValue`; its `disabled`, `style`, `classes` and `type` keep their meaning */
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
    /** Backspace in the empty search field removes the last chip. Default: `true`; `false` leaves the chip delete buttons */
    deleteOnBackspace?: boolean
    onMenuOpen?: () => void
    onMenuClose?: () => void
    /** after the clear button empties the value */
    onClear?: () => void
  }
}

export = MultiSelect
