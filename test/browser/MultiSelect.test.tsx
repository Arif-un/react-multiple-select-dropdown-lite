// Real-browser characterization tests: layout, CSS, focus and contentEditable typing that jsdom fakes.
// Like test/MultiSelect.test.tsx, "current behavior: ..." pins known quirks of v2.0.6.
import React from 'react'
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

it('current behavior: typed custom value keeps the Create label in its chip', async () => {
  const { input, chips, option } = await setup({ customValue: true })
  await userEvent.type(input(), 'kiwi')
  await userEvent.keyboard('{Enter}')
  await expect.poll(chips).toEqual(['Create "kiwi"'])
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

it('current behavior: Tab walks into options while the menu is closed', async () => {
  const { outside, menuHeight, focused } = await setup()
  outside.focus()
  const order = []
  for (let i = 0; i < 6; i++) {
    await userEvent.tab()
    order.push(focused())
  }
  expect(order).toEqual([
    'wrapper',
    'search',
    'arrow',
    'Apple',
    'Banana',
    'Cherry'
  ])
  expect(menuHeight()).toBe(0)
})

it('current behavior: chip delete fires on any key', async () => {
  const { q, chips } = await setup({ defaultValue: 'apple,banana' })
  q('.msl-chip-delete').focus()
  await userEvent.keyboard('x')
  await expect.poll(chips).toEqual(['Banana'])
})

it('current behavior: disabled blocks the mouse but opens from the keyboard', async () => {
  const { root, menuHeight } = await setup({ disabled: true })
  expect(getComputedStyle(root).pointerEvents).toBe('none')
  root.focus()
  await userEvent.keyboard('{Enter}')
  await expect.poll(menuHeight).toBeGreaterThan(0)
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
