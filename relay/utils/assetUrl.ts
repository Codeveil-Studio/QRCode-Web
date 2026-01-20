// Utility functions for generating report URLs with asset name and location
// This allows report pages to work without any database access for public users

interface AssetData {
  uid: string;
  name: string;
  location: string;
}

/**
 * Generate a report URL with asset name and location as URL parameters
 */
export function generateReportUrl(
  asset: AssetData,
  baseUrl: string = ""
): string {
  const params = new URLSearchParams({
    name: asset.name,
    location: asset.location,
  });

  return `${baseUrl}/report/${asset.uid}?${params.toString()}`;
}

/**
 * Extract asset data from URL search parameters
 */
export function getAssetDataFromUrl(
  searchParams: URLSearchParams
): AssetData | null {
  const name = searchParams.get("name");
  const location = searchParams.get("location");

  if (!name || !location) {
    return null;
  }

  return {
    uid: "", // Will be set from the route parameter
    name: decodeURIComponent(name),
    location: decodeURIComponent(location),
  };
}
