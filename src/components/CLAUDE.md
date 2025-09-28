# UI Components & Design System Guidelines

This file contains guidelines for building UI components using the ChurchCoin ledger-inspired design system, shadcn/ui components, and Tailwind CSS.

## ChurchCoin Design System

### Color Palette

```typescript
// Primary Colors
const colors = {
  // Core ledger colors
  paper: '#FAFAF8',      // Background - warm off-white
  ink: '#000000',        // Text - pure black
  ledger: '#E8E8E6',     // Borders/dividers - light gray

  // Semantic colors
  success: '#0A5F38',    // Positive amounts, success states
  error: '#8B0000',      // Negative amounts, error states

  // Supporting colors
  greyDark: '#4A4A4A',   // Secondary text
  greyMid: '#6B6B6B',    // Muted text
  greyLight: '#F5F5F5',  // Light backgrounds
  highlight: '#F0F0EE',  // Subtle highlights
};
```

### Typography

**Primary Font**: JetBrains Mono (monospace)
- Used throughout the entire application
- Maintains ledger-like consistency
- Ensures proper alignment in tables

```css
/* Applied globally */
font-family: 'JetBrains Mono', monospace;
```

### Design Principles

1. **Ledger Aesthetics**: Professional, clean, accounting-inspired
2. **Monospace Consistency**: All text uses JetBrains Mono
3. **High Contrast**: Black text on white/light backgrounds
4. **Minimal Color**: Limited palette focused on functionality
5. **Clean Lines**: Sharp borders, clear separation

## shadcn/ui Component Usage

### Base Components

Always start with shadcn/ui components and customize with design system:

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Use with design system classes
<Button className="font-primary border-ledger">
  Create Fund
</Button>

<Card className="border-ledger bg-paper">
  <CardHeader>
    <CardTitle className="text-ink">Fund Details</CardTitle>
  </CardHeader>
</Card>
```

### Component Customization

```typescript
// Customize shadcn components with design system
interface ChurchCoinButtonProps extends React.ComponentProps<typeof Button> {
  variant?: 'default' | 'outline' | 'ledger';
}

export function ChurchCoinButton({
  className,
  variant = 'default',
  ...props
}: ChurchCoinButtonProps) {
  const variantClasses = {
    default: 'bg-ink text-paper hover:bg-grey-dark',
    outline: 'border-ledger text-ink hover:bg-highlight',
    ledger: 'bg-ledger text-ink border-ink hover:bg-grey-light',
  };

  return (
    <Button
      className={cn(
        'font-primary',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
```

## Ledger Table Components

### Basic Ledger Table

```typescript
interface LedgerTableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export function LedgerTable({ headers, children, className }: LedgerTableProps) {
  return (
    <div className={cn("bg-paper border border-ledger rounded-lg overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-ledger">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-sm font-medium text-grey-dark"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Ledger row component
interface LedgerRowProps {
  children: React.ReactNode;
  className?: string;
}

export function LedgerRow({ children, className }: LedgerRowProps) {
  return (
    <tr className={cn("border-b border-ledger hover:bg-highlight", className)}>
      {children}
    </tr>
  );
}

// Ledger cell component
interface LedgerCellProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function LedgerCell({
  children,
  align = 'left',
  className
}: LedgerCellProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td className={cn(
      "px-6 py-3 text-sm text-ink",
      alignClasses[align],
      className
    )}>
      {children}
    </td>
  );
}
```

### Transaction Table Example

```typescript
export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <LedgerTable headers={['Date', 'Description', 'Fund', 'Debit', 'Credit', 'Balance']}>
      {transactions.map((transaction) => (
        <LedgerRow key={transaction._id}>
          <LedgerCell>
            {formatDate(transaction.date)}
          </LedgerCell>
          <LedgerCell>
            {transaction.description}
          </LedgerCell>
          <LedgerCell className="text-grey-mid">
            {transaction.fundName}
          </LedgerCell>
          <LedgerCell align="right">
            {transaction.type === 'debit' ? (
              <span className="text-error">£{transaction.amount.toFixed(2)}</span>
            ) : '—'}
          </LedgerCell>
          <LedgerCell align="right">
            {transaction.type === 'credit' ? (
              <span className="text-success">£{transaction.amount.toFixed(2)}</span>
            ) : '—'}
          </LedgerCell>
          <LedgerCell align="right" className="font-medium">
            £{transaction.balance.toFixed(2)}
          </LedgerCell>
        </LedgerRow>
      ))}
    </LedgerTable>
  );
}
```

## Fund Card Components

### Base Fund Card

```typescript
interface FundCardProps {
  fund: {
    _id: Id<"funds">;
    name: string;
    type: 'general' | 'restricted' | 'designated';
    balance: number;
    description?: string;
  };
  onClick?: () => void;
}

export function FundCard({ fund, onClick }: FundCardProps) {
  const typeColors = {
    general: 'text-ink',
    restricted: 'text-error',
    designated: 'text-success',
  };

  const typeLabels = {
    general: 'General Fund',
    restricted: 'Restricted Fund',
    designated: 'Designated Fund',
  };

  return (
    <Card
      className="border-ledger bg-paper hover:bg-highlight cursor-pointer transition-colors"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-ink font-primary text-lg">
              {fund.name}
            </CardTitle>
            <p className={cn("text-sm font-primary", typeColors[fund.type])}>
              {typeLabels[fund.type]}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-ink font-primary">
              £{fund.balance.toFixed(2)}
            </div>
          </div>
        </div>
        {fund.description && (
          <p className="text-grey-mid text-sm font-primary mt-2">
            {fund.description}
          </p>
        )}
      </CardHeader>
    </Card>
  );
}
```

## Form Components

### Ledger-Style Form Input

```typescript
interface LedgerInputProps extends React.ComponentProps<typeof Input> {
  label: string;
  error?: string;
  required?: boolean;
}

export function LedgerInput({
  label,
  error,
  required = false,
  className,
  ...props
}: LedgerInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink font-primary">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      <Input
        className={cn(
          "font-primary border-ledger bg-paper text-ink",
          "focus:border-ink focus:ring-ink",
          error && "border-error",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-error font-primary">{error}</p>
      )}
    </div>
  );
}
```

### Amount Input Component

```typescript
interface AmountInputProps extends Omit<LedgerInputProps, 'type'> {
  currency?: string;
}

export function AmountInput({
  currency = '£',
  className,
  ...props
}: AmountInputProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-mid font-primary">
        {currency}
      </span>
      <LedgerInput
        type="number"
        step="0.01"
        min="0"
        className={cn("pl-8", className)}
        {...props}
      />
    </div>
  );
}
```

## Status & Indicator Components

### Fund Type Badge

```typescript
interface FundTypeBadgeProps {
  type: 'general' | 'restricted' | 'designated';
  size?: 'sm' | 'md' | 'lg';
}

export function FundTypeBadge({ type, size = 'md' }: FundTypeBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const typeStyles = {
    general: 'bg-highlight text-ink border-ledger',
    restricted: 'bg-error/10 text-error border-error/20',
    designated: 'bg-success/10 text-success border-success/20',
  };

  const typeLabels = {
    general: 'General',
    restricted: 'Restricted',
    designated: 'Designated',
  };

  return (
    <span className={cn(
      'inline-flex items-center border rounded font-primary font-medium',
      sizeClasses[size],
      typeStyles[type]
    )}>
      {typeLabels[type]}
    </span>
  );
}
```

### Balance Display

```typescript
interface BalanceDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCurrency?: boolean;
}

export function BalanceDisplay({
  amount,
  size = 'md',
  showCurrency = true
}: BalanceDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const isNegative = amount < 0;
  const displayAmount = Math.abs(amount);

  return (
    <span className={cn(
      'font-primary font-bold',
      sizeClasses[size],
      isNegative ? 'text-error' : 'text-ink'
    )}>
      {isNegative && '- '}
      {showCurrency && '£'}
      {displayAmount.toFixed(2)}
    </span>
  );
}
```

## Loading States

### Ledger Skeleton

```typescript
export function LedgerTableSkeleton() {
  return (
    <div className="bg-paper border border-ledger rounded-lg overflow-hidden">
      <div className="bg-ledger h-12" />
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex space-x-6 p-6 border-b border-ledger last:border-b-0"
          >
            <div className="h-4 bg-grey-light rounded w-20" />
            <div className="h-4 bg-grey-light rounded w-40" />
            <div className="h-4 bg-grey-light rounded w-24" />
            <div className="h-4 bg-grey-light rounded w-16 ml-auto" />
            <div className="h-4 bg-grey-light rounded w-16" />
            <div className="h-4 bg-grey-light rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FundCardSkeleton() {
  return (
    <Card className="border-ledger bg-paper">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-6 bg-grey-light rounded w-32" />
            <div className="h-4 bg-grey-light rounded w-24" />
          </div>
          <div className="h-8 bg-grey-light rounded w-20" />
        </div>
      </CardHeader>
    </Card>
  );
}
```

## Accessibility Guidelines

### ARIA Labels

```typescript
// Always provide meaningful labels
<Button aria-label="Create new fund">
  <Plus className="h-4 w-4" />
</Button>

// Use aria-describedby for additional context
<Input
  aria-describedby="amount-help"
  aria-invalid={!!error}
/>
<div id="amount-help" className="sr-only">
  Enter amount in pounds and pence
</div>
```

### Keyboard Navigation

```typescript
// Ensure interactive elements are keyboard accessible
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClick();
    }
  }}
  onClick={onClick}
>
  Fund Card Content
</div>
```

### Screen Reader Support

```typescript
// Use semantic HTML and ARIA roles
<main role="main">
  <h1>Fund Dashboard</h1>
  <section aria-labelledby="funds-section">
    <h2 id="funds-section">Your Funds</h2>
    <div role="grid" aria-label="Funds overview">
      {/* Fund cards */}
    </div>
  </section>
</main>
```

## Component Composition Patterns

### Compound Components

```typescript
// FundCard with sub-components
export const FundCard = {
  Root: FundCardRoot,
  Header: FundCardHeader,
  Content: FundCardContent,
  Actions: FundCardActions,
};

// Usage
<FundCard.Root>
  <FundCard.Header>
    <h3>General Fund</h3>
    <FundTypeBadge type="general" />
  </FundCard.Header>
  <FundCard.Content>
    <BalanceDisplay amount={1000} />
  </FundCard.Content>
  <FundCard.Actions>
    <Button>View</Button>
    <Button variant="outline">Edit</Button>
  </FundCard.Actions>
</FundCard.Root>
```

## Development Workflow

1. **Start with shadcn/ui**: Use base components first
2. **Apply design system**: Add ChurchCoin color and typography classes
3. **Follow naming conventions**: Use descriptive, domain-specific names
4. **Include loading states**: Always provide skeleton components
5. **Add accessibility**: Include ARIA labels, keyboard navigation
6. **Test responsiveness**: Ensure mobile compatibility
7. **Document variants**: Create clear prop interfaces
8. **Use TypeScript**: Strong typing for all component props