"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  ShieldCheck,
  Users,
  Database,
  RefreshCw,
  Search,
  Lock,
  Activity,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  SlidersHorizontal,
} from "lucide-react";
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-lg bg-[#f7f3f1] flex items-center justify-center mb-3">
          <RefreshCw className="h-5 w-5 animate-spin text-[#d97706]" />
        </div>
        <p className="text-xs font-semibold text-[#2a3b4e]/40">Verifying administrative credentials...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4 border border-red-200 shadow-sm">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold font-serif text-[#1a2332] mb-1.5">Access Denied (403)</h1>
        <p className="text-xs text-[#2a3b4e]/50 max-w-sm mb-5">
          You do not have administrative privileges to access the JurisQuery Admin Console.
        </p>
        <a
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-[#1a2332] hover:bg-[#2a3b4e] text-white font-semibold text-xs shadow-sm transition-all"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  const totalPages = Math.ceil(totalUsers / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#d97706] to-[#f59e0b] flex items-center justify-center shadow-lg shadow-amber-900/20 text-white shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-serif text-[#1a2332]">Admin Console</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                System Admin
              </span>
            </div>
            <p className="text-xs text-[#2a3b4e]/40">
              Monitor user analytics, manage subscription tiers, and control statute datasets & vector stores
            </p>
          </div>
        </div>

        {/* Tab Switcher & Manual Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing || loadingStats}
            title="Refresh dashboard stats"
            className="p-2 rounded-lg bg-white border border-[#e8e2de] text-[#2a3b4e]/60 hover:text-[#1a2332] hover:bg-[#faf8f6] transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-[#d97706]" : ""}`} />
          </button>

          <div className="flex items-center bg-white rounded-lg border border-[#e8e2de] p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("subscriptions")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "subscriptions"
                  ? "bg-[#1a2332] text-white shadow-sm"
                  : "text-[#2a3b4e]/50 hover:text-[#1a2332]"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Users & Subscriptions
            </button>
            <button
              onClick={() => setActiveTab("datasets")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "datasets"
                  ? "bg-[#1a2332] text-white shadow-sm"
                  : "text-[#2a3b4e]/50 hover:text-[#1a2332]"
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Dataset & Vector Manager
            </button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-xl bg-white border border-[#e8e2de] animate-pulse space-y-3 shadow-sm">
              <div className="h-3 bg-[#e8e2de]/60 rounded w-1/2"></div>
              <div className="h-7 bg-[#e8e2de]/60 rounded w-3/4"></div>
              <div className="h-3 bg-[#e8e2de]/60 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-[#e8e2de] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#2a3b4e]/40 uppercase tracking-wider">Total Accounts</span>
              <Users className="h-4 w-4 text-[#2a3b4e]/30" />
            </div>
            <div className="text-2xl font-bold font-serif text-[#1a2332]">{stats.total_users ?? 0}</div>
            <div className="mt-2 text-xs text-[#2a3b4e]/50 flex items-center gap-2 font-medium">
              <span className="text-emerald-600 font-semibold">{stats.users_by_plan?.pro ?? 0} Pro</span>
              <span>&middot;</span>
              <span className="text-purple-600 font-semibold">{stats.users_by_plan?.enterprise ?? 0} Enterprise</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#e8e2de] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#2a3b4e]/40 uppercase tracking-wider">Active Paid Subscriptions</span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-serif text-emerald-700">
              {(stats.users_by_plan?.pro ?? 0) + (stats.users_by_plan?.enterprise ?? 0)}
            </div>
            <div className="mt-2 text-xs text-[#2a3b4e]/50 font-medium">
              {stats.users_by_plan?.free ?? 0} Free Tier users
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#e8e2de] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#2a3b4e]/40 uppercase tracking-wider">Total Queries Processed</span>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-serif text-[#1a2332]">{stats.total_queries ?? 0}</div>
            <div className="mt-2 text-xs text-[#2a3b4e]/50 font-medium">
              Across {stats.total_documents ?? 0} uploaded legal docs
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#e8e2de] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#2a3b4e]/40 uppercase tracking-wider">Statutes & Vectors</span>
              <Database className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold font-serif text-purple-700">
              {(stats.ipc_section_count ?? 0) + (stats.bns_section_count ?? 0)}
            </div>
            <div className="mt-2 text-xs text-[#2a3b4e]/50 font-medium">
              {stats.vector_store?.points_count ?? 0} points in Qdrant Vector Store
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 1: USERS & SUBSCRIPTIONS */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3.5 rounded-xl border border-[#e8e2de] shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2a3b4e]/30" />
              <input
                type="text"
                placeholder="Search user email or Clerk ID..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-[#fcfbf9] border border-[#e8e2de] rounded-lg pl-9 pr-3 py-2 text-xs text-[#1a2332] placeholder-[#2a3b4e]/30 focus:outline-none focus:ring-2 focus:ring-[#d97706]/20 focus:border-[#d97706] transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SlidersHorizontal className="h-4 w-4 text-[#2a3b4e]/40 shrink-0" />
              <select
                value={selectedPlanFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full sm:w-auto bg-[#fcfbf9] border border-[#e8e2de] rounded-lg px-3 py-2 text-xs font-medium text-[#1a2332] focus:outline-none focus:ring-2 focus:ring-[#d97706]/20 focus:border-[#d97706]"
              >
                <option value="">All Subscription Tiers</option>
                <option value="free">Free Tier</option>
                <option value="pro">Pro Tier</option>
                <option value="enterprise">Enterprise Tier</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-[#e8e2de] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1a2332]">
                <thead className="bg-[#fcfbf9] text-[11px] font-bold uppercase tracking-wider text-[#2a3b4e]/50 border-b border-[#e8e2de]">
                  <tr>
                    <th className="py-3.5 px-5">User Account</th>
                    <th className="py-3.5 px-5">Subscription Plan</th>
                    <th className="py-3.5 px-5">Queries Today</th>
                    <th className="py-3.5 px-5">System Role</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e2de]/60">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#2a3b4e]/40">
                        <div className="flex justify-center items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-[#d97706]" />
                          <span>Loading user accounts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#2a3b4e]/40">
                        No matching user accounts found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id || u.clerk_id} className="hover:bg-[#faf8f6] transition-colors">
                        <td className="py-3.5 px-5 font-medium text-[#1a2332]">
                          <div className="font-semibold text-xs">{u.email}</div>
                          <div className="text-[10px] text-[#2a3b4e]/40 font-mono mt-0.5">{u.clerk_id}</div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                              u.plan_tier === "pro"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : u.plan_tier === "enterprise"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {u.plan_tier}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-xs font-medium text-[#2a3b4e]/70">
                          {u.daily_query_count} queries
                        </td>
                        <td className="py-3.5 px-5">
                          {u.is_admin ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#2a3b4e]/40 font-medium">User</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setEditPlan(u.plan_tier);
                              setEditIsAdmin(u.is_admin);
                              setModalError(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white border border-[#e8e2de] hover:bg-[#f7f3f1] text-xs font-semibold text-[#1a2332] shadow-sm transition-all"
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
            <div className="p-3.5 bg-[#fcfbf9] border-t border-[#e8e2de] flex items-center justify-between text-xs text-[#2a3b4e]/50 font-medium">
              <div>
                Showing {users.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
                {Math.min(page * limit, totalUsers)} of {totalUsers} users
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1 || loadingUsers}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md bg-white border border-[#e8e2de] disabled:opacity-40 text-[#2a3b4e] hover:bg-[#f7f3f1] transition-all shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-semibold text-[#1a2332]">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages || loadingUsers}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-md bg-white border border-[#e8e2de] disabled:opacity-40 text-[#2a3b4e] hover:bg-[#f7f3f1] transition-all shadow-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATASET & VECTOR MANAGER */}
      {activeTab === "datasets" && (
        <div className="space-y-5">
          {!datasetStatus ? (
            <div className="p-8 text-center text-xs text-[#2a3b4e]/40 bg-white border border-[#e8e2de] rounded-xl animate-pulse">
              Loading dataset & vector store status...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* IPC Dataset Status */}
              <div className="p-5 rounded-xl bg-white border border-[#e8e2de] shadow-sm space-y-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm font-serif text-[#1a2332]">IPC Statute Dataset</h3>
                    <p className="text-[11px] text-[#2a3b4e]/40">Indian Penal Code Sections</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-md font-bold border ${
                      datasetStatus.ipc_csv_exists
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {datasetStatus.ipc_csv_exists ? "CSV Present" : "CSV Missing"}
                  </span>
                </div>
                <div className="py-2 border-y border-[#e8e2de]/60 flex justify-between text-xs">
                  <span className="text-[#2a3b4e]/50 font-medium">Total DB Sections:</span>
                  <span className="font-bold font-mono text-emerald-700">{datasetStatus.ipc_count ?? 0}</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] text-[#2a3b4e]/60 font-semibold">
                    Upload Updated IPC CSV (<code className="text-[#1a2332] bg-[#f7f3f1] px-1 py-0.5 rounded">FIR_DATASET.csv</code>):
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    disabled={uploadingTarget === "ipc"}
                    onChange={(e) => handleFileUpload("ipc", e)}
                    className="block w-full text-xs text-[#2a3b4e]/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1a2332] file:text-white hover:file:bg-[#2a3b4e] cursor-pointer disabled:opacity-50"
                  />
                  {uploadingTarget === "ipc" && (
                    <p className="text-[11px] text-emerald-600 animate-pulse font-medium">Uploading and parsing CSV...</p>
                  )}
                </div>
              </div>

              {/* BNS Dataset Status */}
              <div className="p-5 rounded-xl bg-white border border-[#e8e2de] shadow-sm space-y-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm font-serif text-[#1a2332]">BNS Statute Dataset</h3>
                    <p className="text-[11px] text-[#2a3b4e]/40">Bharatiya Nyaya Sanhita Sections</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-md font-bold border ${
                      datasetStatus.bns_csv_exists
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {datasetStatus.bns_csv_exists ? "CSV Present" : "CSV Missing"}
                  </span>
                </div>
                <div className="py-2 border-y border-[#e8e2de]/60 flex justify-between text-xs">
                  <span className="text-[#2a3b4e]/50 font-medium">Total DB Sections:</span>
                  <span className="font-bold font-mono text-purple-700">{datasetStatus.bns_count ?? 0}</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] text-[#2a3b4e]/60 font-semibold">
                    Upload Updated BNS CSV (<code className="text-[#1a2332] bg-[#f7f3f1] px-1 py-0.5 rounded">bns_sections.csv</code>):
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    disabled={uploadingTarget === "bns"}
                    onChange={(e) => handleFileUpload("bns", e)}
                    className="block w-full text-xs text-[#2a3b4e]/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1a2332] file:text-white hover:file:bg-[#2a3b4e] cursor-pointer disabled:opacity-50"
                  />
                  {uploadingTarget === "bns" && (
                    <p className="text-[11px] text-purple-600 animate-pulse font-medium">Uploading and parsing CSV...</p>
                  )}
                </div>
              </div>

              {/* Qdrant Vector DB Status */}
              <div className="p-5 rounded-xl bg-white border border-[#e8e2de] shadow-sm space-y-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm font-serif text-[#1a2332]">Qdrant Vector Store</h3>
                    <p className="text-[11px] text-[#2a3b4e]/40">Legal Document Chunks & Embeddings</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-md font-bold border ${
                      datasetStatus.vector_store?.status === "green" || datasetStatus.vector_store?.status === "ok"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {datasetStatus.vector_store?.status || "Ready"}
                  </span>
                </div>
                <div className="space-y-2 py-2 border-y border-[#e8e2de]/60 text-xs font-medium text-[#2a3b4e]/70">
                  <div className="flex justify-between">
                    <span className="text-[#2a3b4e]/50">Collection:</span>
                    <span className="font-mono text-[#1a2332]">{datasetStatus.vector_store?.collection_name || "jurisquery"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#2a3b4e]/50">Point Count:</span>
                    <span className="font-mono text-blue-700 font-bold">{datasetStatus.vector_store?.points_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#2a3b4e]/50">Dimension:</span>
                    <span className="font-mono text-[#1a2332]">{datasetStatus.vector_store?.dimension ?? 768} dims</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar for Dataset Reseed */}
          <div className="p-5 rounded-xl bg-[#fcfbf9] border border-[#e8e2de] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h4 className="font-bold text-sm font-serif text-[#1a2332]">Re-sync Statute Datasets from CSV</h4>
              <p className="text-xs text-[#2a3b4e]/50 mt-0.5">
                Triggers an idempotent background update using <code className="text-[#d97706] bg-white px-1.5 py-0.5 rounded border border-[#e8e2de]">ON CONFLICT DO UPDATE</code>.
              </p>
            </div>
            <button
              onClick={handleReseedDatasets}
              disabled={reseeding}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#d97706] hover:bg-[#b45309] disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-amber-900/10 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${reseeding ? "animate-spin" : ""}`} />
              <span>{reseeding ? "Re-syncing..." : "Re-sync All Datasets"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit User Plan Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-[#1a2332]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingUser(null);
              setModalError(null);
            }
          }}
        >
          <div className="bg-white border border-[#e8e2de] rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#e8e2de] pb-3">
              <h3 className="text-base font-bold font-serif text-[#1a2332]">Edit Subscription & Role</h3>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setModalError(null);
                }}
                className="text-[#2a3b4e]/40 hover:text-[#1a2332] text-sm p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs font-medium">
                {modalError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-[#2a3b4e]/50 font-semibold">User Email:</label>
              <div className="text-xs font-bold text-[#1a2332]">{editingUser.email}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#2a3b4e]/50 font-semibold">Subscription Tier:</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="w-full bg-[#fcfbf9] border border-[#e8e2de] rounded-lg p-2.5 text-xs text-[#1a2332] font-medium focus:outline-none focus:ring-2 focus:ring-[#d97706]/20 focus:border-[#d97706]"
              >
                <option value="free">Free Tier</option>
                <option value="pro">Pro Tier</option>
                <option value="enterprise">Enterprise Tier</option>
              </select>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="isAdminCheck"
                checked={editIsAdmin}
                onChange={(e) => setEditIsAdmin(e.target.checked)}
                className="w-4 h-4 rounded bg-[#fcfbf9] border-[#e8e2de] text-[#d97706] focus:ring-[#d97706] cursor-pointer"
              />
              <label htmlFor="isAdminCheck" className="text-xs font-semibold text-[#1a2332] cursor-pointer">
                Grant Admin Privileges
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#e8e2de]">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setModalError(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#f7f3f1] hover:bg-[#e8e2de] text-xs font-semibold text-[#2a3b4e] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUserPlanSave}
                disabled={updatingUser}
                className="px-4 py-2 rounded-lg bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
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
