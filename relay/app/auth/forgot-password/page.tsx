"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AuthForm from "../components/auth-form";
import { resetPassword } from "../actions";
import ForgotPasswordForm from "../components/forgot-password-form";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleSubmit = async (email: string) => {
    const result = await resetPassword(email);
    if (result.success) {
      toast.success("Password reset link sent to your email!");
      router.push("/auth/login");
    } else {
      throw new Error(result.error || "Failed to send reset link");
    }
  };

  return <ForgotPasswordForm />;
}
