/**
 * Emerald Cash VMS - Vehicle API for Google Sheets (Web App)
 *
 * Supports:
 *  - GET  ?action=getVehicles   (alias: getAll)
 *  - GET  ?action=getById&id=123
 *  - POST {"action":"add","data":{...}}
 *  - POST {"action":"update","id":"123","data":{...}}
 *  - POST {"action":"delete","id":"123","imageFileId":"<optional>","token":"<optional>"}
 *  - POST {"action":"uploadImage","folderId":"<DriveFolderId>","data":"<base64>","mimeType":"image/png","fileName":"name.png","token":"<optional>"}
 *
 * Notes:
 *  - If you deploy this as a *bound* script (inside a Google Sheet), you can leave SPREADSHEET_ID empty.
 *  - If you deploy this as a *standalone* script, paste your Spreadsheet ID into SPREADSHEET_ID.
 */

/* ----------------- CONFIG ----------------- */

// Optional: for Standalone Script. Leave "" for bound scripts.
const SPREADSHEET_ID = "";

// Sheet tab name to use. If not found, falls back to a "Vehicles" tab, otherwise the first tab.
const SHEET_NAME = "Vehicles";

// Column headers (must match row 1 in your sheet)
const HEADERS = [
  "#",
  "Image",
  "Category",
  "Brand",
  "Model",
  "Year",
  "Plate",
  "MARKET PRICE",
  "D.O.C.40%",
  "Vehicles70%",
  "Tax Type",
  "Condition",
  "Body Type",
  "Color",
  // Market Price columns (added for Cambodia Market Price feature)
  "MARKET_PRICE_LOW",
  "MARKET_PRICE_MEDIAN",
  "MARKET_PRICE_HIGH",
  "MARKET_PRICE_SOURCE",
  "MARKET_PRICE_SAMPLES",
  "MARKET_PRICE_CONFIDENCE",
  "MARKET_PRICE_UPDATED_AT",
  // End of market price columns
  "Time",
];

// Optional: default Drive folders per Category (used if uploadImage is called without folderId)
// CarsVMS, MotorcyclesVMS, TukTuksVMS - must support action=uploadImage in doPost
const DRIVE_FOLDER_CARS = "1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec";
const DRIVE_FOLDER_MOTORCYCLES = "10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP";
const DRIVE_FOLDER_TUKTUK = "18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP";

// Timezone settings
const CAMBODIA_TIMEZONE = "Asia/Phnom_Penh";
const CAMBODIA_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

/* ----------------- ROUTES ----------------- */

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || "getVehicles").trim();

  if (action === "getVehicles" || action === "getAll") {
    return jsonOut_({ ok: true, data: getVehicles_() });
  }

  if (action === "getById") {
    const id = String((e && e.parameter && (e.parameter.id || e.parameter.VehicleId)) || "").trim();
    if (!id) return jsonOut_({ ok: false, error: "Missing id" });

    const found = getById_(id);
    if (!found) return jsonOut_({ ok: false, error: "Vehicle not found" });

    return jsonOut_({ ok: true, data: found });
  }

  if (action === "uploadImage") {
    return jsonOut_({ ok: false, error: "uploadImage requires POST with JSON body (action, folderId, data, mimeType, fileName). Do not use GET." });
  }

  return jsonOut_({ ok: false, error: "Unknown action", action: action });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    if (typeof raw !== "string") raw = "{}";
    var payload = {};
    try {
      payload = JSON.parse(raw || "{}");
    } catch (parseErr) {
      return jsonOut_({ ok: false, error: "Invalid JSON body" });
    }
    if (!payload || typeof payload !== "object") payload = {};
    var action = String(payload.action || (e && e.parameter && e.parameter.action) || "").trim();
    var actionLower = action.toLowerCase().replace(/\s+/g, "");

    // DO NOT REMOVE: image upload to Drive (TukTuksVMS, MotorcyclesVMS, CarsVMS)
    if (actionLower === "uploadimage" || action === "uploadImage") {
      return jsonOut_(uploadImage_(payload));
    }

    if (actionLower === "deleteimage" || action === "deleteImage") {
      return jsonOut_(deleteImage_(payload));
    }

    if (action === "add") {
      const created = addRow_(payload.data || {});
      return jsonOut_({ ok: true, data: created });
    }

    if (action === "update") {
      const id = String(payload.id || "").trim();
      if (!id) return jsonOut_({ ok: false, error: "Missing id" });
      const updated = updateRow_(id, payload.data || {});
      return jsonOut_({ ok: true, data: updated });
    }

    if (action === "delete") {
      const id = String(payload.id || "").trim();
      if (!id) return jsonOut_({ ok: false, error: "Missing id" });
      const deleted = deleteRow_(id, payload);
      return jsonOut_({ ok: true, data: deleted });
    }

    if (action === "updateMarketPrice") {
      return jsonOut_(updateMarketPrice_(payload));
    }

    return jsonOut_({ ok: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonOut_({
      ok: false,
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : ""),
    });
  }
}

/* ----------------- SHEET HELPERS ----------------- */

function getSheet_() {
  const id = String(SPREADSHEET_ID || "").trim();
  const useOpenById = id && id !== "PASTE_YOUR_SHEET_ID_HERE";

  const ss = useOpenById
    ? SpreadsheetApp.openById(id)
    : SpreadsheetApp.getActiveSpreadsheet();

  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh && SHEET_NAME !== "Vehicles") sh = ss.getSheetByName("Vehicles");
  if (!sh) sh = ss.getSheets()[0];
  if (!sh) throw new Error("Sheet not found: " + SHEET_NAME);

  ensureHeaderRow_(sh);
  return sh;
}

function ensureHeaderRow_(sh) {
  const firstRow = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const isEmpty = firstRow.every(function (v) { return String(v || "").trim() === ""; });
  if (isEmpty) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }

  function normalizeHeaderCell_(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  const renameMap = {
    "VehicleId": "#",
    "Vehicle ID": "#",
    "VehicleID": "#",
    "Id": "#",
    "id": "#",
    "IMAGE": "Image",
    "CATEGORY": "Category",
    "BRAND": "Brand",
    "MODEL": "Model",
    "YEAR": "Year",
    "PLATE": "Plate",
    "Market Price": "MARKET PRICE",
    "Price New": "MARKET PRICE",
    "MarketPrice": "MARKET PRICE",
    "MARKETPRICE": "MARKET PRICE",
    "D.O.C.1 40%": "D.O.C.40%",
    "Price 40%": "D.O.C.40%",
    "Price 40": "D.O.C.40%",
    "D.O.C. 40%": "D.O.C.40%",
    "D.O.C.40": "D.O.C.40%",
    "DOC 40%": "D.O.C.40%",
    "Price 70%": "Vehicles70%",
    "Price 70": "Vehicles70%",
    "Vehicle 70%": "Vehicles70%",
    "Vehicles 70%": "Vehicles70%",
    "Vehicle70%": "Vehicles70%",
    "VEHICLES70%": "Vehicles70%",
    "Vihicle 70%": "Vehicles70%",
    "Image URL": "Image",
    "ImageURL": "Image",
    "TaxType": "Tax Type",
    "TAX TYPE": "Tax Type",
    "CONDITION": "Condition",
    "BodyType": "Body Type",
    "BODY TYPE": "Body Type",
    "COLOR": "Color",
    "TIME": "Time",
  };

  let needsUpdate = false;
  const next = firstRow.slice(0, HEADERS.length);
  for (let i = 0; i < HEADERS.length; i++) {
    const raw = String(next[i] || "");
    const existing = raw.trim();
    const normalized = normalizeHeaderCell_(raw);

    const rename =
      renameMap[existing] ||
      renameMap[normalized] ||
      renameMap[normalized.replace(/\s+/g, "")];
    if (rename && rename === HEADERS[i]) {
      next[i] = HEADERS[i];
      needsUpdate = true;
    } else if (!existing) {
      next[i] = HEADERS[i];
      needsUpdate = true;
    }
  }
  if (needsUpdate) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([next]);
  }
}

function nowCambodiaString_() {
  return Utilities.formatDate(new Date(), CAMBODIA_TIMEZONE, CAMBODIA_TIME_FORMAT);
}

function normalizeCambodiaTime_(value) {
  if (value == null) return "";
  if (value instanceof Date) {
    return Utilities.formatDate(value, CAMBODIA_TIMEZONE, CAMBODIA_TIME_FORMAT);
  }

  const raw = String(value || "").trim();
  if (!raw) return "";

  // If it's ISO-ish, convert it to Cambodia local time.
  const looksIso = raw.indexOf("T") !== -1 || /Z$/.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw);
  if (looksIso) {
    try {
      const dt = new Date(raw);
      if (!isNaN(dt.getTime())) {
        return Utilities.formatDate(dt, CAMBODIA_TIMEZONE, CAMBODIA_TIME_FORMAT);
      }
    } catch {
      // ignore and return raw
    }
  }

  return raw;
}

function nextNumericVehicleId_(sh) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 1;

  const values = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  let max = 0;

  for (const value of values) {
    const n = toNumber_(value);
    if (n == null) continue;
    const int = Math.floor(n);
    if (int > max) max = int;
  }

  return max + 1;
}

/* ----------------- ONE-TIME MIGRATION ----------------- */

/**
 * One-time helper: create a new tab with the correct column order:
 *   #, Image, Category, Brand, Model, Year, Plate, MARKET PRICE, D.O.C.40%, Vehicles70%, Tax Type, Condition, Body Type, Color, Time
 *
 * How to use:
 * 1) Open Apps Script editor
 * 2) Run migrateVehiclesSheetToNewSchema()
 * 3) Verify the new tab, then rename it to "Vehicles" (and keep the old as backup)
 */
function migrateVehiclesSheetToNewSchema() {
  const id = String(SPREADSHEET_ID || "").trim();
  const useOpenById = id && id !== "PASTE_YOUR_SHEET_ID_HERE";
  const ss = useOpenById
    ? SpreadsheetApp.openById(id)
    : SpreadsheetApp.getActiveSpreadsheet();

  const source =
    ss.getSheetByName(SHEET_NAME) ||
    (SHEET_NAME !== "Vehicles" ? ss.getSheetByName("Vehicles") : null) ||
    ss.getSheets()[0];

  if (!source) throw new Error("Sheet not found: " + SHEET_NAME);

  const lastRow = source.getLastRow();
  const lastCol = source.getLastColumn();
  if (lastRow < 1 || lastCol < 1) throw new Error("No data found");

  const values = source.getRange(1, 1, lastRow, lastCol).getValues();
  const headerRow = values[0] || [];

  const normalizeKey_ = function (value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  };

  const headerIndex = new Map();
  for (let c = 0; c < headerRow.length; c++) {
    const key = normalizeKey_(headerRow[c]);
    if (!key || headerIndex.has(key)) continue;
    headerIndex.set(key, c);
  }

  function findColumn_(candidates) {
    for (const candidate of candidates) {
      const idx = headerIndex.get(normalizeKey_(candidate));
      if (idx !== undefined) return idx;
    }
    return -1;
  }

  const col = {
    "#": findColumn_(["#", "VehicleId", "Vehicle ID", "VehicleID", "Id", "id"]),
    "Image": findColumn_(["Image", "IMAGE", "Image URL", "ImageURL"]),
    "Category": findColumn_(["Category", "CATEGORY"]),
    "Brand": findColumn_(["Brand", "BRAND"]),
    "Model": findColumn_(["Model", "MODEL"]),
    "Year": findColumn_(["Year", "YEAR"]),
    "Plate": findColumn_(["Plate", "PLATE"]),
    "MARKET PRICE": findColumn_(["MARKET PRICE", "Market Price", "MarketPrice", "MARKETPRICE", "Price New", "PriceNew", "Price (New)"]),
    "D.O.C.40%": findColumn_(["D.O.C.40%", "D.O.C. 40%", "D.O.C.1 40%", "Price 40%", "Price40%", "Price40", "DOC 40%"]),
    "Vehicles70%": findColumn_(["Vehicles70%", "VEHICLES70%", "Vehicles 70%", "Vehicle 70%", "Price 70%", "Price70%", "Price70", "Vihicle 70%"]),
    "Tax Type": findColumn_(["Tax Type", "TAX TYPE", "TaxType"]),
    "Condition": findColumn_(["Condition", "CONDITION"]),
    "Body Type": findColumn_(["Body Type", "BODY TYPE", "BodyType"]),
    "Color": findColumn_(["Color", "COLOR"]),
    "Time": findColumn_(["Time", "TIME"]),
  };

  const marketPriceIndex = HEADERS.indexOf("MARKET PRICE");
  const docIndex = HEADERS.indexOf("D.O.C.40%");
  const vehicle70Index = HEADERS.indexOf("Vehicles70%");
  const timeIndex = HEADERS.indexOf("Time");

  const output = [];
  for (let r = 1; r < values.length; r++) {
    const srcRow = values[r] || [];
    const isEmpty = srcRow.every(function (v) { return String(v || "").trim() === ""; });
    if (isEmpty) continue;

    const outRow = HEADERS.map(function (h) {
      const idx = col[h];
      return idx >= 0 ? srcRow[idx] : "";
    });

    const idRaw = String(outRow[0] || "").trim();
    if (!idRaw) outRow[0] = String(output.length + 1);

    outRow[timeIndex] = normalizeCambodiaTime_(outRow[timeIndex]) || nowCambodiaString_();

    const priceNew = toNumber_(outRow[marketPriceIndex]);
    if (priceNew != null) {
      const hasDoc = String(outRow[docIndex] ?? "").trim() !== "";
      const has70 = String(outRow[vehicle70Index] ?? "").trim() !== "";
      if (!hasDoc) outRow[docIndex] = roundTo_(priceNew * 0.4, 2);
      if (!has70) outRow[vehicle70Index] = roundTo_(priceNew * 0.7, 2);
    }

    output.push(outRow);
  }

  const ts = Utilities.formatDate(new Date(), CAMBODIA_TIMEZONE, "yyyyMMdd-HHmmss");
  const targetName = `${SHEET_NAME}-migrated-${ts}`.slice(0, 99);
  const existing = ss.getSheetByName(targetName);
  if (existing) throw new Error("Target sheet already exists: " + targetName);

  const target = ss.insertSheet(targetName);
  target.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  if (output.length > 0) {
    target.getRange(2, 1, output.length, HEADERS.length).setValues(output);
  }

  try {
    target.setFrozenRows(1);
  } catch {
    // ignore
  }
  try {
    target.autoResizeColumns(1, HEADERS.length);
  } catch {
    // ignore
  }
  try {
    target.getRange(1, 1, Math.max(1, output.length + 1), HEADERS.length).createFilter();
  } catch {
    // ignore
  }

  console.log(`Created sheet "${targetName}" with ${output.length} rows.`);
  return { ok: true, sheet: targetName, rows: output.length };
}

/**
 * Fix an existing Vehicles sheet IN PLACE so columns + data align to:
 *   #, Image, Category, Brand, Model, Year, Plate, MARKET PRICE, D.O.C.40%, Vehicles70%, Tax Type, Condition, Body Type, Color, Time
 *
 * It will:
 * - Create a backup tab first
 * - Rename known/legacy headers (incl. headers with line breaks)
 * - Reorder columns to the correct order
 * - Move misplaced Image links out of the Color column (when detected)
 * - Fill missing # values (incrementing)
 * - Fill missing D.O.C.40% and Vehicles70% from MARKET PRICE
 */
function fixVehiclesSheetToSchemaInPlace() {
  const id = String(SPREADSHEET_ID || "").trim();
  const useOpenById = id && id !== "PASTE_YOUR_SHEET_ID_HERE";
  const ss = useOpenById
    ? SpreadsheetApp.openById(id)
    : SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(SHEET_NAME) ||
    (SHEET_NAME !== "Vehicles" ? ss.getSheetByName("Vehicles") : null) ||
    ss.getSheets()[0];

  if (!sheet) throw new Error("Sheet not found: " + SHEET_NAME);

  const ts = Utilities.formatDate(new Date(), CAMBODIA_TIMEZONE, "yyyyMMdd-HHmmss");
  const backupName = `${sheet.getName()}-backup-${ts}`.slice(0, 99);
  sheet.copyTo(ss).setName(backupName);

  function normalizeKey_(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  const renameMap = {
    "VehicleId": "#",
    "Vehicle ID": "#",
    "VehicleID": "#",
    "Id": "#",
    "id": "#",
    "IMAGE": "Image",
    "Image URL": "Image",
    "ImageURL": "Image",
    "CATEGORY": "Category",
    "BRAND": "Brand",
    "MODEL": "Model",
    "YEAR": "Year",
    "PLATE": "Plate",
    "Market Price": "MARKET PRICE",
    "Price New": "MARKET PRICE",
    "MarketPrice": "MARKET PRICE",
    "MARKETPRICE": "MARKET PRICE",
    "D.O.C.1 40%": "D.O.C.40%",
    "Price 40%": "D.O.C.40%",
    "Price 40": "D.O.C.40%",
    "D.O.C. 40%": "D.O.C.40%",
    "D.O.C.40": "D.O.C.40%",
    "DOC 40%": "D.O.C.40%",
    "Price 70%": "Vehicles70%",
    "Price 70": "Vehicles70%",
    "Vehicle 70%": "Vehicles70%",
    "Vehicles 70%": "Vehicles70%",
    "Vehicle70%": "Vehicles70%",
    "VEHICLES70%": "Vehicles70%",
    "Vihicle 70%": "Vehicles70%",
    "TaxType": "Tax Type",
    "TAX TYPE": "Tax Type",
    "CONDITION": "Condition",
    "BodyType": "Body Type",
    "BODY TYPE": "Body Type",
    "COLOR": "Color",
    "TIME": "Time",
  };
  const renameMapNormalized = {};
  Object.keys(renameMap).forEach(function (key) {
    renameMapNormalized[normalizeKey_(key)] = renameMap[key];
  });
  HEADERS.forEach(function (h) {
    renameMapNormalized[normalizeKey_(h)] = h;
  });

  function canonicalHeader_(value) {
    const raw = String(value || "");
    const trimmed = raw.replace(/\s+/g, " ").trim();
    if (!trimmed) return "";
    const direct = renameMap[trimmed];
    if (direct) return direct;
    const normalized = renameMapNormalized[normalizeKey_(trimmed)];
    return normalized || trimmed;
  }

  function looksLikeImageUrl_(value) {
    const raw = String(value || "").trim();
    if (!raw) return false;
    if (/^https?:\/\//i.test(raw)) return true;
    return raw.indexOf("drive.google.com") !== -1;
  }

  let lastCol = sheet.getLastColumn();
  if (lastCol < 1) lastCol = HEADERS.length;

  // Canonicalize existing headers (don’t assume order).
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const canonicalRow = headerRow.map(function (cell) {
    const canonical = canonicalHeader_(cell);
    return HEADERS.indexOf(canonical) !== -1 ? canonical : String(cell || "").trim();
  });
  sheet.getRange(1, 1, 1, lastCol).setValues([canonicalRow]);

  // Ensure required headers exist.
  let currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (v) {
    return String(v || "").trim();
  });
  for (const header of HEADERS) {
    if (currentHeaders.indexOf(header) !== -1) continue;
    sheet.insertColumnAfter(sheet.getLastColumn());
    sheet.getRange(1, sheet.getLastColumn()).setValue(header);
    currentHeaders.push(header);
  }

  // Reorder columns to match HEADERS.
  currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (v) {
    return String(v || "").trim();
  });
  const maxRows = sheet.getMaxRows();
  for (let targetIndex = 1; targetIndex <= HEADERS.length; targetIndex++) {
    const header = HEADERS[targetIndex - 1];
    const currentIndex = currentHeaders.indexOf(header) + 1;
    if (currentIndex === 0) continue;
    if (currentIndex === targetIndex) continue;

    sheet.moveColumns(sheet.getRange(1, currentIndex, maxRows, 1), targetIndex);

    const moved = currentHeaders.splice(currentIndex - 1, 1)[0];
    currentHeaders.splice(targetIndex - 1, 0, moved);
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, backup: backupName, changedImages: 0, filledIds: 0, filledPrices: 0 };

  const imageCol = HEADERS.indexOf("Image") + 1;
  const colorCol = HEADERS.indexOf("Color") + 1;
  const idCol = HEADERS.indexOf("#") + 1;
  const marketCol = HEADERS.indexOf("MARKET PRICE") + 1;
  const docCol = HEADERS.indexOf("D.O.C.40%") + 1;
  const vehicle70Col = HEADERS.indexOf("Vehicles70%") + 1;
  const timeCol = HEADERS.indexOf("Time") + 1;

  const rows = lastRow - 1;
  const idValues = sheet.getRange(2, idCol, rows, 1).getValues();
  const imageValues = sheet.getRange(2, imageCol, rows, 1).getValues();
  const colorValues = sheet.getRange(2, colorCol, rows, 1).getValues();
  const marketValues = sheet.getRange(2, marketCol, rows, 1).getValues();
  const docValues = sheet.getRange(2, docCol, rows, 1).getValues();
  const vehicle70Values = sheet.getRange(2, vehicle70Col, rows, 1).getValues();
  const timeValues = sheet.getRange(2, timeCol, rows, 1).getValues();

  let maxId = 0;
  for (let r = 0; r < rows; r++) {
    const n = toNumber_(idValues[r][0]);
    if (n == null) continue;
    const int = Math.floor(n);
    if (int > maxId) maxId = int;
  }
  let nextId = maxId + 1;

  let changedImages = 0;
  let filledIds = 0;
  let filledPrices = 0;

  for (let r = 0; r < rows; r++) {
    // Fill missing IDs.
    const idRaw = String(idValues[r][0] || "").trim();
    if (!idRaw) {
      idValues[r][0] = String(nextId++);
      filledIds++;
    }

    // Move misplaced Image links out of Color.
    const img = String(imageValues[r][0] || "").trim();
    const colVal = String(colorValues[r][0] || "").trim();
    if (!img && looksLikeImageUrl_(colVal)) {
      imageValues[r][0] = colVal;
      colorValues[r][0] = "";
      changedImages++;
    }

    // Ensure Time in Cambodia format.
    timeValues[r][0] = normalizeCambodiaTime_(timeValues[r][0]) || nowCambodiaString_();

    // Fill derived prices if missing.
    const priceNew = toNumber_(marketValues[r][0]);
    if (priceNew != null) {
      const hasDoc = String(docValues[r][0] ?? "").trim() !== "";
      const has70 = String(vehicle70Values[r][0] ?? "").trim() !== "";
      if (!hasDoc) {
        docValues[r][0] = roundTo_(priceNew * 0.4, 2);
        filledPrices++;
      }
      if (!has70) {
        vehicle70Values[r][0] = roundTo_(priceNew * 0.7, 2);
        filledPrices++;
      }
    }
  }

  sheet.getRange(2, idCol, rows, 1).setValues(idValues);
  sheet.getRange(2, imageCol, rows, 1).setValues(imageValues);
  sheet.getRange(2, colorCol, rows, 1).setValues(colorValues);
  sheet.getRange(2, timeCol, rows, 1).setValues(timeValues);
  sheet.getRange(2, docCol, rows, 1).setValues(docValues);
  sheet.getRange(2, vehicle70Col, rows, 1).setValues(vehicle70Values);

  return {
    ok: true,
    backup: backupName,
    changedImages,
    filledIds,
    filledPrices,
  };
}

function getVehicles_() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  console.log("Sheet lastRow: " + lastRow);
  if (lastRow < 2) return [];

  const values = sh.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  console.log("Raw values length: " + values.length);

  const vehicles = values.map(function (row) {
    const byHeader = rowToHeaderObject_(row);
    return headerToFriendly_(byHeader);
  }).filter(function (vehicle) {
    // Only filter out vehicles with completely empty/missing IDs
    // Convert to string and check if it's empty after trimming
    const idStr = String(vehicle.VehicleId || "").trim();
    const hasId = idStr !== "" && idStr !== "null" && idStr !== "undefined";
    return hasId;
  });

  console.log("Processed vehicles length (after filtering): " + vehicles.length);

  // Log first and last few vehicles to check for empty rows
  if (vehicles.length > 0) {
    console.log("First vehicle:", JSON.stringify(vehicles[0]));
    console.log("Last vehicle:", JSON.stringify(vehicles[vehicles.length - 1]));
  }

  return vehicles;
}

function getById_(id) {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return null;

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(function (v) {
    return String(v || "").trim();
  });
  const idx = ids.findIndex(function (x) { return x === String(id).trim(); });
  if (idx === -1) return null;

  const rowValues = sh.getRange(idx + 2, 1, 1, HEADERS.length).getValues()[0];
  return headerToFriendly_(rowToHeaderObject_(rowValues));
}

function addRow_(data) {
  const sh = getSheet_();

  const byHeader = normalizeToHeaders_(data);
  const providedId = String(byHeader["#"] || "").trim();
  byHeader["#"] = providedId || String(nextNumericVehicleId_(sh));
  byHeader["Time"] = normalizeCambodiaTime_(byHeader["Time"]) || nowCambodiaString_();
  computeDerivedPrices_(byHeader);

  sh.appendRow(headersToRow_(byHeader));
  return headerToFriendly_(byHeader);
}

function updateRow_(id, data) {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error("No data to update");

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(function (v) {
    return String(v || "").trim();
  });
  const idx = ids.findIndex(function (x) { return x === String(id).trim(); });
  if (idx === -1) throw new Error("VehicleId not found: " + id);

  const rowNumber = idx + 2;
  const existing = sh.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
  const existingByHeader = rowToHeaderObject_(existing);

  const updates = normalizeToHeaders_(data);
  const merged = Object.assign({}, existingByHeader, updates);
  merged["#"] = existingByHeader["#"];
  merged["Time"] = normalizeCambodiaTime_(updates["Time"]) || normalizeCambodiaTime_(existingByHeader["Time"]);
  computeDerivedPrices_(merged);

  sh.getRange(rowNumber, 1, 1, HEADERS.length).setValues([headersToRow_(merged)]);
  return headerToFriendly_(merged);
}

function deleteRow_(id, payload) {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error("No data to delete");

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(function (v) {
    return String(v || "").trim();
  });
  const idx = ids.findIndex(function (x) { return x === String(id).trim(); });
  if (idx === -1) throw new Error("VehicleId not found: " + id);

  const rowNumber = idx + 2;
  const rowValues = sh.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
  const deletedByHeader = rowToHeaderObject_(rowValues);

  const token = payload && payload.token ? String(payload.token) : "";
  const expectedToken = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_UPLOAD_TOKEN") || "";
  const canModifyDrive = !expectedToken || token === expectedToken;

  const imageFileId =
    extractDriveFileId_(payload && payload.imageFileId) ||
    extractDriveFileId_(deletedByHeader["Image"]);

  sh.deleteRow(rowNumber);

  let imageDeleted = false;
  if (imageFileId && canModifyDrive) {
    try {
      DriveApp.getFileById(imageFileId).setTrashed(true);
      imageDeleted = true;
    } catch (err) {
      imageDeleted = false;
    }
  }

  return {
    deleted: headerToFriendly_(deletedByHeader),
    imageFileId: imageFileId || "",
    imageDeleted: imageDeleted,
    driveAuthOk: canModifyDrive,
  };
}

/**
 * Update market price fields for a vehicle row
 * Called via action=updateMarketPrice
 */
function updateMarketPrice_(payload) {
  const id = String(payload.id || "").trim();
  if (!id) return { ok: false, error: "Missing id" };

  const data = payload.data || {};
  
  // Map incoming fields to header names
  const fieldMap = {
    MARKET_PRICE_LOW: ["MARKET_PRICE_LOW", "MarketPriceLow", "marketPriceLow"],
    MARKET_PRICE_MEDIAN: ["MARKET_PRICE_MEDIAN", "MarketPriceMedian", "marketPriceMedian"],
    MARKET_PRICE_HIGH: ["MARKET_PRICE_HIGH", "MarketPriceHigh", "marketPriceHigh"],
    MARKET_PRICE_SOURCE: ["MARKET_PRICE_SOURCE", "MarketPriceSource", "marketPriceSource"],
    MARKET_PRICE_SAMPLES: ["MARKET_PRICE_SAMPLES", "MarketPriceSamples", "marketPriceSamples"],
    MARKET_PRICE_CONFIDENCE: ["MARKET_PRICE_CONFIDENCE", "MarketPriceConfidence", "marketPriceConfidence"],
    MARKET_PRICE_UPDATED_AT: ["MARKET_PRICE_UPDATED_AT", "MarketPriceUpdatedAt", "marketPriceUpdatedAt"],
  };

  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: false, error: "No data found" };

  // Find the row by vehicle ID
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(function (v) {
    return String(v || "").trim();
  });
  const idx = ids.findIndex(function (x) { return x === id; });
  if (idx === -1) return { ok: false, error: "Vehicle not found: " + id };

  const rowNumber = idx + 2;

  // Build updates object
  var updates = {};
  Object.keys(fieldMap).forEach(function (header) {
    var candidates = fieldMap[header];
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      if (data[candidate] !== undefined) {
        updates[header] = data[candidate];
        break;
      }
    }
  });

  // If no updates provided, return current values
  if (Object.keys(updates).length === 0) {
    const existing = sh.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
    const existingByHeader = rowToHeaderObject_(existing);
    return {
      ok: true,
      data: {
        vehicleId: id,
        updated: false,
        current: {
          marketPriceLow: toNumber_(existingByHeader["MARKET_PRICE_LOW"]),
          marketPriceMedian: toNumber_(existingByHeader["MARKET_PRICE_MEDIAN"]),
          marketPriceHigh: toNumber_(existingByHeader["MARKET_PRICE_HIGH"]),
          marketPriceSource: String(existingByHeader["MARKET_PRICE_SOURCE"] || ""),
          marketPriceSamples: toNumber_(existingByHeader["MARKET_PRICE_SAMPLES"]),
          marketPriceConfidence: String(existingByHeader["MARKET_PRICE_CONFIDENCE"] || ""),
          marketPriceUpdatedAt: String(existingByHeader["MARKET_PRICE_UPDATED_AT"] || ""),
        },
      },
    };
  }

  // Apply updates
  const headerIndices = {};
  HEADERS.forEach(function (h, i) {
    headerIndices[h] = i + 1;
  });

  Object.keys(updates).forEach(function (header) {
    const colIndex = headerIndices[header];
    if (colIndex) {
      sh.getRange(rowNumber, colIndex).setValue(updates[header]);
    }
  });

  // Log the update
  console.log("Updated market price for vehicle " + id + ": " + JSON.stringify(updates));

  return {
    ok: true,
    data: {
      vehicleId: id,
      updated: true,
      updatedAt: nowCambodiaString_(),
      updates: updates,
    },
  };
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

  if (!folderId) return { ok: false, error: "Missing folderId or category (Cars, Motorcycles, Tuk Tuk)" };

  try {
    const folder = DriveApp.getFolderById(folderId);

    var file;
    var fileId;
    var thumbnailUrl;

    // Check if we have a blob (FormData upload) or base64 data (legacy JSON upload)
    if (payload.blob && payload.blob instanceof Blob) {
      // New FormData upload
      var blob = payload.blob;
      var fileName = String(payload.fileName || "").trim();
      if (!fileName) {
        // Generate unique filename: vehicle_<id>_<timestamp>.webp
        var vehicleId = String(payload.vehicleId || payload.id || "").trim();
        if (!vehicleId) vehicleId = "temp";
        var timestamp = new Date().getTime();
        fileName = "vehicle_" + vehicleId + "_" + timestamp + ".webp";
      }

      file = folder.createFile(blob);
      file.setName(fileName);
    } else {
      // Legacy base64 upload
      var data = String(payload.data || "");
      var mimeType = String(payload.mimeType || "image/jpeg").trim() || "image/jpeg";
      var fileName = String(payload.fileName || "").trim() || ("vehicle-" + new Date().getTime() + ".jpg");

      if (!data) return { ok: false, error: "Missing data (base64 image)" };

      const bytes = Utilities.base64Decode(data);
      const blob = Utilities.newBlob(bytes, mimeType, fileName);
      file = folder.createFile(blob);
    }

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    fileId = file.getId();
    thumbnailUrl = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1000-h1000";

    return {
      ok: true,
      data: {
        fileId: fileId,
        thumbnailUrl: thumbnailUrl,
      },
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

function deleteImage_(payload) {
  if (!payload || typeof payload !== "object") payload = {};
  var token = String(payload.token || "").trim();
  var expectedToken = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_UPLOAD_TOKEN") || "";
  if (expectedToken && token !== expectedToken) {
    return { ok: false, error: "Forbidden" };
  }

  var fileId = String(payload.fileId || "").trim();
  if (!fileId) return { ok: false, error: "Missing fileId" };

  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    return { ok: true, data: { deleted: true, fileId: fileId } };
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

/* ----------------- CONVERTERS ----------------- */

function rowToHeaderObject_(row) {
  const obj = {};
  HEADERS.forEach(function (h, i) {
    obj[h] = row[i] === undefined ? "" : row[i];
  });
  return obj;
}

function headersToRow_(byHeader) {
  return HEADERS.map(function (h) {
    return byHeader[h] !== undefined ? byHeader[h] : "";
  });
}

function headerToFriendly_(byHeader) {
  return {
    VehicleId: byHeader["#"],
    Category: byHeader["Category"],
    Brand: byHeader["Brand"],
    Model: byHeader["Model"],
    Year: byHeader["Year"],
    Plate: byHeader["Plate"],
    PriceNew: byHeader["MARKET PRICE"],
    Price40: byHeader["D.O.C.40%"],
    Price70: byHeader["Vehicles70%"],
    TaxType: byHeader["Tax Type"],
    Condition: byHeader["Condition"],
    BodyType: byHeader["Body Type"],
    Color: byHeader["Color"],
    Image: byHeader["Image"],
    Time: normalizeCambodiaTime_(byHeader["Time"]),
    // Market price fields
    MarketPriceLow: toNumber_(byHeader["MARKET_PRICE_LOW"]),
    MarketPriceMedian: toNumber_(byHeader["MARKET_PRICE_MEDIAN"]),
    MarketPriceHigh: toNumber_(byHeader["MARKET_PRICE_HIGH"]),
    MarketPriceSource: String(byHeader["MARKET_PRICE_SOURCE"] || ""),
    MarketPriceSamples: toNumber_(byHeader["MARKET_PRICE_SAMPLES"]),
    MarketPriceConfidence: String(byHeader["MARKET_PRICE_CONFIDENCE"] || ""),
    MarketPriceUpdatedAt: String(byHeader["MARKET_PRICE_UPDATED_AT"] || ""),
  };
}

function normalizeToHeaders_(data) {
  const d = data || {};
  const out = {};

  function pickValue_(headerName, friendlyName) {
    if (d[headerName] !== undefined) return d[headerName];
    if (friendlyName && d[friendlyName] !== undefined) return d[friendlyName];
    return "";
  }

  HEADERS.forEach(function (h) {
    if (h === "#") {
      const primary =
        pickValue_("#", "VehicleId") ||
        pickValue_("VehicleId", "VehicleId") ||
        pickValue_("Vehicle ID", "VehicleId") ||
        pickValue_("VehicleID", "VehicleId") ||
        pickValue_("Id", "VehicleId") ||
        pickValue_("id", "VehicleId");
      out[h] = primary;
    } else if (h === "MARKET PRICE") {
      const primary = pickValue_("MARKET PRICE", "PriceNew");
      out[h] = primary !== "" ? primary : pickValue_("Market Price", "PriceNew");
    } else if (h === "D.O.C.40%") {
      const primary = pickValue_("D.O.C.40%", "Price40");
      if (primary !== "") {
        out[h] = primary;
      } else {
        const legacy = pickValue_("D.O.C.1 40%", "Price40");
        out[h] = legacy !== "" ? legacy : pickValue_("Price 40%", "Price40");
      }
    } else if (h === "Vehicles70%") {
      const primary = pickValue_("Vehicles70%", "Price70");
      if (primary !== "") {
        out[h] = primary;
      } else {
        const legacy = pickValue_("Vehicle 70%", "Price70");
        out[h] = legacy !== "" ? legacy : pickValue_("Price 70%", "Price70");
      }
    } else if (h === "MARKET_PRICE_LOW") {
      out[h] = pickValue_("MARKET_PRICE_LOW", "MarketPriceLow", "marketPriceLow") || "";
    } else if (h === "MARKET_PRICE_MEDIAN") {
      out[h] = pickValue_("MARKET_PRICE_MEDIAN", "MarketPriceMedian", "marketPriceMedian") || "";
    } else if (h === "MARKET_PRICE_HIGH") {
      out[h] = pickValue_("MARKET_PRICE_HIGH", "MarketPriceHigh", "marketPriceHigh") || "";
    } else if (h === "MARKET_PRICE_SOURCE") {
      out[h] = pickValue_("MARKET_PRICE_SOURCE", "MarketPriceSource", "marketPriceSource") || "";
    } else if (h === "MARKET_PRICE_SAMPLES") {
      out[h] = pickValue_("MARKET_PRICE_SAMPLES", "MarketPriceSamples", "marketPriceSamples") || "";
    } else if (h === "MARKET_PRICE_CONFIDENCE") {
      out[h] = pickValue_("MARKET_PRICE_CONFIDENCE", "MarketPriceConfidence", "marketPriceConfidence") || "";
    } else if (h === "MARKET_PRICE_UPDATED_AT") {
      out[h] = pickValue_("MARKET_PRICE_UPDATED_AT", "MarketPriceUpdatedAt", "marketPriceUpdatedAt") || "";
    } else if (h === "Tax Type") out[h] = pickValue_("Tax Type", "TaxType");
    else if (h === "Body Type") out[h] = pickValue_("Body Type", "BodyType");
    else out[h] = pickValue_(h, h);
  });

  return out;
}

function computeDerivedPrices_(byHeader) {
  const priceNew = toNumber_(byHeader["MARKET PRICE"]);
  if (priceNew == null) {
    byHeader["D.O.C.40%"] = "";
    byHeader["Vehicles70%"] = "";
    return;
  }

  byHeader["D.O.C.40%"] = roundTo_(priceNew * 0.4, 2);
  byHeader["Vehicles70%"] = roundTo_(priceNew * 0.7, 2);
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

function roundTo_(value, decimals) {
  const d = Math.max(0, Math.min(6, Math.floor(decimals || 0)));
  const factor = Math.pow(10, d);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/* ----------------- DIAGNOSTIC & CLEANUP FUNCTIONS ----------------- */

/**
 * Diagnostic function to identify why row count differs from actual data count
 * Run this in the Apps Script editor to see which rows are problematic
 */
function diagnoseDataDiscrepancy() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  
  console.log("=== DATA DISCREPANCY DIAGNOSTIC ===");
  console.log("Sheet lastRow (includes header): " + lastRow);
  console.log("Expected data rows: " + (lastRow - 1));
  
  if (lastRow < 2) {
    console.log("No data rows found");
    return { totalRows: 0, validRows: 0, emptyRows: 0, missingIdRows: [] };
  }
  
  const values = sh.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  
  let validCount = 0;
  let emptyRowCount = 0;
  let missingIdRows = [];
  
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowNumber = i + 2; // Actual sheet row number (1-indexed, +1 for header)
    
    // Check if row is completely empty
    const isEmpty = row.every(function(v) { 
      return String(v || "").trim() === ""; 
    });
    
    if (isEmpty) {
      emptyRowCount++;
      missingIdRows.push({
        rowNumber: rowNumber,
        reason: "Completely empty row",
        idValue: null
      });
      continue;
    }
    
    // Check ID column (first column)
    const idValue = String(row[0] || "").trim();
    const hasValidId = idValue !== "" && idValue !== "null" && idValue !== "undefined";
    
    if (!hasValidId) {
      missingIdRows.push({
        rowNumber: rowNumber,
        reason: "Missing or invalid ID",
        idValue: row[0]
      });
    } else {
      validCount++;
    }
  }
  
  console.log("Valid rows with IDs: " + validCount);
  console.log("Completely empty rows: " + emptyRowCount);
  console.log("Rows with missing/invalid IDs: " + (missingIdRows.length - emptyRowCount));
  console.log("Total discrepancy: " + (lastRow - 1 - validCount) + " rows");
  
  if (missingIdRows.length > 0) {
    console.log("\n=== PROBLEMATIC ROWS ===");
    missingIdRows.forEach(function(info) {
      console.log("Row " + info.rowNumber + ": " + info.reason + " (ID value: '" + info.idValue + "')");
    });
  }
  
  return {
    totalRows: lastRow - 1,
    validRows: validCount,
    emptyRows: emptyRowCount,
    missingIdRows: missingIdRows,
    discrepancy: (lastRow - 1) - validCount
  };
}

/**
 * Cleanup function to remove empty rows and fix data gaps
 * Creates a backup first, then consolidates data
 */
function cleanupEmptyRows() {
  const sh = getSheet_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create backup
  const ts = Utilities.formatDate(new Date(), CAMBODIA_TIMEZONE, "yyyyMMdd-HHmmss");
  const backupName = "Vehicles-backup-cleanup-" + ts;
  sh.copyTo(ss).setName(backupName);
  console.log("Created backup: " + backupName);
  
  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    console.log("No data to cleanup");
    return { ok: true, message: "No data rows" };
  }
  
  const values = sh.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  
  // Filter out completely empty rows
  const validRows = values.filter(function(row) {
    const isEmpty = row.every(function(v) { 
      return String(v || "").trim() === ""; 
    });
    return !isEmpty;
  });
  
  console.log("Found " + values.length + " total rows");
  console.log("Found " + validRows.length + " valid rows");
  console.log("Removing " + (values.length - validRows.length) + " empty rows");
  
  // Clear all data rows
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, HEADERS.length).clear();
  }
  
  // Write back valid rows
  if (validRows.length > 0) {
    sh.getRange(2, 1, validRows.length, HEADERS.length).setValues(validRows);
  }
  
  // Remove excess rows if any
  const newLastRow = sh.getLastRow();
  const maxRows = sh.getMaxRows();
  if (maxRows > newLastRow + 10) {
    // Keep some buffer rows but remove excessive empty rows
    sh.deleteRows(newLastRow + 10, maxRows - newLastRow - 10);
  }
  
  console.log("Cleanup complete. Sheet now has " + validRows.length + " data rows.");
  
  return {
    ok: true,
    backup: backupName,
    originalCount: values.length,
    newCount: validRows.length,
    removedCount: values.length - validRows.length
  };
}

/**
 * Quick fix: Fill missing IDs for rows that have data but no ID
 */
function fillMissingIds() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  
  if (lastRow < 2) return { ok: true, filled: 0 };
  
  const idCol = 1; // First column
  const idRange = sh.getRange(2, idCol, lastRow - 1, 1);
  const idValues = idRange.getValues();
  
  let maxId = 0;
  let emptyIdRows = [];
  
  // Find max ID and identify empty IDs
  for (let i = 0; i < idValues.length; i++) {
    const val = idValues[i][0];
    const idStr = String(val || "").trim();
    
    if (idStr === "" || idStr === "null" || idStr === "undefined") {
      emptyIdRows.push(i);
    } else {
      const num = parseInt(idStr, 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }
  
  console.log("Max existing ID: " + maxId);
  console.log("Rows with missing IDs: " + emptyIdRows.length);
  
  // Fill missing IDs
  let nextId = maxId + 1;
  for (let i = 0; i < emptyIdRows.length; i++) {
    const rowIndex = emptyIdRows[i];
    idValues[rowIndex][0] = String(nextId++);
  }
  
  if (emptyIdRows.length > 0) {
    idRange.setValues(idValues);
    console.log("Filled " + emptyIdRows.length + " missing IDs");
  }
  
  return {
    ok: true,
    filled: emptyIdRows.length,
    nextId: nextId
  };
}

function extractDriveFileId_(value) {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  // If it's already a file id.
  if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) return raw;

  // Common: ...?id=FILEID
  const idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // Common: /file/d/FILEID/...
  const pathMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  // Common: googleusercontent.com/d/FILEID
  const guMatch = raw.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]{10,})/);
  if (guMatch && guMatch[1]) return guMatch[1];

  return "";
}

/* ----------------- RESPONSE ----------------- */

function parseMultipartFormData_(e) {
  var postData = e.postData;
  if (!postData || !postData.contents) {
    return {};
  }

  var boundary = getBoundary_(postData.type);
  if (!boundary) {
    return {};
  }

  var parts = postData.contents.split("--" + boundary);
  var payload = {};

  for (var i = 1; i < parts.length - 1; i++) {
    var part = parts[i].trim();
    if (!part) continue;

    var lines = part.split("\r\n");
    var headers = {};
    var contentStart = 0;

    // Parse headers
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j];
      if (line === "") {
        contentStart = j + 1;
        break;
      }

      var colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        var headerName = line.substring(0, colonIndex).trim().toLowerCase();
        var headerValue = line.substring(colonIndex + 1).trim();
        headers[headerName] = headerValue;
      }
    }

    // Extract field name from Content-Disposition
    var contentDisposition = headers["content-disposition"] || "";
    var fieldNameMatch = contentDisposition.match(/name="([^"]+)"/);
    if (!fieldNameMatch) continue;

    var fieldName = fieldNameMatch[1];
    var contentType = headers["content-type"] || "";

    // Extract content
    var content = lines.slice(contentStart).join("\r\n");

    if (contentType && contentType.indexOf("image/") === 0) {
      // Handle file upload
      var fileNameMatch = contentDisposition.match(/filename="([^"]+)"/);
      var fileName = fileNameMatch ? fileNameMatch[1] : "uploaded_file.webp";

      // Create blob from content
      var blob = Utilities.newBlob(Utilities.base64Decode(Utilities.base64Encode(content)), contentType, fileName);
      payload[fieldName] = blob;
      payload.fileName = fileName;
    } else {
      // Handle text field
      payload[fieldName] = content;
    }
  }

  return payload;
}

function getBoundary_(contentType) {
  if (!contentType) return null;
  var match = contentType.match(/boundary=([^;]+)/);
  return match ? match[1] : null;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
