import { useState } from "react";
import type { Jurisdiction, Revenue } from "../types";
import { formatCAD, formatPct } from "../lib";

interface Props {
  j: Jurisdiction;
}

function RevenueBar({ r }: { r: Revenue }) {
  const seg = (n: number) => (r.total ? (n / r.total) * 100 : 0);
  const grantsTiny = seg(r.grants) < 1;
  return (
    <div className="revbar-wrap">
      <div className="revbar-head">
        <span className="revbar-title">Where the money comes from</span>
        <span className="revbar-figs">
          <span><span className="revkey taxes" /> Taxes {formatPct(r.taxes / r.total, 0)}</span>
          <span><span className="revkey grants" /> Grants {formatPct(r.grants / r.total, 0)}</span>
        </span>
      </div>
      <div className="revbar" role="img"
        aria-label={`Revenue: taxes ${formatPct(r.taxes / r.total)}, grants ${formatPct(r.grants / r.total)}, other ${formatPct(r.other / r.total)}`}>
        <div className="seg taxes" style={{ width: `${seg(r.taxes)}%` }} title={`Taxes: ${formatCAD(r.taxes)}`} />
        <div className="seg grants" style={{ width: `${seg(r.grants)}%` }} title={`Grants (transfers received): ${formatCAD(r.grants)}`} />
        <div className="seg other" style={{ width: `${seg(r.other)}%` }} title={`Other revenue: ${formatCAD(r.other)}`} />
      </div>
      <p className="muted" style={{ marginTop: 6 }}>
        {formatCAD(r.total)} total revenue · {r.fiscalYear}
        {grantsTiny && " · grants are transfers from other governments (mostly federal → province)"}
      </p>
    </div>
  );
}

export default function Breakdown({ j }: Props) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const maxShare = Math.max(...j.functions.map((f) => f.share));

  const toggle = (name: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

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

      {j.revenue && <RevenueBar r={j.revenue} />}

      <div className="chart">
        {j.functions.map((f) => {
          const hasKids = !!f.children?.length;
          const isOpen = open.has(f.name);
          return (
            <div className="bar-row" key={f.name}>
              <div
                className={`bar-label${hasKids ? " expandable" : ""}`}
                role={hasKids ? "button" : undefined}
                tabIndex={hasKids ? 0 : undefined}
                aria-expanded={hasKids ? isOpen : undefined}
                onClick={hasKids ? () => toggle(f.name) : undefined}
                onKeyDown={
                  hasKids
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(f.name);
                        }
                      }
                    : undefined
                }
                onMouseMove={(e) =>
                  setTip({ x: e.clientX, y: e.clientY, text: `${f.name}: ${formatCAD(f.amount)} (${formatPct(f.share)})` })
                }
                onMouseLeave={() => setTip(null)}
              >
                <span className="name">
                  {hasKids && <span className={`caret${isOpen ? " open" : ""}`} aria-hidden>▸</span>}
                  {f.name}
                </span>
                <span className="val">
                  {formatCAD(f.amount)} · {formatPct(f.share)}
                </span>
              </div>
              <div className="track">
                <div className="bar" style={{ width: `${(f.share / maxShare) * 100}%` }} />
              </div>

              {hasKids && isOpen && (
                <div className="subrows">
                  {f.children!.map((c) => (
                    <div className="subrow" key={c.name}>
                      <div className="sub-label">
                        <span className="name">{c.name}</span>
                        <span className="val">
                          {formatCAD(c.amount)} · {formatPct(c.shareOfParent ?? 0, 0)} of {f.name.toLowerCase()}
                        </span>
                      </div>
                      <div className="track sub">
                        <div className="bar sub" style={{ width: `${(c.shareOfParent ?? 0) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {j.functions.some((f) => f.children?.length) && (
        <p className="muted" style={{ marginTop: 10 }}>
          Click a category with a ▸ to see its sub-categories.
        </p>
      )}

      <p className="muted" style={{ marginTop: 12 }}>
        {j.component} · Source:{" "}
        <a href={j.source.url} target="_blank" rel="noreferrer">
          Statistics Canada table {j.source.table}
        </a>
        {j.revenue && (
          <>
            {" "}· revenue from{" "}
            <a href={j.revenue.source.url} target="_blank" rel="noreferrer">
              table {j.revenue.source.table}
            </a>
          </>
        )}{" "}
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
