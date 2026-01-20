"use client";

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface IssueImageDisplayProps {
  imageUrl: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export function IssueImageDisplay({
  imageUrl,
  alt = "Issue attachment",
  className = "max-w-48 h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90",
  onClick,
}: IssueImageDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (imageUrl) {
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <>
      {loading && !error && (
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading image...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="ml-2 text-sm text-red-600">
            {error || "Image not available"}
          </span>
        </div>
      )}

      {!error && (
        <img
          src={imageUrl}
          alt={alt}
          className={`${className} ${loading ? "hidden" : ""}`}
          onClick={handleClick}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError("Failed to load image");
            setLoading(false);
          }}
          loading="lazy"
        />
      )}
    </>
  );
}
