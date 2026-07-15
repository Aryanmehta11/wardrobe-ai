import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../theme';
import {
  Color,
  COLOR_SWATCHES,
  COLORS,
  ITEM_TYPES,
  ItemTags,
  PATTERNS,
  SEASONS,
  STYLES,
} from '../types';

interface ChipRowProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
}

export function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: ChipRowProps<T>) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => onChange(opt)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

interface SwatchRowProps {
  label: string;
  value: Color | null;
  onChange: (c: Color | null) => void;
  allowNone?: boolean;
}

export function SwatchRow({ label, value, onChange, allowNone }: SwatchRowProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>
        {label}
        {value ? `: ${value}` : ''}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {allowNone && (
            <TouchableOpacity
              onPress={() => onChange(null)}
              style={[styles.swatch, styles.noneSwatch, value === null && styles.swatchSelected]}
              accessibilityLabel={`${label}: none`}
            >
              <Text style={styles.noneText}>—</Text>
            </TouchableOpacity>
          )}
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => onChange(c)}
              style={[
                styles.swatch,
                { backgroundColor: COLOR_SWATCHES[c] },
                value === c && styles.swatchSelected,
              ]}
              accessibilityLabel={`${label}: ${c}`}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

interface TagFormProps {
  tags: ItemTags;
  onChange: (tags: ItemTags) => void;
}

/** Full editable tag form: type/pattern/style/season chips + color swatches. */
export default function TagForm({ tags, onChange }: TagFormProps) {
  return (
    <View>
      <ChipRow
        label="Type"
        options={ITEM_TYPES}
        value={tags.type}
        onChange={(type) => onChange({ ...tags, type })}
      />
      <SwatchRow
        label="Main color"
        value={tags.primary_color}
        onChange={(c) => c && onChange({ ...tags, primary_color: c })}
      />
      <SwatchRow
        label="Second color"
        value={tags.secondary_color}
        onChange={(c) => onChange({ ...tags, secondary_color: c })}
        allowNone
      />
      <ChipRow
        label="Pattern"
        options={PATTERNS}
        value={tags.pattern}
        onChange={(pattern) => onChange({ ...tags, pattern })}
      />
      <ChipRow
        label="Style"
        options={STYLES}
        value={tags.style}
        onChange={(style) => onChange({ ...tags, style })}
      />
      <ChipRow
        label="Season"
        options={SEASONS}
        value={tags.season}
        onChange={(season) => onChange({ ...tags, season })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: theme.spacing.md },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: { flexDirection: 'row', gap: theme.spacing.sm },
  chip: {
    minHeight: theme.touchTarget - 8,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  chipText: { color: theme.colors.text, fontSize: 15 },
  chipTextSelected: { color: theme.colors.onAccent, fontWeight: '600' },
  swatch: {
    width: theme.touchTarget - 6,
    height: theme.touchTarget - 6,
    borderRadius: (theme.touchTarget - 6) / 2,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: theme.colors.accent,
  },
  noneSwatch: {
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noneText: { color: theme.colors.textMuted, fontSize: 18 },
});
