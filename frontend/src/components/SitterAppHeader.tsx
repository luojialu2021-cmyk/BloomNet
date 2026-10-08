import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Leaf, LogOut, UserRound } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSitterAuth } from '../contexts/AuthContext';
import { authService } from '../api/services';

interface NavItem {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface SitterAppHeaderProps {
  navItems?: NavItem[];
}

const DEFAULT_NAV: NavItem[] = [
  { label: 'User Portal', to: '/' },
  { label: 'Dashboard', to: '/sitter/dashboard' },
  { label: 'Messages', to: '/sitter/messages' },
  { label: 'Availability', to: '/sitter/availability' },
];

const SitterAppHeader: React.FC<SitterAppHeaderProps> = ({ navItems }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, token } = useSitterAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const items = navItems ?? DEFAULT_NAV;

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
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!token || user) {
      return;
    }
    authService.getCurrentUser().then((response) => {
      if (response.data) {
        const current = response.data as any;
        localStorage.setItem('auth_username', current.full_name || current.name || current.email || '');
        localStorage.setItem('auth_email', current.email || '');
        localStorage.setItem('auth_user_id', current.user_id || current.id || current._id || '');
      }
    });
  }, [token, user]);

  const initials = useMemo(() => {
    const source =
      user?.name ||
      (user as any)?.full_name ||
      user?.email ||
      localStorage.getItem('auth_username') ||
      '';
    return source
      .split(' ')
      .filter(Boolean)
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const displayName = useMemo(() => {
    return (
      user?.name ||
      (user as any)?.full_name ||
      user?.email ||
      localStorage.getItem('auth_username') ||
      ''
    );
  }, [user]);

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate('/sitter-portal');
  };

  const handleItemClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
      return;
    }
    if (item.to) {
      navigate(item.to);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b shadow-sm backdrop-blur bg-white/80">
      <div className="flex items-center justify-between max-w-6xl px-4 py-3 mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="w-6 h-6 text-amber-600" />
          <span className="text-xl font-bold text-gray-900">BloomNet</span>
          <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full">
            SITTER
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => handleItemClick(item)}
              className="transition-colors hover:text-amber-600"
            >
              {item.label}
            </button>
          ))}
          {token && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-amber-200 bg-white px-2 py-2 text-sm font-semibold text-amber-700 shadow-sm hover:bg-amber-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  {initials || <UserRound className="h-4 w-4" />}
                </div>
                <span className="hidden sm:inline max-w-[140px] truncate text-slate-700">
                  {displayName || 'Sitter'}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 divide-y divide-amber-100 rounded-2xl border border-amber-200 bg-white shadow-xl">
                  <div className="px-4 py-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-800">{displayName || 'Sitter'}</p>
                    <p className="truncate text-xs text-slate-500">
                      {user?.email || localStorage.getItem('auth_email') || ''}
                    </p>
                  </div>
                  <div className="py-1 text-sm">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/sitter/profile');
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-700 hover:bg-amber-50"
                    >
                      <UserRound className="h-4 w-4 text-amber-600" />
                      View / Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default SitterAppHeader;
