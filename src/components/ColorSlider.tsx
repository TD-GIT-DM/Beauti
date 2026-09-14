import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  hexToHsl,
  hexToRgb,
  hslToHex,
  hueIsExpressible,
  normalizeHex,
  withVisibleHue,
  type HslColor,
} from "../lib/theme";

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
  const parsed = hexToHsl(value);
  const expressible = hueIsExpressible(parsed);
  const [heldHue, setHeldHue] = useState(parsed.h);
  const lastEmitted = useRef(value);
  const hsl: HslColor = {
    h: expressible ? parsed.h : heldHue,
    s: parsed.s,
    l: parsed.l,
  };

  useEffect(() => {
    if (value === lastEmitted.current) {
      if (expressible) setHeldHue(parsed.h);
      return;
    }
    lastEmitted.current = value;
    setHeldHue(expressible ? parsed.h : 0);
  }, [value, expressible, parsed.h]);

  function emit(hex: string) {
    lastEmitted.current = hex;
    onChange(hex);
  }

  function setHsl(next: Partial<HslColor>) {
    let merged: HslColor = { ...hsl, ...next };
    if (next.h !== undefined) {
      merged = withVisibleHue(merged);
      setHeldHue(merged.h);
    }
    emit(hslToHex(merged));
  }

  function setHex(raw: string) {
    const hex = normalizeHex(raw);
    if (!hex) return;
    const fromHex = hexToHsl(hex);
    setHeldHue(hueIsExpressible(fromHex) ? fromHex.h : 0);
    emit(hex);
  }

  const thumbRgb = hexToRgb(value);
  const thumbStyle = {
    "--slider-thumb": value,
    "--slider-thumb-rgb": `${thumbRgb.r} ${thumbRgb.g} ${thumbRgb.b}`,
  } as CSSProperties;

  return (
    <div className="color-editor" style={thumbStyle}>
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
      <div className="slider-stack">
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
            style={thumbStyle}
          />
          <em>{Math.round(hsl.h)}</em>
        </label>
        {!expressible ? (
          <p className="hue-nudge" role="note">
            Black and gray have no hue. Dragging this adds a little saturation and light so the color can show.
          </p>
        ) : null}
      </div>
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
            ...thumbStyle,
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
            ...thumbStyle,
            background: `linear-gradient(90deg, #000, ${hslToHex({ ...hsl, l: 0.5 })}, #fff)`,
          }}
        />
        <em>{Math.round(hsl.l * 100)}</em>
      </label>
    </div>
  );
}
