import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getItem, getItems, saveOutfit } from '../db/database';
import { MatchResult, rankMatches, scoreMatch } from '../logic/matcher';
import { theme } from '../theme';
import { Item, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Match'>;

function scoreColor(score: number): string {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export default function MatchScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const [base, setBase] = useState<Item | null>(null);
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [outfitName, setOutfitName] = useState('');
  const [savingOutfit, setSavingOutfit] = useState(false);

  useEffect(() => {
    (async () => {
      const [item, closet] = await Promise.all([getItem(itemId), getItems()]);
      if (item) {
        setBase(item);
        setMatches(rankMatches(item, closet));
      }
    })();
  }, [itemId]);

  const sections = useMemo(() => {
    if (!matches) return [];
    const byType = new Map<string, MatchResult[]>();
    for (const m of matches) {
      const list = byType.get(m.item.type) ?? [];
      list.push(m);
      byType.set(m.item.type, list);
    }
    return [...byType.entries()].map(([type, data]) => ({ title: type, data }));
  }, [matches]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const outfitScore = useMemo(() => {
    if (!base || !matches || selected.size === 0) return 0;
    const chosen = matches.filter((m) => selected.has(m.item.id));
    // Average pairwise score across all pieces in the outfit (base + chosen).
    const pieces = [base, ...chosen.map((m) => m.item)];
    let total = 0;
    let pairs = 0;
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        total += scoreMatch(pieces[i], pieces[j]).score;
        pairs++;
      }
    }
    return pairs ? Math.round(total / pairs) : 0;
  }, [base, matches, selected]);

  const onSaveOutfit = async () => {
    if (!base || selected.size === 0) return;
    const name = outfitName.trim() || `Outfit with ${base.type}`;
    setSavingOutfit(true);
    try {
      await saveOutfit(name, [base.id, ...selected], outfitScore);
      Alert.alert('Saved', `"${name}" added to your outfits.`, [
        { text: 'View outfits', onPress: () => navigation.navigate('Outfits') },
        { text: 'OK' },
      ]);
      setSelected(new Set());
      setOutfitName('');
    } finally {
      setSavingOutfit(false);
    }
  };

  if (!base || !matches) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(m) => String(m.item.id)}
        ListHeaderComponent={
          <View style={styles.header}>
            <Image source={{ uri: base.image_uri }} style={styles.baseImage} />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                Pairing with your {base.primary_color} {base.type}
              </Text>
              <Text style={styles.headerSub}>
                Tap pieces to build an outfit, then save it below.
              </Text>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}s</Text>
        )}
        renderItem={({ item: m }) => {
          const isSelected = selected.has(m.item.id);
          return (
            <TouchableOpacity
              style={[styles.matchCard, isSelected && styles.matchCardSelected]}
              onPress={() => toggleSelect(m.item.id)}
            >
              <Image source={{ uri: m.item.image_uri }} style={styles.matchImage} />
              <View style={styles.matchInfo}>
                <View style={styles.matchTopRow}>
                  <Text style={styles.matchName} numberOfLines={1}>
                    {m.item.primary_color} {m.item.pattern !== 'solid' ? m.item.pattern + ' ' : ''}
                    {m.item.type}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: scoreColor(m.score) }]}>
                    <Text style={styles.badgeText}>{m.score}</Text>
                  </View>
                </View>
                <Text style={styles.reason} numberOfLines={2}>
                  {m.reason}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No other pieces to match yet — add more items to your closet first.
          </Text>
        }
        contentContainerStyle={styles.list}
      />

      {selected.size > 0 && (
        <View style={styles.saveBar}>
          <TextInput
            style={styles.nameInput}
            placeholder="Name this outfit"
            placeholderTextColor={theme.colors.textMuted}
            value={outfitName}
            onChangeText={setOutfitName}
          />
          <TouchableOpacity
            style={[styles.saveButton, savingOutfit && { opacity: 0.6 }]}
            onPress={onSaveOutfit}
            disabled={savingOutfit}
          >
            <Text style={styles.saveButtonText}>
              Save ({selected.size + 1} pieces · {outfitScore})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: theme.spacing.md, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  baseImage: {
    width: 84,
    height: 84,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  headerSub: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4 },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  matchCardSelected: { borderColor: theme.colors.accent },
  matchImage: { width: 84, height: 84, backgroundColor: theme.colors.surfaceAlt },
  matchInfo: { flex: 1, padding: theme.spacing.sm, justifyContent: 'center' },
  matchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  matchName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  badge: {
    minWidth: 40,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  reason: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  nameInput: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    minHeight: theme.touchTarget,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    minHeight: theme.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: theme.colors.onAccent, fontSize: 16, fontWeight: '700' },
});
