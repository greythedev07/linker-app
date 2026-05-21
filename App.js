import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabase';
import { AuthGateway } from './src/screens/AuthGateway';
import { LinkPartner } from './src/screens/LinkPartner';
import { ChatTimeline } from './src/screens/ChatTimeline';
import { GateService } from './src/auth/gate';

/**
 * LINKER MASTER NAVIGATION ROUTER
 * Sequential state-machine handling authentication and relationship locking.
 */

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLinked, setIsLinked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial local session
    GateService.getSession().then((user) => {
      if (user) {
        setCurrentUser(user);
        checkLinkingStatus(user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const checkLinkingStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', userId)
        .single();

      if (data?.linked_partner_id) {
        setIsLinked(true);
      } else {
        setIsLinked(false);
      }
    } catch (err) {
      console.error('Error checking link status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setLoading(true);
    checkLinkingStatus(user.id);
  };

  const handleSignOut = async () => {
    await GateService.signOut();
    setCurrentUser(null);
    setIsLinked(false);
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  // ROUTE A: Unauthenticated
  if (!currentUser) {
    return (
      <SafeAreaProvider>
        <AuthGateway onAuthSuccess={handleAuthSuccess} />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  // ROUTE B: Authenticated + Unlinked
  if (currentUser && !isLinked) {
    return (
      <SafeAreaProvider>
        <LinkPartner 
          user={currentUser} 
          onLinkSuccess={() => setIsLinked(true)} 
          onSignOut={handleSignOut}
        />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  // ROUTE C: Authenticated + Linked (Direct Portal)
  return (
    <SafeAreaProvider>
      <ChatTimeline 
        user={currentUser} 
        onSignOut={handleSignOut}
        onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
      />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
