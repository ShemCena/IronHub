# IRONHUB --- Product Requirements Document

**Product:** IRONHUB Gym Management System\
**Document type:** Product requirements and functional specification\
**Version:** 1.0\
**Status:** Initial product blueprint\
**Primary users:** Gym owner, gym administrators, front-desk staff,
trainers (optional limited role)

------------------------------------------------------------------------

## 1. Product overview

IRONHUB is a web-based gym management platform that helps a gym run its
daily operations from one central workspace. It brings member records,
membership plans, payments, QR-based check-in, class scheduling,
reporting, and gym configuration together in a single system.

The product should feel like a premium fitness brand: a near-black
interface, strong typography, restrained red accents, clear data
visualization, and fast workflows. The design must remain practical and
readable; visual effects should never slow down common tasks such as
checking a member in or confirming a payment.

### Product vision

Give gym owners and staff a clear, reliable view of the gym while making
routine administrative work faster and less error-prone.

### Core value

-   One source of truth for members, memberships, attendance, and
    payments.
-   Faster member check-in through QR scanning.
-   Easier membership and payment tracking.
-   Clear visibility into revenue, attendance, retention, and class
    activity.
-   A consistent, branded experience that works on desktop, tablet, and
    mobile.

## 2. Goals and non-goals

### Goals

1.  Centralize day-to-day gym administration.
2.  Allow staff to create, search, update, suspend, and archive member
    records.
3.  Generate a unique QR credential for each member and validate it at
    check-in.
4.  Record attendance with clear success and failure feedback.
5.  Manage membership plans, renewals, payment records, and outstanding
    balances.
6.  Schedule classes and manage capacity and attendance.
7.  Present actionable business reports with date filters and export
    options.
8.  Provide role-based access and an audit trail for sensitive actions.
9.  Make the interface responsive and accessible.

### Non-goals for the first release

-   Full accounting, payroll, tax filing, or inventory management.
-   Native iOS/Android applications.
-   Biometric identification or facial recognition.
-   Hardware turnstile integrations unless the client specifically
    requires them.
-   Automated bank transfers or payment gateway settlement
    reconciliation.
-   Public social feeds, workout programming, nutrition coaching, or
    member community features.
-   AI coaching or AI-generated workout plans.

These may be considered later, but they should not distract from the
core gym-management workflow.

## 3. Users and roles

  -----------------------------------------------------------------------
  Role                    Primary                 Access
                          responsibilities        
  ----------------------- ----------------------- -----------------------
  Owner                   Oversees the business,  Full access
                          users, financial        
                          summaries, plans,       
                          settings                

  Admin                   Manages members,        Operational access;
                          attendance, plans,      financial permissions
                          payments, classes,      configurable
                          reports                 

  Front-desk staff        Registers members,      Limited operational
                          checks members in,      access
                          views membership        
                          status, records         
                          permitted payments      

  Trainer (optional)      Views assigned classes  Limited class access
                          and rosters; marks      
                          class attendance        
  -----------------------------------------------------------------------

The gym may begin with Owner and Admin only. The role model should
support additional roles without redesigning the application.

### Permission principles

-   Only authorized roles may view revenue and financial reports.
-   Only authorized roles may create or modify plans and payment
    records.
-   Staff should not be able to delete financial transactions.
-   Sensitive changes should be logged with actor, timestamp, action,
    and affected record.
-   Prefer archive/deactivate over hard deletion for business records.

## 4. Information architecture

Primary sidebar navigation:

1.  Dashboard
2.  Members
3.  Check-In
4.  Plans & Payments
5.  Classes
6.  Reports
7.  Settings

The QR Generator should be available from the Members detail page and
from a quick action on the dashboard. It can also have a dedicated tab
within Check-In if the client wants a separate route. Avoid adding too
many top-level navigation items.

Global shell:

-   Left sidebar with IRONHUB brand mark and navigation.
-   Top bar with global search, notifications, and account menu.
-   Main content area with page title, short description, primary
    action, and page content.
-   Optional right-side quick panel on the dashboard.
-   Consistent page-level filters and action placement.

## 5. Functional requirements by section

### 5.1 Dashboard

**Purpose:** Give the owner or staff a useful operational snapshot
immediately after login.

**Key content** - Welcome header and current date/time. - Gym status
indicator (Open / Closed) based on configured business hours, not a
manually assumed state. - KPI cards: - Total members - Active members -
Check-ins today - Revenue today or selected period - Expiring
memberships (optional card or alert) - Membership overview chart: new
memberships and renewals over time. - Membership plan distribution
chart. - Recent check-ins or recent activity list. - Upcoming classes. -
Quick actions: Add Member, Scan QR, Generate QR, Add Payment, Create
Plan.

**Interactions** - Clicking a KPI opens the relevant filtered page. -
Chart period can be changed (7 days, 30 days, 90 days, custom range). -
Recent activity links to the relevant member, payment, or class
record. - Empty states explain what data is missing and provide a
relevant action.

**Acceptance criteria** - All metrics are calculated from stored records
and use a clearly defined date range. - Dashboard cards show loading,
empty, and error states. - The page does not show hard-coded sample
values in production. - Staff only see cards and actions allowed by
their permissions.

### 5.2 Members

**Purpose:** Maintain accurate member profiles and membership status.

**Member data** - Member ID (system-generated, unique, human-readable if
desired) - First and last name - Profile photo (optional) - Email and
phone - Date of birth (only if operationally necessary) - Emergency
contact (optional) - Address (optional; collect only if needed) -
Registration date - Member status: Active, Expired, Suspended,
Archived - Current membership plan and validity dates - QR credential
status - Notes (restricted to authorized staff)

**Member list** - Search by name, member ID, email, or phone. - Filter
by status, plan, registration date, and expiry date. - Sort by name,
newest, expiry, and recent activity. - Pagination or virtualized list
for large member counts. - Row actions: View, Edit, Generate/Regenerate
QR, Suspend, Archive.

**Member detail page** - Profile summary and current status. -
Membership history. - Payment history and outstanding balance. -
Attendance history. - QR credential and download/print action. - Staff
notes and audit history where permitted.

**Add/edit flow** - Validate required fields and duplicate email/phone
according to gym policy. - Show field-level validation. - Allow a member
to be registered before a plan is assigned only if the business process
supports it. - Confirm destructive or status-changing actions.

**Acceptance criteria** - Search and filters work together. - A member's
status is derived consistently from membership validity and manual
suspension rules. - Archiving a member does not erase attendance or
payment history. - QR credentials can be revoked and replaced.

### 5.3 Check-In

**Purpose:** Verify membership access and record attendance quickly.

**Primary workflow** 1. Staff opens Check-In. 2. Browser requests camera
permission after the staff initiates scanning. 3. Staff scans a member's
QR code. 4. The server validates the credential and member's access
status. 5. The UI displays a clear result: - Approved: member name,
photo (if available), plan, and check-in time. - Denied: concise reason
such as expired membership, suspended account, invalid/revoked QR, or
duplicate check-in. 6. Successful check-in is recorded in attendance
history.

**Manual fallback** - Search by member name or member ID. - Staff
selects the correct member and confirms check-in. - Manual check-in must
be recorded as such in the audit log.

**Rules** - Do not trust member status or QR payload from the browser;
validate on the server. - Prevent accidental duplicate check-ins within
a configurable interval. - Define whether multiple entries per day are
allowed. - Record timestamp, member, staff user, method (QR/manual), and
optional device identifier. - Camera denial or unsupported browser must
not block manual check-in.

**Acceptance criteria** - A valid active member is checked in and
receives immediate confirmation. - Expired, suspended, invalid, and
revoked credentials are rejected with understandable messages. - Failed
scans do not create attendance records. - Staff can complete a manual
fallback. - The scan view is usable on a tablet and mobile device.

### 5.4 QR Generator

**Purpose:** Issue and manage a unique QR credential for each member.

**Generation** - Generate a cryptographically random opaque token on the
server. - Store only a secure hash of the token where practical. -
Encode a token or signed short-lived credential reference, not personal
information. - Associate the credential with one member. - Support
revoke and regenerate. - Provide a printable/downloadable member QR
card.

**Security** - Do not encode name, email, phone, membership status, or
other personal data directly in the QR. - Validate token status and
membership status on the server at scan time. - Rate-limit repeated
invalid scans. - Use HTTPS. - Log credential creation, revocation, and
regeneration. - If QR cards are lost, staff must be able to revoke the
old credential.

**Acceptance criteria** - Each member has at most one active QR
credential unless the gym explicitly supports multiple devices. - A
revoked QR no longer grants access. - Regeneration invalidates the
previous credential. - The QR card is printable and readable at common
phone-screen sizes.

### 5.5 Plans & Payments

**Purpose:** Define membership products and track money collected and
due.

**Membership plan fields** - Plan name - Description - Price - Duration
(days, weeks, or months) - Access rules or included benefits - Status:
Active / Inactive - Optional enrollment fee, renewal price, or
introductory offer

**Plan management** - Create, edit, activate, deactivate. - Prevent
deletion when referenced by historical memberships. - Clearly identify
the plan assigned to a member. - Allow price changes without rewriting
historical transactions.

**Payment recording** - Member - Related membership or invoice -
Amount - Payment date - Payment method (cash, card, e-wallet, bank
transfer, other) - Reference number (optional) - Status: Paid, Pending,
Failed, Refunded, Voided - Recorded by - Notes/receipt attachment
(optional)

**Payment history** - Search and filter by date, member, method, and
status. - View transaction details and print/download a receipt. -
Record partial payments only if the gym's policy supports them. -
Refunds and voids should be separate audited actions, not silent edits.

**Renewal workflow** - Select member and plan. - Review price and
validity dates. - Record payment. - Create the new membership period. -
Update member's access status based on the resulting valid membership.

**Important business rule** A payment record and a membership record are
related but not interchangeable. A payment alone must not automatically
grant access unless the membership transaction has been successfully
created.

**Acceptance criteria** - Historical prices and payment records remain
unchanged after a plan's price is edited. - Every payment is linked to a
member and, where applicable, a membership. - Totals exclude voided
transactions and treat refunds consistently. - Financial actions are
permission-controlled and audited.

### 5.6 Classes

**Purpose:** Schedule group sessions and manage capacity and attendance.

**Class fields** - Class name and description - Trainer/instructor -
Date and start/end time - Studio/location - Capacity - Status:
Scheduled, Ongoing, Completed, Cancelled - Optional recurring schedule

**Class list and calendar** - Views: List, week calendar, month
calendar. - Filters by date, trainer, status, and class type. - Show
remaining seats and capacity. - Highlight cancelled or full classes
without relying on color alone.

**Class detail** - Session information. - Enrolled member roster. -
Attendance marking. - Waitlist (optional future enhancement). - Staff
notes.

**Rules** - Prevent enrollment above capacity unless an authorized
override is made. - Prevent overlapping schedules for the same trainer
or room where configured. - Store actual attendance separately from
enrollment. - Preserve completed class history.

**Acceptance criteria** - Staff can create, edit, cancel, and view
classes. - Capacity is enforced on the server. - Attendance can be
marked and reviewed. - Time zones and date display are consistent with
the gym's configured locale.

### 5.7 Reports

**Purpose:** Turn operational records into useful business insights.

**Report categories** - Revenue: gross collected, refunds, net
collected, payment method breakdown. - Membership: active, new, expired,
suspended, renewals, plan distribution. - Attendance: daily check-ins,
peak days/times, average visits per active member. - Retention: renewals
and membership continuation, with the calculation clearly defined. -
Classes: scheduled sessions, attendance, utilization/capacity.

**Controls** - Date range presets and custom range. - Filters by plan,
payment method, class, or status where relevant. - Export CSV; PDF
export can be a later enhancement. - Clearly label whether values are
gross, net, paid, pending, or refunded.

**Charts** - Revenue trend: line or bar chart. - Check-in volume: bar
chart by day/time. - Plan distribution: donut chart with labels and
legend. - Membership growth: stacked bar or line chart. - Class
utilization: horizontal bars.

**Acceptance criteria** - Report totals reconcile with the underlying
payment and attendance records. - Every chart has a title, time range,
units, and accessible tooltip/legend. - Empty and no-data states are
handled. - Exported data respects the active filters and the user's
permissions.

### 5.8 Settings

**Purpose:** Configure the gym and the application safely.

**Settings groups** - Gym profile: name, logo, address, contact
details. - Business hours: opening and closing hours by day. - Account:
profile, password change, active sessions. - Staff and roles: invite,
deactivate, assign roles and permissions. - Notifications: membership
expiry reminders, payment alerts, operational alerts. - Payments:
supported payment methods and receipt details. - Integrations: future
payment gateway or access-control integrations. - Appearance: logo and
limited brand settings; maintain the IRONHUB design system. - Security:
session policy, password policy, audit log access.

**Acceptance criteria** - Only authorized roles can change sensitive
settings. - Changes are validated and confirmed. - Staff deactivation
prevents future login but preserves historical activity. - Important
configuration changes are audited.

## 6. Cross-cutting requirements

### Search and notifications

-   Global search should return only records the current user is
    permitted to see.
-   Notifications should link to the relevant record.
-   Avoid excessive notifications; allow users to configure non-critical
    alerts.

### Audit log

Track important events such as: - Member created, edited, suspended,
archived. - QR generated, revoked, regenerated. - Check-in approved or
rejected. - Plan created or changed. - Payment recorded, refunded, or
voided. - Class changed or cancelled. - Staff role or permission
changed.

### Data handling and privacy

-   Collect only the personal data the gym needs.
-   Restrict member information by role.
-   Use HTTPS in production and secure password hashing.
-   Provide backup and recovery procedures.
-   Define retention and deletion policies with the client.
-   Follow applicable Philippine privacy requirements, including the
    Data Privacy Act of 2012 and relevant National Privacy Commission
    guidance. Obtain appropriate legal review for the gym's actual
    practices.

## 7. Key data entities

  -----------------------------------------------------------------------
  Entity                  Purpose                 Important relationships
  ----------------------- ----------------------- -----------------------
  User                    Staff login and         Has a role; creates
                          identity                operational records

  Role / Permission       Access control          Assigned to users

  Member                  Gym customer profile    Has memberships, QR
                                                  credentials,
                                                  attendance, payments

  MembershipPlan          Reusable plan           Referenced by
                          definition              memberships

  Membership              A member's purchased    Belongs to member and
                          validity period         plan

  QRCredential            Member access           Belongs to member
                          credential              

  Attendance              Check-in event          Belongs to member and
                                                  optionally class

  Payment                 Financial transaction   Belongs to member and
                                                  may reference
                                                  membership

  Class                   Scheduled group session Has trainer and
                                                  enrollments

  ClassEnrollment         Member's reservation in Links member and class
                          a class                 

  ClassAttendance         Actual attendance at a  Links member and class
                          class                   

  Notification            System message          Recipient user/member
                                                  depending on use

  AuditLog                History of sensitive    References actor and
                          actions                 affected record
  -----------------------------------------------------------------------

Avoid storing derived values such as "active member count" as manually
editable fields. Calculate them from authoritative records or use
carefully maintained aggregates.

## 8. Suggested business rules

1.  A member is eligible for QR check-in only when the member is not
    suspended and has a valid membership according to the gym's policy.
2.  Membership start and end date inclusivity must be defined and
    tested.
3.  Expiration should be calculated using the gym's local time zone.
4.  A QR token is a credential, not proof of payment.
5.  Regenerating a QR credential revokes the prior credential.
6.  Attendance must retain who recorded it and how it was recorded.
7.  Financial records should be immutable after posting; corrections use
    refund, void, or adjustment workflows.
8.  Deactivated plans remain available in historical membership records.
9.  Class capacity must be enforced server-side.
10. All monetary amounts must use a consistent currency and decimal
    representation; display Philippine peso formatting if the gym
    operates in the Philippines.

## 9. Non-functional requirements

  -----------------------------------------------------------------------
  Area                                Requirement
  ----------------------------------- -----------------------------------
  Usability                           Common actions should be
                                      discoverable and require minimal
                                      steps

  Performance                         Typical dashboard and list views
                                      should feel responsive; use
                                      pagination and indexed queries

  Reliability                         Failed network requests must not
                                      silently create duplicate payments
                                      or check-ins

  Security                            Role-based authorization, secure
                                      sessions, validation, rate
                                      limiting, audit logging

  Accessibility                       Keyboard support, visible focus,
                                      sufficient contrast, labels,
                                      non-color status cues

  Responsiveness                      Desktop-first admin layout with
                                      usable tablet and mobile
                                      adaptations

  Maintainability                     Modular code, documented API
                                      contracts, migrations, automated
                                      tests

  Data integrity                      Database constraints and
                                      transactions for membership/payment
                                      workflows

  Observability                       Structured logs and error
                                      monitoring without exposing
                                      sensitive member data
  -----------------------------------------------------------------------

## 10. MVP scope and release plan

### MVP --- launch essentials

-   Authentication and Owner/Admin roles.
-   Dashboard with accurate core KPIs.
-   Member CRUD, search, filters, member details.
-   Membership plans.
-   Membership assignment and renewal.
-   Payment recording and history.
-   QR generation, revocation, and scanning.
-   Attendance log and manual check-in fallback.
-   Basic reports for revenue, membership, and attendance.
-   Gym profile and business hours.
-   Audit logging for sensitive operations.

### Release 1.1

-   Class scheduling, capacity, roster, and attendance.
-   More detailed reports and CSV exports.
-   Staff management and granular permissions.
-   Expiry reminders and notification preferences.

### Later enhancements

-   Payment gateway integration.
-   Member self-service portal.
-   Automated recurring billing.
-   Turnstile/access-control hardware.
-   Multi-branch support.
-   Trainer scheduling and class waitlists.

Do not build later enhancements until the client confirms the need and
the MVP workflows are stable.

## 11. Success metrics

-   Average time to complete a QR check-in.
-   Percentage of check-ins completed without manual intervention.
-   Number of duplicate or incorrectly recorded check-ins.
-   Time required to register a member.
-   Payment reconciliation discrepancies.
-   Membership expiry and renewal tracking accuracy.
-   Staff adoption and frequency of use.
-   Dashboard load time and error rate.

## 12. Open decisions for client confirmation

Before implementation, confirm: - Is the gym single-branch or
multi-branch? - Can members check in multiple times per day? - What
counts as an active membership and when does access expire? - Are
payments recorded manually, or must an online payment gateway be
integrated? - Are classes included in membership plans or paid
separately? - Do members need to book classes, or will staff manage
rosters? - Which staff roles are required at launch? - Should members
receive QR cards, use their phone, or both? - What are the gym's
business hours, currency, and receipt requirements? - What reports does
the owner actually use to make decisions?

------------------------------------------------------------------------

**Product principle:** IRONHUB should make the gym easier to operate,
not turn a small gym into a complicated enterprise system. Prioritize
accuracy, speed, clarity, and trust.
