# Transactions Hub Redesign: Transform Current Page into Intuitive Command Center

Transform `src/app/(dashboard)/transactions/page.tsx` into a comprehensive transactions management hub with enhanced visibility, quick actions, and intelligent filtering.

## Current State Analysis

**What we have:**
- ✅ KPI cards showing totals (income, expenses, count, unreconciled)
- ✅ Transaction ledger with search and filters
- ✅ Manual transaction creation dialog
- ✅ Edit transaction functionality
- ✅ Reconciliation toggle
- ✅ AI category suggestions
- ✅ Receipt viewing

**What needs improvement:**
- ❌ No period selector (stuck viewing all transactions)
- ❌ Limited quick actions (hidden in dialogs)
- ❌ Filters are basic buttons, not advanced filtering
- ❌ No bulk operations
- ❌ No CSV upload option visible
- ❌ No expandable transaction details
- ❌ Limited insights and alerts
- ❌ No visual indicators for trends
- ❌ Mobile experience is basic table

---

## Phase 1: Enhanced Command Bar (Quick Actions)

**Goal:** Make all core actions instantly accessible

### Sticky Header with Quick Actions
Location: Top of page, sticky when scrolling

**Components to add:**
```typescript
<CommandBar>
  <PeriodSelector /> // New: Month/Quarter/Year toggle
  <SearchBar /> // Enhanced with autocomplete
  <QuickActions>
    <Button>New Transaction</Button> // Existing dialog
    <Button>Upload CSV</Button> // New: Bulk import
    <Button>Export</Button> // New: Download filtered
    <FilterToggle /> // Shows/hides advanced filters
  </QuickActions>
</CommandBar>
```

**Features:**
- **Period Selector**: Dropdown to switch between current month, last 30 days, this quarter, this year, custom range
- **Smart Search**: Autocomplete based on previous descriptions, donor names, categories
- **CSV Upload**: Opens dialog to upload and map columns
- **Export Button**: Downloads currently filtered transactions as CSV
- **Filter Toggle**: Shows/hides advanced filter panel

---

## Phase 2: Advanced Filtering Panel

**Goal:** Replace basic filter buttons with powerful multi-criteria filtering

### Collapsible Filter Panel
Location: Below command bar, expandable/collapsible

**Filter Options:**
- **Date Range**: Start/End date pickers + presets (This month, Last month, This quarter, etc.)
- **Transaction Type**: Multi-select (Income, Expense)
- **Fund**: Multi-select dropdown of all funds
- **Category**: Multi-select dropdown with type-ahead
- **Donor**: Multi-select with type-ahead search
- **Method**: Multi-select (Cash, Card, Bank Transfer, Cheque, Standing Order)
- **Status**:
  - Reconciled/Unreconciled
  - Has receipt/No receipt
  - Has category/Needs categorization
  - Gift Aid eligible
- **Amount Range**: Min/Max inputs
- **Source**: Manual, CSV, API

**Actions:**
- Save filter as preset
- Clear all filters button
- Active filter badges showing current filters

**Component Structure:**
```typescript
<FilterPanel isOpen={filterPanelOpen}>
  <FilterSection title="Date Range">
    <DateRangePicker />
    <QuickPresets /> // This month, Last month, etc.
  </FilterSection>

  <FilterSection title="Categories">
    <MultiSelectCombobox options={categories} />
  </FilterSection>

  <FilterSection title="Status">
    <CheckboxGroup>
      <Checkbox>Unreconciled only</Checkbox>
      <Checkbox>Needs categorization</Checkbox>
      <Checkbox>Has receipt</Checkbox>
    </CheckboxGroup>
  </FilterSection>

  <FilterActions>
    <Button variant="outline">Clear All</Button>
    <Button>Save Preset</Button>
  </FilterActions>
</FilterPanel>
```

---

## Phase 3: Enhanced KPI Section

**Goal:** Add period comparison and visual indicators

### Improved KPI Cards
Replace current simple cards with enhanced versions

**Enhancements:**
- **Period Comparison**: Show vs. last period (month/quarter)
- **Trend Indicators**: Up/down arrows with percentage change
- **Sparklines**: Tiny charts showing trend over time
- **Click-to-Filter**: Clicking a KPI filters ledger to that type

**Example Card:**
```typescript
<KPICard>
  <KPIHeader>
    <Icon name="banknote" />
    <Label>Total Income</Label>
  </KPIHeader>

  <KPIValue className="text-success">
    £{currentIncome.toFixed(2)}
  </KPIValue>

  <KPIComparison>
    <TrendArrow direction="up" />
    <span>+12.5% vs last month</span>
  </KPIComparison>

  <KPISparkline data={last6Months} />
</KPICard>
```

**Additional KPIs to Consider:**
- Average transaction value
- Top donor this period
- Top expense category
- Gift Aid claimed vs. available

---

## Phase 4: Expandable Transaction Rows

**Goal:** Show more details without leaving the page

### Row Expansion Pattern
Click to expand transaction for full details

**Summary View (Current):**
- Date, Description, Fund, Category, Donor, Amount

**Expanded View (New):**
```typescript
<ExpandedTransactionRow>
  <DetailGrid>
    <DetailItem label="Transaction ID" value={transaction._id} />
    <DetailItem label="Method" value={transaction.method} />
    <DetailItem label="Reference" value={transaction.reference} />
    <DetailItem label="Source" value={transaction.source} />
    <DetailItem label="Gift Aid" value={transaction.giftAid ? 'Yes' : 'No'} />
  </DetailGrid>

  {transaction.notes && (
    <NotesSection>
      <Label>Notes</Label>
      <Text>{transaction.notes}</Text>
    </NotesSection>
  )}

  <AuditTrail>
    <Label>Audit Trail</Label>
    <AuditItem>Created by {transaction.enteredByName} on {formatDate(transaction._creationTime)}</AuditItem>
    {transaction.modifiedBy && (
      <AuditItem>Modified by {transaction.modifiedByName} on {formatDate(transaction.modifiedAt)}</AuditItem>
    )}
  </AuditTrail>

  <QuickActions>
    <Button size="sm" onClick={onEdit}>Edit</Button>
    <Button size="sm" onClick={onDuplicate}>Duplicate</Button>
    {transaction.receiptStorageId && (
      <Button size="sm" onClick={onViewReceipt}>View Receipt</Button>
    )}
    <Button size="sm" variant="ghost" onClick={onAddNote}>Add Note</Button>
  </QuickActions>
</ExpandedTransactionRow>
```

**Implementation:**
- Add expand/collapse icon to each row
- Animate expansion smoothly
- Highlight expanded row
- Close others when opening new one (accordion style)

---

## Phase 5: Bulk Operations

**Goal:** Enable multi-transaction actions

### Selection & Bulk Actions
Add checkboxes and bulk action bar

**Features:**
- Checkbox column in table
- Select all (filtered) checkbox in header
- Bulk action bar appears when selections made

**Bulk Actions:**
```typescript
<BulkActionBar selectedCount={selectedIds.length}>
  <span>{selectedIds.length} selected</span>

  <ActionGroup>
    <Button onClick={handleBulkCategorize}>
      <Tag /> Categorize
    </Button>

    <Button onClick={handleBulkReconcile}>
      <CheckCircle2 /> Reconcile
    </Button>

    <Button onClick={handleBulkExport}>
      <Download /> Export
    </Button>

    <Button onClick={handleBulkDelete} variant="destructive">
      <Trash2 /> Delete
    </Button>
  </ActionGroup>

  <Button variant="ghost" onClick={clearSelection}>
    Clear Selection
  </Button>
</BulkActionBar>
```

---

## Phase 6: Insights & Alerts Panel

**Goal:** Surface actionable insights and warnings

### Collapsible Insights Section
Location: Between KPIs and ledger table

**Insight Types:**
```typescript
<InsightsPanel>
  <InsightCard type="alert" priority="high">
    <AlertIcon />
    <Message>
      {unreconciledCount} transactions from last month remain unreconciled
    </Message>
    <Action onClick={() => filterByUnreconciled()}>
      Review Now
    </Action>
  </InsightCard>

  <InsightCard type="opportunity">
    <SparklesIcon />
    <Message>
      {uncategorizedCount} transactions need categorization
    </Message>
    <Action onClick={() => handleBulkAICategorize()}>
      Categorize with AI
    </Action>
  </InsightCard>

  <InsightCard type="info">
    <TrendingUpIcon />
    <Message>
      Income is up {percentageChange}% compared to last month
    </Message>
  </InsightCard>

  <InsightCard type="warning">
    <GiftIcon />
    <Message>
      £{giftAidAvailable} in Gift Aid available to claim
    </Message>
    <Action onClick={() => generateGiftAidReport()}>
      Generate Report
    </Action>
  </InsightCard>
</InsightsPanel>
```

**Insights Rules:**
- Unreconciled transactions > 30 days old (alert)
- Uncategorized transactions (opportunity)
- Unusual transaction patterns (warning)
- Period-over-period changes (info)
- Gift Aid opportunities (info)

---

## Phase 7: Mobile Optimization

**Goal:** Card-based mobile experience

### Mobile View (<768px)
Replace table with card-based layout

**Components:**
```typescript
<MobileTransactionCard>
  <CardHeader>
    <Date>{formatDate(transaction.date)}</Date>
    <Amount className={transaction.type === 'income' ? 'text-success' : 'text-error'}>
      {currency.format(transaction.amount)}
    </Amount>
  </CardHeader>

  <CardBody>
    <Description>{transaction.description}</Description>
    <MetaRow>
      <Badge>{fund.name}</Badge>
      {category && <Badge variant="outline">{category.name}</Badge>}
    </MetaRow>
    {donor && (
      <DonorRow>
        <UserIcon /> {donor.name}
      </DonorRow>
    )}
  </CardBody>

  <CardActions>
    <IconButton onClick={onExpand}><ChevronDown /></IconButton>
    <IconButton onClick={onEdit}><Pencil /></IconButton>
  </CardActions>
</MobileTransactionCard>
```

**Mobile Quick Actions:**
- Floating action button for "New Transaction" (bottom right)
- Bottom sheet for filters (slides up from bottom)
- Swipeable cards for quick actions (swipe left for edit/delete)

---

## Phase 8: Table Enhancements

**Goal:** Professional spreadsheet-like features

### Advanced Table Features

**Column Management:**
- Column visibility toggle (show/hide columns)
- Column reordering (drag handles)
- Resizable columns
- Persistent column preferences (saved per user)

**Sorting:**
- Sort by any column (currently limited)
- Multi-column sort (e.g., Date DESC, then Amount DESC)
- Sort indicators in headers

**Pagination:**
- Replace current limit with proper pagination
- Page size selector (25, 50, 100, 200)
- Jump to page input
- Show "X-Y of Z transactions"

**Implementation with TanStack Table:**
```typescript
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
} from '@tanstack/react-table';

const table = useReactTable({
  data: transactions,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  // ... additional config
});
```

---

## Phase 9: CSV Upload Flow

**Goal:** Bulk import with intelligent mapping

### CSV Upload Dialog

**Steps:**
1. **Upload**: Drag-drop or file picker
2. **Preview**: Show first 10 rows
3. **Map Columns**: Auto-detect and allow manual mapping
4. **Validate**: Check for errors/warnings
5. **Import**: Process with progress indicator

**Component:**
```typescript
<CSVUploadDialog>
  <Step1Upload>
    <DropZone
      onDrop={handleFileUpload}
      accept=".csv,.xlsx"
    />
  </Step1Upload>

  <Step2MapColumns>
    <ColumnMapper>
      <Mapping>
        <CSVColumn>Transaction Date</CSVColumn>
        <Arrow />
        <SystemField>
          <Select value="date">
            <Option value="date">Date</Option>
            <Option value="description">Description</Option>
            <Option value="amount">Amount</Option>
          </Select>
        </SystemField>
      </Mapping>
      {/* Repeat for all CSV columns */}
    </ColumnMapper>

    <MappingPresets>
      <Button onClick={() => loadPreset('bankStatement')}>
        Bank Statement Format
      </Button>
      <Button onClick={() => loadPreset('quickbooks')}>
        QuickBooks Export
      </Button>
    </MappingPresets>
  </Step2MapColumns>

  <Step3Validate>
    <ValidationResults>
      <SuccessCount>{validRows} transactions ready to import</SuccessCount>
      {errors.length > 0 && (
        <ErrorList errors={errors} />
      )}
      {warnings.length > 0 && (
        <WarningList warnings={warnings} />
      )}
    </ValidationResults>
  </Step3Validate>

  <Step4Import>
    <ProgressBar value={importProgress} />
    <Status>Importing {currentRow} of {totalRows}...</Status>
  </Step4Import>
</CSVUploadDialog>
```

---

## Technical Implementation Notes

### State Management
Use React state for UI, Convex queries for data:

```typescript
// UI State
const [filterPanelOpen, setFilterPanelOpen] = useState(false);
const [selectedPeriod, setSelectedPeriod] = useState<Period>('this-month');
const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<Id<"transactions">>>(new Set());
const [expandedRowId, setExpandedRowId] = useState<Id<"transactions"> | null>(null);

// Derived filters
const dateRange = useMemo(() =>
  getPeriodDateRange(selectedPeriod),
  [selectedPeriod]
);

// Convex query with filters
const transactions = useQuery(
  api.transactions.getLedger,
  churchId ? {
    churchId,
    dateRange,
    types: selectedTypes,
    fundIds: selectedFunds,
    reconciled: reconciledFilter,
  } : "skip"
);
```

### Backend Changes Needed

**Add to `convex/transactions.ts`:**
```typescript
// Enhanced query with filter support
export const getLedger = query({
  args: {
    churchId: v.id("churches"),
    dateRange: v.optional(v.object({
      start: v.string(),
      end: v.string(),
    })),
    types: v.optional(v.array(v.union(v.literal("income"), v.literal("expense")))),
    fundIds: v.optional(v.array(v.id("funds"))),
    categoryIds: v.optional(v.array(v.id("categories"))),
    donorIds: v.optional(v.array(v.id("donors"))),
    reconciled: v.optional(v.boolean()),
    hasCategory: v.optional(v.boolean()),
    hasReceipt: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  returns: v.array(/* ... */),
  handler: async (ctx, args) => {
    // Apply filters...
  },
});

// Add insights query
export const getInsights = query({
  args: {
    churchId: v.id("churches"),
    period: v.string(),
  },
  returns: v.array(v.object({
    type: v.union(v.literal("alert"), v.literal("warning"), v.literal("info"), v.literal("opportunity")),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    message: v.string(),
    actionLabel: v.optional(v.string()),
    actionData: v.optional(v.any()),
  })),
  handler: async (ctx, args) => {
    // Generate insights...
  },
});

// Add bulk operations
export const bulkUpdateTransactions = mutation({
  args: {
    transactionIds: v.array(v.id("transactions")),
    updates: v.object({
      categoryId: v.optional(v.id("categories")),
      reconciled: v.optional(v.boolean()),
      // ... other fields
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Bulk update...
  },
});
```

### Component Organization

**File Structure:**
```
src/components/transactions/
├── transaction-command-bar.tsx       (New)
├── period-selector.tsx               (New)
├── advanced-filter-panel.tsx         (New)
├── enhanced-kpi-cards.tsx            (Enhanced)
├── transaction-ledger.tsx            (Enhanced - add expansion)
├── insights-panel.tsx                (New)
├── bulk-action-bar.tsx               (New)
├── csv-upload-dialog.tsx             (New)
├── mobile-transaction-card.tsx       (New)
├── transaction-row-detail.tsx        (New)
└── existing files...
```

---

## Design System Consistency

**Maintain ChurchCoin Aesthetics:**
- Use JetBrains Mono throughout
- Stick to paper/ink/ledger color palette
- Green for income/success, red for expenses/errors
- Clean borders and minimal shadows
- Ledger-inspired table styling
- Professional accounting feel

**Animation Guidelines:**
- Smooth expand/collapse (200-300ms)
- Fade in/out for insights and alerts
- Slide up for mobile bottom sheets
- Loading skeletons for async operations

---

## Success Criteria

Users should be able to:
1. **Find transactions instantly** - Advanced filters + search
2. **Understand financial health at a glance** - Enhanced KPIs with trends
3. **Take action on insights** - Clickable alerts with CTAs
4. **Bulk process efficiently** - Select multiple, apply actions
5. **Import transactions easily** - CSV upload with smart mapping
6. **See details without leaving page** - Expandable rows
7. **Work on any device** - Responsive mobile experience

---

## Implementation Order

1. **Phase 1-2**: Command bar + Advanced filters (foundational)
2. **Phase 3**: Enhanced KPIs (quick win, high visibility)
3. **Phase 6**: Insights panel (high value, drives engagement)
4. **Phase 4**: Expandable rows (improves UX significantly)
5. **Phase 8**: Table enhancements (TanStack migration)
6. **Phase 5**: Bulk operations (power user feature)
7. **Phase 9**: CSV upload (complex, but high ROI)
8. **Phase 7**: Mobile optimization (final polish)

---

**Next Steps:** Start with Phase 1 (Command Bar) and Phase 2 (Advanced Filters) as they form the foundation for all other enhancements.
