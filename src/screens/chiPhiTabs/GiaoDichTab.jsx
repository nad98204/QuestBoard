import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';

export default function GiaoDichTab({
  aiBusy,
  aiError,
  aiStatus,
  aiText,
  allCategories,
  allLoanRecords,
  amountPlaceholder,
  canAdd,
  categoryById,
  categoryDraft,
  categoryOpen,
  draft,
  editingId,
  entryCategories,
  entryPlaceholder,
  entryTitle,
  error,
  EXPENSE_IMAGES,
  filter,
  formatSignedAmount,
  getDayLabel,
  getTransactionDate,
  groupedTransactions,
  handleAddCategory,
  handleAiNote,
  handleDelete,
  handleDuplicate,
  handleFilterChange,
  FILTERS,
  handleEdit,
  handleEditLoan,
  handleSubmit,
  manualOpen,
  selectedEntryCategory,
  setActiveLedgerTab,
  setAiError,
  setAiStatus,
  setAiText,
  setCategoryDraft,
  setCategoryOpen,
  setError,
  setManualOpen,
  styles,
  timeKeyFromDate,
  updateDraft,
}) {
  const [activeMenuTx, setActiveMenuTx] = useState(null);
  const [collapsedDays, setCollapsedDays] = useState({});

  const toggleCollapse = (dateKey) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const handleMenuEdit = () => {
    if (!activeMenuTx) return;
    const tx = activeMenuTx;
    setActiveMenuTx(null);

    const isLoan = tx.source === 'loan';
    if (isLoan) {
      const loan = allLoanRecords.find((item) => item.id === tx.loanId);
      if (loan) handleEditLoan(loan);
      else setActiveLedgerTab('loans');
    } else {
      handleEdit(tx);
    }
  };

  const handleMenuDelete = () => {
    if (!activeMenuTx) return;
    const txId = activeMenuTx.id;
    setActiveMenuTx(null);
    handleDelete(txId);
  };

  const handleMenuDuplicate = () => {
    if (!activeMenuTx) return;
    const tx = activeMenuTx;
    setActiveMenuTx(null);
    handleDuplicate(tx);
  };

  return (
    <View style={localStyles.tabContainer}>
      {/* AI Quick Input Card */}
      <View style={localStyles.fantasyAiCard}>
        <View style={localStyles.fantasyAiHeaderRow}>
          <View style={localStyles.fantasyAiTitleCol}>
            <Text style={localStyles.fantasyAiTitle}>✨ Ghi nhanh bằng AI</Text>
            <Text style={localStyles.fantasyAiSubtitle}>
              Nhập tự nhiên, AI sẽ tự tách khoản và chọn danh mục
            </Text>
          </View>
          <Image
            source={EXPENSE_IMAGES.jars}
            style={localStyles.fantasyAiIllustration}
            resizeMode="contain"
          />
        </View>
        <TextInput
          value={aiText}
          onChangeText={(v) => {
            setAiText(v);
            setAiError('');
            setAiStatus('');
          }}
          placeholder="VD: bữa tối 100k, mua áo 400k, nhận lương 15tr"
          placeholderTextColor="#6f6a7d"
          style={localStyles.fantasyAiInput}
          multiline
          editable={!aiBusy}
        />
        {aiError ? <Text style={localStyles.fantasyErrorText}>{aiError}</Text> : null}
        {aiStatus ? <Text style={localStyles.fantasyStatusText}>{aiStatus}</Text> : null}
        <Pressable
          style={[localStyles.fantasyAiSubmitBtn, aiBusy && localStyles.disabledBtn]}
          onPress={handleAiNote}
          disabled={aiBusy}
        >
          {aiBusy ? (
            <ActivityIndicator color="#0E0B1F" />
          ) : (
            <Text style={localStyles.fantasyAiSubmitText}>✨ AI ghi giao dịch</Text>
          )}
        </Pressable>
      </View>

      {/* Transaction Filters */}
      {FILTERS && handleFilterChange ? (
        <View style={localStyles.fantasyFilterRow}>
          {FILTERS.map((item) => {
            const active = filter === item.id;
            let dotColor = null;
            if (item.id === 'expense') dotColor = '#FB7185';
            else if (item.id === 'income') dotColor = '#34D399';
            else if (item.id === 'loan') dotColor = '#FB7185';

            return (
              <Pressable
                key={item.id}
                onPress={() => handleFilterChange(item.id)}
                style={[
                  localStyles.fantasyFilterBtn,
                  active && localStyles.fantasyFilterBtnActive,
                ]}
              >
                {dotColor && <View style={[localStyles.fantasyFilterDot, { backgroundColor: dotColor }]} />}
                <Text
                  style={[
                    localStyles.fantasyFilterText,
                    active && localStyles.fantasyFilterTextActive,
                  ]}
                >
                  {item.label === 'Chi tiêu' ? 'Chi' : item.label === 'Thu nhập' ? 'Thu' : item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Manual Entry Toggle */}
      {canAdd ? (
        <Pressable
          style={localStyles.manualToggle}
          onPress={() => setManualOpen((open) => !open)}
        >
          <Text style={localStyles.manualToggleText}>
            {manualOpen ? 'Ẩn nhập tay' : 'Nhập tay khi cần'}
          </Text>
          <Text style={localStyles.manualToggleIcon}>{manualOpen ? '−' : '+'}</Text>
        </Pressable>
      ) : null}

      {/* Manual Entry Form */}
      {manualOpen && canAdd ? (
        <View style={localStyles.manualCard}>
          <Text style={localStyles.manualCardTitle}>{entryTitle}</Text>
          <TextInput
            value={draft.description}
            onChangeText={(v) => updateDraft('description', v)}
            placeholder={entryPlaceholder}
            placeholderTextColor="#6f6a7d"
            style={localStyles.manualInput}
          />
          <TextInput
            value={draft.amount}
            onChangeText={(v) => updateDraft('amount', v)}
            placeholder={amountPlaceholder}
            placeholderTextColor="#6f6a7d"
            keyboardType="numeric"
            style={localStyles.manualInput}
          />
          <Text style={localStyles.manualFieldLabel}>Danh mục</Text>
          <Pressable
            style={localStyles.manualCategorySummaryRow}
            onPress={() => setCategoryOpen((open) => !open)}
          >
            <View style={localStyles.manualSelectedCategoryPill}>
              <Text
                style={[
                  localStyles.manualCategoryIcon,
                  {
                    color: selectedEntryCategory.color,
                  },
                ]}
              >
                {selectedEntryCategory.icon}
              </Text>
              <Text style={localStyles.manualSelectedCategoryText}>
                {selectedEntryCategory.label}
              </Text>
            </View>
            <Text style={localStyles.manualCategoryToggleText}>
              {categoryOpen ? 'Thu gọn' : 'Mở danh mục'}
            </Text>
          </Pressable>
          {categoryOpen ? (
            <>
              <View style={localStyles.manualOptionWrap}>
                {entryCategories.map((cat) => {
                  const active = draft.category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        updateDraft('category', cat.id);
                        setCategoryOpen(false);
                      }}
                      style={[
                        localStyles.manualCategoryBtn,
                        active && {
                          borderColor: cat.color,
                          backgroundColor: '#21183D',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          localStyles.manualCategoryIcon,
                          {
                            color: cat.color,
                          },
                        ]}
                      >
                        {cat.icon}
                      </Text>
                      <Text
                        style={[
                          localStyles.manualOptionText,
                          active && localStyles.manualOptionTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={localStyles.manualCategoryAddRow}>
                <TextInput
                  value={categoryDraft}
                  onChangeText={(v) => {
                    setError('');
                    setCategoryDraft(v);
                  }}
                  placeholder="Thêm danh mục mới"
                  placeholderTextColor="#6f6a7d"
                  style={[localStyles.manualInput, localStyles.manualCategoryAddInput]}
                />
                <Pressable
                  style={localStyles.manualCategoryAddBtn}
                  onPress={handleAddCategory}
                >
                  <Text style={localStyles.manualCategoryAddText}>Thêm</Text>
                </Pressable>
              </View>
            </>
          ) : null}
          <View style={localStyles.manualDateRow}>
            <TextInput
              value={draft.date}
              onChangeText={(v) => updateDraft('date', v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6f6a7d"
              style={[localStyles.manualInput, localStyles.manualDateInput]}
            />
            <TextInput
              value={draft.time}
              onChangeText={(v) => updateDraft('time', v)}
              placeholder="HH:mm"
              placeholderTextColor="#6f6a7d"
              style={[localStyles.manualInput, localStyles.manualTimeInput]}
            />
          </View>
          <TextInput
            value={draft.note}
            onChangeText={(v) => updateDraft('note', v)}
            placeholder="Ghi chú tùy chọn"
            placeholderTextColor="#6f6a7d"
            style={[localStyles.manualInput, localStyles.manualNoteInput]}
            multiline
          />
          {error ? <Text style={localStyles.manualErrorText}>{error}</Text> : null}
          <Pressable
            style={[
              localStyles.manualAddBtn,
              filter === 'expense' && localStyles.manualAddExpenseBtn,
            ]}
            onPress={handleSubmit}
          >
            <Text style={localStyles.manualAddBtnText}>{entryTitle}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Transaction List Header */}
      <View style={localStyles.sectionHeaderRow}>
        <View style={localStyles.sectionHeaderTitleWrap}>
          <Text style={localStyles.sectionHeaderIcon}>🛡️</Text>
          <Text style={localStyles.sectionHeaderTitle}>Danh sách giao dịch</Text>
        </View>
      </View>

      {/* Transaction Day Groups */}
      {groupedTransactions.length === 0 ? (
        <Text style={localStyles.emptyText}>
          Chưa có giao dịch phù hợp trong tháng này.
        </Text>
      ) : (
        groupedTransactions.map(([dateKey, items, dayTotal]) => {
          const isCollapsed = collapsedDays[dateKey];
          const isNegative = dayTotal < 0;

          return (
            <View key={dateKey} style={localStyles.dayGroup}>
              {/* Day Group Header */}
              <Pressable
                onPress={() => toggleCollapse(dateKey)}
                style={localStyles.dayHeader}
              >
                <View style={localStyles.dayHeaderLeft}>
                  <Text style={localStyles.dayTitle}>{getDayLabel(dateKey)}</Text>
                  <Text style={localStyles.dayMeta}>{items.length} giao dịch</Text>
                </View>
                <View style={localStyles.dayHeaderRight}>
                  <Text
                    style={[
                      localStyles.dayTotal,
                      isNegative ? localStyles.expenseText : localStyles.incomeText,
                    ]}
                  >
                    {formatSignedAmount(dayTotal)}
                  </Text>
                  <Text style={localStyles.collapseArrow}>
                    {isCollapsed ? '▼' : '▲'}
                  </Text>
                </View>
              </Pressable>

              {/* Day Group Items */}
              {!isCollapsed &&
                items.map((tx) => {
                  const cat = categoryById(tx.category, allCategories);
                  const amount = Number(tx.amount) || 0;
                  const txDate = getTransactionDate(tx);
                  const active = editingId === tx.id;
                  const loanAuto = tx.source === 'loan';

                  return (
                    <View
                      key={tx.id}
                      style={[localStyles.txItem, active && localStyles.txItemEditing]}
                    >
                      {/* Icon */}
                      <View
                        style={[
                          localStyles.txIconWrap,
                          {
                            borderColor: cat.color + '44',
                            backgroundColor: `${cat.color}15`,
                          },
                        ]}
                      >
                        <Text style={localStyles.txIcon}>{cat.icon}</Text>
                      </View>

                      {/* Body */}
                      <View style={localStyles.txBody}>
                        <Text style={localStyles.txTitle} numberOfLines={1}>
                          {tx.description}
                        </Text>
                        <Text style={localStyles.txMeta} numberOfLines={1}>
                          {loanAuto ? 'Vay nợ tự động' : cat.label} ·{' '}
                          {timeKeyFromDate(txDate)}
                        </Text>
                        {tx.note ? (
                          <Text style={localStyles.txNote} numberOfLines={2}>
                            {tx.note}
                          </Text>
                        ) : null}
                      </View>

                      {/* Right Section */}
                      <View style={localStyles.txRight}>
                        <Text
                          style={[
                            localStyles.txAmount,
                            amount >= 0 ? localStyles.incomeText : localStyles.expenseText,
                          ]}
                        >
                          {formatSignedAmount(amount)}
                        </Text>
                        <Pressable
                          onPress={() => setActiveMenuTx(tx)}
                          hitSlop={12}
                          style={localStyles.ellipsisBtn}
                        >
                          <Text style={localStyles.ellipsisText}>⋮</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
            </View>
          );
        })
      )}

      {/* Popover Action Menu Modal */}
      {activeMenuTx && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setActiveMenuTx(null)}
        >
          <Pressable
            style={localStyles.modalOverlay}
            onPress={() => setActiveMenuTx(null)}
          >
            <Pressable style={localStyles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={localStyles.modalTitle} numberOfLines={1}>
                {activeMenuTx.description} ({formatSignedAmount(activeMenuTx.amount)})
              </Text>

              <Pressable style={localStyles.modalBtn} onPress={handleMenuEdit}>
                <Text style={localStyles.modalBtnText}>
                  {activeMenuTx.source === 'loan' ? 'Sửa giao dịch vay nợ' : 'Sửa giao dịch'}
                </Text>
              </Pressable>

              <Pressable style={localStyles.modalBtn} onPress={handleMenuDuplicate}>
                <Text style={localStyles.modalBtnText}>Nhân bản giao dịch</Text>
              </Pressable>

              <Pressable
                style={[localStyles.modalBtn, localStyles.modalBtnDelete]}
                onPress={handleMenuDelete}
              >
                <Text style={[localStyles.modalBtnText, localStyles.modalBtnTextDelete]}>
                  Xóa giao dịch
                </Text>
              </Pressable>

              <Pressable
                style={[localStyles.modalBtn, localStyles.modalBtnCancel]}
                onPress={() => setActiveMenuTx(null)}
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

const localStyles = StyleSheet.create({
  tabContainer: {
    flex: 1,
  },
  // AI Card Redesign
  fantasyAiCard: {
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
  fantasyAiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fantasyAiTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  fantasyAiTitle: {
    fontSize: 16,
    color: '#F6C75A',
    fontWeight: 'bold',
    textShadowColor: 'rgba(246, 199, 90, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  fantasyAiSubtitle: {
    fontSize: 11,
    color: '#A8A0C2',
    marginTop: 4,
    lineHeight: 16,
  },
  fantasyAiIllustration: {
    width: 55,
    height: 55,
  },
  fantasyAiInput: {
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
  fantasyAiSubmitBtn: {
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
  fantasyAiSubmitText: {
    color: '#0E0B1F',
    fontSize: 14,
    fontWeight: '800',
  },
  fantasyErrorText: {
    color: '#FB7185',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  fantasyStatusText: {
    color: '#34D399',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  // Filters Redesign
  fantasyFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  fantasyFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#17122E',
    borderWidth: 1.2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  fantasyFilterBtnActive: {
    borderColor: '#F6C75A',
    backgroundColor: '#21183D',
    shadowColor: '#F6C75A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  fantasyFilterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  fantasyFilterText: {
    color: '#A8A0C2',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fantasyFilterTextActive: {
    color: '#F6C75A',
  },
  // Manual toggle and entry
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#17122E',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    marginBottom: 16,
  },
  manualToggleText: {
    color: '#A8A0C2',
    fontSize: 13,
    fontWeight: '700',
  },
  manualToggleIcon: {
    color: '#F6C75A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualCard: {
    backgroundColor: '#17122E',
    borderWidth: 1.5,
    borderColor: 'rgba(246, 199, 90, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  manualCardTitle: {
    color: '#F8F3E8',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  manualInput: {
    backgroundColor: '#21183D',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8F3E8',
    fontSize: 13,
    marginBottom: 10,
  },
  manualFieldLabel: {
    color: '#A8A0C2',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  manualCategorySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#21183D',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  manualSelectedCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualCategoryIcon: {
    fontSize: 16,
  },
  manualSelectedCategoryText: {
    color: '#F8F3E8',
    fontSize: 13,
    fontWeight: '700',
  },
  manualCategoryToggleText: {
    color: '#F6C75A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  manualOptionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  manualCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#17122E',
    borderWidth: 1,
    borderColor: 'rgba(168, 160, 194, 0.2)',
  },
  manualOptionText: {
    color: '#A8A0C2',
    fontSize: 12,
    fontWeight: '600',
  },
  manualOptionTextActive: {
    color: '#F8F3E8',
    fontWeight: 'bold',
  },
  manualCategoryAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  manualCategoryAddInput: {
    flex: 1,
    marginBottom: 0,
  },
  manualCategoryAddBtn: {
    backgroundColor: '#21183D',
    borderWidth: 1,
    borderColor: '#F6C75A',
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualCategoryAddText: {
    color: '#F6C75A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  manualDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  manualDateInput: {
    flex: 1,
    marginBottom: 0,
  },
  manualTimeInput: {
    flex: 1,
    marginBottom: 0,
  },
  manualNoteInput: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  manualErrorText: {
    color: '#FB7185',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  manualAddBtn: {
    height: 40,
    backgroundColor: '#34D399',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  manualAddExpenseBtn: {
    backgroundColor: '#F6C75A',
  },
  manualAddBtnText: {
    color: '#0E0B1F',
    fontSize: 13,
    fontWeight: '800',
  },
  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  emptyText: {
    color: '#A8A0C2',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
    fontStyle: 'italic',
  },
  // Day Group Styling
  dayGroup: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: '#17122E',
    borderWidth: 1,
    borderColor: 'rgba(168, 160, 194, 0.15)',
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#21183D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 160, 194, 0.1)',
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayTitle: {
    color: '#F8F3E8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dayMeta: {
    color: '#A8A0C2',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  dayTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  collapseArrow: {
    color: '#A8A0C2',
    fontSize: 10,
    marginLeft: 4,
  },
  // Transaction Items
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 160, 194, 0.08)',
  },
  txItemEditing: {
    backgroundColor: 'rgba(246, 199, 90, 0.05)',
  },
  txIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIcon: {
    fontSize: 18,
  },
  txBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  txTitle: {
    color: '#F8F3E8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  txMeta: {
    color: '#A8A0C2',
    fontSize: 11,
    marginTop: 3,
  },
  txNote: {
    color: '#F6C75A',
    fontSize: 11,
    marginTop: 3,
    fontStyle: 'italic',
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  ellipsisBtn: {
    paddingVertical: 6,
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
