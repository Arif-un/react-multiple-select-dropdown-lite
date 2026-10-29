// Characterization tests: they pin the current behavior, quirks included.
// Tests named "current behavior: ..." document known bugs; a fix should update them on purpose.
import {
  memo,
  startTransition,
  StrictMode,
  Suspense,
  useEffect,
  useRef,
  useState
} from 'react'
import type { ComponentProps } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { renderToString } from 'react-dom/server'
import { jsx } from 'react/jsx-runtime'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type {
  MultiSelectChipProps,
  MultiSelectGroup,
  MultiSelectGroupTitleProps,
  MultiSelectLabelMeta,
  MultiSelectListProps,
  MultiSelectLoaded,
  MultiSelectLoader,
  MultiSelectLoadRequest,
  MultiSelectMenuProps,
  MultiSelectOption,
  MultiSelectProps
} from '../src/index'
import MultiSelect from '../src/MultiSelect'

// jsdom has no IntersectionObserver: this one reports what a test passes, oldest first, to `seen` for the dropdown,
// and to `inView` for another element it observes, as long as it does
type Report = (...visible: boolean[]) => void
let seen: Report = () => {}
const watched = new Map<Element, Report>()
const inView = (el: Element, ...visible: boolean[]) =>
  act(() => watched.get(el)?.(...visible))
globalThis.IntersectionObserver = class {
  els: Element[] = []
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    const report: Report = (...visible) =>
      this.cb(
        visible.map(
          (v) => ({ isIntersecting: v }) as IntersectionObserverEntry
        ),
        this as unknown as IntersectionObserver
      )
    this.els.push(el)
    el.matches('.msl-wrp') ? (seen = report) : watched.set(el, report)
  }
  disconnect() {
    this.els.forEach((el) => watched.delete(el))
  }
} as unknown as typeof IntersectionObserver

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// the open menu: the control with the options, in a popover over the wrapper
const box = () => document.querySelector<HTMLElement>('.msl[data-open]')
// the popover around it: unstyled, placed over the wrapper
const pop = () => box()!.parentElement!

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
  const root = c.firstChild as HTMLElement
  // options exist only while open
  const menu = (s: string) => {
    box() || fireEvent.click(root)
    return qa(s)
  }
  return {
    ...utils,
    onChange,
    onMenuOpen,
    onMenuClose,
    q,
    qa,
    root,
    input: () => q<HTMLInputElement>('input.msl-input:enabled'),
    chips: () => qa('.msl-chip').map((el) => el.textContent),
    single: () => q('.msl-single-value')?.textContent,
    optionTexts: () =>
      menu('.msl-options .msl-option').map((el) => el.textContent),
    groupTitles: () => menu('.msl-grp-title').map((el) => el.textContent),
    option: (text: string) =>
      menu('.msl-option').find((el) => el.textContent === text)!,
    isOpen: () => !!box(),
    hidden: () => c.querySelector<HTMLInputElement>('input[type="hidden"]')!
  }
}

type Q = ReturnType<typeof setup>['q']

// the text reaches the search field, then the key: it opens the menu, Enter or a comma picks
const type = (el: Element, text: string, key = text.slice(-1)) => {
  fireEvent.change(el, { target: { value: text } })
  fireEvent.keyDown(el, { key })
}
// returns false when the default action was prevented
const press = (el: Element, key = 'Enter', init = {}) =>
  fireEvent.keyDown(el, { key, ...init })
// highlights the first option in the open menu and picks it
const pickByKey = () => {
  const field = box()!.querySelector('input')!
  press(field, 'ArrowDown')
  press(field)
}
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
    // no menu until it opens
    expect(document.querySelector('.msl-options')).toBeNull()
    fireEvent.click(root)
    const empty = box()!.querySelector('.msl-option')!
    expect(empty.textContent).toBe('No Data Found')
    expect(empty.className).toContain('msl-option-disable')
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
    // jsx(), the runtime React 19 skips defaultProps in, whatever this file's JSX compiles to
    const { container, rerender } = render(jsx(MultiSelect, {}))
    const q = (s: string) => container.querySelector(s)!
    expect(q('.msl-input').getAttribute('placeholder')).toBe('Select...')
    fireEvent.click(container.firstChild!)
    expect(q('.msl-option').textContent).toBe('No Data Found')
    rerender(jsx(MultiSelect, { options: opts }))
    box()!
      .querySelectorAll('.msl-option')
      .forEach((el) => {
        fireEvent.click(el)
      })
    expect(
      container.querySelector('input[type="hidden"]')!.getAttribute('value')
    ).toBe('apple,banana,cherry')
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
    // all for the wrapper: the open menu stays in it, with no class or id of its own
    fireEvent.click(root)
    expect(root.contains(pop())).toBe(true)
    expect(pop().hasAttribute('class')).toBe(false)
    expect(document.querySelectorAll('#ms')).toHaveLength(1)
  })

  it('adds classNames to each element, for utility CSS like Tailwind', () => {
    const parts = {
      control: '.msl',
      values: '.msl-input-wrp',
      input: '.msl-input',
      singleValue: '.msl-single-value',
      chip: '.msl-chip',
      chipDelete: '.msl-chip-delete',
      actions: '.msl-actions',
      clearButton: '.msl-clear-btn',
      arrowButton: '.msl-arrow-btn',
      menu: '.msl-options',
      group: '[role="group"]',
      groupTitle: '.msl-grp-title',
      groupBody: '.msl-grp-body',
      groupIcon: '.msl-grp-title .msl-expand-icn',
      option: '[role="option"]',
      submenuIcon: '.msl-option .msl-expand-icn',
      empty: '.msl-option-disable:not([role])'
    }
    const classNames = Object.fromEntries(
      Object.keys(parts).map((k) => [k, `tw-${k}`])
    )
    const has = (el: Element | null, k: string) =>
      expect(el?.getAttribute('class')).toMatch(new RegExp(`(^| )tw-${k}$`))
    // it has an empty group: React's once-per-file missing key warning would show here
    const error = vi.spyOn(console, 'error')
    const { root, unmount } = setup({
      classNames,
      defaultValue: ['apple'],
      options: [
        ...opts,
        { type: 'group', title: 'G', childs: [{ label: 'Kiwi', value: 'k' }] },
        { type: 'group', title: 'None', childs: [] },
        { type: 'group', title: 'C', collapsible: true, childs: [] },
        { type: 'submenu', title: 'S', childs: [] }
      ]
    })
    fireEvent.click(root)
    for (const [k, sel] of Object.entries(parts))
      k !== 'singleValue' && has(root.querySelector(sel), k)
    unmount()
    const single = setup({
      classNames,
      singleSelect: true,
      defaultValue: ['apple']
    })
    has(single.q('.msl-single-value'), 'singleValue')
    single.unmount()
    // no options at all
    const none = setup({ classNames, options: [] })
    fireEvent.click(none.root)
    has(none.root.querySelector(parts.empty), 'empty')
    none.unmount()
    // custom chips get them too, to style their parts alike
    const customChip = vi.fn(() => null)
    setup({ classNames, customChip, defaultValue: ['apple'] })
    expect(customChip).toHaveBeenCalledWith(
      expect.objectContaining({ classNames })
    )
    expect(error).not.toHaveBeenCalled()
  })

  it("leaves layout to the CSS: inline styles only keep the wrapper's height and place the open menu", () => {
    const { root, q, rerender } = setup({
      defaultValue: ['apple'],
      style: { color: 'red' }
    })
    const styled = (el: Element) =>
      [...el.querySelectorAll('[style]')].filter(
        (el) => el.getAttribute('style') !== 'display: contents;'
      )
    expect(root.getAttribute('style')).toBe('color: red;')
    expect(styled(root)).toEqual([])
    fireEvent.click(root)
    expect(q('.msl').className).toContain('msl-active')
    // the open menu left the flow: the wrapper keeps the control's height
    expect(root.getAttribute('style')).toBe('color: red; min-height: 0px;')
    const { position, left, width, top, margin, color, overflow } = pop().style
    expect([position, left, width, top]).toEqual([
      // page coordinates: it scrolls with the page
      'absolute',
      '0px',
      '0px',
      '0px'
    ])
    // the UA's popover look undone: no box of its own, the text look inherited
    expect([margin, color, overflow]).toEqual(['0px', 'inherit', 'visible'])
    // on the listbox, its one reader: registered non-inherited, a change restyles no option
    const menu = q('.msl-options')
    expect(menu.getAttribute('style')).toBe('--msl-menu-room: 0px;')
    expect(styled(root)).toEqual([pop(), menu])
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(root.getAttribute('style')).toBe('color: red;')
    expect(styled(root)).toEqual([])
    rerender(<MultiSelect />)
    expect(styled(root)).toEqual([])
  })

  it('shows the open menu as a manual popover where the browser has the API, a plain element after', () => {
    const shown: Element[] = []
    const proto = HTMLElement.prototype as Partial<HTMLElement>
    proto.showPopover = function (this: HTMLElement) {
      shown.push(this)
    }
    try {
      const { root } = setup()
      fireEvent.click(root)
      expect(shown).toEqual([pop()])
      // manual: a click outside it is the dropdown's own to handle, not light dismiss
      expect(pop().getAttribute('popover')).toBe('manual')
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(box()).toBeNull()
      expect(root.querySelector('[popover]')).toBeNull()
    } finally {
      delete proto.showPopover
    }
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

  it("renders an icon after the titles that open: the arrow button's chevron, or groupIcon and submenuIcon left to right", () => {
    const options = [
      { type: 'group', title: 'G', childs: [] },
      { type: 'group', title: 'C', collapsible: true, childs: [] },
      { type: 'submenu', title: 'S', childs: [] }
    ]
    const plain = setup({ options })
    plain.groupTitles()
    const [g, c] = plain.qa('.msl-grp-title')
    const chevron = (title: Element) =>
      title.querySelector(
        ':scope > .msl-expand-icn[aria-hidden="true"] > svg.msl-chevron-icn'
      )!
    expect(g.innerHTML).toBe('G')
    expect(chevron(c).innerHTML).toBe(plain.q('.msl-arrow-icn').innerHTML)
    expect(c.textContent).toBe('C')
    expect(chevron(plain.option('S'))).not.toBeNull()
    plain.unmount()
    const own = setup({
      options,
      groupIcon: <i className='my-grp' />,
      submenuIcon: <i className='my-sub' />
    })
    expect(own.groupTitles()).toEqual(['G', 'C'])
    // not mirrored right to left, where the stylesheet turns it
    expect(
      own.q('.msl-grp-title > .msl-expand-icn > bdo[dir="ltr"] > .my-grp')
    ).not.toBeNull()
    expect(
      own.q('.msl-option > .msl-expand-icn > bdo[dir="ltr"] > .my-sub')
    ).not.toBeNull()
    expect(own.qa('.my-grp, .my-sub')).toHaveLength(2)
  })

  it('renderGroupTitle renders the title rows of groups and submenus, from their counts, state and icon', () => {
    const renderGroupTitle = vi.fn(
      ({ title, total, selected, icon }: MultiSelectGroupTitleProps) => (
        <>
          {icon}
          {title} {selected}/{total}
        </>
      )
    )
    const b = { label: 'B', value: 'b' }
    const options = [
      {
        type: 'group',
        title: 'G',
        childs: [
          { label: 'A', value: 'a' },
          { type: 'group', title: 'Inner', childs: [b] }
        ]
      },
      {
        type: 'group',
        title: 'C',
        collapsible: true,
        collapsed: true,
        childs: [{ label: 'D', value: 'd', disabled: true }]
      },
      {
        type: 'submenu',
        title: 'S',
        childs: [
          { label: 'E', value: 'e' },
          { type: 'submenu', title: 'S2', childs: [{ label: 'F', value: 'f' }] }
        ]
      }
    ]
    const { groupTitles, option } = setup({
      options,
      renderGroupTitle,
      defaultValue: ['b', 'f']
    })
    // nested options count, disabled ones too
    expect(groupTitles()).toEqual(['G 1/2', 'Inner 1/1', 'C 0/1'])
    const sub = option('S 1/2')
    expect((sub.firstChild as Element).className).toBe('msl-expand-icn ')
    const last = (title: string) =>
      renderGroupTitle.mock.calls
        .map(([p]) => p)
        .filter((p) => p.title === title)
        .at(-1)!
    expect(last('G')).toEqual({
      group: options[0],
      title: 'G',
      total: 2,
      selected: 1,
      open: true,
      icon: null,
      toggle: expect.any(Function)
    })
    expect(last('Inner').group).toBe(options[0].childs[1])
    expect(last('C')).toMatchObject({ open: false, icon: expect.anything() })
    expect(last('S').open).toBe(false)
    fireEvent.click(sub)
    expect(last('S').open).toBe(true)
    expect(option('S2 1/1')).toBeDefined()
  })

  it("types renderGroupTitle's group as holding T, plus { label, value } with customValue", () => {
    const ada = { id: '1', name: 'Ada' }
    const names = ({ group }: MultiSelectGroupTitleProps<typeof ada, false>) =>
      group.childs.map((p) => ('childs' in p ? p.title : p.name))
    const props = {
      options: [ada],
      getLabel: (p: typeof ada) => p.name,
      getValue: (p: typeof ada) => p.id
    }
    const elements = [
      <MultiSelect key='a' {...props} renderGroupTitle={names} />,
      // @ts-expect-error the group of created values holds { label, value }, not people
      <MultiSelect key='b' {...props} customValue renderGroupTitle={names} />
    ]
    expect(elements).toHaveLength(2)
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
    rerender(<MultiSelect options={[]} emptyDataLabel={<b>None</b>} />)
    expect(q('.msl-options b').textContent).toBe('None')
  })

  it('treats falsy options as empty', () => {
    // @ts-expect-error not part of the typed API
    const { q, input, root } = setup({ options: false })
    fireEvent.click(root)
    expect(q('.msl-options').textContent).toBe('No Data Found')
    type(input(), 'a')
    expect(q('.msl-options').textContent).toBe('No Data Found')
  })

  it('renders groups, nested groups and empty groups', () => {
    // React warns about a missing key once per file: every test with an empty group checks console.error
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
    expect(qa('.msl-option-disable').map((el) => el.textContent)).toEqual([
      'No Data Found',
      'Nada'
    ])
    expect(error).not.toHaveBeenCalled()
  })

  it('renders JSX group titles and empty labels, keyed apart', () => {
    const error = vi.spyOn(console, 'error')
    const { qa, root } = setup({
      options: [
        { title: <b>A</b>, type: 'group', childs: [opts[0]] },
        {
          title: <b>B</b>,
          type: 'group',
          childs: [],
          emptyDataLabel: <i>none</i>
        }
      ]
    })
    fireEvent.click(root)
    expect(qa('.msl-grp-title b').map((el) => el.textContent)).toEqual([
      'A',
      'B'
    ])
    expect(qa('.msl-option-disable i')[0].textContent).toBe('none')
    expect(error).not.toHaveBeenCalled()
  })

  it('a collapsed group hides its groups and empty label too, and its selected options stay', () => {
    const { groupTitles, optionTexts, chips } = setup({
      options: [
        { label: 'Apple', value: 'apple' },
        {
          title: 'Group A',
          type: 'group',
          collapsible: true,
          collapsed: true,
          childs: [
            { label: 'Banana', value: 'banana' },
            {
              title: 'Group B',
              type: 'group',
              childs: [{ label: 'Cherry', value: 'cherry' }]
            }
          ]
        },
        {
          title: 'Empty',
          type: 'group',
          collapsible: true,
          collapsed: true,
          childs: []
        }
      ],
      defaultValue: ['banana']
    })
    expect(chips()).toEqual(['Banana'])
    expect(groupTitles()).toEqual(['Group A', 'Empty'])
    expect(optionTexts()).toEqual(['Apple'])
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
    expect(styled.getAttribute('class')).toBe('msl-option   x y ')
    expect(styled.getAttribute('title')).toBe('Styled')
    expect(styled.getAttribute('value')).toBe('s')
  })

  it('renders options only while open', () => {
    const { root, onMenuClose } = setup()
    expect(document.querySelector('.msl-option')).toBeNull()
    fireEvent.click(root)
    // in place, in the wrapper
    expect(root.contains(box())).toBe(true)
    expect(box()!.querySelectorAll('.msl-option')).toHaveLength(3)
    fireEvent.click(document.body)
    expect(onMenuClose).toHaveBeenCalledOnce()
    expect(document.querySelector('.msl-option')).toBeNull()
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
    expect(option('Cherry').getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(option('Banana'))
    expect(root.classList).toContain('msl-limit-reached')
    fireEvent.click(option('Cherry'))
    expect(chips()).toEqual(['Apple', 'Banana'])
    // a selected one still toggles off
    fireEvent.click(option('Apple'))
    expect(chips()).toEqual(['Banana'])
    expect(root.classList).not.toContain('msl-limit-reached')
    expect(values(onChange)).toEqual([
      ['apple'],
      ['apple', 'banana'],
      ['apple', 'banana'],
      ['banana']
    ])
  })

  it('past the limit marks unselected options disabled, and the highlight skips them', () => {
    const { option, input } = setup({
      limit: 2,
      defaultValue: ['apple', 'banana']
    })
    expect(option('Cherry').getAttribute('aria-disabled')).toBe('true')
    expect(option('Cherry').className).toContain('msl-option-disable')
    expect(option('Apple').getAttribute('aria-disabled')).toBe('false')
    for (let i = 0; i < 3; i++) press(input(), 'ArrowDown')
    expect(option('Banana').hasAttribute('data-focused')).toBe(true)
  })

  it('past the limit a pick creates nothing and keeps the search and the menu', () => {
    const { input, onChange, optionTexts, isOpen } = setup({
      limit: 1,
      defaultValue: ['apple'],
      customValue: true,
      closeOnSelect: true
    })
    type(input(), 'kiwi')
    type(input(), 'kiwi', 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(['apple'], [opts[0]])
    expect(input().value).toBe('kiwi')
    expect(isOpen()).toBe(true)
    // still offered, not created: a created value would list as kiwi
    expect(optionTexts()).toEqual(['Create "kiwi"'])
  })

  it('single select ignores the limit: a pick replaces the value', () => {
    const { option, root, onChange } = setup({
      singleSelect: true,
      closeOnSelect: false,
      limit: 1,
      defaultValue: ['apple']
    })
    expect(root.classList).not.toContain('msl-limit-reached')
    expect(option('Banana').getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(option('Banana'))
    expect(onChange).toHaveBeenLastCalledWith(['banana'], [opts[1]])
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
      'Remove Apple'
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

  it('names each delete button after its value, as the tooltip reads it', () => {
    const name = (props: MultiSelectProps) =>
      setup({ defaultValue: ['apple'], ...props })
        .q('.msl-chip-delete')
        .getAttribute('aria-label')
    expect(name({ getLabel: () => 7 })).toBe('Remove 7')
    expect(name({ getLabel: (opt) => <b>{opt.label}</b> })).toBe('Remove Apple')
    expect(
      name({
        // @ts-expect-error label is a string: JSX goes through getLabel (untyped JS, v2 options)
        options: [{ label: <b>Bold</b>, value: 'apple' }]
      })
    ).toBe('Remove')
  })

  it('names the clear button with clearLabel', () => {
    const { q } = setup({ defaultValue: ['apple'], clearLabel: 'Effacer' })
    expect(q('.msl-clear-btn').getAttribute('aria-label')).toBe('Effacer')
  })

  it('clears everything by click, Enter or Space without opening the menu', () => {
    const { q, chips, onChange, isOpen, rerender } = setup({
      defaultValue: ['apple', 'banana']
    })
    const clear = q('.msl-clear-btn')
    expect(clear.getAttribute('aria-label')).toBe('Clear')
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
      const q = (s: string) => (box() ?? container).querySelector(s)!
      fireEvent.click(container.firstChild!)
      fireEvent.click(q('.msl-option'))
      expect(q('.msl-single-value').textContent).toBe('Apple')
      expect(!!box()).toBe(open)
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
    cleanup()
    const { q } = setup({
      disableChip: true,
      defaultValue: ['apple', 'banana'],
      chipAlternateText: <i>picked</i>
    })
    expect(q('.msl-single-value i').textContent).toBe('picked')
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
    expect(q('.msl-chip-delete').getAttribute('aria-disabled')).toBe('true')
    expect(q('.msl-clear-btn').getAttribute('aria-disabled')).toBe('true')
    const search = q<HTMLInputElement>('.msl-input')
    expect(search.disabled).toBe(true)
    expect(search.getAttribute('aria-disabled')).toBe('true')
    for (const key of ['Enter', ' ', 'a', 'ArrowDown', 'Backspace']) {
      press(root, key)
      press(search, key)
    }
    // clicks too, with no stylesheet to set pointer-events: none
    fireEvent.click(q('.msl-clear-btn'))
    fireEvent.click(root)
    expect(isOpen()).toBe(false)
    expect(onMenuOpen).not.toHaveBeenCalled()
    expect(chips()).toEqual(['Apple'])
    expect(root.getAttribute('data-disabled')).toBe('true')
  })
})

describe('searchInMenu', () => {
  it('moves the search field atop the open menu, the closed control showing only values', () => {
    const { root, q, input, chips, optionTexts, option } = setup({
      searchInMenu: true,
      defaultValue: ['apple'],
      classNames: { search: 'my-search' }
    })
    expect(input()).toBeNull()
    expect(q('.msl-input')).toBeNull()
    expect(root.getAttribute('role')).toBe('combobox')
    expect(root.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(root)
    const field = input()
    expect(field.parentElement!.className).toBe('msl-search my-search')
    expect(field.parentElement!.nextElementSibling).toBe(q('.msl-options'))
    expect(field.placeholder).toBe('Search...')
    expect(document.activeElement).toBe(field)
    // the combobox moves to the field
    expect(field.getAttribute('role')).toBe('combobox')
    expect(field.getAttribute('aria-controls')).toBe(q('.msl-options').id)
    expect(root.hasAttribute('role')).toBe(false)
    type(field, 'an')
    expect(optionTexts()).toEqual(['Banana'])
    fireEvent.click(option('Banana'))
    expect(chips()).toEqual(['Apple', 'Banana'])
    expect(document.activeElement).toBe(input())
  })

  it('keeps the placeholder in the empty control, the field taking searchPlaceholder', () => {
    const { root, q, input } = setup({
      searchInMenu: true,
      searchPlaceholder: 'Find'
    })
    expect(q('.msl-input').getAttribute('data-placeholder')).toBe('Select...')
    fireEvent.click(root)
    expect(
      q('.msl-input-wrp .msl-input').getAttribute('data-placeholder')
    ).toBe('Select...')
    expect(input().placeholder).toBe('Find')
  })

  it.each([{ singleSelect: true }, { disableChip: true }])(
    'searches next to a single value or count, which Backspace leaves (%o)',
    (props) => {
      const { root, input, single, optionTexts } = setup({
        searchInMenu: true,
        defaultValue: ['apple'],
        ...props
      })
      fireEvent.click(root)
      type(input(), 'ch')
      expect(optionTexts()).toEqual(['Cherry'])
      type(input(), '', 'Backspace')
      expect(single()).toBe('Apple')
    }
  )

  it('Escape or a closing pick leaves focus on the wrapper', () => {
    const { root, input, isOpen, option } = setup({
      searchInMenu: true,
      closeOnSelect: true
    })
    fireEvent.click(root)
    press(input(), 'Escape')
    expect(isOpen()).toBe(false)
    expect(document.activeElement).toBe(root)
    fireEvent.click(root)
    fireEvent.click(option('Apple'))
    expect(isOpen()).toBe(false)
    expect(document.activeElement).toBe(root)
  })

  it('Tab from the field closes after the browser moves on from it, not prevented; Shift+Tab back onto it ends on the wrapper', async () => {
    const { q, root, input, isOpen } = setup({ searchInMenu: true })
    const tick = () => act(() => new Promise((r) => setTimeout(r)))
    fireEvent.click(root)
    expect(press(input(), 'Tab')).toBe(true)
    // the close removes the field: the browser moves on from the listbox
    expect(document.activeElement).toBe(q('.msl-options'))
    await tick()
    expect(isOpen()).toBe(false)
    fireEvent.click(root)
    expect(press(input(), 'Tab', { shiftKey: true })).toBe(true)
    // the browser's Shift+Tab from the listbox: the field before it, which the close removes
    input().focus()
    await tick()
    expect(isOpen()).toBe(false)
    expect(document.activeElement).toBe(root)
  })

  it('with disableSearch, no field anywhere: the wrapper stays the combobox', () => {
    const { root, input } = setup({ searchInMenu: true, disableSearch: true })
    fireEvent.click(root)
    expect(input()).toBeNull()
    expect(root.getAttribute('role')).toBe('combobox')
    expect(root.getAttribute('aria-expanded')).toBe('true')
  })

  it('opening upward, heads the box; the wrapper and the room leave out its height', () => {
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(
      100
    )
    const { root, q } = setup({ searchInMenu: true })
    // the wrapper 60px down; the open box 150px tall: the field 30px, the options 100px, the control 20px
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return (this === root
          ? { top: 60, bottom: 80, left: 5, width: 50 }
          : this.hasAttribute('role')
            ? { top: 30, bottom: 130, height: 100 }
            : this.classList.contains('msl-search')
              ? { top: 0, bottom: 30, height: 30 }
              : { top: 0, bottom: 150, height: 150 }) as unknown as DOMRect
      }
    )
    fireEvent.click(root)
    expect([...box()!.children].map((el) => el.classList[0])).toEqual([
      'msl-search',
      'msl-options',
      'msl-input-wrp',
      'msl-actions'
    ])
    expect(pop().style.bottom).toBe('20px')
    expect(root.style.minHeight).toBe('20px')
    expect(q('.msl-options').style.getPropertyValue('--msl-menu-room')).toBe(
      '30px'
    )
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
    const isOpen = () => !!box()
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

describe('fixed values', () => {
  const fixedOpts = [
    { label: 'Apple', value: 'apple', fixed: true },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry', fixed: true },
    { label: 'Date', value: 'date' }
  ]
  const fixed = (props: MultiSelectProps = {}) =>
    setup({
      options: fixedOpts,
      defaultValue: ['apple', 'banana', 'cherry'],
      ...props
    })

  it('a fixed value has a data-fixed chip with no delete button', () => {
    const { q, qa } = fixed()
    // multi select can still change: not read-only
    expect(q('[role="combobox"]').hasAttribute('aria-readonly')).toBe(false)
    expect(
      qa('.msl-chip').map((el) => [
        el.textContent,
        el.hasAttribute('data-fixed'),
        !!el.querySelector('.msl-chip-delete')
      ])
    ).toEqual([
      ['Apple', true, false],
      ['Banana', false, true],
      ['Cherry', true, false]
    ])
  })

  it('the clear button keeps fixed values, and shows only while one can go', () => {
    const onClear = vi.fn()
    const { q, chips, onChange } = fixed({ onClear })
    fireEvent.click(q('.msl-clear-btn'))
    expect(chips()).toEqual(['Apple', 'Cherry'])
    expect(onChange).toHaveBeenLastCalledWith(
      ['apple', 'cherry'],
      [fixedOpts[0], fixedOpts[2]]
    )
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(q('.msl-clear-btn')).toBeNull()
  })

  it('Backspace removes the last chip that is not fixed', () => {
    const { input, chips, onChange } = fixed({
      defaultValue: ['banana', 'apple', 'date', 'cherry']
    })
    press(input(), 'Backspace')
    expect(chips()).toEqual(['Banana', 'Apple', 'Cherry'])
    press(input(), 'Backspace')
    expect(chips()).toEqual(['Apple', 'Cherry'])
    press(input(), 'Backspace')
    expect(chips()).toEqual(['Apple', 'Cherry'])
    expect(values(onChange)).toEqual([
      ['banana', 'apple', 'cherry'],
      ['apple', 'cherry']
    ])
  })

  it('in the menu a selected one is disabled: no click, Enter or highlight deselects it', () => {
    const { option, input, chips, onChange } = fixed()
    expect(option('Apple').getAttribute('aria-selected')).toBe('true')
    expect(option('Apple').getAttribute('aria-disabled')).toBe('true')
    expect(option('Apple').className).toContain('msl-option-disable')
    expect(option('Banana').getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(option('Apple'))
    press(option('Apple'))
    press(input(), 'ArrowDown')
    expect(option('Banana').hasAttribute('data-focused')).toBe(true)
    expect(chips()).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('an unselected one is picked as any other, then stays, though still highlighted', () => {
    const { input, chips, onChange } = fixed({ defaultValue: [] })
    press(input(), 'ArrowDown')
    press(input())
    expect(chips()).toEqual(['Apple'])
    press(input())
    expect(chips()).toEqual(['Apple'])
    expect(values(onChange)).toEqual([['apple']])
  })

  it('Enter in the search skips a selected fixed match for the next', () => {
    const { input, chips } = fixed({
      options: [
        { label: 'Apple', value: 'apple', fixed: true },
        { label: 'Apricot', value: 'apricot' }
      ],
      defaultValue: ['apple']
    })
    type(input(), 'ap', 'Enter')
    expect(chips()).toEqual(['Apple', 'Apricot'])
  })

  it("customChip gets fixed; a fixed value's onDelete does nothing", () => {
    const customChip = vi.fn(({ value, onDelete }: MultiSelectChipProps) => (
      <button type='button' className='my-chip' onClick={onDelete}>
        {value}
      </button>
    ))
    const { qa, onChange } = fixed({ customChip })
    expect(customChip).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'apple', fixed: true })
    )
    expect(customChip).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'banana', fixed: false })
    )
    fireEvent.click(qa('.my-chip')[0])
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(qa('.my-chip')[1])
    expect(values(onChange)).toEqual([['apple', 'cherry']])
  })

  it('a repeated value goes by the selected one: its other rows are fixed or not with it', () => {
    const { option, onChange } = fixed({
      options: [
        { label: 'Apple', value: 'apple', fixed: true },
        { label: 'Apple again', value: 'apple' }
      ],
      defaultValue: ['apple']
    })
    expect(option('Apple again').getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(option('Apple again'))
    expect(onChange).not.toHaveBeenCalled()
    cleanup()
    const swapped = fixed({
      options: [
        { label: 'Apple', value: 'apple' },
        { label: 'Apple pinned', value: 'apple', fixed: true }
      ],
      defaultValue: ['apple']
    })
    expect(swapped.q('.msl-chip-delete')).not.toBeNull()
    expect(swapped.option('Apple pinned').getAttribute('aria-disabled')).toBe(
      'false'
    )
  })

  it('single select: a fixed value locks it, as a reached limit would, with no clear button', () => {
    const { option, root, q, single, onChange } = fixed({
      singleSelect: true,
      defaultValue: ['apple']
    })
    expect(q('.msl-clear-btn')).toBeNull()
    expect(q('[role="combobox"]').getAttribute('aria-readonly')).toBe('true')
    expect(root.classList).not.toContain('msl-limit-reached')
    expect(option('Banana').getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(option('Banana'))
    fireEvent.click(option('Apple'))
    expect(single()).toBe('Apple')
    expect(values(onChange)).toEqual([['apple']])
  })

  it('with disableChip and a controlled value, clear keeps them too', () => {
    const { q, single, onChange } = fixed({
      disableChip: true,
      value: ['apple', 'banana']
    })
    expect(single()).toBe('2 Item Selected')
    fireEvent.click(q('.msl-clear-btn'))
    expect(values(onChange)).toEqual([['apple']])
  })
})

describe('renderList', () => {
  // aria-posinset/aria-setsize of each
  const places = (els: Element[]) =>
    els.map(
      (el) =>
        `${el.getAttribute('aria-posinset')}/${el.getAttribute('aria-setsize')}`
    )
  // every row, each in a box of its own, as a virtual list positions them
  const all = ({ count, row }: MultiSelectListProps) => (
    <div className='my-list'>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className='my-row'>
          {row(i)}
        </div>
      ))}
    </div>
  )

  it('renders the rows in the listbox, groups flattened, each row in a msl-grp box per group around it', () => {
    const error = vi.spyOn(console, 'error')
    const renderList = vi.fn(all)
    const { root, q, qa } = setup({
      options: [...grouped, { title: 'Empty', type: 'group', childs: [] }],
      classNames: { group: 'grp' },
      renderList
    })
    fireEvent.click(root)
    const list = q('.msl-options')
    expect(list.getAttribute('role')).toBe('listbox')
    expect(list.getAttribute('data-custom')).toBe('')
    expect(list.firstElementChild!.className).toBe('my-list')
    const rows = qa('.my-row')
    expect(rows.map((el) => el.textContent)).toEqual([
      'Apple',
      'Group A',
      'Banana',
      'Group B',
      'Cherry',
      'Empty',
      'No Data Found'
    ])
    // a title is in its own group's box, as in the tree
    expect(
      rows.map((el) => el.querySelectorAll('.msl-grp.grp').length)
    ).toEqual([0, 1, 1, 2, 2, 1, 1])
    // no box holds a group's rows together
    expect(qa('[role="group"]')).toHaveLength(0)
    expect(qa('[role="option"]').map((el) => el.id)).toEqual(
      [0, 1, 2].map((i) => `${list.id}-${i}`)
    )
    // only the rows a virtual list shows are there: each option tells its place, titles and labels not counted
    expect(places(qa('[role="option"]'))).toEqual(['1/3', '2/3', '3/3'])
    // a virtual list may ask for a row past the end while the rows shrink
    const { count, row } = renderList.mock.lastCall![0]
    expect(row(count)).toBeUndefined()
    expect(error).not.toHaveBeenCalled()
  })

  it('the title of a collapsible group is a row: Enter toggles it, its rows come and go', () => {
    const renderList = vi.fn(all)
    const { root, input, qa } = setup({ options: fruits, renderList })
    const rows = () => qa('.my-row').map((el) => el.textContent)
    const active = () => renderList.mock.lastCall![0].activeIndex
    fireEvent.click(root)
    expect(rows()).toEqual(['Citrus', 'Lemon', 'Lime', 'Berries'])
    const title = qa('.msl-grp-title')[0]
    expect(title.getAttribute('role')).toBe('option')
    expect(title.getAttribute('aria-expanded')).toBe('true')
    // in its group's box, as in the tree
    expect(title.parentElement!.className).toBe('msl-grp ')
    press(input(), 'ArrowDown')
    press(input())
    expect(rows()).toEqual(['Citrus', 'Berries'])
    expect(active()).toBe(0)
    press(input(), 'ArrowDown')
    press(input())
    expect(rows()).toEqual(['Citrus', 'Berries', 'Blueberry'])
    press(input(), 'ArrowDown')
    expect(active()).toBe(2)
  })

  it('renders the rows of an open submenu through it too, in a popover after its title; a list without the highlight gets activeIndex -1', () => {
    const renderList = vi.fn(all)
    const { root, input, q, qa, onChange } = setup({
      options: nested,
      renderList
    })
    // the lists of the last render: open submenus' innermost first, the menu's last
    const lists = (k: number) =>
      renderList.mock.calls.slice(-k).map(([l]) => [l.count, l.activeIndex])
    fireEvent.click(root)
    expect(qa('.my-list')).toHaveLength(1)
    expect(qa('.my-row').map((el) => el.textContent)).toEqual([
      'Apple',
      'Veg',
      'Banana'
    ])
    press(input(), 'ArrowDown')
    press(input(), 'ArrowDown')
    press(input(), 'ArrowRight')
    const veg = q('.msl-submenu')
    expect(veg.getAttribute('data-custom')).toBe('')
    expect(veg.previousElementSibling!.textContent).toBe('Veg')
    expect(
      [...veg.querySelectorAll('.my-row')].map((el) => el.textContent)
    ).toEqual(['Carrot', 'Greens', 'Potato'])
    // places in their own list: Veg is the menu's second option
    expect(places([...veg.querySelectorAll('[role="option"]')])).toEqual([
      '1/3',
      '2/3',
      '3/3'
    ])
    expect(places([veg.previousElementSibling!])).toEqual(['2/3'])
    // Veg's list has the highlight, Carrot, the menu's none
    expect(lists(2)).toEqual([
      [3, 0],
      [3, -1]
    ])
    expect(input().getAttribute('aria-activedescendant')).toBe(
      q('[data-focused]').id
    )
    press(input(), 'ArrowDown')
    press(input(), 'ArrowRight')
    expect(qa('.msl-submenu')).toHaveLength(2)
    expect(lists(3)).toEqual([
      [2, 0],
      [3, -1],
      [3, -1]
    ])
    expect(q('[data-focused]').textContent).toBe('Kale')
    press(input())
    expect(values(onChange)).toEqual([['kale']])
    press(input(), 'ArrowLeft')
    expect(qa('.msl-submenu')).toHaveLength(1)
    expect(q('[data-focused]').textContent).toBe('Greens')
  })

  it('without it, the listbox has no data-custom, and options no places: all are there to count', () => {
    const { root, q } = setup()
    fireEvent.click(root)
    expect(q('.msl-options').hasAttribute('data-custom')).toBe(false)
    expect(q('[aria-posinset],[aria-setsize]')).toBeNull()
  })

  it('activeIndex is the row of the keyboard highlight, titles counted, -1 for none', () => {
    const renderList = vi.fn(all)
    const { root, input, q } = setup({ options: grouped, renderList })
    const active = () => renderList.mock.lastCall![0].activeIndex
    fireEvent.click(root)
    expect(active()).toBe(-1)
    press(input(), 'ArrowDown')
    expect(active()).toBe(0)
    press(input(), 'ArrowDown')
    // past Group A's title
    expect(active()).toBe(2)
    press(input(), 'End')
    expect(active()).toBe(4)
    expect(q('[data-focused]').textContent).toBe('Cherry')
    expect(input().getAttribute('aria-activedescendant')).toBe(
      q('[data-focused]').id
    )
    // search results have no titles
    type(input(), 'rr')
    press(input(), 'ArrowDown')
    expect(renderList.mock.lastCall![0].count).toBe(1)
    expect(active()).toBe(0)
  })

  const many = Array.from({ length: 1000 }, (_, i) => ({
    label: `Item ${i}`,
    value: `${i}`
  }))

  it('builds only the rows it asks for: a window of a long list', () => {
    const getLabel = vi.fn((opt: MultiSelectOption) => opt.label)
    // five rows from the highlight on, as a virtual list scrolled to it
    const windowed = ({ count, row, activeIndex }: MultiSelectListProps) => {
      const start = Math.max(0, Math.min(activeIndex, count - 5))
      return Array.from({ length: 5 }, (_, i) => (
        <div key={start + i}>{row(start + i)}</div>
      ))
    }
    const { root, input, qa, option, onChange } = setup({
      options: many,
      getLabel,
      renderList: windowed
    })
    const shown = () => qa('[role="option"]').map((el) => el.textContent)
    const labeled = () =>
      [...new Set(getLabel.mock.calls.map(([opt]) => opt.label))].sort()
    fireEvent.click(root)
    expect(shown()).toEqual(['Item 0', 'Item 1', 'Item 2', 'Item 3', 'Item 4'])
    expect(labeled()).toEqual(shown())
    getLabel.mockClear()
    press(input(), 'End')
    expect(shown()).toEqual([
      'Item 995',
      'Item 996',
      'Item 997',
      'Item 998',
      'Item 999'
    ])
    expect(places(qa('[role="option"]'))).toEqual([
      '996/1000',
      '997/1000',
      '998/1000',
      '999/1000',
      '1000/1000'
    ])
    expect(labeled()).toEqual(shown())
    fireEvent.click(option('Item 996'))
    press(input())
    expect(values(onChange)).toEqual([['996'], ['996', '999']])
  })

  it('Enter picks the highlighted option though the list never rendered it', () => {
    const { root, input, qa, onChange } = setup({
      options: many,
      renderList: ({ row }) => row(0)
    })
    fireEvent.click(root)
    press(input(), 'End')
    expect(qa('[role="option"]').map((el) => el.textContent)).toEqual([
      'Item 0'
    ])
    press(input())
    expect(values(onChange)).toEqual([['999']])
  })

  it('is not called while emptyDataLabel shows', () => {
    const renderList = vi.fn(all)
    const { root, input, q } = setup({ renderList })
    fireEvent.click(root)
    renderList.mockClear()
    type(input(), 'zzz')
    expect(renderList).not.toHaveBeenCalled()
    expect(q('.msl-options').textContent).toBe('No Data Found')
  })

  it('closed with no exit CSS, the menu goes at once, its rows not built again', () => {
    const renderList = vi.fn(all)
    const { root, input } = setup({ renderList })
    fireEvent.click(root)
    renderList.mockClear()
    press(input(), 'Escape')
    expect(renderList).not.toHaveBeenCalled()
    expect(box()).toBeNull()
  })

  it('keys on its scroller reach the combobox: not a tab stop, it takes focus on a click between the rows', () => {
    const { root, q, onChange } = setup({
      disableSearch: true,
      renderList: (list) => (
        <div tabIndex={-1} className='my-scroller'>
          {all(list)}
        </div>
      )
    })
    fireEvent.click(root)
    const scroller = q('.my-scroller')
    scroller.focus()
    press(scroller, 'ArrowDown')
    expect(q('[data-focused]').textContent).toBe('Apple')
    press(scroller)
    expect(values(onChange)).toEqual([['apple']])
  })

  it('a focused row it unmounts, scrolled away, leaves focus in the listbox, where keys still work', () => {
    let scroll: (start: number) => void = () => {}
    // five rows from where it is scrolled to
    function Windowed({ row }: MultiSelectListProps) {
      const [start, setStart] = useState(0)
      scroll = setStart
      return (
        <>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={start + i}>{row(start + i)}</div>
          ))}
        </>
      )
    }
    const { root, q, option, onChange } = setup({
      options: many,
      disableSearch: true,
      renderList: (list) => <Windowed {...list} />
    })
    fireEvent.click(root)
    // rows scrolled away with focus elsewhere leave it there
    act(() => scroll(50))
    expect(document.activeElement).toBe(root)
    act(() => scroll(0))
    // a click focuses the row, and no search field takes focus back
    fireEvent.click(option('Item 2'))
    option('Item 2').focus()
    act(() => scroll(100))
    const list = q('.msl-options')
    expect(document.activeElement).toBe(list)
    press(list, 'ArrowDown')
    expect(root.getAttribute('aria-activedescendant')).toBe(`${list.id}-0`)
    press(list)
    expect(values(onChange)).toEqual([['2'], ['2', '0']])
  })
})

describe('search', () => {
  it('filters by label, case-insensitive', () => {
    const { input, optionTexts } = setup()
    type(input(), 'AN')
    expect(optionTexts()).toEqual(['Banana'])
  })

  it('swaps in all the rows at once, in a new box: WebKit rechecks a :has(~ …) rule per row added to a live list', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      label: `Item ${i}`,
      value: `${i}`
    }))
    const { input, q, optionTexts } = setup({ options: many })
    type(input(), 'Item 29')
    expect(optionTexts()).toEqual(['Item 29'])
    const list = q('.msl-options')
    const rows = list.firstElementChild!
    // no layout room: the rows lay out as the listbox's own
    expect(rows.getAttribute('style')).toBe('display: contents;')
    press(input(), 'ArrowDown')
    expect(list.firstElementChild).toBe(rows)
    const watch = new MutationObserver(() => {})
    watch.observe(list, { childList: true, subtree: true })
    fireEvent.change(input(), { target: { value: '' } })
    const added = watch.takeRecords().flatMap((r) => [...r.addedNodes])
    expect(added).toEqual([list.firstElementChild])
    expect(list.querySelectorAll('.msl-option')).toHaveLength(30)
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

  it.each(['Enter', ','])('%s skips a disabled first result', (key) => {
    const { input, chips } = setup({
      options: [
        { label: 'Apple', value: 'apple', disabled: true },
        { label: 'Apricot', value: 'apricot' }
      ]
    })
    type(input(), 'ap')
    type(input(), 'ap', key)
    expect(chips()).toEqual(['Apricot'])
  })

  it('Enter picks nothing when every result is disabled', () => {
    const { input, chips, onChange } = setup({
      options: [{ label: 'Apple', value: 'apple', disabled: true }]
    })
    type(input(), 'ap')
    type(input(), 'ap', 'Enter')
    expect(chips()).toEqual([])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Enter picks a match even without a keyup for the text (paste, IME)', () => {
    const { root, input, chips } = setup()
    fireEvent.click(root)
    fireEvent.input(input(), { target: { value: 'ch' } })
    press(input())
    expect(chips()).toEqual(['Cherry'])
  })

  it('searches on input too: text can arrive without a keyup (context menu paste)', () => {
    const { input, optionTexts } = setup()
    fireEvent.input(input(), { target: { value: 'ch' } })
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
      fireEvent.input(input(), { target: { value: 'ch' } })
      for (const key of ['Enter', ',']) {
        expect(press(input(), key, init)).toBe(true)
      }
      expect(chips()).toEqual([])
      expect(onChange).not.toHaveBeenCalled()
      expect(isOpen()).toBe(true)
      // the next, plain Enter picks
      press(input(), 'Enter')
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

  it('names the Create item and the Custom Values group through props', () => {
    const { input, chips, groupTitles, optionTexts, option, q } = setup({
      customValue: true,
      createLabel: (text) => `Ajouter « ${text} »`,
      customValuesTitle: <em>Ajoutés</em>
    })
    type(input(), 'kiwi')
    expect(optionTexts()).toEqual(['Ajouter « kiwi »'])
    expect(option('Ajouter « kiwi »').title).toBe('Ajouter « kiwi »')
    type(input(), 'kiwi', 'Enter')
    expect(chips()).toEqual(['kiwi'])
    expect(groupTitles()).toEqual(['Ajoutés'])
    expect(q('.msl-grp-title em')).not.toBeNull()
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
      [...box()!.querySelectorAll('.msl-option')].map((el) => el.textContent)
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
    // the buttons are outside clicks: they close the menu
    const optionTexts = () => {
      box() || fireEvent.click(container.firstChild!)
      return [...box()!.querySelectorAll('.msl-option')].map(
        (el) => el.textContent
      )
    }
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
    ...(box() ?? c).querySelectorAll<HTMLElement>(s)
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
    fireEvent.click(c.firstChild!)
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
    fireEvent.click(container.firstChild!)
    expect(box()!.querySelector('.msl-option')!.textContent).toBe(
      'No Data Found'
    )
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
    // closed: no options to label
    expect(getLabel).not.toHaveBeenCalled()
    fireEvent.click(c.firstChild!)
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
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(
      100
    )
    const { root, q } = setup()
    // jsdom: top 0, so below has more room
    fireEvent.click(root)
    expect(q('.msl').getAttribute('class')).toBe('msl msl-active ')
    expect(q('.msl').hasAttribute('data-up')).toBe(false)
    const order = () => [...box()!.children].map((el) => el.classList[0])
    const room = () =>
      q('.msl-options').style.getPropertyValue('--msl-menu-room')
    expect(order()).toEqual(['msl-input-wrp', 'msl-actions', 'msl-options'])
    expect(pop().style.top).toBe('0px')
    expect(room()).toBe('100px')
    fireEvent.click(document.body)
    // the wrapper 60px down; the open box 120px tall, its options 100px: the control is 20px
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return (this === root
          ? { top: 60, bottom: 80, left: 5, width: 50 }
          : this.hasAttribute('role')
            ? { top: 0, bottom: 100, height: 100 }
            : { top: 0, bottom: 120, height: 120 }) as unknown as DOMRect
      }
    )
    fireEvent.click(root)
    expect(q('.msl').getAttribute('class')).toBe('msl msl-active-up ')
    expect(q('.msl').getAttribute('data-up')).toBe('true')
    // stacked by DOM order, not by CSS: right with no stylesheet too
    expect(order()).toEqual(['msl-options', 'msl-input-wrp', 'msl-actions'])
    // anchored by its bottom to the control's, the menu gets the room above
    const { left, width, top, bottom, transformOrigin } = pop().style
    expect([left, width, top, bottom, transformOrigin]).toEqual([
      '5px',
      '50px',
      '',
      '20px',
      '0 100%'
    ])
    // the box left the flow: the wrapper keeps the control's height
    expect(root.style.minHeight).toBe('20px')
    expect(room()).toBe('60px')
  })

  it('measures the viewport, not a quirks-mode root as tall as the page', () => {
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(
      3000
    )
    const { root, q } = setup()
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      top: 700,
      bottom: 720,
      left: 0,
      width: 50
    } as DOMRect)
    fireEvent.click(root)
    // jsdom's innerHeight is 768: 48px left below
    expect(q('.msl').getAttribute('data-up')).toBe('true')
  })

  it.each([
    ['below', 0, 'top', '0px', '0 0', '178px', [10, 59]],
    ['above', 60, 'bottom', '29px', '0 100%', '120px', [1, 50]]
  ])(
    'scales as a scaled part of the page scales the dropdown (%s)',
    (_, top, side, at, origin, room, [listTop, listBottom]) => {
      vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(
        100
      )
      // drawn at half its 200px layout width: the top layer drops that scale, so the box scales itself.
      // Drawn 60px tall, its 2px borders 1px: the options 49px, the control 9px and both borders
      const css = document.head.appendChild(document.createElement('style'))
      css.textContent = '.msl { border: 2px solid }'
      onTestFinished(() => css.remove())
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200)
      vi.spyOn(
        HTMLElement.prototype,
        'getBoundingClientRect'
      ).mockImplementation(function (this: HTMLElement) {
        return (this.classList.contains('msl-wrp')
          ? { left: 10, top, bottom: top + 10, width: 100 }
          : this.hasAttribute('role')
            ? { top: listTop, bottom: listBottom, height: 49 }
            : { top: 0, bottom: 60, height: 60 }) as unknown as DOMRect
      })
      const { root } = setup()
      fireEvent.click(root)
      const { left, width, scale, transformOrigin } = pop().style
      expect([left, width, scale, transformOrigin]).toEqual([
        '10px',
        '200px',
        '0.5',
        origin
      ])
      expect(pop().style.getPropertyValue(side)).toBe(at)
      // in the wrapper's own pixels
      expect(root.style.minHeight).toBe('22px')
      expect(
        box()!
          .querySelector<HTMLElement>('.msl-options')!
          .style.getPropertyValue('--msl-menu-room')
      ).toBe(room)
    }
  )

  it('follows the wrapper every frame while open', async () => {
    const { root } = setup()
    fireEvent.click(root)
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      top: 30,
      bottom: 50,
      left: 7,
      width: 90
    } as DOMRect)
    await new Promise(requestAnimationFrame)
    expect(pop().style.top).toBe('30px')
    expect(pop().style.left).toBe('7px')
    expect(pop().style.width).toBe('90px')
  })

  it('closes once a scrolling parent clips the wrapper away, focus back in it', () => {
    const { root, input, isOpen, onMenuClose } = setup()
    fireEvent.click(root)
    act(() => seen(true))
    expect(isOpen()).toBe(true)
    act(() => seen(false))
    expect(isOpen()).toBe(false)
    expect(onMenuClose).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(input())
  })

  it('acts on the latest of several reports at once', () => {
    const { root, isOpen } = setup()
    fireEvent.click(root)
    act(() => seen(true))
    act(() => seen(false, true))
    expect(isOpen()).toBe(true)
    act(() => seen(true, false))
    expect(isOpen()).toBe(false)
  })

  it('opened out of view (a key on the focused dropdown), scrolls it back rather than close', () => {
    expect(Element.prototype.scrollIntoView).toBeUndefined() // jsdom
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    try {
      const { root, isOpen } = setup()
      fireEvent.click(root)
      act(() => seen(false))
      expect(isOpen()).toBe(true)
      expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'nearest' })
      expect(scroll.mock.contexts[0]).toBe(root)
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView
    }
    // in jsdom, without scrollIntoView, it stays open too
    const { root, isOpen } = setup()
    fireEvent.click(root)
    act(() => seen(false))
    expect(isOpen()).toBe(true)
  })

  it('Escape leaves focus in the search field; focus moving out stays out', () => {
    const outside = document.body.appendChild(document.createElement('button'))
    try {
      const { root, input } = setup()
      fireEvent.click(root)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(box()).toBeNull()
      expect(document.activeElement).toBe(input())
      fireEvent.click(root)
      act(() => outside.focus())
      expect(box()).toBeNull()
      expect(document.activeElement).toBe(outside)
    } finally {
      outside.remove()
    }
  })

  it('Tab closes and leaves focus where it is, for the browser to move on from', () => {
    const { root, qa, input, isOpen } = setup({
      defaultValue: ['apple', 'banana']
    })
    fireEvent.click(root)
    const del = qa('.msl-chip-delete')[1]
    del.focus()
    // not prevented: the browser tabs on from it
    expect(press(del, 'Tab')).toBe(true)
    expect(isOpen()).toBe(false)
    expect(document.activeElement).toBe(del)
    fireEvent.click(root)
    expect(press(input(), 'Tab', { shiftKey: true })).toBe(true)
    expect(isOpen()).toBe(false)
    expect(document.activeElement).toBe(input())
  })

  it('closing drops the search text', () => {
    const { root, input, optionTexts } = setup()
    type(input(), 'an')
    expect(optionTexts()).toEqual(['Banana'])
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(root)
    expect(input().value).toBe('')
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  it.each([
    ['an open <dialog>', 'dialog', { open: '' }],
    ['a popover', 'div', { popover: '' }],
    [
      "an aria-modal dialog, a modal library's focus trap",
      'div',
      { role: 'dialog', 'aria-modal': 'true' }
    ],
    ['a right-to-left section', 'div', { dir: 'rtl', lang: 'ar' }]
  ])('stays in place in the DOM, in %s', (_, tag, attrs) => {
    const parent = document.body.appendChild(document.createElement(tag))
    for (const [k, v] of Object.entries(attrs)) parent.setAttribute(k, v)
    try {
      const { container } = render(<MultiSelect options={opts} />, {
        container: parent.appendChild(document.createElement('div'))
      })
      const root = container.firstChild as HTMLElement
      fireEvent.click(root)
      // so it keeps the parent's focus trap, direction, language and CSS
      expect(root.contains(box())).toBe(true)
      expect(root.contains(document.activeElement)).toBe(
        // jsdom's UA stylesheet hides a [popover], which it can't show
        !('popover' in attrs)
      )
    } finally {
      parent.remove()
    }
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
    fireEvent.click(get(q))
    expect(isOpen()).toBe(false)
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
      const isOpen = () => !!q('.msl[data-open]')
      // the wrapper's ancestors include the ShadowRoot, which has no hasAttribute
      press(container.firstChild as HTMLElement, 'ArrowDown')
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

  it("opens without IntersectionObserver, as in jsdom in a user's tests", () => {
    const io = globalThis.IntersectionObserver
    // @ts-expect-error jsdom's own state
    delete globalThis.IntersectionObserver
    try {
      const { root, isOpen, onMenuClose } = setup()
      fireEvent.click(root)
      expect(isOpen()).toBe(true)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(isOpen()).toBe(false)
      expect(onMenuClose).toHaveBeenCalledOnce()
    } finally {
      globalThis.IntersectionObserver = io
    }
  })

  it("opens without requestAnimationFrame, as in plain jsdom in a user's tests", () => {
    vi.stubGlobal('requestAnimationFrame', undefined)
    vi.stubGlobal('cancelAnimationFrame', undefined)
    try {
      const { root, isOpen } = setup()
      fireEvent.click(root)
      expect(isOpen()).toBe(true)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(isOpen()).toBe(false)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('the Escape that closes the menu reaches attr.onKeyDown', () => {
    const onKeyDown = vi.fn()
    const { root, input, isOpen } = setup({ attr: { onKeyDown } })
    fireEvent.click(root)
    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(isOpen()).toBe(false)
    expect(onKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'Escape' })
    )
  })

  it('the Escape that closes the menu is prevented, so it closes no surrounding dialog', () => {
    const { root, input } = setup()
    fireEvent.click(root)
    expect(press(input(), 'Escape')).toBe(false)
    fireEvent.click(root)
    expect(press(document.body, 'Escape')).toBe(false)
    // closed, Escape is the dialog's
    expect(press(root, 'Escape')).toBe(true)
    expect(press(document.body, 'Escape')).toBe(true)
  })

  it('the Escape that closes the menu stops there: a modal library above may ignore defaultPrevented', () => {
    const keys = vi.fn()
    const { container } = render(
      <div onKeyDown={(e) => keys(e.key)}>
        <MultiSelect options={opts} />
      </div>
    )
    const root = container.querySelector<HTMLElement>('.msl-wrp')!
    fireEvent.click(root)
    press(box()!.querySelector('input')!, 'Escape')
    expect(box()).toBeNull()
    expect(keys).not.toHaveBeenCalled()
    // closed, Escape is theirs
    press(root, 'Escape')
    expect(keys).toHaveBeenCalledWith('Escape')
  })

  it('a parent render with a new onMenuClose leaves the open menu be, and calls the latest', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    try {
      const onMenuClose = vi.fn()
      const { container, rerender } = render(
        <MultiSelect options={opts} onMenuClose={() => onMenuClose(1)} />
      )
      fireEvent.click(container.firstChild!)
      act(() => seen(true))
      rerender(
        <MultiSelect options={opts} onMenuClose={() => onMenuClose(2)} />
      )
      // scrolled away: it closes, no fresh observer takes it for opened out of view
      act(() => seen(false))
      expect(scroll).not.toHaveBeenCalled()
      expect(box()).toBeNull()
      expect(onMenuClose).toHaveBeenCalledExactlyOnceWith(2)
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView
    }
  })

  it('a Suspense boundary hiding it while open, then showing it, does not break it', async () => {
    const pending = new Promise(() => {})
    const Wait = ({ wait }: { wait: boolean }) => {
      if (wait) throw pending
      return null
    }
    const onChange = vi.fn()
    const onMenuClose = vi.fn()
    const App = ({ wait }: { wait: boolean }) => (
      <Suspense fallback='loading'>
        <Wait wait={wait} />
        <MultiSelect
          options={opts}
          onChange={onChange}
          onMenuClose={onMenuClose}
        />
      </Suspense>
    )
    const { container, rerender } = render(<App wait={false} />)
    fireEvent.click(container.querySelector('.msl-wrp')!)
    // hidden under display: none, which hides the top layer box too: its refs detached, the menu still open
    rerender(<App wait />)
    await new Promise(requestAnimationFrame)
    expect(box()).not.toBeNull()
    // until the observer sees it gone: closed, which React shows with the dropdown
    seen(true)
    seen(false)
    expect(onMenuClose).toHaveBeenCalledOnce()
    rerender(<App wait={false} />)
    await new Promise(requestAnimationFrame)
    expect(box()).toBeNull()
    fireEvent.click(container.querySelector('.msl-wrp')!)
    fireEvent.click(box()!.querySelector('.msl-option')!)
    expect(onChange).toHaveBeenLastCalledWith(['apple'], [opts[0]])
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(box()).toBeNull()
  })

  it('in an older jsdom, which computes no border or padding, its sizes are numbers', () => {
    const real = getComputedStyle
    vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(
      (el) =>
        ({
          position: real(el).position,
          borderTopWidth: '',
          borderBottomWidth: '',
          paddingTop: '',
          paddingBottom: ''
        }) as CSSStyleDeclaration
    )
    const { root, q } = setup()
    fireEvent.click(root)
    expect(root.style.minHeight).toBe('0px')
    expect(q('.msl-options').style.getPropertyValue('--msl-menu-room')).toBe(
      '0px'
    )
  })

  it.each([
    ['absolute, scrolling with the page', {}, 'absolute'],
    ['fixed in a fixed part of the page', { position: 'fixed' }, 'fixed'],
    ['fixed in a sticky part of the page', { position: 'sticky' }, 'fixed']
  ] as const)('places the open menu %s', (_, style, pos) => {
    const { container } = render(
      <div style={style}>
        <MultiSelect options={opts} />
      </div>
    )
    fireEvent.click(container.querySelector('.msl-wrp')!)
    expect(pop().style.position).toBe(pos)
  })

  it('places the open menu fixed when slotted into a fixed dialog in a shadow root', () => {
    // as in <wa-dialog>: the dialog is in its shadow root, the dropdown in its light DOM
    const host = document.body.appendChild(document.createElement('div'))
    host.attachShadow({ mode: 'open' }).innerHTML =
      '<dialog open style="position: fixed"><slot></slot></dialog>'
    try {
      render(<MultiSelect options={opts} />, {
        container: host.appendChild(document.createElement('div'))
      })
      fireEvent.click(host.querySelector('.msl-wrp')!)
      expect(pop().style.position).toBe('fixed')
    } finally {
      host.remove()
    }
  })

  it('onMenuOpen runs once the menu is there and focused, from a click as from a key', () => {
    const at: boolean[][] = []
    const { root } = setup({
      onMenuOpen: () =>
        at.push([
          !!box()?.querySelector('[role=listbox]'),
          !!box()?.contains(document.activeElement)
        ])
    })
    fireEvent.click(root)
    fireEvent.keyDown(document, { key: 'Escape' })
    press(root, 'ArrowDown')
    expect(at).toEqual([
      [true, true],
      [true, true]
    ])
  })

  it.each([
    ['without a search field', { singleSelect: true, defaultValue: ['apple'] }],
    ['with a search field', {}]
  ])(
    'opens from a click() in an effect, focus in the widget, with no warning (%s)',
    (_, props) => {
      const error = vi.spyOn(console, 'error')
      const errors = vi.fn((e: Event) => e.preventDefault())
      window.addEventListener('error', errors)
      function Auto() {
        const ref = useRef<HTMLDivElement>(null)
        useEffect(
          () => ref.current!.querySelector<HTMLElement>('.msl-wrp')!.click(),
          []
        )
        return (
          <div ref={ref}>
            <MultiSelect options={opts} {...props} />
          </div>
        )
      }
      render(<Auto />)
      window.removeEventListener('error', errors)
      expect(errors).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
      expect(
        document.querySelector('.msl-wrp')!.contains(document.activeElement)
      ).toBe(true)
    }
  )

  it.each([
    ['click', () => fireEvent.click(box()!.querySelector('.msl-option')!)],
    ['Enter', () => pickByKey()]
  ])(
    'a closing pick that reveals an autoFocus field leaves focus there (%s)',
    (_, pick) => {
      function Other() {
        const [other, setOther] = useState(false)
        return (
          <>
            <MultiSelect
              singleSelect
              options={opts}
              onChange={(v) => setOther(v.length > 0)}
            />
            {other && <input className='other' autoFocus />}
          </>
        )
      }
      const { container } = render(<Other />)
      fireEvent.click(container.querySelector('.msl-wrp')!)
      pick()
      expect(box()).toBeNull()
      expect(document.activeElement).toBe(container.querySelector('.other'))
    }
  )

  it('an Enter pick whose value commits later keeps focus on the wrapper', async () => {
    function Late() {
      const [v, setV] = useState<string[]>([])
      return (
        <MultiSelect
          singleSelect
          options={opts}
          value={v}
          onChange={(x) => setTimeout(() => setV(x))}
        />
      )
    }
    const { container } = render(<Late />)
    const root = container.querySelector<HTMLElement>('.msl-wrp')!
    fireEvent.click(root)
    pickByKey()
    expect(document.activeElement).toBe(root)
    // the value replaces the search field
    await act(() => new Promise((r) => setTimeout(r)))
    expect(root.querySelector('.msl-single-value')!.textContent).toBe('Apple')
    expect(document.activeElement).toBe(root)
  })

  it('leaves focus where onMenuClose moves it', () => {
    const next = document.body.appendChild(document.createElement('input'))
    try {
      const { root } = setup({ onMenuClose: () => next.focus() })
      fireEvent.click(root)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(document.activeElement).toBe(next)
    } finally {
      next.remove()
    }
  })

  it.each([
    ['click', (option: HTMLElement) => fireEvent.click(option)],
    ['Enter', () => pickByKey()]
  ])(
    'a single select whose onChange focuses another field closes once and leaves focus there (%s)',
    (_, pick) => {
      const onMenuClose = vi.fn()
      function Form() {
        const city = useRef<HTMLInputElement>(null)
        return (
          <>
            <MultiSelect
              singleSelect
              options={opts}
              onChange={() => city.current!.focus()}
              onMenuClose={onMenuClose}
            />
            <input className='city' ref={city} />
          </>
        )
      }
      const errors = vi.fn((e: Event) => e.preventDefault())
      window.addEventListener('error', errors)
      const { container } = render(<Form />)
      fireEvent.click(container.querySelector('.msl-wrp')!)
      pick(box()!.querySelector<HTMLElement>('.msl-option')!)
      window.removeEventListener('error', errors)
      expect(errors).not.toHaveBeenCalled()
      expect(box()).toBeNull()
      expect(onMenuClose).toHaveBeenCalledOnce()
      expect(document.activeElement).toBe(container.querySelector('.city'))
    }
  )

  it.each([
    ['click', () => fireEvent.click(box()!.querySelector('.msl-option')!)],
    ['Enter', () => pickByKey()]
  ])(
    'a pick whose onChange unmounts the select does not crash (%s)',
    (_, pick) => {
      function InlineEdit() {
        const [editing, setEditing] = useState(true)
        return editing ? (
          <MultiSelect
            singleSelect
            options={opts}
            onChange={() => setEditing(false)}
          />
        ) : (
          <p>saved</p>
        )
      }
      const errors = vi.fn((e: Event) => e.preventDefault())
      window.addEventListener('error', errors)
      const { container } = render(<InlineEdit />)
      fireEvent.click(container.querySelector('.msl-wrp')!)
      pick()
      window.removeEventListener('error', errors)
      expect(errors).not.toHaveBeenCalled()
      expect(container.textContent).toBe('saved')
      expect(box()).toBeNull()
    }
  )

  it('a pick that reveals an autoFocus field closes once, with no warning', () => {
    const error = vi.spyOn(console, 'error')
    const onMenuClose = vi.fn()
    function Other() {
      const [other, setOther] = useState(false)
      return (
        <>
          <MultiSelect
            options={opts}
            onChange={(v) => setOther(v.includes('banana'))}
            onMenuClose={onMenuClose}
          />
          {other && <input className='other' autoFocus />}
        </>
      )
    }
    const { container } = render(<Other />)
    fireEvent.click(container.querySelector('.msl-wrp')!)
    fireEvent.click(
      [...box()!.querySelectorAll('.msl-option')].find(
        (el) => el.textContent === 'Banana'
      )!
    )
    expect(error).not.toHaveBeenCalled()
    expect(box()).toBeNull()
    expect(onMenuClose).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(container.querySelector('.other'))
  })

  it('closes once disabled, so the open menu takes no picks, styled or not', () => {
    const { root, rerender, isOpen, onMenuClose } = setup()
    fireEvent.click(root)
    rerender(<MultiSelect options={opts} onMenuClose={onMenuClose} disabled />)
    expect(isOpen()).toBe(false)
    expect(onMenuClose).toHaveBeenCalledOnce()
    // the disabled field takes no focus: Tab moves on from the dropdown
    expect(document.activeElement).toBe(root)
    rerender(<MultiSelect options={opts} onMenuClose={onMenuClose} />)
    expect(onMenuClose).toHaveBeenCalledOnce()
  })

  it('keeps text that reached the closed search field (paste, drop, IME) for the open menu', () => {
    const { root, input, isOpen, onChange } = setup({ customValue: true })
    fireEvent.input(input(), { target: { value: 'kiwi' } })
    expect(isOpen()).toBe(false)
    fireEvent.click(root)
    expect(input().value).toBe('kiwi')
    fireEvent.keyDown(document, { key: 'Escape' })
    // Enter on the closed field opens the menu, as any key does, and creates the pasted text
    fireEvent.input(input(), { target: { value: 'kiwi' } })
    press(input())
    expect(isOpen()).toBe(true)
    expect(onChange).toHaveBeenLastCalledWith(
      ['kiwi'],
      [{ label: 'kiwi', value: 'kiwi' }]
    )
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

  it('treats value null (untyped JS, useState(null)) as an empty controlled selection', () => {
    const { chips, option, onChange } = setup({
      // @ts-expect-error null is not in the types
      value: null,
      customValue: true
    })
    expect(chips()).toEqual([])
    fireEvent.click(option('Apple'))
    expect(onChange).toHaveBeenLastCalledWith(['apple'], [opts[0]])
    expect(chips()).toEqual([])
  })

  it('a null in value or defaultValue (untyped JS, [useState(null)]) is no value', () => {
    const { chips } = setup({
      // @ts-expect-error null is not in the types
      defaultValue: [null, 'apple']
    })
    expect(chips()).toEqual(['Apple'])
    cleanup()
    const { single } = setup({
      singleSelect: true,
      customValue: true,
      // @ts-expect-error null is not in the types
      value: [null]
    })
    expect(single()).toBeUndefined()
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
    fireEvent.click(container.firstChild!)
    fireEvent.click(getByText('Apple'))
    expect(chips()).toEqual(['Cherry', 'Apple'])
    const input = container.querySelector<HTMLElement>('.msl-input')!
    type(input, 'kiwi')
    type(input, 'kiwi', 'Enter')
    expect(chips()).toEqual(['Cherry', 'Apple', 'kiwi'])
    expect(box()!.querySelector('.msl-grp-title')!.textContent).toBe(
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
  it('fires after the clear button empties the value', () => {
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
    expect(q('.msl-clear-btn')).toBeNull()
  })
})

describe('aria', () => {
  it('ids survive SSR hydration; the server, with no document, runs no layout effect', () => {
    const ui = <MultiSelect options={opts} />
    const container = document.createElement('div')
    const error = vi.spyOn(console, 'error')
    vi.stubGlobal('document', undefined)
    const html = renderToString(ui)
    vi.unstubAllGlobals()
    container.innerHTML = html
    document.body.appendChild(container)
    render(ui, { container, hydrate: true })
    expect(error).not.toHaveBeenCalled()
  })

  it('the search field is a combobox wired to the listbox', () => {
    const { root, input, q } = setup()
    const combo = input()
    expect(combo.getAttribute('role')).toBe('combobox')
    expect(combo.getAttribute('aria-haspopup')).toBe('listbox')
    // closed: there is no listbox to point at
    expect(combo.hasAttribute('aria-controls')).toBe(false)
    expect(combo.getAttribute('aria-expanded')).toBe('false')
    expect(combo.getAttribute('aria-disabled')).not.toBe('true')
    expect(combo.hasAttribute('aria-activedescendant')).toBe(false)
    expect(root.hasAttribute('role')).toBe(false)
    expect(combo.hasAttribute('aria-label')).toBe(false)
    fireEvent.click(root)
    const list = q('.msl-options')
    expect(list.getAttribute('role')).toBe('listbox')
    expect(list.getAttribute('aria-multiselectable')).toBe('true')
    expect(list.id).toMatch(/^msl-listbox\S+$/)
    // the same field, open or closed
    expect(input()).toBe(combo)
    expect(input().getAttribute('aria-controls')).toBe(list.id)
    expect(input().getAttribute('aria-expanded')).toBe('true')
    expect(box()!.hasAttribute('role')).toBe(false)
  })

  it('the search field takes its accessible name, description and state from attr', () => {
    const { input } = setup({
      attr: {
        'aria-label': 'Fruit',
        'aria-labelledby': 'fruit-label',
        'aria-describedby': 'fruit-error',
        'aria-invalid': true,
        'aria-required': true
      }
    })
    expect(input().getAttribute('aria-label')).toBe('Fruit')
    expect(input().getAttribute('aria-labelledby')).toBe('fruit-label')
    expect(input().getAttribute('aria-describedby')).toBe('fruit-error')
    expect(input().getAttribute('aria-invalid')).toBe('true')
    expect(input().getAttribute('aria-required')).toBe('true')
  })

  it.each([
    [{ singleSelect: true, defaultValue: ['apple'] }, 'false'],
    [{ disableChip: true, defaultValue: ['apple'] }, 'true'],
    [{ disableSearch: true }, 'true']
  ])(
    'without a search field %o the wrapper is the combobox',
    (props, multi) => {
      const { root, q, input } = setup({
        attr: {
          'aria-label': 'Fruit',
          'aria-describedby': 'fruit-error',
          'aria-invalid': true
        },
        ...props
      })
      expect(input()).toBeNull()
      expect(root.getAttribute('role')).toBe('combobox')
      expect(root.hasAttribute('aria-controls')).toBe(false)
      expect(root.getAttribute('aria-expanded')).toBe('false')
      expect(root.getAttribute('aria-label')).toBe('Fruit')
      fireEvent.click(root)
      const list = q('.msl-options')
      expect(list.getAttribute('aria-multiselectable')).toBe(multi)
      // focus stays on it, with the error it announced
      expect(document.activeElement).toBe(root)
      expect(root.getAttribute('role')).toBe('combobox')
      expect(root.getAttribute('aria-controls')).toBe(list.id)
      expect(root.getAttribute('aria-expanded')).toBe('true')
      expect(root.getAttribute('aria-label')).toBe('Fruit')
      expect(root.getAttribute('aria-describedby')).toBe('fruit-error')
      expect(root.getAttribute('aria-invalid')).toBe('true')
      expect(box()!.hasAttribute('role')).toBe(false)
    }
  )

  it('options expose role, id, selected and disabled state', () => {
    const { qa, root } = setup({
      options: [...opts, { label: 'Off', value: 'off', disabled: true }],
      defaultValue: ['banana']
    })
    fireEvent.click(root)
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
    const { qa, root } = setup({ options: grouped })
    fireEvent.click(root)
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
    // opening one closes the other
    const ids = [...container.querySelectorAll('.msl-wrp')].flatMap((root) => {
      fireEvent.click(root)
      return [...box()!.querySelectorAll('[id]')].map((el) => el.id)
    })
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
  it('marks state in attributes, for utility CSS variants', () => {
    const { root, q, qa } = setup({ defaultValue: ['apple'] })
    expect(root.hasAttribute('data-disabled')).toBe(false)
    expect(q('.msl').hasAttribute('data-open')).toBe(false)
    press(root, 'ArrowDown')
    expect(q('.msl').getAttribute('data-open')).toBe('true')
    expect(qa('[data-focused]').map((el) => el.textContent)).toEqual(['Apple'])
    press(root, 'ArrowDown')
    expect(qa('[data-focused]').map((el) => el.textContent)).toEqual(['Banana'])
  })

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

  it('leaves keys on JSX in the menu to it, but not keys on the listbox', () => {
    const { q, input, chips, focusedOption } = setupKeys({
      options: [{ title: <button>All</button>, type: 'group', childs: opts }]
    })
    press(input(), 'ArrowDown')
    const all = q('.msl-grp-title button')
    all.focus()
    // not prevented, so the browser clicks it; the highlighted Apple stays unpicked
    expect(press(all, 'Enter')).toBe(true)
    expect(press(all, ' ')).toBe(true)
    expect(chips()).toEqual([])
    expect(document.activeElement).toBe(all)
    // the listbox takes focus on a click in it outside the options
    press(q('.msl-options'), 'ArrowDown')
    expect(focusedOption()).toBe('Banana')
    cleanup()
    const { q: q2, root: root2 } = setupKeys({
      options: [],
      emptyDataLabel: <button>Add</button>
    })
    fireEvent.click(root2)
    const add = q2('.msl-options button')
    add.focus()
    expect(press(add, 'Enter')).toBe(true)
    expect(document.activeElement).toBe(add)
    cleanup()
    // no tab stop, focused by a click: its keys too
    const { q: q3, root: root3 } = setupKeys({
      options: [],
      emptyDataLabel: <button tabIndex={-1}>Add</button>
    })
    fireEvent.click(root3)
    const add3 = q3('.msl-options button')
    add3.focus()
    expect(press(add3, 'Enter')).toBe(true)
    expect(document.activeElement).toBe(add3)
  })

  it('Tab moves to and from focusable JSX in the menu, the menu open: focus leaving it closes it', () => {
    const outside = document.body.appendChild(document.createElement('button'))
    try {
      const { q, root, input, isOpen } = setupKeys({
        options: [],
        emptyDataLabel: <button>Add</button>
      })
      fireEvent.click(root)
      // not prevented: the browser moves focus on to the button
      expect(press(input(), 'Tab')).toBe(true)
      expect(isOpen()).toBe(true)
      const add = q('.msl-options button')
      add.focus()
      expect(press(add, 'Tab', { shiftKey: true })).toBe(true)
      expect(isOpen()).toBe(true)
      // past its last stop the browser moves focus out, which closes it
      expect(press(add, 'Tab')).toBe(true)
      expect(isOpen()).toBe(true)
      act(() => outside.focus())
      expect(isOpen()).toBe(false)
    } finally {
      outside.remove()
    }
  })

  it('with a value, Tab reaches JSX in the menu through the clear button, the menu open', () => {
    const { q, root, input, isOpen } = setupKeys({
      defaultValue: ['apple'],
      options: [{ title: <button>All</button>, type: 'group', childs: opts }]
    })
    fireEvent.click(root)
    // not prevented: the browser moves focus on through the open box
    expect(press(input(), 'Tab')).toBe(true)
    expect(isOpen()).toBe(true)
    const clear = q('.msl-clear-btn')
    clear.focus()
    expect(press(clear, 'Tab')).toBe(true)
    expect(isOpen()).toBe(true)
    const all = q('.msl-grp-title button')
    all.focus()
    expect(press(all, 'Tab', { shiftKey: true })).toBe(true)
    expect(isOpen()).toBe(true)
  })

  it('Tab from an option or the listbox closes after the browser moves on from it, not prevented', async () => {
    const { q, root, option, isOpen } = setupKeys({
      disableSearch: true,
      defaultValue: ['apple']
    })
    const tick = () => act(() => new Promise((r) => setTimeout(r)))
    fireEvent.click(root)
    // a click focuses the option, and no search field takes focus back
    option('Banana').focus()
    expect(press(option('Banana'), 'Tab')).toBe(true)
    // the browser moves on from the listbox, still there: Firefox and Safari restart elsewhere from a removed
    // element, Firefox from a clicked option too
    expect(isOpen()).toBe(true)
    expect(document.activeElement).toBe(q('.msl-options'))
    await tick()
    expect(isOpen()).toBe(false)
    fireEvent.click(root)
    q('.msl-options').focus()
    expect(press(q('.msl-options'), 'Tab', { shiftKey: true })).toBe(true)
    await tick()
    expect(isOpen()).toBe(false)
  })

  it('Tab or Escape from the wrapper itself closes, focus left on it', () => {
    const { root, isOpen } = setupKeys({ defaultValue: ['apple'] })
    fireEvent.click(root)
    // a click on chip text focuses the wrapper: the chip is clickable, so focus stays there
    root.focus()
    expect(press(root, 'Tab')).toBe(true)
    expect(isOpen()).toBe(false)
    expect(document.activeElement).toBe(root)
    fireEvent.click(root)
    root.focus()
    press(root, 'Escape')
    expect(isOpen()).toBe(false)
    expect(document.activeElement).toBe(root)
  })

  it('arrows step over options that share a value', () => {
    const { input, activeId, qa, root } = setupKeys({
      options: [
        { title: 'Recent', type: 'group', childs: opts.slice(0, 1) },
        { title: 'All', type: 'group', childs: opts }
      ]
    })
    fireEvent.click(root)
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
    fireEvent.input(input(), { target: { value: 'a' } })
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
      // single select closes; disableChip stays open
      expect(document.activeElement).toBe(root)
    }
  )

  it.each([
    ['a click', () => fireEvent.click(box()!.querySelector('.msl-option')!)],
    [
      'typed text and Enter',
      () => type(box()!.querySelector('input')!, 'ap', 'Enter')
    ],
    ['typed text and comma', () => type(box()!.querySelector('input')!, 'ap,')]
  ])(
    'a pick by %s that removes the search field keeps focus on the wrapper, the menu open',
    (_, pick) => {
      for (const props of [
        { disableChip: true },
        { singleSelect: true, closeOnSelect: false }
      ]) {
        const { root, single, unmount } = setupKeys(props)
        fireEvent.click(root)
        pick()
        expect(single()).toBe('Apple')
        expect(box()!.querySelector('input')).toBeNull()
        expect(document.activeElement).toBe(root)
        unmount()
      }
    }
  )

  it('the wrapper drives the highlight when there is no search field', () => {
    const { root, chips, focusedOption, activeId } = setupKeys({
      disableSearch: true
    })
    press(root, 'ArrowDown')
    expect(focusedOption()).toBe('Apple')
    expect(document.activeElement).toBe(root)
    expect(activeId(root)).toBe(box()!.querySelector('.msl-option-focused')!.id)
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
    fireEvent.input(input(), { target: { value: 'x' } })
    press(input(), 'Backspace')
    expect(chips()).toEqual(['Apple', 'Banana'])
    fireEvent.input(input(), { target: { value: '' } })
    press(root, 'Backspace')
    expect(chips()).toEqual(['Apple', 'Banana'])
    press(input(), 'Backspace')
    expect(chips()).toEqual(['Apple'])
    press(input(), 'Backspace')
    press(input(), 'Backspace')
    expect(chips()).toEqual([])
    expect(values(onChange)).toEqual([['apple'], []])
  })

  it('deleteOnBackspace={false} leaves chips to their delete buttons', () => {
    const { input, chips, onChange } = setupKeys({
      defaultValue: ['apple'],
      deleteOnBackspace: false
    })
    press(input(), 'Backspace')
    expect(chips()).toEqual(['Apple'])
    expect(onChange).not.toHaveBeenCalled()
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

const fruits = [
  {
    type: 'group',
    title: 'Citrus',
    collapsible: true,
    childs: [
      { label: 'Lemon', value: 'lemon' },
      { label: 'Lime', value: 'lime' }
    ]
  },
  {
    type: 'group',
    title: 'Berries',
    collapsible: true,
    collapsed: true,
    childs: [{ label: 'Blueberry', value: 'blueberry' }]
  }
]

const nested = [
  { label: 'Apple', value: 'apple' },
  {
    type: 'submenu',
    title: 'Veg',
    childs: [
      { label: 'Carrot', value: 'carrot' },
      {
        type: 'submenu',
        title: 'Greens',
        childs: [
          { label: 'Kale', value: 'kale' },
          { label: 'Leek', value: 'leek', disabled: true }
        ]
      },
      { label: 'Potato', value: 'potato' }
    ]
  },
  { label: 'Banana', value: 'banana' }
]

function setupTree(props: MultiSelectProps = {}) {
  const utils = setup(props)
  return {
    ...utils,
    focused: () => utils.q('.msl-option-focused')?.textContent,
    // the open submenus, by title, outermost first
    subs: () =>
      utils
        .qa('.msl-submenu')
        .map(
          (el) =>
            document.getElementById(el.getAttribute('aria-labelledby')!)!
              .textContent
        ),
    titles: () =>
      utils.qa('.msl-grp-title').map((el) => el.getAttribute('aria-expanded'))
  }
}

describe('collapsible groups', () => {
  it('collapsed with no exit CSS, its rows go at once: no copy of them', () => {
    const clone = vi.spyOn(Node.prototype, 'cloneNode')
    const { root, q } = setupTree({ options: fruits })
    fireEvent.click(root)
    fireEvent.click(q('.msl-grp-title'))
    expect(clone).not.toHaveBeenCalled()
  })

  it('the title shows and hides the childs, hidden at first with collapsed', () => {
    const { root, qa, optionTexts, titles, isOpen } = setupTree({
      options: fruits
    })
    fireEvent.click(root)
    const [citrus, berries] = qa('.msl-grp-title')
    // a row the keyboard reaches, which still names its group
    expect(citrus.getAttribute('role')).toBe('option')
    expect(citrus.hasAttribute('aria-selected')).toBe(false)
    expect(
      citrus.closest('[role="group"]')!.getAttribute('aria-labelledby')
    ).toBe(citrus.id)
    expect(titles()).toEqual(['true', 'false'])
    expect(optionTexts()).toEqual(['Lemon', 'Lime'])
    fireEvent.click(citrus)
    fireEvent.click(berries)
    expect(titles()).toEqual(['false', 'true'])
    expect(optionTexts()).toEqual(['Blueberry'])
    expect(isOpen()).toBe(true)
    // kept from one open to the next
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(root)
    expect(titles()).toEqual(['false', 'true'])
    fireEvent.click(qa('.msl-grp-title')[1])
    expect(optionTexts()).toEqual([])
  })

  it('a toggle stays with its group: new options with another group in its place show that one as set', () => {
    const { root, qa, titles, rerender } = setupTree({ options: fruits })
    fireEvent.click(root)
    fireEvent.click(qa('.msl-grp-title')[1])
    expect(titles()).toEqual(['true', 'true'])
    rerender(
      <MultiSelect options={[fruits[0], { ...fruits[1], title: 'Nuts' }]} />
    )
    expect(titles()).toEqual(['true', 'false'])
    rerender(<MultiSelect options={fruits} />)
    expect(titles()).toEqual(['true', 'true'])
  })

  it('arrows reach the titles, Enter toggles them', () => {
    const { input, focused, titles, optionTexts, onChange } = setupTree({
      options: fruits
    })
    const key = (k: string) => {
      press(input(), k)
      return focused()
    }
    expect(key('ArrowDown')).toBe('Citrus')
    expect(input().getAttribute('aria-activedescendant')).toBe(
      document.querySelector('.msl-grp-title')!.id
    )
    expect(key('Enter')).toBe('Citrus')
    expect(titles()).toEqual(['false', 'false'])
    expect(['ArrowDown', 'Enter', 'ArrowDown', 'ArrowDown'].map(key)).toEqual([
      'Berries',
      'Berries',
      'Blueberry',
      'Blueberry'
    ])
    expect(optionTexts()).toEqual(['Blueberry'])
    expect(key('Home')).toBe('Citrus')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Enter on a focused title toggles it, not the highlighted row', () => {
    const { root, qa, titles, focused } = setupTree({
      options: fruits,
      disableSearch: true
    })
    press(root, 'End')
    expect(focused()).toBe('Berries')
    press(qa('.msl-grp-title')[0], 'Enter')
    expect(titles()).toEqual(['false', 'false'])
  })

  it('titles stay reachable past the limit, and getValue never sees a group', () => {
    const { input, focused } = setupTree({
      options: [...fruits, { label: 'Kiwi', value: 'kiwi' }],
      limit: 1,
      defaultValue: ['lemon'],
      // throws on a group, which has no value
      getValue: (opt: MultiSelectOption) => opt.value.toString()
    })
    const key = (k: string) => {
      press(input(), k)
      return focused()
    }
    // Lime and Kiwi are disabled
    expect(
      ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'].map(key)
    ).toEqual(['Citrus', 'Lemon', 'Berries', 'Berries'])
  })
})

describe('submenus', () => {
  it('a title row opens the childs in a group beside it, placed by CSS anchors', () => {
    const { root, option, qa, optionTexts, subs } = setupTree({
      options: nested,
      classNames: { submenu: 'tw-sub' }
    })
    fireEvent.click(root)
    const veg = option('Veg')
    expect(veg.getAttribute('role')).toBe('option')
    expect(veg.getAttribute('aria-expanded')).toBe('false')
    expect(veg.hasAttribute('aria-selected')).toBe(false)
    expect(veg.hasAttribute('style')).toBe(false)
    expect(optionTexts()).toEqual(['Apple', 'Veg', 'Banana'])
    fireEvent.click(veg)
    fireEvent.click(veg)
    expect(veg.getAttribute('aria-expanded')).toBe('true')
    expect(subs()).toEqual(['Veg'])
    const [menu] = qa('.msl-submenu')
    expect(menu.getAttribute('role')).toBe('group')
    expect(menu.className).toBe('msl-submenu tw-sub')
    // in the listbox, right after its title
    expect(veg.nextElementSibling).toBe(menu)
    expect(optionTexts()).toEqual([
      'Apple',
      'Veg',
      'Carrot',
      'Greens',
      'Potato',
      'Banana'
    ])
    fireEvent.click(option('Greens'))
    expect(subs()).toEqual(['Veg', 'Greens'])
    // an anchor name per depth: one open submenu each
    const anchors = (el: HTMLElement) => [
      (el.style as CSSStyleDeclaration & { anchorName: string }).anchorName,
      (el.nextElementSibling as HTMLElement).style.positionAnchor
    ]
    expect(anchors(veg)).toEqual(['--msl-0', '--msl-0'])
    expect(anchors(option('Greens'))).toEqual(['--msl-1', '--msl-1'])
  })

  it('picks in submenus; a pick that closes the menu closes them too', () => {
    const { root, option, chips, onChange, subs, isOpen, rerender } = setupTree(
      { options: nested }
    )
    fireEvent.click(root)
    fireEvent.click(option('Veg'))
    fireEvent.click(option('Greens'))
    fireEvent.click(option('Kale'))
    expect(chips()).toEqual(['Kale'])
    expect(onChange).toHaveBeenLastCalledWith(
      ['kale'],
      [{ label: 'Kale', value: 'kale' }]
    )
    // multi select stays open, submenus too
    expect(subs()).toEqual(['Veg', 'Greens'])
    rerender(<MultiSelect options={nested} singleSelect />)
    fireEvent.click(option('Carrot'))
    expect(isOpen()).toBe(false)
    fireEvent.click(root)
    expect(subs()).toEqual([])
  })

  it('a pause in a submenu off its rows (a group title, a gap) holds it: a row crossed on the way in changes nothing', () => {
    vi.useFakeTimers()
    try {
      const { root, q, option, subs } = setupTree({ options: nested })
      fireEvent.click(root)
      fireEvent.mouseEnter(option('Veg'))
      act(() => vi.advanceTimersByTime(100))
      fireEvent.mouseEnter(option('Banana'))
      fireEvent.mouseEnter(q('.msl-submenu'))
      act(() => vi.advanceTimersByTime(100))
      expect(subs()).toEqual(['Veg'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('shown with the submenus open in it, as its group opens again, it shows first, they over it', () => {
    const proto = HTMLElement.prototype as Partial<HTMLElement>
    const shown: Element[] = []
    proto.showPopover = function (this: HTMLElement) {
      shown.push(this)
    }
    try {
      const { input, q, qa, subs } = setupTree({
        options: [
          { type: 'group', title: 'All', collapsible: true, childs: nested }
        ]
      })
      ;[
        'ArrowDown',
        'ArrowDown',
        'ArrowDown',
        'ArrowRight',
        'ArrowDown',
        'ArrowRight'
      ].forEach((k) => press(input(), k))
      expect(subs()).toEqual(['Veg', 'Greens'])
      const title = q('.msl-grp-title')
      fireEvent.click(title)
      fireEvent.click(title)
      expect(subs()).toEqual(['Veg', 'Greens'])
      // effects run child first: Greens, then Veg over it, then Greens again
      const [veg, greens] = qa('.msl-submenu')
      expect(shown.slice(-3)).toEqual([greens, veg, greens])
      expect(greens.getAttribute('popover')).toBe('manual')
    } finally {
      delete proto.showPopover
    }
  })

  it('a pause on a row opens its submenu and closes deeper ones; rows crossed on the way change nothing', () => {
    vi.useFakeTimers()
    try {
      const { root, input, option, subs } = setupTree({ options: nested })
      fireEvent.click(root)
      const rest = (text: string, ms = 100) => {
        fireEvent.mouseEnter(option(text))
        act(() => vi.advanceTimersByTime(ms))
        return subs()
      }
      expect(rest('Veg', 99)).toEqual([])
      act(() => vi.advanceTimersByTime(1))
      expect(subs()).toEqual(['Veg'])
      expect(rest('Greens')).toEqual(['Veg', 'Greens'])
      expect(rest('Carrot')).toEqual(['Veg'])
      // over Banana on the way back to Potato: too quick to close Veg
      expect(rest('Banana', 50)).toEqual(['Veg'])
      expect(rest('Potato')).toEqual(['Veg'])
      expect(rest('Apple')).toEqual([])
      // a pause cut short by the menu closing opens nothing
      fireEvent.mouseEnter(option('Veg'))
      press(input(), 'Escape')
      act(() => vi.advanceTimersByTime(100))
      fireEvent.click(root)
      expect(subs()).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })

  it('Right Arrow or Enter go into a submenu, Left Arrow or Escape back out; arrows stay in it', () => {
    const { input, focused, subs, isOpen, option } = setupTree({
      options: nested
    })
    const key = (k: string) => {
      expect(press(input(), k)).toBe(false)
      return focused()
    }
    expect(['ArrowDown', 'ArrowDown', 'ArrowRight'].map(key)).toEqual([
      'Apple',
      'Veg',
      'Carrot'
    ])
    expect(subs()).toEqual(['Veg'])
    // Banana, at the top, is out of reach
    expect(
      ['ArrowDown', 'ArrowDown', 'ArrowDown', 'Home', 'End', 'ArrowUp'].map(key)
    ).toEqual(['Greens', 'Potato', 'Potato', 'Carrot', 'Potato', 'Greens'])
    // Leek is disabled
    expect(['Enter', 'ArrowDown'].map(key)).toEqual(['Kale', 'Kale'])
    expect(input().getAttribute('aria-activedescendant')).toBe(
      option('Kale').id
    )
    expect(subs()).toEqual(['Veg', 'Greens'])
    expect(key('ArrowLeft')).toBe('Greens')
    expect(subs()).toEqual(['Veg'])
    expect(['ArrowRight', 'Escape'].map(key)).toEqual(['Kale', 'Greens'])
    expect(key('Escape')).toBe('Veg')
    expect(subs()).toEqual([])
    expect(isOpen()).toBe(true)
    // the caret's, off a submenu
    expect(press(input(), 'ArrowLeft')).toBe(true)
    key('ArrowUp')
    expect(press(input(), 'ArrowRight')).toBe(true)
    key('Escape')
    expect(isOpen()).toBe(false)
  })

  it('right to left, where submenus open on the left, Left Arrow goes in and Right Arrow back out', () => {
    const { input, focused, subs } = setupTree({
      options: nested,
      attr: { dir: 'rtl' }
    })
    const key = (k: string) => {
      press(input(), k)
      return focused()
    }
    expect(['ArrowDown', 'ArrowDown'].map(key)).toEqual(['Apple', 'Veg'])
    // the caret's
    expect(press(input(), 'ArrowRight')).toBe(true)
    expect(key('ArrowLeft')).toBe('Carrot')
    expect(subs()).toEqual(['Veg'])
    expect(press(input(), 'ArrowLeft')).toBe(true)
    expect(key('ArrowRight')).toBe('Veg')
    expect(subs()).toEqual([])
  })

  it('right to left by CSS direction alone stays left to right, as the stylesheet places submenus by :dir()', () => {
    const { input, focused, subs } = setupTree({
      options: nested,
      style: { direction: 'rtl' }
    })
    press(input(), 'ArrowDown')
    press(input(), 'ArrowDown')
    expect(press(input(), 'ArrowLeft')).toBe(true)
    expect(subs()).toEqual([])
    press(input(), 'ArrowRight')
    expect(focused()).toBe('Carrot')
  })

  it('a close from a focused row in a submenu leaves focus in the widget, not on the body', () => {
    const { root, input, option } = setupTree({
      options: nested,
      closeOnSelect: true
    })
    fireEvent.click(root)
    fireEvent.click(option('Veg'))
    // as a click does in a browser
    option('Carrot').focus()
    fireEvent.click(option('Carrot'))
    expect(document.activeElement).toBe(input())
  })

  it('a submenu closing with a focused row in it leaves focus on the listbox, where keys still work', () => {
    vi.useFakeTimers()
    try {
      const { root, q, option, focused, subs } = setupTree({
        options: nested,
        disableSearch: true
      })
      fireEvent.click(root)
      fireEvent.click(option('Veg'))
      option('Carrot').focus()
      fireEvent.mouseEnter(option('Apple'))
      act(() => vi.advanceTimersByTime(100))
      expect(subs()).toEqual([])
      expect(document.activeElement).toBe(q('.msl-options'))
      press(q('.msl-options'), 'ArrowDown')
      expect(focused()).toBe('Apple')
      // Escape from a focused row closes it all, focus on the wrapper
      fireEvent.click(option('Veg'))
      option('Carrot').focus()
      press(option('Carrot'), 'Escape')
      expect(document.activeElement).toBe(root)
    } finally {
      vi.useRealTimers()
    }
  })

  it('Enter on a focused title opens it, not the highlighted row', () => {
    const { root, option, subs, focused, onChange } = setupTree({
      options: nested,
      disableSearch: true
    })
    press(root, 'ArrowDown')
    press(option('Veg'), 'Enter')
    expect(subs()).toEqual(['Veg'])
    expect(focused()).toBe('Apple')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('an empty submenu shows its emptyDataLabel, the highlight left on its title', () => {
    const { input, focused, subs, q } = setupTree({
      options: [
        { type: 'submenu', title: 'None', childs: [], emptyDataLabel: 'Nada' }
      ]
    })
    press(input(), 'ArrowDown')
    expect(
      ['ArrowRight', 'Enter'].map((k) => (press(input(), k), focused()))
    ).toEqual(['None', 'None'])
    expect(subs()).toEqual(['None'])
    expect(q('.msl-submenu').textContent).toBe('Nada')
  })

  it('the highlight holds as a submenu opens above it', () => {
    vi.useFakeTimers()
    try {
      const { input, option, focused } = setupTree({
        options: [
          {
            type: 'submenu',
            title: 'S1',
            childs: [{ label: 'Kiwi', value: 'kiwi' }]
          },
          {
            type: 'submenu',
            title: 'S2',
            childs: [{ label: 'Lime', value: 'lime' }]
          },
          { label: 'Apple', value: 'apple' }
        ]
      })
      const rest = (text: string) => {
        fireEvent.mouseEnter(option(text))
        act(() => vi.advanceTimersByTime(100))
      }
      press(input(), 'End')
      rest('S1')
      expect(focused()).toBe('Apple')
      press(input(), 'ArrowUp')
      expect(focused()).toBe('S2')
      // S1 closes: S2 moves up
      rest('S2')
      expect(focused()).toBe('S2')
    } finally {
      vi.useRealTimers()
    }
  })

  it('search finds options in submenus and collapsed groups, listed flat', () => {
    const { input, optionTexts, qa } = setupTree({
      options: [...nested, ...fruits]
    })
    type(input(), 'l')
    expect(optionTexts()).toEqual([
      'Apple',
      'Kale',
      'Leek',
      'Lemon',
      'Lime',
      'Blueberry'
    ])
    expect(qa('.msl-options [aria-expanded]')).toEqual([])
  })

  it('shows submenus as manual popovers where the browser has the API', () => {
    const shown: Element[] = []
    const proto = HTMLElement.prototype as Partial<HTMLElement>
    proto.showPopover = function (this: HTMLElement) {
      shown.push(this)
    }
    try {
      const { root, option, q } = setupTree({ options: nested })
      fireEvent.click(root)
      fireEvent.click(option('Veg'))
      const menu = q('.msl-submenu')
      expect(shown).toEqual([pop(), menu])
      expect(menu.getAttribute('popover')).toBe('manual')
    } finally {
      delete proto.showPopover
    }
  })

  it('opens submenus in the flow, under their title, where the browser has no CSS anchor positioning to place them', () => {
    const shown: Element[] = []
    const proto = HTMLElement.prototype as Partial<HTMLElement>
    proto.showPopover = function (this: HTMLElement) {
      shown.push(this)
    }
    const supports = vi.spyOn(CSS, 'supports').mockReturnValue(false)
    try {
      const { root, option, q } = setupTree({ options: nested })
      fireEvent.click(root)
      fireEvent.click(option('Veg'))
      expect(supports).toHaveBeenCalledWith('position-area:right')
      const veg = q('.msl-submenu')
      expect(veg.hasAttribute('popover')).toBe(false)
      expect(veg.previousElementSibling!.textContent).toBe('Veg')
      // older jsdom has no CSS
      vi.stubGlobal('CSS', undefined)
      fireEvent.click(option('Greens'))
      expect(veg.querySelector('.msl-submenu')!.hasAttribute('popover')).toBe(
        false
      )
      expect(shown).toEqual([pop()])
    } finally {
      vi.unstubAllGlobals()
      delete proto.showPopover
    }
  })
})

describe('exit animations', () => {
  const proto = Element.prototype as Partial<Element>
  const timing = (endTime: number) => ({
    effect: { getComputedTiming: () => ({ endTime }) },
    finish: vi.fn()
  })
  // jsdom has no animations: these run one always (a hover's transition), one never ending (a spinner),
  // and one at or in a [data-closing] element until end()
  function animate() {
    let resolve = () => {}
    const hover = { ...timing(200), finished: new Promise(() => {}) }
    const spin = timing(Infinity)
    const exit = {
      ...timing(150),
      finished: new Promise<void>((r) => (resolve = r))
    }
    proto.getAnimations = function (this: Element) {
      const closing =
        this.closest('[data-closing]') || this.querySelector('[data-closing]')
      return [hover, spin, ...(closing ? [exit] : [])] as never
    }
    return {
      hover,
      spin,
      end: () =>
        act(async () => {
          resolve()
        })
    }
  }
  afterEach(() => {
    delete proto.getAnimations
    delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover
  })

  it('the closed menu stays until the exit animations data-closing starts end, inert, with its search', async () => {
    const a = animate()
    const { root, q, input, option, optionTexts, onMenuClose } = setup()
    fireEvent.click(root)
    type(input(), 'an')
    option('Banana').focus()
    press(option('Banana'), 'Escape')
    const ctl = q('.msl')
    expect(ctl.hasAttribute('data-closing')).toBe(true)
    // the open look stays: the exit animates from it
    expect(ctl.hasAttribute('data-open')).toBe(true)
    expect(q('.msl-options').hasAttribute('inert')).toBe(true)
    expect(input().getAttribute('aria-expanded')).toBe('false')
    expect(onMenuClose).toHaveBeenCalledTimes(1)
    // out of the inert menu
    expect(document.activeElement).toBe(input())
    expect(input().value).toBe('an')
    expect(optionTexts()).toEqual(['Banana'])
    // the hover's transition ran before: not the exit's, not cut short
    expect(a.hover.finish).not.toHaveBeenCalled()
    await a.end()
    expect(q('.msl-options')).toBeNull()
    expect(ctl.hasAttribute('data-closing')).toBe(false)
    expect(input().value).toBe('')
    expect(a.spin.finish).not.toHaveBeenCalled()
  })

  it('a search edited while it closes (Backspace, a paste: no reopen) stays once it has gone', async () => {
    const a = animate()
    const { root, input } = setup()
    fireEvent.click(root)
    type(input(), 'ban')
    press(input(), 'Escape')
    fireEvent.change(input(), { target: { value: 'ba' } })
    await a.end()
    expect(box()).toBeNull()
    expect(input().value).toBe('ba')
  })

  it('opened again mid exit, it is the same menu, as it was', async () => {
    const a = animate()
    const { root, q, input } = setup({ searchInMenu: true })
    fireEvent.click(root)
    const field = input()
    press(field, 'Escape')
    // no inline field: the wrapper, the combobox again, not the inert field
    expect(document.activeElement).toBe(root)
    expect(root.getAttribute('role')).toBe('combobox')
    expect(root.getAttribute('aria-expanded')).toBe('false')
    expect(field.hasAttribute('role')).toBe(false)
    expect(q('.msl-search').hasAttribute('inert')).toBe(true)
    fireEvent.click(root)
    expect(field.getAttribute('role')).toBe('combobox')
    expect(root.hasAttribute('role')).toBe(false)
    expect(q('.msl').hasAttribute('data-closing')).toBe(false)
    expect(q('.msl-search').hasAttribute('inert')).toBe(false)
    expect(q('.msl-options').hasAttribute('inert')).toBe(false)
    expect(input()).toBe(field)
    expect(document.activeElement).toBe(field)
    // the first close's end leaves it open
    await a.end()
    expect(q('.msl-options')).not.toBeNull()
  })

  it('opened again mid exit, the search its close was to clear is gone: no hidden filter, Enter picks nothing', async () => {
    const a = animate()
    const { root, q, input, option, optionTexts, single, onChange } = setup({
      singleSelect: true
    })
    fireEvent.click(root)
    type(input(), 'an')
    fireEvent.click(option('Banana'))
    // the value took the search field's place, the closing menu shows the search
    expect(single()).toBe('Banana')
    expect(q('input.msl-input')).toBeNull()
    expect(optionTexts()).toEqual(['Banana'])
    // Enter again opens it: Banana, the search's first result, isn't picked again (off)
    press(root)
    expect(values(onChange)).toEqual([['banana']])
    expect(q('.msl').hasAttribute('data-closing')).toBe(false)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
    await a.end()
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  it('a closed submenu leaves a copy where it was, until it has left; open again, the copy goes', async () => {
    const a = animate()
    const shown: Element[] = []
    ;(HTMLElement.prototype as Partial<HTMLElement>).showPopover = function (
      this: HTMLElement
    ) {
      shown.push(this)
    }
    const { input, q, qa } = setupTree({ options: nested })
    press(input(), 'ArrowDown')
    press(input(), 'ArrowDown')
    press(input(), 'ArrowRight')
    const menu = q('.msl-submenu')
    vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20
    } as DOMRect)
    // scrolled, and a scroller in it too (a virtual list's)
    menu.scrollTop = 40
    menu.lastElementChild!.scrollTop = 7
    press(input(), 'ArrowLeft')
    const [copy] = qa('.msl-submenu')
    // a clone starts at the top: it fades out as it was
    expect([copy.scrollTop, copy.lastElementChild!.scrollTop]).toEqual([40, 7])
    expect(menu.isConnected).toBe(false)
    expect(copy.hasAttribute('data-closing')).toBe(true)
    expect(copy.hasAttribute('inert')).toBe(true)
    expect(copy.querySelector('[id]')).toBeNull()
    // there, as its title may place another submenu
    expect([copy.style.left, copy.style.top, copy.style.margin]).toEqual([
      '10px',
      '20px',
      '0px'
    ])
    expect(shown).toEqual([pop(), menu, copy])
    // its enter animations would run again on a new element
    expect(a.hover.finish).toHaveBeenCalled()
    expect(a.spin.finish).not.toHaveBeenCalled()
    await act(async () => {})
    expect(copy.isConnected).toBe(true)
    press(input(), 'ArrowRight')
    expect(copy.isConnected).toBe(false)
    expect(qa('.msl-submenu')).toHaveLength(1)
    press(input(), 'ArrowLeft')
    await a.end()
    expect(qa('.msl-submenu')).toEqual([])
  })

  it("a submenu's copy goes in the listbox, out of the rows a search swaps; open again, only its own goes", async () => {
    const a = animate()
    ;(HTMLElement.prototype as Partial<HTMLElement>).showPopover = () => {}
    const { input, q, qa } = setupTree({ options: nested })
    // by their first row: Veg's Carrot, Greens' Kale
    const copies = () =>
      qa('.msl-options > .msl-submenu').map((el) => [
        el.querySelector('.msl-option')!.textContent,
        el.hasAttribute('data-closing')
      ])
    press(input(), 'ArrowDown')
    press(input(), 'ArrowDown')
    press(input(), 'ArrowRight')
    press(input(), 'ArrowDown')
    press(input(), 'ArrowRight')
    press(input(), 'ArrowLeft')
    press(input(), 'ArrowLeft')
    expect(copies()).toEqual([
      ['Kale', true],
      ['Carrot', true]
    ])
    // Veg again, labelled as its copy
    press(input(), 'ArrowRight')
    expect(copies()).toEqual([['Kale', true]])
    press(input(), 'ArrowDown')
    press(input(), 'ArrowRight')
    expect(copies()).toEqual([])
    // both go with the rows' box. Veg's copy drops the Greens it held, a popover never shown that a
    // stylesheet's display would show: Greens has a copy of its own
    type(input(), 'a')
    expect(copies()).toEqual([
      ['Carrot', true],
      ['Kale', true]
    ])
    expect(qa('.msl-options > .msl-submenu [popover]')).toEqual([])
    // nor Greens' title the anchor a submenu opening at its depth would find
    expect(qa('.msl-options > .msl-submenu [style*="anchor-name"]')).toEqual([])
    expect(q('.msl-options > .msl-submenu').parentElement).toBe(
      q('.msl-options')
    )
    await a.end()
    expect(copies()).toEqual([])
  })

  it("strict mode's test unmount leaves no copy", async () => {
    animate()
    const { container } = render(
      <StrictMode>
        <MultiSelect options={nested} />
      </StrictMode>
    )
    fireEvent.click(container.firstChild as Element)
    fireEvent.click(
      [...container.querySelectorAll('.msl-option')].find(
        (el) => el.textContent === 'Veg'
      )!
    )
    await act(async () => {})
    expect(container.querySelectorAll('.msl-submenu')).toHaveLength(1)
    expect(container.querySelector('[data-closing]')).toBeNull()
  })

  it("a collapsed group's rows leave a copy, until it has left", async () => {
    const a = animate()
    const { root, q } = setupTree({ options: fruits })
    fireEvent.click(root)
    const title = q('.msl-grp-title')
    // the rows' box, for the copy, with one box in it: a grid row of that animates the height
    const body = title.nextElementSibling!
    expect(body.className).toBe('msl-grp-body ')
    expect(body.children).toHaveLength(1)
    expect(body.firstElementChild!.hasAttribute('class')).toBe(false)
    fireEvent.click(title)
    const copy = q('.msl-grp > .msl-grp-body[data-closing]')
    expect(copy.hasAttribute('inert')).toBe(true)
    expect(copy.hasAttribute('popover')).toBe(false)
    expect(copy.querySelector('[id]')).toBeNull()
    expect(
      [...copy.querySelectorAll('.msl-option')].map((el) => el.textContent)
    ).toEqual(['Lemon', 'Lime'])
    await a.end()
    expect(q('[data-closing]')).toBeNull()
  })
})

// settles a load, then lets its promise chain run out
const settle = (f: () => void = () => {}) =>
  act(async () => {
    f()
    await new Promise((r) => setTimeout(r))
  })

// a loader whose loads wait for the test: each one's request, and ok / fail to settle it
function loads() {
  const calls: {
    req: MultiSelectLoadRequest
    ok: (v: MultiSelectLoaded) => Promise<void>
    fail: () => Promise<void>
  }[] = []
  const fn = vi.fn(
    (req: MultiSelectLoadRequest) =>
      new Promise<MultiSelectLoaded>((res, rej) => {
        calls.push({
          req,
          ok: (v) => settle(() => res(v)),
          fail: () => settle(() => rej(new Error('down')))
        })
      })
  )
  return { fn, calls }
}

const request = (search: string, next?: unknown) => ({
  search,
  next,
  signal: expect.any(AbortSignal)
})

describe('loadOptions', () => {
  it('loads the list as the menu first opens, not on mount, and keeps it', async () => {
    const { fn, calls } = loads()
    const { root, q, input, optionTexts, isOpen } = setup({
      options: undefined,
      loadOptions: fn
    })
    expect(fn).not.toHaveBeenCalled()
    fireEvent.click(root)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(calls[0].req).toEqual(request(''))
    const list = q('.msl-options')
    expect(list.getAttribute('aria-busy')).toBe('true')
    expect(optionTexts()).toEqual(['Loading...'])
    const end = q('.msl-loading')
    expect(end.className).toBe('msl-option msl-option-disable msl-loading ')
    expect(end.hasAttribute('role')).toBe(false)
    expect(end.hasAttribute('data-error')).toBe(false)
    await calls[0].ok(opts)
    expect(list.hasAttribute('aria-busy')).toBe(false)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(q('.msl-loading')).toBeNull()
    press(input(), 'Escape')
    expect(isOpen()).toBe(false)
    fireEvent.click(root)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  it('an empty load shows emptyDataLabel', async () => {
    const { fn, calls } = loads()
    const { root, optionTexts } = setup({ options: undefined, loadOptions: fn })
    fireEvent.click(root)
    await calls[0].ok([])
    expect(optionTexts()).toEqual(['No Data Found'])
  })

  it('loads each search text once, trimmed, commas removed, and filters nothing itself', async () => {
    const { fn, calls } = loads()
    const { root, input, optionTexts, onChange } = setup({
      options: undefined,
      loadOptions: fn,
      filterOption: () => false
    })
    fireEvent.click(root)
    await calls[0].ok(opts)
    fireEvent.change(input(), { target: { value: ' an, ' } })
    expect(calls[1].req).toEqual(request('an'))
    // the last search's results are neither shown nor picked
    expect(optionTexts()).toEqual(['Loading...'])
    press(input())
    expect(onChange).not.toHaveBeenCalled()
    await calls[1].ok([opts[1], opts[0]])
    expect(optionTexts()).toEqual(['Banana', 'Apple'])
    // Enter picks the first result
    press(input())
    expect(onChange).toHaveBeenLastCalledWith(['banana'], [opts[1]])
    // the pick cleared the search, whose list loaded once
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
    fireEvent.change(input(), { target: { value: 'an' } })
    expect(fn).toHaveBeenCalledTimes(2)
    expect(optionTexts()).toEqual(['Banana', 'Apple'])
  })

  it('another search aborts the loads on the way: their late results are dropped, and that search loads again', async () => {
    const { fn, calls } = loads()
    const { root, input, optionTexts, unmount } = setup({
      options: undefined,
      loadOptions: fn
    })
    fireEvent.click(root)
    fireEvent.change(input(), { target: { value: 'a' } })
    expect(calls[0].req.signal.aborted).toBe(true)
    expect(calls[1].req).toEqual(request('a'))
    fireEvent.change(input(), { target: { value: 'ab' } })
    expect(calls[1].req.signal.aborted).toBe(true)
    // a loader that ignores the signal
    await calls[1].ok(opts)
    expect(optionTexts()).toEqual(['Loading...'])
    fireEvent.change(input(), { target: { value: 'a' } })
    expect(calls[2].req.signal.aborted).toBe(true)
    expect(calls[3].req).toEqual(request('a'))
    await calls[3].ok([opts[0]])
    expect(optionTexts()).toEqual(['Apple'])
    fireEvent.change(input(), { target: { value: 'b' } })
    unmount()
    expect(calls[4].req.signal.aborted).toBe(true)
  })

  it('loads the next part as the end comes into view, handing back next, until a part comes without one', async () => {
    const { fn, calls } = loads()
    const { root, q, optionTexts } = setup({
      options: undefined,
      loadOptions: fn
    })
    fireEvent.click(root)
    // not observed while it loads
    inView(q('.msl-loading'), true)
    expect(fn).toHaveBeenCalledTimes(1)
    await calls[0].ok({ options: [opts[0]], next: 2 })
    expect(optionTexts()).toEqual(['Apple', 'Loading...'])
    const end = q('.msl-loading')
    inView(end, false)
    expect(fn).toHaveBeenCalledTimes(1)
    // the latest report counts
    inView(end, false, true)
    expect(calls[1].req).toEqual(request('', 2))
    inView(end, true)
    expect(fn).toHaveBeenCalledTimes(2)
    await calls[1].ok({ options: [opts[1]], next: 'cursor' })
    // observed anew: still in view, it goes on
    inView(q('.msl-loading'), true)
    expect(calls[2].req).toEqual(request('', 'cursor'))
    await calls[2].ok({ options: [opts[2]] })
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(q('.msl-loading')).toBeNull()
  })

  it("the keyboard passing a list's end on the way down loads more; it never highlights it", async () => {
    const { fn, calls } = loads()
    const { root, q, input } = setup({ options: undefined, loadOptions: fn })
    const focused = () => q('.msl-option-focused')?.textContent
    fireEvent.click(root)
    await calls[0].ok({ options: opts.slice(0, 2), next: 2 })
    press(input(), 'ArrowDown')
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Banana')
    expect(fn).toHaveBeenCalledTimes(1)
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Banana')
    expect(calls[1].req).toEqual(request('', 2))
    press(input(), 'ArrowDown')
    expect(fn).toHaveBeenCalledTimes(2)
    await calls[1].ok({ options: [opts[2]], next: 3 })
    // up, and End from below the end: no load
    press(input(), 'ArrowUp')
    press(input(), 'End')
    expect(focused()).toBe('Cherry')
    expect(fn).toHaveBeenCalledTimes(2)
    press(input(), 'ArrowDown')
    expect(calls[2].req).toEqual(request('', 3))
  })

  it('a failed load shows errorLabel; a click, the keyboard or the list showing again loads again', async () => {
    const { fn, calls } = loads()
    const { root, q, input, optionTexts } = setup({
      options: undefined,
      loadOptions: fn
    })
    fireEvent.click(root)
    await calls[0].fail()
    const end = q('.msl-loading')
    expect(end.textContent).toBe('Failed to load. Retry')
    expect(end.getAttribute('data-error')).toBe('true')
    expect(q('.msl-options').hasAttribute('aria-busy')).toBe(false)
    // not observed: it would load over and over
    inView(end, true)
    expect(fn).toHaveBeenCalledTimes(1)
    fireEvent.click(end)
    expect(calls[1].req).toEqual(request(''))
    expect(optionTexts()).toEqual(['Loading...'])
    expect(end.hasAttribute('data-error')).toBe(false)
    // a click while it loads does nothing
    fireEvent.click(end)
    expect(fn).toHaveBeenCalledTimes(2)
    await calls[1].fail()
    press(input(), 'ArrowDown')
    expect(fn).toHaveBeenCalledTimes(3)
    await calls[2].fail()
    press(input(), 'Escape')
    fireEvent.click(root)
    expect(fn).toHaveBeenCalledTimes(4)
    await calls[3].ok(opts)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  it('a failed next part keeps the parts loaded, and loads again from the same next', async () => {
    const { fn, calls } = loads()
    const { root, q, optionTexts } = setup({
      options: undefined,
      loadOptions: fn
    })
    fireEvent.click(root)
    await calls[0].ok({ options: [opts[0]], next: 2 })
    inView(q('.msl-loading'), true)
    await calls[1].fail()
    expect(optionTexts()).toEqual(['Apple', 'Failed to load. Retry'])
    fireEvent.click(q('.msl-loading'))
    expect(calls[2].req).toEqual(request('', 2))
    await calls[2].ok([opts[1]])
    expect(optionTexts()).toEqual(['Apple', 'Banana'])
  })

  it('a search that takes the place of a next part on the way keeps what loaded, to load on from', async () => {
    const { fn, calls } = loads()
    const { root, q, input, optionTexts } = setup({
      options: undefined,
      loadOptions: fn
    })
    fireEvent.click(root)
    await calls[0].ok({ options: [opts[0]], next: 2 })
    inView(q('.msl-loading'), true)
    fireEvent.change(input(), { target: { value: 'x' } })
    expect(calls[1].req.signal.aborted).toBe(true)
    fireEvent.change(input(), { target: { value: '' } })
    expect(optionTexts()).toEqual(['Apple', 'Loading...'])
    inView(q('.msl-loading'), true)
    expect(calls[3].req).toEqual(request('', 2))
  })

  it('a loader that throws, or returns no options, fails', async () => {
    for (const loadOptions of [
      () => {
        throw new Error('down')
      },
      () => undefined,
      () => ({ items: [] }),
      async () => null
    ]) {
      const { root, q, unmount } = setup({
        options: undefined,
        loadOptions: loadOptions as unknown as MultiSelectLoader
      })
      fireEvent.click(root)
      await settle()
      expect(q('.msl-loading').textContent).toBe('Failed to load. Retry')
      unmount()
    }
  })

  it('takes a loader that returns at once, the options or { options }', async () => {
    for (const loadOptions of [() => opts, () => ({ options: opts })]) {
      const { root, optionTexts, unmount } = setup({
        options: undefined,
        loadOptions
      })
      fireEvent.click(root)
      await settle()
      expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
      unmount()
    }
  })

  it('lists only what it loads: options name values, the selected ones before their loads; picked loaded options stay named', async () => {
    const { fn, calls } = loads()
    const ada = { label: 'Ada', value: '1' }
    const grace = { label: 'Grace', value: '2' }
    const { root, input, chips, option, optionTexts, onChange, hidden } = setup(
      { options: [ada], defaultValue: ['1'], loadOptions: fn }
    )
    expect(chips()).toEqual(['Ada'])
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Loading...'])
    fireEvent.change(input(), { target: { value: 'gr' } })
    await calls[1].ok([grace])
    fireEvent.click(option('Grace'))
    expect(onChange).toHaveBeenLastCalledWith(['1', '2'], [ada, grace])
    // the search cleared: Grace's list is not shown, her chip stays
    expect(optionTexts()).toEqual(['Loading...'])
    expect(chips()).toEqual(['Ada', 'Grace'])
    expect(hidden().value).toBe('1,2')
    await calls[2].ok([ada])
    expect(optionTexts()).toEqual(['Ada'])
  })

  it('customValue: Create follows what loaded for the search, which a loaded value takes the place of', async () => {
    const { fn, calls } = loads()
    const { root, input, optionTexts } = setup({
      options: undefined,
      loadOptions: fn,
      customValue: true
    })
    fireEvent.click(root)
    fireEvent.change(input(), { target: { value: 'ap' } })
    expect(optionTexts()).toEqual(['Loading...', 'Create "ap"'])
    await calls[1].ok([opts[0]])
    expect(optionTexts()).toEqual(['Apple', 'Create "ap"'])
    fireEvent.change(input(), { target: { value: 'apple' } })
    expect(optionTexts()).toEqual(['Loading...'])
  })

  it('loadingLabel, errorLabel and classNames.loading', async () => {
    const { fn, calls } = loads()
    const { root, q } = setup({
      options: undefined,
      loadOptions: fn,
      loadingLabel: <i>Wait</i>,
      errorLabel: <b>Oops</b>,
      classNames: { loading: 'tw-load' }
    })
    fireEvent.click(root)
    expect(q('.msl-loading').innerHTML).toBe('<i>Wait</i>')
    expect(q('.msl-loading').className).toBe(
      'msl-option msl-option-disable msl-loading tw-load'
    )
    await calls[0].fail()
    expect(q('.msl-loading').innerHTML).toBe('<b>Oops</b>')
  })

  it('with renderList the end is a row, and the options tell an unknown set size while more may load', async () => {
    const { fn, calls } = loads()
    const renderList = vi.fn(({ count, row }: MultiSelectListProps) => (
      <div>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className='my-row'>
            {row(i)}
          </div>
        ))}
      </div>
    ))
    const { root, q, qa } = setup({
      options: undefined,
      loadOptions: fn,
      renderList
    })
    const places = () =>
      qa('[role="option"]').map(
        (el) =>
          `${el.getAttribute('aria-posinset')}/${el.getAttribute('aria-setsize')}`
      )
    fireEvent.click(root)
    expect(renderList.mock.lastCall![0].count).toBe(1)
    await calls[0].ok({ options: opts.slice(0, 2), next: 2 })
    expect(qa('.my-row').map((el) => el.textContent)).toEqual([
      'Apple',
      'Banana',
      'Loading...'
    ])
    expect(places()).toEqual(['1/-1', '2/-1'])
    inView(q('.msl-loading'), true)
    await calls[1].ok([opts[2]])
    expect(places()).toEqual(['1/3', '2/3', '3/3'])
  })

  it("loads without IntersectionObserver, as in jsdom in a user's tests: the keyboard loads the next part", async () => {
    const io = globalThis.IntersectionObserver
    // @ts-expect-error jsdom's
    delete globalThis.IntersectionObserver
    try {
      const { fn, calls } = loads()
      const { root, input, optionTexts } = setup({
        options: undefined,
        loadOptions: fn
      })
      fireEvent.click(root)
      await calls[0].ok({ options: [opts[0]], next: 2 })
      press(input(), 'ArrowDown')
      press(input(), 'ArrowDown')
      await calls[1].ok([opts[1]])
      expect(optionTexts()).toEqual(['Apple', 'Banana'])
    } finally {
      globalThis.IntersectionObserver = io
    }
  })

  it('loads once in strict mode', () => {
    const { fn } = loads()
    const { container } = render(
      <StrictMode>
        <MultiSelect loadOptions={fn} />
      </StrictMode>
    )
    fireEvent.click(container.firstChild as Element)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('types loaders: T from what they load, next as any, and a group of loaded childs', () => {
    const ada = { id: '1', name: 'Ada' }
    const load: MultiSelectLoader<typeof ada> = async ({ next = 1 }) => ({
      options: [ada],
      next: next + 1
    })
    const people: MultiSelectGroup<typeof ada> = {
      type: 'submenu',
      title: 'People',
      childs: load
    }
    const getters = {
      getLabel: (p: typeof ada) => p.name,
      getValue: (p: typeof ada) => p.id
    }
    const elements = [
      <MultiSelect key='a' loadOptions={load} {...getters} />,
      <MultiSelect key='b' options={[people]} {...getters} />,
      // @ts-expect-error people have no label: getLabel is required
      <MultiSelect key='c' loadOptions={load} getValue={getters.getValue} />
    ]
    expect(elements).toHaveLength(3)
  })
})

describe('lazy groups', () => {
  it('a collapsible group loads its childs the first time it opens, and on while closed', async () => {
    const { fn, calls } = loads()
    const group = {
      type: 'group',
      title: 'Fruits',
      collapsible: true,
      collapsed: true,
      childs: fn
    }
    const renderGroupTitle = vi.fn(
      ({ title, total }: MultiSelectGroupTitleProps) => `${title} ${total}`
    )
    const { root, q, optionTexts } = setupTree({
      options: [group],
      renderGroupTitle
    })
    fireEvent.click(root)
    expect(fn).not.toHaveBeenCalled()
    const title = q('.msl-grp-title')
    expect(title.textContent).toBe('Fruits 0')
    fireEvent.click(title)
    expect(calls[0].req).toEqual(request(''))
    expect(q('.msl-grp-body .msl-loading').textContent).toBe('Loading...')
    fireEvent.click(title)
    fireEvent.click(title)
    expect(fn).toHaveBeenCalledTimes(1)
    await calls[0].ok(opts)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(title.textContent).toBe('Fruits 3')
    // a copy, its childs those loaded
    expect(renderGroupTitle.mock.lastCall![0].group).toEqual({
      ...group,
      childs: opts
    })
  })

  it("renderGroupTitle's group holds no list ends: the options so far, the groups in it too", async () => {
    const { fn, calls } = loads()
    const inner = { type: 'group', title: 'In', childs: fn }
    const outer = {
      type: 'group',
      title: 'Out',
      childs: [inner],
      loading: true
    }
    const renderGroupTitle = vi.fn(
      ({ title }: MultiSelectGroupTitleProps) => title
    )
    const { root } = setupTree({ options: [outer], renderGroupTitle })
    fireEvent.click(root)
    const last = (title: string) =>
      renderGroupTitle.mock.calls.filter(([p]) => p.title === title).at(-1)![0]
        .group
    expect(last('In')).toEqual({ ...inner, childs: [] })
    await calls[0].ok({ options: opts, next: 2 })
    expect(last('In')).toEqual({ ...inner, childs: opts })
    expect(last('Out')).toEqual({
      ...outer,
      childs: [{ ...inner, childs: opts }]
    })
  })

  it('a submenu loads its childs as it opens; the keyboard goes in once they are in', async () => {
    const { fn, calls } = loads()
    const { input, focused, subs } = setupTree({
      options: [{ type: 'submenu', title: 'More', childs: fn }, opts[2]]
    })
    press(input(), 'ArrowDown')
    expect(focused()).toBe('More')
    press(input(), 'ArrowRight')
    expect(subs()).toEqual(['More'])
    expect(fn).toHaveBeenCalledTimes(1)
    expect(focused()).toBe('More')
    await calls[0].ok(opts.slice(0, 2))
    press(input(), 'ArrowRight')
    expect(focused()).toBe('Apple')
    press(input(), 'ArrowLeft')
    expect(subs()).toEqual([])
    press(input(), 'ArrowRight')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('a plain group loads as the menu opens; an empty one shows its emptyDataLabel', async () => {
    const { fn, calls } = loads()
    const { root, optionTexts } = setupTree({
      options: [
        { type: 'group', title: 'G', childs: fn, emptyDataLabel: 'None' }
      ]
    })
    fireEvent.click(root)
    expect(fn).toHaveBeenCalledTimes(1)
    await calls[0].ok([])
    expect(optionTexts()).toEqual(['None'])
  })

  it('search finds the options groups loaded, and they name values', async () => {
    const { fn, calls } = loads()
    const { root, input, chips, optionTexts } = setupTree({
      options: [{ type: 'group', title: 'G', childs: fn }],
      defaultValue: ['banana']
    })
    expect(chips()).toEqual([])
    fireEvent.click(root)
    await calls[0].ok(opts)
    expect(chips()).toEqual(['Banana'])
    fireEvent.change(input(), { target: { value: 'ch' } })
    expect(optionTexts()).toEqual(['Cherry'])
  })

  it("a group's next part loads as its end comes into view, or the keyboard passes it", async () => {
    const { fn, calls } = loads()
    const { root, q, input, focused } = setupTree({
      options: [{ type: 'group', title: 'G', childs: fn }, opts[2]]
    })
    fireEvent.click(root)
    await calls[0].ok({ options: [opts[0]], next: 2 })
    press(input(), 'ArrowDown')
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Cherry')
    expect(calls[1].req).toEqual(request('', 2))
    await calls[1].ok({ options: [opts[1]], next: 3 })
    inView(q('.msl-loading'), true)
    expect(calls[2].req).toEqual(request('', 3))
  })

  it('groups in what loadOptions loaded load with its search, and nest', async () => {
    const top = loads()
    const veg = loads()
    const greens = loads()
    const { root, input, option, subs, chips } = setupTree({
      options: undefined,
      loadOptions: top.fn
    })
    fireEvent.click(root)
    fireEvent.change(input(), { target: { value: 'k' } })
    await top.calls[1].ok([{ type: 'submenu', title: 'Veg', childs: veg.fn }])
    fireEvent.click(option('Veg'))
    expect(veg.calls[0].req).toEqual(request('k'))
    await veg.calls[0].ok([
      { label: 'Kale', value: 'kale' },
      { type: 'submenu', title: 'Greens', childs: greens.fn }
    ])
    fireEvent.click(option('Greens'))
    expect(subs()).toEqual(['Veg', 'Greens'])
    expect(greens.calls[0].req).toEqual(request('k'))
    await greens.calls[0].ok([{ label: 'Leek', value: 'leek' }])
    fireEvent.click(option('Leek'))
    expect(chips()).toEqual(['Leek'])
  })

  it("a group's list goes by its place and title: another title there loads its own", async () => {
    const { fn, calls } = loads()
    const { root, optionTexts, rerender } = setupTree({
      options: [{ type: 'group', title: 'A', childs: fn }]
    })
    fireEvent.click(root)
    await calls[0].ok([opts[0]])
    rerender(
      <MultiSelect options={[{ type: 'group', title: 'A', childs: fn }]} />
    )
    expect(fn).toHaveBeenCalledTimes(1)
    expect(optionTexts()).toEqual(['Apple'])
    rerender(
      <MultiSelect options={[{ type: 'group', title: 'B', childs: fn }]} />
    )
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

// your own data layer's props, as React Query's: set() re-renders with these props and more
function remote(props: MultiSelectProps = {}) {
  const onLoadMore = vi.fn()
  const u = setup({ onLoadMore, ...props })
  const set = (more: MultiSelectProps) =>
    u.rerender(
      <MultiSelect
        options={opts}
        onChange={u.onChange}
        onMenuOpen={u.onMenuOpen}
        onMenuClose={u.onMenuClose}
        onLoadMore={onLoadMore}
        {...props}
        {...more}
      />
    )
  return { ...u, onLoadMore, set }
}

describe('your own loading (onSearch, loading, onLoadMore, loadError)', () => {
  it('onSearch hears each search text, trimmed, commas removed, not the first; the dropdown filters nothing', () => {
    const onSearch = vi.fn()
    const { root, input, optionTexts, onChange } = setup({
      onSearch,
      filterOption: () => false
    })
    fireEvent.click(root)
    expect(onSearch).not.toHaveBeenCalled()
    fireEvent.change(input(), { target: { value: ' an, ' } })
    expect(onSearch).toHaveBeenLastCalledWith('an')
    // options are the results: none filtered out
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
    fireEvent.change(input(), { target: { value: 'an ' } })
    expect(onSearch).toHaveBeenCalledTimes(1)
    // Enter picks the first result, and the search clears
    press(input())
    expect(onChange).toHaveBeenLastCalledWith(['apple'], [opts[0]])
    expect(onSearch).toHaveBeenLastCalledWith('')
    expect(onSearch).toHaveBeenCalledTimes(2)
  })

  it('onSearch is not told of the first text in strict mode', () => {
    const onSearch = vi.fn()
    render(
      <StrictMode>
        <MultiSelect options={opts} onSearch={onSearch} />
      </StrictMode>
    )
    expect(onSearch).not.toHaveBeenCalled()
  })

  it("with onSearch, every search's options keep naming values: a controlled pick stays once the results move on", () => {
    const results = (s: string) =>
      s ? opts.filter((o) => o.label.toLowerCase().includes(s)) : [opts[0]]
    const changes = vi.fn()
    function Parent() {
      const [value, setValue] = useState<string[]>([])
      const [search, setSearch] = useState('')
      return (
        <MultiSelect
          options={results(search)}
          value={value}
          onSearch={setSearch}
          onChange={(v, o) => {
            changes(v, o)
            setValue(v)
          }}
        />
      )
    }
    const { container } = render(<Parent />)
    const field = () => container.querySelector('input.msl-input')!
    const chips = () =>
      [...container.querySelectorAll('.msl-chip')].map((el) => el.textContent)
    fireEvent.click(container.firstChild as Element)
    fireEvent.change(field(), { target: { value: 'ch' } })
    press(field())
    expect(changes).toHaveBeenLastCalledWith(['cherry'], [opts[2]])
    // the search cleared: Cherry is in no results now, still named
    expect(chips()).toEqual(['Cherry'])
    press(field(), 'ArrowDown')
    press(field())
    expect(changes).toHaveBeenLastCalledWith(
      ['cherry', 'apple'],
      [opts[2], opts[0]]
    )
  })

  it('groups in onSearch results load with its search, and stop as it changes', async () => {
    const { fn, calls } = loads()
    const onSearch = vi.fn()
    const { root, input, rerender } = setupTree({
      options: [{ type: 'group', title: 'G', childs: fn }],
      onSearch
    })
    fireEvent.click(root)
    expect(calls[0].req).toEqual(request(''))
    fireEvent.change(input(), { target: { value: 'k' } })
    expect(calls[0].req.signal.aborted).toBe(true)
    expect(calls[1].req).toEqual(request('k'))
    rerender(
      <MultiSelect
        options={[{ type: 'group', title: 'G', childs: fn }]}
        onSearch={onSearch}
      />
    )
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('loading shows the end row and aria-busy, in place of emptyDataLabel', () => {
    const { root, q, optionTexts, set } = remote({
      options: [],
      onLoadMore: undefined,
      loading: true
    })
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Loading...'])
    expect(q('.msl-options').getAttribute('aria-busy')).toBe('true')
    expect(q('.msl-loading').hasAttribute('data-error')).toBe(false)
    set({ options: [], onLoadMore: undefined, loading: false })
    expect(optionTexts()).toEqual(['No Data Found'])
    expect(q('.msl-options').hasAttribute('aria-busy')).toBe(false)
    set({ options: opts, onLoadMore: undefined, loading: true })
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'Loading...'])
  })

  it('onLoadMore: the end row calls it as it comes into view, never while loading, and again as loading ends with it in view', () => {
    const { root, q, optionTexts, onLoadMore, set } = remote({
      options: [opts[0]]
    })
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Apple', 'Loading...'])
    // the menu opening doesn't call it: your first load is yours
    expect(onLoadMore).not.toHaveBeenCalled()
    const end = q('.msl-loading')
    inView(end, false)
    expect(onLoadMore).not.toHaveBeenCalled()
    inView(end, true)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    set({ options: [opts[0]], loading: true })
    inView(q('.msl-loading'), true)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    expect(q('.msl-options').getAttribute('aria-busy')).toBe('true')
    // the page is in: still in view, it goes on
    set({ options: opts.slice(0, 2) })
    inView(q('.msl-loading'), true)
    expect(onLoadMore).toHaveBeenCalledTimes(2)
    // no more
    set({ onLoadMore: undefined })
    expect(q('.msl-loading')).toBeNull()
  })

  it('onLoadMore: the latest one is called, a new closure each render', () => {
    const { root, q, onLoadMore, set } = remote()
    fireEvent.click(root)
    const later = vi.fn()
    set({ onLoadMore: later })
    inView(q('.msl-loading'), true)
    expect(later).toHaveBeenCalledTimes(1)
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('the keyboard passing the end calls onLoadMore, not while loading; it never highlights it', () => {
    const { root, q, input, onLoadMore, set } = remote()
    const focused = () => q('.msl-option-focused')?.textContent
    fireEvent.click(root)
    press(input(), 'End')
    expect(focused()).toBe('Cherry')
    expect(onLoadMore).not.toHaveBeenCalled()
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Cherry')
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    set({ loading: true })
    press(input(), 'ArrowDown')
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('loadError: errorLabel, not called as it comes into view; a click, the keyboard or the menu opening retries', () => {
    const { root, q, input, optionTexts, onLoadMore, set } = remote({
      loadError: true,
      errorLabel: 'Down. Retry'
    })
    fireEvent.click(root)
    // the menu opening retries
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'Down. Retry'])
    const end = q('.msl-loading')
    expect(end.getAttribute('data-error')).toBe('true')
    inView(end, true)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    fireEvent.click(end)
    expect(onLoadMore).toHaveBeenCalledTimes(2)
    press(input(), 'End')
    press(input(), 'ArrowDown')
    expect(onLoadMore).toHaveBeenCalledTimes(3)
    // loading again: not failed while it does
    set({ loadError: true, loading: true, errorLabel: 'Down. Retry' })
    expect(q('.msl-loading').hasAttribute('data-error')).toBe(false)
    expect(optionTexts()).toContain('Loading...')
    // failed again: no retry by itself, as it stayed shown
    set({ loadError: true, errorLabel: 'Down. Retry' })
    expect(onLoadMore).toHaveBeenCalledTimes(3)
    // without onLoadMore, a failure only shows
    set({ loadError: true, onLoadMore: undefined })
    fireEvent.click(q('.msl-loading'))
    expect(onLoadMore).toHaveBeenCalledTimes(3)
    expect(optionTexts()).toContain('Down. Retry')
    // a screen reader hears it change
    expect(q('.msl-loading').getAttribute('aria-live')).toBe('polite')
  })

  it('loadError: the menu opening retries once an open, not as a search shows the row again', () => {
    const { root, input, optionTexts, onLoadMore } = remote({
      loadError: true
    })
    fireEvent.click(root)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    fireEvent.change(input(), { target: { value: 'a' } })
    fireEvent.change(input(), { target: { value: 'ap' } })
    expect(optionTexts()).toEqual(['Apple', 'Failed to load. Retry'])
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    press(input(), 'Escape')
    fireEvent.click(root)
    expect(onLoadMore).toHaveBeenCalledTimes(2)
  })

  it('loadError: with onSearch, a search retries no more; nor strict mode', () => {
    const onLoadMore = vi.fn()
    const { container } = render(
      <StrictMode>
        <MultiSelect
          options={opts}
          onSearch={() => {}}
          loadError
          onLoadMore={onLoadMore}
        />
      </StrictMode>
    )
    fireEvent.click(container.firstChild as Element)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    type(container.querySelector('input.msl-input')!, 'b', 'b')
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('searched by the dropdown, your list ends in its row: loading in place of emptyDataLabel, failed, more', () => {
    const { root, input, optionTexts, onLoadMore, set, q } = remote({
      loading: true
    })
    fireEvent.click(root)
    fireEvent.change(input(), { target: { value: 'ap' } })
    expect(optionTexts()).toEqual(['Apple', 'Loading...'])
    fireEvent.change(input(), { target: { value: 'zz' } })
    expect(optionTexts()).toEqual(['Loading...'])
    set({ loading: false, loadError: true })
    expect(optionTexts()).toEqual(['Failed to load. Retry'])
    // more to load: it loads as it comes into view, searched or not
    set({ loading: false })
    expect(optionTexts()).toEqual(['Loading...'])
    inView(q('.msl-loading'), true)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    set({ loading: false, onLoadMore: undefined })
    expect(optionTexts()).toEqual(['No Data Found'])
  })

  it("a list's end never takes the place of the highlighted title: Enter picks nothing", () => {
    const { root, input, onChange, set } = remote({
      options: [{ type: 'group', title: 'G', collapsible: true, childs: opts }]
    })
    fireEvent.click(root)
    press(input(), 'ArrowDown')
    expect(input().getAttribute('aria-activedescendant')).not.toBeNull()
    set({ options: [], loading: true })
    expect(input().hasAttribute('aria-activedescendant')).toBe(false)
    press(input())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('with loadOptions, loading, loadError and onLoadMore are unused', async () => {
    const { fn, calls } = loads()
    const { root, q, optionTexts, onLoadMore } = remote({
      options: undefined,
      loadOptions: fn,
      loading: true,
      loadError: true
    })
    fireEvent.click(root)
    await calls[0].ok(opts)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(q('.msl-options').hasAttribute('aria-busy')).toBe(false)
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('values as their options: they name values that options lack, and keep doing so after a pick', () => {
    const zed = { label: 'Zed', value: 'zed' }
    const { root, chips, hidden, option, onChange } = setup({
      defaultValue: [zed, 'apple']
    })
    expect(chips()).toEqual(['Zed', 'Apple'])
    expect(hidden().value).toBe('zed,apple')
    fireEvent.click(root)
    fireEvent.click(option('Banana'))
    expect(onChange).toHaveBeenLastCalledWith(
      ['zed', 'apple', 'banana'],
      [zed, opts[0], opts[1]]
    )
    expect(chips()).toEqual(['Zed', 'Apple', 'Banana'])
  })

  it("controlled values as options of the user's shape, read by getValue and getLabel", () => {
    const ada = { id: '1', name: 'Ada' }
    const { container, rerender } = render(
      <MultiSelect
        options={[] as (typeof ada)[]}
        value={[ada]}
        getLabel={(p) => p.name}
        getValue={(p) => p.id}
      />
    )
    const chips = () =>
      [...container.querySelectorAll('.msl-chip')].map((el) => el.textContent)
    expect(chips()).toEqual(['Ada'])
    // an option with that value names it first
    rerender(
      <MultiSelect
        options={[{ id: '1', name: 'Ada L.' }]}
        value={[ada]}
        getLabel={(p) => p.name}
        getValue={(p) => p.id}
      />
    )
    expect(chips()).toEqual(['Ada L.'])
  })

  it('customValue: a value that comes as its option is not under Custom Values; created ones are', () => {
    const zed = { label: 'Zed', value: 'zed' }
    const { input, groupTitles, optionTexts } = setup({
      customValue: true,
      defaultValue: [zed]
    })
    type(input(), 'kiwi', 'Enter')
    expect(groupTitles()).toEqual(['Custom Values'])
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'kiwi'])
  })

  it('Enter picks the first result shown, not one in a closed submenu or a collapsed group', () => {
    const apricot = { label: 'Apricot', value: 'apricot' }
    const { input, onChange } = setup({
      onSearch: vi.fn(),
      options: [
        { type: 'submenu', title: 'Fruits', childs: [opts[0]] },
        {
          type: 'group',
          title: 'More',
          collapsible: true,
          collapsed: true,
          childs: [opts[1]]
        },
        apricot
      ]
    })
    type(input(), 'ap', 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(['apricot'], [apricot])
  })

  it('types the props: values as T or strings, the callbacks', () => {
    const ada = { id: '1', name: 'Ada' }
    const getters = {
      getLabel: (p: typeof ada) => p.name,
      getValue: (p: typeof ada) => p.id
    }
    const elements = [
      <MultiSelect
        key='a'
        options={[ada]}
        value={[ada, '2']}
        onSearch={(s: string) => s}
        loading
        loadError={false}
        onLoadMore={() => {}}
        {...getters}
      />,
      // @ts-expect-error a value is a string or an option, not a number
      <MultiSelect key='b' options={[ada]} value={[1]} {...getters} />
    ]
    expect(elements).toHaveLength(2)
  })
})

describe('load more button (loadMoreLabel), groups you load', () => {
  it('your list with more ends in a button: not called in view, a click or the keyboard calls onLoadMore', () => {
    const { root, q, input, optionTexts, onLoadMore, set } = remote({
      loadMoreLabel: 'Load more'
    })
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'Load more'])
    const end = q('.msl-loading')
    expect(end.className).toBe('msl-option msl-loading ')
    expect(end.getAttribute('data-more')).toBe('true')
    expect(end.hasAttribute('role')).toBe(false)
    inView(end, true)
    expect(onLoadMore).not.toHaveBeenCalled()
    fireEvent.click(end)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    press(input(), 'End')
    press(input(), 'ArrowDown')
    expect(onLoadMore).toHaveBeenCalledTimes(2)
    // loading: loadingLabel, no button
    set({ loadMoreLabel: 'Load more', loading: true })
    expect(optionTexts()).toContain('Loading...')
    expect(q('.msl-loading').className).toBe(
      'msl-option msl-option-disable msl-loading '
    )
    expect(q('.msl-loading').hasAttribute('data-more')).toBe(false)
    fireEvent.click(q('.msl-loading'))
    expect(onLoadMore).toHaveBeenCalledTimes(2)
    // failed: errorLabel, a click retries
    set({ loadMoreLabel: 'Load more', loadError: true })
    expect(optionTexts()).toContain('Failed to load. Retry')
    expect(q('.msl-loading').hasAttribute('data-more')).toBe(false)
    fireEvent.click(q('.msl-loading'))
    expect(onLoadMore).toHaveBeenCalledTimes(3)
    // all in
    set({ loadMoreLabel: 'Load more', onLoadMore: undefined })
    expect(q('.msl-loading')).toBeNull()
  })

  it("a loader's first part loads as it shows, each next part on a click", async () => {
    const { fn, calls } = loads()
    const { root, q, optionTexts } = setup({
      options: undefined,
      loadOptions: fn,
      loadMoreLabel: <b>More</b>
    })
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Loading...'])
    await calls[0].ok({ options: [opts[0]], next: 2 })
    expect(optionTexts()).toEqual(['Apple', 'More'])
    inView(q('.msl-loading'), true)
    expect(fn).toHaveBeenCalledTimes(1)
    fireEvent.click(q('[data-more]'))
    expect(calls[1].req).toEqual(request('', 2))
    expect(optionTexts()).toEqual(['Apple', 'Loading...'])
    await calls[1].ok({ options: [opts[1]] })
    expect(optionTexts()).toEqual(['Apple', 'Banana'])
  })

  it("a group's loadMoreLabel is its own: a submenu's loader, the dropdown's elsewhere", async () => {
    const sub = loads()
    const grp = loads()
    const { root, q, option, optionTexts } = setupTree({
      options: [
        {
          type: 'submenu',
          title: 'More',
          loadMoreLabel: 'More fruits',
          childs: sub.fn
        },
        { type: 'group', title: 'G', collapsible: true, childs: grp.fn }
      ],
      loadMoreLabel: 'Load more'
    })
    fireEvent.click(root)
    await grp.calls[0].ok({ options: [opts[2]], next: 2 })
    fireEvent.click(option('More'))
    await sub.calls[0].ok({ options: [opts[0]], next: 2 })
    expect(q('.msl-submenu .msl-loading').textContent).toBe('More fruits')
    expect(q('.msl-grp-body .msl-loading').textContent).toBe('Load more')
    fireEvent.click(option('More fruits'))
    expect(sub.calls[1].req).toEqual(request('', 2))
    await sub.calls[1].ok({ options: [opts[1]] })
    expect(optionTexts()).toEqual([
      'More',
      'Apple',
      'Banana',
      'Cherry',
      'Load more'
    ])
    fireEvent.click(option('Load more'))
    expect(grp.calls[1].req).toEqual(request('', 2))
  })

  it('a group of childs you load: loading, onLoadMore and loadError as the dropdown has them', () => {
    const onLoadMore = vi.fn()
    const group = (more: Partial<MultiSelectGroup>) => [
      {
        type: 'group',
        title: 'G',
        collapsible: true,
        collapsed: true,
        childs: [opts[0]],
        onLoadMore,
        ...more
      },
      { type: 'group', title: 'H', childs: [opts[2]] }
    ]
    const { root, q, optionTexts, rerender } = setupTree({ options: group({}) })
    const set = (more: Partial<MultiSelectGroup>) =>
      rerender(<MultiSelect options={group(more)} />)
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Cherry'])
    fireEvent.click(q('.msl-grp-title'))
    expect(optionTexts()).toEqual(['Apple', 'Loading...', 'Cherry'])
    // more in view: called
    inView(q('.msl-loading'), true)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    set({ loading: true })
    inView(q('.msl-loading'), true)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    // the listbox is not busy: a group is
    expect(q('.msl-options').hasAttribute('aria-busy')).toBe(false)
    set({ loadMoreLabel: 'More' })
    expect(optionTexts()).toEqual(['Apple', 'More', 'Cherry'])
    fireEvent.click(q('[data-more]'))
    expect(onLoadMore).toHaveBeenCalledTimes(2)
    set({ loadError: true })
    expect(q('.msl-loading').textContent).toBe('Failed to load. Retry')
    fireEvent.click(q('.msl-loading'))
    expect(onLoadMore).toHaveBeenCalledTimes(3)
    set({ onLoadMore: undefined })
    expect(optionTexts()).toEqual(['Apple', 'Cherry'])
  })

  it("a submenu of childs you load: its button loads more; the dropdown's options name values", () => {
    const onLoadMore = vi.fn()
    const { root, option, optionTexts, chips } = setupTree({
      options: [
        {
          type: 'submenu',
          title: 'More',
          childs: [opts[0]],
          onLoadMore,
          loadMoreLabel: 'Show more'
        }
      ],
      defaultValue: ['apple']
    })
    expect(chips()).toEqual(['Apple'])
    fireEvent.click(root)
    fireEvent.click(option('More'))
    expect(optionTexts()).toEqual(['More', 'Apple', 'Show more'])
    fireEvent.click(option('Show more'))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('types loadMoreLabel and the fields of a group you load', () => {
    const elements = [
      <MultiSelect
        key='a'
        loadMoreLabel={<b>More</b>}
        options={[
          {
            type: 'group',
            title: 'G',
            childs: opts,
            loading: false,
            loadError: false,
            onLoadMore: () => {},
            loadMoreLabel: 'More'
          }
        ]}
      />,
      // @ts-expect-error onLoadMore takes no part to load
      <MultiSelect
        key='b'
        options={[{ type: 'group', title: 'G', childs: opts, onLoadMore: 1 }]}
      />
    ]
    expect(elements).toHaveLength(2)
  })
})

describe("groups' classes, style and your own fields", () => {
  it('classes and style go on the title row of a group, a collapsible one and a submenu, which keeps its anchor', () => {
    const { root, q, option } = setupTree({
      options: [
        {
          type: 'group',
          title: 'Plain',
          classes: 'vip',
          style: { color: 'red' },
          childs: [opts[0]]
        },
        {
          type: 'group',
          title: 'Fold',
          collapsible: true,
          classes: 'fold',
          childs: [opts[1]]
        },
        {
          type: 'submenu',
          title: 'Sub',
          classes: 'sub',
          style: { color: 'blue' },
          childs: [opts[2]]
        }
      ],
      classNames: { groupTitle: 'gt', option: 'op' }
    })
    fireEvent.click(root)
    const plain = q('.msl-grp-title.vip')
    expect(plain.textContent).toBe('Plain')
    expect(plain.className).toBe('msl-grp-title vip gt')
    expect(plain.style.color).toBe('red')
    expect(q('.msl-grp-title.fold').getAttribute('aria-expanded')).toBe('true')
    const sub = option('Sub')
    expect(sub.className).toBe('msl-option sub op')
    expect(sub.style.color).toBe('blue')
    fireEvent.click(sub)
    expect(sub.style.color).toBe('blue')
    expect(
      (sub.style as CSSStyleDeclaration & { anchorName: string }).anchorName
    ).toBe('--msl-0')
    // the rest of the submenu from its title
    expect(q('.sub + .msl-submenu').textContent).toBe('Cherry')
  })

  it('types your own fields on groups: read back in renderGroupTitle, with options of any shape', () => {
    const ada = { id: '1', name: 'Ada' }
    const elements = [
      <MultiSelect
        key='a'
        options={[
          { type: 'submenu', title: 'Team', icon: <b>T</b>, childs: [ada] }
        ]}
        getLabel={(p) => p.name}
        getValue={(p) => p.id}
        renderGroupTitle={({ group, title }) => (
          <>
            {group.icon}
            {title}
          </>
        )}
      />
    ]
    expect(elements).toHaveLength(1)
    const { root, option } = setupTree({
      options: [
        { type: 'submenu', title: 'Team', icon: '★', childs: [opts[0]] }
      ],
      renderGroupTitle: ({ group, title }) => (
        <>
          {group.icon}
          {title}
        </>
      )
    })
    fireEvent.click(root)
    expect(option('★Team')).toBeDefined()
  })
})

describe('creating: canCreate, onCreate, pasting', () => {
  // a promise the test settles
  function later<V>() {
    let ok!: (v: V) => void
    let fail!: () => void
    const promise = new Promise<V>((res, rej) => {
      ok = res
      fail = () => rej(new Error('down'))
    })
    return {
      promise,
      ok: (v: V) => settle(() => ok(v)),
      fail: () => settle(fail)
    }
  }
  const paste = (el: Element, text: string) =>
    fireEvent.paste(el, { clipboardData: { getData: () => text } })

  it('canCreate false: no Create row, Enter and comma create nothing; Enter on an option still picks it', () => {
    const canCreate = vi.fn((text: string) => text.includes('@'))
    const { input, optionTexts, chips, onChange } = setup({
      customValue: true,
      canCreate
    })
    type(input(), 'kiwi')
    expect(canCreate).toHaveBeenLastCalledWith('kiwi')
    expect(optionTexts()).toEqual(['No Data Found'])
    type(input(), 'kiwi', 'Enter')
    type(input(), 'kiwi', ',')
    expect(onChange).not.toHaveBeenCalled()
    type(input(), 'an')
    press(input(), 'ArrowDown')
    press(input())
    expect(chips()).toEqual(['Banana'])
    type(input(), 'a@b', 'Enter')
    expect(chips()).toEqual(['Banana', 'a@b'])
  })

  it('onCreate returns an option of your shape: selected, named by your getters, listed with the created values', () => {
    const onCreate = vi.fn((text: string) => ({
      id: `n-${text}`,
      name: text.toUpperCase()
    }))
    const { container } = render(
      <MultiSelect
        options={[{ id: 'a', name: 'Ada' }]}
        getLabel={(p) => p.name}
        getValue={(p) => p.id}
        customValue
        onCreate={onCreate}
        onChange={(v, o) => changes(v, o)}
      />
    )
    const changes = vi.fn()
    const field = () => container.querySelector('input.msl-input')!
    const texts = (s: string) =>
      [...document.querySelectorAll(s)].map((el) => el.textContent)
    fireEvent.click(container.firstChild as Element)
    type(field(), 'kim', 'Enter')
    expect(onCreate).toHaveBeenCalledWith('kim')
    expect(texts('.msl-chip')).toEqual(['KIM'])
    expect(changes).toHaveBeenLastCalledWith(
      ['n-kim'],
      [{ id: 'n-kim', name: 'KIM' }]
    )
    expect((field() as HTMLInputElement).value).toBe('')
    // deselected, still listed with the created values, and searchable
    fireEvent.click(document.querySelector('.msl-chip-delete')!)
    expect(texts('.msl-grp-title')).toEqual(['Custom Values'])
    expect(texts('.msl-option')).toEqual(['Ada', 'KIM'])
    type(field(), 'KI')
    expect(texts('.msl-option')).toEqual(['KIM', 'Create "KI"'])
  })

  it('onCreate returns a value, or cancels with false or nothing: the text stays', () => {
    const onCreate = vi.fn((text: string) =>
      text === 'kiwi' ? 'fruit-kiwi' : text === 'no' ? false : undefined
    )
    const { input, chips, onChange } = setup({ customValue: true, onCreate })
    type(input(), 'no', 'Enter')
    type(input(), 'nada', 'Enter')
    expect(onChange).not.toHaveBeenCalled()
    expect(input().value).toBe('nada')
    type(input(), 'kiwi', 'Enter')
    expect(chips()).toEqual(['fruit-kiwi'])
    expect(onChange).toHaveBeenLastCalledWith(
      ['fruit-kiwi'],
      [{ label: 'fruit-kiwi', value: 'fruit-kiwi' }]
    )
  })

  it('an already selected value from onCreate stays selected, now or once its promise settles', async () => {
    const p = later<string>()
    const onCreate = vi.fn((text: string) =>
      text === 'now' ? 'apple' : p.promise
    )
    const { input, chips } = setup({
      customValue: true,
      onCreate,
      defaultValue: ['apple']
    })
    type(input(), 'now', 'Enter')
    expect(chips()).toEqual(['Apple'])
    type(input(), 'soon', 'Enter')
    await p.ok('apple')
    expect(chips()).toEqual(['Apple'])
  })

  it('a promise: loadingLabel, aria-busy and disabled meanwhile, one call; then selected, the search cleared', async () => {
    const p = later<{ label: string; value: string }>()
    const onCreate = vi.fn(() => p.promise)
    const { input, q, option, optionTexts, chips, onChange } = setup({
      customValue: true,
      onCreate,
      loadingLabel: 'Saving...'
    })
    type(input(), 'kiwi', 'Enter')
    expect(optionTexts()).toEqual(['Saving...'])
    const row = option('Saving...')
    expect(row.getAttribute('aria-busy')).toBe('true')
    expect(row.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(row)
    type(input(), 'kiwi', 'Enter')
    type(input(), 'kiwi', ',')
    expect(onCreate).toHaveBeenCalledTimes(1)
    await p.ok({ label: 'Kiwi', value: 'kiwi' })
    expect(chips()).toEqual(['Kiwi'])
    expect(onChange).toHaveBeenLastCalledWith(
      ['kiwi'],
      [{ label: 'Kiwi', value: 'kiwi' }]
    )
    expect(input().value).toBe('')
    expect(q('[aria-busy]')).toBeNull()
  })

  it('a rejected promise: errorLabel with data-error on the row, which creates again; nothing pending resolves to nothing', async () => {
    let p = later<string | null>()
    const onCreate = vi.fn(() => p.promise)
    const { input, option, optionTexts, chips, onChange } = setup({
      customValue: true,
      onCreate
    })
    type(input(), 'kiwi', 'Enter')
    await p.fail()
    expect(optionTexts()).toEqual(['Failed to load. Retry'])
    const row = option('Failed to load. Retry')
    expect(row.getAttribute('data-error')).toBe('true')
    expect(row.hasAttribute('aria-busy')).toBe(false)
    expect(input().value).toBe('kiwi')
    p = later<string | null>()
    fireEvent.click(row)
    expect(onCreate).toHaveBeenCalledTimes(2)
    await p.ok(null)
    expect(optionTexts()).toEqual(['Create "kiwi"'])
    expect(chips()).toEqual([])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a rejected promise with an errorLabel function: it gets the error and a retry; a click on its button calls onCreate once', async () => {
    let p = later<string>()
    const onCreate = vi.fn(() => p.promise)
    const { input, q, chips } = setup({
      customValue: true,
      onCreate,
      errorLabel: (error, retry) => (
        <button onClick={retry}>{(error as Error).message}: again</button>
      )
    })
    type(input(), 'kiwi', 'Enter')
    await p.fail()
    const again = q<HTMLButtonElement>('.msl-option[data-error] button')
    expect(again.textContent).toBe('down: again')
    p = later<string>()
    fireEvent.click(again)
    // the row's own click finds it pending
    expect(onCreate).toHaveBeenCalledTimes(2)
    await p.ok('kiwi')
    expect(chips()).toEqual(['kiwi'])
  })

  it('a promise rejecting with nothing gives an errorLabel function true, as a load does', async () => {
    let fail!: () => void
    const errorLabel = vi.fn(() => 'Failed')
    const { input, q } = setup({
      customValue: true,
      onCreate: () => new Promise<string>((_, rej) => (fail = () => rej())),
      errorLabel
    })
    type(input(), 'kiwi', 'Enter')
    await settle(fail)
    expect(q('.msl-option[data-error]').textContent).toBe('Failed')
    expect(errorLabel).toHaveBeenLastCalledWith(true, expect.any(Function))
  })

  it('a promise settling after unmount adds nothing', async () => {
    const p = later<string>()
    const { input, unmount, onChange } = setup({
      customValue: true,
      onCreate: () => p.promise
    })
    type(input(), 'kiwi', 'Enter')
    unmount()
    await p.ok('kiwi')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('controlled: the created option comes through onChange', async () => {
    const p = later<{ label: string; value: string }>()
    function Parent() {
      const [value, setValue] = useState<string[]>(['apple'])
      return (
        <MultiSelect
          options={opts}
          value={value}
          customValue
          onCreate={() => p.promise}
          onChange={setValue}
        />
      )
    }
    const { container } = render(<Parent />)
    fireEvent.click(container.firstChild as Element)
    type(container.querySelector('input.msl-input')!, 'kiwi', 'Enter')
    await p.ok({ label: 'Kiwi', value: 'kiwi' })
    expect(
      [...container.querySelectorAll('.msl-chip')].map((el) => el.textContent)
    ).toEqual(['Apple', 'Kiwi'])
  })

  it('pasting a list picks each part: label text or value, any case; the rest stays in the field; one onChange', () => {
    const { input, chips, onChange } = setup({
      options: [...opts, { label: 'Date', value: 'date', disabled: true }],
      defaultValue: ['cherry']
    })
    expect(paste(input(), ' APPLE, banana\tkiwi\ncherry\n\nDate')).toBe(false)
    expect(chips()).toEqual(['Cherry', 'Apple', 'Banana'])
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(input().value).toBe('kiwi, Date')
  })

  it('pasting creates the rest with customValue, through canCreate and onCreate, up to the limit', async () => {
    const p = later<string>()
    const onCreate = vi.fn((text: string) =>
      text === 'fig' ? p.promise : text === 'no' ? false : text
    )
    const { input, chips, onChange } = setup({
      customValue: true,
      canCreate: (text) => text !== 'bad',
      onCreate,
      limit: 4
    })
    paste(input(), 'kiwi, bad, fig, no, apple, KIWI, fig, lime, plum, pear')
    expect(chips()).toEqual(['kiwi', 'Apple', 'lime'])
    expect(onChange).toHaveBeenCalledTimes(1)
    // fig is on its way, holding its room: none left for plum and pear
    expect(input().value).toBe('bad, no, plum, pear')
    // each part once, in any case
    expect(onCreate.mock.calls.map(([t]) => t)).toEqual([
      'kiwi',
      'fig',
      'no',
      'lime'
    ])
    // settled: in the room it held, what the paste left still in the field
    await p.ok('fig')
    expect(chips()).toEqual(['kiwi', 'Apple', 'lime', 'fig'])
    expect(input().value).toBe('bad, no, plum, pear')
  })

  it('a create that settles after the search changed adds its value, the search and the menu left as they are', async () => {
    const p = later<string>()
    const onSearchChange = vi.fn()
    const { input, chips, isOpen } = setup({
      customValue: true,
      closeOnSelect: true,
      onCreate: () => p.promise,
      onSearchChange
    })
    type(input(), 'kiwi', 'Enter')
    fireEvent.change(input(), { target: { value: 'lim' } })
    await p.ok('kiwi')
    expect(chips()).toEqual(['kiwi'])
    expect(input().value).toBe('lim')
    expect(onSearchChange).toHaveBeenLastCalledWith('lim', 'input')
    expect(isOpen()).toBe(true)
  })

  it('single select: a create that settles after another pick is listed, not selected; with none it is selected', async () => {
    let p = later<string>()
    const { input, option, single, onChange, optionTexts } = setup({
      singleSelect: true,
      customValue: true,
      onCreate: () => p.promise
    })
    type(input(), 'kiwi', 'Enter')
    fireEvent.change(input(), { target: { value: '' } })
    fireEvent.click(option('Banana'))
    await p.ok('kiwi')
    expect(single()).toBe('Banana')
    expect(values(onChange)).toEqual([['banana']])
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry', 'kiwi'])
    p = later<string>()
    fireEvent.click(option('Banana'))
    type(input(), 'fig', 'Enter')
    await p.ok('fig')
    expect(single()).toBe('fig')
  })

  it('pasting matches the options loadOptions loaded', async () => {
    const { fn, calls } = loads()
    const { root, input, chips } = setup({
      options: undefined,
      loadOptions: fn
    })
    fireEvent.click(root)
    await calls[0].ok(opts)
    paste(input(), 'apple,cherry')
    expect(chips()).toEqual(['Apple', 'Cherry'])
  })

  it("a paste with one part, or into single select, is the browser's", () => {
    const { input, onChange } = setup()
    expect(paste(input(), 'apple')).toBe(true)
    cleanup()
    const single = setup({ singleSelect: true })
    expect(paste(single.input(), 'apple, banana')).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("a paste where no part goes in is the browser's, at the caret: the typed text stays", () => {
    const { input, onChange } = setup()
    fireEvent.change(input(), { target: { value: 'New ' } })
    expect(paste(input(), 'York, NY')).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
    expect(input().value).toBe('New ')
  })

  it('a paste that picks keeps the typed text: what it leaves goes in at the caret', () => {
    const { input, chips } = setup()
    fireEvent.change(input(), { target: { value: 'New ' } })
    expect(paste(input(), 'apple, York, banana')).toBe(false)
    expect(chips()).toEqual(['Apple', 'Banana'])
    expect(input().value).toBe('New York')
    input().setSelectionRange(0, 4)
    paste(input(), 'cherry, Old')
    expect(input().value).toBe('OldYork')
  })

  it('promises that settle together are all selected, each from the value the one before set, controlled too', async () => {
    const onCreate = (text: string) =>
      Promise.resolve({ label: text, value: text })
    const { input, chips } = setup({ customValue: true, onCreate })
    paste(input(), 'kiwi, fig')
    await settle()
    expect(chips()).toEqual(['kiwi', 'fig'])
    cleanup()
    function Parent() {
      const [value, setValue] = useState<string[]>(['apple'])
      return (
        <MultiSelect
          options={opts}
          customValue
          onCreate={onCreate}
          value={value}
          onChange={setValue}
        />
      )
    }
    const { container } = render(<Parent />)
    paste(container.querySelector('input.msl-input')!, 'kiwi, fig')
    await settle()
    expect(
      [...container.querySelectorAll('.msl-chip')].map((el) => el.textContent)
    ).toEqual(['Apple', 'kiwi', 'fig'])
  })

  it('types canCreate and onCreate', () => {
    const ada = { id: '1', name: 'Ada' }
    const getters = {
      getLabel: (p: typeof ada) => p.name,
      getValue: (p: typeof ada) => p.id
    }
    const elements = [
      <MultiSelect
        key='a'
        options={[ada]}
        customValue
        canCreate={(text) => text.length > 1}
        onCreate={async (text) => ({ id: text, name: text })}
        {...getters}
      />,
      <MultiSelect
        key='b'
        options={[ada]}
        customValue
        onCreate={() => 'x'}
        {...getters}
      />,
      <MultiSelect
        key='c'
        options={[ada]}
        customValue
        // @ts-expect-error onCreate makes an option of the options' shape
        onCreate={() => 1}
        {...getters}
      />
    ]
    expect(elements).toHaveLength(3)
  })
})

describe('maxChips, controlled open and search', () => {
  const three = ['apple', 'banana', 'cherry']

  it('maxChips: chips for the first values, then one for the rest that opens the menu; all stay selected', () => {
    const { root, q, qa, chips, hidden, input, isOpen, onChange } = setup({
      maxChips: 2,
      defaultValue: three,
      options: [...opts.slice(0, 2), { ...opts[2], disabled: false }]
    })
    expect(chips()).toEqual(['Apple', 'Banana', '+1'])
    expect(hidden().value).toBe('apple,banana,cherry')
    const more = q('.msl-chip[data-more]')
    expect(more.className).toBe('msl-chip ')
    expect(more.querySelector('.msl-chip-delete')).toBeNull()
    expect(qa('.msl-chip-delete')).toHaveLength(2)
    fireEvent.click(more)
    expect(isOpen()).toBe(true)
    // Backspace removes the last value, shown or not
    press(input(), 'Backspace')
    expect(onChange).toHaveBeenLastCalledWith(
      ['apple', 'banana'],
      opts.slice(0, 2)
    )
    expect(chips()).toEqual(['Apple', 'Banana'])
    expect(root.querySelector('[data-more]')).toBeNull()
  })

  it('maxChips: moreChipsLabel, 0, classNames.chip; customChip gets index and total; not with disableChip or single select', () => {
    const customChip = vi.fn((p: MultiSelectChipProps) => (
      <i key={p.value}>{p.label}</i>
    ))
    const { container, rerender } = render(
      <MultiSelect
        options={opts}
        defaultValue={three}
        maxChips={1}
        customChip={customChip}
        moreChipsLabel={(n) => <b>{n} more</b>}
        classNames={{ chip: 'c' }}
      />
    )
    expect(customChip).toHaveBeenCalledTimes(1)
    expect(customChip.mock.calls[0][0]).toMatchObject({
      value: 'apple',
      index: 0,
      total: 3
    })
    const more = container.querySelector('[data-more]')!
    expect(more.innerHTML).toBe('<b>2 more</b>')
    expect(more.className).toBe('msl-chip c')
    rerender(<MultiSelect options={opts} defaultValue={three} maxChips={0} />)
    expect(container.querySelector('[data-more]')!.textContent).toBe('+3')
    expect(container.querySelector('.msl-chip:not([data-more])')).toBeNull()
    rerender(
      <MultiSelect
        options={opts}
        defaultValue={three}
        maxChips={0}
        disableChip
      />
    )
    expect(container.querySelector('.msl-chip')).toBeNull()
    expect(container.querySelector('.msl-single-value')!.textContent).toBe(
      '3 Item Selected'
    )
  })

  it('maxChips: Backspace skips fixed values, hidden ones too', () => {
    const { chips, input } = setup({
      maxChips: 1,
      options: [opts[0], { ...opts[1], fixed: true }],
      defaultValue: ['apple', 'banana']
    })
    expect(chips()).toEqual(['Apple', '+1'])
    press(input(), 'Backspace')
    expect(chips()).toEqual(['Banana'])
    press(input(), 'Backspace')
    expect(chips()).toEqual(['Banana'])
  })

  // the parent owns open: its menu calls set it, or not
  function Owned({
    take = true,
    calls,
    ...props
  }: MultiSelectProps & { take?: boolean; calls: (e: string) => void }) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button onClick={() => setOpen(!open)}>toggle</button>
        <MultiSelect
          options={opts}
          {...props}
          open={open}
          onMenuOpen={() => {
            calls('open')
            setOpen(true)
          }}
          onMenuClose={() => {
            calls('close')
            take && setOpen(false)
          }}
        />
      </>
    )
  }
  const own = (props: MultiSelectProps & { take?: boolean } = {}) => {
    const calls = vi.fn()
    const u = render(<Owned calls={calls} {...props} />)
    const c = u.container
    return {
      calls,
      root: c.querySelector<HTMLElement>('.msl-wrp')!,
      toggle: c.querySelector('button')!,
      input: () => c.querySelector<HTMLInputElement>('input.msl-input')!,
      option: (t: string) =>
        [...c.querySelectorAll('.msl-option')].find(
          (el) => el.textContent === t
        )!
    }
  }

  it("open: the dropdown's opens and closes ask; yours open and close it, once", () => {
    const { calls, root, input } = own()
    fireEvent.click(root)
    expect(calls.mock.calls).toEqual([['open']])
    expect(box()).not.toBeNull()
    // opened from the dropdown, focus goes to the search field
    expect(document.activeElement).toBe(input())
    press(input(), 'Escape')
    expect(calls.mock.calls).toEqual([['open'], ['close']])
    expect(box()).toBeNull()
  })

  it('open: a close it ignores keeps the menu open, a pick with closeOnSelect clears the search all the same', () => {
    const onSearchChange = vi.fn()
    const { calls, root, input, option } = own({
      take: false,
      closeOnSelect: true,
      onSearchChange
    })
    fireEvent.click(root)
    press(input(), 'Escape')
    fireEvent.click(document.body)
    expect(calls.mock.calls).toEqual([['open'], ['close'], ['close']])
    expect(box()).not.toBeNull()
    type(input(), 'a', 'a')
    fireEvent.click(option('Apple'))
    expect(calls).toHaveBeenLastCalledWith('close')
    expect(onSearchChange).toHaveBeenLastCalledWith('', 'pick')
    expect(input().value).toBe('')
    expect(box()).not.toBeNull()
  })

  it('open: a single select pick closes it, focus on the wrapper once the field goes', () => {
    const { root, input, option } = own({ singleSelect: true })
    fireEvent.click(root)
    expect(document.activeElement).toBe(input())
    fireEvent.click(option('Banana'))
    expect(box()).toBeNull()
    expect(root.querySelector('.msl-single-value')!.textContent).toBe('Banana')
    expect(document.activeElement).toBe(root)
  })

  it('open: opened from outside, focus stays there; then a click outside asks to close', () => {
    const { calls, toggle } = own()
    toggle.focus()
    fireEvent.click(toggle)
    expect(box()).not.toBeNull()
    expect(document.activeElement).toBe(toggle)
    expect(calls).not.toHaveBeenCalled()
    fireEvent.click(document.body)
    expect(calls.mock.calls).toEqual([['close']])
    expect(box()).toBeNull()
  })

  it('open: an open it asked for and yours ignored ends as focus leaves, so a later open of yours keeps focus there', () => {
    const onBlur = vi.fn()
    function Ignored() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>open</button>
          <MultiSelect options={opts} open={open} attr={{ onBlur }} />
        </>
      )
    }
    const { container } = render(<Ignored />)
    const root = container.querySelector<HTMLElement>('.msl-wrp')!
    const button = container.querySelector('button')!
    root.focus()
    fireEvent.click(root)
    expect(box()).toBeNull()
    // within it, still asked
    container.querySelector<HTMLElement>('input.msl-input')!.focus()
    button.focus()
    expect(onBlur).toHaveBeenCalledTimes(2)
    fireEvent.click(button)
    expect(box()).not.toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('open: disabled, a menu yours keeps open picks nothing, unstyled too', () => {
    const onChange = vi.fn()
    const onMenuClose = vi.fn()
    const { container } = render(
      <MultiSelect
        options={opts}
        open
        disabled
        onChange={onChange}
        onMenuClose={onMenuClose}
        selectAll
      />
    )
    expect(onMenuClose).toHaveBeenCalledTimes(1)
    const apple = [...container.querySelectorAll('.msl-option')].find(
      (el) => el.textContent === 'Apple'
    )!
    fireEvent.click(apple)
    press(apple)
    fireEvent.click(container.querySelector('.msl-select-all')!)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('open: disabled while open, yours closes it and focus moves to the wrapper, as without open', () => {
    function Form({ disabled }: { disabled: boolean }) {
      const [open, setOpen] = useState(false)
      return (
        <MultiSelect
          options={opts}
          open={open}
          disabled={disabled}
          onMenuOpen={() => setOpen(true)}
          onMenuClose={() => setOpen(false)}
        />
      )
    }
    const { container, rerender } = render(<Form disabled={false} />)
    const root = container.querySelector<HTMLElement>('.msl-wrp')!
    fireEvent.click(root)
    expect(document.activeElement).toBe(
      container.querySelector('input.msl-input')
    )
    rerender(<Form disabled />)
    expect(box()).toBeNull()
    expect(document.activeElement).toBe(root)
  })

  it('open: open from the start, false stays closed', () => {
    const onMenuOpen = vi.fn()
    const { rerender } = render(
      <MultiSelect options={opts} open onMenuOpen={onMenuOpen} />
    )
    expect(box()).not.toBeNull()
    expect(onMenuOpen).not.toHaveBeenCalled()
    rerender(
      <MultiSelect options={opts} open={false} onMenuOpen={onMenuOpen} />
    )
    expect(box()).toBeNull()
  })

  it("onSearchChange hears the field's text, raw, as typed, picked and closed, each change once", () => {
    const onSearchChange = vi.fn()
    const onSearch = vi.fn()
    const { root, input } = setup({ onSearchChange, onSearch })
    fireEvent.click(root)
    press(input(), 'Escape')
    expect(onSearchChange).not.toHaveBeenCalled()
    fireEvent.click(root)
    fireEvent.change(input(), { target: { value: ' ap, ' } })
    expect(onSearchChange).toHaveBeenLastCalledWith(' ap, ', 'input')
    expect(onSearch).toHaveBeenLastCalledWith('ap')
    press(input())
    expect(onSearchChange).toHaveBeenLastCalledWith('', 'pick')
    type(input(), 'b', 'b')
    press(input(), 'Escape')
    expect(onSearchChange.mock.calls).toEqual([
      [' ap, ', 'input'],
      ['', 'pick'],
      ['b', 'input'],
      ['', 'close']
    ])
  })

  it('a close from outside reports to the latest onSearchChange and onMenuClose, a new closure each render', () => {
    const first = vi.fn()
    const latest = vi.fn()
    const onMenuClose = vi.fn()
    const { root, input, rerender } = setup({ onSearchChange: first })
    fireEvent.click(root)
    fireEvent.change(input(), { target: { value: 'ap' } })
    rerender(
      <MultiSelect
        options={opts}
        onSearchChange={latest}
        onMenuClose={onMenuClose}
      />
    )
    fireEvent.click(document.body)
    expect(first.mock.calls).toEqual([['ap', 'input']])
    expect(latest.mock.calls).toEqual([['', 'close']])
    expect(onMenuClose).toHaveBeenCalledTimes(1)
  })

  it('search: yours shows, filters and loads; ignoring a pick keeps it after the pick', () => {
    const changes = vi.fn()
    function Kept(props: MultiSelectProps) {
      const [search, setSearch] = useState('')
      return (
        <MultiSelect
          options={opts}
          onChange={changes}
          search={search}
          onSearchChange={(text, reason) =>
            reason !== 'pick' && setSearch(text)
          }
          {...props}
        />
      )
    }
    const { container, rerender } = render(<Kept />)
    const field = () =>
      container.querySelector<HTMLInputElement>('input.msl-input')!
    const texts = () =>
      [...document.querySelectorAll('.msl-options .msl-option')].map(
        (el) => el.textContent
      )
    fireEvent.click(container.firstChild as Element)
    type(field(), 'an', 'n')
    expect(texts()).toEqual(['Banana'])
    press(field(), 'ArrowDown')
    press(field())
    expect(changes).toHaveBeenLastCalledWith(['banana'], [opts[1]])
    expect(field().value).toBe('an')
    expect(texts()).toEqual(['Banana'])
    press(field(), 'Escape')
    expect(field().value).toBe('')
    // set from outside: the field shows it, closed too
    rerender(<Kept search='ch' />)
    expect(field().value).toBe('ch')
  })

  it('types open, search, onSearchChange, maxChips, moreChipsLabel and the chip index and total', () => {
    const chip = (p: MultiSelectChipProps) => `${p.index}/${p.total}`
    const elements = [
      <MultiSelect
        key='a'
        open={false}
        search=''
        onSearchChange={(text: string, reason: 'input' | 'pick' | 'close') =>
          text + reason
        }
        maxChips={2}
        moreChipsLabel={(n: number) => n}
        customChip={chip}
      />,
      // @ts-expect-error a reason is one of three
      <MultiSelect key='b' onSearchChange={(_, r: 'typed') => r} />
    ]
    expect(elements).toHaveLength(2)
  })
})

describe("getLabel's meta (context, search, selected) and hideSelected", () => {
  // the label with where it shows: `menu: ''` for a menu row with no search, `value` for a value
  const where = vi.fn(
    (
      opt: MultiSelectOption,
      { context, search, selected }: MultiSelectLabelMeta
    ) =>
      `${opt.label} ${context}${context === 'menu' ? `:${search}` : ''}${selected ? ' ✓' : ''}`
  )

  it('menu rows get the search and their selected state, chips and the single value get the value context', () => {
    const { root, input, chips, optionTexts, rerender, q } = setup({
      getLabel: where,
      defaultValue: ['banana']
    })
    expect(chips()).toEqual(['Banana value ✓'])
    fireEvent.click(root)
    expect(optionTexts()).toEqual([
      'Apple menu:',
      'Banana menu: ✓',
      'Cherry menu:'
    ])
    fireEvent.change(input(), { target: { value: ' an, ' } })
    expect(optionTexts()).toEqual(['Banana menu:an ✓'])
    rerender(<MultiSelect options={opts} getLabel={where} singleSelect />)
    expect(q('.msl-single-value').textContent).toBe('Banana value ✓')
  })

  it('search and the tooltip read the text of the label for no search: a highlight of the match leaves them be', () => {
    const name = (p: { id: string; name: string }) => p.name
    const people = [
      { id: '1', name: 'Ada' },
      { id: '2', name: 'Alan' }
    ]
    const { container } = render(
      <MultiSelect
        options={people}
        getValue={(p) => p.id}
        // the match in <mark>
        getLabel={(p, { search }) => {
          const i = search ? name(p).toLowerCase().indexOf(search) : -1
          return i < 0 ? (
            name(p)
          ) : (
            <>
              {name(p).slice(0, i)}
              <mark>{name(p).slice(i, i + search.length)}</mark>
              {name(p).slice(i + search.length)}
            </>
          )
        }}
      />
    )
    fireEvent.click(container.firstChild!)
    const rows = () => [...container.querySelectorAll('.msl-option')]
    expect(rows().map((el) => el.getAttribute('title'))).toEqual([
      'Ada',
      'Alan'
    ])
    fireEvent.change(container.querySelector('input.msl-input')!, {
      target: { value: 'la' }
    })
    expect(rows().map((el) => el.innerHTML)).toEqual(['A<mark>la</mark>n'])
    // a JSX label: the tooltip falls back to the option's label field, which people lack
    expect(rows()[0].getAttribute('title')).toBe('')
  })

  it("created values skip getLabel; a value's chip is named by its value label", () => {
    const getLabel = vi.fn(where)
    const { input, chips } = setup({ getLabel, customValue: true })
    type(input(), 'kiwi', 'Enter')
    expect(chips()).toEqual(['kiwi'])
    expect(getLabel.mock.calls.some(([o]) => o.value === 'kiwi')).toBe(false)
  })

  it('types the meta, one-argument getLabels too', () => {
    const ada = { id: '1', name: 'Ada' }
    const elements = [
      <MultiSelect
        key='a'
        options={[ada]}
        getLabel={(p, meta) =>
          meta.context === 'value' ? p.name : `${p.name}${meta.search}`
        }
        getValue={(p) => p.id}
      />,
      <MultiSelect
        key='b'
        options={[ada]}
        getLabel={(p) => p.name}
        getValue={(p) => p.id}
      />,
      <MultiSelect
        key='c'
        // @ts-expect-error meta comes second
        getLabel={(m: MultiSelectLabelMeta, p: MultiSelectOption) => p.label}
      />
    ]
    expect(elements).toHaveLength(3)
  })

  it('hideSelected: picked options leave the menu and search results; a deleted chip brings one back', () => {
    const { root, input, optionTexts, option, qa } = setup({
      hideSelected: true,
      defaultValue: ['banana']
    })
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Apple', 'Cherry'])
    fireEvent.click(option('Apple'))
    expect(optionTexts()).toEqual(['Cherry'])
    fireEvent.change(input(), { target: { value: 'a' } })
    expect(optionTexts()).toEqual(['No Data Found'])
    fireEvent.change(input(), { target: { value: '' } })
    fireEvent.click(qa('.msl-chip-delete')[0])
    expect(optionTexts()).toEqual(['Banana', 'Cherry'])
  })

  it('hideSelected: Enter or a comma picks the first result shown, never a hidden one', () => {
    const { input, chips } = setup({
      hideSelected: true,
      options: [...opts, { label: 'Apricot', value: 'apricot' }],
      defaultValue: ['apple']
    })
    type(input(), 'ap', 'Enter')
    expect(chips()).toEqual(['Apple', 'Apricot'])
    type(input(), 'ap', ',')
    expect(chips()).toEqual(['Apple', 'Apricot'])
  })

  it('single select hides its value', () => {
    const { root, optionTexts } = setup({
      hideSelected: true,
      singleSelect: true,
      defaultValue: ['cherry']
    })
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Apple', 'Banana'])
  })

  it('groups, collapsible groups and submenus with nothing left go, title and all; an empty group stays; renderGroupTitle counts the hidden', () => {
    const renderGroupTitle = vi.fn(
      ({ title, total, selected }: MultiSelectGroupTitleProps) =>
        `${title} ${selected}/${total}`
    )
    const { root, groupTitles, optionTexts, option } = setupTree({
      options: [
        { type: 'group', title: 'Plain', childs: [opts[0]] },
        {
          type: 'group',
          title: 'Fold',
          collapsible: true,
          childs: [opts[1], { label: 'Kiwi', value: 'kiwi' }]
        },
        { type: 'submenu', title: 'Sub', childs: [opts[2]] },
        { type: 'group', title: 'Empty', childs: [], emptyDataLabel: 'None' }
      ],
      hideSelected: true,
      defaultValue: ['apple', 'banana', 'cherry'],
      renderGroupTitle
    })
    fireEvent.click(root)
    expect(groupTitles()).toEqual(['Fold 1/2', 'Empty 0/0'])
    expect(optionTexts()).toEqual(['Kiwi', 'None'])
    fireEvent.click(option('Kiwi'))
    expect(groupTitles()).toEqual(['Empty 0/0'])
  })

  it('the Custom Values group goes once its values are all picked', () => {
    const { input, groupTitles, optionTexts } = setup({
      hideSelected: true,
      customValue: true
    })
    type(input(), 'kiwi', 'Enter')
    expect(groupTitles()).toEqual([])
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  it("hidden options leave gaps: the others keep their places, a group's open state too", () => {
    const { root, q, optionTexts, option, titles } = setupTree({
      options: [opts[0], { ...fruits[1] }],
      hideSelected: true
    })
    fireEvent.click(root)
    // Berries opens
    fireEvent.click(q('.msl-grp-title'))
    expect(titles()).toEqual(['true'])
    fireEvent.click(option('Apple'))
    expect(titles()).toEqual(['true'])
    expect(optionTexts()).toEqual(['Blueberry'])
  })

  it('the keyboard: Enter picks, the highlight goes on to the next row, at the end back to the one before', () => {
    const { input, focused, onChange, q } = setupTree({
      hideSelected: true,
      options: [opts[0], { type: 'group', title: 'G', childs: opts.slice(1) }]
    })
    press(input(), 'ArrowDown')
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Banana')
    press(input())
    expect(onChange).toHaveBeenLastCalledWith(['banana'], [opts[1]])
    expect(focused()).toBe('Cherry')
    expect(input().getAttribute('aria-activedescendant')).toBe(
      q('.msl-option-focused').id
    )
    press(input())
    expect(focused()).toBe('Apple')
    press(input())
    expect(focused()).toBeUndefined()
    expect(q('.msl-options > .msl-option').textContent).toBe('No Data Found')
  })

  it('the keyboard: Enter skips the rows the pick hides or disables, a group left empty, options past the limit', () => {
    const { input, focused } = setupTree({
      hideSelected: true,
      defaultValue: ['banana'],
      options: [
        opts[0],
        { type: 'group', title: 'G', collapsible: true, childs: opts.slice(1) }
      ]
    })
    // Apple, G, Cherry in it: G goes with Cherry
    press(input(), 'ArrowUp')
    expect(focused()).toBe('Cherry')
    press(input())
    expect(focused()).toBe('Apple')
    cleanup()
    const limited = setupTree({
      hideSelected: true,
      limit: 2,
      defaultValue: ['apple']
    })
    press(limited.input(), 'ArrowDown')
    press(limited.input())
    expect(limited.chips()).toEqual(['Apple', 'Banana'])
    expect(limited.focused()).toBeUndefined()
  })

  it("a loader's list with its options all picked keeps its end row while it may load more; getValue never reads that row", async () => {
    const { fn, calls } = loads()
    const getValue = (o: MultiSelectOption) => o.value.trim()
    const { root, optionTexts, option } = setup({
      options: undefined,
      loadOptions: fn,
      getValue,
      hideSelected: true
    })
    fireEvent.click(root)
    await calls[0].ok({ options: [opts[0]], next: 2 })
    fireEvent.click(option('Apple'))
    expect(optionTexts()).toEqual(['Loading...'])
  })

  it('with renderList, the rows a virtual list gets leave out the hidden', () => {
    const renderList = vi.fn(({ count, row }: MultiSelectListProps) => (
      <div>{Array.from({ length: count }, (_, i) => row(i))}</div>
    ))
    const { root, optionTexts } = setup({
      options: grouped,
      renderList,
      hideSelected: true,
      defaultValue: ['banana']
    })
    fireEvent.click(root)
    expect(renderList.mock.lastCall![0].count).toBe(4)
    expect(optionTexts()).toEqual(['Apple', 'Cherry'])
  })
})

describe('loadKey, errorLabel(error, retry), data-loading, preload, loadAhead, emptyDataLabel(search)', () => {
  it('a new loadKey drops the lists and stops their loads, the list showing loads again; the selection, the open menu and the names stay', async () => {
    const { fn, calls } = loads()
    const props = {
      options: undefined,
      loadOptions: fn,
      defaultValue: ['banana']
    }
    const { root, rerender, chips, optionTexts, isOpen } = setup({
      ...props,
      loadKey: 'a'
    })
    const key = (loadKey: unknown) =>
      rerender(<MultiSelect {...props} loadKey={loadKey} />)
    fireEvent.click(root)
    await calls[0].ok({ options: opts, next: 2 })
    expect(chips()).toEqual(['Banana'])
    key('a')
    expect(fn).toHaveBeenCalledTimes(1)
    key('b')
    expect(calls[1].req).toEqual(request(''))
    expect(isOpen()).toBe(true)
    expect(optionTexts()).toEqual(['Loading...'])
    // the dropped options name the value still
    expect(chips()).toEqual(['Banana'])
    key('c')
    expect(calls[1].req.signal.aborted).toBe(true)
    expect(calls[2].req).toEqual(request(''))
    // late: dropped
    await calls[1].ok([{ label: 'Zed', value: 'zed' }])
    expect(optionTexts()).toEqual(['Loading...'])
    await calls[2].ok([opts[0]])
    expect(optionTexts()).toEqual(['Apple'])
    // by Object.is: NaN is NaN
    key(NaN)
    key(NaN)
    expect(fn).toHaveBeenCalledTimes(4)
  })

  it('a new loadKey keeps naming only the values picked from the dropped lists', async () => {
    const { fn, calls } = loads()
    const props = { options: undefined, loadOptions: fn }
    const { root, rerender, chips } = setup({
      ...props,
      value: ['banana'],
      loadKey: 'a'
    })
    fireEvent.click(root)
    await calls[0].ok(opts)
    rerender(<MultiSelect {...props} value={['banana']} loadKey='b' />)
    rerender(
      <MultiSelect {...props} value={['banana', 'cherry']} loadKey='b' />
    )
    expect(chips()).toEqual(['Banana'])
  })

  it("a new loadKey stops the loads once it commits: an abort's listeners may set state", () => {
    const error = vi.spyOn(console, 'error')
    function Parent({ k }: { k: number }) {
      const [aborts, setAborts] = useState(0)
      return (
        <>
          <p>{aborts}</p>
          <MultiSelect
            loadKey={k}
            loadOptions={({ signal }) => {
              signal.addEventListener('abort', () => setAborts((n) => n + 1))
              return new Promise<MultiSelectLoaded>(() => {})
            }}
          />
        </>
      )
    }
    const { container, rerender } = render(<Parent k={1} />)
    fireEvent.click(container.querySelector('.msl-wrp')!)
    rerender(<Parent k={2} />)
    expect(container.querySelector('p')!.textContent).toBe('1')
    expect(error).not.toHaveBeenCalled()
  })

  it('a new loadKey in a render React drops leaves the lists be: a render with the old one keeps them', async () => {
    const { fn, calls } = loads()
    const never = new Promise(() => {})
    function Hold({ on }: { on: boolean }) {
      if (on) throw never
      return null
    }
    let setKey!: (k: string) => void
    function Parent() {
      const [k, set] = useState('a')
      setKey = set
      return (
        <Suspense fallback={null}>
          <MultiSelect loadOptions={fn} loadKey={k} />
          <Hold on={k === 'b'} />
        </Suspense>
      )
    }
    const { container } = render(<Parent />)
    fireEvent.click(container.querySelector('.msl-wrp')!)
    await calls[0].ok(opts)
    // renders with b, then suspends: React keeps showing a
    act(() => startTransition(() => setKey('b')))
    const field = container.querySelector('input.msl-input')!
    // a render with a: the highlight moves
    press(field, 'ArrowDown')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(
      [...document.querySelectorAll('.msl-options .msl-option')].map(
        (el) => el.textContent
      )
    ).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  it("a new loadKey drops groups' lists: the open ones load again, search no longer finds the dropped options", async () => {
    const { fn, calls } = loads()
    const options = [
      { type: 'group', title: 'G', childs: fn },
      {
        type: 'group',
        title: 'H',
        collapsible: true,
        collapsed: true,
        childs: fn
      }
    ]
    const { root, rerender, chips, optionTexts, input, option } = setupTree({
      options,
      loadKey: 1
    })
    fireEvent.click(root)
    await calls[0].ok(opts)
    fireEvent.click(option('Cherry'))
    rerender(<MultiSelect options={options} loadKey={2} />)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(calls[1].req).toEqual(request(''))
    expect(chips()).toEqual(['Cherry'])
    fireEvent.change(input(), { target: { value: 'an' } })
    expect(optionTexts()).toEqual(['No Data Found'])
  })

  it('errorLabel as a function gets what the load threw and a retry: a click on the row does not retry, the keyboard does', async () => {
    const { fn, calls } = loads()
    const errorLabel = vi.fn((error: unknown, retry: () => void) => (
      <button onClick={retry}>{(error as Error).message}</button>
    ))
    const { root, q, input, optionTexts } = setup({
      options: undefined,
      loadOptions: fn,
      errorLabel
    })
    fireEvent.click(root)
    await calls[0].fail()
    expect(errorLabel).toHaveBeenLastCalledWith(
      new Error('down'),
      expect.any(Function)
    )
    expect(optionTexts()).toEqual(['down'])
    const end = q('.msl-loading')
    expect(end.getAttribute('data-error')).toBe('true')
    fireEvent.click(end)
    expect(fn).toHaveBeenCalledTimes(1)
    fireEvent.click(q('.msl-loading button'))
    expect(fn).toHaveBeenCalledTimes(2)
    await calls[1].fail()
    press(input(), 'ArrowDown')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('a load that rejects with nothing fails with true, one that returns nothing with a TypeError', async () => {
    const errorLabel = vi.fn((error: unknown) => (error ? 'failed' : ''))
    const { root, optionTexts } = setup({
      options: undefined,
      loadOptions: () => Promise.reject(),
      errorLabel
    })
    fireEvent.click(root)
    await settle()
    expect(optionTexts()).toEqual(['failed'])
    expect(errorLabel).toHaveBeenLastCalledWith(true, expect.any(Function))
    cleanup()
    const { root: other } = setup({
      options: undefined,
      loadOptions: (() => undefined) as unknown as MultiSelectLoader,
      errorLabel
    })
    fireEvent.click(other)
    await settle()
    expect(errorLabel.mock.lastCall![0]).toBeInstanceOf(TypeError)
  })

  it('loadError takes the error itself, as errorLabel gets it; retry calls onLoadMore', () => {
    const errorLabel = vi.fn((error: unknown, retry: () => void) => (
      <button onClick={retry}>{String(error)}</button>
    ))
    const { root, q, onLoadMore } = remote({
      loadError: new Error('down'),
      errorLabel
    })
    fireEvent.click(root)
    // the menu opening retries, as before
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    expect(q('.msl-loading').getAttribute('data-error')).toBe('true')
    expect(q('.msl-loading').textContent).toBe('Error: down')
    fireEvent.click(q('.msl-loading'))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    fireEvent.click(q('.msl-loading button'))
    expect(onLoadMore).toHaveBeenCalledTimes(2)
  })

  it("errorLabel's retry from a focused button: loadingLabel takes its place, focus goes to the listbox", async () => {
    const { fn, calls } = loads()
    const { root, q } = setup({
      options: undefined,
      loadOptions: fn,
      disableSearch: true,
      errorLabel: (_, retry) => <button onClick={retry}>Retry</button>
    })
    fireEvent.click(root)
    await calls[0].fail()
    const retry = q('.msl-loading button')
    retry.focus()
    fireEvent.click(retry)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(q('.msl-loading').textContent).toBe('Loading...')
    expect(document.activeElement).toBe(q('.msl-options'))
  })

  it('data-loading on the wrapper while any list loads, open or closed: a loader, loading, a group of yours', async () => {
    const { fn, calls } = loads()
    const { root, input, isOpen } = setup({
      options: undefined,
      loadOptions: fn
    })
    expect(root.hasAttribute('data-loading')).toBe(false)
    fireEvent.click(root)
    expect(root.getAttribute('data-loading')).toBe('true')
    press(input(), 'Escape')
    expect(isOpen()).toBe(false)
    // closing doesn't stop it
    expect(root.getAttribute('data-loading')).toBe('true')
    await calls[0].ok(opts)
    expect(root.hasAttribute('data-loading')).toBe(false)
    cleanup()
    const yours = remote({ loading: true })
    expect(yours.root.getAttribute('data-loading')).toBe('true')
    cleanup()
    const group = setupTree({
      options: [
        {
          type: 'group',
          title: 'G',
          collapsible: true,
          collapsed: true,
          childs: [],
          loading: true
        }
      ]
    })
    expect(group.root.getAttribute('data-loading')).toBe('true')
  })

  it('preload loads the first list on mount, and as loadKey changes; the menu opens on it', async () => {
    const { fn, calls } = loads()
    const { root, rerender, input, optionTexts } = setup({
      options: undefined,
      loadOptions: fn,
      preload: true
    })
    expect(calls[0].req).toEqual(request(''))
    await calls[0].ok(opts)
    // loaded: not again
    fireEvent.focus(root)
    fireEvent.click(root)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
    press(input(), 'Escape')
    rerender(<MultiSelect loadOptions={fn} preload loadKey={2} />)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(calls[1].req).toEqual(request(''))
  })

  it("preload 'intent' loads as the pointer enters or focus arrives, once, calling your handlers first", () => {
    const { fn } = loads()
    const onFocus = vi.fn()
    const onPointerEnter = vi.fn()
    const { root } = setup({
      options: undefined,
      loadOptions: fn,
      preload: 'intent',
      attr: { onFocus, onPointerEnter }
    })
    expect(fn).not.toHaveBeenCalled()
    fireEvent.pointerEnter(root)
    expect(onPointerEnter).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledTimes(1)
    fireEvent.focus(root)
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledTimes(1)
    cleanup()
    const other = setup({
      options: undefined,
      loadOptions: fn,
      preload: 'intent'
    })
    fireEvent.focus(other.root)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('a search stopping a list that shows once it clears: that list loads again, not stuck on its stopped load', async () => {
    const { fn, calls } = loads()
    const { root, input, optionTexts } = setup({
      options: undefined,
      loadOptions: fn,
      preload: 'intent'
    })
    fireEvent.click(root)
    fireEvent.change(input(), { target: { value: 'a' } })
    // the first list loads again, under the search
    fireEvent.pointerEnter(root)
    expect(calls[2].req).toEqual(request(''))
    fireEvent.change(input(), { target: { value: '' } })
    expect(calls[2].req.signal.aborted).toBe(true)
    expect(calls[3].req).toEqual(request(''))
    await calls[3].ok(opts)
    expect(optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  it('without preload, or without loadOptions, the pointer and focus load nothing', () => {
    const { fn } = loads()
    const { root } = setup({ options: undefined, loadOptions: fn })
    fireEvent.pointerEnter(root)
    fireEvent.focus(root)
    expect(fn).not.toHaveBeenCalled()
    cleanup()
    const group = setupTree({
      options: [{ type: 'submenu', title: 'S', childs: fn }],
      preload: true
    })
    fireEvent.focus(group.root)
    expect(fn).not.toHaveBeenCalled()
  })

  it('loadAhead: a box that much taller upward over the end row is observed, the row not', () => {
    const { root, q, onLoadMore } = remote({ loadAhead: 120 })
    fireEvent.click(root)
    const end = q('.msl-loading')
    const box = end.firstElementChild as HTMLElement
    expect(end.style.position).toBe('relative')
    expect(box.style.position).toBe('absolute')
    expect(box.style.pointerEvents).toBe('none')
    expect(end.textContent).toBe('Loading...')
    inView(end, true)
    expect(onLoadMore).not.toHaveBeenCalled()
    inView(box, true)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('emptyDataLabel as a function of the search text', () => {
    const emptyDataLabel = (search: string) =>
      search.length < 2 ? 'Type 2 letters' : `Nothing for "${search}"`
    const { input, optionTexts } = setup({ options: [], emptyDataLabel })
    expect(optionTexts()).toEqual(['Type 2 letters'])
    fireEvent.change(input(), { target: { value: ' xyz, ' } })
    expect(optionTexts()).toEqual(['Nothing for "xyz"'])
  })

  it('types loadKey, preload, loadAhead, errorLabel and emptyDataLabel as functions, loadError as the error', () => {
    const elements = [
      <MultiSelect
        key='a'
        loadKey={{ country: 'NO' }}
        preload='intent'
        loadAhead={200}
        loadError={new Error('down')}
        errorLabel={(error, retry) => (
          <button onClick={retry}>{String(error)}</button>
        )}
        emptyDataLabel={(search) => search.toUpperCase()}
        options={[
          { type: 'group', title: 'G', childs: opts, loadError: 'down' }
        ]}
      />,
      // @ts-expect-error preload is true, false or 'intent'
      <MultiSelect key='b' preload='hover' />
    ]
    expect(elements).toHaveLength(2)
  })
})

describe('menuHeader, menuFooter, selectAll, group header and footer, renderGroupTitle toggle', () => {
  // every row in a box of its own, as a virtual list positions them
  const rows = ({ count, row }: MultiSelectListProps) => (
    <div className='my-list'>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className='my-row'>
          {row(i)}
        </div>
      ))}
    </div>
  )
  const tree = [
    opts[0],
    {
      type: 'group',
      title: 'G',
      collapsible: true,
      collapsed: true,
      childs: [opts[1], { label: 'Off', value: 'off', disabled: true }]
    },
    { type: 'submenu', title: 'S', childs: [opts[2]] }
  ]

  it('menuHeader and menuFooter go around the listbox, outside it, with searchInMenu after the field', () => {
    const { root, q, qa } = setup({
      menuHeader: <b>Head</b>,
      menuFooter: 'Foot',
      searchInMenu: true,
      classNames: { menuHeader: 'mh', menuFooter: 'mf' }
    })
    expect(qa('.msl-menu-header')).toEqual([])
    fireEvent.click(root)
    const head = q('.msl-menu-header')
    expect(head.className).toBe('msl-menu-header mh')
    expect(head.innerHTML).toBe('<b>Head</b>')
    expect(head.previousElementSibling!.className).toBe('msl-search ')
    expect(head.nextElementSibling).toBe(q('.msl-options'))
    const foot = q('.msl-menu-footer')
    expect(foot.className).toBe('msl-menu-footer mf')
    expect(foot.previousElementSibling).toBe(q('.msl-options'))
    expect(q('.msl-options').querySelector('.msl-menu-header')).toBeNull()
  })

  it('a menuHeader of false or null renders no box', () => {
    const { root, qa } = setup({ menuHeader: false, menuFooter: null })
    fireEvent.click(root)
    expect(qa('.msl-menu-header, .msl-menu-footer')).toEqual([])
  })

  it('a click in it keeps the menu open and focus where it is, but on a form field; its keys are its own', () => {
    const click = vi.fn()
    const { root, q, input, isOpen, onChange } = setup({
      menuHeader: (
        <>
          <button onClick={click}>All</button>
          <input className='filter' />
        </>
      )
    })
    fireEvent.click(root)
    const button = q('.msl-menu-header button')
    expect(fireEvent.mouseDown(button)).toBe(false)
    expect(fireEvent.mouseDown(q('.filter'))).toBe(true)
    fireEvent.click(button)
    expect(click).toHaveBeenCalled()
    expect(isOpen()).toBe(true)
    // Enter on the button presses it: no pick of the highlighted option
    press(input(), 'ArrowDown')
    expect(press(button)).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
    // typing in its field stays there
    q<HTMLInputElement>('.filter').focus()
    press(q('.filter'), 'a')
    expect(document.activeElement).toBe(q('.filter'))
    expect(isOpen()).toBe(true)
  })

  it('Tab steps into what is tabbable in it, the menu open; Escape there closes it, focus back in the field', () => {
    const { root, q, input, isOpen } = setup({
      menuFooter: <button>Done</button>
    })
    fireEvent.click(root)
    expect(press(input(), 'Tab')).toBe(true)
    expect(isOpen()).toBe(true)
    q('.msl-menu-footer button').focus()
    press(q('.msl-menu-footer button'), 'Escape')
    expect(isOpen()).toBe(false)
    expect(document.activeElement).toBe(input())
  })

  it('as a function: the enabled options listed, in closed groups too, a search narrows them; selectAll and deselectAll', () => {
    const fixed = { label: 'Fixed', value: 'fixed', fixed: true }
    const menuHeader = vi.fn(
      ({
        options,
        selected,
        search,
        selectAll,
        deselectAll
      }: MultiSelectMenuProps) => (
        <>
          <span className='count'>
            {search}:{selected}/{options.length}
          </span>
          <button className='all' onClick={selectAll} />
          <button className='none' onClick={deselectAll} />
        </>
      )
    )
    const { root, q, input, onChange, chips } = setupTree({
      options: [...tree, fixed],
      defaultValue: ['fixed'],
      menuHeader,
      customValue: true
    })
    fireEvent.click(root)
    expect(q('.count').textContent).toBe(':1/4')
    expect(menuHeader.mock.lastCall![0].options).toEqual([
      opts[0],
      opts[1],
      opts[2],
      fixed
    ])
    fireEvent.click(q('.all'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(chips()).toEqual(['Fixed', 'Apple', 'Banana', 'Cherry'])
    fireEvent.click(q('.none'))
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(chips()).toEqual(['Fixed'])
    // a search's results, not its Create row
    fireEvent.change(input(), { target: { value: 'an' } })
    expect(q('.count').textContent).toBe('an:0/1')
    fireEvent.click(q('.all'))
    expect(chips()).toEqual(['Fixed', 'Banana'])
  })

  it('selectAll from a header stays under the limit, and picks one in single select', () => {
    const header = ({ selectAll }: MultiSelectMenuProps) => (
      <button className='all' onClick={selectAll} />
    )
    const { root, q, chips, onChange } = setup({
      menuHeader: header,
      limit: 2
    })
    fireEvent.click(root)
    fireEvent.click(q('.all'))
    expect(chips()).toEqual(['Apple', 'Banana'])
    // full: nothing more, still one onChange
    fireEvent.click(q('.all'))
    expect(onChange).toHaveBeenLastCalledWith(
      ['apple', 'banana'],
      opts.slice(0, 2)
    )
    cleanup()
    const one = setup({ menuHeader: header, singleSelect: true })
    fireEvent.click(one.root)
    fireEvent.click(one.q('.all'))
    expect(one.single()).toBe('Apple')
    fireEvent.click(one.root)
    fireEvent.click(one.q('.all'))
    expect(one.single()).toBe('Apple')
  })

  it("the function's options are those loaded so far with loadOptions", async () => {
    const { fn, calls } = loads()
    const menuFooter = vi.fn(
      ({ options }: MultiSelectMenuProps) => options.length
    )
    const { root, q } = setup({
      options: undefined,
      loadOptions: fn,
      menuFooter
    })
    fireEvent.click(root)
    expect(q('.msl-menu-footer').textContent).toBe('0')
    await calls[0].ok({ options: opts.slice(0, 2), next: 2 })
    expect(q('.msl-menu-footer').textContent).toBe('2')
  })

  it('selectAll: a row atop the options the keyboard reaches first; it selects every enabled one listed, then deselects', () => {
    const { root, q, input, focused, optionTexts, onChange, chips } = setupTree(
      {
        options: [...tree, { label: 'Kept', value: 'kept', fixed: true }],
        defaultValue: ['kept'],
        selectAll: true,
        classNames: { selectAll: 'sa' }
      }
    )
    fireEvent.click(root)
    expect(optionTexts()[0]).toBe('Select all')
    const row = q('.msl-select-all')
    expect(row.getAttribute('role')).toBe('option')
    expect(row.className).toContain('msl-option')
    expect(row.className).toContain('sa')
    expect(row.getAttribute('aria-selected')).toBe('false')
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Select all')
    press(input())
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(chips()).toEqual(['Kept', 'Apple', 'Banana', 'Cherry'])
    expect(q('.msl-select-all').getAttribute('aria-selected')).toBe('true')
    expect(q('.msl-select-all').className).toContain('msl-option-active')
    // the menu stays, the highlight on it
    expect(focused()).toBe('Select all')
    fireEvent.click(q('.msl-select-all'))
    expect(chips()).toEqual(['Kept'])
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it("selectAll: a search's results only; hidden with none, in single select, and stays open with closeOnSelect", () => {
    const { q, input, optionTexts, chips, isOpen } = setup({
      selectAll: 'Every fruit',
      closeOnSelect: true
    })
    fireEvent.change(input(), { target: { value: 'an' } })
    expect(optionTexts()).toEqual(['Every fruit', 'Banana'])
    fireEvent.click(q('.msl-select-all'))
    expect(chips()).toEqual(['Banana'])
    expect(isOpen()).toBe(true)
    fireEvent.change(input(), { target: { value: 'zz' } })
    expect(optionTexts()).toEqual(['No Data Found'])
    cleanup()
    const one = setup({ selectAll: true, singleSelect: true })
    expect(one.optionTexts()).toEqual(['Apple', 'Banana', 'Cherry'])
    cleanup()
    const off = setup({
      selectAll: true,
      options: [{ label: 'Off', value: 'off', disabled: true }]
    })
    expect(off.optionTexts()).toEqual(['Off'])
  })

  it('selectAll under a limit: it fills it, then shows selected and deselects', () => {
    const { root, q, chips } = setup({ selectAll: true, limit: 2 })
    fireEvent.click(root)
    fireEvent.click(q('.msl-select-all'))
    expect(chips()).toEqual(['Apple', 'Banana'])
    const row = q('.msl-select-all')
    expect(row.getAttribute('aria-selected')).toBe('true')
    expect(row.getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(row)
    expect(chips()).toEqual([])
  })

  it('selectAll: Enter picks the first result shown, not one in a group collapsed', () => {
    const results = [
      {
        type: 'group',
        title: 'Fruits',
        collapsible: true,
        childs: [{ label: 'Apple', value: 'apple' }]
      },
      { label: 'Apricot', value: 'apricot' }
    ]
    const { root, input, chips, q } = setup({
      options: results,
      onSearch: () => {},
      selectAll: true
    })
    fireEvent.click(root)
    type(input(), 'ap', 'p')
    fireEvent.click(q('.msl-grp-title'))
    press(input())
    expect(chips()).toEqual(['Apricot'])
  })

  it('selectAll with renderList: a row', () => {
    const { root, qa } = setup({ selectAll: true, renderList: rows })
    fireEvent.click(root)
    expect(qa('.my-row').map((el) => el.textContent)).toEqual([
      'Select all',
      'Apple',
      'Banana',
      'Cherry'
    ])
  })

  it('selectAll showing as a lazy submenu loads leaves it open, the highlight on its title', async () => {
    const { fn, calls } = loads()
    const { root, input, focused, subs, optionTexts } = setupTree({
      options: [{ type: 'submenu', title: 'Users', childs: fn }],
      selectAll: true
    })
    fireEvent.click(root)
    press(input(), 'ArrowDown')
    press(input(), 'ArrowRight')
    expect(subs()).toEqual(['Users'])
    expect(focused()).toBe('Users')
    await calls[0].ok(opts)
    expect(subs()).toEqual(['Users'])
    expect(focused()).toBe('Users')
    expect(optionTexts()).toEqual([
      'Select all',
      'Users',
      'Apple',
      'Banana',
      'Cherry'
    ])
  })

  it("a group's header and footer: rows around its own, no options, the highlight passes them", () => {
    const { root, q, qa, input, focused, option, subs } = setupTree({
      options: [
        {
          type: 'group',
          title: 'Plain',
          header: 'P head',
          footer: false,
          childs: [opts[0]]
        },
        {
          type: 'group',
          title: 'Fold',
          collapsible: true,
          header: 'F head',
          footer: <i>F foot</i>,
          childs: [opts[1]]
        },
        {
          type: 'submenu',
          title: 'Sub',
          header: 'S head',
          footer: 'S foot',
          childs: [opts[2]]
        }
      ],
      classNames: { groupHeader: 'gh', groupFooter: 'gf' }
    })
    fireEvent.click(root)
    const head = q('.msl-grp-header')
    expect(head.className).toBe(
      'msl-option msl-option-disable msl-grp-header gh'
    )
    expect(head.hasAttribute('role')).toBe(false)
    expect(head.previousElementSibling!.textContent).toBe('Plain')
    expect(qa('.msl-grp-footer').map((el) => el.textContent)).toEqual([
      'F foot'
    ])
    expect(q('.msl-grp-body .msl-grp-footer').className).toBe(
      'msl-option msl-option-disable msl-grp-footer gf'
    )
    expect(
      q('.msl-grp-body').firstElementChild!.firstElementChild!.textContent
    ).toBe('F head')
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Apple')
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Fold')
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Banana')
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Sub')
    fireEvent.click(option('Sub'))
    expect(subs()).toEqual(['Sub'])
    const menu = q('.msl-submenu')
    expect([...menu.children].map((el) => el.textContent)).toEqual([
      'S head',
      'Cherry',
      'S foot'
    ])
    press(input(), 'ArrowRight')
    expect(focused()).toBe('Cherry')
    press(input(), 'ArrowDown')
    expect(focused()).toBe('Cherry')
  })

  it("a group's header and footer with renderList: rows, a submenu's in its list", () => {
    const { root, qa, option } = setup({
      options: [
        { type: 'group', title: 'G', header: 'Head', childs: [opts[0]] },
        {
          type: 'submenu',
          title: 'S',
          footer: 'Foot',
          childs: [opts[1]]
        }
      ],
      renderList: rows
    })
    fireEvent.click(root)
    expect(
      qa('.msl-options > .my-list > .my-row').map((el) => el.textContent)
    ).toEqual(['G', 'Head', 'Apple', 'S'])
    fireEvent.click(option('S'))
    expect(qa('.msl-submenu .my-row').map((el) => el.textContent)).toEqual([
      'Banana',
      'Foot'
    ])
  })

  it("renderGroupTitle's toggle selects a group's enabled options, nested too, in one onChange, then deselects them", () => {
    const renderGroupTitle = ({
      title,
      total,
      selected,
      toggle
    }: MultiSelectGroupTitleProps) => (
      <>
        <input
          type='checkbox'
          aria-label={`All of ${title}`}
          checked={selected === total}
          onChange={() => {}}
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
        />
        {title}
      </>
    )
    const { root, q, titles, chips, onChange } = setupTree({
      options: [
        {
          type: 'group',
          title: 'G',
          collapsible: true,
          childs: [
            opts[0],
            { type: 'group', title: 'In', childs: [opts[1]] },
            { label: 'Off', value: 'off', disabled: true },
            { label: 'Kept', value: 'kept', fixed: true }
          ]
        },
        opts[2]
      ],
      defaultValue: ['kept', 'off'],
      renderGroupTitle
    })
    fireEvent.click(root)
    const box = q<HTMLInputElement>('[aria-label="All of G"]')
    fireEvent.click(box)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(chips()).toEqual(['Kept', 'Off', 'Apple', 'Banana'])
    // the title didn't collapse
    expect(titles()[0]).toBe('true')
    // a selected disabled option stays, as a fixed one does: it couldn't be picked again
    fireEvent.click(box)
    expect(chips()).toEqual(['Kept', 'Off'])
    fireEvent.click(q('[aria-label="All of In"]'))
    expect(chips()).toEqual(['Kept', 'Off', 'Banana'])
  })

  it("keys on a control in a title row are the control's: Space keeps focus there, Enter doesn't toggle the group", () => {
    const { root, q, titles } = setupTree({
      options: [{ type: 'group', title: 'G', collapsible: true, childs: opts }],
      renderGroupTitle: ({ title }) => (
        <>
          <input type='checkbox' aria-label='All' />
          {title}
        </>
      )
    })
    fireEvent.click(root)
    const box = q<HTMLInputElement>('[aria-label="All"]')
    box.focus()
    expect(press(box, ' ')).toBe(true)
    expect(document.activeElement).toBe(box)
    press(box, 'Enter')
    expect(titles()[0]).toBe('true')
    expect(document.activeElement).toBe(box)
  })

  it('keys on a control in an option row still move the highlight, and Enter picks that row', () => {
    const { root, q, focused, onChange } = setupTree({
      disableSearch: true,
      getLabel: (o: MultiSelectOption) => (
        <>
          <input type='checkbox' aria-label={o.label as string} readOnly />
          {o.label}
        </>
      )
    })
    fireEvent.click(root)
    const box = q<HTMLInputElement>('[aria-label="Banana"]')
    box.focus()
    press(box, 'ArrowDown')
    expect(focused()).toBe('Apple')
    press(box, 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(['banana'], [opts[1]])
  })

  it('types the props: menuHeader and menuFooter of T, selectAll, group header and footer, toggle', () => {
    const ada = { id: '1', name: 'Ada' }
    const getters = {
      getLabel: (p: typeof ada) => p.name,
      getValue: (p: typeof ada) => p.id
    }
    const elements = [
      <MultiSelect
        key='a'
        options={[
          {
            type: 'group',
            title: 'G',
            header: <b />,
            footer: 'f',
            childs: [ada]
          }
        ]}
        menuHeader={({ options }) => options.map((p) => p.name)}
        menuFooter={<b />}
        selectAll={<i>All</i>}
        renderGroupTitle={({ toggle }) => <button onClick={toggle} />}
        {...getters}
      />,
      <MultiSelect
        key='b'
        options={[ada]}
        customValue
        // @ts-expect-error with customValue, created { label, value } options are listed too
        menuHeader={({ options }) => options.map((p) => p.name)}
        {...getters}
      />
    ]
    expect(elements).toHaveLength(2)
  })
})

describe('features together', () => {
  it('hideSelected with selectAll: all picked, only the row is left, selected, and deselects them', () => {
    const { root, q, optionTexts, chips } = setup({
      hideSelected: true,
      selectAll: true
    })
    fireEvent.click(root)
    expect(optionTexts()).toEqual(['Select all', 'Apple', 'Banana', 'Cherry'])
    fireEvent.click(q('.msl-select-all'))
    expect(chips()).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(optionTexts()).toEqual(['Select all'])
    expect(q('.msl-select-all').getAttribute('aria-selected')).toBe('true')
    fireEvent.click(q('.msl-select-all'))
    expect(chips()).toEqual([])
    expect(optionTexts()).toEqual(['Select all', 'Apple', 'Banana', 'Cherry'])
  })
})
