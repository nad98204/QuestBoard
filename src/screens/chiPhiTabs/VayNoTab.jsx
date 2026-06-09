import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';

export default function VayNoTab({
  EXPENSE_IMAGES,
  formatCurrency,
  formatDateKeyLabel,
  formatSignedAmount,
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
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeMenuLoan, setActiveMenuLoan] = useState(null);

  // Compute stats on the fly
  const computedTotals = sortedLoanRecords.reduce(
    (acc, loan) => {
      const rem = getLoanRemainingAmount(loan);
      if (rem <= 0) return acc;
      if (loan.type === 'borrowed') acc.borrowed += rem;
      else if (loan.type === 'held') acc.held += rem;
      else acc.lent += rem;
      return acc;
    },
    { lent: 0, held: 0, borrowed: 0 }
  );

  const noGiuhominh = computedTotals.lent + computedTotals.held;
  const minhDangNo = computedTotals.borrowed;
  const balanceRong = noGiuhominh - minhDangNo;

  const filteredLoans = sortedLoanRecords.filter((loan) => {
    const settled = isLoanSettled(loan);
    if (activeFilter === 'done') return settled;
    if (settled && activeFilter !== 'all') return false; // don't show completed loans in pending tabs
    if (activeFilter === 'lent') return loan.type === 'lent';
    if (activeFilter === 'borrowed') return loan.type === 'borrowed';
    if (activeFilter === 'held') return loan.type === 'held';
    return true;
  });

  const getAvatarChar = (loan) => {
    if (loan.type === 'held') return '💑';
    if (loan.type === 'lent') return '🧑';
    return '👩';
  };

  const getAvatarBg = (loan) => {
    if (isLoanSettled(loan)) return '#2d3748';
    if (loan.type === 'held') return '#1e3a5f';
    if (loan.type === 'lent') return '#064e3b';
    return '#7f1d1d';
  };

  const getLoanStatusBadge = (loan) => {
    if (isLoanSettled(loan)) {
      return (
        <View style={[localStyles.badge, { backgroundColor: '#2d3748' }]}>
          <Text style={[localStyles.badgeText, { color: '#a0aec0' }]}>Đã xong</Text>
        </View>
      );
    }
    if (loan.type === 'held') {
      return (
        <View style={[localStyles.badge, { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.3)' }]}>
          <Text style={[localStyles.badgeText, { color: '#34D399' }]}>Tài sản đang giữ hộ</Text>
        </View>
      );
    }

    // Check if near due date or overdue
    if (loan.dueDate) {
      const today = new Date();
      const due = new Date(loan.dueDate);
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return (
          <View style={[localStyles.badge, { backgroundColor: 'rgba(251, 113, 133, 0.15)', borderColor: 'rgba(251, 113, 133, 0.3)' }]}>
            <Text style={[localStyles.badgeText, { color: '#FB7185' }]}>⚠️ Quá hạn</Text>
          </View>
        );
      } else if (diffDays <= 7) {
        return (
          <View style={[localStyles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
            <Text style={[localStyles.badgeText, { color: '#F59E0B' }]}>⏳ Sắp đến hạn</Text>
          </View>
        );
      }
    }

    return (
      <View style={[localStyles.badge, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.25)' }]}>
        <Text style={[localStyles.badgeText, { color: '#A8A0C2' }]}>
          {loan.type === 'borrowed' ? 'Mình đang nợ' : 'Họ nợ mình'}
        </Text>
      </View>
    );
  };

  const handleMenuEdit = () => {
    if (!activeMenuLoan) return;
    const loan = activeMenuLoan;
    setActiveMenuLoan(null);
    handleEditLoan(loan);
  };

  const handleMenuAddPayment = () => {
    if (!activeMenuLoan) return;
    const loan = activeMenuLoan;
    setActiveMenuLoan(null);
    handleEditLoan(loan, 'payment');
  };

  const handleMenuDelete = () => {
    if (!activeMenuLoan) return;
    const loanId = activeMenuLoan.id;
    setActiveMenuLoan(null);
    handleDeleteLoan(loanId);
  };

  return (
    <View style={localStyles.tabContainer}>
      {/* Sổ vay nợ Hero Card */}
      <ImageBackgroundWrapper image={EXPENSE_IMAGES.header}>
        <View style={localStyles.heroCard}>
          <View style={localStyles.heroCardHeader}>
            <View style={localStyles.heroIconContainer}>
              <Image
                source={EXPENSE_IMAGES.loans}
                style={localStyles.heroIcon}
                resizeMode="contain"
              />
            </View>
            <View style={localStyles.heroTitleCol}>
              <Text style={localStyles.heroTitle}>Sổ vay nợ</Text>
              <Text style={localStyles.heroSubtitle}>
                Ghi nhớ các khoản vay, nợ, trả nợ và tiền người khác giữ hộ.
              </Text>
            </View>
          </View>

          <View style={localStyles.heroStatsGrid}>
            <View style={localStyles.heroStatCol}>
              <Text style={localStyles.heroStatLabel}>Nợ / giữ hộ mình</Text>
              <Text style={[localStyles.heroStatVal, localStyles.incomeText]}>
                +{formatCurrency(noGiuhominh)}
              </Text>
            </View>
            <View style={localStyles.heroStatDivider} />
            <View style={localStyles.heroStatCol}>
              <Text style={localStyles.heroStatLabel}>Mình đang nợ</Text>
              <Text style={[localStyles.heroStatVal, localStyles.expenseText]}>
                -{formatCurrency(minhDangNo)}
              </Text>
            </View>
          </View>

          <View style={localStyles.heroDivider} />
          
          <View style={localStyles.heroBalanceRow}>
            <Text style={localStyles.heroBalanceLabel}>Cân bằng ròng</Text>
            <Text style={[localStyles.heroBalanceVal, balanceRong >= 0 ? localStyles.incomeText : localStyles.expenseText]}>
              {formatSignedAmount(balanceRong)}
            </Text>
          </View>
        </View>
      </ImageBackgroundWrapper>

      {/* AI Quick Input Card */}
      <View style={localStyles.aiCard}>
        <View style={localStyles.aiHeaderRow}>
          <View style={localStyles.aiTitleCol}>
            <Text style={localStyles.aiTitle}>Sổ vay nợ riêng</Text>
            <Text style={localStyles.aiSubtitle}>
              Ghi vay nợ, trả nợ, hoặc người khác giữ/cầm tiền hộ mình.
            </Text>
          </View>
          <Image
            source={EXPENSE_IMAGES.jars}
            style={localStyles.aiIllustration}
            resizeMode="contain"
          />
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
          style={localStyles.aiInput}
          multiline
          editable={!loanAiBusy}
        />
        {loanAiError ? <Text style={localStyles.errorText}>{loanAiError}</Text> : null}
        {loanAiStatus ? <Text style={localStyles.statusText}>{loanAiStatus}</Text> : null}
        <Pressable
          style={[localStyles.aiSubmitBtn, loanAiBusy && localStyles.disabledBtn]}
          onPress={handleLoanAiNote}
          disabled={loanAiBusy}
        >
          {loanAiBusy ? (
            <ActivityIndicator color="#0E0B1F" />
          ) : (
            <Text style={localStyles.aiSubmitText}>✨ AI ghi vay nợ</Text>
          )}
        </Pressable>
      </View>

      {/* Filter Chips */}
      <View style={localStyles.filterRow}>
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'lent', label: 'Họ nợ mình' },
          { id: 'borrowed', label: 'Mình nợ' },
          { id: 'held', label: 'Giữ hộ' },
          { id: 'done', label: 'Đã xong' },
        ].map((item) => {
          const active = activeFilter === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setActiveFilter(item.id)}
              style={[
                localStyles.filterBtn,
                active && localStyles.filterBtnActive,
              ]}
            >
              <Text
                style={[
                  localStyles.filterText,
                  active && localStyles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Section Title */}
      <View style={localStyles.sectionHeader}>
        <Text style={localStyles.sectionHeaderIcon}>📜</Text>
        <Text style={localStyles.sectionHeaderTitle}>Danh sách vay nợ</Text>
      </View>

      {/* Debt Cards List */}
      {filteredLoans.length === 0 ? (
        <View style={localStyles.emptyCard}>
          <Text style={localStyles.emptyText}>Chưa có khoản vay nợ nào.</Text>
          <Text style={localStyles.emptySubtext}>
            Ghi khoản vay, cho vay hoặc tiền người khác giữ hộ để theo dõi rõ ràng hơn.
          </Text>
        </View>
      ) : (
        filteredLoans.map((loan) => {
          const settled = isLoanSettled(loan);
          const borrowed = loan.type === 'borrowed';
          const held = loan.type === 'held';
          const paidAmount = getLoanPaidAmount(loan);
          const remainingAmount = getLoanRemainingAmount(loan);
          const payments = Array.isArray(loan.payments) ? loan.payments : [];
          const settleActionLabel = borrowed ? 'Trả hết' : held ? 'Lấy hết' : 'Thu hết';

          return (
            <View
              key={loan.id}
              style={[
                localStyles.debtCard,
                settled && localStyles.debtCardSettled,
              ]}
            >
              {/* Main row */}
              <View style={localStyles.debtRow}>
                {/* Left Circle Icon/Avatar */}
                <View
                  style={[
                    localStyles.avatarCircle,
                    { backgroundColor: getAvatarBg(loan) },
                  ]}
                >
                  <Text style={localStyles.avatarIcon}>
                    {settled ? '✔️' : getAvatarChar(loan)}
                  </Text>
                </View>

                {/* Middle Info */}
                <View style={localStyles.debtBody}>
                  <Text style={localStyles.debtTitle} numberOfLines={1}>
                    {borrowed
                      ? `Mình vay ${loan.person}`
                      : held
                        ? `${loan.person} giữ hộ mình`
                        : `${loan.person} nợ mình`}
                  </Text>
                  <Text style={localStyles.debtMeta}>
                    Gốc {formatCurrency(Number(loan.amount) || 0)} · đã{' '}
                    {held ? 'lấy' : borrowed ? 'trả' : 'thu'} {formatCurrency(paidAmount)} ·{' '}
                    {loan.dateUnknown ? 'vay ngày xưa' : formatDateKeyLabel(loan.date)}
                    {loan.dueDate ? ` · hạn ${formatDateKeyLabel(loan.dueDate)}` : ''}
                  </Text>
                  {loan.note ? (
                    <Text style={localStyles.debtNote} numberOfLines={2}>
                      {loan.note}
                    </Text>
                  ) : null}
                  {getLoanStatusBadge(loan)}
                </View>

                {/* Right Amount & Actions */}
                <View style={localStyles.debtRight}>
                  <Text
                    style={[
                      localStyles.debtAmount,
                      settled
                        ? localStyles.settledText
                        : borrowed
                          ? localStyles.expenseText
                          : localStyles.incomeText,
                    ]}
                  >
                    {settled
                      ? '0 đ'
                      : (borrowed ? '-' : '+') + formatCurrency(remainingAmount)}
                  </Text>
                  
                  <View style={localStyles.actionRow}>
                    {!settled ? (
                      <Pressable
                        style={localStyles.actionBtn}
                        onPress={() =>
                          Alert.alert(
                            `${settleActionLabel} khoản vay nợ?`,
                            `Sẽ ghi một đợt ${settleActionLabel.toLowerCase()} ${formatCurrency(remainingAmount)} và tất toán khoản này.`,
                            [
                              { text: 'Hủy', style: 'cancel' },
                              {
                                text: settleActionLabel,
                                onPress: () => handleSettleLoan(loan.id),
                              },
                            ]
                          )
                        }
                      >
                        <Text style={localStyles.actionBtnText}>
                          {settleActionLabel}
                        </Text>
                      </Pressable>
                    ) : null}
                    
                    <Pressable
                      onPress={() => setActiveMenuLoan(loan)}
                      hitSlop={8}
                      style={localStyles.ellipsisBtn}
                    >
                      <Text style={localStyles.ellipsisText}>⋮</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Nested Payment History Timeline */}
              {payments.length > 0 && (
                <View style={localStyles.timelineContainer}>
                  <Text style={localStyles.timelineTitle}>Lịch sử thu/trả</Text>
                  {payments.map((p, idx) => (
                    <View key={p.id ?? `${loan.id}-payment-${idx}`} style={localStyles.paymentHistoryCard}>
                      <View style={localStyles.paymentHistoryTop}>
                        <View style={localStyles.paymentHistoryLabelWrap}>
                          <Text style={localStyles.paymentHistoryTitle}>
                            Đợt {idx + 1}
                          </Text>
                          <Text style={localStyles.paymentHistoryDate}>
                            {formatDateKeyLabel(p.date)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            localStyles.paymentHistoryAmount,
                            borrowed ? localStyles.expenseText : localStyles.incomeText,
                          ]}
                        >
                          {formatCurrency(p.amount)}
                        </Text>
                      </View>
                      {p.note ? (
                        <Text style={localStyles.paymentHistoryNote} numberOfLines={2}>
                          {p.note}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Popover Action Menu Modal */}
      {activeMenuLoan && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setActiveMenuLoan(null)}
        >
          <Pressable
            style={localStyles.modalOverlay}
            onPress={() => setActiveMenuLoan(null)}
          >
            <Pressable style={localStyles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={localStyles.modalTitle} numberOfLines={1}>
                {activeMenuLoan.person} (Còn: {formatCurrency(getLoanRemainingAmount(activeMenuLoan))})
              </Text>

              <Pressable style={localStyles.modalBtn} onPress={handleMenuEdit}>
                <Text style={localStyles.modalBtnText}>Sửa khoản vay nợ</Text>
              </Pressable>

              <Pressable style={localStyles.modalBtn} onPress={handleMenuAddPayment}>
                <Text style={localStyles.modalBtnText}>Thêm đợt thu / trả nợ</Text>
              </Pressable>

              <Pressable
                style={[localStyles.modalBtn, localStyles.modalBtnDelete]}
                onPress={handleMenuDelete}
              >
                <Text style={[localStyles.modalBtnText, localStyles.modalBtnTextDelete]}>
                  Xóa khoản vay nợ
                </Text>
              </Pressable>

              <Pressable
                style={[localStyles.modalBtn, localStyles.modalBtnCancel]}
                onPress={() => setActiveMenuLoan(null)}
              >
                <Text style={[localStyles.modalBtnText, { color: '#FB7185' }]}>Hủy</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// Inline wrapper for ImageBackground so we can apply custom background styles locally
function ImageBackgroundWrapper({ image, children }) {
  if (!image) {
    return <View style={localStyles.heroCardWrapper}>{children}</View>;
  }
  return (
    <ImageBackground
      source={image}
      style={localStyles.heroCardWrapper}
      imageStyle={localStyles.heroCardPattern}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
}

import { ImageBackground } from 'react-native';

const localStyles = StyleSheet.create({
  tabContainer: {
    flex: 1,
  },
  // Hero Card
  heroCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(246, 199, 90, 0.35)',
    backgroundColor: '#17122E',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  heroCardPattern: {
    opacity: 0.12,
    tintColor: '#8B5CF6',
  },
  heroCard: {
    padding: 16,
  },
  heroCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIconContainer: {
    width: 55,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroIcon: {
    width: 50,
    height: 50,
  },
  heroTitleCol: {
    flex: 1,
  },
  heroTitle: {
    color: '#F6C75A',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(246, 199, 90, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  heroSubtitle: {
    color: '#A8A0C2',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  heroStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 11, 31, 0.4)',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 12,
  },
  heroStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#A8A0C2',
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroStatVal: {
    fontSize: 14,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  heroStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(168, 160, 194, 0.15)',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(246, 199, 90, 0.2)',
    marginBottom: 12,
  },
  heroBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  heroBalanceLabel: {
    fontSize: 12,
    color: '#A8A0C2',
    fontWeight: '700',
  },
  heroBalanceVal: {
    fontSize: 15,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  // AI Card Redesign
  aiCard: {
    backgroundColor: '#17122E',
    borderWidth: 1.5,
    borderColor: 'rgba(246, 199, 90, 0.35)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  aiTitle: {
    fontSize: 16,
    color: '#F6C75A',
    fontWeight: 'bold',
    textShadowColor: 'rgba(246, 199, 90, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  aiSubtitle: {
    fontSize: 11,
    color: '#A8A0C2',
    marginTop: 4,
    lineHeight: 16,
  },
  aiIllustration: {
    width: 55,
    height: 55,
  },
  aiInput: {
    backgroundColor: '#21183D',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8F3E8',
    fontSize: 13,
    minHeight: 46,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  aiSubmitBtn: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6C75A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F6C75A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.55,
  },
  aiSubmitText: {
    color: '#0E0B1F',
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: '#FB7185',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  statusText: {
    color: '#34D399',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  // Filter Chips Row
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#17122E',
    borderWidth: 1.2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  filterBtnActive: {
    borderColor: '#F6C75A',
    backgroundColor: '#21183D',
    shadowColor: '#F6C75A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    color: '#A8A0C2',
    fontSize: 11,
    fontWeight: 'bold',
  },
  filterTextActive: {
    color: '#F6C75A',
  },
  // Section Header Title
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderIcon: {
    fontSize: 16,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    color: '#F8F3E8',
    fontWeight: 'bold',
    textShadowColor: 'rgba(246, 199, 90, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  // Empty State
  emptyCard: {
    backgroundColor: '#17122E',
    borderWidth: 1.2,
    borderColor: 'rgba(168, 160, 194, 0.15)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#F6C75A',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySubtext: {
    color: '#A8A0C2',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Debt Card
  debtCard: {
    backgroundColor: '#17122E',
    borderWidth: 1.2,
    borderColor: 'rgba(168, 160, 194, 0.15)',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  debtCardSettled: {
    opacity: 0.65,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(246, 199, 90, 0.25)',
  },
  avatarIcon: {
    fontSize: 18,
  },
  debtBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  debtTitle: {
    color: '#F8F3E8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  debtMeta: {
    color: '#A8A0C2',
    fontSize: 11,
    marginTop: 3,
  },
  debtNote: {
    color: '#A8A0C2',
    fontSize: 11,
    marginTop: 3,
    fontStyle: 'italic',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  debtRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 105,
  },
  debtAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    backgroundColor: '#21183D',
    borderWidth: 1.2,
    borderColor: '#F6C75A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#F6C75A',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ellipsisBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: -6,
  },
  ellipsisText: {
    color: '#A8A0C2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeText: {
    color: '#34D399',
  },
  expenseText: {
    color: '#FB7185',
  },
  settledText: {
    color: '#A8A0C2',
  },
  // Timeline Styling
  timelineContainer: {
    backgroundColor: '#0E0B1F',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(168, 160, 194, 0.08)',
  },
  timelineTitle: {
    fontSize: 10,
    color: '#A8A0C2',
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  paymentHistoryCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    backgroundColor: '#17122E',
    padding: 10,
    marginBottom: 8,
  },
  paymentHistoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paymentHistoryLabelWrap: {
    flex: 1,
    minWidth: 0,
  },
  paymentHistoryTitle: {
    color: '#F8F3E8',
    fontSize: 12,
    fontWeight: '900',
  },
  paymentHistoryDate: {
    color: '#A8A0C2',
    fontSize: 10,
    marginTop: 2,
  },
  paymentHistoryAmount: {
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 11, 31, 0.55)',
    overflow: 'hidden',
  },
  paymentHistoryNote: {
    color: '#A8A0C2',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
  },
  // Modal popover
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 11, 31, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#17122E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(246, 199, 90, 0.35)',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  modalTitle: {
    fontSize: 14,
    color: '#A8A0C2',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  modalBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    backgroundColor: '#21183D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  modalBtnDelete: {
    borderColor: 'rgba(251, 113, 133, 0.3)',
  },
  modalBtnCancel: {
    borderColor: '#FB7185',
    backgroundColor: 'rgba(251, 113, 133, 0.08)',
    marginTop: 8,
  },
  modalBtnText: {
    fontSize: 14,
    color: '#F8F3E8',
    fontWeight: 'bold',
  },
  modalBtnTextDelete: {
    color: '#FB7185',
  },
});
