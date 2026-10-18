import MultiSelect from 'react-multiple-select-dropdown-lite'
// no dist/index.css: Tailwind styles and animates every part
import './tailwind-demos.css'

const options = [
  { label: 'All products', value: 'all' },
  {
    type: 'submenu',
    title: 'Electronics',
    childs: [
      { label: 'Phones', value: 'phones' },
      { label: 'Laptops', value: 'laptops' },
      {
        type: 'submenu',
        title: 'Accessories',
        childs: [
          { label: 'Chargers', value: 'chargers' },
          { label: 'Cases', value: 'cases' }
        ]
      }
    ]
  },
  {
    type: 'group',
    title: 'Clothing',
    collapsible: true,
    childs: [
      { label: 'Shirts', value: 'shirts' },
      { label: 'Shoes', value: 'shoes' }
    ]
  }
]

const button =
  'inline-flex cursor-pointer items-center justify-center rounded-full'
// a chevron after a title with aria-expanded, open or not
const chevron =
  '[&[aria-expanded]]:flex [&[aria-expanded]]:items-center [&[aria-expanded]]:justify-between [&[aria-expanded]]:after:ms-2 [&[aria-expanded]]:after:size-1.5 [&[aria-expanded]]:after:shrink-0 [&[aria-expanded]]:after:border-r-[1.5px] [&[aria-expanded]]:after:border-b-[1.5px] [&[aria-expanded]]:after:transition-[rotate]'

const classNames = {
  // the open box grows to fit the options, and shrinks back: their grid row goes from 0fr to 1fr.
  // Opening upward the options come first: they only fade
  control:
    'grid cursor-text grid-cols-[minmax(0,1fr)_auto] grid-rows-[max-content_0fr] overflow-hidden rounded-lg border border-gray-400 transition-[grid-template-rows] duration-200 not-data-open:hover:border-gray-600 data-open:grid-rows-[max-content_1fr] data-open:border-gray-200 data-open:bg-white data-open:shadow-lg data-open:data-up:grid-rows-[1fr_max-content] data-closing:not-data-up:grid-rows-[max-content_0fr]',
  values: 'flex min-w-0 flex-wrap items-center gap-1 p-1',
  input:
    'min-w-0 flex-1 border-0 bg-transparent p-1 [font:inherit] text-inherit outline-none placeholder:text-gray-400 empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]',
  chip: 'inline-flex items-center gap-1 rounded-md bg-gray-100 py-0.5 pr-0.5 pl-1.5',
  chipDelete: `${button} size-5 text-black/60 hover:bg-gray-300 [&_svg]:size-2.5`,
  actions: 'flex items-center pr-1',
  clearButton: `${button} size-6 hover:bg-gray-200 [&_svg]:size-2.5`,
  arrowButton: `${button} size-6 transition-[rotate] hover:bg-gray-200 in-data-open:rotate-180 [&_svg]:size-5`,
  // no vertical padding: squeezed to 0fr, the row keeps the menu's padding in Chrome
  menu: 'col-span-full max-h-[min(400px,var(--msl-menu-room))] overflow-auto border-t border-gray-200 transition-opacity duration-200 in-data-up:border-t-0 in-data-up:border-b starting:opacity-0 in-data-closing:opacity-0',
  // a popover with no stylesheet: placed beside its title with CSS anchor positioning, on the other side without room
  submenu:
    'm-0 -mt-1.5 inset-auto [position-area:right_span-bottom] max-h-[400px] w-max min-w-30 overflow-auto rounded-lg border border-gray-200 bg-white p-0 text-inherit shadow-lg transition-[opacity,translate] duration-150 [position-try-fallbacks:flip-inline,flip-block] starting:-translate-x-1.5 starting:opacity-0 data-closing:opacity-0 rtl:[position-area:none] rtl:top-[anchor(top)] rtl:right-[anchor(left)]',
  // in and out with the menu, a submenu, or their group
  option: `mx-1.5 my-1 cursor-pointer rounded-md px-2 py-1 transition-[opacity,background-color] duration-150 hover:bg-gray-100 aria-selected:text-blue-600 aria-disabled:cursor-default aria-disabled:text-gray-300 aria-expanded:bg-gray-100 data-focused:bg-gray-100 starting:opacity-0 in-data-closing:opacity-0 ${chevron} [&[aria-expanded]]:after:-rotate-45`,
  group: 'ps-3',
  // a collapsible group slides open and shut: the one box in its body, a grid row from 0fr to 1fr
  groupBody:
    'grid grid-rows-[1fr] transition-[grid-template-rows] duration-200 starting:grid-rows-[0fr] data-closing:grid-rows-[0fr] *:min-h-0 *:overflow-hidden',
  groupTitle: `my-1 me-1.5 -ms-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500 data-focused:bg-gray-100 [&[aria-expanded]]:cursor-pointer [&[aria-expanded]]:hover:bg-gray-100 ${chevron} aria-[expanded=false]:after:-rotate-45 aria-expanded:after:rotate-45`,
  empty: 'mx-1.5 my-1 px-2 py-1 text-gray-400'
}

export default function TailwindAnimated() {
  return (
    <MultiSelect
      options={options}
      placeholder='Animated'
      className='w-75 rounded-lg text-sm'
      classNames={classNames}
    />
  )
}
