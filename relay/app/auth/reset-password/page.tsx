"use client";

import { Suspense } from "react";
import ResetPasswordForm from "../components/reset-password-form";

function ResetPasswordPageContent() {
  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}
