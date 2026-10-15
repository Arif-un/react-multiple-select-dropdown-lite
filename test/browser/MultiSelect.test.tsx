// Real-browser characterization tests: layout, CSS, focus and typing that jsdom fakes.
// Like test/MultiSelect.test.tsx, "current behavior: ..." pins known quirks.
import { expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { MultiSelectProps } from '../../src/index'
import MultiSelect from '../../src/MultiSelect'

const opts = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' }
]

// the open menu: a plate portaled to the body
const plate = () => document.querySelector<HTMLElement>('.msl-plate')

async function setup(props: MultiSelectProps = {}, { offsetTop = 0 } = {}) {
  const screen = await render(
    <div style={{ paddingTop: offsetTop }}>
      <button>outside</button>
      <MultiSelect options={opts} {...props} />
      <button>after</button>
    </div>
  )
  const c = screen.container
  // the plate while open: the wrapper's copy is hidden
  const q = (s: string) => (plate() ?? c).querySelector<HTMLElement>(s)!
  const root = c.querySelector<HTMLElement>('.msl-wrp')!
  return {
    root,
    q,
    outside: c.querySelector('button')!,
    after: c.querySelectorAll('button')[1],
    input: () => q('input.msl-input:enabled') as HTMLInputElement,
    menuHeight: () =>
      plate()?.querySelector('.msl-options')!.getBoundingClientRect().height ??
      0,
    chips: () =>
      [...c.querySelectorAll('.msl-chip')].map((el) => el.textContent),
    visibleOptions: () =>
      [...(plate()?.querySelectorAll('.msl-option') ?? [])].map(
        (el) => el.textContent
      ),
    option: (text: string) =>
      [...plate()!.querySelectorAll<HTMLElement>('.msl-option')].find(
        (el) => el.textContent === text
      )!,
    focused: () => {
      const el = document.activeElement!
      if (el === root || el === plate()) return 'wrapper'
      if (el.classList.contains('msl-input')) return 'search'
      if (el.classList.contains('msl-arrow-btn')) return 'arrow'
      if (el.classList.contains('msl-clear-btn')) return 'clear'
      if (el.classList.contains('msl-chip-delete')) return 'chip-delete'
      return el.textContent
    }
  }
}

it('opens one plate over the hidden wrapper, the menu below the input', async () => {
  const { root, q, menuHeight } = await setup({ defaultValue: ['apple'] })
  expect(menuHeight()).toBe(0)
  const closed = root.getBoundingClientRect()
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(q('.msl').className).toContain('msl-active')
  // the wrapper keeps its space
  expect(getComputedStyle(root).visibility).toBe('hidden')
  expect(root.getBoundingClientRect()).toEqual(closed)
  const box = plate()!.getBoundingClientRect()
  const input = q('.msl').getBoundingClientRect()
  const menu = q('.msl-options').getBoundingClientRect()
  expect([box.left, box.top, box.width]).toEqual([
    closed.left,
    closed.top,
    closed.width
  ])
  expect(input.bottom).toBe(closed.bottom)
  expect(menu.top).toBeGreaterThanOrEqual(input.bottom - 1)
  expect(box.bottom).toBe(menu.bottom + 1)
  // the values sit exactly where the hidden ones do
  expect(q('.msl-input-wrp').getBoundingClientRect()).toEqual(
    root.querySelector('.msl-input-wrp')!.getBoundingClientRect()
  )
  // one plate: its shadow and faded border, and a divider between input and menu
  const plateStyle = getComputedStyle(plate()!)
  expect(plateStyle.boxShadow).not.toBe('none')
  expect(plateStyle.borderTopColor).toBe('rgb(223, 224, 227)')
  const border = getComputedStyle(q('.msl'))
  expect(border.borderTopWidth).toBe('0px')
  expect(border.borderBottomWidth).toBe('1px')
  expect(border.borderBottomColor).toBe('rgba(3, 7, 18, 0.08)')
})

it('opens upward near the bottom of the viewport', async () => {
  const { root, q, menuHeight } = await setup(
    {},
    { offsetTop: window.innerHeight - 80 }
  )
  const closed = root.getBoundingClientRect()
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(q('.msl').className).toContain('msl-active-up')
  const input = q('.msl').getBoundingClientRect()
  const menu = q('.msl-options').getBoundingClientRect()
  // above the plate's bottom border
  expect(input.bottom).toBe(closed.bottom - 1)
  expect(menu.bottom).toBeLessThanOrEqual(input.top + 1)
  // no taller than the room above
  expect(menu.top).toBeGreaterThanOrEqual(0)
})

it('caps the menu at the room below, in a variable the options do not inherit', async () => {
  const many = Array.from({ length: 50 }, (_, i) => ({
    label: `Option ${i}`,
    value: `${i}`
  }))
  const { root, q, menuHeight } = await setup(
    { options: many },
    { offsetTop: document.documentElement.clientHeight - 300 }
  )
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(q('.msl').className).toContain('msl-active')
  const room =
    document.documentElement.clientHeight - root.getBoundingClientRect().bottom
  expect(room).toBeLessThan(400)
  expect(parseFloat(getComputedStyle(q('.msl-options')).maxHeight)).toBeCloseTo(
    room,
    2
  )
  // registered non-inherited: a scroll that changes it restyles the listbox, not every option
  expect(
    getComputedStyle(q('.msl-option')).getPropertyValue('--msl-menu-room')
  ).toBe('')
})

it('focuses the search input when opened', async () => {
  const { root, focused } = await setup()
  await userEvent.click(root)
  await expect.poll(focused).toBe('search')
})

it('typing filters options', async () => {
  const { input, visibleOptions } = await setup()
  await userEvent.type(input(), 'an')
  await expect.poll(visibleOptions).toEqual(['Banana'])
})

it.each(['{Enter}', ','])(
  '%s picks the first match and clears the search',
  async (key) => {
    const { input, chips, visibleOptions } = await setup()
    await userEvent.type(input(), 'ch')
    await expect.poll(visibleOptions).toEqual(['Cherry'])
    await userEvent.keyboard(key)
    await expect.poll(chips).toEqual(['Cherry'])
    expect(input().value).toBe('')
    expect(visibleOptions()).toEqual(['Apple', 'Banana', 'Cherry'])
  }
)

it('a typed custom value gets the typed text as its chip', async () => {
  const { input, chips, option } = await setup({ customValue: true })
  await userEvent.type(input(), 'kiwi')
  await userEvent.keyboard('{Enter}')
  await expect.poll(chips).toEqual(['kiwi'])
  expect(option('kiwi')).toBeDefined()
})

it('selects a focused option with Enter', async () => {
  const { root, option, chips } = await setup()
  await userEvent.click(root)
  option('Banana').focus()
  await userEvent.keyboard('{Enter}')
  await expect.poll(chips).toEqual(['Banana'])
})

it('closes on Escape and on outside click', async () => {
  const { root, outside, menuHeight } = await setup()
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  await userEvent.keyboard('{Escape}')
  await expect.poll(menuHeight).toBe(0)
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  await userEvent.click(outside)
  await expect.poll(menuHeight).toBe(0)
})

it('Tab closes the menu and moves on in page order, not from the end of the body', async () => {
  const { root, outside, after, menuHeight, focused } = await setup({
    defaultValue: ['apple']
  })
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  await userEvent.tab()
  expect(menuHeight()).toBe(0)
  expect(focused()).toBe('clear')
  await userEvent.tab()
  expect(document.activeElement).toBe(after)
  await userEvent.click(root)
  await userEvent.tab({ shift: true })
  expect(menuHeight()).toBe(0)
  expect(focused()).toBe('chip-delete')
  await userEvent.tab({ shift: true })
  await userEvent.tab({ shift: true })
  expect(document.activeElement).toBe(outside)
})

it('Tab reaches a button in the menu with the menu open, then moves on in page order', async () => {
  const onClick = vi.fn()
  const { root, after, menuHeight, focused } = await setup({
    options: [],
    emptyDataLabel: <button onClick={onClick}>Add</button>
  })
  await userEvent.click(root)
  await userEvent.tab()
  expect(menuHeight()).toBeGreaterThan(0)
  expect(focused()).toBe('Add')
  await userEvent.tab({ shift: true })
  expect(menuHeight()).toBeGreaterThan(0)
  expect(focused()).toBe('search')
  await userEvent.tab()
  await userEvent.keyboard('{Enter}')
  expect(onClick).toHaveBeenCalledOnce()
  plate()!.querySelector('button')!.focus()
  await userEvent.tab()
  expect(menuHeight()).toBe(0)
  expect(document.activeElement).toBe(after)
})

it('with a value, Tab reaches a button in the menu through the clear button, then moves on in page order', async () => {
  const { root, after, menuHeight, focused } = await setup({
    defaultValue: ['apple'],
    options: [{ title: <button>All</button>, type: 'group', childs: opts }]
  })
  await userEvent.click(root)
  await userEvent.tab()
  expect(menuHeight()).toBeGreaterThan(0)
  expect(focused()).toBe('clear')
  await userEvent.tab()
  expect(menuHeight()).toBeGreaterThan(0)
  expect(focused()).toBe('All')
  await userEvent.tab()
  expect(menuHeight()).toBe(0)
  expect(document.activeElement).toBe(after)
})

it('Tab from a clicked option moves on in page order, not from the end of the body', async () => {
  const { root, q, after, option, menuHeight, focused } = await setup({
    disableSearch: true,
    defaultValue: ['apple']
  })
  await userEvent.click(root)
  await userEvent.click(option('Banana'))
  expect(menuHeight()).toBeGreaterThan(0)
  await userEvent.tab()
  expect(menuHeight()).toBe(0)
  expect(document.activeElement).toBe(after)
  // the wrapper's middle is a chip now, which doesn't open it
  await userEvent.click(q('.msl-arrow-btn'))
  await userEvent.click(option('Cherry'))
  await userEvent.tab({ shift: true })
  expect(menuHeight()).toBe(0)
  expect(focused()).toBe('clear')
})

it('the key that opens the menu types into the plate', async () => {
  const { outside, input, menuHeight, visibleOptions } = await setup()
  outside.focus()
  await userEvent.tab()
  await userEvent.keyboard('ch')
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(input().closest('.msl-plate')).not.toBeNull()
  expect(input().value).toBe('ch')
  expect(visibleOptions()).toEqual(['Cherry'])
})

it('the plate keeps the text color and font of where the dropdown stands', async () => {
  document.body.style.color = 'rgb(200, 200, 200)'
  try {
    const screen = await render(
      <div style={{ color: 'rgb(30, 40, 50)', fontFamily: 'serif' }}>
        <MultiSelect options={opts} />
      </div>
    )
    await userEvent.click(screen.container.querySelector('.msl-wrp')!)
    const option = getComputedStyle(plate()!.querySelector('.msl-option')!)
    expect(option.color).toBe('rgb(30, 40, 50)')
    expect(option.fontFamily).toBe('serif')
  } finally {
    document.body.style.color = ''
  }
})

it('escapes a clipping parent', async () => {
  const screen = await render(
    <div style={{ height: 50, overflow: 'hidden' }}>
      <MultiSelect options={opts} />
    </div>
  )
  await userEvent.click(screen.container.querySelector('.msl-wrp')!)
  const cherry = [...plate()!.querySelectorAll('.msl-option')][2]
  const { left, top, width, height } = cherry.getBoundingClientRect()
  expect(top).toBeGreaterThan(50)
  expect(document.elementFromPoint(left + width / 2, top + height / 2)).toBe(
    cherry
  )
})

it('follows the wrapper as its parent scrolls, and closes once it scrolls out of view', async () => {
  const screen = await render(
    <div style={{ height: 200, overflow: 'auto' }}>
      <div style={{ height: 50 }} />
      <MultiSelect options={opts} />
      <div style={{ height: 1000 }} />
    </div>
  )
  const scroller = screen.container.firstChild as HTMLElement
  const root = scroller.querySelector<HTMLElement>('.msl-wrp')!
  await userEvent.click(root)
  scroller.scrollTop = 30
  await expect
    .poll(() => plate()!.getBoundingClientRect().top)
    .toBe(root.getBoundingClientRect().top)
  scroller.scrollTop = 300
  await expect.poll(plate).toBeNull()
})

it('moves with a page scroll at once, not a frame later', async () => {
  const screen = await render(
    <>
      <MultiSelect options={opts} />
      <div style={{ height: '200vh' }} />
    </>
  )
  const root = screen.container.querySelector<HTMLElement>('.msl-wrp')!
  try {
    await userEvent.click(root)
    window.scrollBy(0, 40)
    // no frame in between: absolute in <body>, the page carries it
    expect(plate()!.getBoundingClientRect().top).toBe(
      root.getBoundingClientRect().top
    )
  } finally {
    window.scrollTo(0, 0)
  }
})

it('a key on the dropdown scrolled out of view scrolls it back and opens', async () => {
  const screen = await render(
    <div style={{ height: 200, overflow: 'auto' }}>
      <div style={{ height: 50 }} />
      <MultiSelect options={opts} />
      <div style={{ height: 1000 }} />
    </div>
  )
  const scroller = screen.container.firstChild as HTMLElement
  scroller.scrollTop = 300
  // as a close by scrolling leaves it: focused, out of view
  scroller
    .querySelector<HTMLElement>('.msl-wrp')!
    .focus({ preventScroll: true })
  await userEvent.keyboard('{ArrowDown}')
  // past the IntersectionObserver's first report, which closes it while out of view
  for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame)
  expect(plate()).not.toBeNull()
  expect(scroller.scrollTop).toBeLessThan(300)
})

it('works in a modal dialog, which makes the page around it inert', async () => {
  const onChange = vi.fn()
  const screen = await render(
    <dialog>
      <MultiSelect options={opts} onChange={onChange} />
    </dialog>
  )
  const dialog = screen.container.querySelector('dialog')!
  dialog.showModal()
  try {
    await userEvent.click(dialog.querySelector('.msl-wrp')!)
    expect(plate()!.parentElement).toBe(dialog)
    await userEvent.click(plate()!.querySelector('.msl-option')!)
    expect(onChange).toHaveBeenCalledWith(['apple'], [opts[0]])
    // Escape closes the menu, not the dialog too; with the menu closed, it closes the dialog
    await userEvent.keyboard('{Escape}')
    expect(plate()).toBeNull()
    expect(dialog.open).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(dialog.open).toBe(false)
  } finally {
    dialog.close()
  }
})

it('works slotted into a component whose shadow root has the modal dialog', async () => {
  // as in <wa-dialog>: the dialog is in its shadow root, the dropdown in its light DOM
  const host = document.body.appendChild(document.createElement('div'))
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<dialog><slot></slot></dialog>'
  const dialog = shadow.querySelector('dialog')!
  dialog.showModal()
  try {
    const onChange = vi.fn()
    await render(<MultiSelect options={opts} onChange={onChange} />, {
      container: host
    })
    await userEvent.click(host.querySelector('.msl-wrp')!)
    await userEvent.click(plate()!.querySelector('.msl-option')!)
    expect(onChange).toHaveBeenCalledWith(['apple'], [opts[0]])
  } finally {
    dialog.close()
    host.remove()
  }
})

it('lines up over the dropdown in a transformed dialog, its containing block', async () => {
  const screen = await render(
    <dialog style={{ transform: 'translateX(0)', paddingBottom: 300 }}>
      <MultiSelect options={opts} />
    </dialog>
  )
  const dialog = screen.container.querySelector('dialog')!
  dialog.showModal()
  try {
    const root = dialog.querySelector<HTMLElement>('.msl-wrp')!
    await userEvent.click(root)
    // right away, not a frame later
    expect(plate()!.getBoundingClientRect().left).toBeCloseTo(
      root.getBoundingClientRect().left
    )
    expect(plate()!.getBoundingClientRect().top).toBeCloseTo(
      root.getBoundingClientRect().top
    )
  } finally {
    dialog.close()
  }
})

it.each([
  ['a scaled part of the page', false],
  ['a scaled dialog, its containing block', true]
])('lines up over the dropdown, scaled as it is, in %s', async (_, modal) => {
  const Tag = modal ? 'dialog' : 'div'
  const screen = await render(
    <Tag
      style={{
        transform: 'scale(0.5)',
        transformOrigin: '0 0',
        paddingBottom: 300
      }}
    >
      <MultiSelect options={opts} />
    </Tag>
  )
  const box = screen.container.firstElementChild as HTMLDialogElement
  modal && box.showModal()
  try {
    const root = box.querySelector<HTMLElement>('.msl-wrp')!
    const closed = root.querySelector('.msl')!.getBoundingClientRect()
    await userEvent.click(root)
    const r = root.getBoundingClientRect()
    const p = plate()!.getBoundingClientRect()
    expect([p.left, p.top, p.width].map(Math.round)).toEqual(
      [r.left, r.top, r.width].map(Math.round)
    )
    // its control drawn as tall as the hidden one, less the top border the open one lacks
    expect(
      plate()!.querySelector('.msl')!.getBoundingClientRect().height
    ).toBeCloseTo(closed.height - 0.5, 0)
  } finally {
    modal && box.close()
  }
})

it('stacks over a z-indexed overlay it sits in', async () => {
  const screen = await render(
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
      <MultiSelect options={opts} />
    </div>
  )
  await userEvent.click(screen.container.querySelector('.msl-wrp')!)
  const option = plate()!.querySelector('.msl-option')!
  const { left, top, width, height } = option.getBoundingClientRect()
  // the option, not the overlay, is what a pointer there hits
  expect(document.elementFromPoint(left + width / 2, top + height / 2)).toBe(
    option
  )
})

it("a transform on the plate shows: it doesn't count as the containing block's offset", async () => {
  const css = document.head.appendChild(document.createElement('style'))
  css.textContent = '.shifted { translate: 0 10px }'
  try {
    const { root } = await setup({ classNames: { plate: 'shifted' } })
    await userEvent.click(root)
    await new Promise(requestAnimationFrame)
    expect(plate()!.getBoundingClientRect().top).toBeCloseTo(
      root.getBoundingClientRect().top + 10
    )
  } finally {
    css.remove()
  }
})

it('works in a popover, which the top layer paints over <body>', async () => {
  const onChange = vi.fn()
  const screen = await render(
    // spread: @types/react 18 has no popover attribute
    <div {...{ popover: 'manual' }}>
      <MultiSelect options={opts} onChange={onChange} />
    </div>
  )
  const popover = screen.container.querySelector<HTMLElement>('[popover]')!
  popover.showPopover()
  try {
    await userEvent.click(popover.querySelector('.msl-wrp')!)
    expect(plate()!.parentElement).toBe(popover)
    const { left, top, width, height } = plate()!
      .querySelector('.msl-option')!
      .getBoundingClientRect()
    // the option, not the popover, is what a pointer there hits
    expect(document.elementFromPoint(left + width / 2, top + height / 2)).toBe(
      plate()!.querySelector('.msl-option')
    )
    await userEvent.click(plate()!.querySelector('.msl-option')!)
    expect(onChange).toHaveBeenCalledWith(['apple'], [opts[0]])
  } finally {
    popover.hidePopover()
  }
})

it('takes clicks when a modal library turns off pointer events on <body>', async () => {
  const onChange = vi.fn()
  document.body.style.pointerEvents = 'none'
  try {
    // like Radix: only its own layer takes pointer events
    const screen = await render(
      <div style={{ pointerEvents: 'auto' }}>
        <MultiSelect options={opts} onChange={onChange} />
      </div>
    )
    await userEvent.click(screen.container.querySelector('.msl-wrp')!)
    await userEvent.click(plate()!.querySelector('.msl-option')!)
    expect(onChange).toHaveBeenCalledWith(['apple'], [opts[0]])
  } finally {
    document.body.style.pointerEvents = ''
  }
})

it('keeps the right-to-left direction of the section it stands in', async () => {
  const screen = await render(
    <div dir='rtl' lang='ar'>
      <MultiSelect options={opts} />
    </div>
  )
  await userEvent.click(screen.container.querySelector('.msl-wrp')!)
  expect(plate()!.dir).toBe('rtl')
  expect(plate()!.lang).toBe('ar')
  // the buttons sit at the inline end: the left in right-to-left
  expect(
    plate()!.querySelector('.msl-actions')!.getBoundingClientRect().right
  ).toBeLessThanOrEqual(
    plate()!.querySelector('.msl-input-wrp')!.getBoundingClientRect().left
  )
})

it('Enter in the search does not submit a surrounding form', async () => {
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
  const screen = await render(
    <form onSubmit={onSubmit}>
      <MultiSelect options={opts} />
    </form>
  )
  await userEvent.click(screen.container.querySelector('.msl-wrp')!)
  await userEvent.keyboard('{Enter}zzz{Enter}')
  expect(onSubmit).not.toHaveBeenCalled()
})

it('the search field fits its text, and long text scrolls clear of the buttons', async () => {
  const { q, input } = await setup()
  const box = () => input().getBoundingClientRect()
  const placeholderWidth = box().width
  await userEvent.type(input(), 'ba')
  expect(box().width).toBeLessThan(placeholderWidth)
  await userEvent.type(input(), 'nana'.repeat(20))
  expect(box().height).toBeLessThan(30)
  expect(box().right).toBeLessThanOrEqual(
    q('.msl-actions').getBoundingClientRect().left
  )
})

it('the input area ends where the buttons start, whatever size CSS gives them', async () => {
  const css = document.head.appendChild(document.createElement('style'))
  css.textContent = '.msl-clear-btn, .msl-arrow-btn { width: 40px }'
  try {
    const { q } = await setup({ defaultValue: ['apple'] })
    expect(q('.msl-clear-btn').getBoundingClientRect().width).toBe(40)
    expect(q('.msl-input-wrp').getBoundingClientRect().right).toBe(
      q('.msl-actions').getBoundingClientRect().left
    )
  } finally {
    css.remove()
  }
})

it('indents group options a step per level, titles at their group level', async () => {
  const { root } = await setup({
    options: [
      { label: 'Any', value: 'any' },
      {
        type: 'group',
        title: 'Europe',
        childs: [
          { label: 'Berlin', value: 'berlin' },
          {
            type: 'group',
            title: 'Nordics',
            childs: [{ label: 'Oslo', value: 'oslo' }]
          }
        ]
      }
    ]
  })
  await userEvent.click(root)
  const left = (text: string) =>
    [...plate()!.querySelectorAll('.msl-option, .msl-grp-title')]
      .find((el) => el.textContent === text)!
      .getBoundingClientRect().left
  const at = left('Any')
  expect(
    ['Europe', 'Berlin', 'Nordics', 'Oslo'].map((t) => left(t) - at)
  ).toEqual([0, 12, 12, 24])
})

it('the arrow flips while the menu is open', async () => {
  const { root, q, menuHeight } = await setup()
  const rotate = () => getComputedStyle(q('.msl-arrow-btn')).rotate
  expect(rotate()).toBe('none')
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(rotate()).toBe('180deg')
})

it('a rich paste lands as plain text and filters', async () => {
  const { root, q, input, visibleOptions } = await setup()
  const rich = document.body.appendChild(document.createElement('p'))
  rich.innerHTML = '<b style="font-size: 40px">Ban</b>'
  try {
    getSelection()!.selectAllChildren(rich)
    await userEvent.copy()
    await userEvent.click(root)
    await userEvent.paste()
    expect(input().value).toBe('Ban')
    expect(visibleOptions()).toEqual(['Banana'])
    expect(q('.msl-options').textContent).toBe('Banana')
  } finally {
    rich.remove()
  }
})

it('Tab skips the arrow and the options', async () => {
  const { root, outside, menuHeight, focused } = await setup({
    defaultValue: ['apple']
  })
  outside.focus()
  const order = []
  for (let i = 0; i < 5; i++) {
    await userEvent.tab()
    order.push(root.contains(document.activeElement) ? focused() : 'out')
  }
  expect(order).toEqual(['wrapper', 'chip-delete', 'search', 'clear', 'out'])
  expect(menuHeight()).toBe(0)
})

it('chip delete acts on Enter and Space only', async () => {
  const { q, chips } = await setup({
    defaultValue: ['apple', 'banana', 'cherry']
  })
  q('.msl-chip-delete').focus()
  await userEvent.keyboard('x')
  expect(chips()).toEqual(['Apple', 'Banana', 'Cherry'])
  await userEvent.keyboard('{Enter}')
  await expect.poll(chips).toEqual(['Banana', 'Cherry'])
  q('.msl-chip-delete').focus()
  await userEvent.keyboard(' ')
  await expect.poll(chips).toEqual(['Cherry'])
})

const buttonChip: MultiSelectProps['customChip'] = ({ label, onDelete }) => (
  <button type='button' className='my-chip' onClick={onDelete}>
    {label}
  </button>
)

it('a custom chip button deletes by Enter, keeping keyboard focus in the widget', async () => {
  const { q, outside, menuHeight, focused } = await setup({
    defaultValue: ['apple', 'banana'],
    customChip: buttonChip
  })
  outside.focus()
  await userEvent.tab()
  await userEvent.tab()
  await userEvent.keyboard('{Enter}')
  // index keys: the focused button now deletes Banana
  await expect.poll(() => q('.my-chip').textContent).toBe('Banana')
  await userEvent.keyboard('{Enter}')
  await expect.poll(focused).toBe('search')
  expect(q('.my-chip')).toBeNull()
  expect(menuHeight()).toBe(0)
})

it('a keyboard delete that unmounts the focused chip keeps focus in the widget', async () => {
  const { q, outside, focused } = await setup({
    defaultValue: ['apple', 'banana'],
    // keyed by value: deleting Apple remounts the chip after it
    customChip: ({ label, value, onDelete }) => (
      <button key={value} type='button' className='my-chip' onClick={onDelete}>
        {label}
      </button>
    )
  })
  outside.focus()
  await userEvent.tab()
  await userEvent.tab()
  await userEvent.keyboard('{Enter}')
  await expect.poll(() => q('.my-chip').textContent).toBe('Banana')
  await expect.poll(focused).toBe('search')
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

it('a keyboard delete inside a chip shadow root keeps focus in the widget', async () => {
  const { q, outside, focused } = await setup({
    defaultValue: ['apple'],
    customChip: shadowChip
  })
  outside.focus()
  await userEvent.tab()
  await userEvent.tab()
  // the host has focus, but only the button inside matches :focus-visible
  expect(q('.my-chip').shadowRoot!.activeElement!.tagName).toBe('BUTTON')
  await userEvent.keyboard('{Enter}')
  await expect.poll(() => q('.my-chip')).toBeNull()
  await expect.poll(focused).toBe('search')
})

it('a custom chip deleted by mouse leaves focus alone', async () => {
  const { q, menuHeight, focused } = await setup({
    defaultValue: ['apple'],
    customChip: buttonChip
  })
  await userEvent.click(q('.my-chip'))
  await expect.poll(() => q('.my-chip')).toBeNull()
  // focusing the search would pop up a phone's keyboard
  expect(focused()).not.toBe('search')
  expect(menuHeight()).toBe(0)
})

it('deleting the last chip by keyboard keeps focus in a shadow root', async () => {
  const host = document.body.appendChild(document.createElement('div'))
  const shadow = host.attachShadow({ mode: 'open' })
  const container = shadow.appendChild(document.createElement('div'))
  try {
    await render(<MultiSelect options={opts} defaultValue={['apple']} />, {
      container
    })
    container.querySelector<HTMLElement>('.msl-wrp')!.focus()
    await userEvent.tab()
    expect(shadow.activeElement!.className).toContain('msl-chip-delete')
    // document.activeElement is the host here, which never matches :focus-visible
    await userEvent.keyboard('{Enter}')
    await expect
      .poll(() => shadow.activeElement?.className)
      .toContain('msl-input')
  } finally {
    host.remove()
  }
})

it('disabled blocks the mouse, leaves the tab order and ignores the keyboard', async () => {
  const { root, outside, menuHeight, chips } = await setup({
    disabled: true,
    defaultValue: ['apple']
  })
  expect(getComputedStyle(root).pointerEvents).toBe('none')
  outside.focus()
  await userEvent.tab()
  expect(root.contains(document.activeElement)).toBe(false)
  root.focus()
  await userEvent.keyboard('{Enter}{ArrowDown} a{Backspace}')
  expect(menuHeight()).toBe(0)
  expect(chips()).toEqual(['Apple'])
})

it('singleSelect closes after picking, even when uncontrolled', async () => {
  const { root, option, q, menuHeight } = await setup({ singleSelect: true })
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  await userEvent.click(option('Apple'))
  await expect.poll(() => q('.msl-single-value')?.textContent).toBe('Apple')
  await expect.poll(menuHeight).toBe(0)
})

it('multi select stays open after picking unless closeOnSelect', async () => {
  const { root, option, chips, menuHeight } = await setup()
  await userEvent.click(root)
  await userEvent.click(option('Apple'))
  await expect.poll(chips).toEqual(['Apple'])
  expect(menuHeight()).toBeGreaterThan(0)
})

it('closeOnSelect closes multi select after picking', async () => {
  const { root, option, chips, menuHeight } = await setup({
    closeOnSelect: true
  })
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  await userEvent.click(option('Apple'))
  await expect.poll(chips).toEqual(['Apple'])
  await expect.poll(menuHeight).toBe(0)
})

const withDisabled = [
  { label: 'Off A', value: 'offa', disabled: true },
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana', disabled: true },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Off C', value: 'offc', disabled: true }
]
const highlighted = () => document.querySelector('.msl-option-focused')

it('arrows move the highlight over enabled options and Enter picks it', async () => {
  const { outside, input, option, chips, menuHeight, focused } = await setup({
    options: withDisabled
  })
  outside.focus()
  await userEvent.tab()
  await userEvent.keyboard('{ArrowDown}')
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(focused()).toBe('search')
  expect(highlighted()?.textContent).toBe('Apple')
  await userEvent.keyboard('{ArrowDown}')
  expect(highlighted()?.textContent).toBe('Cherry')
  await userEvent.keyboard('{ArrowDown}')
  expect(highlighted()?.textContent).toBe('Cherry')
  expect(input().getAttribute('aria-activedescendant')).toBe(
    option('Cherry').id
  )
  await userEvent.keyboard('{Enter}')
  await expect.poll(chips).toEqual(['Cherry'])
  expect(focused()).toBe('search')
  expect(input().value).toBe('')
  expect(menuHeight()).toBeGreaterThan(0)
})

it('Home and End jump to the first and last enabled option', async () => {
  const { input } = await setup({ options: withDisabled })
  input().focus()
  await userEvent.keyboard('{End}')
  expect(highlighted()?.textContent).toBe('Cherry')
  await userEvent.keyboard('{Home}')
  expect(highlighted()?.textContent).toBe('Apple')
})

it('picks a highlighted search result with Enter', async () => {
  const { input, chips, visibleOptions } = await setup()
  await userEvent.type(input(), 'an')
  await expect.poll(visibleOptions).toEqual(['Banana'])
  await userEvent.keyboard('{ArrowDown}{Enter}')
  await expect.poll(chips).toEqual(['Banana'])
  expect(input().value).toBe('')
  expect(highlighted()?.textContent).toBe('Banana')
})

it('Backspace in an empty search field removes the last chip', async () => {
  const { input, chips } = await setup({ defaultValue: ['apple', 'banana'] })
  await userEvent.type(input(), 'c')
  await userEvent.keyboard('{Backspace}')
  expect(input().value).toBe('')
  expect(chips()).toEqual(['Apple', 'Banana'])
  await userEvent.keyboard('{Backspace}')
  await expect.poll(chips).toEqual(['Apple'])
  await userEvent.keyboard('{Backspace}')
  await expect.poll(chips).toEqual([])
})

it('singleSelect: Enter picks, closes, and focus stays on the widget', async () => {
  const { root, input, q, menuHeight, focused } = await setup({
    singleSelect: true
  })
  input().focus()
  await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
  await expect.poll(() => q('.msl-single-value')?.textContent).toBe('Banana')
  await expect.poll(menuHeight).toBe(0)
  expect(focused()).toBe('wrapper')
  expect(root.getAttribute('role')).toBe('combobox')
  await userEvent.keyboard('{ArrowDown}')
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(root.getAttribute('aria-activedescendant')).toBe(highlighted()!.id)
})

it('keeps the highlighted option scrolled into view', async () => {
  const options = Array.from({ length: 40 }, (_, i) => ({
    label: `Item ${i}`,
    value: `${i}`
  }))
  const { input, q } = await setup({ options })
  input().focus()
  await userEvent.keyboard('{End}')
  const menu = q('.msl-options')
  await expect.poll(() => menu.scrollTop).toBeGreaterThan(0)
  const box = menu.getBoundingClientRect()
  const item = highlighted()!.getBoundingClientRect()
  expect(item.bottom).toBeLessThanOrEqual(box.bottom + 1)
  expect(item.top).toBeGreaterThanOrEqual(box.top - 1)
})
