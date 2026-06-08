import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
export default function HuTienTab({
  activeJarRows,
  EXPENSE_IMAGES,
  formatCurrency,
  handleDisableJar,
  handleEditJar,
  handleJarAiNote,
  handleOpenJarContribution,
  handleViewJarHistory,
  jarAiBusy,
  jarAiError,
  jarAiStatus,
  jarAiText,
  jarPercentTotal,
  setJarAiError,
  setJarAiStatus,
  setJarAiText,
  styles,
  totals,
}) {
  return (
    <>
      <View style={styles.jarCard}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.jarAvatar}>
            <Image
              source={EXPENSE_IMAGES.jars}
              style={styles.expenseSectionIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.aiHeaderCopy}>
            <Text style={styles.aiTitle}>Chiến lược chia hũ</Text>
            <Text style={styles.aiSubtitle}>
              AI giúp chia % thu nhập tháng: thiết yếu, tích lũy, đầu tư, đi
              chơi người yêu.
            </Text>
          </View>
        </View>
        <TextInput
          value={jarAiText}
          onChangeText={(v) => {
            setJarAiText(v);
            setJarAiError('');
            setJarAiStatus('');
          }}
          placeholder="lên chiến lược: 50% thiết yếu, 20% tích lũy, 10% đi chơi người yêu"
          placeholderTextColor="#6f6a7d"
          style={[styles.input, styles.aiInput]}
          multiline
          editable={!jarAiBusy}
        />
        {jarAiError ? <Text style={styles.errorText}>{jarAiError}</Text> : null}
        {jarAiStatus ? (
          <Text style={styles.jarStatusText}>{jarAiStatus}</Text>
        ) : null}
        <Pressable
          style={[styles.jarSubmitBtn, jarAiBusy && styles.disabledBtn]}
          onPress={handleJarAiNote}
          disabled={jarAiBusy}
        >
          {jarAiBusy ? (
            <ActivityIndicator color="#05130e" />
          ) : (
            <Text style={styles.jarSubmitText}>AI lên chiến lược hũ</Text>
          )}
        </Pressable>
        <View style={styles.jarSummaryBox}>
          <Text style={styles.txMeta}>
            Tổng thu tháng này: {formatCurrency(totals.income)} · đã phân bổ{' '}
            {Math.round(jarPercentTotal * 10) / 10}%
          </Text>
          {jarPercentTotal > 100 ? (
            <Text style={styles.errorText}>
              Tổng hũ đang vượt 100%, nên nhờ AI cân lại tỷ lệ.
            </Text>
          ) : null}
        </View>
        <View style={styles.budgetList}>
          {activeJarRows.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có hũ tiền nào.</Text>
          ) : (
            activeJarRows.map((jar) => {
              const tracked = jar.trackingMode === 'categories';
              const manual = jar.trackingMode === 'manual';
              const over = jar.spent > jar.allocated;
              const percent = Math.round((jar.progress || 0) * 100);
              const trackingLabel = tracked
                ? jar.categoryInfos.length > 0
                  ? `${jar.categoryInfos.length} danh mục`
                  : 'chưa chọn danh mục'
                : 'ghi thủ công theo tháng';
              return (
                <View key={jar.id} style={styles.jarRow}>
                  <View style={styles.budgetTopLine}>
                    <View style={styles.budgetTitleWrap}>
                      <Text style={styles.jarIcon}>
                        {jar.priority === 'critical'
                          ? '🛡️'
                          : jar.priority === 'nice'
                            ? '✨'
                            : '📌'}
                      </Text>
                      <View style={styles.budgetNameWrap}>
                        <Text style={styles.txTitle} numberOfLines={1}>
                          {jar.label}
                        </Text>
                        <Text style={styles.txMeta} numberOfLines={1}>
                          {jar.percent}% thu nhập
                          {` · ${trackingLabel}`}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        over ? styles.expenseText : styles.incomeText,
                      ]}
                    >
                      {formatCurrency(jar.allocated)}
                    </Text>
                  </View>
                  <View style={styles.budgetProgressTrack}>
                    <View
                      style={[
                        styles.jarProgressFill,
                        over && styles.budgetProgressOver,
                        {
                          width: `${Math.min(100, percent)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.txMeta}>
                    {tracked ? 'Đã chi' : 'Đã chuyển'}
                    {formatCurrency(jar.spent)} · còn{' '}
                    {formatCurrency(jar.remaining)}
                  </Text>
                  {tracked && jar.categoryInfos.length > 0 ? (
                    <Text style={styles.txMeta}>
                      Tính từ:{' '}
                      {jar.categoryInfos.map((cat) => cat.label).join(', ')}
                    </Text>
                  ) : null}
                  {manual && jar.contributionRows.length > 0 ? (
                    <View style={styles.jarContributionList}>
                      {jar.contributionRows.slice(0, 3).map((entry) => (
                        <Text
                          key={entry.id}
                          style={styles.paymentText}
                          numberOfLines={1}
                        >
                          - {formatCurrency(entry.amount)} · {entry.note}
                        </Text>
                      ))}
                      {jar.contributionRows.length > 3 ? (
                        <Pressable
                          onPress={() => handleViewJarHistory(jar)}
                          hitSlop={6}
                        >
                          <Text style={styles.jarViewAllText}>
                            Xem tất cả {jar.contributionRows.length} lần →
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {jar.note ? (
                    <Text style={styles.txNote} numberOfLines={2}>
                      {jar.note}
                    </Text>
                  ) : null}
                  <View style={styles.jarActionRow}>
                    {manual ? (
                      <Pressable
                        style={styles.jarDeleteBtn}
                        onPress={() => handleOpenJarContribution(jar)}
                      >
                        <Text style={styles.jarDeleteText}>Ghi tiền</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={styles.jarDeleteBtn}
                      onPress={() => handleEditJar(jar)}
                    >
                      <Text style={styles.jarDeleteText}>Sửa hũ</Text>
                    </Pressable>
                    <Pressable
                      style={styles.jarDeleteBtn}
                      onPress={() => handleDisableJar(jar.id)}
                    >
                      <Text style={styles.jarDeleteText}>Xóa hũ</Text>
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
