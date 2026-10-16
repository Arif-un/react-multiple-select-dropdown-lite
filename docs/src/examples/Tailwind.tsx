import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
// no dist/index.css: Tailwind styles every part
import './Tailwind.css'

const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Mango', value: 'mango' },
  { label: 'Orange', value: 'orange', disabled: true },
  {
    type: 'group',
    title: 'Berries',
    childs: [
      { label: 'Blueberry', value: 'blueberry' },
      { label: 'Strawberry', value: 'strawberry' }
    ]
  }
]

const button =
  'inline-flex cursor-pointer items-center justify-center rounded-full'

const classNames = {
  // open, it holds the options too, in the top layer over the page: it sets its own background
  control:
    'grid cursor-text grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-gray-400 not-data-open:hover:border-gray-600 data-open:border-gray-200 data-open:bg-white data-open:shadow-lg in-data-disabled:bg-gray-50',
  values: 'flex min-w-0 flex-wrap items-center gap-1 p-1',
  input:
    'min-w-0 flex-1 border-0 bg-transparent p-1 [font:inherit] text-inherit outline-none placeholder:text-gray-400 empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]',
  singleValue: 'truncate p-1',
  chip: 'inline-flex items-center gap-1 rounded-md bg-gray-100 py-0.5 pr-0.5 pl-1.5',
  chipDelete: `${button} size-5 text-black/60 hover:bg-gray-300 [&_svg]:size-2.5`,
  actions: 'flex items-center pr-1',
  clearButton: `${button} size-6 hover:bg-gray-200 [&_svg]:size-2.5`,
  arrowButton: `${button} size-6 hover:bg-gray-200 in-data-open:rotate-180 [&_svg]:size-5`,
  // --msl-menu-room is set on the menu; the divider sits on whichever side meets the control
  menu: 'col-span-full max-h-[min(400px,var(--msl-menu-room))] overflow-auto border-gray-200 py-1 first:border-b last:border-t',
  option:
    'mx-1.5 my-1 cursor-pointer rounded-md px-2 py-1 hover:bg-gray-100 aria-selected:text-blue-600 aria-disabled:cursor-default aria-disabled:text-gray-300 data-focused:bg-gray-100',
  // a step in per level, the title at its group's level
  group: 'ps-3',
  groupTitle:
    'my-1 me-1.5 -ms-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500',
  empty: 'mx-1.5 my-1 px-2 py-1 text-gray-400'
}

export default function Tailwind() {
  const [value, setValue] = useState<string[]>([])

  return (
    <>
      <MultiSelect
        options={options}
        onChange={setValue}
        className='w-75 rounded-lg text-sm'
        classNames={classNames}
      />
      <p className='demo-output'>value: {JSON.stringify(value)}</p>
    </>
  )
}
