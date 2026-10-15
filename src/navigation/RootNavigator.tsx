import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { FullScreenLoader } from "@/components/common/FullScreenLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useProfilesQuery } from "@/hooks/use-profile";
import { useT } from "@/i18n";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { CollectionDetailScreen } from "@/screens/collections/CollectionDetailScreen";
import { EditItemScreen } from "@/screens/collections/EditItemScreen";
import { KanjiDetailScreen } from "@/screens/dictionary/KanjiDetailScreen";
import { ReverseLookupScreen } from "@/screens/dictionary/ReverseLookupScreen";
import { SenseDetailScreen } from "@/screens/dictionary/SenseDetailScreen";
import { OnboardingScreen } from "@/screens/onboarding/OnboardingScreen";
import { FeedbackScreen } from "@/screens/profile/FeedbackScreen";
import { AchievementsScreen } from "@/screens/profile/AchievementsScreen";
import { ProfileFormScreen } from "@/screens/profile/ProfileFormScreen";
import { SettingsScreen } from "@/screens/profile/SettingsScreen";
import { SourcesScreen } from "@/screens/profile/SourcesScreen";
import { FlashcardScreen } from "@/screens/review/FlashcardScreen";
import { QuizSessionScreen } from "@/screens/review/QuizSessionScreen";
import { MainTabs } from "./MainTabs";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Điều hướng gốc:
 * - guest → Login/Register
 * - đã đăng nhập nhưng chưa có hồ sơ → Onboarding
 * - còn lại → Tabs + các màn đẩy lên (chi tiết, học, cài đặt…)
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

  const needsOnboarding =
    authenticated && profiles.isSuccess && (profiles.data?.data.length ?? 0) === 0;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === "guest" ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : needsOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={MainTabs} />
          <Stack.Screen
            name="SenseDetail"
            component={SenseDetailScreen}
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="KanjiDetail" component={KanjiDetailScreen} />
          <Stack.Screen name="ReverseLookup" component={ReverseLookupScreen} />
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
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="Sources" component={SourcesScreen} />
          <Stack.Screen name="Feedback" component={FeedbackScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
