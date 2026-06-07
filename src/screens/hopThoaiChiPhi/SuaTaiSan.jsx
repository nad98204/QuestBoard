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

export default function SuaTaiSan({
  assetEditDraft,
  assetEditError,
  closeAssetEditModal,
  editingAssetId,
  handleSaveAssetEdit,
  styles,
  updateAssetEditDraft,
}) {
  return (
    <Modal
      visible={editingAssetId != null}
      transparent
      animationType="fade"
      onRequestClose={closeAssetEditModal}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sửa tài sản ngoài app</Text>
            <Pressable
              onPress={closeAssetEditModal}
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
              value={assetEditDraft.label}
              onChangeText={(v) => updateAssetEditDraft('label', v)}
              placeholder="Tên tài sản, ví dụ: Đầu tư coin"
              placeholderTextColor="#6f6a7d"
              style={styles.input}
            />
            <TextInput
              value={assetEditDraft.amount}
              onChangeText={(v) => updateAssetEditDraft('amount', v)}
              placeholder="Giá trị tài sản"
              placeholderTextColor="#6f6a7d"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={assetEditDraft.location}
              onChangeText={(v) => updateAssetEditDraft('location', v)}
              placeholder="Nơi lưu, ví dụ: Binance, Vietcombank, két sắt"
              placeholderTextColor="#6f6a7d"
              style={styles.input}
            />
            <TextInput
              value={assetEditDraft.note}
              onChangeText={(v) => updateAssetEditDraft('note', v)}
              placeholder="Chi tiết / ghi chú, ví dụ: BTC và ETH"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.noteInput]}
              multiline
            />
            {assetEditError ? (
              <Text style={styles.errorText}>{assetEditError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={closeAssetEditModal}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={styles.modalSaveBtn}
                onPress={handleSaveAssetEdit}
              >
                <Text style={styles.addBtnText}>Lưu tài sản</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
