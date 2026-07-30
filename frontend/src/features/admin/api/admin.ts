import { api, getAuthToken } from "@/services/api/client";

export interface UserAdminItem {
  id: string;
  email: string;
  clerk_id: string;
  plan_tier: string;
  is_admin: boolean;
  daily_query_count: number;
  stripe_customer_id: string | null;
  created_at: string | null;
}

export interface AdminStats {
  total_users: number;
  users_by_plan: {
    free: number;
    pro: number;
    enterprise: number;
  };
  total_documents: number;
  total_queries: number;
  ipc_section_count: number;
  bns_section_count: number;
  vector_store: {
    collection_name: string;
    points_count: number;
    vectors_count: number;
    status: string;
    dimension: number;
  };
}

export interface UsersListResponse {
  items: UserAdminItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface DatasetStatus {
  ipc_count: number;
  bns_count: number;
  vector_store: {
    collection_name: string;
    points_count: number;
    vectors_count: number;
    status: string;
    dimension: number;
  };
  ipc_csv_exists: boolean;
  bns_csv_exists: boolean;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>("/api/admin/stats");
}

export async function fetchAdminUsers(params?: {
  query?: string;
  plan_tier?: string;
  limit?: number;
  offset?: number;
}): Promise<UsersListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.query) queryParams.set("query", params.query);
  if (params?.plan_tier) queryParams.set("plan_tier", params.plan_tier);
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.offset) queryParams.set("offset", params.offset.toString());

  const endpoint = `/api/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  return api.get<UsersListResponse>(endpoint);
}

export async function updateUserPlan(
  userId: string,
  plan_tier: string,
  is_admin?: boolean
) {
  return api.patch<{ status: string; user_id: string; plan_tier: string }>(
    `/api/admin/users/${userId}/plan`,
    { plan_tier, is_admin }
  );
}

export async function fetchDatasetStatus(): Promise<DatasetStatus> {
  return api.get<DatasetStatus>("/api/admin/datasets");
}

export async function reseedDataset(target: "all" | "ipc" | "bns" = "all") {
  return api.post<{ status: string; message: string }>("/api/admin/datasets/reseed", { target });
}

export async function uploadDatasetCSV(
  target: "ipc" | "bns",
  file: File
): Promise<{ status: string; target: string; file_name: string; sections_loaded: number }> {
  return api.upload<{ status: string; target: string; file_name: string; sections_loaded: number }>(
    `/api/admin/datasets/upload?target=${target}`,
    file
  );
}
