import { useEffect, useState } from "react";
import type { Jurisdiction, ProgramsFile, ProgramDatum } from "../types";
import { formatCAD, formatPct, loadPrograms } from "../lib";

interface Props {
  js: Jurisdiction[]; // one or two selected jurisdictions, already sliced to a year
}

/**
 * Third full-width card: the biggest named programs behind each of the top
 * spending categories. Named-program data is federal-only and curated (see
 * federal_programs.json / Methodology), so provinces get an honest note.
 * Ranked by cost; each program also carries a reach descriptor ("who it goes
 * to") and its share of the category.
 */
export default function SpendingDetail({ js }: Props) {
  const fed = js.find((j) => j.kind === "federal");
  const [programs, setPrograms] = useState<ProgramsFile | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "absent">("idle");

  useEffect(() => {
    if (!fed || loadState !== "idle") return;
    setLoadState("loading");
    loadPrograms().then((p) => {
      setPrograms(p);
      setLoadState(p ? "ready" : "absent");
    });
  }, [fed, loadState]);

  if (js.length === 0) return null;

  const provinceNames = js.filter((j) => j.kind !== "federal").map((j) => j.name);

  // Top 3 categories of the federal government for the displayed year.
  const top3 = fed ? fed.functions.slice(0, 3) : [];

  return (
    <div className="card detail-card">
      <h2 className="section-title">What the money funds</h2>

      {!fed && (
        <p className="muted" style={{ marginTop: 0 }}>
          Named program-level spending isn&rsquo;t published uniformly by provinces and territories, so this
          breakdown is available for the <b>federal government</b> only. Select Canada (federal) — on its own
          or alongside {provinceNames[0] ?? "a province"} — to see its largest programs by category.
        </p>
      )}

      {fed && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            The largest federal programs behind {fed.name}&rsquo;s top three categories in{" "}
            <b>{fed.fiscalYear}</b>, ranked by annual cost. &ldquo;Reach&rdquo; shows who each program pays.
            {provinceNames.length > 0 && (
              <>
                {" "}
                {provinceNames.join(" and ")} publish{provinceNames.length === 1 ? "es" : ""} no comparable
                program feed, so {provinceNames.length === 1 ? "it isn't" : "they aren't"} shown here.
              </>
            )}
          </p>

          {loadState === "loading" && <p className="muted">Loading programs…</p>}

          {loadState === "absent" && (
            <p className="muted">The federal programs file isn&rsquo;t available.</p>
          )}

          {loadState === "ready" && programs && (
            <>
              {top3.map((cat) => {
                const items: ProgramDatum[] = programs.programs
                  .filter((p) => p.category === cat.name)
                  .sort((a, b) => b.amount - a.amount);
                return (
                  <div className="prog-group" key={cat.name}>
                    <div className="prog-group-head">
                      <span>{cat.name}</span>
                      <span className="share">
                        {formatCAD(cat.amount)} · {formatPct(cat.share)} of budget
                      </span>
                    </div>
                    {items.length === 0 ? (
                      <p className="muted" style={{ margin: "6px 0" }}>
                        No individual flagship program is itemised for this category.
                      </p>
                    ) : (
                      items.map((p) => (
                        <div className="prog-row" key={p.name}>
                          <div className="prog-main">
                            <span className="prog-name">
                              <a href={p.source.url} target="_blank" rel="noreferrer" title={p.source.label}>
                                {p.name}
                              </a>
                            </span>
                            <span className="prog-reach">{p.reach}</span>
                          </div>
                          <div className="prog-fig">
                            <div className="prog-amt">{formatCAD(p.amount)}</div>
                            <div className="prog-pct">
                              {cat.amount ? formatPct(p.amount / cat.amount, 0) : "—"} of {cat.name.toLowerCase()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}

              <p className="muted" style={{ marginTop: 14 }}>
                Curated flagship programs for <b>{programs.fiscalYear}</b> (latest reported), each sourced
                individually — a selection, not the full list. Program figures are {programs.fiscalYear}; the
                category totals follow the year selected above. Federal only — see{" "}
                <a href="#view=methodology">Methodology</a>.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
