import React, { useState } from 'react';
import './App.css';
import MultiSelectDropdown from './MultiSelectDropdown';

function App() {
  // multiselect
  // creatable
  // searchable
  // group
  // select limit
  const [val, setval] = useState([])
  const options = [
    { label: "option 1", value: "opt1", icon: "red" },
    { label: "Option 2", value: "opt2", icon: "red" },
    { label: "Option 3", value: "opt3", icon: "red" },
    { label: "Option asdf asdf asd fad fdsdfasf assdfdasf adf 3", value: "opt4", icon: "red" },
    { label: "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww", value: "opt5", icon: "red" },
  ];

  const handleChange = val => {
    setval(val)
  }


  return (
    <div>
      {/* <Test /> */}
      <h3>{val.map((itm, i) => <span key={`i-${i + 9}`}>{itm.label}</span>)}</h3>
      <MultiSelectDropdown width={300} options={options} onChange={handleChange} />
    </div>
  );
}

export default App;
