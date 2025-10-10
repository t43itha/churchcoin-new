# Period Selector Redesign Specification

## Objective
Replace the current multi-button period selector with a single, smart dropdown that combines period selection and comparison in one elegant control.

---

## Current Problems
- Takes excessive horizontal space (200+ pixels)
- Redundant information displayed twice
- Unclear abbreviations ("LM", "Q", "Y")
- Too many competing buttons
- Comparison period shown separately and redundantly

---

## Solution: Single Smart Selector Dropdown

### Visual Design

**Compact State:**
```
┌────────────────────────────────┐
│ 📅 Sep 2025 vs Aug 2025    ▼  │
└────────────────────────────────┘
```

**Full Label (on hover/focus):**
```
┌────────────────────────────────────────┐
│ 📅 September 2025 vs August 2025   ▼  │
└────────────────────────────────────────┘
```

**Expanded Dropdown:**
```
┌────────────────────────────────────────┐
│ 📅 September 2025 vs August 2025   ▲  │
├────────────────────────────────────────┤
│ ✓ This Month vs Last Month             │
│   Last Month vs Prior Month            │
│   This Quarter vs Last Quarter         │
│   This Year vs Last Year               │
│   Year to Date vs Prior YTD            │
│   ─────────────────────────────────    │
│   📆 Custom Range...                   │
└────────────────────────────────────────┘
```

---

## Component Specifications

### 1. Dropdown Button

**Location:** Top-right area of dashboard, between title and action buttons  
**Replace:** The entire current period selector row (This Month, Last Month, This Quarter, etc.)

**Dimensions:**
- Width: 280px (fixed)
- Height: 40px
- Padding: 12px 16px
- Border-radius: 6px

**Visual Style:**
- Background: White (#FFFFFF)
- Border: 1px solid #E5E7EB
- Shadow: 0 1px 2px rgba(0, 0, 0, 0.05)
- Hover: Border color #D1D5DB, shadow 0 1px 3px

**Text:**
- Font-size: 14px
- Font-weight: 500
- Color: #111827
- Icon: 📅 (calendar emoji) or calendar SVG icon
- Chevron: ▼ (down) when closed, ▲ (up) when open

**Responsive Behavior:**
- Desktop (>1024px): Show full month names "September 2025 vs August 2025"
- Tablet (768-1023px): Show abbreviated "Sep 2025 vs Aug 2025"
- Mobile (<768px): Show ultra-compact "Sep '25 vs Aug '25"

---

### 2. Dropdown Menu

**Positioning:**
- Align: Right-aligned with button
- Below button with 4px gap
- Z-index: 1000 (above other content)

**Dimensions:**
- Width: 320px (wider than button for readability)
- Max-height: 400px
- Scroll if needed

**Visual Style:**
- Background: White (#FFFFFF)
- Border: 1px solid #E5E7EB
- Border-radius: 8px
- Shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1)

**Menu Items:**
- Height: 44px each
- Padding: 12px 16px
- Hover: Background #F3F4F6
- Active/Selected: Background #EEF2FF, checkmark (✓) on left
- Text: 14px, #111827
- Divider: 1px solid #E5E7EB before "Custom Range"

---

### 3. Predefined Period Options

**Menu Structure:**

| Display Label | Primary Period | Comparison Period | Date Logic |
|--------------|----------------|-------------------|------------|
| This Month vs Last Month | Current month | Previous month | Dynamic based on today |
| Last Month vs Prior Month | Previous month | 2 months ago | N-1 month vs N-2 month |
| This Quarter vs Last Quarter | Current quarter | Previous quarter | Q based on current date |
| This Year vs Last Year | Current year (Jan-Dec) | Previous year | YYYY vs YYYY-1 |
| Year to Date vs Prior YTD | Jan 1 to today (current year) | Jan 1 to same date (prior year) | YTD comparison |
| Custom Range... | User-selected | Optional user-selected | Opens date picker modal |

**Default Selection on Page Load:**
- "This Month vs Last Month"
- Shows current month and automatically compares to previous month

---

### 4. Custom Range Modal

**Trigger:** Click "📆 Custom Range..." option

**Modal Design:**
```
┌────────────────────────────────────────┐
│  Select Custom Date Range          [×] │
├────────────────────────────────────────┤
│                                        │
│  Primary Period                        │
│  From: [01/09/2025 📅]                 │
│  To:   [30/09/2025 📅]                 │
│                                        │
│  Compare To (optional)                 │
│  ☐ Enable comparison                  │
│  From: [01/08/2025 📅]                 │
│  To:   [31/08/2025 📅]                 │
│                                        │
│  [Cancel]  [Apply]                     │
└────────────────────────────────────────┘
```

**Fields:**
- Date pickers for start/end dates (primary period)
- Checkbox to enable comparison period
- Date pickers for comparison start/end (disabled unless checkbox checked)
- Validation: End date must be after start date

**Behavior:**
- After clicking Apply, dropdown shows: "1 Sep - 30 Sep 2025 vs 1 Aug - 31 Aug 2025"
- Or if no comparison: "1 Sep - 30 Sep 2025"
- Store selection in URL params for shareable links

---

## State Management

### Selected Period State

Store in application state:
```javascript
{
  periodType: "this_month", // or "custom"
  primary: {
    start: "2025-09-01",
    end: "2025-09-30",
    label: "September 2025"
  },
  comparison: {
    start: "2025-08-01",
    end: "2025-08-31",
    label: "August 2025"
  }
}
```

### URL Parameters (for bookmarking/sharing)

**Standard Periods:**
- `?period=this_month` (auto-calculates comparison)
- `?period=last_month`
- `?period=this_quarter`
- `?period=this_year`
- `?period=ytd`

**Custom Range:**
- `?from=2025-09-01&to=2025-09-30&compare_from=2025-08-01&compare_to=2025-08-31`
- `?from=2025-09-01&to=2025-09-30` (no comparison)

### Local Storage

Remember user's last selection:
```javascript
localStorage.setItem('dashboardPeriod', JSON.stringify(periodState))
```

On page load, check localStorage → URL params → default to "This Month"

---

## Dashboard Data Refresh Logic

**When period changes:**
1. Update dropdown label immediately (optimistic UI)
2. Show loading skeleton on KPI cards
3. Fetch new data for selected period
4. Update all metrics, charts, and AI insights
5. Update URL without page reload (history.pushState)

**API Call:**
```javascript
GET /api/dashboard/data
  ?from=2025-09-01
  &to=2025-09-30
  &compare_from=2025-08-01
  &compare_to=2025-08-31
```

---

## Comparison Period Calculation Logic

**This Month:**
- Primary: First day of current month → Last day of current month
- Comparison: First day of previous month → Last day of previous month

**Last Month:**
- Primary: First day of previous month → Last day of previous month
- Comparison: First day of 2 months ago → Last day of 2 months ago

**This Quarter:**
- Primary: First day of current quarter → Last day of current quarter
- Comparison: First day of previous quarter → Last day of previous quarter
- Quarters: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)

**This Year:**
- Primary: Jan 1 (current year) → Dec 31 (current year)
- Comparison: Jan 1 (previous year) → Dec 31 (previous year)

**Year to Date:**
- Primary: Jan 1 (current year) → Today
- Comparison: Jan 1 (previous year) → Same date previous year
- Example: If today is Oct 10, 2025 → Compare Jan 1 - Oct 10, 2025 vs Jan 1 - Oct 10, 2024

---

## Implementation Steps

### Phase 1: Core Component
1. ✅ Remove existing period selector buttons
2. ✅ Create single dropdown component
3. ✅ Implement 5 predefined options
4. ✅ Wire up to state management
5. ✅ Update dashboard data fetching

### Phase 2: Custom Range
6. ✅ Build custom range modal
7. ✅ Add date pickers with validation
8. ✅ Implement optional comparison toggle
9. ✅ Handle custom label generation

### Phase 3: Polish
10. ✅ Add URL parameter support
11. ✅ Implement local storage persistence
12. ✅ Responsive label truncation
13. ✅ Keyboard navigation (up/down arrows, enter, esc)
14. ✅ Loading states during data fetch

---

## Accessibility Requirements

- **Keyboard Navigation:**
  - Tab to focus dropdown
  - Enter/Space to open
  - Arrow keys to navigate options
  - Enter to select
  - Esc to close
  
- **ARIA Labels:**
  ```html
  <button 
    aria-label="Select date range and comparison period"
    aria-expanded="false"
    aria-haspopup="menu"
  >
  ```

- **Screen Reader Announcements:**
  - "September 2025 compared to August 2025, Date range selector"
  - "Menu expanded, 6 options available"
  - "This Month vs Last Month, selected"

---

## Visual Design Specifications

### Colors
- **Button background:** #FFFFFF
- **Button border:** #E5E7EB
- **Button hover border:** #D1D5DB
- **Button text:** #111827
- **Menu background:** #FFFFFF
- **Menu item hover:** #F3F4F6
- **Menu item selected:** #EEF2FF
- **Checkmark:** #3B82F6 (blue)
- **Divider:** #E5E7EB

### Typography
- **Button text:** 14px, font-weight 500
- **Menu items:** 14px, font-weight 400
- **Custom range label:** 13px, font-weight 400, #6B7280

### Spacing
- **Button padding:** 12px 16px
- **Menu item padding:** 12px 16px
- **Icon margin:** 8px right of calendar icon
- **Checkmark margin:** 8px left of selected item

### Shadows
- **Button:** 0 1px 2px rgba(0, 0, 0, 0.05)
- **Button hover:** 0 1px 3px rgba(0, 0, 0, 0.1)
- **Menu:** 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)

---

## Edge Cases & Error Handling

1. **Invalid Date Range:** If somehow invalid dates are in URL params, fall back to "This Month"
2. **Future Dates:** Allow selecting future dates for planning/budgeting
3. **Same Start/End Date:** Allow (single day view)
4. **Comparison Period Longer than Primary:** Allow (shows relevant comparison)
5. **No Comparison Period:** Handle display gracefully ("September 2025" without "vs")
6. **Loading State:** Show skeleton/spinner on button if data fetch takes >300ms
7. **API Error:** Show error toast, keep previous period selected

---

## Testing Checklist

- [ ] Dropdown opens/closes on click
- [ ] Keyboard navigation works (tab, arrow keys, enter, esc)
- [ ] Each predefined option correctly calculates dates
- [ ] "This Month" updates correctly when month changes (e.g., Oct 1)
- [ ] "Year to Date" correctly calculates partial year
- [ ] Custom range modal opens and closes
- [ ] Date validation prevents end before start
- [ ] Optional comparison toggle works
- [ ] Selected option shows checkmark
- [ ] Label truncates correctly on mobile
- [ ] URL parameters update on selection
- [ ] Shareable URLs load correct period
- [ ] Local storage persists last selection
- [ ] Dashboard data refreshes when period changes
- [ ] Loading state displays during fetch
- [ ] Works in all browsers (Chrome, Firefox, Safari, Edge)
- [ ] Touch interactions work on mobile
- [ ] Screen reader announces changes correctly

---

## Migration Notes

**Remove these existing elements:**
```html
<!-- DELETE -->
<button>THIS MONTH</button>
<button>LAST MONTH LM</button>
<button>THIS QUARTER Q</button>
<button>THIS YEAR Y</button>
<button>YEAR TO DATE YTD</button>
<button>CUSTOM RANGE</button>
<div>Comparison 1 Aug - 31 Aug 2025</div>
<div>vs 1 Aug - 31 Aug 2025</div>
```

**Replace with:**
```html
<!-- NEW COMPONENT -->
<PeriodSelector 
  defaultPeriod="this_month"
  onPeriodChange={handlePeriodChange}
/>
```

**Data fetching changes:**
- Update dashboard API endpoint to accept `from`, `to`, `compare_from`, `compare_to` params
- Ensure all KPI calculations handle comparison period
- AI insights should reference the selected periods in narrative

---

## Example Usage

**Component API:**
```typescript
interface PeriodSelectorProps {
  defaultPeriod?: PeriodType;
  onPeriodChange: (period: PeriodState) => void;
  className?: string;
}

type PeriodType = 
  | 'this_month' 
  | 'last_month' 
  | 'this_quarter' 
  | 'this_year' 
  | 'ytd' 
  | 'custom';

interface PeriodState {
  periodType: PeriodType;
  primary: {
    start: string; // ISO date
    end: string;
    label: string; // Display label
  };
  comparison?: {
    start: string;
    end: string;
    label: string;
  };
}
```

**Integration:**
```jsx
<PeriodSelector 
  defaultPeriod="this_month"
  onPeriodChange={(period) => {
    // Update dashboard data
    fetchDashboardData(period);
    // Update URL
    updateURL(period);
    // Store preference
    localStorage.setItem('period', JSON.stringify(period));
  }}
/>
```

---

## Success Criteria

✅ Reduces horizontal space usage by ~150px  
✅ Eliminates redundant date display  
✅ Clear, unambiguous labels (no "LM", "Q" abbreviations)  
✅ Single interaction point (one dropdown vs 6 buttons)  
✅ Supports both predefined and custom ranges  
✅ Period selection is bookmarkable/shareable via URL  
✅ Remembers user preference across sessions  
✅ Fully accessible (keyboard + screen reader)  
✅ Responsive across all screen sizes  

---

This redesign transforms the period selector from cluttered and confusing to elegant and intuitive, while maintaining all functionality and adding shareability.
