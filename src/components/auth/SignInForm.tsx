import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  EyeCloseIcon,
  EyeIcon,
  EnvelopeIcon,
  LockIcon,
  ErrorIcon,
  CheckCircleIcon,
} from "../../icons";
import { validateAdminCredential, saveAuthSession } from "../../services/authService";

export default function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as any)?.from?.pathname || "/";

  // Check if redirected because of 2-hour session timeout
  const searchParams = new URLSearchParams(location.search);
  const isSessionExpired = searchParams.get("expired") === "true" || Boolean((location.state as any)?.sessionExpired);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<boolean>(isSessionExpired);

  // Form State
  const [emailOrUsername, setEmailOrUsername] = useState("user@example.com");
  const [password, setPassword] = useState("string");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const performLogin = (userEmail: string) => {
    saveAuthSession({
      token: "kaizen_auth_token_" + Date.now(),
      user: {
        firstName: "Kaizen",
        lastName: "Admin",
        email: userEmail,
        role: "Super Administrator",
      },
      adminId: 1,
    });
    setSuccessMessage("Authentication successful! Redirecting to Kaizen Con Admin...");
    setTimeout(() => {
      navigate(destination, { replace: true });
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSessionExpiredNotice(false);

    const trimmedUser = emailOrUsername.trim();
    if (!trimmedUser) {
      setErrorMessage("Please enter your admin email or username.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const result: any = await validateAdminCredential(trimmedUser, password);

      if (result && result.success) {
        setSuccessMessage(result.message || "Authentication successful! Redirecting...");
        setTimeout(() => {
          navigate(destination, { replace: true });
        }, 500);
      } else {
        setErrorMessage(result?.message || "Invalid email or password. Please verify your credentials.");
      }
    } catch (err: any) {
      console.error("Login request error:", err);
      setErrorMessage(err?.message || "Failed to communicate with authentication server.");
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
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Address */}
        <div>
          <label
            htmlFor="admin-email"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Admin Email / Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <EnvelopeIcon className="size-4" />
            </div>
            <input
              id="admin-email"
              type="text"
              autoComplete="username"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
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
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Verifying credentials...</span>
            </>
          ) : (
            <span>Sign In to Dashboard &rarr;</span>
          )}
        </button>

        {/* Quick Demo Access Button */}
        <button
          type="button"
          onClick={() => performLogin("user@example.com")}
          className="w-full h-10 rounded-xl border border-[#AA2D7B]/30 hover:bg-[#faedf5] text-[#55355E] text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
        >
          Quick One-Click Admin Access
        </button>
      </form>
    </div>
  );
}
