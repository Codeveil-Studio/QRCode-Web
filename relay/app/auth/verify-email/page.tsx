"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="text-center py-8">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
        <svg
          className="h-6 w-6 text-green-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Verification email sent!
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        We&apos;ve sent a verification link to your email. Please check your
        inbox and click the link to verify your account.
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Didn&apos;t receive the email? Check your spam folder or{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-blue-600 hover:text-blue-500"
        >
          try again
        </Link>
      </p>
    </div>
  );
}
