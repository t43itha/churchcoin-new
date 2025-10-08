# Church Finance Reconciliation Workflow - Implementation Guide

## Overview
This guide provides step-by-step prompts for Claude Code to implement the church finance reconciliation workflow in your Next.js/Convex app. Start with a fresh git branch and follow these prompts sequentially.

---

## Part 1: Building From Scratch - Prompts for Claude Code

### Phase 1: Database Schema & Core Setup

**Prompt 1.1:**
```
Create Convex database schemas for church finance reconciliation with these tables:
1. reconciliationPeriods: id, month (1-12), year, status (draft/completed), bankTotal, cashTotal, combinedTotal, createdAt, updatedAt
2. bankTransactions: id, periodId, date, details, transactionType, inAmount, outAmount, balance, category, weekEnding, fundType (general/restricted/uncategorised)
3. cashRecords: id, periodId, weekEnding, tithesAndThanksgiving, offering, buildingFund, choirFund, charityFund, total
4. generatedReports: id, periodId, reportType, fileName, data (JSON), generatedAt
5. auditLog: id, periodId, action, details, timestamp, userId

Add indexes on periodId, weekEnding, and category fields.
```

**Prompt 1.2:**
```
Create Convex mutations for:
1. createReconciliationPeriod(month, year)
2. uploadBankTransactions(periodId, transactions[])
3. saveCashRecord(periodId, weekEnding, amounts)
4. updateTransactionCategory(transactionId, category, fundType)
5. markPeriodComplete(periodId)

Create queries for:
1. getReconciliationPeriods()
2. getPeriodTransactions(periodId)
3. getPeriodCashRecords(periodId)
4. getWeeklySummary(periodId, weekEnding)
```

### Phase 2: CSV Upload & Transaction Processing

**Prompt 2.1:**
```
Build a CSV file uploader component that:
1. Accepts Metro Bank CSV files with columns: Date, Details, Transaction Type, In, Out, Balance
2. Uses react-dropzone for drag-and-drop functionality
3. Parses CSV using Papa Parse library
4. ONLY processes transactions where "In" column has a value > 0
5. Ignores all transactions with empty "In" column (these are outgoing payments)
6. Shows upload progress and transaction count
7. Stores raw transactions in Convex before categorization
```

**Prompt 2.2:**
```
Create a transaction parser that:
1. Validates date format (DD/MM/YYYY)
2. Converts "In" values to numbers (remove commas, parse as float)
3. Filters out header row and empty rows
4. Calculates total of all "In" values for verification
5. Returns array of transaction objects with original CSV structure
6. Shows error messages for invalid data formats
```

### Phase 3: Categorization Engine

**Prompt 3.1:**
```
Implement transaction categorization with these EXACT rules in priority order:

function categorizeTransaction(details, amount) {
  const detailsLower = details.toLowerCase();

  // 1. TITHE (General Fund)
  if (detailsLower.includes('tithe') || detailsLower.includes('tithing') ||
      detailsLower.includes('thithe') || detailsLower.includes('tith') ||
      detailsLower.includes('title')) {
    return { category: 'Tithe', fundType: 'general' };
  }

  // 2. THANKSGIVING (General Fund)
  if (detailsLower.includes('thanks') || detailsLower.includes('thanksgiving') ||
      detailsLower.includes('thx') || detailsLower.includes('tnx')) {
    return { category: 'Thanksgiving', fundType: 'general' };
  }

  // 3. OFFERING (General Fund) - keywords OR amount rule
  if (detailsLower.includes('pledge') || detailsLower.includes('offering') ||
      detailsLower.includes('seed') || detailsLower.includes('sacrifice') ||
      detailsLower.includes('sabbath') || detailsLower.includes('sac') ||
      detailsLower.includes('no ref') || detailsLower.includes('monzo') ||
      detailsLower.includes('offer') || detailsLower.includes('off') ||
      amount <= 30) {
    return { category: 'Offering', fundType: 'general' };
  }

  // 4. BUILDING (Restricted Fund)
  if ((detailsLower.includes('build') || detailsLower.includes('building') ||
       detailsLower.includes('legacy')) && !detailsLower.includes('tshirt')) {
    return { category: 'Building', fundType: 'restricted' };
  }

  // 5. CHOIR (Restricted Fund)
  if (detailsLower.includes('choir') || detailsLower.includes('dues')) {
    return { category: 'Choir', fundType: 'restricted' };
  }

  // 6. CHARITY (Restricted Fund)
  if (detailsLower.includes('charity') || detailsLower.includes('charitable')) {
    return { category: 'Charity', fundType: 'restricted' };
  }

  // 7. UNCATEGORISED (Excluded from totals)
  if (transactionType.toLowerCase().includes('deposit') ||
      details.includes('null') || detailsLower.includes('tshirt')) {
    return { category: 'Uncategorised', fundType: 'uncategorised' };
  }

  // 8. DEFAULT
  if (amount <= 30) {
    return { category: 'Offering', fundType: 'general' };
  }

  return { category: 'Uncategorised', fundType: 'uncategorised' };
}
```

**Prompt 3.2:**
```
Create a week-ending calculator that finds the NEXT Sunday:

function getWeekEndingSunday(dateStr) {
  // Parse DD/MM/YYYY format
  const [day, month, year] = dateStr.split('/');
  const date = new Date(year, month - 1, day);

  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = date.getDay();

  // Calculate days until next Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  // Add days to get to Sunday
  date.setDate(date.getDate() + daysUntilSunday);

  // Return in DD/MM/YYYY format
  return date.toLocaleDateString('en-GB');
}

Apply this to all transactions and store weekEnding with each transaction.
```

### Phase 4: Cash Records Management

**Prompt 4.1:**
```
Build a cash records input form with:
1. Week Ending date picker (only allow Sundays)
2. Input fields:
   - Tithes & Thanksgiving (combined single field)
   - Offering
   - Building Fund (marked as Restricted)
   - Choir Fund (marked as Restricted, default 0)
   - Charity Fund (marked as Restricted)
3. Validation:
   - All amounts must be >= 0
   - Use number inputs with 2 decimal places
   - Week ending must be a Sunday
4. Show running total as user types
5. Save to Convex cashRecords table
```

**Prompt 4.2:**
```
Add bulk cash entry feature:
1. Generate input rows for all Sundays in the selected month
2. Pre-populate week ending dates
3. Allow paste from Excel (parse clipboard data)
4. Validate all rows before saving
5. Show which weeks already have cash data
6. Update existing records if re-entering data
```

**Prompt 4.3:**
```
Create Excel file processor for WEEKLY RECORD SHEET files:
1. Accept .xlsx file upload
2. Extract cash giving amounts from standard cells
3. Parse date from filename (format: "WEEKLY RECORD SHEET DD-MM-YY.xlsx")
4. Map to cash record fields
5. Show preview before saving
6. Handle multiple file uploads for a month
```

### Phase 5: Reconciliation Reports Generation

**Prompt 5.1:**
```
Generate Report 1 - categorized_transactions.csv:
Columns: Date, Details, Transaction Type, In, Out, Balance, Category, Week Ending
- Include all bank transactions with "In" values
- Add Category and Week Ending columns
- Sort by date (newest first)
- Export as CSV with proper formatting
```

**Prompt 5.2:**
```
Generate Report 2 - weekly_summary.csv:
Create weekly totals by category for bank transactions only.
Format:
Week Ending,Tithe,Thanksgiving,Offering,Building,Choir,Charity,Uncategorised,Total

Add PERIOD TOTALS section at bottom:
PERIOD TOTALS
Total Tithe,[amount]
Total Thanksgiving,[amount]
Total Offering,[amount]
Total Building,[amount]
Total Choir,[amount]
Total Charity,[amount]
Total Uncategorised,[amount]

GRAND TOTAL,[sum of all categories including uncategorised]
```

**Prompt 5.3:**
```
Generate Report 3 - category_breakdown.csv:
Cross-tabulated view with categories as rows and weeks as columns.
Format:
Category,Week Ending 07/09/2025,Week Ending 14/09/2025,...,Total
Tithe,[amounts],...,[row total]
...
Weekly Total,[column totals],...,[grand total]
```

**Prompt 5.4:**
```
Generate Report 4 - cash_giving_data.csv:
Format:
Week Ending,Tithes & Thanksgiving,Offering,Building (Restricted),Choir (Restricted),Total
[weekly data rows]

CASH TOTALS
Total Tithes & Thanksgiving,[amount]
Total Offering,[amount]
Total Building (Restricted),[amount]
Total Choir (Restricted),[amount]

GRAND TOTAL (Cash),[total]
```

**Prompt 5.5:**
```
Generate Report 5 - reconciliation_bank_vs_cash.csv with THREE sections:

GENERAL/UNRESTRICTED FUNDS RECONCILIATION

Category,Bank,Cash,Combined
Tithe,[bank amount],0.00,[bank amount]
Thanksgiving,[bank amount],0.00,[bank amount]
Tithes & Thanksgiving (Cash),0.00,[cash amount],[cash amount]
Offering,[bank amount],[cash amount],[combined]
Uncategorised,[bank amount],0.00,[bank amount]
GENERAL TOTAL,[totals]

RESTRICTED FUNDS RECONCILIATION

Category,Bank,Cash,Combined
Building,[bank amount],[cash amount],[combined]
Choir,[bank amount],[cash amount],[combined]
Charity,[bank amount],[cash amount],[combined]
RESTRICTED TOTAL,[totals]

GRAND TOTAL RECONCILIATION

Fund Type,Bank,Cash,Combined
General/Unrestricted,[totals excluding uncategorised]
Restricted,[totals]
GRAND TOTAL,[totals]
```

**Prompt 5.6:**
```
Generate Report 6 - combined_weekly_summary.csv:
Show bank + cash totals by week, maintaining fund segregation.
Include sections for:
1. GENERAL/UNRESTRICTED FUNDS (weekly breakdown)
2. RESTRICTED FUNDS (weekly breakdown)
3. OVERALL SUMMARY (combined totals)
Exclude uncategorised from weekly summaries but show separately.
```

**Prompt 5.7:**
```
Generate Report 7 - final_reconciliation_report_formatted.csv:
Include these sections:

1. EXECUTIVE SUMMARY
   - Total Bank Transactions: £[amount]
   - Total Cash Giving: £[amount]
   - Combined Total: £[amount]

2. GENERAL/UNRESTRICTED FUNDS BREAKDOWN
   Show bank/cash/combined for each category

3. RESTRICTED FUNDS BREAKDOWN
   Show bank/cash/combined for each restricted fund

4. UNCATEGORISED TRANSACTIONS (list individually)
   Date,Details,Transaction Type,Amount,Week Ending
   [List each uncategorised transaction]
   SUBTOTAL UNCATEGORISED: £[amount]

5. WEEKLY GIVING SUMMARY (Excluding Uncategorised)
   Week Ending,General Funds,Restricted Funds,Week Total

6. DATA SOURCES
   - Bank Transactions File: [filename]
   - Bank Transactions Count: [count]
   - Cash Records Source: [source]

7. VERIFICATION CHECKS
   ✓ Bank total matches sum of In values
   ✓ Cash total matches input records
   ✓ General fund total correct
   ✓ Restricted fund total correct
   ✓ Combined total verified

Format all numbers with 2 decimal places, no currency symbols in CSV.
```

### Phase 6: Dashboard & UI Components

**Prompt 6.1:**
```
Create a reconciliation dashboard showing:
1. Month/Year selector
2. Status cards:
   - Bank Upload: [Not Started/In Progress/Complete] - [count] transactions
   - Cash Entry: [Not Started/In Progress/Complete] - [count] weeks
   - Reports: [Not Generated/Generated] - Download All button
3. Fund Summary cards:
   - General/Unrestricted: £[amount]
   - Restricted Funds: £[amount]
   - Uncategorised: £[amount] (excluded from totals)
   - Combined Total: £[amount]
4. Quick Actions:
   - Upload Bank CSV
   - Enter Cash Records
   - Generate Reports
   - Export All
```

**Prompt 6.2:**
```
Build a reports viewer with:
1. Tabs for each of the 7 reports
2. Data tables using shadcn/ui Table component
3. Column sorting and filtering
4. Search functionality
5. Export individual report as CSV
6. Print-friendly view
7. Show report generation timestamp
```

### Phase 7: Export & Archive

**Prompt 7.1:**
```
Create export functionality:
1. Export individual reports as CSV files
2. Bulk export all 7 reports as ZIP file
3. Use folder structure: [Month]_[Year]/[report_name].csv
4. Include metadata file with export details
5. Archive completed periods to prevent accidental changes
```

---

## Part 2: Testing & Validation

### Test Data Setup

**Prompt T.1:**
```
Create test data loader using September 2025 data:
1. Load Transactions_Export_Sep_2025_10373247.csv from test folder
2. Process 242 incoming transactions
3. Expected bank total: £11,502.52
4. Load cash data with these weekly totals:
   - 07/09: £185.00 (£168 offering, £17 building)
   - 14/09: £545.50 (£190 tithes&thanks, £265.50 offering, £90 building)
   - 21/09: £595.00 (£240 tithes&thanks, £255 offering, £100 building)
   - 28/09: £357.40 (£190 tithes&thanks, £152.40 offering, £15 building)
   - 05/10: £0.00
5. Expected cash total: £1,682.90
```

### Validation Tests

**Prompt T.2:**
```
Create validation tests to verify:

1. TRANSACTION PROCESSING:
   - Only "In" column transactions are processed ✓
   - Bank grand total = £11,502.52 ✓
   - Transaction count = 242 ✓
   - All week endings are Sundays ✓

2. CATEGORIZATION:
   - Tithe transactions contain keywords: tithe/tithing/tith ✓
   - Offering includes all ≤£30 transactions ✓
   - Building excludes "tshirt" transactions ✓
   - Uncategorised includes "null" and "deposit" types ✓

3. FUND SEGREGATION:
   - General Funds (Bank): £9,163.72 ✓
   - General Funds (Cash): £1,460.90 ✓
   - General Funds (Combined): £10,624.62 ✓
   - Restricted Funds (Cash): £222.00 ✓
   - Uncategorised: £2,338.80 (excluded from totals) ✓

4. WEEKLY TOTALS (Excluding Uncategorised):
   - Week 07/09: £2,601.22 (£2,584.22 general + £17 restricted) ✓
   - Week 14/09: £2,957.36 (£2,867.36 general + £90 restricted) ✓
   - Week 21/09: £1,467.62 (£1,367.62 general + £100 restricted) ✓
   - Week 28/09: £2,903.62 (£2,888.62 general + £15 restricted) ✓
   - Week 05/10: £916.80 (all general) ✓

Show pass/fail for each test with actual vs expected values.
```

### Debug Commands

**Prompt T.3:**
```
Add debug mode that shows:
1. Transaction categorization decisions:
   - Input: [details], [amount]
   - Matched rule: [which keyword/condition]
   - Result: [category], [fundType]

2. Week calculation trace:
   - Input date: [DD/MM/YYYY]
   - Day of week: [0-6]
   - Days to Sunday: [0-6]
   - Result: [DD/MM/YYYY]

3. Fund allocation trace:
   - Transaction: [details]
   - Category: [category]
   - Fund type: [general/restricted/uncategorised]
   - Included in totals: [yes/no]

4. Report generation log:
   - Records processed: [count]
   - Validation errors: [list]
   - Output files: [list]
```

### Common Issues & Fixes

**Prompt T.4:**
```
Create troubleshooting guide for these issues:

1. "Bank total doesn't match":
   - Check: Are you processing empty "In" values?
   - Fix: Filter rows where In > 0

2. "Wrong week endings":
   - Check: Week calculation going to previous Sunday?
   - Fix: Always find NEXT Sunday (or same day if already Sunday)

3. "Fund totals incorrect":
   - Check: Is uncategorised included in general funds?
   - Fix: Exclude uncategorised from all fund totals

4. "Cash categories wrong":
   - Check: Splitting Tithes and Thanksgiving?
   - Fix: Keep as combined "Tithes & Thanksgiving" for cash

5. "Missing transactions":
   - Check: Filtering by transaction type?
   - Fix: Only filter by "In" column value > 0

Add console warnings when these issues are detected.
```

---

## Part 3: Quick Reference

### Categorization Rules Priority

```
1. Tithe → 2. Thanksgiving → 3. Offering (keywords OR ≤£30) →
4. Building (except tshirt) → 5. Choir → 6. Charity →
7. Uncategorised (deposit/null/tshirt) → 8. Default (≤£30 = Offering, else Uncategorised)
```

### Fund Types

**General/Unrestricted:**
- Tithe (bank only)
- Thanksgiving (bank only)
- Tithes & Thanksgiving (cash combined)
- Offering (bank + cash)

**Restricted (Ring-Fenced):**
- Building Fund
- Choir Fund
- Charity Fund

**Excluded:**
- Uncategorised (show separately, exclude from totals)

### CSV Column Formats

**Bank Input:**
```
Date,Details,Transaction Type,In,Out,Balance
```

**Categorized Output:**
```
Date,Details,Transaction Type,In,Out,Balance,Category,Week Ending
```

### Validation Formulas

**Bank Total Check:**
```bash
awk -F',' 'NR>1 && $4 {sum += $4} END {printf "%.2f\n", sum}' transactions.csv
```

**Week Ending Verification:**
```javascript
const isAllSundays = dates.every(d => new Date(d).getDay() === 0);
```

---

## Implementation Checklist

When working with Claude Code, use this checklist:

- [ ] Start with fresh git branch
- [ ] Give prompts in order (1.1, 1.2, 2.1, etc.)
- [ ] Test after each phase
- [ ] Use September 2025 data for validation
- [ ] Verify all 7 reports generate correctly
- [ ] Check fund segregation in all reports
- [ ] Confirm uncategorised excluded from totals
- [ ] Test with different months' data
- [ ] Archive completed implementation

---

## Success Criteria

Your implementation is complete when:
1. ✅ Uploads process only "In" transactions
2. ✅ Categories match PRD rules exactly
3. ✅ Week endings are all Sundays
4. ✅ Cash uses combined "Tithes & Thanksgiving"
5. ✅ General and Restricted funds separated
6. ✅ Uncategorised excluded from totals
7. ✅ All 7 reports generate with correct format
8. ✅ September test data produces expected totals
9. ✅ Export creates proper file structure
10. ✅ Validation shows all green checks

---

*Last Updated: October 2025*
*Based on PRD Version 3.0*