const BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.error || err.message || "Request failed");
  }

  return res.json();
}

export const api = {
  register: (data: { name: string; email: string; password: string }) =>
    request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>("/auth/logout", { method: "POST" }),

  me: () =>
    request<{ user: User }>("/auth/me"),

  createAccount: () =>
    request<{ account: Account }>("/accounts", { method: "POST" }),

  getAccountDetails: () =>
    request<{ accounts: Account[] }>("/accounts"),

  getAccountBalance: (id: string) =>
    request<{ balance: number }>(`/accounts/balance/${id}`),

  sendTransaction: (data: {
    fromAccount: string;
    toAccount: string;
    amount: number;
    idempotencyKey: string;
  }) =>
    request<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  sendInitialFunds: (data: {
    toAccount: string;
    amount: number;
    idempotencyKey: string;
  }) =>
    request<Transaction>("/transactions/initial-funds", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getTransactionHistory: (accountId: string, page = 1, limit = 10) =>
    request<{ entries: LedgerEntry[]; pagination: Pagination }>(
      `/transactions/history/${accountId}?page=${page}&limit=${limit}`
    ),
};

export type User = { id: string; email: string; name: string; isSystemUser: boolean };
export type Account = { _id: string; user: string; status: string; createdAt: string };
export type Transaction = {
  _id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  status: string;
  idempotencyKey: string;
};
export type LedgerEntry = {
  _id: string;
  account: string;
  type: "debit" | "credit";
  amount: number;
  createdAt: string;
  transaction: {
    _id: string;
    fromAccount: { _id: string };
    toAccount: { _id: string };
    status: string;
    createdAt: string;
  };
};
export type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
