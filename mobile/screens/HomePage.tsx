import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function HomePage(){
  return (
    <ScrollView contentContainerStyle={{flex:1,alignItems:'center',justifyContent:'center',padding:16}}>
      <Text style={{fontSize:28,fontWeight:'700',marginBottom:12}}>Home</Text>
      <Text style={{fontSize:16,lineHeight:22,textAlign:'center'}}>Welcome to the app — this mirrors the web Home screen. Use the web app for full admin features.</Text>
    </ScrollView>
  );
}
