// Bangladesh Divisions, Districts, and Upazilas Data Utility

export interface Union {
  name: string;
}

export interface Upazila {
  নাম: string;
  ইউনিয়ন?: string[];
}

export interface District {
  নাম: string;
  উপজেলা: Upazila[];
}

export interface Division {
  নাম: string;
  জেলা: District[];
}

export interface LocationData {
  বিভাগ: Division[];
}

// Cache for loaded data
let cachedData: LocationData | null = null;

/**
 * Load Bangladesh location data from JSON file
 */
export async function loadLocationData(): Promise<LocationData> {
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await fetch('/api/locations');
    if (!response.ok) {
      throw new Error('Failed to load location data');
    }
    cachedData = await response.json();
    return cachedData;
  } catch (error) {
    console.error('Error loading location data:', error);
    // Return empty structure as fallback
    return { বিভাগ: [] };
  }
}

/**
 * Get all divisions
 */
export async function getDivisions(): Promise<string[]> {
  const data = await loadLocationData();
  return data.বিভাগ.map((div) => div.নাম);
}

/**
 * Get districts for a given division
 */
export async function getDistricts(divisionName: string): Promise<string[]> {
  const data = await loadLocationData();
  const division = data.বিভাগ.find((div) => div.নাম === divisionName);
  if (!division) return [];
  return division.জেলা.map((dist) => dist.নাম);
}

/**
 * Get upazilas for a given division and district
 */
export async function getUpazilas(
  divisionName: string,
  districtName: string
): Promise<string[]> {
  const data = await loadLocationData();
  const division = data.বিভাগ.find((div) => div.নাম === divisionName);
  if (!division) return [];

  const district = division.জেলা.find((dist) => dist.নাম === districtName);
  if (!district) return [];

  return district.উপজেলা.map((upz) => upz.নাম);
}

/**
 * Get unions for a given division, district, and upazila
 */
export async function getUnions(
  divisionName: string,
  districtName: string,
  upazilaName: string
): Promise<string[]> {
  const data = await loadLocationData();
  const division = data.বিভাগ.find((div) => div.নাম === divisionName);
  if (!division) return [];

  const district = division.জেলা.find((dist) => dist.নাম === districtName);
  if (!district) return [];

  const upazila = district.উপজেলা.find((upz) => upz.নাম === upazilaName);
  if (!upazila || !upazila.ইউনিয়ন) return [];

  return upazila.ইউনিয়ন;
}

