import { useEffect } from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Screen } from "../src/components/Screen";
import { colors } from "../src/theme";
import { supabase } from "../src/lib/supabase";

export default function Entry() {
  useEffect(() => {
    let active = true;
    const routeForward = async () => {
      try {
        if (supabase) {
          const sessionResult = await Promise.race([
            supabase.auth.getSession(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
          ]);
          if (active && sessionResult && "data" in sessionResult && sessionResult.data.session) {
            router.replace("/(tabs)");
            return;
          }
        }
      } catch (error) {
        console.warn("Session restore failed; continuing to sign-in.", error);
      }
      if (active) router.replace("/auth");
    };
    void routeForward();
    return () => { active = false; };
  }, []);

  return (
    <Screen>
      <View style={s.center}>
        <View style={s.mark}><Text style={s.brand}>SAMBRAMO</Text></View>
        <Text style={s.tag}>EVENT SUPPLY CHAIN & LOGISTICS</Text>
        <ActivityIndicator color={colors.violet} style={{ marginTop: 28 }} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  mark: { backgroundColor: colors.purple, paddingHorizontal: 28, paddingVertical: 20, borderRadius: 20 },
  brand: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: 1.1 },
  tag: { fontSize: 10, letterSpacing: 1.2, color: colors.muted, fontWeight: "700", marginTop: 14 },
});
