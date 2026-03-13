import React, { useState, useEffect } from 'react';
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Sun,
  Moon } from
'lucide-react';
import { Role, useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
interface TopNavProps {
  pageTitle: string;
  currentRole: Role;
  onLogout: () => void;
}
export function TopNav({ pageTitle, currentRole, onLogout }: TopNavProps) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const displayName = user?.full_name || 'User';

  useEffect(() => {
    api.notifications.getAll()
      .then((res) => {
        setNotifications(res.data?.notifications || []);
        setUnread(res.data?.unread_count || 0);
      })
      .catch(() => {});
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  };
  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 flex-shrink-0 relative z-20">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{pageTitle}</h1>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifs(!showNotifs);
              setShowProfile(false);
            }}
            className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
            
            <Bell size={20} />
            {unread > 0 &&
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            }
          </button>
          {showNotifs &&
          <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 fade-in">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  Notifications
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                  onClick={handleMarkAllRead}>
                  Mark all read
                </span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700 max-h-72 overflow-y-auto">
                {notifications.length === 0 && (
                  <li className="px-4 py-3 text-sm text-slate-400 text-center">No notifications</li>
                )}
                {notifications.map((n) =>
              <li
                key={n.id}
                className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700">
                
                    <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? 'bg-slate-200 dark:bg-slate-600' : 'bg-blue-500'}`} />
                
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                  </li>
              )}
              </ul>
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700">
                <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline w-full text-center">
                  View all notifications
                </button>
              </div>
            </div>
          }
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifs(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {displayName.
              split(' ').
              map((n) => n[0]).
              join('').
              slice(0, 2)}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
              {displayName}
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {showProfile &&
          <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 fade-in">
              <ul className="py-1">
                <li>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <User size={15} className="text-slate-400" /> View Profile
                  </button>
                </li>
                <li>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <Settings size={15} className="text-slate-400" /> Settings
                  </button>
                </li>
                <li className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                  <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  
                    <LogOut size={15} /> Logout
                  </button>
                </li>
              </ul>
            </div>
          }
        </div>
      </div>
    </header>);
}