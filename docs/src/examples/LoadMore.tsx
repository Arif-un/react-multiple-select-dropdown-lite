import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import { fetchCities, fetchPeople, people } from './fakeApi'

type Option = { label: string; value: string }

const city = (name: string) => ({ label: name, value: name })
const person = (p: { id: string; name: string }) => ({
  label: p.name,
  value: p.id
})
// the cities you have of a country: its first page, 5 a page
const firstCities = (country: string) =>
  Array.from({ length: 5 }, (_, i) => city(`${country} city ${i + 1}`))

// options you have, and the next page of them on demand
function usePaged(
  first: Option[],
  fetchPage: (page: number) => Promise<{ options: Option[]; hasMore: boolean }>
) {
  const [options, setOptions] = useState(first)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<unknown>()
  const onLoadMore = async () => {
    setLoading(true)
    setLoadError(undefined)
    try {
      const page = await fetchPage(options.length / 5 + 1)
      setOptions([...options, ...page.options])
      setHasMore(page.hasMore)
    } catch (error) {
      // the end row shows errorLabel, a click loads the page again
      setLoadError(error)
    } finally {
      setLoading(false)
    }
  }
  return {
    options,
    loading,
    loadError,
    onLoadMore: hasMore ? onLoadMore : undefined
  }
}

export default function LoadMore() {
  const team = usePaged(people.slice(0, 5).map(person), async (page) => {
    const r = await fetchPeople('', page, AbortSignal.timeout(10_000), 5)
    return { options: r.people.map(person), hasMore: r.hasMore }
  })
  const norway = usePaged(firstCities('Norway'), async (page) => {
    const r = await fetchCities('Norway', page, AbortSignal.timeout(10_000), 5)
    return { options: r.cities.map(city), hasMore: r.hasMore }
  })
  return (
    <MultiSelect
      loadMoreLabel='Load more'
      placeholder='Who and where'
      options={[
        // an accordion of options you have, and load more of
        {
          type: 'group',
          title: 'Norway',
          collapsible: true,
          childs: norway.options,
          loading: norway.loading,
          loadError: norway.loadError,
          onLoadMore: norway.onLoadMore
        },
        // or a loader: the cities you have are its first part, then a page from the server a click
        {
          type: 'submenu',
          title: 'Japan',
          loadMoreLabel: 'More cities',
          childs: async ({ next, signal }) => {
            if (!next) return { options: firstCities('Japan'), next: 2 }
            const r = await fetchCities('Japan', next as number, signal, 5)
            return {
              options: r.cities.map(city),
              next: r.hasMore && (next as number) + 1
            }
          }
        },
        ...team.options
      ]}
      // the people you have, under them
      loading={team.loading}
      loadError={team.loadError}
      onLoadMore={team.onLoadMore}
    />
  )
}
