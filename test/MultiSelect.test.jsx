// Characterization tests: they pin the CURRENT behavior of v2.0.6, quirks included.
// Tests named "current behavior: ..." document known bugs; a fix should update them on purpose.
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import MultiSelect from '../src/MultiSelect.jsx'

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

function setup(props = {}) {
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
  const q = (s) => c.querySelector(s)
  const qa = (s) => [...c.querySelectorAll(s)]
  return {
    ...utils,
    onChange,
    onMenuOpen,
    onMenuClose,
    q,
    qa,
    root: c.firstChild,
    input: () => q('.msl-input[contenteditable="true"]'),
    chips: () => qa('.msl-chip').map((el) => el.textContent),
    single: () => q('.msl-single-value')?.textContent,
    optionTexts: () =>
      qa('.msl-options .msl-option').map((el) => el.textContent),
    groupTitles: () => qa('.msl-grp-title').map((el) => el.textContent),
    option: (text) => qa('.msl-option').find((el) => el.textContent === text),
    isOpen: () => /msl-active/.test(q('.msl').className),
    hidden: () => q('input[type="hidden"]')
  }
}

const type = (el, text, key = text.slice(-1)) => {
  el.textContent = text
  fireEvent.keyUp(el, { key })
}
const press = (el, key = 'Enter', charCode = 13) =>
  fireEvent.keyPress(el, { key, charCode })

describe('render', () => {
  it('renders with no props at all', () => {
    const { container } = render(<MultiSelect />)
    const root = container.firstChild
    expect(root.getAttribute('class')).toBe('msl-wrp msl-vars undefined ')
    expect(root.getAttribute('tabindex')).toBe('0')
    expect(container.querySelector('.msl').getAttribute('class')).toBe(
      'msl false '
    )
    const hidden = container.querySelector('input[type="hidden"]')
    expect(hidden.name).toBe('')
    expect(hidden.value).toBe('')
    const input = container.querySelector('.msl-input')
    expect(input.getAttribute('data-placeholder')).toBe('Select...')
    expect(input.getAttribute('contenteditable')).toBe('true')
    const empty = container.querySelector('.msl-option')
    expect(empty.textContent).toBe('Empty')
    expect(empty.className).toContain('msl-option-disable')
    expect(empty.style.textAlign).toBe('center')
    expect(container.querySelector('.msl-arrow-btn')).not.toBeNull()
    expect(container.querySelector('.msl-clear-btn')).toBeNull()
  })

  it('default callbacks are safe no-ops', () => {
    const { container } = render(<MultiSelect options={opts} />)
    const root = container.firstChild
    fireEvent.click(root)
    fireEvent.click(container.querySelector('.msl-option'))
    expect(container.querySelector('.msl-chip').textContent).toBe('Apple')
    fireEvent.click(container.querySelector('.msl-arrow-btn'))
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
    expect(input().getAttribute('data-placeholder')).toBe('Pick one')
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
      defaultValue: 'apple',
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
  it('parses a comma separated string in the given order', () => {
    const { chips, hidden, onChange } = setup({ defaultValue: 'cherry,apple' })
    expect(chips()).toEqual(['Cherry', 'Apple'])
    expect(hidden().value).toBe('cherry,apple')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('drops unknown values without customValue', () => {
    expect(setup({ defaultValue: 'apple,zzz' }).chips()).toEqual(['Apple'])
    cleanup()
    expect(
      setup({ defaultValue: [{ value: 'zzz' }, 'banana'] }).chips()
    ).toEqual(['Banana'])
  })

  it('accepts an array of strings', () => {
    expect(setup({ defaultValue: ['banana'] }).chips()).toEqual(['Banana'])
  })

  it('accepts an array of objects, taking labels from options', () => {
    const { chips } = setup({
      defaultValue: [{ value: 'cherry' }, { label: 'Other', value: 'apple' }]
    })
    expect(chips()).toEqual(['Cherry', 'Apple'])
  })

  it('ignores items that are neither string nor object', () => {
    expect(setup({ defaultValue: [42, 'apple'] }).chips()).toEqual(['Apple'])
  })

  it('creates a Custom Values group for unknown strings with customValue', () => {
    const { chips, groupTitles, optionTexts } = setup({
      defaultValue: 'apple,zzz',
      customValue: true
    })
    expect(chips()).toEqual(['Apple', 'zzz'])
    expect(groupTitles()).toEqual(['Custom Values'])
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'zzz'])
  })

  it('labels unknown objects by label, then title', () => {
    const { chips } = setup({
      defaultValue: [
        { label: 'Lbl', value: 'v1' },
        { title: 'Ttl', value: 'v2' }
      ],
      customValue: true
    })
    expect(chips()).toEqual(['Lbl', 'Ttl'])
  })

  it('current behavior: unknown object without label/title becomes its own label', () => {
    const { single, hidden } = setup({
      defaultValue: [{ value: 'a' }, { value: 'b' }],
      customValue: true,
      disableChip: true,
      largeData: true // rendering that label would throw
    })
    expect(single()).toBe('2 Item Selected')
    expect(hidden().value).toBe('[object Object],[object Object]')
  })

  it('keeps only the first value in singleSelect', () => {
    const { single, chips, q } = setup({
      defaultValue: 'banana,apple',
      singleSelect: true
    })
    expect(single()).toBe('Banana')
    expect(chips()).toEqual([])
    expect(q('.msl-input')).toBeNull()
  })

  it('re-syncs when the prop changes, without firing onChange', () => {
    const { rerender, chips, onChange } = setup({ defaultValue: 'apple' })
    rerender(
      <MultiSelect
        options={opts}
        onChange={onChange}
        defaultValue='banana,cherry'
      />
    )
    expect(chips()).toEqual(['Banana', 'Cherry'])
    rerender(<MultiSelect options={opts} onChange={onChange} defaultValue='' />)
    expect(chips()).toEqual([])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('current behavior: adding a custom value via prop drops the Custom Values group', () => {
    const { rerender, chips, groupTitles } = setup({
      defaultValue: 'zzz',
      customValue: true
    })
    expect(groupTitles()).toEqual(['Custom Values'])
    rerender(<MultiSelect options={opts} defaultValue='zzz,yyy' customValue />)
    expect(chips()).toEqual(['zzz', 'yyy'])
    expect(groupTitles()).toEqual([])
  })

  it('warns for JSX labels without title and shows value in the chip', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { chips } = setup({
      options: [{ label: <b>Bold</b>, value: 'bold' }],
      defaultValue: 'bold'
    })
    expect(chips()).toEqual(['bold'])
    expect(warn).toHaveBeenCalledWith(
      '[multiselect] you must provide a title property as typeof string, if you want to render jsx in option label'
    )
  })

  it('shows title in the chip for JSX labels with title', () => {
    const { chips } = setup({
      options: [{ label: <b>Bold</b>, value: 'bold', title: 'Bold title' }],
      defaultValue: 'bold'
    })
    expect(chips()).toEqual(['Bold title'])
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

  it('current behavior: falsy options render an empty menu without the empty label', () => {
    const { q, input } = setup({ options: false })
    expect(q('.msl-options').textContent).toBe('')
    type(input(), 'a')
    expect(q('.msl-options').textContent).toBe('No Data Found')
  })

  it('renders groups, nested groups and empty groups', () => {
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
  })

  it('applies option style, classes, title and value attributes', () => {
    const { option } = setup({
      options: [
        {
          label: 'Styled',
          value: 's',
          style: { color: 'blue' },
          classes: 'x y'
        },
        { label: <b>Jsx</b>, value: 'j', title: 'Jsx title' }
      ]
    })
    const styled = option('Styled')
    expect(styled.style.color).toBe('blue')
    expect(styled.getAttribute('class')).toBe('msl-option   x y')
    expect(styled.getAttribute('title')).toBe('Styled')
    expect(styled.getAttribute('value')).toBe('s')
    expect(option('Jsx').getAttribute('title')).toBe('Jsx title')
    expect(option('Jsx').getAttribute('class')).toBe('msl-option   ')
  })

  it('renders options only while open with largeData', () => {
    const { root, optionTexts } = setup({ largeData: true })
    expect(optionTexts()).toEqual([])
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })
})

describe('selecting (multi)', () => {
  it('toggles options and reports a comma joined string', () => {
    const { option, chips, onChange } = setup()
    fireEvent.click(option('Apple'))
    fireEvent.click(option('Banana'))
    expect(chips()).toEqual(['Apple', 'Banana'])
    expect(option('Apple').className).toContain('msl-option-active')
    fireEvent.click(option('Apple'))
    expect(chips()).toEqual(['Banana'])
    expect(onChange.mock.calls).toEqual([
      ['apple'],
      ['apple,banana'],
      ['banana']
    ])
  })

  it('reports option objects with jsonValue', () => {
    const { option, onChange } = setup({ jsonValue: true })
    fireEvent.click(option('Apple'))
    expect(onChange).toHaveBeenLastCalledWith([opts[0]])
  })

  it('respects limit, still firing onChange when blocked', () => {
    const { option, chips, onChange } = setup({ limit: 2 })
    fireEvent.click(option('Apple'))
    fireEvent.click(option('Banana'))
    fireEvent.click(option('Cherry'))
    expect(chips()).toEqual(['Apple', 'Banana'])
    expect(onChange.mock.calls).toEqual([
      ['apple'],
      ['apple,banana'],
      ['apple,banana']
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
    press(option('Apple'), 'a', 97)
    expect(chips()).toEqual([])
    press(option('Apple'))
    expect(chips()).toEqual(['Apple'])
  })

  it('deletes a chip by click or any keypress without opening the menu', () => {
    const { qa, chips, onChange, isOpen } = setup({
      defaultValue: 'apple,banana,cherry'
    })
    fireEvent.click(qa('.msl-chip-delete')[1])
    expect(chips()).toEqual(['Apple', 'Cherry'])
    press(qa('.msl-chip-delete')[0], 'x', 120)
    expect(chips()).toEqual(['Cherry'])
    expect(onChange.mock.calls).toEqual([['apple,cherry'], ['cherry']])
    expect(isOpen()).toBe(false)
  })

  it('clears everything by click or any keypress without opening the menu', () => {
    const { q, chips, onChange, isOpen, rerender } = setup({
      defaultValue: 'apple,banana'
    })
    const clear = q('.msl-clear-btn')
    expect(clear.getAttribute('aria-label')).toBe('close-menu')
    fireEvent.click(clear)
    expect(chips()).toEqual([])
    expect(q('.msl-clear-btn')).toBeNull()
    expect(isOpen()).toBe(false)
    rerender(
      <MultiSelect options={opts} onChange={onChange} defaultValue='cherry' />
    )
    press(q('.msl-clear-btn'), 'x', 120)
    expect(chips()).toEqual([])
    expect(onChange.mock.calls).toEqual([[''], ['']])
  })

  it('has no clear button when clearable is false', () => {
    expect(
      setup({ defaultValue: 'apple', clearable: false }).q('.msl-clear-btn')
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
    expect(onChange.mock.calls).toEqual([['apple'], ['banana'], ['']])
  })

  it('current behavior: menu stays open after select when uncontrolled', () => {
    const { root, option, isOpen } = setup({ singleSelect: true })
    fireEvent.click(root)
    fireEvent.click(option('Apple'))
    expect(isOpen()).toBe(true)
  })

  function Controlled(props) {
    const [value, setValue] = useState('')
    return (
      <MultiSelect
        options={opts}
        singleSelect
        defaultValue={value}
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
      fireEvent.click(container.firstChild)
      fireEvent.click(container.querySelector('.msl-option'))
      expect(container.querySelector('.msl-single-value').textContent).toBe(
        'Apple'
      )
      expect(/msl-active/.test(container.querySelector('.msl').className)).toBe(
        open
      )
    }
  )

  it('opens without a search input to focus', () => {
    const { root, isOpen, onMenuOpen } = setup({
      singleSelect: true,
      defaultValue: 'apple'
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
        defaultValue: 'apple,banana',
        chipAlternateText: 'picked'
      }).single()
    ).toBe('2 picked')
  })

  it('shows title, else value, for a single JSX label', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const options = [
      { label: <b>A</b>, value: 'a', title: 'A title' },
      { label: <b>B</b>, value: 'b' }
    ]
    expect(
      setup({ disableChip: true, options, defaultValue: 'a' }).single()
    ).toBe('A title')
    cleanup()
    expect(
      setup({ singleSelect: true, options, defaultValue: 'b' }).single()
    ).toBe('b')
  })

  it('disableSearch keeps a static placeholder until a value exists', () => {
    const { input, q, option } = setup({ disableSearch: true })
    expect(input()).toBeNull()
    expect(q('.msl-input').getAttribute('data-placeholder')).toBe('Select...')
    fireEvent.click(option('Apple'))
    expect(q('.msl-input')).toBeNull()
  })

  it('current behavior: disabled still opens from the keyboard', () => {
    const { root, q, isOpen, onMenuOpen } = setup({ disabled: true })
    expect(root.className).toContain('msl-disabled')
    expect(q('.msl-input').getAttribute('contenteditable')).toBe('false')
    press(root)
    expect(isOpen()).toBe(true)
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
  })
})

describe('search', () => {
  it('filters by label, case-insensitive', () => {
    const { input, optionTexts } = setup()
    type(input(), 'AN')
    expect(optionTexts()).toEqual(['Banana'])
  })

  it('lists label matches before value-only matches', () => {
    const { input, optionTexts } = setup({
      options: [
        { label: 'Blue', value: 'red_blue' },
        { label: 'Red', value: 'r' }
      ]
    })
    type(input(), 'red')
    expect(optionTexts()).toEqual(['Red', 'Blue'])
  })

  it('searches nested groups and flattens results', () => {
    const { input, optionTexts, groupTitles } = setup({ options: grouped })
    type(input(), 'e')
    expect(optionTexts()).toEqual(['Apple', 'Cherry'])
    expect(groupTitles()).toEqual([])
  })

  it('matches JSX labels by title, or by value when title is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { input, qa } = setup({
      options: [
        { label: <b>X</b>, value: 'x1', title: 'Xylophone' },
        { label: <b>Y</b>, value: 'yak' }
      ]
    })
    const titles = () => qa('.msl-option').map((el) => el.getAttribute('value'))
    type(input(), 'xylo')
    expect(titles()).toEqual(['x1'])
    type(input(), 'yak')
    expect(titles()).toEqual(['yak'])
    expect(warn).toHaveBeenCalled()
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

  it('current behavior: regex characters are not escaped', () => {
    const { input, optionTexts } = setup()
    type(input(), '.')
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  it.each(['Enter', ','])(
    '%s picks the first result and resets the search',
    (key) => {
      const { input, chips, optionTexts } = setup()
      type(input(), 'ch')
      type(input(), 'ch', key)
      expect(chips()).toEqual(['Cherry'])
      expect(input().innerHTML).toBe('')
      expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
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

  it('current behavior: Enter creates the value but keeps the Create label', () => {
    const { input, chips, onChange, groupTitles, optionTexts, option } = setup({
      customValue: true
    })
    type(input(), 'kiwi')
    type(input(), 'kiwi', 'Enter')
    expect(chips()).toEqual(['Create "kiwi"'])
    expect(onChange).toHaveBeenLastCalledWith('kiwi')
    expect(groupTitles()).toEqual(['Custom Values'])
    expect(option('kiwi').className).toContain('msl-option-active')

    type(input(), 'lime')
    type(input(), 'lime', ',')
    expect(chips()).toEqual(['Create "kiwi"', 'Create "lime"'])
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'kiwi', 'lime'])
  })

  it('current behavior: jsonValue receives the Create label', () => {
    const { input, onChange } = setup({ customValue: true, jsonValue: true })
    type(input(), 'kiwi')
    type(input(), 'kiwi', 'Enter')
    expect(onChange).toHaveBeenLastCalledWith([
      { label: 'Create "kiwi"', value: 'kiwi' }
    ])
  })

  it('current behavior: clicking Create skips the Custom Values group; Enter again toggles it off', () => {
    const { input, option, chips, groupTitles, onChange } = setup({
      customValue: true
    })
    type(input(), 'kiwi')
    fireEvent.click(option('Create "kiwi"'))
    expect(chips()).toEqual(['Create "kiwi"'])
    expect(groupTitles()).toEqual([])
    type(input(), 'kiwi')
    type(input(), 'kiwi', 'Enter')
    expect(chips()).toEqual([])
    expect(onChange.mock.calls).toEqual([['kiwi'], ['']])
  })

  it('current behavior: Enter with a partial match picks the match, not a new value', () => {
    const { input, chips } = setup({ customValue: true })
    type(input(), 'app')
    type(input(), 'app', 'Enter')
    expect(chips()).toEqual(['Apple'])
  })

  it('current behavior: all double quotes are stripped from the custom label', () => {
    const { input, option } = setup({ customValue: true })
    type(input(), 'say "hi"')
    type(input(), 'say "hi"', 'Enter')
    expect(option('say hi').getAttribute('value')).toBe('say "hi"')
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

  it('opens upward near the bottom of the viewport', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(100)
    const { root, q } = setup()
    fireEvent.click(root)
    expect(q('.msl').getAttribute('class')).toBe('msl msl-active-up ')
  })

  it('current behavior: every click and keypress inside fires onMenuOpen again', () => {
    const { root, option, input, onMenuOpen } = setup()
    fireEvent.click(root)
    fireEvent.click(option('Apple'))
    press(input(), 'a', 97)
    expect(onMenuOpen).toHaveBeenCalledTimes(3)
  })

  it.each([
    ['button', (q) => q('.msl-arrow-btn')],
    ['svg', (q) => q('.msl-arrow-icn')],
    ['line', (q) => q('.msl-arrow-icn line')]
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
    ['chip', (q) => q('.msl-chip')],
    ['chip delete svg', (q) => q('.msl-chip-delete svg')],
    ['chip delete line', (q) => q('.msl-chip-delete line')],
    ['deep custom close icon', (q) => q('.deep')]
  ])('clicking %s does not open the menu', (_, get) => {
    const { q, isOpen } = setup({
      defaultValue: 'apple,banana',
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

  it('closes on outside click and Escape', () => {
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
    expect(onMenuClose).toHaveBeenCalledTimes(1) // current behavior: Escape skips onMenuClose
  })

  it('current behavior: outside click fires onMenuClose once even if never opened, then unbinds until re-render', () => {
    const { onMenuClose, rerender } = setup()
    fireEvent.click(document.body)
    fireEvent.click(document.body)
    expect(onMenuClose).toHaveBeenCalledTimes(1)
    rerender(
      <MultiSelect options={opts} onMenuClose={onMenuClose} placeholder='x' />
    )
    fireEvent.click(document.body)
    expect(onMenuClose).toHaveBeenCalledTimes(2)
  })

  it('stops listening after unmount', () => {
    const { unmount, onMenuClose } = setup()
    unmount()
    fireEvent.click(document.body)
    expect(onMenuClose).not.toHaveBeenCalled()
  })
})

describe('clearAll', () => {
  it('clears when it turns true and there is a value', () => {
    const { rerender, chips, onChange } = setup({ defaultValue: 'apple' })
    rerender(
      <MultiSelect
        options={opts}
        onChange={onChange}
        defaultValue='apple'
        clearAll
      />
    )
    expect(chips()).toEqual([])
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('does nothing without a value', () => {
    const { rerender, onChange } = setup()
    rerender(<MultiSelect options={opts} onChange={onChange} clearAll />)
    expect(onChange).not.toHaveBeenCalled()
  })
})
