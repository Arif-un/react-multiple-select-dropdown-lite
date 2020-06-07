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
    { label: "option 1", value: "opt 1", icon: "red" },
    { label: "Option 2", value: "opt2", icon: "red" },
    { label: "Option 3", value: "opt3", icon: "red", disabled: true },
    { label: "Option asdf asdf asd fad fdsdfasf assdfdasf adf 3", value: "opt4", icon: "red" },
    { label: "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww", value: "opt5", icon: "red" },
  ];

  const handleChange = val => {
    setval(val)
  }


  return (
    <div>
      {/* <Test /> */}
      <h3>{typeof val === 'object' ? val.map((itm, i) => <span key={`i-${i + 9}`}>{itm.label}</span>) : 'strng ' + val}</h3>
      <MultiSelectDropdown
        // clearable={false}
        // downArrow={false}
        // jsonValue
        // defaultValue={"opt2,opt 1,''"}
        //defaultValue={[{ label: "option 1", value: "opt 1", icon: "red", style: { background: 'red' } },
        //{ label: "Option 2", value: "opt2", icon: "red" },]}
         singleSelect={false}
        disableChip={true}
        options={options}
        onChange={handleChange}
      />
    </div>
  );
}

export default App;
