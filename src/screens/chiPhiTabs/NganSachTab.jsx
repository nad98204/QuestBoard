import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
export default function NganSachTab({
  budgetAiBusy,
  budgetAiError,
  budgetAiStatus,
  budgetAiText,
  budgetRows,
  EXPENSE_IMAGES,
  formatCurrency,
  handleBudgetAiNote,
  handleDisableBudget,
  handleEditBudget,
  periodLabel,
  setBudgetAiError,
  setBudgetAiStatus,
  setBudgetAiText,
  styles,
}) {
  return (
    <>
      <View style={styles.budgetCard}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.budgetAvatar}>
            <Image
              source={EXPENSE_IMAGES.budget}
              style={styles.expenseSectionIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.aiHeaderCopy}>
            <Text style={styles.aiTitle}>Ngân sách chi tiêu</Text>
            <Text style={styles.aiSubtitle}>
              Đặt giới hạn ngày, tuần, tháng. App tự tính đã dùng từ giao dịch
              thật.
            </Text>
          </View>
        </View>
        <TextInput
          value={budgetAiText}
          onChangeText={(v) => {
            setBudgetAiText(v);
            setBudgetAiError('');
            setBudgetAiStatus('');
          }}
          placeholder="tháng này ăn uống 3tr, cà phê tuần này 300k"
          placeholderTextColor="#6f6a7d"
          style={[styles.input, styles.aiInput]}
          multiline
          editable={!budgetAiBusy}
        />
        {budgetAiError ? (
          <Text style={styles.errorText}>{budgetAiError}</Text>
        ) : null}
        {budgetAiStatus ? (
          <Text style={styles.budgetStatusText}>{budgetAiStatus}</Text>
        ) : null}
        <Pressable
          style={[styles.budgetSubmitBtn, budgetAiBusy && styles.disabledBtn]}
          onPress={handleBudgetAiNote}
          disabled={budgetAiBusy}
        >
          {budgetAiBusy ? (
            <ActivityIndicator color="#171005" />
          ) : (
            <Text style={styles.budgetSubmitText}>AI đặt ngân sách</Text>
          )}
        </Pressable>
        <View style={styles.budgetList}>
          {budgetRows.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có ngân sách nào.</Text>
          ) : (
            budgetRows.map((budget) => {
              const over = budget.spent > budget.limit;
              const percent = Math.round((budget.progress || 0) * 100);
              return (
                <View key={budget.id} style={styles.budgetRow}>
                  <View style={styles.budgetTopLine}>
                    <View style={styles.budgetTitleWrap}>
                      <Text
                        style={[
                          styles.categoryIcon,
                          {
                            color: budget.categoryInfo.color,
                          },
                        ]}
                      >
                        {budget.categoryInfo.icon}
                      </Text>
                      <View style={styles.budgetNameWrap}>
                        <Text style={styles.txTitle} numberOfLines={1}>
                          {budget.categoryInfo.label}
                        </Text>
                        <Text style={styles.txMeta} numberOfLines={1}>
                          {periodLabel(budget.period)} ·{' '}
                          {budget.periodDateLabel}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        over ? styles.expenseText : styles.incomeText,
                      ]}
                    >
                      {percent}%
                    </Text>
                  </View>
                  <View style={styles.budgetProgressTrack}>
                    <View
                      style={[
                        styles.budgetProgressFill,
                        over && styles.budgetProgressOver,
                        {
                          width: `${Math.min(100, percent)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.txMeta}>
                    Đã dùng {formatCurrency(budget.spent)} /{' '}
                    {formatCurrency(budget.limit)} · còn{' '}
                    {formatCurrency(budget.remaining)}
                  </Text>
                  {budget.note ? (
                    <Text style={styles.txNote} numberOfLines={2}>
                      {budget.note}
                    </Text>
                  ) : null}
                  <View style={styles.budgetActionRow}>
                    <Pressable
                      style={styles.budgetEditBtn}
                      onPress={() => handleEditBudget(budget)}
                    >
                      <Text style={styles.budgetEditText}>Sửa</Text>
                    </Pressable>
                    <Pressable
                      style={styles.budgetDeleteBtn}
                      onPress={() => handleDisableBudget(budget.id)}
                    >
                      <Text style={styles.budgetDeleteText}>Xóa ngân sách</Text>
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
