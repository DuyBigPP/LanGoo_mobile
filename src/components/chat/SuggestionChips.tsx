import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Chip } from "@/components/ui";
import { spacing } from "@/theme";

export interface SuggestionChipsProps {
  suggestions: string[];
  onPick: (text: string) => void;
}

/** Các chip câu hỏi gợi ý — chạm để đưa vào ô soạn tin. */
export function SuggestionChips({ suggestions, onPick }: SuggestionChipsProps) {
  return (
    <View style={styles.chips}>
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

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
});
