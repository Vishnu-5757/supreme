// components/SuccessModal.tsx
// Small shared "success" confirmation dialog — used after actions like
// changing a password or username, where a silent navigation.goBack()
// leaves the user unsure whether anything actually happened.

import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonLabel?: string;
}

export function SuccessModal({ visible, title, message, onClose, buttonLabel = 'Done' }: SuccessModalProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }).start();
    }
  }, [visible, anim]);

  if (!visible) return null;

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="check-bold" size={32} color="#059669" />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(10,18,36,0.55)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  card: {
    width: '100%', maxWidth: 320, backgroundColor: '#FFFFFF', borderRadius: 24,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 22,
    elevation: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6, textAlign: 'center' },
  message: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  btn: { width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
