# ChurchCoin Dashboard Redesign Specification

## Objective
Redesign the Finance & Donor Health Dashboard to reduce cognitive load, prioritize actionable insights, and create clear visual hierarchy. Transform from information overload to decision-ready interface.

---

## Design Principles

1. **Insight-first, not data-first**: Lead with AI-generated narrative, not raw numbers
2. **Progressive disclosure**: Show critical info first, hide advanced metrics behind expansions
3. **Action-oriented**: Every alert should suggest next steps
4. **Clear hierarchy**: Hero metrics → Details → Advanced (collapsed by default)
5. **Minimal charts**: Replace decorative sparklines with trend indicators; use full charts only where they add value

---

## Business Rules

### Fund Importance Threshold

**Definition**: Funds with balance ≥ £5,000 are classified as "important funds"

**Application**:
- ✅ AI Insights: Only generate alerts for important funds
- ✅ Visual distinction: Star indicator (⭐) in fund lists
- ✅ Sort priority: Important funds appear first
- ✅ Budget variance alerts: Only important funds trigger warnings
- ❌ Minor funds (<£5K): Displayed but no alerts generated

**Rationale**: 
- Reduces noise and alert fatigue
- Focuses leadership attention on material financial matters
- Small funds (Choir: £450, Coffee: £200) don't warrant dashboard alerts

**Future Configuration**: Consider making this threshold configurable per church (Settings → Dashboard Preferences → Important Fund Threshold)

---

## Layout Structure

### Top-Level Layout (Single Page, No Tabs)

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER: Finance & Donor Health Dashboard                     │
│ Date Range Selector | Run Report | Manage Funds | + Add Txn  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 🤖 AI INSIGHTS & ALERTS (Prominent, always visible)          │
│ Plain-language summary + actionable alerts                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ KEY METRICS (3-4 hero cards in grid)                         │
│ Most important KPIs with trend indicators                     │
└──────────────────────────────────────────────────────────────┘

▼ FINANCIAL DETAILS (Collapsible section, open by default)
  ├─ Income & Expense Overview (bar chart)
  ├─ Fund Balances (horizontal bars)
  └─ Budget Variance Details

▼ DONOR HEALTH (Collapsible section, open by default)
  ├─ Active vs Lapsed visual
  ├─ Retention trends
  └─ New donor pipeline

▼ ADVANCED METRICS (Collapsed by default)
  Income concentration, diversity, ratios, etc.

┌──────────────────────────────────────────────────────────────┐
│ MONTH PROGRESS & ACTIONS                                     │
│ [Progress bar: 93% complete] [Review Checklist] [Reconcile]  │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. AI Insights & Alerts Section

**Location**: Top of dashboard, immediately below header  
**Visual Style**: Light yellow/cream background, prominent but not jarring  
**Icon**: 🤖 or sparkle icon

**Important Fund Threshold**: Only report on funds with balance ≥ £5,000  
**Rationale**: Focus attention on material funds; avoid noise from small balances

**Content Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI INSIGHTS                        [REAL-TIME MONITORING]│
│                                                              │
│ 3 ALERTS   Intelligent alerts surface risks, changes, and   │
│            opportunities.                                    │
│                                                              │
│ ⚠️  91 donors lapsed this quarter                           │
│     Require follow-up | View list →                         │
│                                                              │
│ 📉  Giving down 72% vs last month                           │
│     Seasonal pattern or concern? | Investigate →            │
│                                                              │
│ 🔴  Building Fund running low                               │
│     Balance £5,200 - only 2 months reserve | Review →       │
│                                                              │
│ [View all insights →]                                        │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Maximum 3-5 alerts shown by default
- Sorted by priority (Critical → Warning → Info)
- Each alert has action link (View list, Investigate, Review, etc.)
- Click "View all insights" expands full list
- Alerts dynamically generated from KPI analysis

**Data Requirements**:
- **Fund importance threshold**: ≥ £5,000 balance qualifies as "important fund"
- Threshold logic: 
  - Lapsed donors: > 30 donors or > 20% of active donors
  - Giving change: > 15% period-over-period
  - Fund low balance: Important fund (≥£5K) dropping below 3 months operating reserve
  - Only alert on important funds; suppress alerts for minor funds (<£5K balance)
- Historical comparison for context
- Action suggestions pre-computed

---

### 2. Hero Metrics (Key KPIs)

**Location**: Below AI Insights  
**Layout**: 2x2 or 4x1 grid of prominent cards  
**Visual**: Large number, clear label, trend indicator

**Recommended 4 Hero Metrics**:

1. **General Fund Balance**
2. **Total Income (This Month)**
3. **Active Donors**
4. **Critical Issue Metric** (dynamic - shows worst performing area)

**Card Structure**:
```
┌─────────────────────┐
│ GENERAL FUND        │
│                     │
│ £14,968.35          │
│ ↑ +5.2% vs Aug      │
│                     │
│ Status: Healthy ✓   │
└─────────────────────┘
```

**Design Specs**:
- Card: White background, subtle border, shadow on hover
- Primary number: 32-36px, bold
- Trend indicator: 16px, green (↑) or red (↓) with percentage
- Context label: "vs Aug" or "vs Q3 2024"
- Status badge (optional): Healthy (green), Warning (yellow), Critical (red)

**NO sparkline charts** - Just trend arrows and percentages

**Interaction**: Click card to see full detailed view/drill-down

---

### 3. Financial Details Section

**Location**: Below hero metrics  
**Collapsible**: Yes, expanded by default  
**Heading**: ▼ Financial Details

**Components**:

#### A. Income & Expense Overview
**Chart Type**: Grouped bar chart (monthly)  
**Data**: Last 6 months, side-by-side bars for Income vs Expense  
**Height**: 240px  
**Labels**: Month names on X-axis, currency on Y-axis  
**Colors**: Income (green), Expenses (orange/red)

```
Income vs Expenses (Last 6 Months)

£5k  ┤     ██
     │     ██ ██
£4k  ┤     ██ ██     ██
     │ ██  ██ ██ ██  ██
£3k  ┤ ██  ██ ██ ██  ██
     │ ▓▓  ▓▓ ▓▓ ▓▓  ▓▓
£2k  ┤ ▓▓  ▓▓ ▓▓ ▓▓  ▓▓
     └─────────────────
     Apr May Jun Jul Aug Sep
     ██ Income  ▓▓ Expenses
```

#### B. Fund Balances
**Chart Type**: Horizontal stacked bar  
**Data**: General, Restricted, Designated fund totals  
**Height**: 120px  
**Interaction**: Click segment to filter transactions by fund  
**Visual Priority**: Important funds (≥£5K) shown in bold with emphasis

```
Fund Distribution Across All Funds

General Fund ⭐       ████████████████ £14,968
Building Fund ⭐      ████████ £6,125
Youth Ministry        ██ £1,110
Choir Fund            █ £450
                    
Total: £22,653
⭐ Important funds (≥£5,000) - actively monitored
```

**Behavior**:
- Important funds (≥£5K): Bold text, star indicator, included in AI alerts
- Minor funds (<£5K): Normal weight, no star, excluded from alerts
- Sort order: Important funds first (by balance desc), then minor funds

#### C. Budget Variance
**Display Type**: Table with visual bars  
**Columns**: Fund/Ministry | Budgeted | Actual | Variance | % of Budget  
**Visual**: Mini horizontal bars showing % completion  
**Sorting**: Important funds (≥£5K) first, then by variance magnitude

```
┌──────────────┬──────────┬──────────┬──────────┬──────────┐
│ Fund         │ Budget   │ Actual   │ Variance │ Progress │
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ General ⭐   │ £15,000  │ £14,968  │ -£32     │ ████ 99% │
│ Building ⭐  │ £8,000   │ £6,125   │ -£1,875  │ ███░ 77% │
│ Missions ⭐  │ £5,000   │ £3,200   │ -£1,800  │ ███░ 64% │
│ Youth        │ £2,500   │ £2,890   │ +£390    │ ████ 116%│ ⚠️
└──────────────┴──────────┴──────────┴──────────┴──────────┘

⭐ Important funds (≥£5,000 balance) monitored for alerts
```

**Alert Logic**:
- Important funds >20% over/under budget → Generate AI insight
- Minor funds: Show in table but don't generate alerts

---

### 4. Donor Health Section

**Location**: Below Financial Details  
**Collapsible**: Yes, expanded by default  
**Heading**: ▼ Donor Health

**Components**:

#### A. Donor Status Overview
**Display Type**: 3-card summary with visual indicator

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ ACTIVE DONORS  │  │ LAPSED DONORS  │  │ NEW DONORS     │
│                │  │                │  │                │
│     107        │  │      91 ⚠️     │  │       1        │
│  ↑ +1 (0.9%)   │  │  ↑ +91 (alrm) │  │  ↓ -2 (67%)    │
│                │  │                │  │                │
│ [View list →]  │  │ [Take action]  │  │ [View →]       │
└────────────────┘  └────────────────┘  └────────────────┘
```

**Behavior**:
- Lapsed card shows red badge if >50 or >20% of donors
- Action button on lapsed leads to filtered donor list + email template

#### B. Donor Retention Trend
**Chart Type**: Line chart  
**Data**: Last 12 months retention rate  
**Height**: 200px  
**Y-axis**: Percentage (0-100%)  
**Annotation**: Mark significant drops with labels

```
Donor Retention Rate (12 months)

100% ┤─────────────────────────
     │    ○────○────○
 80% ┤───○            ○───○
     │                    
 60% ┤
     └────────────────────────
     Oct Nov Dec Jan Feb Mar
```

#### C. Average Donation Size
**Display Type**: Large number with comparison

```
┌─────────────────────────────┐
│ Average Gift This Month     │
│                             │
│        £128.82              │
│     ↓ -12% vs last month    │
│                             │
│ Prior period: £146.57       │
└─────────────────────────────┘
```

---

### 5. Advanced Metrics Section

**Location**: Below Donor Health  
**Collapsible**: Yes, **collapsed by default**  
**Heading**: ▶ Advanced Metrics (Show more)

**Content** (when expanded):

#### Metrics to include:
- **Giving Growth Rate**: -72.0% (period-over-period)
- **Income Concentration**: 41.1% from top 10 donors
- **Income Diversity**: 100% regular giving, 0% events, 0% grants
- **Fund Health Index**: 42% general, 58% restricted/designated
- **Giving per Attender**: £40.93 per active donor
- **Donor Retention**: 100.0% retained

**Display**: Simple 2-3 column grid of stat cards  
**Visual**: Minimal design, just number + context label  
**No charts** in this section

---

### 6. Month Progress & Quick Actions Bar

**Location**: Bottom of dashboard (sticky/fixed at bottom)  
**Visual**: White bar with border-top, always visible

```
┌──────────────────────────────────────────────────────────────┐
│ 📊 September 2025                                             │
│ Ledger Progress: ██████████████████░░ 93% (301 of 325)       │
│                                                               │
│ [⚙️ Review Month-End Checklist]  [🔄 Reconcile Accounts]     │
└──────────────────────────────────────────────────────────────┘
```

**Components**:
- Progress bar showing transaction categorization completion
- Quick action buttons for common end-of-month tasks
- Current period label

**Behavior**:
- Progress bar links to uncategorized transactions
- Checklist button opens modal with month-end tasks
- Reconcile button navigates to reconciliation flow

---

## Visual Design Guidelines

### Typography
- **Hero numbers**: 32-36px, font-weight: 700
- **Card labels**: 12px, uppercase, letter-spacing: 0.5px, color: #666
- **Trend indicators**: 16px, font-weight: 600
- **Body text**: 14px, line-height: 1.5

### Color Palette
- **Green (positive)**: #10B981 for ↑, positive trends, healthy status
- **Red (negative)**: #EF4444 for ↓, alerts, critical status
- **Yellow/Amber (warning)**: #F59E0B for warnings
- **Gray (neutral)**: #6B7280 for labels
- **Background**: #F9FAFB (light gray)
- **Card background**: #FFFFFF

### Spacing
- **Card padding**: 24px
- **Card gap**: 16px
- **Section spacing**: 32px vertical
- **Collapsible section padding**: 16px vertical when collapsed

### Chart Styling
- **Bar colors**: Income (green #10B981), Expenses (orange #F59E0B)
- **Line colors**: Primary (#6366F1), Secondary (#8B5CF6)
- **Grid lines**: Light gray (#E5E7EB), subtle
- **Tooltips**: White background, shadow, 14px text

---

## Interaction Patterns

### Collapsible Sections
- **Closed state**: ▶ Section Name (show N items)
- **Open state**: ▼ Section Name
- **Animation**: Smooth 200ms expand/collapse
- **Remember state**: Persist user's collapsed/expanded preferences

### Trend Indicators
- **↑**: Unicode U+2191 (upward arrow)
- **↓**: Unicode U+2193 (downward arrow)
- **Color**: Green for positive/expected, Red for negative/concerning
- **Context**: Always include comparison period ("vs Aug", "vs Q3 2024")

### Hover States
- **Cards**: Lift shadow slightly (0px → 4px)
- **Charts**: Show tooltip with exact values
- **Action links**: Underline + color shift

### Responsive Behavior
- **Desktop (>1200px)**: 4-column grid for hero metrics, 2-column for details
- **Tablet (768-1199px)**: 2-column grid
- **Mobile (<768px)**: Single column, stack all cards

---

## Data Structure Requirements

### Dashboard Data API Response
```json
{
  "period": {
    "start": "2025-09-01",
    "end": "2025-09-30",
    "label": "September 2025"
  },
  "ai_insights": [
    {
      "id": "lapsed-donors",
      "priority": "critical",
      "icon": "⚠️",
      "title": "91 donors lapsed this quarter",
      "description": "Require follow-up",
      "action": {
        "label": "View list",
        "url": "/donors?status=lapsed"
      }
    }
  ],
  "hero_metrics": {
    "general_fund_balance": {
      "value": 14968.35,
      "change": 7.3,
      "change_percent": 5.2,
      "comparison_period": "Aug 2025",
      "status": "healthy",
      "trend": "up"
    },
    "total_income": {
      "value": 4379.90,
      "change": -11235,
      "change_percent": -72.0,
      "comparison_period": "Aug 2025",
      "status": "critical",
      "trend": "down"
    }
  },
  "financial_details": {
    "income_expense_chart": {
      "months": ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
      "income": [4200, 4500, 4300, 4800, 15615, 4379],
      "expenses": [3800, 4100, 3900, 4200, 0, 0]
    },
    "fund_balances": [
      {
        "name": "General Fund",
        "balance": 14968.35,
        "is_important": true,
        "importance_threshold": 5000
      },
      {
        "name": "Building Fund",
        "balance": 6125.56,
        "is_important": true,
        "importance_threshold": 5000
      },
      {
        "name": "Youth Ministry",
        "balance": 1110.16,
        "is_important": false,
        "importance_threshold": 5000
      },
      {
        "name": "Choir Fund",
        "balance": 450.00,
        "is_important": false,
        "importance_threshold": 5000
      }
    ],
    "budget_variance": [
      {
        "fund": "General",
        "budgeted": 15000,
        "actual": 14968,
        "variance": -32,
        "percent": 99.8
      }
    ]
  },
  "donor_health": {
    "active_donors": {
      "count": 107,
      "change": 1,
      "change_percent": 0.9
    },
    "lapsed_donors": {
      "count": 91,
      "change": 91,
      "alert": true
    },
    "retention_rate": [85, 88, 87, 90, 89, 88, 92, 90, 89, 87, 85, 100]
  },
  "advanced_metrics": {
    "giving_growth_rate": -72.0,
    "income_concentration": 41.1,
    "income_diversity": {
      "regular_giving": 100,
      "events": 0,
      "grants": 0
    }
  },
  "month_progress": {
    "categorized": 301,
    "total": 325,
    "percent": 93
  }
}
```

---

## Implementation Priority

### Phase 1 (Critical)
1. ✅ Restructure layout - single page, collapsible sections
2. ✅ Add AI Insights section at top
3. ✅ Replace sparklines with trend indicators (↑↓ + %)
4. ✅ Implement 4 hero metric cards
5. ✅ Add collapsible sections with proper states

### Phase 2 (Important)
6. ✅ Improve charts - income/expense bar chart
7. ✅ Fund balances horizontal stacked bar
8. ✅ Donor status 3-card summary
9. ✅ Month progress sticky bar

### Phase 3 (Enhancement)
10. ✅ Budget variance table with mini bars
11. ✅ Donor retention line chart
12. ✅ Responsive design adjustments
13. ✅ Remember collapsed/expanded states
14. ✅ Hover interactions and tooltips

---

## Testing Checklist

- [ ] Dashboard loads in <2 seconds
- [ ] All collapsible sections expand/collapse smoothly
- [ ] Trend indicators show correct direction (↑↓) and color (green/red)
- [ ] Charts render correctly with mock data
- [ ] AI Insights section displays 3-5 alerts properly
- [ ] **Fund importance threshold**: Only funds ≥£5K generate alerts
- [ ] **Fund visual distinction**: Important funds show ⭐ indicator
- [ ] **Fund sorting**: Important funds appear before minor funds
- [ ] **Budget alerts**: Only important funds trigger variance warnings
- [ ] Hero metrics are prominent and readable
- [ ] Month progress bar calculates correctly
- [ ] Responsive: Works on mobile (375px), tablet (768px), desktop (1440px)
- [ ] No horizontal scroll on any screen size
- [ ] Color contrast meets WCAG AA standards
- [ ] Action links navigate to correct pages
- [ ] **Edge case**: Fund exactly at £5,000.00 is classified as important

---

## Notes for AI Coder

- **Use existing component library** where possible
- **Maintain existing data fetching** patterns - just restructure display
- **Fund importance filtering**: Apply £5,000 threshold consistently:
  - AI Insights: Only alert on important funds (≥£5K)
  - Visual distinction: Star (⭐) indicator for important funds
  - Sorting: Important funds first in all lists
  - Budget variance alerts: Only trigger for important funds
- **Preserve accessibility** - proper heading hierarchy, ARIA labels
- **Keep existing color variables** - use design system tokens
- **Test with real data** ranges (£0 to £50,000+, 0 to 500+ donors)
- **Edge cases**: Handle £0 balances, negative variances, 100%+ growth, funds exactly at £5K threshold
- **Performance**: Lazy load charts in collapsed sections
- **State management**: Use local storage for collapsed/expanded preferences

This redesign prioritizes **clarity, hierarchy, and actionability** over comprehensive data display. The goal is a dashboard that tells the financial story at a glance and guides users to what matters most.
