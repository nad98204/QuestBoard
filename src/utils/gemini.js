const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const XP_MIN = 60;
const XP_MAX = 150;

export function getVietnameseWeekdayName(date = new Date()) {
  const labels = [
    'Chủ nhật',
    'Thứ hai',
    'Thứ ba',
    'Thứ tư',
    'Thứ năm',
    'Thứ sáu',
    'Thứ bảy',
  ];
  return labels[date.getDay()] ?? labels[0];
}

function clampXp(n) {
  const v = Number.isFinite(n) ? Math.round(n) : XP_MIN;
  return Math.min(XP_MAX, Math.max(XP_MIN, v));
}

function stripJsonFromMarkdown(text) {
  const t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  return t;
}

function parseQuestsPayload(text) {
  const raw = stripJsonFromMarkdown(text);
  const data = JSON.parse(raw);
  const list = data.quests ?? data;
  if (!Array.isArray(list)) return null;
  return list;
}

function normalizeQuestEntry(entry) {
  const title = String(entry?.name ?? entry?.title ?? '').trim();
  const xp = clampXp(Number(entry?.xp));
  if (!title) return null;
  return { title, xp };
}

/**
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} params.weekdayLabel
 * @param {string} params.dateKey
 * @param {number} params.streak
 * @param {number} params.level
 * @returns {Promise<Array<{ title: string; xp: number }>>}
 */
export async function fetchOvercomeQuestsFromGemini(params) {
  try {
    const { apiKey, weekdayLabel, dateKey, streak, level } = params;
    if (!apiKey) {
      throw new Error('Thiếu GEMINI_API_KEY');
    }

    const prompt = `Bạn là trợ lý gamification cho app thói quen "Vượt qua bản thân".
Thông tin hôm nay:
- Thứ trong tuần (tiếng Việt): ${weekdayLabel}
- Ngày (YYYY-MM-DD): ${dateKey}
- Streak hiện tại của người chơi: ${streak} ngày
- Level hiện tại: ${level}

Tạo đúng 3 quest chủ đề "Vượt qua bản thân": thử thách cụ thể, thực tế, có thể bắt đầu và hoàn thành trong hôm nay (không trùng lặp ý).
Mỗi quest có XP là số nguyên từ ${XP_MIN} đến ${XP_MAX}; quest khó/mạo hiểm hơn nên có XP cao hơn.

CHỈ trả về một đối tượng JSON hợp lệ, KHÔNG markdown, KHÔNG giải thích thêm.
Đúng format:
{"quests":[{"name":"Tên quest","xp":90},{"name":"...","xp":100},{"name":"...","xp":120}]}`;

    const url = `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    let res;
    try {
      console.log('Đang gọi Gemini API...');
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            responseMimeType: 'application/json',
          },
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    console.log('[Gemini] response.status', res.status);

    const rawResponseText = await res.text();
    console.log('[Gemini] raw response text (trước khi parse)', rawResponseText);

    if (!res.ok) {
      throw new Error(
        `Gemini HTTP ${res.status}: ${rawResponseText.slice(0, 200)}`
      );
    }

    let json;
    try {
      json = JSON.parse(rawResponseText);
    } catch (parseErr) {
      console.error('[Gemini] JSON.parse body lỗi', parseErr);
      throw new Error('Gemini body không phải JSON hợp lệ');
    }

    const text =
      json?.candidates?.[0]?.content?.parts
        ?.map((p) => p?.text ?? '')
        .join('')
        .trim() ?? '';

    if (!text) {
      throw new Error('Gemini không trả nội dung');
    }

    let list;
    try {
      list = parseQuestsPayload(text);
    } catch (parseQuestsErr) {
      console.error('[Gemini] parseQuestsPayload lỗi', parseQuestsErr);
      throw new Error('Gemini trả JSON không parse được');
    }
    if (!list || list.length < 3) {
      throw new Error('Gemini không trả đủ 3 quest');
    }

    const normalized = list
      .slice(0, 3)
      .map(normalizeQuestEntry)
      .filter(Boolean);

    if (normalized.length !== 3) {
      throw new Error('Quest sau chuẩn hóa không hợp lệ');
    }

    return normalized;
  } catch (err) {
    console.error('[Gemini] lỗi đầy đủ', {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
      cause: err?.cause,
    });
    console.error('[Gemini] lỗi (raw):', err);
    throw err;
  }
}

export { XP_MIN as GEMINI_XP_MIN, XP_MAX as GEMINI_XP_MAX };
