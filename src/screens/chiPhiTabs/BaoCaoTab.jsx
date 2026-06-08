import { useState } from 'react';
import { Image, Pressable, Text, View, ScrollView, StyleSheet, Platform } from 'react-native';

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
  setActiveLedgerTab, // added to allow redirecting to transactions entry
}) {
  // Collapse/Expand state for category list. Start with index 2 expanded by default to match sample screen (#3 Ăn tối)
  const [expandedCats, setExpandedCats] = useState({ 2: true });

  const toggleExpand = (index) => {
    setExpandedCats((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const getRankStyle = (index) => {
    if (index === 0) return { bg: 'rgba(246, 199, 90, 0.15)', text: '#F6C75A', border: 'rgba(246, 199, 90, 0.35)' };
    if (index === 1) return { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA', border: 'rgba(139, 92, 246, 0.35)' };
    if (index === 2) return { bg: 'rgba(249, 115, 22, 0.15)', text: '#FB923C', border: 'rgba(249, 115, 22, 0.35)' };
    return { bg: 'rgba(168, 160, 194, 0.1)', text: '#A8A0C2', border: 'rgba(168, 160, 194, 0.2)' };
  };

  const getInsightText = () => {
    if (!reportData || !reportData.categoryRows || reportData.categoryRows.length === 0) {
      return 'Chưa ghi nhận chi tiêu nào trong thời gian này.';
    }
    const sorted = [...reportData.categoryRows].sort((a, b) => b.percent - a.percent);
    const top1 = sorted[0];
    const percent1 = Math.round(top1.percent * 100);

    if (sorted.length === 1 || Math.round(sorted[1].percent * 100) < percent1 * 0.7) {
      return `Bạn chi nhiều nhất vào ${top1.categoryInfo.label} (${percent1}% tổng chi). Hãy cân đối chi tiêu nhé!`;
    }

    const top2 = sorted[1];
    const percent2 = Math.round(top2.percent * 100);
    return `Bạn chi nhiều nhất vào ${top1.categoryInfo.label} và ${top2.categoryInfo.label}, mỗi mục chiếm khoảng ${percent1}% tổng chi.`;
  };

  const hasData = reportData && reportData.categoryRows && reportData.categoryRows.length > 0;

  return (
    <View style={localStyles.container}>
      {/* Report Hero Card */}
      <ImageBackgroundWrapper image={EXPENSE_IMAGES.header}>
        <View style={localStyles.heroCard}>
          <View style={localStyles.heroIconContainer}>
            <Image
              source={EXPENSE_IMAGES.report}
              style={localStyles.heroIcon}
              resizeMode="contain"
            />
          </View>
          <View style={localStyles.heroContent}>
            <Text style={localStyles.heroTitle}>Báo cáo chi tiêu</Text>
            <Text style={localStyles.heroSubtitle}>
              Xem bạn hay chi vào đâu theo từng tháng hoặc cả năm.
            </Text>

            <View style={localStyles.heroLabelRow}>
              <Text style={localStyles.heroBigLabel}>
                {reportMode === 'year' ? 'Tổng chi năm nay' : 'Tổng chi tháng này'}
              </Text>
              <Text style={localStyles.heroBigValue}>
                {formatCurrency(reportData.expense)}
              </Text>
            </View>

            <Text style={localStyles.heroMetaText}>
              {reportData.count} giao dịch chi · thu{' '}
              <Text style={localStyles.heroGreenText}>{formatCurrency(reportData.income)}</Text> · còn{' '}
              <Text style={reportData.balance >= 0 ? localStyles.heroGreenText : localStyles.heroRedText}>
                {formatSignedAmount(reportData.balance)}
              </Text>
            </Text>
          </View>
        </View>
      </ImageBackgroundWrapper>

      {/* Middle Row: Segment Filter & Insight Card */}
      <View style={localStyles.middleRow}>
        {/* Segment Mode Controls */}
        <View style={localStyles.modeCard}>
          {[
            { id: 'month', label: 'Theo tháng' },
            { id: 'year', label: 'Theo năm' },
          ].map((item, idx) => {
            const active = reportMode === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setReportMode(item.id)}
                style={[
                  localStyles.modeBtn,
                  active && localStyles.modeBtnActive,
                  idx === 1 && localStyles.modeBtnLast,
                ]}
              >
                <Text
                  style={[
                    localStyles.modeBtnText,
                    active && localStyles.modeBtnTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Insight Card */}
        <View style={localStyles.insightCard}>
          <View style={localStyles.insightIconWrap}>
            <Text style={localStyles.insightIcon}>🔮</Text>
          </View>
          <View style={localStyles.insightBody}>
            <Text style={localStyles.insightTitle}>Nhận xét nhanh</Text>
            <Text style={localStyles.insightText} numberOfLines={3}>
              {getInsightText()}
            </Text>
          </View>
        </View>
      </View>

      {/* Summary Stats Cards Row */}
      <View style={localStyles.statsCard}>
        {/* Col 1 */}
        <View style={localStyles.statCol}>
          <View style={localStyles.statIconWrap}>
            <Text style={localStyles.statIcon}>💰</Text>
          </View>
          <View style={localStyles.statTextCol}>
            <Text style={localStyles.statLabel}>Tổng chi</Text>
            <Text style={[localStyles.statValue, localStyles.expenseText]}>
              {formatCurrency(reportData.expense)}
            </Text>
          </View>
        </View>
        <View style={localStyles.statDivider} />
        {/* Col 2 */}
        <View style={localStyles.statCol}>
          <View style={localStyles.statIconWrap}>
            <Text style={localStyles.statIcon}>📜</Text>
          </View>
          <View style={localStyles.statTextCol}>
            <Text style={localStyles.statLabel}>Danh mục</Text>
            <Text style={[localStyles.statValue, localStyles.goldText]}>
              {reportData.categoryRows.length} mục
            </Text>
          </View>
        </View>
        <View style={localStyles.statDivider} />
        {/* Col 3 */}
        <View style={localStyles.statCol}>
          <View style={localStyles.statIconWrap}>
            <Text style={localStyles.statIcon}>⏳</Text>
          </View>
          <View style={localStyles.statTextCol}>
            <Text style={localStyles.statLabel}>
              {reportMode === 'year' ? 'TB / tháng' : 'TB / ngày'}
            </Text>
            <Text style={[localStyles.statValue, localStyles.goldText]}>
              {formatCurrency(reportData.average)}
            </Text>
          </View>
        </View>
      </View>

      {/* Category List Section Header */}
      <View style={localStyles.sectionHeader}>
        <View style={localStyles.sectionHeaderLine} />
        <View style={localStyles.sectionHeaderDiamond} />
        <Text style={localStyles.sectionHeaderTitle}>Chi tiêu theo danh mục</Text>
        <View style={localStyles.sectionHeaderDiamond} />
        <View style={localStyles.sectionHeaderLine} />
      </View>

      {/* Category List */}
      {!hasData ? (
        <View style={localStyles.emptyCard}>
          <View style={localStyles.emptyIconWrap}>
            <Text style={localStyles.emptyIcon}>📭</Text>
          </View>
          <Text style={localStyles.emptyTitle}>Chưa có chi tiêu trong kỳ này</Text>
          <Text style={localStyles.emptyDesc}>
            Hãy ghi nhận các giao dịch đầu tiên trong tháng để mở khóa thống kê báo cáo chi tiêu.
          </Text>
          {setActiveLedgerTab ? (
            <Pressable
              style={localStyles.emptyBtn}
              onPress={() => setActiveLedgerTab('transactions')}
            >
              <Text style={localStyles.emptyBtnText}>Ghi giao dịch ngay</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        reportData.categoryRows.map((row, index) => {
          const percent = Math.round(row.percent * 100);
          const isExpanded = expandedCats[index];
          const rank = getRankStyle(index);

          return (
            <View key={row.category} style={localStyles.categoryCard}>
              {/* Category Card Header */}
              <Pressable
                style={localStyles.categoryHeader}
                onPress={() => toggleExpand(index)}
              >
                <View
                  style={[
                    localStyles.rankBadge,
                    {
                      backgroundColor: rank.bg,
                      borderWidth: 1.2,
                      borderColor: rank.border,
                    },
                  ]}
                >
                  <Text style={[localStyles.rankText, { color: rank.text }]}>
                    #{index + 1}
                  </Text>
                </View>

                <Text style={localStyles.categoryIcon}>
                  {row.categoryInfo.icon}
                </Text>

                <View style={localStyles.categoryMetaCol}>
                  <View style={localStyles.categoryNameRow}>
                    <Text style={localStyles.categoryName} numberOfLines={1}>
                      {row.categoryInfo.label}
                    </Text>
                    <Text style={localStyles.categoryAmount}>
                      {formatCurrency(row.amount)}
                    </Text>
                  </View>

                  <View style={localStyles.categoryCountRow}>
                    <Text style={localStyles.categoryCountText}>
                      {row.count} lần · {percent}% tổng chi
                    </Text>
                    <Text style={localStyles.chevron}>
                      {isExpanded ? '▲' : '▼'}
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={localStyles.progressBarContainer}>
                    <View
                      style={[
                        localStyles.progressBarFill,
                        {
                          width: `${Math.min(100, percent)}%`,
                          backgroundColor: row.categoryInfo.color || '#F6C75A',
                        },
                      ]}
                    />
                  </View>
                </View>
              </Pressable>

              {/* Nested Expanded Sub-Transactions */}
              {isExpanded && (
                <View style={localStyles.nestedList}>
                  {row.items.map((tx, txIdx) => {
                    const txDate = getTransactionDate(tx);
                    const isLast = txIdx === row.items.length - 1;
                    return (
                      <View
                        key={tx.id}
                        style={[
                          localStyles.nestedItem,
                          isLast && localStyles.nestedItemLast,
                        ]}
                      >
                        <View style={localStyles.nestedBody}>
                          <Text style={localStyles.nestedTitle} numberOfLines={1}>
                            {tx.description}
                          </Text>
                          <Text style={localStyles.nestedMeta}>
                            {formatDateKeyLabel(dateKeyFromDate(txDate))} ·{' '}
                            {timeKeyFromDate(txDate)}
                          </Text>
                        </View>
                        <Text style={localStyles.nestedAmount}>
                          {formatCurrency(Math.abs(Number(tx.amount) || 0))}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
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

// React Native lazy loaded ImageBackground import inside wrapper file to avoid cyclic dependency
import { ImageBackground } from 'react-native';

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  heroIconContainer: {
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroIcon: {
    width: 60,
    height: 60,
  },
  heroContent: {
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
  heroLabelRow: {
    marginTop: 10,
  },
  heroBigLabel: {
    color: '#A8A0C2',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroBigValue: {
    color: '#FB7185',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 2,
    textShadowColor: 'rgba(251, 113, 133, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  heroMetaText: {
    color: '#A8A0C2',
    fontSize: 10,
    marginTop: 6,
    fontWeight: '600',
  },
  heroGreenText: {
    color: '#34D399',
    fontWeight: 'bold',
  },
  heroRedText: {
    color: '#FB7185',
    fontWeight: 'bold',
  },
  // Middle Filter & Insight Control Row
  middleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeCard: {
    flex: 0.42,
    backgroundColor: '#17122E',
    borderWidth: 1.2,
    borderColor: 'rgba(246, 199, 90, 0.25)',
    borderRadius: 14,
    padding: 6,
    justifyContent: 'center',
  },
  modeBtn: {
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modeBtnLast: {
    marginBottom: 0,
  },
  modeBtnActive: {
    backgroundColor: '#F6C75A',
    shadowColor: '#F6C75A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: {
    color: '#A8A0C2',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modeBtnTextActive: {
    color: '#0E0B1F',
    fontWeight: '800',
  },
  insightCard: {
    flex: 0.58,
    backgroundColor: '#17122E',
    borderWidth: 1.2,
    borderColor: 'rgba(246, 199, 90, 0.25)',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIconWrap: {
    marginRight: 8,
  },
  insightIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  insightBody: {
    flex: 1,
  },
  insightTitle: {
    color: '#F6C75A',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  insightText: {
    color: '#F8F3E8',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  // Summary Stats Card
  statsCard: {
    backgroundColor: '#17122E',
    borderWidth: 1.2,
    borderColor: 'rgba(246, 199, 90, 0.25)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#21183D',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  statIcon: {
    fontSize: 15,
    textAlign: 'center',
  },
  statTextCol: {
    justifyContent: 'center',
  },
  statLabel: {
    color: '#A8A0C2',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(168, 160, 194, 0.15)',
  },
  expenseText: {
    color: '#FB7185',
  },
  incomeText: {
    color: '#34D399',
  },
  goldText: {
    color: '#F6C75A',
  },
  // Section Header Divider
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(246, 199, 90, 0.2)',
  },
  sectionHeaderDiamond: {
    width: 6,
    height: 6,
    borderWidth: 1,
    borderColor: '#F6C75A',
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#0E0B1F',
    marginHorizontal: 8,
  },
  sectionHeaderTitle: {
    color: '#F8F3E8',
    fontSize: 13,
    fontWeight: 'bold',
    textShadowColor: 'rgba(246, 199, 90, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  // Categories Ranking Item list
  categoryCard: {
    backgroundColor: '#17122E',
    borderWidth: 1.2,
    borderColor: 'rgba(168, 160, 194, 0.15)',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  categoryMetaCol: {
    flex: 1,
    minWidth: 0,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryName: {
    color: '#F8F3E8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoryAmount: {
    color: '#F8F3E8',
    fontSize: 13,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  categoryCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  categoryCountText: {
    color: '#A8A0C2',
    fontSize: 11,
  },
  chevron: {
    color: '#A8A0C2',
    fontSize: 10,
    marginLeft: 4,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#21183D',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Expanded nested items
  nestedList: {
    backgroundColor: '#0E0B1F',
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(168, 160, 194, 0.08)',
  },
  nestedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 160, 194, 0.05)',
  },
  nestedItemLast: {
    borderBottomWidth: 0,
  },
  nestedBody: {
    flex: 1,
    marginRight: 10,
  },
  nestedTitle: {
    color: '#F8F3E8',
    fontSize: 12,
    fontWeight: '600',
  },
  nestedMeta: {
    color: '#A8A0C2',
    fontSize: 10,
    marginTop: 3,
  },
  nestedAmount: {
    color: '#FB7185',
    fontSize: 12,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  // Empty State
  emptyCard: {
    backgroundColor: '#17122E',
    borderWidth: 1.5,
    borderColor: 'rgba(246, 199, 90, 0.35)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#21183D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    color: '#F6C75A',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    color: '#A8A0C2',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F6C75A',
    shadowColor: '#F6C75A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyBtnText: {
    color: '#0E0B1F',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
