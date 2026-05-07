import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function SystemMessage({
  visible,
  title,
  lines,
  color = '#facc15',
  onDone,
}) {
  const [rendered, setRendered] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);

  console.log('[SystemMessage] render', {
    visible,
    rendered,
    title,
    lines,
    color,
  });

  useEffect(() => {
    console.log('[SystemMessage] visible effect', { visible, title });
    if (!visible) {
      doneRef.current = false;
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(() => setRendered(false));
      return undefined;
    }

    setRendered(true);
    doneRef.current = false;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => finish(), 3000);
    return () => clearTimeout(timer);
  }, [visible, title, opacity]);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      setRendered(false);
      onDone?.();
    });
  }

  if (!rendered) return null;

  return (
    <Modal transparent visible={rendered} animationType="none">
      <Animated.View style={[styles.overlay, { opacity }]}>
        <View style={[styles.window, { borderColor: color }]}>
          <Text style={[styles.system, { color }]}>[ SYSTEM ]</Text>
          <View style={[styles.divider, { backgroundColor: color }]} />
          <Text style={styles.title}>{title}</Text>
          {(Array.isArray(lines) ? lines : []).map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.line}>
              {line}
            </Text>
          ))}
          <Pressable
            onPress={finish}
            style={[styles.confirm, { borderColor: color }]}
          >
            <Text style={[styles.confirmText, { color }]}>XÁC NHẬN</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  window: {
    width: '80%',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderRadius: 4,
    padding: 20,
  },
  system: {
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    opacity: 0.5,
    marginTop: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  line: {
    color: '#d1d5db',
    fontSize: 13,
    marginTop: 4,
  },
  confirm: {
    borderWidth: 1,
    padding: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '800',
  },
});
