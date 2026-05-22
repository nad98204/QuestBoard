import { Pressable, Text, View, StyleSheet } from 'react-native';

export default function CheckRow({ label, detail, checked, onToggle, disabled }) {
  const renderedLabel =
    typeof label === 'string' ? (
      <Text style={[styles.label, checked && styles.labelDone]}>{label}</Text>
    ) : (
      label
    );

  return (
    <Pressable
      onPress={() => !disabled && onToggle()}
      style={({ pressed }) => [
        styles.row,
        checked && styles.rowDone,
        disabled && styles.rowDisabled,
        pressed && !disabled && styles.rowPressed,
      ]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <View style={styles.textCol}>
        {renderedLabel}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    marginBottom: 6,
  },
  rowDone: { opacity: 0.85 },
  rowDisabled: { opacity: 0.45 },
  rowPressed: { backgroundColor: '#252532' },
  box: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#5c5766',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12121a',
  },
  boxOn: {
    borderColor: '#d4af37',
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
  },
  tick: { color: '#d4af37', fontWeight: '900', fontSize: 14 },
  textCol: { flex: 1, minWidth: 0 },
  label: { color: '#e8e4dc', fontSize: 15, fontWeight: '600' },
  labelDone: { color: '#a89b7a' },
  detail: { color: '#7d786f', fontSize: 12, marginTop: 2 },
});
