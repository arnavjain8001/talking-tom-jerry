import React, { useState, useEffect } from 'react';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
  onOpenNewChat: () => void;
  totalUnread: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentUser?: { name: string; email: string; avatar: string; username?: string; status?: string } | null;
  onLogout?: () => void;
}

// Typewriter component for brand logo text
const TypewriterLogoText: React.FC = () => {
  const fullBrand = "Welcome in Chatting World 😊 ...Where Conversations Come Alive...";
  const chars = React.useMemo(() => Array.from(fullBrand), [fullBrand]);
  const [displayText, setDisplayText] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let index = 0;
    setDisplayText('');
    setIsDone(false);

    const timer = setInterval(() => {
      if (index < chars.length) {
        setDisplayText(chars.slice(0, index + 1).join(''));
        index++;
      } else {
        setIsDone(true);
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [chars]);

  return (
    <span className="font-extrabold text-xs sm:text-sm md:text-base lg:text-lg tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-500 dark:from-blue-400 dark:via-indigo-400 dark:to-pink-400 bg-clip-text text-transparent flex items-center select-none shrink-0 whitespace-nowrap overflow-hidden">
      {displayText}
      {!isDone && (
        <span className="inline-block w-0.5 h-4 sm:h-5 bg-indigo-600 dark:bg-indigo-400 ml-0.5 animate-pulse" />
      )}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onOpenSettings,
  onOpenNewChat,
  totalUnread,
  isDarkMode,
  onToggleDarkMode,
  currentUser,
}) => {
  const userAvatar = currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";

  return (
    <header className={`w-full h-16 border-b shrink-0 transition-colors flex items-center ${
      isDarkMode 
        ? 'bg-slate-900 border-slate-800 text-slate-100' 
        : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
    }`}>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-full flex items-center justify-between gap-2 sm:gap-4 overflow-hidden">
        {/* User Image & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer select-none shrink-0" onClick={onOpenSettings}>
          <div className="relative">
            <img
              src={userAvatar}
              alt={currentUser?.name || "User Avatar"}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-blue-500/50 shadow-xs"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                currentUser?.status === 'offline' ? 'bg-yellow-400' : 'bg-emerald-500'
              }`}
              title={currentUser?.status === 'offline' ? 'Offline' : 'Active'}
            />
          </div>
          <TypewriterLogoText />
        </div>
      </div>
    </header>
  );
};
