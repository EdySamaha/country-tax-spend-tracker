import { useMemo, useState } from "react";
import type { Jurisdiction } from "../types";
import { formatCAD, formatPct } from "../lib";

interface Props {
  a: Jurisdiction;
  b: Jurisdiction;
}

interface Row {
  name: string;
  shareA: number;
  shareB: number;
  amountA: number;
  amountB: number;
}

export default function Compare({ a, b }: Props) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const rows = useMemo<Row[]>(() => {
    const names = new Set<string>([...a.functions.map((f) => f.name), ...b.functions.map((f) => f.name)]);
    const byA = new Map(a.functions.map((f) => [f.name, f]));
    const byB = new Map(b.functions.map((f) => [f.name, f]));
    return [...names]
      .map((name) => ({
        name,
        shareA: byA.get(name)?.share ?? 0,
        shareB: byB.get(name)?.share ?? 0,
        amountA: byA.get(name)?.amount ?? 0,
        amountB: byB.get(name)?.amount ?? 0,
      }))
      .sort((x, y) => y.shareA + y.shareB - (x.shareA + x.shareB));
  }, [a, b]);

  const maxShare = Math.max(...rows.flatMap((r) => [r.shareA, r.shareB]));

  const insights = useMemo(
    () =>
      [...rows]
        .sort((x, y) => Math.abs(y.shareA - y.shareB) - Math.abs(x.shareA - x.shareB))
        .slice(0, 3),
    [rows]
  );

  return (
    <div className="card">
      <h2 className="section-title">
        {a.name} <span className="muted" style={{ fontWeight: 400 }}>vs</span> {b.name}
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Comparing each government's spending as a share of its own budget — the fair way to compare very
        different budget sizes.
      </p>

      <div className="totals">
        <div className="stat">
          <div className="num" style={{ color: "var(--series-1)" }}>{formatCAD(a.totalExpenditure)}</div>
          <div className="lbl">{a.name} · {a.fiscalYear}</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: "var(--series-2)" }}>{formatCAD(b.totalExpenditure)}</div>
          <div className="lbl">{b.name} · {b.fiscalYear}</div>
        </div>
      </div>

      <div className="legend">
        <span className="item"><span className="swatch a" />{a.name}</span>
        <span className="item"><span className="swatch b" />{b.name}</span>
      </div>

      <ul className="insights">
        {insights.map((r) => {
          const aMore = r.shareA >= r.shareB;
          const pp = Math.abs(r.shareA - r.shareB) * 100;
          return (
            <li key={r.name}>
              <span className={aMore ? "hl-a" : "hl-b"}>{aMore ? a.name : b.name}</span> devotes{" "}
              {pp.toFixed(1)}pp more of its budget to <b>{r.name}</b> ({formatPct(r.shareA)} vs {formatPct(r.shareB)}).
            </li>
          );
        })}
      </ul>

      <div className="chart">
        {rows.map((r) => (
          <div className="gbar-row" key={r.name}>
            <div className="gbar-head">
              <span className="name">{r.name}</span>
              <span className="vals">
                {formatPct(r.shareA)} · {formatPct(r.shareB)}
              </span>
            </div>
            <div
              className="gtrack"
              onMouseMove={(e) =>
                setTip({ x: e.clientX, y: e.clientY, text: `${a.name} — ${r.name}: ${formatCAD(r.amountA)} (${formatPct(r.shareA)})` })
              }
              onMouseLeave={() => setTip(null)}
            >
              <div className="gbar a" style={{ width: `${(r.shareA / maxShare) * 100}%` }} />
            </div>
            <div
              className="gtrack"
              onMouseMove={(e) =>
                setTip({ x: e.clientX, y: e.clientY, text: `${b.name} — ${r.name}: ${formatCAD(r.amountB)} (${formatPct(r.shareB)})` })
              }
              onMouseLeave={() => setTip(null)}
            >
              <div className="gbar b" style={{ width: `${(r.shareB / maxShare) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="muted" style={{ marginTop: 12 }}>
        Source:{" "}
        <a href={a.source.url} target="_blank" rel="noreferrer">
          Statistics Canada table {a.source.table}
        </a>{" "}
        · {a.component} / {b.component} · retrieved {a.source.retrievedAt}
      </p>

      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}
