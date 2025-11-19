# Implementation Plan: Invite-Only Pilot + Onboarding Improvements

**Branch**: `feat/pilot-onboarding`
**Base**: `feat-clerk-authv2`
**Estimated Time**: ~5.5 hours
**Status**: Ready to implement

---

## Overview

This plan addresses two critical needs:
1. **Invite-only pilot mode** - Restrict sign-ups to invited users only
2. **Improved onboarding** - Create default funds/categories and guide new users

---

## Part 1: Invite-Only Pilot Mode

### 1.1 Middleware Updates
**File**: `src/middleware.ts`

**Problem**: `/api/users/invites/[token]` returns 401 for unauthenticated users

**Solution**: Add to public routes matcher:
```typescript
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/users/invites(.*)", // ADD THIS LINE
]);
```

**Why**: Allows invitees to view invitation details before signing up

---

### 1.2 Homepage Updates (Landing Page Gating)
**File**: `src/app/page.tsx`

**Changes**: Replace "Start Free Trial" buttons with pilot-appropriate CTAs

**Locations to update**:
- Line ~377: Starter plan CTA
- Line ~424: Professional plan CTA
- Line ~466: Church plan CTA
- Line ~496: Bottom hero CTA

**Options**:
1. Replace with "Request Access" button → contact form
2. Replace with "Invitation Required" message
3. Remove buttons entirely and add waitlist form

**Recommended**: Replace with "Request Access" that opens a form or redirects to a Typeform/Google Form

---

### 1.3 Clerk Dashboard Configuration (Manual Step)

**Action**: Enable Clerk Restricted Sign-Up Mode

**Steps**:
1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to: **Settings** → **Restrictions**
4. Change **Sign-up mode** from "Public" to "Restricted"
5. Save changes

**Effect**: Clerk automatically blocks all sign-ups except invited users

**Documentation**: Add to README.md setup section

---

### 1.4 Optional: Invitation Preview Page

**New file**: `src/app/invite/[token]/page.tsx`

**Purpose**: Show invitation details before sign-up

**Features**:
- Display church name
- Display role being invited to
- Show expiration date
- "Accept Invitation" button → `/register?invite={token}`
- Handle invalid/expired tokens gracefully

**Benefits**: Better UX, professional presentation

---

## Part 2: Onboarding Experience Improvements

### 2.1 Fix Default Setup in ensureUser ⭐ CRITICAL

**File**: `convex/auth.ts`

**Current Problem**:
- `ensureUser` creates bare church with only settings
- New users land on empty dashboard (no funds, no categories)
- User must manually create everything

**Root Cause**:
- `createChurch` mutation (convex/churches.ts:42-127) creates defaults
- `ensureUser` mutation doesn't call `createChurch` logic
- Instead creates church inline with `ctx.db.insert("churches", {...})`

**Solution**: Extract and reuse setup logic

**Implementation**:

1. **Create internal helper mutation**:
```typescript
// In convex/churches.ts
export const setupDefaultChurchData = internalMutation({
  args: { churchId: v.id("churches") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const churchId = args.churchId;

    // Create default funds
    await ctx.db.insert("funds", {
      churchId,
      name: "General Fund",
      type: "general",
      balance: 0,
      isActive: true,
      isFundraising: false,
      description: "Primary operating fund for regular church expenses"
    });

    await ctx.db.insert("funds", {
      churchId,
      name: "Building Fund",
      type: "restricted",
      balance: 0,
      isActive: true,
      isFundraising: true,
      description: "Designated fund for building projects and maintenance"
    });

    // Create default expense categories
    const defaultExpenseCategories = [
      { name: "Salaries & Wages", type: "expense" },
      { name: "Rent & Facilities", type: "expense" },
      { name: "Utilities", type: "expense" },
      { name: "Ministry Expenses", type: "expense" },
      { name: "Administration", type: "expense" },
      { name: "Outreach & Missions", type: "expense" },
      { name: "Other Expenses", type: "expense" }
    ];

    // Create default income categories
    const defaultIncomeCategories = [
      { name: "Tithes", type: "income" },
      { name: "Offerings", type: "income" },
      { name: "Donations", type: "income" },
      { name: "Fundraising", type: "income" },
      { name: "Grants", type: "income" },
      { name: "Other Income", type: "income" }
    ];

    const allCategories = [...defaultExpenseCategories, ...defaultIncomeCategories];

    for (const category of allCategories) {
      await ctx.db.insert("categories", {
        churchId,
        name: category.name,
        type: category.type as "income" | "expense",
        isSystem: true,
        isSubcategory: false
      });
    }

    return null;
  }
});
```

2. **Update ensureUser to call setup**:
```typescript
// In convex/auth.ts, after creating new church
if (!churchId) {
  const fallbackName = displayName.split(" ")[0] || "New";
  churchId = await ctx.db.insert("churches", {
    name: `${fallbackName}'s Church`,
    charityNumber: undefined,
    address: undefined,
    settings: {
      fiscalYearEnd: "03-31",
      giftAidEnabled: false,
      defaultCurrency: "GBP",
    },
  });

  // ADD THIS: Setup default funds and categories
  await ctx.runMutation(internal.churches.setupDefaultChurchData, {
    churchId
  });
}
```

3. **Update createChurch to use same helper**:
```typescript
// In convex/churches.ts
export const createChurch = mutation({
  // ... args ...
  handler: async (ctx, args) => {
    // ... validation ...

    const churchId = await ctx.db.insert("churches", {
      // ... church data ...
    });

    // Call the same setup logic
    await ctx.runMutation(internal.churches.setupDefaultChurchData, {
      churchId
    });

    return churchId;
  }
});
```

**Result**: All new users get:
- ✅ 2 default funds (General Fund, Building Fund)
- ✅ 13 default categories (7 expense, 6 income)
- ✅ Ready-to-use dashboard

---

### 2.2 First-Time User Detection

**File**: `src/components/auth/session-provider.tsx`

**Add state**:
```typescript
const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
```

**Detection logic**:
```typescript
// After fetching session
if (sessionData?.user) {
  setUser(sessionData.user);

  // Check if user is first-time (created within last 5 minutes)
  const userCreatedAt = sessionData.user._creationTime;
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  const isNewUser = userCreatedAt > fiveMinutesAgo;

  setIsFirstTimeUser(isNewUser);
}
```

**Export via context**:
```typescript
<SessionContext.Provider value={{
  user,
  role,
  isFirstTimeUser,  // ADD THIS
  loading
}}>
```

---

### 2.3 Welcome/Onboarding Modal

**New file**: `src/components/onboarding/welcome-modal.tsx`

**Component**:
```typescript
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface WelcomeModalProps {
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ userName, isOpen, onClose }: WelcomeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-paper border-ledger">
        <DialogHeader>
          <DialogTitle className="text-2xl font-primary text-ink">
            Welcome to ChurchCoin, {userName}! 🎉
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 font-primary">
          <p className="text-grey-mid">
            Your church financial management system is ready. We've set up everything you need to get started:
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-success">✓</span>
              <span><strong>Two funds</strong> - General Fund and Building Fund</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-success">✓</span>
              <span><strong>Default categories</strong> - For tracking income and expenses</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-success">✓</span>
              <span><strong>Dashboard</strong> - Overview of your financial activity</span>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <p className="text-sm text-grey-mid">
              <strong>Next steps:</strong> Add your first transaction, invite team members, or explore reports.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={onClose}
              className="bg-ink text-paper hover:bg-grey-dark font-primary"
            >
              Get Started
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Integration in dashboard layout**:
```typescript
// In src/app/(dashboard)/layout.tsx
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { useSession } from "@/components/auth/session-provider";

const { user, isFirstTimeUser } = useSession();
const [showWelcome, setShowWelcome] = useState(false);

useEffect(() => {
  if (isFirstTimeUser && user) {
    // Check if user has dismissed welcome before
    const dismissed = localStorage.getItem(`welcome-dismissed-${user._id}`);
    if (!dismissed) {
      setShowWelcome(true);
    }
  }
}, [isFirstTimeUser, user]);

const handleCloseWelcome = () => {
  if (user) {
    localStorage.setItem(`welcome-dismissed-${user._id}`, 'true');
  }
  setShowWelcome(false);
};

return (
  <>
    {/* ... existing layout ... */}
    <WelcomeModal
      userName={user?.name.split(' ')[0] || 'there'}
      isOpen={showWelcome}
      onClose={handleCloseWelcome}
    />
  </>
);
```

---

### 2.4 Empty State Components

**New file**: `src/components/dashboard/empty-states.tsx`

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus, TrendingUp, Users, Receipt } from "lucide-react";

export function EmptyFunds() {
  return (
    <Card className="border-ledger bg-paper">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <TrendingUp className="h-12 w-12 text-grey-mid mb-4" />
        <h3 className="text-lg font-semibold font-primary text-ink mb-2">
          No funds yet
        </h3>
        <p className="text-sm text-grey-mid font-primary mb-6 max-w-md">
          Funds help you organize money by purpose (e.g., General Fund, Building Fund, Missions).
          Start by creating your first fund.
        </p>
        <Button asChild className="bg-ink text-paper hover:bg-grey-dark font-primary">
          <Link href="/funds">
            <Plus className="h-4 w-4 mr-2" />
            Create First Fund
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function EmptyTransactions() {
  return (
    <Card className="border-ledger bg-paper">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Receipt className="h-12 w-12 text-grey-mid mb-4" />
        <h3 className="text-lg font-semibold font-primary text-ink mb-2">
          No transactions yet
        </h3>
        <p className="text-sm text-grey-mid font-primary mb-6 max-w-md">
          Record income and expenses to track your church's financial activity.
        </p>
        <Button asChild className="bg-ink text-paper hover:bg-grey-dark font-primary">
          <Link href="/transactions">
            <Plus className="h-4 w-4 mr-2" />
            Add First Transaction
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function EmptyDonors() {
  return (
    <Card className="border-ledger bg-paper">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-grey-mid mb-4" />
        <h3 className="text-lg font-semibold font-primary text-ink mb-2">
          No donors yet
        </h3>
        <p className="text-sm text-grey-mid font-primary mb-6 max-w-md">
          Track giving history and manage Gift Aid declarations by adding donors.
        </p>
        <Button asChild className="bg-ink text-paper hover:bg-grey-dark font-primary">
          <Link href="/donors">
            <Plus className="h-4 w-4 mr-2" />
            Add First Donor
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

### 2.5 Setup Progress Tracker

**New file**: `src/components/dashboard/setup-progress.tsx`

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "@/components/auth/session-provider";

interface SetupProgressProps {
  hasFunds: boolean;
  hasTransactions: boolean;
  hasDonors: boolean;
  hasCategories: boolean;
}

export function SetupProgress({
  hasFunds,
  hasTransactions,
  hasDonors,
  hasCategories
}: SetupProgressProps) {
  const { user } = useSession();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (user) {
      const dismissed = localStorage.getItem(`setup-progress-dismissed-${user._id}`);
      setIsDismissed(dismissed === 'true');
    }
  }, [user]);

  const steps = [
    { label: "Account created", completed: true },
    { label: "Set up funds", completed: hasFunds },
    { label: "Configure categories", completed: hasCategories },
    { label: "Add donors", completed: hasDonors },
    { label: "Record transactions", completed: hasTransactions }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const isComplete = progress === 100;

  if (isDismissed && isComplete) {
    return null;
  }

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`setup-progress-dismissed-${user._id}`, 'true');
      setIsDismissed(true);
    }
  };

  return (
    <Card className="border-ledger bg-paper mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-primary text-ink">
          Getting Started ({completedCount}/{steps.length})
        </CardTitle>
        {isComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="w-full bg-grey-light rounded-full h-2">
            <div
              className="bg-success rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2 text-sm font-primary">
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Circle className="h-4 w-4 text-grey-mid" />
                )}
                <span className={step.completed ? "text-ink" : "text-grey-mid"}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {isComplete && (
            <p className="text-sm text-success font-primary pt-2">
              🎉 Setup complete! You're ready to manage your church finances.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 2.6 Dashboard Integration

**File**: `src/app/(dashboard)/dashboard/page.tsx`

**Add imports**:
```typescript
import { SetupProgress } from "@/components/dashboard/setup-progress";
import { EmptyTransactions } from "@/components/dashboard/empty-states";
```

**Add setup progress**:
```typescript
// After querying data
const hasFunds = (funds?.length ?? 0) > 0;
const hasTransactions = (recentTransactions?.length ?? 0) > 0;
const hasDonors = (donors?.length ?? 0) > 0;
const hasCategories = (categories?.length ?? 0) > 0;

return (
  <div className="space-y-6">
    {/* Add setup progress tracker */}
    <SetupProgress
      hasFunds={hasFunds}
      hasTransactions={hasTransactions}
      hasDonors={hasDonors}
      hasCategories={hasCategories}
    />

    {/* Rest of dashboard */}
    {/* ... existing content ... */}

    {/* Replace empty transaction state */}
    {!hasTransactions && (
      <EmptyTransactions />
    )}
  </div>
);
```

---

### 2.7 Funds Page Empty State

**File**: `src/app/(dashboard)/funds/page.tsx`

**Add empty state**:
```typescript
import { EmptyFunds } from "@/components/dashboard/empty-states";

// In component
if (funds && funds.length === 0) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-primary text-ink">Funds</h1>
      </div>
      <EmptyFunds />
    </div>
  );
}
```

---

## Part 3: Testing Checklist

### 3.1 Invitation Flow Testing
- [ ] Create invitation as admin user
- [ ] Copy invitation link with token
- [ ] Open invitation link in incognito browser
- [ ] Verify no 401 error (middleware allows access)
- [ ] Complete sign-up via invitation link
- [ ] Verify user assigned to correct church
- [ ] Verify user has correct role from invitation
- [ ] Verify invitation marked as accepted in Convex
- [ ] Verify default funds and categories created

### 3.2 New User Onboarding Testing
- [ ] Sign up brand new user (with invitation)
- [ ] Verify welcome modal appears
- [ ] Verify setup progress tracker shows
- [ ] Verify default funds exist (2 funds)
- [ ] Verify default categories exist (13 categories)
- [ ] Add first transaction → verify tracker updates
- [ ] Add first donor → verify tracker updates
- [ ] Verify tracker shows 100% when complete
- [ ] Dismiss tracker → verify it stays dismissed

### 3.3 Restricted Sign-Up Testing
- [ ] Enable Clerk Restricted Mode
- [ ] Try accessing `/register` without invitation
- [ ] Verify Clerk shows "Invitation required" message
- [ ] Verify homepage CTAs updated appropriately
- [ ] Verify existing users can still sign in

### 3.4 Edge Cases
- [ ] Existing user receives invitation → verify church/role updates
- [ ] Expired invitation → verify proper error message
- [ ] Revoked invitation → verify cannot be used
- [ ] User with existing church gets invited → verify switches churches
- [ ] Multiple invitations for same email → verify most recent used

---

## Part 4: Implementation Order

1. ✅ **Create branch**: `git checkout -b feat/pilot-onboarding`
2. ✅ **Middleware fix** (1.1) - 15 min
3. ✅ **Homepage updates** (1.2) - 15 min
4. ✅ **Default setup fix** (2.1) - 45 min ⭐ CRITICAL
5. ✅ **Empty state components** (2.4) - 1 hour
6. ✅ **Setup progress tracker** (2.5) - 1 hour
7. ✅ **Welcome modal** (2.3) - 1 hour
8. ✅ **First-time user detection** (2.2) - 30 min
9. ✅ **Dashboard integration** (2.6) - 30 min
10. ✅ **Funds page integration** (2.7) - 15 min
11. ✅ **Testing** (Part 3) - 1 hour
12. ✅ **Enable Clerk restricted mode** (1.3) - Manual step
13. ✅ **Commit and push** - 10 min

**Total estimated time**: ~5.5 hours

---

## Files Summary

### Modified Files (5)
1. `src/middleware.ts` - Add public routes for invitations
2. `src/app/page.tsx` - Update CTAs for pilot
3. `convex/auth.ts` - Fix ensureUser default setup
4. `src/app/(dashboard)/dashboard/page.tsx` - Add setup tracker + empty states
5. `src/app/(dashboard)/funds/page.tsx` - Add empty state

### New Files (4)
1. `src/components/onboarding/welcome-modal.tsx` - Welcome dialog
2. `src/components/dashboard/empty-states.tsx` - Empty state components
3. `src/components/dashboard/setup-progress.tsx` - Setup checklist widget
4. `convex/churches.ts` - Add `setupDefaultChurchData` internal mutation

### Updated Context/Hooks (1)
1. `src/components/auth/session-provider.tsx` - Add `isFirstTimeUser` detection

---

## Rollback Plan

If issues occur:
1. Revert Clerk restricted mode (toggle in dashboard)
2. Cherry-pick or revert specific commits
3. Homepage changes are cosmetic - safe to rollback
4. Default setup changes improve UX - safe to keep

---

## Post-Implementation Documentation

Add to `README.md`:

```markdown
## Pilot Mode Configuration

ChurchCoin is currently in invite-only pilot mode.

### For Administrators

**Creating Invitations:**
1. Sign in to ChurchCoin
2. Navigate to Settings → Team
3. Enter invitee's email and select role
4. Click "Send Invitation"
5. Copy the invitation link and share via email

**Invitation Link Format:**
```
https://yourapp.com/register?invite={token}
```

### For Developers

**Enable/Disable Pilot Mode:**
1. Go to Clerk Dashboard → Settings → Restrictions
2. Toggle "Sign-up mode" between "Restricted" and "Public"

**Invitation Flow:**
- Invitation links include token in query parameter
- Token validated server-side during sign-up
- User automatically assigned to inviting church
- Default funds and categories created on first login
```

---

## Success Criteria

✅ **Invite-only pilot**:
- Public sign-up blocked
- Invitation links work end-to-end
- Invitees assigned to correct church/role

✅ **Improved onboarding**:
- New users get 2 default funds
- New users get 13 default categories
- Welcome modal guides first-time users
- Setup progress tracker shows completion
- Empty states provide clear next steps

✅ **Quality**:
- All TypeScript errors resolved
- All tests passing
- Build succeeds locally and on Vercel
- No console errors
- Professional UX throughout

---

**Ready to implement!** 🚀
