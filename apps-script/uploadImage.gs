/**
 * Apps Script: action=uploadImage
 *
 * This file must be in the same project as Code.gs. Code.gs doPost() calls
 * uploadImageAction_(payload) when action === "uploadImage".
 *
 * Drive folders (CarsVMS, MotorcyclesVMS, TukTuksVMS):
 */

var DRIVE_FOLDER_CARS = "1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec";
var DRIVE_FOLDER_MOTORCYCLES = "10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP";
var DRIVE_FOLDER_TUKTUK = "18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP";

function folderIdForCategory_(category) {
  var normalized = String(category || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "car" || normalized === "cars") return DRIVE_FOLDER_CARS;
  if (normalized === "motorcycle" || normalized === "motorcycles") return DRIVE_FOLDER_MOTORCYCLES;
  if (normalized === "tuktuk" || normalized === "tuk tuk" || normalized === "tuk-tuk") return DRIVE_FOLDER_TUKTUK;
  return "";
}

function uploadImageAction_(body) {
  var token = (body && body.token) ? String(body.token) : "";
  var expectedToken = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_UPLOAD_TOKEN") || "";
  if (expectedToken && token !== expectedToken) {
    return jsonOutFromUpload_( { ok: false, error: "Forbidden" });
  }

  var folderId = (body && body.folderId) ? String(body.folderId).trim() : "";
  if (!folderId && body && (body.category || body.Category)) {
    folderId = folderIdForCategory_(body.category || body.Category);
  }
  var data = body && body.data ? String(body.data) : "";
  var mimeType = body && body.mimeType ? String(body.mimeType) : "image/jpeg";
  var fileName = body && body.fileName ? String(body.fileName) : ("vehicle-" + new Date().getTime() + ".jpg");

  if (!folderId) return jsonOutFromUpload_({ ok: false, error: "Missing folderId or category (Cars, Motorcycles, Tuk Tuk)" });
  if (!data) return jsonOutFromUpload_({ ok: false, error: "Missing data" });

  try {
    var folder = DriveApp.getFolderById(folderId);
    var bytes = Utilities.base64Decode(data);
    var blob = Utilities.newBlob(bytes, mimeType, fileName);
    var file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var thumbnailUrl = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1000-h1000";

    return jsonOutFromUpload_({
      ok: true,
      data: {
        fileId: fileId,
        thumbnailUrl: thumbnailUrl,
      },
    });
  } catch (err) {
    return jsonOutFromUpload_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function jsonOutFromUpload_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
