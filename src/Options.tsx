import { useLayoutEffect, useRef } from 'react'
import type {
  HTMLAttributes,
  KeyboardEvent,
  ReactElement,
  ReactNode
} from 'react'
import type {
  MultiSelectClassNames,
  MultiSelectGroup,
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

// marks el closing, then calls back once the animations that starts end, at once if none: no durations in JS
export function leave(el: Element, then: () => void) {
  const old = anims(el)
  el.setAttribute('data-closing', '')
  const all = anims(el).filter((a) => !old.includes(a))
  all.length
    ? Promise.allSettled(all.map((a) => a.finished)).then(then)
    : then()
}

// el is going: a copy takes its place, inert, until it has left
function ghost(el: HTMLElement) {
  const copy = el.cloneNode(true) as HTMLElement
  const top = el.hasAttribute('popover')
  copy.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'))
  copy.setAttribute('inert', '')
  if (top) {
    // where it was: its title may place another submenu now.
    // ponytail: a transform running on it (an enter translate) shifts the copy; offsetLeft/Top if that shows.
    // A submenu open in it stays hidden in the copy, a popover never shown: pop the copy's [popover]s if that shows
    const r = el.getBoundingClientRect()
    copy.style.cssText += `;position-anchor:none;inset:auto;left:${r.left}px;top:${r.top}px;margin:0`
  }
  el.after(copy)
  top && pop(copy)
  // strict mode's test unmount: el stays
  queueMicrotask(() => el.isConnected && copy.remove())
  // a new element: its enter animations would run again
  anims(copy).forEach((a) => a.finish())
  leave(copy, () => copy.remove())
}

// a box that leaves a copy of itself when it goes. top: a submenu, shown in the top layer
function Leave({
  top,
  ...p
}: HTMLAttributes<HTMLDivElement> & { top?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current!
    // back before its copy left: the copy goes
    const prev = el.previousElementSibling
    prev?.hasAttribute('data-closing') && prev.remove()
    top && pop(el)
    return () => ghost(el)
  }, [])
  return <div ref={ref} {...p} />
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
  cn
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
}) {
  // counts rows, like walk
  let n = 0
  let g = 0
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
    'data-focused': idx === activeIdx || undefined
  })
  // static group titles are -1, as is activeIdx with no highlight
  const focused = (idx: number) =>
    idx >= 0 && idx === activeIdx ? ' msl-option-focused' : ''
  // depth: submenus around it, which name the anchors that place them
  function addInArr(
    opts: Item[],
    out: ReactElement[],
    pre: string,
    depth: number
  ) {
    for (const [i, opt] of opts.entries()) {
      const key = pre + i
      if (isGroup(opt)) {
        const sub = opt.type === 'submenu'
        const shown = isOpen(opt, key)
        const idx = titled(opt) ? n++ : -1
        // the title names the group, as in the APG grouped listbox
        const titleId = idx < 0 ? `${listId}-g${g++}` : `${listId}-${idx}`
        const childs: ReactElement[] = []
        if (shown && opt.childs.length > 0) {
          addInArr(
            opt.childs as Item[],
            childs,
            key + '.',
            sub ? depth + 1 : depth
          )
        } else if (shown) {
          childs.push(
            <div
              key='msl-grp-empty'
              className={`msl-option msl-option-disable ${cn.empty ?? ''}`}
            >
              {opt.emptyDataLabel || 'No Data Found'}
            </div>
          )
        }
        const anchor = `--msl-${depth}`
        if (sub) {
          out.push(
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
          )
          // beside its title in the top layer, placed by the stylesheet. In the listbox all the same
          shown &&
            out.push(
              <Leave
                top
                key={key + 'm'}
                role='group'
                aria-labelledby={titleId}
                style={{ positionAnchor: anchor }}
                className={`msl-submenu ${cn.submenu ?? ''}`}
              >
                {childs}
              </Leave>
            )
        } else {
          out.push(
            <div
              key={key}
              role='group'
              aria-labelledby={titleId}
              className={`msl-grp ${cn.group ?? ''}`}
            >
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
              {idx < 0
                ? childs
                : shown && (
                    <Leave className={`msl-grp-body ${cn.groupBody ?? ''}`}>
                      {/* one box: as a grid row from 0fr to 1fr, CSS animates its height */}
                      <div>{childs}</div>
                    </Leave>
                  )}
            </div>
          )
        }
      } else {
        const idx = n++
        // getLabel once: it may build JSX
        const label = labelOf(opt)
        const off = isDisabled(opt)
        out.push(
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
      }
    }
    return out
  }
  return <>{addInArr(opts as Item[], [], '', 0)}</>
}

export default Options
