import React from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { FullScreenLoader } from "@/components/common/FullScreenLoader";
import { AppText, Button } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useProfilesQuery } from "@/hooks/use-profile";
import { useT } from "@/i18n";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { CollectionDetailScreen } from "@/screens/collections/CollectionDetailScreen";
import { EditItemScreen } from "@/screens/collections/EditItemScreen";
import { KanjiDetailScreen } from "@/screens/dictionary/KanjiDetailScreen";
import { SenseDetailScreen } from "@/screens/dictionary/SenseDetailScreen";
import { OnboardingScreen } from "@/screens/onboarding/OnboardingScreen";
import { FeedbackScreen } from "@/screens/profile/FeedbackScreen";
import { ProfileFormScreen } from "@/screens/profile/ProfileFormScreen";
import { SourcesScreen } from "@/screens/profile/SourcesScreen";
import { FlashcardScreen } from "@/screens/review/FlashcardScreen";
import { QuizSessionScreen } from "@/screens/review/QuizSessionScreen";
import { MainTabs } from "./MainTabs";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Không tải được hồ sơ học (mạng / máy chủ đang khởi động) — mirror web guards ProfileLoadError. */
function ProfileLoadError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  const t = useT();
  const { logout } = useAuth();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <AppText variant="title" center>
        {t("guards.profileLoadTitle")}
      </AppText>
      <AppText variant="caption" center>
        {t("guards.profileLoadHint")}
      </AppText>
      <View className="flex-row gap-2">
        <Button
          label={retrying ? t("guards.retrying") : t("common.retry")}
          loading={retrying}
          onPress={onRetry}
          testID="profile-load-retry"
        />
        <Button
          label={t("account.logout")}
          variant="outline"
          onPress={() => void logout()}
          testID="profile-load-logout"
        />
      </View>
    </View>
  );
}

/**
 * Điều hướng gốc (một navigator duy nhất, như web AdaptiveShell):
 * - luôn có Tabs + màn công khai (chi tiết nghĩa/kanji, tra ngược, nguồn dữ liệu)
 * - guest → thêm nhóm modal Login/Register (đăng nhập xong tự rơi khỏi stack, về Tabs)
 * - đã đăng nhập → thêm các màn cần tài khoản; chưa có hồ sơ → Onboarding
 */
export function RootNavigator() {
  const t = useT();
  const { status } = useAuth();
  const authenticated = status === "authenticated";
  const profiles = useProfilesQuery(authenticated);

  if (status === "loading") {
    return <FullScreenLoader label={t("guards.checkingAuth")} />;
  }

  if (authenticated && profiles.isPending) {
    return <FullScreenLoader />;
  }

  // Có cache thì vẫn đi tiếp; chỉ báo lỗi khi không có gì để hiển thị
  if (authenticated && profiles.isError && !profiles.data) {
    return (
      <ProfileLoadError
        retrying={profiles.isRefetching}
        onRetry={() => void profiles.refetch()}
      />
    );
  }

  const needsOnboarding =
    authenticated && profiles.isSuccess && (profiles.data?.data.length ?? 0) === 0;

  if (needsOnboarding) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      </Stack.Navigator>
    );
  }

  // key theo trạng thái phiên: đăng xuất / phiên hết hạn -> dựng lại từ đầu, về tab Từ điển
  return (
    <Stack.Navigator key={status} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen
        name="SenseDetail"
        component={SenseDetailScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="KanjiDetail" component={KanjiDetailScreen} />
      <Stack.Screen name="Sources" component={SourcesScreen} />
      {authenticated ? (
        <>
          <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
          <Stack.Screen name="EditItem" component={EditItemScreen} />
          <Stack.Screen
            name="Flashcard"
            component={FlashcardScreen}
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="QuizSession" component={QuizSessionScreen} />
          <Stack.Screen
            name="ProfileForm"
            component={ProfileFormScreen}
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="Feedback" component={FeedbackScreen} />
        </>
      ) : (
        <Stack.Group screenOptions={{ presentation: "modal" }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
