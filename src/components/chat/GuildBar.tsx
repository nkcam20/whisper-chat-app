"use client";

import React, { useState } from "react";
import { Plus, Compass, MessageSquare, Sun, Moon, Sparkles, Hash } from "lucide-react";
import { Server } from "@/hooks/useDiscord";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

interface GuildBarProps {
  servers: Server[];
  activeServerId: string | null;
  onServerSelect: (serverId: string | null) => void;
  onCreateServerClick: () => void;
  onJoinServerClick: () => void;
}

export default function GuildBar({
  servers,
  activeServerId,
  onServerSelect,
  onCreateServerClick,
  onJoinServerClick,
}: GuildBarProps) {
  const { theme, setTheme } = useTheme();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="w-[72px] shrink-0 bg-guild flex flex-col items-center py-3 gap-2 h-full z-40 border-r dark:border-zinc-900 select-none">
      {/* Home / Direct Messages Button */}
      <div 
        className="relative group cursor-pointer"
        onMouseEnter={() => setHoveredId("home")}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => onServerSelect(null)}
      >
        <div className="absolute left-0 w-1 bg-accent-pink rounded-r-full transition-all duration-300 origin-left scale-y-0 group-hover:scale-y-100 group-hover:h-5 h-5"
          style={{ 
            transform: activeServerId === null ? "scaleY(1)" : "scaleY(0)", 
            height: activeServerId === null ? "40px" : "20px" 
          }}
        />
        
        <div className={`w-12 h-12 flex items-center justify-center guild-icon-transition ${
          activeServerId === null 
            ? "bg-accent-pink text-white rounded-[14px]" 
            : "bg-white dark:bg-zinc-800 text-accent-pink hover:bg-accent-pink hover:text-white"
        } shadow-md`}>
          <MessageSquare className="w-5 h-5" />
        </div>

        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredId === "home" && (
            <motion.div 
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 16, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              className="absolute left-12 top-2.5 z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl"
            >
              Direct Messages
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="w-8 h-[2px] bg-zinc-200 dark:bg-zinc-800 rounded-full my-1" />

      {/* Server List */}
      <div className="flex-1 w-full flex flex-col gap-2 overflow-y-auto custom-scrollbar items-center">
        {servers.map((server) => {
          const isActive = activeServerId === server.id;
          const initials = server.name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .substring(0, 3)
            .toUpperCase();

          return (
            <div
              key={server.id}
              className="relative group cursor-pointer"
              onMouseEnter={() => setHoveredId(server.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onServerSelect(server.id)}
            >
              <div 
                className="absolute left-0 w-1 bg-accent-blue rounded-r-full transition-all duration-300 origin-left scale-y-0 group-hover:scale-y-100 group-hover:h-5 h-5"
                style={{ 
                  transform: isActive ? "scaleY(1)" : "scaleY(0)", 
                  height: isActive ? "40px" : "20px" 
                }}
              />

              <div className={`w-12 h-12 flex items-center justify-center font-black text-sm guild-icon-transition shadow-sm ${
                isActive 
                  ? "bg-accent-blue text-white rounded-[14px]" 
                  : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-accent-blue hover:text-white"
              }`}>
                {initials || <Hash className="w-5 h-5" />}
              </div>

              {/* Hover Tooltip */}
              <AnimatePresence>
                {hoveredId === server.id && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10, scale: 0.9 }}
                    animate={{ opacity: 1, x: 16, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.9 }}
                    className="absolute left-12 top-2.5 z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl"
                  >
                    {server.name}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Create Server Button */}
        <div
          className="relative group cursor-pointer"
          onMouseEnter={() => setHoveredId("create")}
          onMouseLeave={() => setHoveredId(null)}
          onClick={onCreateServerClick}
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-[50%] bg-white dark:bg-zinc-800 text-accent-pink hover:bg-accent-pink hover:text-white hover:rounded-[14px] transition-all duration-300 shadow-sm border border-dashed border-accent-pink/40">
            <Plus className="w-5 h-5" />
          </div>

          <AnimatePresence>
            {hoveredId === "create" && (
              <motion.div 
                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 16, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.9 }}
                className="absolute left-12 top-2.5 z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl"
              >
                Create a Server
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Join Server Button */}
        <div
          className="relative group cursor-pointer"
          onMouseEnter={() => setHoveredId("join")}
          onMouseLeave={() => setHoveredId(null)}
          onClick={onJoinServerClick}
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-[50%] bg-white dark:bg-zinc-800 text-accent-blue hover:bg-accent-blue hover:text-white hover:rounded-[14px] transition-all duration-300 shadow-sm border border-dashed border-accent-blue/40">
            <Compass className="w-5 h-5" />
          </div>

          <AnimatePresence>
            {hoveredId === "join" && (
              <motion.div 
                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 16, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.9 }}
                className="absolute left-12 top-2.5 z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl"
              >
                Join Server by Invite
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Theme Toggle & Bottom Actions */}
      <div className="flex flex-col items-center gap-4 mt-auto">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
          title="Switch Theme Color"
        >
          {theme === "dark" ? (
            <Sun className="w-4.5 h-4.5 text-amber-500" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-accent-blue" />
          )}
        </button>
        
        <div className="w-6 h-6 flex items-center justify-center text-[10px] font-black text-pastel-gradient leading-none">
          Zen
        </div>
      </div>
    </div>
  );
}
