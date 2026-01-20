"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import QRCode from "qrcode";
import html2pdf from "html2pdf.js";
import html2canvas from "html2canvas";
import { Download, QrCode, Loader2, FileText, Search } from "lucide-react";
import { generateReportUrl } from "@/utils/assetUrl";
import { generateAssetQRPDFHTML } from "./AssetQRPDFTemplate";

interface Asset {
  id: number;
  uid: string;
  name: string;
  type: string;
  location: string;
  status: string;
  metadata?: {
    department?: string;
    criticality?: string;
    description?: string;
  };
}

interface QRCodeGeneratorProps {
  assets: Asset[];
}

export function QRCodeGenerator({ assets }: QRCodeGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const downloadSinglePDF = async (asset: Asset) => {
    setLoading(true);
    try {
      // Generate QR code URL
      const qrUrl = generateReportUrl(
        {
          uid: asset.uid,
          name: asset.name,
          location: asset.location,
        },
        window.location.origin
      );

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 500,
        margin: 3,
        color: {
          dark: "#1F2937",
          light: "#FFFFFF",
        },
      });

      // Generate HTML content using the template
      const htmlContent = generateAssetQRPDFHTML(asset, qrCodeDataUrl);

      // Create a temporary div with the HTML content
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "-9999px";
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);

      // Wait for images to load
      await new Promise<void>((resolve) => {
        const images = tempDiv.querySelectorAll("img");
        if (images.length === 0) {
          setTimeout(resolve, 100);
          return;
        }

        let loadedImages = 0;
        images.forEach((img) => {
          if (img.complete) {
            loadedImages++;
          } else {
            img.onload = () => {
              loadedImages++;
              if (loadedImages === images.length) {
                setTimeout(resolve, 100);
              }
            };
          }
        });

        if (loadedImages === images.length) {
          setTimeout(resolve, 100);
        }
      });

      // Configure PDF options
      const opt = {
        margin: 0,
        filename: `Relay-${asset.name.replace(/[^a-zA-Z0-9]/g, "-")}-QR.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "white",
        },
        jsPDF: {
          unit: "mm",
          format: "a5",
          orientation: "portrait",
        },
      };

      // Generate and save PDF
      const targetElement = tempDiv.firstElementChild;
      if (!targetElement) {
        throw new Error("Failed to create PDF template element");
      }
      await html2pdf()
        .set(opt)
        .from(targetElement as HTMLElement)
        .save();

      // Clean up
      document.body.removeChild(tempDiv);

      toast.success("QR code PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate QR code PDF");
    } finally {
      setLoading(false);
    }
  };

  const downloadBulkPDFs = async () => {
    if (selectedAssets.length === 0) {
      toast.error("Please select assets to download");
      return;
    }

    setLoading(true);
    try {
      const selectedAssetObjects = selectedAssets
        .map((id) => assets.find((asset) => asset.id === id))
        .filter(Boolean) as Asset[];

      // Prepare all page elements first
      const pageElements: HTMLElement[] = [];
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      document.body.appendChild(tempContainer);

      // Generate all QR codes and create page elements
      for (const asset of selectedAssetObjects) {
        // Generate QR code URL
        const qrUrl = generateReportUrl(
          {
            uid: asset.uid,
            name: asset.name,
            location: asset.location,
          },
          window.location.origin
        );

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 500,
          margin: 3,
          color: {
            dark: "#1F2937",
            light: "#FFFFFF",
          },
        });

        // Generate HTML content
        const htmlContent = generateAssetQRPDFHTML(asset, qrCodeDataUrl);

        // Create page element
        const pageDiv = document.createElement("div");
        pageDiv.innerHTML = htmlContent;
        const pageElement = pageDiv.firstElementChild as HTMLElement;

        tempContainer.appendChild(pageElement);
        pageElements.push(pageElement);
      }

      // Wait for all images to load
      await new Promise<void>((resolve) => {
        const images = tempContainer.querySelectorAll("img");
        if (images.length === 0) {
          setTimeout(resolve, 100);
          return;
        }

        let loadedImages = 0;
        images.forEach((img) => {
          if (img.complete) {
            loadedImages++;
          } else {
            img.onload = () => {
              loadedImages++;
              if (loadedImages === images.length) {
                setTimeout(resolve, 200);
              }
            };
            img.onerror = () => {
              loadedImages++;
              if (loadedImages === images.length) {
                setTimeout(resolve, 200);
              }
            };
          }
        });

        if (loadedImages === images.length) {
          setTimeout(resolve, 200);
        }
      });

      // Configure PDF options
      const opt = {
        margin: 0,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "white",
          logging: false,
        },
        jsPDF: {
          unit: "mm",
          format: "a5",
          orientation: "portrait",
        },
      };

      // Use html2pdf worker to add pages programmatically
      const worker = html2pdf().set(opt);

      // Process first page and get PDF object
      const pdfWorker = worker.from(pageElements[0]).toPdf();

      await pdfWorker.get("pdf").then(async (pdf: any) => {
        // Add remaining pages
        for (let i = 1; i < pageElements.length; i++) {
          // Add new page
          pdf.addPage();

          // Convert current page element to canvas
          const canvas = await html2canvas(pageElements[i], {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "white",
            logging: false,
          });

          // Get canvas dimensions and calculate PDF dimensions
          const imgData = canvas.toDataURL("image/jpeg", 0.98);
          const imgWidth = 148; // A5 width in mm
          const imgHeight = 210; // A5 height in mm

          // Add image to PDF
          pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
        }

        // Save the PDF
        return pdf.save(
          `Relay-QR-Codes-${new Date().toISOString().split("T")[0]}.pdf`
        );
      });

      // Clean up
      document.body.removeChild(tempContainer);

      toast.success(
        `Downloaded ${selectedAssets.length} QR code PDFs successfully!`
      );
    } catch (error) {
      console.error("Bulk PDF generation error:", error);
      toast.error("Failed to generate bulk QR code PDFs");
    } finally {
      setLoading(false);
    }
  };

  const toggleAssetSelection = (assetId: number) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  const selectAll = () => {
    setSelectedAssets(assets.map((asset) => asset.id));
  };

  const deselectAll = () => {
    setSelectedAssets([]);
  };

  // Filter assets based on search query
  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (assets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <QrCode className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <h3 className="text-base font-medium text-gray-900 mb-1">
          No Assets Available
        </h3>
        <p className="text-sm text-gray-500">
          Add some assets first to generate QR codes.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            QR Code Generator
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Create printable QR codes for issue reporting
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
          />
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-500 mt-2">
            {filteredAssets.length} of {assets.length} assets match "
            {searchQuery}"
          </p>
        )}
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              setSelectedAssets(filteredAssets.map((asset) => asset.id))
            }
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            Clear
          </button>
          {selectedAssets.length > 0 && (
            <span className="text-sm text-gray-500">
              {selectedAssets.length} selected
            </span>
          )}
        </div>
        {selectedAssets.length > 0 && (
          <button
            onClick={downloadBulkPDFs}
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PDFs
          </button>
        )}
      </div>

      {/* Assets List */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            {searchQuery
              ? `No assets found matching "${searchQuery}"`
              : "No assets available"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedAssets.includes(asset.id)}
                  onChange={() => toggleAssetSelection(asset.id)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:ring-1"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {asset.name || "Unnamed Asset"}
                  </h4>
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {asset.location}
                  </p>
                </div>
              </div>

              <button
                onClick={() => downloadSinglePDF(asset)}
                disabled={loading}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-gray-700"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
