import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, GraduationCap, School, Users, User, ChevronDown, LogOut } from 'lucide-react';

interface RoleSelectorProps {
  currentUser: UserProfile | null;
  onSelectRole: (role: 'student' | 'lecturer' | 'admin') => void;
  onSignOut?: () => void;
}

export default function RoleSelector({ currentUser, onSelectRole, onSignOut }: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-[10px] font-bold border border-rose-100 dark:border-rose-900/40 uppercase tracking-wider">
            <School size={10} />
            Management
          </span>
        );
      case 'lecturer':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-100 dark:border-amber-900/40 uppercase tracking-wider">
            <GraduationCap size={10} />
            Lecturer
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/40 uppercase tracking-wider">
            <Users size={10} />
            Student
          </span>
        );
    }
  };

  return (
    <div id="role_selector_wrapper" className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition duration-150 text-left cursor-pointer"
      >
        <div className="p-1.5 bg-amber-50 dark:bg-amber-950 text-[#C79F27] rounded-lg">
          <User size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {currentUser ? currentUser.name : "Select Portal"}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
            {currentUser ? currentUser.email : "Academic RBAC Portal Gateways"}
          </p>
        </div>
        {currentUser && getRoleBadge(currentUser.role)}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Select Portal Gateway
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">
              Choose an administrative division to authenticate or register.
            </p>
          </div>

          <div className="p-1.5 space-y-1 bg-white dark:bg-slate-900">
            {/* Student Category */}
            <button
              onClick={() => {
                onSelectRole('student');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-emerald-500/5 dark:hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 rounded-lg group-hover:scale-105 transition-transform">
                  <Users size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Student Portal
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Attendance, CP Stats & Assignments
                  </div>
                </div>
              </div>
            </button>

            {/* Lecturer Category */}
            <button
              onClick={() => {
                onSelectRole('lecturer');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-amber-500/5 dark:hover:bg-amber-500/5 hover:text-amber-600 dark:hover:text-amber-400 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-450 rounded-lg group-hover:scale-105 transition-transform">
                  <GraduationCap size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    Faculty Portal
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Class Attendance & Grades
                  </div>
                </div>
              </div>
            </button>

            {/* Management Category */}
            <button
              onClick={() => {
                onSelectRole('admin');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-rose-500/5 dark:hover:bg-rose-500/5 hover:text-rose-600 dark:hover:text-rose-400 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 rounded-lg group-hover:scale-105 transition-transform">
                  <School size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                    Management Portal
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Institutional Control & Analytics
                  </div>
                </div>
              </div>
            </button>
          </div>

          {currentUser && onSignOut && (
            <div className="p-2 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  onSignOut();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/20 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out Active Session</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
