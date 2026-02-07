"use client";

import React, { useState } from "react";
import { LogOut, LayoutDashboard, User as UserIcon, ChevronDown } from "lucide-react"; // Using Lucide for a cleaner look
import { User } from "next-auth";
import { logout } from "@/auth/actions";
import posthog from "posthog-js";
import Link from "next/link";
import Image from "next/image"; // Optimization

export default function UserProfileIcon({ user }: { user: User }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  return (
    <div className="relative z-50">
      {/* Invisible backdrop to handle "click outside" */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-40 cursor-default" 
          onClick={() => setIsModalOpen(false)} 
        />
      )}

      {/* Trigger Button */}
      <button 
        onClick={toggleModal}
        className="group flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-white/10"
      >
        <div className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-white/10 group-hover:ring-white/30 transition-all">
          {user.image ? (
            <Image 
              src={user.image} 
              alt={user.name || "User"} 
              width={48}
              height={48}
              className="h-full w-full object-cover" 
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user.name?.charAt(0) || "U"}
              </span>
            </div>
          )}
        </div>
        {/* Optional: Small chevron to indicate it's a dropdown */}
        <ChevronDown size={14} className={`text-gray-500 transition-transform duration-200 ${isModalOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isModalOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-xl border border-white/10 bg-[#0A0A0A] p-1.5 shadow-2xl ring-1 ring-black/5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-100">
          
          {/* User Info Section */}
          <div className="px-3 py-3 mb-1 border-b border-white/5">
            <p className="text-sm font-medium text-white truncate">
              {user.name}
            </p>
            {user.email && (
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            )}
          </div>

          {/* Menu Items */}
          <div className="space-y-0.5">
            <Link 
              href="https://devsarena.in/dashboard"
              onClick={() => setIsModalOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>

            <button
              onClick={() => {
                posthog.capture("user_logged_out");
                posthog.reset();
                logout();
                setIsModalOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400/90 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}