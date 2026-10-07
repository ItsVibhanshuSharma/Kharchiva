# **Kharchiva — API Contract Document**

**Version:** 1.0  
**Status:** Draft / Implementation Baseline  
**Source of Truth:** Kharchiva Database Design v1.1  
**Architecture:** Offline-First \+ Modular Monolith  
**Backend:** Node.js \+ NestJS  
**Database:** MongoDB Atlas  
**Mobile Local Database:** SQLite  
**Queue:** Redis \+ BullMQ  
**File Storage:** Cloudflare R2  
**Email:** Resend  
**Currency:** INR  
**Primary ID:** MongoDB ObjectId  
**Client ID:** UUID

---

# **1\. Purpose**

This document defines the API contract for Kharchiva.

The API is designed around the finalized Database Design v1.1 and must support:

* Authentication  
* User profile and preferences  
* Onboarding  
* Categories  
* Payment sources  
* Expenses  
* Income  
* Recurring expenses  
* Recurring income  
* Budgets  
* Dashboard  
* Reports  
* Search and filters  
* CSV/Excel exports  
* Groups  
* Shared expenses  
* Expense splits  
* Settlements  
* Notifications  
* Files  
* Receipts  
* Offline synchronization  
* Idempotency  
* Background jobs  
* Goals  
* Subscriptions  
* Future insights

The API must preserve financial data integrity and must never treat Redis or derived report data as the financial source of truth.

---

# **2\. API Design Principles**

## **2.1 REST**

The API uses RESTful HTTP endpoints.

Base path:

/api/v1

Example:

GET /api/v1/expenses

## **2.2 Authentication**

Protected endpoints require:

Authorization: Bearer \<access\_token\>

The authenticated user identity is derived from the token.

The API must never trust a client-provided `userId` for authorization.

## **2.3 User Ownership**

For personal resources:

authenticatedUserId \=== resource.userId

For group resources:

authenticatedUserId must be an active group member

## **2.4 Money**

All monetary values use integer paise.

Example:

₹850.50 \= 85050

Never use floating-point values for financial calculations.

## **2.5 Dates**

API timestamps use ISO 8601 UTC.

Example:

2026-09-28T14:00:00.000Z

The user's timezone is stored separately and is used for day/month/year boundaries and scheduled jobs.

## **2.6 Pagination**

List endpoints use cursor-based pagination where practical.

Example:

GET /api/v1/expenses?limit=20\&cursor=\<cursor\>

Response:

{  
  "items": \[\],  
  "pagination": {  
    "nextCursor": "string",  
    "hasMore": true  
  }  
}

## **2.7 Idempotency**

Create operations that can be retried must support idempotency.

Primary client identifier:

clientId: UUID

The same clientId must not create duplicate financial records.

For API requests that are not represented by a financial entity, an optional:

Idempotency-Key: \<uuid\>

may be used.

---

# **3\. Standard Response Format**

## **Success**

{  
  "success": true,  
  "data": {}  
}

## **List**

{  
  "success": true,  
  "data": {  
    "items": \[\],  
    "pagination": {  
      "nextCursor": null,  
      "hasMore": false  
    }  
  }  
}

## **Error**

{  
  "success": false,  
  "error": {  
    "code": "VALIDATION\_ERROR",  
    "message": "Invalid request",  
    "details": \[\]  
  }  
}  
---

# **4\. HTTP Status Codes**

| Status | Meaning |
| ----- | ----- |
| 200 | Successful request |
| 201 | Resource created |
| 202 | Accepted for background processing |
| 204 | Successful operation with no response body |
| 400 | Invalid request |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Conflict / duplicate / state conflict |
| 422 | Validation failure |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Temporary service unavailable |

---

# **5\. Error Codes**

Recommended application error codes:

AUTH\_REQUIRED  
INVALID\_TOKEN  
OTP\_INVALID  
OTP\_EXPIRED  
OTP\_RATE\_LIMITED  
USER\_NOT\_FOUND  
RESOURCE\_NOT\_FOUND  
VALIDATION\_ERROR  
FORBIDDEN  
OWNERSHIP\_ERROR  
DUPLICATE\_RESOURCE  
IDEMPOTENCY\_CONFLICT  
SYNC\_CONFLICT  
CATEGORY\_NOT\_FOUND  
PAYMENT\_SOURCE\_NOT\_FOUND  
BUDGET\_NOT\_FOUND  
RECURRING\_EXPENSE\_NOT\_FOUND  
RECURRING\_INCOME\_NOT\_FOUND  
GROUP\_NOT\_FOUND  
GROUP\_MEMBER\_NOT\_FOUND  
SHARED\_EXPENSE\_NOT\_FOUND  
SETTLEMENT\_NOT\_FOUND  
INVALID\_SPLIT  
INVALID\_AMOUNT  
INVALID\_DATE\_RANGE  
EXPORT\_FAILED  
FILE\_NOT\_FOUND  
FILE\_UPLOAD\_FAILED  
RATE\_LIMITED  
INTERNAL\_ERROR  
---

# **6\. Authentication APIs**

Authentication supports:

* Phone OTP  
* Google Sign-In

Both authentication methods resolve to one internal user identity.

---

## **6.1 Request Phone OTP**

POST /api/v1/auth/phone/request-otp

Auth:

Public

Request:

{  
  "phoneNumber": "+919876543210"  
}

Validation:

* Valid Indian phone number  
* Rate limit per phone/IP/device  
* OTP expiry  
* OTP retry limit

Response:

{  
  "success": true,  
  "data": {  
    "requestId": "uuid",  
    "expiresAt": "2026-09-30T04:35:00.000Z"  
  }  
}  
---

## **6.2 Verify Phone OTP**

POST /api/v1/auth/phone/verify-otp

Auth:

Public

Request:

{  
  "requestId": "uuid",  
  "phoneNumber": "+919876543210",  
  "otp": "123456"  
}

Response:

{  
  "success": true,  
  "data": {  
    "user": {},  
    "accessToken": "token",  
    "refreshToken": "token",  
    "isNewUser": true  
  }  
}  
---

## **6.3 Google Sign-In**

POST /api/v1/auth/google

Auth:

Public

Request:

{  
  "idToken": "google-id-token"  
}

Backend validates the Google token and maps the provider identity to the internal user.

Response:

{  
  "success": true,  
  "data": {  
    "user": {},  
    "accessToken": "token",  
    "refreshToken": "token",  
    "isNewUser": false  
  }  
}  
---

## **6.4 Refresh Token**

POST /api/v1/auth/refresh

Request:

{  
  "refreshToken": "token"  
}

Response:

{  
  "success": true,  
  "data": {  
    "accessToken": "token",  
    "refreshToken": "token"  
  }  
}  
---

## **6.5 Logout**

POST /api/v1/auth/logout

Auth:

Required

Request may contain the refresh token/session identifier.

Response:

{  
  "success": true,  
  "data": null  
}  
---

# **7\. User APIs**

## **7.1 Get Current User**

GET /api/v1/users/me

Response:

{  
  "success": true,  
  "data": {  
    "id": "ObjectId",  
    "name": "Vibhanshu",  
    "phoneNumber": "+919876543210",  
    "email": "user@example.com",  
    "currency": "INR",  
    "timezone": "Asia/Kolkata",  
    "onboardingCompleted": true,  
    "preferences": {  
      "notificationsEnabled": true,  
      "dailyReminderEnabled": true,  
      "monthlySummaryEnabled": true  
    }  
  }  
}  
---

## **7.2 Update Profile**

PATCH /api/v1/users/me

Request:

{  
  "name": "Vibhanshu",  
  "email": "user@example.com",  
  "timezone": "Asia/Kolkata"  
}

The API must only update fields allowed by the user profile contract.

---

## **7.3 Update Preferences**

PATCH /api/v1/users/me/preferences

Request:

{  
  "notificationsEnabled": true,  
  "dailyReminderEnabled": true,  
  "monthlySummaryEnabled": false  
}  
---

## **7.4 Complete Onboarding**

POST /api/v1/users/me/onboarding/complete

Response:

{  
  "success": true,  
  "data": {  
    "onboardingCompleted": true  
  }  
}  
---

# **8\. Category APIs**

## **8.1 List Categories**

GET /api/v1/categories

Query:

type=EXPENSE  
includeInactive=false

Response:

{  
  "success": true,  
  "data": {  
    "items": \[\]  
  }  
}

System categories are available to users without storing ownership on the user.

Custom categories are scoped to the authenticated user.

---

## **8.2 Create Category**

POST /api/v1/categories

Request:

{  
  "name": "Coffee",  
  "icon": "coffee",  
  "type": "EXPENSE"  
}

Response:

{  
  "success": true,  
  "data": {}  
}  
---

## **8.3 Update Category**

PATCH /api/v1/categories/:categoryId  
---

## **8.4 Delete Category**

DELETE /api/v1/categories/:categoryId

Use soft delete.

Existing historical transactions must remain valid.

---

# **9\. Payment Source APIs**

Payment sources are tracking labels and are not banking integrations.

Supported types:

CASH  
UPI  
CREDIT\_CARD  
DEBIT\_CARD  
BANK\_TRANSFER  
OTHER

## **9.1 List**

GET /api/v1/payment-sources

## **9.2 Create**

POST /api/v1/payment-sources

Request:

{  
  "name": "HDFC Bank",  
  "type": "BANK",  
  "isDefault": false  
}

## **9.3 Update**

PATCH /api/v1/payment-sources/:paymentSourceId

## **9.4 Delete**

DELETE /api/v1/payment-sources/:paymentSourceId

Soft delete.

---

# **10\. Expense APIs**

Expenses are one of the primary financial resources.

---

## **10.1 Create Expense**

POST /api/v1/expenses

Auth:

Required

Request:

{  
  "clientId": "550e8400-e29b-41d4-a716-446655440000",  
  "amountPaise": 85000,  
  "currency": "INR",  
  "categoryId": "ObjectId",  
  "paymentSourceId": "ObjectId",  
  "merchant": "Swiggy",  
  "note": "Dinner",  
  "type": "PERSONAL",  
  "expenseDate": "2026-09-28T14:00:00.000Z",  
  "source": "QUICK"  
}

Validation:

* amountPaise \> 0  
* currency must be INR  
* category must belong to system categories or current user  
* payment source must belong to current user  
* expenseDate must be valid  
* type must be PERSONAL or BUSINESS  
* source must be supported

Idempotency:

userId \+ clientId

If the same request is received again, return the existing expense.

Response:

{  
  "success": true,  
  "data": {}  
}  
---

## **10.2 Get Expense**

GET /api/v1/expenses/:expenseId

Ownership is mandatory.

---

## **10.3 Update Expense**

PATCH /api/v1/expenses/:expenseId

Request:

{  
  "amountPaise": 90000,  
  "categoryId": "ObjectId",  
  "note": "Dinner with friends",  
  "expenseDate": "2026-09-28T14:00:00.000Z"  
}

Version handling is required for offline synchronization.

---

## **10.4 Delete Expense**

DELETE /api/v1/expenses/:expenseId

Use soft delete.

Response:

{  
  "success": true,  
  "data": {  
    "deleted": true  
  }  
}  
---

## **10.5 List Expenses**

GET /api/v1/expenses

Query parameters:

from  
to  
categoryId  
paymentSourceId  
type  
source  
merchant  
minAmountPaise  
maxAmountPaise  
sort  
limit  
cursor

Example:

GET /api/v1/expenses?from=2026-09-01\&to=2026-09-30\&categoryId=\<id\>\&limit=20

Response:

{  
  "success": true,  
  "data": {  
    "items": \[\],  
    "pagination": {  
      "nextCursor": null,  
      "hasMore": false  
    }  
  }  
}  
---

## **10.6 Quick Expense**

Quick Expense uses the same expense domain but is optimized for minimum interaction.

POST /api/v1/expenses/quick

Request:

{  
  "clientId": "uuid",  
  "amountPaise": 12000,  
  "categoryId": "ObjectId",  
  "paymentSourceId": "ObjectId",  
  "expenseDate": "2026-09-30T04:00:00.000Z"  
}

Minimum required fields:

amountPaise  
categoryId

Optional:

paymentSourceId  
note  
merchant  
expenseDate

The server creates a normal `expenses` record with:

source \= QUICK  
---

## **10.7 Search Expenses**

GET /api/v1/expenses/search

Query:

q  
from  
to  
categoryId  
paymentSourceId  
minAmountPaise  
maxAmountPaise  
limit  
cursor

Search is always scoped to the authenticated user.

---

# **11\. Income APIs**

## **11.1 Create Income**

POST /api/v1/incomes

Request:

{  
  "clientId": "uuid",  
  "amountPaise": 8000000,  
  "currency": "INR",  
  "categoryId": "ObjectId",  
  "sourceName": "Company Salary",  
  "note": "September salary",  
  "incomeDate": "2026-09-01T00:00:00.000Z"  
}

Idempotency:

userId \+ clientId  
---

## **11.2 List Income**

GET /api/v1/incomes

Query:

from  
to  
categoryId  
sourceName  
minAmountPaise  
maxAmountPaise  
limit  
cursor  
---

## **11.3 Get Income**

GET /api/v1/incomes/:incomeId  
---

## **11.4 Update Income**

PATCH /api/v1/incomes/:incomeId  
---

## **11.5 Delete Income**

DELETE /api/v1/incomes/:incomeId

Soft delete.

---

# **12\. Recurring Expense APIs**

## **12.1 Create**

POST /api/v1/recurring-expenses

Request:

{  
  "name": "Netflix",  
  "amountPaise": 64900,  
  "currency": "INR",  
  "categoryId": "ObjectId",  
  "paymentSourceId": "ObjectId",  
  "frequency": "MONTHLY",  
  "startDate": "2026-09-01T00:00:00.000Z",  
  "endDate": null,  
  "nextOccurrenceDate": "2026-10-01T00:00:00.000Z",  
  "autoCreate": true,  
  "reminderEnabled": true  
}  
---

## **12.2 List**

GET /api/v1/recurring-expenses  
---

## **12.3 Get**

GET /api/v1/recurring-expenses/:id  
---

## **12.4 Update**

PATCH /api/v1/recurring-expenses/:id  
---

## **12.5 Delete / Disable**

DELETE /api/v1/recurring-expenses/:id

Soft delete or deactivate according to business state.

---

# **13\. Recurring Income APIs**

## **13.1 Create**

POST /api/v1/recurring-incomes

Request:

{  
  "name": "Salary",  
  "amountPaise": 8000000,  
  "currency": "INR",  
  "categoryId": "ObjectId",  
  "sourceName": "Company",  
  "frequency": "MONTHLY",  
  "startDate": "2026-09-01T00:00:00.000Z",  
  "endDate": null,  
  "nextOccurrenceDate": "2026-10-01T00:00:00.000Z",  
  "autoCreate": true,  
  "reminderEnabled": true  
}  
---

## **13.2 List**

GET /api/v1/recurring-incomes

## **13.3 Get**

GET /api/v1/recurring-incomes/:id

## **13.4 Update**

PATCH /api/v1/recurring-incomes/:id

## **13.5 Delete / Disable**

DELETE /api/v1/recurring-incomes/:id

Generated income must use occurrence-based idempotency.

---

# **14\. Budget APIs**

## **14.1 Create Budget**

POST /api/v1/budgets

Request:

{  
  "name": "September Budget",  
  "period": "MONTHLY",  
  "categoryId": null,  
  "limitPaise": 5000000,  
  "currency": "INR",  
  "startDate": "2026-09-01T00:00:00.000Z",  
  "endDate": "2026-09-30T23:59:59.999Z"  
}

For a category budget:

{  
  "name": "Food Budget",  
  "period": "MONTHLY",  
  "categoryId": "ObjectId",  
  "limitPaise": 800000,  
  "currency": "INR",  
  "startDate": "2026-09-01T00:00:00.000Z"  
}  
---

## **14.2 List Budgets**

GET /api/v1/budgets

Query:

active  
from  
to  
categoryId  
---

## **14.3 Get Budget**

GET /api/v1/budgets/:budgetId  
---

## **14.4 Update Budget**

PATCH /api/v1/budgets/:budgetId  
---

## **14.5 Delete Budget**

DELETE /api/v1/budgets/:budgetId  
---

## **14.6 Budget Progress**

GET /api/v1/budgets/:budgetId/progress

Response:

{  
  "success": true,  
  "data": {  
    "limitPaise": 800000,  
    "spentPaise": 560000,  
    "remainingPaise": 240000,  
    "percentageUsed": 70  
  }  
}

`spentPaise` is derived from actual expenses.

It is not stored as the financial source of truth.

---

# **15\. Dashboard APIs**

## **15.1 Get Dashboard**

GET /api/v1/dashboard

Query:

period=MONTH  
date=2026-09-30

Response:

{  
  "success": true,  
  "data": {  
    "period": {  
      "start": "2026-09-01T00:00:00.000Z",  
      "end": "2026-09-30T23:59:59.999Z"  
    },  
    "incomePaise": 8000000,  
    "expensePaise": 3900000,  
    "remainingPaise": 4100000,  
    "categoryBreakdown": \[\],  
    "budgetProgress": \[\],  
    "recentTransactions": \[\]  
  }  
}

Dashboard values are derived.

---

# **16\. Report APIs**

## **16.1 Monthly Report**

GET /api/v1/reports/monthly

Query:

year=2026  
month=9

Response includes:

Income  
Expense  
Remaining  
Category breakdown  
Budget  
Recurring expenses  
Payment source breakdown  
Comparison  
---

## **16.2 Yearly Report**

GET /api/v1/reports/yearly

Query:

year=2026

Response:

{  
  "success": true,  
  "data": {  
    "year": 2026,  
    "incomePaise": 96000000,  
    "expensePaise": 52000000,  
    "remainingPaise": 44000000,  
    "monthlyBreakdown": \[\],  
    "categoryBreakdown": \[\]  
  }  
}  
---

## **16.3 Custom Report**

GET /api/v1/reports/custom

Query:

from=2026-01-01  
to=2026-09-30  
---

## **16.4 Category Report**

GET /api/v1/reports/categories

Query:

from  
to  
---

## **16.5 Payment Source Report**

GET /api/v1/reports/payment-sources

Query:

from  
to  
---

## **16.6 Comparison Report**

GET /api/v1/reports/comparison

Request/query:

currentFrom  
currentTo  
previousFrom  
previousTo

Response may include:

{  
  "currentExpensePaise": 3900000,  
  "previousExpensePaise": 3500000,  
  "differencePaise": 400000,  
  "percentageChange": 11.43  
}

The API should provide descriptive comparison data; interpretation text belongs to the application/insight layer.

---

# **17\. Export APIs**

Exports are asynchronous.

## **17.1 Create Export**

POST /api/v1/exports

Request:

{  
  "type": "EXPENSES",  
  "format": "XLSX",  
  "from": "2026-09-01T00:00:00.000Z",  
  "to": "2026-09-30T23:59:59.999Z"  
}

Supported types:

EXPENSES  
INCOMES  
TRANSACTIONS  
MONTHLY\_REPORT  
YEARLY\_REPORT

Supported formats:

CSV  
XLSX

Response:

202 Accepted  
{  
  "success": true,  
  "data": {  
    "exportId": "ObjectId",  
    "status": "PENDING"  
  }  
}  
---

## **17.2 Get Export Status**

GET /api/v1/exports/:exportId

Response:

{  
  "success": true,  
  "data": {  
    "id": "ObjectId",  
    "status": "COMPLETED",  
    "format": "XLSX",  
    "fileId": "ObjectId",  
    "createdAt": "2026-09-30T04:00:00.000Z",  
    "completedAt": "2026-09-30T04:00:08.000Z"  
  }  
}  
---

## **17.3 Download Export**

GET /api/v1/exports/:exportId/download

The API validates ownership and returns a short-lived signed download URL or streams the file.

The actual file is stored in Cloudflare R2.

---

## **17.4 List Export History**

GET /api/v1/exports

Query:

status  
format  
type  
limit  
cursor  
---

# **18\. Group APIs**

## **18.1 Create Group**

POST /api/v1/groups

Request:

{  
  "name": "Goa Trip",  
  "description": "Goa trip expenses",  
  "type": "TRIP",  
  "currency": "INR"  
}

The authenticated user becomes the owner.

---

## **18.2 List Groups**

GET /api/v1/groups

Returns groups where the user is an active member.

---

## **18.3 Get Group**

GET /api/v1/groups/:groupId

Only active group members may access the group.

---

## **18.4 Update Group**

PATCH /api/v1/groups/:groupId

Owner/admin authorization applies.

---

## **18.5 Delete Group**

DELETE /api/v1/groups/:groupId

Soft delete.

---

# **19\. Group Member APIs**

## **19.1 List Members**

GET /api/v1/groups/:groupId/members  
---

## **19.2 Add Member**

POST /api/v1/groups/:groupId/members

Request:

{  
  "userId": "ObjectId"  
}

Membership authorization must be checked.

---

## **19.3 Update Member Role**

PATCH /api/v1/groups/:groupId/members/:userId

Request:

{  
  "role": "ADMIN"  
}  
---

## **19.4 Remove Member**

DELETE /api/v1/groups/:groupId/members/:userId

Membership should be deactivated/soft deleted according to group rules.

---

# **20\. Shared Expense APIs**

Shared expenses are separate from personal expenses.

## **20.1 Create Shared Expense**

POST /api/v1/groups/:groupId/shared-expenses

Request:

{  
  "clientId": "uuid",  
  "description": "Dinner",  
  "totalAmountPaise": 120000,  
  "currency": "INR",  
  "paidByUserId": "ObjectId",  
  "splitType": "EQUAL",  
  "expenseDate": "2026-09-28T14:00:00.000Z",  
  "categoryId": "ObjectId",  
  "note": "Dinner"  
}

The API must verify:

* caller is active group member  
* paidByUserId is an active group member  
* all split members are active group members  
* total split amount equals total expense amount

---

## **20.2 Exact Amount Split**

{  
  "splitType": "EXACT\_AMOUNT",  
  "splits": \[  
    {  
      "userId": "ObjectId",  
      "amountPaise": 40000  
    },  
    {  
      "userId": "ObjectId",  
      "amountPaise": 40000  
    },  
    {  
      "userId": "ObjectId",  
      "amountPaise": 40000  
    }  
  \]  
}

Sum of splits must equal total amount.

---

## **20.3 Percentage Split**

{  
  "splitType": "PERCENTAGE",  
  "splits": \[  
    {  
      "userId": "ObjectId",  
      "percentage": 50  
    },  
    {  
      "userId": "ObjectId",  
      "percentage": 25  
    },  
    {  
      "userId": "ObjectId",  
      "percentage": 25  
    }  
  \]  
}

Percentage total must equal 100\.

---

## **20.4 Shares Split**

{  
  "splitType": "SHARES",  
  "splits": \[  
    {  
      "userId": "ObjectId",  
      "shares": 2  
    },  
    {  
      "userId": "ObjectId",  
      "shares": 1  
    },  
    {  
      "userId": "ObjectId",  
      "shares": 1  
    }  
  \]  
}  
---

## **20.5 List Shared Expenses**

GET /api/v1/groups/:groupId/shared-expenses

Query:

from  
to  
paidByUserId  
splitType  
limit  
cursor  
---

## **20.6 Get Shared Expense**

GET /api/v1/groups/:groupId/shared-expenses/:sharedExpenseId  
---

## **20.7 Update Shared Expense**

PATCH /api/v1/groups/:groupId/shared-expenses/:sharedExpenseId

Version validation is required.

---

## **20.8 Delete Shared Expense**

DELETE /api/v1/groups/:groupId/shared-expenses/:sharedExpenseId

Soft delete.

---

# **21\. Group Balance APIs**

## **21.1 Group Balance**

GET /api/v1/groups/:groupId/balance

Balance is derived from:

Shared Expenses  
\+  
Expense Splits  
\+  
Settlements

No permanent balance document is the source of truth.

Response:

{  
  "success": true,  
  "data": {  
    "members": \[  
      {  
        "userId": "ObjectId",  
        "netBalancePaise": 80000  
      }  
    \]  
  }  
}  
---

## **21.2 My Group Balance**

GET /api/v1/groups/:groupId/balance/me

Response:

{  
  "success": true,  
  "data": {  
    "netBalancePaise": 80000,  
    "owes": \[\],  
    "owedBy": \[\]  
  }  
}  
---

# **22\. Settlement APIs**

## **22.1 Create Settlement**

POST /api/v1/groups/:groupId/settlements

Request:

{  
  "clientId": "uuid",  
  "fromUserId": "ObjectId",  
  "toUserId": "ObjectId",  
  "amountPaise": 40000,  
  "currency": "INR",  
  "settlementDate": "2026-09-30T04:00:00.000Z",  
  "note": "Dinner settlement"  
}

Validation:

* Both users are group members.  
* Amount \> 0\.  
* Settlement must not exceed applicable outstanding balance unless partial/overpayment rules explicitly permit it.

Idempotency:

userId \+ clientId  
---

## **22.2 List Settlements**

GET /api/v1/groups/:groupId/settlements  
---

## **22.3 Get Settlement**

GET /api/v1/groups/:groupId/settlements/:settlementId  
---

## **22.4 Update Settlement**

PATCH /api/v1/groups/:groupId/settlements/:settlementId  
---

## **22.5 Cancel Settlement**

POST /api/v1/groups/:groupId/settlements/:settlementId/cancel

The settlement should not be hard deleted.

---

# **23\. File APIs**

Files are stored in Cloudflare R2.

MongoDB stores metadata.

## **23.1 Create Upload Request**

POST /api/v1/files/upload-url

Request:

{  
  "fileName": "receipt.jpg",  
  "mimeType": "image/jpeg",  
  "sizeBytes": 245000,  
  "purpose": "RECEIPT"  
}

Response:

{  
  "success": true,  
  "data": {  
    "fileId": "ObjectId",  
    "uploadUrl": "signed-url",  
    "storageKey": "users/\<userId\>/receipts/\<uuid\>.jpg",  
    "expiresAt": "2026-09-30T04:15:00.000Z"  
  }  
}

Credentials for R2 must never be exposed.

---

## **23.2 Complete Upload**

POST /api/v1/files/:fileId/complete

The server verifies upload state and marks the file available.

---

## **23.3 Get File Metadata**

GET /api/v1/files/:fileId  
---

## **23.4 Delete File**

DELETE /api/v1/files/:fileId

Soft delete metadata and apply storage cleanup policy.

---

# **24\. Receipt APIs**

Receipts are metadata around uploaded files and future OCR.

## **24.1 Create Receipt**

POST /api/v1/receipts

Request:

{  
  "fileId": "ObjectId",  
  "expenseId": null  
}

Initial status:

ocrStatus \= PENDING  
---

## **24.2 Get Receipt**

GET /api/v1/receipts/:receiptId  
---

## **24.3 Attach Receipt to Expense**

PATCH /api/v1/receipts/:receiptId

Request:

{  
  "expenseId": "ObjectId"  
}

OCR must create an expense draft and must not automatically create a financial transaction without user confirmation.

---

# **25\. Notification APIs**

## **25.1 List Notifications**

GET /api/v1/notifications

Query:

status  
type  
limit  
cursor  
---

## **25.2 Mark Notification Read**

POST /api/v1/notifications/:notificationId/read  
---

## **25.3 Mark All Read**

POST /api/v1/notifications/read-all  
---

# **26\. Device / Push Token APIs**

Push notification delivery requires device registration.

## **26.1 Register Device**

POST /api/v1/devices

Request:

{  
  "platform": "IOS",  
  "pushToken": "token",  
  "appVersion": "1.0.0"  
}

Supported:

IOS  
ANDROID

## **26.2 Remove Device**

DELETE /api/v1/devices/:deviceId

Device records are infrastructure data and must remain scoped to the authenticated user.

---

# **27\. Goals APIs**

Goals are a future/P1 capability but are represented in the database design.

## **27.1 Create Goal**

POST /api/v1/goals

Request:

{  
  "name": "MacBook",  
  "targetAmountPaise": 15000000,  
  "currentAmountPaise": 7000000,  
  "targetDate": "2027-06-01T00:00:00.000Z"  
}

## **27.2 List Goals**

GET /api/v1/goals

## **27.3 Get Goal**

GET /api/v1/goals/:goalId

## **27.4 Update Goal**

PATCH /api/v1/goals/:goalId

## **27.5 Delete Goal**

DELETE /api/v1/goals/:goalId  
---

# **28\. Subscription APIs**

This collection represents Kharchiva's own subscription/billing system.

It is separate from recurring user expenses.

## **28.1 Current Subscription**

GET /api/v1/subscription

## **28.2 Create / Start Subscription**

POST /api/v1/subscription

Provider-specific billing implementation is isolated behind a billing service.

## **28.3 Cancel Subscription**

POST /api/v1/subscription/cancel

## **28.4 Subscription History**

GET /api/v1/subscription/history  
---

# **29\. Insights APIs**

Insights are derived data and must never replace financial source records.

## **29.1 List Insights**

GET /api/v1/insights

Query:

status  
type  
from  
to  
limit  
cursor

## **29.2 Get Insight**

GET /api/v1/insights/:insightId

## **29.3 Mark Insight Read**

POST /api/v1/insights/:insightId/read

AI-generated insights must be treated as derived/product-layer information.

---

# **30\. Sync APIs**

Offline-first synchronization is a core requirement.

The mobile SQLite database is responsible for maintaining the local sync queue.

---

## **30.1 Push Local Changes**

POST /api/v1/sync/push

Request:

{  
  "changes": \[  
    {  
      "entityType": "EXPENSE",  
      "entityId": "ObjectId",  
      "operation": "CREATE",  
      "clientId": "uuid",  
      "version": 1,  
      "payload": {}  
    }  
  \]  
}

Supported operations:

CREATE  
UPDATE  
DELETE

Supported entities include:

EXPENSE  
INCOME  
CATEGORY  
PAYMENT\_SOURCE  
BUDGET  
RECURRING\_EXPENSE  
RECURRING\_INCOME  
GROUP  
GROUP\_MEMBER  
SHARED\_EXPENSE  
EXPENSE\_SPLIT  
SETTLEMENT  
GOAL  
---

## **30.2 Push Response**

{  
  "success": true,  
  "data": {  
    "results": \[  
      {  
        "entityType": "EXPENSE",  
        "entityId": "ObjectId",  
        "clientId": "uuid",  
        "status": "SYNCED",  
        "serverVersion": 2  
      }  
    \]  
  }  
}

Possible statuses:

SYNCED  
DUPLICATE  
CONFLICT  
REJECTED  
---

## **30.3 Pull Server Changes**

GET /api/v1/sync/pull

Query:

cursor  
limit

Response:

{  
  "success": true,  
  "data": {  
    "changes": \[\],  
    "nextCursor": "cursor",  
    "hasMore": true  
  }  
}  
---

## **30.4 Full Sync / Recovery**

POST /api/v1/sync/reconcile

Used for recovery when the client has lost local sync state or requires a controlled reconciliation.

The server must return only records owned by the authenticated user.

---

# **31\. Sync Conflict Handling**

Every syncable entity uses versioning.

Example:

Client version \= 3  
Server version \= 4

The server detects a conflict.

Recommended flow:

Client Update  
      ↓  
Version Check  
      ↓  
No Conflict ──→ Apply  
      │  
      └── Conflict  
             ↓  
       Return latest server state  
             ↓  
       Client reconciles

Financial records must not be silently overwritten.

Conflict behavior may be entity-specific.

---

# **32\. Nothing Today API**

The `NO_EXPENSE`, `MISSING`, and `RECORDED` states are primarily derived application states.

## **32.1 Get Daily Status**

GET /api/v1/days/:date/status

Example:

GET /api/v1/days/2026-09-30/status

Response:

{  
  "success": true,  
  "data": {  
    "date": "2026-09-30",  
    "status": "RECORDED",  
    "expenseCount": 3,  
    "totalExpensePaise": 125000  
  }  
}

Possible status:

NO\_EXPENSE  
MISSING  
RECORDED

The API must not automatically assume that a day without expenses means the user had no expenses.

---

# **33\. Catch-up APIs**

Catch-up allows the user to record missed historical expenses.

## **33.1 Get Catch-up Days**

GET /api/v1/catch-up

Query:

from  
to

Response:

{  
  "success": true,  
  "data": {  
    "days": \[  
      {  
        "date": "2026-09-27",  
        "status": "MISSING"  
      }  
    \]  
  }  
}

Expense creation continues to use the normal expense API with the historical `expenseDate`.

---

# **34\. Health APIs**

## **34.1 Health**

GET /api/v1/health

Response:

{  
  "status": "ok"  
}

## **34.2 Readiness**

GET /api/v1/health/ready

Checks application dependencies required for serving traffic.

Health endpoints must not expose secrets or sensitive infrastructure information.

---

# **35\. API Security**

The API must implement:

* JWT access tokens  
* Refresh token security  
* OTP rate limiting  
* Request validation  
* Authentication guards  
* Authorization guards  
* User ownership checks  
* Group membership checks  
* Input sanitization  
* Rate limiting  
* Secure HTTP headers  
* HTTPS  
* File type validation  
* File size validation  
* Signed R2 upload/download URLs  
* No client access to R2 credentials  
* No sensitive data in logs

---

# **36\. Financial Authorization Rules**

## **Personal Data**

A user can access only their own:

* Expenses  
* Income  
* Categories  
* Payment sources  
* Budgets  
* Recurring expenses  
* Recurring income  
* Goals  
* Files  
* Receipts  
* Notifications  
* Subscription  
* Insights

## **Group Data**

A user can access group data only when they are an active group member.

The API must verify membership before accessing:

shared\_expenses  
expense\_splits  
settlements  
group balances

A group member must never gain access to another member's private personal expenses.

---

# **37\. API Versioning**

Current API version:

v1

All endpoints are prefixed:

/api/v1

Breaking API changes require a new major version.

Example:

/api/v2

Non-breaking additions can remain within v1.

---

# **38\. Rate Limiting**

Rate limiting should be applied more strictly to:

* OTP requests  
* OTP verification  
* Authentication endpoints  
* File upload URL generation  
* Export generation  
* Search-heavy endpoints  
* Sync endpoints

Normal expense creation should remain responsive while still having abuse protection.

---

# **39\. Background Job Integration**

The API creates jobs; workers perform asynchronous work.

Architecture:

NestJS API  
   ↓  
BullMQ  
   ↓  
Redis  
   ↓  
Worker

Jobs include:

RECURRING\_EXPENSE\_GENERATION  
RECURRING\_INCOME\_GENERATION  
REMINDER\_GENERATION  
MONTHLY\_SUMMARY  
YEARLY\_SUMMARY  
EXPORT\_GENERATION  
EMAIL\_SEND  
SYNC\_RETRY  
OCR\_PROCESSING  
AI\_INSIGHT\_GENERATION  
R2\_CLEANUP

Jobs must have:

* Retry policy  
* Backoff  
* Idempotency  
* Failure handling  
* Logging  
* Dead-letter/error handling where appropriate

---

# **40\. Email Integration**

Email is handled through the EmailService abstraction.

Provider:

Resend

Potential email jobs:

WELCOME\_EMAIL  
SECURITY\_EMAIL  
EXPORT\_READY\_EMAIL  
MONTHLY\_SUMMARY\_EMAIL  
ACCOUNT\_EMAIL

The API should not directly block a user request while sending non-critical email.

---

# **41\. API Module Structure**

Recommended NestJS modular monolith structure:

src/  
├── auth/  
├── users/  
├── onboarding/  
├── categories/  
├── payment-sources/  
├── expenses/  
├── incomes/  
├── recurring-expenses/  
├── recurring-incomes/  
├── budgets/  
├── dashboard/  
├── reports/  
├── exports/  
├── groups/  
├── group-members/  
├── shared-expenses/  
├── settlements/  
├── files/  
├── receipts/  
├── notifications/  
├── devices/  
├── goals/  
├── subscriptions/  
├── insights/  
├── sync/  
├── jobs/  
├── email/  
└── common/

The application remains a modular monolith.

These modules are not independent microservices.

---

# **42\. Expense Creation Flow**

Normal online flow:

React Native  
    ↓  
POST /expenses  
    ↓  
Auth Guard  
    ↓  
Validation  
    ↓  
Ownership Validation  
    ↓  
Idempotency Check  
    ↓  
MongoDB  
    ↓  
Expense Created  
    ↓  
Response

Offline flow:

React Native  
    ↓  
SQLite  
    ↓  
Local Expense Created  
    ↓  
sync\_queue  
    ↓  
Network Available  
    ↓  
POST /sync/push  
    ↓  
NestJS  
    ↓  
MongoDB  
---

# **43\. Quick Expense Flow**

User  
 ↓  
Quick Add  
 ↓  
Amount \+ Category  
 ↓  
SQLite  
 ↓  
UI closes immediately  
 ↓  
Background Sync  
 ↓  
API  
 ↓  
MongoDB

The API must support the same financial integrity and idempotency rules as normal expense creation.

---

# **44\. Report Flow**

React Native  
     ↓  
GET /reports/monthly  
     ↓  
NestJS  
     ↓  
MongoDB Aggregation  
     ↓  
Income \+ Expenses \+ Categories \+ Budget  
     ↓  
Monthly Summary

Reports are derived from source financial records.

---

# **45\. Export Flow**

React Native  
     ↓  
POST /exports  
     ↓  
NestJS  
     ↓  
BullMQ  
     ↓  
Redis  
     ↓  
Export Worker  
     ↓  
MongoDB aggregation  
     ↓  
Generate CSV/XLSX  
     ↓  
Cloudflare R2  
     ↓  
Export Metadata  
     ↓  
GET /exports/:id  
     ↓  
Download

Large exports must not block normal API requests.

---

# **46\. Shared Expense Flow**

Create Group  
     ↓  
Add Members  
     ↓  
Create Shared Expense  
     ↓  
Validate Members  
     ↓  
Calculate Splits  
     ↓  
Store Shared Expense  
     ↓  
Store Expense Splits  
     ↓  
Calculate Derived Balance

Settlement:

Outstanding Balance  
       ↓  
Create Settlement  
       ↓  
Settlement Record  
       ↓  
Recalculate Derived Balance  
---

# **47\. Data Consistency Rules**

The API must enforce:

1. Expense amount must be positive.  
2. Income amount must be positive.  
3. Money must be stored as integer paise.  
4. Currency must be INR for MVP.  
5. User ownership must be validated server-side.  
6. Group membership must be validated server-side.  
7. Shared expense splits must equal the total expense.  
8. Percentage splits must total 100%.  
9. Recurring occurrences must be idempotent.  
10. Financial records should be soft deleted.  
11. Reports must calculate from source records.  
12. Balances must be derived.  
13. Redis must never be the financial source of truth.  
14. OCR must not automatically create a confirmed expense.  
15. Duplicate retries must not create duplicate financial transactions.

---

# **48\. Transaction and Atomicity Rules**

MongoDB transactions should be used only where atomic multi-document consistency is required.

Examples:

### **Shared Expense Creation**

Potentially atomic:

shared\_expense  
\+  
expense\_splits

### **Settlement**

Settlement creation must maintain a consistent state.

### **Recurring Generation**

Creation of the generated transaction and occurrence/idempotency handling must prevent duplicate financial records.

Simple single-document operations should not require a MongoDB transaction unnecessarily.

---

# **49\. API Observability**

Every request should have a request/correlation ID.

Example:

X-Request-Id: uuid

Logs should include:

* requestId  
* authenticated user ID where appropriate  
* endpoint  
* HTTP method  
* status  
* duration  
* error code  
* job ID when applicable

Never log:

* OTP  
* access tokens  
* refresh tokens  
* passwords  
* R2 credentials  
* sensitive financial payloads unnecessarily

---

# **50\. API Testing Requirements**

Every module should have:

## **Unit Tests**

* Validation  
* Business rules  
* Calculations  
* Idempotency  
* Authorization

## **Integration Tests**

* MongoDB persistence  
* Redis/BullMQ jobs  
* R2 integration abstraction  
* Authentication

## **API/E2E Tests**

Critical flows:

Register  
Login  
Complete onboarding  
Create expense  
Create quick expense  
Create income  
Create budget  
Create recurring expense  
Create recurring income  
Monthly report  
Yearly report  
Export CSV  
Export XLSX  
Create group  
Add member  
Create shared expense  
Create split  
Create settlement  
Sync offline expense  
Resolve sync conflict  
---

# **51\. Endpoint Summary**

## **Authentication**

POST   /auth/phone/request-otp  
POST   /auth/phone/verify-otp  
POST   /auth/google  
POST   /auth/refresh  
POST   /auth/logout

## **Users**

GET    /users/me  
PATCH  /users/me  
PATCH  /users/me/preferences  
POST   /users/me/onboarding/complete

## **Categories**

GET    /categories  
POST   /categories  
PATCH  /categories/:id  
DELETE /categories/:id

## **Payment Sources**

GET    /payment-sources  
POST   /payment-sources  
PATCH  /payment-sources/:id  
DELETE /payment-sources/:id

## **Expenses**

GET    /expenses  
GET    /expenses/search  
GET    /expenses/:id  
POST   /expenses  
POST   /expenses/quick  
PATCH  /expenses/:id  
DELETE /expenses/:id

## **Income**

GET    /incomes  
GET    /incomes/:id  
POST   /incomes  
PATCH  /incomes/:id  
DELETE /incomes/:id

## **Recurring Expenses**

GET    /recurring-expenses  
GET    /recurring-expenses/:id  
POST   /recurring-expenses  
PATCH  /recurring-expenses/:id  
DELETE /recurring-expenses/:id

## **Recurring Income**

GET    /recurring-incomes  
GET    /recurring-incomes/:id  
POST   /recurring-incomes  
PATCH  /recurring-incomes/:id  
DELETE /recurring-incomes/:id

## **Budgets**

GET    /budgets  
GET    /budgets/:id  
GET    /budgets/:id/progress  
POST   /budgets  
PATCH  /budgets/:id  
DELETE /budgets/:id

## **Dashboard**

GET    /dashboard

## **Reports**

GET    /reports/monthly  
GET    /reports/yearly  
GET    /reports/custom  
GET    /reports/categories  
GET    /reports/payment-sources  
GET    /reports/comparison

## **Exports**

GET    /exports  
GET    /exports/:id  
GET    /exports/:id/download  
POST   /exports

## **Groups**

GET    /groups  
GET    /groups/:id  
POST   /groups  
PATCH  /groups/:id  
DELETE /groups/:id

## **Group Members**

GET    /groups/:groupId/members  
POST   /groups/:groupId/members  
PATCH  /groups/:groupId/members/:userId  
DELETE /groups/:groupId/members/:userId

## **Shared Expenses**

GET    /groups/:groupId/shared-expenses  
GET    /groups/:groupId/shared-expenses/:id  
POST   /groups/:groupId/shared-expenses  
PATCH  /groups/:groupId/shared-expenses/:id  
DELETE /groups/:groupId/shared-expenses/:id

## **Group Balances**

GET    /groups/:groupId/balance  
GET    /groups/:groupId/balance/me

## **Settlements**

GET    /groups/:groupId/settlements  
GET    /groups/:groupId/settlements/:id  
POST   /groups/:groupId/settlements  
PATCH  /groups/:groupId/settlements/:id  
POST   /groups/:groupId/settlements/:id/cancel

## **Files**

POST   /files/upload-url  
POST   /files/:id/complete  
GET    /files/:id  
DELETE /files/:id

## **Receipts**

POST   /receipts  
GET    /receipts/:id  
PATCH  /receipts/:id

## **Notifications**

GET    /notifications  
POST   /notifications/:id/read  
POST   /notifications/read-all

## **Devices**

POST   /devices  
DELETE /devices/:id

## **Goals**

GET    /goals  
GET    /goals/:id  
POST   /goals  
PATCH  /goals/:id  
DELETE /goals/:id

## **Subscription**

GET    /subscription  
POST   /subscription  
POST   /subscription/cancel  
GET    /subscription/history

## **Insights**

GET    /insights  
GET    /insights/:id  
POST   /insights/:id/read

## **Sync**

POST   /sync/push  
GET    /sync/pull  
POST   /sync/reconcile

## **Daily Status / Catch-up**

GET    /days/:date/status  
GET    /catch-up

## **Health**

GET    /health  
GET    /health/ready  
---

# **52\. Final API Architecture**

                   React Native  
                         │  
                         │ HTTPS / REST  
                         ▼  
                ┌──────────────────┐  
                │   NestJS API     │  
                │ Modular Monolith │  
                └────────┬─────────┘  
                         │  
       ┌─────────────────┼──────────────────┐  
       │                 │                  │  
       ▼                 ▼                  ▼  
 MongoDB Atlas       Redis/BullMQ       Cloudflare R2  
 Source of Truth     Background Jobs     Files/Exports  
       │                 │  
       │                 ▼  
       │               Workers  
       │                 │  
       │          ┌──────┴──────┐  
       │          │             │  
       │        Resend      Future OCR/AI  
       │  
       ▼  
 Financial Records

Mobile offline path:

React Native  
     ↓  
SQLite  
     ↓  
Local Sync Queue  
     ↓  
Network Available  
     ↓  
POST /sync/push  
     ↓  
NestJS  
     ↓  
MongoDB Atlas  
---

# **53\. Final Decision**

**Kharchiva API Contract v1.0** is designed to consume the finalized **Database Design v1.1** without changing the database source of truth.

The API follows these final architectural decisions:

| Area | Decision |
| ----- | ----- |
| API Style | REST |
| API Version | v1 |
| Backend | Node.js \+ NestJS |
| Architecture | Modular Monolith |
| Database | MongoDB Atlas |
| Mobile DB | SQLite |
| Queue | BullMQ |
| Queue Backend | Redis |
| File Storage | Cloudflare R2 |
| Email | Resend |
| Currency | INR |
| Money | Integer paise |
| Primary ID | MongoDB ObjectId |
| Client ID | UUID |
| Authentication | Phone OTP \+ Google |
| Offline | Supported |
| Sync | Background |
| Idempotency | Required |
| Versioning | Required |
| Soft Delete | Required for financial records |
| Reports | MongoDB aggregation |
| Exports | CSV \+ XLSX |
| Export Processing | Background job |
| Shared Money | Separate domain |
| Group Balance | Derived |
| OCR | Future |
| AI Insights | Future |

The API contract is now the implementation contract between:

React Native  
        ↕  
    NestJS API  
        ↕  
 MongoDB / Redis / R2

The next implementation document should be:

**Kharchiva — Backend Architecture & NestJS Module Design v1.0**

