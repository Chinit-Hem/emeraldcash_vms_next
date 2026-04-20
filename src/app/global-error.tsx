"use client";

/**
 * Global Error Handler
 * 
 * Catches errors that escape all other error boundaries.
 * This is the last line of defense for the application.
 * 
 * @module app/global-error
 */

import { useEffect } from "react";
import { globalLogger } from "@/lib/logger";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log critical error
    globalLogger.fatal("Global error handler caught critical error", error, {
      digest: error.digest,
      component: "GlobalError",
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });

    // Optional: Send to external error tracking service
    // Example: Sentry.captureException(error, { level: 'fatal' });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-red-950">
        <div className="w-full max-w-lg">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-red-100 dark:ring-red-900/30 p-8 text-center">
            {/* Critical Error Icon */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12 text-red-600 dark:text-red-400"
              >
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            {/* Critical Error Title */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Critical Error
            </h1>

            {/* User-friendly message */}
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg leading-relaxed">
              A critical error has occurred that prevents the application from loading.
            </p>

            {/* Error ID for support */}
            {error.digest && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                  Please provide this error ID when contacting support:
                </p>
                <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700/50 px-4 py-2 rounded-lg inline-block text-gray-700 dark:text-gray-300">
                  {error.digest}
                </p>
              </div>
            )}

            {/* Recovery button */}
            <button
              onClick={reset}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-target text-lg"
            >
              Reload Application
            </button>

            {/* Emergency contact */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-500">
                If the problem persists, please contact our support team immediately.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
