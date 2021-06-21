import {SCOPE} from "./module/config.js";
import {JournalDirectoryScope} from './module/sidebar/journal.js';
import {JournalSheetScope} from "./module/journal/journal-sheet.js";
import {CardList} from "./module/cards.js";
import {registerSettings} from "./module/helper.js";
import {getFromTheme} from "./module/helper.js";
import {insertNote} from "./module/helper.js";
import {patchCore} from "./module/patch.js";

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
  patchCore();

  game.scope.bookend = game.settings.get('Scope', 'bookend') || SCOPE.Bookends.position;
});

Hooks.once("ready", async function () {
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
 * @param {Scene} scene
 * @returns {Promise<void>}
 * @private
 */
async function _prepareSceneText(scene) {
  console.log("Preparing Scene Text");
  let drawings = scene.getEmbeddedCollection("Drawing");
  let bpd = drawings.filter(d => d.getFlag("Scope", "type") === "bigPicture");
  let fld = drawings.filter(d => d.getFlag("Scope", "type") === "focusLabel");
  let fd = drawings.filter(d => d.getFlag("Scope", "type") === "focus");
  let legLabel = drawings.filter(d => d.getFlag("Scope", "type") === "legacyLabel");
  let leg = drawings.filter(d => d.getFlag("Scope", "type") === "legacy");
  let bp;
  let focus;
  if ( bpd.length > 0 ) {
    bp = bpd;
  } else {
    bp = await _createText(scene, "bigPicture");
  }
  if ( fld.length === 0 ) {
    await _createText(scene, "focusLabel");
  }
  if ( legLabel.length === 0 ) {
    await _createText(scene, "legacyLabel");
  }
  if ( fd.length > 0 ) {
    focus = fd;
  } else {
    focus = await _createText(scene, "focus");
  }

  let legList = [];
  if ( leg.length > 0 ) {
    for (const legacy of leg) {
      legList.push({id: legacy.data._id, text: legacy.data.text});
    }
  } else {
    for (let i = 0; i < SCOPE.legacies.length; i++) {
      let legText = await _createText(scene, "legacy", SCOPE.legacies[i], i);
      legList.push({id: legText[0].data._id, text: legText[0].data.text});
    }
  }

  game.scope.focus = {
    id: focus[0].data._id,
    text: focus[0].data.text,
    bpId: bp[0].data._id,
    bpText: bp[0].data.text
  }
  game.scope.legacies = legList;
}

/**
 * Create the requested drawing if it doesn't already exist
 * @param {Scene}   scene
 * @param {string}  type  The request drawing type (focus, focusLabel, etc)
 * @param {string}  text  Optional. Provide the text to create for Legacies
 * @param {Number}  sequence  Optional. The order in which this appears in a list
 * @returns {Promise<*[]>}
 * @private
 */
async function _createText(scene, type, text = "", sequence = 0) {
  //let drawings = _getText(scene, type);
  let x = (scene.data.width / 2) - (SCOPE[type].width / 2);
  //if ( isEmpty(drawings) ) {
  let color = "";
  let yOverride = 0;
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
    case "legacyLabel":
      color = getFromTheme("legacy-label-color");
      x = x / 1.5;
      break;
    case "legacy":
      color = getFromTheme("legacy-color");
      x = x / 1.5;
      yOverride = SCOPE.legacyListStart;
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

  if ( text ) foundry.utils.mergeObject(drawingData, {text: text});
  foundry.utils.mergeObject(drawingData, SCOPE[type]);
  if (yOverride > 0) foundry.utils.mergeObject(drawingData, {y: yOverride + (sequence * SCOPE[type].height)});

  let ss = await scene.createEmbeddedDocuments("Drawing", [drawingData]);
  //let drawings = _getText(scene, type);
  //}

  return ss;
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
    //let scopeText = drawings.filter(d => d.getFlag("Scope", "ftype") === "t")
    //if ( scopeText.length > 0 ) {
    const fd = drawings.find(f => f.getFlag("Scope", "type") === type);
    if ( fd )
      return fd;
    //}
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
  //if ( !folders.find(f => f.data.flags) )
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

  // Initialize the collision detection. Used to determine if cards overlap
  SCOPE.bump = new Bump(PIXI);

  let scene = game.scenes.getName("Scope");

  // Remove any existing connectors from the scene
  let drawings = scene.getEmbeddedCollection("Drawing");
  let drawingsToClear = drawings.filter(d => d.getFlag("Scope", "type") === "connector").map(d => d.data._id);
  if ( drawingsToClear.length > 0 )
    try {
      await scene.deleteEmbeddedDocuments("Drawing", drawingsToClear);
    } catch (ex) {
      console.log("Attempted to delete a non-existent drawing. Just carry on.");
    }

  let notes = scene.getEmbeddedCollection("Note");

  // Rebuild the period list, adding back connectors
  let periodNotes = notes.filter(n => n.getFlag("Scope", "type") === "period");
  for (const period of periodNotes) {
    await game.scope.period.add(period);
  }

  // Rebuild the events, adding back connectors
  let eventNotes = notes.filter(n => n.getFlag("Scope", "type") === "event");
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
Hooks.on("dropCanvasData", (canvas, data) => {
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

/**
 * Rerender the connectors when the note is moved.
 */
Hooks.on("updateNote", async (entity, d, options, userid) => {
  const noteId = d._id;
  if ( !game.scope.period.canRefresh ) return;
  await game.scope.period.updateCard(noteId, {x: d.x, y: d.y});
});

/**
 * Update the note icon and draw the note and add it to the
 * appropriate note list.
 */
Hooks.on("createNote", async (noteDocument, options) => {

  Object.defineProperty(noteDocument, "centerX", {
    get: function get() {
      return noteDocument.x;
    },
    enumerable: true, configurable: true
  });
  Object.defineProperty(noteDocument, "centerY", {
    get: function get() {
      return noteDocument.y;
    },
    enumerable: true, configurable: true
  });

  const entry = game.journal.get(noteDocument.data.entryId);
  const tone = entry.getFlag("Scope", "tone");
  const type = entry.getFlag("Scope", "type");
  const periodAttach = entry.getFlag("Scope", "periodAttach");
  const eventAttach = entry.getFlag("Scope", "eventAttach");
  let periodNoteId = "none";
  let eventNoteId = "none";
  if ( periodAttach && periodAttach !== "none" ) {
    periodNoteId = game.scope.period.findCard("id", periodAttach).noteId;
  }

  let flagData = SCOPE.noteSettings[type];
  let flagTypeData = {
    tone: tone,
    labelBorderColor: getFromTheme(`${type}-label-stroke-color`),
    noteBorderColor: getFromTheme("border-color"),
    periodNote: periodNoteId,
    eventNote: eventNoteId
  }
  flagData = foundry.utils.mergeObject(flagData, flagTypeData);
  const flags = {
    Scope: flagData
  }

  let typeData = {
    _id: noteDocument.data._id,
    text: entry.data.name,
    icon: SCOPE.icons[type],
    iconSize: SCOPE.noteSettings[type].iconWidth,
    iconTint: getFromTheme(`${type}-icon-color`),
    fontSize: getFromTheme(`${type}-label-size`),
    textColor: getFromTheme(`${type}-label-color`),
    flags: flags
  }

  game.scope.period.lockRefresh();
  let scene = game.scenes.getName("Scope");
  await scene.updateEmbeddedDocuments("Note", [typeData]);
  game.scope.period.unlockRefresh();

  switch (type) {
    case "period":
      await game.scope.period.add(noteDocument);
      break;
    case "event":
      // TODO - Need to calculate the notes x/y if not dropped, but attached
      if ( periodAttach !== "none" ) {
        if ( eventAttach === "none" )
          await game.scope.period.attach(type, noteDocument, periodAttach);
        else {
          const periodCard = game.scope.period.findCard("id", periodAttach, game.scope.period.head);
          periodCard.children.add(noteDocument);
        }
      }
      break;
    case "scene":
      break;
    case "legacy":
      break;
  }
});


/**
 * If a note is deleted, remove it from the appropriate list and remove
 * any associated drawings.
 */
Hooks.on("deleteNote", async (noteDocument, options, userId) => {
  await _deleteNote(noteDocument.data._id);
});

/**
 *
 * @param noteId {String}
 * @private
 */
async function _deleteNote(noteId) {
  console.log("Deleting Note with id: " + noteId);
  let scene = game.scenes.getName("Scope");
  await game.scope.period.remove(noteId);
}

/**
 * JOURNAL HANDLING ===========================================================
 */


/**
 * If a JournalEntry is removed, so is the associated note and any connectors
 */
Hooks.on("deleteJournalEntry", async (entity, options, userId) => {
  let note = entity.sceneNote;
  if ( !note ) return;
  await _deleteNote(note.id);
});