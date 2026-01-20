"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AuthFormProps {
  mode: "login" | "signup" | "forgot-password";
  onSubmit: (email: string, password?: string) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
}

export default function AuthForm({
  mode,
  onSubmit,
  onGoogleSignIn,
}: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: "",
    color: "",
  });

  // Check password strength
  useEffect(() => {
    if (!password || mode === "login" || mode === "forgot-password") {
      setPasswordStrength({
        score: 0,
        message: "",
        color: "",
      });
      return;
    }

    // Password strength criteria
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const criteria = [
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumbers,
      hasSpecialChar,
    ];
    const score = criteria.filter(Boolean).length;

    let message = "";
    let color = "";

    switch (score) {
      case 0:
      case 1:
        message = "Very weak";
        color = "text-red-600";
        break;
      case 2:
        message = "Weak";
        color = "text-orange-600";
        break;
      case 3:
        message = "Medium";
        color = "text-yellow-600";
        break;
      case 4:
        message = "Strong";
        color = "text-green-600";
        break;
      case 5:
        message = "Very strong";
        color = "text-green-700";
        break;
      default:
        break;
    }

    setPasswordStrength({ score, message, color });
  }, [password, mode]);

  const validateForm = () => {
    if (mode === "signup") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long");
        return false;
      }
      if (passwordStrength.score < 3) {
        setError(
          "Please use a stronger password with uppercase, lowercase, numbers, and special characters"
        );
        return false;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      await onSubmit(email, password);
    } catch (error) {
      console.error("Unexpected error during auth:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordRequirements = () => {
    if (mode !== "signup" || !password) return null;

    return (
      <div className="mt-2 space-y-1 text-xs">
        <p className="text-gray-700 font-medium">Password requirements:</p>
        <ul className="space-y-1 text-gray-600">
          <li
            className={
              password.length >= 8 ? "text-green-600" : "text-gray-500"
            }
          >
            {password.length >= 8 ? "✓" : "○"} At least 8 characters
          </li>
          <li
            className={
              /[A-Z]/.test(password) ? "text-green-600" : "text-gray-500"
            }
          >
            {/[A-Z]/.test(password) ? "✓" : "○"} At least one uppercase letter
          </li>
          <li
            className={
              /[a-z]/.test(password) ? "text-green-600" : "text-gray-500"
            }
          >
            {/[a-z]/.test(password) ? "✓" : "○"} At least one lowercase letter
          </li>
          <li
            className={/\d/.test(password) ? "text-green-600" : "text-gray-500"}
          >
            {/\d/.test(password) ? "✓" : "○"} At least one number
          </li>
          <li
            className={
              /[!@#$%^&*(),.?":{}|<>]/.test(password)
                ? "text-green-600"
                : "text-gray-500"
            }
          >
            {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "✓" : "○"} At least one
            special character
          </li>
        </ul>
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-center text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl mb-6">
        {mode === "login"
          ? "Welcome back"
          : mode === "signup"
          ? "Create account"
          : "Reset password"}
      </h1>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={loading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {mode !== "forgot-password" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              {mode === "login" && (
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required={mode === "login" || mode === "signup"}
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7A9.97 9.97 0 014.02 8.971m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {mode === "signup" && password && (
              <div className="mt-1 flex items-center">
                <div className="flex-grow">
                  <div className="h-1.5 flex rounded-full overflow-hidden">
                    <div
                      className={`flex-grow ${
                        passwordStrength.score >= 1
                          ? "bg-red-500"
                          : "bg-gray-200"
                      }`}
                    ></div>
                    <div
                      className={`flex-grow ${
                        passwordStrength.score >= 2
                          ? "bg-orange-500"
                          : "bg-gray-200"
                      }`}
                    ></div>
                    <div
                      className={`flex-grow ${
                        passwordStrength.score >= 3
                          ? "bg-yellow-500"
                          : "bg-gray-200"
                      }`}
                    ></div>
                    <div
                      className={`flex-grow ${
                        passwordStrength.score >= 4
                          ? "bg-green-500"
                          : "bg-gray-200"
                      }`}
                    ></div>
                    <div
                      className={`flex-grow ${
                        passwordStrength.score >= 5
                          ? "bg-green-700"
                          : "bg-gray-200"
                      }`}
                    ></div>
                  </div>
                </div>
                <span
                  className={`ml-2 text-xs font-medium ${passwordStrength.color}`}
                >
                  {passwordStrength.message}
                </span>
              </div>
            )}
            {renderPasswordRequirements()}
          </div>
        )}

        {mode === "signup" && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7A9.97 9.97 0 014.02 8.971m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-600">
                Passwords do not match
              </p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="mt-1 text-xs text-green-600">Passwords match</p>
            )}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={
              loading || (mode === "signup" && password !== confirmPassword)
            }
            className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${
              loading || (mode === "signup" && password !== confirmPassword)
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            } transition-colors`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : mode === "forgot-password" ? (
              "Send reset link"
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </div>
      </form>

      {mode !== "forgot-password" && onGoogleSignIn && (
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={onGoogleSignIn}
              disabled={loading}
              type="button"
              className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path
                    fill="#4285F4"
                    d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                  />
                </g>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-gray-600">
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-semibold text-blue-600 hover:text-blue-500"
            >
              Sign up now
            </Link>
          </>
        ) : mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            Remember your password?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-blue-600 hover:text-blue-500"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
