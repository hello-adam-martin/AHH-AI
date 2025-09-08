# Akaroa Holiday Homes — AI Receptionist (Phase 1)

AI receptionist/guest agent for handling **pre-arrival comms + FAQs** with guardrails and an approval queue.  
Built around **OpenAI**, **Airtable**, **Gmail** (inbound), and **Email/SMS** (outbound). Designed to expand later into cleaning ops, owner comms, and concierge upsells.

---

## Phase 1 Scope (MVP)

**What it does now**
- Answers **repetitive FAQs** (Wi-Fi, check-in/out, directions, amenities, rubbish, heating/TV help).
- Sends **pre-arrival messages** (arrival reminder, how to access property, parking, house rules).
- Collects **guest details** (ETA, number of guests, pets, special requests).
- **Escalates** non-routine or risky requests to an **Approval Queue** for human review.

**What it intentionally does *not* do yet**
- No refunds, policy overrides, discounts, or emergency handling.
- No lockbox/door codes until identity verified (ID + booking match).
- No autonomous SMS/phone calls unless enabled.

---

## Architecture

```
/ (repo root)
├─ apps/
│  ├─ api/                # FastAPI/Express entrypoint (webhooks + actions)
│  ├─ worker/             # Scheduled jobs (poll Gmail / digests)
│  └─ cli/                # Local utilities (seed FAQs, test prompts)
├─ packages/
│  ├─ core/               # Shared domain logic (policies, schemas, prompt templates)
│  ├─ integrations/       # Airtable, Gmail, Mail (Resend/SES), Twilio
│  └─ ai/                 # OpenAI client, tool definitions, response parsers, safety
├─ config/
│  ├─ faqs.yaml           # Canonical FAQ entries (per-property overrides supported)
│  ├─ policies.yaml       # House rules, cancellation, pets, ID verification steps
│  └─ prompts/            # System & tool prompts
├─ infra/
│  ├─ docker/             # Optional Dockerfiles
│  ├─ vercel/             # Optional serverless config
│  └─ terraform/          # Optional IaC
├─ tests/
│  ├─ e2e/                # End-to-end tests for flows
│  └─ unit/
└─ README.md
```

---

## Data Flow (Phase 1)

1. **Inbound**: Gmail → webhook or poll → `apps/api` parses the message.  
2. **Context Fetch**: `packages/integrations/airtable` loads property/booking data; `config/faqs.yaml` + `policies.yaml`.  
3. **Reasoning**: `packages/ai` runs an OpenAI model with **tools** (functions) enabled for:  
   - `get_booking_context`, `get_property_faq`, `create_draft_reply`, `enqueue_for_approval`, `send_email`.  
4. **Guardrails**:  
   - If PII/secure info needed (e.g., access codes), call `verify_identity()` → else escalate.  
   - If confidence < threshold or policy breach → Approval Queue.  
5. **Outbound**:  
   - **Draft mode (default)**: store draft reply in Approval Queue (Airtable “Comms” table) → email notification to you for one-click approve.  
   - **Auto mode (optional)**: send via Resend/SES; SMS via Twilio (disabled by default).  

---

## Integrations

- **OpenAI** (responses + function calling)  
- **Airtable** (bookings, properties, comms logs)  
- **Gmail** (inbound). Start with polling; upgrade to watch/push later.  
- **Email** (Resend or AWS SES)  
- **(Optional) Twilio** for SMS  

---

## Environment

Create `.env` (or use secrets manager). Example:

```
# OpenAI
OPENAI_API_KEY=...

# Airtable
AIRTABLE_API_KEY=...
AIRTABLE_BASE_ID=appXXXXXXXXXXXX
AIRTABLE_TABLE_BOOKINGS=Bookings
AIRTABLE_TABLE_PROPERTIES=Properties
AIRTABLE_TABLE_COMMS=Comms
AIRTABLE_TABLE_APPROVALS=Approvals

# Gmail
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GMAIL_INBOX=ahh-inbox@example.com

# Email Outbound (choose one)
RESEND_API_KEY=...
# or
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-2
SES_SENDER=hello@akaroaholidayhomes.nz

# Twilio (optional, disabled by default)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+64...
```

---

## Airtable Schema (Phase 1)

**Properties**
- `property_id` (pk)  
- `name`  
- `address`  
- `wifi_ssid`, `wifi_password`  
- `checkin_time`, `checkout_time`  
- `parking_instructions`  
- `access_instructions_public` (non-sensitive)  
- `access_instructions_secure` (sensitive; release only after verification)  
- `house_rules`  
- `faq_overrides` (JSON/YAML string, optional)  

**Bookings**
- `booking_id` (pk)  
- `channel` (Airbnb/Direct/Booking.com)  
- `guest_name`  
- `guest_email`  
- `guest_phone`  
- `property_id` (fk)  
- `arrival_date`, `departure_date`  
- `num_guests`, `pets`  
- `status` (confirmed/cancelled)  
- `notes` (special requests)  

**Comms**
- `comm_id`  
- `booking_id` (fk, optional)  
- `direction` (inbound/outbound)  
- `channel` (email/sms)  
- `subject`  
- `body`  
- `draft` (boolean)  
- `sent_at`  
- `approved_by`, `approved_at`  

**Approvals**
- `approval_id`  
- `type` (reply/verification/policy)  
- `payload` (JSON)  
- `status` (pending/approved/rejected)  
- `created_at`, `resolved_at`  
- `assignee`  

---

## Policies & FAQs

**`config/policies.yaml`**
```yaml
identity_verification:
  required_for: [ "access_instructions_secure" ]
  steps:
    - "Confirm full name + email match the booking record"
    - "Confirm arrival date + property name"
    - "If mismatch → escalate"
red_lines:
  - "Never share lockbox codes without verification"
  - "Never offer discounts or refunds"
  - "Do not confirm availability; direct to booking link"
escalation:
  triggers:
    - "Angry sentiment or 2+ negative cues"
    - "Refunds, discounts, policy override"
    - "Emergency keywords: 'locked out', 'gas', 'fire', 'water leak', 'medical'"
defaults:
  checkin_time: "3:00 PM"
  checkout_time: "10:00 AM"
```

**`config/faqs.yaml`**
```yaml
defaults:
  wifi: "Wi-Fi details are in the welcome booklet on the bench. If you can't find it, reply 'WIFI' and I’ll help."
  rubbish: "General rubbish: red bin; recycling: yellow bin. Collection day is Monday morning."
  heating: "Heat pump remote is on the coffee table. Mode: Heat, Fan: Auto. Close doors for fastest warm-up."
  tv: "Use HDMI 1 for streaming device; power cycle by holding the remote’s power for 5s."
  directions: "Your arrival guide includes a map link + parking tips. Need it re-sent?"
per_property_overrides:
  "driftwood_villa":
    wifi: "SSID: Driftwood_5G — Password: SEA-BREEZE-2024"
    parking: "Driveway fits 2 cars; please don’t block neighbour’s access."
```

---

## Prompts (Phase 1)

**System Prompt (`config/prompts/system.txt`)**
```
You are the AI Receptionist for Akaroa Holiday Homes. Be concise, friendly, and practical.
Follow house policies strictly. Never reveal secure info unless identity is verified against Airtable.
If uncertain or confidence < 0.75, call enqueue_for_approval and propose a safe draft.
Prefer bullet points. Include useful next steps or links to the booking site when asked about availability.
```

**Tool Hints (`config/prompts/tools.txt`)**
```
- get_booking_context(email|name|phone?, arrival_date?): returns matching booking(s)
- get_property_faq(property_id, topic): returns FAQs (with per-property overrides)
- verify_identity(booking_id, answers): returns {verified: bool, reason?}
- create_draft_reply(thread_id, text): stores draft in Airtable Comms
- enqueue_for_approval(type, payload): pushes to Approvals
- send_email(to, subject, html_text, in_reply_to?): sends email (disabled in draft mode)
```

---

## OpenAI Model & Tools (function calling)

**Example (TypeScript skeleton)**
```ts
// packages/ai/index.ts
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handleInboundEmail(payload: InboundEmail) {
  const tools = [
    { name: "get_booking_context", /* ...schema... */ },
    { name: "get_property_faq", /* ... */ },
    { name: "verify_identity", /* ... */ },
    { name: "create_draft_reply", /* ... */ },
    { name: "enqueue_for_approval", /* ... */ },
    { name: "send_email", /* ... */ }, // keep disabled in Phase 1
  ];

  const messages = [
    { role: "system", content: loadSystemPrompt() },
    { role: "user", content: emailToConversationText(payload) },
  ];

  return await runWithTools(client, { messages, tools, guardrails: policyChecks });
}
```

---

## Message Templates (outbound examples)

**Pre-arrival reminder (draft)**  
_Subject_: Your stay at {{property_name}} — arrival details  
_Body_:  
- Check-in is from **{{checkin_time}}**.  
- Directions & parking: {{directions_link}}  
- House rules highlights: no smoking, quiet hours 10pm-7am.  
- Reply with your **ETA** and if you need a **cot/high chair**.  
- If you haven’t received your arrival guide, reply “GUIDE”.

**FAQ — Wi-Fi (safe)**  
“If you can’t find the booklet on the bench, reply ‘WIFI’ and I’ll share the details after I confirm your booking.”

---

## Approval Queue (default on)

- Every reply the agent composes is stored as a **draft** in Airtable `Comms` + a record in `Approvals` with:
  - Proposed reply  
  - Detected topics (wifi, checkin, etc.)  
  - Risk flags (policy, identity, sentiment)  
  - One-click links: **Approve** / **Edit** / **Reject**  
- On **Approve**, the system sends the email and marks `Comms.draft = false`.  

---

## Local Development

**Requirements**
- Node 18+ (or Python 3.11+ if you prefer FastAPI — structure is language-agnostic)  
- pnpm / npm / yarn  

**Install & Run**
```bash
pnpm install
pnpm -w run dev:api     # apps/api on http://localhost:8787
pnpm -w run dev:worker  # optional: polling/scheduled jobs
pnpm -w run seed:faqs   # load config/faqs.yaml & policies into Airtable overrides if desired
```

**Testing**
```bash
pnpm test
pnpm test:e2e
```

---

## Minimal API Endpoints

- `POST /webhooks/gmail` – receive inbound email events (or use a poller in `apps/worker`)  
- `POST /approvals/:id/approve` – approve a draft reply  
- `POST /approvals/:id/reject` – reject (and optionally replace with manual reply)  
- `GET /healthz` – health check  

---

## Security & PII

- Never store **secure access info** in logs.  
- Secure fields in Airtable should be encrypted at rest.  
- All outbound mails are **idempotent** (guard against double-send).  
- Rate limiting on inbound webhooks.  
- Strict JSON schemas on tool inputs/outputs.  

---

## Rollout Checklist (Phase 1)

- [ ] Connect Airtable base and seed sample `Properties`, `Bookings`.  
- [ ] Populate `config/faqs.yaml`, `config/policies.yaml`.  
- [ ] Enable Gmail: start with **polling** every 2–5 min.  
- [ ] Draft-only mode ON. Validate Approval Queue UX.  
- [ ] Test identity verification flow with real sample bookings.  
- [ ] Ship to a small subset of properties.  
- [ ] Document “take-over” procedure (you can reply manually at any time).  

---

## Observability

- Structured logs (JSON) with correlation IDs per thread.  
- Metrics:  
  - Draft vs. approved percentages  
  - Avg. response latency  
  - Escalation rate  
  - Top FAQ topics  
- Weekly digest emailed to you.  

---

## Roadmap (later phases)

- Phase 2: Cleaning ops hooks (notify cleaners, ETA changes, issue triage).  
- Phase 3: Concierge & upsells (late checkout offers, activities, multi-language).  
- Phase 4: Phone (Twilio), smart routing, and near-full autonomy.  

---

## License
Private / © Akaroa Holiday Homes (adjust as you wish).
