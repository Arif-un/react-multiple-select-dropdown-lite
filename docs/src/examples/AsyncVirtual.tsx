import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import { fetchItems } from './fakeApi'
import { VirtualList } from './VirtualList'

export default function AsyncVirtual() {
  return (
    <MultiSelect
      loadOptions={async ({ next = 1, signal }) => {
        const { items, hasMore } = await fetchItems(next, signal)
        return { options: items, next: hasMore && next + 1 }
      }}
      disableSearch
      placeholder='10,000 items, 100 at a time'
      renderList={(list) => <VirtualList {...list} />}
    />
  )
}
