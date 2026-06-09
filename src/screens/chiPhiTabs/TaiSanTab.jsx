import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
export default function TaiSanTab({
  assetAiBusy,
  assetAiError,
  assetAiStatus,
  assetAiText,
  assetGoalAiBusy,
  assetGoalAiError,
  assetGoalAiStatus,
  assetGoalAiText,
  assetGoalRows,
  assetHistory,
  currentAssetSnapshot,
  EXPENSE_IMAGES,
  formatCurrency,
  handleAssetAiNote,
  handleAssetGoalAiNote,
  handleDeleteAsset,
  handleDisableAssetGoal,
  handleEditAsset,
  monthsLeftLabel,
  setAssetAiError,
  setAssetAiStatus,
  setAssetAiText,
  setAssetGoalAiError,
  setAssetGoalAiStatus,
  setAssetGoalAiText,
  setSelectedAssetDetailId,
  styles,
}) {
  return (
    <>
      <View style={styles.assetCard}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.assetAvatar}>
            <Image
              source={EXPENSE_IMAGES.assets}
              style={styles.expenseSectionIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.aiHeaderCopy}>
            <Text style={styles.aiTitle}>Tổng tài sản cá nhân</Text>
            <Text style={styles.aiSubtitle}>
              Tự tính từ thu chi trong app, khoản vay nợ có ngày cụ thể, và tài sản
              ngoài app.
            </Text>
          </View>
        </View>
        <View style={styles.assetBox}>
          <View style={styles.assetTopLine}>
            <View style={styles.assetTitleWrap}>
              <Text style={styles.assetLabel}>Tổng tài sản cá nhân</Text>
              <Text style={styles.txMeta}>
                Số dư app + tiền phải thu còn lại + tài sản ngoài app; tiền giữ hộ
                chỉ theo dõi
              </Text>
            </View>
            <Text style={styles.assetValue}>
              {formatCurrency(currentAssetSnapshot.total)}
            </Text>
          </View>
          <View style={styles.assetFormulaBox}>
            <Text style={styles.assetDetailHeading}>
              Công thức tính tài sản
            </Text>
            {currentAssetSnapshot.formulaRows.map((row) => (
              <View key={row.id} style={styles.assetFormulaRow}>
                <View style={styles.assetItemCopy}>
                  <Text style={styles.assetFormulaLabel}>{row.label}</Text>
                  <Text style={styles.assetFormulaNote}>{row.note}</Text>
                </View>
                <Text style={styles.assetFormulaValue}>
                  {formatCurrency(row.value)}
                </Text>
              </View>
            ))}
            <View style={styles.assetFormulaTotalRow}>
              <Text style={styles.assetFormulaTotalLabel}>
                Tổng tài sản cá nhân
              </Text>
              <Text style={styles.assetFormulaTotalValue}>
                {formatCurrency(currentAssetSnapshot.total)}
              </Text>
            </View>
          </View>
          {currentAssetSnapshot.items.length > 0 ? (
            <View style={styles.assetItemList}>
              <Text style={styles.assetDetailHeading}>
                Chi tiết tài sản đang có
              </Text>
              {currentAssetSnapshot.items.map((item) => (
                <View key={item.id} style={styles.assetItemRow}>
                  <Pressable
                    style={styles.assetItemTapArea}
                    onPress={() => setSelectedAssetDetailId(item.id)}
                  >
                    <View style={styles.assetItemCopy}>
                      <Text style={styles.assetItemLabel}>{item.label}</Text>
                      <Text style={styles.assetItemSource}>
                        {item.external
                          ? item.location
                            ? `Nơi lưu: ${item.location}`
                            : 'Tài sản ngoài app · chưa ghi nơi lưu'
                          : item.sourceText ||
                            'Tự tính từ thu chi và sổ vay nợ trong app'}
                      </Text>
                      {item.note ? (
                        <Text style={styles.assetItemNote}>{item.note}</Text>
                      ) : null}
                      <Text style={styles.assetItemHint}>
                        Bấm để xem chi tiết
                      </Text>
                    </View>
                    <Text style={styles.assetItemAmount}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </Pressable>
                  {item.external ? (
                    <View style={styles.assetItemActions}>
                      <Pressable
                        style={styles.editBtn}
                        onPress={() => handleEditAsset(item)}
                      >
                        <Text style={styles.editText}>Sửa</Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteAsset(item.id)}
                      >
                        <Text style={styles.deleteText}>×</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.txMeta}>
              Chưa có giao dịch hoặc tài sản ngoài app để tính.
            </Text>
          )}
          {currentAssetSnapshot.note ? (
            <Text style={styles.txNote} numberOfLines={2}>
              {currentAssetSnapshot.note}
            </Text>
          ) : null}
        </View>
        <Text style={styles.fieldLabel}>Tài sản ngoài app</Text>
        <TextInput
          value={assetAiText}
          onChangeText={(v) => {
            setAssetAiText(v);
            setAssetAiError('');
            setAssetAiStatus('');
          }}
          placeholder="ví dụ: tiền mặt ngoài app 5tr, tiết kiệm 15tr, đầu tư 20tr"
          placeholderTextColor="#6f6a7d"
          style={[styles.input, styles.assetInput]}
          multiline
          editable={!assetAiBusy}
        />
        {assetAiError ? (
          <Text style={styles.errorText}>{assetAiError}</Text>
        ) : null}
        {assetAiStatus ? (
          <Text style={styles.assetStatusText}>{assetAiStatus}</Text>
        ) : null}
        <Pressable
          style={[styles.assetSubmitBtn, assetAiBusy && styles.disabledBtn]}
          onPress={handleAssetAiNote}
          disabled={assetAiBusy}
        >
          {assetAiBusy ? (
            <ActivityIndicator color="#071416" />
          ) : (
            <Text style={styles.assetSubmitText}>
              AI thêm tài sản ngoài app
            </Text>
          )}
        </Pressable>
        <View style={styles.assetGoalSection}>
          <View style={styles.assetGoalHeader}>
            <View style={styles.assetTitleWrap}>
              <Text style={styles.assetLabel}>Mục tiêu tài sản</Text>
              <Text style={styles.txMeta}>
                Lập mốc năm nay, 5 năm, 10 năm và theo dõi tiến độ từ tài sản
                hiện tại.
              </Text>
            </View>
          </View>
          <TextInput
            value={assetGoalAiText}
            onChangeText={(v) => {
              setAssetGoalAiText(v);
              setAssetGoalAiError('');
              setAssetGoalAiStatus('');
            }}
            placeholder="ví dụ: hiện có 50tr, năm nay đạt 100tr, 5 năm nữa đạt 1 tỷ"
            placeholderTextColor="#6f6a7d"
            style={[styles.input, styles.assetInput]}
            multiline
            editable={!assetGoalAiBusy}
          />
          {currentAssetSnapshot.total <= 0 ? (
            <Text style={styles.txMeta}>
              Nếu thanh đang 0, hãy nói kèm tài sản hiện có, ví dụ: hiện có
              50tr, 5 năm nữa đạt 1 tỷ.
            </Text>
          ) : null}
          {assetGoalAiError ? (
            <Text style={styles.errorText}>{assetGoalAiError}</Text>
          ) : null}
          {assetGoalAiStatus ? (
            <Text style={styles.assetStatusText}>{assetGoalAiStatus}</Text>
          ) : null}
          <Pressable
            style={[
              styles.assetSubmitBtn,
              assetGoalAiBusy && styles.disabledBtn,
            ]}
            onPress={handleAssetGoalAiNote}
            disabled={assetGoalAiBusy}
          >
            {assetGoalAiBusy ? (
              <ActivityIndicator color="#071416" />
            ) : (
              <Text style={styles.assetSubmitText}>
                AI lập mục tiêu tài sản
              </Text>
            )}
          </Pressable>
          <View style={styles.assetGoalList}>
            {assetGoalRows.length === 0 ? (
              <Text style={styles.emptyText}>
                Chưa có mục tiêu tài sản nào.
              </Text>
            ) : (
              assetGoalRows.map((goal) => {
                const percent = Math.round((goal.progress || 0) * 100);
                const reached = goal.remaining <= 0;
                return (
                  <View key={goal.id} style={styles.assetGoalRow}>
                    <View style={styles.budgetTopLine}>
                      <View style={styles.budgetNameWrap}>
                        <Text style={styles.txTitle} numberOfLines={1}>
                          {goal.label}
                        </Text>
                        <Text style={styles.txMeta} numberOfLines={1}>
                          Hạn {goal.targetDateLabel || goal.targetDate} ·{' '}
                          {monthsLeftLabel(goal.monthsLeft)}
                        </Text>
                      </View>
                      <Text style={styles.assetGoalTarget}>
                        {formatCurrency(goal.targetAmount)}
                      </Text>
                    </View>
                    <View style={styles.budgetProgressTrack}>
                      <View
                        style={[
                          styles.assetGoalProgressFill,
                          reached && styles.assetGoalReachedFill,
                          {
                            width: `${Math.min(100, percent)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.txMeta}>
                      {currentAssetSnapshot.total > 0
                        ? `Hiện có ${formatCurrency(currentAssetSnapshot.total)} · ${reached ? 'đã đạt mục tiêu' : `còn thiếu ${formatCurrency(goal.remaining)}`}`
                        : 'Chưa cập nhật tài sản hiện có'}
                    </Text>
                    {currentAssetSnapshot.total > 0 &&
                    !reached &&
                    goal.monthlyNeed > 0 ? (
                      <Text style={styles.txMeta}>
                        Cần tăng khoảng {formatCurrency(goal.monthlyNeed)} /
                        tháng.
                      </Text>
                    ) : null}
                    {goal.note ? (
                      <Text style={styles.txNote} numberOfLines={2}>
                        {goal.note}
                      </Text>
                    ) : null}
                    <Pressable
                      style={styles.assetGoalDeleteBtn}
                      onPress={() => handleDisableAssetGoal(goal.id)}
                    >
                      <Text style={styles.assetGoalDeleteText}>
                        Xóa mục tiêu
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </View>

      {/* Lịch sử tài sản theo tháng */}
      {Array.isArray(assetHistory) && assetHistory.length > 0 ? (
        <View style={styles.assetCard}>
          <Text style={styles.cardTitle}>📈 Tăng trưởng tài sản</Text>
          <Text style={styles.txMeta}>
            Lịch sử tài sản được tự động lưu mỗi tháng.
          </Text>
          <View style={{ marginTop: 10 }}>
            {[...assetHistory]
              .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
              .map((entry, index, arr) => {
                const prev = arr[index + 1];
                const delta = prev ? entry.total - prev.total : null;
                const deltaPositive = delta != null && delta > 0;
                const deltaNegative = delta != null && delta < 0;
                const [year, month] = String(entry.monthKey).split('-').map(Number);
                const label = `Tháng ${month}/${year}`;

                // Tính thanh progress (so với max)
                const maxTotal = Math.max(...assetHistory.map((e) => e.total), 1);
                const barWidth = maxTotal > 0 ? Math.max(4, (entry.total / maxTotal) * 100) : 4;

                return (
                  <View key={entry.monthKey} style={styles.assetHistoryRow}>
                    <View style={styles.assetHistoryLeft}>
                      <Text style={styles.txMeta}>{label}</Text>
                      <View style={styles.assetHistoryBarTrack}>
                        <View
                          style={[
                            styles.assetHistoryBarFill,
                            { width: `${Math.min(100, barWidth)}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.assetHistoryRight}>
                      <Text style={[styles.txAmount, styles.incomeText]}>
                        {formatCurrency(entry.total)}
                      </Text>
                      {delta != null ? (
                        <Text
                          style={[
                            styles.txMeta,
                            deltaPositive && styles.incomeText,
                            deltaNegative && styles.expenseText,
                          ]}
                        >
                          {deltaPositive ? '+' : ''}
                          {formatCurrency(delta)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      ) : null}
    </>
  );
}
