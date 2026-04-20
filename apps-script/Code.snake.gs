/**
 * Vehicle API for Google Sheets (Web App) - snake_case sheet schema
 *
 * Sheet headers (row 1):
 *   id | category | brand | model | year | plate | market_price | tax_type | condition | body type | image_id | color | created_at
 *
 * Supported routes:
 *  - GET  ?action=getVehicles&limit=200&offset=0   (default, paginated)
 *  - GET  ?action=getById&id=1
 *  - POST {"action":"add","data":{...}}
 *  - POST {"action":"update","id":"1","data":{...}}
 *  - POST {"action":"delete","id":"1"}
 *
 * Returned JSON (optimized for Next.js list view):
 *  {
 *    status, ok, meta?: { total, limit, offset },
 *    VehicleId, Category, Brand, Model, Year, Plate,
 *    PriceNew, Price40, Price70,
 *    TaxType, Condition, BodyType, Color,
 *    ImageFileId, ImageThumb, Image, Time
 *  }
 */

/* ----------------- CONFIG ----------------- */

// Optional: for Standalone Script. Leave "" for bound scripts.
const SPREADSHEET_ID = "";

// Sheet tab name to use. If not found, falls back to the first tab.
const SHEET_NAME = "Vehicles";

// Timezone settings
const CAMBODIA_TIMEZONE = "Asia/Phnom_Penh";
const CAMBODIA_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

// Required columns (row 1). Existing sheets can have extra columns.
const REQUIRED_HEADERS = [
  "id",
  "category",
  "brand",
  "model",
  "year",
  "plate",
  "market_price",
  "tax_type",
  "condition",
  "body type",
  "image_id",
  "color",
  "created_at",
];

// Optional: default Drive folders per Category (used if uploadImage is called without folderId)
// CarsVMS, MotorcyclesVMS, TukTuksVMS - must support action=uploadImage in doPost
const DRIVE_FOLDER_CARS = "1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec";
const DRIVE_FOLDER_MOTORCYCLES = "10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP";
const DRIVE_FOLDER_TUKTUK = "18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP";

// Pagination defaults (Apps Script web apps should keep responses small).
const DEFAULT_PAGE_LIMIT = 200;
const MAX_PAGE_LIMIT = 500;

/* ----------------- ONE-TIME HELPERS ----------------- */

/**
 * One-time helper: if your `image_id` column contains full Drive URLs
 * (like https://drive.google.com/thumbnail?id=FILEID&sz=...),
 * this will replace them with ONLY the FILEID for faster + cleaner data.
 *
 * How to use:
 * 1) Open Apps Script editor
 * 2) Run normalizeImageIdsInPlace()
 */
function normalizeImageIdsInPlace() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { ok: true, changed: 0 };

  const headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  const cols = buildCols_(headerRow);
  if (cols.imageId < 0) throw new Error("Missing image_id column");

  const rows = lastRow - 1;
  const range = sh.getRange(2, cols.imageId + 1, rows, 1);
  const values = range.getValues();

  let changed = 0;
  for (let r = 0; r < rows; r++) {
    const before = String(values[r][0] || "").trim();
    if (!before) continue;
    const after = normalizeImageId_(before);
    if (after && after !== before) {
      values[r][0] = after;
      changed++;
    }
  }

  if (changed > 0) range.setValues(values);
  return { ok: true, changed };
}

/**
 * One-time helper: fill missing `id` values (stable VehicleId) using
 * sequential numbers (max existing id + 1).
 *
 * This fixes cases where the API returns VehicleId="" and getById fails.
 *
 * How to use:
 * 1) Open Apps Script editor
 * 2) Run fillMissingIdsInPlace()
 */
function fillMissingIdsInPlace() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { ok: true, filled: 0 };

  const headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  const cols = buildCols_(headerRow);
  if (cols.id < 0) throw new Error("Missing id column");

  const rows = lastRow - 1;
  const range = sh.getRange(2, cols.id + 1, rows, 1);
  const values = range.getValues();

  let max = 0;
  for (let r = 0; r < rows; r++) {
    const n = toNumber_(values[r][0]);
    if (n == null) continue;
    const int = Math.floor(n);
    if (int > max) max = int;
  }

  let nextId = max + 1;
  let filled = 0;

  for (let r = 0; r < rows; r++) {
    const raw = String(values[r][0] || "").trim();
    if (raw) continue;
    values[r][0] = nextId++;
    filled++;
  }

  if (filled > 0) range.setValues(values);
  return { ok: true, filled };
}

/* ----------------- ROUTES ----------------- */

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || "getVehicles").trim();

  if (action === "getVehicles" || action === "getAll") {
    const limit = parseLimit_((e && e.parameter && e.parameter.limit) || "");
    const offset = parseOffset_((e && e.parameter && e.parameter.offset) || "");
    const page = getVehiclesPage_({ limit, offset });
    return jsonOut_({
      status: 200,
      ok: true,
      meta: { total: page.total, limit: page.limit, offset: page.offset },
      data: page.data,
    });
  }

  if (action === "getById") {
    const id = String((e && e.parameter && (e.parameter.id || e.parameter.VehicleId)) || "").trim();
    if (!id) return jsonOut_({ status: 400, ok: false, error: "Missing id" });

    const found = getById_(id);
    if (!found) return jsonOut_({ status: 404, ok: false, error: "Vehicle not found" });
    return jsonOut_({ status: 200, ok: true, data: found });
  }

  if (action === "uploadImage") {
    return jsonOut_({ status: 400, ok: false, error: "uploadImage requires POST with JSON body. Do not use GET." });
  }

  return jsonOut_({ status: 400, ok: false, error: "Unknown action", action });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    if (typeof raw !== "string") raw = "{}";
    var payload = {};
    try {
      payload = JSON.parse(raw || "{}");
    } catch (parseErr) {
      return jsonOut_({ status: 400, ok: false, error: "Invalid JSON body" });
    }
    if (!payload || typeof payload !== "object") payload = {};
    var action = String(payload.action || (e && e.parameter && e.parameter.action) || "").trim();
    var actionLower = action.toLowerCase().replace(/\s+/g, "");

    // DO NOT REMOVE: image upload to Drive (TukTuksVMS, MotorcyclesVMS, CarsVMS)
    if (actionLower === "uploadimage" || action === "uploadImage") {
      return jsonOut_(uploadImage_(payload));
    }

    if (action === "add") {
      const created = addRow_(payload.data || {});
      return jsonOut_({ status: 200, ok: true, data: created });
    }

    if (action === "update") {
      const id = String(payload.id || "").trim();
      if (!id) return jsonOut_({ status: 400, ok: false, error: "Missing id" });
      const updated = updateRow_(id, payload.data || {});
      return jsonOut_({ status: 200, ok: true, data: updated });
    }

    if (action === "delete") {
      const id = String(payload.id || "").trim();
      if (!id) return jsonOut_({ status: 400, ok: false, error: "Missing id" });
      const deleted = deleteRow_(id);
      return jsonOut_({ status: 200, ok: true, data: deleted });
    }

    return jsonOut_({ status: 400, ok: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonOut_({
      status: 500,
      ok: false,
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : ""),
    });
  }
}

/* ----------------- SHEET ----------------- */

function getSheet_() {
  const id = String(SPREADSHEET_ID || "").trim();
  const useOpenById = id && id !== "PASTE_YOUR_SHEET_ID_HERE";
  const ss = useOpenById
    ? SpreadsheetApp.openById(id)
    : SpreadsheetApp.getActiveSpreadsheet();

  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.getSheets()[0];
  if (!sh) throw new Error("Sheet not found: " + SHEET_NAME);

  ensureHeaderRow_(sh);
  return sh;
}

function normalizeKey_(value) {
  const raw = String(value || "").trim().toLowerCase();
  // Common first-column header used for numeric IDs in older sheets.
  if (raw === "#") return "id";
  return raw.replace(/[^a-z0-9]+/g, "");
}

function ensureHeaderRow_(sh) {
  const lastCol = Math.max(sh.getLastColumn(), REQUIRED_HEADERS.length);
  const firstRow = sh.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  const isEmpty = firstRow.every(function (v) { return String(v || "").trim() === ""; });

  if (isEmpty) {
    sh.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
    try { sh.setFrozenRows(1); } catch { /* ignore */ }
    return;
  }

  const normalizedToIndex = new Map();
  for (let c = 0; c < firstRow.length; c++) {
    const key = normalizeKey_(firstRow[c]);
    if (!key || normalizedToIndex.has(key)) continue;
    normalizedToIndex.set(key, c);
  }

  // Add missing required headers at the end.
  for (const header of REQUIRED_HEADERS) {
    const key = normalizeKey_(header);
    if (normalizedToIndex.has(key)) continue;
    sh.insertColumnAfter(sh.getLastColumn());
    sh.getRange(1, sh.getLastColumn()).setValue(header);
    normalizedToIndex.set(key, sh.getLastColumn() - 1);
  }
}

function buildCols_(headerRow) {
  const index = new Map();
  for (let c = 0; c < headerRow.length; c++) {
    const key = normalizeKey_(headerRow[c]);
    if (!key || index.has(key)) continue;
    index.set(key, c);
  }

  const findCol_ = function (candidates) {
    for (const candidate of candidates) {
      const idx = index.get(normalizeKey_(candidate));
      if (idx !== undefined) return idx;
    }
    return -1;
  };

  return {
    id: findCol_(["id", "#", "vehicleid", "vehicle_id"]),
    category: findCol_(["category"]),
    brand: findCol_(["brand"]),
    model: findCol_(["model"]),
    year: findCol_(["year"]),
    plate: findCol_(["plate", "plate_number", "platenumber"]),
    marketPrice: findCol_(["market_price", "market price", "price_new", "pricenew", "price"]),
    taxType: findCol_(["tax_type", "tax type", "taxtype"]),
    condition: findCol_(["condition"]),
    bodyType: findCol_(["body type", "body_type", "bodytype"]),
    imageId: findCol_(["image_id", "image", "imageurl", "image url", "imageid"]),
    color: findCol_(["color"]),
    createdAt: findCol_(["created_at", "created at", "time", "added time", "datetime"]),
  };
}

function isRowEmpty_(row) {
  return row.every(function (v) { return String(v || "").trim() === ""; });
}

function parseLimit_(value) {
  const n = toInt_(value);
  if (n == null || n <= 0) return DEFAULT_PAGE_LIMIT;
  return Math.min(n, MAX_PAGE_LIMIT);
}

function parseOffset_(value) {
  const n = toInt_(value);
  if (n == null || n < 0) return 0;
  return n;
}

function writeColumnBack_(sh, values, colIndex0) {
  if (colIndex0 < 0) return;
  const rows = values.length - 1;
  if (rows <= 0) return;

  const out = [];
  for (let r = 1; r < values.length; r++) {
    out.push([values[r][colIndex0] === undefined ? "" : values[r][colIndex0]]);
  }
  sh.getRange(2, colIndex0 + 1, rows, 1).setValues(out);
}

function repairVehiclesDataInPlace_(sh, values, cols, rowIndices) {
  let filledIds = 0;
  let movedImages = 0;
  let filledTimes = 0;

  if (cols.id >= 0) {
    let maxId = 0;
    for (const r of rowIndices) {
      const n = toNumber_(values[r][cols.id]);
      if (n == null) continue;
      const int = Math.floor(n);
      if (int > maxId) maxId = int;
    }

    let nextId = maxId + 1;
    for (const r of rowIndices) {
      const raw = String(values[r][cols.id] || "").trim();
      if (raw) continue;
      values[r][cols.id] = nextId++;
      filledIds++;
    }
  }

  if (cols.imageId >= 0 && cols.color >= 0) {
    for (const r of rowIndices) {
      const row = values[r] || [];
      const img = String(row[cols.imageId] || "").trim();
      const col = String(row[cols.color] || "").trim();
      if (img || !col) continue;

      const extracted = extractDriveFileId_(col);
      const looksLikeImage = !!extracted || looksLikeUrl_(col) || looksLikeFileId_(col);
      if (!looksLikeImage) continue;

      row[cols.imageId] = normalizeImageId_(col);
      row[cols.color] = "";
      movedImages++;
    }
  }

  if (cols.createdAt >= 0) {
    for (const r of rowIndices) {
      const raw = String(values[r][cols.createdAt] || "").trim();
      if (raw) continue;
      values[r][cols.createdAt] = nowCambodiaString_();
      filledTimes++;
    }
  }

  if (filledIds > 0) writeColumnBack_(sh, values, cols.id);
  if (movedImages > 0) {
    writeColumnBack_(sh, values, cols.imageId);
    writeColumnBack_(sh, values, cols.color);
  }
  if (filledTimes > 0) writeColumnBack_(sh, values, cols.createdAt);

  return { filledIds, movedImages, filledTimes };
}

function loadVehiclesData_() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    return { sh, cols: buildCols_([]), values: [], rowIndices: [], total: 0 };
  }

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headerRow = values[0] || [];
  const cols = buildCols_(headerRow);

  const rowIndices = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r] || [];
    if (isRowEmpty_(row)) continue;
    rowIndices.push(r);
  }

  const total = rowIndices.length;
  repairVehiclesDataInPlace_(sh, values, cols, rowIndices);

  return { sh, cols, values, rowIndices, total };
}

function getVehiclesAll_() {
  const loaded = loadVehiclesData_();
  return loaded.rowIndices.map(function (r) {
    return rowToApi_(loaded.values[r], loaded.cols);
  });
}

function getVehiclesPage_(options) {
  const loaded = loadVehiclesData_();

  const limitRaw = options && options.limit !== undefined ? options.limit : DEFAULT_PAGE_LIMIT;
  const offsetRaw = options && options.offset !== undefined ? options.offset : 0;

  const limit = Math.max(1, Math.min(MAX_PAGE_LIMIT, Math.floor(Number(limitRaw || DEFAULT_PAGE_LIMIT))));
  const offset = Math.max(0, Math.floor(Number(offsetRaw || 0)));
  const safeOffset = Math.min(offset, loaded.total);

  const slice = loaded.rowIndices.slice(safeOffset, safeOffset + limit);
  const out = slice.map(function (r) {
    return rowToApi_(loaded.values[r], loaded.cols);
  });

  return { total: loaded.total, limit: limit, offset: safeOffset, data: out };
}

function getById_(id) {
  const loaded = loadVehiclesData_();
  const target = String(id || "").trim();
  if (!target) return null;
  if (loaded.cols.id < 0) return null;

  const foundRowIndex = loaded.rowIndices.find(function (r) {
    return String(loaded.values[r][loaded.cols.id] || "").trim() === target;
  });
  if (foundRowIndex == null) return null;

  return rowToApi_(loaded.values[foundRowIndex], loaded.cols);
}

function addRow_(data) {
  const sh = getSheet_();
  const lastCol = sh.getLastColumn();
  const headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  const cols = buildCols_(headerRow);
  if (cols.id < 0) throw new Error("Missing id column");

  const normalized = normalizeInput_(data);
  const providedId = String(normalized.id || "").trim();
  const id = providedId || String(nextNumericId_(sh, cols.id));

  const createdAt = normalizeCambodiaTime_(normalized.createdAt) || nowCambodiaString_();
  const imageStored = normalizeImageId_(normalized.imageId);

  const row = new Array(lastCol).fill("");
  setCell_(row, cols.id, id);
  setCell_(row, cols.category, normalized.category);
  setCell_(row, cols.brand, normalized.brand);
  setCell_(row, cols.model, normalized.model);
  setCell_(row, cols.year, toIntOrBlank_(normalized.year));
  setCell_(row, cols.plate, normalized.plate);
  setCell_(row, cols.marketPrice, toNumberOrBlank_(normalized.marketPrice));
  setCell_(row, cols.taxType, normalized.taxType);
  setCell_(row, cols.condition, normalized.condition);
  setCell_(row, cols.bodyType, normalized.bodyType);
  setCell_(row, cols.imageId, imageStored);
  setCell_(row, cols.color, normalized.color);
  setCell_(row, cols.createdAt, createdAt);

  sh.appendRow(row);
  return rowToApi_(row, cols);
}

function updateRow_(id, data) {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) throw new Error("No data to update");

  const headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  const cols = buildCols_(headerRow);
  if (cols.id < 0) throw new Error("Missing id column");

  const ids = sh.getRange(2, cols.id + 1, lastRow - 1, 1).getValues().flat().map(function (v) {
    return String(v || "").trim();
  });
  const idx = ids.findIndex(function (x) { return x === String(id).trim(); });
  if (idx === -1) throw new Error("Vehicle not found: " + id);

  const rowNumber = idx + 2;
  const existing = sh.getRange(rowNumber, 1, 1, lastCol).getValues()[0] || [];
  const normalized = normalizeInput_(data);

  const next = existing.slice();
  setCellIfProvided_(next, cols.category, normalized.category);
  setCellIfProvided_(next, cols.brand, normalized.brand);
  setCellIfProvided_(next, cols.model, normalized.model);
  if (normalized.year !== undefined) setCell_(next, cols.year, toIntOrBlank_(normalized.year));
  setCellIfProvided_(next, cols.plate, normalized.plate);
  if (normalized.marketPrice !== undefined) setCell_(next, cols.marketPrice, toNumberOrBlank_(normalized.marketPrice));
  setCellIfProvided_(next, cols.taxType, normalized.taxType);
  setCellIfProvided_(next, cols.condition, normalized.condition);
  setCellIfProvided_(next, cols.bodyType, normalized.bodyType);
  if (normalized.imageId !== undefined) setCell_(next, cols.imageId, normalizeImageId_(normalized.imageId));
  setCellIfProvided_(next, cols.color, normalized.color);
  if (normalized.createdAt !== undefined) setCell_(next, cols.createdAt, normalizeCambodiaTime_(normalized.createdAt));

  // Never change id.
  setCell_(next, cols.id, String(existing[cols.id] || "").trim() || String(id));

  sh.getRange(rowNumber, 1, 1, lastCol).setValues([next]);
  return rowToApi_(next, cols);
}

function deleteRow_(id) {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) throw new Error("No data to delete");

  const headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  const cols = buildCols_(headerRow);
  if (cols.id < 0) throw new Error("Missing id column");

  const ids = sh.getRange(2, cols.id + 1, lastRow - 1, 1).getValues().flat().map(function (v) {
    return String(v || "").trim();
  });
  const idx = ids.findIndex(function (x) { return x === String(id).trim(); });
  if (idx === -1) throw new Error("Vehicle not found: " + id);

  const rowNumber = idx + 2;
  const rowValues = sh.getRange(rowNumber, 1, 1, lastCol).getValues()[0] || [];
  const deleted = rowToApi_(rowValues, cols);

  sh.deleteRow(rowNumber);
  return deleted;
}

/* ----------------- MAPPERS ----------------- */

function setCell_(row, idx, value) {
  if (idx < 0) return;
  row[idx] = value === undefined || value === null ? "" : value;
}

function setCellIfProvided_(row, idx, value) {
  if (idx < 0) return;
  if (value === undefined) return;
  row[idx] = value === null ? "" : value;
}

function normalizeInput_(data) {
  const d = data || {};

  const pick = function (keys) {
    for (const key of keys) {
      if (d[key] !== undefined) return d[key];
      const alt = normalizeKey_(key);
      for (const k in d) {
        if (normalizeKey_(k) === alt) return d[k];
      }
    }
    return undefined;
  };

  return {
    id: pick(["id", "VehicleId", "#", "vehicle_id", "vehicleid"]),
    category: pick(["category", "Category"]),
    brand: pick(["brand", "Brand"]),
    model: pick(["model", "Model"]),
    year: pick(["year", "Year"]),
    plate: pick(["plate", "Plate", "plate_number", "PlateNumber"]),
    marketPrice: pick(["market_price", "MARKET PRICE", "Market Price", "PriceNew", "price_new"]),
    taxType: pick(["tax_type", "Tax Type", "TaxType"]),
    condition: pick(["condition", "Condition"]),
    bodyType: pick(["body type", "Body Type", "BodyType", "body_type"]),
    imageId: pick(["image_id", "image", "Image", "ImageURL", "image_url", "Image URL", "fileId", "ImageFileId"]),
    color: pick(["color", "Color"]),
    createdAt: pick(["created_at", "Time", "time", "Created At", "created at"]),
  };
}

function rowToApi_(row, cols) {
  const get = function (idx) {
    return idx >= 0 ? row[idx] : "";
  };

  const idRaw = String(get(cols.id) || "").trim();
  const vehicleId = idRaw || "";

  const priceNew = toNumber_(get(cols.marketPrice));
  const derived40 = priceNew == null ? null : roundTo_(priceNew * 0.4, 2);
  const derived70 = priceNew == null ? null : roundTo_(priceNew * 0.7, 2);

  const imageRaw = String(get(cols.imageId) || "").trim();
  const fileId = extractDriveFileId_(imageRaw);
  const imageFileId = fileId || (looksLikeFileId_(imageRaw) ? imageRaw : "");

  return {
    VehicleId: vehicleId,
    Category: String(get(cols.category) || "").trim(),
    Brand: String(get(cols.brand) || "").trim(),
    Model: String(get(cols.model) || "").trim(),
    Year: toInt_(get(cols.year)),
    Plate: String(get(cols.plate) || "").trim(),
    PriceNew: priceNew,
    Price40: derived40,
    Price70: derived70,
    TaxType: String(get(cols.taxType) || "").trim(),
    Condition: String(get(cols.condition) || "").trim(),
    BodyType: String(get(cols.bodyType) || "").trim(),
    Color: String(get(cols.color) || "").trim(),
    ImageFileId: imageFileId,
    ImageThumb: imageFileId ? driveThumbnailUrl_(imageFileId, "w100-h100") : "",
    Image: imageFileId ? driveThumbnailUrl_(imageFileId, "w1000-h1000") : (looksLikeUrl_(imageRaw) ? imageRaw : ""),
    Time: normalizeCambodiaTime_(get(cols.createdAt)),
  };
}

/* ----------------- HELPERS ----------------- */

function nowCambodiaString_() {
  return Utilities.formatDate(new Date(), CAMBODIA_TIMEZONE, CAMBODIA_TIME_FORMAT);
}

function normalizeCambodiaTime_(value) {
  if (value == null) return "";
  if (value instanceof Date) {
    return Utilities.formatDate(value, CAMBODIA_TIMEZONE, CAMBODIA_TIME_FORMAT);
  }
  const raw = String(value || "").trim();
  return raw;
}

function toNumber_(value) {
  if (value == null) return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  const str = String(value).trim();
  if (!str) return null;
  const normalized = str.replace(/,/g, "");
  const n = Number(normalized);
  return isFinite(n) ? n : null;
}

function toInt_(value) {
  const n = toNumber_(value);
  if (n == null) return null;
  const int = Math.floor(n);
  return isFinite(int) ? int : null;
}

function toIntOrBlank_(value) {
  const n = toInt_(value);
  return n == null ? "" : n;
}

function toNumberOrBlank_(value) {
  const n = toNumber_(value);
  return n == null ? "" : n;
}

function roundTo_(value, decimals) {
  const d = Math.max(0, Math.min(6, Math.floor(decimals || 0)));
  const factor = Math.pow(10, d);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function looksLikeUrl_(value) {
  const raw = String(value || "").trim();
  return /^https?:\/\//i.test(raw);
}

function looksLikeFileId_(value) {
  const raw = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{10,}$/.test(raw);
}

function extractDriveFileId_(value) {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  if (looksLikeFileId_(raw)) return raw;

  const idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idMatch && idMatch[1]) return idMatch[1];

  const pathMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  const guMatch = raw.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]{10,})/);
  if (guMatch && guMatch[1]) return guMatch[1];

  return "";
}

function driveThumbnailUrl_(fileId, size) {
  return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=" + encodeURIComponent(size);
}

function normalizeImageId_(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const extracted = extractDriveFileId_(raw);
  return extracted || raw;
}

function nextNumericId_(sh, idColIndex0) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 1;
  const values = sh.getRange(2, idColIndex0 + 1, lastRow - 1, 1).getValues().flat();
  let max = 0;
  for (const v of values) {
    const n = toNumber_(v);
    if (n == null) continue;
    const int = Math.floor(n);
    if (int > max) max = int;
  }
  return max + 1;
}

/* ----------------- DRIVE: uploadImage ----------------- */

function uploadImage_(payload) {
  if (!payload || typeof payload !== "object") payload = {};
  var token = String(payload.token || "").trim();
  var expectedToken = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_UPLOAD_TOKEN") || "";
  if (expectedToken && token !== expectedToken) {
    return { ok: false, error: "Forbidden" };
  }

  var folderId = String(payload.folderId || "").trim();
  if (!folderId) {
    var category = String(payload.category || payload.Category || "").trim();
    folderId = folderIdForCategory_(category);
  }
  var data = String(payload.data || "");
  var mimeType = String(payload.mimeType || "image/jpeg").trim() || "image/jpeg";
  var fileName = String(payload.fileName || "").trim() || ("vehicle-" + new Date().getTime() + ".jpg");

  if (!folderId) return { ok: false, error: "Missing folderId or category (Cars, Motorcycles, Tuk Tuk)" };
  if (!data) return { ok: false, error: "Missing data (base64 image)" };

  try {
    var folder = DriveApp.getFolderById(folderId);
    var bytes = Utilities.base64Decode(data);
    var blob = Utilities.newBlob(bytes, mimeType, fileName);
    var file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var thumbnailUrl = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1000-h1000";

    return {
      ok: true,
      status: 200,
      data: {
        fileId: fileId,
        thumbnailUrl: thumbnailUrl,
      },
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

function folderIdForCategory_(category) {
  const normalized = String(category || "").trim().toLowerCase();
  if (!normalized) return "";

  if (normalized === "car" || normalized === "cars") return DRIVE_FOLDER_CARS;
  if (normalized === "motorcycle" || normalized === "motorcycles") return DRIVE_FOLDER_MOTORCYCLES;
  if (normalized === "tuktuk" || normalized === "tuk tuk" || normalized === "tuk-tuk") return DRIVE_FOLDER_TUKTUK;

  return "";
}

/* ----------------- RESPONSE ----------------- */

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
