import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PartyPopper, Sparkles, Heart } from 'lucide-react';

interface WelcomeCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

const playWelcomeChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();

    // Warm, pleasant celebratory major chime: C5, E5, G5, C6
    const notes = [
      { freq: 523.25, time: 0, duration: 0.4 },
      { freq: 659.25, time: 0.08, duration: 0.4 },
      { freq: 783.99, time: 0.16, duration: 0.45 },
      { freq: 1046.50, time: 0.24, duration: 0.6 },
    ];

    const startTime = audioCtx.currentTime + 0.05;

    notes.forEach((note) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, startTime + note.time);

      gain.gain.setValueAtTime(0.001, startTime + note.time);
      gain.gain.linearRampToValueAtTime(0.2, startTime + note.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.time + note.duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(startTime + note.time);
      osc.stop(startTime + note.time + note.duration);
    });
  } catch (err) {
    console.warn('Welcome sound playback note:', err);
  }
};

export const WelcomeCelebrationModal: React.FC<WelcomeCelebrationModalProps> = ({
  isOpen,
  onClose,
  userName,
}) => {
  useEffect(() => {
    if (isOpen) {
      playWelcomeChime();
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Particle positions & colors for celebratory confetti explosion
  const confettiColors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f97316'];
  const confettiItems = Array.from({ length: 32 }).map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 400,
    y: -(Math.random() * 220 + 80),
    rotation: Math.random() * 360,
    color: confettiColors[i % confettiColors.length],
    scale: Math.random() * 0.6 + 0.6,
    delay: Math.random() * 0.3,
  }));

  const floatingEmojis = [
    { emoji: '🎈', left: '12%', speed: 2.6, delay: 0 },
    { emoji: '🎉', left: '28%', speed: 2.3, delay: 0.2 },
    { emoji: '🥳', left: '45%', speed: 2.8, delay: 0.1 },
    { emoji: '🎊', left: '65%', speed: 2.4, delay: 0.3 },
    { emoji: '🎈', left: '82%', speed: 2.7, delay: 0.15 },
    { emoji: '✨', left: '92%', speed: 2.2, delay: 0.4 },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden select-none">
        {/* Floating Balloons & Party Blowers Animation */}
        {floatingEmojis.map((b, idx) => (
          <motion.div
            key={idx}
            initial={{ y: '100vh', opacity: 0, scale: 0.5 }}
            animate={{
              y: '-20vh',
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.2, 1, 0.8],
              rotate: [0, 15, -15, 0],
            }}
            transition={{
              duration: b.speed,
              delay: b.delay,
              ease: 'easeOut',
            }}
            className="absolute text-4xl sm:text-6xl pointer-events-none z-10"
            style={{ left: b.left }}
          >
            {b.emoji}
          </motion.div>
        ))}

        {/* Confetti Explosion Particles */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 overflow-hidden">
          {confettiItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
              animate={{
                x: item.x,
                y: [0, item.y, item.y + 350],
                opacity: [1, 1, 0],
                scale: item.scale,
                rotate: item.rotation * 2,
              }}
              transition={{
                duration: 2.8,
                delay: item.delay,
                ease: 'easeOut',
              }}
              className="absolute w-3 h-3 rounded-full shadow-lg"
              style={{ backgroundColor: item.color }}
            />
          ))}
        </div>

        {/* Main Celebration Card */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 40, rotateX: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -40 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="relative max-w-md w-full bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-pink-500/60 rounded-3xl p-6 sm:p-8 text-center shadow-2xl z-20 overflow-hidden"
        >
          {/* Background Glow Orbs */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-pink-500/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />

          {/* Animated Celebration Badge */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              rotate: [0, 8, -8, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut',
            }}
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-xl border-2 border-white/20 mb-5 relative"
          >
            <PartyPopper className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-md" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="absolute -top-2 -right-2 text-yellow-300"
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
          </motion.div>

          {/* Exact Required Welcome Text */}
          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300 mb-2"
          >
            Congratulation! Welcome to chat world
          </motion.h2>

          {userName && (
            <p className="text-sm font-bold text-pink-400 mb-3 flex items-center justify-center gap-1.5">
              <span>Glad to connect with you, {userName}!</span>
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
            </p>
          )}

          <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed font-medium">
            Your account is ready! Connect with friends, send voice notes, start video calls, and customize your themes. 🎉
          </p>

          {/* Smooth 3-Second Timer Progress Bar */}
          <div className="mt-6 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 3, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
