import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function AboutPage(){
  return (
    <ScrollView contentContainerStyle={{flex:1,alignItems:'center',justifyContent:'center',padding:16}}>
      <Text style={{fontSize:28,fontWeight:'700',marginBottom:12}}>About</Text>
      <Text style={{fontSize:16,lineHeight:22,textAlign:'center'}}>This mobile app mirrors the web About screen.</Text>
    </ScrollView>
  );
}
