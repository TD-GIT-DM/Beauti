import { hexToHsl, hslToHex, normalizeHex, type HslColor } from "../lib/theme";

export function ColorSlider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const hsl = hexToHsl(value);

  function setHsl(next: Partial<HslColor>) {
    onChange(hslToHex({ ...hsl, ...next }));
  }

  function setHex(raw: string) {
    const hex = normalizeHex(raw);
    if (hex) onChange(hex);
  }

  return (
    <div className="color-editor">
      <div className="color-editor-head">
        <span className="color-swatch" style={{ background: value }} aria-hidden="true" />
        <div>
          <p className="brand-kicker" style={{ margin: 0 }}>
            {label}
          </p>
          <p className="color-hint">{hint}</p>
        </div>
        <label className="hex-field">
          Hex
          <input
            value={value}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setHex(e.target.value)}
            aria-label={`${label} hex color`}
          />
        </label>
      </div>
      <label className="slider-field">
        <span>Hue</span>
        <input
          className="color-slider hue-slider"
          type="range"
          min={0}
          max={360}
          step={1}
          value={Math.round(hsl.h)}
          onChange={(e) => setHsl({ h: Number(e.target.value) })}
          aria-valuetext={`${Math.round(hsl.h)} degrees`}
        />
        <em>{Math.round(hsl.h)}</em>
      </label>
      <label className="slider-field">
        <span>Saturation</span>
        <input
          className="color-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(hsl.s * 100)}
          onChange={(e) => setHsl({ s: Number(e.target.value) / 100 })}
          style={{
            background: `linear-gradient(90deg, ${hslToHex({ ...hsl, s: 0 })}, ${hslToHex({ ...hsl, s: 1 })})`,
          }}
        />
        <em>{Math.round(hsl.s * 100)}</em>
      </label>
      <label className="slider-field">
        <span>Lightness</span>
        <input
          className="color-slider"
          type="range"
          min={0}
          max={96}
          step={1}
          value={Math.round(hsl.l * 100)}
          onChange={(e) => setHsl({ l: Number(e.target.value) / 100 })}
          style={{
            background: `linear-gradient(90deg, #000, ${hslToHex({ ...hsl, l: 0.5 })}, #fff)`,
          }}
        />
        <em>{Math.round(hsl.l * 100)}</em>
      </label>
    </div>
  );
}
