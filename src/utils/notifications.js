import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { BAD_HABITS, GOOD_HABITS, STORAGE_KEY } from './constants';
import {
  habitsWithCustomLabels,
  loadPreferencesBundle,
} from './preferences';
import {
  addDaysToKey,
  getTodayKey,
  pickOvercomeQuests,
  rollDailyExercise,
} from './rpg';

/** Cài đặt nhắc nhở (AsyncStorage) */
export const NOTIFICATION_SETTINGS_KEY = '@questboard/notification_settings_v1';

const FIRST_PERMISSION_PROMPT_KEY = '@questboard/notifications_first_prompt_v1';

export const NOTIFICATION_ID_MORNING = 'questboard-daily-morning';
export const NOTIFICATION_ID_EVENING = 'questboard-daily-evening';
export const NOTIFICATION_ID_PREVIEW_TOMORROW = 'questboard-preview-tomorrow';

export const PREVIEW_TOMORROW_HOUR = 20;
export const PREVIEW_TOMORROW_MINUTE = 0;

export const DEFAULT_MORNING_HOUR = 8;
export const DEFAULT_MORNING_MINUTE = 0;
export const DEFAULT_EVENING_HOUR = 21;
export const DEFAULT_EVENING_MINUTE = 0;

export const DEFAULT_MORNING_BODY = '⚔️ Quest hôm nay đang chờ bạn!';
export const DEFAULT_EVENING_BODY =
  '🔥 Đừng quên hoàn thành quest trước khi ngủ!';

const ANDROID_DEFAULT_CHANNEL_ID = 'questboard-default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function notificationsSupportedNative() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

async function ensureAndroidDefaultChannelAsync() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
    name: 'QuestBoard',
    importance: AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#d4af37',
  });
}

function clampHour(hour) {
  const h = Number(hour);
  if (!Number.isFinite(h)) return 0;
  return Math.min(23, Math.max(0, Math.round(h)));
}

function clampMinute(minute) {
  const m = Number(minute);
  if (!Number.isFinite(m)) return 0;
  return Math.min(59, Math.max(0, Math.round(m)));
}

export function defaultNotificationSettings() {
  return {
    enabled: true,
    morningHour: DEFAULT_MORNING_HOUR,
    morningMinute: DEFAULT_MORNING_MINUTE,
    eveningHour: DEFAULT_EVENING_HOUR,
    eveningMinute: DEFAULT_EVENING_MINUTE,
  };
}

/** Đọc cài đặt từ AsyncStorage */
export async function loadNotificationSettings() {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return defaultNotificationSettings();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultNotificationSettings();
    const base = defaultNotificationSettings();
    return {
      ...base,
      ...parsed,
      morningHour: clampHour(parsed.morningHour ?? base.morningHour),
      morningMinute: clampMinute(parsed.morningMinute ?? base.morningMinute),
      eveningHour: clampHour(parsed.eveningHour ?? base.eveningHour),
      eveningMinute: clampMinute(parsed.eveningMinute ?? base.eveningMinute),
      enabled: Boolean(parsed.enabled),
    };
  } catch {
    return defaultNotificationSettings();
  }
}

/** Lưu cài đặt vào AsyncStorage */
export async function saveNotificationSettings(settings) {
  await AsyncStorage.setItem(
    NOTIFICATION_SETTINGS_KEY,
    JSON.stringify(settings)
  );
}

/**
 * Xin quyền notification lần đầu mở app (chỉ hỏi một lần theo cờ cục bộ).
 * @returns {Promise<boolean>} có grant hay không (hoặc false nền không hỗ trợ)
 */
export async function promptNotificationPermissionOnFirstOpen() {
  if (!notificationsSupportedNative()) return false;

  const already = await AsyncStorage.getItem(FIRST_PERMISSION_PROMPT_KEY);
  if (already === '1') {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  await AsyncStorage.setItem(FIRST_PERMISSION_PROMPT_KEY, '1');

  if (!Device.isDevice) {
    console.warn('[QuestBoard] Emulator/simulator — có thể hạn chế notification.');
  }

  await ensureAndroidDefaultChannelAsync();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function requestNotificationPermissionIfNeeded() {
  if (!notificationsSupportedNative()) return false;
  await ensureAndroidDefaultChannelAsync();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Hủy mọi local notification đã lên lịch */
export async function cancelAll() {
  if (!notificationsSupportedNative()) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Một nhắc lặp theo ngày tại giờ:phút (local timezone).
 * @param {number} hour 0–23
 * @param {number} minute 0–59
 * @param {{ title?: string, body?: string }} content
 * @param {string} identifier id cố định để cập nhật / huỷ
 */
export async function scheduleDaily(hour, minute, content, identifier) {
  if (!notificationsSupportedNative()) return;

  await ensureAndroidDefaultChannelAsync();

  const h = clampHour(hour);
  const m = clampMinute(minute);
  await Notifications.cancelScheduledNotificationAsync(identifier);

  const trigger =
    Platform.OS === 'android'
      ? {
          type: SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: m,
          channelId: ANDROID_DEFAULT_CHANNEL_ID,
        }
      : {
          type: SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: m,
        };

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: content?.title ?? 'QuestBoard',
      body: content?.body ?? '',
      sound: true,
    },
    trigger,
  });
}

async function readProfileDifficultyMult() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return 1;
    const data = JSON.parse(raw);
    const m = data?.profile?.difficultyMult;
    if (typeof m === 'number' && Number.isFinite(m) && m > 0) return m;
    return 1;
  } catch {
    return 1;
  }
}

/**
 * @param {number} difficultyMult
 * @param {object} fitnessConfig
 * @param {string[]} goodLabels
 * @param {string[]} badLabels
 */
export function buildTomorrowPreviewNotificationBody(
  difficultyMult,
  fitnessConfig,
  goodLabels,
  badLabels
) {
  const tomorrowKey = addDaysToKey(getTodayKey(), 1);
  const ex = rollDailyExercise(tomorrowKey, difficultyMult, fitnessConfig);
  const overcome = pickOvercomeQuests(tomorrowKey, 3);
  const firstOvercomeTitle = overcome[0]?.title ?? '—';

  const goodLine = habitsWithCustomLabels(GOOD_HABITS, goodLabels)
    .map((h) => h.label)
    .join(' · ');
  const badLine = habitsWithCustomLabels(BAD_HABITS, badLabels)
    .map((h) => h.label)
    .join(' · ');

  return `🌙 Ngày mai cần chuẩn bị:
💪 Chạy ${ex.runKm}km · ${ex.pushups} hít đất · ${ex.situps} gập bụng
🌿 ${goodLine}
🚫 ${badLine}
🏆 ${firstOvercomeTitle}`;
}

/** Huỷ hết rồi đặt lại lịch sáng / tối + preview 20:00 (khi enabled) */
export async function applyDailyReminderSchedule(settings) {
  await cancelAll();

  if (!notificationsSupportedNative() || !settings?.enabled) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const difficultyMult = await readProfileDifficultyMult();
  const prefs = await loadPreferencesBundle();
  const previewBody = buildTomorrowPreviewNotificationBody(
    difficultyMult,
    prefs.fitness,
    prefs.goodLabels,
    prefs.badLabels
  );

  await Promise.all([
    scheduleDaily(settings.morningHour, settings.morningMinute, {
      title: 'QuestBoard',
      body: DEFAULT_MORNING_BODY,
    }, NOTIFICATION_ID_MORNING),
    scheduleDaily(settings.eveningHour, settings.eveningMinute, {
      title: 'QuestBoard',
      body: DEFAULT_EVENING_BODY,
    }, NOTIFICATION_ID_EVENING),
    scheduleDaily(
      PREVIEW_TOMORROW_HOUR,
      PREVIEW_TOMORROW_MINUTE,
      {
        title: 'QuestBoard',
        body: previewBody,
      },
      NOTIFICATION_ID_PREVIEW_TOMORROW
    ),
  ]);
}

/** Khởi động app: quyền lần đầu + áp lịch theo AsyncStorage */
export async function startupScheduleDailyNotifications() {
  try {
    if (!notificationsSupportedNative()) return;

    await promptNotificationPermissionOnFirstOpen();
    const settings = await loadNotificationSettings();
    await applyDailyReminderSchedule(settings);
  } catch (e) {
    console.warn('[QuestBoard] startupScheduleDailyNotifications', e?.message ?? e);
  }
}
