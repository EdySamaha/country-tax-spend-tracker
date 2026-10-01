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
        {index && (
          <> Data covers fiscal years <b>{index.availableYears[0]}</b> through <b>{index.latestYear}</b>,
          retrieved {index.source.retrievedAt}.</>
        )}
      </p>

      <h3>Where the money comes from (taxes vs grants)</h3>
      <p>
        The revenue split uses Statistics Canada&rsquo;s Canadian Government Finance Statistics:{" "}
        <a href="https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1010001601" target="_blank" rel="noreferrer">
          10-10-0016-01
        </a>{" "}
        (federal) and{" "}
        <a href="https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1010001701" target="_blank" rel="noreferrer">
          10-10-0017-01
        </a>{" "}
        (provinces &amp; territories). We show <b>Taxes</b>, <b>Grants</b>, and <b>Other</b> as shares of
        total revenue. <b>Grants here means transfers received from other governments</b> — chiefly federal
        transfers to the provinces. That is why a province can show a large grants share while the federal
        government&rsquo;s own grants revenue is close to zero: it is on the paying side of those transfers,
        not the receiving side. &ldquo;Other&rdquo; covers social contributions, investment income, sales of
        goods and services, and the like.
      </p>

      <h3>Category drill-down</h3>
      <p>
        Where a government reports <b>sub-functions</b> within a category, you can expand that category to see
        them. In practice StatCan publishes this 4-digit detail for the <b>federal government only</b>;
        provinces report at the ten-function level, so their categories don&rsquo;t expand.
      </p>

      <h3>What the money funds (flagship federal programs)</h3>
      <p>
        The third card lists the <b>largest named federal programs</b> behind the government&rsquo;s top
        categories, so a category like &ldquo;Social protection&rdquo; becomes concrete programs you can
        recognise. This is a <b>curated selection of flagship programs — not an exhaustive list</b> — with
        every dollar figure sourced individually from the{" "}
        <a href="https://www.canada.ca/en/department-finance/services/publications/annual-financial-report/2024.html" target="_blank" rel="noreferrer">
          Annual Financial Report of the Government of Canada 2023&ndash;24
        </a>{" "}
        and Finance Canada&rsquo;s{" "}
        <a href="https://www.canada.ca/en/department-finance/programs/federal-transfers/major-federal-transfers.html" target="_blank" rel="noreferrer">
          Major federal transfers
        </a>
        . Each program is mapped by hand to its <b>best-fitting CCOFOG category</b> (for example, the Canada
        Health Transfer to Health; Old Age Security to Social protection; public debt charges to General
        public services).
      </p>
      <p>
        Two honest caveats: the program figures are for <b>2023&ndash;24</b> (the latest reported year) even
        when you move the year selector, because they are hand-sourced rather than part of the StatCan time
        series; and &ldquo;reach&rdquo; describes <b>who a program pays</b> (seniors, families, provinces)
        rather than a precise beneficiary count, which the published summaries don&rsquo;t give uniformly.
        This layer is <b>federal only</b> — provinces and territories publish no comparable uniform
        program feed.
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
        <li><b>Sub-category and named-project detail is federal-only.</b> Provinces publish spending at the ten-function level and have no uniform named-project feed, so their categories don&rsquo;t drill down.</li>
        <li><b>Revenue and expense are different measures.</b> The taxes-vs-grants bar describes money coming in; the categories describe money going out. They won&rsquo;t sum to the same total.</li>
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
