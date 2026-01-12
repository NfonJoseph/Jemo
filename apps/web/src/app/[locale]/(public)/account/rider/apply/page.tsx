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
import { ChevronLeft, Loader2, Bike } from "lucide-react";

interface RiderApplyResponse {
  user: {
    id: string;
    email?: string;
    phone?: string;
    role: string;
    name?: string;
  };
  riderProfile: {
    id: string;
    vehicleType: string;
    licensePlate?: string;
  };
}

export default function RiderApplyPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading, refreshUser } = useAuth();
  const toast = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: "",
    city: "",
    vehicleType: "Bike",
    plateNumber: "",
  });

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login?redirect=/account/rider/apply");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (user) {
      if (user.role !== "CUSTOMER") {
        router.push("/account");
      } else if (user.name) {
        setForm((prev) => ({ ...prev, fullName: user.name }));
      }
    }
  }, [user, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!form.vehicleType) {
      newErrors.vehicleType = "Vehicle type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      const response = await api.post<RiderApplyResponse>(
        "/rider/apply",
        {
          city: form.city.trim(),
          vehicleType: form.vehicleType,
          plateNumber: form.plateNumber.trim() || undefined,
        },
        true
      );

      // Update stored user with new role
      if (response.user) {
        setUser(response.user);
        await refreshUser();
      }
      
      toast.success("Rider application submitted! Complete your KYC to proceed.");
      router.push("/account/kyc");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404 || err.status === 405) {
          toast.error("This feature is not available. Please contact support or try again later.");
          console.error("[RiderApply] Endpoint not found. Backend may need to be rebuilt.");
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
            <Bike className="w-6 h-6 text-jemo-orange" />
          </div>
          <div>
            <h1 className="text-h1 text-gray-900">Become a Rider</h1>
            <p className="text-sm text-gray-500">
              Deliver orders and earn money
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Your full name"
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">
              This is your registered name
            </p>
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
            <Label htmlFor="vehicleType">Vehicle Type *</Label>
            <select
              id="vehicleType"
              name="vehicleType"
              value={form.vehicleType}
              onChange={handleChange}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                errors.vehicleType ? "border-red-500" : ""
              }`}
            >
              <option value="Bike">Motorcycle / Bike</option>
              <option value="Car">Car</option>
              <option value="Bicycle">Bicycle</option>
            </select>
            {errors.vehicleType && (
              <p className="text-sm text-red-500">{errors.vehicleType}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plateNumber">License Plate (Optional)</Label>
            <Input
              id="plateNumber"
              name="plateNumber"
              value={form.plateNumber}
              onChange={handleChange}
              placeholder="e.g. LT 123 ABC"
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

