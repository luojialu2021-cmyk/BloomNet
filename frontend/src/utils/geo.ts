import { Address, SitterProfile } from "../api/types";

type Coordinates = {
  lat: number;
  lng: number;
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function applyCoordinateJitter(base: Coordinates, sitter: SitterProfile): Coordinates {
  const key =
    (sitter.id || (sitter as { _id?: string })._id || sitter.name || "sitter") +
    (sitter.address?.address_1 || "");

  const hash = hashString(key);
  const latNoise = ((hash & 0xffff) / 0xffff - 0.5) * 0.012; // ~±0.006 degrees
  const lonSeed = (hash >>> 16) & 0xffff;
  const lonNoiseBase = (lonSeed / 0xffff - 0.5) * 0.018;

  const latRadians = (base.lat * Math.PI) / 180;
  const cosLat = Math.cos(latRadians);
  const safeCos = Math.abs(cosLat) < 0.4 ? 0.4 : cosLat;
  const lngNoise = lonNoiseBase / safeCos;

  return {
    lat: base.lat + latNoise,
    lng: base.lng + lngNoise,
  };
}

const ZIP_COORDINATES: Record<string, Coordinates> = {
  "21201": { lat: 39.2953, lng: -76.6235 },
  "21202": { lat: 39.2922, lng: -76.6069 },
  "21205": { lat: 39.2998, lng: -76.5581 },
  "21209": { lat: 39.3682, lng: -76.678 },
  "21210": { lat: 39.3524, lng: -76.6346 },
  "21211": { lat: 39.3305, lng: -76.6329 },
  "21213": { lat: 39.3048, lng: -76.584 },
  "21217": { lat: 39.311, lng: -76.6445 },
  "21218": { lat: 39.3299, lng: -76.6205 },
  "21224": { lat: 39.2868, lng: -76.5551 },
  "21230": { lat: 39.2731, lng: -76.6113 },
  "21231": { lat: 39.285, lng: -76.5945 },
  "21287": { lat: 39.2976, lng: -76.5924 },
  "20001": { lat: 38.9097, lng: -77.0163 },
  "20002": { lat: 38.9013, lng: -76.9906 },
  "20003": { lat: 38.8823, lng: -76.9949 },
  "20005": { lat: 38.9049, lng: -77.0287 },
  "20007": { lat: 38.9137, lng: -77.0703 },
  "20009": { lat: 38.919, lng: -77.0369 },
  "20010": { lat: 38.9325, lng: -77.0283 },
  "20011": { lat: 38.9519, lng: -77.019 },
  "20015": { lat: 38.9607, lng: -77.0671 },
  "20016": { lat: 38.9429, lng: -77.079 },
  "20017": { lat: 38.9365, lng: -76.9937 },
  "20024": { lat: 38.8784, lng: -77.0219 },
  "20032": { lat: 38.8406, lng: -77.0001 },
  "20036": { lat: 38.9053, lng: -77.0417 },
  "20057": { lat: 38.9087, lng: -77.0733 },
  "20418": { lat: 38.905, lng: -77.049 },
  "20815": { lat: 38.9793, lng: -77.0911 },
  "20816": { lat: 38.958, lng: -77.1267 },
  "22202": { lat: 38.8603, lng: -77.0531 },
};

export const DEFAULT_MAP_COORDS: Coordinates = ZIP_COORDINATES["21218"];

export function getCoordinatesForZip(zip?: string | null): Coordinates | null {
  if (!zip) {
    return null;
  }
  return ZIP_COORDINATES[zip] ?? null;
}

export function getCoordinatesForSitter(sitter: SitterProfile): Coordinates | null {
  const zipFromAddress = sitter.address?.zipcode;
  let base = getCoordinatesForZip(zipFromAddress);

  if (!base) {
    for (const area of sitter.service_areas || []) {
      const coords = getCoordinatesForZip(area);
      if (coords) {
        base = coords;
        break;
      }
    }
  }

  if (!base) {
    return null;
  }

  return applyCoordinateJitter(base, sitter);
}

export function formatAddress(address: Address | undefined): string {
  if (!address) {
    return "";
  }

  const parts = [
    address.address_1,
    address.address_2,
    address.city,
    address.state,
    address.zipcode,
  ].filter(Boolean);

  return parts.join(", ");
}

export function formatSitterAddress(sitter: SitterProfile): string {
  const direct = formatAddress(sitter.address);
  if (direct) {
    return direct;
  }

  if (sitter.service_areas?.length) {
    return sitter.service_areas.join(", ");
  }

  return "Baltimore, MD";
}
