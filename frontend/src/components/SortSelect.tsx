import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Check } from "lucide-react";
import { createPortal } from "react-dom";

export type SortOption =
  | "featured"
  | "price_low_high"
  | "price_high_low"
  | "rating_high_low"
  | "reviews_high_low";

const SORT_OPTIONS: Array<{ value: SortOption; label: string; helper?: string }> =
  [
    { value: "featured", label: "Featured", helper: "Recommended order" },
    { value: "price_low_high", label: "Price: Low to High" },
    { value: "price_high_low", label: "Price: High to Low" },
    { value: "rating_high_low", label: "Avg. Customer Review" },
    { value: "reviews_high_low", label: "Most Reviews" },
  ];

type SortSelectProps = {
  value: SortOption;
  onChange: (value: SortOption) => void;
};

const SortSelect: React.FC<SortSelectProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const updateMenuPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.max(256, rect.width);
    setMenuStyle({
      top: rect.bottom + 8,
      left: rect.right - dropdownWidth,
      width: dropdownWidth,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleResize = () => {
      updateMenuPosition();
    };

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [open]);

  const active = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === value),
    [value]
  );

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-w-[210px] items-center justify-between gap-3 rounded-2xl border border-indigo-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <span>
          Sort by:{" "}
          <span className="font-bold text-slate-900">
            {active?.label ?? "Featured"}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-indigo-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            style={{
              position: "fixed",
              top: menuStyle.top,
              left: Math.min(
                Math.max(16, menuStyle.left),
                window.innerWidth - menuStyle.width - 16
              ),
              width: menuStyle.width,
              zIndex: 1300,
            }}
          >
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sort by
            </div>
            <ul className="max-h-72 overflow-y-auto text-sm text-slate-700">
              {SORT_OPTIONS.map((option) => {
                const isActive = value === option.value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                        isActive
                          ? "bg-indigo-50 font-semibold text-indigo-600"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex-1">
                        {option.label}
                        {option.helper && (
                          <span className="block text-xs font-normal text-slate-400">
                            {option.helper}
                          </span>
                        )}
                      </span>
                      {isActive && <Check className="h-4 w-4 text-indigo-500" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SortSelect;
