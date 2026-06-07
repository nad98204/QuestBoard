import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function XacNhanDanhMucAi({
  allCategories,
  categoriesForMode,
  categoryById,
  closeAiCategoryConfirm,
  expandedAiCategoryIndex,
  formatSignedAmount,
  handleConfirmAiCategories,
  pendingAiTransactions,
  setExpandedAiCategoryIndex,
  styles,
  updatePendingAiCategory,
}) {
  return (
    <Modal
      visible={pendingAiTransactions.length > 0}
      transparent
      animationType="fade"
      onRequestClose={closeAiCategoryConfirm}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.aiConfirmTitleWrap}>
              <Text style={styles.modalTitle}>Xác nhận danh mục AI</Text>
              <Text style={styles.aiConfirmSubtitle}>
                Chọn đúng danh mục để AI học cho lần sau.
              </Text>
            </View>
            <Pressable
              onPress={closeAiCategoryConfirm}
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
            {pendingAiTransactions.map((tx, index) => {
              const selected = categoryById(tx.category, allCategories);
              const mode = Number(tx.amount) >= 0 ? 'income' : 'expense';
              const allowedCategories = categoriesForMode(mode, allCategories);
              const suggestedIds = Array.from(
                new Set([tx.category, ...(tx.candidateCategoryIds ?? [])]),
              ).slice(0, 3);
              const shownCategories =
                expandedAiCategoryIndex === index
                  ? allowedCategories
                  : suggestedIds.map((id) => categoryById(id, allCategories));
              return (
                <View key={tx.id} style={styles.aiConfirmRow}>
                  <View style={styles.txTopLine}>
                    <Text style={styles.txTitle} numberOfLines={2}>
                      {tx.description}
                    </Text>
                    <Text
                      style={[
                        styles.txAmount,
                        Number(tx.amount) >= 0
                          ? styles.incomeText
                          : styles.expenseText,
                      ]}
                    >
                      {formatSignedAmount(Number(tx.amount) || 0)}
                    </Text>
                  </View>
                  <Text style={styles.aiConfirmMeta}>
                    AI chọn: {selected.label} · chắc chắn{' '}
                    {Math.round((Number(tx.aiConfidence) || 0) * 100)}%
                  </Text>
                  <View style={styles.optionWrap}>
                    {shownCategories.map((cat) => {
                      const active = cat.id === tx.category;
                      return (
                        <Pressable
                          key={cat.id}
                          onPress={() => updatePendingAiCategory(index, cat.id)}
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
                  <Pressable
                    style={styles.aiShowAllBtn}
                    onPress={() =>
                      setExpandedAiCategoryIndex((current) =>
                        current === index ? null : index,
                      )
                    }
                  >
                    <Text style={styles.aiShowAllText}>
                      {expandedAiCategoryIndex === index
                        ? 'Thu gọn danh mục'
                        : 'Mở tất cả danh mục'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={closeAiCategoryConfirm}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={styles.modalSaveBtn}
                onPress={handleConfirmAiCategories}
              >
                <Text style={styles.addBtnText}>Xác nhận và lưu</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
