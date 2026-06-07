import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

export default function ChiTietTaiSan({
  appAssetMonthRows,
  closeAssetDetailModal,
  formatCurrency,
  formatSignedAmount,
  monthLabel,
  selectedAssetDetail,
  styles,
}) {
  return (
    <Modal
      visible={selectedAssetDetail != null}
      transparent
      animationType="fade"
      onRequestClose={closeAssetDetailModal}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedAssetDetail?.label ?? 'Chi tiết tài sản'}
            </Text>
            <Pressable
              onPress={closeAssetDetailModal}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {selectedAssetDetail ? (
              <>
                <View style={styles.assetDetailHero}>
                  <Text style={styles.assetDetailInfoLabel}>
                    Giá trị hiện tại
                  </Text>
                  <Text style={styles.assetDetailAmount}>
                    {formatCurrency(selectedAssetDetail.amount)}
                  </Text>
                  <Text style={styles.assetItemSource}>
                    {selectedAssetDetail.sourceText ||
                      (selectedAssetDetail.external
                        ? 'Tài sản ngoài app'
                        : 'Tài sản tự tính trong app')}
                  </Text>
                </View>

                {selectedAssetDetail.detailType === 'app_balance' ? (
                  <View style={styles.assetDetailSection}>
                    <Text style={styles.assetDetailHeading}>
                      Các tháng tích được
                    </Text>
                    {appAssetMonthRows.length === 0 ? (
                      <Text style={styles.txMeta}>
                        Chưa có giao dịch để tách theo tháng.
                      </Text>
                    ) : (
                      appAssetMonthRows.map((row) => (
                        <View key={row.monthKey} style={styles.assetMonthRow}>
                          <View style={styles.assetItemCopy}>
                            <Text style={styles.assetMonthTitle}>
                              {monthLabel(row.monthKey)}
                            </Text>
                            <Text style={styles.assetMonthMeta}>
                              Thu {formatCurrency(row.income)} · chi{' '}
                              {formatCurrency(row.expense)} · {row.count} giao
                              dịch
                            </Text>
                            <Text style={styles.assetMonthMeta}>
                              Lũy kế đến tháng này{' '}
                              {formatCurrency(row.cumulative)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.assetMonthAmount,
                              row.balance >= 0
                                ? styles.incomeText
                                : styles.expenseText,
                            ]}
                          >
                            {formatSignedAmount(row.balance)}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}

                {selectedAssetDetail.detailType === 'loan_group' ? (
                  <View style={styles.assetDetailSection}>
                    <Text style={styles.assetDetailHeading}>
                      Các khoản bên trong
                    </Text>
                    {Array.isArray(selectedAssetDetail.subItems) &&
                    selectedAssetDetail.subItems.length > 0 ? (
                      selectedAssetDetail.subItems.map((item) => (
                        <View key={item.id} style={styles.assetMonthRow}>
                          <View style={styles.assetItemCopy}>
                            <Text style={styles.assetMonthTitle}>
                              {item.label}
                            </Text>
                            <Text style={styles.assetMonthMeta}>
                              {item.note}
                            </Text>
                          </View>
                          <Text style={styles.assetMonthAmount}>
                            {formatCurrency(item.amount)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.txMeta}>
                        Không còn khoản đang mở.
                      </Text>
                    )}
                  </View>
                ) : null}

                {selectedAssetDetail.detailType === 'external_asset' ? (
                  <View style={styles.assetDetailSection}>
                    <View style={styles.assetDetailInfoRow}>
                      <Text style={styles.assetDetailInfoLabel}>Nơi lưu</Text>
                      <Text style={styles.assetDetailInfoValue}>
                        {selectedAssetDetail.location || 'Chưa ghi nơi lưu'}
                      </Text>
                    </View>
                    <View style={styles.assetDetailInfoRow}>
                      <Text style={styles.assetDetailInfoLabel}>Ghi chú</Text>
                      <Text style={styles.assetDetailInfoValue}>
                        {selectedAssetDetail.note || 'Chưa có ghi chú'}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {selectedAssetDetail.detailType === 'loan_item' &&
                selectedAssetDetail.note ? (
                  <View style={styles.assetDetailSection}>
                    <Text style={styles.assetDetailHeading}>
                      Thông tin khoản
                    </Text>
                    <Text style={styles.assetDetailInfoValue}>
                      {selectedAssetDetail.note}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={closeAssetDetailModal}
              >
                <Text style={styles.modalCancelText}>Đóng</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
