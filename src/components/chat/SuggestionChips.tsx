import React from "react";
import { Pressable, View } from "react-native";
import { Chip } from "@/components/ui";

export interface SuggestionChipsProps {
  suggestions: string[];
  onPick: (text: string) => void;
}

/** Các chip câu hỏi gợi ý — chạm để đưa vào ô soạn tin. */
export function SuggestionChips({ suggestions, onPick }: SuggestionChipsProps) {
  return (
    <View className="flex-row flex-wrap justify-center gap-2">
      {suggestions.map(suggestion => (
        <Pressable
          key={suggestion}
          onPress={() => onPick(suggestion)}
          accessibilityRole="button"
          accessibilityLabel={suggestion}
        >
          <Chip>{suggestion}</Chip>
        </Pressable>
      ))}
    </View>
  );
}
