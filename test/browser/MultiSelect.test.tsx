// Real-browser characterization tests: layout, CSS, focus and contentEditable typing that jsdom fakes.
// Like test/MultiSelect.test.tsx, "current behavior: ..." pins known quirks of v2.0.6.
import { expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { MultiSelectProps } from '../../src/index'
import MultiSelect from '../../src/MultiSelect'

const opts = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' }
]

async function setup(props: MultiSelectProps = {}, { offsetTop = 0 } = {}) {
  const screen = await render(
    <div style={{ paddingTop: offsetTop }}>
      <button>outside</button>
      <MultiSelect options={opts} {...props} />
    </div>
  )
  const c = screen.container
  const q = (s: string) => c.querySelector<HTMLElement>(s)!
  const root = q('.msl-wrp')
  return {
    root,
    q,
    outside: q('button'),
    input: () => q('.msl-input[contenteditable="true"]'),
    // closed menu = max-height: 0 in CSS, so its real height is the open/closed signal
    menuHeight: () => q('.msl-options').getBoundingClientRect().height,
    chips: () =>
      [...c.querySelectorAll('.msl-chip')].map((el) => el.textContent),
    visibleOptions: () =>
      [...c.querySelectorAll('.msl-options .msl-option')].map(
        (el) => el.textContent
      ),
    option: (text: string) =>
      [...c.querySelectorAll<HTMLElement>('.msl-option')].find(
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

it('menu is collapsed until opened, then drops below the input', async () => {
  const { root, q, menuHeight } = await setup()
  expect(menuHeight()).toBe(0)
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(q('.msl').className).toContain('msl-active')
  const input = q('.msl').getBoundingClientRect()
  const menu = q('.msl-options').getBoundingClientRect()
  expect(menu.top).toBeGreaterThanOrEqual(input.bottom - 1)
})

it('opens upward near the bottom of the viewport', async () => {
  const { root, q, menuHeight } = await setup(
    {},
    { offsetTop: window.innerHeight - 80 }
  )
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  expect(q('.msl').className).toContain('msl-active-up')
  const input = q('.msl').getBoundingClientRect()
  const menu = q('.msl-options').getBoundingClientRect()
  expect(menu.bottom).toBeLessThanOrEqual(input.top + 1)
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
    expect(input().textContent).toBe('')
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
  const { option, chips } = await setup()
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

it('closes when Tab moves focus out', async () => {
  const { root, menuHeight, focused } = await setup()
  await userEvent.click(root)
  await expect.poll(menuHeight).toBeGreaterThan(0)
  await userEvent.tab({ shift: true })
  expect(focused()).toBe('wrapper')
  expect(menuHeight()).toBeGreaterThan(0)
  await userEvent.tab({ shift: true })
  await expect.poll(menuHeight).toBe(0)
})

it('Enter adds no line break to the search field', async () => {
  const { root, input } = await setup()
  await userEvent.click(root)
  await userEvent.keyboard('{Enter}zzz{Enter}')
  expect(input().innerHTML).toBe('zzz')
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
    expect(input().innerHTML).toBe('Ban')
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
  expect(input().innerHTML).toBe('')
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
  expect(input().innerHTML).toBe('')
  expect(highlighted()?.textContent).toBe('Banana')
})

it('Backspace in an empty search field removes the last chip', async () => {
  const { input, chips } = await setup({ defaultValue: ['apple', 'banana'] })
  await userEvent.type(input(), 'c')
  await userEvent.keyboard('{Backspace}')
  expect(input().textContent).toBe('')
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
