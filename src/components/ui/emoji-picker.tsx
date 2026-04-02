import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const EMOJI_CATEGORIES = {
  "Finanças": ["💰", "💵", "💳", "🏦", "💎", "📈", "📉", "💹", "🪙", "💸"],
  "Casa": ["🏠", "🏡", "🛋️", "🛏️", "🚿", "🔌", "💡", "🧹", "🧺", "🪴"],
  "Transporte": ["🚗", "🚕", "🚌", "🚇", "✈️", "🚲", "⛽", "🛵", "🚁", "🛳️"],
  "Alimentação": ["🍔", "🍕", "🍜", "🥗", "🍎", "🛒", "🍽️", "☕", "🧁", "🍺"],
  "Saúde": ["💊", "🏥", "🩺", "💉", "🧘", "🏃", "🦷", "👓", "🩹", "💪"],
  "Educação": ["📚", "🎓", "✏️", "📝", "💻", "🎒", "📖", "🧠", "📐", "🔬"],
  "Lazer": ["🎮", "🎬", "🎵", "🎨", "📷", "🎭", "🎪", "🎯", "🏀", "⚽"],
  "Compras": ["🛍️", "👗", "👟", "💄", "⌚", "📱", "🎁", "🛒", "🏪", "🧴"],
  "Trabalho": ["💼", "📊", "📋", "🖨️", "📞", "🗂️", "📁", "✉️", "🔧", "⚙️"],
  "Outros": ["📦", "🎉", "❤️", "⭐", "🔔", "📌", "🏷️", "🔑", "🎈", "🌟"],
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Finanças");

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full h-10 text-2xl justify-center hover:bg-muted/50",
            className
          )}
        >
          {value || "📦"}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-popover border shadow-lg z-50" 
        align="start"
        sideOffset={4}
      >
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Emoji Grid */}
        <div className="p-3 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-5 gap-1">
            {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                className={cn(
                  "h-10 w-10 text-xl hover:bg-primary/10 hover:scale-110 transition-transform",
                  value === emoji && "bg-primary/20 ring-2 ring-primary"
                )}
                onClick={() => handleSelect(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Emoji Input */}
        <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/30">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Personalizado:</span>
          <input
            type="text"
            placeholder="Cole um emoji aqui"
            className="flex-1 h-8 px-2 text-lg bg-background border rounded-md text-center focus:outline-none focus:ring-2 focus:ring-ring"
            onInput={(e) => {
              const val = (e.target as HTMLInputElement).value;
              if (val.trim()) {
                const firstChar = [...val.trim()][0];
                if (firstChar) {
                  handleSelect(firstChar);
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
          />
          <span className="text-2xl">{value || "📦"}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
