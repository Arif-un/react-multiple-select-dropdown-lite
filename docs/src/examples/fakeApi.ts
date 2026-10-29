// a pretend server for the async demos: it answers after a delay, and stops on an abort as fetch does
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((ok, fail) => {
    signal.throwIfAborted()
    const t = setTimeout(ok, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      fail(signal.reason)
    })
  })

const first = [
  'Ada',
  'Alan',
  'Barbara',
  'Claude',
  'Dennis',
  'Donald',
  'Edsger',
  'Frances',
  'Grace',
  'Hedy',
  'Ivan',
  'John',
  'Ken',
  'Linus',
  'Margaret',
  'Niklaus',
  'Radia',
  'Richard',
  'Sophie',
  'Tim'
]
const last = [
  'Lovelace',
  'Turing',
  'Liskov',
  'Shannon',
  'Ritchie',
  'Knuth',
  'Dijkstra',
  'Allen',
  'Hopper',
  'Lamarr',
  'Sutherland',
  'McCarthy',
  'Thompson',
  'Torvalds',
  'Hamilton',
  'Wirth',
  'Perlman',
  'Stallman',
  'Wilson',
  'Berners-Lee'
]

// 400 people: Ada Lovelace is id 1
export const people = last.flatMap((l, j) =>
  first.map((f, i) => ({
    id: `${j * first.length + i + 1}`,
    name: `${f} ${l}`
  }))
)

// GET /api/people?q=&page=&per=: 20 a page
export async function fetchPeople(
  q: string,
  page: number,
  signal: AbortSignal,
  per = 20
) {
  await wait(400, signal)
  const hits = people.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase())
  )
  return {
    people: hits.slice((page - 1) * per, page * per),
    hasMore: page * per < hits.length
  }
}

const countries: Record<string, string[]> = {
  Europe: ['Germany', 'Norway', 'Portugal'],
  Asia: ['Bangladesh', 'Japan', 'Vietnam'],
  Americas: ['Brazil', 'Canada', 'Mexico']
}

// GET /api/regions/:region/countries
export async function fetchCountries(region: string, signal: AbortSignal) {
  await wait(500, signal)
  return countries[region]
}

// GET /api/countries/:country/cities?page=&per=&q=: 10 a page, 40 in all
export async function fetchCities(
  country: string,
  page: number,
  signal: AbortSignal,
  per = 10,
  q = ''
) {
  await wait(500, signal)
  const hits = Array.from(
    { length: 40 },
    (_, i) => `${country} city ${i + 1}`
  ).filter((c) => c.toLowerCase().includes(q.toLowerCase()))
  return {
    cities: hits.slice((page - 1) * per, page * per),
    hasMore: page * per < hits.length
  }
}

// GET /api/items?page=: 100 a page, 10,000 in all
export async function fetchItems(page: number, signal: AbortSignal) {
  await wait(300, signal)
  return {
    items: Array.from({ length: 100 }, (_, i) => {
      const n = (page - 1) * 100 + i + 1
      return { label: `Item ${n}`, value: `item-${n}` }
    }),
    hasMore: page < 100
  }
}
