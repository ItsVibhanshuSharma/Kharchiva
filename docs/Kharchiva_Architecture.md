# **Kharchiva — System Design Document**

**Version:** 1.1  
**Product:** Kharchiva  
**Architecture:** Modular Monolith \+ Offline-First  
**Mobile:** React Native \+ TypeScript  
**Backend:** Node.js \+ NestJS  
**Database:** MongoDB Atlas  
**Local Database:** SQLite  
**Cache / Queue:** Redis \+ BullMQ  
**Object Storage:** Cloudflare R2  
**Email:** Resend  
**Push Notifications:** FCM \+ APNs  
**Cloud Hosting:** TBD

---

# **1\. System Overview**

Kharchiva is an India-first personal expense management application focused on making expense recording extremely fast and simple.

Core philosophy:

> **Record your money in seconds. Understand your money over time.**

The system is designed around:

* Fast expense entry  
* Offline-first operation  
* Reliable financial data  
* Background synchronization  
* Modular backend architecture  
* Secure authentication  
* Scalable reporting  
* Background jobs  
* Object storage for user files  
* Transactional email  
* Future AI/automation capabilities

---

# **2\. High-Level Architecture**

                        ┌─────────────────────┐  
                         │    React Native     │  
                         │   TypeScript App    │  
                         └──────────┬──────────┘  
                                    │  
                           HTTPS / REST API  
                                    │  
                                    ▼  
                    ┌────────────────────────────┐  
                    │       NestJS Backend       │  
                    │      Modular Monolith      │  
                    │                            │  
                    │ Auth                       │  
                    │ Users                      │  
                    │ Expenses                   │  
                    │ Income                     │  
                    │ Categories                 │  
                    │ Payment Sources            │  
                    │ Budgets                    │  
                    │ Recurring Expenses         │  
                    │ Reports                    │  
                    │ Sync                       │  
                    │ Files                      │  
                    │ Notifications              │  
                    │ Email                      │  
                    │ Jobs                       │  
                    └───────┬─────────┬──────────┘  
                            │         │  
              ┌─────────────┘         └──────────────┐  
              ▼                                      ▼  
    ┌───────────────────┐                    ┌──────────────────┐  
    │   MongoDB Atlas   │                    │ Redis \+ BullMQ   │  
    │                   │                    │                  │  
    │ Source of Truth   │                    │ Background Jobs  │  
    │ Financial Data    │                    │ Retry / Queue    │  
    └───────────────────┘                    └────────┬─────────┘  
                                                      │  
                            ┌─────────────────────────┼──────────────┐  
                            ▼                         ▼              ▼  
                   ┌────────────────┐        ┌─────────────┐  ┌────────────┐  
                   │ Cloudflare R2  │        │   Resend    │  │ FCM / APNs │  
                   │ Images/Files   │        │   Email     │  │   Push     │  
                   └────────────────┘        └─────────────┘  └────────────┘

---

# **3\. Architecture Pattern**

## **Modular Monolith**

Kharchiva will use a **Modular Monolith**, not microservices.

The backend will be one deployable NestJS application, internally divided into independent business modules.

NestJS Application  
│  
├── Auth Module  
├── Users Module  
├── Expenses Module  
├── Income Module  
├── Categories Module  
├── Payment Sources Module  
├── Budgets Module  
├── Recurring Expenses Module  
├── Reports Module  
├── Sync Module  
├── Files Module  
├── Notifications Module  
├── Email Module  
└── Jobs Module

### **Why**

This provides:

* Faster initial development  
* Easier debugging  
* Simpler deployment  
* Shared TypeScript types  
* Lower operational complexity  
* Clear module boundaries  
* Ability to scale horizontally later

The system should avoid premature microservices.

---

# **4\. Mobile Architecture**

## **Technology**

React Native  
TypeScript  
SQLite  
REST API

Recommended internal structure:

src/  
│  
├── app/  
├── navigation/  
├── screens/  
├── components/  
├── features/  
│   ├── auth/  
│   ├── expenses/  
│   ├── income/  
│   ├── budgets/  
│   ├── reports/  
│   └── profile/  
│  
├── database/  
├── api/  
├── sync/  
├── storage/  
├── notifications/  
├── hooks/  
├── utils/  
└── types/

Feature-based organization should be preferred over putting all screens, hooks and services into large global folders.

---

# **5\. Offline-First Architecture**

Offline-first is a core architectural requirement.

            User  
              │  
              ▼  
       React Native App  
              │  
              ▼  
          SQLite  
              │  
       Immediate UI Update  
              │  
              ▼  
       Sync Queue / Worker  
              │  
              │ Internet Available  
              ▼  
         NestJS API  
              │  
              ▼  
        MongoDB Atlas

## **Expense Creation**

When the user records an expense:

User enters ₹850  
      ↓  
Create local expense  
      ↓  
Save to SQLite  
      ↓  
UI updates immediately  
      ↓  
Mark syncStatus \= PENDING  
      ↓  
Background sync  
      ↓  
NestJS API  
      ↓  
MongoDB Atlas  
      ↓  
Server confirms  
      ↓  
Local record becomes SYNCED

The user should not have to wait for the network before seeing the expense.

---

# **6\. Local SQLite Database**

SQLite acts as the mobile application's local operational database.

It stores:

* Expenses  
* Income  
* Categories  
* Payment sources  
* Budgets  
* Recurring expense metadata  
* Sync queue  
* User/session-related local state

MongoDB remains the cloud source of truth.

Redis is **not** a source of truth.

---

# **7\. Synchronization Architecture**

Every offline-created record should contain a client-generated UUID.

Example:

clientId:  
550e8400-e29b-41d4-a716-446655440000

This allows the backend to recognize retries and prevent duplicate records.

## **Sync Flow**

SQLite  
  │  
  ├── PENDING  
  │  
  ▼  
Sync Engine  
  │  
  ▼  
POST /sync  
  │  
  ▼  
NestJS  
  │  
  ├── Validate  
  ├── Authenticate  
  ├── Check clientId  
  ├── Apply operation  
  └── Return server version  
  │  
  ▼  
MongoDB  
  │  
  ▼  
Sync Response  
  │  
  ▼  
SQLite  
  │  
  └── SYNCED

---

# **8\. Idempotency**

Financial operations must be idempotent.

For example, the mobile app may send:

Create expense  
clientId \= abc-123  
amount \= ₹850

If the network fails after the server processes the request, the app may retry.

The backend must recognize:

clientId \= abc-123

and avoid creating a second expense.

This is critical for:

* Expenses  
* Income  
* Recurring expense generation  
* Sync operations  
* Background jobs  
* Email operations where applicable

---

# **9\. Backend Architecture**

## **NestJS Modular Monolith**

src/  
│  
├── modules/  
│   ├── auth/  
│   ├── users/  
│   ├── expenses/  
│   ├── income/  
│   ├── categories/  
│   ├── payment-sources/  
│   ├── budgets/  
│   ├── recurring-expenses/  
│   ├── reports/  
│   ├── sync/  
│   ├── files/  
│   ├── notifications/  
│   ├── email/  
│   └── jobs/  
│  
├── common/  
│   ├── guards/  
│   ├── interceptors/  
│   ├── filters/  
│   ├── decorators/  
│   ├── pipes/  
│   └── utils/  
│  
├── config/  
└── main.ts

Each module should own its:

* Controller  
* Service  
* DTO  
* Validation  
* Database access  
* Business rules

Cross-module communication should happen through well-defined services/interfaces rather than directly manipulating another module's data.

---

# **10\. Core Backend Modules**

## **Auth Module**

Responsibilities:

* Phone OTP authentication  
* Google Sign-In  
* Token management  
* Session management  
* Authentication guards  
* Account linking

Flow:

Phone / Google  
      ↓  
Auth Module  
      ↓  
Verify identity  
      ↓  
Find/Create User  
      ↓  
Issue session/token  
      ↓  
Mobile App

---

## **Users Module**

Responsibilities:

* User profile  
* Preferences  
* Currency  
* Timezone  
* Onboarding status  
* Notification preferences

---

## **Expenses Module**

Responsibilities:

* Create expense  
* Quick expense  
* Manual expense  
* Update expense  
* Delete expense  
* Expense history  
* Expense validation  
* Expense ownership

Expense sources:

MANUAL  
QUICK  
RECURRING  
VOICE  
RECEIPT

VOICE and RECEIPT are future capabilities but the architecture supports them.

---

## **Income Module**

Responsibilities:

* Add income  
* Edit income  
* Delete income  
* Income history  
* Monthly income calculations

---

## **Categories Module**

Responsibilities:

* System categories  
* User-created categories  
* Category management  
* Category ordering

System categories belong to the application.

Custom categories belong to a user.

---

## **Payment Sources Module**

Examples:

Cash  
UPI  
Credit Card  
Debit Card  
Bank Transfer  
Other

These are labels for tracking how money was spent.

They are **not bank integrations**.

---

## **Budgets Module**

Responsibilities:

* Create budget  
* Update budget  
* Delete budget  
* Category budgets  
* Monthly budgets  
* Budget progress

Budget spending should be calculated from actual expenses.

The system should not maintain a mutable `spentAmount` as the financial source of truth.

---

## **Recurring Expenses Module**

Examples:

Rent  
Netflix  
Internet  
Insurance  
EMI  
Subscriptions

The recurring expense defines the schedule.

A generated expense references the recurring record.

Example:

Recurring Expense  
       │  
       ▼  
Occurrence: 2026-10-01  
       │  
       ▼  
Expense  
source \= RECURRING  
recurringExpenseId \= ...  
recurringOccurrenceDate \= ...

A unique occurrence rule prevents duplicate generation.

---

# **11\. Reports Module**

Reports should initially use MongoDB aggregation pipelines.

Examples:

Monthly spending  
Category spending  
Payment source spending  
Income vs expense  
Budget utilization  
Daily spending  
Monthly comparison

Reports should focus on understanding behavior rather than only displaying charts.

Future:

Personalized Insights  
Money Story  
AI Analytics  
Natural Language Reports

---

# **12\. Files Module**

The Files Module abstracts object storage.

Business modules should **not directly call Cloudflare R2**.

Architecture:

Expense / Receipt / Profile  
          │  
          ▼  
      FilesService  
          │  
          ▼  
     StorageService  
          │  
          ▼  
    Cloudflare R2

This keeps the application storage-provider independent.

---

# **13\. Cloudflare R2**

Cloudflare R2 is the selected object storage provider.

Use cases:

* Receipt images  
* Profile images  
* Future OCR source files  
* Export files  
* Other user-uploaded assets

MongoDB stores metadata/reference information.

MongoDB should not store large image binaries.

Example:

{  
  "fileId": "ObjectId",  
  "userId": "ObjectId",  
  "storageKey": "users/{userId}/receipts/{fileId}.jpg",  
  "provider": "CLOUDFLARE\_R2",  
  "mimeType": "image/jpeg",  
  "sizeBytes": 245678,  
  "createdAt": "Date"  
}

Recommended object structure:

users/  
  {userId}/  
    profile/  
    receipts/  
    exports/

---

# **14\. Email Architecture**

Email provider:

**Resend**

Official provider:  
Resend

The backend should use an abstraction:

Business Module  
      │  
      ▼  
   EmailService  
      │  
      ▼  
 Email Provider  
      │  
      ▼  
    Resend

Business modules should never directly depend on the Resend SDK.

---

# **15\. Email Module**

Potential email types:

Welcome Email  
Email Verification  
Security / Account Email  
Account Deletion Confirmation  
Export Ready  
Google Sheets Status  
Monthly Summary

Email templates should be separated from business logic.

Recommended structure:

email/  
├── email.module.ts  
├── email.service.ts  
├── providers/  
│   └── resend.provider.ts  
└── templates/  
    ├── welcome/  
    ├── verification/  
    ├── security/  
    └── export-ready/

React Email can be used for reusable email templates.

---

# **16\. Redis**

Redis is used for:

* Background job queues  
* Temporary OTP/session-related data where appropriate  
* Rate limiting where required  
* Short-lived cache  
* Distributed coordination

Redis must **not** be treated as permanent financial storage.

---

# **17\. BullMQ**

BullMQ runs background jobs through Redis.

Architecture:

NestJS API  
     │  
     ▼  
BullMQ Queue  
     │  
     ▼  
Redis  
     │  
     ▼  
Worker

Workers may run as a separate process while remaining part of the same repository/codebase.

---

# **18\. Background Jobs**

Background jobs should be part of the system from the beginning.

Initial jobs:

Recurring Expense Generation  
Push Notifications  
Smart Reminder Processing  
Sync Retry  
Email Delivery  
Export Generation  
File Processing

Future:

Google Sheets Sync  
Receipt OCR  
AI Processing  
Monthly Insights  
Personalized Recommendations

Jobs should support:

* Retry  
* Exponential backoff  
* Failure handling  
* Idempotency  
* Logging  
* Dead-letter/failure handling

Critical user operations should not wait for background jobs.

---

# **19\. Notifications**

Push notification infrastructure:

NestJS  
   ↓  
NotificationService  
   ↓  
FCM / APNs  
   ↓  
Mobile Device

Potential notifications:

Expense reminder  
Recurring expense reminder  
Budget threshold  
Monthly summary  
Catch-up reminder  
Goal reminder

Notifications should be smart and limited to avoid becoming spam.

---

# **20\. MongoDB Atlas**

MongoDB Atlas is the cloud database.

It is the primary persistent source of truth.

Main collections:

users  
expenses  
incomes  
categories  
payment\_sources  
budgets  
recurring\_expenses

Future collections:

goals  
receipts  
families  
family\_members  
splits  
insights  
subscriptions

---

# **21\. Financial Data Rules**

Money must be stored as integer paise.

Example:

₹850  
amountPaise \= 85000

₹850.50  
amountPaise \= 85050

Do not use floating-point values for financial amounts.

Currency:

INR

The initial product is India-first and INR-only.

---

# **22\. Date & Time Strategy**

MongoDB stores dates in UTC.

User profile stores timezone.

Example:

timezone \= Asia/Kolkata

Financial reporting uses:

expenseDate

not:

createdAt

This distinction is important for offline-created expenses and backdated entries.

---

# **23\. Data Ownership**

Every user-owned financial record contains:

userId

Example:

expenses.userId  
incomes.userId  
budgets.userId  
payment\_sources.userId

Every API must validate ownership.

A user must never be able to access another user's data by modifying an ID in the request.

---

# **24\. Soft Delete**

Financial records should generally use soft deletion.

Example:

{  
  "deletedAt": "Date"  
}

Instead of immediately physically deleting the document.

Default queries should exclude:

deletedAt \!= null

This provides additional protection against accidental data loss and supports synchronization.

---

# **25\. Versioning & Conflict Handling**

Records should contain:

version

Example:

{  
  "version": 3  
}

The version can be used for optimistic concurrency and synchronization.

Potential conflict flow:

Client Version: 3  
Server Version: 4  
       ↓  
Conflict detected  
       ↓  
Resolve according to entity rules  
       ↓  
Return latest server state

Financial records should prioritize data integrity over silently overwriting changes.

---

# **26\. API Architecture**

API style:

REST  
HTTPS  
JSON

Example:

POST   /api/v1/auth/phone/request  
POST   /api/v1/auth/phone/verify

GET    /api/v1/me

GET    /api/v1/expenses  
POST   /api/v1/expenses  
GET    /api/v1/expenses/:id  
PATCH  /api/v1/expenses/:id  
DELETE /api/v1/expenses/:id

GET    /api/v1/reports/monthly  
GET    /api/v1/reports/categories

POST   /api/v1/sync

API versioning should start with:

/api/v1

---

# **27\. API Security**

Security layers:

HTTPS  
   ↓  
Authentication  
   ↓  
Authorization  
   ↓  
DTO Validation  
   ↓  
Business Rules  
   ↓  
Database

Important controls:

* JWT/session validation  
* Ownership checks  
* Request validation  
* Rate limiting  
* OTP abuse protection  
* Secure token storage  
* Input sanitization  
* Secure HTTP headers  
* Audit logging for sensitive operations

---

# **28\. Authentication**

Supported methods:

Phone Number \+ OTP  
Google Sign-In

Both authentication methods map to the same internal user identity.

Example:

Google Account  
       │  
       └──────┐  
              ▼  
           User  
              ▲  
       ┌──────┘  
       │  
Phone Number

This allows account linking instead of creating duplicate users.

---

# **29\. Quick Expense Architecture**

Quick Expense is one of the most important product flows.

Open Quick Expense  
       ↓  
Enter Amount  
       ↓  
Select Category  
       ↓  
Save  
       ↓  
SQLite  
       ↓  
UI closes immediately  
       ↓  
Background Sync

Required:

Amount  
Category

Optional:

Note  
Payment Source  
Date  
Personal / Business

The architecture should optimize this path for minimum latency.

---

# **30\. Recurring Expense Job**

Example:

Rent  
₹15,000  
Every month  
1st day

BullMQ scheduler:

Scheduler  
   ↓  
Check recurring expenses  
   ↓  
Find due occurrence  
   ↓  
Generate expense  
   ↓  
Check idempotency  
   ↓  
Save MongoDB record  
   ↓  
Send notification if required

The unique occurrence identifier prevents duplicate expenses.

---

# **31\. Search & Pagination**

Large lists should never be returned as one response.

Use pagination.

Example:

GET /api/v1/expenses?page=1\&limit=20

For large datasets, cursor-based pagination can be introduced.

Filters:

date  
category  
payment source  
amount  
search text

---

# **32\. Database Indexing**

Important indexes include:

{ userId: 1, expenseDate: \-1 }

{ userId: 1, categoryId: 1, expenseDate: \-1 }

{ userId: 1, paymentSourceId: 1, expenseDate: \-1 }

{ userId: 1, createdAt: \-1 }

{ userId: 1, clientId: 1 }

Indexes should be added based on actual query patterns and monitored as data grows.

---

# **33\. Caching Strategy**

Do not aggressively cache financial data.

Primary source:

MongoDB

Local source for offline UX:

SQLite

Redis cache should be reserved for suitable short-lived data such as:

rate limiting  
temporary values  
job state  
frequently accessed non-critical data

Financial correctness takes priority over cache performance.

---

# **34\. Error Handling**

Standard API response structure:

{  
  "success": false,  
  "error": {  
    "code": "EXPENSE\_NOT\_FOUND",  
    "message": "Expense not found"  
  }  
}

Errors should have stable machine-readable codes.

Examples:

UNAUTHORIZED  
FORBIDDEN  
VALIDATION\_ERROR  
EXPENSE\_NOT\_FOUND  
CATEGORY\_NOT\_FOUND  
SYNC\_CONFLICT  
DUPLICATE\_OPERATION  
RATE\_LIMITED  
INTERNAL\_ERROR

---

# **35\. Logging & Monitoring**

Backend logs should capture:

Request ID  
User ID  
Endpoint  
Response status  
Execution time  
Error code  
Job ID  
Worker status

Sensitive information must not be logged.

Never log:

OTP  
passwords  
access tokens  
refresh tokens  
sensitive financial payloads unnecessarily

---

# **36\. Observability**

System monitoring should eventually cover:

API latency  
API error rate  
Database performance  
Queue depth  
Failed jobs  
Sync failures  
Email failures  
Storage failures  
Authentication failures

Critical alerts should be configured for production.

---

# **37\. Environments**

Three environments:

Development  
Staging  
Production

Each environment should have separate:

MongoDB database  
Redis  
R2 bucket/path  
Resend configuration  
API credentials  
FCM/APNs configuration

Production credentials must never be committed to source control.

---

# **38\. Configuration Management**

Environment variables:

NODE\_ENV

MONGODB\_URI

REDIS\_URL

R2\_ACCOUNT\_ID  
R2\_ACCESS\_KEY\_ID  
R2\_SECRET\_ACCESS\_KEY  
R2\_BUCKET\_NAME

RESEND\_API\_KEY  
RESEND\_FROM\_EMAIL

JWT\_SECRET

GOOGLE\_CLIENT\_ID

FCM credentials  
APNs credentials

Secrets should be managed through the selected cloud/platform secret-management system.

---

# **39\. Cloudflare R2 Security**

R2 credentials must remain server-side.

The mobile application should never receive:

R2\_SECRET\_ACCESS\_KEY  
R2\_ACCESS\_KEY\_ID

For uploads, the backend can generate controlled upload access/presigned operations where appropriate.

The mobile application should upload only to authorized storage locations.

---

# **40\. Email Security**

Resend credentials remain server-side.

Email sending should happen through:

NestJS  
  ↓  
EmailService  
  ↓  
BullMQ  
  ↓  
Resend

The application should configure domain authentication and appropriate email security records before production sending.

---

# **41\. CI/CD**

Pipeline:

Git Push  
   ↓  
CI  
   ├── Install  
   ├── TypeScript Check  
   ├── Lint  
   ├── Unit Tests  
   ├── Integration Tests  
   └── Build  
          ↓  
       Staging  
          ↓  
        QA  
          ↓  
     Production

Production deployment should require successful CI checks.

---

# **42\. Scaling Strategy**

Initial architecture:

1 NestJS application  
1 Worker process  
MongoDB Atlas  
Redis  
Cloudflare R2  
Resend

As traffic increases:

