"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassButton } from "@/app/components/ui/GlassButton";

// Safe client-side only hook to prevent hydration mismatches
function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return isMounted;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMounted = useIsMounted();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Navigation guard to prevent redirect loops
  const hasRedirected = useRef(false);

  // Load remembered username (client-side only)
  useEffect(() => {
    if (!isMounted) return;
    try {
      const remembered = localStorage.getItem("ec_remember_username");
      if (remembered) {
        setUsername(remembered);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage access errors in restricted browser modes.
    }
  }, [isMounted]);

  // Debug info for troubleshooting mobile cookie issues
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setDebugInfo(null);
    setLoading(true);

    try {
      const trimmedUsername = username.trim();
      
      // Step 1: Login
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: trimmedUsername, 
          password: password 
        }),
        credentials: "include",
      });

      const loginData = await loginRes.json();
      
      if (!loginRes.ok || !loginData.ok) {
        throw new Error(loginData.error || "Login failed");
      }

      setSuccess("Login successful! Verifying session...");

      // Step 2: Verify session with retry logic
      let meData = null;
      let meRes = null;
      let retries = 3;
      let lastError = null;
      
      // Wait longer for cookie to be properly set (especially on mobile)
      await new Promise(r => setTimeout(r, 500));
      
      while (retries > 0) {
        meRes = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Accept": "application/json",
          },
        });
        
        meData = await meRes.json();
        
        if (meRes.ok && meData.ok) {
          break; // Success!
        }
        
        lastError = meData.error || `HTTP ${meRes.status}`;
        console.log(`[LOGIN] Session check attempt ${4 - retries} failed:`, lastError);
        console.log(`[LOGIN] Current cookies:`, document.cookie);
        retries--;
        
        if (retries > 0) {
          // Wait before retry
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      if (retries === 0 && (!meRes?.ok || !meData?.ok)) {
        // Build debug info for troubleshooting
        const debug = {
          userAgent: navigator.userAgent,
          cookies: document.cookie,
          loginResponse: loginData,
          meResponse: meData,
          lastError,
          timestamp: new Date().toISOString(),
        };
        setDebugInfo(JSON.stringify(debug, null, 2));
        throw new Error(`Session verification failed: ${lastError}`);
      }

      // Save username if remember me is checked (client-side only)
      if (isMounted) {
        try {
          if (rememberMe) {
            localStorage.setItem("ec_remember_username", trimmedUsername);
          } else {
            localStorage.removeItem("ec_remember_username");
          }
        } catch {
          // Ignore storage errors; login can continue without remember-me persistence.
        }
      }

      // Redirect to original destination when safe, otherwise app home.
      // Keep legacy /dashboard links working by mapping them to root.
      const requestedRedirect = searchParams.get("redirect");
      const safeRedirect = requestedRedirect && requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
        ? requestedRedirect
        : "/";
      const redirectTo = safeRedirect === "/dashboard" ? "/" : safeRedirect;
      console.log(`[LOGIN] Redirecting to ${redirectTo}`);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }


  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Animated Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-emerald-400/12 via-emerald-500/6 to-transparent blur-3xl dark:from-emerald-500/10 dark:via-transparent animate-float-slow" />
        <div className="absolute bottom-0 right-0 h-[460px] w-[460px] rounded-full bg-gradient-to-tl from-red-400/12 via-red-500/8 to-transparent blur-3xl dark:from-red-500/10 dark:via-transparent animate-float-slow-reverse" />
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 shadow-[0_16px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:bg-slate-900/82 dark:border-slate-600/35 dark:shadow-[0_20px_40px_rgba(2,6,23,0.56)]">
          
          {/* Header */}
          <div className="relative h-32 bg-gradient-to-r from-emerald-600 to-emerald-500 overflow-visible">
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-slate-900/90 to-transparent" />
            
            {/* Logo */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <div className="w-16 h-16 rounded-2xl bg-white border border-white/70 shadow-xl flex items-center justify-center p-2">
                <img
                  src="/logo.png"
                  alt="Emerald Cash"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-10 pb-6 px-6">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Emerald Cash
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                Vehicle Management System
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white/95 px-4 text-[var(--text)] shadow-inner shadow-slate-900/5 transition-all duration-200 placeholder:text-[var(--muted)] focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 disabled:opacity-60 dark:bg-slate-800/80 dark:border-slate-500/45 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-white/95 px-4 pr-12 text-[var(--text)] shadow-inner shadow-slate-900/5 transition-all duration-200 placeholder:text-[var(--muted)] focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 disabled:opacity-60 dark:bg-slate-800/80 dark:border-slate-500/45 dark:text-slate-100 dark:placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--muted)] transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 dark:hover:bg-slate-700/55 dark:hover:text-emerald-300"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 dark:border-slate-500 dark:bg-slate-800"
                />
                <span className="text-sm text-[var(--muted)]">Remember me</span>
              </label>

              {/* Success message */}
              {success && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm text-center">
                  {success}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Debug info for troubleshooting */}
              {debugInfo && (
                <div className="mt-4">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-[var(--muted)] hover:text-[var(--text)]">
                      Debug Info (tap to expand)
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded border border-[var(--border)] bg-slate-100/80 p-2 text-[var(--muted)] dark:bg-slate-900/80">
                      {debugInfo}
                    </pre>
                    <button
                      onClick={() => {
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(debugInfo);
                          alert("Debug info copied to clipboard!");
                        } else {
                          alert("Clipboard API is not available in this browser.");
                        }
                      }}
                      className="mt-2 text-emerald-600 hover:text-emerald-700 text-xs underline"
                    >
                      Copy to clipboard
                    </button>
                  </details>
                </div>
              )}

              {/* Submit */}
              <GlassButton
                type="submit"
                disabled={loading}
                variant="primary"
                fullWidth
                isLoading={loading}
                className="!py-3"
              >
                {loading ? "Signing in..." : "Sign In"}
              </GlassButton>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700/80 flex items-center justify-center">
              <p className="text-xs text-[var(--muted)]">© 2024 Emerald Cash</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ec-float-slow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(20px, -20px, 0) scale(1.05); }
        }
        @keyframes ec-float-slow-reverse {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-20px, 20px, 0) scale(1.03); }
        }
        .animate-float-slow { animation: ec-float-slow 20s ease-in-out infinite; }
        .animate-float-slow-reverse { animation: ec-float-slow-reverse 25s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="w-full max-w-[400px]">
          <div className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-slate-900/82 backdrop-blur-xl border border-white/50 dark:border-slate-600/35 shadow-2xl p-8">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
