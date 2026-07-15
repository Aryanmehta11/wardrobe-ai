import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import AddItemScreen from './src/screens/AddItemScreen';
import ClosetScreen from './src/screens/ClosetScreen';
import ItemDetailScreen from './src/screens/ItemDetailScreen';
import MatchScreen from './src/screens/MatchScreen';
import OutfitsScreen from './src/screens/OutfitsScreen';
import { theme } from './src/theme';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Closet"
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="Closet"
          component={ClosetScreen}
          options={({ navigation }) => ({
            title: 'My Closet',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Outfits')}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ color: theme.colors.accent, fontSize: 16, fontWeight: '600' }}>
                  Outfits
                </Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen name="AddItem" component={AddItemScreen} options={{ title: 'Add Item' }} />
        <Stack.Screen
          name="ItemDetail"
          component={ItemDetailScreen}
          options={{ title: 'Item' }}
        />
        <Stack.Screen name="Match" component={MatchScreen} options={{ title: 'Matches' }} />
        <Stack.Screen name="Outfits" component={OutfitsScreen} options={{ title: 'My Outfits' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
