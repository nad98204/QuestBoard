import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BAD_HABITS, GOOD_HABITS } from '../utils/constants';
import { DEFAULT_FITNESS_CONFIG } from '../utils/rpg';
import {
  loadUserOpenAiApiKey,
  saveUserOpenAiApiKey,
} from '../utils/aiCoach';
import {
  saveFitnessConfig,
  saveGoodHabitLabels,
  saveBadHabitLabels,
} from '../utils/preferences';
import {
  createBackup,
  listBackups,
  resetTodayQuests,
  restoreBackup,
  saveState,
} from '../utils/storage';
import {
  applyDailyReminderSchedule,
  loadNotificationSettings,
  notificationsSupportedNative,
  requestNotificationPermissionIfNeeded,
  saveNotificationSettings,
} from '../utils/notifications';

function LabeledInput({
  label,
  hint,
  value,
  onChangeText,
  keyboardType,
  ...textInputProps
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        placeholderTextColor="#5c5766"
        {...textInputProps}
      />
    </View>
  );
}

function looksLikeOpenAiApiKey(value) {
  const key = String(value ?? '').trim();
  return key.length >= 20 && key.startsWith('sk-') && !key.includes('...');
}

export default function SettingsScreen({
  onClose,
  state,
  fitnessConfig,
  goodHabitLabels,
  badHabitLabels,
  goodHabitIcons,
  badHabitIcons,
  onApplied,
}) {
  const fc0 = fitnessConfig ?? DEFAULT_FITNESS_CONFIG;
  const [runMin, setRunMin] = useState(String(fc0.runMinKm));
  const [runMax, setRunMax] = useState(String(fc0.runMaxKm));
  const [pushMin, setPushMin] = useState(String(fc0.pushMin));
  const [pushMax, setPushMax] = useState(String(fc0.pushMax));
  const [sitMin, setSitMin] = useState(String(fc0.sitMin));
  const [sitMax, setSitMax] = useState(String(fc0.sitMax));

  const [goodLabels, setGoodLabels] = useState(() =>
    GOOD_HABITS.map((h, i) => goodHabitLabels?.[i] ?? h.label)
  );
  const [badLabels, setBadLabels] = useState(() =>
    BAD_HABITS.map((h, i) => badHabitLabels?.[i] ?? h.label)
  );

  const [notifSettings, setNotifSettings] = useState(null);
  const [openAiKey, setOpenAiKey] = useState('');
  const [openAiKeyLoaded, setOpenAiKeyLoaded] = useState(false);

  const [savingType, setSavingType] = useState(null);
  const [resetTodayBusy, setResetTodayBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [restoringBackupId, setRestoringBackupId] = useState(null);

  useEffect(() => {
    const fc = fitnessConfig ?? DEFAULT_FITNESS_CONFIG;
    setRunMin(String(fc.runMinKm));
    setRunMax(String(fc.runMaxKm));
    setPushMin(String(fc.pushMin));
    setPushMax(String(fc.pushMax));
    setSitMin(String(fc.sitMin));
    setSitMax(String(fc.sitMax));
  }, [fitnessConfig]);

  useEffect(() => {
    setGoodLabels(GOOD_HABITS.map((h, i) => goodHabitLabels?.[i] ?? h.label));
  }, [goodHabitLabels]);

  useEffect(() => {
    setBadLabels(BAD_HABITS.map((h, i) => badHabitLabels?.[i] ?? h.label));
  }, [badHabitLabels]);

  useEffect(() => {
    refreshBackups();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const key = await loadUserOpenAiApiKey();
      if (!cancelled) {
        setOpenAiKey(key);
        setOpenAiKeyLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const n = await loadNotificationSettings();
      setNotifSettings(n);
    })();
  }, []);

  const flushNotifTimes = () => {
    if (!notifSettings) return;
    const next = {
      ...notifSettings,
      morningHour: Math.min(23, Math.max(0, Math.round(Number(notifSettings.morningHour)) || 0)),
      morningMinute: Math.min(59, Math.max(0, Math.round(Number(notifSettings.morningMinute)) || 0)),
      eveningHour: Math.min(23, Math.max(0, Math.round(Number(notifSettings.eveningHour)) || 0)),
      eveningMinute: Math.min(59, Math.max(0, Math.round(Number(notifSettings.eveningMinute)) || 0)),
    };
    setNotifSettings(next);
    Promise.resolve().then(async () => {
      await saveNotificationSettings(next);
      await applyDailyReminderSchedule(next);
    });
  };

  async function refreshBackups() {
    setBackupsLoading(true);
    try {
      setBackups(await listBackups());
    } catch (e) {
      console.warn('[SettingsScreen] listBackups', e?.message ?? e);
      setBackups([]);
    } finally {
      setBackupsLoading(false);
    }
  }

  async function saveOpenAiKey() {
    const nextKey = openAiKey.trim();
    if (nextKey && !looksLikeOpenAiApiKey(nextKey)) {
      Alert.alert(
        'API key chưa hợp lệ',
        'Key OpenAI thường bắt đầu bằng sk- và không phải dạng rút gọn như sk-....'
      );
      return;
    }

    setSavingType('openai');
    try {
      const saved = await saveUserOpenAiApiKey(nextKey);
      setOpenAiKey(saved);
      await onApplied?.();
      Alert.alert(
        saved ? 'Đã lưu API key' : 'Đã xóa API key riêng',
        saved
          ? 'Pet sẽ ưu tiên dùng key này từ lần gọi AI tiếp theo.'
          : 'App sẽ quay lại dùng key được đóng gói trong APK nếu có.'
      );
    } finally {
      setSavingType(null);
    }
  }

  function formatBackupDate(timestamp) {
    try {
      return new Date(timestamp).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Không rõ thời gian';
    }
  }

  async function handleCreateBackup() {
    if (!state) return;
    setBackupBusy(true);
    try {
      const timestamp = await createBackup(state);
      await refreshBackups();
      Alert.alert('Đã tạo backup', `Backup lúc ${formatBackupDate(timestamp)} đã được lưu.`);
    } catch (e) {
      Alert.alert('Không tạo được backup', e?.message ?? 'Vui lòng thử lại.');
    } finally {
      setBackupBusy(false);
    }
  }

  function confirmRestoreBackup(backup) {
    Alert.alert(
      'Khôi phục backup?',
      `Dữ liệu hiện tại sẽ bị ghi đè bằng backup ${formatBackupDate(backup.timestamp)}.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Khôi phục',
          onPress: async () => {
            setRestoringBackupId(backup.id);
            try {
              await restoreBackup(backup.id);
              await onApplied?.();
              await refreshBackups();
              Alert.alert('Đã khôi phục', 'QuestBoard đã được khôi phục từ backup.');
            } catch (e) {
              Alert.alert('Không khôi phục được', e?.message ?? 'Vui lòng thử lại.');
            } finally {
              setRestoringBackupId(null);
            }
          },
        },
      ]
    );
  }

  async function saveFitness() {
    setSavingType('fitness');
    try {
      await saveFitnessConfig({
        runMinKm: parseFloat(runMin) || DEFAULT_FITNESS_CONFIG.runMinKm,
        runMaxKm: parseFloat(runMax) || DEFAULT_FITNESS_CONFIG.runMaxKm,
        pushMin: parseInt(pushMin, 10) || DEFAULT_FITNESS_CONFIG.pushMin,
        pushMax: parseInt(pushMax, 10) || DEFAULT_FITNESS_CONFIG.pushMax,
        sitMin: parseInt(sitMin, 10) || DEFAULT_FITNESS_CONFIG.sitMin,
        sitMax: parseInt(sitMax, 10) || DEFAULT_FITNESS_CONFIG.sitMax,
      });
      await onApplied?.();
    } finally {
      setSavingType(null);
    }
  }

  async function saveGood() {
    setSavingType('good');
    try {
      await saveGoodHabitLabels(goodLabels);
      await onApplied?.();
    } finally {
      setSavingType(null);
    }
  }

  async function saveBad() {
    setSavingType('bad');
    try {
      await saveBadHabitLabels(badLabels);
      await onApplied?.();
    } finally {
      setSavingType(null);
    }
  }

  function confirmResetToday() {
    Alert.alert(
      'Reset quest hôm nay?',
      'Quest hôm nay sẽ về trạng thái chưa làm. XP, level, streak, thành tích và lịch sử được giữ nguyên.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            setResetTodayBusy(true);
            try {
              const next = resetTodayQuests(state);
              await saveState(next, { skipHistoryMerge: true });
              await onApplied?.();
              onClose?.();
            } finally {
              setResetTodayBusy(false);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>⚙️ Cài đặt</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeTap}>
          <Text style={styles.closeText}>Đóng</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI OpenAI</Text>
          <Text style={styles.sectionSub}>
            Dán API key OpenAI của bạn để Pet và các tính năng AI dùng key này ngay trên thiết bị.
            Để trống sẽ dùng key đóng gói trong APK nếu có.
          </Text>
          <LabeledInput
            label="OpenAI API key"
            hint="Ví dụ: sk-proj-... hoặc sk-..."
            value={openAiKey}
            onChangeText={setOpenAiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={openAiKeyLoaded && savingType !== 'openai'}
          />
          <Pressable
            style={styles.saveBtn}
            onPress={saveOpenAiKey}
            disabled={!openAiKeyLoaded || savingType === 'openai'}
          >
            {savingType === 'openai' ? (
              <ActivityIndicator color="#0c0c10" />
            ) : (
              <Text style={styles.saveBtnText}>
                {openAiKey.trim() ? 'Lưu API key' : 'Xóa API key riêng'}
              </Text>
            )}
          </Pressable>
        </View>
        {/* NHẮC NHỞ HẰNG NGÀY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Nhắc nhở hằng ngày</Text>
          <Text style={styles.sectionSub}>
            Gửi thông báo local định kỳ trên thiết bị để nhắc bạn thực hiện nhiệm vụ.
          </Text>
          {notifSettings ? (
            <View style={styles.notifContent}>
              {!notificationsSupportedNative() ? (
                <Text style={styles.notifDisabledHint}>
                  Thông báo định kỳ chỉ hỗ trợ trên app iOS/Android thực tế.
                </Text>
              ) : (
                <>
                  <View style={styles.notifToggleRow}>
                    <Text style={styles.notifToggleLabel}>Bật nhắc nhở</Text>
                    <Switch
                      value={notifSettings.enabled}
                      onValueChange={async (v) => {
                        if (v) {
                          const ok = await requestNotificationPermissionIfNeeded();
                          if (!ok) {
                            Alert.alert(
                              'Cần quyền thông báo',
                              'Hãy bật quyền trong Cài đặt hệ thống để nhận nhắc nhở hằng ngày.'
                            );
                            return;
                          }
                        }
                        const next = { ...notifSettings, enabled: v };
                        setNotifSettings(next);
                        await saveNotificationSettings(next);
                        await applyDailyReminderSchedule(next);
                      }}
                      thumbColor={notifSettings.enabled ? '#d4af37' : '#5c5766'}
                      trackColor={{
                        false: '#2a2a38',
                        true: '#3d3520',
                      }}
                    />
                  </View>

                  <View style={styles.timePickersContainer}>
                    <View style={styles.timePickerBox}>
                      <Text style={styles.timePickerTitle}>🌅 SÁNG</Text>
                      <View style={styles.timeInputsRow}>
                        <TextInput
                          editable={notifSettings.enabled}
                          keyboardType="number-pad"
                          maxLength={2}
                          value={String(notifSettings.morningHour)}
                          onChangeText={(t) => {
                            const n = Number(String(t).replace(/\D/g, '') || 0);
                            setNotifSettings((p) => ({
                              ...p,
                              morningHour: Math.min(23, Math.max(0, n)),
                            }));
                          }}
                          onBlur={flushNotifTimes}
                          style={[styles.notifTimeField, !notifSettings.enabled && styles.notifTimeFieldDisabled]}
                        />
                        <Text style={styles.notifTimeSep}>:</Text>
                        <TextInput
                          editable={notifSettings.enabled}
                          keyboardType="number-pad"
                          maxLength={2}
                          value={String(notifSettings.morningMinute)}
                          onChangeText={(t) => {
                            const n = Number(String(t).replace(/\D/g, '') || 0);
                            setNotifSettings((p) => ({
                              ...p,
                              morningMinute: Math.min(59, Math.max(0, n)),
                            }));
                          }}
                          onBlur={flushNotifTimes}
                          style={[styles.notifTimeField, !notifSettings.enabled && styles.notifTimeFieldDisabled]}
                        />
                      </View>
                    </View>

                    <View style={styles.timePickerBox}>
                      <Text style={styles.timePickerTitle}>🌌 TỐI</Text>
                      <View style={styles.timeInputsRow}>
                        <TextInput
                          editable={notifSettings.enabled}
                          keyboardType="number-pad"
                          maxLength={2}
                          value={String(notifSettings.eveningHour)}
                          onChangeText={(t) => {
                            const n = Number(String(t).replace(/\D/g, '') || 0);
                            setNotifSettings((p) => ({
                              ...p,
                              eveningHour: Math.min(23, Math.max(0, n)),
                            }));
                          }}
                          onBlur={flushNotifTimes}
                          style={[styles.notifTimeField, !notifSettings.enabled && styles.notifTimeFieldDisabled]}
                        />
                        <Text style={styles.notifTimeSep}>:</Text>
                        <TextInput
                          editable={notifSettings.enabled}
                          keyboardType="number-pad"
                          maxLength={2}
                          value={String(notifSettings.eveningMinute)}
                          onChangeText={(t) => {
                            const n = Number(String(t).replace(/\D/g, '') || 0);
                            setNotifSettings((p) => ({
                              ...p,
                              eveningMinute: Math.min(59, Math.max(0, n)),
                            }));
                          }}
                          onBlur={flushNotifTimes}
                          style={[styles.notifTimeField, !notifSettings.enabled && styles.notifTimeFieldDisabled]}
                        />
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thể dục — phạm vi random</Text>
          <Text style={styles.sectionSub}>
            Áp khi rollover ngày mới; bảng quest hôm nay không đổi giữa chừng.
          </Text>
          <View style={styles.row2}>
            <LabeledInput
              label="Chạy min (km)"
              value={runMin}
              onChangeText={setRunMin}
              keyboardType="decimal-pad"
            />
            <LabeledInput
              label="Chạy max (km)"
              value={runMax}
              onChangeText={setRunMax}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.row2}>
            <LabeledInput
              label="Hít đất min"
              value={pushMin}
              onChangeText={setPushMin}
              keyboardType="number-pad"
            />
            <LabeledInput
              label="Hít đất max"
              value={pushMax}
              onChangeText={setPushMax}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.row2}>
            <LabeledInput
              label="Gập bụng min"
              value={sitMin}
              onChangeText={setSitMin}
              keyboardType="number-pad"
            />
            <LabeledInput
              label="Gập bụng max"
              value={sitMax}
              onChangeText={setSitMax}
              keyboardType="number-pad"
            />
          </View>
          <Pressable
            style={styles.saveBtn}
            onPress={saveFitness}
            disabled={savingType === 'fitness'}
          >
            {savingType === 'fitness' ? (
              <ActivityIndicator color="#0c0c10" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu thể dục</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thói quen tốt — tên hiển thị</Text>
          {GOOD_HABITS.map((h, i) => (
            <LabeledInput
              key={h.id}
              label={`${goodHabitIcons?.[i] ?? h.icon} ${h.label}`}
              value={goodLabels[i] ?? ''}
              onChangeText={(t) =>
                setGoodLabels((prev) => prev.map((v, j) => (j === i ? t : v)))
              }
            />
          ))}
          <Pressable
            style={styles.saveBtn}
            onPress={saveGood}
            disabled={savingType === 'good'}
          >
            {savingType === 'good' ? (
              <ActivityIndicator color="#0c0c10" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu thói quen tốt</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Bỏ thói quen xấu — tên hiển thị
          </Text>
          {BAD_HABITS.map((h, i) => (
            <LabeledInput
              key={h.id}
              label={`${badHabitIcons?.[i] ?? h.icon} ${h.label}`}
              value={badLabels[i] ?? ''}
              onChangeText={(t) =>
                setBadLabels((prev) => prev.map((v, j) => (j === i ? t : v)))
              }
            />
          ))}
          <Pressable
            style={styles.saveBtn}
            onPress={saveBad}
            disabled={savingType === 'bad'}
          >
            {savingType === 'bad' ? (
              <ActivityIndicator color="#0c0c10" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu thói quen xấu</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sao lưu & Khôi phục</Text>
          <Text style={styles.sectionSub}>
            Lưu tối đa 5 bản backup gần nhất trên Firestore.
          </Text>
          <Pressable
            style={styles.backupBtn}
            onPress={handleCreateBackup}
            disabled={backupBusy || restoringBackupId != null}
          >
            {backupBusy ? (
              <ActivityIndicator color="#0c0c10" />
            ) : (
              <Text style={styles.backupBtnText}>Tạo backup ngay</Text>
            )}
          </Pressable>

          <View style={styles.backupList}>
            {backupsLoading ? (
              <View style={styles.backupLoadingRow}>
                <ActivityIndicator color="#d4af37" />
                <Text style={styles.backupLoadingText}>Đang tải backup...</Text>
              </View>
            ) : null}
            {!backupsLoading && backups.length === 0 ? (
              <Text style={styles.backupEmpty}>Chưa có backup nào.</Text>
            ) : null}
            {backups.map((b) => {
              const restoring = restoringBackupId === b.id;
              return (
                <View key={b.id} style={styles.backupRow}>
                  <View style={styles.backupInfo}>
                    <Text style={styles.backupDate}>
                      {formatBackupDate(b.timestamp)}
                    </Text>
                    <Text style={styles.backupMeta}>
                      Lv.{b.level} · {b.xp} XP · streak {b.streak} ngày
                    </Text>
                    <Text style={styles.backupMeta}>
                      {b.questsDone} quest đã hoàn thành
                    </Text>
                  </View>
                  <Pressable
                    style={styles.restoreBtn}
                    onPress={() => confirmRestoreBackup(b)}
                    disabled={backupBusy || restoringBackupId != null}
                  >
                    {restoring ? (
                      <ActivityIndicator color="#d4af37" />
                    ) : (
                      <Text style={styles.restoreBtnText}>Khôi phục</Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nguy hiểm</Text>
          <Pressable
            style={styles.resetTodayBtn}
            onPress={confirmResetToday}
            disabled={resetTodayBusy}
          >
            {resetTodayBusy ? (
              <ActivityIndicator color="#0c0c10" />
            ) : (
              <Text style={styles.resetTodayBtnText}>Reset quest hôm nay</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c10' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a38',
  },
  headerTitle: {
    color: '#f3eee6',
    fontSize: 20,
    fontWeight: '800',
  },
  closeTap: { paddingVertical: 8, paddingHorizontal: 12 },
  closeText: { color: '#d4af37', fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 36 },
  section: {
    backgroundColor: '#14141c',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a2a38',
  },
  sectionTitle: {
    color: '#d4af37',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 8,
  },
  sectionSub: {
    color: '#5c5766',
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  field: {
    flex: 1,
    marginBottom: 12,
  },
  fieldLabel: { color: '#9a958c', fontSize: 11, marginBottom: 4 },
  fieldHint: { color: '#5c5766', fontSize: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#12121a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e8e4dc',
    borderWidth: 1,
    borderColor: '#2a2a38',
    fontSize: 15,
  },
  saveBtn: {
    marginTop: 6,
    backgroundColor: '#d4af37',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#0c0c10', fontWeight: '800', fontSize: 15 },
  backupBtn: {
    marginTop: 2,
    backgroundColor: '#d4af37',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backupBtnText: { color: '#0c0c10', fontWeight: '800', fontSize: 15 },
  backupList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#252532',
  },
  backupLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
  },
  backupLoadingText: { color: '#9a958c', fontSize: 12 },
  backupEmpty: {
    color: '#5c5766',
    fontSize: 12,
    fontStyle: 'italic',
    paddingTop: 12,
  },
  backupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252532',
  },
  backupInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  backupDate: {
    color: '#f3eee6',
    fontWeight: '800',
    fontSize: 13,
  },
  backupMeta: {
    color: '#9a958c',
    fontSize: 11,
    marginTop: 3,
  },
  restoreBtn: {
    minWidth: 86,
    minHeight: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#5c4f2a',
    backgroundColor: '#1e1c14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  restoreBtnText: {
    color: '#d4af37',
    fontWeight: '800',
    fontSize: 12,
  },
  resetTodayBtn: {
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: '#d4af37',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetTodayBtnText: { color: '#0c0c10', fontWeight: '800', fontSize: 15 },
  // NHẮC NHỞ HẰNG NGÀY STYLING
  notifContent: {
    marginTop: 6,
  },
  notifDisabledHint: {
    color: '#5c5766',
    fontSize: 12,
    fontStyle: 'italic',
  },
  notifToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#12121a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a38',
  },
  notifToggleLabel: {
    color: '#e8e4dc',
    fontSize: 14,
    fontWeight: '700',
  },
  timePickersContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerBox: {
    flex: 1,
    backgroundColor: '#12121a',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a38',
  },
  timePickerTitle: {
    color: '#9a958c',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifTimeField: {
    width: 38,
    backgroundColor: '#0c0c10',
    borderColor: '#2a2a38',
    borderWidth: 1,
    borderRadius: 6,
    padding: 4,
    color: '#e8e4dc',
    fontSize: 14,
    textAlign: 'center',
  },
  notifTimeFieldDisabled: {
    opacity: 0.3,
  },
  notifTimeSep: {
    color: '#9a958c',
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 6,
  },
});
