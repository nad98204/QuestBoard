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

export default function SuaGiaoDich({
  closeEditModal,
  editCategories,
  editCategoryOpen,
  editDraft,
  editError,
  editMode,
  editTitle,
  FILTERS,
  handleEditModeChange,
  handleSaveEdit,
  isEditing,
  selectedEditCategory,
  setEditCategoryOpen,
  styles,
  updateEditDraft,
}) {
  return (
    <Modal
      visible={isEditing}
      transparent
      animationType="fade"
      onRequestClose={closeEditModal}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editTitle}</Text>
            <Pressable onPress={closeEditModal} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.filterRow}>
              {FILTERS.filter((item) => item.id !== 'all').map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleEditModeChange(item.id)}
                  style={[
                    styles.filterBtn,
                    editMode === item.id && styles.filterBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      editMode === item.id && styles.filterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={editDraft.description}
              onChangeText={(v) => updateEditDraft('description', v)}
              placeholder="Tên/mô tả giao dịch"
              placeholderTextColor="#6f6a7d"
              style={styles.input}
            />
            <TextInput
              value={editDraft.amount}
              onChangeText={(v) => updateEditDraft('amount', v)}
              placeholder="Số tiền"
              placeholderTextColor="#6f6a7d"
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Danh mục</Text>
            <Pressable
              style={styles.categorySummaryRow}
              onPress={() => setEditCategoryOpen((open) => !open)}
            >
              <View style={styles.selectedCategoryPill}>
                <Text
                  style={[
                    styles.categoryIcon,
                    { color: selectedEditCategory.color },
                  ]}
                >
                  {selectedEditCategory.icon}
                </Text>
                <Text style={styles.selectedCategoryText}>
                  {selectedEditCategory.label}
                </Text>
              </View>
              <Text style={styles.categoryToggleText}>
                {editCategoryOpen ? 'Thu gọn' : 'Mở danh mục'}
              </Text>
            </Pressable>
            {editCategoryOpen ? (
              <View style={styles.optionWrap}>
                {editCategories.map((cat) => {
                  const active = editDraft.category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        updateEditDraft('category', cat.id);
                        setEditCategoryOpen(false);
                      }}
                      style={[
                        styles.categoryBtn,
                        active && {
                          borderColor: cat.color,
                          backgroundColor: '#171923',
                        },
                      ]}
                    >
                      <Text style={[styles.categoryIcon, { color: cat.color }]}>
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

            <View style={styles.dateRow}>
              <TextInput
                value={editDraft.date}
                onChangeText={(v) => updateEditDraft('date', v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6f6a7d"
                style={[styles.input, styles.dateInput]}
              />
              <TextInput
                value={editDraft.time}
                onChangeText={(v) => updateEditDraft('time', v)}
                placeholder="HH:mm"
                placeholderTextColor="#6f6a7d"
                style={[styles.input, styles.timeInput]}
              />
            </View>

            <TextInput
              value={editDraft.note}
              onChangeText={(v) => updateEditDraft('note', v)}
              placeholder="Ghi chú tùy chọn"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.noteInput]}
              multiline
            />

            {editError ? (
              <Text style={styles.errorText}>{editError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={closeEditModal}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalSaveBtn,
                  editMode === 'expense' && styles.addExpenseBtn,
                ]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.addBtnText}>Lưu</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
