import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/theme";
const tabs=[{name:"index",title:"Home",icon:"grid-outline"},{name:"jobs",title:"Jobs",icon:"briefcase-outline"},{name:"pricing",title:"Pricing",icon:"pricetag-outline"},{name:"calendar",title:"Calendar",icon:"calendar-outline"},{name:"account",title:"More",icon:"menu-outline"}] as const;
export default function TabLayout(){return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:colors.purple,tabBarInactiveTintColor:"#8B8796",tabBarStyle:{height:68,paddingTop:8,paddingBottom:10,borderTopColor:"#EEEAF5",backgroundColor:"#FFFFFF"},tabBarLabelStyle:{fontSize:11,fontWeight:"600"}}}>{tabs.map(t=><Tabs.Screen key={t.name} name={t.name} options={{title:t.title,tabBarIcon:({color,size})=><Ionicons name={t.icon as any} color={color} size={size}/>}}/>)}</Tabs>;}
