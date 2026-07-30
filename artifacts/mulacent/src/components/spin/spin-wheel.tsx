/**
 * Reusable spin-wheel SVG component.
 * Matches the visual from the reference image pixel-by-pixel:
 *   – 12 coloured segments, gold outer ring, decorative "M" centre.
 * The pointer is a gold triangle fixed above the wheel; the SVG rotates.
 */

export const SPIN_SEGMENTS = [
  { label: "0",    valueKES: 0,    color: "#1e1b4b", textColor: "#a5b4fc" },
  { label: "30",   valueKES: 30,   color: "#15803d", textColor: "#bbf7d0" },
  { label: "251",  valueKES: 251,  color: "#b91c1c", textColor: "#fecaca" },
  { label: "3300", valueKES: 3300, color: "#3730a3", textColor: "#c7d2fe" },
  { label: "10",   valueKES: 10,   color: "#6b7280", textColor: "#f3f4f6" },
  { label: "40",   valueKES: 40,   color: "#94a3b8", textColor: "#1e293b" },
  { label: "1000", valueKES: 1000, color: "#0f766e", textColor: "#99f6e4" },
  { label: "20",   valueKES: 20,   color: "#7e22ce", textColor: "#e9d5ff" },
  { label: "x10",  valueKES: 250,  color: "#164e63", textColor: "#a5f3fc" },
  { label: "x4",   valueKES: 100,  color: "#4d7c0f", textColor: "#d9f99d" },
  { label: "x66",  valueKES: 1650, color: "#c2410c", textColor: "#fed7aa" },
  { label: "50",   valueKES: 50,   color: "#334155", textColor: "#cbd5e1" },
] as const;

const N   = SPIN_SEGMENTS.length;
const DEG = 360 / N;           // 30 degrees per segment

// ── SVG helpers ────────────────────────────────────────────────────────────────

/** Convert polar (r, angleDeg) to SVG cartesian. 0° = top, clockwise. */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Build an SVG path string for an annular (donut) slice.
 * Segments are offset by -½DEG so segment 0 is **centred** at the top.
 */
function slicePath(
  cx: number, cy: number,
  r: number, innerR: number,
  i: number,
) {
  const offset = -DEG / 2;           // centre segment 0 at 0° (top)
  const a0     = i * DEG + offset;
  const a1     = (i + 1) * DEG + offset;
  const os     = polar(cx, cy, r,      a0);
  const oe     = polar(cx, cy, r,      a1);
  const is_    = polar(cx, cy, innerR, a0);
  const ie     = polar(cx, cy, innerR, a1);
  const la     = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${is_.x} ${is_.y}`,
    `L ${os.x}  ${os.y}`,
    `A ${r} ${r} 0 ${la} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x}  ${ie.y}`,
    `A ${innerR} ${innerR} 0 ${la} 0 ${is_.x} ${is_.y} Z`,
  ].join(" ");
}

// ── Rotation math ──────────────────────────────────────────────────────────────

/**
 * Given the *current* accumulated rotation and the target segment index,
 * return the new accumulated rotation so the wheel spins at least 5 full
 * turns before landing exactly on `segmentIndex`.
 *
 * Because segment 0 is centred at 0°, a clockwise rotation of `i * DEG`
 * brings segment `(N - i) % N` to the top pointer.
 * To land on segment `s`: rotate by `(N - s) * DEG` modulo 360.
 */
export function getTargetRotation(currentRotation: number, segmentIndex: number): number {
  const currentMod = currentRotation % 360;
  const targetMod  = ((N - segmentIndex) * DEG) % 360;
  const delta      = (targetMod - currentMod + 360) % 360;
  return currentRotation + 5 * 360 + (delta === 0 ? 360 : delta);
}

// ── Main component ─────────────────────────────────────────────────────────────

interface SpinWheelProps {
  rotation:      number;
  spinning:      boolean;
  onSpinEnd?:    () => void;
  /** If supplied, these labels replace the default KES labels (use local-currency strings). */
  displayLabels?: string[];
  size?:         number;         // px width = height (default 320)
}

export function SpinWheel({
  rotation, spinning, onSpinEnd,
  displayLabels, size = 320,
}: SpinWheelProps) {
  const CX = 200, CY = 200, R = 181, INNER = 56;

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* ── Fixed pointer triangle ─────────────────────────────────────── */}
      <div
        className="absolute z-20"
        style={{
          top:       -4,
          left:      "50%",
          transform: "translateX(-50%)",
          width:     0,
          height:    0,
          borderLeft:  "12px solid transparent",
          borderRight: "12px solid transparent",
          borderTop:   "22px solid #f59e0b",
          filter:      "drop-shadow(0 3px 5px rgba(0,0,0,0.6))",
        }}
      />
      {/* Extra white dot on pointer tip for realism */}
      <div
        className="absolute z-20 w-3 h-3 bg-white rounded-full shadow"
        style={{ top: -1, left: "50%", transform: "translateX(-50%)" }}
      />

      {/* ── Spinning SVG ─────────────────────────────────────────────── */}
      <svg
        viewBox="0 0 400 400"
        style={{
          width:      size,
          height:     size,
          transform:  `rotate(${rotation}deg)`,
          transition: spinning
            ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
            : "none",
          willChange: "transform",
        }}
        onTransitionEnd={onSpinEnd}
      >
        <defs>
          <radialGradient id="goldOuter" cx="50%" cy="50%">
            <stop offset="0%"   stopColor="#fde68a" />
            <stop offset="60%"  stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
          <radialGradient id="centerGold" cx="38%" cy="32%">
            <stop offset="0%"   stopColor="#fef3c7" />
            <stop offset="35%"  stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>
          <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00000055" />
          </filter>
        </defs>

        {/* Outer decorative gold rings */}
        <circle cx={CX} cy={CY} r={R + 14} fill="url(#goldOuter)" />
        <circle cx={CX} cy={CY} r={R + 9}  fill="#7c2d12" opacity="0.5" />

        {/* Segments */}
        {SPIN_SEGMENTS.map((seg, i) => {
          const offset  = -DEG / 2;
          const midAngle = i * DEG + offset + DEG / 2;
          const tp      = polar(CX, CY, R * 0.69, midAngle);
          const label   = displayLabels?.[i] ?? seg.label;
          const fs      = label.length > 5 ? 8 : label.length > 4 ? 9.5 : label.length > 3 ? 11 : 12.5;

          return (
            <g key={i}>
              <path
                d={slicePath(CX, CY, R, INNER, i)}
                fill={seg.color}
                stroke="#0f0f1a"
                strokeWidth="1.2"
              />
              <text
                x={tp.x}
                y={tp.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fs}
                fontWeight="bold"
                fontFamily="system-ui, Arial, sans-serif"
                fill={seg.textColor}
                transform={`rotate(${midAngle}, ${tp.x}, ${tp.y})`}
                style={{ pointerEvents: "none" }}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Radial divider lines */}
        {SPIN_SEGMENTS.map((_, i) => {
          const offset = -DEG / 2;
          const a  = i * DEG + offset;
          const p1 = polar(CX, CY, INNER, a);
          const p2 = polar(CX, CY, R,     a);
          return (
            <line
              key={`d${i}`}
              x1={p1.x} y1={p1.y}
              x2={p2.x} y2={p2.y}
              stroke="#0f0f1a"
              strokeWidth="1.5"
              opacity="0.6"
            />
          );
        })}

        {/* Centre boss */}
        <circle cx={CX} cy={CY} r={INNER + 8} fill="#92400e" />
        <circle cx={CX} cy={CY} r={INNER + 5} fill="#b45309" />
        <circle cx={CX} cy={CY} r={INNER + 2} fill="url(#centerGold)" filter="url(#innerShadow)" />

        {/* "M" logo */}
        <text
          x={CX}
          y={CY + 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="30"
          fontWeight="900"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill="#78350f"
          stroke="#fef3c7"
          strokeWidth="0.8"
        >
          M
        </text>

        {/* Small gold studs on the outer ring */}
        {SPIN_SEGMENTS.map((_, i) => {
          const offset = -DEG / 2;
          const a = i * DEG + offset + DEG / 2;
          const p = polar(CX, CY, R + 11, a);
          return <circle key={`stud${i}`} cx={p.x} cy={p.y} r="4" fill="#fde68a" opacity="0.8" />;
        })}
      </svg>
    </div>
  );
}
