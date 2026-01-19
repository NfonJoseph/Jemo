"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, EmptyState } from "@/components/shared";
import { useToast } from "@/components/ui/toaster";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  UserX,
  UserCheck,
  Key,
  Trash2,
  Store,
  Truck,
  Shield,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import UserDetailsDrawer from "./UserDetailsDrawer";

interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: "CUSTOMER" | "VENDOR" | "DELIVERY_AGENCY" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  vendorStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  vendorBusinessName: string | null;
  deliveryAgencyStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  latestVendorApplication: {
    id: string;
    status: string;
    type: string;
  } | null;
  ordersCount: number;
  disputesCount: number;
}

interface UsersResponse {
  data: AdminUser[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

type RoleFilter = "all" | "CUSTOMER" | "VENDOR" | "DELIVERY_AGENCY" | "ADMIN";
type StatusFilter = "all" | "active" | "suspended";

export default function AdminUsersPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  
  // Action states
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // User details drawer
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");
  
  // Prevent multiple error toasts
  const errorShownRef = useRef(false);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    errorShownRef.current = false;
    
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("pageSize", "20");
      
      if (searchQuery) params.append("q", searchQuery);
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await api.get<UsersResponse>(`/admin/users?${params.toString()}`, true);
      setUsers(response.data);
      setMeta(response.meta);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        toast.error("Failed to load users");
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleAction = async (userId: string, action: "activate" | "suspend" | "reset_password") => {
    setProcessingId(userId);
    setActionMenuOpen(null);
    
    try {
      const response = await api.post<{ success?: boolean; tempPassword?: string; message?: string }>(
        `/admin/users/${userId}/action`,
        { action },
        true
      );
      
      if (action === "reset_password" && response.tempPassword) {
        toast.success(`Password reset! Temp password: ${response.tempPassword}`);
      } else {
        toast.success(`User ${action === "activate" ? "activated" : "suspended"} successfully`);
      }
      
      fetchUsers(meta.page);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error((err.data as { message?: string })?.message || "Action failed");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    
    setProcessingId(userId);
    setActionMenuOpen(null);
    
    try {
      await api.delete(`/admin/users/${userId}`, true);
      toast.success("User deleted successfully");
      fetchUsers(meta.page);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error((err.data as { message?: string })?.message || "Delete failed");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "VENDOR": return <Store className="w-4 h-4" />;
      case "DELIVERY_AGENCY": return <Truck className="w-4 h-4" />;
      case "ADMIN": return <Shield className="w-4 h-4" />;
      default: return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "VENDOR": return "bg-purple-100 text-purple-700";
      case "DELIVERY_AGENCY": return "bg-blue-100 text-blue-700";
      case "ADMIN": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getVendorKycStatus = (user: AdminUser) => {
    if (user.vendorStatus) return user.vendorStatus;
    if (user.latestVendorApplication) {
      const status = user.latestVendorApplication.status;
      if (status === "APPROVED") return "APPROVED";
      if (status === "REJECTED") return "REJECTED";
      return "PENDING";
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-jemo-orange" />
        <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jemo-orange"
          >
            <option value="all">All Roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="VENDOR">Vendor</option>
            <option value="DELIVERY_AGENCY">Delivery Agency</option>
            <option value="ADMIN">Admin</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jemo-orange"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          
          <Button type="submit" className="bg-jemo-orange hover:bg-jemo-orange/90">
            Search
          </Button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      User
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Phone
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Role
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Vendor/KYC
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Created
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => {
                    const vendorKycStatus = getVendorKycStatus(user);
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              {getRoleIcon(user.role)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              {user.email && (
                                <p className="text-sm text-gray-500">{user.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono">{user.phone}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {getRoleIcon(user.role)}
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={user.isActive ? "APPROVED" : "REJECTED"} />
                          <span className="ml-1 text-xs text-gray-500">
                            {user.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {vendorKycStatus ? (
                            <div>
                              <StatusBadge status={vendorKycStatus} />
                              {user.vendorBusinessName && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[120px]">
                                  {user.vendorBusinessName}
                                </p>
                              )}
                            </div>
                          ) : user.deliveryAgencyStatus ? (
                            <StatusBadge status={user.deliveryAgencyStatus} />
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">{formatDate(user.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                              disabled={processingId === user.id}
                            >
                              {processingId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="w-4 h-4" />
                              )}
                            </Button>
                            
                            {actionMenuOpen === user.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                                <button
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setDrawerMode("view");
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setDrawerMode("edit");
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                                <hr className="my-1" />
                                {user.isActive ? (
                                  <button
                                    onClick={() => handleAction(user.id, "suspend")}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                                  >
                                    <UserX className="w-4 h-4" />
                                    Suspend
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAction(user.id, "activate")}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                    Activate
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAction(user.id, "reset_password")}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Key className="w-4 h-4" />
                                  Reset Password
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing {(meta.page - 1) * meta.pageSize + 1} to{" "}
                {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(meta.page - 1)}
                  disabled={meta.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(meta.page + 1)}
                  disabled={meta.page >= meta.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Details Drawer */}
      {selectedUserId && (
        <UserDetailsDrawer
          userId={selectedUserId}
          mode={drawerMode}
          onClose={() => setSelectedUserId(null)}
          onUpdate={() => fetchUsers(meta.page)}
        />
      )}
      
      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
}
