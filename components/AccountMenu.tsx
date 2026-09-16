// components/AccountMenu.tsx
// Shared premium "account" dropdown (WhatsApp/Telegram style) — Profile,
// Logout — anchored under whatever avatar button triggers it. Change
// Password lives inside the Profile screen, not duplicated here.
// Self-contained: reads the cached user, measures its own trigger position,
// and owns the logout flow, so any screen can drop in <AccountMenu navigation={navigation} /> .

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE_URL } from '../config';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
} from '../hooks/useAuthApi';
import { userCache } from '../hooks/userCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const THEME = {
  primary: '#8E1C1C',
  text: '#14151A',
  textSecondary: '#4B4D57',
  muted: '#787C89',
  borderLight: '#F4F5F8',
  dangerLight: '#FDECEC',
  danger: '#DF4448',
};

function MenuAction({
  icon,
  label,
  onPress,
  danger,
  loading = false,
}: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.menuAction,
        pressed && !loading && styles.menuActionPressed,
        loading && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={THEME.danger}
          style={{ width: 22 }}
        />
      ) : (
        <MaterialCommunityIcons
          name={icon}
          size={19}
          color={danger ? THEME.danger : THEME.textSecondary}
          style={{ width: 22 }}
        />
      )}

      <Text
        style={[
          styles.menuActionText,
          danger && { color: THEME.danger },
        ]}
      >
        {loading ? 'Logging out...' : label}
      </Text>
    </Pressable>
  );
}

export function AccountMenu({ navigation }: { navigation: any }) {
  const triggerRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [anchor, setAnchor] = useState({ top: 60, right: 16 });

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const menuAnim = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    triggerRef.current?.measureInWindow(
      (x: number, y: number, w: number, h: number) => {
        // `measureInWindow` on these screens comes back short by roughly the
        // status-bar/safe-area height (the modal itself renders full-bleed via
        // statusBarTranslucent), so compensate with the safe-area top inset —
        // the same correction Dashboard's own menu already applies.
        setAnchor({
          top: y + h + 6 + insets.top,
          right: Math.max(12, SCREEN_WIDTH - (x + w)),
        });
        setMenuOpen(true);
      },
    );
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (menuOpen) {
      setMenuVisible(true);

      Animated.spring(menuAnim, {
        toValue: 1,
        friction: 10,
        tension: 90,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    }
  }, [menuOpen, menuAnim]);

  const menuOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuScale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const menuTranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  const performLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch(`${API_BASE_URL}/api/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          refresh: getRefreshToken() ?? '',
        }),
      });
    } catch (err) {
      console.warn('Logout request failed, proceeding locally:', err);
    } finally {
      clearAuthTokens();
      userCache.current = null;

      setLoggingOut(false);
      closeMenu();

      navigation.replace('Login');
    }
  };

  const user = userCache.current;

  const activeUsername = user?.username ?? 'Admin';
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ''}`.trim()
    : activeUsername;

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((word: string) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={styles.trigger}
        activeOpacity={0.85}
        onPress={openMenu}
      >
        <Text style={styles.triggerText}>{initials}</Text>
      </TouchableOpacity>

      {menuVisible && (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={closeMenu}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeMenu}
          >
            <Animated.View
              pointerEvents="none"
              style={[styles.backdrop, { opacity: menuOpacity }]}
            />
          </Pressable>

          <Animated.View
            style={[
              styles.menu,
              {
                top: anchor.top,
                right: anchor.right,
                opacity: menuOpacity,
                transform: [
                  { translateY: menuTranslateY },
                  { scale: menuScale },
                ],
              },
            ]}
          >
            <View pointerEvents="none" style={styles.caret} />

            {user && (
              <>
                <View style={styles.menuUserRow}>
                  <View style={styles.menuUserAvatar}>
                    <Text style={styles.menuUserAvatarText}>
                      {initials}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuUserName} numberOfLines={1}>
                      {displayName}
                    </Text>

                    <Text style={styles.menuUserEmail} numberOfLines={1}>
                      {user.email || activeUsername}
                    </Text>
                  </View>
                </View>

                <View style={styles.menuDivider} />
              </>
            )}

            <MenuAction
              icon="account-outline"
              label="Profile"
              onPress={() => {
                closeMenu();
                navigation.navigate('Profile', { user });
              }}
            />

            <View style={styles.menuDivider} />

            <MenuAction
              icon="logout-variant"
              label="Logout"
              danger
              loading={loggingOut}
              onPress={() => {
                closeMenu();
                setLogoutConfirmVisible(true);
              }}
            />
          </Animated.View>
        </Modal>
      )}

      <Modal
        visible={logoutConfirmVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modalIconWrap,
                { backgroundColor: THEME.dangerLight },
              ]}
            >
              <MaterialCommunityIcons
                name="logout"
                size={34}
                color={THEME.danger}
              />
            </View>

            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout?
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setLogoutConfirmVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  setLogoutConfirmVisible(false);
                  performLogout();
                }}
              >
                <Text style={styles.modalButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },

  triggerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,8,8,0.35)',
  },

  menu: {
    position: 'absolute',
    width: 236,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 8,
    zIndex: 101,
    elevation: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },

  caret: {
    position: 'absolute',
    top: -6,
    right: 11, // centers the caret under the 34px trigger button (17 - half of 12)
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },

  menuUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  menuUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: THEME.primary,
  },

  menuUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  menuUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },

  menuUserEmail: {
    fontSize: 10,
    color: THEME.muted,
    marginTop: 2,
  },

  menuDivider: {
    height: 1,
    backgroundColor: THEME.borderLight,
    marginVertical: 4,
  },

  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },

  menuActionPressed: {
    backgroundColor: THEME.borderLight,
  },

  menuActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
    marginLeft: 10,
  },

  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },

  modalIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginTop: 12,
    marginBottom: 6,
  },

  modalMessage: {
    fontSize: 13,
    color: THEME.muted,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 18,
  },

  modalButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },

  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },

  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
    flex: 1,
  },

  modalButtonConfirm: {
    backgroundColor: THEME.danger,
    flex: 1,
  },

  modalButtonCancelText: {
    color: THEME.text,
    fontWeight: '700',
    fontSize: 14,
  },
});
