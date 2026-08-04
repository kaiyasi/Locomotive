import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { ParkingStore } from "../src/store.js";

test("ParkingStore saves, reloads, updates, and removes a location", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "locomotive-parking-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const filePath = path.join(directory, "parking.json");
  const store = new ParkingStore(filePath);
  await store.init();

  const saved = await store.saveLocation(
    42,
    { latitude: 25.033964, longitude: 121.564468, horizontal_accuracy: 8 },
    { chatId: 42, note: "B2-17" },
  );

  assert.equal(saved.latitude, 25.033964);
  assert.equal(saved.longitude, 121.564468);
  assert.equal(saved.accuracy, 8);
  assert.equal(saved.note, "B2-17");

  const reloaded = new ParkingStore(filePath);
  await reloaded.init();
  assert.deepEqual(reloaded.get("42"), saved);

  const updated = await reloaded.updateNote(42, "柱旁");
  assert.equal(updated.note, "柱旁");
  assert.equal(await reloaded.remove(42), true);
  assert.equal(reloaded.get(42), null);
  assert.equal(await reloaded.remove(42), false);
});

test("ParkingStore rejects invalid coordinates", async () => {
  const store = new ParkingStore(path.join(os.tmpdir(), "locomotive-invalid-parking.json"));
  await store.init();

  await assert.rejects(
    store.saveLocation("42", { latitude: 91, longitude: 121 }),
    /latitude is invalid/,
  );
});
