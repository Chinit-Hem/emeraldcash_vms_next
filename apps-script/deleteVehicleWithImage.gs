/**
 * Apps Script example: action=delete (delete Sheet row + Drive image)
 *
 * In your deployed Web App:
 *
 * function doPost(e) {
 *   const body = JSON.parse((e.postData && e.postData.contents) || "{}");
 *   const action = String(body.action || (e.parameter && e.parameter.action) || "").trim();
 *   if (action === "delete" || action === "deleteVehicle") return deleteVehicleAction_(body);
 *   // ...other actions
 * }
 */

function deleteVehicleAction_(body) {
  var token = (body && body.token) ? String(body.token) : "";
  var expectedToken = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_UPLOAD_TOKEN") || "";
  if (expectedToken && token !== expectedToken) {
    return json_({ ok: false, error: "Forbidden" });
  }

  var vehicleId = String((body && (body.VehicleId || body.VehicleID || body.id)) || "").trim();
  if (!vehicleId) return json_({ ok: false, error: "Missing VehicleId" });

  // Change this if your sheet name is different.
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Vehicles") || ss.getSheets()[0];

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return json_({ ok: false, error: "No data" });

  var headers = values[0].map(function (h) { return String(h || "").trim(); });
  var idCol = firstIndexOf_(headers, ["VehicleId", "VehicleID", "Id", "id"]);
  if (idCol === -1) return json_({ ok: false, error: "Missing VehicleId column" });

  var imageCol = firstIndexOf_(headers, ["Image", "ImageURL", "Image URL"]);

  var rowIndex = -1; // 1-based (sheet row index)
  var imageValue = "";

  for (var r = 1; r < values.length; r++) {
    var currentId = String(values[r][idCol] || "").trim();
    if (currentId === vehicleId) {
      rowIndex = r + 1;
      if (imageCol !== -1) imageValue = values[r][imageCol];
      break;
    }
  }

  if (rowIndex === -1) return json_({ ok: false, error: "Vehicle not found" });

  // Prefer an explicit file id sent from the app; fallback to parsing the Image column.
  var fileId =
    extractDriveFileId_(body && body.imageFileId) ||
    extractDriveFileId_(imageValue);

  // Delete from Sheet first.
  sheet.deleteRow(rowIndex);

  // Then move image to Trash (if any).
  if (fileId) {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (err) {
      // If file is missing or permissions deny, we still keep the row deleted.
    }
  }

  return json_({
    ok: true,
    data: {
      deleted: true,
      imageDeleted: !!fileId,
      imageFileId: fileId || "",
    },
  });
}

function firstIndexOf_(headers, keys) {
  for (var i = 0; i < keys.length; i++) {
    var idx = headers.indexOf(keys[i]);
    if (idx !== -1) return idx;
  }
  return -1;
}

function extractDriveFileId_(value) {
  if (value == null) return "";
  var raw = String(value).trim();
  if (!raw) return "";

  // If already a file id.
  if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) return raw;

  // Common: ...?id=FILEID
  var idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // Common: /file/d/FILEID/...
  var pathMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  // Common: googleusercontent.com/d/FILEID
  var guMatch = raw.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]{10,})/);
  if (guMatch && guMatch[1]) return guMatch[1];

  return "";
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
