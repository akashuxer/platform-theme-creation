import { useState, useCallback, useRef } from 'react';
import {
  isValidHex,
  generateShadesFromPrimary,
  getContrastTextColor,
} from '../utils/colorUtils';
import './ThemeColorPicker.css';

const PLACEHOLDER = '—';

function normalizeHex(value: string): string {
  const cleaned = value.replace(/[^a-fA-F0-9]/g, '');
  if (cleaned.length === 6) return `#${cleaned}`;
  if (cleaned.length === 3) {
    return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`;
  }
  return value ? `#${cleaned}` : '';
}

export function ThemeColorPicker() {
  const [primary, setPrimary] = useState<string>('');
  const [shades, setShades] = useState<string[]>([]);

  const hasTheme = primary && isValidHex(primary);

  const handlePrimaryChange = useCallback((value: string) => {
    const hex = normalizeHex(value);
    if (!hex) {
      setPrimary('');
      setShades([]);
      return;
    }
    if (isValidHex(hex)) {
      setPrimary(hex);
      setShades(generateShadesFromPrimary(hex));
    } else {
      setPrimary(hex || '');
    }
  }, []);

  const handlePrimaryInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const hex = normalizeHex(value);
      if (hex && isValidHex(hex)) {
        setPrimary(hex);
        setShades(generateShadesFromPrimary(hex));
      } else if (!value.trim()) {
        setPrimary('');
        setShades([]);
      }
    },
    []
  );

  const handleShadeChange = useCallback((index: number, value: string) => {
    const hex = normalizeHex(value);
    setShades((prev) => {
      const next = [...prev];
      if (hex && isValidHex(hex)) {
        next[index] = hex;
      } else if (!value.trim()) {
        next[index] = '';
      }
      return next;
    });
  }, []);

  const handleShadeBlur = useCallback(
    (index: number, value: string) => {
      if (!primary || !isValidHex(primary)) return;
      const hex = normalizeHex(value);
      if (hex && isValidHex(hex)) {
        setShades((prev) => {
          const next = [...prev];
          next[index] = hex;
          return next;
        });
      } else {
        setShades((prev) => {
          const next = [...prev];
          next[index] = generateShadesFromPrimary(primary)[index];
          return next;
        });
      }
    },
    [primary]
  );

  const defaults = hasTheme ? generateShadesFromPrimary(primary) : [];
  const primaryColorInputRef = useRef<HTMLInputElement>(null);
  const shadeColorInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const displayShades = hasTheme
    ? [
        shades[0] || defaults[0],
        shades[1] || defaults[1],
        shades[2] || defaults[2],
        shades[3] || defaults[3],
        shades[4] || defaults[4],
      ]
    : [];

  const cssVars = hasTheme
    ? [
        primary,
        shades[0] || defaults[0],
        shades[1] || defaults[1],
        shades[2] || defaults[2],
        shades[3] || defaults[3],
        shades[4] || defaults[4],
      ]
    : [];

  return (
    <div className="theme-picker">
      <header className="theme-picker__header">
        <h2 className="theme-picker__title">Theme Color Picker</h2>
        <p className="theme-picker__helper">
          Select a primary color — 5 shades are generated light to dark for your theme
        </p>
      </header>

      <section className="theme-picker__primary">
        <label className="theme-picker__label">PRIMARY COLOR</label>
        <div className="theme-picker__primary-row">
          <input
            ref={primaryColorInputRef}
            type="color"
            className="theme-picker__color-input"
            value={primary && isValidHex(primary) ? primary : '#6366f1'}
            onChange={(e) => handlePrimaryChange(e.target.value)}
          />
          <button
            type="button"
            className="theme-picker__preview"
            style={{
              backgroundColor: primary && isValidHex(primary) ? primary : '#e2e8f0',
            }}
            onClick={() => primaryColorInputRef.current?.click()}
            aria-label="Pick primary color"
          />
          <input
            type="text"
            className="theme-picker__hex-input"
            placeholder={PLACEHOLDER}
            value={primary}
            onChange={(e) => handlePrimaryChange(e.target.value)}
            onBlur={handlePrimaryInputBlur}
          />
        </div>
      </section>

      <section className="theme-picker__swatches">
        {[0, 1, 2, 3, 4].map((i) => {
          const color = displayShades[i];
          const isEmpty = !color || color === PLACEHOLDER;

          return (
            <div key={i} className="theme-picker__tile-wrap">
              <input
                ref={(el) => { shadeColorInputRefs.current[i] = el; }}
                type="color"
                className="theme-picker__color-input"
                value={color && isValidHex(color) ? color : '#6366f1'}
                onChange={(e) => handleShadeChange(i, e.target.value)}
              />
              <button
                type="button"
                className="theme-picker__tile"
                style={{
                  backgroundColor: isEmpty ? '#f1f5f9' : color,
                }}
                onClick={() => shadeColorInputRefs.current[i]?.click()}
                disabled={!hasTheme}
                aria-label={`Pick shade ${i + 1}`}
              >
                <span
                  className="theme-picker__tile-text"
                  style={{
                    color: isEmpty
                      ? '#94a3b8'
                      : getContrastTextColor(color),
                  }}
                >
                  A01
                </span>
              </button>
              <input
                type="text"
                className="theme-picker__tile-hex"
                placeholder={PLACEHOLDER}
                value={shades[i] ?? ''}
                onChange={(e) => handleShadeChange(i, e.target.value)}
                onBlur={(e) => handleShadeBlur(i, e.target.value)}
                disabled={!hasTheme}
              />
            </div>
          );
        })}
      </section>

      <section className="theme-picker__code">
        <h3 className="theme-picker__code-title">THEME (CSS VARIABLES)</h3>
        <pre className="theme-picker__code-block">
          {hasTheme ? (
            `:root {
  --color-primary: ${cssVars[0]};
  --color-50: ${cssVars[1]};
  --color-100: ${cssVars[2]};
  --color-200: ${cssVars[3]};
  --color-300: ${cssVars[4]};
  --color-400: ${cssVars[5]};
  --color-500: ${cssVars[5]};
}
`
          ) : (
            `:root {
  --color-primary: ${PLACEHOLDER};
  --color-50: ${PLACEHOLDER};
  --color-100: ${PLACEHOLDER};
  --color-200: ${PLACEHOLDER};
  --color-300: ${PLACEHOLDER};
  --color-400: ${PLACEHOLDER};
  --color-500: ${PLACEHOLDER};
}`
          )}
        </pre>
      </section>
    </div>
  );
}
