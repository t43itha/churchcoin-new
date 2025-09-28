# Frontend Development Guidelines

This file contains guidelines and best practices for developing the ChurchCoin frontend using Next.js 15, React 19, and Convex client.

For UI component and design system guidelines, see: @./components/CLAUDE.md

## Next.js App Router Patterns

### File-Based Routing

```
src/app/
├── layout.tsx          # Root layout (global providers, fonts)
├── page.tsx           # Home page
├── dashboard/
│   ├── layout.tsx     # Dashboard-specific layout
│   ├── page.tsx       # Dashboard home
│   └── funds/
│       ├── page.tsx   # Funds list
│       └── [id]/
│           └── page.tsx # Individual fund page
```

### Layout Components

```typescript
// Root layout - font loading and providers
import { JetBrains_Mono } from 'next/font/google';
import ConvexClientProvider from './providers/ConvexClientProvider';

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jetbrainsMono.className}>
      <body>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
```

### Page Components

```typescript
// Server Component (default)
export default function FundsPage() {
  return (
    <div>
      <h1>Funds</h1>
      <FundsList /> {/* Client component for interactivity */}
    </div>
  );
}

// Client Component (when hooks/interactivity needed)
'use client';
import { useQuery } from 'convex/react';

export default function InteractiveFunds() {
  const funds = useQuery(api.funds.list);
  // ... interactive logic
}
```

## React 19 Patterns

### Server vs Client Components

**Server Components (default):**
- Fetch data directly
- No hooks or browser APIs
- Render on server
- Better performance

**Client Components (`'use client'`):**
- Use hooks (useState, useEffect, Convex hooks)
- Handle user interactions
- Access browser APIs
- Hydrate on client

### Component Composition

```typescript
// Server Component
export default function DashboardPage() {
  return (
    <div>
      <DashboardHeader /> {/* Server component */}
      <FundsSection />    {/* Client component */}
    </div>
  );
}

// Client Component with server data
'use client';
export function FundsSection() {
  const funds = useQuery(api.funds.list);

  if (funds === undefined) return <FundsLoadingSkeleton />;

  return (
    <div>
      {funds.map(fund => (
        <FundCard key={fund._id} fund={fund} />
      ))}
    </div>
  );
}
```

## Convex Client Integration

### Hooks Usage

```typescript
'use client';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export function FundManager({ fundId }: { fundId: Id<"funds"> }) {
  // Query hook for reactive data
  const fund = useQuery(api.funds.get, { id: fundId });

  // Mutation hook for database changes
  const updateFund = useMutation(api.funds.update);

  // Action hook for server-side operations
  const processTransactions = useAction(api.transactions.process);

  // Loading states
  if (fund === undefined) return <LoadingSkeleton />;
  if (fund === null) return <NotFound />;

  // Event handlers
  const handleUpdate = async (data: UpdateFundData) => {
    await updateFund({ id: fundId, ...data });
  };

  return <FundForm fund={fund} onSubmit={handleUpdate} />;
}
```

### Error Handling with Convex

```typescript
'use client';
import { ConvexError } from 'convex/values';

export function TransactionForm() {
  const createTransaction = useMutation(api.transactions.create);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: TransactionData) => {
    try {
      setError(null);
      await createTransaction(data);
      // Success - redirect or show confirmation
    } catch (err) {
      if (err instanceof ConvexError) {
        setError(err.data);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorAlert message={error} />}
      {/* Form fields */}
    </form>
  );
}
```

## Form Handling Patterns

### React Hook Form + Zod

```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema definition
const fundSchema = z.object({
  name: z.string().min(1, "Fund name is required"),
  type: z.enum(["general", "restricted", "designated"]),
  description: z.string().optional(),
  targetAmount: z.number().positive().optional(),
});

type FundFormData = z.infer<typeof fundSchema>;

export function FundForm({ onSubmit }: { onSubmit: (data: FundFormData) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FundFormData>({
    resolver: zodResolver(fundSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Fund Name</label>
        <input
          {...register('name')}
          className="input"
        />
        {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
      </div>

      <div>
        <label htmlFor="type">Fund Type</label>
        <select {...register('type')}>
          <option value="general">General Fund</option>
          <option value="restricted">Restricted Fund</option>
          <option value="designated">Designated Fund</option>
        </select>
        {errors.type && <ErrorMessage>{errors.type.message}</ErrorMessage>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Fund'}
      </Button>
    </form>
  );
}
```

### Optimistic Updates

```typescript
'use client';
export function FundBalance({ fundId }: { fundId: Id<"funds"> }) {
  const balance = useQuery(api.funds.getBalance, { id: fundId });
  const addTransaction = useMutation(api.transactions.add);

  const handleQuickDeposit = async (amount: number) => {
    // Optimistic update
    const optimisticBalance = (balance || 0) + amount;

    try {
      await addTransaction({
        fundId,
        amount,
        type: 'credit',
        description: 'Quick deposit'
      });
      // Convex will automatically update the query
    } catch (error) {
      // Handle error - Convex will revert optimistic update
      console.error('Failed to add transaction:', error);
    }
  };

  return (
    <div>
      <div className="text-2xl font-bold">
        £{balance?.toFixed(2) || '0.00'}
      </div>
      <Button onClick={() => handleQuickDeposit(100)}>
        Quick £100 Deposit
      </Button>
    </div>
  );
}
```

## Data Fetching Patterns

### Loading States

```typescript
'use client';
export function FundsDashboard() {
  const funds = useQuery(api.funds.list);
  const user = useQuery(api.users.current);

  // Handle loading states
  if (funds === undefined || user === undefined) {
    return <DashboardSkeleton />;
  }

  // Handle empty states
  if (funds.length === 0) {
    return <EmptyFundsState />;
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <FundsGrid funds={funds} />
    </div>
  );
}
```

### Conditional Queries

```typescript
'use client';
export function TransactionsList({ fundId }: { fundId?: Id<"funds"> }) {
  // Only run query if fundId is provided
  const transactions = useQuery(
    api.transactions.list,
    fundId ? { fundId } : "skip"
  );

  if (!fundId) {
    return <div>Select a fund to view transactions</div>;
  }

  if (transactions === undefined) {
    return <TransactionsLoadingSkeleton />;
  }

  return <TransactionsTable transactions={transactions} />;
}
```

## TypeScript Patterns

### Convex Types

```typescript
import type { Doc, Id } from '@/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';

// Document types
type Fund = Doc<"funds">;
type Transaction = Doc<"transactions">;

// ID types
type FundId = Id<"funds">;
type TransactionId = Id<"transactions">;

// Function return types
type FundsList = FunctionReturnType<typeof api.funds.list>;
type FundWithBalance = FunctionReturnType<typeof api.funds.getWithBalance>;
```

### Component Props

```typescript
interface FundCardProps {
  fund: Fund;
  showBalance?: boolean;
  onEdit?: (fund: Fund) => void;
  className?: string;
}

export function FundCard({
  fund,
  showBalance = true,
  onEdit,
  className
}: FundCardProps) {
  // Component implementation
}
```

## Navigation & Routing

### Programmatic Navigation

```typescript
'use client';
import { useRouter } from 'next/navigation';

export function FundCard({ fund }: { fund: Fund }) {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`/dashboard/funds/${fund._id}`);
  };

  return (
    <Card onClick={handleViewDetails}>
      {/* Card content */}
    </Card>
  );
}
```

### URL Parameters

```typescript
// app/dashboard/funds/[id]/page.tsx
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FundPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div>
      <FundDetails fundId={id as Id<"funds">} />
    </div>
  );
}
```

## Performance Patterns

### Code Splitting

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy components
const TransactionChart = dynamic(
  () => import('@/components/TransactionChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false // Client-side only for chart libraries
  }
);

export function FundAnalytics() {
  return (
    <div>
      <FundSummary />
      <TransactionChart />
    </div>
  );
}
```

### Memoization

```typescript
'use client';
import { useMemo } from 'react';

export function TransactionsSummary({ transactions }: { transactions: Transaction[] }) {
  const summary = useMemo(() => {
    return transactions.reduce((acc, tx) => ({
      totalCredits: acc.totalCredits + (tx.type === 'credit' ? tx.amount : 0),
      totalDebits: acc.totalDebits + (tx.type === 'debit' ? tx.amount : 0),
      count: acc.count + 1,
    }), { totalCredits: 0, totalDebits: 0, count: 0 });
  }, [transactions]);

  return (
    <div>
      <div>Credits: £{summary.totalCredits.toFixed(2)}</div>
      <div>Debits: £{summary.totalDebits.toFixed(2)}</div>
      <div>Net: £{(summary.totalCredits - summary.totalDebits).toFixed(2)}</div>
    </div>
  );
}
```

## Error Boundaries

```typescript
'use client';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="error-boundary">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}

export function FundsSection() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <FundsList />
    </ErrorBoundary>
  );
}
```

## Development Workflow

1. Start with server components by default
2. Add `'use client'` only when needed (hooks, interactivity)
3. Use Convex hooks for data fetching
4. Implement loading and error states
5. Add TypeScript types from Convex generated types
6. Test with Convex dev dashboard
7. Use React DevTools and Convex DevTools for debugging