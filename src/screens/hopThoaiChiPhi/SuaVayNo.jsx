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
  loanEditMode,
  removeLoanPaymentDraft,
  styles,
  updateLoanEditDraft,
  updateLoanPaymentDraft,
}) {
  const isPaymentMode = loanEditMode === 'payment';
  const paymentDrafts = Array.isArray(loanEditDraft.paymentDrafts)
    ? loanEditDraft.paymentDrafts
    : [];
  const paymentAction =
    loanEditDraft.type === 'borrowed'
      ? 'trả nợ'
      : loanEditDraft.type === 'held'
        ? 'lấy lại'
        : 'thu nợ';

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
            <Text style={styles.modalTitle}>
              {isPaymentMode ? 'Thêm đợt thu / trả nợ' : 'Sửa khoản vay nợ'}
            </Text>
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

            <View style={styles.loanPaymentSection}>
              <View style={styles.loanPaymentSectionHeader}>
                <View style={styles.loanPaymentTitleWrap}>
                  <Text style={styles.fieldLabel}>Lịch sử {paymentAction}</Text>
                  <Text style={styles.loanPaymentHint}>
                    Mỗi đợt nằm riêng để dễ sửa tiền, ngày, ghi chú hoặc xóa trước khi lưu.
                  </Text>
                </View>
                <Text style={styles.loanPaymentCount}>{paymentDrafts.length} đợt</Text>
              </View>
              {paymentDrafts.length > 0 ? (
                <View style={styles.loanPaymentCardList}>
                  {paymentDrafts.map((payment, index) => (
                    <View key={payment.id} style={styles.loanPaymentEditCard}>
                      <View style={styles.loanPaymentCardHeader}>
                        <Text style={styles.loanPaymentCardTitle}>
                          Đợt {index + 1}
                        </Text>
                        <Pressable
                          onPress={() => removeLoanPaymentDraft(payment.id)}
                          style={styles.loanPaymentDeleteBtn}
                        >
                          <Text style={styles.loanPaymentDeleteText}>Xóa</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        value={payment.amount}
                        onChangeText={(v) =>
                          updateLoanPaymentDraft(payment.id, 'amount', v)
                        }
                        placeholder={`Số tiền ${paymentAction}`}
                        placeholderTextColor="#6f6a7d"
                        keyboardType="numeric"
                        style={styles.input}
                      />
                      <TextInput
                        value={payment.date}
                        onChangeText={(v) =>
                          updateLoanPaymentDraft(payment.id, 'date', v)
                        }
                        placeholder={`Ngày ${paymentAction}: YYYY-MM-DD`}
                        placeholderTextColor="#6f6a7d"
                        style={styles.input}
                      />
                      <TextInput
                        value={payment.note}
                        onChangeText={(v) =>
                          updateLoanPaymentDraft(payment.id, 'note', v)
                        }
                        placeholder="Ghi chú đợt này"
                        placeholderTextColor="#6f6a7d"
                        style={[styles.input, styles.loanPaymentNoteInput]}
                        multiline
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.loanPaymentEmptyCard}>
                  <Text style={styles.loanPaymentEmptyText}>
                    Chưa có đợt {paymentAction} nào.
                  </Text>
                </View>
              )}
            </View>

            {isPaymentMode ? (
              <View style={styles.loanNewPaymentBox}>
                <Text style={styles.loanNewPaymentTitle}>
                  Thêm đợt {paymentAction} mới
                </Text>
                <TextInput
                  value={loanEditDraft.paymentAmount}
                  onChangeText={(v) => updateLoanEditDraft('paymentAmount', v)}
                  placeholder={`Số tiền ${paymentAction}`}
                  placeholderTextColor="#6f6a7d"
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  value={loanEditDraft.paymentDate}
                  onChangeText={(v) => updateLoanEditDraft('paymentDate', v)}
                  placeholder={`Ngày ${paymentAction}: YYYY-MM-DD`}
                  placeholderTextColor="#6f6a7d"
                  style={styles.input}
                />
                <TextInput
                  value={loanEditDraft.paymentNote}
                  onChangeText={(v) => updateLoanEditDraft('paymentNote', v)}
                  placeholder="Ghi chú đợt mới (tùy chọn)"
                  placeholderTextColor="#6f6a7d"
                  style={[styles.input, styles.noteInput]}
                  multiline
                />
              </View>
            ) : null}

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
                <Text style={styles.addBtnText}>
                  {isPaymentMode ? 'Lưu đợt thu/trả nợ' : 'Lưu khoản vay nợ'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
