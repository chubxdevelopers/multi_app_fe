import React from 'react';
import { View, Text } from 'react-native';

export default function Header(){
  return (
    <View style={{padding:12, backgroundColor:'#fff', borderBottomWidth:1, borderColor:'#eee'}}>
      <Text style={{fontWeight:'700'}}>My App (Mobile)</Text>
    </View>
  );
}
