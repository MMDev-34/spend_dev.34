/**
 * Security Rule Tests for Spend Firestore Rules
 * Validates Dirty Dozen payloads and security assertions.
 */

export interface TestPayload {
  description: string;
  collection: string;
  docId: string;
  authUid?: string;
  data: Record<string, any>;
  expectedOutcome: "ALLOW" | "DENY";
}

export const DIRTY_DOZEN_TESTS: TestPayload[] = [
  {
    description: "1. Impersonation Write - user A writing transaction for user B",
    collection: "transactions",
    docId: "tx-exploit-1",
    authUid: "attacker_123",
    data: {
      id: "tx-exploit-1",
      userId: "victim_456",
      type: "expense",
      amount: 50000,
      categoryId: "cat-food",
      date: "2026-10-10",
    },
    expectedOutcome: "DENY",
  },
  {
    description: "2. Ghost Field Injection - injecting admin privileges",
    collection: "transactions",
    docId: "tx-2",
    authUid: "attacker_123",
    data: {
      id: "tx-2",
      userId: "attacker_123",
      type: "expense",
      amount: 5000,
      categoryId: "cat-food",
      date: "2026-10-10",
      isAdmin: true,
      role: "admin",
    },
    expectedOutcome: "DENY",
  },
  {
    description: "3. ID Poisoning - invalid characters in doc ID",
    collection: "transactions",
    docId: "tx-invalid$$/chars!",
    authUid: "attacker_123",
    data: {
      id: "tx-invalid$$/chars!",
      userId: "attacker_123",
      type: "expense",
      amount: 1000,
      categoryId: "cat-food",
      date: "2026-10-10",
    },
    expectedOutcome: "DENY",
  },
  {
    description: "4. Cross-user reading / users profile PII snoop",
    collection: "users",
    docId: "victim_456",
    authUid: "attacker_123",
    data: {},
    expectedOutcome: "DENY",
  },
  {
    description: "5. Negative amount injection",
    collection: "transactions",
    docId: "tx-neg-1",
    authUid: "attacker_123",
    data: {
      id: "tx-neg-1",
      userId: "attacker_123",
      type: "expense",
      amount: -50000,
      categoryId: "cat-food",
      date: "2026-10-10",
    },
    expectedOutcome: "DENY",
  },
  {
    description: "6. Invalid Enum value injection",
    collection: "transactions",
    docId: "tx-enum-1",
    authUid: "attacker_123",
    data: {
      id: "tx-enum-1",
      userId: "attacker_123",
      type: "unauthorized_payout",
      amount: 1000,
      categoryId: "cat-food",
      date: "2026-10-10",
    },
    expectedOutcome: "DENY",
  },
  {
    description: "7. Buffer bomb - oversized note",
    collection: "transactions",
    docId: "tx-bomb-1",
    authUid: "attacker_123",
    data: {
      id: "tx-bomb-1",
      userId: "attacker_123",
      type: "expense",
      amount: 1000,
      categoryId: "cat-food",
      date: "2026-10-10",
      note: "X".repeat(2000),
    },
    expectedOutcome: "DENY",
  },
  {
    description: "8. Unauthenticated write",
    collection: "transactions",
    docId: "tx-unauth-1",
    authUid: undefined,
    data: {
      id: "tx-unauth-1",
      userId: "anon",
      type: "expense",
      amount: 1000,
      categoryId: "cat-food",
      date: "2026-10-10",
    },
    expectedOutcome: "DENY",
  },
  {
    description: "9. Cross-user settings modification",
    collection: "userSettings",
    docId: "victim_456",
    authUid: "attacker_123",
    data: {
      userId: "victim_456",
      currency: "$",
      theme: "dark",
      weekStartsOn: "monday",
      numberFormat: "comma",
    },
    expectedOutcome: "DENY",
  },
  {
    description: "10. Tampering with loan belonging to another user",
    collection: "loans",
    docId: "loan-victim-1",
    authUid: "attacker_123",
    data: {
      userId: "victim_456",
      amount: 0,
    },
    expectedOutcome: "DENY",
  },
  {
    description: "11. Category with oversized name string",
    collection: "categories",
    docId: "cat-oversized",
    authUid: "attacker_123",
    data: {
      id: "cat-oversized",
      userId: "attacker_123",
      name: "C".repeat(500),
      type: "expense",
    },
    expectedOutcome: "DENY",
  },
  {
    description: "12. Valid authentic owner write",
    collection: "transactions",
    docId: "tx-valid-1",
    authUid: "user_789",
    data: {
      id: "tx-valid-1",
      userId: "user_789",
      type: "expense",
      amount: 25000,
      categoryId: "cat-food",
      date: "2026-10-10",
    },
    expectedOutcome: "ALLOW",
  },
];
