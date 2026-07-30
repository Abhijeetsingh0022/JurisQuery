"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  fetchAdminStats,
  fetchAdminUsers,
  fetchDatasetStatus,
  reseedDataset,
  updateUserPlan,
  uploadDatasetCSV,
  AdminStats,
  DatasetStatus,
  UserAdminItem,
} from "@/features/admin/api/admin";

export default function AdminDashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<"subscriptions" | "datasets">("subscriptions");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [datasetStatus, setDatasetStatus] = useState<DatasetStatus | null>(null);
  const [users, setUsers] = useState<UserAdminItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  // UI States
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<UserAdminItem | null>(null);
  const [editPlan, setEditPlan] = useState("free");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Dataset Action States
  const [reseeding, setReseeding] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<"ipc" | "bns" | null>(null);

  // Debounce search query changes (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset pagination on filter or search change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleFilterChange = (val: string) => {
    setSelectedPlanFilter(val);
    setPage(1);
  };

  // Load Admin Stats & Vector Dataset Status
  const loadDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setLoadingStats(true);

    setErrorMsg(null);
    try {
      const [statsRes, datasetRes] = await Promise.all([
        fetchAdminStats(),
        fetchDatasetStatus(),
      ]);
      setStats(statsRes);
      setDatasetStatus(datasetRes);
    } catch (err: any) {
      if (err?.status === 403 || err?.message?.includes("403")) {
        setAccessDenied(true);
      } else {
        setErrorMsg(err?.detail || err?.message || "Failed to load admin stats");
      }
    } finally {
      setLoadingStats(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load Users list
  const loadUserData = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetchAdminUsers({
        query: debouncedSearch || undefined,
        plan_tier: selectedPlanFilter || undefined,
        limit,
        offset: (page - 1) * limit,
      });
      setUsers(res.items || []);
      setTotalUsers(res.total || 0);
    } catch (err: any) {
      if (err?.status === 403 || err?.message?.includes("403")) {
        setAccessDenied(true);
      } else {
        setErrorMsg(err?.detail || err?.message || "Failed to load users list");
      }
    } finally {
      setLoadingUsers(false);
    }
  }, [debouncedSearch, selectedPlanFilter, page, limit]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoadingStats(false);
      return;
    }
    loadDashboardData();
  }, [isLoaded, isSignedIn, loadDashboardData]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    loadUserData();
  }, [isLoaded, isSignedIn, loadUserData]);

  // Handle modal keyboard Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingUser) {
        setEditingUser(null);
        setModalError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingUser]);

  async function handleUserPlanSave() {
    if (!editingUser) return;
    setUpdatingUser(true);
    setModalError(null);
    try {
      await updateUserPlan(editingUser.id, editPlan, editIsAdmin);
      setActionSuccess(`Successfully updated ${editingUser.email} to ${editPlan.toUpperCase()}${editIsAdmin ? " (Admin)" : ""}`);
      setEditingUser(null);
      await Promise.all([loadUserData(), loadDashboardData(true)]);
    } catch (err: any) {
      setModalError(err?.detail || err?.message || "Failed to update user plan");
    } finally {
      setUpdatingUser(false);
    }
  }

  async function handleReseedDatasets() {
    setReseeding(true);
    setErrorMsg(null);
    setActionSuccess(null);
    try {
      const res = await reseedDataset("all");
      setActionSuccess(res.message || "Successfully re-synced dataset from CSVs");
      await loadDashboardData(true);
    } catch (err: any) {
      setErrorMsg(err?.detail || err?.message || "Failed to re-sync dataset");
    } finally {
      setReseeding(false);
    }
  }

  async function handleFileUpload(target: "ipc" | "bns", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTarget(target);
    setErrorMsg(null);
    setActionSuccess(null);

    try {
      const res = await uploadDatasetCSV(target, file);
      setActionSuccess(`Uploaded ${file.name} successfully. Sync finished: ${res.sections_loaded} sections updated.`);
      await loadDashboardData(true);
    } catch (err: any) {
      setErrorMsg(err?.message || err?.detail || "Failed to upload dataset CSV");
    } finally {
      setUploadingTarget(null);
      e.target.value = "";
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin text-3xl mb-4 text-emerald-400">⏳</div>
        <p className="text-slate-400 text-sm">Verifying administrative credentials...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4 text-3xl border border-red-500/20">
          🔒
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Access Denied (403)</h1>
        <p className="text-slate-400 max-w-md mb-6">
          You do not have administrative privileges to access the JurisQuery Admin Console.
        </p>
        <a
          href="/dashboard"
          className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium transition"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  const totalPages = Math.ceil(totalUsers / limit) || 1;

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">Admin Console</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              System Admin
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Monitor user analytics, manage subscription tiers, and control statute datasets & vector stores.
          </p>
        </div>

        {/* Tab Switcher & Manual Refresh */}
        <div className="flex flex-wrap items-center gap-3 self-start">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing || loadingStats}
            title="Refresh dashboard stats"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
          >
            <span className={`block ${isRefreshing ? "animate-spin" : ""}`}>🔄</span>
          </button>

          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("subscriptions")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === "subscriptions"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              👥 Users & Subscriptions
            </button>
            <button
              onClick={() => setActiveTab("datasets")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === "datasets"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🗄️ Dataset & Vector Manager
            </button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl flex items-center justify-between text-sm">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl flex items-center justify-between text-sm">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}

      {/* Overview Stat Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse space-y-3">
              <div className="h-3 bg-slate-800 rounded w-1/2"></div>
              <div className="h-8 bg-slate-800 rounded w-3/4"></div>
              <div className="h-3 bg-slate-800 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Total Accounts</div>
            <div className="text-3xl font-extrabold text-white">{stats.total_users ?? 0}</div>
            <div className="mt-2 text-xs text-slate-500 flex gap-2">
              <span className="text-emerald-400 font-medium">{stats.users_by_plan?.pro ?? 0} Pro</span> •
              <span className="text-indigo-400 font-medium">{stats.users_by_plan?.enterprise ?? 0} Enterprise</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Active Subscriptions</div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {(stats.users_by_plan?.pro ?? 0) + (stats.users_by_plan?.enterprise ?? 0)}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {stats.users_by_plan?.free ?? 0} Free Tier users
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Total Queries Processed</div>
            <div className="text-3xl font-extrabold text-cyan-400">{stats.total_queries ?? 0}</div>
            <div className="mt-2 text-xs text-slate-400">Across {stats.total_documents ?? 0} legal documents</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Statutes & Vectors</div>
            <div className="text-3xl font-extrabold text-purple-400">
              {(stats.ipc_section_count ?? 0) + (stats.bns_section_count ?? 0)}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {stats.vector_store?.points_count ?? 0} points in Qdrant
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 1: USERS & SUBSCRIPTIONS */}
      {activeTab === "subscriptions" && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search user email or Clerk ID..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedPlanFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Subscription Tiers</option>
                <option value="free">Free Tier</option>
                <option value="pro">Pro Tier</option>
                <option value="enterprise">Enterprise Tier</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">User Email</th>
                    <th className="py-3.5 px-6">Subscription Plan</th>
                    <th className="py-3.5 px-6">Queries Today</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="flex justify-center items-center gap-2">
                          <span className="animate-spin text-emerald-400">⏳</span> Loading user accounts...
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No matching users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id || u.clerk_id} className="hover:bg-slate-800/30 transition">
                        <td className="py-4 px-6 font-medium text-white">
                          <div>{u.email}</div>
                          <div className="text-xs text-slate-500 font-mono">{u.clerk_id}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              u.plan_tier === "pro"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : u.plan_tier === "enterprise"
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {u.plan_tier}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-300">
                          {u.daily_query_count} queries
                        </td>
                        <td className="py-4 px-6">
                          {u.is_admin ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                              Admin
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">User</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setEditPlan(u.plan_tier);
                              setEditIsAdmin(u.is_admin);
                              setModalError(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
                          >
                            Edit Plan & Role
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing {users.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
                {Math.min(page * limit, totalUsers)} of {totalUsers} users
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1 || loadingUsers}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-50 text-slate-300 hover:text-white transition"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages || loadingUsers}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-50 text-slate-300 hover:text-white transition"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATASET & VECTOR MANAGER */}
      {activeTab === "datasets" && (
        <div className="space-y-6">
          {!datasetStatus ? (
            <div className="p-8 text-center text-slate-400 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse">
              Loading dataset & vector store status...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* IPC Dataset Status */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-white">IPC Statute Dataset</h3>
                    <p className="text-xs text-slate-400">Indian Penal Code Sections</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs rounded-full font-semibold border ${
                      datasetStatus.ipc_csv_exists
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {datasetStatus.ipc_csv_exists ? "CSV Loaded" : "CSV Missing"}
                  </span>
                </div>
                <div className="py-2 border-y border-slate-800 flex justify-between text-sm">
                  <span className="text-slate-400">Total DB Sections:</span>
                  <span className="font-bold font-mono text-emerald-400">{datasetStatus.ipc_count ?? 0}</span>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="block text-xs text-slate-400 font-medium">
                    Upload Updated IPC CSV (<code className="text-slate-300">FIR_DATASET.csv</code>):
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    disabled={uploadingTarget === "ipc"}
                    onChange={(e) => handleFileUpload("ipc", e)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer disabled:opacity-50"
                  />
                  {uploadingTarget === "ipc" && (
                    <p className="text-xs text-emerald-400 animate-pulse">Uploading and parsing CSV...</p>
                  )}
                </div>
              </div>

              {/* BNS Dataset Status */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-white">BNS Statute Dataset</h3>
                    <p className="text-xs text-slate-400">Bharatiya Nyaya Sanhita Sections</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs rounded-full font-semibold border ${
                      datasetStatus.bns_csv_exists
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {datasetStatus.bns_csv_exists ? "CSV Loaded" : "CSV Missing"}
                  </span>
                </div>
                <div className="py-2 border-y border-slate-800 flex justify-between text-sm">
                  <span className="text-slate-400">Total DB Sections:</span>
                  <span className="font-bold font-mono text-indigo-400">{datasetStatus.bns_count ?? 0}</span>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="block text-xs text-slate-400 font-medium">
                    Upload Updated BNS CSV (<code className="text-slate-300">bns_sections.csv</code>):
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    disabled={uploadingTarget === "bns"}
                    onChange={(e) => handleFileUpload("bns", e)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer disabled:opacity-50"
                  />
                  {uploadingTarget === "bns" && (
                    <p className="text-xs text-indigo-400 animate-pulse">Uploading and parsing CSV...</p>
                  )}
                </div>
              </div>

              {/* Qdrant Vector DB Status */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-white">Qdrant Vector Store</h3>
                    <p className="text-xs text-slate-400">Legal Document Chunks & Embeddings</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs rounded-full font-semibold border ${
                      datasetStatus.vector_store?.status === "green" || datasetStatus.vector_store?.status === "ok"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    }`}
                  >
                    {datasetStatus.vector_store?.status || "Ready"}
                  </span>
                </div>
                <div className="space-y-2 py-2 border-y border-slate-800 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Collection:</span>
                    <span className="font-mono text-slate-200">{datasetStatus.vector_store?.collection_name || "jurisquery"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Point Count:</span>
                    <span className="font-mono text-cyan-400 font-bold">{datasetStatus.vector_store?.points_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dimension:</span>
                    <span className="font-mono text-slate-300">{datasetStatus.vector_store?.dimension ?? 768} dims</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar for Dataset Reseed */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-white text-base">Re-sync Statute Datasets from CSV</h4>
              <p className="text-xs text-slate-400">
                Triggers an idempotent background update using <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded">ON CONFLICT DO UPDATE</code>.
              </p>
            </div>
            <button
              onClick={handleReseedDatasets}
              disabled={reseeding}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20"
            >
              {reseeding ? "Re-syncing..." : "🔄 Re-sync All Datasets"}
            </button>
          </div>
        </div>
      )}

      {/* Edit User Plan Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingUser(null);
              setModalError(null);
            }
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Edit Subscription & Role</h3>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setModalError(null);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">User Email:</label>
              <div className="text-sm font-semibold text-slate-200">{editingUser.email}</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Subscription Tier:</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="free">Free Tier</option>
                <option value="pro">Pro Tier</option>
                <option value="enterprise">Enterprise Tier</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="isAdminCheck"
                checked={editIsAdmin}
                onChange={(e) => setEditIsAdmin(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="isAdminCheck" className="text-sm font-medium text-slate-200 cursor-pointer">
                Grant Admin Privileges
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setModalError(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUserPlanSave}
                disabled={updatingUser}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition disabled:opacity-50"
              >
                {updatingUser ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
