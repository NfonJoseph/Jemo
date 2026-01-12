"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { setUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import { ChevronLeft, Loader2, Store } from "lucide-react";

interface VendorApplyResponse {
  user: {
    id: string;
    email?: string;
    phone?: string;
    role: string;
    name?: string;
  };
  vendorProfile: {
    id: string;
    businessName: string;
    businessAddress: string;
  };
}

export default function VendorApplyPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading, refreshUser } = useAuth();
  const toast = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    businessName: "",
    city: "",
    address: "",
    description: "",
  });

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login?redirect=/account/vendor/apply");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (user && user.role !== "CUSTOMER") {
      router.push("/account");
    }
  }, [user, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.businessName.trim()) {
      newErrors.businessName = "Business name is required";
    }

    if (!form.city.trim()) {
      newErrors.city = "City is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      const response = await api.post<VendorApplyResponse>(
        "/vendor/apply",
        {
          businessName: form.businessName.trim(),
          city: form.city.trim(),
          address: form.address.trim() || undefined,
          description: form.description.trim() || undefined,
        },
        true
      );

      // Update stored user with new role
      if (response.user) {
        setUser(response.user);
        await refreshUser();
      }
      
      toast.success("Vendor application submitted! Complete your KYC to proceed.");
      router.push("/account/kyc");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404 || err.status === 405) {
          toast.error("This feature is not available. Please contact support or try again later.");
          console.error("[VendorApply] Endpoint not found. Backend may need to be rebuilt.");
        } else {
          const data = err.data as { message?: string | string[] };
          const message = Array.isArray(data?.message)
            ? data.message[0]
            : data?.message;
          toast.error(message || "Failed to submit application");
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !isLoggedIn) {
    return (
      <div className="py-6">
        <div className="container-main max-w-lg">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="card p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="container-main max-w-lg">
        {/* Header */}
        <Link
          href="/account"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Account</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-jemo-orange/10 rounded-lg">
            <Store className="w-6 h-6 text-jemo-orange" />
          </div>
          <div>
            <h1 className="text-h1 text-gray-900">Become a Vendor</h1>
            <p className="text-sm text-gray-500">
              Start selling your products on Jemo
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              name="businessName"
              value={form.businessName}
              onChange={handleChange}
              placeholder="e.g. John's Electronics"
              className={errors.businessName ? "border-red-500" : ""}
            />
            {errors.businessName && (
              <p className="text-sm text-red-500">{errors.businessName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="e.g. Douala"
              className={errors.city ? "border-red-500" : ""}
            />
            {errors.city && (
              <p className="text-sm text-red-500">{errors.city}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address (Optional)</Label>
            <Input
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="e.g. 123 Market Street"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Business Description (Optional)</Label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Tell us about your business..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

