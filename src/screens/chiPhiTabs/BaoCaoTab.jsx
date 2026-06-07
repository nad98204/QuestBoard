import { Image, Pressable, Text, View } from 'react-native';
export default function BaoCaoTab({
  dateKeyFromDate,
  EXPENSE_IMAGES,
  formatCurrency,
  formatDateKeyLabel,
  formatSignedAmount,
  getTransactionDate,
  reportData,
  reportMode,
  setReportMode,
  styles,
  timeKeyFromDate,
}) {
  return (
    <>
      <View style={styles.reportCard}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.reportAvatar}>
            <Image
              source={EXPENSE_IMAGES.report}
              style={styles.expenseSectionIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.aiHeaderCopy}>
            <Text style={styles.aiTitle}>Báo cáo chi tiêu</Text>
            <Text style={styles.aiSubtitle}>
              Xem bạn hay chi vào đâu theo từng tháng hoặc cả năm.
            </Text>
          </View>
        </View>
        <View style={styles.filterRow}>
          {[
            {
              id: 'month',
              label: 'Theo tháng',
            },
            {
              id: 'year',
              label: 'Theo năm',
            },
          ].map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setReportMode(item.id)}
              style={[
                styles.filterBtn,
                reportMode === item.id && styles.filterBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  reportMode === item.id && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.reportSummaryBox}>
          <Text style={styles.txMeta}>{reportData.label}</Text>
          <Text style={styles.reportBigValue}>
            {formatCurrency(reportData.expense)}
          </Text>
          <Text style={styles.txMeta}>
            {reportData.count} giao dịch chi · thu{' '}
            {formatCurrency(reportData.income)} · còn{' '}
            {formatSignedAmount(reportData.balance)}
          </Text>
        </View>
        <View style={styles.budgetList}>
          {reportData.categoryRows.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có chi tiêu trong kỳ này.</Text>
          ) : (
            reportData.categoryRows.map((row, index) => {
              const percent = Math.round(row.percent * 100);
              return (
                <View key={row.category} style={styles.reportRow}>
                  <View style={styles.budgetTopLine}>
                    <View style={styles.budgetTitleWrap}>
                      <Text
                        style={[
                          styles.categoryIcon,
                          {
                            color: row.categoryInfo.color,
                          },
                        ]}
                      >
                        {row.categoryInfo.icon}
                      </Text>
                      <View style={styles.budgetNameWrap}>
                        <Text style={styles.txTitle} numberOfLines={1}>
                          #{index + 1}
                          {row.categoryInfo.label}
                        </Text>
                        <Text style={styles.txMeta} numberOfLines={1}>
                          {row.count} lần · {percent}% tổng chi
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.txAmount, styles.expenseText]}>
                      {formatCurrency(row.amount)}
                    </Text>
                  </View>
                  <View style={styles.budgetProgressTrack}>
                    <View
                      style={[
                        styles.reportProgressFill,
                        {
                          width: `${Math.min(100, percent)}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.reportItemList}>
                    {row.items.map((tx) => {
                      const txDate = getTransactionDate(tx);
                      return (
                        <View key={tx.id} style={styles.reportItemRow}>
                          <View style={styles.reportItemTextWrap}>
                            <Text
                              style={styles.reportItemTitle}
                              numberOfLines={1}
                            >
                              {tx.description}
                            </Text>
                            <Text style={styles.txMeta} numberOfLines={1}>
                              {formatDateKeyLabel(dateKeyFromDate(txDate))} ·{' '}
                              {timeKeyFromDate(txDate)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.reportItemAmount,
                              styles.expenseText,
                            ]}
                          >
                            {formatCurrency(Math.abs(Number(tx.amount) || 0))}
                          </Text>
                        </View>
                      );
                    })}
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
