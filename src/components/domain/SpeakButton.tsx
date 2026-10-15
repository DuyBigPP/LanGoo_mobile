import { Square, Volume2 } from "lucide-react-native";
import {
  speechKey,
  useSpeak,
  useSpeechSupported,
  type SpeakLang,
} from "@/hooks/use-speech";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { IconButton, toastError } from "@/components/ui";

export interface SpeakButtonProps {
  text: string;
  lang: SpeakLang;
  size?: "sm" | "md";
  testID?: string;
}

/**
 * Nút loa phát âm (TTS) — đang đọc thì đổi thành ô vuông để bấm dừng.
 * `speakingKey` của hook có dạng `${lang}:${text}` nên so bằng speechKey().
 * Nút luôn hiện; máy thiếu engine TTS thì báo toast thay vì ẩn (tránh tưởng app thiếu chức năng).
 */
export function SpeakButton({ text, lang, size = "md", testID }: SpeakButtonProps) {
  const theme = useTheme();
  const t = useT();
  const supported = useSpeechSupported();
  const { speak, stop, speakingKey } = useSpeak();

  const speaking = speakingKey === speechKey(text.trim(), lang);

  const handlePress = async () => {
    if (speaking) {
      stop();
      return;
    }
    // Máy thiếu module TTS hoặc engine không đọc được -> báo toast thân thiện
    if (!supported || !(await speak(text, lang))) {
      toastError(t("common.ttsUnavailable"));
    }
  };

  return (
    <IconButton
      icon={
        speaking ? (
          <Square size={18} color={theme.colors.danger} />
        ) : (
          <Volume2 size={20} color={theme.colors.primary} />
        )
      }
      onPress={handlePress}
      accessibilityLabel={speaking ? t("common.stopSpeaking") : t("common.speak")}
      size={size}
      variant="ghost"
      testID={testID ?? `speak-${lang}`}
    />
  );
}
