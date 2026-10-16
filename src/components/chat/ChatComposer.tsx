import * as React from "react";
import { Image, TextInput, View } from "react-native";
import { cn } from "@/lib/utils";
import { ImagePlus, SendHorizontal, Square, X } from "lucide-react-native";
import { AppText, Button, IconButton } from "@/components/ui";
import { useT } from "@/i18n";
import { CHAT_IMAGE_MAX_COUNT, type LocalImage } from "@/lib/media";
import { useTheme } from "@/theme";

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
    <View className="gap-2 border-t-hairline border-border bg-card px-4 pb-3 pt-2">
      {images.length > 0 ? (
        <View className="flex-row flex-wrap items-center gap-2">
          {images.map((image, index) => (
            <View key={`${image.uri}-${index}`} className="relative">
              <Image
                source={{ uri: image.uri }}
                className="h-16 w-16 rounded-md border border-border"
              />
              <IconButton
                icon={<X size={12} color={theme.colors.text} />}
                onPress={() => onRemoveImage(index)}
                accessibilityLabel={t("chat.imageRemove")}
                size="sm"
                variant="outline"
                className="absolute -right-1.5 -top-1.5 h-[22px] w-[22px] rounded-full bg-card"
                testID={`chat-image-remove-${index}`}
              />
            </View>
          ))}
          <AppText variant="caption">
            {t("chat.imageCount", { count: images.length, max: CHAT_IMAGE_MAX_COUNT })}
          </AppText>
        </View>
      ) : null}

      <View className="flex-row items-end gap-2">
        <IconButton
          icon={<ImagePlus size={20} color={theme.colors.text} />}
          onPress={onPickImages}
          accessibilityLabel={t("chat.attachImage")}
          variant="outline"
          disabled={streaming || creating || images.length >= CHAT_IMAGE_MAX_COUNT}
          className="self-end"
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
          className={cn(
            "max-h-[120px] min-h-[44px] flex-1 rounded-md border-[1.5px] bg-card px-3 py-2.5 text-base text-foreground",
            inputFocused ? "border-primary" : "border-border",
          )}
          // textAlignVertical là style riêng Android, Tailwind không có utility
          style={{ textAlignVertical: "top" }}
        />
        {streaming ? (
          <Button
            label={t("chat.stop")}
            variant="outline"
            size="sm"
            icon={<Square size={14} color={theme.colors.text} />}
            onPress={onStop}
            className="self-end"
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
            className="self-end"
            testID="chat-send"
          />
        )}
      </View>
    </View>
  );
}
