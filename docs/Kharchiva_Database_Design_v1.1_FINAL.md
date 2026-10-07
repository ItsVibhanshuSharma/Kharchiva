# **Kharchiva — Database Design Document**

**Version:** 1.1  
**Database:** MongoDB Atlas  
**Database Type:** NoSQL Document Database  
**Primary Identifier:** MongoDB ObjectId  
**Client Identifier:** UUID  
**Currency:** INR  
**Architecture:** Offline-First \+ Modular Monolith  
**Mobile Local Database:** SQLite

---

# **1\. Database Objectives**

The database must support:

* Personal expenses  
* Income  
* Categories  
* Payment sources  
* Budgets  
* Recurring expenses  
* Reports  
* Offline synchronization  
* Idempotent operations  
* Groups  
* Shared expenses  
* Expense splits  
* Settlements  
* Future family functionality  
* Receipt metadata  
* Goals  
* Subscriptions  
* Future AI insights

The database must prioritize:

1. Financial data integrity  
2. Offline synchronization  
3. User data isolation  
4. Idempotency  
5. Query performance  
6. Historical data preservation  
7. Future extensibility

---

# **2\. Collections**

## **Core MVP Collections**

users  
expenses  
incomes  
categories  
payment\_sources  
budgets  
recurring\_expenses

## **Shared Expense Collections**

groups  
group\_members  
shared\_expenses  
expense\_splits  
settlements

## **Supporting / Future Collections**

files  
goals  
receipts  
notifications  
subscriptions  
insights

---

# **3\. Collection Relationship**

                        users  
                           │  
          ┌────────────────┼─────────────────┐  
          │                │                 │  
          ▼                ▼                 ▼  
      expenses          incomes          budgets  
          │  
          ├──────────────┐  
          ▼              ▼  
     categories    payment\_sources

                         users  
                           │  
                           ▼  
                         groups  
                           │  
                     group\_members  
                           │  
                           ▼  
                   shared\_expenses  
                           │  
                    ┌──────┴──────┐  
                    ▼             ▼  
              expense\_splits  settlements

                         users  
                           │  
                           ▼  
                    recurring\_expenses  
                           │  
                           ▼  
                       expenses

MongoDB does not enforce relational foreign keys, therefore all ownership and reference validation must happen in the application layer.

---

# **4\. Common Data Standards**

## **\_id**

MongoDB-generated:  
ObjectId

Example:  
66f123abc456789012345678

---

## **clientId**

Client-generated UUID.  
Example:  
550e8400-e29b-41d4-a716-446655440000

Used for:

* Offline-created records  
* Idempotency  
* Sync  
* Retry protection

---

## **Dates**

All database timestamps use UTC.  
User timezone is stored separately.  
Example:  
timezone: "Asia/Kolkata"

---

## **Money**

Never store financial amounts as floating point.  
Use integer paise.  
Example:  
₹850  
→ 85000 paise

₹850.50  
→ 85050 paise

Field:  
amountPaise: Number

---

# **5\. Users Collection**

Collection:  
users

Purpose:  
Stores the application's primary user identity and preferences.

## **Schema**

{  
  "\_id": "ObjectId",

  "phoneNumber": "String",  
  "phoneVerified": "Boolean",

  "google": {  
    "providerId": "String",  
    "email": "String"  
  },

  "name": "String",  
  "email": "String",  
  "profileImageFileId": "ObjectId",

  "currency": "String",  
  "timezone": "String",

  "onboardingCompleted": "Boolean",

  "preferences": {  
    "notificationsEnabled": "Boolean",  
    "dailyReminderEnabled": "Boolean",  
    "monthlySummaryEnabled": "Boolean"  
  },

  "status": "ACTIVE",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **Required**

\_id  
currency  
timezone  
status  
createdAt  
updatedAt

## **Optional**

phoneNumber  
email  
google  
profileImageFileId  
name  
preferences  
deletedAt

## **Indexes**

{ phoneNumber: 1 }  
{ email: 1 }  
{ "google.providerId": 1 }

Authentication identifiers should have appropriate uniqueness constraints.

---

# **6\. Expenses Collection**

Collection:  
expenses

This is one of the most important collections.

## **Schema**

{  
  "\_id": "ObjectId",

  "clientId": "UUID",  
  "userId": "ObjectId",

  "amountPaise": "Number",  
  "currency": "INR",

  "categoryId": "ObjectId",  
  "paymentSourceId": "ObjectId",

  "merchant": "String",  
  "note": "String",

  "type": "PERSONAL",

  "expenseDate": "Date",

  "source": "MANUAL",

  "sync": {  
    "clientCreatedAt": "Date",  
    "lastSyncedAt": "Date"  
  },

  "version": "Number",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **Required**

clientId  
userId  
amountPaise  
currency  
categoryId  
expenseDate  
source  
version  
createdAt  
updatedAt

## **Optional**

paymentSourceId  
merchant  
note  
type  
deletedAt

## **Expense Source**

MANUAL  
QUICK  
RECURRING  
VOICE  
RECEIPT

## **Expense Type**

PERSONAL  
BUSINESS

Future:  
SHARED

Shared expenses should preferably live in the shared-expense domain rather than contaminating the personal expense model.

## **Indexes**

{ userId: 1, expenseDate: \-1 }

{ userId: 1, categoryId: 1, expenseDate: \-1 }

{ userId: 1, paymentSourceId: 1, expenseDate: \-1 }

{ userId: 1, createdAt: \-1 }

{ userId: 1, clientId: 1 }

---

# **7\. Incomes Collection**

Collection:  
incomes

## **Schema**

{  
  "\_id": "ObjectId",

  "clientId": "UUID",  
  "userId": "ObjectId",

  "amountPaise": "Number",  
  "currency": "INR",

  "categoryId": "ObjectId",

  "sourceName": "String",  
  "note": "String",

  "incomeDate": "Date",

  "sync": {  
    "clientCreatedAt": "Date",  
    "lastSyncedAt": "Date"  
  },

  "version": "Number",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **Income Categories**

Examples:  
SALARY  
FREELANCE  
BUSINESS  
BONUS  
INTEREST  
OTHER

## **Indexes**

{ userId: 1, incomeDate: \-1 }

{ userId: 1, categoryId: 1, incomeDate: \-1 }

{ userId: 1, clientId: 1 }

---

# **8\. Categories Collection**

Collection:  
categories

Categories can be:

1. System categories  
2. User-created categories

## **Schema**

{  
  "\_id": "ObjectId",

  "userId": "ObjectId | null",

  "name": "String",  
  "icon": "String",

  "type": "EXPENSE",

  "isSystem": "Boolean",  
  "isActive": "Boolean",

  "sortOrder": "Number",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **System Category**

userId \= null  
isSystem \= true

## **Custom Category**

userId \= ObjectId  
isSystem \= false

Examples:  
Food  
Travel  
Shopping  
Rent  
Bills  
Entertainment  
Health  
Education  
Other

## **Indexes**

{ userId: 1, isActive: 1, sortOrder: 1 }

{ userId: 1, name: 1 }

---

# **9\. Payment Sources Collection**

Collection:  
payment\_sources

These are tracking labels, not banking integrations.

## **Schema**

{  
  "\_id": "ObjectId",

  "userId": "ObjectId",

  "name": "String",  
  "type": "UPI",

  "isDefault": "Boolean",  
  "isActive": "Boolean",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **Types**

CASH  
UPI  
CREDIT\_CARD  
DEBIT\_CARD  
BANK\_TRANSFER  
OTHER

Future:  
WALLET

## **Index**

{ userId: 1, isActive: 1 }

---

# **10\. Budgets Collection**

Collection:  
budgets

## **Schema**

{  
  "\_id": "ObjectId",

  "userId": "ObjectId",

  "name": "String",

  "period": "MONTHLY",

  "categoryId": "ObjectId | null",

  "limitPaise": "Number",  
  "currency": "INR",

  "startDate": "Date",  
  "endDate": "Date | null",

  "isActive": "Boolean",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **Budget Types**

### **Overall Budget**

categoryId \= null

### **Category Budget**

categoryId \= ObjectId

Example:  
Food → ₹8,000/month  
Travel → ₹5,000/month

## **Important Rule**

Do **not** store:  
spentAmount

as the source of truth.  
Spent amount should be calculated from expenses.  
Budget Limit  
     \+  
Expenses  
     ↓  
Budget Progress

## **Index**

{ userId: 1, startDate: \-1 }

{ userId: 1, categoryId: 1, startDate: \-1 }

---

# **11\. Recurring Expenses Collection**

Collection:  
recurring\_expenses

## **Schema**

{  
  "\_id": "ObjectId",

  "userId": "ObjectId",

  "name": "String",

  "amountPaise": "Number",  
  "currency": "INR",

  "categoryId": "ObjectId",  
  "paymentSourceId": "ObjectId | null",

  "frequency": "MONTHLY",

  "startDate": "Date",  
  "endDate": "Date | null",

  "nextOccurrenceDate": "Date",

  "autoCreate": "Boolean",  
  "reminderEnabled": "Boolean",

  "isActive": "Boolean",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **Frequency**

DAILY  
WEEKLY  
MONTHLY  
YEARLY

## **Generated Expense**

Generated expense contains:  
source \= RECURRING  
recurringExpenseId \= ObjectId  
recurringOccurrenceDate \= Date

This prevents duplicate recurring transactions.

## **Important Index**

{  
  userId: 1,  
  nextOccurrenceDate: 1,  
  isActive: 1  
}

---

# **12\. Groups Collection**

Collection:  
groups

Used for:

* Friends  
* Trips  
* Family  
* Flatmates  
* Office  
* Couples

## **Schema**

{  
  "\_id": "ObjectId",

  "ownerId": "ObjectId",

  "name": "String",  
  "description": "String | null",

  "type": "FRIENDS",

  "currency": "INR",

  "status": "ACTIVE",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **Group Types**

FRIENDS  
FAMILY  
TRIP  
FLATMATES  
OFFICE  
COUPLE  
OTHER

---

# **13\. Group Members Collection**

Collection:  
group\_members

Do not store a huge `members[]` array inside the group document.  
Use a separate collection.

## **Schema**

{  
  "\_id": "ObjectId",

  "groupId": "ObjectId",  
  "userId": "ObjectId",

  "role": "MEMBER",

  "status": "ACTIVE",

  "joinedAt": "Date",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **Roles**

OWNER  
ADMIN  
MEMBER

## **Indexes**

{ groupId: 1, userId: 1 }

{ userId: 1, status: 1 }

{ groupId: 1, status: 1 }

A unique active membership should be enforced for:  
groupId \+ userId

---

# **14\. Shared Expenses Collection**

Collection:  
shared\_expenses

This represents an expense belonging to a group.

## **Schema**

{  
  "\_id": "ObjectId",

  "clientId": "UUID",

  "groupId": "ObjectId",  
  "createdByUserId": "ObjectId",

  "description": "String",

  "totalAmountPaise": "Number",  
  "currency": "INR",

  "paidByUserId": "ObjectId",

  "splitType": "EQUAL",

  "expenseDate": "Date",

  "categoryId": "ObjectId | null",  
  "note": "String | null",

  "status": "ACTIVE",

  "version": "Number",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **Split Types**

EQUAL  
EXACT\_AMOUNT  
PERCENTAGE  
SHARES

Example:  
Dinner \= ₹1,200  
Paid by \= Vibhanshu  
Split \= EQUAL

---

# **15\. Expense Splits Collection**

Collection:  
expense\_splits

Stores each person's responsibility for a shared expense.

## **Schema**

{  
  "\_id": "ObjectId",

  "sharedExpenseId": "ObjectId",  
  "groupId": "ObjectId",

  "userId": "ObjectId",

  "shareAmountPaise": "Number",

  "percentage": "Number | null",  
  "shares": "Number | null",

  "paidAmountPaise": "Number",

  "balancePaise": "Number",

  "status": "PENDING",

  "createdAt": "Date",  
  "updatedAt": "Date"  
}

Example:  
Total \= ₹1,200

Vibhanshu  
share \= ₹400  
paid \= ₹1,200  
balance \= \+₹800

Rahul  
share \= ₹400  
paid \= ₹0  
balance \= \-₹400

Amit  
share \= ₹400  
paid \= ₹0  
balance \= \-₹400

## **Indexes**

{ sharedExpenseId: 1 }

{ groupId: 1, userId: 1 }

{ userId: 1, groupId: 1 }

---

# **16\. Settlements Collection**

Collection:  
settlements

Records actual payments between members.

## **Schema**

{  
  "\_id": "ObjectId",

  "clientId": "UUID",

  "groupId": "ObjectId",

  "fromUserId": "ObjectId",  
  "toUserId": "ObjectId",

  "amountPaise": "Number",  
  "currency": "INR",

  "settlementDate": "Date",

  "note": "String | null",

  "status": "COMPLETED",

  "createdAt": "Date",  
  "updatedAt": "Date"  
}

Example:  
Rahul  
   ↓ ₹400  
Vibhanshu

## **Status**

PENDING  
COMPLETED  
CANCELLED

---

# **17\. Group Balance Calculation**

Group balance should be derived from:  
Shared Expenses  
\+  
Expense Splits  
\+  
Settlements

Do not maintain an independent permanent balance as the source of truth.  
Example:  
Expenses:  
Rahul owes Vibhanshu ₹500

Settlement:  
Rahul paid ₹200

Current balance:  
Rahul owes Vibhanshu ₹300

This makes the system auditable.

---

# **18\. Files Collection**

Collection:  
files

Storage provider:  
Cloudflare R2

## **Schema**

{  
  "\_id": "ObjectId",

  "userId": "ObjectId",

  "provider": "CLOUDFLARE\_R2",

  "bucket": "String",  
  "storageKey": "String",

  "fileName": "String",  
  "mimeType": "String",  
  "sizeBytes": "Number",

  "purpose": "RECEIPT",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

## **Purposes**

PROFILE\_IMAGE  
RECEIPT  
EXPORT  
OTHER

MongoDB stores metadata.  
Actual file:  
Cloudflare R2

---

# **19\. Receipts Collection**

Collection:  
receipts

This can be introduced when OCR is implemented.

## **Schema**

{  
  "\_id": "ObjectId",

  "userId": "ObjectId",  
  "fileId": "ObjectId",

  "expenseId": "ObjectId | null",

  "ocrStatus": "PENDING",

  "extractedData": {  
    "merchant": "String | null",  
    "amountPaise": "Number | null",  
    "expenseDate": "Date | null",  
    "items": \[\]  
  },

  "createdAt": "Date",  
  "updatedAt": "Date"  
}

OCR should create an expense **draft**, not automatically create a financial transaction without user confirmation.

---

# **20\. Goals Collection**

Collection:  
goals

Future P1/Phase 2 feature.

## **Schema**

{  
  "\_id": "ObjectId",

  "userId": "ObjectId",

  "name": "String",

  "targetAmountPaise": "Number",  
  "currentAmountPaise": "Number",

  "targetDate": "Date | null",

  "status": "ACTIVE",

  "createdAt": "Date",  
  "updatedAt": "Date",  
  "deletedAt": "Date | null"  
}

Example:  
MacBook  
Target \= ₹150,000  
Current \= ₹70,000

---

# **21\. Notifications Collection**

Collection:  
notifications

Used when application-level notification history is required.

## **Schema**

{  
  "\_id": "ObjectId",

  "userId": "ObjectId",

  "type": "BUDGET\_ALERT",

  "title": "String",  
  "body": "String",

  "data": {},

  "channel": "PUSH",

  "status": "SENT",

  "scheduledAt": "Date | null",  
  "sentAt": "Date | null",  
  "readAt": "Date | null",

  "createdAt": "Date"  
}

---

# **22\. Subscriptions Collection**

This is for **Kharchiva's own subscription/billing system**, not recurring user expenses.

## **Schema**

{  
  "\_id": "ObjectId",

  "userId": "ObjectId",

  "planId": "String",

  "provider": "String",  
  "providerSubscriptionId": "String",

  "status": "ACTIVE",

  "startDate": "Date",  
  "endDate": "Date | null",

  "createdAt": "Date",  
  "updatedAt": "Date"  
}

---

# **23\. Insights Collection**

Future AI/personalization feature.

## **Schema**

{  
  "\_id": "ObjectId",

  "userId": "ObjectId",

  "type": "SPENDING\_INCREASE",

  "title": "String",  
  "description": "String",

  "data": {},

  "periodStart": "Date",  
  "periodEnd": "Date",

  "status": "ACTIVE",

  "createdAt": "Date",  
  "updatedAt": "Date"  
}

Insights are derived data.  
They should never replace the underlying financial records.

---

# **24\. Sync Metadata**

Offline-first entities should contain:  
clientId  
version  
createdAt  
updatedAt  
deletedAt

And where appropriate:  
sync.clientCreatedAt  
sync.lastSyncedAt

Local SQLite can additionally maintain:  
syncStatus  
lastSyncError  
retryCount

These mobile-only fields do not necessarily need to exist in MongoDB.

---

# **25\. Sync Queue — Mobile SQLite**

The mobile database should maintain a local sync queue.  
Example:  
sync\_queue

Fields:  
id  
entityType  
entityId  
operation  
payload  
retryCount  
status  
createdAt  
lastAttemptAt  
lastError

Operations:  
CREATE  
UPDATE  
DELETE

Statuses:  
PENDING  
SYNCING  
SYNCED  
FAILED

---

# **26\. Conflict Resolution**

Each synced entity contains:  
version

Example:  
Client version \= 3  
Server version \= 4

The server detects a conflict.  
Possible strategy:  
Financial transaction  
        ↓  
Conflict  
        ↓  
Return latest server state  
        ↓  
Client reconciles

The exact conflict policy should be entity-specific.  
For financial records, silently overwriting data should be avoided.

---

# **27\. Soft Delete Strategy**

Financial records should generally use:  
deletedAt

instead of hard deletion.  
Applies to:  
expenses  
incomes  
categories  
payment\_sources  
budgets  
recurring\_expenses  
groups  
group\_members  
shared\_expenses  
files  
goals

Deleted records can remain available for synchronization and recovery policies.

---

# **28\. Idempotency**

The following operations require idempotency:  
Expense creation  
Income creation  
Shared expense creation  
Settlement creation  
Recurring expense generation  
Offline sync  
Export generation  
Email jobs

Primary client-side identifier:  
clientId

Example:  
clientId \= abc-123

If the same request is received twice:  
First request → Create  
Second request → Return existing result

No duplicate financial record should be created.

---

# **29\. Data Ownership Rules**

Every personal record must belong to a user.  
Example:  
expense.userId \= authenticatedUserId

The API must never trust a client-provided `userId` for authorization.  
For groups:  
group\_members

must be checked before accessing:  
shared\_expenses  
expense\_splits  
settlements

---

# **30\. Important Financial Rules**

### **Rule 1**

Never use floating point for money.

### **Rule 2**

Never use Redis as financial storage.

### **Rule 3**

Never trust client-provided ownership.

### **Rule 4**

Never permanently delete financial records immediately.

### **Rule 5**

Never generate duplicate recurring expenses.

### **Rule 6**

Never create an OCR expense without user confirmation.

### **Rule 7**

Never expose one group member's private expenses to another member.

### **Rule 8**

Reports should calculate from source financial records.

### **Rule 9**

Balances should be derived from shared expenses, splits and settlements.

---

# **31\. Reports Data Strategy**

Reports should initially be calculated using MongoDB aggregation pipelines.  
Example:  
expenses  
   ↓  
Filter userId  
   ↓  
Filter date range  
   ↓  
Group by category  
   ↓  
SUM(amountPaise)  
   ↓  
Report

Monthly report:  
Income  
   \+  
Expenses  
   \+  
Categories  
   \+  
Budget  
   ↓  
Monthly Summary

No separate `monthly_totals` source-of-truth collection is required for MVP.  
If scale later requires materialized analytics, derived collections can be introduced.

---

# **32\. Example Expense Document**

{  
  "\_id": "66f123abc456789012345678",

  "clientId": "550e8400-e29b-41d4-a716-446655440000",

  "userId": "66f111abc456789012345678",

  "amountPaise": 85000,  
  "currency": "INR",

  "categoryId": "66f222abc456789012345678",

  "paymentSourceId": "66f333abc456789012345678",

  "merchant": "Swiggy",  
  "note": "Dinner",

  "type": "PERSONAL",

  "expenseDate": "2026-09-28T14:00:00.000Z",

  "source": "QUICK",

  "sync": {  
    "clientCreatedAt": "2026-09-28T14:00:00.000Z",  
    "lastSyncedAt": "2026-09-28T14:00:05.000Z"  
  },

  "version": 1,

  "createdAt": "2026-09-28T14:00:00.000Z",  
  "updatedAt": "2026-09-28T14:00:05.000Z",

  "deletedAt": null  
}

---

# **33\. Example Shared Expense**

{  
  "\_id": "66f444abc456789012345678",

  "clientId": "550e8400-e29b-41d4-a716-446655440001",

  "groupId": "66f555abc456789012345678",

  "createdByUserId": "66f111abc456789012345678",

  "description": "Dinner",

  "totalAmountPaise": 120000,  
  "currency": "INR",

  "paidByUserId": "66f111abc456789012345678",

  "splitType": "EQUAL",

  "expenseDate": "2026-09-28T14:00:00.000Z",

  "status": "ACTIVE",

  "version": 1,

  "createdAt": "2026-09-28T14:00:00.000Z",  
  "updatedAt": "2026-09-28T14:00:00.000Z",

  "deletedAt": null  
}

---

# **34\. Example Expense Splits**

Shared Expense \= ₹1,200

Vibhanshu  
share \= ₹400  
paid \= ₹1,200  
balance \= \+₹800

Rahul  
share \= ₹400  
paid \= ₹0  
balance \= \-₹400

Amit  
share \= ₹400  
paid \= ₹0  
balance \= \-₹400

This gives the system enough information to calculate the group balance.

---

# **35\. What We Are NOT Storing**

We intentionally do not store:  
bank account credentials  
bank transaction feeds  
credit-card API data  
GST information  
tax filing records  
investment portfolios  
full accounting ledgers

The MVP database remains focused on expense management.

---

# **36\. Final Collection Architecture**

CORE  
├── users  
├── expenses  
├── incomes  
├── categories  
├── payment\_sources  
├── budgets  
└── recurring\_expenses

SHARED MONEY  
├── groups  
├── group\_members  
├── shared\_expenses  
├── expense\_splits  
└── settlements

FILES  
├── files  
└── receipts

FUTURE  
├── goals  
├── notifications  
├── subscriptions  
└── insights

---

# **37\. Final Database Architecture**

                   ┌──────────────┐  
                    │    USERS     │  
                    └──────┬───────┘  
                           │  
          ┌────────────────┼─────────────────┐  
          │                │                 │  
          ▼                ▼                 ▼  
      EXPENSES          INCOMES          BUDGETS  
          │  
     ┌────┴────┐  
     ▼         ▼  
CATEGORIES  PAYMENT SOURCES  
          │  
          ▼  
   RECURRING EXPENSES

                    ┌──────────────┐  
                    │    GROUPS    │  
                    └──────┬───────┘  
                           │  
                           ▼  
                    GROUP MEMBERS  
                           │  
                           ▼  
                  SHARED EXPENSES  
                           │  
                    ┌──────┴──────┐  
                    ▼             ▼  
              EXPENSE SPLITS  SETTLEMENTS

                    ┌──────────────┐  
                    │    FILES     │  
                    └──────┬───────┘  
                           │  
                           ▼  
                    CLOUDFLARE R2

Mobile SQLite  
     │  
     ▼  
Sync Queue  
     │  
     ▼  
NestJS API  
     │  
     ▼  
MongoDB Atlas

---

# **38\. Database Design Principles — Final**

| Principle | Decision |
| ----- | ----- |
| Database | MongoDB Atlas |
| Local DB | SQLite |
| Money | Integer paise |
| Currency | INR |
| Primary ID | ObjectId |
| Client ID | UUID |
| Offline | Supported |
| Sync | Background |
| Idempotency | Required |
| Versioning | Required |
| Soft Delete | Yes |
| User Ownership | Required |
| Redis | Never source of truth |
| Reports | Aggregation-based |
| Groups | Separate collection |
| Shared Expenses | Separate domain |
| Balances | Derived |
| Settlements | Explicit records |
| Files | Cloudflare R2 |
| OCR | Future |
| AI Insights | Future |

---

# **39\. Final Decision**

The **Kharchiva Database v1.1** is designed around two major financial domains:  
PERSONAL MONEY  
     │  
     ├── Expenses  
     ├── Income  
     ├── Budget  
     ├── Recurring  
     └── Reports

SHARED MONEY  
     │  
     ├── Groups  
     ├── Members  
     ├── Shared Expenses  
     ├── Splits  
     └── Settlements

Both domains share the same user identity and infrastructure, while maintaining a clear separation between **private financial data** and **group financial data**.  
The database is intentionally designed so that future features such as **family accounts, receipt OCR, voice expenses, goals, Google Sheets and AI insights** can be added without redesigning the core financial data model.

---

# **40\. Reporting and Export**

The database design must support user-facing financial reports and downloadable exports.

## **Supported Report Periods**

* Today  
* This Week  
* This Month  
* Previous Month  
* This Year  
* Previous Year  
* Custom Date Range

## **Report Metrics**

Reports may calculate:

* Total Income  
* Total Expense  
* Remaining Amount  
* Savings  
* Category-wise Expense  
* Payment-source-wise Expense  
* Monthly Comparison  
* Yearly Comparison  
* Budget Progress  
* Recurring Expense Summary

All report totals are derived from source financial records.

The source of truth remains:

* expenses  
* incomes  
* budgets  
* recurring\_expenses

No permanent monthly/yearly total collection is required for MVP.

## **Export Formats**

Supported export formats:

* CSV  
* Excel (.xlsx)

## **Export Data**

An expense export may contain:

* Expense Date  
* Category  
* Amount  
* Currency  
* Payment Source  
* Merchant  
* Note  
* Expense Type  
* Expense Source

An income export may contain:

* Income Date  
* Income Category  
* Amount  
* Currency  
* Source Name  
* Note

## **Export Flow**

User  
↓  
Select date range  
↓  
Select report/export type  
↓  
Create export job  
↓  
BullMQ \+ Redis  
↓  
Generate CSV/Excel  
↓  
Store generated file in Cloudflare R2  
↓  
Store file metadata in MongoDB  
↓  
Return download reference / signed URL

Export generation should be asynchronous so large exports do not block normal API requests.

Export generation must be idempotent.

---

# **41\. Export Metadata**

The existing `files` collection supports the `EXPORT` purpose.

For export-specific metadata, the application may maintain:

* export type  
* format  
* date range  
* requested by user  
* generation status  
* fileId  
* createdAt  
* completedAt  
* failure reason when applicable

Recommended export statuses:

* PENDING  
* PROCESSING  
* COMPLETED  
* FAILED  
* EXPIRED

Generated export files are stored in Cloudflare R2.

MongoDB stores metadata and references, not the actual file binary.

---

# **42\. Recurring Income**

The database must support recurring income in addition to recurring expenses.

Examples:

* Monthly Salary  
* Monthly Freelance Income  
* Business Income  
* Annual Bonus

Recurring income should use a dedicated `recurring_incomes` collection rather than overloading `recurring_expenses`.

## **Collection**

recurring\_incomes

## **Schema**

{  
"\_id": "ObjectId",

"userId": "ObjectId",

"name": "String",

"amountPaise": "Number",  
"currency": "INR",

"categoryId": "ObjectId | null",  
"sourceName": "String | null",

"frequency": "MONTHLY",

"startDate": "Date",  
"endDate": "Date | null",

"nextOccurrenceDate": "Date",

"autoCreate": "Boolean",  
"reminderEnabled": "Boolean",

"isActive": "Boolean",

"createdAt": "Date",  
"updatedAt": "Date",  
"deletedAt": "Date | null"  
}

## **Frequency**

DAILY  
WEEKLY  
MONTHLY  
YEARLY

## **Generated Income**

Generated income contains:

source \= RECURRING

recurringIncomeId \= ObjectId

recurringIncomeOccurrenceDate \= Date

This prevents duplicate recurring income transactions.

## **Index**

{  
userId: 1,  
nextOccurrenceDate: 1,  
isActive: 1  
}

---

# **43\. Transaction Search and Filtering**

The transaction system must support efficient search and filtering.

## **Supported Filters**

* Date range  
* Category  
* Payment source  
* Amount range  
* Personal / Business  
* Merchant  
* Expense source  
* Income category  
* Recurring transactions  
* Sort order

## **Search**

Users may search by:

* Merchant name  
* Note  
* Category name  
* Source name

Search must remain scoped to the authenticated user's data.

## **Query Rules**

All transaction queries must:

1. Validate authenticated user ownership.  
2. Exclude soft-deleted records by default.  
3. Apply date filters using `expenseDate` / `incomeDate`.  
4. Use pagination for large result sets.  
5. Use indexes based on actual query patterns.

Recommended expense indexes:

{  
userId: 1,  
expenseDate: \-1  
}

{  
userId: 1,  
categoryId: 1,  
expenseDate: \-1  
}

{  
userId: 1,  
paymentSourceId: 1,  
expenseDate: \-1  
}

{  
userId: 1,  
createdAt: \-1  
}

{  
userId: 1,  
clientId: 1  
}

Text-search implementation may use MongoDB search capabilities or an application-supported search strategy when scale requires it.

---

# **44\. Dashboard Calculation Strategy**

The dashboard is derived from financial source records.

## **Core Metrics**

### **Total Income**

SUM(incomes.amountPaise)

for the selected period.

### **Total Expense**

SUM(expenses.amountPaise)

for the selected period.

### **Remaining**

Total Income \- Total Expense

### **Savings**

Total Income \- Total Expense

Savings terminology may be refined at the product/API layer depending on the selected period and business rules.

### **Category Breakdown**

SUM(expenses.amountPaise)

GROUP BY categoryId

### **Budget Progress**

Budget Limit  
\+  
Actual Expenses  
↓  
Budget Progress

The database must not treat dashboard aggregates as the primary financial source of truth.

---

# **45\. Monthly and Yearly Comparison**

The reporting layer must support comparisons such as:

## **Monthly**

Current month vs previous month.

## **Yearly**

Current year vs previous year.

## **Category Comparison**

Current period category spending vs comparison period category spending.

Comparison results are derived using `expenseDate` and `incomeDate`.

No permanent comparison collection is required for MVP.

---

# **46\. Reminder and Notification Rules**

The notification system should support smart financial reminders.

Supported reminder types include:

* DAILY\_EXPENSE\_REMINDER  
* CATCH\_UP\_REMINDER  
* BUDGET\_ALERT  
* RECURRING\_EXPENSE\_REMINDER  
* RECURRING\_INCOME\_REMINDER  
* MONTHLY\_SUMMARY  
* YEARLY\_SUMMARY

The `notifications` collection stores application-level notification history when required.

## **Reminder Principles**

* Do not spam users.  
* Respect notification preferences.  
* Respect user timezone.  
* Respect notification enable/disable settings.  
* Background jobs should generate scheduled reminders.  
* Reminder jobs must be idempotent.  
* Duplicate notifications for the same event should be prevented.

---

# **47\. Nothing Today and Catch-up State**

The application should distinguish between:

NO\_EXPENSE  
MISSING  
RECORDED

## **NO\_EXPENSE**

The user has explicitly indicated that there was no expense for the day.

## **MISSING**

The day has no recorded expense, but the system has not established that the user had no expense.

## **RECORDED**

At least one expense has been recorded for the day.

This state is primarily application/reporting logic and does not require a separate financial source-of-truth collection.

Historical expenses remain preserved using `expenseDate`.

Catch-up flows may allow users to record expenses for previous dates.

---

# **48\. Recurring Transaction Idempotency**

Recurring expense and recurring income generation must prevent duplicate financial transactions.

## **Expense Rule**

A generated recurring expense is uniquely identified by:

recurringExpenseId  
\+  
recurringOccurrenceDate

## **Income Rule**

A generated recurring income is uniquely identified by:

recurringIncomeId  
\+  
recurringIncomeOccurrenceDate

If the same background job runs twice:

First execution  
↓  
Create transaction

Second execution  
↓  
Detect existing occurrence  
↓  
Return existing transaction  
↓  
Do not create duplicate

This rule applies to retries, worker restarts, network failures and repeated scheduled jobs.

---

# **49\. Background Job Requirements**

BullMQ \+ Redis is responsible for asynchronous and scheduled operations.

Jobs include:

* Recurring expense generation  
* Recurring income generation  
* Reminder generation  
* Monthly summary generation  
* Yearly summary generation  
* Export generation  
* Email sending  
* Sync retry processing  
* Future OCR processing  
* Future AI insight generation

Critical financial writes should not depend on Redis being the source of truth.

MongoDB remains the financial source of truth.

---

# **50\. Report and Export Retention**

Generated export files may be temporary.

Recommended lifecycle:

PENDING  
↓  
PROCESSING  
↓  
COMPLETED  
↓  
Available for download  
↓  
Expired  
↓  
Deleted from R2 according to retention policy

The exact retention duration is an application/business configuration and should not be hard-coded into the database model.

---

# **51\. Final Database Coverage Checklist**

The finalized database design supports:

* Personal expenses  
* Income  
* Recurring income  
* Categories  
* Payment sources  
* Budgets  
* Recurring expenses  
* Monthly reports  
* Yearly reports  
* Custom date-range reports  
* Category-wise reports  
* Payment-source reports  
* Monthly comparison  
* Yearly comparison  
* Dashboard calculations  
* CSV export  
* Excel export  
* Export file storage  
* Export metadata  
* Offline-first synchronization  
* SQLite sync queue  
* Idempotency  
* Conflict resolution  
* Soft delete  
* Groups  
* Group members  
* Shared expenses  
* Equal split  
* Exact amount split  
* Percentage split  
* Shares split  
* Settlements  
* Derived group balances  
* Files  
* Cloudflare R2  
* Receipts  
* OCR foundation  
* Goals  
* Notifications  
* Smart reminders  
* Nothing Today  
* Catch-up  
* Subscriptions  
* AI insights foundation

---

# **52\. Final Lock Decision**

The **Kharchiva Database Design v1.1** is now considered the finalized database baseline.

The core financial model remains:

MongoDB Atlas  
\+  
SQLite  
\+  
NestJS  
\+  
Redis/BullMQ  
\+  
Cloudflare R2

MongoDB remains the cloud source of truth.

SQLite remains the mobile offline database.

Redis remains queue/temporary infrastructure and must never become financial source-of-truth storage.

All monthly, yearly and custom reports are derived from source financial records.

Exports are generated asynchronously and stored in Cloudflare R2.

Personal money and shared money remain separate domains.

The database is now ready to be used as the source of truth for the next document:

**Kharchiva — API Contract v1.0**

