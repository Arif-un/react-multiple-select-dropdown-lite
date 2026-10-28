---
title: Accessibility
description: Keyboard support and ARIA in react-multiple-select-dropdown-lite.
---

## Keyboard

| Key             | Action                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Arrow Down / Up | open the menu and move the highlight over enabled options (within the submenu it is in)                                    |
| Arrow Down      | past the end of a list that has more to load, load its next part (or again, after a failure)                               |
| Arrow Right     | on a submenu title, open it and highlight its first option (Arrow Left right to left)                                      |
| Arrow Left      | in a submenu, close it and highlight its title (Arrow Right right to left)                                                 |
| Home / End      | first / last option (in the search field only while it is empty)                                                           |
| Enter           | pick the highlighted option, else the first search result that isn't `disabled` or a selected `fixed` one                  |
| Enter           | on a highlighted submenu title, open it; on a collapsible group's title, toggle it                                         |
| , (comma)       | pick the first search result that isn't `disabled` or a selected `fixed` one, or create the typed value with `customValue` |
| Backspace       | in an empty search field, remove the last chip that isn't `fixed` (unless `deleteOnBackspace={false}`)                     |
| Escape          | close the menu, not a surrounding dialog or popover; in a submenu, close that submenu                                      |
| Tab             | close the menu and move on in page order, after any button in the menu                                                     |
| Enter / Space   | on a chip's delete button or the clear button, press it                                                                    |
| any character   | on the focused dropdown, open the menu                                                                                     |

Typing with an input method (Chinese, Japanese, Korean) works: the Enter that confirms the composition doesn't pick an option.

## ARIA

The search field, or the dropdown itself when there is no search field, is a [combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) that controls a listbox. With `searchInMenu`, the dropdown is the combobox while closed, and the search field atop the open menu while open:

- `aria-expanded`, `aria-haspopup="listbox"` and, while open, `aria-controls` on the combobox
- the `aria-*` from `attr` (`aria-describedby`, `aria-invalid`, `aria-required`, ...) on the combobox too, so an error stays announced while the menu is open
- `aria-activedescendant` points at the keyboard-highlighted option
- `aria-readonly` on the combobox of a single select whose value is `fixed`: every option in its menu is disabled
- options have `role="option"`, `aria-selected` and `aria-disabled`
- groups are `role="group"`, named by their title. With `renderList` a group's rows are flattened into the list, with no `role="group"` around them
- with `renderList`, options carry `aria-posinset` and `aria-setsize`: only the rows in view are there for a screen reader to count. While a [loaded](../async/) list may have more, `aria-setsize` is `-1`, unknown
- the listbox has `aria-busy` while `loadOptions` loads, or with `loading` (the wrapper has `data-loading` while any list loads, for your styles). The row at a list's end that says it loads, or that it failed, has no role: the highlight passes it, and Arrow Down past it loads the next part. It is a polite live region (`aria-live`), so a screen reader hears it fail
- the titles of collapsible groups and submenus are options too, with `aria-expanded`, so the keyboard and screen readers reach them. A submenu is a `role="group"` inside the listbox, named by its title. ARIA allows no `aria-expanded` on an option, so axe reports `aria-allowed-attr` on these titles and Chrome doesn't announce the state: a listbox has no valid way to mark a row that opens more. It stays the open state for your CSS (`[aria-expanded]`, Tailwind's `aria-expanded:`)
- a disabled dropdown leaves the tab order
- a menu animating out is inert, and focus leaves it as it starts to close

Ids come from `useId` on React 18+, so server and client markup match.

## Give it a name

Name the dropdown through `attr`, like any form control:

```tsx
<label id='fruits-label'>Fruits</label>
<MultiSelect options={options} attr={{ 'aria-labelledby': 'fruits-label' }} />

<MultiSelect options={options} attr={{ 'aria-label': 'Fruits' }} />
```
