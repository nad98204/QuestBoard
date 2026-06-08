import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

export default function LichSuHuTien({
  jar,
  formatCurrency,
  formatDateKeyLabel,
  styles,
  visible,
  onClose,
}) {
  if (!jar) return null;

  const contributions = Array.isArray(jar.contributions)
    ? [...jar.contributions].sort(
        (a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)
      )
    : [];

  const total = contributions.reduce(
    (sum, e) => sum + Math.abs(Number(e.amount) || 0),
    0
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { maxHeight: '82%' }]} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🪣 {jar.label}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.txMeta}>
            Tổng đã chuyển: {formatCurrency(total)} · {contributions.length} lần
          </Text>

          <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false}>
            {contributions.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có lần ghi tiền nào.</Text>
            ) : (
              contributions.map((entry, index) => (
                <View key={entry.id ?? index} style={styles.jarHistoryRow}>
                  <View style={styles.jarHistoryCopy}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {entry.note || 'Ghi tiền'}
                    </Text>
                    <Text style={styles.txMeta}>
                      {formatDateKeyLabel(entry.date)}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, styles.incomeText]}>
                    {formatCurrency(Math.abs(Number(entry.amount) || 0))}
                  </Text>
                </View>
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
