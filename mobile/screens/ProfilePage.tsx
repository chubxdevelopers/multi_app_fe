import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function ProfilePage(){
  return (
    <ScrollView contentContainerStyle={{flex:1,alignItems:'center',justifyContent:'center',padding:16}}>
      <Text style={{fontSize:28,fontWeight:'700',marginBottom:12}}>Profile</Text>
      <Text style={{fontSize:16,lineHeight:22,textAlign:'center'}}>Profile screen (mobile) — mirrors the web profile.</Text>
    </ScrollView>
  );
}
