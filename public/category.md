# Financial Categorization Guide

## Income Categories

| Main Category (Reports) | Subcategory (UI Display) | Fund Type | Keywords |
|------------------------|---------------------------|-----------|----------|
| **Donations** | | | |
| | Tithe | General | tithe, tithing, thithe, tith, title |
| | Offering | General | offering, offer, off, pledge, seed, sacrifice, sabbath, sac, no ref, monzo, ≤£30 |
| | Thanksgiving | General | thanks, thanksgiving, thx, tnx |
| **Building Fund** | | | |
| | Building Fund | Restricted | build, building, legacy (exclude: tshirt) |
| **Charitable Activities** | | | |
| | Charity Fund | Restricted | charity, charitable, ch |
| | Gender Ministries | Restricted | rlm, men, wmg, women, youth |
| **Other Income** | | | |
| | Merchandise | General | tshirt, merchandise, merch, book, cd |
| | Uncategorised | Excluded | null, deposit type, unmatched |

## Expenditure Categories

| Main Category (Reports) | Subcategory (UI Display) | Keywords |
|------------------------|---------------------------|----------|
| **Major Programs** | | |
| | MP Honorarium | honorarium, speaker, guest minister |
| | MP Hotels Accommodation | hotel, accommodation, lodging |
| | MP Food and Refreshments | catering, food, refreshment |
| | MP Expense | program expense |
| **Ministry Costs** | | |
| | Church Provisions & Materials | provision, material, supplies |
| | Travel & Transport Cost | transport, travel, fuel, petrol, uber |
| | Vehicle Maintenance | vehicle, maintenance, insurance |
| | Equipment Purchase & Maintenance | equipment |
| | Church Refreshment | church refreshment |
| | Media & Publicity | media, publicity, advertising |
| | Gender Ministry Activities | gender ministry, rlm activity |
| **Staff & Volunteer Costs** | | |
| | Gross Salary | salary, wage, pay |
| | Allowances | allowance, stipend |
| | Volunteer Honorarium | volunteer honorarium |
| **Premises Costs** | | |
| | Rent-Premises | rent, lease, premises |
| | Rent-Manse | manse rent |
| | Utilities | electricity, gas, water, utility |
| **Mission Costs** | | |
| | Missions-Tithe | mission tithe, hq, headquarters, slm suppt |
| | Mission Support | mission support, missionary |
| | Donations & Gifts | donation, gift, charitable giving |
| **Admin & Governance** | | |
| | IT Costs | software, internet, website, zoom |
| | Telephones & Internet | phone, telephone, broadband |
| | Bank Charges | bank charge, bank fee |
| | Training | training, course, development |
| | Fees & License | license, registration, compliance |
| | Stationery & Printing | stationery, printing, office supplies |

## Categorization Rules

### Income Processing
1. **Only process "In" column transactions** (amount > 0)
2. Apply keyword matching in priority order
3. Check exclusion keywords (e.g., tshirt excludes from Building)
4. Amount rule: ≤£30 defaults to Offering
5. Unmatched transactions → Uncategorised

### Expenditure Processing
1. **Only process "Out" column transactions** (amount > 0)
2. Match payee patterns and keywords
3. Learn from repeated payees
4. Unmatched transactions → Uncategorised

### Fund Type Rules
- **General Fund**: Can be used for any church operations
- **Restricted Fund**: Must be used for specific purpose only (Building, Charity, Gender Ministries)
- **Excluded**: Uncategorised transactions are shown but excluded from all fund totals

### Confidence Scoring
- Exact keyword match: 95%
- Partial keyword match: 80%
- Transaction type match: 70%
- Amount rule only: 60%
- No match: 0% (requires review)

### Human Review Priority
1. Uncategorised (0% confidence) - Must review
2. Low confidence (<70%) - Should review
3. Large amounts (>£500) - Should review
4. New payees - Should review
5. High confidence (>90%) - Optional review

## UI Simplification

### What Users See
- **Transaction List**: Shows subcategory only (e.g., "Tithe", "Offering", "Salary")
- **Category Selector**: Dropdown with subcategories grouped by Income/Expenditure
- **Review Screen**: One transaction at a time with quick category buttons

### What Happens Behind the Scenes
- Subcategories automatically roll up to main categories
- Fund type assignment (general/restricted/excluded)
- Confidence calculation
- Learning from corrections

## Reporting Hierarchy

### Summary View (Main Categories)
```
Income:
  Donations.............. £10,625
  Building Fund (R)...... £222
  Charitable............. £0
  Other.................. £2,339

Expenditure:
  Major Programs......... £2,500
  Ministry Costs......... £3,200
  Staff & Volunteer...... £4,000
  Premises............... £1,200
  Mission................ £1,318
  Admin & Governance..... £350
```

### Detailed View (Click to expand)
```
Donations £10,625
  ├─ Tithe............ £5,828
  ├─ Offering......... £3,215
  └─ Thanksgiving..... £740
```

## Notes

- **Thanksgiving** is now under Donations (grouped with Offering)
- **Building Fund** is standalone for separate restricted fund reporting
- **Uncategorised** transactions are listed but excluded from all totals
- UI shows only subcategories for simplicity
- Main categories appear only in reports with drill-down option