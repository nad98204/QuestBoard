import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BAD_HABIT_SUCCESS_XP,
  DEATH_DEBUFF_HOURS,
  DEATH_DEBUFF_XP_MULT,
  DEATH_XP_PENALTY,
  EXERCISE_FULL_XP,
  EXERCISE_STAT_GAIN,
  GOOD_HABIT_BONUS_XP,
  GOOD_HABIT_XP,
  HP_DAILY_HEAL_CAP,
  HP_DAMAGE_BAD_HABIT,
  HP_DAMAGE_BAD_HABIT_REDUCED,
  HP_HEAL_EXERCISE,
  HP_HEAL_GOOD_HABIT,
  HP_HEAL_OVERCOME,
  HP_HEAL_PENALTY_COMPLETE,
  MANA_BASE_MAX,
  MANA_GAIN_EXERCISE,
  MANA_GAIN_EXERCISE_FULL_BONUS,
  MANA_GAIN_GOOD_HABIT,
  MANA_GAIN_MIND_HABIT_EXTRA,
  MANA_GAIN_OVERCOME,
  MANA_SKILL_COSTS,
  OVERCOME_XP,
  PENALTY_HP_COST,
  REVIVAL_HP,
  STAT_MILESTONES,
  STATS,
  WORK_TASK_XP,
} from '../utils/constants';
import {
  expToNextStatLevel,
  getPassiveBonus,
  STAT_MAX_LEVEL,
  xpToNextLevel,
} from '../utils/rpg';

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RuleRow({ name, effect, condition, note, tone = 'neutral' }) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleMain}>
        <Text style={styles.ruleName}>{name}</Text>
        {condition ? <Text style={styles.ruleCondition}>{condition}</Text> : null}
        {note ? <Text style={styles.ruleNote}>{note}</Text> : null}
      </View>
      <Text style={[styles.ruleEffect, styles[`tone_${tone}`]]}>{effect}</Text>
    </View>
  );
}

function Formula({ label, value }) {
  return (
    <View style={styles.formulaRow}>
      <Text style={styles.formulaLabel}>{label}</Text>
      <Text style={styles.formulaValue}>{value}</Text>
    </View>
  );
}

const exerciseXpEach = Math.floor(EXERCISE_FULL_XP / 3);
const deathXpPenaltyPct = Math.round(DEATH_XP_PENALTY * 100);
const deathXpMultPct = Math.round(DEATH_DEBUFF_XP_MULT * 100);

export default function RulesScreen({ onClose }) {
  const basePassive = getPassiveBonus(1);
  const level5Passive = getPassiveBonus(5);
  const level30Passive = getPassiveBonus(30);
  const level50Passive = getPassiveBonus(50);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.headerTitle}>Bảng luật hệ thống</Text>
          <Text style={styles.headerSub}>Toàn bộ cộng, trừ, phạt, hồi và luật reset</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeTap}>
          <Text style={styles.closeText}>Đóng</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Section title="Tổng quan hằng ngày">
          <RuleRow
            name="Công việc"
            effect={`+${WORK_TASK_XP} XP`}
            condition="Tự nhập nhiệm vụ trong ngày."
            note="Không hồi HP. Nếu bật Tập trung, nhiệm vụ công việc tiếp theo được x2 XP."
            tone="good"
          />
          <RuleRow
            name="Thể dục"
            effect={`+${exerciseXpEach} XP / mục`}
            condition="Chạy bộ, hít đất, gập bụng."
            note={`Mỗi mục còn hồi +${HP_HEAL_EXERCISE} HP và +${MANA_GAIN_EXERCISE} MP.`}
            tone="good"
          />
          <RuleRow
            name="Thói quen tốt"
            effect={`+${GOOD_HABIT_XP} XP / mục`}
            condition="Tùy chọn, làm được bao nhiêu nhận thưởng bấy nhiêu."
            note={`Mỗi mục hồi +${HP_HEAL_GOOD_HABIT} HP và +${MANA_GAIN_GOOD_HABIT} MP.`}
            tone="good"
          />
          <RuleRow
            name="Bỏ thói quen xấu"
            effect={`+${BAD_HABIT_SUCCESS_XP} XP hoặc mất HP`}
            condition="Bắt buộc phải báo cáo mỗi ngày."
            note="Không tick đến ngày mới sẽ bị tính là thất bại tự động."
            tone="warn"
          />
          <RuleRow
            name="Vượt qua bản thân"
            effect={`${OVERCOME_XP.easy}/${OVERCOME_XP.normal}/${OVERCOME_XP.hard} XP`}
            condition="Quest tùy chọn theo độ khó easy / normal / hard."
            note={`Mỗi quest hoàn thành hồi +${HP_HEAL_OVERCOME} HP và +${MANA_GAIN_OVERCOME} MP.`}
            tone="good"
          />
        </Section>

        <Section title="HP, hồi máu và cái chết">
          <RuleRow
            name="Giới hạn hồi HP thường"
            effect={`+${HP_DAILY_HEAL_CAP} HP / ngày`}
            condition="Áp dụng cho hồi từ thể dục, thói quen tốt, vượt qua bản thân."
            note="Qua ngày mới giới hạn này reset về 0."
            tone="good"
          />
          <RuleRow
            name="Hoàn thành phạt"
            effect={`+${HP_HEAL_PENALTY_COMPLETE} HP`}
            condition="Hồi riêng khi trả nợ phạt."
            note="Khoản hồi này vượt qua giới hạn hồi HP thường trong ngày."
            tone="good"
          />
          <RuleRow
            name="Thất bại thói quen xấu"
            effect={`-${HP_DAMAGE_BAD_HABIT} HP`}
            condition="Bấm thất bại hoặc quên báo cáo đến ngày mới."
            note={`Nếu Tinh thần Lv.5, damage giảm còn -${HP_DAMAGE_BAD_HABIT_REDUCED} HP.`}
            tone="bad"
          />
          <RuleRow
            name="Chết"
            effect={`-${deathXpPenaltyPct}% XP`}
            condition="HP về 0."
            note={`Streak về 0, mất ${deathXpPenaltyPct}% XP trong level hiện tại, dính debuff ${DEATH_DEBUFF_HOURS}h chỉ nhận ${deathXpMultPct}% XP.`}
            tone="bad"
          />
          <RuleRow
            name="Hồi sinh"
            effect={`${REVIVAL_HP} HP`}
            condition="Khi nhân vật đang chết."
            note="Sau hồi sinh vẫn cần chơi cẩn thận vì debuff XP có thể còn hiệu lực."
            tone="warn"
          />
          <Formula label="HP tối đa Lv.1" value={`${basePassive.maxHp} HP`} />
          <Formula label="HP tối đa Lv.5" value={`${level5Passive.maxHp} HP`} />
          <Formula label="HP tối đa Lv.30+" value={`${level30Passive.maxHp} HP`} />
        </Section>

        <Section title="Luật phạt">
          <RuleRow
            name="Điều kiện bị phạt"
            effect="Thiếu thể dục"
            condition="Hệ thống kiểm tra ngày hôm qua."
            note="Nếu hôm qua không hoàn thành đủ toàn bộ mục thể dục, hôm nay sinh quest phạt."
            tone="bad"
          />
          <RuleRow
            name="Làm quest phạt"
            effect={`+80 XP, +${HP_HEAL_PENALTY_COMPLETE} HP`}
            condition="Hoàn thành nhiệm vụ phạt trong ngày."
            note="Quest phạt còn tăng Trí tuệ thêm EXP chỉ số."
            tone="good"
          />
          <RuleRow
            name="Bỏ qua phạt"
            effect={`-${PENALTY_HP_COST} HP`}
            condition="Chọn bỏ qua thay vì làm."
            note="Nếu HP về 0 thì kích hoạt luật chết."
            tone="bad"
          />
        </Section>

        <Section title="Mana và kỹ năng">
          <RuleRow
            name="Mana tối đa"
            effect={`${MANA_BASE_MAX}+ MP`}
            condition="Tăng theo level, Tinh thần và Trí tuệ."
            note="Công thức: 50 + 5 MP mỗi 5 level sau Lv.1 + Tinh thần x3 + Trí tuệ x2."
            tone="mana"
          />
          <RuleRow
            name="Thói quen tốt"
            effect={`+${MANA_GAIN_GOOD_HABIT} MP`}
            condition="Mỗi mục hoàn thành."
            note={`Thiền và đọc sách được cộng thêm +${MANA_GAIN_MIND_HABIT_EXTRA} MP.`}
            tone="mana"
          />
          <RuleRow
            name="Hoàn thành đủ thể dục"
            effect={`+${MANA_GAIN_EXERCISE_FULL_BONUS} MP`}
            condition="Làm đủ cả 3 mục thể dục trong ngày."
            note="Thưởng này chỉ nhận một lần mỗi ngày."
            tone="mana"
          />
          <RuleRow
            name="Tập trung"
            effect={`-${MANA_SKILL_COSTS.focus} MP`}
            condition="Kỹ năng chủ động."
            note="Nhiệm vụ công việc tiếp theo nhận x2 XP, sau đó buff tự tắt."
            tone="mana"
          />
          <RuleRow
            name="Khiên"
            effect={`-${MANA_SKILL_COSTS.shield} MP`}
            condition="Kỹ năng chủ động."
            note="Lần thất bại thói quen xấu tiếp theo bị giảm một nửa damage."
            tone="mana"
          />
          <RuleRow
            name="Thanh tẩy"
            effect={`-${MANA_SKILL_COSTS.purify} MP`}
            condition="Chỉ dùng khi có thói quen xấu bị auto-fail vì quên báo cáo."
            note="Hoàn lại một lần damage auto-fail gần nhất nếu nhân vật còn sống."
            tone="mana"
          />
        </Section>

        <Section title="XP, level và hệ số">
          <Formula label="XP lên level nhân vật" value="80 + (level - 1) x 45" />
          <Formula label="XP cần ở Lv.1" value={`${xpToNextLevel(1)} XP`} />
          <Formula label="XP lên level chỉ số" value="50 + level chỉ số x 20" />
          <Formula label="Level chỉ số tối đa" value={`Lv.${STAT_MAX_LEVEL}`} />
          <Formula label="Streak 3 ngày" value="x1.2 XP" />
          <Formula label="Streak 7 ngày" value="x1.5 XP" />
          <Formula label="Bonus chỉ số" value="+2% XP mỗi 10 level chỉ số tổng" />
          <Formula label="Trần bonus chỉ số thường" value="x1.5 XP" />
          <Formula label="Trần bonus chỉ số Lv.50" value={`x${level50Passive.statBonusCap.toFixed(1)} XP`} />
          <Formula label="Bonus nhân vật Lv.20+" value="x1.05 XP" />
        </Section>

        <Section title="Chỉ số nhân vật">
          <RuleRow
            name={STATS.strength.label}
            effect={`+${EXERCISE_STAT_GAIN.push}/${EXERCISE_STAT_GAIN.sit} EXP`}
            condition="Hít đất / gập bụng."
            note="Mỗi level tăng chỉ tiêu hít đất và gập bụng."
            tone="good"
          />
          <RuleRow
            name={STATS.endurance.label}
            effect={`+${EXERCISE_STAT_GAIN.run} EXP`}
            condition="Chạy bộ."
            note="Mỗi level tăng chỉ tiêu chạy."
            tone="good"
          />
          <RuleRow
            name={STATS.spirit.label}
            effect="EXP từ thiền"
            condition="Làm thói quen tốt liên quan tinh thần."
            note={STAT_MILESTONES.spirit[5].desc}
            tone="good"
          />
          <RuleRow
            name={STATS.discipline.label}
            effect="+3 EXP"
            condition="Tránh thói quen xấu thành công."
            note={STAT_MILESTONES.discipline[5].desc}
            tone="good"
          />
          <RuleRow
            name={STATS.wisdom.label}
            effect="+5 EXP"
            condition="Đọc sách, vượt qua bản thân, hoàn thành phạt."
            note={STAT_MILESTONES.wisdom[5].desc}
            tone="good"
          />
          <Formula label="Mốc Sức mạnh Lv.10" value={STAT_MILESTONES.strength[10].desc} />
          <Formula label="Mốc Thể lực Lv.10" value={STAT_MILESTONES.endurance[10].desc} />
          <Formula label="EXP chỉ số Lv.1 cần" value={`${expToNextStatLevel(1)} EXP`} />
        </Section>

        <Section title="Thói quen tốt">
          <RuleRow
            name="Không bắt buộc làm hết"
            effect="Không phạt"
            condition="Bỏ sót thói quen tốt."
            note="Đây là nhóm thưởng thêm, không phải luật kỷ luật bắt buộc."
            tone="neutral"
          />
          <Formula label="Hoàn thành 2/4" value={`+${GOOD_HABIT_BONUS_XP[2]} XP bonus`} />
          <Formula label="Hoàn thành 3/4" value={`+${GOOD_HABIT_BONUS_XP[3]} XP bonus`} />
          <Formula label="Hoàn thành 4/4" value={`+${GOOD_HABIT_BONUS_XP[4]} XP bonus`} />
        </Section>

        <Section title="AI, random và reset ngày">
          <RuleRow
            name="AI GPT"
            effect="Tạo gợi ý"
            condition="Dùng cho thói quen, thể dục và quest vượt qua bản thân."
            note="Gemini đã bị bỏ khỏi hệ thống."
            tone="mana"
          />
          <RuleRow
            name="Random theo ngày"
            effect="Đổi mỗi ngày"
            condition="Mỗi ngày có seed và cache riêng."
            note="Nếu AI lỗi hoặc thiếu API key, app dùng fallback nội bộ để vẫn chơi được."
            tone="neutral"
          />
          <RuleRow
            name="Reset ngày"
            effect="Làm mới bảng"
            condition="Khi sang ngày mới."
            note="Reset nhiệm vụ ngày, giới hạn hồi HP, trạng thái thói quen tốt/xấu, thể dục và quest vượt qua bản thân."
            tone="neutral"
          />
          <RuleRow
            name="Nghỉ cuối tuần"
            effect="Không trừ HP, không gãy chuỗi"
            condition="Áp dụng cho Thứ bảy và Chủ nhật."
            note="Nhiệm vụ cuối tuần là tự nguyện; nếu muốn vẫn có thể chủ động làm để nhận thưởng."
            tone="good"
          />
          <RuleRow
            name="Quên báo cáo thói quen xấu"
            effect="Auto-fail"
            condition="Sang ngày mới mà mục xấu vẫn chưa tick."
            note="Ngày thường sẽ bị tính là thất bại và trừ HP trước khi tạo ngày mới; cuối tuần được tính là nghỉ."
            tone="bad"
          />
        </Section>
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
    fontWeight: '900',
  },
  headerSub: {
    color: '#908a82',
    fontSize: 11,
    marginTop: 3,
  },
  closeTap: { paddingVertical: 8, paddingHorizontal: 12 },
  closeText: { color: '#d4af37', fontWeight: '800', fontSize: 15 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
  },
  section: {
    backgroundColor: '#14141c',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a2a38',
  },
  sectionTitle: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#252532',
  },
  ruleMain: {
    flex: 1,
    minWidth: 0,
  },
  ruleName: {
    color: '#f3eee6',
    fontSize: 14,
    fontWeight: '800',
  },
  ruleCondition: {
    color: '#a9a39a',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  ruleNote: {
    color: '#706b78',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  ruleEffect: {
    minWidth: 82,
    maxWidth: 116,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  tone_neutral: { color: '#c9c3ba' },
  tone_good: { color: '#7dd87d' },
  tone_warn: { color: '#facc15' },
  tone_bad: { color: '#fb7185' },
  tone_mana: { color: '#38bdf8' },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#252532',
  },
  formulaLabel: {
    flex: 1,
    minWidth: 0,
    color: '#a9a39a',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  formulaValue: {
    flex: 1,
    color: '#f3eee6',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'right',
    fontWeight: '800',
  },
});
