import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Control } from './controls';
import { en } from './en';
import { styles } from './styles';
export function ExistingSections() {
  const [note, setNote] = useState('');
  const [count, setCount] = useState(0);
  return (
    <View style={styles.sections}>
      <Text key="heading" style={styles.cardTitle}>
        {en.original}
      </Text>
      <View key="notes" style={styles.card}>
        <Text style={styles.body}>{en.notes}</Text>
        <TextInput
          accessibilityLabel={en.noteLabel}
          placeholder={en.noteHint}
          value={note}
          onChangeText={setNote}
          returnKeyType="done"
          style={styles.input}
        />
      </View>
      <Control
        key="action"
        title={`${en.count} ${count}`}
        onPress={() => setCount((value) => value + 1)}
      />
    </View>
  );
}
