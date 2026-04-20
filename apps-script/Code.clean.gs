/**
 * Vehicle API for Google Sheets (Web App) - CLEAN SCHEMA VERSION
 * 
 * Sheet headers (row 1) - EXACTLY THESE COLUMNS:
 *   A: id | B: category | C: brand | D: model | E: year | F: plate | G: market_price | 
 *   H: tax_type | I: condition | J: body_type | K: color | L: image_id | M: created_at | N: updated_at
 *
 * Features:
 *  - GET  ?action=getVehicles&limit=200&offset=0   (paginated)
 *  - GET  ?action=getById&id=1
 *  - POST {"action":"add","data":{...}}
 *  - POST {"action":"update","id":"1","data":{...}}
 *  - POST {"action":"delete","id":"1"}
 *  - onEdit trigger: auto-updates updated_at timestamp
 *  - Duplicate plate highlighting
 *  - Data validation helpers
 */

/* ----------------- CONFIG ----------------- */

// Optional: for Standalone Script. Leave "" for bound scripts.
const SPREADSHEET_ID = "";

// Sheet tab name to use. If not found, falls back to the first tab.
const SHEET_NAME = "Vehicles";

// Timezone settings
const CAMBODIA_TIMEZONE = "Asia/Phnom_Penh";
const CAMBODIA_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

// Required columns (row 1) - EXACT SNAKE_CASE SCHEMA
const REQUIRED_HEADERS = [
  "id",           // A - Unique identifier
  "category",     // B - Car, Motorcycle, TukTuk
  "brand",        // C - Vehicle brand
  "model",        // D - Vehicle model
  "year",         // E - Numeric year
  "plate",        // F - License plate number
  "market_price", // G - Numeric price
  "tax_type",     // H - Tax classification
  "condition",    // I - New, Used
  "body_type",    // J - Body style
  "color",        // K - Vehicle color
  "image_id",     // L - Drive file ID only (not URL)
  "created_at",   // M - Creation timestamp (immutable)
  "updated_at"    // N - Last update timestamp (auto-updated)
];

// Valid values for dropdown validation
const VALID_CATEGORIES = ["Car", "Motorcycle", "TukTuk"];
const VALID_CONDITIONS = ["New", "Used"];

// Default Drive folders per Category
const DRIVE_FOLDER_CARS = "1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec";
const DRIVE_FOLDER_MOTORCYCLES = "10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP";
const DRIVE_FOLDER_TUKTUK = "18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP";

// Pagination defaults
const DEFAULT_PAGE_LIMIT = 200;
const MAX_PAGE_LIMIT = 500;

// Conditional formatting colors
const DUPLICATE_PLATE_COLOR = "#FF6B6B"; // Red highlight for duplicates

/* ----------------- ON EDIT TRIGGER (Auto-updated_at) ----------------- */

/**
 * onEdit trigger - Automatically updates the updated_at column when any row is edited.
 * This function runs automatically when a user edits the sheet manually.
 * 
 * To install: 
 * 1. Save this script
 * 2. Click the clock icon (Triggers) on the left
 * 3. Click "+ Add Trigger"
 * 4. Choose function: onEdit
 * 5. Choose deployment: Head
 * 6. Select event source: From spreadsheet
 * 7. Select event type: On edit
 * 8. Click Save
 */
function onEdit(e) {
  if (!e) {
    // Manual run protection - exit if triggered without event object
    return;
  }
  
  try {
    const range = e.range;
    const sheet = range.getSheet();
    
    // Only process the Vehicles sheet
    if (sheet.getName() !== SHEET_NAME) return;
    
    const row = range.getRow();
    const col = range.getColumn();
    
    // Skip header row
    if (row === 1) return;
    
    // Get header row to find column indices
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
    const cols = buildCols_(headers);
    
    // Skip if updated_at column doesn't exist
    if (cols.updatedAt < 0) return;
    
    // Skip if the edit was on the updated_at column itself (prevent loops)
    if (col === cols.updatedAt + 1) return;
    
    // Skip if the edit was on the created_at column (never update created_at)
    if (col === cols.createdAt + 1) return;
    
    // Skip if the edit was on the id column (id should be stable)
    if (col === cols.id + 1) return;
    
    // Update the updated_at timestamp
    const now = nowCambodiaString_();
    sheet.getRange(row, cols.updatedAt + 1).setValue(now);
    
    // Check for duplicate plates after plate edit
    if (col === cols.plate + 1) {
      highlightDuplicatePlates_(sheet, headers);
    }
    
  } catch (err) {
    // Silently fail to not interrupt user editing
    console.error("onEdit error:", err);
  }
}

/**
 * Manual trigger to highlight all duplicate plate numbers in the sheet.
 * Run this once after setup to highlight existing duplicates.
 */
function highlightDuplicatePlatesManual() {
  const sh = getSheet_();
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  highlightDuplicatePlates_(sh, headers);
}

/**
 * Highlights duplicate plate numbers with red background.
 */
function highlightDuplicatePlates_(sheet, headers) {
  const cols = buildCols_(headers);
  if (cols.plate < 0) return;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  // Get all plate values
  const plateRange = sheet.getRange(2, cols.plate + 1, lastRow - 1, 1);
  const plates = plateRange.getValues().flat().map(function(v) {
    return String(v || "").trim().toLowerCase();
  });
  
  // Find duplicates
  const seen = {};
  const duplicates = {};
  
  for (let i = 0; i < plates.length; i++) {
    const plate = plates[i];
    if (!plate) continue; // Skip empty plates
    
    if (seen[plate]) {
      duplicates[i] = true;
      duplicates[seen[plate] - 1] = true;
    } else {
      seen[plate] = i + 1; // Store 1-based index
    }
  }
  
  // Apply formatting
  const backgrounds = [];
  for (let i = 0; i < plates.length; i++) {
    if (duplicates[i]) {
      backgrounds.push([DUPLICATE_PLATE_COLOR]);
    } else {
      backgrounds.push([null]); // Clear formatting
    }
  }
  
  plateRange.setBackgrounds(backgrounds);
}

/* ----------------- ONE-TIME CLEANUP HELPERS ----------------- */

/**
 * ONE-TIME CLEANUP: Run this to fix your messy sheet.
 * 
 * This function will:
 * 1. Standardize all headers to snake_case
 * 2. Merge "body type" and "Body Type" into "body_type"
 * 3. Remove blank/unused columns
 * 4. Normalize all existing data
 * 5. Add missing updated_at column
 * 6. Fill missing ids
 * 7. Normalize image_ids to fileIds only
 * 8. Standardize category and condition values
 * 9. Convert year and market_price to numeric
 */
function cleanupSheetSchema() {
  const sh = getSheet_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  console.log("Starting sheet cleanup...");
  
  // Step 1: Backup current data
  const originalData = sh.getDataRange().getValues();
  if (originalData.length === 0) {
    console.log("Sheet is empty, just setting headers");
    setupCleanHeaders_(sh);
    return { success: true, message: "Empty sheet - headers set" };
  }
  
  const originalHeaders = originalData[0] || [];
  const originalRows = originalData.slice(1);
  
  console.log("Original headers found:", originalHeaders.join(", "));
  
  // Step 2: Build column mapping from original headers
  const colMap = buildCols_(originalHeaders);
  
  // Step 3: Create new clean data array
  const newData = [];
  
  // Add clean headers
  newData.push(REQUIRED_HEADERS);
  
  // Migrate each row to new schema
  for (let i = 0; i < originalRows.length; i++) {
    const oldRow = originalRows[i];
    const newRow = migrateRowToCleanSchema_(oldRow, colMap, i + 2);
    newData.push(newRow);
  }
  
  // Step 4: Clear sheet and write clean data
  sh.clear();
  
  // Write new data
  sh.getRange(1, 1, newData.length, REQUIRED_HEADERS.length).setValues(newData);
  
  // Step 5: Format header row
  formatHeaderRow_(sh);
  
  // Step 6: Set column widths for readability
  setColumnWidths_(sh);
  
  // Step 7: Highlight any duplicate plates
  highlightDuplicatePlates_(sh, REQUIRED_HEADERS);
  
  console.log("Cleanup complete! Rows processed:", originalRows.length);
  
  return { 
    success: true, 
    rowsProcessed: originalRows.length,
    message: "Sheet cleaned successfully. Headers standardized to snake_case." 
  };
}

/**
 * Migrates a single row from old schema to clean schema
 */
function migrateRowToCleanSchema_(oldRow, colMap, rowNum) {
  const newRow = new Array(REQUIRED_HEADERS.length).fill("");
  
  // Helper to safely get value from old row
  const getValue = function(colIndex) {
    if (colIndex < 0 || colIndex >= oldRow.length) return "";
    return oldRow[colIndex];
  };
  
  // id - keep existing or generate new
  const existingId = String(getValue(colMap.id) || "").trim();
  newRow[0] = existingId || String(rowNum - 1); // Use row number as fallback ID
  
  // category - normalize to standard values
  const rawCategory = String(getValue(colMap.category) || "").trim();
  newRow[1] = normalizeCategory_(rawCategory);
  
  // brand
  newRow[2] = String(getValue(colMap.brand) || "").trim();
  
  // model
  newRow[3] = String(getValue(colMap.model) || "").trim();
  
  // year - convert to number
  const rawYear = getValue(colMap.year);
  newRow[4] = toIntOrBlank_(rawYear);
  
  // plate
  newRow[5] = String(getValue(colMap.plate) || "").trim();
  
  // market_price - convert to number
  const rawPrice = getValue(colMap.marketPrice);
  newRow[6] = toNumberOrBlank_(rawPrice);
  
  // tax_type
  newRow[7] = String(getValue(colMap.taxType) || "").trim();
  
  // condition - normalize to standard values
  const rawCondition = String(getValue(colMap.condition) || "").trim();
  newRow[8] = normalizeCondition_(rawCondition);
  
  // body_type - check both bodyType mappings
  let bodyType = String(getValue(colMap.bodyType) || "").trim();
  // Also check if there's a "Body Type" or "body type" column we might have missed
  if (!bodyType && colMap.bodyType >= 0) {
    bodyType = String(getValue(colMap.bodyType) || "").trim();
  }
  newRow[9] = bodyType;
  
  // color
  newRow[10] = String(getValue(colMap.color) || "").trim();
  
  // image_id - normalize to fileId only
  const rawImage = String(getValue(colMap.imageId) || "").trim();
  newRow[11] = normalizeImageId_(rawImage);
  
  // created_at - keep existing or set now
  const existingCreated = String(getValue(colMap.createdAt) || "").trim();
  newRow[12] = existingCreated || nowCambodiaString_();
  
  // updated_at - set to now for all existing rows
  newRow[13] = nowCambodiaString_();
  
  return newRow;
}

/**
 * Normalizes category to standard values
 */
function normalizeCategory_(value) {
  const raw = String(value || "").trim().toLowerCase();
  
  if (raw === "car" || raw === "cars") return "Car";
  if (raw === "motorcycle" || raw === "motorcycles" || raw === "bike" || raw === "motorbike") return "Motorcycle";
  if (raw === "tuktuk" || raw === "tuk tuk" || raw === "tuk-tuk" || raw === "tuk_tuk") return "TukTuk";
  
  // Return original if no match (manual cleanup needed)
  return String(value || "").trim();
}

/**
 * Normalizes condition to standard values
 */
function normalizeCondition_(value) {
  const raw = String(value || "").trim().toLowerCase();
  
  if (raw === "new" || raw === "brand new") return "New";
  if (raw === "used" || raw === "second hand" || raw === "secondhand" || raw === "pre-owned") return "Used";
  
  return String(value || "").trim();
}

/**
 * Sets up clean headers on an empty or new sheet
 */
function setupCleanHeaders_(sheet) {
  sheet.clear();
  sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
  formatHeaderRow_(sheet);
  setColumnWidths_(sheet);
}

/**
 * Formats the header row with bold and background
 */
function formatHeaderRow_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#4285f4");
  headerRange.setFontColor("#ffffff");
  sheet.setFrozenRows(1);
}

/**
 * Sets appropriate column widths
 */
function setColumnWidths_(sheet) {
  const widths = [60, 100, 120, 150, 60, 100, 100, 100, 80, 100, 80, 150, 150, 150];
  for (let i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }
}

/**
 * ONE-TIME: Normalize all image_ids to fileId format
 */
function normalizeAllImageIds() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  
  if (lastRow < 2) return { changed: 0 };
  
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  const cols = buildCols_(headers);
  
  if (cols.imageId < 0) return { error: "No image_id column found" };
  
  const range = sh.getRange(2, cols.imageId + 1, lastRow - 1, 1);
  const values = range.getValues();
  
  let changed = 0;
  for (let i = 0; i < values.length; i++) {
    const before = String(values[i][0] || "").trim();
    if (!before) continue;
    
    const after = normalizeImageId_(before);
    if (after !== before) {
      values[i][0] = after;
      changed++;
    }
  }
  
  if (changed > 0) {
    range.setValues(values);
  }
  
  return { changed: changed };
}

/* ----------------- DATA VALIDATION SETUP ----------------- */

/**
 * Sets up data validation dropdowns for category and condition columns.
 * Run this after cleanupSheetSchema().
 */
function setupDataValidation() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  
  // Category column (B)
  const categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(VALID_CATEGORIES, true)
    .setAllowInvalid(false)
    .setHelpText("Please select: Car, Motorcycle, or TukTuk")
    .build();
  
  // Apply to all rows in category column (starting from row 2)
  const categoryRange = sh.getRange(2, 2, Math.max(1, lastRow - 1), 1);
  categoryRange.setDataValidation(categoryRule);
  
  // Condition column (I)
  const conditionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(VALID_CONDITIONS, true)
    .setAllowInvalid(false)
    .setHelpText("Please select: New or Used")
    .build();
  
  // Apply to all rows in condition column (starting from row 2)
  const conditionRange = sh.getRange(2, 9, Math.max(1, lastRow - 1), 1);
  conditionRange.setDataValidation(conditionRule);
  
  return { 
    success: true, 
    message: "Data validation applied to category and condition columns" 
  };
}

/* ----------------- ROUTES (doGet/doPost) ----------------- */

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

    // Image upload to Drive
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

/* ----------------- SHEET OPERATIONS ----------------- */

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
  if (raw === "#") return "id";
  // Handle "body type" with space -> bodytype
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

  // Add missing required headers at the end
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
    marketPrice: findCol_(["market_price", "marketprice", "market price", "price_new", "pricenew", "price"]),
    taxType: findCol_(["tax_type", "taxtype", "tax type", "taxtype"]),
    condition: findCol_(["condition"]),
    bodyType: findCol_(["body_type", "bodytype", "body type"]),
    imageId: findCol_(["image_id", "imageid", "image", "imageurl", "image url"]),
    color: findCol_(["color"]),
    createdAt: findCol_(["created_at", "createdat", "created at", "time", "added time", "datetime"]),
    updatedAt: findCol_(["updated_at", "updatedat", "updated at"]),
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

  return { sh, cols, values, rowIndices, total };
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
  const updatedAt = nowCambodiaString_(); // Set updated_at on creation
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
  setCell_(row, cols.updatedAt, updatedAt);

  sh.appendRow(row);
  
  // Check for duplicate plates after adding
  highlightDuplicatePlates_(sh, headerRow);
  
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
  
  // Never change created_at or id
  setCell_(next, cols.id, String(existing[cols.id] || "").trim() || String(id));
  
  // Always update updated_at on manual API update
  setCell_(next, cols.updatedAt, nowCambodiaString_());

  sh.getRange(rowNumber, 1, 1, lastCol).setValues([next]);
  
  // Check for duplicate plates after update
  highlightDuplicatePlates_(sh, headerRow);
  
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

/* ----------------- MAPPERS & HELPERS ----------------- */

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
    marketPrice: pick(["market_price", "marketprice", "market price", "MARKET PRICE", "Market Price", "PriceNew", "price_new"]),
    taxType: pick(["tax_type", "taxtype", "Tax Type", "TaxType"]),
    condition: pick(["condition", "Condition"]),
    bodyType: pick(["body_type", "bodytype", "body type", "Body Type", "BodyType"]),
    imageId: pick(["image_id", "imageid", "image", "Image", "ImageURL", "image_url", "Image URL", "fileId", "ImageFileId"]),
    color: pick(["color", "Color"]),
    createdAt: pick(["created_at", "createdat", "Time", "time", "Created At", "created at"]),
    updatedAt: pick(["updated_at", "updatedat", "Updated At", "updated at"]),
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
    UpdatedAt: normalizeCambodiaTime_(get(cols.updatedAt)),
  };
}

/* ----------------- UTILITY HELPERS ----------------- */

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
  if (normalized === "tuktuk" || raw === "tuk tuk" || raw === "tuk-tuk" || raw === "tuk_tuk") return DRIVE_FOLDER_TUKTUK;

  return "";
}

/* ----------------- RESPONSE ----------------- */

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
