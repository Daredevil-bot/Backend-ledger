"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <Link href="/dashboard" className="text-xl font-bold text-indigo-600 tracking-tight">
        Ledger
      </Link>
      {user && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Hello, <span className="font-medium text-gray-900">{user.name}</span>
          </span>
          <Link
            href="/send"
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Send Money
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
