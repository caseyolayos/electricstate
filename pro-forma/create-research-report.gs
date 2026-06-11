/**
 * Electric State AI Research Report — Fortinet (FTNT) & Datadog (DDOG)
 * =====================================================================
 * HOW TO USE:
 * 1. Go to script.google.com → New Project
 * 2. Paste this entire script, replacing any existing code
 * 3. Select function "createResearchReport" from the dropdown
 * 4. Click Run → grant permissions if asked → a Google Doc will open
 */

function createResearchReport() {
  const doc = DocumentApp.create('AI Equity Research Report — FTNT & DDOG (May 2026)');
  const body = doc.getBody();

  // ── Style helpers ────────────────────────────────────────────────
  function addHeading(text, level) {
    const style = level === 1 ? DocumentApp.ParagraphHeading.HEADING1
                : level === 2 ? DocumentApp.ParagraphHeading.HEADING2
                : level === 3 ? DocumentApp.ParagraphHeading.HEADING3
                :               DocumentApp.ParagraphHeading.HEADING4
    const p = body.appendParagraph(text)
    p.setHeading(style)
    return p
  }

  function addParagraph(text) {
    return body.appendParagraph(text)
  }

  function addBullet(text, level) {
    const p = body.appendListItem(text)
    p.setGlyphType(DocumentApp.GlyphType.BULLET)
    p.setNestingLevel(level || 0)
    return p
  }

  function addTable(headers, rows) {
    const numCols = headers.length
    const numRows = rows.length + 1
    const table = body.appendTable()

    // Header row
    const headerRow = table.appendTableRow()
    headers.forEach(h => {
      const cell = headerRow.appendTableCell(h)
      cell.getChild(0).asParagraph().setBold(true)
      cell.setBackgroundColor('#1a1a2e')
      try { cell.getChild(0).asParagraph().setForegroundColor('#C8FF00') } catch(e) {}
    })

    // Data rows
    rows.forEach((row, rowIdx) => {
      const tr = table.appendTableRow()
      row.forEach(cell => {
        const tc = tr.appendTableCell(cell)
        if (rowIdx % 2 === 1) tc.setBackgroundColor('#f0f4f0')
      })
    })

    return table
  }

  function addDivider() {
    const p = body.appendParagraph('────────────────────────────────────────────────────────')
    p.setForegroundColor('#cccccc')
    p.setFontSize(8)
    return p
  }

  function addSpacer() {
    body.appendParagraph('')
  }

  // ════════════════════════════════════════════════════════════════
  // TITLE
  // ════════════════════════════════════════════════════════════════
  const title = body.appendParagraph('AI EQUITY RESEARCH REPORT')
  title.setHeading(DocumentApp.ParagraphHeading.TITLE)
  title.setBold(true)

  const subtitle = body.appendParagraph('Fortinet (NASDAQ: FTNT) & Datadog (NASDAQ: DDOG)')
  subtitle.setHeading(DocumentApp.ParagraphHeading.SUBTITLE)

  body.appendParagraph('Data as of May 8, 2026  |  For informational purposes only — not financial advice').setItalic(true)
  addSpacer()

  // ════════════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ════════════════════════════════════════════════════════════════
  addHeading('Executive Summary', 1)

  addTable(
    ['', 'FTNT', 'DDOG'],
    [
      ['Price (May 8, 2026)',   '$114.07',          '$200.16'],
      ['Market Cap',           '~$84B',             '~$71B'],
      ['Analyst Consensus',    'Hold',              'Strong Buy'],
      ['Avg Price Target',     '$99.04 (−13%)',     '$204.82 (+2%)'],
      ['TTM Revenue',          '$7.11B',            '$3.67B'],
      ['Revenue Growth (YoY)', '16%',               '30%'],
      ['Gross Margin',         '80%',               '80%'],
      ['FCF Margin',           '34%',               '29%'],
      ['Forward P/E (FY26)',   '37.5x',             '90x'],
    ]
  )
  addSpacer()

  addParagraph('Both are high-quality businesses with ~80% gross margins and strong free cash flow. The core tradeoff: FTNT is a profitable compounder trading above analyst consensus following a blowout Q1 2026; DDOG is a high-growth platform with direct AI tailwinds trading at a significant premium but with much stronger buy-side conviction.')
  addSpacer()
  addDivider()
  addSpacer()

  // ════════════════════════════════════════════════════════════════
  // FORTINET
  // ════════════════════════════════════════════════════════════════
  addHeading('1. Fortinet (FTNT)', 1)

  addHeading('Business Overview', 2)
  addParagraph('Fortinet is the global leader in network security, built around FortiOS — a single operating system running across all its products. Unlike pure-software competitors, Fortinet designs its own silicon (FortiASIC chips), enabling 2–3x the price/performance ratio versus software-only peers. Its platform spans Secure Networking (firewalls), Unified SASE, OT Security, and Security Operations.')
  addSpacer()

  addHeading('Q1 2026 Earnings — Just Reported (May 7, 2026)', 2)
  addParagraph('Fortinet delivered a significant beat-and-raise quarter:')
  addBullet('Billings +31% YoY — sharp acceleration from ~14% in FY2025', 0)
  addBullet('Revenue +20% YoY', 0)
  addBullet('Product revenue +41% YoY — hardware demand rebounding strongly', 0)
  addBullet('OT (Operational Technology) billings +70% — critical infrastructure security surging', 0)
  addBullet('Record $1.0B free cash flow in a single quarter', 0)
  addBullet('GAAP EPS +29% YoY', 0)
  addBullet('Non-GAAP operating margin: 36% | GAAP operating margin: 31%', 0)
  addBullet('Full-year 2026 guidance raised', 0)
  addSpacer()

  addParagraph('The 31% billings acceleration (from ~14% annual growth) is the most important signal. Billings lead revenue by 6–12 months, meaning FY2026 revenue growth should accelerate materially from the FY2025 pace. CEO Ken Xie called out FortiOS 8.0, FortiASIC innovation, and AI-driven SASE demand as key drivers.')
  addSpacer()

  addHeading('Financial Profile', 2)
  addTable(
    ['Metric', 'FY2023', 'FY2024', 'FY2025', 'TTM (Mar \'26)'],
    [
      ['Revenue',          '$5.31B', '$5.96B', '$6.80B', '$7.11B'],
      ['Revenue Growth',   '20%',    '12%',    '14%',    '16%'],
      ['Gross Margin',     '77%',    '81%',    '80%',    '80%'],
      ['Operating Margin', '23%',    '30%',    '31%',    '31%'],
      ['Net Income',       '$1.15B', '$1.75B', '$1.85B', '$1.96B'],
      ['Free Cash Flow',   '$1.73B', '$1.88B', '$2.23B', '$2.44B'],
      ['FCF Margin',       '33%',    '32%',    '33%',    '34%'],
      ['EPS (GAAP)',       '$1.46',  '$2.26',  '$2.42',  '$2.59'],
      ['EPS Growth',       '+38%',   '+55%',   '+7%',    '+7%'],
    ]
  )
  addSpacer()

  addHeading('Competitive Moat', 2)
  addBullet('Platform consolidation: Enterprises reducing from 10+ security vendors to 1–2. Fortinet\'s integrated FortiOS wins this trend directly.', 0)
  addBullet('Hardware advantage: FortiASIC chips deliver higher performance at lower cost vs. software-only competitors (Palo Alto, Check Point).', 0)
  addBullet('OT security leadership: Industrial/critical infrastructure security is one of the fastest-growing segments in cybersecurity. 70% billings growth signals real market share capture.', 0)
  addBullet('Native SASE integration: Fortinet integrates SASE natively into FortiOS — eliminating the bolted-on approach competitors rely on.', 0)
  addBullet('Massive installed base: 700k+ customers globally, creating a massive cross-sell opportunity as they expand across the platform.', 0)
  addSpacer()

  addHeading('Valuation', 2)
  addTable(
    ['', 'FY2026E', 'FY2027E'],
    [
      ['Revenue',        '$7.75B',  '$8.57B'],
      ['Revenue Growth', '14%',     '10.5%'],
      ['Non-GAAP EPS',   '$3.04',   '$3.38'],
      ['Forward P/E',    '37.5x',   '33.8x'],
    ]
  )
  addSpacer()

  addParagraph('At $114 with a consensus target of $99, analysts are behind the ball post-Q1. The stock jumped 5.65% on earnings and most price targets were set before the report. Multiple target upgrades are likely in the coming days. Key banks (Citi, Barclays, Susquehanna, UBS) all moved targets to $115 — essentially current price — and TD Cowen (Strong Buy) targets $125.')
  addSpacer()

  addHeading('Bull Case 🟢', 2)
  addBullet('31% billings acceleration signals 20%+ revenue growth re-rating for H2 2026', 0)
  addBullet('OT security still early innings — critical infrastructure globally is massively underprotected', 0)
  addBullet('SASE market projected at $50B+ by 2030; Fortinet natively integrated vs. competitors\' stitched-together solutions', 0)
  addBullet('$2.4B annual FCF with active buybacks — EPS growth will consistently exceed revenue growth', 0)
  addBullet('AI-driven network complexity creates structural, growing demand for security platforms', 0)
  addBullet('Record free cash flow ($1B in a single quarter) demonstrates durability of business model', 0)
  addSpacer()

  addHeading('Bear Case 🔴', 2)
  addBullet('At $114, stock trades 15% above the consensus analyst target — valuation stretched relative to 14% baseline revenue growth', 0)
  addBullet('Palo Alto Networks and Cisco are aggressively competing on platformization and SASE', 0)
  addBullet('Hardware revenue creates cyclicality — the 41% product revenue growth is partly a refresh cycle, not pure share gain', 0)
  addBullet('10–14% revenue growth, even with margin expansion, is modest vs. higher-growth cybersecurity peers', 0)
  addBullet('Billings growth acceleration needs to translate into sustained revenue acceleration — still early to confirm', 0)
  addSpacer()
  addDivider()
  addSpacer()

  // ════════════════════════════════════════════════════════════════
  // DATADOG
  // ════════════════════════════════════════════════════════════════
  addHeading('2. Datadog (DDOG)', 1)

  addHeading('Business Overview', 2)
  addParagraph('Datadog is the dominant observability and monitoring platform for cloud-native infrastructure. It ingests metrics, logs, and traces across a company\'s entire cloud stack — giving engineering teams a single pane of glass. What started as infrastructure monitoring has expanded into 20+ products spanning APM, log management, security, synthetics, database monitoring, and most critically: AI/LLM observability — a rapidly emerging category where Datadog has first-mover advantage.')
  addSpacer()

  addHeading('Q1 2026 Earnings — Just Reported (May 8, 2026)', 2)
  addParagraph('Datadog surpassed a major milestone:')
  addBullet('Revenue +32% YoY — first time exceeding $1 billion in a single quarter', 0)
  addBullet('Growth accelerating from 27.7% for full FY2025', 0)
  addBullet('FY2026 guidance raised', 0)
  addBullet('Strong performance across both AI-native and traditional enterprise customers', 0)
  addBullet('LLM observability seeing rapid adoption — new product, meaningful traction', 0)
  addBullet('Land-and-expand model working — customers adding more products, larger deal sizes', 0)
  addBullet('Re-domicile from Delaware to Nevada approved by shareholders', 0)
  addSpacer()

  addHeading('Financial Profile', 2)
  addTable(
    ['Metric', 'FY2023', 'FY2024', 'FY2025', 'TTM (Mar \'26)'],
    [
      ['Revenue',              '$2.13B',  '$2.68B',  '$3.43B',  '$3.67B'],
      ['Revenue Growth',       '27%',     '26%',     '28%',     '30%'],
      ['Gross Margin',         '81%',     '81%',     '80%',     '80%'],
      ['GAAP Op. Margin',      '−2%',     '+2%',     '−1%',     '−1%'],
      ['GAAP Net Income',      '$48.6M',  '$183.8M', '$107.7M', '$135.7M'],
      ['Free Cash Flow',       '$632M',   '$836M',   '$1.00B',  '$1.06B'],
      ['FCF Margin',           '30%',     '31%',     '29%',     '29%'],
      ['Non-GAAP EPS',         '$0.14',   '$0.52',   '$0.31',   '$0.39'],
    ]
  )
  addSpacer()

  addParagraph('Note on GAAP operating margin: Datadog runs near breakeven on GAAP operating income because it invests aggressively in R&D and sales. FCF margin (~29%) is the better profitability metric — the business generates over $1 billion in real cash annually. Analysts use non-GAAP EPS (excluding stock-based compensation) for valuation purposes.')
  addSpacer()

  addHeading('The AI Angle — The Core Growth Thesis', 2)
  addParagraph('Datadog has a uniquely strong AI tailwind with two compounding drivers:')
  addSpacer()
  addBullet('AI infrastructure needs observability. Every company building with LLMs needs to monitor inference costs, latency, accuracy, and token usage. Datadog built LLM observability natively and is the leading platform for this emerging requirement.', 0)
  addBullet('AI creates more infrastructure to monitor. AI workloads run on GPU clusters, vector databases, and complex microservices — all of which need monitoring. More AI spend = more Datadog usage volume = higher revenue (usage-based pricing model).', 0)
  addSpacer()
  addParagraph('Management highlighted both AI-native companies (new businesses built on AI) and traditional enterprises (adding AI workloads to existing infrastructure) as separate, additive growth drivers. This is a structural tailwind — not a one-time benefit.')
  addSpacer()

  addHeading('Competitive Moat', 2)
  addBullet('Platform stickiness: Once engineering teams instrument their stack with Datadog, switching costs are enormous — dashboards, alerts, on-call workflows, and years of historical data all live in Datadog.', 0)
  addBullet('Land and expand: Average customer uses 4+ products. More products = higher revenue per customer = better net revenue retention (historically 130%+ NRR).', 0)
  addBullet('Usage-based pricing: Revenue grows automatically as customers\' cloud infrastructure grows — no re-negotiation needed.', 0)
  addBullet('20+ product suite: Monitoring, security, AI observability — becoming the operating system for cloud engineering.', 0)
  addBullet('Developer-first adoption: Engineers choose Datadog organically; it expands upward through organizations, not the reverse.', 0)
  addSpacer()

  addHeading('Analyst Consensus — Strongest Buy Rating', 2)
  addParagraph('34 analysts cover DDOG. Following Q1 2026 earnings on May 8, major upgrades:')
  addTable(
    ['Analyst', 'Firm', 'Rating', 'Price Target', 'Action'],
    [
      ['Steve Koenig',    'Macquarie', 'Buy',        '$230', 'Raised from $200'],
      ['Karl Keirstead',  'UBS',       'Strong Buy', '$220', 'Raised from $195'],
      ['Patrick Colville','Scotiabank','Buy',        '$225', 'Raised from $160'],
      ['Fatima Boolani',  'Citigroup', 'Strong Buy', '$218', 'Raised from $175'],
      ['Peter Weed',      'Bernstein', 'Buy',        '$180', 'Raised from $167'],
    ]
  )
  addSpacer()
  addParagraph('Consensus: 14 Strong Buy | 18 Buy | 2 Hold | 0 Sell — unusually high conviction across the street.')
  addSpacer()

  addHeading('Valuation', 2)
  addTable(
    ['', 'FY2026E', 'FY2027E'],
    [
      ['Revenue',           '$4.20B', '$5.02B'],
      ['Revenue Growth',    '22.6%',  '19.4%'],
      ['Non-GAAP EPS',      '$2.21',  '$2.70'],
      ['Forward P/E',       '90x',    '74x'],
      ['Avg Price Target',  '$204.82','—'],
    ]
  )
  addSpacer()

  addParagraph('At 90x forward earnings, Datadog is expensive by any traditional metric. However, it has consistently traded at a premium due to its growth rate, platform stickiness, and expanding TAM. PEG ratio of ~4x is high but within range for best-in-class SaaS platforms with 80% gross margins. The 2.33% upside to consensus target suggests analysts view current pricing as approximately fair — upside depends on continued execution.')
  addSpacer()

  addHeading('Bull Case 🟢', 2)
  addBullet('Q1 2026 broke the $1B quarterly revenue milestone with accelerating growth (32% vs 28% in FY2025)', 0)
  addBullet('AI observability is a net-new product category — Datadog is defining it, not competing in it', 0)
  addBullet('Platform expansion into cloud security is a $20B+ TAM extension with natural upsell to existing customers', 0)
  addBullet('Usage-based pricing means Datadog revenue grows automatically with customer cloud spend', 0)
  addBullet('$1B+ annual FCF and growing — self-funding, no dilutive capital raises needed', 0)
  addBullet('Strong buy consensus with multiple price target upgrades post-Q1 — institutional momentum building', 0)
  addSpacer()

  addHeading('Bear Case 🔴', 2)
  addBullet('90x forward earnings is unforgiving — any miss or guidance cut triggers a significant drawdown', 0)
  addBullet('AWS CloudWatch, Azure Monitor, and GCP Cloud Ops are free for users of those platforms and improving rapidly', 0)
  addBullet('Grafana (open source) + Prometheus represents a cost-driven alternative for engineering teams willing to self-manage', 0)
  addBullet('Usage-based pricing is a double-edged sword — enterprise cost-optimization cycles can hit revenue quickly', 0)
  addBullet('Stock up significantly from 2025 lows; much of the valuation re-rating may already be priced in', 0)
  addBullet('GAAP profitability remains near zero despite scale — stock-based comp dilution is meaningful at ~1.3% annually', 0)
  addSpacer()
  addDivider()
  addSpacer()

  // ════════════════════════════════════════════════════════════════
  // SIDE BY SIDE
  // ════════════════════════════════════════════════════════════════
  addHeading('Side-by-Side Comparison', 1)

  addTable(
    ['', 'FTNT', 'DDOG'],
    [
      ['Sector',                  'Network Security',             'Cloud Observability'],
      ['Revenue Growth (recent)', '20% (Q1 2026)',                '32% (Q1 2026)'],
      ['Gross Margin',            '80%',                          '80%'],
      ['FCF Margin',              '34%',                          '29%'],
      ['GAAP Profitability',      '✅ Highly profitable',          '⚠️ Near GAAP breakeven'],
      ['Forward P/E (FY26)',      '37.5x',                        '90x'],
      ['Analyst Consensus',       'Hold (majority)',              'Strong Buy (unanimously)'],
      ['Price vs. Target',        '15% ABOVE target',             '2% below target'],
      ['AI Exposure',             'Indirect (AI drives demand)',   'Direct (LLM observability)'],
      ['Capital Returns',         'Active buybacks',              'Minimal'],
      ['Valuation Risk',          'Medium',                       'High'],
      ['Growth Risk',             'Medium',                       'Low'],
      ['Best for investor type',  'Quality/value compounder',     'High-growth, long horizon'],
    ]
  )
  addSpacer()
  addDivider()
  addSpacer()

  // ════════════════════════════════════════════════════════════════
  // BOTTOM LINE
  // ════════════════════════════════════════════════════════════════
  addHeading('Bottom Line', 1)

  addHeading('Fortinet (FTNT)', 2)
  addParagraph('A quality cybersecurity compounder that just delivered a genuine inflection quarter. The 31% billings growth was not expected at this scale and signals revenue re-acceleration through 2026. Trading at 15% above the consensus analyst target, some near-term price target upgrades are coming — but the stock has already priced in much of the good news from earnings. At 37x forward earnings for a business generating $2.4B in annual FCF with expanding margins, it is not cheap, but it is not a bubble. The OT security and SASE narratives are credible and the installed base is enormous.')
  addSpacer()
  addParagraph('Suitable for: Investors seeking quality cybersecurity exposure with moderate valuation risk and capital return discipline.')
  addSpacer()

  addHeading('Datadog (DDOG)', 2)
  addParagraph('The stronger institutional conviction play. 34 analysts nearly unanimously bullish, revenue accelerating through 30%, and the AI observability narrative is real — not just marketing. Crossing $1B in quarterly revenue with accelerating growth is a meaningful milestone. The 90x forward P/E is the risk, requiring continued flawless execution. The usage-based model means results are inherently volatile to macro conditions, but in an environment of rising cloud spend and AI infrastructure buildout, Datadog is positioned as well as any software company in the market.')
  addSpacer()
  addParagraph('Suitable for: Investors with a 2–3+ year horizon, comfortable with premium valuations, seeking direct exposure to cloud infrastructure and AI spending growth.')
  addSpacer()

  addHeading('If forced to choose one:', 2)
  addParagraph('DDOG has meaningfully stronger buy-side conviction, faster growth, a cleaner AI narrative, and trades near its consensus analyst target. FTNT had the more surprising earnings beat relative to expectations but is priced above where most analysts think it should be. For growth-oriented portfolios: DDOG. For quality/FCF-focused portfolios: FTNT.')
  addSpacer()
  addDivider()
  addSpacer()

  // Disclaimer
  const disclaimer = body.appendParagraph('⚠️ DISCLAIMER: This report is for informational purposes only and does not constitute investment advice, a solicitation, or a recommendation to buy or sell any security. All data sourced from public filings, earnings transcripts, and analyst reports as of May 8, 2026. Past performance does not guarantee future results. Always conduct your own research and consult a licensed financial advisor before making investment decisions.')
  disclaimer.setItalic(true)
  disclaimer.setFontSize(9)

  // ── Finalize ────────────────────────────────────────────────────
  doc.saveAndClose()
  const url = doc.getUrl()
  Logger.log('✅ Report created: ' + url)
  DocumentApp.openById(doc.getId())

  SpreadsheetApp.getUi
    ? null
    : DocumentApp.getUi().alert('✅ Report created!\n\n' + url)
}
