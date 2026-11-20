# IRONHUB --- Design and Technical Implementation Guide

**Document type:** UI/UX, visual system, architecture, and
implementation blueprint\
**Version:** 1.0\
**Design direction:** Premium dark fitness-tech dashboard\
**Brand character:** Strong, disciplined, modern, confident, focused

------------------------------------------------------------------------

## 1. Design objective

Build a polished gym management web application inspired by the IRONHUB
concept: deep charcoal surfaces, restrained red accents, strong athletic
imagery, compact data cards, clean charts, and clear operational
actions.

The reference concept is a visual direction, not a pixel-perfect
specification. The finished product must be more legible and more
consistent than a static mockup. Prioritize real workflows, accessible
contrast, responsive behavior, and reliable data over decorative
effects.

### Experience principles

1.  **Operational clarity:** Staff should immediately understand what
    needs attention.
2.  **Fast actions:** Scanning a member, finding a profile, and
    recording a payment should take as few steps as possible.
3.  **Visual consistency:** Reuse spacing, typography, components,
    status treatments, and interaction patterns.
4.  **Progressive disclosure:** Show the most important information
    first; put advanced details in tabs, drawers, or detail pages.
5.  **Honest data:** Every metric and chart must have a clear definition
    and source.
6.  **Responsive by design:** Desktop is the primary admin environment,
    but check-in must work especially well on tablets and phones.

## 2. Recommended technology stack

### Recommended stack for a production-ready web application

  -----------------------------------------------------------------------
  Layer                   Recommendation          Reason
  ----------------------- ----------------------- -----------------------
  Frontend                Next.js (App Router) +  Mature React framework,
                          React + TypeScript      routing, server
                                                  rendering options,
                                                  strong ecosystem

  Styling                 Tailwind CSS            Fast, consistent
                                                  responsive styling

  Components              shadcn/ui + Radix UI    Accessible foundations
                                                  that can be customized
                                                  to the IRONHUB brand

  Icons                   Lucide React            Consistent, clean line
                                                  icons

  Charts                  Recharts                React-friendly charts
                                                  for dashboards and
                                                  reports

  Forms                   React Hook Form + Zod   Reliable form state and
                                                  validation

  Tables                  TanStack Table          Sorting, filtering,
                                                  pagination, column
                                                  visibility

  Backend                 Next.js Route Handlers  Avoids unnecessary
                          / Server Actions for a  service complexity for
                          modular monolith        a single-gym MVP

  Database                PostgreSQL              Reliable relational
                                                  data and transaction
                                                  support

  ORM                     Prisma                  Typed database access
                                                  and schema migrations

  Authentication          Auth.js or a reputable  Secure staff
                          managed auth provider   authentication and
                                                  session handling

  QR generation           `qrcode` package        Generate QR images on
                                                  the server

  QR scanning             `@zxing/browser` or     Browser camera
                          `html5-qrcode`          scanning; test
                                                  device/browser
                                                  compatibility

  File storage            S3-compatible object    Member photos, gym
                          storage                 logo, receipt
                                                  attachments

  Email                   Resend or equivalent    Optional expiry and
                          transactional email     account notifications
                          provider                

  Testing                 Vitest + React Testing  Unit, component, and
                          Library + Playwright    end-to-end coverage

  Deployment              Vercel for app +        Straightforward
                          managed PostgreSQL      deployment and managed
                                                  infrastructure

  Monitoring              Sentry or equivalent    Frontend and backend
                                                  error visibility
  -----------------------------------------------------------------------

**Why this stack:** It provides a modern TypeScript-first workflow
without splitting a relatively focused product into separate frontend
and backend services too early. A modular monolith is easier to build,
deploy, test, and maintain for the first release.

### Alternative if the project needs a separate backend

Use Next.js for the frontend and NestJS for a dedicated API, with
PostgreSQL and Prisma. Choose this only if the system requires multiple
clients, complex integrations, independent backend deployment, or a
larger engineering team. Do not introduce a separate API service just
because it sounds more advanced.

### Avoid for the initial build

-   Microservices for a single-gym MVP.
-   Multiple state-management libraries.
-   A complex event-streaming system.
-   A custom charting engine.
-   Overly elaborate animation frameworks.
-   Storing critical business data in browser local storage.

## 3. Application architecture

Recommended modular structure:

-   Presentation layer: pages, layouts, components, form states.
-   Application layer: use cases such as RegisterMember,
    GenerateCredential, CheckInMember, RecordPayment.
-   Domain layer: membership validity, payment rules, attendance rules,
    permissions.
-   Data layer: Prisma repositories, database transactions, storage
    adapters.
-   Integration layer: QR scanner library, email provider, payment
    provider when needed.

### Request flow

1.  User interacts with a page.
2.  Client validates basic input for immediate feedback.
3.  Server authenticates the session and checks authorization.
4.  Server validates input again using a shared schema.
5.  Application service applies business rules.
6.  Database operation runs, using a transaction when multiple records
    must change together.
7.  Server returns a typed result.
8.  UI updates and displays success, validation, or error feedback.

Never rely on hidden buttons or client-side role checks as security.
Every protected server action and API route must independently enforce
authorization.

### Suggested project structure

``` text
ironhub/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── forgot-password/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── members/
│   │   ├── check-in/
│   │   ├── plans-payments/
│   │   ├── classes/
│   │   ├── reports/
│   │   └── settings/
│   └── api/
├── components/
│   ├── layout/
│   ├── navigation/
│   ├── dashboard/
│   ├── members/
│   ├── check-in/
│   ├── payments/
│   ├── classes/
│   ├── reports/
│   └── ui/
├── features/
│   ├── auth/
│   ├── members/
│   ├── memberships/
│   ├── qr/
│   ├── attendance/
│   ├── payments/
│   ├── classes/
│   ├── reports/
│   └── settings/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── permissions/
│   ├── validation/
│   ├── formatting/
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
└── public/
```

Keep feature-specific business logic close to its feature. Shared
utilities should be genuinely shared, not a dumping ground.

## 4. Visual design system

### Brand direction

-   Base: near-black and charcoal.
-   Primary accent: strong IRONHUB red.
-   Secondary accents: blue for information, green for success, amber
    for warning, purple only for a distinct data category.
-   Imagery: use high-quality, dark, high-contrast gym photography
    sparingly.
-   Avoid using a different accent color for every card; red should
    remain the recognizable brand accent.

### Suggested color tokens

  Token               Suggested value   Usage
  ------------------- ----------------- ---------------------------------------
  `background`        `#090A0D`         App background
  `surface-1`         `#111318`         Sidebar and main cards
  `surface-2`         `#171A21`         Raised panels
  `surface-3`         `#20242D`         Hover and selected surfaces
  `border`            `#292E38`         Subtle dividers
  `text-primary`      `#F5F6F8`         Main content
  `text-secondary`    `#A4AAB5`         Supporting text
  `text-muted`        `#747C89`         Metadata
  `brand-red`         `#E32935`         Primary actions and active navigation
  `brand-red-hover`   `#F13A46`         Hover state
  `success`           `#2BCB83`         Approved, active, paid
  `warning`           `#F2B84B`         Expiring, pending
  `danger`            `#F05252`         Expired, failed, destructive
  `info`              `#4B91F1`         Informational data

Treat these as starting tokens. Check text and control contrast before
finalizing. Never communicate status using color alone; pair color with
text and/or an icon.

### Typography

Recommended: Inter, Geist Sans, or another highly legible modern
sans-serif.

-   Page title: 28--32 px, semibold or bold.
-   Section heading: 18--20 px, semibold.
-   Card label: 12--13 px, medium.
-   KPI value: 26--32 px, bold with tabular numerals.
-   Body: 14--16 px.
-   Table content: 13--14 px.
-   Helper text: 12--13 px.

Use a consistent type scale and avoid excessive all-caps labels. Numbers
should use tabular numerals so values do not jump visually.

### Layout and spacing

-   Desktop sidebar: approximately 240--260 px expanded; 72--80 px
    collapsed.
-   Top bar: approximately 64--72 px.
-   Main content max width: approximately 1440 px, with fluid behavior.
-   Page padding: 24--32 px desktop; 16--20 px tablet; 12--16 px mobile.
-   Card radius: 12--16 px.
-   Inputs and buttons: 40--44 px high minimum.
-   Use an 8 px spacing rhythm, with 4 px for fine adjustments.

### Surfaces and effects

-   Use subtle borders rather than heavy shadows on every card.
-   Reserve glow for a focused scanner state or one important visual
    accent.
-   Use gradients sparingly, mainly for hero artwork or a small
    highlighted KPI.
-   Do not put a large gym photo behind dense text or data.
-   Ensure tables and charts remain readable without decorative
    backgrounds.

## 5. Shared application shell

### Sidebar

-   IRONHUB logo and small "Fitness Management" descriptor.
-   Dashboard, Members, Check-In, Plans & Payments, Classes, Reports,
    Settings.
-   Active item uses a red-tinted surface, a clear left marker or icon
    treatment, and readable text.
-   Collapse control on desktop.
-   On mobile, use a drawer opened by a menu button.
-   Optional bottom promotional/brand panel should not compete with
    navigation or consume too much space.

### Top bar

-   Global search.
-   Notification button with unread count.
-   User avatar, name, role, and account menu.
-   Optional breadcrumb on nested pages.
-   Avoid showing a decorative clock unless the gym specifically needs a
    live operational clock.

### Page header

Each page should consistently contain: - Page title. - One-line
explanation. - Primary action aligned to the right on desktop. -
Relevant filters below or beside the title. - Breadcrumbs for deeper
pages.

## 6. Section-by-section UI and interaction specification

### 6.1 Dashboard

**Layout** - Welcome header with date and gym status. - KPI row: Total
Members, Active Members, Check-ins Today, Revenue Today. - Main chart
row: Membership/attendance trend and plan distribution. - Lower row:
Recent check-ins, upcoming classes, alerts, quick actions.

**Recommended charts** - Membership activity: line chart with New
Members and Renewals. - Check-in activity: bar chart by day. - Plan mix:
donut chart with direct labels or a clear legend. - Revenue trend:
compact line chart or bar chart.

**Chart behavior** - Provide a period selector and display the selected
period in the chart title or subtitle. - Tooltips show exact values and
dates. - Use grid lines lightly. - Include accessible text summaries or
tables for important chart information. - Do not animate charts
continuously.

**Motion** - KPI values can count up once when first loaded, but respect
reduced-motion preferences. - Charts animate once on first render with a
short duration. - Cards may fade/translate in subtly with a small
stagger. - No bouncing, pulsing, or endless decorative animation.

### 6.2 Members

**Layout** - Title and Add Member action. - KPI strip for Total, Active,
Expired, Suspended. - Search field, status filters, plan filter, and
date filters. - Data table with profile, member ID, plan, status,
expiry, and row actions.

**Member detail** - Profile header and status. - Tabs: Overview,
Memberships, Payments, Attendance, Activity. - Summary cards for current
plan, next expiry, and visits this month. - QR credential panel with
Generate, Download, Revoke, Regenerate actions.

**Interactions** - Add/Edit opens a well-structured page or wide
modal. - Destructive actions require confirmation. - Row menu should not
be the only way to discover important actions. - Keep filters in the URL
where practical so a filtered list can be bookmarked or shared
internally.

### 6.3 Check-In

**Layout** - Large scanner panel centered in the content area. - Camera
selection if multiple cameras are available. - Clear instructions and
camera permission state. - Manual member search fallback beside or below
the scanner. - Recent check-ins list.

**Scan states** - Idle: show a scan frame and "Start scanning" action. -
Requesting permission: show clear progress. - Scanning: restrained frame
corners and a subtle scan line. - Success: green status, member name,
plan, and time. - Rejected: red/amber status and reason. - Camera
unavailable: explain and offer manual search. - Network error: show
retry; do not imply a check-in succeeded.

**Motion** - Scanner line may move only while actively scanning. -
Success check animation should be brief. - Stop camera tracks when
leaving the page or closing the scanner. - Do not autoplay camera access
on page load.

### 6.4 QR Generator

**Layout** - Member selector/search. - Selected member summary. - QR
preview in a high-contrast white card so the code scans reliably. -
Generate/Regenerate and Download/Print actions. - Credential status and
created date.

**Important visual rule** The QR itself should be black on white with a
quiet clear margin. Do not apply red gradients, rounded modules, logos
over the code, or decorative effects that reduce scan reliability.

**Interactions** - Generate only after selecting a member. - Confirm
regeneration because it revokes the previous credential. - Provide a
print-friendly view. - Show a success toast only after the server
confirms generation.

### 6.5 Plans & Payments

Use tabs: Membership Plans, Payment History, Transactions (if required).

**Plans** - Plan cards or a compact table. - Name, duration, price,
included benefits, status. - Add/Edit Plan form in a modal or dedicated
page. - Mark one plan as Popular only if the client wants to promote it;
avoid decorative badges by default.

**Payments** - Summary cards: Collected in selected period, Pending,
Refunded. - Search and filters by member, date, method, status. - Table
with transaction ID, member, date, amount, method, status, and action. -
Record Payment action opens a focused form.

**Payment form** - Member and relevant membership. - Amount and payment
date. - Method and optional reference. - Clear review of what is being
paid. - Confirmation before final posting.

**Motion** - Small transitions between tabs and modal open/close. -
Avoid animating currency values in a way that could imply a changing
financial balance.

### 6.6 Classes

**Layout** - Title and Create Class action. - List/Week/Month view
toggle. - Date navigation and trainer/status filters. - Calendar or
schedule list. - Class cards show time, title, trainer, capacity, and
status.

**Class detail** - Session overview. - Enrolled roster. - Capacity
indicator. - Attendance action. - Edit/Cancel controls.

**Motion** - Smooth but restrained calendar view transitions. -
Drag-and-drop scheduling is not required for MVP; if added later,
provide keyboard-accessible alternatives.

### 6.7 Reports

**Layout** - Report title and date range selector. - KPI summary row. -
Main chart area with revenue and attendance trends. - Secondary charts
for plan mix, membership growth, and class utilization. - Detailed data
table below charts. - Export CSV action.

**Graph selection** - Line: trend over time. - Bar: comparison by day,
week, plan, or payment method. - Donut: small number of plan categories
only. - Horizontal bar: ranked categories or class utilization. - Avoid
3D charts, excessive gradients, dual axes without clear need, and pie
charts with too many slices.

**Motion** - Chart transitions should be short and only happen when data
changes. - Tooltips should appear quickly and remain readable. - Export
should show a clear loading and completion state.

### 6.8 Settings

**Layout** - Settings navigation or tabs: Gym Profile, Business Hours,
Staff & Roles, Notifications, Payments, Security, Appearance. - Each
section uses clear labels, helper text, and grouped form fields. - Save
action should be easy to find and disabled when nothing has changed.

**Interactions** - Confirm sensitive actions such as disabling a staff
account or changing permissions. - Show unsaved-changes warning when
leaving a modified form. - Provide success/error feedback after
saving. - Do not expose secrets or API keys in ordinary text fields.

## 7. Graphs and data visualization rules

Use Recharts for the first release. Build reusable chart wrappers with
shared typography, tooltip, axis, legend, loading, and empty-state
styles.

### Dashboard graph recommendations

  -----------------------------------------------------------------------
  Graph             Type              Data              Main question
                                                        answered
  ----------------- ----------------- ----------------- -----------------
  Membership        Line              New members and   Is membership
  activity                            renewals by       growing?
                                      day/week/month    

  Check-in trend    Bar               Successful        When is the gym
                                      check-ins over    busiest?
                                      time              

  Plan distribution Donut             Active            Which plans are
                                      memberships by    most common?
                                      plan              

  Revenue trend     Area/line or bar  Paid revenue over How is collected
                                      time              revenue changing?

  Class utilization Horizontal bar    Attendees versus  Which classes
                                      capacity          fill up?
  -----------------------------------------------------------------------

### Data visualization rules

-   Use the same color for the same metric throughout the product.
-   Include units and date ranges.
-   Avoid misleading truncated axes.
-   Use direct labels where the chart would otherwise be hard to
    interpret.
-   Do not rely on color alone; use legends, labels, and patterns where
    appropriate.
-   Do not plot sample data in production.
-   Define metrics centrally so the dashboard and reports agree.

### Suggested metric definitions

-   **Total members:** all non-archived member profiles.
-   **Active members:** members with at least one valid membership and
    no active suspension.
-   **Check-ins today:** successful attendance events within the gym's
    local calendar day.
-   **Revenue collected:** successful posted payments in the selected
    period, less refunds according to the agreed reporting definition.
-   **New members:** profiles created during the selected period;
    distinguish from new memberships.
-   **Renewals:** membership periods created as renewals, not simply all
    new membership records.
-   **Retention:** define the cohort and observation window before
    displaying a percentage.

Do not display a metric until its business definition has been agreed
with the client.

## 8. Motion and animation system

Use CSS transitions for most interface motion. Add Framer Motion only if
complex layout transitions or coordinated interactions justify the
dependency.

### Timing guidance

  Interaction                        Duration
  ----------------------- -------------------
  Hover/focus feedback            120--160 ms
  Button press                     80--120 ms
  Dropdown/popover                140--180 ms
  Modal/drawer                    180--240 ms
  Page content entrance           180--260 ms
  Chart entrance            300--500 ms, once
  Success feedback                180--240 ms

### Appropriate motion

-   Subtle hover lift or border tint on interactive cards.
-   Sidebar collapse/expand.
-   Modal and drawer transitions.
-   Table row hover.
-   Short chart entrance.
-   QR scan line while camera scanning is active.
-   Success confirmation after server acknowledgement.

### Avoid

-   Constant background movement.
-   Large parallax effects behind data.
-   Repeated glowing or pulsing KPI cards.
-   Long page transitions.
-   Animations that delay access to controls.
-   Motion that ignores `prefers-reduced-motion`.

## 9. Responsive behavior

### Desktop (approximately 1200 px and wider)

-   Full sidebar.
-   KPI cards in a four-column grid when space permits.
-   Charts in two-column layouts.
-   Full data tables.

### Tablet (approximately 768--1199 px)

-   Collapsible sidebar or compact navigation.
-   KPI cards in two columns.
-   Charts stack when labels become cramped.
-   Tables allow horizontal scrolling only as a fallback; prioritize
    essential columns.

### Mobile (below approximately 768 px)

-   Sidebar becomes a drawer.
-   One-column cards.
-   Search and filters become compact panels or sheets.
-   Tables transform into readable member/payment cards when
    appropriate.
-   Check-In and QR workflows receive priority.
-   Large touch targets and persistent primary actions where useful.

Test real viewport widths, not just a browser resized once. Include
portrait tablet camera scanning tests.

## 10. Accessibility and usability

-   Aim for WCAG 2.2 AA where practical.
-   Use semantic headings, labels, buttons, and table markup.
-   Ensure full keyboard navigation and visible focus.
-   Provide accessible names for icon-only buttons.
-   Maintain sufficient contrast.
-   Do not communicate success, failure, or membership state with color
    alone.
-   Provide text alternatives for charts.
-   Respect reduced motion.
-   Make validation messages specific and associated with fields.
-   Ensure camera scanning always has a manual fallback.

## 11. Security and reliability implementation

### Authentication and authorization

-   Use a trusted authentication solution.
-   Hash passwords with a modern password-hashing algorithm through the
    chosen auth provider/library.
-   Protect routes and enforce permissions on the server.
-   Use secure, HTTP-only cookies where applicable.
-   Apply session expiry and logout behavior.
-   Protect sensitive operations with re-authentication where
    appropriate.

### QR credential design

-   Generate high-entropy random tokens on the server.
-   Store a hash of the token, not a raw reusable secret, where the
    implementation permits.
-   QR payload should contain only an opaque credential reference/token.
-   Validate token, revocation, member suspension, and membership
    validity server-side.
-   Rate-limit invalid attempts.
-   Use HTTPS and avoid logging raw QR tokens.
-   Regeneration revokes the previous credential.

### Data integrity

-   Use database transactions when creating a membership and posting its
    payment.
-   Add unique constraints for member IDs and QR token hashes.
-   Add indexes for common search and report filters.
-   Use decimal/numeric database types for money, never floating-point
    values.
-   Store timestamps consistently and display them in the gym's
    configured time zone.
-   Use soft deletion or archival for members and plans with historical
    references.

### Privacy

-   Collect only information the gym needs.
-   Restrict access to personal and financial data.
-   Avoid exposing member details in QR codes, URLs, or client logs.
-   Establish backup, retention, and incident response practices.
-   Review Philippine Data Privacy Act obligations with the client or
    their adviser.

## 12. Database design outline

Suggested core tables:

-   `users`
-   `roles`
-   `permissions` or role-permission mapping
-   `members`
-   `membership_plans`
-   `memberships`
-   `qr_credentials`
-   `attendance_records`
-   `payments`
-   `classes`
-   `class_enrollments`
-   `class_attendance`
-   `notifications`
-   `audit_logs`
-   `gym_settings`

Use foreign keys and database constraints. Define status enums
carefully. Keep a historical snapshot of plan name/price or an
equivalent immutable reference for purchased memberships so later plan
edits do not rewrite history.

## 13. API and server action boundaries

Example operations (names are conceptual, not fixed routes):

-   `createMember`
-   `updateMember`
-   `archiveMember`
-   `getMemberDetails`
-   `createMembershipPlan`
-   `assignMembership`
-   `renewMembership`
-   `recordPayment`
-   `refundPayment`
-   `generateQrCredential`
-   `revokeQrCredential`
-   `validateQrCredential`
-   `recordCheckIn`
-   `createClass`
-   `updateClass`
-   `recordClassAttendance`
-   `getDashboardMetrics`
-   `getReportData`

For every operation: - Authenticate the user. - Authorize the role. -
Validate input. - Apply domain rules. - Return a typed success/error
response. - Log sensitive actions. - Avoid returning unnecessary
personal data.

## 14. Testing strategy

### Unit tests

-   Membership validity and expiry.
-   Suspension rules.
-   QR token validation and revocation.
-   Duplicate check-in prevention.
-   Revenue and refund calculations.
-   Class capacity rules.
-   Permission checks.

### Integration tests

-   Register member and assign plan.
-   Record payment and create membership transactionally.
-   Generate QR and validate it.
-   Revoke QR and confirm rejection.
-   Record successful and rejected check-ins.
-   Filter reports by date range.

### End-to-end tests

-   Staff login.
-   Add member.
-   Generate and print QR.
-   Scan a valid QR.
-   Attempt expired/suspended member check-in.
-   Record a payment.
-   Renew a membership.
-   Create and cancel a class.
-   Export a report.
-   Verify staff cannot access owner-only settings.

### Manual QA

-   Test camera permission denial.
-   Test poor network behavior.
-   Test double-clicks and repeated submissions.
-   Test mobile/tablet layouts.
-   Test keyboard navigation and reduced motion.
-   Test daylight-saving/time-zone assumptions if the product expands
    internationally.

## 15. Development sequence

### Phase 1 --- Discovery and foundations

-   Confirm business rules with the gym owner.
-   Map key workflows.
-   Finalize navigation and wireframes.
-   Create design tokens and shared components.
-   Set up repository, environments, database, authentication, and
    deployment pipeline.

### Phase 2 --- Core data and members

-   Build database schema and migrations.
-   Implement users, roles, members, plans, and memberships.
-   Build member list, form, profile, and search.
-   Add audit logging.

### Phase 3 --- QR and attendance

-   Implement credential generation and revocation.
-   Build camera scanning and manual fallback.
-   Implement server-side validation and duplicate prevention.
-   Test on the actual devices used at the gym.

### Phase 4 --- Payments and classes

-   Implement payment recording, history, receipts, and renewal flow.
-   Implement class schedule, roster, capacity, and attendance if
    included in MVP.

### Phase 5 --- Dashboard and reports

-   Implement centrally defined metrics.
-   Build charts and filters.
-   Reconcile report totals with database records.
-   Add CSV export.

### Phase 6 --- Hardening and launch

-   Complete permission review.
-   Run security and end-to-end tests.
-   Test backup and restore.
-   Seed only clearly marked demo data in staging.
-   Train staff and provide a short operational guide.
-   Deploy production and monitor errors.

## 16. Definition of done

A page is not complete just because it resembles the mockup. It is
complete when: - It matches the shared design system. - It works at
supported screen sizes. - All visible actions work. - Loading, empty,
validation, success, and error states exist. - Permissions are enforced
on the server. - Data comes from the database, not hard-coded
placeholders. - Core behavior has automated tests. - Keyboard and
reduced-motion behavior have been checked. - It has been reviewed
against the client's real workflow.

## 17. Final design and engineering direction

IRONHUB should feel like a premium piece of gym software, not a generic
admin template with a fitness photo added. Keep the brand bold, but make
the interface calm enough for staff to use all day. Red is the signature
accent; data colors should be consistent and restrained. Use charts to
answer real business questions, animations to clarify state changes, and
strong architecture to protect the accuracy of membership, attendance,
and payment records.

**Build the operational foundation first. Polish the experience
continuously. Add complexity only when the gym's real workflow requires
it.**
