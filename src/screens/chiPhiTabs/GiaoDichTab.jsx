import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
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
  return (
    <>
      <View style={styles.aiCard}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.aiAvatar}>
            <Image
              source={EXPENSE_IMAGES.transactions}
              style={styles.expenseSectionIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.aiHeaderCopy}>
            <Text style={styles.aiTitle}>Hôm nay bạn đã chi tiêu gì?</Text>
            <Text style={styles.aiSubtitle}>
              Nhập tự nhiên, AI sẽ tự tách khoản và chọn danh mục.
            </Text>
          </View>
        </View>
        <TextInput
          value={aiText}
          onChangeText={(v) => {
            setAiText(v);
            setAiError('');
            setAiStatus('');
          }}
          placeholder="bữa tối 100k, mua sắm 400k"
          placeholderTextColor="#6f6a7d"
          style={[styles.input, styles.aiInput]}
          multiline
          editable={!aiBusy}
        />
        {aiError ? <Text style={styles.errorText}>{aiError}</Text> : null}
        {aiStatus ? <Text style={styles.aiStatusText}>{aiStatus}</Text> : null}
        <Pressable
          style={[styles.aiSubmitBtn, aiBusy && styles.disabledBtn]}
          onPress={handleAiNote}
          disabled={aiBusy}
        >
          {aiBusy ? (
            <ActivityIndicator color="#061516" />
          ) : (
            <Text style={styles.aiSubmitText}>AI ghi giao dịch</Text>
          )}
        </Pressable>
      </View>
      {canAdd ? (
        <Pressable
          style={styles.manualToggle}
          onPress={() => setManualOpen((open) => !open)}
        >
          <Text style={styles.manualToggleText}>
            {manualOpen ? 'Ẩn nhập tay' : 'Nhập tay khi cần'}
          </Text>
          <Text style={styles.manualToggleIcon}>{manualOpen ? '−' : '+'}</Text>
        </Pressable>
      ) : null}
      {manualOpen && canAdd ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{entryTitle}</Text>
          <TextInput
            value={draft.description}
            onChangeText={(v) => updateDraft('description', v)}
            placeholder={entryPlaceholder}
            placeholderTextColor="#6f6a7d"
            style={styles.input}
          />
          <TextInput
            value={draft.amount}
            onChangeText={(v) => updateDraft('amount', v)}
            placeholder={amountPlaceholder}
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
              <Text
                style={[
                  styles.categoryIcon,
                  {
                    color: selectedEntryCategory.color,
                  },
                ]}
              >
                {selectedEntryCategory.icon}
              </Text>
              <Text style={styles.selectedCategoryText}>
                {selectedEntryCategory.label}
              </Text>
            </View>
            <Text style={styles.categoryToggleText}>
              {categoryOpen ? 'Thu gọn' : 'Mở danh mục'}
            </Text>
          </Pressable>
          {categoryOpen ? (
            <>
              <View style={styles.optionWrap}>
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
                        styles.categoryBtn,
                        active && {
                          borderColor: cat.color,
                          backgroundColor: '#171923',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryIcon,
                          {
                            color: cat.color,
                          },
                        ]}
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
              <View style={styles.categoryAddRow}>
                <TextInput
                  value={categoryDraft}
                  onChangeText={(v) => {
                    setError('');
                    setCategoryDraft(v);
                  }}
                  placeholder="Thêm danh mục mới"
                  placeholderTextColor="#6f6a7d"
                  style={[styles.input, styles.categoryAddInput]}
                />
                <Pressable
                  style={styles.categoryAddBtn}
                  onPress={handleAddCategory}
                >
                  <Text style={styles.categoryAddText}>Thêm</Text>
                </Pressable>
              </View>
            </>
          ) : null}
          <View style={styles.dateRow}>
            <TextInput
              value={draft.date}
              onChangeText={(v) => updateDraft('date', v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.dateInput]}
            />
            <TextInput
              value={draft.time}
              onChangeText={(v) => updateDraft('time', v)}
              placeholder="HH:mm"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.timeInput]}
            />
          </View>
          <TextInput
            value={draft.note}
            onChangeText={(v) => updateDraft('note', v)}
            placeholder="Ghi chú tùy chọn"
            placeholderTextColor="#6f6a7d"
            style={[styles.input, styles.noteInput]}
            multiline
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            style={[
              styles.addBtn,
              filter === 'expense' && styles.addExpenseBtn,
            ]}
            onPress={handleSubmit}
          >
            <Text style={styles.addBtnText}>{entryTitle}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Danh sách giao dịch</Text>
        {groupedTransactions.length === 0 ? (
          <Text style={styles.emptyText}>
            Chưa có giao dịch phù hợp trong tháng này.
          </Text>
        ) : (
          groupedTransactions.map(([dateKey, items]) => (
            <View key={dateKey} style={styles.dayGroup}>
              <Text style={styles.dayTitle}>{getDayLabel(dateKey)}</Text>
              {items.map((tx) => {
                const cat = categoryById(tx.category, allCategories);
                const amount = Number(tx.amount) || 0;
                const txDate = getTransactionDate(tx);
                const active = editingId === tx.id;
                const loanAuto = tx.source === 'loan';
                return (
                  <View
                    key={tx.id}
                    style={[styles.txRow, active && styles.txRowEditing]}
                  >
                    <View
                      style={[
                        styles.txIconWrap,
                        {
                          borderColor: cat.color,
                          backgroundColor: `${cat.color}22`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.txIcon,
                          {
                            color: cat.color,
                          },
                        ]}
                      >
                        {cat.icon}
                      </Text>
                    </View>
                    <View style={styles.txBody}>
                      <View style={styles.txTopLine}>
                        <Text style={styles.txTitle} numberOfLines={1}>
                          {tx.description}
                        </Text>
                        <Text
                          style={[
                            styles.txAmount,
                            amount >= 0
                              ? styles.incomeText
                              : styles.expenseText,
                          ]}
                        >
                          {formatSignedAmount(amount)}
                        </Text>
                      </View>
                      <Text style={styles.txMeta} numberOfLines={1}>
                        {loanAuto ? 'Vay nợ tự động' : cat.label} ·{' '}
                        {timeKeyFromDate(txDate)}
                      </Text>
                      {tx.note ? (
                        <Text style={styles.txNote} numberOfLines={2}>
                          {tx.note}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.txActions}>
                      {loanAuto ? (
                        <Pressable
                          onPress={() => {
                            const loan = allLoanRecords.find(
                              (item) => item.id === tx.loanId,
                            );
                            if (loan) handleEditLoan(loan);
                            else setActiveLedgerTab('loans');
                          }}
                          hitSlop={8}
                          style={styles.editBtn}
                        >
                          <Text style={styles.editText}>Sửa</Text>
                        </Pressable>
                      ) : (
                        <>
                          <Pressable
                            onPress={() => handleEdit(tx)}
                            hitSlop={8}
                            style={styles.editBtn}
                          >
                            <Text style={styles.editText}>Sửa</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleDelete(tx.id)}
                            hitSlop={10}
                            style={styles.deleteBtn}
                          >
                            <Text style={styles.deleteText}>×</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </View>
    </>
  );
}
