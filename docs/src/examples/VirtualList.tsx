import { useEffect } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import type { MultiSelectListProps } from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import { List, useListCallbackRef } from 'react-window'
import type { RowComponentProps } from 'react-window'

const options = Array.from({ length: 100_000 }, (_, i) => ({
  label: `Item ${i + 1}`,
  value: `item-${i + 1}`
}))

const Row = ({
  index,
  style,
  row
}: RowComponentProps<Pick<MultiSelectListProps, 'row'>>) => (
  // top, not react-window's transform: Firefox places a submenu off a transformed row
  <div style={{ ...style, transform: 'none', top: index * 36 }}>
    {row(index)}
  </div>
)

// renders only the rows in view
export function VirtualList({ count, row, activeIndex }: MultiSelectListProps) {
  // state, not a ref: the list can scroll once it has mounted
  const [list, setList] = useListCallbackRef(null)
  // keeps the keyboard highlight in view
  useEffect(() => {
    activeIndex >= 0 && list?.scrollToRow({ index: activeIndex })
  }, [list, activeIndex])
  return (
    <List
      listRef={setList}
      // no role="list" between the listbox and its options
      role='none'
      // no tab stop: Firefox makes a scroller one
      tabIndex={-1}
      rowComponent={Row}
      rowCount={count}
      rowHeight={36}
      rowProps={{ row }}
    />
  )
}

export default function VirtualListDemo() {
  return (
    <MultiSelect
      options={options}
      placeholder='100,000 items'
      renderList={(list) => <VirtualList {...list} />}
    />
  )
}
