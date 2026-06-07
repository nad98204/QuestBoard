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

export default function SuaVayNo({
  closeLoanEditModal,
  editingLoanId,
  handleSaveLoanEdit,
  LOAN_TYPES,
  loanEditDraft,
  loanEditError,
  styles,
  updateLoanEditDraft,
}) {
  return (
    <Modal
      visible={editingLoanId != null}
      transparent
      animationType="fade"
      onRequestClose={closeLoanEditModal}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sửa khoản vay nợ</Text>
            <Pressable
              onPress={closeLoanEditModal}
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
            <Text style={styles.fieldLabel}>Loại khoản</Text>
            <View style={styles.optionWrap}>
              {LOAN_TYPES.map((item) => {
                const active = loanEditDraft.type === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => updateLoanEditDraft('type', item.id)}
                    style={[
                      styles.categoryBtn,
                      active && styles.loanTypeBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        active && styles.optionTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={loanEditDraft.person}
              onChangeText={(v) => updateLoanEditDraft('person', v)}
              placeholder="Tên người liên quan"
              placeholderTextColor="#6f6a7d"
              style={styles.input}
            />
            <TextInput
              value={loanEditDraft.amount}
              onChangeText={(v) => updateLoanEditDraft('amount', v)}
              placeholder="Số tiền gốc"
              placeholderTextColor="#6f6a7d"
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.filterRow}>
              <Pressable
                onPress={() => updateLoanEditDraft('dateUnknown', false)}
                style={[
                  styles.filterBtn,
                  !loanEditDraft.dateUnknown && styles.filterBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    !loanEditDraft.dateUnknown && styles.filterTextActive,
                  ]}
                >
                  Có ngày cụ thể
                </Text>
              </Pressable>
              <Pressable
                onPress={() => updateLoanEditDraft('dateUnknown', true)}
                style={[
                  styles.filterBtn,
                  loanEditDraft.dateUnknown && styles.filterBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    loanEditDraft.dateUnknown && styles.filterTextActive,
                  ]}
                >
                  Vay ngày xưa
                </Text>
              </Pressable>
            </View>

            <View style={styles.dateRow}>
              <TextInput
                value={loanEditDraft.date}
                onChangeText={(v) => updateLoanEditDraft('date', v)}
                placeholder="Ngày vay: YYYY-MM-DD"
                placeholderTextColor="#6f6a7d"
                editable={!loanEditDraft.dateUnknown}
                style={[
                  styles.input,
                  styles.dateInput,
                  loanEditDraft.dateUnknown && styles.disabledInput,
                ]}
              />
              <TextInput
                value={loanEditDraft.dueDate}
                onChangeText={(v) => updateLoanEditDraft('dueDate', v)}
                placeholder="Hạn trả (tùy chọn)"
                placeholderTextColor="#6f6a7d"
                style={[styles.input, styles.dateInput]}
              />
            </View>

            <TextInput
              value={loanEditDraft.note}
              onChangeText={(v) => updateLoanEditDraft('note', v)}
              placeholder="Nội dung / ghi chú"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.noteInput]}
              multiline
            />

            {loanEditError ? (
              <Text style={styles.errorText}>{loanEditError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={closeLoanEditModal}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={styles.modalSaveBtn}
                onPress={handleSaveLoanEdit}
              >
                <Text style={styles.addBtnText}>Lưu khoản vay nợ</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
