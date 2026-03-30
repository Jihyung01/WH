import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  conditions: Record<string, string>;
}

const CONDITION_LABELS: Record<string, Record<string, string>> = {
  weather: {
    rain: '🌧️ 비 한정',
    clear: '☀️ 맑은 날',
    snow: '❄️ 눈 한정',
    clouds: '☁️ 흐린 날',
  },
  time: {
    morning: '🌅 아침 한정',
    afternoon: '☀️ 오후 한정',
    evening: '🌇 저녁 한정',
    night: '🌙 야간 한정',
  },
  season: {
    spring: '🌸 봄 한정',
    summer: '☀️ 여름 한정',
    autumn: '🍂 가을 한정',
    winter: '❄️ 겨울 한정',
  },
};

export default function ConditionalBadge({ conditions }: Props) {
  const labels: string[] = [];
  for (const [key, value] of Object.entries(conditions)) {
    const label = CONDITION_LABELS[key]?.[value];
    if (label) labels.push(label);
  }
  if (labels.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{labels[0]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(45, 212, 168, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2DD4A8',
  },
});
