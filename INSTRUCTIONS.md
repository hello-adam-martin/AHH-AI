# AHH-AI Development Instructions

## Project Overview

AI receptionist for Akaroa Holiday Homes handling pre-arrival communications and FAQs with safety guardrails and approval queue. Built with Node.js + TypeScript in a monorepo structure.

## Current Development Status

### ✅ Completed Features

#### 1. Project Foundation (Step 1)
- **Location**: Root directory + `packages/core/`
- **Status**: ✅ Complete
- **Description**: TypeScript monorepo setup with core domain types
- **Key Files**:
  - `package.json` - Workspace configuration
  - `tsconfig.json` - TypeScript configuration
  - `packages/core/src/types/` - All domain interfaces (Property, Booking, Communication, Approval)
  - `packages/core/src/schemas/` - Zod validation schemas
  - `packages/core/src/utils/` - Date formatting, guardrails, formatting utilities
  - `packages/core/src/constants/` - Business constants and thresholds

#### 2. Configuration System (Step 2)
- **Location**: `config/` + `packages/config/`
- **Status**: ✅ Complete
- **Description**: YAML-based configuration with type safety and caching
- **Key Files**:
  - `config/policies.yaml` - Business rules, escalation triggers, confidence thresholds
  - `config/faqs.yaml` - FAQ content with property-specific overrides
  - `config/prompts/system.txt` - AI system prompt
  - `config/prompts/tools.txt` - Tool usage guidelines
  - `packages/config/src/config-manager.ts` - Singleton configuration manager
  - `packages/config/src/loaders/yaml.ts` - YAML loading and validation

**Key Features**:
- Property-specific FAQ overrides (Driftwood Villa, Harbour View Cottage, French Quarter Apartment)
- Configurable confidence thresholds and escalation triggers
- Cached configuration loading (5-minute TTL)
- Type-safe validation with Zod schemas

#### 3. Airtable Integration (Step 3)
- **Location**: `packages/integrations/`
- **Status**: ✅ Complete
- **Description**: Comprehensive Airtable client with type-safe operations
- **Key Files**:
  - `packages/integrations/src/airtable/client.ts` - Base Airtable API client
  - `packages/integrations/src/airtable/service.ts` - Main service combining all clients
  - `packages/integrations/src/airtable/properties.ts` - Properties table operations
  - `packages/integrations/src/airtable/bookings.ts` - Bookings table operations  
  - `packages/integrations/src/airtable/communications.ts` - Communications logging
  - `packages/integrations/src/airtable/approvals.ts` - Approval queue management
  - `packages/integrations/src/airtable/config.ts` - Field mappings and configuration

**Key Features**:
- Full CRUD operations for all tables (Properties, Bookings, Communications, Approvals)
- Booking context retrieval with property details and communication history
- Identity verification against booking records
- Draft communication management with approval workflows
- Advanced search capabilities (by email, name, date ranges, property)
- Type-safe field mapping between TypeScript types and Airtable fields
- Comprehensive error handling and health checks

#### 4. OpenAI Integration (Step 4)
- **Location**: `packages/ai/`
- **Status**: ✅ Complete
- **Description**: OpenAI client with function calling and safety guardrails
- **Key Files**:
  - `packages/ai/src/client/openai.ts` - Main OpenAI client with function calling
  - `packages/ai/src/service.ts` - AIReceptionistService for email handling
  - `packages/ai/src/guardrails/safety.ts` - Multi-layered safety system
  - `packages/ai/src/tools/` - Function calling tool definitions

**Key Features**:
- GPT-4 Turbo integration with function calling
- Comprehensive safety guardrails with risk escalation (low → medium → high)
- Draft-first approval workflow for all responses
- Identity verification tools and booking context retrieval
- Emergency detection and escalation triggers
- Confidence scoring and approval queue integration

#### 5. API Server (Step 5)
- **Location**: `apps/api/`
- **Status**: ✅ Complete
- **Description**: Production-ready Express.js API server
- **Key Files**:
  - `apps/api/src/server.ts` - Main server implementation
  - `apps/api/src/routes/` - API route handlers (email, approval, health)
  - `apps/api/src/middleware/` - Auth, validation, error handling

**Key Features**:
- Email processing endpoints with AI integration
- Approval management system (list, approve, reject)
- Authentication via API key with rate limiting
- Request validation using Zod schemas
- Health checks and comprehensive error handling

### 📋 Planned Features

- Gmail Integration (`packages/integrations/gmail/`)
- Worker Service (`apps/worker/`)
- Email Outbound Integration
- Testing & Safety Validation
- Observability & Logging

## Development Setup

### Prerequisites

- Node.js 18+
- npm (workspaces support)
- Git

### Installation

```bash
# Clone and install
git clone <repo-url>
cd AHH-AI
npm install

# Build all packages
npm run build --workspaces
```

### Project Structure

```
/
├── README.md                    # Original project specification
├── INSTRUCTIONS.md             # This file - development guide
├── package.json                # Root workspace configuration
├── config/                     # Configuration files
│   ├── policies.yaml          # Business rules and policies
│   ├── faqs.yaml             # FAQ content + property overrides
│   └── prompts/              # AI prompt templates
├── packages/                  # Shared packages
│   ├── core/                 # Domain types and utilities
│   ├── config/               # Configuration management
│   ├── integrations/         # External service integrations (Airtable)
│   └── ai/                  # OpenAI integration and AI service
├── apps/                     # Applications
│   ├── api/                 # Express.js API server
│   └── worker/              # Background jobs (planned)
```

## Environment Setup

Create `.env` file based on `.env.example`:

```bash
cp .env.example .env
# Edit .env with your actual API keys
```

Required environment variables:
- `OPENAI_API_KEY` - OpenAI API key
- `AIRTABLE_API_KEY` - Airtable API key  
- `AIRTABLE_BASE_ID` - Your Airtable base ID
- `AIRTABLE_TABLE_PROPERTIES` - Properties table name (default: "Properties")
- `AIRTABLE_TABLE_BOOKINGS` - Bookings table name (default: "Bookings")  
- `AIRTABLE_TABLE_COMMS` - Communications table name (default: "Comms")
- `AIRTABLE_TABLE_APPROVALS` - Approvals table name (default: "Approvals")
- Gmail OAuth credentials
- Email service credentials (Resend or AWS SES)

## Testing Integrations

### Configuration System
```typescript
import { configManager } from './packages/config/dist';

// Load and test all configurations
const config = await configManager.loadConfiguration();

// Test FAQ system with property overrides
const faq = await configManager.getPropertyFAQ('driftwood_villa', 'wifi');

// Test policy checks
const isEmergency = await configManager.isEscalationKeyword('fire');
```

### Airtable Integration
```typescript
import { AirtableService } from './packages/integrations/dist';

const airtable = new AirtableService();

// Test connection
const isHealthy = await airtable.healthCheck();

// Get booking context
const contexts = await airtable.getBookingContext('guest@example.com');

// Verify guest identity
const verification = await airtable.verifyIdentity('booking123', {
  guest_name: 'John Smith',
  arrival_date: '2024-01-15'
});
```

## Development Commands

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean

# API Server commands
npm run api:dev      # Start API server in development mode
npm run api:build    # Build API server
npm run api:start    # Start built API server

# Individual package builds
cd packages/core && npm run build
cd packages/config && npm run build  
cd packages/integrations && npm run build
cd packages/ai && npm run build
cd apps/api && npm run build
```

## Configuration Details

### FAQ System

- **Default FAQs**: Defined in `config/faqs.yaml` under `defaults`
- **Property Overrides**: Specific answers per property in `per_property_overrides`
- **Supported Topics**: wifi, checkin, checkout, parking, heating, tv, directions, etc.
- **Resolution**: Property-specific answer → Default answer → null

### Policy System

- **Identity Verification**: Required for secure information (access codes, passwords)
- **Escalation Triggers**: Emergency keywords, low confidence, policy violations
- **Confidence Thresholds**: 
  - Auto-reply: 0.95
  - Approval required: 0.75
  - Escalate immediately: 0.5
- **Draft Mode**: All responses go to approval queue by default

## Git Workflow

```bash
# Feature development
git checkout -b feature/feature-name
# ... make changes ...
git add .
git commit -m "Add feature description"
git push origin feature/feature-name

# Main branch updates
git checkout main
git pull origin main
```

## Next Steps

1. **Gmail Integration** - Set up email polling and processing
2. **Worker Service** - Background job processing
3. **Testing** - Comprehensive test suite
4. **Email Outbound Integration** - Resend/AWS SES for sending emails
5. **Observability** - Logging, monitoring, and metrics
6. **Deployment** - Production setup and CI/CD

## Key Design Principles

- **Safety First**: All responses require approval by default
- **Type Safety**: Full TypeScript coverage with runtime validation
- **Modular Design**: Packages can be used independently
- **Configuration-Driven**: Business rules defined in YAML, not code
- **Fail-Safe**: When in doubt, escalate to human review
- **Property-Aware**: Support for property-specific customizations

## Support

- Check this file for current development status
- Review `README.md` for full project specification
- See individual package README files for specific implementation details