import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function GhiTienVaoHu({
  closeJarContributionModal,
  contributionJarId,
  handleSaveJarContribution,
  jarContributionDraft,
  jarContributionError,
  monthLabel,
  styles,
  updateJarContributionDraft,
  visibleMonth,
}) {
  return (
    <Modal
      visible={contributionJarId != null}
      transparent
      animationType="fade"
      onRequestClose={closeJarContributionModal}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ghi tiền vào hũ</Text>
            <Pressable
              onPress={closeJarContributionModal}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              value={jarContributionDraft.amount}
              onChangeText={(v) => updateJarContributionDraft('amount', v)}
              placeholder="Số tiền đã chuyển/làm được"
              placeholderTextColor="#6f6a7d"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={jarContributionDraft.note}
              onChangeText={(v) => updateJarContributionDraft('note', v)}
              placeholder="Nội dung, ví dụ: chuyển vào tài khoản dự phòng"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.noteInput]}
              multiline
            />
            <Text style={styles.txMeta}>
              Khoản này chỉ tính tiến độ hũ trong {monthLabel(visibleMonth)},
              không tạo giao dịch chi tiêu.
            </Text>
            {jarContributionError ? (
              <Text style={styles.errorText}>{jarContributionError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={closeJarContributionModal}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={styles.modalSaveBtn}
                onPress={handleSaveJarContribution}
              >
                <Text style={styles.addBtnText}>Lưu khoản ghi</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
