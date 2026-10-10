import type { CSSProperties } from "react";

interface Piece {
  left: string;
  top: string;
  size: number;
  rotate: number;
  delay: number;
  color: string;
  shape: "circle" | "square" | "bar";
}

// Kept to the sides so the trophy stays clear. Small and sparse on purpose.
const pieces: Piece[] = [
  { left: "6%", top: "18%", size: 10, rotate: 20, delay: 0.0, color: "bg-gold", shape: "square" },
  { left: "14%", top: "62%", size: 8, rotate: 0, delay: 0.1, color: "bg-brand", shape: "circle" },
  { left: "22%", top: "30%", size: 14, rotate: 35, delay: 0.2, color: "bg-brand/70", shape: "bar" },
  { left: "27%", top: "78%", size: 9, rotate: 10, delay: 0.3, color: "bg-gold", shape: "circle" },
  { left: "11%", top: "88%", size: 12, rotate: -25, delay: 0.15, color: "bg-brand/50", shape: "square" },
  { left: "93%", top: "20%", size: 10, rotate: -20, delay: 0.05, color: "bg-brand", shape: "square" },
  { left: "85%", top: "64%", size: 8, rotate: 0, delay: 0.25, color: "bg-gold", shape: "circle" },
  { left: "76%", top: "28%", size: 14, rotate: -40, delay: 0.1, color: "bg-gold", shape: "bar" },
  { left: "72%", top: "80%", size: 9, rotate: 15, delay: 0.35, color: "bg-brand/70", shape: "circle" },
  { left: "90%", top: "86%", size: 12, rotate: 30, delay: 0.2, color: "bg-brand/50", shape: "square" },
];

const shapeClass = { circle: "rounded-full", square: "rounded-sm", bar: "rounded-full" };

/** Subtle decorative confetti. Purely visual, hidden from assistive technology. */
export function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`confetti-piece absolute block ${p.color} ${shapeClass[p.shape]}`}
          style={
            {
              left: p.left,
              top: p.top,
              width: p.shape === "bar" ? p.size / 2.5 : p.size,
              height: p.shape === "bar" ? p.size * 1.6 : p.size,
              rotate: `${p.rotate}deg`,
              "--delay": `${p.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
