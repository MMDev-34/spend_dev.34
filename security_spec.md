# Spend Firestore Security Specification

## 1. Data Invariants

1. **Identity & Ownership Bound:** No user may read, create, update, or delete any record (transactions, loans, people, budgets, recurring bills, planned items, settings) that belongs to another user (`userId == request.auth.uid`).
2. **User Profile Privacy:** User profiles in `/users/{userId}` can only be read and written by the authentic owner (`request.auth.uid == userId`). No blanket reads.
3. **Immutability of Ownership:** The `userId` property cannot be modified during updates (`incoming().userId == existing().userId`).
4. **ID Format Hardening:** Document IDs must conform to `isValidId` (`size() <= 128` and matching alphanumeric/dash/underscore `^[a-zA-Z0-9_\-]+$`).
5. **No Negative or NaN Amounts:** Financial numerical amounts (`amount`) must be non-negative numbers.
6. **Strict Schema Constraints:** Payloads cannot contain undefined ghost/shadow fields (`affectedKeys().hasOnly(...)` during updates and `keys().hasAll()` / `keys().hasOnly()` on creation).
7. **Temporal Integrity:** Creation and modification timestamps must match server request timestamps (`request.time`) or valid ISO string boundaries.
8. **Relational Consistency:** Loans must reference a valid person belonging to the same user.
9. **Query Isolation (Pillar 8):** List queries must enforce `resource.data.userId == request.auth.uid`. Blanket list operations are strictly forbidden.
10. **State Immutability:** Fully settled loans or completed items cannot have unauthorized status mutations.

## 2. The "Dirty Dozen" Payloads (12 Adversarial Payloads)

1. **Payload 1 (Identity Spoofing - Impersonation Write):**
   Unauthenticated user or user `attacker_123` attempting to write a transaction with `userId: "victim_456"`.
   ```json
   {
     "id": "tx-exploit-1",
     "userId": "victim_456",
     "type": "expense",
     "amount": 50000,
     "categoryId": "cat-food",
     "date": "2026-10-10"
   }
   ```
   *Expected:* PERMISSION_DENIED.

2. **Payload 2 (Ghost Field Injection / Shadow Update):**
   Authenticated user attempting to inject administrative or shadow properties like `isAdmin: true` into a transaction update.
   ```json
   {
     "amount": 25000,
     "isAdmin": true,
     "role": "superadmin"
   }
   ```
   *Expected:* PERMISSION_DENIED.

3. **Payload 3 (ID Poisoning Attack):**
   Attacker attempting to write to a document with a 10KB junk-character document ID.
   ```json
   {
     "path": "/transactions/AAAAAA...[10000 chars]",
     "userId": "attacker_123"
   }
   ```
   *Expected:* PERMISSION_DENIED (`isValidId` rejects).

4. **Payload 4 (Owner Relinquishing / Reassignment):**
   Attacker attempting to update an existing loan by changing its `userId` to a target victim.
   ```json
   {
     "userId": "victim_456"
   }
   ```
   *Expected:* PERMISSION_DENIED (Immutable field check).

5. **Payload 5 (PII Snoop Attack):**
   User `user_A` issuing a direct `get()` on `/users/user_B`.
   *Expected:* PERMISSION_DENIED.

6. **Payload 6 (Blanket Query Scraping):**
   User issuing a `list` query across `/transactions` without filtering by `userId == auth.uid`.
   *Expected:* PERMISSION_DENIED.

7. **Payload 7 (Negative / Poisoned Amount Value):**
   Attacker injecting a negative amount or string into transaction minor units.
   ```json
   {
     "id": "tx-neg-1",
     "userId": "attacker_123",
     "type": "expense",
     "amount": -99999999,
     "categoryId": "cat-food",
     "date": "2026-10-10"
   }
   ```
   *Expected:* PERMISSION_DENIED.

8. **Payload 8 (Invalid Enum Value Bypass):**
   Transaction with arbitrary invalid type enum `"stolen_funds"`.
   ```json
   {
     "id": "tx-enum-1",
     "userId": "attacker_123",
     "type": "stolen_funds",
     "amount": 1000,
     "categoryId": "cat-food",
     "date": "2026-10-10"
   }
   ```
   *Expected:* PERMISSION_DENIED.

9. **Payload 9 (Oversized Note Buffer Bomb):**
   Attacker injecting a 500KB memo into the `note` field to exhaust database bandwidth/storage.
   ```json
   {
     "id": "tx-bomb-1",
     "userId": "attacker_123",
     "type": "expense",
     "amount": 1000,
     "categoryId": "cat-food",
     "date": "2026-10-10",
     "note": "A".repeat(500000)
   }
   ```
   *Expected:* PERMISSION_DENIED (`size() <= 512` boundary check).

10. **Payload 10 (Settings Privilege Escalation):**
    User attempting to write to `/userSettings/another_user_id`.
    *Expected:* PERMISSION_DENIED.

11. **Payload 11 (Unauthenticated Write):**
    Anonymous/unauthenticated visitor attempting to write or read any document.
    *Expected:* PERMISSION_DENIED.

12. **Payload 12 (Foreign Loan Repayment Injection):**
    Attacker attempting to inject repayments into another user's loan record.
    *Expected:* PERMISSION_DENIED.
