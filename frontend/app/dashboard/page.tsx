"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, Account } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";

type AccountWithBalance = Account & { balance: number | null };

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [fetching, setFetching] = useState(true);
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const res = await fetch("/api/accounts", { credentials: "include" });
      setCacheHit(res.headers.get("X-Cache") === "HIT");

      if (res.status === 404) { setAccounts([]); return; }
      if (!res.ok) throw new Error("Failed to load accounts");

      const { accounts: raw }: { accounts: Account[] } = await res.json();

      // fetch balance for each account in parallel
      const withBalances = await Promise.all(
        raw.map(async (acc) => {
          try {
            const { balance } = await api.getAccountBalance(acc._id);
            return { ...acc, balance };
          } catch {
            return { ...acc, balance: null };
          }
        })
      );
      setAccounts(withBalances);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading accounts");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.createAccount();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {accounts.length} wallet{accounts.length !== 1 ? "s" : ""}
            {cacheHit !== null && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                cacheHit ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {cacheHit ? "Cached" : "Live"}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-sm text-gray-400 hover:text-gray-600">
            Refresh
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {creating ? "Creating…" : "+ New Wallet"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* No accounts */}
      {accounts.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 mb-4">You don&apos;t have any wallets yet.</p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create your first wallet"}
          </button>
        </div>
      )}

      {/* Account cards */}
      <div className="space-y-4">
        {accounts.map((acc, i) => (
          <div key={acc._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Balance banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-1">
                  Wallet {i + 1}
                </p>
                <p className="text-white text-2xl font-bold">
                  {acc.balance === null
                    ? "—"
                    : `₹${acc.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                acc.status === "active"
                  ? "bg-green-500/20 text-green-200"
                  : "bg-red-500/20 text-red-200"
              }`}>
                {acc.status}
              </span>
            </div>

            {/* Details */}
            <div className="px-6 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Account ID</span>
                <span className="text-xs font-mono text-gray-700">{acc._id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Created</span>
                <span className="text-xs text-gray-700">
                  {new Date(acc.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-4 flex items-center gap-5">
              <Link
                href={`/send?from=${acc._id}`}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </Link>
              <Link
                href={`/history/${acc._id}`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 font-medium hover:text-gray-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                History
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
