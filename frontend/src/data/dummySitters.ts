export type Sitter = {
  id: string;
  name: string;
  tagline: string;
  pricePerVisit: number;
  rating: number;
  reviews: number;
  bio: string;
  serviceAreas: string[];
  specialties: string[];
  badges?: string[];
  unavailable?: string[];
};

export const DUMMY_SITTERS: Sitter[] = [
  {
    id: "ivy",
    name: "Ivy Chen",
    tagline: "Snuggles, Sunlight & Soil Sense",
    pricePerVisit: 22,
    rating: 4.9,
    reviews: 64,
    bio: "Grad student in Biology @JHU. Specializes in succulents.",
    serviceAreas: ["21218", "21211"],
    specialties: ["Succulents", "Propagation"],
    badges: ["Top Rated"],
    unavailable: ["2025-10-10"]
  },
  {
    id: "fernando",
    name: "Fernando Alvarez",
    tagline: "Plant Whisperer of Hampden",
    pricePerVisit: 19,
    rating: 4.8,
    reviews: 31,
    bio: "JHU staff. I care for herbs, hoyas, and bonsai.",
    serviceAreas: ["21211", "21218"],
    specialties: ["Herbs", "Bonsai"],
    badges: ["Background-checked"],
    unavailable: []
  }
];
