import {SCOPE} from "./module/config.js";
import {JournalDirectoryScope} from './module/sidebar/journal.js';
import {JournalSheetScope} from "./module/journal/journal-sheet.js";
import {CardList} from "./module/cards.js";
import {registerSettings} from "./module/helper.js";
import {isEmpty} from "./module/helper.js";
import {getFromTheme} from "./module/helper.js";

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
});

Hooks.once("ready", async function() {
  await _prepareScene();
  await _prepareFolders();
  game.journal.directory.activate();
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
  let bpd = scene.drawings.filter(d => d.getFlag("Scope", "type") === "bigPicture");
  let fld = scene.drawings.filter(d => d.getFlag("Scope", "type") === "focusLabel");
  let fd = scene.drawings.filter(d => d.getFlag("Scope", "type") === "focus");
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
    id: focus._id,
    text: focus.text,
    bpId: bp._id,
    bpText: bp.text
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
    let scopeText = scene.getEmbeddedCollection("Drawing").filter(d => d.getFlag("Scope", "ftype") === "t")
    //let drawings = scene.data.drawings.filter(d => d.flags["Scope"] && d.flags["Scope"]["ftype"] === CONST.DRAWING_TYPES.TEXT);
    if (scopeText.length > 0) {
    //if ( drawings.size > 0 ) {
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
  const folder = game.i18n.localize("SCOPE.JournalFolder");
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

  if ( !folders.find(f => f.data.flags) )
    if ( !folders.find(f => f.getFlag("Scope", "type") === type) ) {
      console.log(`Creating ${name} ${folder}`);
      new Folder(folderData);
    }
}