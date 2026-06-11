/**
 * Electric State — Ticketing Pro Forma
 * =====================================
 * HOW TO USE:
 * 1. Open Google Sheets → Extensions → Apps Script
 * 2. Paste this entire script, replacing any existing code
 * 3. Click Run → createProForma
 * 4. A new spreadsheet will open with the full model
 *
 * Change the yellow cells in the "Assumptions" tab to update everything.
 */

function createProForma() {
  const ss = SpreadsheetApp.create('Electric State — Ticketing Pro Forma');

  // ── Color palette ───────────────────────────────────────────────
  const C = {
    neon:       '#C8FF00',  // Electric State brand
    neonDim:    '#E8FF99',
    darkBg:     '#111811',
    headerBg:   '#1A2E1A',
    headerText: '#C8FF00',
    inputBg:    '#FEFDE7',  // Yellow — editable cells
    calcBg:     '#F8FFF0',  // Light green — calculated
    rowAlt:     '#F4FFF4',
    red:        '#D32F2F',
    orange:     '#E65100',
    white:      '#FFFFFF',
    gray:       '#757575',
    darkText:   '#212121',
    border:     '#BDBDBD',
  }

  // Remove default blank sheet at the end
  const defaultSheet = ss.getActiveSheet()

  // ── Create all sheets ───────────────────────────────────────────
  const sheetAssumptions  = ss.insertSheet('Assumptions')
  const sheetUnitEcon     = ss.insertSheet('Unit Economics')
  const sheetYear1        = ss.insertSheet('Year 1 Monthly')
  const sheetOutlook      = ss.insertSheet('3-Year Outlook')
  const sheetScenarios    = ss.insertSheet('Scenarios')
  const sheetFestival     = ss.insertSheet('Festival Effect')
  ss.deleteSheet(defaultSheet)

  // ── Helper functions ────────────────────────────────────────────
  function header(sheet, row, col, text, bg, fg) {
    const cell = sheet.getRange(row, col)
    cell.setValue(text)
      .setBackground(bg || C.headerBg)
      .setFontColor(fg || C.headerText)
      .setFontWeight('bold')
      .setFontSize(10)
    return cell
  }

  function input(sheet, row, col, value, format) {
    const cell = sheet.getRange(row, col)
    cell.setValue(value)
      .setBackground(C.inputBg)
      .setFontColor(C.darkText)
      .setFontWeight('bold')
    if (format) cell.setNumberFormat(format)
    return cell
  }

  function calc(sheet, row, col, formula, format) {
    const cell = sheet.getRange(row, col)
    cell.setFormula(formula)
      .setBackground(C.calcBg)
      .setFontColor(C.darkText)
    if (format) cell.setNumberFormat(format)
    return cell
  }

  function label(sheet, row, col, text, bold) {
    const cell = sheet.getRange(row, col)
    cell.setValue(text)
      .setFontColor(C.darkText)
    if (bold) cell.setFontWeight('bold')
    return cell
  }

  function note(sheet, row, col, text) {
    sheet.getRange(row, col).setValue(text).setFontColor(C.gray).setFontStyle('italic').setFontSize(9)
  }

  function sectionTitle(sheet, row, text) {
    const cell = sheet.getRange(row, 1, 1, 8)
    cell.merge()
      .setValue(text)
      .setBackground(C.headerBg)
      .setFontColor(C.neon)
      .setFontWeight('bold')
      .setFontSize(11)
      .setVerticalAlignment('middle')
    sheet.setRowHeight(row, 28)
  }

  // ════════════════════════════════════════════════════════════════
  // SHEET 1 — ASSUMPTIONS
  // ════════════════════════════════════════════════════════════════
  const A = sheetAssumptions
  A.setColumnWidth(1, 260)
  A.setColumnWidth(2, 130)
  A.setColumnWidth(3, 340)

  // Title
  A.getRange(1, 1, 1, 3).merge()
    .setValue('⚡ ELECTRIC STATE — PRO FORMA ASSUMPTIONS')
    .setBackground(C.darkBg)
    .setFontColor(C.neon)
    .setFontWeight('bold')
    .setFontSize(14)
    .setVerticalAlignment('middle')
  A.setRowHeight(1, 40)

  A.getRange(2, 1, 1, 3).merge()
    .setValue('Change the highlighted yellow cells. Everything else updates automatically.')
    .setBackground(C.darkBg)
    .setFontColor('#AAAAAA')
    .setFontStyle('italic')
    .setFontSize(9)
  A.setRowHeight(2, 20)

  // ── Revenue ──
  sectionTitle(A, 4, 'REVENUE & FEES')
  A.setRowHeight(4, 26)

  label(A, 5, 1, 'Platform fee',          true); input(A, 5, 2, 0.05,  '0%');   note(A, 5, 3, 'Your cut of GMV')
  label(A, 6, 1, 'Average ticket price',  true); input(A, 6, 2, 35,    '$#,##0.00'); note(A, 6, 3, 'Blended avg across all tiers')
  label(A, 7, 1, 'Avg tickets per event', true); input(A, 7, 2, 125,   '#,##0'); note(A, 7, 3, 'Typical club night: 100–150')
  label(A, 8, 1, 'Avg tickets per order', true); input(A, 8, 2, 1.5,   '#,##0.0'); note(A, 8, 3, 'People often buy 2 — blended avg')

  // ── Stripe ──
  sectionTitle(A, 10, 'STRIPE PROCESSING (paid by you)')
  A.setRowHeight(10, 26)

  label(A, 11, 1, 'Stripe % rate',     true); input(A, 11, 2, 0.029, '0.0%'); note(A, 11, 3, 'Standard: 2.9% — negotiable at $1M+ volume')
  label(A, 12, 1, 'Stripe fixed fee',  true); input(A, 12, 2, 0.30,  '$#,##0.00'); note(A, 12, 3, 'Per transaction (per order, not per ticket)')

  // ── Costs ──
  sectionTitle(A, 14, 'OPERATING COSTS')
  A.setRowHeight(14, 26)

  label(A, 15, 1, 'Marketing (% of gross revenue)', true); input(A, 15, 2, 0.10,  '0%');   note(A, 15, 3, 'Spend 10% of gross back on growth')
  label(A, 16, 1, 'Annual hosting (Vercel)',         true); input(A, 16, 2, 20,    '$#,##0.00'); note(A, 16, 3, '$20/year = ~$1.67/month')

  // ── Year 1 Event Ramp ──
  sectionTitle(A, 18, 'YEAR 1 — MONTHLY EVENT TARGETS (edit these)')
  A.setRowHeight(18, 26)

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const defaultEvents = [2, 4, 7, 11, 16, 22, 30, 40, 52, 67, 85, 105]

  // Headers
  months.forEach((m, i) => {
    A.getRange(19, i + 2).setValue(m)
      .setFontWeight('bold')
      .setFontColor(C.gray)
      .setFontSize(9)
      .setHorizontalAlignment('center')
  })
  label(A, 20, 1, 'Events on platform', true)
  defaultEvents.forEach((v, i) => {
    input(A, 20, i + 2, v, '#,##0')
      .setHorizontalAlignment('center')
  })
  A.setColumnWidths(2, 12, 55)

  // ── Year 2 / Year 3 growth assumptions ──
  sectionTitle(A, 22, 'YEAR 2 & 3 GROWTH')
  A.setRowHeight(22, 26)

  label(A, 23, 1, 'Year 2 monthly events (avg)', true); input(A, 23, 2, 300,  '#,##0'); note(A, 23, 3, '~3x Year 1 exit rate')
  label(A, 24, 1, 'Year 3 monthly events (avg)', true); input(A, 24, 2, 900,  '#,##0'); note(A, 24, 3, '~3x Year 2 — national/global scale')

  // ── Negotiated Stripe ──
  sectionTitle(A, 26, 'STRIPE AT SCALE (Year 2+ negotiated rates)')
  A.setRowHeight(26, 26)

  label(A, 27, 1, 'Negotiated Stripe % rate', true); input(A, 27, 2, 0.022, '0.0%'); note(A, 27, 3, 'Typical at $1M+ volume with Stripe')
  label(A, 28, 1, 'Negotiated Stripe fixed',  true); input(A, 28, 2, 0.15,  '$#,##0.00'); note(A, 28, 3, '$0.15 vs $0.30 — halves the drag')

  A.setTabColor(C.neon)

  // ════════════════════════════════════════════════════════════════
  // SHEET 2 — UNIT ECONOMICS
  // ════════════════════════════════════════════════════════════════
  const U = sheetUnitEcon
  U.setColumnWidth(1, 270)
  U.setColumnWidth(2, 160)
  U.setColumnWidth(3, 160)
  U.setColumnWidth(4, 300)

  U.getRange(1, 1, 1, 4).merge()
    .setValue('⚡ UNIT ECONOMICS — PER EVENT')
    .setBackground(C.darkBg).setFontColor(C.neon)
    .setFontWeight('bold').setFontSize(14).setVerticalAlignment('middle')
  U.setRowHeight(1, 40)

  // Column headers
  const uHeaders = ['Metric', 'Standard Rate', 'At-Scale (Negotiated)', 'Notes']
  uHeaders.forEach((h, i) => header(U, 2, i + 1, h))

  const unitRows = [
    ['Avg ticket price',          "=Assumptions!B6",                         "=Assumptions!B6",                       'From assumptions'],
    ['Avg tickets per event',     "=Assumptions!B7",                         "=Assumptions!B7",                       'From assumptions'],
    ['Avg order size (tickets)',  "=Assumptions!B8",                         "=Assumptions!B8",                       'Affects Stripe fixed fee drag'],
    ['──────────────────────────────', '', '', ''],
    ['GMV per event',             "=B3*B4",                                   "=C3*C4",                                'Avg price × avg tickets'],
    ['Gross platform revenue',    "=B7*Assumptions!B5",                       "=C7*Assumptions!B5",                    '5% of GMV'],
    ['──────────────────────────────', '', '', ''],
    ['Orders per event',          "=ROUND(B4/B5,0)",                          "=ROUND(C4/C5,0)",                       'Tickets ÷ avg order size'],
    ['Stripe % fee',              "=B7*Assumptions!B11",                      "=C7*Assumptions!B27",                   'On full GMV processed'],
    ['Stripe fixed fees',         "=B10*Assumptions!B12",                     "=C10*Assumptions!B28",                  'Orders × fixed fee'],
    ['Total Stripe cost',         "=B11+B12",                                 "=C11+C12",                              'What Stripe takes'],
    ['──────────────────────────────', '', '', ''],
    ['Net platform revenue',      "=B8-B13",                                  "=C8-C13",                               'After Stripe'],
    ['Marketing spend',           "=B8*Assumptions!B15",                      "=C8*Assumptions!B15",                   '10% of gross rev'],
    ['Hosting (monthly alloc)',   "=Assumptions!B16/12",                      "=Assumptions!B16/12",                   '$20/yr ÷ 12'],
    ['──────────────────────────────', '', '', ''],
    ['Net profit per event',      "=B15-B16-B17",                             "=C15-C16-C17",                          'Clear profit per event'],
    ['Effective net margin',      "=IF(B7>0,B19/B7,0)",                       "=IF(C7>0,C19/C7,0)",                    'Net profit ÷ GMV'],
    ['Stripe as % of gross rev',  "=IF(B8>0,B13/B8,0)",                       "=IF(C8>0,C13/C8,0)",                    'How much Stripe eats of your gross revenue'],
  ]

  unitRows.forEach((row, i) => {
    const r = i + 3
    if (row[0].startsWith('──')) {
      U.getRange(r, 1, 1, 4).merge().setValue('')
        .setBackground('#E8F5E9').setFontSize(4)
      U.setRowHeight(r, 6)
      return
    }
    label(U, r, 1, row[0], true)
    if (row[1]) U.getRange(r, 2).setFormula(row[1]).setBackground(C.calcBg)
    if (row[2]) U.getRange(r, 3).setFormula(row[2]).setBackground(C.calcBg)
    if (row[3]) note(U, r, 4, row[3])
  })

  // Formats
  const dollarRows = [7,8,11,12,13,14,15,16,18]
  const pctRows    = [19,20]
  dollarRows.forEach(r => U.getRange(r, 2, 1, 2).setNumberFormat('$#,##0.00'))
  pctRows.forEach(r    => U.getRange(r, 2, 1, 2).setNumberFormat('0.0%'))
  // Integer rows
  ;[3,4,5,10].forEach(r => U.getRange(r, 2, 1, 2).setNumberFormat('#,##0.0'))

  // Highlight profit row
  U.getRange(18, 1, 1, 3).setBackground('#E8FFD0').setFontWeight('bold').setFontColor('#1B5E20')
  U.getRange(19, 2, 1, 2).setBackground('#FFF3E0')  // margin - attention orange

  U.setTabColor('#4CAF50')

  // ════════════════════════════════════════════════════════════════
  // SHEET 3 — YEAR 1 MONTHLY
  // ════════════════════════════════════════════════════════════════
  const Y = sheetYear1
  Y.setColumnWidth(1, 80)

  Y.getRange(1, 1, 1, 11).merge()
    .setValue('⚡ YEAR 1 — MONTH BY MONTH PROJECTION')
    .setBackground(C.darkBg).setFontColor(C.neon)
    .setFontWeight('bold').setFontSize(14).setVerticalAlignment('middle')
  Y.setRowHeight(1, 40)

  const y1Headers = ['Month', 'Events', 'GMV', 'Gross Rev (5%)', 'Stripe Cost', 'Net Revenue', 'Marketing', 'Hosting', 'Net Profit', 'Cumulative Profit', '% Margin (net/GMV)']
  y1Headers.forEach((h, i) => {
    Y.getRange(2, i + 1).setValue(h)
      .setBackground(C.headerBg).setFontColor(C.neon)
      .setFontWeight('bold').setFontSize(9)
      .setWrap(true)
    Y.setColumnWidth(i + 1, i === 0 ? 55 : i === 10 ? 120 : 110)
  })
  Y.setRowHeight(2, 40)

  for (let m = 1; m <= 12; m++) {
    const r = m + 2
    const eventsRef   = `Assumptions!${String.fromCharCode(65 + m)}20`  // B20 = col B = Jan, C20=Feb etc
    const unitGMV     = `'Unit Economics'!B7`
    const unitGross   = `'Unit Economics'!B8`
    const unitStripe  = `'Unit Economics'!B13`
    const unitNet     = `'Unit Economics'!B15`  // Net platform revenue (B14 is separator)
    const unitMkt     = `'Unit Economics'!B16`  // Marketing spend
    const unitHost    = `'Unit Economics'!B17`  // Hosting monthly alloc

    Y.getRange(r, 1).setValue(months[m - 1]).setFontWeight('bold').setHorizontalAlignment('center')
    Y.getRange(r, 2).setFormula(`=${eventsRef}`).setBackground(C.calcBg)
    Y.getRange(r, 3).setFormula(`=B${r}*${unitGMV}`).setBackground(C.calcBg).setNumberFormat('$#,##0')
    Y.getRange(r, 4).setFormula(`=B${r}*${unitGross}`).setBackground(C.calcBg).setNumberFormat('$#,##0.00')
    Y.getRange(r, 5).setFormula(`=B${r}*${unitStripe}`).setBackground('#FFF8F8').setFontColor(C.red).setNumberFormat('$#,##0.00')
    Y.getRange(r, 6).setFormula(`=B${r}*${unitNet}`).setBackground(C.calcBg).setNumberFormat('$#,##0.00')
    Y.getRange(r, 7).setFormula(`=B${r}*${unitMkt}`).setBackground('#FFF8F8').setFontColor(C.orange).setNumberFormat('$#,##0.00')
    Y.getRange(r, 8).setFormula(`=${unitHost}`).setBackground(C.calcBg).setNumberFormat('$#,##0.00')
    Y.getRange(r, 9).setFormula(`=F${r}-G${r}-H${r}`).setBackground(m % 2 === 0 ? '#E8FFD0' : '#F1FFE4').setFontWeight('bold').setNumberFormat('$#,##0.00')
    Y.getRange(r, 10).setFormula(m === 1 ? `=I${r}` : `=J${r-1}+I${r}`).setBackground(C.calcBg).setNumberFormat('$#,##0.00')
    Y.getRange(r, 11).setFormula(`=IF(C${r}>0,I${r}/C${r},0)`).setBackground(C.calcBg).setNumberFormat('0.00%')
  }

  // Totals row
  const tr = 15
  Y.getRange(tr, 1).setValue('TOTAL Y1').setFontWeight('bold').setBackground(C.headerBg).setFontColor(C.neon)
  for (let c = 2; c <= 11; c++) {
    const col = String.fromCharCode(64 + c)
    const fmt = c === 2 ? '#,##0' : c === 11 ? '0.00%' : '$#,##0.00'
    Y.getRange(tr, c)
      .setFormula(c === 11 ? `=IF(SUM(C3:C14)>0,I${tr}/C${tr},0)` : `=SUM(${col}3:${col}14)`)
      .setBackground(C.headerBg).setFontColor(C.neon).setFontWeight('bold')
      .setNumberFormat(fmt)
  }
  Y.setRowHeight(tr, 28)

  // Monthly run rate note
  Y.getRange(17, 1, 1, 6).merge()
    .setValue('Month 12 annualized run rate → multiply row 14 by 12 to see where you exit the year')
    .setFontStyle('italic').setFontColor(C.gray).setFontSize(9)

  Y.setTabColor('#8BC34A')

  // ════════════════════════════════════════════════════════════════
  // SHEET 4 — 3-YEAR OUTLOOK
  // ════════════════════════════════════════════════════════════════
  const O = sheetOutlook
  O.setColumnWidth(1, 200)

  O.getRange(1, 1, 1, 7).merge()
    .setValue('⚡ 3-YEAR OUTLOOK')
    .setBackground(C.darkBg).setFontColor(C.neon)
    .setFontWeight('bold').setFontSize(14).setVerticalAlignment('middle')
  O.setRowHeight(1, 40)

  const outlookHeaders = ['Metric', 'Year 1', 'Year 2 (standard Stripe)', 'Year 2 (negotiated Stripe)', 'Year 3 (standard)', 'Year 3 (negotiated)', 'Notes']
  outlookHeaders.forEach((h, i) => {
    O.getRange(2, i + 1).setValue(h)
      .setBackground(C.headerBg).setFontColor(C.neon)
      .setFontWeight('bold').setFontSize(9).setWrap(true)
    O.setColumnWidth(i + 1, i === 0 ? 200 : i === 6 ? 260 : 160)
  })
  O.setRowHeight(2, 45)

  // Data
  const Y2e = `Assumptions!B23`  // Year 2 monthly events
  const Y3e = `Assumptions!B24`  // Year 3 monthly events
  const Y1GMV    = `='Year 1 Monthly'!C15`
  const Y2GMV_s  = `=${Y2e}*12*'Unit Economics'!B7`
  const Y2GMV_n  = `=${Y2e}*12*'Unit Economics'!C7`
  const Y3GMV_s  = `=${Y3e}*12*'Unit Economics'!B7`
  const Y3GMV_n  = `=${Y3e}*12*'Unit Economics'!C7`

  const outlookRows = [
    {label: 'Total events',         y1: `='Year 1 Monthly'!B15`, y2s: `=${Y2e}*12`, y2n: `=${Y2e}*12`, y3s: `=${Y3e}*12`, y3n: `=${Y3e}*12`, fmt: '#,##0', note: 'Y2/Y3 = monthly avg × 12'},
    {label: 'Avg events/month',     y1: `='Year 1 Monthly'!B15/12`, y2s: Y2e, y2n: Y2e, y3s: Y3e, y3n: Y3e, fmt: '#,##0', note: ''},
    {label: '──────────────────', y1:'', y2s:'', y2n:'', y3s:'', y3n:'', fmt:'', note:''},
    {label: 'Annual GMV',           y1: Y1GMV, y2s: Y2GMV_s, y2n: Y2GMV_n, y3s: Y3GMV_s, y3n: Y3GMV_n, fmt: '$#,##0', note: 'Tickets × avg price × events'},
    {label: 'Gross platform rev (5%)', y1: `='Year 1 Monthly'!D15`, y2s: `=${Y2e}*12*'Unit Economics'!B8`, y2n: `=${Y2e}*12*'Unit Economics'!C8`, y3s: `=${Y3e}*12*'Unit Economics'!B8`, y3n: `=${Y3e}*12*'Unit Economics'!C8`, fmt: '$#,##0', note: ''},
    {label: 'Stripe costs',         y1: `='Year 1 Monthly'!E15`, y2s: `=${Y2e}*12*'Unit Economics'!B13`, y2n: `=${Y2e}*12*'Unit Economics'!C13`, y3s: `=${Y3e}*12*'Unit Economics'!B13`, y3n: `=${Y3e}*12*'Unit Economics'!C13`, fmt: '$#,##0', note: ''},
    {label: 'Net revenue',          y1: `='Year 1 Monthly'!F15`, y2s: `=${Y2e}*12*'Unit Economics'!B15`, y2n: `=${Y2e}*12*'Unit Economics'!C15`, y3s: `=${Y3e}*12*'Unit Economics'!B15`, y3n: `=${Y3e}*12*'Unit Economics'!C15`, fmt: '$#,##0', note: 'After Stripe'},
    {label: 'Marketing (10%)',      y1: `='Year 1 Monthly'!G15`, y2s: `=${Y2e}*12*'Unit Economics'!B16`, y2n: `=${Y2e}*12*'Unit Economics'!C16`, y3s: `=${Y3e}*12*'Unit Economics'!B16`, y3n: `=${Y3e}*12*'Unit Economics'!C16`, fmt: '$#,##0', note: ''},
    {label: 'Hosting',              y1: `=Assumptions!B16`, y2s: `=Assumptions!B16`, y2n: `=Assumptions!B16`, y3s: `=Assumptions!B16`, y3n: `=Assumptions!B16`, fmt: '$#,##0', note: ''},
    {label: '──────────────────', y1:'', y2s:'', y2n:'', y3s:'', y3n:'', fmt:'', note:''},
    {label: 'NET PROFIT',           y1: `='Year 1 Monthly'!I15`, y2s: `=${Y2e}*12*'Unit Economics'!B19`, y2n: `=${Y2e}*12*'Unit Economics'!C19`, y3s: `=${Y3e}*12*'Unit Economics'!B19`, y3n: `=${Y3e}*12*'Unit Economics'!C19`, fmt: '$#,##0', note: '', bold: true},
    {label: 'Net margin (of GMV)',  y1: `=IF(B6>0,B13/B6,0)`, y2s: `=IF(C6>0,C13/C6,0)`, y2n: `=IF(D6>0,D13/D6,0)`, y3s: `=IF(E6>0,E13/E6,0)`, y3n: `=IF(F6>0,F13/F6,0)`, fmt: '0.00%', note: 'Effective net margin on total ticket sales'},
  ]

  let oRow = 3
  outlookRows.forEach(row => {
    if (row.label.startsWith('──')) {
      O.getRange(oRow, 1, 1, 7).merge().setValue('').setBackground('#E8F5E9').setFontSize(4)
      O.setRowHeight(oRow, 6)
      oRow++
      return
    }
    const bold = row.bold || false
    O.getRange(oRow, 1).setValue(row.label).setFontWeight(bold ? 'bold' : 'normal')
    if (row.y1)  O.getRange(oRow, 2).setFormula(row.y1).setNumberFormat(row.fmt)
    if (row.y2s) O.getRange(oRow, 3).setFormula(row.y2s).setNumberFormat(row.fmt)
    if (row.y2n) O.getRange(oRow, 4).setFormula(row.y2n).setNumberFormat(row.fmt)
    if (row.y3s) O.getRange(oRow, 5).setFormula(row.y3s).setNumberFormat(row.fmt)
    if (row.y3n) O.getRange(oRow, 6).setFormula(row.y3n).setNumberFormat(row.fmt)
    if (row.note) note(O, oRow, 7, row.note)
    if (bold) {
      O.getRange(oRow, 1, 1, 7).setBackground('#E8FFD0').setFontWeight('bold').setFontColor('#1B5E20')
    }
    oRow++
  })

  O.setTabColor('#CDDC39')

  // ════════════════════════════════════════════════════════════════
  // SHEET 5 — SCENARIOS (sensitivity table)
  // ════════════════════════════════════════════════════════════════
  const S = sheetScenarios
  S.setColumnWidth(1, 200)

  S.getRange(1, 1, 1, 8).merge()
    .setValue('⚡ SCENARIOS — Annual Net Profit by Events/Month × Avg Ticket Price')
    .setBackground(C.darkBg).setFontColor(C.neon)
    .setFontWeight('bold').setFontSize(13).setVerticalAlignment('middle')
  S.setRowHeight(1, 40)

  S.getRange(2, 1, 1, 8).merge()
    .setValue('At standard Stripe rates (2.9% + $0.30). Assumes 125 tickets/event, 1.5 tickets/order, 10% marketing.')
    .setFontColor(C.gray).setFontStyle('italic').setFontSize(9)

  // Axis labels
  const ticketPrices = [20, 30, 35, 50, 75, 100, 150]
  const eventsPerMonth = [10, 25, 50, 100, 200, 300, 500]

  S.getRange(4, 1).setValue('↓ Events/mo  Avg Ticket Price →')
    .setFontWeight('bold').setFontColor(C.gray).setFontSize(9)

  ticketPrices.forEach((p, i) => {
    S.getRange(4, i + 2).setValue(`$${p}`)
      .setFontWeight('bold').setBackground(C.headerBg).setFontColor(C.neon)
      .setHorizontalAlignment('center')
  })

  eventsPerMonth.forEach((e, rowIdx) => {
    const r = rowIdx + 5
    S.getRange(r, 1).setValue(`${e} events/mo`).setFontWeight('bold')
    ticketPrices.forEach((p, colIdx) => {
      const c = colIdx + 2
      const avgTickets = 125
      const avgOrderSize = 1.5
      const platformFee = 0.05
      const stripeRate = 0.029
      const stripeFixed = 0.30
      const mktPct = 0.10

      const gmvPerEvent = p * avgTickets
      const gross = gmvPerEvent * platformFee
      const ordersPerEvent = avgTickets / avgOrderSize
      const stripePerEvent = (gmvPerEvent * stripeRate) + (ordersPerEvent * stripeFixed)
      const net = gross - stripePerEvent
      const mkt = gross * mktPct
      const profit = (net - mkt) * e * 12

      S.getRange(r, c).setValue(Math.round(profit))
        .setNumberFormat('$#,##0')
        .setHorizontalAlignment('center')

      // Color: green = good, red = bad
      if (profit > 100000) S.getRange(r, c).setBackground('#C8E6C9').setFontColor('#1B5E20').setFontWeight('bold')
      else if (profit > 25000) S.getRange(r, c).setBackground('#DCEDC8').setFontColor('#33691E')
      else if (profit > 5000) S.getRange(r, c).setBackground('#F9FBE7')
      else if (profit > 0) S.getRange(r, c).setBackground('#FFFDE7').setFontColor(C.gray)
      else S.getRange(r, c).setBackground('#FFEBEE').setFontColor(C.red)
    })
  })

  S.getRange(13, 1, 1, 8).merge()
    .setValue('🟩 >$100K   🟨 >$25K   ⬜ >$5K   🟡 >$0   🟥 Negative')
    .setFontColor(C.gray).setFontStyle('italic').setFontSize(9)

  S.setTabColor('#FF9800')

  // ════════════════════════════════════════════════════════════════
  // SHEET 6 — FESTIVAL EFFECT
  // ════════════════════════════════════════════════════════════════
  const F = sheetFestival
  F.setColumnWidth(1, 230)
  F.setColumnWidth(2, 150)
  F.setColumnWidth(3, 150)
  F.setColumnWidth(4, 150)
  F.setColumnWidth(5, 280)

  F.getRange(1, 1, 1, 5).merge()
    .setValue('⚡ THE FESTIVAL EFFECT — Why bigger events change everything')
    .setBackground(C.darkBg).setFontColor(C.neon)
    .setFontWeight('bold').setFontSize(13).setVerticalAlignment('middle')
  F.setRowHeight(1, 40)

  const festHeaders = ['Metric', 'Club Night', 'Mid Festival', 'Mega Festival', 'Notes']
  festHeaders.forEach((h, i) => header(F, 2, i + 1, h))

  const festRows = [
    ['Tickets sold',        125,    2000,   10000,  'Per event'],
    ['Avg ticket price',    '$35',  '$100', '$200', 'Blended across tiers'],
    ['──────────────────', '', '', '', ''],
    ['GMV per event',       4375,   200000, 2000000,'Tickets × price'],
    ['Platform gross (5%)', 218.75, 10000,  100000, '5% of GMV'],
    ['Orders per event',    83,     500,    2000,   'Tickets ÷ 1.5 avg order'],
    ['Stripe % charge',     126.88, 5800,   58000,  '2.9% of GMV'],
    ['Stripe fixed charge', 24.90,  150,    600,    'Orders × $0.30'],
    ['Total Stripe',        151.78, 5950,   58600,  ''],
    ['──────────────────', '', '', '', ''],
    ['Net revenue',         67.00,  4050,   41400,  'After Stripe'],
    ['Stripe as % of gross','69%',  '60%',  '59%',  'Stripe drag improves with price'],
    ['Marketing (10%)',     21.88,  1000,   10000,  '10% of gross rev'],
    ['Net profit per event',45.12,  3050,   31400,  ''],
    ['──────────────────', '', '', '', ''],
    ['= Club nights equivalent', '1', '68', '696', 'One festival = X club nights in profit'],
  ]

  const festDollarRows = [4,5,7,8,9,11,13,14]
  festRows.forEach((row, i) => {
    const r = i + 3
    if (row[0].startsWith('──')) {
      F.getRange(r, 1, 1, 5).merge().setValue('').setBackground('#E8F5E9').setFontSize(4)
      F.setRowHeight(r, 6)
      return
    }
    F.getRange(r, 1).setValue(row[0]).setFontWeight('bold')
    ;[row[1], row[2], row[3]].forEach((v, colIdx) => {
      const cell = F.getRange(r, colIdx + 2)
      cell.setValue(v).setHorizontalAlignment('center')
      if (typeof v === 'number' && festDollarRows.includes(i + 1)) cell.setNumberFormat('$#,##0.00')
    })
    if (row[4]) note(F, r, 5, row[4])
    if (row[0] === 'Net profit per event' || row[0] === '= Club nights equivalent') {
      F.getRange(r, 1, 1, 5).setBackground('#E8FFD0').setFontWeight('bold').setFontColor('#1B5E20')
    }
  })

  F.setTabColor('#E91E63')

  // ── Final touch: activate Assumptions sheet ──
  sheetAssumptions.activate()
  sheetAssumptions.getRange('B6').activate()

  // Log the URL
  const url = ss.getUrl()
  Logger.log('✅ Pro Forma created: ' + url)
  SpreadsheetApp.getUi().alert('✅ Pro forma created!\n\nStart in the Assumptions tab — change the yellow cells to update the whole model.\n\nURL copied to script log.')
}
