import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

// collapsible groups inside submenus, and submenus inside collapsible groups
const options = [
  { label: 'All products', value: 'all' },
  {
    type: 'submenu',
    title: 'Electronics',
    childs: [
      {
        type: 'group',
        title: 'Phones',
        collapsible: true,
        childs: [
          { label: 'iPhone', value: 'iphone' },
          { label: 'Pixel', value: 'pixel' }
        ]
      },
      {
        type: 'group',
        title: 'Laptops',
        collapsible: true,
        collapsed: true,
        childs: [
          { label: 'MacBook', value: 'macbook' },
          { label: 'ThinkPad', value: 'thinkpad' }
        ]
      },
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
      { label: 'Shoes', value: 'shoes' },
      {
        type: 'submenu',
        title: 'Kids',
        childs: [
          { label: 'Jackets', value: 'jackets' },
          { label: 'Sneakers', value: 'sneakers' }
        ]
      }
    ]
  }
]

export default function NestedMenus() {
  return <MultiSelect options={options} placeholder='Categories' />
}
