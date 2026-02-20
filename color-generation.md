# Theme Color Generation Logic

This document explains how the Theme Color Picker generates shades from a primary color and determines text contrast. Use this as a reference for implementation.

---

## Overview

1. **Primary color** — User selects a single hex color (e.g. `#6366f1`).
2. **5 derived shades** — Generated automatically from the primary using HSL, ordered light → dark.
3. **Text contrast** — For each swatch, text color is either `#010101` (black) or `#FFFFFF` (white) based on WCAG contrast ratio.

---

## 1. Hex → HSL Conversion

Convert the primary hex color to HSL (Hue, Saturation, Lightness):

- **Hue (H)** — 0–360°, defines the base color (red, blue, etc.).
- **Saturation (S)** — 0–100%, color intensity.
- **Lightness (L)** — 0–100%, how light or dark.

**Why HSL?**  
Shade generation only changes lightness while keeping hue and saturation. This keeps the color family consistent.

**Formula (simplified):**
1. Parse hex to RGB (0–1).
2. Compute `L = (max + min) / 2`.
3. Compute `S` from the spread of RGB.
4. Compute `H` from which channel is max.

---

## 2. Shade Generation (5 Shades, Light → Dark)

Use the primary’s **H** and **S**, and vary **L**:

| Shade | Lightness (L) | Use case        |
|-------|---------------|------------------|
| 1     | 92%           | Lightest         |
| 2     | 78%           | Light            |
| 3     | 64%           | Medium-light     |
| 4     | 50%           | Medium           |
| 5     | 36%           | Darkest          |

**Algorithm:**
```
For each lightness level L in [92, 78, 64, 50, 36]:
  output = hslToHex(primary.H, primary.S, L)
```

**Result:** 5 hex colors with the same hue and saturation, ordered from lightest to darkest.

---

## 3. HSL → Hex Conversion

Convert each HSL value back to hex for use in CSS:

1. Normalize S and L to 0–1.
2. Use the standard HSL-to-RGB conversion.
3. Convert RGB to hex (`#RRGGBB`).

---

## 4. Text Contrast (WCAG)

For text on each swatch, choose `#010101` or `#FFFFFF` so contrast meets WCAG.

### Relative Luminance

For each color, compute relative luminance:

```
For each RGB component c (0–1):
  c_adj = c ≤ 0.03928 ? c/12.92 : ((c + 0.055) / 1.055)^2.4

L = 0.2126*R + 0.7152*G + 0.0722*B
```

### Contrast Ratio

```
contrast(A, B) = (L_lighter + 0.05) / (L_darker + 0.05)
```

Range: 1 (no contrast) to 21 (max contrast).

### Choosing Text Color

1. Compute contrast of `#010101` on background.
2. Compute contrast of `#FFFFFF` on background.
3. **Rule:** Use the color with contrast ≥ 4.5 (WCAG AA). If both pass, use the one with higher contrast.

---

## 5. CSS Variable Mapping

| Variable       | Source                    |
|----------------|---------------------------|
| `--color-primary` | User-selected primary   |
| `--color-50`   | Shade 1 (lightest)        |
| `--color-100`  | Shade 2                   |
| `--color-200`  | Shade 3                   |
| `--color-300`  | Shade 4                   |
| `--color-400`  | Shade 5 (darkest)         |
| `--color-500`  | Same as Shade 5           |

---

## 6. Manual Overrides

- **Primary** — Editable via hex input or color picker.
- **Shades** — Each shade can be overridden manually. If the user clears or enters invalid hex, revert to the auto-generated shade for that index.

---

## 7. Example

**Primary:** `#6366f1` (indigo)

1. `hexToHSL("#6366f1")` → `{ h: 239, s: 89, l: 64 }`
2. Generate shades with L = 92, 78, 64, 50, 36 → 5 hex colors.
3. For each swatch, use `getContrastTextColor(swatchHex)` → `#010101` or `#FFFFFF`.

---

## 8. Implementation Notes

- Hex validation: `^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$` (case-insensitive).
- Accept both `#RRGGBB` and `RRGGBB`.
- Shorthand `#RGB` can be expanded to `#RRGGBB` if desired.
