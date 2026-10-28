import { StyleSheet } from 'react-native';
export const styles = StyleSheet.create({
  root: { padding: 16, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '700' },
  count: { fontSize: 13, marginTop: 4 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: {
    minHeight: 40,
    minWidth: 40,
    padding: 8,
    borderWidth: 1,
    borderColor: '#a3a3a3',
    borderRadius: 8,
    justifyContent: 'center',
  },
  selected: { borderWidth: 2 },
  group: { gap: 10, marginTop: 12 },
  heading: { fontSize: 18, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { padding: 4 },
});
