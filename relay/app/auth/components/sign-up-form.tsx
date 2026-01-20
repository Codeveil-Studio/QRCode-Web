"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { signUpWithEmail } from "../actions";

interface SignUpFormProps {
  onSubmit: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
}

export default function SignUpForm({ onSubmit }: SignUpFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: "",
    color: "",
  });

  // Progressive field visibility logic
  const shouldShowLastName = firstName.trim().length > 0;
  const shouldShowEmail = lastName.trim().length > 0;
  const shouldShowPassword =
    email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const shouldShowSubmitButton =
    password.length > 0 && passwordStrength.score >= 3;

  // Check password strength
  useEffect(() => {
    if (!password) {
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
  }, [password]);

  const validateForm = () => {
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
      await onSubmit(email, password, firstName, lastName);
    } catch (error) {
      console.error("Unexpected error during sign up:", error);
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
    if (!password) return null;

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

  const getProgressStep = () => {
    if (!firstName.trim()) return 1;
    if (!lastName.trim()) return 2;
    if (!shouldShowPassword) return 3;
    if (!shouldShowSubmitButton) return 4;
    return 5;
  };

  const totalSteps = 5;
  const currentStep = getProgressStep();

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* First Name - Always shown */}
        <div className="transition-all duration-300">
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            disabled={loading}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter your first name"
          />
        </div>

        {/* Last Name - Show after first name */}
        {shouldShowLastName && (
          <div className="transition-all duration-300 animate-in slide-in-from-top-2">
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              disabled={loading}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your last name"
            />
          </div>
        )}

        {/* Email - Show after last name */}
        {shouldShowEmail && (
          <div className="transition-all duration-300 animate-in slide-in-from-top-2">
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
              className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your email address"
            />
          </div>
        )}

        {/* Password - Show after valid email */}
        {shouldShowPassword && (
          <div className="transition-all duration-300 animate-in slide-in-from-top-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Create a strong password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg
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
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  </svg>
                )}
              </button>
            </div>
            {password && passwordStrength.message && (
              <div className="mt-2 flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.score <= 2
                        ? "bg-red-500"
                        : passwordStrength.score === 3
                        ? "bg-yellow-500"
                        : passwordStrength.score === 4
                        ? "bg-green-500"
                        : "bg-green-600"
                    }`}
                    style={{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                    }}
                  ></div>
                </div>
                <span
                  className={`text-xs font-medium ${passwordStrength.color}`}
                >
                  {passwordStrength.message}
                </span>
              </div>
            )}
            {renderPasswordRequirements()}
          </div>
        )}

        {/* Submit Button - Show after password meets requirements */}
        {shouldShowSubmitButton && (
          <div className="transition-all duration-300 animate-in slide-in-from-top-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                  Creating account...
                </div>
              ) : (
                "Create account"
              )}
            </button>
          </div>
        )}
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            Sign in instead
          </Link>
        </p>
      </div>

      <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start">
          <svg
            className="h-5 w-5 text-gray-400 mt-0.5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <div>
            <p className="text-xs font-medium text-gray-900">
              Secure Registration
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Your information is encrypted and stored securely. We never share
              your data with third parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
