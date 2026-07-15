import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { APP_SECRET, BACKEND_URL, TAG_TIMEOUT_MS } from '../config';
import TagForm from '../components/TagForm';
import { addItem } from '../db/database';
import { theme } from '../theme';
import {
  Color,
  COLORS,
  ITEM_TYPES,
  ItemTags,
  ItemType,
  Pattern,
  PATTERNS,
  RootStackParamList,
  Season,
  SEASONS,
  Style,
  STYLES,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddItem'>;

const DEFAULT_TAGS: ItemTags = {
  type: 'top',
  primary_color: 'black',
  secondary_color: null,
  pattern: 'solid',
  style: 'casual',
  season: 'all',
};

function pickEnum<T extends string>(value: unknown, options: readonly T[]): T | null {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** Coerce whatever the backend returned into safe, known enum values. */
function sanitizeTags(raw: unknown): ItemTags {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    type: pickEnum<ItemType>(obj.type, ITEM_TYPES) ?? DEFAULT_TAGS.type,
    primary_color:
      pickEnum<Color>(obj.primary_color, COLORS) ?? DEFAULT_TAGS.primary_color,
    secondary_color: pickEnum<Color>(obj.secondary_color, COLORS),
    pattern: pickEnum<Pattern>(obj.pattern, PATTERNS) ?? DEFAULT_TAGS.pattern,
    style: pickEnum<Style>(obj.style, STYLES) ?? DEFAULT_TAGS.style,
    season: pickEnum<Season>(obj.season, SEASONS) ?? DEFAULT_TAGS.season,
  };
}

/**
 * Shrink the photo before uploading/storing: phone cameras produce multi-MB
 * images that are slow to upload and can exceed the vision model's size limit.
 * No-op on web (the manipulator is native-only and web photos are already small).
 */
async function compressImage(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: 1024 });
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    return saved.uri;
  } catch {
    return uri; // fall back to the original rather than blocking the flow
  }
}

/**
 * Copy the photo out of the camera/picker cache into permanent app storage.
 * Cache files can be purged by the OS, which would leave closet items with
 * broken images. On web, blob: URLs die on reload, so store a data URL instead.
 */
async function persistImage(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  const dir = new Directory(Paths.document, 'wardrobe-photos');
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `item_${Date.now()}.jpg`);
  new File(uri).copy(dest);
  return dest.uri;
}

async function requestTags(imageUri: string): Promise<ItemTags> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // On web the uri is a blob:/data: URL — convert it to a real Blob.
    const blob = await (await fetch(imageUri)).blob();
    form.append('image', blob, 'item.jpg');
  } else {
    // React Native's FormData accepts {uri, name, type} file descriptors.
    form.append('image', {
      uri: imageUri,
      name: 'item.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAG_TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND_URL}/tag`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
      headers: APP_SECRET ? { 'x-app-secret': APP_SECRET } : undefined,
    });
    if (!res.ok) {
      throw new Error(`Backend responded ${res.status}`);
    }
    return sanitizeTags(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

export default function AddItemScreen({ navigation }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tags, setTags] = useState<ItemTags>(DEFAULT_TAGS);
  const [tagging, setTagging] = useState(false);
  const [autoTagged, setAutoTagged] = useState<boolean | null>(null); // null = not attempted
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const onImagePicked = async (rawUri: string) => {
    const uri = await compressImage(rawUri);
    setImageUri(uri);
    setTagging(true);
    setAutoTagged(null);
    try {
      const auto = await requestTags(uri);
      setTags(auto);
      setAutoTagged(true);
    } catch {
      setTags(DEFAULT_TAGS);
      setAutoTagged(false);
    } finally {
      setTagging(false);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera unavailable', 'Camera permission was not granted. You can still pick a photo from your gallery.');
        return;
      }
    }
    setCameraOpen(true);
  };

  const snap = async () => {
    const photo = await cameraRef.current?.takePictureAsync();
    setCameraOpen(false);
    if (photo?.uri) {
      await onImagePicked(photo.uri);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await onImagePicked(result.assets[0].uri);
    }
  };

  const save = async () => {
    if (!imageUri) return;
    setSaving(true);
    try {
      const permanentUri = await persistImage(imageUri);
      await addItem(permanentUri, tags);
      navigation.goBack();
    } catch (e) {
      setSaving(false);
      Alert.alert('Could not save', String(e));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!imageUri ? (
        <View style={styles.pickers}>
          <Text style={styles.intro}>Add a piece to your closet</Text>
          <TouchableOpacity style={styles.bigButton} onPress={openCamera}>
            <Text style={styles.bigButtonEmoji}>📷</Text>
            <Text style={styles.bigButtonText}>Take a photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bigButton} onPress={pickFromGallery}>
            <Text style={styles.bigButtonEmoji}>🖼️</Text>
            <Text style={styles.bigButtonText}>Choose from gallery</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <TouchableOpacity onPress={() => setImageUri(null)}>
            <Text style={styles.retake}>Use a different photo</Text>
          </TouchableOpacity>

          {tagging ? (
            <View style={styles.taggingBox}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.taggingText}>Asking AI to tag this item…</Text>
            </View>
          ) : (
            <>
              {autoTagged === false && (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>
                    Couldn't reach the tagging service — describe the item yourself below.
                  </Text>
                </View>
              )}
              {autoTagged === true && (
                <View style={[styles.notice, styles.noticeOk]}>
                  <Text style={styles.noticeText}>
                    AI suggested these tags. Adjust anything that looks off.
                  </Text>
                </View>
              )}
              <TagForm tags={tags} onChange={setTags} />
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.6 }]}
                onPress={save}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save to closet'}</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      <Modal visible={cameraOpen} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.cameraControls}>
            <TouchableOpacity onPress={() => setCameraOpen(false)} style={styles.cameraCancel}>
              <Text style={styles.cameraCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={snap} style={styles.shutter} accessibilityLabel="Take picture" />
            <View style={styles.cameraCancel} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  pickers: { marginTop: theme.spacing.xl, gap: theme.spacing.md },
  intro: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  bigButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: 'center',
    minHeight: theme.touchTarget * 2,
    justifyContent: 'center',
  },
  bigButtonEmoji: { fontSize: 34, marginBottom: theme.spacing.sm },
  bigButtonText: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  retake: {
    color: theme.colors.accent,
    textAlign: 'center',
    marginVertical: theme.spacing.md,
    fontSize: 15,
    fontWeight: '600',
  },
  taggingBox: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  taggingText: { color: theme.colors.textMuted, fontSize: 15 },
  notice: {
    backgroundColor: '#f9edd8',
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  noticeOk: { backgroundColor: theme.colors.accentSoft },
  noticeText: { color: theme.colors.text, fontSize: 14 },
  saveButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    minHeight: theme.touchTarget + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  saveText: { color: theme.colors.onAccent, fontSize: 17, fontWeight: '700' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: '#000',
  },
  cameraCancel: { width: 80 },
  cameraCancelText: { color: '#fff', fontSize: 16 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: '#ccc',
  },
});
