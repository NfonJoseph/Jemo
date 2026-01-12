"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AuthResponse } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { success } = useToast();
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const trimmedInput = phoneOrEmail.trim();
    const isEmail = trimmedInput.includes("@");
    
    // Build payload exactly as backend expects
    const payload: { email?: string; phone?: string; password: string } = {
      password,
    };
    
    if (isEmail) {
      payload.email = trimmedInput;
    } else {
      payload.phone = trimmedInput;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[Login] Submitting login request");
      console.log("[Login] Input type:", isEmail ? "email" : "phone");
      console.log("[Login] Input value:", trimmedInput);
      console.log("[Login] Payload keys:", Object.keys(payload));
    }

    try {
      const response = await api.post<AuthResponse>("/auth/login", payload);

      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Success, user:", response.user?.email || response.user?.phone);
      }

      login(response.accessToken, response.user);
      success("Welcome back!");
      router.push(redirectTo);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Login] Failed:", err);
      }
      if (err instanceof ApiError) {
        const data = err.data as { message?: string | string[] };
        const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
        if (process.env.NODE_ENV === "development") {
          console.error("[Login] API Error details:", { status: err.status, data: err.data });
        }
        setError(message || "Invalid credentials. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <Image
            src="/logo-orange.jpg"
            alt="Jemo"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </Link>
        <h1 className="text-h2 text-center text-gray-900 mb-2">Welcome back</h1>
        <p className="text-center text-gray-500 mb-8">
          Sign in to your account to continue
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card bg-white py-8 px-6 shadow-card rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phoneOrEmail">Phone or Email</Label>
              <Input
                id="phoneOrEmail"
                type="text"
                placeholder="Enter your phone or email"
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                required
                autoComplete="username"
                className="focus:ring-jemo-orange focus:border-jemo-orange"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10 focus:ring-jemo-orange focus:border-jemo-orange"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-jemo-orange hover:bg-jemo-orange/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-body text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-jemo-orange hover:underline font-medium"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

