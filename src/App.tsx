import React, { useState, useEffect } from 'react';
import { initialThreads } from './mockData';
import { ChatThread, Message, Contact, ChatThemeConfig, WallpaperConfig, ReplyToPayload, DisappearingTimerOption, UserStory, PollPayload, CallLog } from './types';
import { THEME_PRESETS, WALLPAPER_PRESETS } from './themeData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { ContactInfoDrawer } from './components/ContactInfoDrawer';
import { NewChatModal } from './components/NewChatModal';
import { NewCallModal } from './components/NewCallModal';
import { SettingsModal } from './components/SettingsModal';
import { CallScreenModal } from './components/CallScreenModal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { DoodleModal } from './components/DoodleModal';
import { PollModal } from './components/PollModal';
import { StoriesModal } from './components/StoriesModal';
import { AddStoryModal } from './components/AddStoryModal';
import { AuthScreen } from './components/AuthScreen';
import { MessageSquare, MessagesSquare, Sparkles, Phone, Video, Pin, X, Plus } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import {
  saveThreadsToLocalStorage,
  loadThreadsFromLocalStorage,
  saveAllThreadsToFirestore,
  subscribeToUserThreads,
  createOrGetChatInFirestore,
  sendMessageToFirestore,
  updateMessageInFirestore,
  deleteMessageInFirestore,
  getDirectChatId,
  broadcastMessage,
  broadcastReadAck,
  broadcastPollVote,
  broadcastTypingStatus,
  broadcastUserPresence,
  subscribeToBroadcastMessages,
} from './lib/chatStore';
import {
  initiateCall,
  subscribeToIncomingCalls,
  updateCallStatus,
  subscribeToCallState,
  CallSignalData,
} from './lib/callSignaling';

const CALL_LOGS_STORAGE_KEY = 'chatapp_call_logs_v2';

const initialCallLogs: CallLog[] = [];

const loadCallLogsFromLocalStorage = (userId?: string): CallLog[] => {
  try {
    const key = userId ? `${CALL_LOGS_STORAGE_KEY}_${userId}` : CALL_LOGS_STORAGE_KEY;
    const data = localStorage.getItem(key) || localStorage.getItem('chatapp_call_logs_v1');
    if (data) {
      const parsed: CallLog[] = JSON.parse(data);
      // Filter out legacy mock call log entries if present in localStorage
      const mockIds = new Set(['call-1', 'call-2', 'call-3', 'call-4', 'call-5']);
      const mockNames = new Set(['Tom', 'Emma Watson', 'Alex Johnson', 'Sophia Martinez', 'Daniel Lee']);
      return parsed.filter(log => !mockIds.has(log.id) && !mockNames.has(log.contact?.name));
    }
  } catch (e) {
    console.warn('Failed to load call logs:', e);
  }
  return initialCallLogs;
};

const saveCallLogsToLocalStorage = (logs: CallLog[], userId?: string) => {
  try {
    const key = userId ? `${CALL_LOGS_STORAGE_KEY}_${userId}` : CALL_LOGS_STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (e) {
    console.warn('Failed to save call logs:', e);
  }
};

// Typewriter component for Desktop Empty State Welcome Text
const TypewriterWelcomeText: React.FC = () => {
  const line1Text = "Welcome to the chatting world";
  const line2Text = "Where Conversation Comes Alive";

  const [displayText1, setDisplayText1] = useState('');
  const [displayText2, setDisplayText2] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let index1 = 0;
    let index2 = 0;
    setDisplayText1('');
    setDisplayText2('');
    setIsDone(false);

    const timer1 = setInterval(() => {
      if (index1 < line1Text.length) {
        setDisplayText1(line1Text.slice(0, index1 + 1));
        index1++;
      } else {
        clearInterval(timer1);
        const timer2 = setInterval(() => {
          if (index2 < line2Text.length) {
            setDisplayText2(line2Text.slice(0, index2 + 1));
            index2++;
          } else {
            setIsDone(true);
            clearInterval(timer2);
          }
        }, 60);
      }
    }, 70);

    return () => clearInterval(timer1);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent flex items-center justify-center gap-1">
        <span>{displayText1}</span>
        {displayText1.length < line1Text.length && (
          <span className="inline-block w-1.5 h-7 md:h-9 bg-blue-600 dark:bg-blue-400 rounded-xs ml-0.5 animate-bounce" />
        )}
      </h2>
      {displayText1.length === line1Text.length && (
        <p className="text-base md:text-lg lg:text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-500 dark:from-blue-400 dark:via-indigo-400 dark:to-pink-400 bg-clip-text text-transparent flex items-center justify-center gap-1 min-h-[1.75rem]">
          <span>{displayText2}</span>
          <span className={`inline-block w-1.5 h-5 md:h-6 bg-pink-500 dark:bg-pink-400 rounded-xs ml-0.5 ${isDone ? 'animate-pulse' : 'animate-bounce'}`} />
        </p>
      )}
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ id?: string; name: string; email: string; avatar: string; username?: string; status?: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Sync with Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch complete profile from Firestore 'users' collection
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          const defaultUsername = firebaseUser.email
            ? `@${firebaseUser.email.split('@')[0]}`
            : '@user';

          if (userSnap.exists()) {
            const data = userSnap.data();
            setCurrentUser({
              id: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || 'User',
              email: data.email || firebaseUser.email || '',
              avatar: data.avatar || firebaseUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              username: data.username || defaultUsername,
              status: data.status || 'online',
            });
          } else {
            setCurrentUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              username: defaultUsername,
              status: 'online',
            });
          }
        } catch (error) {
          console.error('Error fetching Firestore user profile:', error);
          setCurrentUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            username: firebaseUser.email ? `@${firebaseUser.email.split('@')[0]}` : '@user',
            status: 'online',
          });
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Sign out error:', e);
    }
    setCurrentUser(null);
  };

  const [threads, setThreads] = useState<ChatThread[]>(() => {
    return loadThreadsFromLocalStorage() || initialThreads;
  });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState<boolean>(false);
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [showNewCallModal, setShowNewCallModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [typingThreads, setTypingThreads] = useState<Record<string, boolean>>({});
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video'; name: string } | null>(null);

  // Call Logs state with LocalStorage persistence per user
  const [callLogs, setCallLogs] = useState<CallLog[]>(() => loadCallLogsFromLocalStorage(currentUser?.id));

  useEffect(() => {
    if (currentUser?.id) {
      setCallLogs(loadCallLogsFromLocalStorage(currentUser.id));
    }
  }, [currentUser?.id]);

  useEffect(() => {
    saveCallLogsToLocalStorage(callLogs, currentUser?.id);
  }, [callLogs, currentUser?.id]);

  const handleLocalTypingChange = (isTypingVal: boolean) => {
    if (!activeThreadId || !currentUser?.id) return;
    broadcastTypingStatus({
      chatId: activeThreadId,
      senderId: currentUser.id,
      isTyping: isTypingVal,
    });
  };

  // Real-Time WebRTC Calling States
  const [showCallScreen, setShowCallScreen] = useState<boolean>(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [incomingCallSignal, setIncomingCallSignal] = useState<CallSignalData | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callRole, setCallRole] = useState<'caller' | 'receiver'>('caller');
  const [callRemoteContact, setCallRemoteContact] = useState<Contact | null>(null);

  // Subscribe to real-time Firestore threads for currentUser
  useEffect(() => {
    if (!currentUser?.id) return;

    // Load local storage threads first if available for instant UI rendering
    const local = loadThreadsFromLocalStorage(currentUser.id);
    if (local) {
      setThreads(local);
    }

    // Subscribe to Firestore updates
    const unsubscribe = subscribeToUserThreads(currentUser.id, (firestoreThreads) => {
      setThreads(firestoreThreads);
      saveThreadsToLocalStorage(firestoreThreads, currentUser.id);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Subscribe to real-time Broadcast messages & Read Receipts (instant cross-tab / local delivery)
  useEffect(() => {
    if (!currentUser) return;

    const handleReadAck = (ackPayload: { chatId: string; readerId: string }) => {
      setThreads((prevThreads) =>
        prevThreads.map((thread) => {
          if (thread.id === ackPayload.chatId || thread.contact.id === ackPayload.readerId) {
            return {
              ...thread,
              messages: thread.messages.map((m) =>
                m.isMe ? { ...m, status: 'read' as const } : m
              ),
            };
          }
          return thread;
        })
      );
    };

    const handlePollVote = (votePayload: { chatId: string; messageId: string; poll: PollPayload }) => {
      setThreads((prevThreads) =>
        prevThreads.map((thread) => {
          if (thread.id === votePayload.chatId) {
            return {
              ...thread,
              messages: thread.messages.map((m) =>
                m.id === votePayload.messageId ? { ...m, poll: votePayload.poll } : m
              ),
            };
          }
          return thread;
        })
      );
    };

    const handleTypingStatus = (payload: { chatId: string; senderId: string; isTyping: boolean }) => {
      setTypingThreads((prev) => ({
        ...prev,
        [payload.chatId]: payload.isTyping,
      }));
    };

    const handlePresenceUpdate = (payload: { userId: string; status: 'online' | 'offline'; lastSeen?: string }) => {
      setThreads((prevThreads) =>
        prevThreads.map((t) => {
          if (t.contact.id === payload.userId) {
            return {
              ...t,
              contact: {
                ...t.contact,
                status: payload.status,
                lastSeen: payload.lastSeen || (payload.status === 'online' ? 'Active now' : 'Offline'),
              },
            };
          }
          return t;
        })
      );
    };

    const unsubscribe = subscribeToBroadcastMessages(
      currentUser,
      (payload) => {
        const incomingMsg: Message = {
          ...payload.message,
          isMe: false,
        };

        setThreads((prevThreads) => {
          const existingIndex = prevThreads.findIndex((t) => {
            if (t.id === payload.chatId) return true;
            if (t.contact.id && payload.senderProfile.id && t.contact.id === payload.senderProfile.id) return true;
            const sUsername = (payload.senderProfile.username || '').toLowerCase().replace(/^@/, '');
            const cUsername = (t.contact.username || '').toLowerCase().replace(/^@/, '');
            if (sUsername && cUsername && sUsername === cUsername) return true;
            const sName = (payload.senderProfile.name || '').toLowerCase();
            const cName = (t.contact.name || '').toLowerCase();
            if (sName && cName && sName === cName) return true;
            return false;
          });

          if (existingIndex !== -1) {
            const updated = [...prevThreads];
            const thread = updated[existingIndex];
            const alreadyExists = thread.messages.some((m) => m.id === incomingMsg.id);
            if (!alreadyExists) {
              updated[existingIndex] = {
                ...thread,
                id: payload.chatId,
                messages: [...thread.messages, incomingMsg],
                unreadCount: activeThreadId === payload.chatId ? 0 : thread.unreadCount + 1,
              };
            }
            return updated;
          } else {
            const newContact: Contact = {
              id: payload.senderProfile.id,
              name: payload.senderProfile.name,
              username: payload.senderProfile.username || `@${payload.senderProfile.name.toLowerCase().replace(/\s+/g, '')}`,
              avatar: payload.senderProfile.avatar,
              status: 'online',
            };
            const newThread: ChatThread = {
              id: payload.chatId,
              contact: newContact,
              messages: [incomingMsg],
              unreadCount: activeThreadId === payload.chatId ? 0 : 1,
            };
            return [newThread, ...prevThreads];
          }
        });
      },
      handleReadAck,
      handlePollVote,
      handleTypingStatus,
      handlePresenceUpdate
    );

    return () => unsubscribe();
  }, [currentUser, activeThreadId]);

  // Real-time window online / offline presence tracking
  useEffect(() => {
    if (!currentUser?.id) return;

    const setOnline = () => {
      broadcastUserPresence({
        userId: currentUser.id!,
        status: 'online',
        lastSeen: 'Active now',
      });
      setCurrentUser((prev) => (prev ? { ...prev, status: 'online' } : prev));
    };

    const setOffline = () => {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      broadcastUserPresence({
        userId: currentUser.id!,
        status: 'offline',
        lastSeen: `Last seen today at ${nowTime}`,
      });
      setCurrentUser((prev) => (prev ? { ...prev, status: 'offline' } : prev));
    };

    // Broadcast online status initially
    setOnline();

    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    window.addEventListener('focus', setOnline);
    window.addEventListener('blur', setOffline);

    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
      window.removeEventListener('focus', setOnline);
      window.removeEventListener('blur', setOffline);
    };
  }, [currentUser?.id]);

  // Mark messages in active thread as read by receiver & broadcast Read Receipt ack
  useEffect(() => {
    if (!activeThreadId || !currentUser?.id) return;

    setThreads((prevThreads) => {
      const activeT = prevThreads.find((t) => t.id === activeThreadId);
      if (!activeT) return prevThreads;

      const unreadFromContact = activeT.messages.filter(
        (m) => !m.isMe && m.status !== 'read'
      );

      if (unreadFromContact.length === 0 && activeT.unreadCount === 0) {
        return prevThreads;
      }

      // Send Read Receipt Ack to sender
      if (currentUser?.id) {
        broadcastReadAck({
          chatId: activeThreadId,
          readerId: currentUser.id,
          senderId: activeT.contact.id,
        });
      }

      return prevThreads.map((t) => {
        if (t.id === activeThreadId) {
          const updatedMsgs = t.messages.map((m) => {
            if (!m.isMe && m.status !== 'read') {
              updateMessageInFirestore(activeThreadId, m.id, { status: 'read' });
              return { ...m, status: 'read' as const };
            }
            return m;
          });
          return {
            ...t,
            messages: updatedMsgs,
            unreadCount: 0,
          };
        }
        return t;
      });
    });
  }, [activeThreadId, currentUser?.id]);

  // Persist state changes to LocalStorage and Firestore
  useEffect(() => {
    saveThreadsToLocalStorage(threads, currentUser?.id);
    if (currentUser?.id) {
      saveAllThreadsToFirestore(threads, currentUser.id);
    }
  }, [threads, currentUser?.id]);

  // Subscribe to Real-Time Incoming Calls (Targeted 1-to-1)
  useEffect(() => {
    if (!currentUser) return;

    // Request Notification permission for desktop alerts
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const unsubscribe = subscribeToIncomingCalls(currentUser, (signal) => {
      setIncomingCallSignal(signal);

      // Dynamically record incoming call log
      const incomingLog: CallLog = {
        id: `call-${signal.callId}`,
        contact: signal.caller,
        type: 'incoming',
        callType: signal.type === 'video' ? 'video' : 'audio',
        timestamp: 'Just now',
      };
      setCallLogs((prev) => {
        if (prev.some((l) => l.id === incomingLog.id)) return prev;
        return [incomingLog, ...prev];
      });
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Listen to Active Call State (Declined, Ended, Accepted)
  useEffect(() => {
    if (!activeCallId) return;

    const unsubscribe = subscribeToCallState(activeCallId, (status) => {
      if (status === 'declined') {
        setShowCallScreen(false);
        setActiveCallId(null);
      } else if (status === 'ended') {
        setShowCallScreen(false);
        setActiveCallId(null);
      }
    });

    return () => unsubscribe();
  }, [activeCallId]);

  // Initiate a Call with a contact (creates a call log entry)
  const handleStartCallWithContact = async (contact: Contact, type: 'audio' | 'video' = 'audio') => {
    const callerContact: Contact = {
      id: currentUser?.id || 'me',
      name: currentUser?.name || 'You',
      username: currentUser?.username || '@you',
      avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'online',
    };

    // Prepend new outgoing call log entry
    const newLog: CallLog = {
      id: `call-${Date.now()}`,
      contact,
      type: 'outgoing',
      callType: type,
      timestamp: 'Just now',
      duration: 'In progress',
    };
    setCallLogs((prev) => [newLog, ...prev]);

    const cId = await initiateCall(callerContact, contact, type === 'video' ? 'video' : 'voice');
    setActiveCallId(cId);
    setCallRole('caller');
    setCallType(type);
    setCallRemoteContact(contact);
    setShowCallScreen(true);
  };

  // Initiate a new Call from active thread
  const handleStartCall = async (type: 'voice' | 'video') => {
    if (!activeThread) return;
    const callTypeStr = type === 'video' ? 'video' : 'audio';
    await handleStartCallWithContact(activeThread.contact, callTypeStr);
  };

  // Accept Incoming Call
  const handleAcceptIncomingCall = async (callSignal: CallSignalData) => {
    await updateCallStatus(callSignal.callId, 'accepted');
    setActiveCallId(callSignal.callId);
    setCallRole('receiver');
    setCallType(callSignal.type === 'video' ? 'video' : 'audio');
    setCallRemoteContact(callSignal.caller);
    setIncomingCallSignal(null);
    setShowCallScreen(true);
  };

  // Decline Incoming Call
  const handleDeclineIncomingCall = async (callId: string) => {
    if (incomingCallSignal) {
      const missedLog: CallLog = {
        id: `call-missed-${callId}`,
        contact: incomingCallSignal.caller,
        type: 'missed',
        callType: incomingCallSignal.type === 'video' ? 'video' : 'audio',
        timestamp: 'Just now',
      };
      setCallLogs((prev) => {
        const filtered = prev.filter((l) => l.id !== `call-${callId}`);
        return [missedLog, ...filtered];
      });
    }
    await updateCallStatus(callId, 'declined');
    setIncomingCallSignal(null);
  };
  const [showDoodleModal, setShowDoodleModal] = useState<boolean>(false);
  const [showPollModal, setShowPollModal] = useState<boolean>(false);
  const [showStoriesModal, setShowStoriesModal] = useState<boolean>(false);
  const [showAddStoryModal, setShowAddStoryModal] = useState<boolean>(false);

  // Stories Feed State
  const [userStories, setUserStories] = useState<UserStory[]>([
    {
      id: 'story-1',
      contactId: 'c1',
      contactName: 'Tom',
      contactAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      mediaType: 'image',
      timestamp: '2h ago',
      caption: 'Sunset vibes by the beach! 🌊☀️',
      musicTrack: { id: 'm3', title: 'Summer Breeze', artist: 'Acoustic Sunset' },
      stickers: [{ id: 'st1', emoji: '☀️', xPercent: 50, yPercent: 30 }],
    },
  ]);
  const [selectedStoryContact, setSelectedStoryContact] = useState<Contact | null>(null);
  const [selectedStoryList, setSelectedStoryList] = useState<UserStory[] | undefined>(undefined);

  const handleViewStories = (contact: Contact, customStories?: UserStory[]) => {
    setSelectedStoryContact(contact);
    setSelectedStoryList(customStories);
    setShowStoriesModal(true);
  };

  const handleShareStory = (newStory: UserStory) => {
    setUserStories((prev) => [newStory, ...prev]);
  };

  // Instagram Theme & Wallpaper Customization States
  const [activeTheme, setActiveTheme] = useState<ChatThemeConfig>(THEME_PRESETS[0]);
  const [activeWallpaper, setActiveWallpaper] = useState<WallpaperConfig>({
    type: 'preset',
    url: WALLPAPER_PRESETS[0].url,
    presetId: WALLPAPER_PRESETS[0].id,
    opacity: 0.85,
  });

  // Get active thread
  const activeThread = threads.find((t) => t.id === activeThreadId) || null;

  // Calculate total unread
  const totalUnread = threads.reduce((acc, t) => acc + t.unreadCount, 0);

  // Context Menu Handlers for Sidebar Threads
  const handleTogglePinThread = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isPinned: !t.isPinned } : t))
    );
  };

  const handleToggleUnreadThread = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unreadCount: t.unreadCount > 0 ? 0 : 1 } : t))
    );
  };

  const handleToggleMuteThread = (threadId: string, duration?: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isMuted: !t.isMuted } : t))
    );
  };

  const handleToggleArchiveThread = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isArchived: !t.isArchived } : t))
    );
  };

  const handleDeleteThread = (threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
    }
  };

  // Handle selecting a thread
  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setReplyingMessage(null);
    setIsMobileSidebarOpen(false); // Close sidebar drawer on mobile when chat selected

    // Mark as read
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
    );
  };

  // Handle sending a new message (including images, audio voice notes, and GIFs)
  const handleSendMessage = async (
    text: string,
    imageUrl?: string,
    replyTo?: ReplyToPayload,
    audioUrl?: string,
    audioDuration?: number,
    gifUrl?: string
  ) => {
    if (!activeThreadId) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Calculate expiration timestamp if thread has disappearing messages timer
    let expiresAt: number | undefined = undefined;
    const currentTimer = activeThread?.disappearingTimer;
    if (currentTimer === '1m') {
      expiresAt = Date.now() + 60 * 1000;
    } else if (currentTimer === '24h') {
      expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    } else if (currentTimer === '7d') {
      expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    }

    const currentUserId = currentUser?.id || 'me';

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUserId,
      text,
      timestamp: currentTime,
      isMe: true,
      status: 'sent',
      imageUrl,
      audioUrl,
      audioDuration,
      gifUrl,
      replyTo,
      expiresAt,
      disappearingTimer: currentTimer !== 'off' ? currentTimer : undefined,
    };

    setReplyingMessage(null);

    // Optimistically append message to sender local thread state immediately
    setThreads((prevThreads) =>
      prevThreads.map((thread) => {
        if (thread.id === activeThreadId) {
          return {
            ...thread,
            messages: [...thread.messages, newMessage],
          };
        }
        return thread;
      })
    );

    // Broadcast message real-time via local cross-tab channel and save to Firestore
    if (activeThread?.contact && currentUser?.id) {
      broadcastMessage({
        chatId: activeThreadId,
        message: newMessage,
        senderProfile: {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username || `@${currentUser.name.toLowerCase().replace(/\s+/g, '')}`,
          avatar: currentUser.avatar,
          email: currentUser.email,
        },
        receiverId: activeThread.contact.id,
        receiverUsername: activeThread.contact.username,
        receiverEmail: activeThread.contact.email,
        receiverName: activeThread.contact.name,
      });

      await sendMessageToFirestore(
        activeThreadId,
        newMessage,
        currentUser.id,
        activeThread.contact.id,
        {
          [currentUser.id]: {
            id: currentUser.id,
            name: currentUser.name,
            username: currentUser.username || `@${currentUser.name.toLowerCase().replace(/\s+/g, '')}`,
            avatar: currentUser.avatar,
          },
          [activeThread.contact.id]: {
            id: activeThread.contact.id,
            name: activeThread.contact.name,
            username: activeThread.contact.username,
            avatar: activeThread.contact.avatar,
          },
        }
      );
    }

    // Automatically transition message status from 'sent' -> 'delivered' after 600ms
    setTimeout(() => {
      setThreads((prevThreads) =>
        prevThreads.map((thread) => {
          if (thread.id === activeThreadId) {
            return {
              ...thread,
              messages: thread.messages.map((m) =>
                m.id === newMessage.id && m.status === 'sent' ? { ...m, status: 'delivered' as const } : m
              ),
            };
          }
          return thread;
        })
      );
    }, 600);

    // Auto-Reply Simulation with Typing Indicator and Blue Tick Read Receipts
    if (autoReplyEnabled && activeThread) {
      const currentChatId = activeThreadId;

      // Step 1: Recipient views message -> upgrade to 'read' (Blue Ticks) after 1.2s
      setTimeout(() => {
        setThreads((prevThreads) =>
          prevThreads.map((thread) => {
            if (thread.id === currentChatId) {
              return {
                ...thread,
                messages: thread.messages.map((m) =>
                  m.id === newMessage.id ? { ...m, status: 'read' as const } : m
                ),
              };
            }
            return thread;
          })
        );

        // Step 2: Show typing indicator ("...is typing")
        setTypingThreads((prev) => ({ ...prev, [currentChatId]: true }));

        // Step 3: Send auto reply after typing
        setTimeout(() => {
          setTypingThreads((prev) => ({ ...prev, [currentChatId]: false }));

          const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const replyText = text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')
            ? `Hey ${currentUser?.name || 'there'}! 😊 Glad to connect with you!`
            : text.toLowerCase().includes('how are you')
            ? `I'm doing great, thank you! How are you doing today?`
            : `Thanks for your message! "${text}" Sounds good! 👍`;

          const replyMessage: Message = {
            id: `reply-${Date.now()}`,
            senderId: activeThread.contact.id,
            text: replyText,
            timestamp: replyTime,
            isMe: false,
            status: 'read',
          };

          setThreads((prevThreads) =>
            prevThreads.map((thread) => {
              if (thread.id === currentChatId) {
                return {
                  ...thread,
                  messages: [...thread.messages, replyMessage],
                };
              }
              return thread;
            })
          );
        }, 2200);
      }, 1200);
    }
  };

  // Toggle Message Pin Status
  const handleTogglePinMessage = (messageId: string) => {
    if (!activeThreadId) return;
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== activeThreadId) return thread;
        const currentPinned = thread.pinnedMessageIds || [];
        const isAlreadyPinned = currentPinned.includes(messageId);
        const newPinned = isAlreadyPinned
          ? currentPinned.filter((id) => id !== messageId)
          : [...currentPinned, messageId];

        return {
          ...thread,
          pinnedMessageIds: newPinned,
          messages: thread.messages.map((m) =>
            m.id === messageId ? { ...m, isPinned: !isAlreadyPinned } : m
          ),
        };
      })
    );
  };

  // Set Disappearing Message Timer for Thread
  const handleSetDisappearingTimer = (timer: DisappearingTimerOption) => {
    if (!activeThreadId) return;
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== activeThreadId) return thread;
        return {
          ...thread,
          disappearingTimer: timer,
        };
      })
    );
  };

  // React to message
  const handleReactToMessage = (messageId: string, emoji: string) => {
    if (!activeThreadId) return;
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== activeThreadId) return thread;
        return {
          ...thread,
          messages: thread.messages.map((m) => {
            if (m.id !== messageId) return m;
            const currentReactions = m.reactions || [];
            const hasEmoji = currentReactions.includes(emoji);
            const newReactions = hasEmoji
              ? currentReactions.filter((r) => r !== emoji)
              : [...currentReactions, emoji];
            return { ...m, reactions: newReactions };
          }),
        };
      })
    );
  };

  // Set contact nickname (Instagram style)
  const handleSetNickname = (threadId: string, nickname: string) => {
    setThreads((prevThreads) =>
      prevThreads.map((thread) => {
        if (thread.id === threadId) {
          return {
            ...thread,
            contact: {
              ...thread.contact,
              nickname: nickname.trim() || undefined,
            },
          };
        }
        return thread;
      })
    );
  };

  // Edit message
  const handleEditMessage = (messageId: string, newText: string) => {
    if (!activeThreadId) return;
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== activeThreadId) return thread;
        return {
          ...thread,
          messages: thread.messages.map((m) => {
            if (m.id !== messageId) return m;
            return {
              ...m,
              text: newText,
              isEdited: true,
            };
          }),
        };
      })
    );
  };

  // Delete for me
  const handleDeleteForMe = (messageId: string) => {
    if (!activeThreadId) return;
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== activeThreadId) return thread;
        return {
          ...thread,
          messages: thread.messages.filter((m) => m.id !== messageId),
        };
      })
    );
  };

  // Delete for everyone
  const handleDeleteForEveryone = (messageId: string) => {
    if (!activeThreadId) return;
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== activeThreadId) return thread;
        return {
          ...thread,
          messages: thread.messages.map((m) => {
            if (m.id !== messageId) return m;
            return {
              ...m,
              text: 'This message was deleted',
              imageUrl: undefined,
              reactions: [],
              isDeletedForEveryone: true,
            };
          }),
        };
      })
    );
  };

  // Handle voting on a poll
  const handleVotePoll = async (messageId: string, optionId: string) => {
    if (!activeThreadId) return;
    const userId = currentUser?.id || 'me';
    let updatedPollMsg: Message | undefined = undefined;

    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== activeThreadId) return thread;
        return {
          ...thread,
          messages: thread.messages.map((m) => {
            if (m.id !== messageId || !m.poll) return m;

            // Toggle vote for the clicked option and remove from other options if single choice
            const updatedOptions = m.poll.options.map((opt) => {
              const hasVotedThisOpt = opt.votes.includes(userId) || opt.votes.includes('me');
              if (opt.id === optionId) {
                const newVotes = hasVotedThisOpt
                  ? opt.votes.filter((v) => v !== userId && v !== 'me')
                  : [...opt.votes.filter((v) => v !== userId && v !== 'me'), userId];
                return { ...opt, votes: newVotes };
              } else {
                return { ...opt, votes: opt.votes.filter((v) => v !== userId && v !== 'me') };
              }
            });

            const totalVotes = updatedOptions.reduce((acc, curr) => acc + curr.votes.length, 0);
            const updated = {
              ...m,
              poll: {
                ...m.poll,
                options: updatedOptions,
                totalVotes,
              },
            };
            updatedPollMsg = updated;
            return updated;
          }),
        };
      })
    );

    // Sync vote update to receiver via Broadcast & Firestore!
    const targetMsg = (updatedPollMsg as Message | undefined);
    if (targetMsg && targetMsg.poll) {
      broadcastPollVote({
        chatId: activeThreadId,
        messageId,
        voterId: userId,
        poll: targetMsg.poll,
      });
      updateMessageInFirestore(activeThreadId, messageId, { poll: targetMsg.poll });
    }
  };

  // Handle creating a new poll
  const handleCreatePoll = async (question: string, optionTexts: string[]) => {
    if (!activeThreadId) return;
    const currentUserId = currentUser?.id || 'me';

    const pollPayload: PollPayload = {
      question,
      options: optionTexts.map((txt, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        text: txt,
        votes: [],
      })),
      totalVotes: 0,
    };

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage: Message = {
      id: `msg-poll-${Date.now()}`,
      senderId: currentUserId,
      text: `📊 Poll: ${question}`,
      timestamp: currentTime,
      isMe: true,
      status: 'sent',
      poll: pollPayload,
    };

    setThreads((prevThreads) =>
      prevThreads.map((thread) => {
        if (thread.id === activeThreadId) {
          return {
            ...thread,
            messages: [...thread.messages, newMessage],
          };
        }
        return thread;
      })
    );
    setShowPollModal(false);

    // Broadcast poll message to receiver & save to Firestore!
    if (activeThread?.contact && currentUser?.id) {
      broadcastMessage({
        chatId: activeThreadId,
        message: newMessage,
        senderProfile: {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username || `@${currentUser.name.toLowerCase().replace(/\s+/g, '')}`,
          avatar: currentUser.avatar,
          email: currentUser.email,
        },
        receiverId: activeThread.contact.id,
        receiverUsername: activeThread.contact.username,
        receiverEmail: activeThread.contact.email,
        receiverName: activeThread.contact.name,
      });

      await sendMessageToFirestore(
        activeThreadId,
        newMessage,
        currentUser.id,
        activeThread.contact.id,
        {
          [currentUser.id]: {
            id: currentUser.id,
            name: currentUser.name,
            username: currentUser.username || `@${currentUser.name.toLowerCase().replace(/\s+/g, '')}`,
            avatar: currentUser.avatar,
          },
          [activeThread.contact.id]: {
            id: activeThread.contact.id,
            name: activeThread.contact.name,
            username: activeThread.contact.username,
            avatar: activeThread.contact.avatar,
          },
        }
      );
    }
  };

  // Handle starting a new chat thread
  const handleStartChat = async (contact: Contact) => {
    const chatId = currentUser?.id
      ? getDirectChatId(currentUser.id, contact.id)
      : `thread-${contact.id}`;

    // Ensure thread exists in local threads state immediately so active thread opens without delay
    setThreads((prevThreads) => {
      const existing = prevThreads.find(
        (t) => t.id === chatId || (contact.id && t.contact.id === contact.id)
      );
      if (existing) {
        return prevThreads.map((t) =>
          t.id === existing.id || t.contact.id === contact.id
            ? { ...t, id: chatId, contact: { ...t.contact, ...contact } }
            : t
        );
      }
      const newThread: ChatThread = {
        id: chatId,
        contact: contact,
        messages: [],
        unreadCount: 0,
      };
      return [newThread, ...prevThreads];
    });

    setActiveThreadId(chatId);

    if (currentUser?.id) {
      const userPayload = {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        avatar: currentUser.avatar,
      };
      createOrGetChatInFirestore(userPayload, contact);
    }

    setShowNewChatModal(false);
    setIsMobileSidebarOpen(false);
  };

  // Clear chat
  const handleClearChat = () => {
    if (!activeThreadId) return;
    setThreads((prev) =>
      prev.map((t) => (t.id === activeThreadId ? { ...t, messages: [] } : t))
    );
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading World of Chat...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={(user) => setCurrentUser(user)}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden font-sans select-none ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Top Main Navigation Header */}
      <Header
        onOpenMobileSidebar={() => {
          setActiveThreadId(null);
          setIsMobileSidebarOpen(false);
        }}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenNewChat={() => setShowNewChatModal(true)}
        totalUnread={totalUnread}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop for Sidebar Drawer */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden"
          />
        )}

        {/* Column 1: Left Sidebar / Inbox View */}
        <div className={`
          h-full shrink-0 transition-all duration-300
          ${activeThreadId ? 'hidden md:block md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96'}
          ${isMobileSidebarOpen ? 'fixed inset-0 z-40 bg-white dark:bg-slate-900 w-full md:relative md:bg-transparent' : ''}
        `}>
          <Sidebar
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={(id) => {
              handleSelectThread(id);
              setIsMobileSidebarOpen(false);
            }}
            onOpenNewChat={() => setShowNewChatModal(true)}
            isDarkMode={isDarkMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            userStories={userStories}
            onOpenAddStory={() => setShowAddStoryModal(true)}
            onViewStories={handleViewStories}
            currentUserAvatar={currentUser?.avatar}
            currentUser={currentUser || undefined}
            onOpenSettings={() => setShowSettingsModal(true)}
            onLogout={handleLogout}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onTogglePinThread={handleTogglePinThread}
            onToggleUnreadThread={handleToggleUnreadThread}
            onToggleMuteThread={handleToggleMuteThread}
            onToggleArchiveThread={handleToggleArchiveThread}
            onDeleteThread={handleDeleteThread}
            callLogs={callLogs}
            onStartCallWithContact={handleStartCallWithContact}
            onOpenNewCall={() => setShowNewCallModal(true)}
          />
        </div>

        {/* Column 2: Main Chat View or Desktop Welcome View */}
        <main className={`
          flex-1 flex-col h-full min-w-0 bg-white dark:bg-slate-900/60 relative
          ${activeThreadId ? 'flex w-full' : 'hidden md:flex'}
        `}>
          {activeThread ? (
            <div className="flex-1 flex h-full overflow-hidden">
              <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Chat Header */}
                <ChatHeader
                  contact={activeThread.contact}
                  onBack={() => {
                    setActiveThreadId(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  onToggleInfo={() => setShowInfoDrawer(!showInfoDrawer)}
                  isDarkMode={isDarkMode}
                  onSimulateCall={(type) => handleStartCall(type)}
                  isTyping={Boolean(activeThreadId && typingThreads[activeThreadId])}
                  onOpenStory={() => handleViewStories(activeThread.contact)}
                />

                {/* Pinned Messages Banner */}
                {activeThread.pinnedMessageIds && activeThread.pinnedMessageIds.length > 0 && (
                  <div className="bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <div className="flex items-center gap-2 truncate">
                      <Pin className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-bold">Pinned:</span>
                      <span className="truncate italic">
                        {activeThread.messages.find((m) => m.id === activeThread.pinnedMessageIds?.[0])?.text ||
                          'Attachment / Poll'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleTogglePinMessage(activeThread.pinnedMessageIds![0])}
                      className="p-1 rounded-full hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      title="Unpin"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Message Scrolling Body */}
                <MessageList
                  messages={activeThread.messages}
                  contact={activeThread.contact}
                  isDarkMode={isDarkMode}
                  isTyping={Boolean(activeThreadId && typingThreads[activeThreadId])}
                  activeTheme={activeTheme}
                  activeWallpaper={activeWallpaper}
                  pinnedMessageIds={activeThread.pinnedMessageIds}
                  disappearingTimer={activeThread.disappearingTimer}
                  onReactToMessage={handleReactToMessage}
                  onEditMessage={handleEditMessage}
                  onDeleteForMe={handleDeleteForMe}
                  onDeleteForEveryone={handleDeleteForEveryone}
                  onReplyToMessage={(msg) => setReplyingMessage(msg)}
                  onTogglePinMessage={handleTogglePinMessage}
                  onVotePoll={handleVotePoll}
                  currentUser={currentUser}
                />

                {/* Fixed Message Input Bar */}
                <MessageInput
                  onSendMessage={handleSendMessage}
                  isDarkMode={isDarkMode}
                  replyToMessage={
                    replyingMessage
                      ? {
                          id: replyingMessage.id,
                          senderName: replyingMessage.isMe
                            ? 'You'
                            : activeThread.contact.nickname || activeThread.contact.name || 'User',
                          text: replyingMessage.text,
                          isMe: replyingMessage.isMe,
                        }
                      : null
                  }
                  onCancelReply={() => setReplyingMessage(null)}
                  onOpenDoodle={() => setShowDoodleModal(true)}
                  onOpenPoll={() => setShowPollModal(true)}
                  onTyping={handleLocalTypingChange}
                />
              </div>

              {/* Optional Right Contact Info Drawer */}
              {showInfoDrawer && (
                <ContactInfoDrawer
                  contact={activeThread.contact}
                  messages={activeThread.messages}
                  onClose={() => setShowInfoDrawer(false)}
                  onClearChat={handleClearChat}
                  isDarkMode={isDarkMode}
                  activeTheme={activeTheme}
                  onSelectTheme={setActiveTheme}
                  activeWallpaper={activeWallpaper}
                  onSelectWallpaper={setActiveWallpaper}
                  onSetNickname={(nickname) => handleSetNickname(activeThread.id, nickname)}
                  disappearingTimer={activeThread.disappearingTimer}
                  onSetDisappearingTimer={handleSetDisappearingTimer}
                />
              )}
            </div>
          ) : (
            /* Desktop Welcome Area with Typewriter Animation */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-900/40 select-none">
              {/* Premium Chat Web Logo Badge */}
              <div className="relative mb-8 group cursor-pointer">
                {/* Glowing Ambient Gradient Background */}
                <div className="absolute -inset-3 bg-gradient-to-r from-blue-600 via-indigo-500 to-pink-500 rounded-3xl blur-lg opacity-35 group-hover:opacity-60 transition duration-500 animate-pulse" />

                {/* Main Glassmorphism Icon Box */}
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 p-1 shadow-2xl shadow-blue-500/25 transition-transform duration-300 group-hover:scale-105">
                  <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[20px] flex items-center justify-center relative overflow-hidden">
                    {/* Interior Gradient Accent */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-pink-500/10 dark:from-blue-400/20 dark:to-pink-400/20" />

                    {/* Dual Chat Bubbles Logo Icon */}
                    <div className="relative flex items-center justify-center">
                      <MessagesSquare className="w-11 h-11 text-blue-600 dark:text-blue-400 drop-shadow-xs group-hover:rotate-3 transition-transform duration-300" />
                      <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
                    </div>

                    {/* Active Pulse Badge */}
                    <span className="absolute bottom-2 right-2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                    </span>
                  </div>
                </div>
              </div>

              <TypewriterWelcomeText />
            </div>
          )}
        </main>
      </div>

      {/* Real-Time Incoming Call Pop-Up Alert */}
      <IncomingCallModal
        callSignal={incomingCallSignal}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
        isDarkMode={isDarkMode}
      />

      {/* Interactive WebRTC Call Screen Overlay */}
      <CallScreenModal
        isOpen={showCallScreen}
        type={callType === 'video' ? 'video' : 'voice'}
        contact={callRemoteContact || activeThread?.contact || { id: 'c1', name: 'Contact', username: '@contact', avatar: '', status: 'online' }}
        currentUser={{
          id: currentUser?.id || 'me',
          name: currentUser?.name || 'You',
          username: currentUser?.username || '@you',
          avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          status: 'online',
        }}
        callId={activeCallId}
        role={callRole}
        onEndCall={() => {
          if (activeCallId) updateCallStatus(activeCallId, 'ended');
          setShowCallScreen(false);
          setActiveCallId(null);
        }}
        isDarkMode={isDarkMode}
      />

      {/* Doodle Sketch Modal */}
      <DoodleModal
        isOpen={showDoodleModal}
        isDarkMode={isDarkMode}
        onClose={() => setShowDoodleModal(false)}
        onSendDoodle={(dataUrl) => {
          handleSendMessage('', dataUrl);
          setShowDoodleModal(false);
        }}
      />

      {/* Poll Creation Modal */}
      <PollModal
        isOpen={showPollModal}
        isDarkMode={isDarkMode}
        onClose={() => setShowPollModal(false)}
        onCreatePoll={(poll) => {
          if (!activeThreadId) return;
          const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newMessage: Message = {
            id: `msg-poll-${Date.now()}`,
            senderId: 'me',
            text: '',
            timestamp: currentTime,
            isMe: true,
            status: 'sent',
            poll,
          };
          setThreads((prevThreads) =>
            prevThreads.map((thread) => {
              if (thread.id === activeThreadId) {
                return {
                  ...thread,
                  messages: [...thread.messages, newMessage],
                };
              }
              return thread;
            })
          );
          setShowPollModal(false);
        }}
      />

      {/* Stories Viewer Modal */}
      {showStoriesModal && (
        <StoriesModal
          isOpen={showStoriesModal}
          contact={selectedStoryContact || activeThread?.contact || { id: 'c1', name: 'Tom', username: '@tom', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', status: 'online' }}
          storiesList={selectedStoryList}
          isDarkMode={isDarkMode}
          onClose={() => setShowStoriesModal(false)}
          onReplyStory={(storyText: string) => {
            handleSendMessage(`Replied to story: "${storyText}"`);
            setShowStoriesModal(false);
          }}
        />
      )}

      {/* Add Story Creator Studio Modal */}
      <AddStoryModal
        isOpen={showAddStoryModal}
        onClose={() => setShowAddStoryModal(false)}
        onShareStory={handleShareStory}
        isDarkMode={isDarkMode}
        currentUser={{
          name: currentUser?.name || currentUser?.username || 'You',
          avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        }}
      />

      {/* Modals */}
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onStartChat={handleStartChat}
          isDarkMode={isDarkMode}
        />
      )}

      {showNewCallModal && (
        <NewCallModal
          onClose={() => setShowNewCallModal(false)}
          onStartCall={handleStartCallWithContact}
          isDarkMode={isDarkMode}
          contactsList={threads.map((t) => t.contact)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          autoReplyEnabled={autoReplyEnabled}
          onToggleAutoReply={() => setAutoReplyEnabled(!autoReplyEnabled)}
          currentUser={currentUser}
          onLogout={() => setCurrentUser(null)}
          onUpdateUsername={(newUsername) =>
            setCurrentUser((prev) => (prev ? { ...prev, username: newUsername } : prev))
          }
          onUpdateAvatar={(newAvatar) =>
            setCurrentUser((prev) => (prev ? { ...prev, avatar: newAvatar } : prev))
          }
          onUpdateName={(newName) =>
            setCurrentUser((prev) => (prev ? { ...prev, name: newName } : prev))
          }
        />
      )}
    </div>
  );
}
