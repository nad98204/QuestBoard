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

export default function SuaHuTien({
  allCategories,
  categoriesForMode,
  closeJarEditModal,
  editingJarId,
  handleSaveJarEdit,
  jarCategoryOpen,
  jarEditDraft,
  jarEditError,
  setJarCategoryOpen,
  styles,
  toggleJarCategory,
  updateJarEditDraft,
}) {
  return (
    <Modal
      visible={editingJarId != null}
      transparent
      animationType="fade"
      onRequestClose={closeJarEditModal}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sửa hũ tiền</Text>
            <Pressable onPress={closeJarEditModal} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              value={jarEditDraft.label}
              onChangeText={(v) => updateJarEditDraft('label', v)}
              placeholder="Tên hũ"
              placeholderTextColor="#6f6a7d"
              style={styles.input}
            />
            <TextInput
              value={jarEditDraft.percent}
              onChangeText={(v) => updateJarEditDraft('percent', v)}
              placeholder="% thu nhập"
              placeholderTextColor="#6f6a7d"
              keyboardType="numeric"
              style={styles.input}
            />
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => updateJarEditDraft('trackingMode', 'categories')}
                style={[
                  styles.filterBtn,
                  jarEditDraft.trackingMode === 'categories' &&
                    styles.filterBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    jarEditDraft.trackingMode === 'categories' &&
                      styles.filterTextActive,
                  ]}
                >
                  Tự tính theo danh mục
                </Text>
              </Pressable>
              <Pressable
                onPress={() => updateJarEditDraft('trackingMode', 'manual')}
                style={[
                  styles.filterBtn,
                  jarEditDraft.trackingMode === 'manual' &&
                    styles.filterBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    jarEditDraft.trackingMode === 'manual' &&
                      styles.filterTextActive,
                  ]}
                >
                  Ghi thủ công
                </Text>
              </Pressable>
            </View>
            {jarEditDraft.trackingMode === 'categories' ? (
              <>
                <Pressable
                  style={styles.categorySummaryRow}
                  onPress={() => setJarCategoryOpen((open) => !open)}
                >
                  <Text style={styles.selectedCategoryText}>
                    Đã chọn {jarEditDraft.categoryIds.length} danh mục
                  </Text>
                  <Text style={styles.categoryToggleText}>
                    {jarCategoryOpen ? 'Thu gọn' : 'Mở danh mục'}
                  </Text>
                </Pressable>
                {jarCategoryOpen ? (
                  <View style={styles.optionWrap}>
                    {categoriesForMode('expense', allCategories).map((cat) => {
                      const active = jarEditDraft.categoryIds.includes(cat.id);
                      return (
                        <Pressable
                          key={cat.id}
                          onPress={() => toggleJarCategory(cat.id)}
                          style={[
                            styles.categoryBtn,
                            active && {
                              borderColor: cat.color,
                              backgroundColor: '#171923',
                            },
                          ]}
                        >
                          <Text
                            style={[styles.categoryIcon, { color: cat.color }]}
                          >
                            {cat.icon}
                          </Text>
                          <Text
                            style={[
                              styles.optionText,
                              active && styles.optionTextActive,
                            ]}
                          >
                            {cat.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.txMeta}>
                Hũ này sẽ tính bằng các khoản bạn bấm Ghi tiền trong từng tháng.
              </Text>
            )}
            <TextInput
              value={jarEditDraft.note}
              onChangeText={(v) => updateJarEditDraft('note', v)}
              placeholder="Ghi chú hũ"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.noteInput]}
              multiline
            />
            {jarEditError ? (
              <Text style={styles.errorText}>{jarEditError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={closeJarEditModal}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={styles.modalSaveBtn}
                onPress={handleSaveJarEdit}
              >
                <Text style={styles.addBtnText}>Lưu hũ</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
