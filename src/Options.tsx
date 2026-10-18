import { useLayoutEffect, useRef } from 'react'
import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import type {
  MultiSelectClassNames,
  MultiSelectGroup,
  MultiSelectListProps,
  MultiSelectOption
} from './index'

// options and groups share one loop, told apart by `type` at runtime
type Item = MultiSelectOption & MultiSelectGroup
// key: the place in the tree, '0.2.1'. level: the key of the submenu it is in, '' at the top
export type Row = { opt: Item; key: string; level: string }

export const isGroup = (opt: MultiSelectOption | MultiSelectGroup) =>
  opt.type === 'group' || opt.type === 'submenu'
// the title of a collapsible group or a submenu is a row: the keyboard reaches it
const titled = (g: Item) => g.type === 'submenu' || !!g.collapsible

// into the top layer, where the browser has the API
export const pop = (el: HTMLElement | null) => {
  if (el?.showPopover) {
    el.setAttribute('popover', 'manual')
    el.showPopover()
  }
}

// the finite CSS animations and transitions running in el and below: an infinite one never ends. Missing in jsdom
const anims = (el: Element) =>
  (el.getAnimations?.({ subtree: true }) ?? []).filter(
    (a) => (a.effect!.getComputedTiming().endTime as number) < Infinity
  )

// calls back once these animations end, at once if none: no durations in JS
const ended = (all: Animation[], then: () => void) =>
  all.length
    ? Promise.allSettled(all.map((a) => a.finished)).then(then)
    : then()

// marks el closing: the animations that starts
const closing = (el: Element) => {
  const old = anims(el)
  el.setAttribute('data-closing', '')
  return anims(el).filter((a) => !old.includes(a))
}

// marks el closing, then calls back once the animations that starts end
export const leave = (el: Element, then: () => void) => ended(closing(el), then)

// whether marking el closing would start animations, unmarked again: without exit CSS it goes at once
export function exits(el: Element) {
  const n = closing(el).length
  el.removeAttribute('data-closing')
  return n > 0
}

// el is going: a focused row in it (a click focuses one) would drop focus to the body. The listbox takes it, where
// keys still reach the combobox and a close finds it
const keep = (el: HTMLElement) =>
  el.contains((el.getRootNode() as Document).activeElement) &&
  el.closest<HTMLElement>('.msl-options')!.focus({ preventScroll: true })

// el is going: a copy takes its place, inert, until it has left
function ghost(el: HTMLElement) {
  if (!exits(el)) return
  const copy = el.cloneNode(true) as HTMLElement
  const top = el.hasAttribute('popover')
  // it names nothing: no ids, and no anchor a submenu opening at that depth would find
  copy.querySelectorAll<HTMLElement>('[id]').forEach((e) => {
    e.removeAttribute('id')
    e.style.anchorName = ''
  })
  copy.setAttribute('inert', '')
  // a submenu's in the listbox: what holds it may go too (a search's box of rows, a virtual list's row, the
  // submenu around it, whose copy drops this one)
  top ? el.closest('.msl-options')!.append(copy) : el.after(copy)
  if (top) {
    // where it was: its title may place another submenu now.
    // ponytail: a transform running on it (an enter translate) shifts the copy; offsetLeft/Top if that shows
    const r = el.getBoundingClientRect()
    copy.style.cssText += `;position-anchor:none;inset:auto;left:${r.left}px;top:${r.top}px;margin:0`
    pop(copy)
    // scrolled as it was, a virtual list's scroller in it too: a clone starts at the top. Paired while the trees match
    const to = [copy, ...copy.querySelectorAll('*')]
    ;[el, ...el.querySelectorAll('*')].forEach(
      (e, i) => (to[i].scrollTop = e.scrollTop)
    )
  }
  // a submenu open in it, never shown in the copy, where a stylesheet's display (data-custom's) would show it all
  // the same. It leaves a copy of its own
  copy.querySelectorAll('[popover]').forEach((e) => e.remove())
  // strict mode's test unmount: el stays
  queueMicrotask(() => el.isConnected && copy.remove())
  // a new element: its enter animations would run again
  anims(copy).forEach((a) => a.finish())
  leave(copy, () => copy.remove())
}

// a box that leaves a copy of itself when it goes. top: a submenu, in the top layer where CSS places it there
function Leave({
  top,
  ...p
}: HTMLAttributes<HTMLDivElement> & { top?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current!
    // back before its copy left: the copy goes. A submenu's, in the listbox, has its label
    const prev = top
      ? el
          .closest('.msl-options')!
          .querySelector(
            `[data-closing][aria-labelledby="${p['aria-labelledby']}"]`
          )
      : el.previousElementSibling
    prev?.hasAttribute('data-closing') && prev.remove()
    // beside its title with CSS anchor positioning. Without it, in the flow under its title: the top layer would
    // show it at the corner of the page. No CSS in older jsdom.
    // Mounting with the submenus open in it (a virtual list's row scrolled back), it shows after them, as effects
    // run child first: they show again, over it
    top &&
      globalThis.CSS?.supports('position-area:right') &&
      [el, ...el.querySelectorAll<HTMLElement>('.msl-submenu')].forEach((e) => {
        e.removeAttribute('popover')
        pop(e)
      })
    // Firefox holds the frame its enter animations were at when a submenu a fallback placed resized (a virtual list
    // measuring its rows): placed again once they end, it shows
    top &&
      ended(anims(el), () => {
        el.style.positionTryFallbacks = 'none'
        el.getBoundingClientRect()
        el.style.positionTryFallbacks = ''
      })
    return () => {
      keep(el)
      ghost(el)
    }
  }, [])
  return <div ref={ref} {...p} />
}

// a row of renderList's: one the virtual list unmounts (scrolled away) keeps focus in the listbox. No layout room
function Kept({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current!
    return () => {
      keep(el)
    }
  }, [])
  return (
    <div ref={ref} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}

// rows in render order, as Options walks them: a collapsed group's or a closed submenu's childs are not rendered
export function walk(
  items: ReadonlyArray<MultiSelectOption | MultiSelectGroup>,
  isOpen: (g: MultiSelectGroup, key: string) => boolean,
  out: Row[] = [],
  pre = '',
  level = ''
) {
  ;(items as Item[]).forEach((opt, i) => {
    const key = pre + i
    if (!isGroup(opt) || titled(opt)) out.push({ opt, key, level })
    isGroup(opt) &&
      isOpen(opt, key) &&
      walk(
        opt.childs,
        isOpen,
        out,
        key + '.',
        opt.type === 'submenu' ? key : level
      )
  })
  return out
}

function Options({
  opts,
  isOpen,
  expand,
  hover,
  addValue,
  checkValueExist,
  isDisabled,
  listId,
  activeIdx,
  valueOf,
  labelOf,
  textOf,
  cn,
  renderList,
  term
}: {
  opts: ReadonlyArray<MultiSelectOption | MultiSelectGroup>
  isOpen: (g: MultiSelectGroup, key: string) => boolean
  expand: (idx: number) => void
  hover: (idx: number) => void
  addValue: (opt: MultiSelectOption) => void
  checkValueExist: (opt: MultiSelectOption) => boolean
  isDisabled: (opt: MultiSelectOption) => boolean
  listId: string
  activeIdx: number
  valueOf: (opt: MultiSelectOption) => string
  labelOf: (opt: MultiSelectOption) => ReactNode
  textOf: (opt: MultiSelectOption, label?: ReactNode) => string
  cn: MultiSelectClassNames
  renderList?: (list: MultiSelectListProps) => ReactNode
  term: string
}) {
  // counts rows, like walk
  let n = 0
  let g = 0
  // with renderList, an option row's place in its list, and the list: only the rows it shows are there to count
  const place: [number, List][] = []
  // what options and titles share: Enter on a focused row (no search field) acts on it, not on the highlighted one
  const row = (idx: number, act: () => void) => ({
    id: `${listId}-${idx}`,
    role: 'option',
    tabIndex: -1,
    onClick: act,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.stopPropagation()
        act()
      }
    },
    onMouseEnter: () => hover(idx),
    'data-focused': idx === activeIdx || undefined,
    'aria-posinset': place[idx]?.[0],
    'aria-setsize': place[idx]?.[1].size
  })
  // static group titles are -1, as is activeIdx with no highlight
  const hit = (idx: number) => idx >= 0 && idx === activeIdx
  const focused = (idx: number) => (hit(idx) ? ' msl-option-focused' : '')
  const grp = `msl-grp ${cn.group ?? ''}`
  // for renderList: the rows of the menu or of an open submenu, groups flattened, a function per row, so only
  // the rows it shows render. active: the highlight's row. size: its option rows
  type List = { rows: (() => ReactNode)[]; active: number; size: number }
  // a row past the end is nothing: a virtual list may ask for one as the rows shrink
  const list = ({ rows, active }: List) =>
    renderList!({
      count: rows.length,
      row: (i) => rows[i]?.(),
      activeIndex: active
    })
  // el now, or as a row of `to` in a msl-grp box per group around it there, so it indents as in the group
  const add = (
    out: ReactNode[],
    to: List,
    groups: number,
    idx: number,
    el: () => ReactNode
  ) => {
    hit(idx) && (to.active = to.rows.length)
    if (!renderList) return out.push(el())
    idx >= 0 && (place[idx] = [++to.size, to])
    to.rows.push(() => {
      let r = el()
      for (let d = groups; d--;) r = <div className={grp}>{r}</div>
      return <Kept>{r}</Kept>
    })
  }
  // depth: submenus around it, which name the anchors that place them.
  // to, groups: with renderList, the list it goes in and the groups around it there
  function addInArr(
    opts: Item[],
    out: ReactNode[],
    pre: string,
    depth: number,
    to: List,
    groups: number
  ) {
    for (const [i, opt] of opts.entries()) {
      const key = pre + i
      if (isGroup(opt)) {
        const sub = opt.type === 'submenu'
        const shown = isOpen(opt, key)
        const idx = titled(opt) ? n++ : -1
        // the title names the group, as in the APG grouped listbox
        const titleId = idx < 0 ? `${listId}-g${g++}` : `${listId}-${idx}`
        const anchor = `--msl-${depth}`
        // a submenu's rows are a list of their own, a group's go on in its list
        const inner: List = sub ? { rows: [], active: -1, size: 0 } : to
        const ins = sub ? 0 : groups + 1
        const childs: ReactNode[] = []
        // built as it renders: with renderList, once its list's size is known
        const title = () =>
          sub ? (
            <div
              key={key}
              {...row(idx, () => expand(idx))}
              aria-expanded={shown}
              // only while open: one per depth, so each open submenu finds its title
              style={shown ? { anchorName: anchor } : undefined}
              className={`msl-option${focused(idx)} ${cn.option ?? ''}`}
            >
              {opt.title}
            </div>
          ) : (
            <div
              {...(idx < 0
                ? { id: titleId, role: 'presentation' }
                : {
                    ...row(idx, () => expand(idx)),
                    'aria-expanded': shown
                  })}
              className={`msl-grp-title${focused(idx)} ${cn.groupTitle ?? ''}`}
            >
              {opt.title}
            </div>
          )
        // with renderList a row: a group's title, in its own box as in the tree, or a submenu's with its popover,
        // which goes as the list unmounts its anchor. Rendered once the rows are all in, menu set by then
        renderList &&
          add(out, to, sub ? groups : ins, idx, () => (
            <>
              {title()}
              {menu}
            </>
          ))
        if (shown && opt.childs.length > 0) {
          addInArr(
            opt.childs as Item[],
            childs,
            key + '.',
            sub ? depth + 1 : depth,
            inner,
            ins
          )
        } else if (shown) {
          add(childs, inner, ins, -1, () => (
            <div
              key='msl-grp-empty'
              className={`msl-option msl-option-disable ${cn.empty ?? ''}`}
            >
              {opt.emptyDataLabel || 'No Data Found'}
            </div>
          ))
        }
        // beside its title in the top layer, placed by the stylesheet. In the listbox all the same
        const menu = sub && shown && (
          <Leave
            top
            key={key + 'm'}
            role='group'
            aria-labelledby={titleId}
            style={{ positionAnchor: anchor }}
            // a pause in it holds it, as one on its title: a row crossed on the way in would close it, the pointer
            // on a part of it no row (a group's title, a gap)
            onMouseEnter={() => hover(idx)}
            // a flex column too: a scroller of renderList's shrinks to its height
            data-custom={renderList && ''}
            className={`msl-submenu ${cn.submenu ?? ''}`}
          >
            {renderList ? list(inner) : childs}
          </Leave>
        )
        renderList ||
          out.push(
            sub ? (
              title()
            ) : (
              <div
                key={key}
                role='group'
                aria-labelledby={titleId}
                className={grp}
              >
                {title()}
                {idx < 0
                  ? childs
                  : shown && (
                      <Leave className={`msl-grp-body ${cn.groupBody ?? ''}`}>
                        {/* one box: as a grid row from 0fr to 1fr, CSS animates its height */}
                        <div>{childs}</div>
                      </Leave>
                    )}
              </div>
            ),
            menu
          )
      } else {
        const idx = n++
        add(out, to, groups, idx, () => {
          // getLabel once: it may build JSX
          const label = labelOf(opt)
          const off = isDisabled(opt)
          return (
            <div
              {...row(idx, () => {
                // opt.disabled, not off: past the limit a pick still calls onChange, the value unchanged
                !opt.disabled && addValue(opt)
              })}
              aria-selected={checkValueExist(opt)}
              aria-disabled={off}
              key={`${i}-${valueOf(opt)}`}
              style={opt.style}
              title={textOf(opt, label)}
              className={`msl-option ${
                checkValueExist(opt) ? 'msl-option-active' : ''
              } ${off ? 'msl-option-disable' : ''} ${
                opt.classes ?? ''
              }${focused(idx)} ${cn.option ?? ''}`}
              // @ts-expect-error value is not a div attribute; kept, users and tests read it
              value={valueOf(opt)}
            >
              {label}
            </div>
          )
        })
      }
    }
    return out
  }
  const top: List = { rows: [], active: -1, size: 0 }
  const tree = addInArr(opts as Item[], [], '', 0, top, 0)
  // a new box per search, its rows in before it goes in: WebKit rechecks a page's :has(~ …) rule (Starlight's)
  // for every row added to a live list, and thousands hang it. No layout room.
  // ponytail: options growing while open still go in one by one; key on their count too if that hangs
  return renderList ? (
    list(top)
  ) : (
    <div key={term} style={{ display: 'contents' }}>
      {tree}
    </div>
  )
}

export default Options
