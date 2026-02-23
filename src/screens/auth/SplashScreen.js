import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { COLORS } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const lineWidthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(taglineAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(lineWidthAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Pure black background */}
      <View style={StyleSheet.absoluteFill} />

      {/* Subtle orange radial glow at center */}
      <View style={styles.glowCircle} />

      {/* Logo + Brand Block */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Actual BUILD logo image */}
        <Image
          source={require('../../../assets/images/build-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        {/* Orange accent line animating in */}
        <Animated.View
          style={[
            styles.accentLine,
            {
              width: lineWidthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 140],
              }),
            },
          ]}
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineAnim }]}>
        PHYSIQUE • DISCIPLINE • LIFESTYLE
      </Animated.Text>

      {/* Bottom label */}
      <Animated.Text style={[styles.powered, { opacity: taglineAnim }]}>
        Powered by Techspirit Labs
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(255,107,0,0.05)',
    top: height * 0.5 - 250,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: width * 0.52,
    height: width * 0.52,
    marginBottom: 10,
  },
  accentLine: {
    height: 2,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
    marginTop: 4,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 4,
    marginTop: 18,
  },
  powered: {
    position: 'absolute',
    bottom: 44,
    fontSize: 11,
    color: COLORS.textDim,
    letterSpacing: 1,
  },
});
