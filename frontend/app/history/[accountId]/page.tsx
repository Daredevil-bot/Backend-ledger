"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, LedgerEntry, Pagination } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { accountId } = useParams<{ accountId: string }>();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async (p: number) => {
    setFetching(true);
    setError("");
    try {
      const res = await fetch(`/api/transactions/history/${accountId}?page=${p}&limit=10`, {
        credentials: "include",
      });
      setCacheHit(res.headers.get("X-Cache") === "HIT");
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setEntries(data.entries);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading history");
    } finally {
      setFetching(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (user) load(page);
  }, [user, page, load]);

  if (authLoading) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-gray-400 text-xs font-mono mt-0.5">{accountId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cacheHit !== null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              cacheHit ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {cacheHit ? "Cached" : "Live"}
            </span>
          )}
          {pagination && (
            <span className="text-sm text-gray-400">
              {pagination.total} transaction{pagination.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {fetching ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400">No transactions yet.</p>
          <Link
            href={`/send?from=${accountId}`}
            className="inline-block mt-4 text-sm text-indigo-600 font-medium hover:underline"
          >
            Make your first transaction
          </Link>
        </div>
      ) : (
        <>
          {/* Transactions list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {entries.map((entry, i) => (
              <div
                key={entry._id}
                className={`flex items-center justify-between px-6 py-4 ${
                  i !== entries.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                {/* Left — icon + details */}
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.type === "credit" ? "bg-green-50" : "bg-red-50"
                  }`}>
                    {entry.type === "credit" ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {entry.type === "credit" ? "Received" : "Sent"}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {entry.type === "debit"
                        ? `To: ${entry.transaction.toAccount._id}`
                        : `From: ${entry.transaction.fromAccount._id}`}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(entry.createdAt).toLocaleString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Right — amount + status */}
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    entry.type === "credit" ? "text-green-600" : "text-red-500"
                  }`}>
                    {entry.type === "credit" ? "+" : "-"}₹{entry.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    entry.transaction.status === "completed"
                      ? "bg-green-50 text-green-600"
                      : entry.transaction.status === "pending"
                      ? "bg-yellow-50 text-yellow-600"
                      : "bg-red-50 text-red-500"
                  }`}>
                    {entry.transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!pagination.hasPrevPage}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
