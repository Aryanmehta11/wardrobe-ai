import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TagForm from '../components/TagForm';
import { deleteItem, getItem, setFavorite, updateItem } from '../db/database';
import { theme } from '../theme';
import { Item, ItemTags, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

export default function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const [item, setItem] = useState<Item | null>(null);
  const [tags, setTags] = useState<ItemTags | null>(null);
  const [dirty, setDirty] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getItem(itemId).then((row) => {
        if (active && row) {
          setItem(row);
          setTags({
            type: row.type,
            primary_color: row.primary_color,
            secondary_color: row.secondary_color,
            pattern: row.pattern,
            style: row.style,
            season: row.season,
          });
        }
      });
      return () => {
        active = false;
      };
    }, [itemId])
  );

  if (!item || !tags) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  const onTagsChange = (t: ItemTags) => {
    setTags(t);
    setDirty(true);
  };

  const saveChanges = async () => {
    await updateItem(item.id, tags);
    setDirty(false);
  };

  const toggleFavorite = async () => {
    await setFavorite(item.id, !item.favorite);
    setItem({ ...item, favorite: !item.favorite });
  };

  const confirmDelete = () => {
    Alert.alert('Delete item', 'Remove this piece from your closet?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteItem(item.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: item.image_uri }} style={styles.image} />

      <TouchableOpacity style={styles.favoriteRow} onPress={toggleFavorite}>
        <Text style={styles.favoriteText}>
          {item.favorite ? '♥ Favorited' : '♡ Mark as favorite'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.matchButton}
        onPress={() => navigation.navigate('Match', { itemId: item.id })}
      >
        <Text style={styles.matchButtonText}>✨ What goes with this?</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Tags</Text>
      <TagForm tags={tags} onChange={onTagsChange} />

      {dirty && (
        <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
          <Text style={styles.saveText}>Save changes</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
        <Text style={styles.deleteText}>Delete item</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  favoriteRow: {
    minHeight: theme.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteText: { color: theme.colors.accent, fontSize: 16, fontWeight: '600' },
  matchButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    minHeight: theme.touchTarget + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  matchButtonText: { color: theme.colors.onAccent, fontSize: 17, fontWeight: '700' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  saveButton: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.radius.lg,
    minHeight: theme.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteButton: {
    marginTop: theme.spacing.lg,
    minHeight: theme.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: theme.colors.danger, fontSize: 16, fontWeight: '600' },
});
