// Characterization tests: they pin the current behavior, quirks included.
// Tests named "current behavior: ..." document known bugs; a fix should update them on purpose.
import { memo, useState } from 'react'
import type { ComponentProps } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { renderToString } from 'react-dom/server'
import { jsx } from 'react/jsx-runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type {
  MultiSelectChipProps,
  MultiSelectOption,
  MultiSelectProps
} from '../src/index'
import MultiSelect from '../src/MultiSelect'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const opts = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' }
]

const grouped = [
  { label: 'Apple', value: 'apple' },
  {
    title: 'Group A',
    type: 'group',
    childs: [
      { label: 'Banana', value: 'banana' },
      {
        title: 'Group B',
        type: 'group',
        childs: [{ label: 'Cherry', value: 'cherry' }]
      }
    ]
  }
]

function setup(props: MultiSelectProps = {}) {
  const onChange = vi.fn()
  const onMenuOpen = vi.fn()
  const onMenuClose = vi.fn()
  const utils = render(
    <MultiSelect
      options={opts}
      onChange={onChange}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
      {...props}
    />
  )
  const c = utils.container
  const q = <E extends Element = HTMLElement>(s: string) =>
    c.querySelector<E>(s)!
  const qa = (s: string) => [...c.querySelectorAll<HTMLElement>(s)]
  return {
    ...utils,
    onChange,
    onMenuOpen,
    onMenuClose,
    q,
    qa,
    root: c.firstChild as HTMLElement,
    input: () => q<HTMLInputElement>('input.msl-input:enabled'),
    chips: () => qa('.msl-chip').map((el) => el.textContent),
    single: () => q('.msl-single-value')?.textContent,
    optionTexts: () =>
      qa('.msl-options .msl-option').map((el) => el.textContent),
    groupTitles: () => qa('.msl-grp-title').map((el) => el.textContent),
    option: (text: string) =>
      qa('.msl-option').find((el) => el.textContent === text)!,
    isOpen: () => /msl-active/.test(q('.msl').className),
    hidden: () => q<HTMLInputElement>('input[type="hidden"]')
  }
}

type Q = ReturnType<typeof setup>['q']

const type = (el: Element, text: string, key = text.slice(-1)) => {
  ;(el as HTMLInputElement).value = text
  fireEvent.keyUp(el, { key })
}
// returns false when the default action was prevented
const press = (el: Element, key = 'Enter', init = {}) =>
  fireEvent.keyDown(el, { key, ...init })
// the values argument of each onChange call
const values = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.calls.map(([v]) => v)

describe('render', () => {
  it('renders with no props at all', () => {
    const { container } = render(<MultiSelect />)
    const q = <E extends Element = HTMLElement>(s: string) =>
      container.querySelector<E>(s)!
    const root = container.firstChild as HTMLElement
    expect([...root.classList]).toEqual(['msl-wrp', 'msl-vars'])
    expect(root.getAttribute('tabindex')).toBe('0')
    expect([...q('.msl').classList]).toEqual(['msl'])
    const hidden = q<HTMLInputElement>('input[type="hidden"]')
    expect(hidden.name).toBe('')
    expect(hidden.value).toBe('')
    const input = q<HTMLInputElement>('.msl-input')
    expect(input.placeholder).toBe('Select...')
    expect(input.disabled).toBe(false)
    expect(input.getAttribute('autocomplete')).toBe('off')
    const empty = q('.msl-option')
    expect(empty.textContent).toBe('Empty')
    expect(empty.className).toContain('msl-option-disable')
    expect(empty.style.textAlign).toBe('center')
    expect(container.querySelector('.msl-arrow-btn')).not.toBeNull()
    expect(container.querySelector('.msl-clear-btn')).toBeNull()
  })

  it('default callbacks are safe no-ops', () => {
    const { container } = render(<MultiSelect options={opts} />)
    const q = (s: string) => container.querySelector(s)!
    fireEvent.click(container.firstChild!)
    fireEvent.click(q('.msl-option'))
    expect(q('.msl-chip').textContent).toBe('Apple')
    fireEvent.click(q('.msl-arrow-btn'))
    fireEvent.click(document.body)
  })

  it('defaults need no defaultProps, which the React 19 jsx runtime ignores', () => {
    expect(
      (MultiSelect as { defaultProps?: object }).defaultProps
    ).toBeUndefined()
    // jsx(), not the classic createElement this file compiles to (that one still applies defaultProps)
    const { container, rerender } = render(jsx(MultiSelect, {}))
    const q = (s: string) => container.querySelector(s)!
    expect(q('.msl-input').getAttribute('placeholder')).toBe('Select...')
    expect(q('.msl-option').textContent).toBe('Empty')
    rerender(jsx(MultiSelect, { options: opts }))
    fireEvent.click(container.firstChild!)
    container.querySelectorAll('.msl-option').forEach((el) => {
      fireEvent.click(el)
    })
    expect(q('input[type="hidden"]').getAttribute('value')).toBe(
      'apple,banana,cherry'
    )
    fireEvent.click(q('.msl-arrow-btn'))
    fireEvent.click(document.body)
  })

  it('applies className, style, attr, name and placeholder', () => {
    const { root, hidden, input } = setup({
      className: 'mine',
      style: { color: 'red' },
      attr: { id: 'ms', 'data-x': '1' },
      name: 'fruits',
      placeholder: 'Pick one'
    })
    expect(root.getAttribute('class')).toBe('msl-wrp msl-vars mine ')
    expect(root.style.color).toBe('red')
    expect(root.id).toBe('ms')
    expect(root.getAttribute('data-x')).toBe('1')
    expect(hidden().name).toBe('fruits')
    expect(input().placeholder).toBe('Pick one')
  })

  it.each([
    [{}, '60px'],
    [{ clearable: false }, '40px'],
    [{ downArrow: false }, '40px'],
    [{ clearable: false, downArrow: false }, '5px']
  ])('input width for %o subtracts %s', (props, px) => {
    const { q } = setup(props)
    expect(q('.msl-input-wrp').style.width).toBe(`calc(100% - ${px})`)
  })

  it('hides the actions area when clearable and downArrow are off', () => {
    const { q } = setup({ clearable: false, downArrow: false })
    expect(q('.msl-actions')).toBeNull()
  })

  it('renders custom icons', () => {
    const { q } = setup({
      defaultValue: ['apple'],
      closeIcon: <i className='my-close' />,
      downArrowIcon: <i className='my-arrow' />
    })
    expect(q('.msl-clear-btn .my-close')).not.toBeNull()
    expect(q('.msl-arrow-btn .my-arrow')).not.toBeNull()
    expect(q('.msl-close-icn')).not.toBeNull() // chip delete keeps default icon
  })

  it('marks options as data-msl only in multi select', () => {
    expect(setup().option('Apple').hasAttribute('data-msl')).toBe(true)
    cleanup()
    expect(
      setup({ singleSelect: true }).option('Apple').hasAttribute('data-msl')
    ).toBe(false)
  })
})

describe('defaultValue', () => {
  it('selects the values in the given order', () => {
    const { chips, hidden, onChange } = setup({
      defaultValue: ['cherry', 'apple']
    })
    expect(chips()).toEqual(['Cherry', 'Apple'])
    expect(hidden().value).toBe('cherry,apple')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('drops unknown values without customValue', () => {
    const { chips, hidden, option, onChange } = setup({
      defaultValue: ['apple', 'zzz']
    })
    expect(chips()).toEqual(['Apple'])
    expect(hidden().value).toBe('apple')
    fireEvent.click(option('Banana'))
    expect(values(onChange)).toEqual([['apple', 'banana']])
  })

  it('creates a Custom Values group for unknown values with customValue', () => {
    const { chips, groupTitles, optionTexts, onChange, option } = setup({
      defaultValue: ['apple', 'zzz'],
      customValue: true
    })
    expect(chips()).toEqual(['Apple', 'zzz'])
    expect(groupTitles()).toEqual(['Custom Values'])
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'zzz'])
    fireEvent.click(option('Banana'))
    expect(onChange).toHaveBeenLastCalledWith(
      ['apple', 'zzz', 'banana'],
      [opts[0], { label: 'zzz', value: 'zzz' }, opts[1]]
    )
  })

  it('keeps only the first value in singleSelect', () => {
    const { single, chips, q } = setup({
      defaultValue: ['banana', 'apple'],
      singleSelect: true
    })
    expect(single()).toBe('Banana')
    expect(chips()).toEqual([])
    expect(q('.msl-input')).toBeNull()
  })

  it('ignores later changes, like an uncontrolled input; a new key resets', () => {
    const { rerender, chips, onChange } = setup({ defaultValue: ['apple'] })
    rerender(
      <MultiSelect
        options={opts}
        onChange={onChange}
        defaultValue={['banana', 'cherry']}
      />
    )
    expect(chips()).toEqual(['Apple'])
    rerender(
      <MultiSelect
        key='reset'
        options={opts}
        onChange={onChange}
        defaultValue={['banana', 'cherry']}
      />
    )
    expect(chips()).toEqual(['Banana', 'Cherry'])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('resolves once options arrive after mount (#12)', () => {
    const { rerender, chips, onChange } = setup({
      options: [],
      defaultValue: ['banana']
    })
    expect(chips()).toEqual([])
    rerender(
      <MultiSelect options={opts} onChange={onChange} defaultValue={['x']} />
    )
    expect(chips()).toEqual(['Banana'])
    expect(onChange).not.toHaveBeenCalled()
    cleanup()
    const { rerender: rerenderSingle, single } = setup({
      options: [],
      defaultValue: ['zzz', 'apple', 'cherry'],
      singleSelect: true
    })
    rerenderSingle(
      <MultiSelect options={opts} defaultValue={[]} singleSelect />
    )
    expect(single()).toBe('Apple')
  })

  it('keeps user changes when options get a new array', () => {
    const { rerender, option, chips, onChange } = setup({
      defaultValue: ['apple']
    })
    fireEvent.click(option('Banana'))
    rerender(
      <MultiSelect
        options={[...opts]}
        onChange={onChange}
        defaultValue={['apple']}
      />
    )
    expect(chips()).toEqual(['Apple', 'Banana'])
  })

  it('renders chips through getLabel', () => {
    const { q } = setup({
      defaultValue: ['apple'],
      getLabel: (opt) => <b>{opt.label}!</b>
    })
    expect(q('.msl-chip b').textContent).toBe('Apple!')
  })
})

describe('options', () => {
  it('follows options prop updates', () => {
    const { rerender, optionTexts, q } = setup()
    rerender(<MultiSelect options={[{ label: 'Kiwi', value: 'kiwi' }]} />)
    expect(optionTexts()).toEqual(['Kiwi'])
    rerender(<MultiSelect options={[]} />)
    expect(q('.msl-options').textContent).toBe('No Data Found')
    rerender(<MultiSelect options={[]} emptyDataLabel='Nothing' />)
    expect(q('.msl-options').textContent).toBe('Nothing')
  })

  it('treats falsy options as empty', () => {
    // @ts-expect-error not part of the typed API
    const { q, input } = setup({ options: false })
    expect(q('.msl-options').textContent).toBe('No Data Found')
    type(input(), 'a')
    expect(q('.msl-options').textContent).toBe('No Data Found')
  })

  it('renders groups, nested groups and empty groups', () => {
    // React warns about a missing key once per file, so this must be the first test with an empty group
    const error = vi.spyOn(console, 'error')
    const { groupTitles, optionTexts, qa } = setup({
      options: [
        ...grouped,
        { title: 'Empty A', type: 'group', childs: [] },
        { title: 'Empty B', type: 'group', childs: [], emptyDataLabel: 'Nada' }
      ]
    })
    expect(groupTitles()).toEqual(['Group A', 'Group B', 'Empty A', 'Empty B'])
    expect(optionTexts()).toEqual([
      'Apple',
      'Banana',
      'Cherry',
      'No Data Found',
      'Nada'
    ])
    expect(qa('option.msl-option-disable').map((el) => el.textContent)).toEqual(
      ['No Data Found', 'Nada']
    )
    expect(error).not.toHaveBeenCalled()
  })

  it('applies option style, classes, title and value attributes', () => {
    const { option } = setup({
      options: [
        {
          label: 'Styled',
          value: 's',
          style: { color: 'blue' },
          classes: 'x y'
        }
      ]
    })
    const styled = option('Styled')
    expect(styled.style.color).toBe('blue')
    expect(styled.getAttribute('class')).toBe('msl-option   x y')
    expect(styled.getAttribute('title')).toBe('Styled')
    expect(styled.getAttribute('value')).toBe('s')
  })

  it('renders options only while open with largeData', () => {
    const { root, optionTexts } = setup({ largeData: true })
    expect(optionTexts()).toEqual([])
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })
})

describe('selecting (multi)', () => {
  it('toggles options and reports the values and their options', () => {
    const { option, chips, onChange } = setup()
    fireEvent.click(option('Apple'))
    fireEvent.click(option('Banana'))
    expect(chips()).toEqual(['Apple', 'Banana'])
    expect(option('Apple').className).toContain('msl-option-active')
    fireEvent.click(option('Apple'))
    expect(chips()).toEqual(['Banana'])
    expect(onChange.mock.calls).toEqual([
      [['apple'], [opts[0]]],
      [
        ['apple', 'banana'],
        [opts[0], opts[1]]
      ],
      [['banana'], [opts[1]]]
    ])
  })

  it('reports the option objects themselves, extra fields included', () => {
    const options = [{ label: 'Ada', value: 'ada', email: 'ada@example.com' }]
    const { option, onChange } = setup({ options })
    fireEvent.click(option('Ada'))
    expect(onChange.mock.calls[0][1][0]).toBe(options[0])
  })

  it('respects limit, still firing onChange when blocked', () => {
    const { option, chips, onChange, root } = setup({ limit: 2 })
    fireEvent.click(option('Apple'))
    expect(root.classList).not.toContain('msl-limit-reached')
    fireEvent.click(option('Banana'))
    expect(root.classList).toContain('msl-limit-reached')
    fireEvent.click(option('Cherry'))
    expect(chips()).toEqual(['Apple', 'Banana'])
    expect(values(onChange)).toEqual([
      ['apple'],
      ['apple', 'banana'],
      ['apple', 'banana']
    ])
  })

  it('ignores disabled options', () => {
    const { option, onChange } = setup({
      options: [{ label: 'Off', value: 'off', disabled: true }]
    })
    expect(option('Off').className).toContain('msl-option-disable')
    fireEvent.click(option('Off'))
    press(option('Off'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('selects with Enter key only', () => {
    const { option, chips } = setup()
    press(option('Apple'), 'a')
    expect(chips()).toEqual([])
    press(option('Apple'))
    expect(chips()).toEqual(['Apple'])
  })

  it('deletes a chip by click, Enter or Space without opening the menu', () => {
    const { qa, chips, onChange, isOpen } = setup({
      defaultValue: ['apple', 'banana', 'cherry']
    })
    expect(qa('.msl-chip-delete')[0].getAttribute('aria-label')).toBe(
      'delete-value'
    )
    fireEvent.click(qa('.msl-chip-delete')[1])
    expect(chips()).toEqual(['Apple', 'Cherry'])
    press(qa('.msl-chip-delete')[0], 'x')
    expect(chips()).toEqual(['Apple', 'Cherry'])
    expect(press(qa('.msl-chip-delete')[0], 'Enter')).toBe(false)
    expect(chips()).toEqual(['Cherry'])
    expect(press(qa('.msl-chip-delete')[0], ' ')).toBe(false)
    expect(chips()).toEqual([])
    expect(values(onChange)).toEqual([['apple', 'cherry'], ['cherry'], []])
    expect(isOpen()).toBe(false)
  })

  it('clears everything by click, Enter or Space without opening the menu', () => {
    const { q, chips, onChange, isOpen, rerender } = setup({
      defaultValue: ['apple', 'banana']
    })
    const clear = q('.msl-clear-btn')
    expect(clear.getAttribute('aria-label')).toBe('close-menu')
    fireEvent.click(clear)
    expect(chips()).toEqual([])
    expect(q('.msl-clear-btn')).toBeNull()
    expect(isOpen()).toBe(false)
    // a new key remounts with the new defaultValue
    rerender(
      <MultiSelect
        key='b'
        options={opts}
        onChange={onChange}
        defaultValue={['cherry']}
      />
    )
    press(q('.msl-clear-btn'), 'x')
    expect(chips()).toEqual(['Cherry'])
    expect(press(q('.msl-clear-btn'), 'Enter')).toBe(false)
    expect(chips()).toEqual([])
    rerender(
      <MultiSelect
        key='c'
        options={opts}
        onChange={onChange}
        defaultValue={['apple']}
      />
    )
    expect(press(q('.msl-clear-btn'), ' ')).toBe(false)
    expect(chips()).toEqual([])
    expect(onChange.mock.calls).toEqual([
      [[], []],
      [[], []],
      [[], []]
    ])
    expect(isOpen()).toBe(false)
  })

  it('has no clear button when clearable is false', () => {
    expect(
      setup({ defaultValue: ['apple'], clearable: false }).q('.msl-clear-btn')
    ).toBeNull()
  })
})

describe('singleSelect', () => {
  it('replaces and toggles the value', () => {
    const { root, option, single, input, onChange } = setup({
      singleSelect: true
    })
    fireEvent.click(root)
    fireEvent.click(option('Apple'))
    expect(single()).toBe('Apple')
    expect(input()).toBeNull()
    fireEvent.click(option('Banana'))
    expect(single()).toBe('Banana')
    fireEvent.click(option('Banana'))
    expect(single()).toBeUndefined()
    expect(values(onChange)).toEqual([['apple'], ['banana'], []])
  })

  it.each([
    [{ singleSelect: true }, false],
    [{ singleSelect: true, closeOnSelect: false }, true],
    [{}, true],
    [{ closeOnSelect: true }, false]
  ])('picking with %o leaves the menu open: %s', (props, open) => {
    const { root, option, isOpen, onMenuOpen, onMenuClose } = setup(props)
    fireEvent.click(root)
    fireEvent.click(option('Apple'))
    expect(isOpen()).toBe(open)
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
    expect(onMenuClose).toHaveBeenCalledTimes(open ? 0 : 1)
  })

  it('closeOnSelect also closes after Enter on an option or in the search', () => {
    const { root, option, input, chips, isOpen } = setup({
      closeOnSelect: true
    })
    fireEvent.click(root)
    press(option('Apple'))
    expect(isOpen()).toBe(false)
    fireEvent.click(root)
    type(input(), 'ch')
    type(input(), 'ch', 'Enter')
    expect(chips()).toEqual(['Apple', 'Cherry'])
    expect(isOpen()).toBe(false)
  })

  function Controlled(props: { closeOnSelect: boolean }) {
    const [value, setValue] = useState<string[]>([])
    return (
      <MultiSelect
        options={opts}
        singleSelect
        value={value}
        onChange={setValue}
        {...props}
      />
    )
  }

  it.each([
    [true, false],
    [false, true]
  ])(
    'closeOnSelect=%s closes the menu when controlled (open: %s)',
    (closeOnSelect, open) => {
      const { container } = render(<Controlled closeOnSelect={closeOnSelect} />)
      const q = (s: string) => container.querySelector(s)!
      fireEvent.click(container.firstChild!)
      fireEvent.click(q('.msl-option'))
      expect(q('.msl-single-value').textContent).toBe('Apple')
      expect(/msl-active/.test(q('.msl').className)).toBe(open)
    }
  )

  it('opens without a search input to focus', () => {
    const { root, isOpen, onMenuOpen } = setup({
      singleSelect: true,
      defaultValue: ['apple']
    })
    fireEvent.click(root)
    expect(isOpen()).toBe(true)
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
  })
})

describe('disableChip / disableSearch / disabled', () => {
  it('shows a label or a count instead of chips', () => {
    const { option, single, input, chips } = setup({ disableChip: true })
    expect(input()).not.toBeNull()
    fireEvent.click(option('Apple'))
    expect(single()).toBe('Apple')
    expect(chips()).toEqual([])
    expect(input()).toBeNull()
    fireEvent.click(option('Banana'))
    expect(single()).toBe('2 Item Selected')
  })

  it('uses chipAlternateText', () => {
    expect(
      setup({
        disableChip: true,
        defaultValue: ['apple', 'banana'],
        chipAlternateText: 'picked'
      }).single()
    ).toBe('2 picked')
  })

  it('renders a single value through getLabel', () => {
    const getLabel = (opt: MultiSelectOption) => `<${opt.label}>`
    expect(
      setup({ disableChip: true, getLabel, defaultValue: ['apple'] }).single()
    ).toBe('<Apple>')
    cleanup()
    expect(
      setup({ singleSelect: true, getLabel, defaultValue: ['banana'] }).single()
    ).toBe('<Banana>')
  })

  it('disableSearch keeps a static placeholder until a value exists', () => {
    const { input, q, option } = setup({ disableSearch: true })
    expect(input()).toBeNull()
    expect(q('.msl-input').getAttribute('data-placeholder')).toBe('Select...')
    fireEvent.click(option('Apple'))
    expect(q('.msl-input')).toBeNull()
  })

  it('disabled leaves the tab order and ignores the keyboard', () => {
    const { root, q, isOpen, onMenuOpen, chips } = setup({
      disabled: true,
      defaultValue: ['apple']
    })
    expect(root.className).toContain('msl-disabled')
    expect(root.tabIndex).toBe(-1)
    expect(q('.msl-chip-delete').tabIndex).toBe(-1)
    expect(q('.msl-clear-btn').tabIndex).toBe(-1)
    const search = q<HTMLInputElement>('.msl-input')
    expect(search.disabled).toBe(true)
    expect(search.getAttribute('aria-disabled')).toBe('true')
    for (const key of ['Enter', ' ', 'a', 'ArrowDown', 'Backspace']) {
      press(root, key)
      press(search, key)
    }
    expect(isOpen()).toBe(false)
    expect(onMenuOpen).not.toHaveBeenCalled()
    expect(chips()).toEqual(['Apple'])
  })
})

// a chip whose delete button sits in its own shadow root, as in web component libraries
const shadowChip: MultiSelectProps['customChip'] = ({ label, onDelete }) => (
  <span
    className='my-chip'
    onClick={onDelete}
    ref={(el) => {
      if (el && !el.shadowRoot)
        el.attachShadow({ mode: 'open' }).innerHTML =
          '<slot></slot><button>×</button>'
    }}
  >
    {label}
  </span>
)

describe('customChip', () => {
  const customChip = vi.fn(
    ({ label, value, onDelete }: MultiSelectChipProps) => (
      <button
        type='button'
        className='my-chip'
        data-value={value}
        onClick={onDelete}
      >
        {label}
      </button>
    )
  )

  it('renders each chip with its label, value, option and onDelete', () => {
    const { qa, chips, isOpen, onChange } = setup({
      defaultValue: ['apple', 'banana'],
      getLabel: (opt) => <b>{opt.label}</b>,
      customChip
    })
    expect(chips()).toEqual([])
    const buttons = () => qa('.my-chip')
    expect(buttons().map((el) => el.innerHTML)).toEqual([
      '<b>Apple</b>',
      '<b>Banana</b>'
    ])
    expect(customChip).toHaveBeenLastCalledWith(
      expect.objectContaining({
        value: 'banana',
        option: opts[1],
        disabled: false
      })
    )
    // a native button's Enter and click are its own: not prevented, no menu
    expect(press(buttons()[0], 'Enter')).toBe(true)
    fireEvent.click(buttons()[0])
    expect(values(onChange)).toEqual([['banana']])
    expect(isOpen()).toBe(false)
  })

  it('onDelete does nothing while disabled', () => {
    const { qa, onChange } = setup({
      disabled: true,
      defaultValue: ['apple'],
      customChip
    })
    expect(customChip).toHaveBeenLastCalledWith(
      expect.objectContaining({ disabled: true })
    )
    // a native button stays tabbable: its click still reaches onDelete
    fireEvent.click(qa('.my-chip')[0])
    expect(onChange).not.toHaveBeenCalled()
    expect(qa('.my-chip')).toHaveLength(1)
  })

  it('onDelete deletes from the latest selection, even from an old render', () => {
    const deletes: Record<string, () => void> = {}
    const { onChange } = setup({
      defaultValue: ['apple', 'banana', 'cherry'],
      customChip: ({ value, onDelete }) => {
        deletes[value] = onDelete
        return value
      }
    })
    const { apple, banana } = deletes
    // both from the first render, as when an exit animation delays them
    act(() => {
      apple()
      banana()
    })
    expect(values(onChange)).toEqual([['banana', 'cherry'], ['cherry']])
  })

  it('onDelete still deletes after the select unmounts', () => {
    let del = () => {}
    const { unmount, onChange } = setup({
      defaultValue: ['apple'],
      customChip: ({ onDelete }) => {
        del = onDelete
        return null
      }
    })
    unmount()
    del()
    expect(values(onChange)).toEqual([[]])
  })

  it('a keyboard delete that unmounts the focused chip keeps focus in the widget', () => {
    const { qa, input } = setup({
      defaultValue: ['apple', 'banana'],
      // keyed by value: deleting Apple remounts the chip after it
      customChip: ({ label, value, onDelete }) => (
        <button
          key={value}
          type='button'
          className='my-chip'
          onKeyDown={onDelete}
        >
          {label}
        </button>
      )
    })
    qa('.my-chip')[0].focus()
    press(qa('.my-chip')[0])
    expect(qa('.my-chip').map((el) => el.textContent)).toEqual(['Banana'])
    expect(document.activeElement).toBe(input())
  })

  it('keeps keyboard focus and the menu shut when onChange re-renders synchronously', () => {
    function Flushing() {
      const [value, setValue] = useState(['apple', 'banana'])
      return (
        <MultiSelect
          options={opts}
          value={value}
          onChange={(v) => flushSync(() => setValue(v))}
        />
      )
    }
    const { container } = render(<Flushing />)
    const dels = () => [
      ...container.querySelectorAll<HTMLElement>('.msl-chip-delete')
    ]
    const isOpen = () =>
      /msl-active/.test(container.querySelector('.msl')!.className)
    // the last chip unmounts before the event reaches the wrapper
    dels()[1].focus()
    press(dels()[1])
    expect(dels()).toHaveLength(1)
    expect(document.activeElement).toBe(container.querySelector('.msl-input'))
    expect(isOpen()).toBe(false)
    fireEvent.click(dels()[0])
    expect(container.querySelector('.msl-chip')).toBeNull()
    expect(isOpen()).toBe(false)
  })

  it('a chip with its own shadow root deletes from inside it', () => {
    const { q, onChange } = setup({
      defaultValue: ['apple'],
      customChip: shadowChip
    })
    const button = q('.my-chip').shadowRoot!.querySelector('button')!
    button.focus()
    fireEvent.click(button)
    expect(values(onChange)).toEqual([[]])
    // jsdom matches :focus-visible on document.activeElement only, the host here: focus is checked in test/browser
  })

  it('types the option as T, plus { label, value } with customValue, and rejects memo', () => {
    const ada = { id: '1', name: 'Ada' }
    const props = {
      options: [ada],
      getLabel: (p: typeof ada) => p.name,
      getValue: (p: typeof ada) => p.id
    }
    const elements = [
      <MultiSelect
        key='a'
        {...props}
        customChip={({ option }) => option.name}
      />,
      <MultiSelect
        key='b'
        {...props}
        customValue
        // @ts-expect-error a created value's option is { label, value }, not a person
        customChip={({ option }) => option.name}
      />,
      <MultiSelect
        key='c'
        // @ts-expect-error a memo component is an object: it can't be called
        customChip={memo(customChip)}
      />
    ]
    expect(elements).toHaveLength(3)
  })
})

describe('search', () => {
  it('filters by label, case-insensitive', () => {
    const { input, optionTexts } = setup()
    type(input(), 'AN')
    expect(optionTexts()).toEqual(['Banana'])
  })

  it('matches labels and values, in option order', () => {
    const { input, optionTexts } = setup({
      options: [
        { label: 'Blue', value: 'red_blue' },
        { label: 'Red', value: 'r' }
      ]
    })
    type(input(), 'red')
    expect(optionTexts()).toEqual(['Blue', 'Red'])
  })

  it('filterOption replaces the match, but not for created values', () => {
    const { input, optionTexts } = setup({
      options: [
        { label: 'Apple', value: 'apple', tags: ['fruit', 'red'] },
        { label: 'Carrot', value: 'carrot', tags: ['veg'] }
      ],
      // created values have no tags: calling this on them would throw
      filterOption: (opt, search) => opt.tags.includes(search),
      customValue: true,
      defaultValue: ['fig']
    })
    type(input(), 'red')
    expect(optionTexts()).toEqual(['Apple', 'Create "red"'])
    type(input(), 'Apple')
    expect(optionTexts()).toEqual(['Create "Apple"'])
    type(input(), 'fi')
    expect(optionTexts()).toEqual(['fig', 'Create "fi"'])
  })

  it('passes filterOption the search trimmed, commas removed', () => {
    const filterOption = vi.fn(() => true)
    const { input } = setup({ filterOption })
    // pasted text: a typed comma would pick the first result
    type(input(), ' Doe, J ')
    expect(filterOption).toHaveBeenLastCalledWith(opts[2], 'Doe J')
  })

  it('searches nested groups and flattens results', () => {
    const { input, optionTexts, groupTitles } = setup({ options: grouped })
    type(input(), 'e')
    expect(optionTexts()).toEqual(['Apple', 'Cherry'])
    expect(groupTitles()).toEqual([])
  })

  it('matches label text, not what getLabel renders', () => {
    const { input, optionTexts } = setup({
      getLabel: (opt) => <b>{opt.label.toUpperCase()}</b>
    })
    type(input(), 'APP')
    expect(optionTexts()).toEqual(['APPLE'])
    type(input(), 'zzz')
    expect(optionTexts()).toEqual(['No Data Found'])
  })

  it('renders the Create item without getLabel', () => {
    const { input, optionTexts } = setup({
      customValue: true,
      getLabel: (opt) => `[${opt.label}]`
    })
    type(input(), 'kiwi')
    expect(optionTexts()).toEqual(['Create "kiwi"'])
  })

  it('shows emptyDataLabel when nothing matches', () => {
    const { input, q } = setup({ emptyDataLabel: 'Nope' })
    type(input(), 'zzz')
    expect(q('.msl-options').textContent).toBe('Nope')
  })

  it('strips commas and trims before searching', () => {
    const { input, optionTexts } = setup()
    type(input(), ' ap,p ')
    expect(optionTexts()).toEqual(['Apple'])
  })

  it('restores all options when the text is cleared', () => {
    const { input, optionTexts } = setup()
    type(input(), 'ch')
    type(input(), '', 'Backspace')
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  it.each(['(', '[', '*', '+', '?', '\\', '.'])(
    'matches %s literally instead of as a regex',
    (ch) => {
      const { input, optionTexts } = setup({
        options: [...opts, { label: `a${ch}b`, value: 'special' }]
      })
      type(input(), ch)
      expect(optionTexts()).toEqual([`a${ch}b`])
    }
  )

  it.each(['Enter', ','])(
    '%s picks the first result and resets the search',
    (key) => {
      const { input, chips, optionTexts } = setup()
      type(input(), 'ch')
      type(input(), 'ch', key)
      expect(chips()).toEqual(['Cherry'])
      expect(input().value).toBe('')
      expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
    }
  )

  it('Enter picks a match even without a keyup for the text (paste, IME)', () => {
    const { input, chips } = setup()
    type(input(), 'ch', 'Enter')
    expect(chips()).toEqual(['Cherry'])
  })

  it('searches on input too: text can arrive without a keyup (context menu paste)', () => {
    const { input, optionTexts } = setup()
    input().value = 'ch'
    fireEvent.input(input())
    expect(optionTexts()).toEqual(['Cherry'])
  })

  it('numeric option values and labels (untyped JS) search and resolve', () => {
    const { input, optionTexts, chips } = setup({
      options: [
        { label: 'One', value: 1 },
        { label: 20, value: 'twenty' }
      ] as unknown as MultiSelectProps['options'],
      defaultValue: ['1']
    })
    expect(chips()).toEqual(['One'])
    type(input(), '1')
    expect(optionTexts()).toEqual(['One'])
    type(input(), '2')
    expect(optionTexts()).toEqual(['20'])
  })

  it.each([
    ['isComposing', { isComposing: true }],
    ['keyCode 229 (Safari)', { keyCode: 229 }]
  ])(
    'an Enter or comma confirming an IME composition (%s) does not pick',
    (_, init) => {
      const { input, chips, isOpen, onChange } = setup({ customValue: true })
      fireEvent.click(input())
      press(input(), 'ArrowDown')
      for (const key of ['Enter', ',']) {
        input().value = 'ch'
        expect(press(input(), key, init)).toBe(true)
        fireEvent.keyUp(input(), { key })
      }
      expect(chips()).toEqual([])
      expect(onChange).not.toHaveBeenCalled()
      expect(isOpen()).toBe(true)
      // the next, plain Enter picks
      press(input(), 'Enter')
      fireEvent.keyUp(input(), { key: 'Enter' })
      expect(chips()).toEqual(['Cherry'])
    }
  )

  it('Enter does nothing without results', () => {
    const { input, chips, onChange } = setup()
    type(input(), 'zzz')
    type(input(), 'zzz', 'Enter')
    expect(chips()).toEqual([])
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('customValue', () => {
  it('offers a Create item, unless the value matches exactly', () => {
    const { input, optionTexts } = setup({ customValue: true })
    type(input(), 'zzz')
    expect(optionTexts()).toEqual(['Create "zzz"'])
    type(input(), 'app')
    expect(optionTexts()).toEqual(['Apple', 'Create "app"'])
    type(input(), 'apple')
    expect(optionTexts()).toEqual(['Apple'])
  })

  it('Enter or comma creates the value under Custom Values', () => {
    const { input, chips, onChange, groupTitles, optionTexts, option } = setup({
      customValue: true
    })
    type(input(), 'kiwi')
    type(input(), 'kiwi', 'Enter')
    expect(chips()).toEqual(['kiwi'])
    // the typed text is the label too
    expect(onChange).toHaveBeenLastCalledWith(
      ['kiwi'],
      [{ label: 'kiwi', value: 'kiwi' }]
    )
    expect(groupTitles()).toEqual(['Custom Values'])
    expect(option('kiwi').className).toContain('msl-option-active')

    type(input(), 'lime')
    type(input(), 'lime', ',')
    expect(chips()).toEqual(['kiwi', 'lime'])
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'kiwi', 'lime'])
  })

  it('clicking Create creates the value too; Enter on it again toggles it off', () => {
    const { input, option, chips, groupTitles, onChange } = setup({
      customValue: true
    })
    type(input(), 'kiwi')
    fireEvent.click(option('Create "kiwi"'))
    expect(chips()).toEqual(['kiwi'])
    expect(groupTitles()).toEqual(['Custom Values'])
    type(input(), 'kiwi')
    type(input(), 'kiwi', 'Enter')
    expect(chips()).toEqual([])
    // still listed once deselected
    expect(groupTitles()).toEqual(['Custom Values'])
    expect(values(onChange)).toEqual([['kiwi'], []])
  })

  it('current behavior: Enter with a partial match picks the match, not a new value', () => {
    const { input, chips } = setup({ customValue: true })
    type(input(), 'app')
    type(input(), 'app', 'Enter')
    expect(chips()).toEqual(['Apple'])
  })

  it('keeps double quotes in the custom label', () => {
    const { input, option, chips } = setup({ customValue: true })
    type(input(), 'say "hi"')
    type(input(), 'say "hi"', 'Enter')
    expect(chips()).toEqual(['say "hi"'])
    expect(option('say "hi"').getAttribute('value')).toBe('say "hi"')
  })

  it('keeps created values when the parent re-renders with a new options array', () => {
    function Parent() {
      const [, setValue] = useState<string[]>([])
      return <MultiSelect options={[...opts]} customValue onChange={setValue} />
    }
    const { container } = render(<Parent />)
    const input = container.querySelector<HTMLElement>('.msl-input')!
    type(input, 'kiwi')
    type(input, 'kiwi', 'Enter')
    expect(
      [...container.querySelectorAll('.msl-option')].map((el) => el.textContent)
    ).toEqual(['Apple', 'Banana', 'Cherry', 'kiwi'])
  })

  it('keeps created values when the parent value changes or empties', () => {
    function Parent() {
      const [value, setValue] = useState<string[]>([])
      return (
        <>
          <MultiSelect
            options={opts}
            value={value}
            onChange={setValue}
            customValue
          />
          <button onClick={() => setValue(['apple'])}>pick</button>
          <button onClick={() => setValue([])}>reset</button>
        </>
      )
    }
    const { container, getByText } = render(<Parent />)
    const optionTexts = () =>
      [...container.querySelectorAll('.msl-option')].map((el) => el.textContent)
    const input = container.querySelector<HTMLElement>('.msl-input')!
    type(input, 'kiwi')
    type(input, 'kiwi', 'Enter')
    fireEvent.click(getByText('pick'))
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'kiwi'])
    fireEvent.click(getByText('reset'))
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'kiwi'])
  })

  it('drops a custom value once options arriving later have it', () => {
    const { rerender, chips, groupTitles, optionTexts } = setup({
      options: [],
      defaultValue: ['banana'],
      customValue: true
    })
    expect(groupTitles()).toEqual(['Custom Values'])
    rerender(<MultiSelect options={opts} customValue />)
    expect(chips()).toEqual(['Banana'])
    expect(groupTitles()).toEqual([])
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })
})

describe('getLabel / getValue', () => {
  const ada = { id: '1', name: 'Ada' }
  const bob = { id: '2', name: 'Bob' }
  // any shape: the types infer it from options
  const people = [ada, { title: 'Team', type: 'group', childs: [bob] }]
  const qa = (c: HTMLElement, s: string) => [
    ...c.querySelectorAll<HTMLElement>(s)
  ]

  it('reads any option shape through getLabel and getValue', () => {
    const onChange = vi.fn()
    const { container: c } = render(
      <MultiSelect
        options={people}
        getLabel={(p) => p.name}
        getValue={(p) => p.id}
        defaultValue={['2']}
        onChange={onChange}
      />
    )
    expect(qa(c, '.msl-chip').map((el) => el.textContent)).toEqual(['Bob'])
    expect(
      qa(c, '.msl-option').map((el) => [
        el.getAttribute('value'),
        el.getAttribute('title'),
        el.textContent
      ])
    ).toEqual([
      ['1', 'Ada', 'Ada'],
      ['2', 'Bob', 'Bob']
    ])
    fireEvent.click(qa(c, '.msl-option')[0])
    expect(onChange).toHaveBeenLastCalledWith(['2', '1'], [bob, ada])
    expect(
      c.querySelector<HTMLInputElement>('input[type="hidden"]')!.value
    ).toBe('2,1')
    fireEvent.click(qa(c, '.msl-option')[0])
    expect(onChange).toHaveBeenLastCalledWith(['2'], [bob])
    // the label first, then the value
    const input = c.querySelector('input.msl-input')!
    type(input, 'ad')
    expect(qa(c, '.msl-option').map((el) => el.textContent)).toEqual(['Ada'])
    type(input, '2')
    expect(qa(c, '.msl-option').map((el) => el.textContent)).toEqual(['Bob'])
  })

  it('searches a number label, and only values for JSX without a label field', () => {
    const years = [
      { id: 'a', year: 1999 },
      { id: 'b', year: 2024 }
    ]
    const props = { options: years, getValue: (y: (typeof years)[0]) => y.id }
    const texts = () =>
      qa(c, '.msl-options .msl-option').map((el) => el.textContent)
    const { container: c, rerender } = render(
      <MultiSelect {...props} getLabel={(y) => y.year} />
    )
    type(c.querySelector('input.msl-input')!, '99')
    expect(texts()).toEqual(['1999'])
    rerender(<MultiSelect {...props} getLabel={(y) => <b>{y.year}</b>} />)
    type(c.querySelector('input.msl-input')!, '99')
    expect(texts()).toEqual(['No Data Found'])
    type(c.querySelector('input.msl-input')!, 'b')
    expect(texts()).toEqual(['2024'])
  })

  it('keeps created values and the Empty option out of the getters', () => {
    const getLabel = (opt: MultiSelectOption) => `${opt.label}!`
    const getValue = (opt: MultiSelectOption) => opt.value.toUpperCase()
    const { input, chips, optionTexts, onChange } = setup({
      customValue: true,
      defaultValue: ['APPLE', 'fig'],
      getLabel,
      getValue
    })
    expect(chips()).toEqual(['Apple!', 'fig'])
    type(input(), 'kiwi', 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(
      ['APPLE', 'fig', 'kiwi'],
      [
        opts[0],
        { label: 'fig', value: 'fig' },
        { label: 'kiwi', value: 'kiwi' }
      ]
    )
    expect(optionTexts()).toEqual([
      'Apple!',
      'Banana!',
      'Cherry!',
      'kiwi',
      'fig'
    ])
    cleanup()
    const { container } = render(
      <MultiSelect getLabel={getLabel} getValue={getValue} />
    )
    expect(container.querySelector('.msl-option')!.textContent).toBe('Empty')
  })

  it('keeps a JSX label without getLabel out of search and the tooltip', () => {
    const { input, option, optionTexts } = setup({
      // @ts-expect-error label is a string: JSX goes through getLabel (untyped JS, v2 options)
      options: [{ label: <b>Bold</b>, value: 'bold' }]
    })
    expect(option('Bold').getAttribute('title')).toBe('')
    // not '[object Object]'
    type(input(), 'obj')
    expect(optionTexts()).toEqual(['No Data Found'])
  })

  it('calls getLabel once per option for both its content and its tooltip', () => {
    const getLabel = vi.fn((p: typeof ada) => <b>{p.name}</b>)
    const { container: c } = render(
      <MultiSelect
        options={[ada, bob]}
        getLabel={getLabel}
        getValue={(p) => p.id}
      />
    )
    expect(getLabel.mock.calls.map(([p]) => p.name)).toEqual(['Ada', 'Bob'])
    expect(qa(c, '.msl-option').map((el) => el.textContent)).toEqual([
      'Ada',
      'Bob'
    ])
  })

  it('types require getLabel and getValue for shapes without them', () => {
    const elements = [
      // @ts-expect-error people have no `value`: getValue is required
      <MultiSelect key='a' options={people} getLabel={(p) => p.name} />,
      // @ts-expect-error people have no `label`: getLabel is required
      <MultiSelect key='b' options={people} getValue={(p) => p.id} />
    ]
    // checked by pnpm typecheck: at runtime these are plain elements
    expect(elements).toHaveLength(2)
  })

  it('types keep wrappers on the default shape, and created values off T', () => {
    const Wrapper = (p: ComponentProps<typeof MultiSelect>) => (
      <MultiSelect {...p} />
    )
    const Memo = memo(MultiSelect)
    const props = {
      options: [ada, bob],
      getLabel: (p: typeof ada) => p.name,
      getValue: (p: typeof ada) => p.id,
      onChange: (_: string[], sel: { name: string }[]) => sel.map((p) => p.name)
    }
    const elements = [
      <Wrapper key='a' options={opts} />,
      <Memo key='b' options={opts} />,
      <MultiSelect key='c' {...props} />,
      // @ts-expect-error with customValue, onChange can get { label, value }, not a person
      <MultiSelect key='d' {...props} customValue />
    ]
    expect(elements).toHaveLength(4)
  })
})

describe('menu open / close', () => {
  it('opens on click, focuses search, and computes direction', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    const { root, q, onMenuOpen } = setup()
    fireEvent.click(root)
    expect(q('.msl').getAttribute('class')).toBe('msl msl-active ')
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
    expect(focus).toHaveBeenCalled()
  })

  it('opens upward near the bottom of the viewport, if there is more room above', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(100)
    const { root, q } = setup()
    // jsdom: top 0, so below has more room
    fireEvent.click(root)
    expect(q('.msl').getAttribute('class')).toBe('msl msl-active ')
    fireEvent.click(document.body)
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      top: 60
    } as DOMRect)
    fireEvent.click(root)
    expect(q('.msl').getAttribute('class')).toBe('msl msl-active-up ')
  })

  it('clicks and keypresses inside an open menu do not fire onMenuOpen again', () => {
    const { root, option, input, onMenuOpen } = setup()
    fireEvent.click(root)
    fireEvent.click(option('Apple'))
    press(input(), 'a')
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['button', (q: Q) => q('.msl-arrow-btn')],
    ['svg', (q: Q) => q('.msl-arrow-icn')],
    ['line', (q: Q) => q('.msl-arrow-icn line')]
  ])('arrow toggles from its %s', (_, get) => {
    const { q, isOpen, onMenuOpen, onMenuClose } = setup()
    fireEvent.click(get(q))
    expect(isOpen()).toBe(true)
    expect(q('.msl-arrow-btn').style.transform).toBe('rotate(180deg)')
    fireEvent.click(get(q))
    expect(isOpen()).toBe(false)
    expect(q('.msl-arrow-btn').style.transform).toBe('')
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
    expect(onMenuClose).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['chip', (q: Q) => q('.msl-chip')],
    ['chip delete svg', (q: Q) => q('.msl-chip-delete svg')],
    ['chip delete line', (q: Q) => q('.msl-chip-delete line')],
    ['deep custom close icon', (q: Q) => q('.deep')]
  ])('clicking %s does not open the menu', (_, get) => {
    const { q, isOpen } = setup({
      defaultValue: ['apple', 'banana'],
      closeIcon: (
        <span>
          <b>
            <i className='deep' />
          </b>
        </span>
      )
    })
    fireEvent.click(get(q))
    expect(isOpen()).toBe(false)
  })

  it('a deep custom down arrow icon still toggles', () => {
    const { q, isOpen } = setup({
      downArrowIcon: (
        <span>
          <b>
            <i className='deep' />
          </b>
        </span>
      )
    })
    fireEvent.click(q('.deep'))
    expect(isOpen()).toBe(true)
    fireEvent.click(q('.deep'))
    expect(isOpen()).toBe(false)
  })

  it('closes when focus moves out (Tab), not when it moves inside', () => {
    const outside = document.body.appendChild(document.createElement('button'))
    try {
      const { root, q, isOpen, onMenuClose } = setup({
        defaultValue: ['apple']
      })
      fireEvent.click(root)
      fireEvent.focusIn(q('.msl-chip-delete'))
      expect(isOpen()).toBe(true)
      fireEvent.focusIn(outside)
      expect(isOpen()).toBe(false)
      expect(onMenuClose).toHaveBeenCalledTimes(1)
    } finally {
      outside.remove()
    }
  })

  it('works in a shadow root', () => {
    const host = document.body.appendChild(document.createElement('div'))
    const container = host
      .attachShadow({ mode: 'open' })
      .appendChild(document.createElement('div'))
    try {
      const onChange = vi.fn()
      render(<MultiSelect options={opts} onChange={onChange} />, {
        container
      })
      const q = (s: string) => container.querySelector<HTMLElement>(s)!
      const isOpen = () => /msl-active/.test(q('.msl').className)
      // the wrapper's ancestors include the ShadowRoot, which has no hasAttribute
      press(q('.msl-wrp'), 'ArrowDown')
      expect(isOpen()).toBe(true)
      // the document sees the host as target: still a click inside
      fireEvent.click(q('.msl-option'))
      expect(onChange).toHaveBeenLastCalledWith(['apple'], [opts[0]])
      expect(isOpen()).toBe(true)
      fireEvent.click(document.body)
      expect(isOpen()).toBe(false)
    } finally {
      host.remove()
    }
  })

  it('a click from a portal in a label does not crash', () => {
    // React reports handler errors instead of throwing them
    const errors = vi.fn((e: Event) => e.preventDefault())
    window.addEventListener('error', errors)
    const { root, isOpen } = setup({
      options: [{ label: 'Portal', value: 'p' }],
      getLabel: () => (
        <b>{createPortal(<i className='portal' />, document.body)}</b>
      )
    })
    fireEvent.click(root)
    // React bubbles it to the wrapper; climbing from it ends at the document
    fireEvent.click(document.querySelector('.portal')!)
    window.removeEventListener('error', errors)
    expect(errors).not.toHaveBeenCalled()
    // outside the wrapper's DOM: an outside click
    expect(isOpen()).toBe(false)
  })

  it('closes on outside click and Escape, firing onMenuClose', () => {
    const { root, isOpen, onMenuClose } = setup()
    fireEvent.click(root)
    fireEvent.click(document.body)
    expect(isOpen()).toBe(false)
    expect(onMenuClose).toHaveBeenCalledTimes(1)

    fireEvent.click(root)
    fireEvent.keyDown(document, { key: 'a' })
    expect(isOpen()).toBe(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(isOpen()).toBe(false)
    expect(onMenuClose).toHaveBeenCalledTimes(2)
  })

  it('fires onMenuClose only when an open menu closes', () => {
    const { root, onMenuClose } = setup()
    fireEvent.click(document.body)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onMenuClose).not.toHaveBeenCalled()
    fireEvent.click(root)
    fireEvent.click(document.body)
    fireEvent.click(document.body)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onMenuClose).toHaveBeenCalledTimes(1)
  })

  it('stops listening after unmount', () => {
    const { root, unmount, onMenuClose } = setup()
    fireEvent.click(root)
    unmount()
    fireEvent.click(document.body)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onMenuClose).not.toHaveBeenCalled()
  })
})

describe('clearAll', () => {
  it('clears when it turns true and there is a value', () => {
    const { rerender, chips, onChange } = setup({ defaultValue: ['apple'] })
    rerender(<MultiSelect options={opts} onChange={onChange} clearAll />)
    expect(chips()).toEqual([])
    expect(onChange).toHaveBeenCalledWith([], [])
  })

  it('does nothing without a value', () => {
    const { rerender, onChange } = setup()
    rerender(<MultiSelect options={opts} onChange={onChange} clearAll />)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('value (controlled)', () => {
  it('shows value and changes only when the parent passes a new one', () => {
    const { option, chips, onChange, rerender, q } = setup({ value: ['apple'] })
    expect(chips()).toEqual(['Apple'])
    fireEvent.click(option('Banana'))
    expect(onChange).toHaveBeenLastCalledWith(
      ['apple', 'banana'],
      [opts[0], opts[1]]
    )
    expect(chips()).toEqual(['Apple'])
    rerender(
      <MultiSelect
        options={opts}
        onChange={onChange}
        value={['apple', 'banana']}
      />
    )
    expect(chips()).toEqual(['Apple', 'Banana'])
    fireEvent.click(q('.msl-clear-btn'))
    expect(onChange).toHaveBeenLastCalledWith([], [])
    expect(chips()).toEqual(['Apple', 'Banana'])
    rerender(<MultiSelect options={opts} onChange={onChange} value={[]} />)
    expect(chips()).toEqual([])
  })

  it('follows the parent state, including resets and created values', () => {
    function Parent() {
      const [value, setValue] = useState<string[]>(['cherry'])
      return (
        <>
          <MultiSelect
            options={opts}
            value={value}
            onChange={setValue}
            customValue
          />
          <button onClick={() => setValue([])}>reset</button>
        </>
      )
    }
    const { container, getByText } = render(<Parent />)
    const chips = () =>
      [...container.querySelectorAll('.msl-chip')].map((el) => el.textContent)
    fireEvent.click(getByText('Apple'))
    expect(chips()).toEqual(['Cherry', 'Apple'])
    const input = container.querySelector<HTMLElement>('.msl-input')!
    type(input, 'kiwi')
    type(input, 'kiwi', 'Enter')
    expect(chips()).toEqual(['Cherry', 'Apple', 'kiwi'])
    expect(container.querySelector('.msl-grp-title')!.textContent).toBe(
      'Custom Values'
    )
    fireEvent.click(getByText('reset'))
    expect(chips()).toEqual([])
  })

  it('starts the next delete from the parent value, not a change it rejected', () => {
    const { qa, onChange } = setup({ value: ['apple', 'banana', 'cherry'] })
    fireEvent.click(qa('.msl-chip-delete')[0])
    fireEvent.click(qa('.msl-chip-delete')[1])
    expect(values(onChange)).toEqual([
      ['banana', 'cherry'],
      ['apple', 'cherry']
    ])
  })

  it('a late commit leaves focus where the user moved it', () => {
    const { qa, rerender } = setup({ value: ['apple', 'banana'] })
    const del = qa('.msl-chip-delete')[1]
    del.focus()
    press(del)
    // the parent applies it after the user tabbed on, as after a save
    const other = document.body.appendChild(document.createElement('button'))
    other.focus()
    rerender(<MultiSelect options={opts} value={['apple']} />)
    expect(qa('.msl-chip')).toHaveLength(1)
    expect(document.activeElement).toBe(other)
    other.remove()
  })

  it('leaves unknown values out without customValue', () => {
    const { chips, hidden, option, onChange } = setup({
      value: ['zzz', 'apple']
    })
    expect(chips()).toEqual(['Apple'])
    expect(hidden().value).toBe('apple')
    fireEvent.click(option('Banana'))
    expect(onChange).toHaveBeenLastCalledWith(
      ['apple', 'banana'],
      [opts[0], opts[1]]
    )
  })

  it('lists unknown values under Custom Values with customValue, while selected', () => {
    const { chips, groupTitles, optionTexts, rerender } = setup({
      value: ['zzz', 'apple'],
      customValue: true
    })
    expect(chips()).toEqual(['zzz', 'Apple'])
    expect(groupTitles()).toEqual(['Custom Values'])
    rerender(
      <MultiSelect options={opts} value={['zzz', 'yyy', 'zzz']} customValue />
    )
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'zzz', 'yyy'])
    rerender(<MultiSelect options={opts} value={['apple']} customValue />)
    expect(groupTitles()).toEqual([])
  })
})

describe('onClear', () => {
  it('fires after the clear button empties the value, not for clearAll', () => {
    const onClear = vi.fn()
    const { q, rerender, onChange } = setup({
      defaultValue: ['apple'],
      onClear
    })
    fireEvent.click(q('.msl-clear-btn'))
    expect(onChange).toHaveBeenLastCalledWith([], [])
    expect(onClear).toHaveBeenCalledTimes(1)
    rerender(
      <MultiSelect
        key='b'
        options={opts}
        defaultValue={['cherry']}
        onClear={onClear}
      />
    )
    press(q('.msl-clear-btn'), 'Enter')
    expect(onClear).toHaveBeenCalledTimes(2)
    rerender(
      <MultiSelect
        key='c'
        options={opts}
        defaultValue={['apple']}
        onClear={onClear}
      />
    )
    rerender(<MultiSelect key='c' options={opts} onClear={onClear} clearAll />)
    expect(q('.msl-clear-btn')).toBeNull()
    expect(onClear).toHaveBeenCalledTimes(2)
  })
})

describe('aria', () => {
  it('ids survive SSR hydration', () => {
    const ui = <MultiSelect options={opts} />
    const container = document.createElement('div')
    container.innerHTML = renderToString(<MultiSelect options={opts} />)
    document.body.appendChild(container)
    const error = vi.spyOn(console, 'error')
    render(ui, { container, hydrate: true })
    expect(error).not.toHaveBeenCalled()
  })

  it('the search field is a combobox wired to the listbox', () => {
    const { root, input, q, isOpen } = setup()
    const list = q('.msl-options')
    expect(list.getAttribute('role')).toBe('listbox')
    expect(list.getAttribute('aria-multiselectable')).toBe('true')
    expect(list.id).toMatch(/^msl-listbox\S+$/)
    const combo = input()
    expect(combo.getAttribute('role')).toBe('combobox')
    expect(combo.getAttribute('aria-haspopup')).toBe('listbox')
    expect(combo.getAttribute('aria-controls')).toBe(list.id)
    expect(combo.getAttribute('aria-expanded')).toBe('false')
    expect(combo.getAttribute('aria-disabled')).not.toBe('true')
    expect(combo.hasAttribute('aria-activedescendant')).toBe(false)
    expect(root.hasAttribute('role')).toBe(false)
    expect(combo.hasAttribute('aria-label')).toBe(false)
    fireEvent.click(root)
    expect(isOpen()).toBe(true)
    expect(combo.getAttribute('aria-expanded')).toBe('true')
  })

  it('the search field takes its accessible name from attr', () => {
    const { input } = setup({
      attr: { 'aria-label': 'Fruit', 'aria-labelledby': 'fruit-label' }
    })
    expect(input().getAttribute('aria-label')).toBe('Fruit')
    expect(input().getAttribute('aria-labelledby')).toBe('fruit-label')
  })

  it.each([
    [{ singleSelect: true, defaultValue: ['apple'] }, 'false'],
    [{ disableChip: true, defaultValue: ['apple'] }, 'true'],
    [{ disableSearch: true }, 'true']
  ])(
    'without a search field %o the wrapper is the combobox',
    (props, multi) => {
      const { root, q, input } = setup({
        attr: { 'aria-label': 'Fruit' },
        ...props
      })
      expect(input()).toBeNull()
      const list = q('.msl-options')
      expect(list.getAttribute('aria-multiselectable')).toBe(multi)
      expect(root.getAttribute('role')).toBe('combobox')
      expect(root.getAttribute('aria-controls')).toBe(list.id)
      expect(root.getAttribute('aria-expanded')).toBe('false')
      expect(root.getAttribute('aria-label')).toBe('Fruit')
    }
  )

  it('options expose role, id, selected and disabled state', () => {
    const { qa } = setup({
      options: [...opts, { label: 'Off', value: 'off', disabled: true }],
      defaultValue: ['banana']
    })
    const options = qa('[role="option"]')
    expect(options.map((el) => el.textContent)).toEqual([
      'Apple',
      'Banana',
      'Cherry',
      'Off'
    ])
    expect(new Set(options.map((el) => el.id)).size).toBe(4)
    expect(options.map((el) => el.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
      'false'
    ])
    expect(options.map((el) => el.getAttribute('aria-disabled'))).toEqual([
      'false',
      'false',
      'false',
      'true'
    ])
    expect(options.map((el) => el.tabIndex)).toEqual([-1, -1, -1, -1])
  })

  it('groups are named by their title, which is not an option', () => {
    const { qa } = setup({ options: grouped })
    expect(qa('.msl-grp-title').map((el) => el.getAttribute('role'))).toEqual([
      'presentation',
      'presentation'
    ])
    expect(qa('[role="option"]').map((el) => el.textContent)).toEqual([
      'Apple',
      'Banana',
      'Cherry'
    ])
    const groups = qa('[role="group"]')
    expect(
      groups.map(
        (el) =>
          document.getElementById(el.getAttribute('aria-labelledby')!)!
            .textContent
      )
    ).toEqual(['Group A', 'Group B'])
    // Group B nests in Group A
    expect(groups[1].parentElement!.closest('[role="group"]')).toBe(groups[0])
    expect(
      [...groups[0].querySelectorAll('[role="option"]')].map(
        (el) => el.textContent
      )
    ).toEqual(['Banana', 'Cherry'])
  })

  it('each instance gets its own ids', () => {
    const { container } = render(
      <>
        <MultiSelect options={opts} />
        <MultiSelect options={opts} />
      </>
    )
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id)
    expect(ids).toHaveLength(8)
    expect(new Set(ids).size).toBe(8)
  })

  it('the down arrow is decorative but still toggles on click', () => {
    const { q, isOpen } = setup()
    const arrow = q('.msl-arrow-btn')
    expect(arrow.getAttribute('aria-hidden')).toBe('true')
    expect(arrow.hasAttribute('role')).toBe(false)
    expect(arrow.hasAttribute('tabindex')).toBe(false)
    fireEvent.click(arrow)
    expect(isOpen()).toBe(true)
  })
})

describe('keyboard', () => {
  const withDisabled = [
    { label: 'Off A', value: 'offa', disabled: true },
    ...opts.slice(0, 1),
    { label: 'Off B', value: 'offb', disabled: true },
    ...opts.slice(1),
    { label: 'Off C', value: 'offc', disabled: true }
  ]

  function setupKeys(props: MultiSelectProps = {}) {
    const utils = setup(props)
    return {
      ...utils,
      focusedOption: () => utils.q('.msl-option-focused')?.textContent,
      activeId: (el: Element = utils.input()) =>
        el.getAttribute('aria-activedescendant')
    }
  }

  it('arrows, Home and End open the menu and move over enabled options', () => {
    const { input, option, isOpen, onMenuOpen, focusedOption, activeId, qa } =
      setupKeys({ options: withDisabled })
    const walk = (key: string) => {
      expect(press(input(), key)).toBe(false)
      return focusedOption()
    }
    expect(walk('ArrowDown')).toBe('Apple')
    expect(isOpen()).toBe(true)
    expect(activeId()).toBe(option('Apple').id)
    expect(
      [
        'ArrowDown',
        'ArrowDown',
        'ArrowDown',
        'ArrowUp',
        'ArrowUp',
        'ArrowUp'
      ].map(walk)
    ).toEqual(['Banana', 'Cherry', 'Cherry', 'Banana', 'Apple', 'Apple'])
    expect(walk('End')).toBe('Cherry')
    expect(activeId()).toBe(option('Cherry').id)
    expect(walk('Home')).toBe('Apple')
    expect(qa('.msl-option-focused')).toHaveLength(1)
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['ArrowUp', 'Cherry'],
    ['ArrowDown', 'Apple'],
    ['Home', 'Apple'],
    ['End', 'Cherry']
  ])('%s with nothing highlighted goes to %s', (key, text) => {
    const { input, focusedOption } = setupKeys({ options: withDisabled })
    press(input(), key)
    expect(focusedOption()).toBe(text)
  })

  it('does nothing without enabled options', () => {
    const { input, isOpen, focusedOption } = setupKeys({
      options: [{ label: 'Off', value: 'off', disabled: true }]
    })
    press(input(), 'ArrowDown')
    expect(isOpen()).toBe(true)
    expect(focusedOption()).toBeUndefined()
  })

  it('arrows step over options that share a value', () => {
    const { input, activeId, qa } = setupKeys({
      options: [
        { title: 'Recent', type: 'group', childs: opts.slice(0, 1) },
        { title: 'All', type: 'group', childs: opts }
      ]
    })
    const ids = qa('[role="option"]').map((el) => el.id)
    const walk = (key: string) => {
      press(input(), key)
      return ids.indexOf(activeId()!)
    }
    expect(
      [
        'ArrowDown',
        'ArrowDown',
        'ArrowDown',
        'ArrowDown',
        'ArrowUp',
        'ArrowUp',
        'ArrowUp'
      ].map(walk)
    ).toEqual([0, 1, 2, 3, 2, 1, 0])
  })

  it('Home and End move the caret once there is search text', () => {
    const { input, focusedOption } = setupKeys()
    type(input(), 'an')
    expect(press(input(), 'Home')).toBe(true)
    expect(press(input(), 'End')).toBe(true)
    expect(focusedOption()).toBeUndefined()
    expect(press(input(), 'ArrowDown')).toBe(false)
    expect(focusedOption()).toBe('Banana')
  })

  it('a keyboard clear or deleting the last chip keeps focus in the widget', () => {
    const { q, qa, input, chips, rerender, onChange } = setupKeys({
      defaultValue: ['apple', 'banana']
    })
    qa('.msl-chip-delete')[0].focus()
    press(qa('.msl-chip-delete')[0], 'Enter')
    expect(chips()).toEqual(['Banana'])
    // index keys: the focused button now deletes Banana
    expect(document.activeElement).toBe(qa('.msl-chip-delete')[0])
    press(qa('.msl-chip-delete')[0], 'Enter')
    expect(chips()).toEqual([])
    expect(document.activeElement).toBe(input())
    rerender(
      <MultiSelect
        key='b'
        options={opts}
        onChange={onChange}
        defaultValue={['cherry']}
      />
    )
    q('.msl-clear-btn').focus()
    press(q('.msl-clear-btn'), 'Enter')
    expect(document.activeElement).toBe(input())
    rerender(
      <MultiSelect
        key='c'
        options={opts}
        onChange={onChange}
        singleSelect
        defaultValue={['apple']}
      />
    )
    q('.msl-clear-btn').focus()
    press(q('.msl-clear-btn'), ' ')
    // the search field only comes back on the next render
    expect(document.activeElement).toBe(q('.msl-wrp'))
  })

  it('closing and typing reset the highlight', () => {
    const { input, isOpen, focusedOption, activeId } = setupKeys()
    press(input(), 'ArrowDown')
    press(input(), 'ArrowDown')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(isOpen()).toBe(false)
    expect(focusedOption()).toBeUndefined()
    expect(activeId()).toBeNull()
    press(input(), 'ArrowDown')
    expect(focusedOption()).toBe('Apple')
    fireEvent.input(input())
    expect(focusedOption()).toBeUndefined()
  })

  it('Enter toggles the highlighted option and keeps it highlighted', () => {
    const { input, chips, isOpen, focusedOption, onChange } = setupKeys()
    press(input(), 'ArrowDown')
    press(input(), 'ArrowDown')
    expect(press(input(), 'Enter')).toBe(false)
    expect(chips()).toEqual(['Banana'])
    expect(isOpen()).toBe(true)
    expect(focusedOption()).toBe('Banana')
    press(input(), 'Enter')
    expect(chips()).toEqual([])
    expect(values(onChange)).toEqual([['banana'], []])
  })

  it('Enter on a highlighted search result picks it once', () => {
    const { input, chips, optionTexts, focusedOption } = setupKeys()
    type(input(), 'an')
    press(input(), 'ArrowDown')
    expect(focusedOption()).toBe('Banana')
    press(input(), 'Enter')
    fireEvent.keyUp(input(), { key: 'Enter' })
    expect(chips()).toEqual(['Banana'])
    expect(input().value).toBe('')
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  it('Enter on a highlighted Create item creates the value', () => {
    const { input, chips, onChange } = setupKeys({ customValue: true })
    type(input(), 'kiwi')
    press(input(), 'ArrowDown')
    press(input(), 'Enter')
    expect(chips()).toEqual(['kiwi'])
    expect(values(onChange)).toEqual([['kiwi']])
  })

  it.each([{ singleSelect: true }, { disableChip: true }])(
    'with %o Enter picks and moves focus to the wrapper, as the search field goes away',
    (props) => {
      const { root, input, single } = setupKeys(props)
      input().focus()
      press(input(), 'ArrowDown')
      press(input(), 'Enter')
      expect(single()).toBe('Apple')
      expect(input()).toBeNull()
      expect(document.activeElement).toBe(root)
    }
  )

  it('the wrapper drives the highlight when there is no search field', () => {
    const { root, chips, focusedOption, activeId } = setupKeys({
      disableSearch: true
    })
    press(root, 'ArrowDown')
    expect(focusedOption()).toBe('Apple')
    expect(activeId(root)).toBe(root.querySelector('.msl-option-focused')!.id)
    press(root, 'Enter')
    expect(chips()).toEqual(['Apple'])
  })

  it('Enter on a focused option picks that option only', () => {
    const { input, option, chips } = setupKeys()
    press(input(), 'ArrowDown')
    press(option('Cherry'), 'Enter')
    expect(chips()).toEqual(['Cherry'])
  })

  it('Backspace in an empty search field removes the last chip', () => {
    const { root, input, chips, onChange } = setupKeys({
      defaultValue: ['apple', 'banana']
    })
    input().value = 'x'
    press(input(), 'Backspace')
    expect(chips()).toEqual(['Apple', 'Banana'])
    input().value = ''
    press(root, 'Backspace')
    expect(chips()).toEqual(['Apple', 'Banana'])
    press(input(), 'Backspace')
    expect(chips()).toEqual(['Apple'])
    press(input(), 'Backspace')
    press(input(), 'Backspace')
    expect(chips()).toEqual([])
    expect(values(onChange)).toEqual([['apple'], []])
  })

  it.each(['a', ',', 'Enter', ' '])('%s opens the menu', (key) => {
    const { root, isOpen, onMenuOpen } = setupKeys()
    press(root, key)
    expect(isOpen()).toBe(true)
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['Tab', {}],
    ['Shift', {}],
    ['Escape', {}],
    ['c', { ctrlKey: true }],
    ['v', { metaKey: true }]
  ])('%s %o does not open the menu', (key, init) => {
    const { root, input, isOpen } = setupKeys()
    press(root, key, init)
    press(input(), key, init)
    expect(isOpen()).toBe(false)
  })

  it('Space types in the search field but does not scroll from the wrapper', () => {
    const { root, input } = setupKeys()
    expect(press(input(), ' ')).toBe(true)
    expect(press(root, ' ')).toBe(false)
  })

  it('Enter adds no line break to the search field', () => {
    const { root, input } = setupKeys()
    expect(press(input())).toBe(false)
    expect(press(root)).toBe(false)
  })

  it('keys on a chip or the clear button do not drive the menu', () => {
    const { q, isOpen, focusedOption } = setupKeys({ defaultValue: ['apple'] })
    press(q('.msl-chip-delete'), 'ArrowDown')
    press(q('.msl-clear-btn'), 'a')
    press(q('.msl-chip'), 'Backspace')
    expect(isOpen()).toBe(false)
    expect(focusedOption()).toBeUndefined()
  })

  it('attr.onKeyDown still runs', () => {
    const onKeyDown = vi.fn()
    const { root, isOpen } = setupKeys({ attr: { onKeyDown } })
    press(root, 'a')
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(isOpen()).toBe(true)
    cleanup()
    const other = setupKeys({ attr: { id: 'x' } })
    press(other.root, 'a')
    expect(other.isOpen()).toBe(true)
  })

  it('scrolls the highlighted option into view', () => {
    expect(Element.prototype.scrollIntoView).toBeUndefined() // jsdom
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    try {
      const { input, option } = setupKeys()
      press(input(), 'ArrowDown')
      press(input(), 'ArrowDown')
      expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' })
      expect(scroll.mock.contexts.at(-1)).toBe(option('Banana'))
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView
    }
  })
})
