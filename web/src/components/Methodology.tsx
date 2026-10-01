import type { IndexFile } from "../types";

export default function Methodology({ index }: { index: IndexFile | null }) {
  return (
    <div className="prose">
      <h2 className="section-title">Methodology &amp; sources</h2>

      <p>
        <b>How Canada Spends</b> shows how governments in Canada allocate their spending across the
        major functions of government — health, education, social protection, and so on. It is about{" "}
        <b>where public money goes in aggregate</b>, not about any individual&rsquo;s tax bill.
      </p>

      <h3>Where the numbers come from</h3>
      <p>
        Every figure comes from a single official source: Statistics Canada table{" "}
        <a href="https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1010002401" target="_blank" rel="noreferrer">
          10-10-0024-01
        </a>
        , <i>Canadian Classification of Functions of Government (CCOFOG), by general government component</i>.
        Using one source means every jurisdiction is measured on the <b>same category scheme</b>, which is
        what makes an apples-to-apples comparison possible.
        {index && <> Current data is for fiscal year <b>{index.fiscalYear}</b>, retrieved {index.source.retrievedAt}.</>}
      </p>

      <h3>What we show for each government</h3>
      <ul>
        <li><b>Federal:</b> the federal government&rsquo;s own spending (GEO &ldquo;Canada&rdquo;, component &ldquo;Federal government&rdquo;).</li>
        <li><b>Provinces &amp; territories:</b> each government&rsquo;s own spending (component &ldquo;Provincial and territorial governments&rdquo;).</li>
        <li>Only the <b>ten top-level CCOFOG functions</b> are shown, so categories sum to the total without double-counting sub-functions.</li>
        <li>Comparisons use each function&rsquo;s <b>share of that government&rsquo;s budget</b>, so a small province and the federal government can be compared fairly.</li>
      </ul>

      <h3>Honest limitations</h3>
      <ul>
        <li><b>It&rsquo;s an approximation.</b> Money is fungible — no tax dollar is truly earmarked. Shares describe how the pooled budget is allocated.</li>
        <li><b>These are consolidated actuals with a reporting lag,</b> not a live budget. The most recent year available is typically a year or two behind.</li>
        <li><b>Municipalities, school boards, universities, and pension plans are separate components</b> in the source and are not folded into the provincial figures here.</li>
        <li><b>No project-level detail yet.</b> This view is by function; individual programs and grants are a planned future addition.</li>
      </ul>

      <h3>Why this exists</h3>
      <p>
        Official tools like GC InfoBase are thorough but hard for a non-expert to navigate. The goal here is a
        simple, visual, honest answer to &ldquo;how does my government spend, and how does that compare to my
        neighbours?&rdquo; — built entirely on citable public data.
      </p>
    </div>
  );
}
