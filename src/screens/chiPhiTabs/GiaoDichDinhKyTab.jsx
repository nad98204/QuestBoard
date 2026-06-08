import { Image, Pressable, Text, View } from 'react-native';

const FREQ_LABELS = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  yearly: 'Hàng năm',
};

export default function GiaoDichDinhKyTab({
  activeRecurringRows,
  categoryById,
  allCategories,
  EXPENSE_IMAGES,
  formatCurrency,
  formatDateKeyLabel,
  handleAddRecurring,
  handleEditRecurring,
  handlePauseRecurring,
  handleResumeRecurring,
  handleDeleteRecurring,
  handleApplyRecurring,
  styles,
}) {
  return (
    <View style={styles.recurringCard}>
      <View style={styles.aiHeaderRow}>
        <View style={styles.recurringAvatar}>
          <Image
            source={EXPENSE_IMAGES.transactions}
            style={styles.expenseSectionIcon}
            resizeMode="contain"
          />
        </View>
        <View style={styles.aiHeaderCopy}>
          <Text style={styles.aiTitle}>Giao dịch định kỳ</Text>
          <Text style={styles.aiSubtitle}>
            Thiết lập khoản thu/chi lặp lại: tiền thuê nhà, lương, Netflix...
            App sẽ nhắc hoặc tự ghi vào ngày đến hạn.
          </Text>
        </View>
      </View>

      <Pressable style={styles.addBtn} onPress={handleAddRecurring}>
        <Text style={styles.addBtnText}>+ Thêm giao dịch định kỳ</Text>
      </Pressable>

      <View style={styles.budgetList}>
        {activeRecurringRows.length === 0 ? (
          <Text style={styles.emptyText}>
            Chưa có giao dịch định kỳ nào. Thêm để app nhắc đúng hạn.
          </Text>
        ) : (
          activeRecurringRows.map((item) => {
            const cat = categoryById(item.category, allCategories);
            const amount = Number(item.amount) || 0;
            const isIncome = amount >= 0;
            const isPaused = item.status === 'paused';
            return (
              <View
                key={item.id}
                style={[styles.recurringRow, isPaused && styles.recurringRowPaused]}
              >
                <View style={styles.budgetTopLine}>
                  <View style={styles.budgetTitleWrap}>
                    <Text style={[styles.txIcon, { color: cat.color }]}>
                      {cat.icon}
                    </Text>
                    <View style={styles.budgetNameWrap}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <Text style={styles.txMeta} numberOfLines={1}>
                        {FREQ_LABELS[item.frequency] ?? item.frequency} ·{' '}
                        {cat.label}
                        {isPaused ? ' · ⏸ Tạm dừng' : ''}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      isIncome ? styles.incomeText : styles.expenseText,
                    ]}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(Math.abs(amount))}
                  </Text>
                </View>

                <Text style={styles.txMeta}>
                  Bắt đầu: {formatDateKeyLabel(item.startDate)} · Đến hạn:{' '}
                  {formatDateKeyLabel(item.nextDate)}
                  {item.autoCreate ? ' · Tự động tạo' : ' · Nhắc nhở'}
                </Text>

                {item.lastCreatedDate ? (
                  <Text style={styles.txMeta}>
                    Giao dịch gần nhất: {formatDateKeyLabel(item.lastCreatedDate)}
                  </Text>
                ) : null}

                {item.note ? (
                  <Text style={styles.txNote} numberOfLines={2}>
                    {item.note}
                  </Text>
                ) : null}

                <View style={styles.budgetActionRow}>
                  {!isPaused ? (
                    <Pressable
                      style={styles.budgetEditBtn}
                      onPress={() => handleApplyRecurring(item)}
                    >
                      <Text style={styles.budgetEditText}>Ghi ngay</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.budgetEditBtn}
                    onPress={() => handleEditRecurring(item)}
                  >
                    <Text style={styles.budgetEditText}>Sửa</Text>
                  </Pressable>
                  <Pressable
                    style={styles.budgetEditBtn}
                    onPress={() =>
                      isPaused
                        ? handleResumeRecurring(item.id)
                        : handlePauseRecurring(item.id)
                    }
                  >
                    <Text style={styles.budgetEditText}>
                      {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.budgetDeleteBtn}
                    onPress={() => handleDeleteRecurring(item.id)}
                  >
                    <Text style={styles.budgetDeleteText}>Xóa</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}
