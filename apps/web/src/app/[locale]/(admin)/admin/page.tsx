"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AdminKycSubmission, AdminPayment, AdminDispute } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  FileCheck,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface DashboardStats {
  pendingKyc: number;
  openDisputes: number;
  initiatedPayments: number;
}

export default function AdminDashboardPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    pendingKyc: 0,
    openDisputes: 0,
    initiatedPayments: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [kycData, disputesData, paymentsData] = await Promise.all([
        api.get<AdminKycSubmission[]>("/admin/kyc/submissions?status=PENDING", true).catch(() => []),
        api.get<AdminDispute[]>("/admin/disputes?status=OPEN", true).catch(() => []),
        api.get<AdminPayment[]>("/admin/payments?status=INITIATED", true).catch(() => []),
      ]);

      setStats({
        pendingKyc: kycData.length,
        openDisputes: disputesData.length,
        initiatedPayments: paymentsData.length,
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: "Pending KYC",
      value: stats.pendingKyc,
      href: "/admin/kyc",
      icon: FileCheck,
      color: "bg-yellow-50 text-yellow-600",
      urgent: stats.pendingKyc > 0,
    },
    {
      label: "Open Disputes",
      value: stats.openDisputes,
      href: "/admin/disputes",
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
      urgent: stats.openDisputes > 0,
    },
    {
      label: "Pending Payments",
      value: stats.initiatedPayments,
      href: "/admin/payments",
      icon: CreditCard,
      color: "bg-blue-50 text-blue-600",
      urgent: stats.initiatedPayments > 0,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.urgent ? "text-red-600" : "text-gray-900"}`}>
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <Link
            href="/admin/kyc"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">Review KYC Submissions</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">View All Orders</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/admin/payments"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">Manage Payments</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/admin/disputes"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">Handle Disputes</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}

