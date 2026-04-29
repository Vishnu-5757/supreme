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
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_BASE_URL } from '../config';

const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
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
  const formFade = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(18)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(formFade, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [headerFade, formFade, formTranslateY]);

  useEffect(() => {
    Animated.timing(messageOpacity, {
      toValue: message ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [message, messageOpacity]);

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

        <View style={styles.headerBackground}>
          <View style={[styles.shape, styles.shapeOne]} />
          <View style={[styles.shape, styles.shapeTwo]} />
          <View style={[styles.shape, styles.shapeThree]} />

          <SafeAreaView style={styles.headerContent}>
            <Animated.View style={[styles.brandWrap, { opacity: headerFade }]}>
              <View style={styles.logoWrapper}>
                <View style={styles.logoInner}>
                  <MaterialCommunityIcons name="flash" size={36} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.brandMain}>SUPREME</Text>
              <Text style={styles.brandSub}>ENERGIES</Text>
              <Text style={styles.heroText}>Secure access for your team</Text>
            </Animated.View>
          </SafeAreaView>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.formArea}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true}
          >
            <Animated.View
              style={[
                styles.formSection,
                {
                  opacity: formFade,
                  transform: [{ translateY: formTranslateY }, { translateX: shakeAnim }],
                },
              ]}
            >
              <View style={styles.industrialWrapper}>
                <View style={styles.accentBar} />
                <Text style={styles.title}>LOGIN</Text>
                <View style={styles.accentBar} />
              </View>

              <Text style={styles.subtitle}>
                Enter your credentials to continue to the dashboard.
              </Text>

              <View style={styles.inputBlock}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, focusedInput === 'user' && styles.labelActive]}>
                    USERNAME
                  </Text>
                  {focusedInput === 'user' && <View style={styles.pulseDot} />}
                </View>

                <Pressable
                  style={[styles.inputContainer, focusedInput === 'user' && styles.inputActive]}
                  onPress={() => usernameRef.current?.focus()}
                >
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={20}
                    color={focusedInput === 'user' ? '#8E1C1C' : '#94A3B8'}
                    style={styles.leftIcon}
                  />
                  <TextInput
                    ref={usernameRef}
                    style={styles.input}
                    placeholder="e.g. supreme"
                    placeholderTextColor="#94A3B8"
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      if (messageType === 'error') {
                        setMessage('');
                        setMessageType('');
                      }
                    }}
                    onFocus={() => setFocusedInput('user')}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    selectionColor="#8E1C1C"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </Pressable>
              </View>

              <View style={styles.inputBlock}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, focusedInput === 'pass' && styles.labelActive]}>
                    PASSWORD
                  </Text>
                  {focusedInput === 'pass' && <View style={styles.pulseDot} />}
                </View>

                <Pressable
                  style={[styles.inputContainer, focusedInput === 'pass' && styles.inputActive]}
                  onPress={() => passwordRef.current?.focus()}
                >
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={focusedInput === 'pass' ? '#8E1C1C' : '#94A3B8'}
                    style={styles.leftIcon}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (messageType === 'error') {
                        setMessage('');
                        setMessageType('');
                      }
                    }}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocusedInput('pass')}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    selectionColor="#8E1C1C"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.showBtn}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </Pressable>
              </View>

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
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        <SafeAreaView style={styles.footer}>
          <Text style={styles.versionText}>System v2.0.4 • Secure Connection</Text>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6F9',
  },
  headerBackground: {
    height: height * 0.34,
    backgroundColor: '#8E1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
  },
  shape: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shapeOne: {
    width: 430,
    height: 430,
    top: -120,
    right: -120,
  },
  shapeTwo: {
    width: 240,
    height: 240,
    bottom: -70,
    left: -60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  shapeThree: {
    width: 130,
    height: 130,
    top: 40,
    left: 35,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  brandWrap: {
    alignItems: 'center',
  },
  logoWrapper: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  brandMain: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 5,
  },
  brandSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.74)',
    letterSpacing: 6,
    marginTop: 4,
  },
  heroText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '500',
  },

  formArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 24,
  },
  formSection: {
    paddingTop: 10,
    paddingBottom: 10,
  },

  industrialWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  accentBar: {
    width: 30,
    height: 4,
    backgroundColor: '#8E1C1C',
    borderRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginHorizontal: 15,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 20,
  },

  inputBlock: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: '#8E1C1C',
  },
  pulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E1C1C',
    marginLeft: 6,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  inputActive: {
    borderColor: '#8E1C1C',
    borderWidth: 1.5,
    backgroundColor: '#FFF',
    shadowOpacity: 0.08,
    shadowRadius: 15,
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
    letterSpacing: 0.4,
  },
  showBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  messageContainer: {
    minHeight: 22,
    justifyContent: 'center',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 13,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#8E1C1C',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  forgotBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 18,
    alignItems: 'center',
  },
  versionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
});