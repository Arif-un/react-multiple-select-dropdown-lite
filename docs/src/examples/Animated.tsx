import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import './Animated.css'

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

export default function Animated() {
  return (
    <MultiSelect
      className='animated'
      options={options}
      placeholder='Animated'
    />
  )
}
