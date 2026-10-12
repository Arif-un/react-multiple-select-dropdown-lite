// Public types, shipped as dist/index.d.ts (copied by vite.config.mjs).
// Hand-written because dist/index.js is `module.exports = MultiSelect`, which only `export =` describes.
// Sticks to TS 3.x syntax and React types that exist since @types/react 16.9.
import * as React from 'react'

declare const MultiSelect: {
  (props: MultiSelect.MultiSelectProps): React.ReactElement
}

declare namespace MultiSelect {
  interface MultiSelectOption {
    /** a JSX label also needs `title`, which search and chips use */
    label: string | React.ReactElement
    value: string
    title?: string
    disabled?: boolean
    style?: React.CSSProperties
    /** extra class names */
    classes?: string
    /** your own fields ride along, e.g. to read back with `jsonValue` */
    // any, not unknown: interfaces get no implicit index signature, so unknown would reject them
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }

  interface MultiSelectGroup {
    /** always 'group'; typed string so groups kept in variables (where TS widens it) still compile */
    type: string
    title: string
    childs: ReadonlyArray<MultiSelectOption | MultiSelectGroup>
    /** shown when `childs` is empty */
    emptyDataLabel?: string
  }

  type MultiSelectValue =
    | string
    | ReadonlyArray<
        | string
        | {
            value: string
            label?: string | React.ReactElement
            title?: string
          }
      >

  interface MultiSelectBaseProps {
    options?: ReadonlyArray<MultiSelectOption | MultiSelectGroup>
    /**
     * comma separated values, or an array of values / option-like objects.
     * With `customValue`, values not found in `options` are added under Custom Values.
     * Follows later changes until the user picks something; use `value` to keep it in sync
     */
    defaultValue?: MultiSelectValue
    /** controlled selection, in the same forms as `defaultValue`: update it from `onChange` */
    value?: MultiSelectValue
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
    /** name of the hidden input, for forms */
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
    customValue?: boolean
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

  interface MultiSelectStringProps extends MultiSelectBaseProps {
    jsonValue?: false
    /** selected values joined by commas */
    onChange?: (value: string) => void
  }

  interface MultiSelectJsonProps extends MultiSelectBaseProps {
    jsonValue: true
    /** selected options */
    onChange?: (value: MultiSelectOption[]) => void
  }

  /** wrappers that Omit props should Omit from one mode's props: Omit over this union merges the two onChange types */
  type MultiSelectProps = MultiSelectStringProps | MultiSelectJsonProps
}

export = MultiSelect
