# Vestry: Design Document

## 1. Executive Summary
**Vestry** (formerly ChurchCoin) is reimagined not just as a finance tool, but as a "Ministry Enabler". The goal is to move from a "digital spreadsheet" to a **premium, intelligent financial operating system** for churches. The design will balance **stewardship (trust, tradition)** with **innovation (modern fintech, AI)**.

**Domain**: `getvestry.co.uk`

## 2. Design Philosophy: "The Digital Ledger"
The aesthetic will evolve from "basic web app" to **"Premium Fintech meets Heritage"**.

### Visual Language
- **Theme**: "Illuminated Manuscript meets Stripe".
- **Color Palette**:
    - **Primary**: Deep Royal Navy (`#0A192F`) or Tyrian Purple - representing royalty and priesthood.
    - **Secondary**: Gold/Bronze (`#D4AF37`) - for accents, highlights, and "value".
    - **Backgrounds**: High-end paper textures (subtle grain) or clean, warm off-whites (`#F9F9F7`) to reduce eye strain compared to stark white.
    - **Dark Mode**: Deep charcoal with gold accents (Luxury feel).
- **Typography**:
    - **Headings**: A modern Serif (e.g., *Playfair Display* or *Fraunces*) to evoke trust, history, and the "ledger" feel.
    - **Body/UI**: A clean, geometric Sans-serif (e.g., *Inter* or *Satoshi*) for readability and numbers.
- **UI Elements**:
    - **Glassmorphism**: Frosted glass effects for overlays and cards to create depth.
    - **Micro-interactions**: Subtle animations when hovering over charts or completing tasks (e.g., a gold shimmer when a Gift Aid claim is submitted).
    - **Borders**: Double lines or "stitched" borders to mimic physical leather ledgers.

## 3. User Experience & Workflows

### A. The "10-Minute" Onboarding (The Genesis)
*Goal: Zero friction setup.*
1.  **Welcome**: "What is your Church's name?" (Auto-fetch details from Charity Commission API if possible).
2.  **Bank Sync**: "Connect your bank" (Plaid/TrueLayer integration).
3.  **Fund Setup**: AI suggests funds based on transaction history (e.g., "We see payments to 'Thames Water', shall we create a 'Utilities' fund?").
4.  **Complete**: Dashboard reveals itself with a "Hallelujah" animation.

### B. The Dashboard (The Pulse)
*Goal: Instant clarity on financial health.*
- **Top Level**: "Ministry Health Score" (0-100) based on cash flow, budget adherence, and reserves.
- **Visuals**: No boring tables. Use **Cards** with sparklines.
- **Actionable**: "3 items need attention" (e.g., Uncategorized expense, Gift Aid claim ready).

### C. The "One-Click" Gift Aid (The Harvest)
*Goal: Turn admin into joy.*
1.  **Notification**: "You have £1,250 in unclaimed Gift Aid."
2.  **Review**: AI presents a pre-filled HMRC schedule. "We've flagged 2 donations for review."
3.  **Submit**: User clicks "Submit to HMRC".
4.  **Feedback**: Confetti/Gold coin animation. "Funds expected in 3-5 days."

## 4. KPIs & Data Visualization

### Key Metrics
1.  **Giving vs. Budget**: Are we on track?
2.  **Fund Balances**: Restricted vs. Unrestricted cash.
3.  **Donor Retention**: Active vs. Lapsed givers.
4.  **Average Gift Size**: Trends over time.

### Chart Types
- **Sankey Diagram**: "The River of Life" - Visualizing money flowing IN (Tithes, Offerings, Grants) and flowing OUT (Missions, Salaries, Buildings). This is much better than a pie chart for showing *flow*.
- **Heatmaps**: "Giving Seasons" - Calendar view showing high/low giving weeks (e.g., identifying the "summer dip").
- **Stacked Area Charts**: Fund growth over time.

## 5. Reporting & Analytics
*Goal: From data to wisdom.*

### A. Core Financial Reports (The Treasurer's View)
*   **Income & Expenditure**:
    *   **Monthly View**: Line-by-line breakdown of income vs expenses for the current month.
    *   **Annual View**: Year-to-date performance against budget.
    *   **Fund Balance Summary**: Current position of all restricted and unrestricted funds.
    *   **Export**: One-click PDF/CSV generation for church meetings.

### B. The "Leadership View" (Pastor & Trustees)
*Goal: High-level health without the noise.*
*   **The "Sunday Morning" Dashboard**:
    *   **Weekly Tithe Pulse**: "Last Sunday's giving was £1,200 (Target: £1,500)."
    *   **Attendance vs. Giving**: Correlation trends (if attendance data is available).
    *   **Missional Impact**: "£500 sent to Missions this month."
*   **Trustee Room**:
    *   **Read-Only Access**: Secure login for non-treasurers.
    *   **Compliance Traffic Lights**: Green/Amber/Red status for filing deadlines and reserves policy.
    *   **Visual Summaries**: No spreadsheets. Simple charts showing "Money In vs Money Out".

## 6. Donor & Pledge Management
*Goal: Nurturing the faithful.*

### A. Donor Profiles (The Living Record)
*   **360-View**: Contact details, giving history, and Gift Aid status in one place.
*   **Smart Tags**: Auto-tagging based on behavior (e.g., "Regular Giver", "Lapsed", "High Value").
*   **Communication**: Direct email integration for "Thank You" notes and annual statements.

### B. Pledge Tracking (The Promise)
*   **Campaign Management**: Set up capital campaigns (e.g., "Building Fund 2025").
*   **Pledge vs. Actual**: Visual progress bars showing pledged amounts vs. actual received.
*   **Nudges**: Automated (gentle) reminders for unfulfilled pledges.

### C. User Allocation (The Connection)
*   **Transaction Matching**: AI suggests donor matches for bank transactions (e.g., "Reference: 'SMITH TITHE' -> Matches 'John Smith'").
*   **Anonymous Giving**: Easy handling of loose cash or anonymous donations.

## 7. Data Import & Migration
*Goal: No data left behind.*

### A. Universal Import (Backward Compatibility)
*   **Excel & CSV Support**: Drag-and-drop upload for legacy spreadsheets.
*   **Smart Mapping**: AI suggests column mappings (e.g., "Date" -> "Transaction Date", "Money In" -> "Credit").
*   **Error Handling**: "Row 42 is missing a date. Fix it here?" (In-browser editing before import).

## 8. AI Integration: "Deacon AI"
*Your digital ministry assistant.*

### A. Intelligent Categorization Workflow
The goal is to reduce manual data entry by 90% while maintaining 100% accuracy through human oversight.

1.  **The "First Pass" (AI Analysis)**:
    *   When a bank statement is imported, Deacon AI analyzes the description and amount.
    *   **High Confidence (>90%)**: Auto-categorized (e.g., "Tesco" -> "Refreshments").
    *   **Low Confidence**: Flagged for review.

2.  **The Rules Engine (User Override)**:
    *   Users can set explicit rules that trump AI (e.g., "ALWAYS categorize 'Staples' as 'Admin'").
    *   **Split Transactions**: Rules to handle recurring complex payments (e.g., "Salary Payment" -> Split 80% Salary, 10% NI, 10% Pension).

3.  **The Review Queue (Tinder for Transactions)**:
    *   A dedicated UI for rapid approval.
    *   **Card View**: Shows one transaction at a time with the AI's best guess.
    *   **Actions**: "Approve" (Swipe Right), "Edit" (Tap), or "Split".
    *   **Learning**: Every manual correction retrains the local model for that church.

### B. Predictive Giving
- "Based on last year, expect a 15% dip in giving in August."
- Suggests: "Schedule a 'Vision Sunday' in July to boost engagement."

### C. Natural Language Querying
- User asks: "How much did we spend on the Youth Weekend?"
- Deacon AI: "You spent £450 on the Youth Weekend. This was £50 under budget."

### D. Smart Anomalies
- "We noticed a duplicate payment of £120 to 'Cleaning Co'. Would you like to flag this?"

## 9. Technical Stack Recommendations
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Framer Motion (animations).
- **Charts**: Recharts or Tremor (for beautiful, default-styled charts).
- **Auth**: Clerk (secure, easy multi-factor).
- **Backend/DB**: Convex (Real-time updates are crucial for a "live" ledger).
- **AI**: OpenAI GPT-4o (via API) for categorization and chat.

## 10. Landing Page Strategy (YC Style)
*Goal: "Make something people want." Clear, minimal, high-converting.*

### A. Design Aesthetic
*   **Layout**: Single column, text-focused, plenty of whitespace.
*   **Visuals**: Real product screenshots only. No stock photos of "happy people pointing at laptops".
*   **Typography**: Large, high-contrast headings (Serif) with clean body text (Sans).

### B. Copy & Structure

#### 1. Hero Section
*   **H1**: "The financial operating system for growing churches."
*   **Subhead**: "Vestry automates your bookkeeping, Gift Aid, and donor management. Stop wrestling with spreadsheets and start focusing on ministry."
*   **CTA**: [Get Started] [Book a Demo]
*   **Social Proof**: "Trusted by [Church Name], [Church Name], and 50+ others."

#### 2. The Problem (The "Hair on Fire")
*   "Church finance is broken. Treasurers are burnt out, Gift Aid is missed, and leaders are flying blind. Legacy software is clunky, and spreadsheets are prone to error."

#### 3. The Solution (Features as Benefits)
*   **Automated Bookkeeping**: "Connect your bank. Deacon AI categorizes 90% of transactions automatically."
*   **One-Click Gift Aid**: "Claim thousands in missed revenue. We generate the HMRC schedule for you."
*   **Donor Insights**: "Know who is giving, who has stopped, and how to engage them."

#### 4. Pricing (Transparent)
*   **Standard**: "£X/month. No hidden fees."
*   **Guarantee**: "30-day money-back guarantee."

#### 5. Footer
*   Simple links: Login, Support, Privacy, Terms.
