import { View, Text, StyleSheet } from 'react-native';

export default function BarMeter({
  label,
  value,
  max,
  color,
  trackColor,
  rightLabel,
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.right}>
          {rightLabel ?? `${Math.round(value)}/${Math.round(max)}`}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: { color: '#c8c4bc', fontSize: 12, fontWeight: '600' },
  right: { color: '#9a958c', fontSize: 12 },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
