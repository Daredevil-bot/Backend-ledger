"use client";
import { useState, FormEvent, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, Account } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";

type Status = "idle" | "loading" | "success" | "error";

function generateIdempotencyKey(): string {
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function SendForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccount, setFromAccount] = useState("");
  const [form, setForm] = useState({ toAccount: "", amount: "" });
  const [idempotencyKey] = useState(generateIdempotencyKey);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [txId, setTxId] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const loadAccounts = useCallback(async () => {
    if (!user) return;
    try {
      const { accounts: list } = await api.getAccountDetails();
      setAccounts(list);
      // pre-select account from URL param, or default to first
      const preselect = searchParams.get("from");
      const match = list.find((a) => a._id === preselect);
      setFromAccount(match ? match._id : list[0]?._id ?? "");
    } catch {
      setError("Could not load your wallets");
    }
  }, [user, searchParams]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("loading");

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Enter a valid amount");
      setStatus("error");
      return;
    }
    if (!fromAccount) {
      setError("No wallet found. Create one first.");
      setStatus("error");
      return;
    }

    try {
      const tx = user?.isSystemUser
        ? await api.sendInitialFunds({
            toAccount: form.toAccount.trim(),
            amount,
            idempotencyKey,
          })
        : await api.sendTransaction({
            fromAccount,
            toAccount: form.toAccount.trim(),
            amount,
            idempotencyKey,
          });
      setTxId(tx._id);
      setStatus("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  };

  if (authLoading) return null;

  if (status === "success") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Transaction sent!</h2>
        <p className="text-gray-500 text-sm mb-1">
          ₹{parseFloat(form.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} transferred
        </p>
        <p className="text-gray-400 text-xs font-mono mb-8 break-all">{txId}</p>
        <Link
          href="/dashboard"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {user?.isSystemUser ? "Fund Account" : "Send Money"}
          </h1>
          <p className="text-gray-400 text-sm">
            {user?.isSystemUser ? "Add initial funds to a wallet" : "Transfer funds to another account"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* From wallet — hidden for system user, dropdown if multiple for regular user */}
          {!user?.isSystemUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From wallet</label>
              {accounts.length > 1 ? (
                <select
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                >
                  {accounts.map((acc, i) => (
                    <option key={acc._id} value={acc._id}>
                      Wallet {i + 1} — {acc._id}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  readOnly
                  value={fromAccount || "Loading…"}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 font-mono"
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Account ID</label>
            <input
              type="text"
              required
              value={form.toAccount}
              onChange={(e) => setForm({ ...form, toAccount: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              placeholder="Paste account ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-0.5">Idempotency Key (auto-generated)</p>
            <p className="text-xs font-mono text-gray-600 break-all">{idempotencyKey}</p>
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Processing…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SendPage() {
  return (
    <Suspense>
      <SendForm />
    </Suspense>
  );
}
