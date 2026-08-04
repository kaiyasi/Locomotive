import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_NOTE_LENGTH = 500;

function userKey(userId) {
  const key = String(userId ?? "").trim();
  if (!key) {
    throw new Error("A Telegram user ID is required.");
  }
  return key;
}

function normalizeNote(note) {
  if (note === null || note === undefined) {
    return null;
  }

  const normalized = String(note).trim();
  return normalized ? normalized.slice(0, MAX_NOTE_LENGTH) : null;
}

export function normalizeLocation(location) {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  const accuracy = Number(location?.horizontal_accuracy);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("The location latitude is invalid.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("The location longitude is invalid.");
  }

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
  };
}

export class ParkingStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.records = {};
    this.initialized = false;
  }

  async init() {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("The parking data file must contain a JSON object.");
      }
      this.records = parsed;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw new Error(`Unable to load parking data: ${error.message}`, { cause: error });
      }
      this.records = {};
    }

    this.initialized = true;
  }

  assertInitialized() {
    if (!this.initialized) {
      throw new Error("ParkingStore.init() must be called before using the store.");
    }
  }

  get(userId) {
    this.assertInitialized();
    const record = this.records[userKey(userId)];
    return record ? structuredClone(record) : null;
  }

  async saveLocation(userId, location, { chatId, note } = {}) {
    this.assertInitialized();
    const key = userKey(userId);
    const previous = this.records[key];
    const normalized = normalizeLocation(location);
    const record = {
      ...normalized,
      note: note === undefined ? normalizeNote(previous?.note) : normalizeNote(note),
      chatId: chatId === undefined ? previous?.chatId ?? null : String(chatId),
      savedAt: new Date().toISOString(),
    };

    this.records[key] = record;
    await this.persist();
    return structuredClone(record);
  }

  async updateNote(userId, note) {
    this.assertInitialized();
    const key = userKey(userId);
    const previous = this.records[key];
    if (!previous) {
      return null;
    }

    this.records[key] = { ...previous, note: normalizeNote(note) };
    await this.persist();
    return structuredClone(this.records[key]);
  }

  async remove(userId) {
    this.assertInitialized();
    const key = userKey(userId);
    const existed = Boolean(this.records[key]);
    if (!existed) {
      return false;
    }

    delete this.records[key];
    await this.persist();
    return true;
  }

  async persist() {
    const directory = path.dirname(this.filePath);
    await mkdir(directory, { recursive: true, mode: 0o700 });

    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await writeFile(temporaryPath, `${JSON.stringify(this.records, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => {});
      throw new Error(`Unable to save parking data: ${error.message}`, { cause: error });
    }
  }
}
