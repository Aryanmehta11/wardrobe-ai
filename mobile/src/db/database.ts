import * as SQLite from 'expo-sqlite';
import { Item, ItemTags, Outfit } from '../types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Open (and lazily initialize) the app database. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('wardrobe.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          image_uri TEXT NOT NULL,
          type TEXT NOT NULL,
          primary_color TEXT NOT NULL,
          secondary_color TEXT,
          pattern TEXT NOT NULL,
          style TEXT NOT NULL,
          season TEXT NOT NULL,
          favorite INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS outfits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          item_ids TEXT NOT NULL, -- JSON array of item ids
          score INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS wear_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
          worn_date TEXT NOT NULL DEFAULT (date('now'))
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

interface ItemRow extends Omit<Item, 'favorite'> {
  favorite: number;
}

function rowToItem(row: ItemRow): Item {
  return { ...row, favorite: !!row.favorite };
}

export async function addItem(
  imageUri: string,
  tags: ItemTags
): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO items (image_uri, type, primary_color, secondary_color, pattern, style, season)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    imageUri,
    tags.type,
    tags.primary_color,
    tags.secondary_color,
    tags.pattern,
    tags.style,
    tags.season
  );
  return res.lastInsertRowId;
}

export async function updateItem(id: number, tags: ItemTags): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE items SET type = ?, primary_color = ?, secondary_color = ?, pattern = ?, style = ?, season = ?
     WHERE id = ?`,
    tags.type,
    tags.primary_color,
    tags.secondary_color,
    tags.pattern,
    tags.style,
    tags.season,
    id
  );
}

export async function setFavorite(id: number, favorite: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE items SET favorite = ? WHERE id = ?', favorite ? 1 : 0, id);
}

export async function deleteItem(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM wear_log WHERE item_id = ?', id);
  await db.runAsync('DELETE FROM items WHERE id = ?', id);
}

export async function getItems(): Promise<Item[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ItemRow>(
    'SELECT * FROM items ORDER BY created_at DESC'
  );
  return rows.map(rowToItem);
}

export async function getItem(id: number): Promise<Item | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ItemRow>('SELECT * FROM items WHERE id = ?', id);
  return row ? rowToItem(row) : null;
}

export async function logWear(itemId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO wear_log (item_id) VALUES (?)', itemId);
}

interface OutfitRow extends Omit<Outfit, 'item_ids'> {
  item_ids: string;
}

export async function saveOutfit(
  name: string,
  itemIds: number[],
  score: number
): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO outfits (name, item_ids, score) VALUES (?, ?, ?)',
    name,
    JSON.stringify(itemIds),
    score
  );
  return res.lastInsertRowId;
}

export async function getOutfits(): Promise<Outfit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<OutfitRow>(
    'SELECT * FROM outfits ORDER BY created_at DESC'
  );
  return rows.map((r) => ({ ...r, item_ids: JSON.parse(r.item_ids) as number[] }));
}

export async function deleteOutfit(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM outfits WHERE id = ?', id);
}
