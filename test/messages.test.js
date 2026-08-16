import test from "node:test";
import assert from "node:assert/strict";
import {
  BUTTONS,
  formatLocationDetails,
  googleMapsUrl,
  mainKeyboard,
  welcomeText,
} from "../src/messages.js";

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
  assert.match(text, /位置記好了/);
  assert.match(text, /B2 &lt;17&gt;/);
  assert.doesNotMatch(text, /B2 <17>/);
  assert.match(text, /誤差：約 8 公尺/);
});

test("main keyboard uses plain-language parking actions", () => {
  assert.deepEqual(mainKeyboard().keyboard.flat().map((button) => button.text), [
    BUTTONS.save,
    BUTTONS.where,
    BUTTONS.note,
    BUTTONS.delete,
    BUTTONS.help,
  ]);
  assert.match(welcomeText(), /車位記一下/);
});
