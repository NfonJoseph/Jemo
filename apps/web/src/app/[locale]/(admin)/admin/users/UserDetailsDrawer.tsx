"use client";

import { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, SignedFileLink } from "@/components/shared";
import { useToast } from "@/components/ui/toaster";
import {
  X,
  User,
  Phone,
  Mail,
  Shield,
  Store,
  Bike,
  FileCheck,
  Package,
  ShoppingBag,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Calendar,
  Clock,
} from "lucide-react";

interface UserDetails {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: "CUSTOMER" | "VENDOR" | "RIDER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  vendorProfile?: {
    id: string;
    businessName: string;
    businessAddress: string;
    kycStatus: "PENDING" | "APPROVED" | "REJECTED";
    products?: { id: string }[];
    kycSubmissions?: Array<{
      id: string;
      documentType: string;
      documentUrl: string;
      status: string;
      createdAt: string;
    }>;
  } | null;
  riderProfile?: {
    id: string;
    vehicleType: string;
    licensePlate: string | null;
    kycStatus: "PENDING" | "APPROVED" | "REJECTED";
    deliveries?: { id: string }[];
    kycSubmissions?: Array<{
      id: string;
      documentType: string;
      documentUrl: string;
      status: string;
      createdAt: string;
    }>;
  } | null;
  vendorApplications?: Array<{
    id: string;
    type: "BUSINESS" | "INDIVIDUAL";
    status: string;
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    businessEmail?: string;
    fullNameOnId?: string;
    location?: string;
    phoneNormalized?: string;
    createdAt: string;
    uploads?: Array<{
      id: string;
      kind: string;
      storagePath: string;
      originalFileName: string;
    }>;
  }>;
  orders?: Array<{
    id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
  disputes?: Array<{
    id: string;
    reason: string;
    resolution: string | null;
    createdAt: string;
  }>;
  stats?: {
    ordersCount: number;
    disputesCount: number;
    productsCount: number;
    deliveriesCount: number;
  };
}

interface Props {
  userId: string;
  mode: "view" | "edit";
  onClose: () => void;
  onUpdate: () => void;
}

type TabType = "profile" | "vendor" | "activity" | "notes";

export default function UserDetailsDrawer({ userId, mode, onClose, onUpdate }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "" as "CUSTOMER" | "VENDOR" | "RIDER" | "ADMIN",
    isActive: true,
  });

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const data = await api.get<UserDetails>(`/admin/users/${userId}`, true);
      setUser(data);
      setEditForm({
        name: data.name,
        phone: data.phone,
        email: data.email || "",
        role: data.role,
        isActive: data.isActive,
      });
    } catch (err) {
      console.error("Failed to fetch user details:", err);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Check if role is changing and confirm
      if (editForm.role !== user.role) {
        if (!confirm(`Are you sure you want to change this user's role from ${user.role} to ${editForm.role}?`)) {
          setSaving(false);
          return;
        }
      }
      
      await api.patch(`/admin/users/${userId}`, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email || null,
        role: editForm.role,
        isActive: editForm.isActive,
      }, true);
      
      toast.success("User updated successfully");
      onUpdate();
      fetchUserDetails();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error((err.data as { message?: string })?.message || "Update failed");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tabs = [
    { key: "profile" as TabType, label: "Profile", icon: User },
    { key: "vendor" as TabType, label: "Vendor/KYC", icon: Store },
    { key: "activity" as TabType, label: "Activity", icon: ShoppingBag },
    { key: "notes" as TabType, label: "Notes", icon: FileCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === "edit" ? "Edit User" : "User Details"}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : user ? (
            <>
              {/* User Summary */}
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-jemo-orange/10 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-jemo-orange" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{user.phone}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "ADMIN" ? "bg-red-100 text-red-700" :
                        user.role === "VENDOR" ? "bg-purple-100 text-purple-700" :
                        user.role === "RIDER" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {user.role}
                      </span>
                      <StatusBadge status={user.isActive ? "APPROVED" : "REJECTED"} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? "border-jemo-orange text-jemo-orange"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    {mode === "edit" ? (
                      <>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Cameroon format: +237XXXXXXXXX</p>
                          </div>
                          <div>
                            <Label htmlFor="email">Email (Optional)</Label>
                            <Input
                              id="email"
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="role">Role</Label>
                            <select
                              id="role"
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "CUSTOMER" | "VENDOR" | "RIDER" | "ADMIN" })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jemo-orange"
                            >
                              <option value="CUSTOMER">Customer</option>
                              <option value="VENDOR">Vendor</option>
                              <option value="RIDER">Rider</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              id="isActive"
                              type="checkbox"
                              checked={editForm.isActive}
                              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <Label htmlFor="isActive">Account Active</Label>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-jemo-orange hover:bg-jemo-orange/90"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={onClose}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Phone</p>
                            <p className="font-mono">{user.phone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Email</p>
                            <p>{user.email || "Not provided"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Created</p>
                            <p className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(user.createdAt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Last Updated</p>
                            <p className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDate(user.updatedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        {user.stats && (
                          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{user.stats.ordersCount}</p>
                              <p className="text-xs text-gray-500">Orders</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{user.stats.disputesCount}</p>
                              <p className="text-xs text-gray-500">Disputes</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{user.stats.productsCount}</p>
                              <p className="text-xs text-gray-500">Products</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{user.stats.deliveriesCount}</p>
                              <p className="text-xs text-gray-500">Deliveries</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "vendor" && (
                  <div className="space-y-6">
                    {/* Vendor Profile */}
                    {user.vendorProfile ? (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Store className="w-5 h-5 text-purple-600" />
                          <h4 className="font-medium text-purple-900">Vendor Profile</h4>
                          <StatusBadge status={user.vendorProfile.kycStatus} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-purple-600">Business Name</p>
                            <p className="font-medium">{user.vendorProfile.businessName}</p>
                          </div>
                          <div>
                            <p className="text-purple-600">Address</p>
                            <p className="font-medium">{user.vendorProfile.businessAddress}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No vendor profile</p>
                    )}

                    {/* Rider Profile */}
                    {user.riderProfile && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Bike className="w-5 h-5 text-blue-600" />
                          <h4 className="font-medium text-blue-900">Rider Profile</h4>
                          <StatusBadge status={user.riderProfile.kycStatus} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-blue-600">Vehicle Type</p>
                            <p className="font-medium">{user.riderProfile.vehicleType}</p>
                          </div>
                          <div>
                            <p className="text-blue-600">License Plate</p>
                            <p className="font-medium">{user.riderProfile.licensePlate || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Vendor Applications */}
                    {user.vendorApplications && user.vendorApplications.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Vendor Applications</h4>
                        <div className="space-y-3">
                          {user.vendorApplications.map((app) => (
                            <div key={app.id} className="p-3 border border-gray-200 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{app.type} Application</span>
                                <StatusBadge status={
                                  app.status === "APPROVED" ? "APPROVED" :
                                  app.status === "REJECTED" ? "REJECTED" : "PENDING"
                                } />
                              </div>
                              {app.businessName && (
                                <p className="text-sm text-gray-600">Business: {app.businessName}</p>
                              )}
                              {app.fullNameOnId && (
                                <p className="text-sm text-gray-600">Name on ID: {app.fullNameOnId}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">{formatDate(app.createdAt)}</p>
                              
                              {/* Uploaded Documents */}
                              {app.uploads && app.uploads.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {app.uploads.map((upload) => (
                                    <SignedFileLink
                                      key={upload.id}
                                      applicationId={app.id}
                                      kind={upload.kind}
                                      label={upload.kind}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "activity" && (
                  <div className="space-y-6">
                    {/* Recent Orders */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        Recent Orders
                      </h4>
                      {user.orders && user.orders.length > 0 ? (
                        <div className="space-y-2">
                          {user.orders.map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-mono text-sm">{order.id.slice(0, 8)}...</p>
                                <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{order.totalAmount.toLocaleString()} FCFA</p>
                                <StatusBadge status={
                                  order.status === "DELIVERED" ? "APPROVED" :
                                  order.status === "CANCELLED" ? "REJECTED" : "PENDING"
                                } />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No orders yet</p>
                      )}
                    </div>

                    {/* Recent Disputes */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Recent Disputes
                      </h4>
                      {user.disputes && user.disputes.length > 0 ? (
                        <div className="space-y-2">
                          {user.disputes.map((dispute) => (
                            <div key={dispute.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium">{dispute.reason}</p>
                                <p className="text-xs text-gray-500">{formatDate(dispute.createdAt)}</p>
                              </div>
                              <StatusBadge status={
                                dispute.resolution ? "APPROVED" : "PENDING"
                              } />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No disputes</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "notes" && (
                  <div className="space-y-4">
                    <p className="text-gray-500 text-sm">
                      Admin notes feature coming soon. This section will allow admins to add internal notes about users.
                    </p>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        📝 Future feature: Add, edit, and view admin notes for this user.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-gray-500">
              User not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
