---
title: Next.js and SSR
description: Use react-multiple-select-dropdown-lite with server rendering and the Next.js App Router.
---

Server rendering works on React 16 to 19, and the markup hydrates without id mismatches.

## Next.js App Router

The bundles start with `'use client'`, so a Server Component can import the dropdown directly as long as it passes only serializable props, for example inside a form:

```tsx
// app/page.tsx (Server Component)
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

export default function Page() {
  return (
    <form action='/api/subscribe'>
      <MultiSelect name='topics' options={[{ label: 'News', value: 'news' }]} />
      <button>Subscribe</button>
    </form>
  )
}
```

The hidden input named by `name` submits the selected values joined by commas.

To handle `onChange` (a function can't cross from server to client), render it from your own Client Component:

```tsx
'use client'
import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'

export default function TopicPicker() {
  const [topics, setTopics] = useState<string[]>([])
  return (
    <MultiSelect
      options={[{ label: 'News', value: 'news' }]}
      onChange={setTopics}
    />
  )
}
```
