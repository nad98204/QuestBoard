import AsyncStorage from '@react-native-async-storage/async-storage';
import { BAD_HABITS, GOOD_HABITS } from './constants';
import { addDaysToKey, getTodayKey, normalizeFitnessConfig } from './rpg';

export const AI_COACH_HISTORY_KEY = '@questboard/ai_coach_history_v1';
export const AI_HABITS_CACHE_KEY = '@questboard/ai_habits_by_date_v1';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

const MAX_MESSAGES = 50;

export function getOpenAiApiKey() {
  return (
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.EXPO_PUBLIC_OPENAI_API_KEY) ||
    ''
  );
}

function getApiKey() {
  return getOpenAiApiKey();
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
  return `Bạn là huấn luyện viên cá nhân (AI Coach) trong app QuestBoard — tập trung thói quen lành mạnh và thể dục.

Ngôn ngữ: tiếng Việt, thân thiện, cổ vũ, không phán xét.

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
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Thiếu EXPO_PUBLIC_OPENAI_API_KEY');
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
    throw new Error('Thiếu EXPO_PUBLIC_OPENAI_API_KEY');
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
