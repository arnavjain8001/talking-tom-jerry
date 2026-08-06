import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Contact, ChatThemeConfig, WallpaperConfig, DisappearingTimerOption } from '../types';
import { THEME_PRESETS } from '../themeData';
import { EmojiPicker } from './EmojiPicker';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import {
  Check,
  CheckCheck,
  Copy,
  Pencil,
  Trash2,
  Trash,
  MoreVertical,
  X,
  Ban,
  CheckCircle2,
  Smile,
  Plus,
  Reply,
  Pin,
  Mic,
  Play,
  Pause,
  Clock,
  Flame,
  Maximize2,
} from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  contact: Contact;
  isDarkMode: boolean;
  isTyping?: boolean;
  activeTheme?: ChatThemeConfig;
  activeWallpaper?: WallpaperConfig;
  pinnedMessageIds?: string[];
  disappearingTimer?: DisappearingTimerOption;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onReplyToMessage?: (message: Message) => void;
  onTogglePinMessage?: (messageId: string) => void;
  onVotePoll?: (messageId: string, optionId: string) => void;
  currentUser?: { id?: string } | null;
}

interface ContextMenuState {
  message: Message;
  x: number;
  y: number;
}

const QUICK_EMOJI_REACTIONS = ['❤️', '👍', '😂', '🔥', '😮', '🎉'];

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  contact,
  isDarkMode,
  isTyping = false,
  activeTheme = THEME_PRESETS[0],
  activeWallpaper,
  pinnedMessageIds = [],
  disappearingTimer = 'off',
  onReactToMessage,
  onEditMessage,
  onDeleteForMe,
  onDeleteForEveryone,
  onReplyToMessage,
  onTogglePinMessage,
  onVotePoll,
  currentUser,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showFullEmojiReactionModal, setShowFullEmojiReactionModal] = useState<Message | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);

  // Audio Playback state for Voice Notes
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isTyping]);

  // Audio Player Toggle
  const toggleAudioPlay = (msgId: string, url?: string) => {
    if (!url) return;

    if (playingAudioId === msgId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const newAudio = new Audio(url);
      audioRef.current = newAudio;
      setPlayingAudioId(msgId);

      newAudio.onended = () => {
        setPlayingAudioId(null);
      };

      newAudio.play().catch(() => {
        setPlayingAudioId(null);
      });
    }
  };

  // Toast timer
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Close context menu on outside click or scroll or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  // Handle Right Click Context Menu
  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent context menu if deleted
    if (message.isDeletedForEveryone) return;

    // Constrain context menu within viewport
    const menuWidth = 230;
    const menuHeight = 280;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 12;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 12;
    }

    setContextMenu({ message, x, y });
  };

  // Handlers for Context Menu Options
  const handleReply = () => {
    if (!contextMenu) return;
    onReplyToMessage?.(contextMenu.message);
    setContextMenu(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!contextMenu) return;
    onReactToMessage?.(contextMenu.message.id, emoji);
    setContextMenu(null);
  };

  const handleCopy = () => {
    if (!contextMenu) return;
    if (contextMenu.message.text) {
      navigator.clipboard.writeText(contextMenu.message.text);
      showToast('Copied to clipboard');
    }
    setContextMenu(null);
  };

  const handleStartEdit = () => {
    if (!contextMenu) return;
    setEditingMessage(contextMenu.message);
    setEditText(contextMenu.message.text);
    setContextMenu(null);
  };

  const handleSaveEdit = () => {
    if (editingMessage && editText.trim()) {
      onEditMessage?.(editingMessage.id, editText.trim());
      showToast('Message edited');
      setEditingMessage(null);
      setEditText('');
    }
  };

  const handleDeleteMe = () => {
    if (!contextMenu) return;
    onDeleteForMe?.(contextMenu.message.id);
    showToast('Deleted for you');
    setContextMenu(null);
  };

  const handleDeleteEveryone = () => {
    if (!contextMenu) return;
    onDeleteForEveryone?.(contextMenu.message.id);
    showToast('Deleted for everyone');
    setContextMenu(null);
  };

  return (
    <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
      {/* Default Vibrant Gradient / Custom Wallpaper Background Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-300 z-0"
        style={{
          backgroundImage: activeWallpaper?.url
            ? `url(${activeWallpaper.url})`
            : `linear-gradient(135deg, #f093fb 0%, #f5576c 30%, #4facfe 70%, #00f2fe 100%)`,
          opacity: activeWallpaper?.url ? (activeWallpaper.opacity ?? 0.85) : 0.2,
          filter: activeWallpaper?.blur ? `blur(${activeWallpaper.blur}px)` : 'none',
        }}
      />

      {/* Scrollable Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-10">
        {/* Encryption / Conversation Header Banner */}
        <div className="flex flex-col items-center justify-center my-4 space-y-2 text-center">
          <img
            src={contact.avatar}
            alt={contact.nickname || contact.name}
            className="w-20 h-20 rounded-full object-cover shadow-md ring-4 ring-blue-500/20"
          />
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">{contact.nickname || contact.name}</h2>
          <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-slate-800/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 shadow-2xs inline-block mt-0.5">
            @{contact.username?.replace(/^@/, '')}
          </p>
          <div className="px-3 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-xs text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 mt-1 shadow-2xs">
            🔒 End-to-end encrypted chat thread
          </div>
        </div>

        {/* Messages list */}
        {messages.map((message, index) => {
          const isMe = message.isMe;
          const showAvatar =
            !isMe && (index === messages.length - 1 || messages[index + 1]?.isMe);

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onDoubleClick={() => {
                if (!message.isDeletedForEveryone) {
                  onReplyToMessage?.(message);
                }
              }}
              className={`flex items-end gap-2.5 cursor-pointer sm:cursor-default ${isMe ? 'justify-end' : 'justify-start'}`}
              title="Double click side area to reply"
            >
              {/* Contact Avatar (for received messages) */}
              {!isMe && (
                <div className="w-8 h-8 shrink-0">
                  {showAvatar ? (
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-8 h-8 rounded-full object-cover shadow-xs"
                    />
                  ) : (
                    <div className="w-8 h-8" />
                  )}
                </div>
              )}

              {/* Bubble Container with Mobile Swipe-to-Reply & Desktop Side-Hover/Double-Click Reply Action */}
              <motion.div
                id={`msg-item-${message.id}`}
                onContextMenu={(e) => handleContextMenu(e, message)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!message.isDeletedForEveryone) {
                    onReplyToMessage?.(message);
                  }
                }}
                drag={!message.isDeletedForEveryone ? "x" : false}
                dragConstraints={{ left: 0, right: 70 }}
                dragElastic={{ left: 0, right: 0.35 }}
                dragSnapToOrigin={true}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 45 && !message.isDeletedForEveryone) {
                    onReplyToMessage?.(message);
                    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                      try { navigator.vibrate(30); } catch (e) {}
                    }
                  }
                }}
                className={`group relative max-w-[82%] sm:max-w-[70%] flex flex-col touch-pan-y ${
                  isMe ? 'items-end' : 'items-start'
                }`}
              >
                {/* Curved Reply Indicator behind sliding bubble on Mobile Swipe */}
                {!message.isDeletedForEveryone && (
                  <div className="absolute -left-9 top-1/2 -translate-y-1/2 opacity-0 group-active:opacity-100 transition-opacity pointer-events-none">
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-500 dark:text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-xs">
                      <Reply className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* WhatsApp Web Style Side-Hover Reply & Context Menu Buttons */}
                {!message.isDeletedForEveryone && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 z-20 ${
                      isMe ? '-left-16' : '-right-16'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplyToMessage?.(message);
                      }}
                      className={`p-1.5 rounded-full shadow-lg border transition-all duration-150 transform hover:scale-110 active:scale-95 ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-500'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                      }`}
                      title="Reply (or swipe right on mobile)"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, message);
                      }}
                      className={`p-1.5 rounded-full shadow-lg border transition-all duration-150 transform hover:scale-110 active:scale-95 ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title="More options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Optional Attached Image */}
                {message.imageUrl && !message.isDeletedForEveryone && (
                  <div className="mb-1 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-xs shadow-sm">
                    <img
                      src={message.imageUrl}
                      alt="Attachment"
                      className="w-full h-auto object-cover max-h-60 hover:opacity-95 transition-opacity cursor-pointer"
                    />
                  </div>
                )}

                {/* Message Content Bubble with Dynamic Theme Colors */}
                {message.isDeletedForEveryone ? (
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-xs italic flex items-center gap-2 border ${
                      isDarkMode
                        ? 'bg-slate-800/40 text-slate-400 border-slate-800'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>This message was deleted</span>
                  </div>
                ) : (
                  <div
                    className={`px-3.5 pt-2.5 pb-2 rounded-2xl text-sm leading-relaxed shadow-xs break-words relative transition-all min-w-[110px] flex flex-col ${
                      message.poll
                        ? 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white border border-[#4a4a75]/60 shadow-xl rounded-2xl'
                        : isMe
                        ? `${activeTheme.bubbleClass || 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white'} rounded-br-xs hover:opacity-95 shadow-md`
                        : isDarkMode
                        ? 'bg-slate-800/95 text-slate-100 border border-slate-700/80 rounded-bl-xs hover:bg-slate-750 backdrop-blur-xs'
                        : 'bg-white/95 text-slate-800 border border-slate-200/90 rounded-bl-xs hover:bg-white backdrop-blur-xs shadow-2xs'
                    }`}
                  >
                    {/* Quoted Replying Snippet */}
                    {message.replyTo && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetEl = document.getElementById(`msg-item-${message.replyTo?.id}`);
                          if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetEl.classList.add('ring-2', 'ring-blue-500', 'rounded-2xl', 'transition-all');
                            setTimeout(() => targetEl.classList.remove('ring-2', 'ring-blue-500'), 1500);
                          }
                        }}
                        className={`mb-2 p-2 rounded-xl text-xs border-l-4 cursor-pointer transition-opacity hover:opacity-90 ${
                          isMe
                            ? 'bg-black/20 border-white/90 text-white'
                            : isDarkMode
                            ? 'bg-slate-900/70 border-blue-500 text-slate-200'
                            : 'bg-slate-200/90 border-blue-600 text-slate-900'
                        }`}
                      >
                        <div className="font-semibold text-[11px] mb-0.5 opacity-90 flex items-center gap-1">
                          <Reply className="w-3 h-3 shrink-0" />
                          <span>{message.replyTo.senderName}</span>
                        </div>
                        <div className="line-clamp-2 italic text-[11px] opacity-85">
                          {message.replyTo.text || 'Photo'}
                        </div>
                      </div>
                    )}

                    {/* Voice Note Audio Player */}
                    {message.audioUrl ? (
                      <VoiceNotePlayer
                        audioUrl={message.audioUrl}
                        initialDuration={message.audioDuration || 30}
                        isMe={isMe}
                      />
                    ) : message.text && message.text.startsWith('🎤') ? (
                      <VoiceNotePlayer
                        audioUrl={message.audioUrl}
                        initialDuration={message.audioDuration || 30}
                        isMe={isMe}
                      />
                    ) : (
                      message.text && (
                        <p className={`whitespace-pre-wrap pr-10 leading-relaxed text-[14px] ${message.poll ? 'text-[#00f2ff] font-bold mb-1' : ''}`}>
                          {message.text}
                        </p>
                      )
                    )}

                    {/* Interactive Poll Card */}
                    {message.poll && (
                      <div className="mt-2 p-3 rounded-2xl bg-[#0f0c29]/60 border border-[#4a4a75]/60 space-y-2.5 min-w-[230px]">
                        <div className="flex items-center justify-between gap-2 border-b border-[#3a3a58] pb-1.5">
                          <span className="font-extrabold text-[11px] uppercase tracking-wider text-[#a0a0c0]">POLL</span>
                          <span className="text-[11px] font-medium text-[#a0a0c0] font-mono">{message.poll.totalVotes} vote{message.poll.totalVotes === 1 ? '' : 's'}</span>
                        </div>
                        <p className="font-bold text-sm tracking-tight text-[#00f2ff]">{message.poll.question}</p>
                        <div className="space-y-2 pt-0.5">
                          {message.poll.options.map((opt) => {
                            const pct = message.poll!.totalVotes > 0 ? Math.round((opt.votes.length / message.poll!.totalVotes) * 100) : 0;
                            const myId = currentUser?.id || 'me';
                            const hasVoted = opt.votes.includes(myId) || (isMe && opt.votes.includes('me'));
                            return (
                              <button
                                key={opt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onVotePoll?.(message.id, opt.id);
                                }}
                                className={`w-full relative overflow-hidden rounded-xl p-2.5 text-left text-xs font-semibold transition-all duration-200 border bg-[#3a3a58] ${
                                  hasVoted
                                    ? 'border-[#00f2ff] ring-2 ring-[#00f2ff]/30 shadow-md'
                                    : 'border-[#4a4a75]/60 hover:border-[#ff80ab]/70'
                                }`}
                              >
                                <div
                                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#ffb86c] to-[#ff80ab] transition-all duration-500 ease-out"
                                  style={{ width: `${pct}%` }}
                                />
                                <div className="relative z-10 flex items-center justify-between">
                                  <span className="text-white font-bold drop-shadow-xs flex items-center gap-1">
                                    {opt.text}
                                    {hasVoted && <span className="text-[#00f2ff] font-extrabold text-xs">✓</span>}
                                  </span>
                                  <span className="text-white font-bold font-mono text-[11px] drop-shadow-xs ml-2">{pct}%</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Integrated Bottom-Right Timestamp & Status Ticks */}
                    <div
                      className={`flex items-center gap-1.5 text-[10px] self-end mt-1 font-sans select-none ${
                        message.poll
                          ? 'text-[#a0a0c0]'
                          : isMe
                          ? 'text-white/80'
                          : isDarkMode
                          ? 'text-slate-400'
                          : 'text-slate-500'
                      }`}
                    >
                      <span>{message.timestamp}</span>
                      {message.isEdited && !message.isDeletedForEveryone && (
                        <span className="italic font-sans">(edited)</span>
                      )}
                      {isMe && !message.isDeletedForEveryone && (
                        <span
                          title={
                            message.status === 'read'
                              ? 'Read by recipient (Seen)'
                              : message.status === 'delivered'
                              ? 'Delivered to recipient'
                              : 'Sent'
                          }
                          className="inline-flex items-center ml-0.5"
                        >
                          {message.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-300 dark:text-cyan-400 font-extrabold stroke-[2.5]" />
                          ) : message.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-white/80 dark:text-slate-400 stroke-[2]" />
                          ) : (
                            <Check className="w-3 h-3 text-white/80 dark:text-slate-400 stroke-[2]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Attached Reactions Pill Badges */}
                {message.reactions && message.reactions.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`flex items-center gap-1 -mt-1 z-10 px-2 py-0.5 rounded-full border text-xs shadow-xs ${
                      isMe ? 'mr-2' : 'ml-2'
                    } ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    {message.reactions.map((r, i) => (
                      <span key={i}>{r}</span>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          );
        })}

        {/* Animated Bouncing Dots Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex items-center gap-2.5 justify-start my-2"
            >
              <img
                src={contact.avatar}
                alt={contact.nickname || contact.name}
                className="w-8 h-8 rounded-full object-cover shadow-xs ring-2 ring-blue-500/30"
              />
              <div
                className={`px-4 py-3 rounded-2xl rounded-bl-xs text-xs flex items-center gap-2 shadow-sm border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700/80 text-slate-100'
                    : 'bg-slate-100 border-slate-200/80 text-slate-800'
                }`}
              >
                <span className="text-xs font-semibold text-blue-500 mr-1">
                  {contact.nickname || contact.name} is typing
                </span>
                <div className="flex items-center gap-1.5 py-0.5">
                  <motion.span
                    animate={{ y: [0, -6, 0], scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut', delay: 0 }}
                    className="w-2 h-2 rounded-full bg-blue-500 shadow-xs"
                  />
                  <motion.span
                    animate={{ y: [0, -6, 0], scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut', delay: 0.15 }}
                    className="w-2 h-2 rounded-full bg-blue-500 shadow-xs"
                  />
                  <motion.span
                    animate={{ y: [0, -6, 0], scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut', delay: 0.3 }}
                    className="w-2 h-2 rounded-full bg-blue-500 shadow-xs"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp-Style Right-Click Context Menu Popup */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className={`fixed z-50 w-60 rounded-2xl shadow-2xl border p-2 animate-scaleIn select-none backdrop-blur-md ${
            isDarkMode
              ? 'bg-slate-900/95 border-slate-700/80 text-slate-100'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          {/* Top Row: WhatsApp Emoji Quick Reactions + Plus for all emojis */}
          <div className="p-1.5 mb-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-1">
            {QUICK_EMOJI_REACTIONS.map((emoji) => {
              const isSelected = contextMenu.message.reactions?.includes(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`text-lg p-1 rounded-lg transition-transform hover:scale-125 ${
                    isSelected ? 'bg-blue-500/20 ring-1 ring-blue-500' : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
            <button
              onClick={() => {
                const msg = contextMenu.message;
                setContextMenu(null);
                setShowFullEmojiReactionModal(msg);
              }}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-500 transition-colors"
              title="More Emojis..."
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />

          {/* Action Options */}
          <div className="space-y-0.5">
            {/* 0. Reply */}
            <button
              onClick={handleReply}
              className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors ${
                isDarkMode ? 'hover:bg-slate-800 text-blue-400' : 'hover:bg-blue-50 text-blue-600'
              }`}
            >
              <Reply className="w-4 h-4 text-blue-500" />
              <span>Reply</span>
            </button>

            {/* Pin / Unpin */}
            <button
              onClick={() => {
                const msg = contextMenu.message;
                setContextMenu(null);
                onTogglePinMessage?.(msg.id);
                showToast(pinnedMessageIds.includes(msg.id) ? 'Unpinned message' : 'Pinned message to top');
              }}
              className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors ${
                isDarkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-amber-50 text-amber-600'
              }`}
            >
              <Pin className="w-4 h-4 text-amber-500" />
              <span>{pinnedMessageIds.includes(contextMenu.message.id) ? 'Unpin Message' : 'Pin Message'}</span>
            </button>

            {/* 1. Copy */}
            <button
              onClick={handleCopy}
              className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors ${
                isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Copy className="w-4 h-4 text-slate-400" />
              <span>Copy</span>
            </button>

            {/* 2. Edit (Only for sent messages) */}
            {contextMenu.message.isMe && (
              <button
                onClick={handleStartEdit}
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Pencil className="w-4 h-4 text-blue-500" />
                <span>Edit</span>
              </button>
            )}

            {/* 3. Delete for me */}
            <button
              onClick={handleDeleteMe}
              className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors ${
                isDarkMode ? 'hover:bg-slate-800 text-rose-400' : 'hover:bg-rose-50 text-rose-600'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete for me</span>
            </button>

            {/* 4. Delete for everyone (Only for sent messages) */}
            {contextMenu.message.isMe && (
              <button
                onClick={handleDeleteEveryone}
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-rose-500' : 'hover:bg-rose-50 text-rose-700'
                }`}
              >
                <Trash className="w-4 h-4" />
                <span>Delete for everyone</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Full Emoji Reaction Modal */}
      {showFullEmojiReactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="relative">
            <EmojiPicker
              onSelectEmoji={(emoji) => {
                onReactToMessage?.(showFullEmojiReactionModal.id, emoji);
                setShowFullEmojiReactionModal(null);
                showToast(`Reacted ${emoji}`);
              }}
              onClose={() => setShowFullEmojiReactionModal(null)}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl border p-5 space-y-4 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-500" />
                Edit Message
              </h3>
              <button
                onClick={() => setEditingMessage(null)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className={`w-full p-3 text-sm rounded-xl border outline-hidden transition-all ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
              }`}
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingMessage(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900/90 text-white border border-slate-700 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
