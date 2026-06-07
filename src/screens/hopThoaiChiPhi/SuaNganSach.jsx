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

export default function SuaNganSach({
  allCategories,
  budgetEditCategoryOpen,
  budgetEditDraft,
  budgetEditError,
  categoriesForMode,
  categoryById,
  closeBudgetEditModal,
  editingBudgetId,
  handleSaveBudgetEdit,
  setBudgetEditCategoryOpen,
  styles,
  updateBudgetEditDraft,
}) {
  return (
    <Modal
      visible={editingBudgetId != null}
      transparent
      animationType="fade"
      onRequestClose={closeBudgetEditModal}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sửa ngân sách</Text>
            <Pressable
              onPress={closeBudgetEditModal}
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
            <Text style={styles.fieldLabel}>Danh mục</Text>
            <Pressable
              style={styles.categorySummaryRow}
              onPress={() => setBudgetEditCategoryOpen((open) => !open)}
            >
              {(() => {
                const cat = categoryById(
                  budgetEditDraft.category,
                  allCategories,
                );
                return (
                  <Text
                    style={[styles.selectedCategoryText, { color: cat.color }]}
                  >
                    {cat.icon} {cat.label}
                  </Text>
                );
              })()}
              <Text style={styles.categoryToggleText}>
                {budgetEditCategoryOpen ? 'Thu gọn ▲' : 'Đổi danh mục ▼'}
              </Text>
            </Pressable>
            {budgetEditCategoryOpen ? (
              <View style={styles.optionWrap}>
                {categoriesForMode('expense', allCategories).map((cat) => {
                  const active = budgetEditDraft.category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        updateBudgetEditDraft('category', cat.id);
                        setBudgetEditCategoryOpen(false);
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

            <Text style={styles.fieldLabel}>Chu kỳ</Text>
            <View style={[styles.filterRow, { marginBottom: 12 }]}>
              {[
                { id: 'daily', label: 'Ngày' },
                { id: 'weekly', label: 'Tuần' },
                { id: 'monthly', label: 'Tháng' },
              ].map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => updateBudgetEditDraft('period', opt.id)}
                  style={[
                    styles.filterBtn,
                    budgetEditDraft.period === opt.id && styles.filterBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      budgetEditDraft.period === opt.id &&
                        styles.filterTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={budgetEditDraft.limit}
              onChangeText={(v) => updateBudgetEditDraft('limit', v)}
              placeholder="Số tiền giới hạn"
              placeholderTextColor="#6f6a7d"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={budgetEditDraft.note}
              onChangeText={(v) => updateBudgetEditDraft('note', v)}
              placeholder="Ghi chú (tuỳ chọn)"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.noteInput]}
              multiline
            />
            {budgetEditError ? (
              <Text style={styles.errorText}>{budgetEditError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={closeBudgetEditModal}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={styles.modalSaveBtn}
                onPress={handleSaveBudgetEdit}
              >
                <Text style={styles.addBtnText}>Lưu ngân sách</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
