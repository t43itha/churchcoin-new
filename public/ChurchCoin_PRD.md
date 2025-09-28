# Product Requirements Document: ChurchCoin
**Version 1.0 - MVP Specification**  
**Date: September 2025**

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [Target Users](#target-users)
4. [Design System](#design-system)
5. [Technical Architecture](#technical-architecture)
6. [Core Features (MVP)](#core-features-mvp)
7. [User Workflows](#user-workflows)
8. [Data Model](#data-model)
9. [AI Integration Strategy](#ai-integration-strategy)
10. [Development Phases](#development-phases)
11. [Success Metrics](#success-metrics)
12. [Appendices](#appendices)

---

## Executive Summary

ChurchCoin is an AI-first financial management platform designed specifically for small UK churches (10-200 members). It replaces error-prone spreadsheets and complex business accounting software with an intuitive, compliant, and intelligent system tailored to church volunteers.

### Key Differentiators
- **AI-First Design**: Natural language commands, intelligent categorization, automated compliance
- **Church-Native Workflows**: Built around fund accounting, Gift Aid, and trustee reporting
- **Volunteer-Friendly**: Designed for non-financial users with minimal training needed
- **Ledger-Inspired UI**: Monochromatic, monospaced design that feels familiar yet modern
- **Offline-First MVP**: CSV upload-based with progressive enhancement planned

### MVP Scope
- Manual entry for Sunday/midweek donations
- CSV upload for bank transactions
- Separate building fund accounting
- Donor tracking and statement generation
- AI-powered categorization and reconciliation
- Basic compliance and reporting tools

---

## Product Vision

### Mission Statement
Empower small UK churches to manage their finances with confidence, compliance, and clarity through intelligent automation and thoughtful design.

### Core Principles
1. **Simplicity Over Features**: Every feature must be understandable by a volunteer with no accounting background
2. **Trust Through Transparency**: Every AI decision must be explainable and reversible
3. **Compliance by Default**: UK charity law and HMRC requirements built into workflows
4. **Progressive Enhancement**: Start simple, add intelligence gradually
5. **Keyboard-First**: Power users can accomplish everything without a mouse

### Problem Statement
Small churches struggle with:
- Complex accounting software designed for businesses
- Rising subscription costs ($170+/year for QuickBooks)
- Volunteer treasurers lacking financial training
- Manual Gift Aid claiming leaving money unclaimed
- Compliance risks from poor record-keeping
- Inability to track restricted funds properly

---

## Target Users

### Primary Personas

#### 1. Volunteer Treasurer (Primary)
- **Age**: 55-70
- **Tech Skill**: Basic (uses email, online banking)
- **Time Commitment**: 2-3 hours/week
- **Pain Points**: 
  - Fear of making mistakes
  - Overwhelmed by business software
  - Needs to train replacement
- **Goals**: 
  - Keep accurate records
  - Stay compliant
  - Generate trustee reports easily

#### 2. Church Administrator
- **Age**: 35-50
- **Tech Skill**: Intermediate
- **Time Commitment**: Part-time role
- **Pain Points**:
  - Juggling multiple systems
  - Chasing receipts
  - Donor communication
- **Goals**:
  - Streamline workflows
  - Reduce manual data entry
  - Better donor relationships

#### 3. Trustee/Elder
- **Age**: 45-65
- **Tech Skill**: Variable
- **Time Commitment**: Monthly meeting review
- **Pain Points**:
  - Understanding financial position
  - Ensuring compliance
  - Making informed decisions
- **Goals**:
  - Clear financial oversight
  - Risk management
  - Strategic planning

### User Segments
- Small churches (10-50 members)
- Medium churches (50-200 members)
- Church plants and new congregations
- Small Christian charities

---

## Design System

### Visual Identity

#### Typography
```css
--font-primary: 'JetBrains Mono', monospace;
--font-size-base: 14px;
--font-size-small: 12px;
--font-size-large: 16px;
--line-height: 1.6;
```

#### Color Palette
```css
--color-ink: #000000;        /* Primary text */
--color-paper: #FAFAF8;      /* Background */
--color-ledger: #E8E8E6;     /* Ledger lines */
--color-grey-dark: #1A1A1A;  /* Headers */
--color-grey-mid: #666666;   /* Secondary text */
--color-grey-light: #999999; /* Disabled */
--color-success: #0A5F38;    /* Positive amounts */
--color-error: #8B0000;      /* Negative amounts */
--color-highlight: #FFE4B5;  /* Subtle selection */
```

#### Grid System
- Base unit: 8px
- Column grid: 12 columns
- Gutter: 16px
- Breakpoints:
  - Mobile: <640px
  - Tablet: 640-1024px
  - Desktop: >1024px

#### Component Patterns

##### Ledger Table
```jsx
<LedgerTable>
  <LedgerHeader>
    <Column width="100">Date</Column>
    <Column flex>Description</Column>
    <Column width="120">Fund</Column>
    <Column width="100" align="right">Debit</Column>
    <Column width="100" align="right">Credit</Column>
    <Column width="120" align="right">Balance</Column>
  </LedgerHeader>
  <LedgerRow />
</LedgerTable>
```

##### Command Bar
```jsx
<CommandBar
  placeholder="Type a command or question..."
  suggestions={['reconcile bank', 'add donation', 'generate report']}
/>
```

##### Fund Card
```jsx
<FundCard
  name="Building Fund"
  balance="£4,277.00"
  restricted={true}
  movement="+£250.00"
  percentage="8.5%"
/>
```

### Interaction Patterns
- **Keyboard Navigation**: Tab, Shift+Tab, Arrow keys
- **Quick Actions**: Single key shortcuts (/, N, R, S)
- **Confirmation**: Enter to confirm, Escape to cancel
- **Feedback**: Inline validation, subtle transitions
- **Loading**: Skeleton screens, progress indicators

---

## Technical Architecture

### Stack Overview

#### Frontend
```javascript
{
  "framework": "Next.js 14+ (App Router)",
  "ui": "shadcn/ui",
  "styling": "Tailwind CSS",
  "icons": "Lucide React",
  "animation": "Framer Motion",
  "forms": "React Hook Form + Zod",
  "state": "Zustand (local), Convex (server)"
}
```

#### Backend
```javascript
{
  "database": "Convex",
  "auth": "Convex Auth",
  "storage": "Convex File Storage",
  "functions": "Convex Functions",
  "ai": "OpenAI GPT-3.5 + Claude Haiku",
  "email": "Resend"
}
```

#### Infrastructure
```javascript
{
  "hosting": "Vercel",
  "cdn": "Vercel Edge Network",
  "monitoring": "Vercel Analytics",
  "error_tracking": "Sentry",
  "testing": "Vitest + Playwright"
}
```

### Architecture Diagram
```
┌─────────────────────────────────────────┐
│            Next.js Frontend              │
│  (React Server Components + Client)      │
└─────────────────┬───────────────────────┘
                  │
                  ├── Websocket (Real-time)
                  ├── HTTP (Queries/Mutations)
                  │
┌─────────────────▼───────────────────────┐
│            Convex Backend                │
│  - Database (Document Store)             │
│  - Functions (Serverless)                │
│  - File Storage                          │
│  - Auth                                  │
└─────────────────┬───────────────────────┘
                  │
                  ├── OpenAI API
                  ├── Claude API
                  └── Email Service
```

### Folder Structure
```
churchcoin/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── funds/
│   │   ├── donors/
│   │   └── reports/
│   └── api/
├── components/
│   ├── ui/           # shadcn components
│   ├── ledger/       # Ledger-specific components
│   └── ai/           # AI interaction components
├── convex/
│   ├── schema.ts
│   ├── auth.ts
│   ├── transactions.ts
│   ├── funds.ts
│   ├── donors.ts
│   └── ai/
│       ├── categorize.ts
│       └── report.ts
├── lib/
│   ├── utils.ts
│   └── constants.ts
└── public/
```

---

## Core Features (MVP)

### 1. Fund Accounting

#### Requirements
- Track multiple funds independently
- Enforce restricted fund rules
- Support inter-fund transfers
- Maintain running balances per fund
- Generate fund-specific reports

#### Implementation
```typescript
// Fund structure
interface Fund {
  id: string;
  name: string;
  type: 'general' | 'restricted' | 'designated';
  balance: number;
  description?: string;
  restrictions?: string;
}
```

### 2. Transaction Management

#### Manual Entry
- Sunday collection recording (split by fund)
- Midweek donation entry
- Expense recording
- Receipt attachment

#### CSV Upload
- Bank statement import
- Automatic column mapping
- AI categorization
- Duplicate detection
- Bulk approval workflow

#### Features
- Transaction search and filtering
- Edit/delete with audit trail
- Notes and tags
- Gift Aid flagging

### 3. Donor Management

#### Core Capabilities
- Donor directory with contact details
- Gift Aid declaration tracking
- Giving history by fund
- Statement generation (individual/bulk)
- Anonymous donation handling

#### Donor Matching
- Fuzzy matching on bank references
- Pattern recognition for regular givers
- Manual assignment for cash/cheques

### 4. Reconciliation

#### Bank Reconciliation
- Side-by-side comparison view
- AI-powered matching suggestions
- Pending transaction tracking
- Variance reporting
- Monthly closing process

### 5. Reporting

#### Standard Reports
- Fund balance summary
- Income & Expenditure by fund
- Donor statements
- Gift Aid claims
- Trustee reports
- Budget vs Actual

#### AI-Generated Insights
- Natural language summaries
- Trend analysis
- Anomaly detection
- Predictive cash flow

### 6. Compliance Tools

#### UK Charity Requirements
- Charity Commission report formats
- SORP compliance checking
- Restricted fund monitoring
- Trustee report generation

#### Gift Aid Management
- Declaration tracking
- Claim calculation
- HMRC submission preparation
- Small donations scheme support

---

## User Workflows

### Daily Workflows

#### 1. Sunday Collection Entry
```
Time: 2-3 minutes
Frequency: Weekly

1. Dashboard → "Record Sunday Collection"
2. Enter amounts by fund:
   - General Fund: Cash £___ Cheques £___
   - Building Fund: Cash £___ Cheques £___
3. Optional: Assign to donors
4. Save → Updates ledger and fund balances
```

#### 2. Midweek Donation Entry
```
Time: 1 minute
Frequency: As needed

1. Press "/" for quick entry
2. Fill form:
   - Amount, Method, Fund
   - Optional: Donor, Gift Aid
3. Save → AI suggests category if similar exists
```

### Weekly Workflows

#### Bank Statement Upload
```
Time: 5-10 minutes
Frequency: Weekly/Monthly

1. Export CSV from online banking
2. Upload to ChurchCoin
3. Review AI categorizations:
   - ✓ Auto-matched (green)
   - ? Needs review (yellow)
4. Assign unknowns to categories/funds
5. Approve all → Update ledgers
```

### Monthly Workflows

#### Month-End Reconciliation
```
Time: 10-15 minutes
Frequency: Monthly

1. Upload all bank CSVs
2. Review reconciliation screen:
   - Uploaded vs Manual entries
   - Identify variances
3. Mark pending items (uncashed cheques)
4. Generate reconciliation report
5. Close month → Lock transactions
```

#### Trustee Reporting
```
Time: 5 minutes
Frequency: Monthly

1. Command: "generate trustee report"
2. AI creates narrative summary:
   - Fund balances and movements
   - Key income/expense items
   - Compliance status
   - Recommendations
3. Review and edit if needed
4. Export PDF → Email to trustees
```

### Annual Workflows

#### Donor Statements
```
Time: 15-20 minutes
Frequency: Annually

1. Command: "generate all donor statements 2025"
2. Review summary:
   - Total donors: 67
   - Gift Aid eligible: 52
3. Generate batch
4. Email where addresses exist
5. Print remainder for manual distribution
```

#### Gift Aid Claim
```
Time: 10 minutes
Frequency: Quarterly/Annually

1. Dashboard shows: "Gift Aid ready: £2,400"
2. Click to review claim
3. Verify donor declarations
4. Generate HMRC submission file
5. Submit online → Track claim status
```

### CSV Column Mapping

#### Standard Bank Export Format
```csv
Date,Description,Amount,Balance,Category
01/06/2025,Interest,0.72,10903.95,
03/06/2025,Cash Donation,300.00,11203.95,
03/06/2025,Cheques Donation,175.00,11378.95,
```

#### Mapping Configuration
```javascript
{
  "date": "Date",           // DD/MM/YYYY format
  "description": "Description",
  "amount": "Amount",        // Positive=income, Negative=expense
  "balance": "Balance",      // Running balance (optional)
  "category": "Category"     // Ignored or used as hint
}
```

---

## Data Model

### Convex Schema

```typescript
// schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Churches/Organizations
  churches: defineTable({
    name: v.string(),
    charityNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    settings: v.object({
      fiscalYearEnd: v.string(),
      giftAidEnabled: v.boolean(),
      defaultCurrency: v.string(),
    }),
  }),

  // Funds
  funds: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    type: v.union(
      v.literal("general"),
      v.literal("restricted"),
      v.literal("designated")
    ),
    balance: v.number(),
    description: v.optional(v.string()),
    restrictions: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_church", ["churchId"])
    .index("by_type", ["churchId", "type"]),

  // Transactions
  transactions: defineTable({
    churchId: v.id("churches"),
    date: v.string(), // ISO date
    description: v.string(),
    amount: v.number(),
    type: v.union(v.literal("income"), v.literal("expense")),
    fundId: v.id("funds"),
    categoryId: v.optional(v.id("categories")),
    donorId: v.optional(v.id("donors")),
    method: v.optional(v.string()), // cash, cheque, transfer, etc
    reference: v.optional(v.string()),
    giftAid: v.boolean(),
    reconciled: v.boolean(),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    source: v.union(
      v.literal("manual"),
      v.literal("csv"),
      v.literal("api")
    ),
    csvBatch: v.optional(v.string()), // For tracking imports
  })
    .index("by_church_date", ["churchId", "date"])
    .index("by_fund", ["fundId"])
    .index("by_donor", ["donorId"])
    .index("by_reconciled", ["churchId", "reconciled"]),

  // Categories
  categories: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    parentId: v.optional(v.id("categories")),
    isSystem: v.boolean(), // Pre-defined categories
  })
    .index("by_church", ["churchId"])
    .index("by_type", ["churchId", "type"]),

  // Donors
  donors: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    giftAidDeclaration: v.optional(v.object({
      signed: v.boolean(),
      date: v.string(),
      expiryDate: v.optional(v.string()),
    })),
    bankReference: v.optional(v.string()), // For matching
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_church", ["churchId"])
    .index("by_email", ["churchId", "email"])
    .index("by_reference", ["churchId", "bankReference"]),

  // AI Cache
  aiCache: defineTable({
    key: v.string(), // hash of input
    value: v.string(), // AI response
    model: v.string(),
    expiresAt: v.number(), // Unix timestamp
  })
    .index("by_key", ["key"])
    .index("by_expiry", ["expiresAt"]),

  // Audit Log
  auditLog: defineTable({
    churchId: v.id("churches"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    changes: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_church", ["churchId", "timestamp"])
    .index("by_user", ["userId", "timestamp"]),
});
```

### Key Relationships
```
Church 1-* Funds
Church 1-* Transactions
Church 1-* Donors
Church 1-* Categories

Fund 1-* Transactions
Donor 1-* Transactions
Category 1-* Transactions

User 1-* AuditLog
Church 1-* AuditLog
```

---

## AI Integration Strategy

### AI Provider Configuration

#### Primary Model: OpenAI GPT-3.5-Turbo
```javascript
// Used for: Transaction categorization, donor matching, validation
const categorizeTransaction = async (description: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0125",
    messages: [
      {
        role: "system",
        content: `Categorize UK church transactions.
                  Categories: ${CATEGORIES.join(", ")}
                  Reply with ONLY the category name.`
      },
      {
        role: "user",
        content: description
      }
    ],
    temperature: 0.1,
    max_tokens: 20
  });
  
  return response.choices[0].message.content;
};

// Cost: ~$0.0001 per transaction
```

#### Secondary Model: Claude 3 Haiku
```javascript
// Used for: Report generation, insights, narratives
const generateReport = async (data: ReportData) => {
  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    messages: [{
      role: "user",
      content: `Generate treasurer report from financial data:
                ${JSON.stringify(data)}
                
                Include: Summary, key insights, recommendations.
                Format: Plain English, suitable for trustees.`
    }],
    max_tokens: 1000,
    temperature: 0.3
  });
  
  return response.content;
};

// Cost: ~$0.002 per report
```

#### Embeddings: OpenAI text-embedding-3-small
```javascript
// Used for: Donor name matching, similarity search
const generateEmbeddings = async (texts: string[]) => {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts
  });
  
  return response.data;
};

// Cost: ~$0.00002 per embedding
```

### AI Features by Priority

#### Phase 1 (MVP)
1. **Transaction Categorization**
   - Pattern matching from description
   - Learning from corrections
   - Confidence scoring

2. **Donor Matching**
   - Fuzzy string matching
   - Bank reference patterns
   - Regular giver detection

3. **Basic Insights**
   - Month-over-month comparisons
   - Simple trend detection
   - Balance projections

#### Phase 2
1. **Natural Language Interface**
   - Command parsing
   - Question answering
   - Conversational corrections

2. **Advanced Reports**
   - Narrative generation
   - Custom report creation
   - Visualization recommendations

3. **Anomaly Detection**
   - Unusual transactions
   - Compliance issues
   - Donor behavior changes

#### Phase 3
1. **Predictive Analytics**
   - Cash flow forecasting
   - Donor retention prediction
   - Budget recommendations

2. **OCR Integration**
   - Receipt scanning
   - Handwritten envelope reading
   - Document extraction

### Cost Management

#### Caching Strategy
```javascript
// Cache all AI responses for 30 days
const getCachedOrGenerate = async (key: string, generator: Function) => {
  const cached = await db.query("aiCache")
    .withIndex("by_key", q => q.eq("key", key))
    .first();
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  
  const value = await generator();
  
  await db.insert("aiCache", {
    key,
    value,
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
  });
  
  return value;
};
```

#### Budget Controls
```javascript
const AI_BUDGET = {
  monthly_limit: 5.00, // £5 per month
  alert_threshold: 0.80, // Alert at 80% usage
  
  costs: {
    categorization: 0.0001, // Per transaction
    report: 0.002,          // Per report
    embedding: 0.00002      // Per text
  },
  
  tracking: {
    current_month: 0,
    transactions_processed: 0,
    reports_generated: 0
  }
};
```

### AI Optimization Techniques

#### 1. Rule-Based Preprocessing
```javascript
// Check rules before hitting AI
const categorizeWithRules = async (description: string) => {
  // Check exact matches
  if (KNOWN_VENDORS[description]) {
    return KNOWN_VENDORS[description];
  }
  
  // Check patterns
  for (const [pattern, category] of PATTERNS) {
    if (pattern.test(description)) {
      return category;
    }
  }
  
  // Fall back to AI
  return await categorizeWithAI(description);
};
```

#### 2. Batch Processing
```javascript
// Process multiple items in single API call
const batchCategorize = async (transactions: Transaction[]) => {
  const prompt = transactions.map(t => 
    `${t.id}: ${t.description}`
  ).join("\n");
  
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0125",
    messages: [
      {
        role: "system",
        content: "Categorize each transaction. Format: ID: Category"
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.1
  });
  
  return parseResponse(response.choices[0].message.content);
};
```

---

## Development Phases

### Phase 1: MVP (Month 1-2)

#### Core Functionality
- [x] Basic fund accounting
- [x] Manual transaction entry
- [x] CSV upload with mapping
- [x] Simple categorization (rules + AI)
- [x] Donor directory
- [x] Basic reconciliation
- [x] Essential reports (fund balances, statements)

#### Technical Foundation
- [x] Next.js + Convex setup
- [x] Authentication flow
- [x] Ledger UI components
- [x] Database schema
- [x] Basic AI integration (GPT-3.5)

#### Deliverables
- Functional web app
- 5 beta church testers
- Core workflow documentation

### Phase 2: Enhancement (Month 3-4)

#### Advanced Features
- [ ] Natural language commands
- [ ] Gift Aid automation
- [ ] Compliance dashboard
- [ ] Advanced reporting (Claude integration)
- [ ] Email integration
- [ ] Bulk operations
- [ ] Mobile app (PWA)

#### AI Improvements
- [ ] Smarter categorization
- [ ] Anomaly detection
- [ ] Report narratives
- [ ] Predictive insights

#### Deliverables
- 20 active churches
- Mobile-responsive app
- Training materials

### Phase 3: Scale (Month 5-6)

#### Enterprise Features
- [ ] Multi-church support
- [ ] Advanced permissions
- [ ] API access
- [ ] Integrations (Stripe, PayPal)
- [ ] Custom reports
- [ ] Automated backups
- [ ] White-label options

#### AI Evolution
- [ ] OCR for receipts
- [ ] Voice commands
- [ ] Custom model training
- [ ] Advanced forecasting

#### Deliverables
- 50+ churches
- API documentation
- Partner program

---

## Success Metrics

### User Metrics
- **Adoption Rate**: 80% of users complete onboarding
- **Daily Active Users**: 30% of registered users
- **Feature Usage**: Core features used weekly
- **User Satisfaction**: NPS > 50

### Operational Metrics
- **Time to Reconcile**: <10 minutes monthly
- **Categorization Accuracy**: >95% auto-match
- **Report Generation**: <30 seconds
- **Support Tickets**: <5% of users monthly

### Financial Metrics
- **Cost per Church**: <£1/month infrastructure
- **AI Costs**: <£0.50/church/month
- **Revenue per Church**: £10-20/month
- **Churn Rate**: <5% monthly

### Compliance Metrics
- **Gift Aid Claims**: 100% eligible captured
- **Compliance Alerts**: 0 missed deadlines
- **Audit Trail**: 100% transaction coverage
- **Data Security**: 0 breaches

### Technical Metrics
- **Page Load Time**: <2 seconds
- **API Response Time**: <200ms p95
- **Uptime**: 99.9%
- **Error Rate**: <0.1%

---

## Appendices

### A. Keyboard Shortcuts

#### Global
```
/        Open command bar
Escape   Close modal/cancel
Ctrl+S   Save
Ctrl+Z   Undo
Ctrl+N   New transaction
Ctrl+F   Find
```

#### Navigation
```
Tab      Next field
Shift+Tab Previous field
↑↓       Navigate rows
←→       Navigate columns
Enter    Edit/confirm
Space    Quick approve
```

#### Quick Actions
```
N        New transaction
U        Upload CSV
R        Reconcile
D        Duplicate entry
F        Assign fund
S        Split transaction
```

### B. AI Prompts Library

#### Transaction Categorization
```
System: You are a UK church finance categorizer.
Categories: [list]
Rules:
- Reply with ONLY the category name
- If uncertain, reply "UNKNOWN"
- Consider UK terminology

User: [transaction description]
```

#### Report Generation
```
Generate a trustee financial report for [MONTH YEAR].
Include:
1. Opening summary (2 sentences)
2. Fund balances and movements
3. Key income sources
4. Major expenses
5. Compliance status
6. Recommendations (if any)

Format: Plain English, avoid jargon
Length: 300-500 words
Tone: Professional but accessible
```

### C. Error Codes

```
E001: Invalid fund assignment
E002: Insufficient fund balance
E003: Duplicate transaction detected
E004: CSV format not recognized
E005: Gift Aid declaration expired
E006: Reconciliation variance exceeds threshold
E007: AI service unavailable
E008: Category not found
E009: Donor match ambiguous
E010: Report generation failed
```

### D. CSV Format Specifications

#### Supported Bank Formats
1. **Standard UK Bank Export**
   ```csv
   Date,Description,Amount,Balance
   01/01/2025,Opening Balance,0.00,1000.00
   02/01/2025,Donation,-50.00,1050.00
   ```

2. **Barclays**
   ```csv
   Date,Description,Amount,Balance,Category
   ```

3. **HSBC**
   ```csv
   Date,Reference,Paid Out,Paid In,Balance
   ```

#### Field Mappings
- Date formats: DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD
- Amount: Positive for income, negative for expenses
- Alternative: Separate debit/credit columns
- Description: Max 255 characters
- Reference: Optional, used for matching

### E. Compliance Checklist

#### UK Charity Commission Requirements
- [ ] Annual return filed
- [ ] Accounts submitted
- [ ] Trustee details updated
- [ ] Serious incident reporting

#### HMRC Gift Aid Requirements
- [ ] Valid declarations on file
- [ ] Claims within 4 years
- [ ] Audit trail maintained
- [ ] Donor benefit rules followed

#### Data Protection (GDPR)
- [ ] Privacy policy published
- [ ] Consent for communications
- [ ] Data retention policy
- [ ] Subject access request process

---

## Document Control

**Version**: 1.0  
**Status**: Draft  
**Author**: ChurchCoin Team  
**Last Updated**: September 2025  
**Next Review**: October 2025  

### Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Sep 2025 | Initial PRD creation | Team |

### Approval
| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| Design Lead | | | |

---

**End of Document**