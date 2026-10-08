import React, { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

export type FilterValues = {
  campus_area?: string;
  zip_code?: string;  // ZIP code filter
  specialties?: string[];
  price_min?: number;
  price_max?: number;
  rating_min?: number;
  experience_levels?: string[];
  max_service_radius?: number;
  verified_only?: boolean;
  background_checked_only?: boolean;
};

type FiltersProps = {
  value: FilterValues;
  onChange: (filters: FilterValues) => void;
};

const campusAreas = ["Homewood", "East Baltimore", "Peabody", "Other"];
const specialtyOptions = [
  "succulent",
  "cactus",
  "flower",
  "herb",
  "fern",
  "propagation",
  "soil science",
  "pest management",
  "hydroponics",
  "repotting",
  "organic methods",
  "humidity control",
  "low-light care",
];
const experienceLevels: Array<"beginner" | "intermediate" | "expert"> = [
  "beginner",
  "intermediate",
  "expert",
];

type ArrayFilterKey = "specialties" | "experience_levels";
type BooleanFilterKey = "verified_only" | "background_checked_only";
type NumberFilterKey =
  | "price_min"
  | "price_max"
  | "rating_min"
  | "max_service_radius";
type StringFilterKey = "campus_area" | "zip_code";

const formatLabel = (label: string) =>
  label
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join("-")
    )
    .join(" ");

const Filters: React.FC<FiltersProps> = ({ value, onChange }) => {
  const [localFilters, setLocalFilters] = useState<FilterValues>(value);
  const [isOpen, setIsOpen] = useState(false);

  const booleanKeys: ReadonlyArray<BooleanFilterKey> = [
    "verified_only",
    "background_checked_only",
  ];
  const numberKeys: ReadonlyArray<NumberFilterKey> = [
    "price_min",
    "price_max",
    "rating_min",
    "max_service_radius",
  ];
  const stringKeys: ReadonlyArray<StringFilterKey> = [
    "campus_area",
    "zip_code",
  ];

  useEffect(() => {
    if (!isOpen) {
      setLocalFilters(value);
    }
  }, [value, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(value);
    }
  }, [isOpen, value]);

  const isBooleanKey = (key: string): key is BooleanFilterKey =>
    booleanKeys.includes(key as BooleanFilterKey);
  const isNumberKey = (key: string): key is NumberFilterKey =>
    numberKeys.includes(key as NumberFilterKey);
  const isStringKey = (key: string): key is StringFilterKey =>
    stringKeys.includes(key as StringFilterKey);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value: raw } = e.target;
    if (
      isBooleanKey(name) &&
      e.target instanceof HTMLInputElement &&
      e.target.type === "checkbox"
    ) {
      const checked = e.target.checked;
      const key = name;
      setLocalFilters((prev) => {
        const next: FilterValues = { ...prev };
        if (checked) {
          next[key] = true;
        } else {
          delete next[key];
        }
        return next;
      });
      return;
    }

    if (isNumberKey(name)) {
      const key = name;
      const parsed = raw === "" ? undefined : Number(raw);
      setLocalFilters((prev) => {
        const next: FilterValues = { ...prev };
        if (parsed === undefined || Number.isNaN(parsed)) {
          delete next[key];
        } else {
          next[key] = parsed;
        }
        return next;
      });
      return;
    }

    if (isStringKey(name)) {
      const key = name;
      const value = raw === "" ? undefined : raw;
      setLocalFilters((prev) => {
        const next: FilterValues = { ...prev };
        if (value === undefined) {
          delete next[key];
        } else {
          next[key] = value;
        }
        return next;
      });
      return;
    }
  };

  const pricingError = useMemo(() => {
    const min = localFilters.price_min;
    const max = localFilters.price_max;

    if (typeof min === "number" && min < 0) {
      return "Minimum price must be 0 or greater.";
    }
    if (typeof max === "number" && max < 0) {
      return "Maximum price must be 0 or greater.";
    }
    if (
      typeof min === "number" &&
      typeof max === "number" &&
      min >= max
    ) {
      return "Minimum price must be less than the maximum price.";
    }
    return null;
  }, [localFilters.price_min, localFilters.price_max]);

  const hasValidationError = Boolean(pricingError);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (pricingError) {
      return;
    }
    onChange({ ...localFilters });
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalFilters({});
    onChange({});
  };

  const toggleArrayFilter = (key: ArrayFilterKey, option: string) => {
    setLocalFilters((prev) => {
      const existing = (prev[key] as string[] | undefined) ?? [];
      const current = new Set<string>(existing);
      if (current.has(option)) {
        current.delete(option);
      } else {
        current.add(option);
      }
      const next: FilterValues = { ...prev };
      if (current.size === 0) {
        delete next[key];
      } else {
        next[key] = Array.from(current).sort();
      }
      return next;
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.values(value).forEach((v) => {
      if (Array.isArray(v)) {
        count += v.length;
      } else if (typeof v === "boolean") {
        count += v ? 1 : 0;
      } else if (v !== undefined && v !== "") {
        count += 1;
      }
    });
    return count;
  }, [value]);

  const hasActiveFilters = Object.entries(localFilters).some(([, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "boolean") return v;
    return v !== undefined && v !== "";
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-16">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <form
            onSubmit={handleApply}
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-8 py-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Filter the search
                </h2>
                <p className="text-sm text-slate-500">
                  Match sitters to your plants’ needs and preferences.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="max-h-[70vh] space-y-8 overflow-y-auto px-8 py-6">
              <section className="grid gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Campus area
                      </label>
                      <div className="relative mt-1">
                        <select
                          id="campus_area"
                          name="campus_area"
                          value={localFilters.campus_area ?? ""}
                          onChange={handleChange}
                          className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        >
                          <option value="">Any campus</option>
                          {campusAreas.map((area) => (
                            <option key={area} value={area}>
                              {area}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                          ▼
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        ZIP code
                      </label>
                      <input
                        type="text"
                        id="zip_code"
                        name="zip_code"
                        placeholder="e.g., 21218"
                        value={localFilters.zip_code ?? ""}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-4 text-sm font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        maxLength={5}
                        pattern="[0-9]{5}"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Filter sitters by ZIP code (5 digits)
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Pricing
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <input
                        type="number"
                        name="price_min"
                        placeholder="Min"
                        min={0}
                        value={localFilters.price_min ?? ""}
                        onChange={handleChange}
                        className={`w-full rounded-xl border bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 ${
                          pricingError ? "border-red-300" : "border-slate-200"
                        }`}
                      />
                      <span className="text-xs font-semibold uppercase text-slate-400">
                        to
                      </span>
                      <input
                        type="number"
                        name="price_max"
                        placeholder="Max"
                        min={0}
                        value={localFilters.price_max ?? ""}
                        onChange={handleChange}
                        className={`w-full rounded-xl border bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 ${
                          pricingError ? "border-red-300" : "border-slate-200"
                        }`}
                      />
                    </div>
                    {pricingError && (
                      <p className="text-xs font-medium text-red-600">
                        {pricingError}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Rating
                  </h3>
                  <div className="relative">
                    <input
                      type="number"
                      name="rating_min"
                      id="rating_min"
                      min={0}
                      max={5}
                      step={0.1}
                      placeholder="Minimum rating"
                      value={localFilters.rating_min ?? ""}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-sm font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-medium text-slate-400">
                      /5
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Specialties
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {specialtyOptions.map((spec) => {
                    const isChecked = (localFilters.specialties ?? []).includes(
                      spec
                    );
                    return (
                      <label
                        key={spec}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium capitalize transition ${
                          isChecked
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleArrayFilter("specialties", spec)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        {formatLabel(spec)}
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Experience level
                  </h3>
                  <div className="space-y-2">
                    {experienceLevels.map((level) => {
                      const isChecked = (
                        localFilters.experience_levels ?? []
                      ).includes(level);
                      return (
                        <label
                          key={level}
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium capitalize transition ${
                            isChecked
                              ? "border-teal-300 bg-teal-50 text-teal-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              toggleArrayFilter("experience_levels", level)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          {level}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Service radius
                    </h3>
                    <input
                      type="number"
                      id="max_service_radius"
                      name="max_service_radius"
                      min={1}
                      step={1}
                      placeholder="Max miles willing to travel"
                      value={localFilters.max_service_radius ?? ""}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Trust & safety
                    </h3>
                    <label
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                        localFilters.verified_only
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="verified_only"
                        checked={Boolean(localFilters.verified_only)}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        <span className="block font-semibold text-sm">
                          Verified sitter profiles
                        </span>
                        <span className="text-xs text-slate-500">
                          Show sitters whose identity has been confirmed.
                        </span>
                      </span>
                    </label>

                    <label
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                        localFilters.background_checked_only
                          ? "border-teal-300 bg-teal-50 text-teal-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="background_checked_only"
                        checked={Boolean(localFilters.background_checked_only)}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>
                        <span className="block font-semibold text-sm">
                          Background checked sitters
                        </span>
                        <span className="text-xs text-slate-500">
                          Prioritize sitters who passed background screening.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </section>
            </div>

            <footer className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-8 py-5">
              <p className="text-sm text-slate-500">
                {hasActiveFilters
                  ? "Results will refresh with the selections above."
                  : "No filters applied — showing recommended sitters."}
              </p>
              <button
                type="submit"
                disabled={hasValidationError}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                Apply filters
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
};

export default Filters;
