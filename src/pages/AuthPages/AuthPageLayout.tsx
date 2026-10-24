import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { adminLogin } from "../../api/ApiPath";
import { saveAuthSession } from "../../services/authService";
import {
  EyeCloseIcon,
  EyeIcon,
  EnvelopeIcon,
  LockIcon,
  ErrorIcon,
  CheckCircleIcon,
} from "../../icons";

interface AuthLayoutProps {
  children?: React.ReactNode;
}

/**
 * Built-in Login Form that integrates directly with Kaizen Con Admin Login API (ApiPath.js)
 * Endpoint: POST http://192.168.29.201:8000/api/admin_login
 */
export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as any)?.from?.pathname || "/";

  // Check if redirected because of 2-hour session timeout
  const searchParams = new URLSearchParams(location.search);
  const isSessionExpired =
    searchParams.get("expired") === "true" ||
    Boolean((location.state as any)?.sessionExpired);
  const [sessionExpiredNotice, setSessionExpiredNotice] =
    useState<boolean>(isSessionExpired);

  // Form State
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("string");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  /**
   * Submit credentials to FastAPI /api/admin_login via adminLogin (ApiPath.js)
   */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSessionExpiredNotice(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your admin email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your admin password.");
      return;
    }

    setIsLoading(true);

    try {
      // Call Admin Login API from ApiPath.js
      const response: any = await adminLogin(trimmedEmail, password);

      // Handle backend response: { code: 200, message: "Login successful", results: [ ...adminDetails ] }
      const adminRecord =
        Array.isArray(response?.results) && response.results.length > 0
          ? response.results[0]
          : response?.results || response?.user || {};

      const token =
        adminRecord?.token ||
        adminRecord?.access_token ||
        response?.token ||
        response?.access_token ||
        `kaizen_auth_${Date.now()}`;

      const adminUser = {
        id: adminRecord?.id || adminRecord?.admin_id || 1,
        adminId: adminRecord?.admin_id || adminRecord?.id || 1,
        firstName: adminRecord?.first_name || adminRecord?.firstName || "Kaizen",
        lastName: adminRecord?.last_name || adminRecord?.lastName || "Admin",
        fullName:
          adminRecord?.full_name ||
          (adminRecord?.first_name
            ? `${adminRecord.first_name} ${adminRecord.last_name || ""}`.trim()
            : "Kaizen Administrator"),
        email: adminRecord?.email || trimmedEmail,
        role: adminRecord?.role || adminRecord?.admin_role || "Super Administrator",
        profileImage: adminRecord?.profile_image || adminRecord?.avatar || "",
      };

      // Persist authenticated session with 2-hour timeout timestamp
      saveAuthSession({
        token,
        user: adminUser,
        adminId: adminUser.id,
      });

      setSuccessMessage(response?.message || "Authentication successful! Redirecting...");
      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 500);
    } catch (err: any) {
      console.error("Login API call failed:", err);
      // Display the descriptive error returned from ApiPath / FastAPI
      const message =
        err?.message ||
        err?.data?.message ||
        "Invalid email or password. Please verify your credentials.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[380px] mx-auto">
      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-[#55355E] tracking-tight">
          Admin Sign In
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Access the Kaizen Con 2027 Management Portal
        </p>
      </div>

      {/* Session Expired Alert */}
      {sessionExpiredNotice && !errorMessage && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-[#faedf5] border border-[#AA2D7B]/30 text-[#55355E] text-xs animate-fadeIn"
        >
          <svg
            className="size-4 shrink-0 text-[#AA2D7B] mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1 font-normal leading-relaxed">
            Your admin session expired. Please sign in below to continue.
          </div>
          <button
            type="button"
            onClick={() => setSessionExpiredNotice(false)}
            className="text-gray-400 hover:text-gray-600 ml-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs animate-fadeIn"
        >
          <ErrorIcon className="size-4 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 font-normal leading-relaxed">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600 ml-1 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs animate-fadeIn"
        >
          <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
        {/* Email Address */}
        <div>
          <label
            htmlFor="admin-email"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Admin Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <EnvelopeIcon className="size-4" />
            </div>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={isLoading}
              className="w-full h-10.5 pl-10 pr-3.5 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#AA2D7B]/20 focus:border-[#AA2D7B] transition-all disabled:opacity-60"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="admin-password"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <LockIcon className="size-4" />
            </div>
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full h-10.5 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#AA2D7B]/20 focus:border-[#AA2D7B] transition-all disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? (
                <EyeCloseIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-gray-600 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-3.5 rounded border-gray-300 text-[#AA2D7B] focus:ring-[#AA2D7B]"
            />
            <span>Remember for 2 hours</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl bg-[#AA2D7B] hover:bg-[#D85A9A] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Verifying credentials...</span>
            </>
          ) : (
            <span>Sign In to Dashboard &rarr;</span>
          )}
        </button>
      </form>
    </div>
  );
}

/**
 * Main AuthLayout component
 * Provides brand visual presentation on the left and form on the right.
 * If children are provided, it renders them; otherwise it renders the integrated LoginForm.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#fdf5f9] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-outfit">
      {/* Centered Card */}
      <div className="w-full max-w-[1050px] bg-white rounded-2xl shadow-[0_20px_50px_-15px_rgba(85,53,94,0.15)] border border-gray-100 overflow-hidden flex flex-col lg:flex-row items-stretch min-h-[580px]">
        {/* Left Side: Brand Visual & Info */}
        <div className="w-full lg:w-[50%] bg-gradient-to-br from-[#55355E] via-[#AA2D7B] to-[#D85A9A] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Logo */}
          <div className="relative z-10">
            <div className="inline-block p-2 rounded-lg bg-white/95 backdrop-blur-xs border border-white/20 shadow-xs">
              <img
                src="/logokaizecon.png"
                alt="Kaizen Con 2027"
                className="h-9 w-auto object-contain"
              />
            </div>
          </div>

          {/* Headline & Description */}
          <div className="relative z-10 space-y-3.5 my-8">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white">
              Robotics &amp; AI Conference 2027
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
              Administration &amp; <br />
              Program Control
            </h1>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-sm">
              Manage keynote speakers, review submissions, coordinate multi-hall session schedules, and control user access.
            </p>

            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/95">
                <span className="w-2 h-2 rounded-full bg-[#faedf5]" />
                <span>Multi-Track Session Scheduling</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-white/95">
                <span className="w-2 h-2 rounded-full bg-[#faedf5]" />
                <span>Keynote Speakers &amp; Abstract Liaison</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-white/95">
                <span className="w-2 h-2 rounded-full bg-[#faedf5]" />
                <span>Role-Based Authentication &amp; Groups</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="relative z-10 text-[11px] text-white/70">
            &copy; 2027 Kaizen Con • All Rights Reserved
          </div>

          {/* Background Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#55355E]/40 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Right Side: Form (Renders children or built-in LoginForm) */}
        <div className="w-full lg:w-[50%] p-8 sm:p-10 flex flex-col justify-center bg-white">
          {children || <LoginForm />}
        </div>
      </div>
    </div>
  );
}
