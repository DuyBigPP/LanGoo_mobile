import * as React from "react";
import { Image, StyleSheet, TextInput, View } from "react-native";
import { ImagePlus, SendHorizontal, Square, X } from "lucide-react-native";
import { AppText, Button, IconButton } from "@/components/ui";
import { useT } from "@/i18n";
import { CHAT_IMAGE_MAX_COUNT, type LocalImage } from "@/lib/media";
import { fontSize, radius, spacing, useTheme } from "@/theme";

export interface ChatComposerProps {
  draft: string;
  onDraftChange: (text: string) => void;
  images: LocalImage[];
  onPickImages: () => void;
  onRemoveImage: (index: number) => void;
  /** Đang nhận câu trả lời (khoá ô nhập, nút Gửi thành Dừng). */
  streaming: boolean;
  /** Đang tạo phiên mới trước khi gửi câu đầu tiên. */
  creating: boolean;
  onSend: () => void;
  onStop: () => void;
}

/** Ô soạn tin: ảnh đính kèm + nhập nội dung + gửi/dừng (nội dung tối đa 2000 ký tự theo API). */
export function ChatComposer({
  draft,
  onDraftChange,
  images,
  onPickImages,
  onRemoveImage,
  streaming,
  creating,
  onSend,
  onStop,
}: ChatComposerProps) {
  const t = useT();
  const theme = useTheme();
  const [inputFocused, setInputFocused] = React.useState(false);

  return (
    <View
      style={[
        styles.composer,
        { borderTopColor: theme.colors.border, backgroundColor: theme.colors.card },
      ]}
    >
      {images.length > 0 ? (
        <View style={styles.previews}>
          {images.map((image, index) => (
            <View key={`${image.uri}-${index}`} style={styles.previewWrap}>
              <Image
                source={{ uri: image.uri }}
                style={[styles.previewImage, { borderColor: theme.colors.border }]}
              />
              <IconButton
                icon={<X size={12} color={theme.colors.text} />}
                onPress={() => onRemoveImage(index)}
                accessibilityLabel={t("chat.imageRemove")}
                size="sm"
                variant="outline"
                style={[styles.previewRemove, { backgroundColor: theme.colors.card }]}
                testID={`chat-image-remove-${index}`}
              />
            </View>
          ))}
          <AppText variant="caption">
            {t("chat.imageCount", { count: images.length, max: CHAT_IMAGE_MAX_COUNT })}
          </AppText>
        </View>
      ) : null}

      <View style={styles.row}>
        <IconButton
          icon={<ImagePlus size={20} color={theme.colors.text} />}
          onPress={onPickImages}
          accessibilityLabel={t("chat.attachImage")}
          variant="outline"
          disabled={streaming || creating || images.length >= CHAT_IMAGE_MAX_COUNT}
          style={styles.button}
          testID="chat-attach-image"
        />
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          placeholder={t("chat.composerPlaceholder")}
          placeholderTextColor={theme.colors.textFaint}
          multiline
          maxLength={2000}
          editable={!streaming && !creating}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          testID="chat-input"
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.card,
              borderColor: inputFocused ? theme.colors.primary : theme.colors.border,
              color: theme.colors.text,
            },
          ]}
        />
        {streaming ? (
          <Button
            label={t("chat.stop")}
            variant="outline"
            size="sm"
            icon={<Square size={14} color={theme.colors.text} />}
            onPress={onStop}
            style={styles.button}
            testID="chat-stop"
          />
        ) : (
          <Button
            label={t("chat.send")}
            size="sm"
            icon={<SendHorizontal size={15} color={theme.colors.onPrimary} />}
            onPress={onSend}
            disabled={!draft.trim()}
            loading={creating}
            style={styles.button}
            testID="chat-send"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: fontSize.md,
    textAlignVertical: "top",
  },
  button: { alignSelf: "flex-end" },
  previews: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  previewWrap: { position: "relative" },
  previewImage: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 1 },
  previewRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
  },
});
