# Convex Backend Development Guidelines

This file contains all guidelines and best practices for developing Convex backend functions, schemas, and patterns for the ChurchCoin project.

## Function Syntax & Registration

### New Function Syntax (REQUIRED)

ALWAYS use the new function syntax for all Convex functions:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const exampleQuery = query({
    args: { name: v.string() },
    returns: v.string(),
    handler: async (ctx, args) => {
        return "Hello " + args.name;
    },
});
```

### Function Registration Types

- **Public Functions**: Use `query`, `mutation`, `action` for public API functions
- **Internal Functions**: Use `internalQuery`, `internalMutation`, `internalAction` for private functions
- **ALWAYS include argument and return validators** for all functions
- If a function doesn't return anything, use `returns: v.null()`

### Function Calling Patterns

```typescript
// Call functions using ctx.run methods
const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });
await ctx.runMutation(internal.example.updateData, { id: "123" });
await ctx.runAction(internal.example.processData, {});
```

- Use `ctx.runQuery` to call queries from any function
- Use `ctx.runMutation` to call mutations from mutations or actions
- Use `ctx.runAction` to call actions from actions only
- Always pass `FunctionReference` objects, not functions directly

## Validators & Types

### Core Convex Types

| Type    | TS/JS Type  | Example           | Validator              | Notes                          |
|---------|-------------|-------------------|------------------------|--------------------------------|
| Id      | string      | `doc._id`         | `v.id(tableName)`      | Document IDs                   |
| Null    | null        | `null`            | `v.null()`             | Use instead of `undefined`     |
| Int64   | bigint      | `3n`              | `v.int64()`            | 64-bit integers               |
| Float64 | number      | `3.1`             | `v.number()`           | IEEE-754 doubles              |
| Boolean | boolean     | `true`            | `v.boolean()`          |                               |
| String  | string      | `"abc"`           | `v.string()`           | UTF-8 encoded                 |
| Bytes   | ArrayBuffer | `new ArrayBuffer` | `v.bytes()`            | Binary data                   |
| Array   | Array       | `[1, 2, "abc"]`   | `v.array(values)`      | Max 8192 values               |
| Object  | Object      | `{a: "abc"}`      | `v.object({a: v.string()})` | Plain objects only      |
| Record  | Record      | `{"a": "1"}`      | `v.record(keys, values)` | Dynamic keys              |

### Validator Examples

```typescript
// Array validator
args: {
    items: v.array(v.union(v.string(), v.number())),
}

// Record validator
args: {
    userMap: v.record(v.id("users"), v.string()),
}

// Discriminated union in schema
v.union(
    v.object({
        kind: v.literal("error"),
        errorMessage: v.string(),
    }),
    v.object({
        kind: v.literal("success"),
        value: v.number(),
    }),
)
```

## Schema Guidelines

### Schema Definition

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    tableName: defineTable({
        field1: v.string(),
        field2: v.optional(v.number()),
        foreignKey: v.id("otherTable"),
    })
    .index("by_field1", ["field1"])
    .index("by_field1_and_field2", ["field1", "field2"]),
});
```

### Index Naming Conventions

- Include all index fields in the index name
- Format: `"by_field1_and_field2"` for `["field1", "field2"]`
- Query fields in the same order they're defined in the index

### System Fields

All documents automatically include:
- `_id`: `v.id(tableName)` - Document ID
- `_creationTime`: `v.number()` - Creation timestamp

## TypeScript Patterns

### ID Types

```typescript
import { Id, Doc } from "./_generated/dataModel";

// Use specific ID types
const userId: Id<"users"> = args.userId;

// Record with ID keys
const userMap: Record<Id<"users">, string> = {};
```

### Type Annotations for Same-File Calls

```typescript
export const g = query({
    args: {},
    returns: v.null(),
    handler: async (ctx, args) => {
        // Type annotation required for same-file calls
        const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });
        return null;
    },
});
```

## Query Patterns

### Index-Based Queries (PREFERRED)

```typescript
// Use withIndex instead of filter
const messages = await ctx.db
    .query("messages")
    .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
    .order("desc")
    .take(10);
```

### Search Queries

```typescript
const messages = await ctx.db
    .query("messages")
    .withSearchIndex("search_body", (q) =>
        q.search("body", "hello hi").eq("channel", "#general"),
    )
    .take(10);
```

### Ordering & Limits

- Default order: ascending `_creationTime`
- Use `.order('desc')` or `.order('asc')` explicitly
- Use `.take(n)` for limits
- Use `.unique()` for single document (throws if multiple)
- Use `for await (const row of query)` for async iteration

### Pagination

```typescript
import { paginationOptsValidator } from "convex/server";

export const listPaginated = query({
    args: {
        paginationOpts: paginationOptsValidator,
        author: v.string()
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("messages")
            .filter((q) => q.eq(q.field("author"), args.author))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});
```

Returns: `{ page: Doc[], isDone: boolean, continueCursor: string }`

## Mutation Patterns

```typescript
// Replace entire document
await ctx.db.replace(docId, newDocument);

// Shallow merge updates
await ctx.db.patch(docId, { field: newValue });

// Delete (cannot use query.delete())
const docs = await ctx.db.query("table").collect();
for (const doc of docs) {
    await ctx.db.delete(doc._id);
}
```

## Action Patterns

```typescript
// Add "use node"; for Node.js modules
"use node";
import fs from "fs";

export const nodeAction = action({
    args: {},
    returns: v.null(),
    handler: async (ctx, args) => {
        // No ctx.db access in actions
        // Use ctx.runQuery/runMutation instead
        const data = await ctx.runQuery(api.getData, {});
        return null;
    },
});
```

## Scheduling & Cron Jobs

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Use interval or cron methods only
crons.interval("cleanup task", { hours: 2 }, internal.cleanup.run, {});

export default crons;
```

## File Storage

```typescript
// Get file URL
const url = await ctx.storage.getUrl(fileId);

// Get file metadata from _storage table
const metadata: {
    _id: Id<"_storage">;
    _creationTime: number;
    contentType?: string;
    sha256: string;
    size: number;
} | null = await ctx.db.system.get(fileId);

// Files are stored as Blob objects
const blob = new Blob([data], { type: "text/plain" });
```

## ChurchCoin-Specific Patterns

### Church-Scoped Queries

All data should be scoped to the current church:

```typescript
export const getChurchFunds = query({
    args: { churchId: v.id("churches") },
    returns: v.array(v.id("funds")),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("funds")
            .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
            .collect();
    },
});
```

### Fund Balance Calculations

```typescript
export const calculateFundBalance = internalQuery({
    args: { fundId: v.id("funds") },
    returns: v.number(),
    handler: async (ctx, args) => {
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_fund", (q) => q.eq("fundId", args.fundId))
            .collect();

        return transactions.reduce((balance, tx) => {
            return tx.type === "credit"
                ? balance + tx.amount
                : balance - tx.amount;
        }, 0);
    },
});
```

### Transaction Audit Trail

Always include audit fields in mutations:

```typescript
export const createTransaction = mutation({
    args: {
        fundId: v.id("funds"),
        amount: v.number(),
        description: v.string(),
        type: v.union(v.literal("credit"), v.literal("debit")),
    },
    returns: v.id("transactions"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("transactions", {
            ...args,
            createdBy: ctx.auth.getUserId(),
            createdAt: Date.now(),
        });
    },
});
```

## Error Handling

```typescript
export const safeOperation = mutation({
    args: { id: v.id("documents") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const doc = await ctx.db.get(args.id);
        if (!doc) {
            throw new Error("Document not found");
        }

        // Validate business rules
        if (doc.status === "locked") {
            throw new Error("Cannot modify locked document");
        }

        // Proceed with operation
        return null;
    },
});
```

## Development Workflow

1. Define schema first in `schema.ts`
2. Create internal functions for business logic
3. Create public functions for API endpoints
4. Always include validators for args and returns
5. Use TypeScript strict types with `Id<"table">` and `Doc<"table">`
6. Test functions in Convex dashboard before frontend integration