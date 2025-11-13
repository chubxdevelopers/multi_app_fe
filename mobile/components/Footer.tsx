import React from 'react';
import { View, Text } from 'react-native';

export default function Footer(){
  return (
    <View style={{padding:12, borderTopWidth:1, borderColor:'#eee'}}>
      <Text>© {new Date().getFullYear()} My Company</Text>
    </View>
  );
}
