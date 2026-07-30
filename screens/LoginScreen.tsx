import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Keyboard,
  Easing,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_BASE_URL } from '../config';
import { setAuthTokens } from '../hooks/useAuthApi';
import { clearPermissionsCache } from '../hooks/usePermissions';
import { registerForPushNotificationsAsync } from '../hooks/useNotifications';

const { height } = Dimensions.get('window');

const HEADER_FULL = height * 0.26;
const HEADER_COMPACT = height * 0.09;
const BADGE_SIZE = 76;

// ---------- Floating label underline input ----------
function FloatingInput({
  label,
  value,
  onChangeText,
  onFocus,
  onBlur,
  secureTextEntry,
  rightIcon,
  onRightIconPress,
  leftIconName,
  focused,
  inputRef,
  returnKeyType,
  onSubmitEditing,
}: any) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: focused || value ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [focused, value, anim]);

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [16, -8] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [14.5, 11] });
  const labelColor = focused ? '#8E1C1C' : '#94A3B8';

  return (
    <View style={styles.floatWrap}>
      <MaterialCommunityIcons
        name={leftIconName}
        size={18}
        color={focused ? '#8E1C1C' : '#B0B8C4'}
        style={styles.floatIcon}
      />
      <View style={styles.floatInputArea}>
        <Animated.Text
          style={[
            styles.floatLabel,
            { top: labelTop, fontSize: labelSize, color: labelColor },
          ]}
        >
          {label}
        </Animated.Text>
        <TextInput
          ref={inputRef}
          style={styles.floatInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor="#8E1C1C"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
      </View>
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name={rightIcon} size={19} color="#94A3B8" />
        </TouchableOpacity>
      )}
      <Animated.View
        style={[
          styles.floatUnderline,
          {
            backgroundColor: focused ? '#8E1C1C' : '#E2E8F0',
            height: focused ? 2 : 1,
          },
        ]}
      />
    </View>
  );
}

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const headerFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(24)).current;
  const badgeScale = useRef(new Animated.Value(0.6)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;

  const headerHeight = useRef(new Animated.Value(HEADER_FULL)).current;
  const badgeOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [headerFade, cardFade, cardTranslateY, badgeScale]);

  useEffect(() => {
    Animated.timing(messageOpacity, {
      toValue: message ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [message, messageOpacity]);

  // Shrink header + fade badge on keyboard open so inputs and button never get covered
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      Animated.parallel([
        Animated.timing(headerHeight, {
          toValue: HEADER_COMPACT,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(badgeOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.parallel([
        Animated.timing(headerHeight, {
          toValue: HEADER_FULL,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [headerHeight, badgeOpacity]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handlePressIn = () => {
    Animated.timing(btnScale, {
      toValue: 0.98,
      duration: 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(btnScale, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = async () => {
    Keyboard.dismiss();

    if (!username.trim() || !password.trim()) {
      setMessage('Please enter your username and password.');
      setMessageType('error');
      triggerShake();
      return;
    }

    setMessage('');
    setMessageType('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiMessage =
          data?.detail ||
          data?.message ||
          data?.non_field_errors?.[0] ||
          'Login failed. Please check your credentials.';
        setMessage(apiMessage);
        setMessageType('error');
        triggerShake();
        return;
      }

      setMessage('');
      setMessageType('');

      setAuthTokens(data.access, data.refresh);
      clearPermissionsCache();
      // Fire-and-forget: register this device for push notifications now that
      // the auth token is available. Won't block navigation.
      registerForPushNotificationsAsync();

      navigation.replace('MainTabs', {
        screen: 'Dashboard',
        params: {
          user: data?.user,
          accessToken: data?.access,
          refreshToken: data?.refresh,
        },
      });
    } catch (error) {
      setMessage('Unable to connect to server. Please try again.');
      setMessageType('error');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <Animated.View style={[styles.headerBackground, { height: headerHeight }]}>
          <View style={[styles.shape, styles.shapeOne]} />
          <View style={[styles.shape, styles.shapeTwo]} />

          <SafeAreaView style={styles.headerContent}>
            <Animated.View style={{ opacity: headerFade }}>
              <Text style={styles.brandMain}>SUPREME</Text>
              <Text style={styles.brandSub}>ENERGIES</Text>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
          style={styles.formArea}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardFade,
                transform: [{ translateY: cardTranslateY }, { translateX: shakeAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.badge,
                { opacity: badgeOpacity, transform: [{ scale: badgeScale }] },
              ]}
            >
              <MaterialCommunityIcons name="flash" size={30} color="#FFFFFF" />
            </Animated.View>

            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue to your dashboard</Text>

            <FloatingInput
              label="Username"
              value={username}
              onChangeText={(text: string) => {
                setUsername(text);
                if (messageType === 'error') {
                  setMessage('');
                  setMessageType('');
                }
              }}
              onFocus={() => setFocusedInput('user')}
              onBlur={() => setFocusedInput(null)}
              leftIconName="account-outline"
              focused={focusedInput === 'user'}
              inputRef={usernameRef}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <FloatingInput
              label="Password"
              value={password}
              onChangeText={(text: string) => {
                setPassword(text);
                if (messageType === 'error') {
                  setMessage('');
                  setMessageType('');
                }
              }}
              onFocus={() => setFocusedInput('pass')}
              onBlur={() => setFocusedInput(null)}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword((prev) => !prev)}
              leftIconName="lock-outline"
              focused={focusedInput === 'pass'}
              inputRef={passwordRef}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <View style={styles.messageContainer}>
              <Animated.Text
                style={[
                  styles.messageText,
                  messageType === 'error' && styles.errorText,
                  messageType === 'success' && styles.successText,
                  { opacity: messageOpacity },
                ]}
              >
                {message || ' '}
              </Animated.Text>
            </View>

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable
                style={({ pressed }) => [styles.button, pressed && { opacity: 0.95 }]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>LOGIN</Text>
                )}
              </Pressable>
            </Animated.View>

            <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.75}>
              <Text style={styles.forgotText}>Trouble logging in?</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />

            <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
              <Text style={styles.versionText}>System v2.0.4 • Secure Connection</Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8E1C1C',
  },
  headerBackground: {
    backgroundColor: '#8E1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shape: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  shapeOne: {
    width: 360,
    height: 360,
    top: -160,
    right: -110,
  },
  shapeTwo: {
    width: 200,
    height: 200,
    bottom: -90,
    left: -60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: {
    alignItems: 'center',
  },
  brandMain: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  brandSub: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 5,
    marginTop: 3,
  },

  formArea: {
    flex: 1,
  },

  // Bottom-sheet style card, rounded only on top, overlapping the header slightly via the badge.
  // No shadow here — the card runs flush to the bottom edge of the screen, so a floating
  // shadow would only create a stray seam line above the footer.
  card: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 26,
    paddingTop: BADGE_SIZE / 2 + 14,
    alignItems: 'stretch',
  },

  badge: {
    position: 'absolute',
    top: -BADGE_SIZE / 2,
    alignSelf: 'center',
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#8E1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#F9FAFB',
    shadowColor: '#8E1C1C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 10,
  },

  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#8B93A1',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 26,
  },

  // Floating label underline input
  floatWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 22,
  },
  floatIcon: {
    marginBottom: 10,
    marginRight: 10,
  },
  floatInputArea: {
    flex: 1,
    height: 40,
    justifyContent: 'flex-end',
  },
  floatLabel: {
    position: 'absolute',
    left: 0,
    fontWeight: '600',
  },
  floatInput: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    paddingBottom: 6,
    paddingTop: 0,
  },
  floatUnderline: {
    position: 'absolute',
    left: 28,
    right: 0,
    bottom: 0,
    borderRadius: 1,
  },

  messageContainer: {
    minHeight: 20,
    justifyContent: 'center',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 12.5,
    textAlign: 'center',
    fontWeight: '700',
  },
  errorText: {
    color: '#DC2626',
  },
  successText: {
    color: '#16A34A',
  },

  button: {
    backgroundColor: '#8E1C1C',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#8E1C1C',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  forgotBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotText: {
    color: '#8B93A1',
    fontSize: 13.5,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
    minHeight: 12,
  },
  footer: {
    alignItems: 'center',
  },
  versionText: {
    color: '#B7BEC9',
    fontSize: 11,
    fontWeight: '500',
  },
});