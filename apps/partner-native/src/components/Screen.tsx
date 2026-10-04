import { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { colors } from "../theme";
export function Screen({children,scroll=true}:PropsWithChildren<{scroll?:boolean}>){return <SafeAreaView style={s.safe}>{scroll?<ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>{children}</ScrollView>:<View style={s.content}>{children}</View>}</SafeAreaView>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:28,gap:16}});
