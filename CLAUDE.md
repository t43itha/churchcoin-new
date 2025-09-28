# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contextual Guidelines

For detailed development guidelines specific to different parts of the codebase:

@./convex/CLAUDE.md
@./src/CLAUDE.md

## Project Overview

ChurchCoin is an AI-first financial management platform designed specifically for small UK churches (10-200 members). The application focuses on fund accounting, donor management, transaction processing, and compliance with UK charity regulations including Gift Aid.

## Development Commands

### Primary Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality
- `npm run convex:dev` - Start Convex backend in development mode
- `npm run convex:deploy` - Deploy Convex backend to production

### Development Workflow
1. Run `npm run convex:dev` in one terminal to start the backend
2. Run `npm run dev` in another terminal to start the frontend
3. The app will be available at http://localhost:3000

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15.5.4 with App Router, React 19.1.0, TypeScript
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Backend**: Convex for database, authentication, and serverless functions
- **Styling**: Tailwind CSS with custom ledger-inspired design system
- **Typography**: JetBrains Mono monospace font for ledger aesthetics
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Animation**: Framer Motion

### Design System
The application uses a distinctive ledger-inspired design with:
- **Colors**: Paper white (#FAFAF8), Ink black (#000000), Ledger gray (#E8E8E6)
- **Typography**: JetBrains Mono monospace font throughout
- **Components**: Custom ledger table components, fund cards, command bar
- **Theme**: Professional accounting aesthetic with modern UX

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles with Tailwind
│   ├── layout.tsx         # Root layout with font and providers
│   ├── page.tsx           # Homepage
│   └── providers/         # React context providers
├── components/
│   └── ui/                # shadcn/ui components
└── lib/                   # Utilities and configurations

convex/                    # Backend functions and schema
├── schema.ts              # Database schema definition
├── funds.ts               # Fund management functions
├── transactions.ts        # Transaction handling
├── churches.ts            # Church/organization management
└── donors.ts              # Donor management functions
```

## Database Schema

The Convex schema is designed around UK church financial requirements:

### Core Tables
- **churches**: Organization data with charity settings
- **funds**: Fund accounting (general, restricted, designated)
- **transactions**: Financial transactions with audit trail
- **donors**: Donor management with Gift Aid tracking
- **categories**: Transaction categorization system
- **users**: Authentication and role management

### Key Relationships
- Churches contain multiple funds and users
- Transactions belong to specific funds and optional donors
- Fund types enforce compliance (restricted vs general)
- All data is church-scoped for multi-tenancy

## Current Implementation Status

Based on plan.md, the project has completed:
- ✅ Foundation setup (Next.js, Tailwind, shadcn/ui, Convex)
- ✅ Database schema and backend functions
- ✅ Ledger-inspired design system
- ✅ Basic homepage and layout

Next priorities (Iteration 2):
- Fund dashboard UI with fund cards
- Fund CRUD operations
- Fund type support and balance calculations

## AI Integration

The application includes AI-powered features using:
- OpenAI GPT-3.5 for transaction categorization
- Claude Haiku for report generation
- Caching system to manage AI costs
- Rule-based preprocessing before AI calls

## Testing and Quality

- ESLint configured for code quality
- TypeScript strict mode enabled
- Always run linting before committing code
- Test AI features with appropriate cost controls

## Configuration Files

- `components.json`: shadcn/ui configuration (New York style)
- `tsconfig.json`: TypeScript configuration with path aliases
- `convex.json`: Convex backend configuration
- `.cursor/rules/convex_rules.mdc`: Convex development guidelines