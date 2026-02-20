# Theme Color Generation — Developer Guide

This document describes how a **Theme Color Picker** generates color shades from a primary color and how to choose readable text on each swatch. Read it to understand the logic, data flow, and how to implement it.

---

## Table of Contents

1. [What You Need To Build](#1-what-you-need-to-build)
2. [How It Works (Big Picture)](#2-how-it-works-big-picture)
3. [Data Flow & Pipeline](#3-data-flow--pipeline)
4. [Conversion Algorithms](#4-conversion-algorithms)
5. [Text Contrast Logic](#5-text-contrast-logic)
6. [CSS Output & Variable Mapping](#6-css-output--variable-mapping)
7. [Implementation Considerations](#7-implementation-considerations)
8. [Reference: Formulas & Tables](#8-reference-formulas--tables)

---

## 1. What You Need To Build

As a developer, you are responsible for:

| Task | Description |
|------|-------------|
| **Hex → HSL** | Convert the user's primary hex color to Hue, Saturation, Lightness. |
| **Generate 5 shades** | From primary's H and S, produce 5 colors with lightness values 92%, 78%, 64%, 50%, 36%. |
| **HSL → Hex** | Convert each shade back to hex for CSS. |
| **Text contrast** | For each swatch background, pick black (`#010101`) or white (`#FFFFFF`) so contrast meets WCAG AA (≥ 4.5:1). |
| **CSS variables** | Expose generated colors via `--color-primary`, `--color-50` … `--color-500`. |
| **Manual overrides** | Allow the user to override any shade; fall back to auto-generated if input is invalid or empty. |

---

## 2. How It Works (Big Picture)

1. User picks one primary hex color (e.g. `#6366f1`).
2. You convert it to HSL and keep H (hue) and S (saturation).
3. You generate 5 shades by changing only lightness (L): 92%, 78%, 64%, 50%, 36%.
4. Each shade is converted back to hex.
5. For each swatch, you compute the best text color (black or white) using WCAG contrast.
6. You output CSS variables and allow manual overrides.

**Why HSL?**  
Shade generation only changes lightness. Hue and saturation stay the same, so all shades stay in the same color family. This is simpler and more predictable than working in RGB.

---

## 3. Data Flow & Pipeline

```
User input (hex)
       ↓
   hexToHSL()  →  { h, s, l }
       ↓
   generateShades(h, s)  →  [hex1, hex2, hex3, hex4, hex5]
       ↓
   hslToHex() for each L in [92, 78, 64, 50, 36]
       ↓
   getContrastTextColor(swatchHex) for each swatch
       ↓
   Output: CSS variables + UI swatches
```

**Input:** One hex color (e.g. `#6366f1`).  
**Output:** 5 hex shades (light → dark), plus recommended text color per shade.

---

## 4. Conversion Algorithms

### 4.1 Hex → HSL (Primary Color)

**Purpose:** Get H, S, L from the primary hex so you can vary only L for shades.

**Steps:**

1. Parse hex to RGB in 0–1 range.
2. Find `max` and `min` of R, G, B.
3. **Lightness (L):**  
   `L = (max + min) / 2`
4. **Saturation (S):**  
   - If max = min → S = 0  
   - Else:  
     `S = (max - min) / (1 - |2L - 1|)`  
   - S is stored as 0–100 for convenience.
5. **Hue (H):**  
   - If max = min → H = 0  
   - Else use which channel is max (R, G, or B) to compute angle; H is 0–360.

**Output:** `{ h: 0–360, s: 0–100, l: 0–100 }`

### 4.2 Shade Generation (5 Colors)

Use the primary's **H** and **S** and only change **L**:

| Shade | Lightness (L) | Role |
|-------|---------------|------|
| Shade 1 | 92% | Lightest background |
| Shade 2 | 78% | Light |
| Shade 3 | 64% | Medium-light |
| Shade 4 | 50% | Medium |
| Shade 5 | 36% | Darkest |

**Algorithm:**

```
function generateShades(primaryH, primaryS):
  lightnessValues = [92, 78, 64, 50, 36]
  shades = []
  for L in lightnessValues:
    shades.push(hslToHex(primaryH, primaryS, L))
  return shades
```

Result: 5 hex colors with the same hue and saturation, ordered light → dark.

### 4.3 HSL → Hex (Per Shade)

**Purpose:** Turn HSL into a hex string for CSS.

**Steps:**

1. Normalize H to 0–360, S and L to 0–1.
2. Use the standard HSL-to-RGB math (chroma, intermediate values, then R, G, B).
3. Convert each R, G, B (0–1) to two hex digits.
4. Return `#RRGGBB`.

---

## 5. Text Contrast Logic

For each swatch background hex, you must choose either black (`#010101`) or white (`#FFFFFF`) so text is readable.

### 5.1 Relative Luminance

Compute luminance for a color (used for both background and text):

```
For each RGB component c (in 0–1 range):
  if c ≤ 0.03928:  c_adj = c / 12.92
  else:             c_adj = ((c + 0.055) / 1.055) ^ 2.4

Luminance = 0.2126 * R_adj + 0.7152 * G_adj + 0.0722 * B_adj
```

### 5.2 Contrast Ratio

```
contrast(A, B) = (L_lighter + 0.05) / (L_darker + 0.05)
```

- Lighter color goes in the numerator.
- Result is between 1 (no contrast) and 21 (max contrast).
- WCAG AA requires ≥ 4.5:1 for normal text.

### 5.3 Choosing Text Color

1. Compute contrast of `#010101` on the swatch background.
2. Compute contrast of `#FFFFFF` on the swatch background.
3. **Rule:** Use the color with contrast ≥ 4.5. If both pass, use the one with higher contrast.

**Pseudocode:**

```
function getContrastTextColor(backgroundColorHex):
  blackContrast = getContrast(backgroundColorHex, "#010101")
  whiteContrast = getContrast(backgroundColorHex, "#FFFFFF")
  
  if blackContrast >= 4.5 and whiteContrast >= 4.5:
    return (blackContrast >= whiteContrast) ? "#010101" : "#FFFFFF"
  if blackContrast >= 4.5:
    return "#010101"
  if whiteContrast >= 4.5:
    return "#FFFFFF"
  # Fallback: pick higher contrast even if < 4.5
  return (blackContrast >= whiteContrast) ? "#010101" : "#FFFFFF"
```

---

## 6. CSS Output & Variable Mapping

Expose the generated palette via CSS custom properties:

| CSS Variable | Source |
|--------------|--------|
| `--color-primary` | User-selected primary hex |
| `--color-50` | Shade 1 (lightest) |
| `--color-100` | Shade 2 |
| `--color-200` | Shade 3 |
| `--color-300` | Shade 4 |
| `--color-400` | Shade 5 (darkest) |
| `--color-500` | Same as Shade 5 (alias) |

You can map these to your design tokens or component styles.

---

## 7. Implementation Considerations

### Hex Input Validation

- **Regex (full hex):** `^#?([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})$`
- Accept both `#RRGGBB` and `RRGGBB`.
- **Shorthand:** Optionally support `#RGB` and expand to `#RRGGBB` (e.g. `#f00` → `#ff0000`).

### Manual Overrides

- Each shade can be overridden by the user (hex input or color picker).
- If the user clears the field or enters invalid hex, revert to the auto-generated shade for that index.
- Always run contrast logic on the final color (auto or overridden) for text color.

### Edge Cases

| Case | Handling |
|------|----------|
| Primary lightness near 0 or 100 | Shades may look very similar; consider clamping L or adjusting the 5 lightness values. |
| Very low saturation | Shades can look almost gray; behavior is still correct. |
| Contrast exactly 4.5 | Both black and white may pass; prefer higher contrast. |
| Neither black nor white passes | Use whichever has higher contrast; optionally show a warning. |

### Performance

- Conversions are cheap; no need for memoization unless you have many simultaneous themes.
- Recompute only when the primary color or manual overrides change.

### Testing Checklist

- [ ] Hex validation accepts valid hex and rejects invalid input
- [ ] Shade order is always light → dark
- [ ] Text contrast meets WCAG AA where possible
- [ ] Manual override → clear reverts to auto-generated shade
- [ ] Invalid override reverts to auto-generated shade
- [ ] CSS variables update when primary or overrides change

---

## 8. Reference: Formulas & Tables

### Lightness Values for 5 Shades

```
[92, 78, 64, 50, 36]  (percent)
```

### WCAG Relative Luminance (sRGB)

```
c_adj = c ≤ 0.03928 ? c/12.92 : ((c + 0.055) / 1.055)^2.4
L = 0.2126*R + 0.7152*G + 0.0722*B
```

### Contrast Ratio

```
(L_max + 0.05) / (L_min + 0.05)
```

### Example Walkthrough

**Primary:** `#6366f1` (indigo)

1. `hexToHSL("#6366f1")` → `{ h: 239, s: 89, l: 64 }`
2. `generateShades(239, 89)` → 5 hex colors with L = 92, 78, 64, 50, 36
3. For each swatch: `getContrastTextColor(swatchHex)` → `#010101` or `#FFFFFF`

---

## Summary

1. **Input:** One primary hex color.
2. **Process:** Hex → HSL → 5 shades (vary L only) → Hex.
3. **Text:** Per swatch, compute WCAG contrast and pick black or white.
4. **Output:** CSS variables and optional manual overrides with fallback to auto-generated shades.

Following this document should give you everything needed to implement the theme color picker and shade generation system.
