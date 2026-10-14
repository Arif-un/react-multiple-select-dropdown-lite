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
    title: string
    childs: ReadonlyArray<T | MultiSelectGroup<T>>
    /** shown when `childs` is empty */
    emptyDataLabel?: string
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
    /** clears the value when it turns true */
    clearAll?: boolean
    downArrow?: boolean
    downArrowIcon?: React.ReactNode
    closeIcon?: React.ReactNode
    className?: string
    placeholder?: string
    disableChip?: boolean
    /** with `disableChip`, shown after the count: "2 Item Selected" */
    chipAlternateText?: string
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
    style?: React.CSSProperties
    /**
     * spread onto the wrapper div, which then sets its own onClick, onKeyDown (after calling yours), tabIndex, style and className,
     * plus the combobox role and aria attributes when there is no search field.
     * `aria-label` / `aria-labelledby` are also copied to the search field, which is the combobox otherwise
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attr?: React.HTMLAttributes<HTMLDivElement> & { [key: string]: any }
    /** render options only while the menu is open */
    largeData?: boolean
    disabled?: boolean
    /** max selected values, `null` for no limit. The wrapper gets `msl-limit-reached` once hit */
    limit?: number | null
    emptyDataLabel?: string
    /** create options by typing and pressing Enter or comma */
    customValue?: C
    /** close the menu after picking an option. Unset: closes with `singleSelect`, stays open otherwise */
    closeOnSelect?: boolean
    disableSearch?: boolean
    onMenuOpen?: () => void
    onMenuClose?: () => void
    /** after the clear button empties the value (not for `clearAll`) */
    onClear?: () => void
    /** @deprecated no effect since v2.0.1, set the `--input-width` CSS variable instead */
    width?: unknown
  }
}

export = MultiSelect
