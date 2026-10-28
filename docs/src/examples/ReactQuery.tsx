import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery
} from '@tanstack/react-query'
import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import { fetchPeople, people } from './fakeApi'

const queryClient = new QueryClient()

type Person = { id: string; name: string }

function PeoplePicker() {
  const [search, setSearch] = useState('')
  // the selected people themselves: they name their values whatever the search
  const [value, setValue] = useState<Person[]>([people[0]])
  const q = useInfiniteQuery({
    queryKey: ['people', search],
    queryFn: ({ pageParam, signal }) => fetchPeople(search, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last, all) =>
      last.hasMore ? all.length + 1 : undefined,
    staleTime: 60_000
  })
  return (
    <MultiSelect
      options={q.data?.pages.flatMap((page) => page.people) ?? []}
      getLabel={(person) => person.name}
      getValue={(person) => person.id}
      value={value}
      onChange={(_, selected) => setValue(selected)}
      onSearch={setSearch}
      loading={q.isFetching}
      loadError={q.error}
      onLoadMore={
        q.hasNextPage ? q.fetchNextPage : q.isError ? q.refetch : undefined
      }
      placeholder='Search people'
    />
  )
}

export default function ReactQuery() {
  return (
    <QueryClientProvider client={queryClient}>
      <PeoplePicker />
    </QueryClientProvider>
  )
}
