// Real-browser characterization tests: layout, CSS, focus and typing that jsdom fakes.
// Like test/MultiSelect.test.tsx, "current behavior: ..." pins known quirks.
import { useVirtualizer } from '@tanstack/react-virtual'
import { Suspense, useEffect, useRef, useState } from 'react'
import { List, useListCallbackRef } from 'react-window'
import type { RowComponentProps } from 'react-window'
import { describe, expect, it, vi } from 'vitest'
import { server, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type {
  MultiSelectListProps,
  MultiSelectLoadRequest,
  MultiSelectMenuProps,
  MultiSelectOption,
  MultiSelectProps
} from '../../src/index'
import MultiSelect from '../../src/MultiSelect'
// as users do: the JS never imports it
import '../../src/styles.css'

const opts = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' }
]

// the open menu: the control with the options, in the top layer
const box = () => document.querySelector<HTMLElement>('.msl[data-open]')

async function setup(props: MultiSelectProps = {}, { offsetTop = 0 } = {}) {
  const screen = await render(
    <div style={{ paddingTop: offsetTop }}>
      <button>outside</button>
      <MultiSelect options={opts} {...props} />
      <button>after</button>
    </div>
  )
  const c = screen.container
  const q = (s: string) => c.querySelector<HTMLElement>(s)!
  const root = c.querySelector<HTMLElement>('.msl-wrp')!
  return {
    root,
    q,
    outside: c.querySelector('button')!,
    after: c.querySelectorAll('button')[1],
    input: () => q('input.msl-input:enabled') as HTMLInputElement,
    menuHeight: () =>
      box()?.querySelector('.msl-options')!.getBoundingClientRect().height ?? 0,
    chips: () =>
      [...c.querySelectorAll('.msl-chip')].map((el) => el.textContent),
    visibleOptions: () =>
      [...(box()?.querySelectorAll('.msl-option') ?? [])].map(
        (el) => el.textContent
      ),
    option: (text: string) =>
      [...box()!.querySelectorAll<HTMLElement>('.msl-option')].find(
        (el) => el.textContent === text
      )!,
    focused: () => {
      const el = document.activeElement!
      if (el === root) return 'wrapper'
      if (el.classList.contains('msl-input')) return 'search'
      if (el.classList.contains('msl-arrow-btn')) return 'arrow'
      if (el.classList.contains('msl-clear-btn')) return 'clear'
      if (el.classList.contains('msl-chip-delete')) return 'chip-delete'
      return el.textContent
    }
  }
}

it('opens the box over the wrapper in the top layer, the menu below the input', async () => {
  const { root, q, menuHeight } = await setup({ defaultValue: ['apple'] })
  expect(menuHeight()).toBe(0)
  const closed = root.getBoundingClientRect()
  const values = q('.msl-input-wrp').getBoundingClientRect()
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(q('.msl').className).toContain('msl-active')
  expect(box()!.parentElement!.matches(':popover-open')).toBe(true)
  // the wrapper keeps its space
  expect(root.getBoundingClientRect()).toEqual(closed)
  const open = box()!.getBoundingClientRect()
  const menu = q('.msl-options').getBoundingClientRect()
  expect([open.left, open.top, open.width]).toEqual([
    closed.left,
    closed.top,
    closed.width
  ])
  // the values stay exactly where they were
  expect(q('.msl-input-wrp').getBoundingClientRect()).toEqual(values)
  expect(menu.top).toBeGreaterThanOrEqual(closed.bottom - 1)
  expect(open.bottom).toBe(menu.bottom + 1)
  // one box: its shadow and faded border, and a divider between input and menu
  const style = getComputedStyle(box()!)
  expect(style.boxShadow).not.toBe('none')
  expect(style.borderTopColor).toBe('rgb(223, 224, 227)')
  expect(style.borderTopWidth).toBe('1px')
  const divider = getComputedStyle(q('.msl-options'))
  expect(divider.borderTopWidth).toBe('1px')
  expect(divider.borderTopColor).toBe('rgba(3, 7, 18, 0.08)')
  expect(divider.borderBottomWidth).toBe('0px')
})

it('opens upward near the bottom of the viewport', async () => {
  const { root, q, menuHeight } = await setup(
    {},
    { offsetTop: window.innerHeight - 80 }
  )
  const closed = root.getBoundingClientRect()
  const values = q('.msl-input-wrp').getBoundingClientRect()
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(q('.msl').className).toContain('msl-active-up')
  // the values stay put, the box grows upward from the wrapper's bottom
  expect(q('.msl-input-wrp').getBoundingClientRect()).toEqual(values)
  // within float noise: Firefox's rects are single precision
  expect(box()!.getBoundingClientRect().bottom).toBeCloseTo(closed.bottom)
  const menu = q('.msl-options').getBoundingClientRect()
  expect(menu.bottom).toBeLessThanOrEqual(values.top + 0.001)
  expect(getComputedStyle(q('.msl-options')).borderBottomWidth).toBe('1px')
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
  // registered non-inherited, options keep the initial value: a scroll that changes it restyles the listbox, not every option
  expect(
    getComputedStyle(q('.msl-option')).getPropertyValue('--msl-menu-room')
  ).toBe('100vh')
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
  box()!.querySelector('button')!.focus()
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
  // focus stayed inside: it closes once the browser has moved it
  await expect.poll(menuHeight).toBe(0)
  expect(focused()).toBe('clear')
})

it('Escape from a clicked option closes and leaves focus in the search field', async () => {
  const { root, option, menuHeight, focused } = await setup()
  await userEvent.click(root)
  await userEvent.click(option('Banana'))
  // the click left focus on the option
  option('Cherry').focus()
  await userEvent.keyboard('{Escape}')
  expect(menuHeight()).toBe(0)
  expect(focused()).toBe('search')
})

// Playwright's Firefox runs no microtasks between a key's keydown and its typing, so React's commit comes too late
it.skipIf(server.browser === 'firefox')(
  'the key on the wrapper that opens the menu types into the search field',
  async () => {
    const { outside, input, menuHeight, visibleOptions, focused } =
      await setup()
    const field = input()
    outside.focus()
    await userEvent.tab()
    expect(focused()).toBe('wrapper')
    await userEvent.keyboard('ch')
    await expect.poll(menuHeight).toBeGreaterThan(0)
    // the same field, open or closed
    expect(input()).toBe(field)
    expect(input().value).toBe('ch')
    expect(visibleOptions()).toEqual(['Cherry'])
  }
)

it('the open menu keeps the text color and font of where the dropdown stands, and CSS through its ancestors', async () => {
  document.body.style.color = 'rgb(200, 200, 200)'
  const css = document.head.appendChild(document.createElement('style'))
  css.textContent =
    '.themed .msl-vars { --msl-active-menu-background: rgb(1, 2, 3) } .themed .msl-grp-title { color: rgb(4, 5, 6) }'
  try {
    const screen = await render(
      <div
        className='themed'
        style={{ color: 'rgb(30, 40, 50)', fontFamily: 'serif' }}
      >
        <MultiSelect
          options={[{ type: 'group', title: 'All', childs: opts }]}
        />
      </div>
    )
    await userEvent.click(screen.container.querySelector('.msl-wrp')!)
    const option = getComputedStyle(box()!.querySelector('.msl-option')!)
    expect(option.color).toBe('rgb(30, 40, 50)')
    expect(option.fontFamily).toBe('serif')
    expect(getComputedStyle(box()!).backgroundColor).toBe('rgb(1, 2, 3)')
    expect(
      getComputedStyle(box()!.querySelector('.msl-grp-title')!).color
    ).toBe('rgb(4, 5, 6)')
  } finally {
    document.body.style.color = ''
    css.remove()
  }
})

it('escapes a clipping parent', async () => {
  const screen = await render(
    <div style={{ height: 50, overflow: 'hidden' }}>
      <MultiSelect options={opts} />
    </div>
  )
  await userEvent.click(screen.container.querySelector('.msl-wrp')!)
  const cherry = [...box()!.querySelectorAll('.msl-option')][2]
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
    .poll(() => box()!.getBoundingClientRect().top)
    .toBe(root.getBoundingClientRect().top)
  scroller.scrollTop = 300
  await expect.poll(box).toBeNull()
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
    // no frame in between: absolute in page coordinates, the page carries it
    expect(box()!.getBoundingClientRect().top).toBe(
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
  expect(box()).not.toBeNull()
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
    // past the dialog's bottom: on top, not clipped by it
    const cherry = [...box()!.querySelectorAll('.msl-option')][2]
    const { left, top, width, height } = cherry.getBoundingClientRect()
    expect(top).toBeGreaterThan(dialog.getBoundingClientRect().bottom)
    expect(document.elementFromPoint(left + width / 2, top + height / 2)).toBe(
      cherry
    )
    await userEvent.click(box()!.querySelector('.msl-option')!)
    expect(onChange).toHaveBeenCalledWith(['apple'], [opts[0]])
    // Escape closes the menu, not the dialog too; with the menu closed, it closes the dialog
    await userEvent.keyboard('{Escape}')
    expect(box()).toBeNull()
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
    await userEvent.click(box()!.querySelector('.msl-option')!)
    expect(onChange).toHaveBeenCalledWith(['apple'], [opts[0]])
  } finally {
    dialog.close()
    host.remove()
  }
})

it('lines up over the dropdown in a transformed dialog', async () => {
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
    expect(box()!.getBoundingClientRect().left).toBeCloseTo(
      root.getBoundingClientRect().left
    )
    expect(box()!.getBoundingClientRect().top).toBeCloseTo(
      root.getBoundingClientRect().top
    )
  } finally {
    dialog.close()
  }
})

it.each([
  ['a scaled part of the page', false],
  ['a scaled dialog', true]
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
  const parent = screen.container.firstElementChild as HTMLDialogElement
  modal && parent.showModal()
  try {
    const root = parent.querySelector<HTMLElement>('.msl-wrp')!
    const values = root.querySelector('.msl-input-wrp')!.getBoundingClientRect()
    await userEvent.click(root)
    const r = root.getBoundingClientRect()
    const p = box()!.getBoundingClientRect()
    expect([p.left, p.top, p.width].map(Math.round)).toEqual(
      [r.left, r.top, r.width].map(Math.round)
    )
    // the values drawn where and as large as they were: the top layer drops the ancestor's scale, the box scales itself
    const open = root.querySelector('.msl-input-wrp')!.getBoundingClientRect()
    for (const k of ['left', 'top', 'width', 'height'] as const)
      expect(open[k]).toBeCloseTo(values[k], 0)
  } finally {
    modal && parent.close()
  }
})

it('stacks over a z-indexed overlay it sits in', async () => {
  const screen = await render(
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
      <MultiSelect options={opts} />
    </div>
  )
  await userEvent.click(screen.container.querySelector('.msl-wrp')!)
  const option = box()!.querySelector('.msl-option')!
  const { left, top, width, height } = option.getBoundingClientRect()
  // the option, not the overlay, is what a pointer there hits
  expect(document.elementFromPoint(left + width / 2, top + height / 2)).toBe(
    option
  )
})

it('stacks over a higher z-indexed overlay from inside a transformed stacking context', async () => {
  const screen = await render(
    <>
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          transform: 'translateX(20px)'
        }}
      >
        <MultiSelect options={opts} />
      </div>
      {/* over where the menu opens, not over the dropdown */}
      <div
        style={{
          position: 'fixed',
          inset: '50px 0 0',
          zIndex: 2147483647,
          background: 'gray'
        }}
      />
    </>
  )
  const root = screen.container.querySelector<HTMLElement>('.msl-wrp')!
  await userEvent.click(root)
  const option = box()!.querySelector('.msl-option:last-child')!
  const { left, top, width, height } = option.getBoundingClientRect()
  expect(top).toBeGreaterThan(50)
  expect(document.elementFromPoint(left + width / 2, top + height / 2)).toBe(
    option
  )
  // over the dropdown, which the transform moved
  expect(box()!.getBoundingClientRect().left).toBeCloseTo(
    root.getBoundingClientRect().left
  )
})

it('hides while a Suspense boundary shows its fallback, and works after', async () => {
  let wait = false
  let resolve!: () => void
  const pending = new Promise<void>((r) => (resolve = r))
  const Gate = () => {
    if (wait) throw pending
    return null
  }
  const onMenuClose = vi.fn()
  const tree = () => (
    <Suspense fallback={<p>loading</p>}>
      <MultiSelect options={opts} onMenuClose={onMenuClose} />
      <Gate />
    </Suspense>
  )
  const screen = await render(tree())
  const root = screen.container.querySelector<HTMLElement>('.msl-wrp')!
  await userEvent.click(root)
  expect(box()!.getBoundingClientRect().height).toBeGreaterThan(0)
  // frames after the open, as any real suspend is: WebKit may deliver the IntersectionObserver's first report
  // after the hide, and a first report of out of view scrolls the dropdown back rather than closing it
  for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame)
  wait = true
  await screen.rerender(tree())
  await expect.poll(() => screen.container.textContent).toContain('loading')
  // nothing of it over the fallback
  expect(box()!.getBoundingClientRect().height).toBe(0)
  // and the observer sees it gone: it closes, which React shows with the dropdown
  await expect.poll(() => onMenuClose.mock.calls.length).toBe(1)
  wait = false
  resolve()
  await expect.poll(box).toBeNull()
  await userEvent.click(root)
  await expect
    .poll(() => box()?.getBoundingClientRect().height ?? 0)
    .toBeGreaterThan(0)
})

it('a pick in a light-dismiss popover leaves that popover open', async () => {
  const screen = await render(
    // spread: @types/react 18 has no popover attribute
    <div {...{ popover: 'auto' }}>
      <MultiSelect options={opts} />
    </div>
  )
  const popover = screen.container.querySelector<HTMLElement>('[popover]')!
  popover.showPopover()
  try {
    await userEvent.click(popover.querySelector('.msl-wrp')!)
    // the option sits past the popover's own box
    await userEvent.click(box()!.querySelector('.msl-option')!)
    expect(popover.matches(':popover-open')).toBe(true)
    expect(box()).not.toBeNull()
  } finally {
    popover.matches(':popover-open') && popover.hidePopover()
  }
})

it('a transform on the open box shows, as for an open animation', async () => {
  const css = document.head.appendChild(document.createElement('style'))
  css.textContent = '.shifted[data-open] { translate: 0 10px }'
  try {
    const { root } = await setup({ classNames: { control: 'shifted' } })
    await userEvent.click(root)
    await new Promise(requestAnimationFrame)
    expect(box()!.getBoundingClientRect().top).toBeCloseTo(
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
    const { left, top, width, height } = box()!
      .querySelector('.msl-option')!
      .getBoundingClientRect()
    // the option, not the popover, is what a pointer there hits
    expect(document.elementFromPoint(left + width / 2, top + height / 2)).toBe(
      box()!.querySelector('.msl-option')
    )
    await userEvent.click(box()!.querySelector('.msl-option')!)
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
    await userEvent.click(box()!.querySelector('.msl-option')!)
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
  expect(getComputedStyle(box()!).direction).toBe('rtl')
  expect(box()!.matches(':lang(ar)')).toBe(true)
  // the buttons sit at the inline end: the left in right-to-left
  expect(
    box()!.querySelector('.msl-actions')!.getBoundingClientRect().right
  ).toBeLessThanOrEqual(
    box()!.querySelector('.msl-input-wrp')!.getBoundingClientRect().left
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

it.each([
  ['in the tree', {}],
  ['as renderList rows', { renderList: (l) => <WindowList {...l} /> }]
] as [string, MultiSelectProps][])(
  'indents group options a step per level, titles at their group level, %s',
  async (_, props) => {
    const { root } = await setup({
      ...props,
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
    const rows = () => [
      ...box()!.querySelectorAll('.msl-option, .msl-grp-title')
    ]
    // a virtual list fills its window once it has measured it
    await expect.poll(() => rows().length).toBe(5)
    const left = (text: string) =>
      rows()
        .find((el) => el.textContent === text)!
        .getBoundingClientRect().left
    const at = left('Any')
    expect(
      ['Europe', 'Berlin', 'Nordics', 'Oslo'].map((t) => left(t) - at)
    ).toEqual([0, 12, 12, 24])
  }
)

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
  // Playwright's WebKit goes back in history on Backspace outside a text field, ending the test page.
  // On window: after the component's own handler
  const noBack = (e: KeyboardEvent) =>
    e.key === 'Backspace' && e.preventDefault()
  addEventListener('keydown', noBack)
  try {
    await userEvent.keyboard('{Enter}{ArrowDown} a{Backspace}')
  } finally {
    removeEventListener('keydown', noBack)
  }
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

it('searchInMenu: the field heads the open menu, the control and the wrapper keep their size', async () => {
  const { root, q, after, menuHeight, focused, visibleOptions } = await setup({
    searchInMenu: true,
    defaultValue: ['apple']
  })
  expect(q('input.msl-input')).toBeNull()
  const closed = root.getBoundingClientRect()
  const values = q('.msl-input-wrp').getBoundingClientRect()
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  await expect.poll(focused).toBe('search')
  expect(root.getBoundingClientRect()).toEqual(closed)
  expect(q('.msl-input-wrp').getBoundingClientRect()).toEqual(values)
  // control, divider, field, divider, options
  const search = q('.msl-search')
  expect(search.getBoundingClientRect().top).toBeCloseTo(values.bottom)
  expect(q('.msl-options').getBoundingClientRect().top).toBeCloseTo(
    search.getBoundingClientRect().bottom
  )
  expect(getComputedStyle(search).borderTopWidth).toBe('1px')
  expect(getComputedStyle(search).borderBottomWidth).toBe('0px')
  await userEvent.keyboard('an')
  expect(visibleOptions()).toEqual(['Banana'])
  await userEvent.tab()
  expect(menuHeight()).toBe(0)
  expect(document.activeElement).toBe(after)
  // Shift+Tab lands back on the field, which the close removes: focus goes to the wrapper, not the body
  await userEvent.click(root)
  await expect.poll(focused).toBe('search')
  await userEvent.tab({ shift: true })
  await expect.poll(menuHeight).toBe(0)
  expect(focused()).toBe('wrapper')
})

it('searchInMenu opening upward: the field heads the box, the values stay put', async () => {
  const { root, q, menuHeight } = await setup(
    { searchInMenu: true },
    { offsetTop: window.innerHeight - 80 }
  )
  const closed = root.getBoundingClientRect()
  const values = q('.msl-input-wrp').getBoundingClientRect()
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(q('.msl').className).toContain('msl-active-up')
  expect(q('.msl-input-wrp').getBoundingClientRect()).toEqual(values)
  expect(box()!.getBoundingClientRect().bottom).toBeCloseTo(closed.bottom)
  const search = q('.msl-search')
  expect(search.getBoundingClientRect().bottom).toBeCloseTo(
    q('.msl-options').getBoundingClientRect().top
  )
  expect(getComputedStyle(search).borderTopWidth).toBe('0px')
  expect(getComputedStyle(search).borderBottomWidth).toBe('1px')
})

it('searchInMenu: the options leave the field room in the viewport', async () => {
  const many = Array.from({ length: 50 }, (_, i) => ({
    label: `Option ${i}`,
    value: `${i}`
  }))
  const { root, q, menuHeight } = await setup(
    { options: many, searchInMenu: true },
    { offsetTop: document.documentElement.clientHeight - 300 }
  )
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(box()!.className).toContain('msl-active')
  const room =
    document.documentElement.clientHeight - root.getBoundingClientRect().bottom
  expect(parseFloat(getComputedStyle(q('.msl-options')).maxHeight)).toBeCloseTo(
    room - q('.msl-search').getBoundingClientRect().height,
    2
  )
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

const tree = [
  { label: 'Apple', value: 'apple' },
  {
    type: 'submenu',
    title: 'Veg',
    childs: [
      { label: 'Carrot', value: 'carrot' },
      {
        type: 'submenu',
        title: 'Greens',
        childs: [{ label: 'Kale', value: 'kale' }]
      }
    ]
  },
  { label: 'Banana', value: 'banana' }
]

const submenu = (title: string) =>
  [...document.querySelectorAll<HTMLElement>('.msl-submenu')].find(
    (el) =>
      document.getElementById(el.getAttribute('aria-labelledby')!)!
        .textContent === title
  )

// the test page is 414px wide: room for a 120px submenu on one side
const narrow = { width: 150 }

it('opens a submenu beside its title in the top layer, its first row level with the title', async () => {
  const { root, option } = await setup({ options: tree, style: narrow })
  await userEvent.click(root)
  await userEvent.click(option('Veg'))
  await userEvent.click(option('Greens'))
  for (const [title, first] of [
    ['Veg', 'Carrot'],
    ['Greens', 'Kale']
  ]) {
    const sub = submenu(title)!
    expect(sub.matches(':popover-open')).toBe(true)
    const t = option(title).getBoundingClientRect()
    expect(sub.getBoundingClientRect().left).toBeCloseTo(t.right, 0)
    expect(option(first).getBoundingClientRect().top).toBeCloseTo(t.top, 0)
  }
  // the deeper one paints over the one it opens from
  const kale = option('Kale').getBoundingClientRect()
  expect(document.elementFromPoint(kale.left + 2, kale.top + 2)).toBe(
    option('Kale')
  )
})

it('opens a submenu on the other side without room', async () => {
  const { root, option } = await setup({
    options: tree,
    style: { ...narrow, marginInlineStart: innerWidth - 170 }
  })
  await userEvent.click(root)
  await userEvent.click(option('Veg'))
  expect(submenu('Veg')!.getBoundingClientRect().right).toBeCloseTo(
    option('Veg').getBoundingClientRect().left,
    0
  )
})

it('opens a submenu with room on neither side over its title, on screen', async () => {
  const { root, option } = await setup({ options: tree })
  await userEvent.click(root)
  await userEvent.click(option('Veg'))
  const sub = submenu('Veg')!.getBoundingClientRect()
  expect(sub.left).toBeCloseTo(option('Veg').getBoundingClientRect().left, 0)
  expect(sub.right).toBeLessThanOrEqual(innerWidth)
})

// WebKit placed it, with anchor() insets, by where its title would be had the outer one not moved
it('opens a submenu by its title in a submenu that opened above its own', async () => {
  const { root, option } = await setup(
    {
      options: [
        {
          type: 'submenu',
          title: 'Veg',
          childs: [
            ...Array.from({ length: 8 }, (_, i) => ({
              label: `Veg ${i}`,
              value: `${i}`
            })),
            {
              type: 'submenu',
              title: 'Greens',
              childs: [{ label: 'Kale', value: 'kale' }]
            }
          ]
        }
      ],
      style: narrow
    },
    { offsetTop: innerHeight - 300 }
  )
  await userEvent.click(root)
  await userEvent.click(option('Veg'))
  expect(submenu('Veg')!.getBoundingClientRect().top).toBeLessThan(
    option('Veg').getBoundingClientRect().top
  )
  await userEvent.click(option('Greens'))
  expect(option('Kale').getBoundingClientRect().top).toBeCloseTo(
    option('Greens').getBoundingClientRect().top,
    0
  )
})

it('opens a submenu to the left in right-to-left', async () => {
  const screen = await render(
    <div dir='rtl'>
      <MultiSelect options={tree} style={narrow} />
    </div>
  )
  await userEvent.click(screen.container.querySelector('.msl-wrp')!)
  const veg = [...box()!.querySelectorAll('.msl-option')].find(
    (el) => el.textContent === 'Veg'
  )!
  await userEvent.click(veg)
  expect(submenu('Veg')!.getBoundingClientRect().right).toBeCloseTo(
    veg.getBoundingClientRect().left,
    0
  )
})

it('opens a submenu under its title, in the menu, where the browser has no CSS anchor positioning', async () => {
  // the top layer would show it at the corner of the page
  const supports = vi.spyOn(CSS, 'supports').mockReturnValue(false)
  try {
    const { root, option } = await setup({ options: tree })
    await userEvent.click(root)
    await userEvent.click(option('Veg'))
    const sub = submenu('Veg')!
    expect(sub.matches(':popover-open')).toBe(false)
    const veg = option('Veg').getBoundingClientRect()
    const carrot = option('Carrot').getBoundingClientRect()
    expect(carrot.top).toBeGreaterThan(veg.bottom)
    expect(carrot.left).toBeGreaterThanOrEqual(veg.left)
    // the rows after it make room
    expect(option('Banana').getBoundingClientRect().top).toBeGreaterThanOrEqual(
      sub.getBoundingClientRect().bottom
    )
    // a pick in it, the pointer crossing its rows, as beside its title
    await userEvent.click(option('Carrot'))
    expect(submenu('Veg')).toBe(sub)
    expect(option('Carrot').getAttribute('aria-selected')).toBe('true')
  } finally {
    supports.mockRestore()
  }
})

it('a pause over a submenu title opens it, over a row outside closes it', async () => {
  const { root, option } = await setup({ options: tree })
  await userEvent.click(root)
  await userEvent.hover(option('Veg'))
  await expect.poll(() => submenu('Veg')).toBeTruthy()
  await userEvent.hover(option('Carrot'))
  await userEvent.hover(option('Banana'))
  await expect.poll(() => submenu('Veg')).toBeUndefined()
})

it('picks in a submenu, the menu left open; a click outside closes it all', async () => {
  const { root, option, chips, outside, focused } = await setup({
    options: tree
  })
  await userEvent.click(root)
  await userEvent.click(option('Veg'))
  await userEvent.click(option('Carrot'))
  await expect.poll(chips).toEqual(['Carrot'])
  expect(submenu('Veg')).toBeTruthy()
  expect(focused()).toBe('search')
  await userEvent.click(outside)
  await expect.poll(box).toBeNull()
  expect(document.querySelector('.msl-submenu')).toBeNull()
})

it('a pick that closes the menu from a submenu leaves focus in the search field, not on the body', async () => {
  const { root, option, chips, focused } = await setup({
    options: tree,
    closeOnSelect: true
  })
  await userEvent.click(root)
  await userEvent.click(option('Veg'))
  // the click focuses the row it picks, which the close removes
  await userEvent.click(option('Carrot'))
  await expect.poll(chips).toEqual(['Carrot'])
  await expect.poll(box).toBeNull()
  expect(focused()).toBe('search')
})

it('the keyboard scrolls a submenu to its highlighted row, the list under it left alone', async () => {
  const { input, q, option, focused } = await setup({
    options: [
      ...Array.from({ length: 20 }, (_, i) => ({
        label: `Item ${i}`,
        value: `${i}`
      })),
      {
        type: 'submenu',
        title: 'More',
        childs: Array.from({ length: 40 }, (_, i) => ({
          label: `More ${i}`,
          value: `m${i}`
        }))
      }
    ]
  })
  input().focus()
  await userEvent.keyboard('{End}{ArrowRight}')
  await expect.poll(() => submenu('More')).toBeTruthy()
  const list = q('.msl-options')
  const top = list.scrollTop
  expect(top).toBeGreaterThan(0)
  await userEvent.keyboard('{End}')
  const sub = submenu('More')!
  await expect.poll(() => sub.scrollTop).toBeGreaterThan(0)
  expect(list.scrollTop).toBe(top)
  expect(highlighted()).toBe(option('More 39'))
  expect(focused()).toBe('search')
})

it('a collapsible group toggles on a click of its title', async () => {
  const { root, q, visibleOptions } = await setup({
    options: [
      {
        type: 'group',
        title: 'Citrus',
        collapsible: true,
        collapsed: true,
        childs: opts
      }
    ]
  })
  await userEvent.click(root)
  expect(visibleOptions()).toEqual([])
  await userEvent.click(q('.msl-grp-title'))
  await expect.poll(visibleOptions).toEqual(['Apple', 'Banana', 'Cherry'])
  expect(box()).not.toBeNull()
})

// ends the running animations: tests give them 10s, so a slow step never outlasts one
const finish = () => document.getAnimations().forEach((a) => a.finish())

// exit CSS for a test, removed after it
const withCss = async (text: string, run: () => Promise<void>) => {
  const css = document.head.appendChild(document.createElement('style'))
  css.textContent = text
  try {
    await run()
  } finally {
    css.remove()
  }
}

// Firefox held the fade's first frame on a submenu a fallback placed that resized meanwhile, as a virtual list's does
it('a submenu on the other side shows once its fade in ends, though it grew meanwhile', () =>
  withCss(
    '.msl-submenu { transition: opacity 10s } @starting-style { .msl-submenu { opacity: 0 } }',
    async () => {
      const { root, option } = await setup({
        options: tree,
        style: { ...narrow, marginInlineStart: innerWidth - 170 }
      })
      await userEvent.click(root)
      await userEvent.click(option('Veg'))
      const sub = submenu('Veg')!
      sub.appendChild(document.createElement('div')).style.height = '20px'
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      )
      finish()
      await expect.poll(() => getComputedStyle(sub).opacity).toBe('1')
    }
  ))

it('the closed menu stays, inert, until the transition data-closing starts ends', () =>
  withCss(
    '.msl-options { transition: opacity 10s } .msl[data-closing] .msl-options { opacity: 0 }',
    async () => {
      const { root, q, focused } = await setup()
      await userEvent.click(root)
      await userEvent.keyboard('{Escape}')
      const list = q('.msl-options')
      expect(q('.msl').hasAttribute('data-closing')).toBe(true)
      expect(list.inert).toBe(true)
      expect(focused()).toBe('search')
      await expect.poll(() => +getComputedStyle(list).opacity).toBeLessThan(1)
      expect(list.isConnected).toBe(true)
      finish()
      await expect.poll(() => list.isConnected).toBe(false)
      expect(q('.msl').hasAttribute('data-closing')).toBe(false)
    }
  ))

it('without exit CSS a pick closes the menu at once: the stylesheet transitions the picked option, which is no exit', async () => {
  // Apple, not hovered, transitions off its selected background
  const { root, option } = await setup({
    singleSelect: true,
    defaultValue: ['apple']
  })
  await userEvent.click(root)
  await userEvent.click(option('Banana'))
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r))
  )
  expect(box()).toBeNull()
})

it('a closed submenu fades out where it was, from shown though CSS fades it in', () =>
  withCss(
    '.msl-submenu { transition: opacity 10s } .msl-submenu[data-closing] { opacity: 0 } @starting-style { .msl-submenu { opacity: 0 } }',
    async () => {
      const { input } = await setup({ options: tree, style: narrow })
      input().focus()
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}')
      const sub = submenu('Veg')!
      finish()
      expect(getComputedStyle(sub).opacity).toBe('1')
      const at = sub.getBoundingClientRect()
      await userEvent.keyboard('{ArrowLeft}')
      const copy = document.querySelector<HTMLElement>(
        '.msl-submenu[data-closing]'
      )!
      expect(copy.matches(':popover-open')).toBe(true)
      const now = copy.getBoundingClientRect()
      expect([now.left, now.top]).toEqual([at.left, at.top])
      // not from the fade in's start
      expect(+getComputedStyle(copy).opacity).toBeGreaterThan(0.9)
      finish()
      await expect.poll(() => document.querySelector('.msl-submenu')).toBeNull()
    }
  ))

it("a collapsed group's rows leave once their exit transition ends", () =>
  withCss(
    '.msl-option { transition: opacity 10s } [data-closing] .msl-option { opacity: 0 }',
    async () => {
      const { root, q } = await setup({
        options: [
          { type: 'group', title: 'Citrus', collapsible: true, childs: opts }
        ]
      })
      await userEvent.click(root)
      await userEvent.click(q('.msl-grp-title'))
      const rows = () =>
        [...document.querySelectorAll('[data-closing] .msl-option')].map(
          (el) => el.textContent
        )
      expect(rows()).toEqual(['Apple', 'Banana', 'Cherry'])
      finish()
      await expect.poll(rows).toEqual([])
    }
  ))

it('the dropdown keeps its height while CSS grows the open box, its menu row from 0fr', () =>
  withCss(
    '.msl { grid-template-rows: max-content 0fr; transition: grid-template-rows 400ms } .msl-active { grid-template-rows: max-content 1fr }',
    async () => {
      const { root, q } = await setup()
      const closed = root.getBoundingClientRect().height
      await userEvent.click(root)
      for (const t of [0, 100, 200]) {
        document.getAnimations().forEach((a) => {
          a.pause()
          a.currentTime = t
        })
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r))
        )
        expect(root.getBoundingClientRect().height).toBe(closed)
      }
      // squeezed: the menu less tall than its content, or overflowing its row
      expect(q('.msl-options').getBoundingClientRect().height).toBeLessThan(
        q('.msl-options').scrollHeight
      )
    }
  ))

for (const [dir, edge] of [
  ['down', 'top'],
  ['up', 'bottom']
] as const)
  it(`the dropdown keeps its height with padding on the control, opening ${dir}`, () =>
    withCss('.msl { padding: 6px 0 }', async () => {
      const { root, q, menuHeight } = await setup(
        {},
        { offsetTop: dir == 'up' ? window.innerHeight - 80 : 0 }
      )
      const closed = root.getBoundingClientRect()
      await userEvent.click(root)
      await expect.poll(menuHeight).toBeGreaterThan(0)
      expect(q('.msl').className).toContain(
        dir == 'up' ? 'msl-active-up' : 'msl-active'
      )
      expect(root.getBoundingClientRect().height).toBeCloseTo(closed.height)
      // over the dropdown: from its top opening down, up to its bottom opening up
      expect(box()!.getBoundingClientRect()[edge]).toBeCloseTo(closed[edge])
    }))

it("CSS animates a collapsible group's height, open and shut, through a grid row of its body's one box", () =>
  withCss(
    '.msl-grp-body { display: grid; grid-template-rows: 1fr; transition: grid-template-rows 10s linear } @starting-style { .msl-grp-body { grid-template-rows: 0fr } } .msl-grp-body[data-closing] { grid-template-rows: 0fr } .msl-grp-body > div { overflow: hidden; min-height: 0 }',
    async () => {
      const { root, q } = await setup({
        options: [
          {
            type: 'group',
            title: 'Citrus',
            collapsible: true,
            collapsed: true,
            childs: opts
          }
        ]
      })
      await userEvent.click(root)
      const at = (t: number) =>
        document.getAnimations().forEach((a) => {
          a.pause()
          a.currentTime = t
        })
      const height = (el: Element) => el.getBoundingClientRect().height
      await userEvent.click(q('.msl-grp-title'))
      const body = q('.msl-grp-body')
      const full = body.firstElementChild!.scrollHeight
      at(0)
      expect(height(body)).toBe(0)
      at(5000)
      expect(height(body)).toBeCloseTo(full / 2, 0)
      finish()
      expect(height(body)).toBeCloseTo(full, 0)
      await userEvent.click(q('.msl-grp-title'))
      const copy = q('.msl-grp-body[data-closing]')
      at(5000)
      expect(height(copy)).toBeCloseTo(full / 2, 0)
      finish()
      await expect.poll(() => copy.isConnected).toBe(false)
    }
  ))

// renderList through two virtual list libraries, the dev dependencies of this suite only.
// react-window: a scroller of its own, which the listbox's flex column fits to the menu
const Row = ({
  index,
  style,
  row
}: RowComponentProps<Pick<MultiSelectListProps, 'row'>>) => (
  // top, not its transform: Firefox places a submenu by its title as if the transforms around it were not there
  <div style={{ ...style, transform: 'none', top: index * 36 }}>
    {row(index)}
  </div>
)

function WindowList({ count, row, activeIndex }: MultiSelectListProps) {
  // state, not a ref: its handle scrolls only once the list has mounted, a commit after the open
  const [list, setList] = useListCallbackRef(null)
  useEffect(() => {
    activeIndex >= 0 && list?.scrollToRow({ index: activeIndex })
  }, [list, activeIndex])
  return (
    <List
      listRef={setList}
      // its default role="list" would come between the listbox and its options
      role='none'
      // as the listbox's: else Firefox makes the scroller a tab stop
      tabIndex={-1}
      rowComponent={Row}
      rowCount={count}
      rowHeight={36}
      rowProps={{ row }}
    />
  )
}

// TanStack Virtual: measures the rows it renders, in a scroller of ours, measured on mount
function TanstackList({ count, row, activeIndex }: MultiSelectListProps) {
  const ref = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => ref.current,
    estimateSize: () => 36
  })
  useEffect(() => {
    activeIndex >= 0 && virtualizer.scrollToIndex(activeIndex)
  }, [activeIndex])
  return (
    <div ref={ref} tabIndex={-1} style={{ overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              width: '100%',
              // top, not a transform, as in Row
              top: item.start
            }}
          >
            {row(item.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

const long = Array.from({ length: 2000 }, (_, i) => ({
  label: `Item ${i}`,
  value: `${i}`
}))

// 50 collapsed groups, each a submenu of 200 options and 100 options
const regions = Array.from({ length: 50 }, (_, g) => ({
  type: 'group',
  title: `Group ${g}`,
  collapsible: true,
  collapsed: true,
  childs: [
    {
      type: 'submenu',
      title: `More ${g}`,
      childs: Array.from({ length: 200 }, (_, i) => ({
        label: `More ${g}.${i}`,
        value: `m${g}.${i}`
      }))
    },
    ...Array.from({ length: 100 }, (_, i) => ({
      label: `Item ${g}.${i}`,
      value: `${g}.${i}`
    }))
  ]
}))

describe.each([
  ['react-window', (l: MultiSelectListProps) => <WindowList {...l} />],
  ['TanStack Virtual', (l: MultiSelectListProps) => <TanstackList {...l} />]
])('renderList through %s', (_, renderList) => {
  // the library's scroller, in the listbox
  const scroller = () =>
    box()!.querySelector<HTMLElement>('.msl-options > :first-child')!
  // within the scroller's visible part
  const inView = (el: Element) => {
    const r = el.getBoundingClientRect()
    const s = scroller().getBoundingClientRect()
    return r.top >= s.top - 1 && r.bottom <= s.bottom + 1
  }

  it('renders a window of the rows, in a menu as tall as its cap, and only the rows shown build', async () => {
    const getLabel = vi.fn((opt: MultiSelectOption) => opt.label)
    const { root, q, menuHeight, visibleOptions } = await setup({
      options: long,
      getLabel,
      renderList
    })
    await userEvent.click(root)
    await expect.poll(() => visibleOptions().length).toBeGreaterThan(5)
    const menu = q('.msl-options')
    // the scroller fits the cap, so the listbox around it has nothing to scroll
    expect(scroller().getBoundingClientRect().height).toBeCloseTo(
      parseFloat(getComputedStyle(menu).maxHeight),
      0
    )
    expect(menu.scrollHeight).toBe(menu.clientHeight)
    expect(menuHeight()).toBeLessThan(410)
    expect(visibleOptions().length).toBeLessThan(40)
    // from the first open on: measured before the menu got its room, the cap was already there
    expect(
      new Set(getLabel.mock.calls.map(([opt]) => opt.value)).size
    ).toBeLessThan(60)
    scroller().scrollTop = 36 * 1000
    await expect
      .poll(() => visibleOptions().some((t) => /^Item 10\d\d$/.test(t!)))
      .toBe(true)
  })

  it('arrow keys, Home and End scroll the highlight into view; Enter and clicks pick', async () => {
    const { root, input, option, chips } = await setup({
      options: long,
      renderList
    })
    await userEvent.click(root)
    await userEvent.keyboard('{End}')
    await expect.poll(() => highlighted()?.textContent).toBe('Item 1999')
    await expect.poll(() => inView(highlighted()!)).toBe(true)
    expect(input().getAttribute('aria-activedescendant')).toBe(
      highlighted()!.id
    )
    await userEvent.keyboard('{ArrowUp}{Enter}')
    await expect.poll(chips).toEqual(['Item 1998'])
    await userEvent.keyboard('{Home}')
    await expect.poll(() => highlighted()?.textContent).toBe('Item 0')
    await expect.poll(() => inView(highlighted()!)).toBe(true)
    await userEvent.click(option('Item 2'))
    await expect.poll(chips).toEqual(['Item 1998', 'Item 2'])
  })

  it('opened by End on the closed dropdown, shows the last option', async () => {
    const { input } = await setup({ options: long, renderList })
    input().focus()
    await userEvent.keyboard('{End}')
    await expect.poll(() => highlighted()?.textContent).toBe('Item 1999')
    await expect.poll(() => inView(highlighted()!)).toBe(true)
  })

  it('a search shrinks the menu to its results', async () => {
    const { root, input, visibleOptions, menuHeight } = await setup({
      options: long,
      renderList
    })
    await userEvent.click(root)
    await userEvent.type(input(), 'Item 1999')
    await expect.poll(visibleOptions).toEqual(['Item 1999'])
    expect(menuHeight()).toBeLessThan(50)
  })

  it('collapsible groups and submenus: titles are rows, a submenu a list of its own beside its title', async () => {
    const { root, chips, option, visibleOptions } = await setup({
      options: regions,
      renderList
    })
    const titles = () =>
      [...box()!.querySelectorAll('.msl-grp-title')].map((el) => el.textContent)
    await userEvent.click(root)
    await expect.poll(() => titles().length).toBeGreaterThan(3)
    expect(visibleOptions()).toEqual([])
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await expect.poll(() => visibleOptions()[1]).toBe('Item 0.0')
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await expect.poll(() => highlighted()?.textContent).toBe('More 0.0')
    const more = document.querySelector<HTMLElement>('.msl-submenu')!
    expect(more.matches(':popover-open')).toBe(true)
    // beside its title, its first row level with it
    const title = option('More 0').getBoundingClientRect()
    const first = option('More 0.0').getBoundingClientRect()
    expect(first.top).toBeCloseTo(title.top, 0)
    expect(
      Math.min(
        Math.abs(more.getBoundingClientRect().left - title.right),
        Math.abs(more.getBoundingClientRect().right - title.left),
        Math.abs(more.getBoundingClientRect().left - title.left)
      )
    ).toBeLessThan(1)
    // its list renders a window of its rows, in its own scroller
    const inner = more.querySelector<HTMLElement>(':scope > :first-child')!
    expect(inner.getBoundingClientRect().height).toBeLessThan(410)
    expect(more.querySelectorAll('.msl-option').length).toBeLessThan(40)
    await userEvent.keyboard('{End}')
    await expect.poll(() => highlighted()?.textContent).toBe('More 0.199')
    await expect
      .poll(() => {
        const r = highlighted()!.getBoundingClientRect()
        const s = inner.getBoundingClientRect()
        return r.top >= s.top - 1 && r.bottom <= s.bottom + 1
      })
      .toBe(true)
    await userEvent.keyboard('{Enter}')
    await expect.poll(chips).toEqual(['More 0.199'])
    await userEvent.keyboard('{ArrowLeft}')
    await expect.poll(() => document.querySelector('.msl-submenu')).toBeNull()
    expect(highlighted()?.textContent).toBe('More 0')
    // a click opens it too, and a pick in it
    await userEvent.click(option('More 0'))
    // the list fills its window once it has measured it
    await expect.poll(() => option('More 0.5')).toBeTruthy()
    await userEvent.click(option('More 0.5'))
    await expect.poll(chips).toEqual(['More 0.199', 'More 0.5'])
  })

  // room beside its title: Firefox freezes the enter animation of a submenu placed by a fallback as the list resizes it
  it('a closed submenu fades out where it was, as without it', () =>
    withCss(
      '.msl-submenu { transition: opacity 10s } .msl-submenu[data-closing] { opacity: 0 } @starting-style { .msl-submenu { opacity: 0 } }',
      async () => {
        const { input } = await setup({
          options: tree,
          renderList,
          style: { '--msl-input-width': '150px' } as never
        })
        input().focus()
        await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}')
        await expect.poll(() => submenu('Veg')).toBeTruthy()
        const sub = submenu('Veg')!
        finish()
        expect(getComputedStyle(sub).opacity).toBe('1')
        const at = sub.getBoundingClientRect()
        await userEvent.keyboard('{ArrowLeft}')
        const copy = document.querySelector<HTMLElement>(
          '.msl-submenu[data-closing]'
        )!
        expect(copy.matches(':popover-open')).toBe(true)
        const now = copy.getBoundingClientRect()
        expect([now.left, now.top]).toEqual([at.left, at.top])
        expect(+getComputedStyle(copy).opacity).toBeGreaterThan(0.9)
        finish()
        await expect
          .poll(() => document.querySelector('.msl-submenu'))
          .toBeNull()
      }
    ))

  it("loadOptions: the next part loads as the scroller reaches the list's end", async () => {
    const api = paged(50)
    const { root, visibleOptions } = await setup({
      options: undefined,
      loadOptions: api,
      renderList
    })
    await userEvent.click(root)
    await expect.poll(() => visibleOptions()[0]).toBe('Item 0')
    expect(api).toHaveBeenCalledTimes(1)
    scroller().scrollTop = 36 * 60
    await expect.poll(() => api.mock.calls.length).toBe(2)
    expect(api.mock.lastCall![0].next).toBe(50)
    await expect.poll(() => scroller().scrollHeight).toBeGreaterThan(36 * 99)
    scroller().scrollTop = 36 * 99
    await expect.poll(() => visibleOptions()).toContain('Item 99')
  })

  it('Tab closes the menu and moves on in page order, from the search field or a clicked option', async () => {
    const { root, after, menuHeight } = await setup({
      options: long,
      renderList
    })
    await userEvent.click(root)
    await expect.poll(menuHeight).toBeGreaterThan(0)
    await userEvent.tab()
    expect(menuHeight()).toBe(0)
    expect(document.activeElement).toBe(after)
    const other = await setup({
      options: long,
      renderList,
      disableSearch: true
    })
    await userEvent.click(other.root)
    await userEvent.click(other.option('Item 3'))
    expect(other.menuHeight()).toBeGreaterThan(0)
    await userEvent.tab()
    await expect.poll(other.menuHeight).toBe(0)
    expect(document.activeElement).toBe(other.after)
  })
})

// a paged API over `long`, `per` options a part, after `wait` ms: `next` the offset of the next part
const paged = (per: number, wait = 20) =>
  vi.fn(async ({ search, next = 0, signal }: MultiSelectLoadRequest) => {
    await new Promise((r) => setTimeout(r, wait))
    signal.throwIfAborted()
    const hits = long.filter((o) => o.label.includes(search))
    const end = next + per
    return { options: hits.slice(next, end), next: end < hits.length && end }
  })

describe('async loading', () => {
  // the row at a list's end, while it loads or has more
  const end = () => box()!.querySelector<HTMLElement>('.msl-loading')
  // the bottom of el in view, in the menu's box or a submenu
  const bottom = (el: HTMLElement) => {
    el.scrollTop = el.scrollHeight
  }

  it("loads as the menu opens, then each part as the list's end scrolls into view", async () => {
    const api = paged(50)
    const { root, q, visibleOptions } = await setup({
      options: undefined,
      loadOptions: api
    })
    await userEvent.click(root)
    await expect.poll(() => visibleOptions()[0]).toBe('Item 0')
    // the end row is out of view below 50 options: no second load
    expect(end()!.textContent).toBe('Loading...')
    expect(api).toHaveBeenCalledTimes(1)
    bottom(q('.msl-options'))
    await expect.poll(() => visibleOptions()).toContain('Item 99')
    bottom(q('.msl-options'))
    await expect.poll(() => visibleOptions()).toContain('Item 149')
    expect(api.mock.calls.map(([r]) => r.next)).toEqual([undefined, 50, 100])
  })

  it('short parts load on while the end stays in view, until they fill the menu', async () => {
    const api = paged(3)
    const { root, q, visibleOptions } = await setup({
      options: undefined,
      loadOptions: api
    })
    await userEvent.click(root)
    const menu = q('.msl-options')
    // filled: the end below the menu's bottom
    await expect
      .poll(
        () =>
          !!end() &&
          end()!.getBoundingClientRect().top >
            menu.getBoundingClientRect().bottom
      )
      .toBe(true)
    const calls = api.mock.calls.length
    expect(calls).toBeGreaterThan(2)
    expect(visibleOptions().length).toBeLessThan(30)
    await new Promise((r) => setTimeout(r, 100))
    expect(api).toHaveBeenCalledTimes(calls)
  })

  it('typing aborts the loads of the texts before it; the last one shows', async () => {
    const api = paged(50, 300)
    const { root, input, visibleOptions } = await setup({
      options: undefined,
      loadOptions: api
    })
    await userEvent.click(root)
    await userEvent.type(input(), 'Item 199')
    await expect
      .poll(visibleOptions)
      .toEqual([
        'Item 199',
        ...Array.from({ length: 10 }, (_, i) => `Item 199${i}`)
      ])
    const signals = api.mock.calls.map(([r]) => r.signal)
    expect(signals.slice(0, -1).every((s) => s.aborted)).toBe(true)
    expect(signals.at(-1)!.aborted).toBe(false)
  })

  it('a submenu loads its childs as it opens, and on as its end scrolls into view', async () => {
    const api = paged(30)
    const { root, option, visibleOptions } = await setup({
      options: [{ type: 'submenu', title: 'More', childs: api }, ...opts]
    })
    await userEvent.click(root)
    await userEvent.click(option('More'))
    await expect.poll(() => visibleOptions()).toContain('Item 29')
    const sub = box()!.querySelector<HTMLElement>('.msl-submenu')!
    expect(sub.scrollHeight).toBeGreaterThan(sub.clientHeight)
    bottom(sub)
    await expect.poll(() => visibleOptions()).toContain('Item 59')
    expect(api.mock.calls.map(([r]) => r.next)).toEqual([undefined, 30])
  })

  it("a collapsible group loads as it opens; its end in the menu's scroll loads the next part", async () => {
    const api = paged(30)
    const { root, q, visibleOptions } = await setup({
      options: [
        {
          type: 'group',
          title: 'Items',
          collapsible: true,
          collapsed: true,
          childs: api
        },
        ...opts
      ]
    })
    await userEvent.click(root)
    expect(api).not.toHaveBeenCalled()
    await userEvent.click(q('.msl-grp-title'))
    await expect.poll(() => visibleOptions()).toContain('Item 29')
    end()!.scrollIntoView()
    await expect.poll(() => visibleOptions()).toContain('Item 59')
    // in the group, before the options after it
    expect(visibleOptions().indexOf('Item 59')).toBeLessThan(
      visibleOptions().indexOf('Apple')
    )
  })
})

// a data layer of your own, as React Query's: a search's pages of `per`, 20 ms each. Page `fail` fails once
function Remote({
  per,
  fail = -1,
  calls
}: {
  per: number
  fail?: number
  calls: (search: string, page: number) => void
}) {
  const [search, setSearch] = useState('')
  const [pages, setPages] = useState<MultiSelectOption[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const failed = useRef(false)
  // the latest request: a later one drops what an earlier one returns
  const asked = useRef(0)
  const fetchPage = (s: string, page: number) => {
    const me = ++asked.current
    calls(s, page)
    setLoading(true)
    setTimeout(() => {
      if (me !== asked.current) return
      setLoading(false)
      if (page === fail && !failed.current) {
        failed.current = true
        return setError(true)
      }
      setError(false)
      const hits = long.filter((o) => o.label.includes(s))
      setPages((p) => [
        ...(page ? p : []),
        hits.slice(page * per, (page + 1) * per)
      ])
    }, 20)
  }
  useEffect(() => fetchPage(search, 0), [search])
  const options = pages.flat()
  const total = long.filter((o) => o.label.includes(search)).length
  return (
    <MultiSelect
      options={options}
      onSearch={setSearch}
      loading={loading}
      loadError={error}
      onLoadMore={
        error || options.length < total
          ? () => fetchPage(search, pages.length)
          : undefined
      }
    />
  )
}

describe('your own loading', () => {
  const end = () => box()!.querySelector<HTMLElement>('.msl-loading')
  const shown = () =>
    [...(box()?.querySelectorAll('.msl-option') ?? [])].map(
      (el) => el.textContent
    )
  const menu = () => box()!.querySelector<HTMLElement>('.msl-options')!
  const bottom = () => {
    menu().scrollTop = menu().scrollHeight
  }
  const open = async (props: { per: number; fail?: number }) => {
    const calls = vi.fn()
    const screen = await render(<Remote {...props} calls={calls} />)
    await userEvent.click(screen.container.querySelector('.msl-wrp')!)
    return {
      calls,
      input: () => screen.container.querySelector('input.msl-input')!
    }
  }

  it('the next page loads as the end scrolls into view; a search starts over', async () => {
    const { calls, input } = await open({ per: 50 })
    await expect.poll(() => shown()[0]).toBe('Item 0')
    expect(end()!.textContent).toBe('Loading...')
    expect(calls.mock.calls).toEqual([['', 0]])
    bottom()
    await expect.poll(shown).toContain('Item 99')
    expect(calls.mock.calls).toEqual([
      ['', 0],
      ['', 1]
    ])
    await userEvent.type(input(), 'Item 19')
    await expect
      .poll(() => shown().slice(0, 2))
      .toEqual(['Item 19', 'Item 190'])
    // from its first page: the menu still scrolled down, its end may load the next one too
    expect(calls).toHaveBeenCalledWith('Item 19', 0)
    expect(calls).not.toHaveBeenCalledWith('Item 19', 2)
  })

  it('short pages load on while the end stays in view, until they fill the menu', async () => {
    const { calls } = await open({ per: 3 })
    await expect
      .poll(
        () =>
          !!end() &&
          end()!.getBoundingClientRect().top >
            menu().getBoundingClientRect().bottom
      )
      .toBe(true)
    const n = calls.mock.calls.length
    expect(n).toBeGreaterThan(2)
    await new Promise((r) => setTimeout(r, 100))
    expect(calls).toHaveBeenCalledTimes(n)
  })

  it('a failed page shows errorLabel and loads no more by itself; a click loads it again', async () => {
    const { calls } = await open({ per: 50, fail: 1 })
    await expect.poll(() => shown()[0]).toBe('Item 0')
    bottom()
    await expect.poll(() => end()?.textContent).toBe('Failed to load. Retry')
    expect(end()!.hasAttribute('data-error')).toBe(true)
    await new Promise((r) => setTimeout(r, 100))
    expect(calls).toHaveBeenCalledTimes(2)
    await userEvent.click(end()!)
    await expect.poll(shown).toContain('Item 99')
    expect(calls).toHaveBeenLastCalledWith('', 1)
  })
})

// an accordion of childs you load, and a submenu's loader, each ending in a Load more button
function Buttons({ calls }: { calls: (what: string) => void }) {
  const [n, setN] = useState(2)
  return (
    <MultiSelect
      loadMoreLabel='Load more'
      options={[
        {
          type: 'group',
          title: 'Accordion',
          collapsible: true,
          collapsed: true,
          childs: long.slice(0, n),
          onLoadMore:
            n < 4
              ? () => {
                  calls('accordion')
                  setN(n + 2)
                }
              : undefined
        },
        {
          type: 'submenu',
          title: 'Submenu',
          childs: async ({ next = 0 }) => {
            calls(`submenu ${next}`)
            const at = 100 + (next as number) * 2
            return {
              options: long.slice(at, at + 2),
              next: next ? undefined : 1
            }
          }
        }
      ]}
    />
  )
}

describe('load more buttons', () => {
  const shown = () =>
    [...(box()?.querySelectorAll('.msl-option') ?? [])].map(
      (el) => el.textContent
    )
  const more = (s: string) =>
    box()!.querySelector<HTMLElement>(`${s} [data-more]`)!

  it('an accordion and a submenu load their next part on a click, not as their end shows, and stay open', async () => {
    const calls = vi.fn()
    const screen = await render(<Buttons calls={calls} />)
    await userEvent.click(screen.container.querySelector('.msl-wrp')!)
    await userEvent.click(box()!.querySelector('.msl-grp-title')!)
    await expect
      .poll(shown)
      .toEqual(['Item 0', 'Item 1', 'Load more', 'Submenu'])
    expect(calls).not.toHaveBeenCalled()
    await userEvent.click(more('.msl-grp-body'))
    await expect.poll(shown).toContain('Item 3')
    expect(shown()).not.toContain('Load more')
    expect(calls.mock.calls).toEqual([['accordion']])
    // the first part loads as the submenu opens
    await userEvent.click(
      [...box()!.querySelectorAll('.msl-option')].find(
        (el) => el.textContent === 'Submenu'
      )!
    )
    await expect.poll(shown).toContain('Item 101')
    expect(more('.msl-submenu').textContent).toBe('Load more')
    await new Promise((r) => setTimeout(r, 100))
    expect(calls.mock.calls).toEqual([['accordion'], ['submenu 0']])
    await userEvent.click(more('.msl-submenu'))
    await expect.poll(shown).toContain('Item 103')
    expect(calls.mock.calls).toEqual([
      ['accordion'],
      ['submenu 0'],
      ['submenu 1']
    ])
    expect(box()!.querySelector('.msl-submenu [data-more]')).toBeNull()
    expect(box()!.querySelector('.msl-submenu')).not.toBeNull()
  })
})

// open and search yours: a pick keeps the search, a toggle outside opens it
function Yours({ calls }: { calls: (e: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  return (
    <>
      <button onClick={() => setOpen(!open)}>toggle</button>
      <MultiSelect
        options={opts}
        open={open}
        onMenuOpen={() => {
          calls('open')
          setOpen(true)
        }}
        onMenuClose={() => {
          calls('close')
          setOpen(false)
        }}
        search={search}
        onSearchChange={(text, reason) => reason !== 'pick' && setSearch(text)}
      />
    </>
  )
}

describe('controlled open and search', () => {
  const open = async () => {
    const calls = vi.fn()
    const screen = await render(<Yours calls={calls} />)
    const c = screen.container
    return {
      calls,
      root: c.querySelector<HTMLElement>('.msl-wrp')!,
      toggle: c.querySelector('button')!,
      input: () => c.querySelector<HTMLInputElement>('input.msl-input')!,
      shown: () =>
        [...(box()?.querySelectorAll('.msl-option') ?? [])].map(
          (el) => el.textContent
        )
    }
  }

  it('a click opens it and focuses the field; typing searches; a pick keeps the search; Tab closes it and clears it', async () => {
    const { calls, root, input, shown } = await open()
    await userEvent.click(root)
    expect(box()).not.toBeNull()
    // in once your open has committed: an effect of the render it makes
    await expect.poll(() => document.activeElement).toBe(input())
    await userEvent.keyboard('an')
    expect(shown()).toEqual(['Banana'])
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(root.querySelector('.msl-chip')!.textContent).toBe('Banana')
    expect(input().value).toBe('an')
    expect(shown()).toEqual(['Banana'])
    await userEvent.tab()
    expect(box()).toBeNull()
    expect(document.activeElement).toBe(root.querySelector('.msl-clear-btn'))
    expect(input().value).toBe('')
    expect(calls.mock.calls).toEqual([['open'], ['close']])
  })

  // as without open: yours opens it in an effect whose updates are sync, before the browser types the key
  it.skipIf(server.browser === 'firefox')(
    'the key on the wrapper that asks to open types into the search field',
    async () => {
      const { toggle, root, input, shown } = await open()
      toggle.focus()
      await userEvent.tab()
      expect(document.activeElement).toBe(root)
      await userEvent.keyboard('ch')
      expect(box()).not.toBeNull()
      expect(input().value).toBe('ch')
      expect(shown()).toEqual(['Cherry'])
    }
  )

  it('opened from outside, focus stays there; a click outside closes it', async () => {
    const { calls, toggle, root } = await open()
    await userEvent.click(toggle)
    expect(box()).not.toBeNull()
    expect(root.contains(document.activeElement)).toBe(false)
    await userEvent.click(document.body)
    expect(box()).toBeNull()
    expect(calls.mock.calls).toEqual([['close']])
  })
})

describe('loadAhead', () => {
  // 50 options, then more
  const open = async (loadAhead?: number) => {
    const calls = vi.fn()
    const screen = await render(
      <MultiSelect
        loadAhead={loadAhead}
        // the next part never comes: its end row, and the box over it, stay
        loadOptions={({ next = 0 }: MultiSelectLoadRequest) => {
          calls(next)
          return next
            ? new Promise<never>(() => {})
            : { options: long.slice(0, 50), next: 1 }
        }}
      />
    )
    await userEvent.click(screen.container.querySelector('.msl-wrp')!)
    await expect
      .poll(() => box()?.querySelector('.msl-option')?.textContent)
      .toBe('Item 0')
    return { calls, screen }
  }

  it('the next part loads while the end row is still that far out of view; the rows under its box take clicks', async () => {
    const { calls, screen } = await open(3000)
    await expect.poll(() => calls.mock.calls).toEqual([[0], [1]])
    await userEvent.click(
      [...box()!.querySelectorAll('.msl-option')].find(
        (el) => el.textContent === 'Item 1'
      )!
    )
    expect(
      [...screen.container.querySelectorAll('.msl-chip')].map(
        (el) => el.textContent
      )
    ).toEqual(['Item 1'])
  })

  it('without it, not until the end row comes into view', async () => {
    const { calls } = await open()
    await new Promise((r) => setTimeout(r, 100))
    expect(calls).toHaveBeenCalledTimes(1)
  })
})

it("Space on a checkbox in a collapsible group's title toggles it, focus staying; Enter leaves the group open", async () => {
  const toggle = vi.fn()
  const { root, after, focused } = await setup({
    options: [{ type: 'group', title: 'G', collapsible: true, childs: opts }],
    renderGroupTitle: ({ title }) => (
      <>
        <input
          type='checkbox'
          aria-label='All'
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
        />
        {title}
      </>
    )
  })
  await userEvent.click(root)
  await userEvent.tab()
  expect(focused()).toBe('')
  await userEvent.keyboard(' ')
  expect(toggle).toHaveBeenCalledOnce()
  expect(focused()).toBe('')
  expect(
    box()!.querySelector<HTMLInputElement>('[aria-label="All"]')!.checked
  ).toBe(true)
  await userEvent.keyboard('{Enter}')
  expect(
    box()!.querySelector('.msl-grp-title')!.getAttribute('aria-expanded')
  ).toBe('true')
  await userEvent.tab()
  expect(document.activeElement).toBe(after)
})

describe('menu header and footer', () => {
  const many = Array.from({ length: 50 }, (_, i) => ({
    label: `Option ${i}`,
    value: `${i}`
  }))
  const parts = {
    menuHeader: ({ selectAll }: MultiSelectMenuProps) => (
      <button style={{ height: 30 }} onClick={selectAll}>
        All
      </button>
    ),
    menuFooter: <div style={{ height: 20 }}>Foot</div>
  }

  it('they sit around the options; the wrapper keeps its size, the options leave them room', async () => {
    const { root, q, menuHeight, focused, chips } = await setup(
      { options: many, ...parts },
      { offsetTop: document.documentElement.clientHeight - 300 }
    )
    const closed = root.getBoundingClientRect()
    const values = q('.msl-input-wrp').getBoundingClientRect()
    await userEvent.click(root)
    await expect.poll(menuHeight).toBeGreaterThan(0)
    expect(box()!.className).toContain('msl-active')
    expect(root.getBoundingClientRect()).toEqual(closed)
    const head = q('.msl-menu-header').getBoundingClientRect()
    const foot = q('.msl-menu-footer').getBoundingClientRect()
    const list = q('.msl-options').getBoundingClientRect()
    // as wide as the box, under the control
    expect(head.width).toBeCloseTo(list.width)
    expect(head.top).toBeCloseTo(values.bottom)
    expect(foot.top).toBeCloseTo(list.bottom)
    const room = document.documentElement.clientHeight - closed.bottom
    expect(
      parseFloat(getComputedStyle(q('.msl-options')).maxHeight)
    ).toBeCloseTo(room - head.height - foot.height, 2)
    // a click on its button keeps focus in the field
    await userEvent.click(q('.msl-menu-header button'))
    expect(focused()).toBe('search')
    expect(chips()).toHaveLength(50)
    expect(menuHeight()).toBeGreaterThan(0)
  })

  it('a field in the header takes clicks and typing; Tab steps from the search through the clear button to the header, then the footer', async () => {
    const { root, q, focused, chips, menuHeight } = await setup({
      defaultValue: ['apple'],
      menuHeader: <input aria-label='filter' />,
      menuFooter: <button>Done</button>
    })
    await userEvent.click(root)
    const field = q('.msl-menu-header input') as HTMLInputElement
    await userEvent.click(field)
    await userEvent.keyboard('ab{Backspace}{Enter}')
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe('a')
    expect(chips()).toEqual(['Apple'])
    expect(menuHeight()).toBeGreaterThan(0)
    q('input.msl-input').focus()
    await userEvent.tab()
    expect(focused()).toBe('clear')
    await userEvent.tab()
    expect(document.activeElement).toBe(field)
    await userEvent.tab()
    expect(focused()).toBe('Done')
    expect(menuHeight()).toBeGreaterThan(0)
  })

  it('opening upward: the footer above the control, which stays put', async () => {
    const { root, q, menuHeight } = await setup(parts, {
      offsetTop: window.innerHeight - 80
    })
    const closed = root.getBoundingClientRect()
    const values = q('.msl-input-wrp').getBoundingClientRect()
    await userEvent.click(root)
    await expect.poll(menuHeight).toBeGreaterThan(0)
    expect(box()!.className).toContain('msl-active-up')
    expect(q('.msl-input-wrp').getBoundingClientRect()).toEqual(values)
    expect(root.getBoundingClientRect()).toEqual(closed)
    expect(q('.msl-menu-footer').getBoundingClientRect().bottom).toBeCloseTo(
      values.top,
      0
    )
  })
})
