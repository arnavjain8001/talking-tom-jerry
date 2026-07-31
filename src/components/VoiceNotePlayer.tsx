import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface VoiceNotePlayerProps {
  audioUrl?: string;
  initialDuration?: number; // duration in seconds
  isMe?: boolean;
}

// Generate a valid synthesized audio WAV Base64 Data URL for fallback/demo voice notes
function createSynthesizedAudioDataUrl(durationInSeconds = 5): string {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationInSeconds);
  const buffer = new Uint8Array(44 + numSamples);

  // RIFF Header
  buffer[0] = 0x52; buffer[1] = 0x49; buffer[2] = 0x46; buffer[3] = 0x46;
  const fileSize = 36 + numSamples;
  buffer[4] = fileSize & 0xff; buffer[5] = (fileSize >> 8) & 0xff;
  buffer[6] = (fileSize >> 16) & 0xff; buffer[7] = (fileSize >> 24) & 0xff;
  buffer[8] = 0x57; buffer[9] = 0x41; buffer[10] = 0x56; buffer[11] = 0x45; // WAVE
  buffer[12] = 0x66; buffer[13] = 0x6d; buffer[14] = 0x74; buffer[15] = 0x20; // fmt 
  buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0;
  buffer[20] = 1; buffer[21] = 0; // PCM
  buffer[22] = 1; buffer[23] = 0; // Mono
  buffer[24] = sampleRate & 0xff; buffer[25] = (sampleRate >> 8) & 0xff;
  buffer[26] = (sampleRate >> 16) & 0xff; buffer[27] = (sampleRate >> 24) & 0xff;
  buffer[28] = sampleRate & 0xff; buffer[29] = (sampleRate >> 8) & 0xff;
  buffer[30] = 1; buffer[31] = 0;
  buffer[32] = 8; buffer[33] = 0;
  buffer[34] = 0x64; buffer[35] = 0x61; buffer[36] = 0x74; buffer[37] = 0x61; // data
  buffer[38] = numSamples & 0xff; buffer[39] = (numSamples >> 8) & 0xff;
  buffer[40] = (numSamples >> 16) & 0xff; buffer[41] = (numSamples >> 24) & 0xff;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 360 + Math.sin(t * 8) * 60;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.4 * Math.sin((t / durationInSeconds) * Math.PI);
    buffer[44 + i] = Math.floor((sample + 1) * 127.5);
  }

  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  initialDuration = 5,
  isMe = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(initialDuration || 5);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  // Resolved audio src URL: if missing or stale blob: URL, use synthetic base64 audio
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string>(() => {
    if (audioUrl && (audioUrl.startsWith('data:') || audioUrl.startsWith('http'))) {
      return audioUrl;
    }
    return createSynthesizedAudioDataUrl(initialDuration || 5);
  });

  useEffect(() => {
    if (audioUrl && (audioUrl.startsWith('data:') || audioUrl.startsWith('http'))) {
      setResolvedAudioUrl(audioUrl);
    } else {
      setResolvedAudioUrl(createSynthesizedAudioDataUrl(initialDuration || 5));
    }
  }, [audioUrl, initialDuration]);

  // Sync duration with HTML5 audio element metadata
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      stopSynthSound();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [resolvedAudioUrl]);

  const playSynthSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      if (oscRef.current) {
        try { oscRef.current.stop(); } catch (e) {}
      }

      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, audioCtxRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, audioCtxRef.current.currentTime + (duration || 5));

      gain.gain.setValueAtTime(0.12, audioCtxRef.current.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtxRef.current.currentTime + (duration || 5));

      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);

      osc.start();
      oscRef.current = osc;
    } catch (e) {
      console.warn('Web Audio synthesis error:', e);
    }
  };

  const stopSynthSound = () => {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
      } catch (e) {}
      oscRef.current = null;
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      setIsPlaying(false);
      stopSynthSound();
      if (audio) audio.pause();
    } else {
      if (audio) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn('HTML5 Audio play warning, triggering Web Audio synth fallback:', err);
          playSynthSound();
          setIsPlaying(true);
        });
      } else {
        playSynthSound();
        setIsPlaying(true);
      }
    }
  };

  // Timer simulation fallback if HTML5 audio timeupdate does not fire smoothly
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        if (audioRef.current && !audioRef.current.paused) {
          setCurrentTime(audioRef.current.currentTime);
        } else {
          setCurrentTime((prev) => {
            if (prev >= duration) {
              setIsPlaying(false);
              stopSynthSound();
              return 0;
            }
            return prev + 0.1;
          });
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return '0:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white shadow-md select-none w-full max-w-[280px] sm:max-w-[320px]">
      {/* Hidden HTML5 audio element */}
      <audio ref={audioRef} src={resolvedAudioUrl} preload="metadata" />

      {/* Play / Pause / Microphone Trigger Button on the Far Left */}
      <button
        onClick={togglePlayPause}
        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer backdrop-blur-xs ring-1 ring-white/30 shadow-xs"
        title={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
        aria-label={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-white fill-white" />
        ) : (
          <div className="flex items-center justify-center relative">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            <Mic className="w-2.5 h-2.5 text-pink-200 absolute -bottom-1 -right-1 opacity-80" />
          </div>
        )}
      </button>

      {/* Seekbar / Progress Slider in Middle */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <div className="relative w-full flex items-center h-4 group">
          {/* Custom Styled Range Input Bar */}
          <input
            type="range"
            min={0}
            max={duration || 5}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer outline-hidden accent-white hover:bg-white/40 transition-colors z-10"
            style={{
              background: `linear-gradient(to right, rgba(255, 255, 255, 0.95) ${progressPercent}%, rgba(255, 255, 255, 0.3) ${progressPercent}%)`,
            }}
          />
        </div>

        {/* Waveform visual simulation bar */}
        <div className="flex items-center gap-0.5 h-2.5 w-full overflow-hidden opacity-80">
          {[40, 70, 30, 90, 60, 100, 45, 80, 35, 65, 85, 50, 95, 30, 75, 55, 80, 40, 90, 60].map((heightPct, idx) => {
            const barPos = (idx / 20) * 100;
            const isPlayed = barPos <= progressPercent;
            return (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPlayed ? 'bg-white' : 'bg-white/30'
                }`}
                style={{ height: `${heightPct}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Timestamp on Far Right (e.g., "0:01 / 0:05") */}
      <div className="text-[11px] font-mono font-medium text-white/90 shrink-0 min-w-[62px] text-right">
        <span>{formatTime(currentTime)}</span>
        <span className="text-white/60 mx-0.5">/</span>
        <span className="text-white/80">{formatTime(duration)}</span>
      </div>
    </div>
  );
};
