import fs from "node:fs/promises";
import path from "node:path";
import config from "./config.mjs";

const emptyStore = {
  appointments: [],
  contactMessages: []
};

let writeQueue = Promise.resolve();

function normalizeStore(store) {
  if (!store || typeof store !== "object") {
    return structuredClone(emptyStore);
  }

  return {
    appointments: Array.isArray(store.appointments) ? store.appointments : [],
    contactMessages: Array.isArray(store.contactMessages) ? store.contactMessages : []
  };
}

async function ensureStoreFile() {
  const directory = path.dirname(config.dataFile);
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.access(config.dataFile);
  } catch (error) {
    await fs.writeFile(config.dataFile, JSON.stringify(emptyStore, null, 2), "utf8");
  }
}

export async function readStore() {
  await ensureStoreFile();

  let raw = "";
  try {
    raw = await fs.readFile(config.dataFile, "utf8");
  } catch (error) {
    return structuredClone(emptyStore);
  }

  if (!raw.trim()) {
    return structuredClone(emptyStore);
  }

  try {
    return normalizeStore(JSON.parse(raw));
  } catch (error) {
    return structuredClone(emptyStore);
  }
}

async function writeStore(store) {
  const normalized = normalizeStore(store);
  const nextPayload = JSON.stringify(normalized, null, 2);
  const temporaryPath = config.dataFile + ".tmp";
  await fs.writeFile(temporaryPath, nextPayload, "utf8");
  await fs.rename(temporaryPath, config.dataFile);
  return normalized;
}

export async function updateStore(mutator) {
  let output = null;
  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      const current = await readStore();
      const next = await mutator(structuredClone(current));
      output = await writeStore(next || current);
      return output;
    });

  await writeQueue;
  return output;
}
