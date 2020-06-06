import React from 'react';
import './App.css';
import MultiSelectDropdown from './MultiSelectDropdown';

function App() {
   // multiselect
  // creatable
  // icon
  // searchable
  // group
  // select limit

  const options = [
    { label: "option 1", value: "opt1", icon: "red" },
    { label: "Option 2", value: "opt2", icon: "red" },
    { label: "Option 3", value: "opt3", icon: "red" }
  ];

  return (
    <div>
      <MultiSelectDropdown width={300} options={options} />
    </div>
  );
}

export default App;
