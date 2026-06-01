import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { BAD_HABITS, GOOD_HABITS } from './constants';
import { addDaysToKey, getTodayKey, normalizeFitnessConfig } from './rpg';

export const AI_COACH_HISTORY_KEY = '@questboard/ai_coach_history_v1';
export const AI_HABITS_CACHE_KEY = '@questboard/ai_habits_by_date_v1';
export const AI_FITNESS_CACHE_KEY = '@questboard/ai_fitness_by_date_v1';
export const AI_OVERCOME_CACHE_KEY = '@questboard/openai_overcome_by_date_v1';
export const USER_OPENAI_API_KEY_KEY = '@questboard/user_openai_api_key_v1';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

const MAX_MESSAGES = 50;
const MISSING_OPENAI_KEY_MESSAGE =
  'Thiếu OpenAI API key. Vào More > Cài đặt > AI OpenAI để dán key mới.';

export function getOpenAiApiKey() {
  // Ưu tiên đọc từ extra (hoạt động cả dev lẫn production APK)
  const fromExtra = Constants.expoConfig?.extra?.openaiApiKey;
  if (fromExtra) return fromExtra;

  // Fallback: process.env (chỉ hoạt động trong Expo Go / dev)
  return (
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.EXPO_PUBLIC_OPENAI_API_KEY) ||
    ''
  );
}

export async function loadUserOpenAiApiKey() {
  try {
    const raw = await AsyncStorage.getItem(USER_OPENAI_API_KEY_KEY);
    return String(raw ?? '').trim();
  } catch {
    return '';
  }
}

export async function saveUserOpenAiApiKey(apiKey) {
  const normalized = String(apiKey ?? '').trim();
  if (!normalized) {
    await AsyncStorage.removeItem(USER_OPENAI_API_KEY_KEY);
    return '';
  }
  await AsyncStorage.setItem(USER_OPENAI_API_KEY_KEY, normalized);
  return normalized;
}

export async function getOpenAiApiKeyAsync() {
  const userKey = await loadUserOpenAiApiKey();
  if (userKey) return userKey;
  return getOpenAiApiKey();
}

async function getApiKey() {
  return getOpenAiApiKeyAsync();
}

function stripJsonFromMarkdown(text) {
  const t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  return t;
}

function lastSevenDateKeys() {
  const t = getTodayKey();
  const keys = [];
  for (let i = 6; i >= 0; i -= 1) {
    keys.push(addDaysToKey(t, -i));
  }
  return keys;
}

function completionPct(done, total) {
  if (!total || total <= 0) return null;
  return Math.round((done / total) * 1000) / 10;
}

/** Tỉ lệ hoàn thành theo mảng quest trong 7 ngày gần nhất (theo history). */
export function buildSevenDayRates(history) {
  const arr = Array.isArray(history) ? history : [];
  const keysSet = new Set(lastSevenDateKeys());
  const sums = {
    work: { done: 0, total: 0 },
    exercise: { done: 0, total: 0 },
    habitGood: { done: 0, total: 0 },
    habitBad: { done: 0, total: 0 },
    overcome: { done: 0, total: 0 },
  };

  for (const row of arr) {
    if (!row?.date || !keysSet.has(row.date)) continue;
    sums.work.done += Number(row.workDone) || 0;
    sums.work.total += Number(row.workTotal) || 0;
    sums.exercise.done += Number(row.exerciseDone) || 0;
    sums.exercise.total += Number(row.exerciseTotal) || 0;
    sums.habitGood.done += Number(row.habitGoodDone) || 0;
    sums.habitGood.total += Number(row.habitGoodTotal) || 0;
    sums.habitBad.done += Number(row.habitBadOk) || 0;
    sums.habitBad.total += Number(row.habitBadTotal) || 0;
    sums.overcome.done += Number(row.overcomeDone) || 0;
    sums.overcome.total += Number(row.overcomeTotal) || 0;
  }

  return [
    {
      key: 'work',
      label: 'Công việc',
      pct: completionPct(sums.work.done, sums.work.total),
    },
    {
      key: 'exercise',
      label: 'Thể dục',
      pct: completionPct(sums.exercise.done, sums.exercise.total),
    },
    {
      key: 'habitGood',
      label: 'Thói quen tốt',
      pct: completionPct(sums.habitGood.done, sums.habitGood.total),
    },
    {
      key: 'habitBad',
      label: 'Tránh thói xấu',
      pct: completionPct(sums.habitBad.done, sums.habitBad.total),
    },
    {
      key: 'overcome',
      label: 'Vượt bản thân',
      pct: completionPct(sums.overcome.done, sums.overcome.total),
    },
  ];
}

export function buildCoachContextBlock(state) {
  if (!state?.profile) return '';
  const p = state.profile;
  const d = state.daily ?? {};
  const ex = d.exercise ?? {};
  const fc = normalizeFitnessConfig(state.fitnessConfig);
  const rates = buildSevenDayRates(state.history);
  const ratesText = rates
    .map((r) =>
      r.pct == null
        ? `${r.label}: (chưa có dữ liệu)`
        : `${r.label}: ${r.pct}% (${r.key})`
    )
    .join('\n');

  const goodLabels = (state.goodHabitLabels ?? GOOD_HABITS.map((h) => h.label))
    .map((t, i) => {
      const ic =
        Array.isArray(state.goodHabitIcons) && state.goodHabitIcons[i]
          ? state.goodHabitIcons[i]
          : GOOD_HABITS[i]?.icon ?? '';
      return `${ic} ${t}`;
    })
    .join(', ');
  const badLabels = (state.badHabitLabels ?? BAD_HABITS.map((h) => h.label))
    .map((t, i) => {
      const ic =
        Array.isArray(state.badHabitIcons) && state.badHabitIcons[i]
          ? state.badHabitIcons[i]
          : BAD_HABITS[i]?.icon ?? '';
      return `${ic} ${t}`;
    })
    .join(', ');

  const xpCap = 80 + ((p.level ?? 1) - 1) * 45;

  return `
--- Bối cảnh người dùng (cập nhật theo phiên) ---
- Streak: ${p.streak ?? 0} ngày
- Cấp độ: ${p.level ?? 1}, XP trong cấp: ${p.xpInLevel ?? 0}/${xpCap}, tổng XP: ${p.totalXpEarned ?? 0}
- Ngày quest hiện tại: ${d.date ?? '—'}

Thể dục HÔM NAY (mục tiêu đã roll):
- Chạy: ${ex.runKm ?? '—'} km (đã xong: ${ex.runDone ? 'có' : 'chưa'})
- Hít đất: ${ex.pushups ?? '—'} (đã xong: ${ex.pushDone ? 'có' : 'chưa'})
- Gập bụng: ${ex.situps ?? '—'} (đã xong: ${ex.sitDone ? 'có' : 'chưa'})

Cấu hình min/max thể dục (random các ngày sau):
- Chạy km: min ${fc.runMinKm}, max ${fc.runMaxKm}
- Hít đất: min ${fc.pushMin}, max ${fc.pushMax}
- Gập bụng: min ${fc.sitMin}, max ${fc.sitMax}

Nhãn thói quen tốt (4): ${goodLabels}
Nhãn thói quen cần tránh (3): ${badLabels}

Tỉ lệ hoàn thành 7 ngày gần nhất (theo từng mảng):
${ratesText}
--- Hết bối cảnh ---`;
}

function buildSystemPrompt(state) {
  const ctx = buildCoachContextBlock(state);
  return `Bạn là thú cưng đồng hành/trợ lý tinh nhuệ (Pet Hỗ Trợ) trong app QuestBoard — tính cách mạnh mẽ, ngầu, nói năng ngắn gọn, tập trung thói quen lành mạnh và thể dục cho chủ nhân.

Ngôn ngữ: tiếng Việt, ngầu, thân thiện, đầy động lực, không phán xét.

${ctx}

QUAN TRỌNG — Định dạng PHẢI LUÔN là một JSON hợp lệ (không markdown, không text thêm ngoài JSON):
{
  "message": "Lời tư vấn ngắn gọn hiển thị cho người dùng",
  "actions": []
}

Khi CHỈ trò chuyện hoặc tư vấn chung: dùng "actions": [].

Khi muốn cập nhật cấu hình quest trong app, thêm phần tử vào "actions" (có thể nhiều):

1) Điều chỉnh phạm vi thể dục (km và reps min/max cho các ngày sau):
{ "type": "update_fitness_config", "data": { "runMin", "runMax", "pushMin", "pushMax", "sitMin", "sitMax" } }
- runMin/runMax: km (số thập phân được)
- push/sit: số nguyên (lần)

2) Đổi nhãn hiển thị 4 thói quen tốt (theo đúng thứ tự):
{ "type": "update_habit_labels", "data": ["label1","label2","label3","label4"] }

3) Đổi nhãn 3 thói quen cần tránh:
{ "type": "update_bad_habit_labels", "data": ["label1","label2","label3"] }

Chỉ đề xuất thay đổi khi thật sự phù hợp; giải thích ngắn trong "message" trước khi đưa action.

Ví dụ chỉ chat: {"message":"Chúc bạn một ngày năng lượng!","actions":[]}`;
}

function trimMessages(list) {
  const a = Array.isArray(list) ? [...list] : [];
  while (a.length > MAX_MESSAGES) a.shift();
  return a;
}

export async function persistCoachHistoryToAsync(messages) {
  const trimmed = trimMessages(messages);
  try {
    await AsyncStorage.setItem(AI_COACH_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
  return trimmed;
}

export async function loadCoachHistoryFromAsync() {
  try {
    const raw = await AsyncStorage.getItem(AI_COACH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? trimMessages(parsed) : [];
  } catch {
    return [];
  }
}

/** Lịch sử chat → định dạng messages OpenAI (không gồm system, không gồm tin user mới). */
function mapHistoryToOpenAiMessages(history) {
  const out = [];
  for (const m of history) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: String(m.text ?? '') });
    } else if (m.role === 'assistant') {
      const raw =
        m.modelRaw != null ? String(m.modelRaw) : String(m.text ?? '');
      out.push({ role: 'assistant', content: raw });
    }
  }
  return out;
}

function parseCoachResponse(text) {
  const raw = stripJsonFromMarkdown(text);
  const data = JSON.parse(raw);
  const message = String(data.message ?? '').trim() || '…';
  const actions = Array.isArray(data.actions) ? data.actions : [];
  return { message, actions };
}

/**
 * @param {object} params
 * @param {object} params.state — state QuestBoard đầy đủ
 * @param {string} params.userText
 * @param {Array} params.history — tin nhắn trước đó { id, role, text, modelRaw? }
 */
export async function sendAiCoachMessage(params) {
  const { state, userText, history } = params;
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error(MISSING_OPENAI_KEY_MESSAGE);
  }
  const text = String(userText ?? '').trim();
  if (!text) {
    throw new Error('Nội dung trống');
  }

  const prev = Array.isArray(history) ? history : [];
  const systemPrompt = buildSystemPrompt(state);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...mapHistoryToOpenAiMessages(prev),
    { role: 'user', content: text },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let res;
  try {
    res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await res.text();
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        'OpenAI HTTP 401: API key sai hoặc đã bị thu hồi. Vào More > Cài đặt > AI OpenAI và dán key mới.'
      );
    }
    let hint = rawBody.slice(0, 320);
    try {
      const errJson = JSON.parse(rawBody);
      hint = errJson?.error?.message ?? hint;
    } catch {
      /* keep slice */
    }
    throw new Error(`OpenAI HTTP ${res.status}: ${hint}`);
  }

  let json;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new Error('Phản hồi OpenAI không phải JSON');
  }

  const responseText =
    String(json?.choices?.[0]?.message?.content ?? '').trim();

  if (!responseText) {
    throw new Error('OpenAI không trả nội dung');
  }

  let parsed;
  try {
    parsed = parseCoachResponse(responseText);
  } catch (e) {
    throw new Error('Không đọc được JSON từ AI. Thử hỏi lại ngắn gọn hơn.');
  }

  const idBase = Date.now();
  const userMsg = {
    id: `${idBase}-u`,
    role: 'user',
    text,
  };
  const assistantMsg = {
    id: `${idBase}-a`,
    role: 'assistant',
    text: parsed.message,
    modelRaw: responseText,
  };

  const nextHistory = trimMessages([...prev, userMsg, assistantMsg]);
  await persistCoachHistoryToAsync(nextHistory);

  return {
    message: parsed.message,
    actions: parsed.actions,
    history: nextHistory,
  };
}

// --- Daily AI habits (OpenAI ↔ cache) ----------------------------------------

async function readAiHabitsCacheMap() {
  try {
    const raw = await AsyncStorage.getItem(AI_HABITS_CACHE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

async function writeAiHabitsCacheRow(dateKey, row) {
  const map = await readAiHabitsCacheMap();
  map[dateKey] = row;
  await AsyncStorage.setItem(AI_HABITS_CACHE_KEY, JSON.stringify(map));
}

/** Fallback khi lỗi mạng / API — khớp id với GOOD_HABITS / BAD_HABITS. */
export function getDefaultDailyHabitsPayload() {
  return {
    goodHabits: GOOD_HABITS.map((h) => ({
      id: h.id,
      label: h.label,
      icon: h.icon,
    })),
    badHabits: BAD_HABITS.map((h) => ({
      id: h.id,
      label: h.label,
      icon: h.icon,
    })),
  };
}

function normalizeIconFromAi(raw, fallback) {
  const t = String(raw ?? '').trim();
  if (!t) return fallback;
  return t.length > 16 ? t.slice(0, 16) : t;
}

export function normalizeDailyHabitsApiPayload(parsed) {
  const goodHabits = GOOD_HABITS.map((def, i) => {
    const row = parsed?.goodHabits?.[i];
    const label = String(row?.label ?? '').trim() || def.label;
    const icon = normalizeIconFromAi(row?.icon, def.icon);
    return { id: def.id, label, icon };
  });
  const badHabits = BAD_HABITS.map((def, i) => {
    const row = parsed?.badHabits?.[i];
    const label = String(row?.label ?? '').trim() || def.label;
    const icon = normalizeIconFromAi(row?.icon, def.icon);
    return { id: def.id, label, icon };
  });
  return { goodHabits, badHabits };
}

/**
 * Đọc cache theo ngày; trả về payload chuẩn hoặc null.
 */
export async function readCachedDailyHabitsPayload(dateKey) {
  const map = await readAiHabitsCacheMap();
  const row = map[dateKey];
  if (!row || typeof row !== 'object') return null;
  const gl = row.goodLabels;
  const bl = row.badLabels;
  const gi = row.goodIcons;
  const bi = row.badIcons;
  if (!Array.isArray(gl) || gl.length < 4) return null;
  if (!Array.isArray(bl) || bl.length < 3) return null;
  const parsed = {
    goodHabits: GOOD_HABITS.map((def, i) => ({
      id: def.id,
      label: String(gl[i] ?? def.label).trim() || def.label,
      icon: normalizeIconFromAi(
        Array.isArray(gi) ? gi[i] : null,
        def.icon
      ),
    })),
    badHabits: BAD_HABITS.map((def, i) => ({
      id: def.id,
      label: String(bl[i] ?? def.label).trim() || def.label,
      icon: normalizeIconFromAi(
        Array.isArray(bi) ? bi[i] : null,
        def.icon
      ),
    })),
  };
  return parsed;
}

const DAILY_HABITS_PROMPT = `Bạn là trợ lý thói quen cho app QuestBoard (tiếng Việt).

Nhiệm vụ: tạo ĐÚNG 4 thói quen TỐT và ĐÚNG 3 thói quen XẤU (cần tránh) cho MỘT NGÀY — cụ thể, thực tế, khác nhau mỗi ngày.

Quy tắc:
- Thói quen tốt: đa dạng chủ đề; xoay vòng “focus” theo thứ trong tuần (ví dụ Thứ hai: sức khỏe/cơ thể; Thứ ba: học tập/tập trung; Thứ tư: tinh thần; Thứ năm: công việc; Thứ sáu: người thân/an toàn cuối tuần; Thứ bảy: năng động ngoài trời; Chủ nhật: nghỉ ngơi tái tạo) — không bắt buộc khớp từng chữ nhưng phải thay đổi theo weekday.
- Thói quen xấu: cụ thể hơn template chung “MXH/junk/trì hoãn”; có thể gắn mùa, thời tiết, lịch (thi cử), Tết, v.v. khi phù hợp ngày.
- Mỗi mục có "icon": một emoji hợp lệ (đúng một biểu tượng, không markdown).
- "label": ngắn gọn, rõ việc cần làm / tránh (tiếng Việt).

Trả về DUY NHẤT một JSON object, không markdown, không giải thích:
{
  "goodHabits": [
    {"id":"g1","label":"...","icon":"🌟"},
    {"id":"g2","label":"...","icon":"💧"},
    {"id":"g3","label":"...","icon":"📚"},
    {"id":"g4","label":"...","icon":"🧘"}
  ],
  "badHabits": [
    {"id":"b1","label":"...","icon":"📱"},
    {"id":"b2","label":"...","icon":"🍔"},
    {"id":"b3","label":"...","icon":"🛋️"}
  ]
}

Đủ đúng 4 + 3 phần tử. id có thể là g1..g4 / b1..b3 như ví dụ.`;

/**
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} params.weekdayLabel
 * @param {string} params.dateKey
 * @param {number} params.streak
 * @param {number} params.level
 * @returns {Promise<{ goodHabits: Array<{id:string,label:string,icon:string}>, badHabits: Array<{id:string,label:string,icon:string}> }>}
 */
export async function fetchDailyHabitsFromAI(params) {
  const { apiKey, weekdayLabel, dateKey, streak, level } = params;
  if (!apiKey) {
    throw new Error(MISSING_OPENAI_KEY_MESSAGE);
  }

  const userLine = `Ngày quest: ${dateKey}. ${weekdayLabel}. Streak: ${Number(streak) || 0} ngày. Level: ${Number(level) || 1}. Sinh bộ thói quen cho hôm nay.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  let res;
  try {
    res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: DAILY_HABITS_PROMPT },
          { role: 'user', content: userLine },
        ],
        temperature: 0.8,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await res.text();
  if (!res.ok) {
    let hint = rawBody.slice(0, 320);
    try {
      const errJson = JSON.parse(rawBody);
      hint = errJson?.error?.message ?? hint;
    } catch {
      /* keep */
    }
    throw new Error(`OpenAI habits HTTP ${res.status}: ${hint}`);
  }

  let json;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new Error('OpenAI habits: body không parse được');
  }

  const text =
    String(json?.choices?.[0]?.message?.content ?? '').trim();
  if (!text) {
    throw new Error('OpenAI habits: không có nội dung');
  }

  let parsedRaw;
  try {
    parsedRaw = JSON.parse(stripJsonFromMarkdown(text));
  } catch {
    throw new Error('OpenAI habits: JSON không đọc được');
  }

  const normalized = normalizeDailyHabitsApiPayload(parsedRaw);
  await writeAiHabitsCacheRow(dateKey, {
    goodLabels: normalized.goodHabits.map((h) => h.label),
    goodIcons: normalized.goodHabits.map((h) => h.icon),
    badLabels: normalized.badHabits.map((h) => h.label),
    badIcons: normalized.badHabits.map((h) => h.icon),
  });

  return normalized;
}

// --- Daily AI fitness (OpenAI -> cache) --------------------------------------

async function readAiFitnessCacheMap() {
  try {
    const raw = await AsyncStorage.getItem(AI_FITNESS_CACHE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

async function writeAiFitnessCacheRow(dateKey, row) {
  const map = await readAiFitnessCacheMap();
  map[dateKey] = row;
  await AsyncStorage.setItem(AI_FITNESS_CACHE_KEY, JSON.stringify(map));
}

function clampNumber(raw, min, max, fallback, decimals = 0) {
  const n = Number(raw);
  const base = Number.isFinite(n) ? n : fallback;
  const clamped = Math.min(max, Math.max(min, base));
  const factor = 10 ** decimals;
  return Math.round(clamped * factor) / factor;
}

function recentExerciseSummary(history) {
  const arr = Array.isArray(history) ? history.slice(-7) : [];
  const rows = arr
    .filter((row) => row?.date)
    .map((row) => `${row.date}: ${Number(row.exerciseDone) || 0}/${Number(row.exerciseTotal) || 0}`)
    .join('; ');
  return rows || 'chua co du lieu';
}

export function getFitnessBounds(fitnessConfig, difficultyMult) {
  const fc = normalizeFitnessConfig(fitnessConfig);
  const m = Math.max(0.0001, Number(difficultyMult) || 1);
  return {
    runMinKm: Math.round(fc.runMinKm * m * 100) / 100,
    runMaxKm: Math.round(fc.runMaxKm * m * 100) / 100,
    pushMin: Math.max(5, Math.round(fc.pushMin * m)),
    pushMax: Math.max(5, Math.round(fc.pushMax * m)),
    sitMin: Math.max(8, Math.round(fc.sitMin * m)),
    sitMax: Math.max(8, Math.round(fc.sitMax * m)),
  };
}

export function normalizeDailyFitnessApiPayload(parsed, fallback, bounds, dateKey) {
  const runKm = clampNumber(
    parsed?.runKm,
    bounds.runMinKm,
    bounds.runMaxKm,
    fallback.runKm,
    2
  );
  const pushups = clampNumber(
    parsed?.pushups,
    bounds.pushMin,
    bounds.pushMax,
    fallback.pushups
  );
  const situps = clampNumber(
    parsed?.situps,
    bounds.sitMin,
    bounds.sitMax,
    fallback.situps
  );
  const reason = String(parsed?.reason ?? '').trim().slice(0, 180);
  return {
    runKm,
    pushups,
    situps,
    aiFitnessDate: dateKey,
    ...(reason ? { aiReason: reason } : {}),
  };
}

export async function readCachedDailyFitnessPayload(dateKey, fallback, bounds) {
  const map = await readAiFitnessCacheMap();
  const row = map[dateKey];
  if (!row || typeof row !== 'object') return null;
  return normalizeDailyFitnessApiPayload(row, fallback, bounds, dateKey);
}

const DAILY_FITNESS_PROMPT = `Ban la HLV the duc ca nhan trong app QuestBoard.
Tao bai tap cho dung 1 ngay dua tren lich su hoan thanh gan day.

Quy tac bat buoc:
- Chi tra ve JSON object, khong markdown.
- Khong them bai tap moi, chi chon 3 so: runKm, pushups, situps.
- Phai nam trong bounds nguoi dung dua vao.
- Neu lich su the duc hay fail, giam do kho ve gan min.
- Neu hoan thanh deu, tang vua phai.
- Neu khong co du lieu, chon muc vua.

Schema:
{
  "runKm": 1.5,
  "pushups": 20,
  "situps": 25,
  "reason": "ngan gon vi sao chon muc nay"
}`;

export async function fetchDailyFitnessFromAI(params) {
  const {
    apiKey,
    dateKey,
    weekdayLabel,
    history,
    profile,
    fitnessConfig,
    fallbackExercise,
  } = params;
  if (!apiKey) throw new Error(MISSING_OPENAI_KEY_MESSAGE);

  const bounds = getFitnessBounds(
    fitnessConfig,
    profile?.difficultyMult ?? 1
  );
  const userLine = [
    `Ngay: ${dateKey} (${weekdayLabel}).`,
    `Level: ${Number(profile?.level) || 1}. Streak: ${Number(profile?.streak) || 0}.`,
    `Strength Lv: ${Number(profile?.stats?.strength?.level) || 1}. Endurance Lv: ${Number(profile?.stats?.endurance?.level) || 1}.`,
    `Bounds: runKm ${bounds.runMinKm}-${bounds.runMaxKm}, pushups ${bounds.pushMin}-${bounds.pushMax}, situps ${bounds.sitMin}-${bounds.sitMax}.`,
    `Fallback hien tai: runKm ${fallbackExercise.runKm}, pushups ${fallbackExercise.pushups}, situps ${fallbackExercise.situps}.`,
    `Lich su the duc 7 ngay gan day: ${recentExerciseSummary(history)}.`,
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  let res;
  try {
    res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: DAILY_FITNESS_PROMPT },
          { role: 'user', content: userLine },
        ],
        temperature: 0.4,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await res.text();
  if (!res.ok) {
    let hint = rawBody.slice(0, 320);
    try {
      const errJson = JSON.parse(rawBody);
      hint = errJson?.error?.message ?? hint;
    } catch {
      /* keep */
    }
    throw new Error(`OpenAI fitness HTTP ${res.status}: ${hint}`);
  }

  let json;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new Error('OpenAI fitness: body khong parse duoc');
  }
  const text = String(json?.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('OpenAI fitness: khong co noi dung');

  let parsedRaw;
  try {
    parsedRaw = JSON.parse(stripJsonFromMarkdown(text));
  } catch {
    throw new Error('OpenAI fitness: JSON khong doc duoc');
  }

  const normalized = normalizeDailyFitnessApiPayload(
    parsedRaw,
    fallbackExercise,
    bounds,
    dateKey
  );
  await writeAiFitnessCacheRow(dateKey, normalized);
  return normalized;
}

// --- Daily AI overcome quests (OpenAI -> cache) ------------------------------

async function readAiOvercomeCacheMap() {
  try {
    const raw = await AsyncStorage.getItem(AI_OVERCOME_CACHE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

async function writeAiOvercomeCacheRow(dateKey, row) {
  const map = await readAiOvercomeCacheMap();
  map[dateKey] = row;
  await AsyncStorage.setItem(AI_OVERCOME_CACHE_KEY, JSON.stringify(map));
}

function clampOvercomeXp(xp) {
  const v = Math.round(Number(xp));
  if (!Number.isFinite(v)) return 100;
  return Math.min(150, Math.max(60, v));
}

function normalizeTier(raw, xp) {
  const t = String(raw ?? '').trim().toLowerCase();
  if (t === 'easy' || t === 'normal' || t === 'hard') return t;
  if (xp >= 130) return 'hard';
  if (xp <= 75) return 'easy';
  return 'normal';
}

export function normalizeDailyOvercomeApiPayload(parsed, dateKey) {
  const source = Array.isArray(parsed?.quests) ? parsed.quests : [];
  const used = new Set();
  const quests = source.slice(0, 3).map((row, i) => {
    let title = String(row?.title ?? '').trim();
    if (!title) title = `Thử thách bất ngờ #${i + 1}`;
    title = title.replace(/\s+/g, ' ').slice(0, 80);
    const key = title.toLowerCase();
    if (used.has(key)) title = `${title} (${i + 1})`;
    used.add(title.toLowerCase());
    const xp = clampOvercomeXp(row?.xp);
    return {
      id: `openai-overcome-${dateKey}-${i}`,
      title,
      tier: normalizeTier(row?.tier, xp),
      xp,
      done: false,
    };
  });

  while (quests.length < 3) {
    const i = quests.length;
    quests.push({
      id: `openai-overcome-${dateKey}-${i}`,
      title: `Làm một việc hữu ích mà bạn đã né tránh`,
      tier: 'normal',
      xp: 100,
      done: false,
    });
  }

  return { quests };
}

export async function readCachedDailyOvercomePayload(dateKey) {
  const map = await readAiOvercomeCacheMap();
  const row = map[dateKey];
  if (!row || typeof row !== 'object') return null;
  return normalizeDailyOvercomeApiPayload(row, dateKey);
}

function recentOvercomeTitles(history, currentDaily) {
  const titles = [];
  const current = Array.isArray(currentDaily?.overcome) ? currentDaily.overcome : [];
  for (const q of current) {
    if (q?.title) titles.push(String(q.title));
  }
  const rows = Array.isArray(history) ? history.slice(-10) : [];
  for (const row of rows) {
    if (Array.isArray(row?.overcomeTitles)) {
      for (const title of row.overcomeTitles) titles.push(String(title));
    }
  }
  return [...new Set(titles.map((t) => t.trim()).filter(Boolean))].slice(-18);
}

const DAILY_OVERCOME_PROMPT = `Ban la nguoi thiet ke quest "Vuot ban than" cho app QuestBoard.
Moi ngay tao 3 thu thach bat ngo, thuc te, co ich, khong lap lai may moc.

Muc tieu:
- Tao cam giac "hom nay co dieu minh khong doan truoc".
- Khong tao viec nguy hiem, bat hop phap, xau ho nguoi dung, hoac qua suc.
- Khong lap y tuong trong danh sach gan day.
- Nen cu the, lam duoc trong ngay, thoi luong 5-120 phut.
- Da dang chu de: can dam xa hoi, don dep, hoc ky nang, sang tao, tap trung, phuc hoi, giup nguoi khac, xu ly viec tri hoan.

Chi tra ve JSON object, khong markdown:
{
  "quests": [
    {"title":"...", "tier":"easy", "xp":60},
    {"title":"...", "tier":"normal", "xp":100},
    {"title":"...", "tier":"hard", "xp":150}
  ]
}`;

export async function fetchDailyOvercomeFromAI(params) {
  const { apiKey, dateKey, weekdayLabel, history, daily, profile } = params;
  if (!apiKey) throw new Error(MISSING_OPENAI_KEY_MESSAGE);

  const avoidTitles = recentOvercomeTitles(history, daily);
  const userLine = [
    `Ngay: ${dateKey} (${weekdayLabel}).`,
    `Level: ${Number(profile?.level) || 1}. Streak: ${Number(profile?.streak) || 0}.`,
    `Tong quest vuot ban than da hoan thanh: ${Number(profile?.lifetimeOvercomeCompleted) || 0}.`,
    `Tranh lap cac y tuong/tieu de gan day: ${avoidTitles.length ? avoidTitles.join(' | ') : 'chua co'}.`,
    'Hay tao 3 quest moi la hon template mac dinh, nhung van an toan va lam duoc trong ngay.',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  let res;
  try {
    res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: DAILY_OVERCOME_PROMPT },
          { role: 'user', content: userLine },
        ],
        temperature: 1,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await res.text();
  if (!res.ok) {
    let hint = rawBody.slice(0, 320);
    try {
      const errJson = JSON.parse(rawBody);
      hint = errJson?.error?.message ?? hint;
    } catch {
      /* keep */
    }
    throw new Error(`OpenAI overcome HTTP ${res.status}: ${hint}`);
  }

  let json;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new Error('OpenAI overcome: body khong parse duoc');
  }
  const text = String(json?.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('OpenAI overcome: khong co noi dung');

  let parsedRaw;
  try {
    parsedRaw = JSON.parse(stripJsonFromMarkdown(text));
  } catch {
    throw new Error('OpenAI overcome: JSON khong doc duoc');
  }

  const normalized = normalizeDailyOvercomeApiPayload(parsedRaw, dateKey);
  await writeAiOvercomeCacheRow(dateKey, normalized);
  return normalized;
}

const BOSS_TASK_PROMPT = `Bạn là AI thiết kế nhiệm vụ riêng cho Boss System của app QuestBoard.
Nhiệm vụ boss phải tách biệt với nhiệm vụ cá nhân hằng ngày.
Bắt buộc viết toàn bộ tên boss, tên nhiệm vụ, mục tiêu, bằng chứng, lý do bằng tiếng Việt có dấu. Không dùng tiếng Anh, trừ thuật ngữ game quen thuộc như HP, MP, Boss nếu cần.

Muc tieu:
- Tạo 4 nhiệm vụ boss rõ ràng, khó, làm được trong cửa sổ boss.
- Không lặp máy móc với quest cá nhân đang có.
- Không tạo việc nguy hiểm, bất hợp pháp, làm hại sức khỏe, hoặc quá sức.
- Mỗi nhiệm vụ phải có bằng chứng cần báo cáo.
- Nên cụ thể bằng số lượng/thời gian: hít đất bao nhiêu, squat bao nhiêu, tập trung sâu bao lâu, không MXH bao lâu.
- Phải có 1 nhiệm vụ difficulty "Kết liễu".
- Phải tuân theo Boss Challenge Profile trong tin user: boss càng hiếm thì task càng khó, bằng chứng càng rõ, hạn càng chặt.
- Boss Thế Giới/Tinh Anh không được giao task nhẹ kiểu "làm 10 phút" hoặc "báo cáo chung chung".

Chỉ trả về JSON object, không markdown:
{
  "reason": "lý do ngắn gọn vì sao bộ nhiệm vụ này hợp boss",
  "tasks": [
    {
      "title": "...",
      "category": "Công việc|Thể dục|Kỷ luật|Trí tuệ|Tổng hợp",
      "difficulty": "Vừa|Khó|Rất khó|Cực khó|Kết liễu",
      "objective": "...",
      "deadlineMinutes": 90,
      "proof": "..."
    }
  ]
}`;

function getBossAiChallengeProfile(boss, playerPower) {
  const typeText = `${boss?.typeLabel ?? ''} ${boss?.difficulty ?? ''} ${boss?.generatedTier ?? ''}`.toLowerCase();
  const lootTier = Math.max(1, Math.min(5, Math.floor(Number(boss?.lootTier) || 1)));
  const bossPower = Math.max(1, Number(boss?.bossPower) || 1);
  const powerRatio = bossPower / Math.max(1, Number(playerPower) || 1);

  if (
    lootTier >= 5 ||
    typeText.includes('world') ||
    typeText.includes('the gioi')
  ) {
    return {
      tier: 'World',
      label: 'Boss Thế Giới',
      proofPassScore: 88,
      minDeadlineMinutes: 45,
      maxDeadlineMinutes: 240,
      instruction:
        'Nhiệm vụ cực khó, có số lượng/thời gian lớn, bắt buộc bằng chứng rất cụ thể. Ưu tiên 2 nhiệm vụ Cực khó, 1 nhiệm vụ Rất khó, 1 nhiệm vụ Kết liễu.',
      proofInstruction:
        'Chấm rất gắt: bằng chứng phải có số liệu, thời gian, kết quả cụ thể; câu mơ hồ không được duyệt.',
      difficultyFloor: ['Rất khó', 'Cực khó', 'Cực khó', 'Kết liễu'],
    };
  }

  if (
    lootTier >= 4 ||
    typeText.includes('elite') ||
    typeText.includes('tinh anh') ||
    typeText.includes('ac mong')
  ) {
    return {
      tier: 'Elite',
      label: 'Boss Tinh Anh',
      proofPassScore: 82,
      minDeadlineMinutes: 35,
      maxDeadlineMinutes: 210,
      instruction:
        'Nhiệm vụ rất khó, đẩy người chơi vượt ngưỡng nhưng vẫn an toàn. Cần ít nhất 1 nhiệm vụ Cực khó và 1 nhiệm vụ Kết liễu.',
      proofInstruction:
        'Chấm gắt: bằng chứng phải khớp mục tiêu và có chi tiết đo được.',
      difficultyFloor: ['Rất khó', 'Rất khó', 'Cực khó', 'Kết liễu'],
    };
  }

  if (
    lootTier >= 3 ||
    typeText.includes('weekly') ||
    typeText.includes('tuan') ||
    powerRatio >= 1.35
  ) {
    return {
      tier: 'Weekly',
      label: 'Boss Tuần',
      proofPassScore: 76,
      minDeadlineMinutes: 45,
      maxDeadlineMinutes: 360,
      instruction:
        'Nhiệm vụ tổng hợp khó hơn ngày thường, nên trải qua công việc, thể dục và kỷ luật. Cần 1 nhiệm vụ Rất khó và 1 nhiệm vụ Kết liễu.',
      proofInstruction:
        'Chấm khá gắt: bằng chứng phải có kết quả rõ, không chấp nhận nói chung chung.',
      difficultyFloor: ['Khó', 'Rất khó', 'Rất khó', 'Kết liễu'],
    };
  }

  if (lootTier >= 2 || typeText.includes('ky luat') || powerRatio >= 1.2) {
    return {
      tier: 'Hard',
      label: 'Boss Khó',
      proofPassScore: 72,
      minDeadlineMinutes: 30,
      maxDeadlineMinutes: 240,
      instruction:
        'Nhiệm vụ khó vừa phải, rõ mục tiêu và có bằng chứng cụ thể. Cần 1 nhiệm vụ Rất khó hoặc Kết liễu.',
      proofInstruction:
        'Chấm nghiêm túc: bằng chứng cần có thời gian, số lượng hoặc kết quả.',
      difficultyFloor: ['Khó', 'Khó', 'Rất khó', 'Kết liễu'],
    };
  }

  return {
    tier: 'Standard',
    label: 'Boss Thường',
    proofPassScore: 70,
    minDeadlineMinutes: 30,
    maxDeadlineMinutes: 240,
    instruction:
      'Nhiệm vụ khó hơn quest hằng ngày nhưng không quá sức. Cần rõ số lượng/thời gian và 1 nhiệm vụ Kết liễu.',
    proofInstruction:
      'Chấm công bằng: bằng chứng cần cụ thể, không chấp nhận "xong rồi".',
    difficultyFloor: ['Khó', 'Khó', 'Rất khó', 'Kết liễu'],
  };
}

function safeShortText(value, fallback, maxLength) {
  const text = String(value ?? '').trim();
  return (text || fallback).slice(0, maxLength);
}

const BOSS_ENCOUNTER_PROMPT = `Bạn là AI sinh boss thật cho Boss System của app QuestBoard.
Boss phải có cảm giác 2D pixel dark fantasy kiểu solo leveling, nhưng nội dung gameplay vẫn gắn với kỷ luật, công việc, thể dục, chuỗi.
Bắt buộc viết toàn bộ text người chơi thấy được bằng tiếng Việt có dấu. Không trả về tên, lore, luật, nhiệm vụ, lootTheme bằng tiếng Anh.

Vai tro cua AI:
- Sinh tên boss riêng, chủ đề, lore ngắn, kỹ năng đặc biệt, luật, nhiệm vụ và chủ đề đồ rơi.
- Sinh chỉ số gợi ý theo lực chiến người chơi, nhưng không được phá cân bằng.
- Nhiệm vụ boss phải riêng, khó, rõ ràng, không trùng quest cá nhân.
- Đồ rơi chỉ được dùng itemId trong danh sách allowedLootIds của tin user.
- Không tạo việc nguy hiểm, bất hợp pháp, làm hại sức khỏe, hoặc quá sức.

Chỉ trả về JSON object, không markdown:
{
  "reason": "lý do ngắn gọn vì sao boss này hợp với người chơi",
  "boss": {
    "name": "...",
    "typeLabel": "Boss ...",
    "themeLabel": "...",
    "difficulty": "Khó|Rất khó|Ác mộng|Thế giới",
    "lore": "...",
    "visualPrompt": "...",
    "powerMultiplier": 1.0,
    "hpMultiplier": 1.0,
    "statLine": { "attack": 100, "defense": 100, "speed": 100, "focus": 100 },
    "specialSkill": { "name": "...", "description": "..." }
  },
  "rules": {
    "groups": [
      { "title": "Điều kiện tham gia", "lines": ["..."] },
      { "title": "Luật riêng của boss", "lines": ["..."] }
    ]
  },
  "tasks": [
    {
      "title": "...",
      "category": "Công việc|Thể dục|Kỷ luật|Trí tuệ|Tổng hợp",
      "difficulty": "Vừa|Khó|Rất khó|Cực khó|Kết liễu",
      "objective": "...",
      "deadlineMinutes": 90,
      "proof": "..."
    }
  ],
  "lootTable": {
    "lootTheme": "...",
    "mainLootRequirement": "...",
    "entries": [
      {
        "itemId": "item_large_mana_potion",
        "themeName": "...",
        "condition": "...",
        "description": "..."
      }
    ]
  }
}`;

function normalizeAiStatLine(rawStatLine, baseStatLine) {
  const base = baseStatLine && typeof baseStatLine === 'object' ? baseStatLine : {};
  const raw = rawStatLine && typeof rawStatLine === 'object' ? rawStatLine : {};
  const normalizeOne = (key) => {
    const fallback = Math.max(1, Math.round(Number(base[key]) || 100));
    return Math.round(
      clampNumber(raw[key], Math.round(fallback * 0.72), Math.round(fallback * 1.38), fallback)
    );
  };
  return {
    attack: normalizeOne('attack'),
    defense: normalizeOne('defense'),
    speed: normalizeOne('speed'),
    focus: normalizeOne('focus'),
  };
}

function normalizeAiBossRulesPayload(parsedRules, boss) {
  const rawGroups = Array.isArray(parsedRules?.groups) ? parsedRules.groups : [];
  const groups = rawGroups
    .filter((group) => group && typeof group === 'object')
    .slice(0, 6)
    .map((group, index) => ({
      title: safeShortText(group.title, `Luật boss ${index + 1}`, 48),
      lines: Array.isArray(group.lines)
        ? group.lines
            .map((line) => safeShortText(line, '', 130))
            .filter(Boolean)
            .slice(0, 5)
        : [],
    }))
    .filter((group) => group.lines.length > 0);

  const requiredPower = Math.max(1, Math.round(Number(boss?.requiredPower) || 0));
  const defaultGroups = [
    {
      title: 'Điều kiện tham gia',
      lines: [
        `Yêu cầu lực chiến tối thiểu: ${requiredPower}.`,
        'Nhiệm vụ boss tách biệt với quest cá nhân.',
      ],
    },
    {
      title: 'Luật bằng chứng',
      lines: [
        'Bằng chứng phải có thời gian, số lượng hoặc kết quả cụ thể.',
        'AI sẽ chấm bằng chứng trước khi tính sát thương.',
      ],
    },
  ];

  return {
    bossId: boss?.id ?? 'ai_boss',
    groups: groups.length >= 2 ? groups : defaultGroups,
  };
}

function normalizeAiBossLootTable(parsedLootTable, baseLootTable, boss) {
  const base =
    baseLootTable && typeof baseLootTable === 'object' && !Array.isArray(baseLootTable)
      ? baseLootTable
      : {};
  const baseEntries = Array.isArray(base.entries) ? base.entries : [];
  const aiEntries = Array.isArray(parsedLootTable?.entries)
    ? parsedLootTable.entries.filter((entry) => entry && typeof entry === 'object')
    : [];
  const aiByItemId = new Map(
    aiEntries
      .map((entry) => [String(entry.itemId ?? entry.id ?? '').trim(), entry])
      .filter(([id]) => Boolean(id))
  );
  const entries = baseEntries.map((entry) => {
    const itemId = String(entry.itemId ?? entry.id ?? '').trim();
    const ai = aiByItemId.get(itemId) ?? {};
    return {
      ...entry,
      id: itemId || entry.id,
      itemId: itemId || entry.itemId,
      name: safeShortText(ai.themeName ?? ai.name, entry.name, 48),
      condition: safeShortText(ai.condition, entry.condition, 80),
      description: safeShortText(ai.description, entry.description, 140),
    };
  });

  return {
    ...base,
    bossId: boss?.id ?? base.bossId,
    lootTheme: safeShortText(parsedLootTable?.lootTheme, boss?.themeLabel ?? 'Đồ rơi boss', 80),
    mainLootRequirement: safeShortText(
      parsedLootTable?.mainLootRequirement,
      base.mainLootRequirement ?? 'Theo điều kiện sát thương của boss',
      120
    ),
    entries: entries.length ? entries : baseEntries,
  };
}

function normalizeAiBossEncounterPayload(parsed, baseBoss, baseLootTable, playerPower, now = Date.now()) {
  if (!baseBoss || typeof baseBoss !== 'object') {
    throw new Error('AI boss encounter: thiếu boss nền');
  }
  const rawBoss = parsed?.boss && typeof parsed.boss === 'object' ? parsed.boss : {};
  const basePower = Math.max(1000, Math.round(Number(playerPower) || 0));
  const baseBossPower = Math.max(1, Math.round(Number(baseBoss.bossPower) || basePower));
  const baseHp = Math.max(1, Math.round(Number(baseBoss.maxHp) || baseBossPower * 4));
  const powerMultiplier = clampNumber(rawBoss.powerMultiplier, 0.92, 1.12, 1, 2);
  const hpMultiplier = clampNumber(rawBoss.hpMultiplier, 0.9, 1.15, 1, 2);
  const bossPower = Math.max(1, Math.round(baseBossPower * powerMultiplier));
  const maxHp = Math.max(1, Math.round(baseHp * hpMultiplier));
  const requiredPower = Math.max(
    1,
    Math.round(clampNumber(baseBoss.requiredPower, bossPower * 0.55, bossPower * 1.18, bossPower * 0.75))
  );
  const recommendedPower = Math.max(
    requiredPower,
    Math.round(clampNumber(baseBoss.recommendedPower, requiredPower, bossPower * 1.2, bossPower))
  );
  const boss = {
    ...baseBoss,
    id: `boss_ai_${baseBoss.templateId ?? baseBoss.id}_${now}`,
    name: safeShortText(rawBoss.name, baseBoss.name ?? 'AI Boss', 52),
    typeLabel: safeShortText(rawBoss.typeLabel, baseBoss.typeLabel ?? 'Boss', 42),
    themeLabel: safeShortText(rawBoss.themeLabel, baseBoss.themeLabel ?? 'Chủ đề AI', 64),
    difficulty: safeShortText(rawBoss.difficulty, baseBoss.difficulty ?? 'Khó', 24),
    generatedBy: 'openai_boss_generator_v1',
    generatedTier: baseBoss.generatedTier ?? 'Standard',
    playerPowerAtReveal: basePower,
    bossPower,
    requiredPower,
    recommendedPower,
    maxHp,
    currentHp: maxHp,
    level: Math.max(1, Math.round(Math.sqrt(bossPower) / 2)),
    statLine: normalizeAiStatLine(rawBoss.statLine, baseBoss.statLine),
    status: 'active',
    revealedAt: now,
    lore: safeShortText(rawBoss.lore, '', 240),
    visualPrompt: safeShortText(rawBoss.visualPrompt, '', 260),
    specialSkill: {
      name: safeShortText(rawBoss.specialSkill?.name, baseBoss.specialSkill?.name ?? 'Kỹ năng AI', 48),
      description: safeShortText(
        rawBoss.specialSkill?.description,
        baseBoss.specialSkill?.description ?? 'Kỹ năng riêng của boss.',
        160
      ),
    },
  };
  const challenge = getBossAiChallengeProfile(boss, playerPower);
  const rules = normalizeAiBossRulesPayload(parsed?.rules, boss);
  const tasks = normalizeAiBossTasksPayload(parsed, boss, now, challenge).tasks;
  const lootTable = normalizeAiBossLootTable(parsed?.lootTable, baseLootTable, boss);

  return {
    boss,
    rules,
    tasks,
    lootTable,
    reason: safeShortText(parsed?.reason, 'AI đã sinh boss mới.', 220),
    generatedAt: now,
    generatedBy: 'openai_boss_generator_v1',
    challengeTier: challenge.tier,
  };
}

function normalizeBossTaskCategory(value) {
  const text = String(value ?? '').trim();
  const labels = {
    'Cong viec': 'Công việc',
    'Công việc': 'Công việc',
    'The duc': 'Thể dục',
    'Thể dục': 'Thể dục',
    'Ky luat': 'Kỷ luật',
    'Kỷ luật': 'Kỷ luật',
    'Tri tue': 'Trí tuệ',
    'Trí tuệ': 'Trí tuệ',
    'Tong hop': 'Tổng hợp',
    'Tổng hợp': 'Tổng hợp',
  };
  return labels[text] ?? 'Tổng hợp';
}

function normalizeDifficultyLabel(value) {
  const text = String(value ?? '').trim();
  const labels = {
    Vua: 'Vừa',
    'Vừa': 'Vừa',
    Kho: 'Khó',
    'Khó': 'Khó',
    'Rat kho': 'Rất khó',
    'Rất khó': 'Rất khó',
    'Cuc kho': 'Cực khó',
    'Cực khó': 'Cực khó',
    'Ket lieu': 'Kết liễu',
    'Kết liễu': 'Kết liễu',
  };
  return labels[text] ?? '';
}

function difficultyRank(value) {
  return ['Vừa', 'Khó', 'Rất khó', 'Cực khó', 'Kết liễu'].indexOf(
    normalizeDifficultyLabel(value)
  );
}

function normalizeBossTaskDifficulty(value, index, profile, total = 4) {
  const fallback = index === total - 1 ? 'Kết liễu' : index === 0 ? 'Khó' : 'Rất khó';
  const normalized = normalizeDifficultyLabel(value) || fallback;
  const floor = normalizeDifficultyLabel(profile?.difficultyFloor?.[index]) || fallback;
  return difficultyRank(normalized) >= difficultyRank(floor) ? normalized : floor;
}

function normalizeAiBossTasksPayload(parsed, boss, now = Date.now(), profile = null) {
  const rawTasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
  const selected = rawTasks
    .filter((task) => task && typeof task === 'object')
    .slice(0, 4);
  if (selected.length < 3) {
    throw new Error('AI boss tasks: không đủ số nhiệm vụ hợp lệ');
  }

  const maxHp = Math.max(1, Number(boss?.maxHp) || 1);
  const bossEndsAt = Number(boss?.endsAt);
  const finalEndsAt = Number.isFinite(bossEndsAt)
    ? bossEndsAt
    : now + 6 * 60 * 60 * 1000;
  const weights = selected.length >= 5
    ? [0.18, 0.2, 0.2, 0.18, 0.32]
    : [0.24, 0.26, 0.2, 0.34];
  const challenge = profile ?? getBossAiChallengeProfile(boss, 0);
  const tasks = selected.map((task, index) => {
    const difficulty =
      index === selected.length - 1
        ? 'Kết liễu'
        : normalizeBossTaskDifficulty(task.difficulty, index, challenge, selected.length);
    const minutes = Math.max(
      challenge.minDeadlineMinutes,
      Math.min(
        challenge.maxDeadlineMinutes,
        Math.floor(Number(task.deadlineMinutes) || 180)
      )
    );
    const deadlineAt = Math.min(finalEndsAt, now + minutes * 60 * 1000);
    return {
      id: `ai_boss_task_${now}_${index + 1}`,
      title: String(task.title ?? `Lệnh Boss ${index + 1}`).trim().slice(0, 60),
      category: normalizeBossTaskCategory(task.category),
      difficulty,
      objective: String(task.objective ?? '').trim().slice(0, 220),
      deadline: `${minutes} phút sau khi sinh nhiệm vụ`,
      deadlineAt,
      expiresAt: deadlineAt,
      damage: Math.max(1, Math.round(maxHp * (weights[index] ?? 0.22))),
      status: 'Available',
      proof: String(task.proof ?? 'Báo cáo kết quả cụ thể.').trim().slice(0, 180),
      generatedBy: 'openai_boss_task_generator_v1',
      challengeTier: challenge.tier,
      proofPassScore: challenge.proofPassScore,
    };
  });

  if (!tasks.some((task) => task.difficulty === 'Kết liễu')) {
    tasks[tasks.length - 1].difficulty = 'Kết liễu';
  }

  return {
    reason: String(parsed?.reason ?? '').trim().slice(0, 220),
    tasks,
    generatedAt: now,
    generatedBy: 'openai_boss_task_generator_v1',
    challengeTier: challenge.tier,
    proofPassScore: challenge.proofPassScore,
  };
}

function collectCurrentQuestTitles(state) {
  const daily = state?.daily ?? {};
  const titles = [];
  if (Array.isArray(daily.workTasks)) {
    for (const task of daily.workTasks) {
      if (task?.title) titles.push(String(task.title));
    }
  }
  if (Array.isArray(daily.overcomeQuests)) {
    for (const quest of daily.overcomeQuests) {
      if (quest?.title) titles.push(String(quest.title));
    }
  }
  return [...new Set(titles.map((title) => title.trim()).filter(Boolean))]
    .slice(0, 12);
}

export async function fetchBossEncounterFromAI(params) {
  const {
    state,
    baseBoss,
    baseLootTable,
    playerPower,
    eventType,
    now = Date.now(),
  } = params ?? {};
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error(MISSING_OPENAI_KEY_MESSAGE);
  if (!baseBoss || typeof baseBoss !== 'object') {
    throw new Error('Chưa có boss nền để AI sinh encounter');
  }

  const profile = state?.profile ?? {};
  const daily = state?.daily ?? {};
  const currentTitles = collectCurrentQuestTitles(state);
  const challenge = getBossAiChallengeProfile(baseBoss, playerPower);
  const allowedLootIds = Array.isArray(baseLootTable?.entries)
    ? baseLootTable.entries
        .map((entry) => String(entry.itemId ?? entry.id ?? '').trim())
        .filter(Boolean)
    : [];
  const userLine = [
    `Event type: ${eventType ?? 'unknown'}.`,
    `Base boss template: ${baseBoss.name} | ${baseBoss.typeLabel} | ${baseBoss.themeLabel} | ${baseBoss.difficulty}.`,
    `Base boss power: ${baseBoss.bossPower}. Base HP: ${baseBoss.maxHp}. Loot tier: ${baseBoss.lootTier}.`,
    `Lực chiến người chơi: ${Number(playerPower) || 0}. Level: ${Number(profile.level) || 1}. Chuỗi: ${Number(profile.streak) || 0}.`,
    `Boss Challenge Profile: ${challenge.label} / ${challenge.tier}. ${challenge.instruction}`,
    `Ngay hien tai: ${daily.date ?? 'unknown'}.`,
    `Quest cá nhân đang có cần tránh lặp: ${currentTitles.length ? currentTitles.join(' | ') : 'không có'}.`,
    `allowedLootIds: ${allowedLootIds.join(', ') || 'none'}.`,
    'Hãy sinh encounter boss hoàn chỉnh: danh tính boss, chỉ số gợi ý, kỹ năng riêng, luật, nhiệm vụ và chủ đề đồ rơi.',
    'powerMultiplier chỉ trong khoảng 0.92-1.12, hpMultiplier chỉ trong khoảng 0.90-1.15.',
    'Nhiệm vụ phải có bằng chứng rõ và đủ khó theo Boss Challenge Profile.',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let res;
  try {
    res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: BOSS_ENCOUNTER_PROMPT },
          { role: 'user', content: userLine },
        ],
        temperature: 0.95,
        max_tokens: 1900,
        response_format: { type: 'json_object' },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await res.text();
  if (!res.ok) {
    let hint = rawBody.slice(0, 320);
    try {
      const errJson = JSON.parse(rawBody);
      hint = errJson?.error?.message ?? hint;
    } catch {
      /* keep */
    }
    throw new Error(`OpenAI boss encounter HTTP ${res.status}: ${hint}`);
  }

  let json;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new Error('OpenAI boss encounter: không đọc được body');
  }
  const text = String(json?.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('OpenAI boss encounter: không có nội dung');

  let parsedRaw;
  try {
    parsedRaw = JSON.parse(stripJsonFromMarkdown(text));
  } catch {
    throw new Error('OpenAI boss encounter: không đọc được JSON');
  }

  return normalizeAiBossEncounterPayload(
    parsedRaw,
    baseBoss,
    baseLootTable,
    playerPower,
    now
  );
}

export async function fetchBossTasksFromAI(params) {
  const { state, boss, playerPower, now = Date.now() } = params ?? {};
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error(MISSING_OPENAI_KEY_MESSAGE);
  if (!boss || typeof boss !== 'object') {
    throw new Error('Chưa có boss để sinh nhiệm vụ AI');
  }

  const profile = state?.profile ?? {};
  const daily = state?.daily ?? {};
  const currentTitles = collectCurrentQuestTitles(state);
  const challenge = getBossAiChallengeProfile(boss, playerPower);
  const userLine = [
    `Boss: ${boss.name} | ${boss.typeLabel} | ${boss.themeLabel} | ${boss.difficulty}.`,
    `Boss HP: ${boss.maxHp}. Boss power: ${boss.bossPower}. Loot tier: ${boss.lootTier}.`,
    `Lực chiến người chơi: ${Number(playerPower) || 0}. Level: ${Number(profile.level) || 1}. Chuỗi: ${Number(profile.streak) || 0}.`,
    `Boss Challenge Profile: ${challenge.label} / ${challenge.tier}.`,
    `Độ nặng nhiệm vụ: ${challenge.instruction}`,
    `Độ chặt bằng chứng: cần đạt tối thiểu ${challenge.proofPassScore}/100. ${challenge.proofInstruction}`,
    `Hạn mỗi nhiệm vụ: từ ${challenge.minDeadlineMinutes} đến ${challenge.maxDeadlineMinutes} phút.`,
    `Sàn độ khó cho 4 nhiệm vụ: ${challenge.difficultyFloor.join(' | ')}.`,
    `Ngày hiện tại: ${daily.date ?? 'không rõ'}.`,
    `Thời gian boss còn lại theo phút: ${Math.max(30, Math.round(((Number(boss.endsAt) || now) - now) / 60000))}.`,
    `Quest cá nhân đang có cần tránh lặp: ${currentTitles.length ? currentTitles.join(' | ') : 'không có'}.`,
    'Hãy sinh nhiệm vụ riêng của boss, khó hơn quest hằng ngày, nhưng vẫn an toàn và có bằng chứng rõ ràng.',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  let res;
  try {
    res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: BOSS_TASK_PROMPT },
          { role: 'user', content: userLine },
        ],
        temperature: 0.95,
        max_tokens: 1100,
        response_format: { type: 'json_object' },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await res.text();
  if (!res.ok) {
    let hint = rawBody.slice(0, 320);
    try {
      const errJson = JSON.parse(rawBody);
      hint = errJson?.error?.message ?? hint;
    } catch {
      /* keep */
    }
    throw new Error(`OpenAI boss tasks HTTP ${res.status}: ${hint}`);
  }

  let json;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new Error('OpenAI boss tasks: không đọc được body');
  }
  const text = String(json?.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('OpenAI boss tasks: không có nội dung');

  let parsedRaw;
  try {
    parsedRaw = JSON.parse(stripJsonFromMarkdown(text));
  } catch {
    throw new Error('OpenAI boss tasks: không đọc được JSON');
  }

  return normalizeAiBossTasksPayload(parsedRaw, boss, now, challenge);
}

const BOSS_PROOF_PROMPT = `Bạn là AI chấm bằng chứng nhiệm vụ boss của app QuestBoard.
Nhiệm vụ boss là nhiệm vụ riêng, khó và cần bằng chứng rõ ràng.
Toàn bộ feedback và missing phải viết bằng tiếng Việt có dấu.

Nguyên tắc chấm:
- Chỉ duyệt khi bằng chứng khớp với mục tiêu và yêu cầu bằng chứng của nhiệm vụ.
- Bằng chứng phải có thông tin cụ thể: thời gian, số lượng, kết quả, sản phẩm đã làm, hoặc mô tả quá trình đủ rõ.
- Không duyệt các câu chung chung như "xong rồi", "đã làm", "ok", "hoàn thành" nếu không có chi tiết.
- Không yêu cầu ảnh, GPS, video nếu nhiệm vụ không bắt buộc; bằng chứng text cụ thể là đủ.
- Chấm nghiêm khắc nhưng công bằng, không phán xét đạo đức.
- Phải tuân theo Boss Challenge Profile trong tin user: Boss Thế Giới/Tinh Anh cần bằng chứng chặt hơn boss thường.
- Nếu score dưới pass score của profile thì approved bắt buộc là false.

Chỉ trả về JSON object, không markdown:
{
  "approved": true,
  "score": 0,
  "feedback": "nhận xét ngắn gọn cho người chơi",
  "missing": ["thiếu gì nếu chưa đạt"]
}`;

function normalizeBossProofVerdict(parsed, passScore = 70) {
  const rawScore = Math.round(Number(parsed?.score) || 0);
  const score = Math.max(0, Math.min(100, rawScore));
  const threshold = Math.max(60, Math.min(95, Math.round(Number(passScore) || 70)));
  const approved = Boolean(parsed?.approved) && score >= threshold;
  const feedback =
    String(
      parsed?.feedback ??
        (approved ? 'Bằng chứng đạt yêu cầu.' : 'Bằng chứng chưa đủ cụ thể.')
    )
      .trim()
      .slice(0, 220) || (approved ? 'Bằng chứng đạt yêu cầu.' : 'Bằng chứng chưa đủ.');
  const missing = Array.isArray(parsed?.missing)
    ? parsed.missing
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const finalMissing =
    !approved && score < threshold && missing.length === 0
      ? [`Cần đạt tối thiểu ${threshold}/100 cho boss này`]
      : missing;

  return {
    approved,
    score,
    feedback,
    missing: finalMissing,
    passScore: threshold,
    checkedBy: 'openai_boss_proof_grader_v1',
  };
}

export async function gradeBossTaskProofWithAI(params) {
  const {
    state,
    boss,
    task,
    proofText,
    playerPower,
    now = Date.now(),
  } = params ?? {};
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error(MISSING_OPENAI_KEY_MESSAGE);
  if (!boss || typeof boss !== 'object') {
    throw new Error('Chưa có boss để chấm bằng chứng');
  }
  if (!task || typeof task !== 'object') {
    throw new Error('Chưa có nhiệm vụ boss để chấm bằng chứng');
  }
  const proof = String(proofText ?? '').trim();
  if (proof.length < 12) {
    throw new Error('Bằng chứng quá ngắn, hãy nhập rõ hơn');
  }

  const profile = state?.profile ?? {};
  const challenge = getBossAiChallengeProfile(boss, playerPower);
  const taskPassScore = Math.max(
    challenge.proofPassScore,
    Math.round(Number(task?.proofPassScore) || 0)
  );
  const userLine = [
    `Thoi diem cham: ${new Date(now).toISOString()}.`,
    `Boss: ${boss.name} | ${boss.typeLabel} | ${boss.difficulty}. Loot tier: ${boss.lootTier}.`,
    `Boss Challenge Profile: ${challenge.label} / ${challenge.tier}.`,
    `Điểm bằng chứng bắt buộc: ${taskPassScore}/100.`,
    `Chế độ chấm: ${challenge.proofInstruction}`,
    `Lực chiến người chơi: ${Number(playerPower) || 0}. Level: ${Number(profile.level) || 1}. Chuỗi: ${Number(profile.streak) || 0}.`,
    `Tên nhiệm vụ: ${task.title}.`,
    `Nhóm nhiệm vụ: ${task.category}. Độ khó: ${task.difficulty}.`,
    `Mục tiêu: ${task.objective}.`,
    `Yêu cầu bằng chứng: ${task.proof || 'Báo cáo kết quả cụ thể.'}.`,
    `Hạn chót: ${task.deadline}.`,
    `Bằng chứng người chơi nộp: ${proof}`,
    'Hãy chấm xem bằng chứng này có đủ để tính hoàn thành nhiệm vụ boss không.',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  let res;
  try {
    res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: BOSS_PROOF_PROMPT },
          { role: 'user', content: userLine },
        ],
        temperature: 0.2,
        max_tokens: 450,
        response_format: { type: 'json_object' },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await res.text();
  if (!res.ok) {
    let hint = rawBody.slice(0, 320);
    try {
      const errJson = JSON.parse(rawBody);
      hint = errJson?.error?.message ?? hint;
    } catch {
      /* keep */
    }
    throw new Error(`OpenAI boss proof HTTP ${res.status}: ${hint}`);
  }

  let json;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new Error('OpenAI boss proof: không đọc được body');
  }
  const text = String(json?.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('OpenAI boss proof: không có nội dung');

  let parsedRaw;
  try {
    parsedRaw = JSON.parse(stripJsonFromMarkdown(text));
  } catch {
    throw new Error('OpenAI boss proof: không đọc được JSON');
  }

  return normalizeBossProofVerdict(parsedRaw, taskPassScore);
}
