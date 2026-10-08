import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Leaf, LogOut, UserRound } from "lucide-react";
import { useOwnerAuth, useSitterAuth } from "../contexts/AuthContext";
import { authService } from "../api/services";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Check if viewing as sitter (e.g., from reservation detail page with ?as=sitter)
  const viewAs = searchParams.get('as');
  const isViewingAsSitter = viewAs === 'sitter';
  
  const { user: ownerUser, logout: logoutOwner, token: ownerToken } = useOwnerAuth();
  const { user: sitterUser, logout: logoutSitter, token: sitterToken } = useSitterAuth();
  
  // Determine which user to display based on viewAs parameter or reservation context
  const user = isViewingAsSitter && sitterUser ? sitterUser : ownerUser;
  const token = isViewingAsSitter && sitterToken ? sitterToken : ownerToken;
  const logout = isViewingAsSitter ? logoutSitter : logoutOwner;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!token || user) {
      if (!token) {
        localStorage.removeItem("auth_token");
      }
      return;
    }

    authService.getCurrentUser().then((response) => {
      if (response.data) {
        const current = response.data as any;
        const name = current.full_name || current.name || current.email;
        const email = current.email || "";
        const id = current.user_id || current.id || current._id || "";
        localStorage.setItem("auth_username", name || "");
        localStorage.setItem("auth_email", email);
        localStorage.setItem("auth_user_id", id);
      }
    });
  }, [token, user]);

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate(isViewingAsSitter ? "/sitter-portal" : "/");
  };

  const displayName = useMemo(() => {
    return (
      user?.name ||
      (user as any)?.full_name ||
      user?.email ||
      localStorage.getItem("auth_username") ||
      ""
    );
  }, [user]);

  const profileRoute = useMemo(() => {
    if (isViewingAsSitter || user?.role === "sitter") return "/sitter/profile";
    if (user?.role === "admin") return "/dashboard";
    return "/dashboard";
  }, [user, isViewingAsSitter]);

  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .filter(Boolean)
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [displayName]);

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur bg-white/70">
      <div className="flex items-center justify-between max-w-6xl px-4 py-3 mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="w-6 h-6 text-emerald-600" />
          <span className="text-xl font-bold">BloomNet</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/search" className="hover:text-emerald-700">
            Find Sitters
          </Link>
          <Link to="/sitter-portal" className="hover:text-emerald-700">
            Become a Sitter
          </Link>
          <Link to="/explore" className="hover:text-emerald-700">
            Explore
          </Link>
          {token && displayName ? (
            <div className="flex items-center gap-3">
              <Link
                to="/reservations"
                className="hidden font-medium sm:inline text-emerald-700 hover:text-emerald-800"
              >
                My Reservations
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-semibold bg-white border rounded-full shadow-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <div className="flex items-center justify-center text-white rounded-full h-9 w-9 bg-gradient-to-br from-emerald-500 to-teal-500">
                    {initials || <UserRound className="w-4 h-4" />}
                  </div>
                  <span className="hidden sm:inline max-w-[140px] truncate text-slate-700">
                    {displayName}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 w-48 mt-2 bg-white border divide-y shadow-xl divide-emerald-100 rounded-2xl border-emerald-200">
                    <div className="px-4 py-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-800">{displayName}</p>
                      <p className="text-xs truncate text-slate-500">
                        {user?.email || localStorage.getItem("auth_email") || ""}
                      </p>
                    </div>
                    <div className="py-1 text-sm">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                        navigate(profileRoute);
                        }}
                        className="flex items-center w-full gap-2 px-4 py-2 text-left text-slate-700 hover:bg-emerald-50"
                      >
                        <UserRound className="w-4 h-4 text-emerald-600" />
                        View / Edit Profile
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center w-full gap-2 px-4 py-2 text-left text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
