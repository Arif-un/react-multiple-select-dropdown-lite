import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import type { MultiSelectListProps } from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

// renders only the rows in view, measured: group titles are shorter than options
export function TanstackList({
  count,
  row,
  activeIndex
}: MultiSelectListProps) {
  const ref = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => ref.current,
    estimateSize: () => 36
  })
  // keeps the keyboard highlight in view
  useEffect(() => {
    activeIndex >= 0 && virtualizer.scrollToIndex(activeIndex)
  }, [activeIndex])
  return (
    // no tab stop: Firefox makes a scroller one
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
              // top, not a transform: Firefox places a submenu off a transformed row
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

const items = (name: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    label: `${name} ${i + 1}`,
    value: `${name.toLowerCase()}-${i + 1}`
  }))

// every kind of row: a disabled option, a group in a group, collapsible and collapsed groups, a submenu in a
// group, a group in a submenu, a submenu in a submenu, an empty group and long lists
export const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Dragon fruit (out of season)', value: 'dragon', disabled: true },
  {
    type: 'group',
    title: 'Berries',
    childs: [
      { label: 'Blueberry', value: 'blueberry' },
      {
        type: 'group',
        title: 'Wild',
        childs: [{ label: 'Cloudberry', value: 'cloudberry' }]
      }
    ]
  },
  {
    type: 'group',
    title: 'Citrus',
    collapsible: true,
    childs: [
      { label: 'Lemon', value: 'lemon' },
      {
        type: 'submenu',
        title: 'More citrus',
        childs: [
          { label: 'Grapefruit', value: 'grapefruit' },
          { label: 'Yuzu', value: 'yuzu' }
        ]
      }
    ]
  },
  {
    type: 'submenu',
    title: 'Vegetables',
    childs: [
      { label: 'Carrot', value: 'carrot' },
      {
        type: 'group',
        title: 'Leafy greens',
        collapsible: true,
        collapsed: true,
        childs: [
          { label: 'Kale', value: 'kale' },
          { label: 'Spinach', value: 'spinach' }
        ]
      },
      {
        type: 'submenu',
        title: '1,000 more',
        childs: items('Vegetable', 1000)
      }
    ]
  },
  {
    type: 'group',
    title: 'Exotic',
    childs: [],
    emptyDataLabel: 'Out of season'
  },
  {
    type: 'group',
    title: '10,000 items',
    collapsible: true,
    collapsed: true,
    childs: items('Item', 10_000)
  }
]

export default function TanstackVirtual() {
  return (
    <MultiSelect
      options={options}
      placeholder='Every kind of row'
      renderList={(list) => <TanstackList {...list} />}
    />
  )
}
