import test from "node:test";
import assert from "node:assert/strict";
import { formatLocationDetails, googleMapsUrl } from "../src/messages.js";

const record = {
  latitude: 25.033964,
  longitude: 121.564468,
  accuracy: 8,
  note: "B2 <17>",
  savedAt: "2026-08-05T00:00:00.000Z",
};

test("googleMapsUrl encodes a coordinate query", () => {
  assert.equal(
    googleMapsUrl(record),
    "https://www.google.com/maps/search/?api=1&query=25.033964%2C121.564468",
  );
});

test("location details escape user notes", () => {
  const text = formatLocationDetails(record, { timeZone: "Asia/Taipei" });
  assert.match(text, /B2 &lt;17&gt;/);
  assert.doesNotMatch(text, /B2 <17>/);
  assert.match(text, /定位誤差：約 8 公尺/);
});
