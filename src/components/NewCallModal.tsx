import React, { useState, useEffect } from 'react';
import { X, Search, Phone, Video, Loader2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Contact } from '../types';

interface NewCallModalProps {
  onClose: () => void;
  onStartCall: (contact: Contact, type: 'audio' | 'video') => void;
  isDarkMode: boolean;
  contactsList?: Contact[];
}

const SUGGESTED_CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'Tom',
    username: '@tom_dev',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    status: 'online',
    lastSeen: 'Active now',
  },
  {
    id: 'c2',
    name: 'Emma Watson',
    username: '@emma_w',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'offline',
    lastSeen: 'Active 15m ago',
  },
  {
    id: 'c3',
    name: 'Alex Johnson',
    username: '@alex_tech',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    status: 'online',
    lastSeen: 'Active now',
  },
  {
    id: 'c4',
    name: 'Sophia Martinez',
    username: '@sophia_m',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    status: 'online',
    lastSeen: 'Active now',
  },
  {
    id: 'c5',
    name: 'Daniel Lee',
    username: '@dan_lee',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'offline',
    lastSeen: 'Active 2h ago',
  },
];

export const NewCallModal: React.FC<NewCallModalProps> = ({
  onClose,
  onStartCall,
  isDarkMode,
  contactsList = [],
}) => {
  const [query, setQuery] = useState('');
  const [dbUsers, setDbUsers] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Combine suggested contacts and passed contactsList without duplicates
  const mergedContactsMap = new Map<string, Contact>();
  [...SUGGESTED_CONTACTS, ...contactsList].forEach((c) => {
    if (c.id) mergedContactsMap.set(c.id, c);
  });
  const localContacts = Array.from(mergedContactsMap.values());

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      if (!db) return;
      setIsLoading(true);
      try {
        const usersCol = collection(db, 'users');
        const snapshot = await getDocs(usersCol);
        if (!isMounted) return;

        const loaded: Contact[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const cleanUsername = data.username
            ? data.username.startsWith('@')
              ? data.username
              : `@${data.username}`
            : data.email
            ? `@${data.email.split('@')[0]}`
            : `@user`;

          loaded.push({
            id: docSnap.id,
            name: data.name || cleanUsername.replace('@', ''),
            username: cleanUsername,
            avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            status: 'online',
            lastSeen: 'Active now',
          });
        });
        setDbUsers(loaded);
      } catch (e) {
        console.warn('NewCallModal fetch users error:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  const cleanQuery = query.trim().toLowerCase().replace(/^@/, '');

  // Combine local and db users
  const allUsersMap = new Map<string, Contact>();
  [...localContacts, ...dbUsers].forEach((u) => {
    if (u.id) allUsersMap.set(u.id, u);
  });
  const allContacts = Array.from(allUsersMap.values());

  const filteredContacts = cleanQuery
    ? allContacts.filter(
        (c) =>
          c.name.toLowerCase().includes(cleanQuery) ||
          c.username.toLowerCase().includes(cleanQuery)
      )
    : allContacts;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh] ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
            isDarkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">New Call</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Select a contact to start an audio or video call
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all ${
              isDarkMode
                ? 'bg-slate-800/80 border-slate-700/80 focus-within:border-blue-500'
                : 'bg-slate-100/80 border-slate-200 focus-within:border-blue-500'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts by name or username..."
              className="w-full bg-transparent text-sm outline-hidden placeholder:text-slate-400"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 dark:divide-slate-800/50 p-2">
          {isLoading && filteredContacts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs font-medium">Loading contacts...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Phone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No contacts found</p>
              <p className="text-xs mt-1">Try searching with a different name</p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3 flex items-center justify-between rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                    />
                    {contact.status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>
                  <div className="truncate min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {contact.nickname || contact.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {contact.username}
                    </p>
                  </div>
                </div>

                {/* Call Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onStartCall(contact, 'audio');
                      onClose();
                    }}
                    className="p-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Audio Call"
                  >
                    <Phone className="w-4 h-4 fill-emerald-600 dark:fill-emerald-400" />
                  </button>

                  <button
                    onClick={() => {
                      onStartCall(contact, 'video');
                      onClose();
                    }}
                    className="p-2.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Video Call"
                  >
                    <Video className="w-4 h-4 fill-blue-600 dark:fill-blue-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
