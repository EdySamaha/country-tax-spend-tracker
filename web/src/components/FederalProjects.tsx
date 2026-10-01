import { useEffect, useState } from "react";
import type { Jurisdiction, ProjectsFile, ProjectAgg } from "../types";
import { formatCAD, loadProjects } from "../lib";

interface Props {
  j: Jurisdiction;
}

/**
 * Federal "named projects" explorer (Grants & Contributions). Only meaningful
 * for the federal government; provinces don't publish a uniform feed, so they
 * get a single honest line. Collapsed by default and loaded on first open so it
 * never adds weight to the initial view.
 */
export default function FederalProjects({ j }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ProjectsFile | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "absent">("idle");
  const [tab, setTab] = useState<"programs" | "recipients">("programs");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open || state !== "idle") return;
    setState("loading");
    loadProjects().then((d) => {
      if (d) {
        setData(d);
        setState("ready");
      } else {
        setState("absent");
      }
    });
  }, [open, state]);

  if (j.kind !== "federal") {
    return (
      <p className="muted" style={{ marginTop: 14 }}>
        Named project-level spending isn&rsquo;t published uniformly by provinces and territories, so a
        project explorer is available for the federal government only.
      </p>
    );
  }

  const list: ProjectAgg[] = data ? (tab === "programs" ? data.topPrograms : data.topRecipients) : [];
  const filtered = q
    ? list.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          (p.department ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : list;
  const maxAmt = Math.max(1, ...filtered.map((p) => p.amount));

  return (
    <div className="card projects" style={{ marginTop: 16 }}>
      <button className="disclose" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className={`caret${open ? " open" : ""}`} aria-hidden>▸</span>
        <span>
          <b>Federal grants &amp; contributions</b> — explore named programs &amp; recipients
        </span>
      </button>

      {open && (
        <div className="projects-body">
          {state === "loading" && <p className="muted">Loading programs…</p>}

          {state === "absent" && (
            <p className="muted">
              The named-projects dataset hasn&rsquo;t been built yet. This layer comes from the federal{" "}
              Grants &amp; Contributions proactive disclosure (a very large file) and is optional — the
              spending and revenue views above are complete without it.
            </p>
          )}

          {state === "ready" && data && (
            <>
              <p className="muted" style={{ marginTop: 0 }}>{data.note}</p>
              <div className="totals" style={{ margin: "4px 0 12px" }}>
                <div className="stat">
                  <div className="num">{formatCAD(data.total)}</div>
                  <div className="lbl">agreements starting {data.fiscalYear}</div>
                </div>
                <div className="stat">
                  <div className="num">{data.count.toLocaleString("en-CA")}</div>
                  <div className="lbl">agreements</div>
                </div>
              </div>

              <div className="proj-controls">
                <div className="tabs">
                  <button className={tab === "programs" ? "active" : ""} onClick={() => setTab("programs")}>
                    Top programs
                  </button>
                  <button className={tab === "recipients" ? "active" : ""} onClick={() => setTab("recipients")}>
                    Top recipients
                  </button>
                </div>
                <input
                  className="proj-search"
                  placeholder="Filter…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Filter projects"
                />
              </div>

              <div className="chart">
                {filtered.map((p) => (
                  <div className="bar-row" key={p.name}>
                    <div className="bar-label">
                      <span className="name">
                        {p.name}
                        {p.department && <span className="dept"> · {p.department}</span>}
                      </span>
                      <span className="val">
                        {formatCAD(p.amount)} · {p.count.toLocaleString("en-CA")}
                      </span>
                    </div>
                    <div className="track">
                      <div className="bar" style={{ width: `${(p.amount / maxAmt) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p className="muted">No matches.</p>}
              </div>

              <p className="muted" style={{ marginTop: 12 }}>
                Source:{" "}
                <a href={data.source.url} target="_blank" rel="noreferrer">
                  {data.source.table}
                </a>{" "}
                (Open Government) · retrieved {data.source.retrievedAt}. Values are total agreement
                commitments, federal only, not mapped to the spending categories above.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
