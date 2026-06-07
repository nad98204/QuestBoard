import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
export default function VayNoTab({
  EXPENSE_IMAGES,
  formatCurrency,
  formatDateKeyLabel,
  getLoanPaidAmount,
  getLoanRemainingAmount,
  handleDeleteLoan,
  handleEditLoan,
  handleLoanAiNote,
  handleSettleLoan,
  isLoanSettled,
  loanAiBusy,
  loanAiError,
  loanAiStatus,
  loanAiText,
  setLoanAiError,
  setLoanAiStatus,
  setLoanAiText,
  sortedLoanRecords,
  styles,
}) {
  return (
    <>
      <View style={styles.loanCard}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.loanAvatar}>
            <Image
              source={EXPENSE_IMAGES.loans}
              style={styles.expenseSectionIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.aiHeaderCopy}>
            <Text style={styles.aiTitle}>Sổ vay nợ riêng</Text>
            <Text style={styles.aiSubtitle}>
              Ghi vay nợ, trả nợ, hoặc người khác giữ/cầm tiền hộ mình.
            </Text>
          </View>
        </View>
        <TextInput
          value={loanAiText}
          onChangeText={(v) => {
            setLoanAiText(v);
            setLoanAiError('');
            setLoanAiStatus('');
          }}
          placeholder="cho Nam vay 500k, vay Lan ngày xưa 1tr, người yêu giữ hộ 2tr"
          placeholderTextColor="#6f6a7d"
          style={[styles.input, styles.aiInput]}
          multiline
          editable={!loanAiBusy}
        />
        {loanAiError ? (
          <Text style={styles.errorText}>{loanAiError}</Text>
        ) : null}
        {loanAiStatus ? (
          <Text style={styles.loanStatusText}>{loanAiStatus}</Text>
        ) : null}
        <Pressable
          style={[styles.loanSubmitBtn, loanAiBusy && styles.disabledBtn]}
          onPress={handleLoanAiNote}
          disabled={loanAiBusy}
        >
          {loanAiBusy ? (
            <ActivityIndicator color="#100b16" />
          ) : (
            <Text style={styles.loanSubmitText}>AI ghi vay nợ</Text>
          )}
        </Pressable>
        <View style={styles.loanList}>
          {sortedLoanRecords.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có khoản vay nợ nào.</Text>
          ) : (
            sortedLoanRecords.map((loan) => {
              const settled = isLoanSettled(loan);
              const borrowed = loan.type === 'borrowed';
              const held = loan.type === 'held';
              const paidAmount = getLoanPaidAmount(loan);
              const remainingAmount = getLoanRemainingAmount(loan);
              const payments = Array.isArray(loan.payments)
                ? loan.payments
                : [];
              return (
                <View
                  key={loan.id}
                  style={[styles.loanRow, settled && styles.loanRowSettled]}
                >
                  <View style={styles.loanBody}>
                    <View style={styles.txTopLine}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {borrowed
                          ? `Mình vay ${loan.person}`
                          : held
                            ? `${loan.person} giữ hộ mình`
                            : `${loan.person} nợ mình`}
                      </Text>
                      <Text
                        style={[
                          styles.txAmount,
                          remainingAmount > 0
                            ? borrowed
                              ? styles.expenseText
                              : styles.incomeText
                            : styles.txSettledText,
                        ]}
                      >
                        {remainingAmount > 0
                          ? formatCurrency(remainingAmount)
                          : 'Đã xong'}
                      </Text>
                    </View>
                    <Text style={styles.txMeta} numberOfLines={1}>
                      Gốc {formatCurrency(Number(loan.amount) || 0)} · đã trả{' '}
                      {formatCurrency(paidAmount)} ·{' '}
                      {loan.dateUnknown
                        ? 'vay ngày xưa'
                        : formatDateKeyLabel(loan.date)}
                      {loan.dueDate
                        ? ` · hạn ${formatDateKeyLabel(loan.dueDate)}`
                        : ''}
                    </Text>
                    {loan.note ? (
                      <Text style={styles.txNote} numberOfLines={2}>
                        {loan.note}
                      </Text>
                    ) : null}
                    {payments.length > 0 ? (
                      <View style={styles.paymentList}>
                        {payments.map((payment, index) => (
                          <Text
                            key={payment.id ?? `${loan.id}-payment-${index}`}
                            style={styles.paymentText}
                            numberOfLines={1}
                          >
                            - Đợt {index + 1}: {formatCurrency(payment.amount)}{' '}
                            · {formatDateKeyLabel(payment.date)}
                            {payment.note ? ` · ${payment.note}` : ''}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.loanActions}>
                    <Pressable
                      style={styles.editBtn}
                      onPress={() => handleEditLoan(loan)}
                    >
                      <Text style={styles.editText}>Sửa</Text>
                    </Pressable>
                    {!settled ? (
                      <Pressable
                        style={styles.loanSettleBtn}
                        onPress={() => handleSettleLoan(loan.id)}
                      >
                        <Text style={styles.loanSettleText}>
                          {borrowed ? 'Trả hết' : held ? 'Lấy hết' : 'Thu hết'}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteLoan(loan.id)}
                      hitSlop={10}
                    >
                      <Text style={styles.deleteText}>×</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    </>
  );
}
