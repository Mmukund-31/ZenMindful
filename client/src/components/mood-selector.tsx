import { useState } from "react";

const moodOptions = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "anxious", emoji: "😰", label: "Anxious" },
  { id: "sad", emoji: "😢", label: "Sad" },
  { id: "excited", emoji: "🤗", label: "Excited" },
];

interface MoodSelectorProps {
  onMoodSelect: (mood: { mood: string; emoji: string; rating: number }) => void;
  selectedMood?: string;
}

export default function MoodSelector({ onMoodSelect, selectedMood }: MoodSelectorProps) {
  const [selected, setSelected] = useState<string>(selectedMood || "");

  const handleMoodClick = (moodId: string, emoji: string) => {
    setSelected(moodId);
    onMoodSelect({
      mood: moodId,
      emoji,
      rating: 3, // Default rating, could be enhanced with a slider
    });
  };

  return (
    <div className="bg-white/10 rounded-xl p-3 sm:p-4 backdrop-blur-sm">
      <p className="text-xs sm:text-sm mb-2 sm:mb-3 opacity-90">Quick mood check-in</p>
      <div className="flex justify-between gap-1 sm:gap-2">
        {moodOptions.map(({ id, emoji, label }) => (
          <button
            key={id}
            onClick={() => handleMoodClick(id, emoji)}
            className={`mood-emoji w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl transition-all active:scale-95 ${
              selected === id
                ? "bg-white/40 scale-110"
                : "bg-white/20 hover:bg-white/30 active:bg-white/35"
            }`}
            title={label}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
