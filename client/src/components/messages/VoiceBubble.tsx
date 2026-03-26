import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VoiceBubbleProps {
    fileUrl: string;
    duration?: number;
}

function formatDuration(seconds: number): string {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const VoiceBubble = ({ fileUrl, duration }: VoiceBubbleProps) => {
    console.log("VoiceBubble rendering", { fileUrl, duration });
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            setCurrentTime(audio.currentTime);
            const audioDuration = (Number.isFinite(audio.duration) && audio.duration > 0) 
              ? audio.duration 
              : duration || 1; // Fallback to prop duration or 1 to avoid NaN/Infinity
            setProgress((audio.currentTime / audioDuration) * 100);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };

        audio.addEventListener("timeupdate", updateProgress);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", updateProgress);
            audio.removeEventListener("ended", handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                }).catch(err => {
                    console.error("Audio playback error:", err);
                    setIsPlaying(false);
                    toast({
                        title: "لا يمكن تشغيل الصوت",
                        description: "عذراً، قد يكون الملف مفقوداً أو غير مدعوم.",
                        variant: "destructive"
                    });
                });
            }
        }
    };

    const toggleSpeed = () => {
        if (audioRef.current) {
            const newRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
            audioRef.current.playbackRate = newRate;
            setPlaybackRate(newRate);
        }
    };

    const bars = Array.from({ length: 20 }, () => {
        const height = Math.max(20, Math.random() * 80);
        return height;
    });

    return (
        <div className="flex items-center gap-2 p-2 w-full max-w-[230px] sm:max-w-xs overflow-hidden bg-red-100/50 dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-slate-700">
            <audio ref={audioRef} src={fileUrl} className="hidden" />

            <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
            >
                {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                ) : (
                    <Play className="w-5 h-5 fill-current ml-1" />
                )}
            </button>

            <div className="min-w-0 flex flex-col justify-center gap-1 overflow-hidden">
                <div className="flex items-center gap-0.5 h-8">
                    {bars.map((height, i) => {
                        const isPlayed = (i / bars.length) * 100 < progress;
                        return (
                            <div
                                key={i}
                                className={`w-1 rounded-full transition-all duration-200 ${isPlayed ? 'bg-red-500' : 'bg-red-300/50 dark:bg-slate-600'}`}
                                style={{ height: `${height}%` }}
                            />
                        )
                    })}
                </div>
            </div>

            <div className="flex flex-col items-end justify-between self-stretch py-1">
                <span className="text-[10px] tabular-nums font-medium text-muted-foreground">
                    {formatDuration(currentTime || duration || 0)}
                </span>

                <button
                    onClick={toggleSpeed}
                    className="bg-red-200/50 dark:bg-slate-700 hover:bg-red-200 dark:hover:bg-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold text-red-700 dark:text-red-400 min-w-[40px] transition-colors"
                >
                    {playbackRate}x
                </button>
            </div>
        </div>
    );
};
