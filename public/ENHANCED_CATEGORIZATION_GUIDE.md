# Enhanced Categorization System - Implementation Guide

## Overview
This guide extends the base IMPLEMENTATION_GUIDE.md with enhanced categorization for both income and expenditure transactions, including subcategory management, human review workflow, and hierarchical reporting.

---

## Part 1: Enhanced Database Schema

### Updated Schema with Category Hierarchy

**Prompt EC.1:**
```
Update the database schema to support category hierarchy and review workflow:

1. Update bankTransactions table:
   - category (subcategory - what users see)
   - mainCategory (auto-computed for reports)
   - confidence (0-100 match confidence)
   - reviewStatus (pending/reviewed/modified)
   - reviewedBy (userId if reviewed)
   - reviewedAt (timestamp)

2. Add categoryMappings table:
   - subcategory (e.g., "Tithe")
   - mainCategory (e.g., "Donations")
   - type (income/expenditure)
   - fundType (general/restricted/building)
   - keywords[] (for auto-matching)
   - isActive (boolean)

3. Add reviewSessions table:
   - id, periodId, startedAt, completedAt
   - totalTransactions, reviewedCount, modifiedCount
   - userId

Add indexes on category, reviewStatus, and confidence fields.
```

---

## Part 2: Category Configuration

### Income Category Mappings

**Prompt EC.2:**
```
Create the category mapping configuration for INCOME:

const incomeMappings = [
  // DONATIONS (Main Category)
  {
    subcategory: 'Tithe',
    mainCategory: 'Donations',
    type: 'income',
    fundType: 'general',
    keywords: ['tithe', 'tithing', 'thithe', 'tith', 'title']
  },
  {
    subcategory: 'Offering',
    mainCategory: 'Donations',
    type: 'income',
    fundType: 'general',
    keywords: ['offering', 'offer', 'off', 'pledge', 'seed', 'sacrifice', 'sabbath', 'sac', 'no ref', 'monzo'],
    amountRule: { max: 30 } // Also match if amount <= £30
  },
  {
    subcategory: 'Thanksgiving',
    mainCategory: 'Donations',
    type: 'income',
    fundType: 'general',
    keywords: ['thanks', 'thanksgiving', 'thx', 'tnx']
  },

  // BUILDING FUND (Standalone - Restricted)
  {
    subcategory: 'Building Fund',
    mainCategory: 'Building Fund',
    type: 'income',
    fundType: 'restricted',
    keywords: ['build', 'building', 'legacy'],
    excludeKeywords: ['tshirt'] // Don't match if contains these
  },

  // CHARITABLE ACTIVITIES
  {
    subcategory: 'Charity Fund',
    mainCategory: 'Charitable Activities',
    type: 'income',
    fundType: 'restricted',
    keywords: ['charity', 'charitable', 'ch']
  },
  {
    subcategory: 'Gender Ministries',
    mainCategory: 'Charitable Activities',
    type: 'income',
    fundType: 'restricted',
    keywords: ['rlm', 'men', 'wmg', 'women', 'youth']
  },

  // OTHER INCOME
  {
    subcategory: 'Merchandise',
    mainCategory: 'Other Income',
    type: 'income',
    fundType: 'general',
    keywords: ['tshirt', 'merchandise', 'merch', 'book', 'cd']
  },
  {
    subcategory: 'Uncategorised',
    mainCategory: 'Other Income',
    type: 'income',
    fundType: 'uncategorised',
    keywords: ['null'],
    transactionTypes: ['deposit'] // Match by transaction type
  }
];
```

### Expenditure Category Mappings

**Prompt EC.3:**
```
Create the category mapping configuration for EXPENDITURE:

const expenditureMappings = [
  // MAJOR PROGRAMS
  {
    subcategory: 'MP Honorarium',
    mainCategory: 'Major Programs',
    type: 'expenditure',
    keywords: ['honorarium', 'speaker', 'guest minister', 'preacher']
  },
  {
    subcategory: 'MP Accommodation',
    mainCategory: 'Major Programs',
    type: 'expenditure',
    keywords: ['hotel', 'accommodation', 'lodging', 'airbnb']
  },
  {
    subcategory: 'MP Refreshments',
    mainCategory: 'Major Programs',
    type: 'expenditure',
    keywords: ['catering', 'food', 'refreshment', 'meal']
  },

  // MINISTRY COSTS
  {
    subcategory: 'Church Provisions & Materials',
    mainCategory: 'Ministry Costs',
    type: 'expenditure',
    keywords: ['provision', 'material', 'supplies', 'equipment']
  },
  {
    subcategory: 'Travel & Transport',
    mainCategory: 'Ministry Costs',
    type: 'expenditure',
    keywords: ['transport', 'travel', 'fuel', 'petrol', 'uber', 'taxi']
  },

  // STAFF & VOLUNTEER COSTS
  {
    subcategory: 'Gross Salary',
    mainCategory: 'Staff & Volunteer Costs',
    type: 'expenditure',
    keywords: ['salary', 'wage', 'pay', 'remuneration']
  },
  {
    subcategory: 'Allowances',
    mainCategory: 'Staff & Volunteer Costs',
    type: 'expenditure',
    keywords: ['allowance', 'stipend', 'volunteer']
  },

  // PREMISES COSTS
  {
    subcategory: 'Rent-Premises',
    mainCategory: 'Premises Costs',
    type: 'expenditure',
    keywords: ['rent', 'lease', 'premises']
  },
  {
    subcategory: 'Utilities',
    mainCategory: 'Premises Costs',
    type: 'expenditure',
    keywords: ['electricity', 'gas', 'water', 'utility', 'council tax']
  },

  // MISSION COSTS
  {
    subcategory: 'Missions-Tithe',
    mainCategory: 'Mission Costs',
    type: 'expenditure',
    keywords: ['mission tithe', 'hq', 'headquarters', 'slm suppt']
  },
  {
    subcategory: 'Mission Support',
    mainCategory: 'Mission Costs',
    type: 'expenditure',
    keywords: ['mission support', 'missionary', 'outreach']
  },

  // ADMIN & GOVERNANCE
  {
    subcategory: 'Bank Charges',
    mainCategory: 'Admin & Governance',
    type: 'expenditure',
    keywords: ['bank charge', 'bank fee', 'transaction fee']
  },
  {
    subcategory: 'IT Costs',
    mainCategory: 'Admin & Governance',
    type: 'expenditure',
    keywords: ['software', 'internet', 'website', 'zoom', 'microsoft']
  }
];
```

---

## Part 3: Enhanced Categorization Engine

### Categorization with Confidence Scoring

**Prompt EC.4:**
```
Implement enhanced categorization with confidence scoring:

function categorizeTransactionEnhanced(transaction) {
  const { details, transactionType, amount, isIncoming } = transaction;
  const detailsLower = details.toLowerCase();

  // Select mappings based on transaction direction
  const mappings = isIncoming ? incomeMappings : expenditureMappings;

  let bestMatch = null;
  let highestConfidence = 0;

  for (const mapping of mappings) {
    let confidence = 0;
    let matched = false;

    // Check keyword matches
    if (mapping.keywords) {
      for (const keyword of mapping.keywords) {
        if (detailsLower.includes(keyword)) {
          confidence = Math.max(confidence, calculateKeywordConfidence(keyword, detailsLower));
          matched = true;
          break;
        }
      }
    }

    // Check exclude keywords
    if (matched && mapping.excludeKeywords) {
      for (const exclude of mapping.excludeKeywords) {
        if (detailsLower.includes(exclude)) {
          matched = false;
          confidence = 0;
          break;
        }
      }
    }

    // Check amount rules
    if (!matched && mapping.amountRule) {
      if (mapping.amountRule.max && amount <= mapping.amountRule.max) {
        confidence = 60; // Lower confidence for amount-only matches
        matched = true;
      }
    }

    // Check transaction type
    if (!matched && mapping.transactionTypes) {
      if (mapping.transactionTypes.includes(transactionType.toLowerCase())) {
        confidence = 70;
        matched = true;
      }
    }

    if (matched && confidence > highestConfidence) {
      bestMatch = mapping;
      highestConfidence = confidence;
    }
  }

  // Default fallback for income
  if (!bestMatch && isIncoming) {
    if (amount <= 30) {
      return {
        subcategory: 'Offering',
        mainCategory: 'Donations',
        fundType: 'general',
        confidence: 50
      };
    } else {
      return {
        subcategory: 'Uncategorised',
        mainCategory: 'Other Income',
        fundType: 'uncategorised',
        confidence: 0
      };
    }
  }

  // Default fallback for expenditure
  if (!bestMatch && !isIncoming) {
    return {
      subcategory: 'Uncategorised',
      mainCategory: 'Other Costs',
      fundType: 'general',
      confidence: 0
    };
  }

  return {
    subcategory: bestMatch.subcategory,
    mainCategory: bestMatch.mainCategory,
    fundType: bestMatch.fundType,
    confidence: highestConfidence
  };
}

function calculateKeywordConfidence(keyword, text) {
  // Exact word match = 95%, partial match = 80%
  const regex = new RegExp(`\\b${keyword}\\b`, 'i');
  return regex.test(text) ? 95 : 80;
}
```

---

## Part 4: Human Review Workflow

### Review Interface Components

**Prompt EC.5:**
```
Build the human-in-the-loop review interface:

1. Create ReviewDashboard component:
   - Show total transactions and review progress
   - Display categories: Auto-matched (high confidence), Needs Review, Reviewed
   - Start Review button launches review session

2. Create TransactionReviewer component:
   - Display one transaction at a time
   - Show: Date, Details, Amount, Week Ending
   - Display auto-categorized suggestion with confidence %
   - Quick category buttons for common categories
   - Dropdown for all subcategories (grouped by type)
   - Next/Previous navigation
   - Keyboard shortcuts (1-9 for quick categories, Enter to confirm)

3. Priority queue logic:
   - Priority 1: Uncategorised (confidence = 0)
   - Priority 2: Low confidence (< 70%)
   - Priority 3: Large amounts (> £500)
   - Priority 4: First-time payees
   - Priority 5: Medium confidence (70-90%)
   - Priority 6: High confidence (> 90%) - optional review

Example UI:
┌─────────────────────────────────────────┐
│ Transaction Review (4 of 242)           │
├─────────────────────────────────────────┤
│ 05/09/2025 | £2,000.00 IN              │
│ "ROYALHOUSE CHAPEL null"                │
│                                         │
│ Auto-suggested: Uncategorised (0%)      │
│                                         │
│ Quick Select:                           │
│ [1] Tithe  [2] Offering  [3] Building  │
│ [4] Charity  [5] Thanksgiving           │
│                                         │
│ Or choose: [Select Category ▼]          │
│                                         │
│ [← Previous] [Skip] [Confirm →]         │
└─────────────────────────────────────────┘
```

### Batch Review Operations

**Prompt EC.6:**
```
Add batch review capabilities:

1. Create BatchReviewModal component:
   - Group similar transactions (same payee, similar amounts)
   - Select multiple transactions with checkboxes
   - Apply same category to all selected
   - Show total amount for selected transactions

2. Smart grouping logic:
   - Group by payee name (fuzzy match for variations)
   - Group by amount range (±10%)
   - Group by transaction type
   - Group by date range (same week)

3. Bulk operations:
   - Select all in group
   - Apply category to selected
   - Mark as reviewed without change
   - Create rule for future auto-categorization

Example:
┌─────────────────────────────────────────┐
│ Similar Transactions Found              │
├─────────────────────────────────────────┤
│ Payee: G Hutton-Mills (3 transactions) │
│                                         │
│ □ 01/09 - £100.00 - "G Hutton-Mills"   │
│ □ 15/09 - £150.00 - "G Hutton Mills"   │
│ □ 29/09 - £100.00 - "G Hutton-Mills"   │
│                                         │
│ Total: £350.00                         │
│                                         │
│ Apply to selected: [Offering ▼]        │
│ □ Remember for future transactions     │
│                                         │
│ [Cancel] [Apply to Selected]           │
└─────────────────────────────────────────┘
```

---

## Part 5: Learning & Improvement

### Pattern Learning System

**Prompt EC.7:**
```
Implement learning from user corrections:

1. Create learning mutations:
   - recordCorrection(transactionId, originalCategory, newCategory, userId)
   - updateKeywordMapping(payee, category, confidence)
   - createCustomRule(pattern, category, userId)

2. Learning algorithm:
   - Track all corrections by payee
   - If same payee corrected 3+ times to same category, create rule
   - Update confidence scores based on correction patterns
   - Store custom rules per organization

3. Improvement metrics:
   - Track auto-categorization accuracy over time
   - Show confidence improvement after reviews
   - Display most common corrections
   - Suggest new keyword mappings

Example metrics display:
┌─────────────────────────────────────────┐
│ Categorization Performance              │
├─────────────────────────────────────────┤
│ This Month:                            │
│ Auto-matched: 92% (↑ from 85% last mo) │
│ Avg Confidence: 83% (↑ from 78%)       │
│                                         │
│ Top Corrections:                       │
│ 1. "MONZO" → Offering (5 times)        │
│ 2. "J SMITH" → Tithe (3 times)         │
│                                         │
│ Suggested Rules:                       │
│ • Add "MONZO" to Offering keywords?    │
│   [Accept] [Decline]                   │
└─────────────────────────────────────────┘
```

---

## Part 6: Enhanced Reporting

### Hierarchical Reports with Drill-down

**Prompt EC.8:**
```
Create hierarchical reporting components:

1. SummaryReport component:
   - Show main categories only by default
   - Calculate rollups from subcategories
   - Click to expand each main category
   - Separate sections for Income and Expenditure
   - Highlight restricted funds

2. Report structure:
   INCOME SUMMARY
   ├─ Donations: £10,624.62 [▼ Expand]
   │  ├─ Tithe: £5,828.29
   │  ├─ Offering: £3,215.43
   │  └─ Thanksgiving: £740.00
   ├─ Building Fund (R): £222.00
   ├─ Charitable Activities: £0.00
   └─ Other Income: £2,338.80

   EXPENDITURE SUMMARY
   ├─ Major Programs: £2,500.00
   ├─ Ministry Costs: £3,200.00
   ├─ Staff & Volunteer: £4,000.00
   ├─ Premises: £1,200.00
   ├─ Mission Costs: £1,318.00
   └─ Admin & Governance: £350.00

3. Export options:
   - Export at current drill-down level
   - Export fully expanded
   - Export summary only
   - Include transaction details
```

### KPI Dashboard

**Prompt EC.9:**
```
Build KPI dashboard without icons:

const KPIDashboard = () => {
  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        title="Net Position"
        value={formatCurrency(income - expenditure)}
        subtitle={income > expenditure ? 'Surplus' : 'Deficit'}
        trend={calculateTrend(currentMonth, previousMonth)}
      />

      <MetricCard
        title="Donation Rate"
        value={formatPercent(donations / totalIncome)}
        subtitle="% of income from donations"
      />

      <MetricCard
        title="Mission Tithe"
        value={formatPercent(missionTithe / totalIncome)}
        subtitle="Target: 10%"
        alert={missionTithe < totalIncome * 0.1}
      />

      <MetricCard
        title="Review Progress"
        value={`${reviewed}/${total}`}
        subtitle="Transactions reviewed"
        showProgress={true}
        progress={(reviewed/total) * 100}
      />
    </div>
  );
};

// Clean metric card without icons
const MetricCard = ({ title, value, subtitle, trend, alert, showProgress, progress }) => (
  <div className={`p-4 border rounded ${alert ? 'border-red-500' : 'border-gray-200'}`}>
    <div className="text-sm text-gray-600">{title}</div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-gray-500">{subtitle}</div>
    {trend && <div className="text-sm">{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</div>}
    {showProgress && <div className="mt-2 h-2 bg-gray-200 rounded">
      <div className="h-2 bg-blue-500 rounded" style={{width: `${progress}%`}} />
    </div>}
  </div>
);
```

---

## Part 7: Testing Enhanced Features

### Test Scenarios

**Prompt EC.10:**
```
Create comprehensive tests for enhanced categorization:

1. Income categorization tests:
   - Verify Thanksgiving rolls up to Donations (via Offering subcategory)
   - Confirm Building Fund is standalone (not under Charitable)
   - Test keyword matching priority
   - Verify £30 rule for Offering
   - Check tshirt exclusion from Building

2. Expenditure categorization tests:
   - Test salary detection → Staff Costs
   - Verify rent → Premises Costs
   - Check mission/HQ → Mission Costs
   - Test bank charges → Admin

3. Review workflow tests:
   - Verify priority queue ordering
   - Test batch operations
   - Confirm learning from corrections
   - Check keyboard shortcuts

4. Reporting tests:
   - Verify main category rollups
   - Test drill-down functionality
   - Confirm fund segregation
   - Check export at different levels

Test data expectations:
- Income auto-match rate: > 90%
- Expenditure auto-match rate: > 85%
- Review time for 250 transactions: < 5 minutes
- Correction learning effectiveness: 95% accuracy after 3 corrections
```

---

## Implementation Checklist

When implementing enhanced categorization:

### Phase 1: Database & Configuration
- [ ] Update database schema with enhanced fields
- [ ] Create category mapping tables
- [ ] Load income and expenditure mappings
- [ ] Add review session tracking

### Phase 2: Categorization Engine
- [ ] Implement enhanced categorization with confidence
- [ ] Process both IN and OUT transactions
- [ ] Add confidence scoring algorithm
- [ ] Create fallback logic

### Phase 3: Human Review
- [ ] Build review dashboard
- [ ] Create transaction reviewer component
- [ ] Implement priority queue
- [ ] Add batch operations
- [ ] Enable keyboard shortcuts

### Phase 4: Learning System
- [ ] Track user corrections
- [ ] Implement pattern learning
- [ ] Create custom rules
- [ ] Show improvement metrics

### Phase 5: Reporting
- [ ] Build hierarchical reports
- [ ] Add drill-down capability
- [ ] Create KPI dashboard
- [ ] Implement export options

### Phase 6: Testing
- [ ] Test all category mappings
- [ ] Verify confidence scoring
- [ ] Test review workflow
- [ ] Validate report rollups

---

## Quick Reference

### Subcategory Display (What Users See)
```
Income: Tithe, Offering, Thanksgiving, Building Fund, Charity Fund
Expenditure: Salary, Rent, Mission Tithe, Bank Charges, etc.
```

### Main Categories (Reports Only)
```
Income: Donations, Building Fund, Charitable Activities, Other Income
Expenditure: Major Programs, Ministry Costs, Staff Costs, Premises, Mission, Admin
```

### Review Priority
```
1. Uncategorised (0% confidence)
2. Low confidence (< 70%)
3. Large amounts (> £500)
4. New payees
5. Everything else (optional)
```

---

*Enhanced Categorization Guide v1.0*
*Complements IMPLEMENTATION_GUIDE.md*