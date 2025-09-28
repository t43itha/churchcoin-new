# ChurchCoin Development Plan

## Phase 1: MVP (Months 1-2)

### Iteration 1: Foundation & Setup (Week 1) ✅
- [x] Initialize Next.js 14+ project with App Router configuration
- [x] Set up Tailwind CSS with custom design tokens (ledger color palette)
- [x] Install and configure shadcn/ui components
- [x] Set up Convex backend (database, auth, functions)
- [x] Create base layout with ledger-inspired typography (JetBrains Mono)
- [ ] Implement authentication flow (login/register pages)
- [ ] Set up error tracking (Sentry) and monitoring

### Iteration 2: Fund Management (Week 1-2)
- [x] Implement Convex schema (churches, funds, transactions, donors, categories)
- [x] Create fund CRUD operations (create, read, update, archive)
- [x] Build fund dashboard UI with fund cards
- [x] Add fund type support (general, restricted, designated)
- [x] Implement running balance calculations per fund

### Iteration 3: Manual Transaction Entry (Week 2-3)
- [x] Build transaction form with React Hook Form + Zod validation
- [x] Implement Sunday collection entry workflow
- [ ] Add midweek donation entry (quick entry with `/` shortcut)
- [ ] Create transaction ledger table component
- [ ] Add transaction CRUD with audit trail
- [ ] Implement expense recording with receipt attachment

### Iteration 4: CSV Upload & Processing (Week 3-4)
- [ ] Build CSV file upload component with dropzone
- [ ] Implement CSV parser with column detection
- [ ] Create mapping configuration UI for bank formats
- [ ] Add support for standard UK bank formats (Barclays, HSBC)
- [ ] Implement duplicate transaction detection
- [ ] Build bulk approval workflow UI

### Iteration 5: AI Categorization (Week 4-5)
- [ ] Integrate OpenAI GPT-3.5 for transaction categorization
- [ ] Implement rule-based preprocessing (pattern matching)
- [ ] Build AI caching system in Convex
- [ ] Add confidence scoring for suggestions
- [ ] Create learning system from user corrections
- [ ] Implement cost tracking and budget controls

### Iteration 6: Donor Management (Week 5-6)
- [ ] Build donor directory with CRUD operations
- [ ] Add Gift Aid declaration tracking
- [ ] Implement fuzzy donor matching for bank transactions
- [ ] Create donor giving history view by fund
- [ ] Add anonymous donation handling
- [ ] Build donor statement generation (individual)

### Iteration 7: Reconciliation (Week 6-7)
- [ ] Create bank reconciliation side-by-side view
- [ ] Implement AI-powered transaction matching
- [ ] Add pending transaction tracking (uncashed cheques)
- [ ] Build variance reporting
- [ ] Create month-end closing process
- [ ] Add reconciliation report generation

### Iteration 8: Reporting & Compliance (Week 7-8)
- [ ] Build fund balance summary report
- [ ] Create Income & Expenditure report by fund
- [ ] Implement bulk donor statement generation (PDF only)
- [ ] Add Gift Aid claim calculation (basic - automation in Phase 2)
- [ ] Integrate Claude Haiku for trustee report narratives
- [ ] Build PDF export functionality for all reports

### Iteration 9: PWA & Beta Testing (Week 8)
- [ ] Implement Progressive Web App (PWA) functionality
- [ ] Add mobile app manifest and service worker
- [ ] Implement keyboard shortcuts (global navigation, quick actions)
- [ ] Add command bar with natural language search
- [ ] Performance optimization (loading states, skeleton screens)
- [ ] Mobile responsiveness testing
- [ ] Write user documentation (core workflows)
- [ ] Beta testing with lined up churches
- [ ] Bug fixes and UX improvements

---

## ✅ Decisions Made

### Technical Decisions
- **Q1**: Sample CSV files will be provided in public folder ✅
- **Q2**: OpenAI key will be provided in env.local file ✅
- **Q3**: No sample data - use sample CSV files from public folder ✅
- **Q4**: Deploy to Netlify ✅

### Feature Scope
- **Q5**: Donor statements PDF only for MVP ✅
- **Q6**: Single church per account (no multi-church in MVP) ✅
- **Q7**: Include PWA (mobile app) in Phase 1 ✅
- **Q8**: Gift Aid automation deferred to Phase 2 ✅

### Design & UX
- **Q9**: No brand assets yet - use ledger-inspired design system ✅
- **Q10**: Dark mode deferred to later phases ✅

### Testing & Launch
- **Q11**: Beta churches are lined up ✅
- **Q12**: Target launch: ASAP ✅

---

## Phase 2: Enhancement (Months 3-4)
- [ ] Natural language command interface
- [ ] Gift Aid automation (HMRC submission files)
- [ ] Compliance dashboard with alerts
- [ ] Advanced reporting with Claude integration
- [ ] Email integration (Resend for statements)
- [ ] Bulk operations UI
- [ ] Dark mode support
- [ ] Smarter AI categorization with learning
- [ ] Anomaly detection system
- [ ] Predictive cash flow insights

## Phase 3: Scale (Months 5-6)
- [ ] Multi-church/multi-user support
- [ ] Advanced role-based permissions
- [ ] REST API for integrations
- [ ] Payment gateway integrations (Stripe, PayPal)
- [ ] Custom report builder
- [ ] Automated backup system
- [ ] White-label options
- [ ] OCR for receipt scanning
- [ ] Voice command interface
- [ ] Custom model training for specific churches

---

## Open Questions for User Input

### Technical Decisions
- **Q1**: Which UK banks should we prioritize for CSV format support in MVP?
- **Q2**: Do you have OpenAI and Anthropic API keys ready, or should we use placeholder/demo mode initially?
- **Q3**: Should we implement a demo/sandbox mode with sample data for onboarding?
- **Q4**: What's your preference for deployment: Vercel's free tier initially or paid tier?

### Feature Scope
- **Q5**: For MVP, should donor statements be PDF only, or also support email delivery?
- **Q6**: Do you want multi-church support from day 1, or focus on single church per account?
- **Q7**: Should we include a mobile app (PWA) in Phase 1 or defer to Phase 2?
- **Q8**: What level of Gift Aid automation is needed for MVP? (calculation only, or HMRC submission file generation?)

### Design & UX
- **Q9**: Do you have any existing brand assets (logo, colors) or should we use the ledger-inspired design system as-is?
- **Q10**: Should we support dark mode from the start, or add it later?

### Testing & Launch
- **Q11**: Do you have 5 beta churches lined up, or should we plan for recruitment?
- **Q12**: What's your target launch date for MVP? (helps prioritize iterations)

---

## Dependencies & Notes

- Iterations 1-2 must be completed before others (foundation)
- AI features (Iteration 5) depend on transaction data structure (Iteration 3)
- Reconciliation (Iteration 7) depends on CSV upload (Iteration 4)
- Reporting (Iteration 8) depends on all data models being complete

**Estimated Timeline**: 8-9 weeks for Phase 1 MVP with one developer working full-time

---

## Completed Work (Iteration 1)

### Infrastructure Setup ✅
- Next.js 15.5.4 with App Router configured
- Tailwind CSS with custom ChurchCoin ledger color palette
- JetBrains Mono typography system implemented
- shadcn/ui components installed and configured

### Backend Foundation ✅
- Convex database and functions setup
- Complete database schema (churches, funds, transactions, donors, categories, users, audit logs)
- Core backend functions (funds, transactions, churches, donors)
- TypeScript codegen working

### Design System ✅
- ChurchCoin ledger-inspired design with professional color palette:
  - Paper (#FAFAF8) background
  - Ink (#000000) text
  - Ledger (#E8E8E6) borders
  - Success (#0A5F38) for positive amounts
  - Error (#8B0000) for negative amounts
- Responsive homepage showcasing the design system
- Ledger table preview demonstrating the interface

### Development Environment ✅
- Development server running successfully
- Environment file template created
- All core dependencies installed

---

## Next Immediate Steps

**Iteration 2: Fund Management** (Current Priority)
1. Build fund dashboard UI with fund cards showing balances
2. Create fund CRUD operations (create, view, edit funds)
3. Add fund type support (general, restricted, designated)
4. Implement running balance calculations per fund