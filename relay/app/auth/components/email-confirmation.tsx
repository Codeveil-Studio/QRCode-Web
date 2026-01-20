"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Mail,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { authAPI } from "../../../utils/api";

interface EmailConfirmationProps {
  userEmail: string;
  userId?: string;
  onConfirmed: () => void;
  onBack: () => void;
}

export default function EmailConfirmation({
  userEmail,
  userId,
  onConfirmed,
  onBack,
}: EmailConfirmationProps) {
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Check confirmation status periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;

    // Check immediately when component mounts
    checkConfirmationStatus();

    // Then check every 3 seconds
    interval = setInterval(checkConfirmationStatus, 10000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Cooldown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCooldown]);

  const checkConfirmationStatus = async () => {
    if (checkingStatus || !userId) return;

    setCheckingStatus(true);
    try {
      const result = await authAPI.checkEmailConfirmation(userId);

      if (result.success && result.data?.emailConfirmed) {
        setIsConfirmed(true);
        toast.success("Email confirmed successfully!");
        setTimeout(() => {
          onConfirmed();
        }, 1500);
      }
    } catch (error) {
      // Silently handle errors in status checking
      console.error("Error checking confirmation status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleResendConfirmation = async () => {
    setLoading(true);
    try {
      const result = await authAPI.resendConfirmation(userEmail);

      if (result.success) {
        toast.success("Confirmation email resent!");
        setResendCooldown(60); // 60 second cooldown
      } else {
        toast.error(result.error || "Failed to resend confirmation email");
      }
    } catch (error) {
      toast.error("Failed to resend confirmation email");
      console.error("Resend confirmation error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isConfirmed) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Email Confirmed!
          </h2>
          <p className="text-gray-600">
            Your email has been successfully verified. You'll be redirected to
            complete your setup.
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
          <h3 className="font-semibold text-green-900 mb-2">Almost Done!</h3>
          <p className="text-sm text-green-700">
            Now let's set up your organization so you can start using Relay.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Check Your Email
        </h2>
        <p className="text-gray-600">
          We've sent a confirmation link to{" "}
          <span className="font-medium text-gray-900">{userEmail}</span>
        </p>
      </div>

      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">What to do next:</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-blue-600">1</span>
            </div>
            <p className="text-sm text-gray-700">
              Open your email inbox and look for our confirmation email
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-blue-600">2</span>
            </div>
            <p className="text-sm text-gray-700">
              Click the confirmation link in the email
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-blue-600">3</span>
            </div>
            <p className="text-sm text-gray-700">
              Return to this page to continue your setup
            </p>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Clock className="h-4 w-4" />
        <span>
          {checkingStatus
            ? "Checking confirmation status..."
            : "Waiting for email confirmation"}
        </span>
        {checkingStatus && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent ml-2"></div>
        )}
      </div>

      {/* Resend button */}
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          Didn't receive the email? Check your spam folder or request a new one.
        </p>
        <button
          onClick={handleResendConfirmation}
          disabled={loading || resendCooldown > 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : loading
            ? "Sending..."
            : "Resend confirmation email"}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={checkConfirmationStatus}
          disabled={checkingStatus}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
        >
          {checkingStatus ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Checking...
            </>
          ) : (
            <>
              Check Status
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
