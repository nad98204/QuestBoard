import { View, Text, StyleSheet } from 'react-native';

export default function SectionCard({ title, subtitle, icon, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a38',
    marginBottom: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#252532',
  },
  icon: { fontSize: 22, marginRight: 10 },
  titles: { flex: 1 },
  title: {
    color: '#f0ebe3',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#7d786f',
    fontSize: 12,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
