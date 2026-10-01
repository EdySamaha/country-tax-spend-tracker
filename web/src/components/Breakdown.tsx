import { useState } from "react";
import type { Jurisdiction } from "../types";
import { formatCAD, formatPct } from "../lib";

interface Props {
  j: Jurisdiction;
}

export default function Breakdown({ j }: Props) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const maxShare = Math.max(...j.functions.map((f) => f.share));

  return (
    <div className="card">
      <h2 className="section-title">{j.name}</h2>
      <div className="totals">
        <div className="stat">
          <div className="num">{formatCAD(j.totalExpenditure)}</div>
          <div className="lbl">total expenditure · {j.fiscalYear}</div>
        </div>
        <div className="stat">
          <div className="num">{j.functions.length}</div>
          <div className="lbl">spending categories</div>
        </div>
      </div>

      <div className="chart">
        {j.functions.map((f) => (
          <div
            className="bar-row"
            key={f.name}
            onMouseMove={(e) =>
              setTip({
                x: e.clientX,
                y: e.clientY,
                text: `${f.name}: ${formatCAD(f.amount)} (${formatPct(f.share)})`,
              })
            }
            onMouseLeave={() => setTip(null)}
          >
            <div className="bar-label">
              <span className="name">{f.name}</span>
              <span className="val">
                {formatCAD(f.amount)} · {formatPct(f.share)}
              </span>
            </div>
            <div className="track">
              <div className="bar" style={{ width: `${(f.share / maxShare) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="muted" style={{ marginTop: 12 }}>
        {j.component} · Source:{" "}
        <a href={j.source.url} target="_blank" rel="noreferrer">
          Statistics Canada table {j.source.table}
        </a>{" "}
        · retrieved {j.source.retrievedAt}
      </p>

      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}
