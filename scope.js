import {SCOPE} from "./module/config.js";
import {JournalDirectoryScope} from './module/sidebar/journal.js';
import {JournalSheetScope} from "./module/journal/journal-sheet.js";
import {CardList} from "./module/cards.js";
import {registerSettings} from "./module/helper.js";
import {isEmpty} from "./module/helper.js";
import {getFromTheme} from "./module/helper.js";
import {insertNote} from "./module/helper.js";

/**
 * Sets up the environment and manages the hooks.
 */

/**
 * Initialization of the game environment
 */
Hooks.once("init", function () {
  console.log(`SCOPE | Initializing Scope ============================`);

  CONFIG.Scope = SCOPE;
  CONFIG.ui.journal = JournalDirectoryScope;
  CONFIG["JournalEntry"]["sheetClass"] = JournalSheetScope;
  game.scope = SCOPE.namespace;
  game.scope.period = new CardList(SCOPE.sortDirection.horizontal, "period");

  registerSettings();

  game.scope.bookend = game.settings.get('Scope', 'bookend') || SCOPE.Bookends.position;
});

Hooks.once("ready", async function() {
  await _prepareScene();
  await _prepareFolders();
  game.journal.directory.activate();
  canvas.notes.activate();
});

/**
 * Prepare the scene if it hasn't yet been prepared
 */
Hooks.on("updateScene", async (entity, data, options, userId) => {
  if ( SCOPE.scenePrepared ) return;

  await _prepareSceneText(entity);
  SCOPE.scenePrepared = true;
});

/**
 * SCENE PREPARATION ===========================================================
 */

/**
 * Create the main Scene, if necessary
 * @returns {Promise<void>}
 * @private
 */
async function _prepareScene() {
  let scene = game.scenes.getName("Scope");
  if ( scene ) {
    SCOPE.scenePrepared = true;
    await _prepareSceneText(scene);
  } else {
    let x = await Scene.create(SCOPE.scene);
    await Scene.updateDocuments([{_id: x._id, active: true, img: "systems/Scope/assets/themes/whitespace/background.jpg"}]);
  }
}

/**
 * Create the on scene text data
 * @returns {Promise<void>}
 * @private
 */
async function _prepareSceneText(scene) {
  console.log("Preparing Scene Text");
  let drawings = scene.getEmbeddedCollection("Drawing");
  let bpd = drawings.filter(d => d.getFlag("Scope", "type") === "bigPicture");
  let fld = drawings.filter(d => d.getFlag("Scope", "type") === "focusLabel");
  let fd = drawings.filter(d => d.getFlag("Scope", "type") === "focus");
  let bp;
  let focus;
  if ( bpd.length > 0 ) {
    bp = bpd[0];
  } else {
    bp = bp = await _createText(scene, "bigPicture");
  }
  if ( fld.length === 0 ) {
    await _createText(scene, "focusLabel");
  }
  if ( fd.length > 0 ) {
    focus = fd[0];
  } else {
    focus = await _createText(scene, "focus");
  }

  game.scope.focus = {
    id: focus.data._id,
    text: focus.data.text,
    bpId: bp.data._id,
    bpText: bp.data.text
  }
}

/**
 * Create the requested drawing if it doesn't already exist
 * @param scene
 * @param type  The request drawing type (focus, focusLabel, etc)
 * @returns {Promise<*[]>}
 * @private
 */
async function _createText(scene, type) {
  let drawings = _getText(scene, type);
  let x = (scene.data.width / 2) - (SCOPE[type].width / 2);
  if ( isEmpty(drawings) ) {
    let color = "";
    switch (type) {
      case "focus":
        color = getFromTheme("focus-color");
        break;
      case "focusLabel":
        color = getFromTheme("focus-label-color");
        break;
      case "bigPicture":
        color = getFromTheme("focus-label-color");
        break;
    }
    let drawingData = {
      textColor: color,
      x: x,
      flags: {
        Scope: {
          type: type,
          ftype: CONST.DRAWING_TYPES.TEXT
        }
      }
    };

    foundry.utils.mergeObject(drawingData, SCOPE[type]);
    let ss = await scene.createEmbeddedDocuments("Drawing", [drawingData]);
    drawings = _getText(scene, type);
  }

  return drawings;
}

/**
 * Get any drawings that are of type TEXT and contain the flag with the given flag key
 * @package type  The type of the drawing (focus, focusLabel, etc)
 * @returns {DrawingDocument}
 * @private
 */
function _getText(scene, type) {

  let drawings = scene.getEmbeddedCollection("Drawing");
  if ( drawings.size > 0 ) {
    let scopeText = drawings.filter(d => d.getFlag("Scope", "ftype") === "t")
    if (scopeText.length > 0) {
      const fd = scopeText.find(f => f.getFlag("Scope","type") === type);
      if ( fd )
        return fd;
    }
  }
  return {};
}

/**
 * FOLDER PREPARATION ===========================================================
 */

/**
 * Create the needed journal folders that are missing
 * @returns {Promise<void>}
 * @private
 */
async function _prepareFolders() {
  console.log("FOLDERS");
  const folder = game.i18n.localize("SCOPE.JournalFolder");
  console.log(game.folders);
  let journalFolders = game.folders.filter(f => f.type === "JournalEntry");
  await _createFolder(journalFolders, folder, "period");
  await _createFolder(journalFolders, folder, "event");
  await _createFolder(journalFolders, folder, "scene");
  await _createFolder(journalFolders, folder, "legacy");
}

/**
 * Create the requested folder, if it does not exist
 * @param folders   The list of JournalEntry folders
 * @param folder    The localized word for Folder
 * @param type      The type of folder to create
 * @returns {Promise<void>}
 * @private
 */
async function _createFolder(folders, folder, type) {
  const nameFromType = type[0].toUpperCase() + type.substr(1);
  const name = game.i18n.localize(`SCOPE.Journal${nameFromType}Plural`);
  const folderData = new foundry.data.FolderData({
    name: name,
    parent: null,
    type: "JournalEntry",
    flags: {
      Scope: {
        type: type
      }
    }
  });

  let f;
  if ( !folders.find(f => f.data.flags) )
    if ( !folders.find(f => f.getFlag("Scope", "type") === type) ) {
      console.log(`Creating ${name} ${folder}`);
      f = await Folder.create(folderData);
    }

  console.log(f);
}

/**
 * NOTE PREPARATION ===========================================================
 */

/**
 * When all is ready, make the notes layer the active layer. Everything interactive
 * happens on the notes layer.
 */
Hooks.on("canvasReady", async () => {

  let scene = game.scenes.getName("Scope");

  // Remove any existing connectors from the scene
  let drawings = scene.getEmbeddedCollection("Drawing");
  let drawingsToClear = drawings.filter(d => d.getFlag("Scope", "type") === "connector").map(d => d.data._id);
  if (drawingsToClear.length > 0) drawings.deleteEmbeddedDocuments("Drawing", drawingsToClear);

  let notes = scene.getEmbeddedCollection("Note");

  // Rebuild the period list, adding back connectors
  let periodNotes = notes.filter(n => n.getFlag("Scope", "type") === "period");
  for (const period of periodNotes) {
    await game.scope.period.add(period);
  }

  // Rebuild the events, adding back connectors
  let eventNotes = notes.filter(n => n.getFlag("Scope", "type" ) === "event");
  let eventGroups = eventNotes.reduce((r, a) => {
    const periodNote = a.getFlag("Scope", "periodNote");
    r[periodNote] = [...r[periodNote] || [], a];
    return r;
  }, {});

  for (const group in eventGroups) {
    let period = game.scope.period.findCard("noteId", group);
    eventGroups[group].forEach(note => game.scope.period.attach("event", note, period.id));
  }
});

/**
 * NOTE HANDLING ===========================================================
 */

/**
 * When a journal entry is dropped onto the canvas, create a note
 */
Hooks.on("dropCanvasData", (entity, data) => {
  if ( data.type !== "JournalEntry" ) return;
  const type = game.journal.get(data.id).getFlag("Scope", "type");
  switch (type) {
    case "period":
      insertNote(data.id, {x: data.x, y: data.y});
      break;
    case "event":
      break;
    case "scene":
      break;
    case "legacy":
      break;
  }

  return false;
});