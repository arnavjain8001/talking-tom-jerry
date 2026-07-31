import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Image as ImageIcon, Heart, X, Reply, Mic, Square, Play, Pause, Trash2, Paintbrush, BarChart2, Pin, Paperclip } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { ReplyToPayload } from '../types';

interface MessageInputProps {
  onSendMessage: (
    text: string,
    imageUrl?: string,
    replyTo?: ReplyToPayload,
    audioUrl?: string,
    audioDuration?: number,
    gifUrl?: string
  ) => void;
  isDarkMode: boolean;
  replyToMessage?: ReplyToPayload | null;
  onCancelReply?: () => void;
  onOpenDoodle?: () => void;
  onOpenPoll?: () => void;
  onTyping?: (isTyping: boolean) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isDarkMode,
  replyToMessage,
  onCancelReply,
  onOpenDoodle,
  onOpenPoll,
  onTyping,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{ url: string; duration: number } | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  const startVoiceRecording = async () => {
    audioChunksRef.current = [];
    setShowEmojiPicker(false);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const dur = recordingSeconds || 5;
            setRecordedAudio({ url: dataUrl, duration: dur });
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } else {
        // Fallback for browsers without getUserMedia access
        setIsRecording(true);
      }
    } catch (e) {
      console.warn('Microphone permission not granted or unavailable, using voice note generator fallback:', e);
      setIsRecording(true);
    }
  };

  const createSynthesizedAudioDataUrl = (durationInSeconds = 4): string => {
    const sampleRate = 8000;
    const numSamples = Math.floor(sampleRate * durationInSeconds);
    const buffer = new Uint8Array(44 + numSamples);

    // Header: 'RIFF'
    buffer[0] = 0x52; buffer[1] = 0x49; buffer[2] = 0x46; buffer[3] = 0x46;
    const fileSize = 36 + numSamples;
    buffer[4] = fileSize & 0xff; buffer[5] = (fileSize >> 8) & 0xff;
    buffer[6] = (fileSize >> 16) & 0xff; buffer[7] = (fileSize >> 24) & 0xff;
    // 'WAVE'
    buffer[8] = 0x57; buffer[9] = 0x41; buffer[10] = 0x56; buffer[11] = 0x45;
    // 'fmt '
    buffer[12] = 0x66; buffer[13] = 0x6d; buffer[14] = 0x74; buffer[15] = 0x20;
    buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0;
    buffer[20] = 1; buffer[21] = 0; // PCM
    buffer[22] = 1; buffer[23] = 0; // Mono
    buffer[24] = sampleRate & 0xff; buffer[25] = (sampleRate >> 8) & 0xff;
    buffer[26] = (sampleRate >> 16) & 0xff; buffer[27] = (sampleRate >> 24) & 0xff;
    buffer[28] = sampleRate & 0xff; buffer[29] = (sampleRate >> 8) & 0xff;
    buffer[30] = 1; buffer[31] = 0;
    buffer[32] = 8; buffer[33] = 0;
    // 'data'
    buffer[34] = 0x64; buffer[35] = 0x61; buffer[36] = 0x74; buffer[37] = 0x61;
    buffer[38] = numSamples & 0xff; buffer[39] = (numSamples >> 8) & 0xff;
    buffer[40] = (numSamples >> 16) & 0xff; buffer[41] = (numSamples >> 24) & 0xff;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq = 340 + Math.sin(t * 10) * 50;
      const sample = Math.sin(2 * Math.PI * freq * t) * 0.45 * Math.sin((t / durationInSeconds) * Math.PI);
      buffer[44 + i] = Math.floor((sample + 1) * 127.5);
    }

    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      const dur = recordingSeconds || 4;
      const fallbackUrl = createSynthesizedAudioDataUrl(dur);
      setRecordedAudio({ url: fallbackUrl, duration: dur });
    }
  };

  const cancelVoiceRecording = () => {
    setIsRecording(false);
    setRecordedAudio(null);
    setRecordingSeconds(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSendRecordedAudio = () => {
    if (!recordedAudio) return;
    onSendMessage(
      '🎤 Voice Note',
      undefined,
      replyToMessage || undefined,
      recordedAudio.url,
      recordedAudio.duration,
      undefined
    );
    setRecordedAudio(null);
    setRecordingSeconds(0);
    onCancelReply?.();
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (onTyping) {
      if (val.trim().length > 0) {
        onTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        onTyping(false);
      }
    }
  };

  const handleSend = () => {
    if (!text.trim() && !selectedImage) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping?.(false);
    onSendMessage(text.trim(), selectedImage || undefined, replyToMessage || undefined);
    setText('');
    setSelectedImage(null);
    setShowEmojiPicker(false);
    onCancelReply?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendHeart = () => {
    onSendMessage('❤️', undefined, replyToMessage || undefined);
    onCancelReply?.();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`p-3 sm:p-4 border-t shrink-0 relative transition-colors z-10 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}
    >
      {/* WhatsApp-Style Full Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-4 mb-2 z-40">
          <EmojiPicker
            onSelectEmoji={handleAddEmoji}
            onClose={() => setShowEmojiPicker(false)}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* Replying Banner Preview */}
      {replyToMessage && (
        <div
          className={`mb-2.5 p-2.5 rounded-2xl border-l-4 border-blue-500 flex items-center justify-between gap-3 animate-fadeIn ${
            isDarkMode ? 'bg-slate-800/90 text-slate-100 border-slate-700' : 'bg-slate-100 text-slate-800 shadow-xs'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-500">
              <Reply className="w-3.5 h-3.5" />
              <span>Replying to {replyToMessage.senderName}</span>
            </div>
            <p className="text-xs truncate opacity-85 mt-0.5">
              {replyToMessage.text || 'Media'}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Cancel Reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image Preview attachment badge */}
      {selectedImage && (
        <div className="mb-2 relative inline-block">
          <img
            src={selectedImage}
            alt="Upload preview"
            className="w-20 h-20 object-cover rounded-xl border border-blue-500/50 shadow-xs"
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-slate-900 text-white hover:bg-rose-600 transition-colors shadow-sm"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Active Voice Recording UI Bar */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 p-2 bg-rose-500/10 dark:bg-rose-950/40 rounded-2xl border border-rose-500/30 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
              Recording... {formatTime(recordingSeconds)}
            </span>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex items-center gap-0.5 h-6 px-2">
            {[40, 70, 30, 90, 50, 80, 40, 100, 60, 30, 75, 45].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="w-1 bg-rose-500 rounded-full animate-bounce"
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelVoiceRecording}
              className="p-2 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 transition-colors"
              title="Cancel Recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={stopVoiceRecording}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-500/20"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : recordedAudio ? (
        /* Recorded Audio Preview Bar */
        <div className="flex items-center justify-between gap-3 p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-500/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (audioPreviewRef.current) {
                  if (isPlayingPreview) {
                    audioPreviewRef.current.pause();
                    setIsPlayingPreview(false);
                  } else {
                    audioPreviewRef.current.play();
                    setIsPlayingPreview(true);
                  }
                }
              }}
              className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-2xs"
            >
              {isPlayingPreview ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Voice Note Ready</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Duration: {formatTime(recordedAudio.duration)}
              </p>
            </div>
            <audio
              ref={audioPreviewRef}
              src={recordedAudio.url}
              onEnded={() => setIsPlayingPreview(false)}
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelVoiceRecording}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Discard Voice Note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSendRecordedAudio}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Audio</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard Main Input Controls */
        <div className="flex items-center gap-2">
          {/* Attachment, Doodle, Poll & Emoji Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
              }}
              className={`p-2 rounded-full transition-colors ${
                showEmojiPicker
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                  : isDarkMode
                  ? 'hover:bg-slate-800 text-slate-400'
                  : 'hover:bg-slate-100 text-slate-500'
              }`}
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {onOpenPoll && (
              <button
                onClick={onOpenPoll}
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
                title="Create Poll / Pin"
              >
                <Pin className="w-5 h-5 rotate-45" />
              </button>
            )}

            {onOpenDoodle && (
              <button
                onClick={onOpenDoodle}
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
                title="Doodle / Sketch"
              >
                <Paintbrush className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
              title="Attach Image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Text Input Field */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className={`w-full py-2.5 px-4 text-sm rounded-full border transition-all outline-hidden ${
                isDarkMode
                  ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:bg-slate-800'
                  : 'bg-slate-100/80 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'
              }`}
            />
          </div>

          {/* Microphone, Send or Heart Button */}
          {text.trim() || selectedImage ? (
            <button
              onClick={handleSend}
              className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all transform active:scale-95 shrink-0"
              title="Send Message"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={startVoiceRecording}
                className="p-2.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors"
                title="Record Voice Note"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                onClick={handleSendHeart}
                className="p-2.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors"
                title="Send Heart Reaction"
              >
                <Heart className="w-5 h-5 fill-current" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

