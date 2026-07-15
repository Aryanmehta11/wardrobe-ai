import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteOutfit, getItems, getOutfits } from '../db/database';
import { theme } from '../theme';
import { Item, Outfit, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Outfits'>;

export default function OutfitsScreen(_props: Props) {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [itemsById, setItemsById] = useState<Map<number, Item>>(new Map());
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    let active = true;
    Promise.all([getOutfits(), getItems()]).then(([o, items]) => {
      if (!active) return;
      setOutfits(o);
      setItemsById(new Map(items.map((i) => [i.id, i])));
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(reload);

  const confirmDelete = (outfit: Outfit) => {
    Alert.alert('Delete outfit', `Remove "${outfit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteOutfit(outfit.id);
          reload();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={outfits}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item: outfit }) => {
          const pieces = outfit.item_ids
            .map((id) => itemsById.get(id))
            .filter((i): i is Item => !!i);
          return (
            <TouchableOpacity
              style={styles.card}
              onLongPress={() => confirmDelete(outfit)}
              delayLongPress={400}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {outfit.name}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{outfit.score}</Text>
                </View>
              </View>
              <View style={styles.thumbRow}>
                {pieces.map((p) => (
                  <Image key={p.id} source={{ uri: p.image_uri }} style={styles.thumb} />
                ))}
                {pieces.length < outfit.item_ids.length && (
                  <View style={[styles.thumb, styles.missingThumb]}>
                    <Text style={styles.missingText}>?</Text>
                  </View>
                )}
              </View>
              <Text style={styles.hint}>Long-press to delete</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>👗</Text>
              <Text style={styles.emptyTitle}>No saved outfits yet</Text>
              <Text style={styles.emptyBody}>
                Open any item, tap "What goes with this?", pick pieces you like, and save
                the combination here.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: theme.spacing.md, gap: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.colors.text },
  badge: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { color: theme.colors.onAccent, fontWeight: '700' },
  thumbRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  missingThumb: { alignItems: 'center', justifyContent: 'center' },
  missingText: { color: theme.colors.textMuted, fontSize: 20 },
  hint: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  emptyEmoji: { fontSize: 56, marginBottom: theme.spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  emptyBody: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
