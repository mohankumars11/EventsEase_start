import { useState } from "react";
import { Alert, Text, TextInput, Pressable, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Screen } from "../src/components/Screen";
import { colors } from "../src/theme";
import { supabase } from "../src/lib/supabase";

function normalizeIndianPhone(value: string) {
  const normalized = value.replace(/[\s()-]/g, "");
  if (normalized.startsWith("+91")) return normalized.slice(3);
  if (normalized.startsWith("91") && normalized.length === 12) return normalized.slice(2);
  return normalized;
}

export default function Auth() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    const local = normalizeIndianPhone(phone);
    if (!/^[6-9][0-9]{9}$/.test(local)) {
      Alert.alert("Check phone number", "Enter a valid 10-digit Indian mobile number, with or without +91.");
      return;
    }
    if (!supabase) {
      Alert.alert("Setup required", "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in the Expo environment.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: "+91" + local });
    setBusy(false);
    if (error) Alert.alert("Unable to send OTP", error.message);
    else setSent(true);
  }

  async function verify() {
    const local = normalizeIndianPhone(phone);
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: "+91" + local,
      token: otp,
      type: "sms",
    });
    setBusy(false);
    if (error) Alert.alert("OTP not verified", error.message);
    else router.replace("/onboarding");
  }

  return <Screen>
    <View style={s.top}>
      <Text style={s.brand}>SAMBRAMO</Text>
      <Text style={s.heading}>{sent ? "Verify your number" : "Welcome, partner"}</Text>
      <Text style={s.sub}>{sent ? "Enter the OTP sent to your mobile." : "Sign in to manage your event business."}</Text>
    </View>
    <View style={s.form}>
      <Text style={s.label}>Mobile number</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" style={s.input}/>
      {sent && <>
        <Text style={s.label}>One-time password</Text>
        <TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholder="6-digit OTP" style={s.input}/>
      </>}
      <Pressable disabled={busy} onPress={sent ? verify : send} style={s.button}>
        <Text style={s.buttonText}>{busy ? "Please wait…" : sent ? "Verify & continue" : "Continue with OTP →"}</Text>
      </Pressable>
      <Text style={s.foot}>Secure sign-in · Your account and listings remain in Sambramo</Text>
    </View>
  </Screen>;
}

const s = StyleSheet.create({
  top:{paddingTop:28}, brand:{fontWeight:"900",letterSpacing:1.3,color:colors.purple,fontSize:15},
  heading:{fontSize:29,fontWeight:"900",color:colors.ink,marginTop:35}, sub:{fontSize:14,color:colors.muted,marginTop:7},
  form:{marginTop:32,gap:12}, label:{fontSize:13,fontWeight:"700",color:colors.ink},
  input:{height:54,backgroundColor:"#fff",borderColor:colors.line,borderWidth:1,borderRadius:14,paddingHorizontal:15,fontSize:16,color:colors.ink},
  button:{height:54,backgroundColor:colors.violet,borderRadius:15,alignItems:"center",justifyContent:"center",marginTop:10},
  buttonText:{color:"#fff",fontWeight:"800",fontSize:15}, foot:{textAlign:"center",color:colors.muted,fontSize:11,marginTop:12}
});