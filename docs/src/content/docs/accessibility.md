---
title: Accessibility
description: Keyboard support and ARIA in react-multiple-select-dropdown-lite.
---

## Keyboard

| Key             | Action                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Arrow Down / Up | open the menu and move the highlight over enabled options                                        |
| Home / End      | first / last option (in the search field only while it is empty)                                 |
| Enter           | pick the highlighted option, else the first search result that isn't `disabled`                  |
| , (comma)       | pick the first search result that isn't `disabled`, or create the typed value with `customValue` |
| Backspace       | in an empty search field, remove the last chip                                                   |
| Escape          | close the menu, not a surrounding dialog or popover                                              |
| Tab             | close the menu and move on in page order, after any button in the menu                           |
| Enter / Space   | on a chip's delete button or the clear button, press it                                          |
| any character   | on the focused dropdown, open the menu                                                           |

Typing with an input method (Chinese, Japanese, Korean) works: the Enter that confirms the composition doesn't pick an option.

## ARIA

The search field, or the dropdown itself when there is no search field, is a [combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) that controls a listbox:

- `aria-expanded`, `aria-haspopup="listbox"` and, while open, `aria-controls` on the combobox
- the `aria-*` from `attr` (`aria-describedby`, `aria-invalid`, `aria-required`, ...) on the combobox too, so an error stays announced while the menu is open
- `aria-activedescendant` points at the keyboard-highlighted option
- options have `role="option"`, `aria-selected` and `aria-disabled`
- groups are `role="group"`, named by their title
- a disabled dropdown leaves the tab order

Ids come from `useId` on React 18+, so server and client markup match.

## Give it a name

Name the dropdown through `attr`, like any form control:

```tsx
<label id='fruits-label'>Fruits</label>
<MultiSelect options={options} attr={{ 'aria-labelledby': 'fruits-label' }} />

<MultiSelect options={options} attr={{ 'aria-label': 'Fruits' }} />
```
