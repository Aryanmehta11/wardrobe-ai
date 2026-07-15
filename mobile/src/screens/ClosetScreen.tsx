import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getItems } from '../db/database';
import { theme } from '../theme';
import {
  Color,
  COLOR_SWATCHES,
  COLORS,
  Item,
  ITEM_TYPES,
  ItemType,
  RootStackParamList,
  Style,
  STYLES,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Closet'>;

export default function ClosetScreen({ navigation }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ItemType | null>(null);
  const [colorFilter, setColorFilter] = useState<Color | null>(null);
  const [styleFilter, setStyleFilter] = useState<Style | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getItems().then((rows) => {
        if (active) {
          setItems(rows);
          setLoaded(true);
        }
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (!typeFilter || i.type === typeFilter) &&
          (!colorFilter ||
            i.primary_color === colorFilter ||
            i.secondary_color === colorFilter) &&
          (!styleFilter || i.style === styleFilter)
      ),
    [items, typeFilter, colorFilter, styleFilter]
  );

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
    >
      <Image source={{ uri: item.image_uri }} style={styles.cardImage} />
      <View style={styles.cardFooter}>
        <View
          style={[styles.colorDot, { backgroundColor: COLOR_SWATCHES[item.primary_color] }]}
        />
        <Text style={styles.cardText} numberOfLines={1}>
          {item.favorite ? '♥ ' : ''}
          {item.type}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {ITEM_TYPES.map((t) => (
              <FilterChip
                key={t}
                label={t}
                selected={typeFilter === t}
                onPress={() => setTypeFilter(typeFilter === t ? null : t)}
              />
            ))}
          </View>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColorFilter(colorFilter === c ? null : c)}
                style={[
                  styles.colorFilter,
                  { backgroundColor: COLOR_SWATCHES[c] },
                  colorFilter === c && styles.colorFilterSelected,
                ]}
                accessibilityLabel={`filter color ${c}`}
              />
            ))}
          </View>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {STYLES.map((s) => (
              <FilterChip
                key={s}
                label={s}
                selected={styleFilter === s}
                onPress={() => setStyleFilter(styleFilter === s ? null : s)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {loaded && items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🧺</Text>
          <Text style={styles.emptyTitle}>Your closet is empty</Text>
          <Text style={styles.emptyBody}>
            Snap a photo of a clothing item to start building your digital wardrobe.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('AddItem')}
          >
            <Text style={styles.emptyButtonText}>Add your first item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: theme.spacing.md }}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            loaded ? (
              <Text style={styles.noMatch}>Nothing matches those filters.</Text>
            ) : null
          }
        />
      )}

      {items.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddItem')}
          accessibilityLabel="Add item"
        >
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  filters: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  filterRow: { flexDirection: 'row', gap: theme.spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText: { color: theme.colors.text, fontSize: 14 },
  chipTextSelected: { color: theme.colors.onAccent, fontWeight: '600' },
  colorFilter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  colorFilterSelected: { borderWidth: 3, borderColor: theme.colors.accent },
  grid: { padding: theme.spacing.md, gap: theme.spacing.md },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardImage: { width: '100%', aspectRatio: 1, backgroundColor: theme.colors.surfaceAlt },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  cardText: { color: theme.colors.text, fontSize: 14, textTransform: 'capitalize' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyEmoji: { fontSize: 56, marginBottom: theme.spacing.md },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  emptyBody: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    minHeight: theme.touchTarget,
    justifyContent: 'center',
  },
  emptyButtonText: { color: theme.colors.onAccent, fontSize: 16, fontWeight: '600' },
  noMatch: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xl,
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: theme.colors.onAccent, fontSize: 30, lineHeight: 34 },
});
