import React, { useState, useEffect, useRef } from 'react';
import { ChatThread, UserStory, Contact, CallLog } from '../types';
import { 
  Search, Plus, Pin, CheckCheck, CheckCircle2, Menu, SquarePen, Pencil,
  MoreVertical, MoreHorizontal, SlidersHorizontal, MessageSquareDot, BellOff, Bell,
  Archive, Trash2, ChevronRight, VolumeX, Check, BadgeCheck, MessageSquare, Phone, FileText,
  User, Settings, LogOut, Sun, Moon, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, PhoneCall
} from 'lucide-react';

interface SidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onOpenNewChat: () => void;
  isDarkMode: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userStories?: UserStory[];
  onOpenAddStory?: () => void;
  onViewStories?: (contact: Contact, stories?: UserStory[]) => void;
  currentUserAvatar?: string;
  currentUser?: {
    id?: string;
    name?: string;
    username?: string;
    avatar?: string;
    email?: string;
    status?: string;
  };
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onToggleDarkMode?: () => void;
  onOpenMobileSidebar?: () => void;
  onTogglePinThread?: (threadId: string) => void;
  onToggleUnreadThread?: (threadId: string) => void;
  onToggleMuteThread?: (threadId: string, duration?: string) => void;
  onToggleArchiveThread?: (threadId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  callLogs?: CallLog[];
  onStartCallWithContact?: (contact: Contact, type: 'audio' | 'video') => void;
  onOpenNewCall?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  threads,
  activeThreadId,
  onSelectThread,
  onOpenNewChat,
  isDarkMode,
  searchQuery,
  onSearchChange,
  userStories = [],
  onOpenAddStory,
  onViewStories,
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  currentUser,
  onOpenSettings,
  onLogout,
  onToggleDarkMode,
  onOpenMobileSidebar,
  onTogglePinThread,
  onToggleUnreadThread,
  onToggleMuteThread,
  onToggleArchiveThread,
  onDeleteThread,
  callLogs = [],
  onStartCallWithContact,
  onOpenNewCall,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'online' | 'archived'>('all');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(true);
  const [bottomTab, setBottomTab] = useState<'chats' | 'calls'>('chats');
  const [callFilter, setCallFilter] = useState<'all' | 'missed'>('all');
  const [isSidebarProfileMenuOpen, setIsSidebarProfileMenuOpen] = useState(false);
  const sidebarProfileRef = useRef<HTMLDivElement>(null);

  // Close sidebar profile menu on outside click
  useEffect(() => {
    const handleMousedown = (event: MouseEvent) => {
      if (sidebarProfileRef.current && !sidebarProfileRef.current.contains(event.target as Node)) {
        setIsSidebarProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMousedown);
    return () => document.removeEventListener('mousedown', handleMousedown);
  }, []);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    thread: ChatThread;
  } | null>(null);

  // Submenu for Mute Duration
  const [showMuteSubmenu, setShowMuteSubmenu] = useState<boolean>(false);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = () => {
      setContextMenu(null);
      setShowMuteSubmenu(false);
    };

    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleOutsideClick, true);
    window.addEventListener('contextmenu', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleOutsideClick, true);
      window.removeEventListener('contextmenu', handleOutsideClick);
    };
  }, []);

  const handleThreadContextMenu = (e: React.MouseEvent, thread: ChatThread) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 220;
    const menuHeight = 240;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 12;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 12;
    }

    setShowMuteSubmenu(false);
    setContextMenu({ x, y, thread });
  };

  // Typewriter Placeholder logic for Sidebar search
  const sidebarPlaceholders = [
    "Search contacts & messages...",
    "Type to find chats...",
    "Filter history & channels...",
  ];
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const targetText = sidebarPlaceholders[placeholderIndex];
    let typingSpeed = isDeleting ? 40 : 85;

    if (!isDeleting && charIndex === targetText.length) {
      typingSpeed = 2000;
      setIsDeleting(true);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPlaceholderIndex((prev) => (prev + 1) % sidebarPlaceholders.length);
      typingSpeed = 350;
    }

    const timer = setTimeout(() => {
      setCurrentPlaceholder(
        targetText.substring(0, charIndex + (isDeleting ? -1 : 1))
      );
      setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, placeholderIndex]);

  const filteredThreads = threads
    .filter((thread) => {
      const matchesSearch =
        thread.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filter === 'archived') return thread.isArchived;
      if (thread.isArchived) return false;

      if (filter === 'unread') return thread.unreadCount > 0;
      if (filter === 'pinned') return thread.isPinned;
      if (filter === 'online') return thread.contact.status === 'online';

      return true;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  const archivedCount = threads.filter((t) => t.isArchived).length;

  // Filter call logs for Calls tab
  const displayCallLogs = callLogs.filter((log) => {
    if (callFilter === 'missed' && log.type !== 'missed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.contact.name.toLowerCase().includes(q) ||
        (log.contact.nickname && log.contact.nickname.toLowerCase().includes(q)) ||
        log.contact.username.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div
      className={`w-full flex flex-col h-full max-h-[100dvh] border-r shrink-0 transition-colors relative overflow-hidden ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      {/* Search Bar Input Row */}
      <div className="px-3.5 pt-3 pb-1.5 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={currentPlaceholder}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-full border transition-all outline-hidden ${
              isDarkMode
                ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-blue-500'
                : 'bg-slate-100/90 border-slate-200/80 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
            }`}
          />
        </div>
      </div>

      {/* Filter Tabs ("All", "Unread", "Online", "Archived") */}
      <div className="px-3.5 py-1.5 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
        {(['all', 'unread', 'online', 'archived'] as const).map((tab) => {
          if (tab === 'archived' && archivedCount === 0) return null;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize shrink-0 transition-all active:scale-95 ${
                filter === tab
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:text-white'
                  : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'archived' ? `Archived (${archivedCount})` : tab}
            </button>
          );
        })}
      </div>

      {/* Main Content View (Chats or Calls) */}
      {bottomTab === 'chats' ? (
        <div className="flex-1 overflow-y-auto pb-16 divide-y divide-slate-100/80 dark:divide-slate-800/50 select-none">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <SlidersHorizontal className="w-8 h-8 opacity-40 stroke-1" />
              <p className="text-sm font-medium">No messages found</p>
              <p className="text-xs text-slate-400">Try adjusting your search query</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isActive = thread.id === activeThreadId;
              const lastMsg = thread.messages[thread.messages.length - 1];
              const isNoteToSelf = thread.contact.name.toLowerCase().includes('note to self') || thread.contact.username === 'noteself';

              return (
                <button
                  key={thread.id}
                  onClick={() => onSelectThread(thread.id)}
                  onContextMenu={(e) => handleThreadContextMenu(e, thread)}
                  className={`w-full px-4 py-3.5 flex items-center gap-3.5 text-left transition-all ${
                    isActive
                      ? isDarkMode
                        ? 'bg-slate-800/90 border-l-4 border-blue-500 text-white'
                        : 'bg-blue-50/90 border-l-4 border-blue-600 text-slate-900'
                      : isDarkMode
                      ? 'hover:bg-slate-800/40 text-slate-200'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  {/* Avatar Circle */}
                  <div className="relative shrink-0">
                    {isNoteToSelf ? (
                      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                        <FileText className="w-6 h-6" />
                      </div>
                    ) : thread.contact.avatar ? (
                      <img
                        src={thread.contact.avatar}
                        alt={thread.contact.name}
                        className="w-12 h-12 rounded-full object-cover bg-slate-200 dark:bg-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold text-lg flex items-center justify-center">
                        {thread.contact.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {!isNoteToSelf && (
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
                          isDarkMode ? 'border-slate-900' : 'border-white'
                        } ${
                          thread.contact.status === 'online'
                            ? 'bg-emerald-500 ring-2 ring-emerald-500/40 shadow-xs shadow-emerald-500/50'
                            : 'bg-yellow-400'
                        }`}
                        title={thread.contact.status === 'online' ? 'Active Now' : 'Offline / Away'}
                      />
                    )}
                  </div>

                  {/* Thread Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-semibold text-[15px] truncate ${
                          thread.unreadCount > 0 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {thread.contact.nickname || thread.contact.name}
                        </span>
                        {(isNoteToSelf || (thread.contact as any).verified) && (
                          <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />
                        )}
                        {thread.isPinned && (
                          <span title="Pinned chat">
                            <Pin className="w-3.5 h-3.5 text-blue-500 rotate-45 shrink-0" />
                          </span>
                        )}
                        {thread.isMuted && (
                          <span title="Muted chat">
                            <BellOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </span>
                        )}
                      </div>

                      {lastMsg && (
                        <span className={`text-xs shrink-0 font-normal ${
                          thread.unreadCount > 0 ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-400'
                        }`}>
                          {lastMsg.timestamp}
                        </span>
                      )}
                    </div>

                    {/* Snippet & Read/Unread Icon */}
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${
                        thread.unreadCount > 0
                          ? 'font-bold text-slate-900 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {lastMsg ? (
                          <>
                            {lastMsg.isMe && <span className="text-slate-400 font-normal">You: </span>}
                            {lastMsg.imageUrl ? '📷 Photo' : lastMsg.text}
                          </>
                        ) : (
                          <span className="italic text-slate-400">No messages yet</span>
                        )}
                      </p>

                      {thread.unreadCount > 0 ? (
                        <span className="min-w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0 px-1.5 shadow-xs">
                          {thread.unreadCount}
                        </span>
                      ) : lastMsg?.isMe ? (
                        <CheckCheck className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-slate-400/80 shrink-0" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : (
        /* Calls Tab View (Dedicated Call History Screen) */
        <div className="flex-1 flex flex-col min-h-0 select-none overflow-hidden">
          {/* Call History Header & Filter */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Call Logs
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
                {displayCallLogs.length}
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                onClick={() => setCallFilter('all')}
                className={`px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                  callFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setCallFilter('missed')}
                className={`px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                  callFilter === 'missed'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Missed
              </button>
            </div>
          </div>

          {/* Call History Item List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 dark:divide-slate-800/50 p-2">
            {displayCallLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 px-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {callFilter === 'missed' ? 'No missed calls' : 'No call history'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {callFilter === 'missed'
                    ? 'You have no missed call logs.'
                    : 'Start an audio or video call with your contacts to see logs here.'}
                </p>
              </div>
            ) : (
              displayCallLogs.map((log) => {
                const isMissed = log.type === 'missed';
                const isIncoming = log.type === 'incoming';
                const isOutgoing = log.type === 'outgoing';

                return (
                  <div
                    key={log.id}
                    className="p-3 flex items-center justify-between rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      <div className="relative shrink-0">
                        <img
                          src={log.contact.avatar}
                          alt={log.contact.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                        />
                        {log.contact.status === 'online' && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-sm font-bold truncate ${
                            isMissed
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {log.contact.nickname || log.contact.name}
                        </h4>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {/* Call status icon & text */}
                          {isIncoming && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <PhoneIncoming className="w-3.5 h-3.5" />
                              <span>Incoming</span>
                            </span>
                          )}
                          {isOutgoing && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                              <PhoneOutgoing className="w-3.5 h-3.5" />
                              <span>Outgoing</span>
                            </span>
                          )}
                          {isMissed && (
                            <span className="flex items-center gap-1 text-rose-500 font-bold">
                              <PhoneMissed className="w-3.5 h-3.5" />
                              <span>Missed</span>
                            </span>
                          )}

                          <span>•</span>
                          <span className="truncate">{log.timestamp}</span>
                          {log.duration && !isMissed && (
                            <span className="text-slate-400 text-[11px] font-normal">
                              ({log.duration})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons (Audio & Video call back) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          onStartCallWithContact
                            ? onStartCallWithContact(log.contact, 'audio')
                            : onSelectThread(log.contact.id)
                        }
                        className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 active:scale-95 transition-all cursor-pointer shadow-2xs"
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4 fill-emerald-600 dark:fill-emerald-400" />
                      </button>

                      <button
                        onClick={() =>
                          onStartCallWithContact
                            ? onStartCallWithContact(log.contact, 'video')
                            : onSelectThread(log.contact.id)
                        }
                        className="p-2 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 active:scale-95 transition-all cursor-pointer shadow-2xs"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4 fill-blue-600 dark:fill-blue-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) at Bottom-Right */}
      <div className="absolute bottom-16 right-4 z-20">
        {bottomTab === 'chats' ? (
          <button
            onClick={onOpenNewChat}
            className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center active:scale-95 cursor-pointer"
            title="New Chat"
            aria-label="New Chat"
          >
            <Pencil className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onOpenNewCall || onOpenNewChat}
            className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center active:scale-95 cursor-pointer"
            title="New Call"
            aria-label="New Call"
          >
            <PhoneCall className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Navigation Bar (Chats, Calls, & Profile Card) */}
      <div className={`px-2.5 sm:px-3 py-2 border-t shrink-0 flex items-center justify-between gap-1.5 sm:gap-2 z-30 w-full sticky bottom-0 left-0 right-0 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {/* Chats Tab Button */}
        <button
          onClick={() => setBottomTab('chats')}
          className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer shrink-0 ${
            bottomTab === 'chats'
              ? isDarkMode
                ? 'bg-blue-950/70 text-blue-400 font-bold'
                : 'bg-blue-100/80 text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {bottomTab === 'chats' && (
            <span className="absolute -top-1 w-2 h-2 rounded-full bg-blue-600" />
          )}
          <MessageSquare className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${bottomTab === 'chats' ? 'fill-blue-600 dark:fill-blue-400 text-blue-600 dark:text-blue-400' : ''}`} />
          <span className="text-[11px] sm:text-xs font-semibold tracking-tight">Chats</span>
        </button>

        {/* Calls Tab Button */}
        <button
          onClick={() => setBottomTab('calls')}
          className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer shrink-0 ${
            bottomTab === 'calls'
              ? isDarkMode
                ? 'bg-blue-950/70 text-blue-400 font-bold'
                : 'bg-blue-100/80 text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {bottomTab === 'calls' && (
            <span className="absolute -top-1 w-2 h-2 rounded-full bg-blue-600" />
          )}
          <Phone className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${bottomTab === 'calls' ? 'fill-blue-600 dark:fill-blue-400 text-blue-600 dark:text-blue-400' : ''}`} />
          <span className="text-[11px] sm:text-xs font-semibold tracking-tight">Calls</span>
        </button>

        {/* Profile Card / Widget on Right Side of Calls */}
        <div className="relative shrink-0" ref={sidebarProfileRef}>
          <button
            onClick={() => setIsSidebarProfileMenuOpen(!isSidebarProfileMenuOpen)}
            className={`h-9 px-2 sm:px-2.5 pl-1.5 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border transition-all cursor-pointer shadow-xs shrink-0 max-w-[130px] xs:max-w-[150px] sm:max-w-[180px] ${
              isDarkMode
                ? 'bg-slate-800/90 border-slate-700/80 hover:bg-slate-800 text-slate-100'
                : 'bg-slate-100/90 border-slate-300/80 hover:bg-slate-200/80 text-slate-900'
            }`}
            title="User Profile & Settings"
          >
            <div className="relative shrink-0 flex items-center justify-center">
              {currentUser?.avatar && (currentUser.avatar.startsWith('http') || currentUser.avatar.startsWith('data:')) ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser?.name || "Profile"}
                  className="w-6 h-6 rounded-full object-cover ring-2 ring-blue-500/40"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center ring-2 ring-blue-500/40 shrink-0">
                  {(currentUser?.name || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ${
                  isDarkMode ? 'ring-slate-900' : 'ring-white'
                } ${
                  currentUser?.status === 'offline'
                    ? 'bg-yellow-400'
                    : 'bg-emerald-500 ring-2 ring-emerald-500/40 shadow-xs shadow-emerald-500/50'
                }`}
                title={currentUser?.status === 'offline' ? 'Offline / Away' : 'Active Now'}
              />
            </div>
            <span className={`text-[12px] sm:text-xs font-black max-w-[70px] xs:max-w-[90px] sm:max-w-[120px] truncate leading-tight select-none ${
              isDarkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {currentUser?.name || 'Arnav Jain'}
            </span>
          </button>

          {/* Interactive Profile Menu Popup */}
          {isSidebarProfileMenuOpen && (
            <div
              className={`absolute right-0 bottom-12 mb-1 w-52 rounded-2xl p-2 shadow-2xl border backdrop-blur-xl z-50 animate-fadeIn ${
                isDarkMode
                  ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950'
                  : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/60'
              }`}
            >
              <div className="px-3 py-2 border-b border-slate-200/80 dark:border-slate-800 mb-1 flex items-center gap-2.5">
                <img
                  src={currentUser?.avatar || currentUserAvatar}
                  alt={currentUser?.name || "Profile"}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/40"
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate">{currentUser?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {currentUser?.username ? `@${currentUser.username.replace(/^@/, '')}` : '@jainarnav'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsSidebarProfileMenuOpen(false);
                  onOpenSettings?.();
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Settings className="w-4 h-4 text-blue-500" />
                <span>Profile Settings</span>
              </button>

              {onToggleDarkMode && (
                <button
                  onClick={() => {
                    onToggleDarkMode();
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              )}

              {onLogout && (
                <button
                  onClick={() => {
                    setIsSidebarProfileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer mt-0.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className={`fixed z-50 min-w-[210px] rounded-2xl p-1.5 shadow-2xl border transition-all animate-fadeIn ${
            isDarkMode
              ? 'bg-slate-800/95 border-slate-700/80 text-slate-100 shadow-slate-950/80'
              : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-300/60'
          } backdrop-blur-md`}
        >
          <button
            onClick={() => {
              if (onToggleUnreadThread) onToggleUnreadThread(contextMenu.thread.id);
              setContextMenu(null);
            }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
              isDarkMode ? 'hover:bg-slate-700/80 text-slate-100' : 'hover:bg-slate-100 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquareDot className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" />
              <span>{contextMenu.thread.unreadCount > 0 ? 'Mark as read' : 'Mark as unread'}</span>
            </div>
          </button>

          <button
            onClick={() => {
              if (onTogglePinThread) onTogglePinThread(contextMenu.thread.id);
              setContextMenu(null);
            }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
              isDarkMode ? 'hover:bg-slate-700/80 text-slate-100' : 'hover:bg-slate-100 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Pin className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" />
              <span>{contextMenu.thread.isPinned ? 'Unpin chat' : 'Pin chat'}</span>
            </div>
          </button>

          <div className="relative">
            <button
              onClick={() => {
                if (contextMenu.thread.isMuted) {
                  if (onToggleMuteThread) onToggleMuteThread(contextMenu.thread.id);
                  setContextMenu(null);
                } else {
                  setShowMuteSubmenu(!showMuteSubmenu);
                }
              }}
              className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
                isDarkMode ? 'hover:bg-slate-700/80 text-slate-100' : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <BellOff className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" />
                <span>{contextMenu.thread.isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
              </div>
              {!contextMenu.thread.isMuted && (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showMuteSubmenu && !contextMenu.thread.isMuted && (
              <div
                className={`absolute left-full top-0 ml-1.5 min-w-[150px] rounded-xl p-1.5 shadow-xl border ${
                  isDarkMode
                    ? 'bg-slate-800/95 border-slate-700 text-slate-100'
                    : 'bg-white/95 border-slate-200 text-slate-800'
                } backdrop-blur-md animate-fadeIn`}
              >
                {['8 hours', '1 week', 'Always'].map((duration) => (
                  <button
                    key={duration}
                    onClick={() => {
                      if (onToggleMuteThread) onToggleMuteThread(contextMenu.thread.id, duration);
                      setContextMenu(null);
                      setShowMuteSubmenu(false);
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors ${
                      isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{duration}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (onToggleArchiveThread) onToggleArchiveThread(contextMenu.thread.id);
              setContextMenu(null);
            }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
              isDarkMode ? 'hover:bg-slate-700/80 text-slate-100' : 'hover:bg-slate-100 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Archive className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" />
              <span>{contextMenu.thread.isArchived ? 'Unarchive' : 'Archive'}</span>
            </div>
          </button>

          <button
            onClick={() => {
              if (onDeleteThread) onDeleteThread(contextMenu.thread.id);
              setContextMenu(null);
            }}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400`}
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
              <span>Delete</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};



