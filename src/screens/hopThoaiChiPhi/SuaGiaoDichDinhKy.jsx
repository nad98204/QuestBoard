import { useEffect, useState } from 'react';
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

const FREQ_OPTIONS = [
  { id: 'daily', label: 'Hàng ngày' },
  { id: 'weekly', label: 'Hàng tuần' },
  { id: 'monthly', label: 'Hàng tháng' },
  { id: 'yearly', label: 'Hàng năm' },
];

function getModeFromAmount(value) {
  const source = String(value ?? '').trim();
  return source && !source.startsWith('-') ? 'income' : 'expense';
}

export default function SuaGiaoDichDinhKy({
  visible,
  draft,
  error,
  editingId,
  allCategories,
  categoryById,
  categoriesForMode,
  onClose,
  onSave,
  onUpdateDraft,
  styles,
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    if (visible) setCategoryOpen(false);
  }, [visible]);

  if (!visible) return null;

  const mode = getModeFromAmount(draft.amount);
  const modeCategories = categoriesForMode(mode, allCategories);
  const selectedCat = modeCategories.some((cat) => cat.id === draft.category)
    ? categoryById(draft.category, allCategories)
    : modeCategories[0] ?? categoryById(draft.category, allCategories);

  const handleAmountChange = (value) => {
    const nextMode = getModeFromAmount(value);
    const nextCategories = categoriesForMode(nextMode, allCategories);
    if (!nextCategories.some((cat) => cat.id === draft.category)) {
      onUpdateDraft('category', nextCategories[0]?.id ?? 'other');
    }
    onUpdateDraft('amount', value);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Sửa giao dịch định kỳ' : 'Thêm giao dịch định kỳ'}
            </Text>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.fieldLabel}>Mô tả</Text>
            <TextInput
              value={draft.description}
              onChangeText={(v) => onUpdateDraft('description', v)}
              placeholder="Ví dụ: Tiền thuê nhà, Netflix"
              placeholderTextColor="#6f6a7d"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Số tiền (âm = chi tiêu, dương = thu nhập)</Text>
            <TextInput
              value={draft.amount}
              onChangeText={handleAmountChange}
              placeholder="Ví dụ: -3000000 hoặc 15000000"
              placeholderTextColor="#6f6a7d"
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Danh mục</Text>
            <Pressable
              style={styles.categorySummaryRow}
              onPress={() => setCategoryOpen((open) => !open)}
            >
              <View style={styles.selectedCategoryPill}>
                <Text style={[styles.categoryIcon, { color: selectedCat.color }]}>
                  {selectedCat.icon}
                </Text>
                <Text style={styles.selectedCategoryText} numberOfLines={1}>
                  {selectedCat.label}
                </Text>
              </View>
              <Text style={styles.categoryToggleText}>
                {categoryOpen ? 'Thu gọn' : 'Mở danh mục'}
              </Text>
            </Pressable>
            {categoryOpen ? (
              <View style={styles.optionWrap}>
                {modeCategories.slice(0, 24).map((cat) => {
                  const active = draft.category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        onUpdateDraft('category', cat.id);
                        setCategoryOpen(false);
                      }}
                      style={[
                        styles.categoryBtn,
                        active && { borderColor: cat.color, backgroundColor: '#171923' },
                      ]}
                    >
                      <Text style={[styles.categoryIcon, { color: cat.color }]}>
                        {cat.icon}
                      </Text>
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Chu kỳ</Text>
            <View style={styles.filterRow}>
              {FREQ_OPTIONS.map((freq) => (
                <Pressable
                  key={freq.id}
                  onPress={() => onUpdateDraft('frequency', freq.id)}
                  style={[
                    styles.filterBtn,
                    draft.frequency === freq.id && styles.filterBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      draft.frequency === freq.id && styles.filterTextActive,
                    ]}
                  >
                    {freq.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Đến hạn sau (tháng)</Text>
            <TextInput
              value={draft.monthsFromNow}
              onChangeText={(v) => onUpdateDraft('monthsFromNow', v)}
              placeholder="Ví dụ: 3"
              placeholderTextColor="#6f6a7d"
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Ngày bắt đầu (YYYY-MM-DD)</Text>
            <TextInput
              value={draft.startDate}
              onChangeText={(v) => onUpdateDraft('startDate', v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6f6a7d"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Tự động tạo giao dịch</Text>
            <View style={styles.filterRow}>
              {[
                { id: true, label: 'Tự động' },
                { id: false, label: 'Chỉ nhắc nhở' },
              ].map((opt) => (
                <Pressable
                  key={String(opt.id)}
                  onPress={() => onUpdateDraft('autoCreate', opt.id)}
                  style={[
                    styles.filterBtn,
                    draft.autoCreate === opt.id && styles.filterBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      draft.autoCreate === opt.id && styles.filterTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Ghi chú</Text>
            <TextInput
              value={draft.note}
              onChangeText={(v) => onUpdateDraft('note', v)}
              placeholder="Ghi chú tùy chọn"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.noteInput]}
              multiline
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={onSave}>
                <Text style={styles.addBtnText}>
                  {editingId ? 'Lưu thay đổi' : 'Thêm'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
