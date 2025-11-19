# Visual Formatting Guide

This document describes the visual enhancements added to the interactive form editor.

## Color Coding

The form editor now uses ANSI color codes to provide visual feedback:

### Color Scheme

- **Bold + Cyan** (`\x1b[1m\x1b[36m`): Primary prompts and headings
- **Bold + Yellow** (`\x1b[1m\x1b[33m`): Field labels and important questions
- **Dimmed** (`\x1b[2m`): Current values, help text, and kept values
- **Green** (`\x1b[32m`): Success indicators and checkmarks
- **Red** (`\x1b[31m`): Required field asterisks
- **Bold** (`\x1b[1m`): Headers and emphasis

## Visual Elements

### 1. Form Header

```
┌─────────────────────────────────────────────────────────┐
│ Editing Location: Temple Entrance                       │
└─────────────────────────────────────────────────────────┘
```

- Uses box drawing characters
- Bold + Cyan color for the entire header
- Clearly identifies what entity is being edited

### 2. Field Headers

```
┌─ Field 1 of 3 ─────────────────────────────────────────┐
│ Location Name *
│ A short, descriptive name for this location
└─────────────────────────────────────────────────────────┘
```

- Progress indicator shows "Field X of Y" in cyan
- Field label in bold + yellow
- Red asterisk (*) for required fields
- Help text in dimmed color
- Box drawing characters frame the field

### 3. Current Values

Single-line values:
```
Current: Temple Entrance
         ^^^^^^^^^^^^^^^ (displayed in dimmed color)
```

Multi-line values:
```
Current value:
  1: You stand before an ancient temple.
  2: Vines cover the weathered stone walls.
     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ (all lines dimmed)
```

### 4. Input Prompts

```
New value (or Enter to keep, "cancel" to abort): _
^^^^^^^^^                                         (bold + cyan)
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ (system color)
```

Multi-line prompts:
```
Enter new value (multi-line):
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ (bold + cyan)
  • Type END on a new line when finished
  • Press Enter on first line to keep current value
  • Type "cancel" to abort
  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ (all bullets dimmed)
```

### 5. Kept Values Indicator

```
[kept]
^^^^^^ (dimmed + success color)
```

### 6. Dialogue Editing Options

```
Options:
^^^^^^^^ (bold + info color)
  k - Keep all dialogue
  e - Edit individual lines
  r - Replace all dialogue
  ^^^^^^^^^^^^^^^^^^^^^^^ (all options dimmed)
```

### 7. Edit Summary

```
┌─────────────────────────────────────────────────────────┐
│ Edit Summary                                            │
└─────────────────────────────────────────────────────────┘

✓ Location Name:
^ (green checkmark)
  ^^^^^^^^^^^^^ (bold + info color)
    Old: Temple Entrance
         ^^^^^^^^^^^^^^^ (dimmed)
    New: Ancient Temple Gateway
         ^^^^^^^^^^^^^^^^^^^^^^ (bold + cyan)

✓ Description: [kept]
^ ^^^^^^^^^^^^^^^^^^^ (dimmed)
```

Changed fields:
- Green checkmark (✓)
- Bold field label
- Old value in dimmed color
- New value in bold + cyan

Unchanged fields:
- Dimmed checkmark and text
- "[kept]" indicator

### 8. Final Confirmation

```
Save these changes? (y/n): _
^^^^^^^^^^^^^^^^^^^        (bold + yellow)
                    ^^^^^^ (system color)
```

## Benefits

1. **Improved Readability**: Color coding helps users quickly identify different types of information
2. **Clear Visual Hierarchy**: Bold and dimmed text create clear emphasis
3. **Progress Tracking**: Field X of Y indicator shows progress through the form
4. **Better Context**: Box drawing characters frame each field clearly
5. **Reduced Errors**: Required fields marked with red asterisk
6. **Professional Appearance**: Consistent use of colors and formatting creates a polished UI

## ANSI Codes Reference

- `\x1b[0m` - Reset all formatting
- `\x1b[1m` - Bold
- `\x1b[2m` - Dim
- `\x1b[31m` - Red
- `\x1b[32m` - Green
- `\x1b[33m` - Yellow
- `\x1b[36m` - Cyan

## Box Drawing Characters

- `┌` `┐` `└` `┘` - Corners
- `─` - Horizontal line
- `│` - Vertical line

These characters create clean, professional-looking borders and separators.
