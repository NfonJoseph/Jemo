"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, EmptyState } from "@/components/shared";
import { useToast } from "@/components/ui/toaster";
import {
  Truck,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  Power,
  Key,
  Trash2,
  Plus,
  X,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Building2,
  Copy,
  Check,
} from "lucide-react";

interface DeliveryAgency {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  citiesCovered: string[];
  isActive: boolean;
  createdAt: string;
  deliveriesCount: number;
  user: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    isActive: boolean;
  };
}

interface AgenciesResponse {
  data: DeliveryAgency[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface CreateAgencyForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  citiesCovered: string;
  initialPassword: string;
}

type StatusFilter = "all" | "active" | "inactive";

export default function AdminDeliveryAgenciesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<DeliveryAgency[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  
  // Action states
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Create/Edit modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgency, setEditingAgency] = useState<DeliveryAgency | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateAgencyForm>({
    name: "",
    phone: "",
    email: "",
    address: "",
    citiesCovered: "",
    initialPassword: "",
  });
  
  // View modal
  const [viewingAgency, setViewingAgency] = useState<DeliveryAgency | null>(null);
  
  // Password display
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  
  const errorShownRef = useRef(false);

  const fetchAgencies = useCallback(async (page = 1) => {
    setLoading(true);
    errorShownRef.current = false;
    
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("pageSize", "20");
      
      if (searchQuery) params.append("q", searchQuery);
      if (statusFilter !== "all") {
        params.append("isActive", statusFilter === "active" ? "true" : "false");
      }
      
      const response = await api.get<AgenciesResponse>(`/admin/delivery-agencies?${params.toString()}`, true);
      setAgencies(response.data);
      setMeta(response.meta);
    } catch (err) {
      console.error("Failed to fetch agencies:", err);
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        toast.error("Failed to load delivery agencies");
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, toast]);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAgencies(1);
  };

  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      citiesCovered: "",
      initialPassword: "",
    });
    setEditingAgency(null);
    setGeneratedPassword(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (agency: DeliveryAgency) => {
    setForm({
      name: agency.name,
      phone: agency.phone,
      email: agency.email || "",
      address: agency.address,
      citiesCovered: agency.citiesCovered.join(", "),
      initialPassword: "",
    });
    setEditingAgency(agency);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const citiesArray = form.citiesCovered
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (citiesArray.length === 0) {
        toast.error("Please enter at least one city");
        setSaving(false);
        return;
      }

      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        address: form.address,
        citiesCovered: citiesArray,
        ...(form.initialPassword && { initialPassword: form.initialPassword }),
      };

      if (editingAgency) {
        await api.patch(`/admin/delivery-agencies/${editingAgency.id}`, payload, true);
        toast.success("Delivery agency updated successfully");
        setShowCreateModal(false);
        resetForm();
      } else {
        const response = await api.post<{ success: boolean; tempPassword: string }>("/admin/delivery-agencies", payload, true);
        toast.success("Delivery agency created successfully");
        setGeneratedPassword(response.tempPassword);
      }
      
      fetchAgencies(meta.page);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error((err.data as { message?: string })?.message || "Operation failed");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (agency: DeliveryAgency) => {
    setProcessingId(agency.id);
    setActionMenuOpen(null);

    try {
      await api.post(`/admin/delivery-agencies/${agency.id}/toggle-active`, {}, true);
      toast.success(`Agency ${agency.isActive ? "deactivated" : "activated"} successfully`);
      fetchAgencies(meta.page);
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

  const handleResetPassword = async (agency: DeliveryAgency) => {
    setProcessingId(agency.id);
    setActionMenuOpen(null);

    try {
      const response = await api.post<{ success: boolean; tempPassword: string }>(
        `/admin/delivery-agencies/${agency.id}/reset-password`,
        {},
        true
      );
      toast.success(`Password reset! New password: ${response.tempPassword}`);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error((err.data as { message?: string })?.message || "Reset failed");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (agency: DeliveryAgency) => {
    if (!confirm(`Are you sure you want to delete "${agency.name}"? This action cannot be undone.`)) {
      return;
    }

    setProcessingId(agency.id);
    setActionMenuOpen(null);

    try {
      const response = await api.delete<{ success: boolean; softDeleted: boolean; message: string }>(
        `/admin/delivery-agencies/${agency.id}`,
        true
      );
      toast.success(response.message);
      fetchAgencies(meta.page);
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

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6 text-jemo-orange" />
          <h1 className="text-2xl font-bold text-gray-900">Delivery Agencies</h1>
        </div>
        <Button onClick={openCreateModal} className="bg-jemo-orange hover:bg-jemo-orange/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Agency
        </Button>
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jemo-orange"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <Button type="submit" className="bg-jemo-orange hover:bg-jemo-orange/90">
            Search
          </Button>
        </form>
      </div>

      {/* Agencies Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : agencies.length === 0 ? (
          <EmptyState
            title="No delivery agencies found"
            description="Create your first delivery agency to get started"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Agency
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Contact
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Cities
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Deliveries
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
                  {agencies.map((agency) => (
                    <tr key={agency.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Truck className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{agency.name}</p>
                            {agency.address && (
                              <p className="text-sm text-gray-500 truncate max-w-[200px]">{agency.address}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-sm font-mono">{agency.phone}</p>
                          {agency.email && (
                            <p className="text-xs text-gray-500">{agency.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {agency.citiesCovered.slice(0, 3).map((city) => (
                            <span
                              key={city}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {city}
                            </span>
                          ))}
                          {agency.citiesCovered.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{agency.citiesCovered.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={agency.isActive ? "APPROVED" : "REJECTED"} />
                        <span className="ml-1 text-xs text-gray-500">
                          {agency.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">
                          {agency.deliveriesCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{formatDate(agency.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActionMenuOpen(actionMenuOpen === agency.id ? null : agency.id)}
                            disabled={processingId === agency.id}
                          >
                            {processingId === agency.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="w-4 h-4" />
                            )}
                          </Button>
                          
                          {actionMenuOpen === agency.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                              <button
                                onClick={() => {
                                  setViewingAgency(agency);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  openEditModal(agency);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => handleToggleActive(agency)}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                  agency.isActive ? "text-orange-600" : "text-green-600"
                                }`}
                              >
                                <Power className="w-4 h-4" />
                                {agency.isActive ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() => handleResetPassword(agency)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Key className="w-4 h-4" />
                                Reset Password
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => handleDelete(agency)}
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing {(meta.page - 1) * meta.pageSize + 1} to{" "}
                {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} agencies
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAgencies(meta.page - 1)}
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
                  onClick={() => fetchAgencies(meta.page + 1)}
                  disabled={meta.page >= meta.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => {
              if (!generatedPassword) {
                setShowCreateModal(false);
                resetForm();
              }
            }} />
            
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {generatedPassword ? "Agency Created!" : editingAgency ? "Edit Agency" : "Create Delivery Agency"}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {generatedPassword ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 mb-2">
                      The delivery agency has been created successfully. Please share the login credentials with them:
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Phone: <span className="font-mono font-medium">{form.phone}</span></p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">Password:</p>
                        <span className="font-mono font-medium text-lg">{generatedPassword}</span>
                        <button
                          onClick={copyPassword}
                          className="p-1 rounded hover:bg-gray-100"
                          title="Copy password"
                        >
                          {copiedPassword ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="w-full bg-jemo-orange hover:bg-jemo-orange/90"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="name">Agency Name *</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Express Delivery Co."
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+237670000000"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="agency@example.com"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        placeholder="123 Main Street, Douala"
                        required
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="citiesCovered">Cities Covered * (comma-separated)</Label>
                      <Input
                        id="citiesCovered"
                        value={form.citiesCovered}
                        onChange={(e) => setForm({ ...form, citiesCovered: e.target.value })}
                        placeholder="Douala, Yaoundé, Bamenda"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter cities separated by commas</p>
                    </div>
                    
                    {!editingAgency && (
                      <div className="col-span-2">
                        <Label htmlFor="initialPassword">Initial Password (optional)</Label>
                        <Input
                          id="initialPassword"
                          type="text"
                          value={form.initialPassword}
                          onChange={(e) => setForm({ ...form, initialPassword: e.target.value })}
                          placeholder="Leave empty to auto-generate"
                        />
                        <p className="text-xs text-gray-500 mt-1">If left empty, a secure password will be generated</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {editingAgency ? "Saving..." : "Creating..."}
                        </>
                      ) : (
                        editingAgency ? "Save Changes" : "Create Agency"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingAgency && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setViewingAgency(null)} />
            
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Agency Details</h2>
                <button
                  onClick={() => setViewingAgency(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Truck className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{viewingAgency.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={viewingAgency.isActive ? "APPROVED" : "REJECTED"} />
                      <span className="text-sm text-gray-500">
                        {viewingAgency.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-mono text-sm">{viewingAgency.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm">{viewingAgency.email || "Not provided"}</p>
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="text-sm">{viewingAgency.address}</p>
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Cities Covered</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {viewingAgency.citiesCovered.map((city) => (
                          <span
                            key={city}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                          >
                            {city}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{viewingAgency.deliveriesCount}</p>
                    <p className="text-xs text-gray-500">Total Deliveries</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
                  Created: {formatDate(viewingAgency.createdAt)}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setViewingAgency(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      openEditModal(viewingAgency);
                      setViewingAgency(null);
                    }}
                    className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Agency
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
