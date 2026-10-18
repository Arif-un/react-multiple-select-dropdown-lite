// The stylesheet, state by state: every look checked by computed style in each engine, and in Chromium,
// which tracks the CSS rules that match, a gate that fails while any rule of src/styles.css never applied
// types cdp(): the provider's sessions
import type {} from '@vitest/browser-playwright'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { cdp, server, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { MultiSelectListProps, MultiSelectProps } from '../../src/index'
import MultiSelect from '../../src/MultiSelect'
import text from '../../src/styles.css?raw'

const chromium = server.browser === 'chromium'
// byte for byte, as users get it, in a sheet of its own: other files' frames share the page CDP sees
const MARK = '/* styles.test */'
const sheet = document.createElement('style')
sheet.textContent = text + MARK

// CDP's rule usage reports a style rule from its selector and declarations nested in an at-rule from the first one:
// those offsets, for every rule in the sheet. Comments and strings hold no braces or semicolons here
function rules(css: string) {
  const at: number[] = []
  // per open block: a style rule, or an at-rule in one, whose declarations count once
  const stack: { style: boolean; decls: boolean }[] = []
  let start = 0
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '/' && css[i + 1] === '*') {
      i = css.indexOf('*/', i + 2) + 1
      start = i + 1
    } else if (ch === '{') {
      const pre = css.slice(start, i)
      const style = !pre.trim().startsWith('@')
      style && at.push(start + pre.search(/\S/))
      stack.push({ style, decls: !style && !!stack.at(-1)?.style })
      start = i + 1
    } else if (ch === '}' || ch === ';') {
      const top = stack.at(-1)
      const decl = css.slice(start, i)
      if (ch === ';' && top?.decls && decl.trim()) {
        at.push(start + decl.search(/\S/))
        top.decls = false
      }
      ch === '}' && stack.pop()
      start = i + 1
    }
  }
  return at
}

beforeAll(async () => {
  document.head.append(sheet)
  if (!chromium) return
  await cdp().send('DOM.enable')
  await cdp().send('CSS.enable')
  await cdp().send('CSS.startRuleUsageTracking')
})

afterAll(() => sheet.remove())

const opts = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry', disabled: true }
]

const box = () => document.querySelector<HTMLElement>('.msl[data-open]')

async function setup(props: MultiSelectProps = {}, wrap = {}) {
  const screen = await render(
    <div {...wrap}>
      <MultiSelect options={opts} {...props} />
      <button>after</button>
    </div>
  )
  const root = screen.container.querySelector<HTMLElement>('.msl-wrp')!
  return {
    root,
    q: (s: string) => document.querySelector<HTMLElement>(s)!,
    option: (label: string) =>
      [...box()!.querySelectorAll<HTMLElement>('.msl-option')].find(
        (el) => el.textContent === label
      )!
  }
}

const css = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo)
// the icon after a title that opens, and the chevron in it
const icn = (title: Element) =>
  title.querySelector<HTMLElement>(':scope > .msl-expand-icn')!
const chevron = (title: Element) => icn(title).firstElementChild!
// as it ends up: options transition their background
const now = (el: Element, pseudo?: string) => {
  el.getAnimations().forEach((a) => a.finish())
  return css(el, pseudo)
}

// a value as this engine computes a color: a literal, or a variable as the stylesheet sets it.
// As a background: Firefox rounds an hsl() color and background-color apart
const probe = document.createElement('i')
probe.className = 'msl-vars'
const color = (v: string) => {
  document.body.append(probe)
  probe.style.background = v.startsWith('--') ? `var(${v})` : v
  const c = css(probe).backgroundColor
  probe.remove()
  return c
}

it('the closed box: sizes and colors from the variables, a darker border on hover', async () => {
  const { root, q } = await setup({ placeholder: 'Pick' })
  expect(css(root).width).toBe('300px')
  expect(parseFloat(css(root).lineHeight)).toBeCloseTo(
    parseFloat(css(root).fontSize) * 1.4
  )
  const ctl = q('.msl')
  expect(css(ctl).display).toBe('grid')
  expect(css(ctl).borderTopWidth).toBe('1px')
  expect(css(ctl).borderTopColor).toBe(color('--msl-border-color'))
  expect(css(ctl).borderTopLeftRadius).toBe('8px')
  expect(css(ctl).backgroundColor).toBe(color('transparent'))
  expect(css(ctl).cursor).toBe('text')
  const input = q('.msl-input')
  expect(css(input).fontSize).toBe('14px')
  expect(css(input).borderTopWidth).toBe('0px')
  expect(css(input, '::placeholder').color).toBe(
    color('--msl-placeholder-color')
  )
  expect(css(q('.msl-arrow-btn')).width).toBe('25px')
  expect(css(q('.msl-arrow-icn')).width).toBe('20px')
  await userEvent.hover(ctl)
  expect(css(ctl).borderTopColor).toBe(color('--msl-hover-border-color'))
  await userEvent.hover(q('.msl-arrow-btn'))
  expect(css(q('.msl-arrow-btn')).backgroundColor).toBe(
    color('--msl-button-hover-background')
  )
  await userEvent.unhover(q('.msl-arrow-btn'))
})

it('without a search field the placeholder shows from data-placeholder', async () => {
  const { q } = await setup({ placeholder: 'Pick', disableSearch: true })
  const el = q('.msl-input')
  expect(css(el, '::before').content).toBe('"Pick"')
  expect(css(el, '::before').color).toBe(color('--msl-placeholder-color'))
})

it('chips, their delete buttons and the clear button', async () => {
  const { q } = await setup({ defaultValue: ['apple'], clearable: true })
  const chip = q('.msl-chip')
  expect(css(chip).backgroundColor).toBe(color('--msl-chip-background'))
  expect(css(chip).borderTopLeftRadius).toBe('5px')
  const del = q('.msl-chip-delete')
  expect(css(del).color).toBe(color('--msl-chip-delete-color'))
  expect(css(del).width).toBe('20px')
  expect(css(del).borderTopLeftRadius).toBe('50%')
  expect(css(q('.msl-close-icn')).width).toBe('10px')
  await userEvent.hover(del)
  expect(css(del).backgroundColor).toBe(color('--msl-button-hover-background'))
  await userEvent.hover(q('.msl-clear-btn'))
  expect(css(q('.msl-clear-btn')).backgroundColor).toBe(
    color('--msl-button-hover-background')
  )
  await userEvent.unhover(q('.msl-clear-btn'))
})

it('the single value stays on one line', async () => {
  const { q } = await setup({ singleSelect: true, defaultValue: ['apple'] })
  const el = q('.msl-single-value')
  expect(css(el).whiteSpace).toBe('nowrap')
  expect(css(el).textOverflow).toBe('ellipsis')
})

it('disabled: a gray box that takes no pointer', async () => {
  const { root, q } = await setup({ disabled: true })
  expect(css(root).pointerEvents).toBe('none')
  expect(css(q('.msl')).backgroundColor).toBe(
    color('--msl-disabled-background')
  )
})

it('the open box: the menu look, a divider over the options, the arrow turned', async () => {
  const { root, q, option } = await setup({ defaultValue: ['apple'] })
  await userEvent.click(root)
  const ctl = box()!
  expect(ctl.classList).toContain('msl-active')
  expect(css(ctl).backgroundColor).toBe(color('--msl-active-menu-background'))
  expect(css(ctl).borderTopColor).toBe(color('--msl-active-menu-border-color'))
  expect(css(ctl).boxShadow).not.toBe('none')
  expect(css(q('.msl-arrow-btn')).rotate).toBe('180deg')
  // the open box keeps its border on hover
  await userEvent.hover(q('.msl-input-wrp'))
  expect(css(ctl).borderTopColor).toBe(color('--msl-active-menu-border-color'))
  const list = q('.msl-options')
  expect(css(list).borderTopWidth).toBe('1px')
  expect(css(list).borderTopColor).toBe(color('--msl-divider-color'))
  expect(css(list).borderBottomWidth).toBe('0px')
  expect(css(list).cursor).toBe('default')
  expect(css(list).overflowY).toBe('auto')
  const apple = option('Apple')
  expect(now(apple).color).toBe(color('--msl-option-active-color'))
  expect(css(apple).backgroundColor).toBe(
    color('--msl-option-active-background')
  )
  expect(css(option('Cherry')).color).toBe(color('--msl-option-disabled-color'))
  const banana = option('Banana')
  expect(css(banana).borderTopLeftRadius).toBe('5px')
  expect(css(banana).cursor).toBe('pointer')
  await userEvent.hover(banana)
  expect(now(banana).backgroundColor).toBe(
    color('--msl-option-hover-background')
  )
})

it('opening upward: the divider under the options', async () => {
  const { root, q } = await setup(
    {},
    { style: { paddingTop: window.innerHeight - 80 } }
  )
  await userEvent.click(root)
  expect(box()!.classList).toContain('msl-active-up')
  expect(css(box()!).backgroundColor).toBe(
    color('--msl-active-menu-background')
  )
  expect(css(q('.msl-arrow-btn')).rotate).toBe('180deg')
  expect(css(q('.msl-options')).borderBottomWidth).toBe('1px')
  expect(css(q('.msl-options')).borderTopWidth).toBe('0px')
})

it('searchInMenu: the field gets the divider, below the values or above them opening upward', async () => {
  const { root, q } = await setup({ searchInMenu: true })
  await userEvent.click(root)
  expect(css(q('.msl-search')).borderTopWidth).toBe('1px')
  expect(css(q('.msl-search')).borderTopColor).toBe(
    color('--msl-divider-color')
  )
  await userEvent.keyboard('{Escape}')
  const up = await setup(
    { searchInMenu: true },
    { style: { paddingTop: window.innerHeight - 80 } }
  )
  await userEvent.click(up.root)
  expect(box()!.classList).toContain('msl-active-up')
  const search = box()!.querySelector('.msl-search')!
  expect(css(search).borderBottomWidth).toBe('1px')
  expect(css(search).borderTopWidth).toBe('0px')
})

it('the keyboard highlight, and focus rings where focus is visible', async () => {
  const { root, q, option } = await setup({
    clearable: true,
    defaultValue: ['apple']
  })
  await userEvent.click(root)
  await userEvent.keyboard('{ArrowDown}{ArrowDown}')
  const banana = option('Banana')
  expect(banana.classList).toContain('msl-option-focused')
  expect(now(banana).backgroundColor).toBe(
    color('--msl-option-hover-background')
  )
  // a row focused from the keyboard: Enter acts on it. focusVisible: Firefox rings no focus a script moves
  banana.focus({ focusVisible: true } as FocusOptions)
  expect(css(banana).outlineStyle).toBe('solid')
  expect(css(banana).outlineColor).toBe(color('--msl-focus-color'))
  await userEvent.keyboard('{Escape}')
  // the clear button, reached by Tab
  q('.msl-input').focus()
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
  await userEvent.keyboard('{Tab}{Tab}')
  const clear = q('.msl-clear-btn')
  expect(document.activeElement).toBe(clear)
  expect(css(clear).outlineWidth).toBe('2px')
  expect(css(clear).outlineColor).toBe(color('--msl-focus-color'))
})

it('without a search field, the focused wrapper rings the box', async () => {
  const { root, q } = await setup({ disableSearch: true })
  expect(css(q('.msl')).outlineStyle).toBe('none')
  await userEvent.tab()
  expect(document.activeElement).toBe(root)
  expect(css(root).outlineStyle).toBe('none')
  expect(css(q('.msl')).outlineStyle).toBe('solid')
  expect(css(q('.msl')).outlineColor).toBe(color('--msl-focus-color'))
})

const groups = [
  { type: 'group', title: 'Fruit', childs: opts.slice(0, 2) },
  {
    type: 'group',
    title: 'Citrus',
    collapsible: true,
    childs: [{ label: 'Lime', value: 'lime' }]
  },
  {
    type: 'group',
    title: 'Nuts',
    collapsible: true,
    collapsed: true,
    childs: [{ label: 'Pecan', value: 'pecan' }]
  }
]

it('groups: indented rows under a smaller gray title; a collapsible title ends with a chevron, down when open', async () => {
  const { root, q } = await setup({ options: groups })
  await userEvent.click(root)
  const [grp] = box()!.querySelectorAll('.msl-grp')
  expect(css(grp).paddingInlineStart).toBe('12px')
  const [fruit, citrus, nuts] =
    box()!.querySelectorAll<HTMLElement>('.msl-grp-title')
  expect(css(fruit).backgroundColor).toBe(color('--msl-group-title-background'))
  expect(css(fruit).fontSize).toBe('12px')
  expect(css(fruit).opacity).toBe('0.7')
  expect(css(fruit).cursor).toBe('default')
  expect(css(fruit).marginInlineStart).toBe('-6px')
  expect(icn(fruit)).toBeNull()
  expect(css(citrus).cursor).toBe('pointer')
  expect(css(citrus).display).toBe('flex')
  expect(css(icn(citrus)).rotate).toBe('90deg')
  expect(css(icn(nuts)).rotate).toBe('none')
  // the arrow button's, turned to point to the end, its stroke 1.5px at this size
  expect(css(chevron(nuts)).rotate).toBe('-90deg')
  expect(css(chevron(nuts)).width).toBe('15px')
  expect(css(chevron(nuts)).strokeWidth).toBe('2px')
  // at the end, inside the title's padding: or at the start, by order and no auto margin
  const end = (el: HTMLElement) => el.offsetLeft + el.offsetWidth
  expect(Math.abs(end(nuts) - end(icn(nuts)) - 8)).toBeLessThanOrEqual(1)
  icn(nuts).style.cssText = 'order: -1; margin-inline-start: 0'
  expect(
    Math.abs(icn(nuts).offsetLeft - nuts.offsetLeft - 8)
  ).toBeLessThanOrEqual(1)
  icn(nuts).style.cssText = ''
  await userEvent.hover(nuts)
  expect(css(nuts).backgroundColor).toBe(color('--msl-option-hover-background'))
  await userEvent.unhover(nuts)
  // the keyboard highlight on a title
  q('.msl-input').focus()
  await userEvent.keyboard('{End}')
  expect(nuts.hasAttribute('data-focused')).toBe(true)
  expect(css(nuts).backgroundColor).toBe(color('--msl-option-hover-background'))
})

const tree = [
  { label: 'Apple', value: 'apple' },
  {
    type: 'submenu',
    title: 'Veg',
    childs: [{ label: 'Carrot', value: 'carrot' }]
  }
]

it('submenus: a title with a chevron, shaded while open, its box shaped as the menu', async () => {
  const { root, option } = await setup({
    options: tree,
    style: { '--msl-input-width': '150px' } as never
  })
  await userEvent.click(root)
  const veg = option('Veg')
  expect(css(veg).display).toBe('flex')
  expect(css(icn(veg)).rotate).toBe('none')
  expect(css(chevron(veg)).rotate).toBe('-90deg')
  await userEvent.click(veg)
  expect(veg.getAttribute('aria-expanded')).toBe('true')
  await userEvent.unhover(veg)
  expect(now(veg).backgroundColor).toBe(color('--msl-option-hover-background'))
  const sub = document.querySelector('.msl-submenu')!
  expect(css(sub).borderTopWidth).toBe('1px')
  expect(css(sub).borderTopColor).toBe(color('--msl-active-menu-border-color'))
  expect(css(sub).backgroundColor).toBe(color('--msl-active-menu-background'))
  expect(css(sub).borderTopLeftRadius).toBe('8px')
  expect(css(sub).boxShadow).not.toBe('none')
  expect(css(sub).minWidth).toBe('120px')
  expect(css(sub).marginTop).toBe('-5px')
})

it('right to left: chevrons point left, a submenu opens on the left', async () => {
  const { root, option } = await setup(
    { options: tree, style: { '--msl-input-width': '150px' } as never },
    { dir: 'rtl' }
  )
  await userEvent.click(root)
  const veg = option('Veg')
  expect(css(icn(veg)).rotate).toBe('180deg')
  await userEvent.click(veg)
  const sub = document.querySelector('.msl-submenu')!
  expect(sub.getBoundingClientRect().right).toBeCloseTo(
    veg.getBoundingClientRect().left,
    0
  )
})

const many = Array.from({ length: 40 }, (_, i) => ({
  label: `Option ${i}`,
  value: `${i}`
}))

it('a long menu scrolls with a thin scrollbar of the variable color', async () => {
  const { root, q } = await setup({ options: many })
  await userEvent.click(root)
  const list = q('.msl-options')
  expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
  // Playwright hides Firefox's scrollbars
  server.browser !== 'firefox' && expect(css(list).scrollbarWidth).toBe('thin')
  expect(css(list).scrollbarColor).toContain(color('--msl-scrollbar-color'))
})

// a virtual list's scroller: its rows, placed absolutely, give it no size of its own
const scroller = ({ count, row }: MultiSelectListProps) => (
  <div style={{ overflow: 'auto' }}>
    <div style={{ position: 'relative', height: count * 36 }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{ position: 'absolute', width: '100%', top: i * 36 }}
        >
          {row(i)}
        </div>
      ))}
    </div>
  </div>
)

it('renderList: the listbox and a submenu are flex columns that fit its scroller, a submenu as wide as the input', async () => {
  const { root, q, option } = await setup({
    options: [...tree, ...many],
    renderList: scroller
  })
  await userEvent.click(root)
  const list = q('.msl-options')
  expect(css(list).display).toBe('flex')
  expect(css(list).flexDirection).toBe('column')
  expect(list.firstElementChild!.clientHeight).toBe(list.clientHeight - 1)
  await userEvent.click(option('Veg'))
  const sub = q('.msl-submenu')
  expect(css(sub).display).toBe('flex')
  expect(sub.clientWidth).toBe(300)
})

// Chromium draws ::-webkit-scrollbar only where scrollbar-width and scrollbar-color are unset, as older engines do
it.runIf(chromium)(
  'without scrollbar-width, ::-webkit-scrollbar draws the thin scrollbar',
  async () => {
    const { root, q } = await setup({ options: many })
    await userEvent.click(root)
    const list = q('.msl-options')
    list.style.scrollbarWidth = 'auto'
    list.style.scrollbarColor = 'auto'
    expect(list.offsetWidth - list.clientWidth).toBe(8)
    expect(css(list, '::-webkit-scrollbar-thumb').backgroundColor).toBe(
      color('--msl-scrollbar-color')
    )
  }
)

it('animation hooks: options shade over 200ms; the closing box keeps the open look, then drops both at once', async () => {
  const exit = document.head.appendChild(document.createElement('style'))
  exit.textContent =
    '.msl-options { transition: opacity 10s } .msl[data-closing] .msl-options { opacity: 0 }'
  try {
    const { root, q, option } = await setup()
    await userEvent.click(root)
    expect(css(option('Apple')).transitionDuration).toBe('0.2s')
    expect(css(option('Apple')).transitionProperty).toBe('background')
    await userEvent.keyboard('{Escape}')
    const ctl = q('.msl')
    expect(ctl.hasAttribute('data-closing')).toBe(true)
    expect(ctl.classList).toContain('msl-active')
    expect(css(ctl).backgroundColor).toBe(color('--msl-active-menu-background'))
    expect(css(ctl).boxShadow).not.toBe('none')
    // both go in one commit, seen in one batch: no frame closed with data-closing
    const batches: (string | null)[][] = []
    new MutationObserver((r) =>
      batches.push(r.map((m) => m.attributeName).sort())
    ).observe(ctl, { attributeFilter: ['data-open', 'data-closing'] })
    document.getAnimations().forEach((a) => a.finish())
    await expect.poll(() => ctl.hasAttribute('data-open')).toBe(false)
    await new Promise(requestAnimationFrame)
    expect(batches).toEqual([['data-closing', 'data-open']])
    expect(css(ctl).backgroundColor).toBe(color('--msl-background'))
  } finally {
    exit.remove()
  }
})

it.runIf(chromium)('no motion when the user asks for less', async () => {
  await cdp().send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  })
  try {
    const { root, option } = await setup()
    await userEvent.click(root)
    expect(css(option('Apple')).transitionDuration).toBe('0s')
  } finally {
    await cdp().send('Emulation.setEmulatedMedia', { features: [] })
  }
})

// last: the file's tests above apply every rule
it.runIf(chromium)('applies every rule of the stylesheet', async () => {
  const s = cdp()
  const { ruleUsage } = await s.send('CSS.stopRuleUsageTracking')
  let id = ''
  for (const u of new Set(ruleUsage.map((u) => u.styleSheetId))) {
    const sheet = await s.send('CSS.getStyleSheetText', { styleSheetId: u })
    sheet.text.endsWith(MARK) && (id = u)
  }
  expect(id).not.toBe('')
  const used = new Set(
    ruleUsage
      .filter((u) => u.styleSheetId === id && u.used)
      .map((u) => u.startOffset)
  )
  const all = rules(text)
  // the parser misses none: a block per rule but at-rules, plus the declarations in .msl-option's @media
  const blocks = text.split('{').length - 1
  expect(all.length).toBe(blocks - text.match(/@[\w-]+[^{;]*\{/g)!.length + 1)
  const unused = all
    .filter((at) => !used.has(at))
    .map((at) => text.slice(at).split(/[{;]/)[0].trim())
  expect(unused).toEqual([])
})
