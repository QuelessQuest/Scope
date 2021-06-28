import {SCOPE} from "./module/config.js";
import {JournalDirectoryScope} from './module/sidebar/journal.js';
import {JournalSheetScope} from "./module/journal/journal-sheet.js";
import {CardList} from "./module/cards.js";
import {getDirection, registerSettings, sortNotes} from "./module/helper.js";
import {getFromTheme} from "./module/helper.js";
import {insertNote} from "./module/helper.js";
import {patchCore} from "./module/patch.js";
import {ScopeDocument} from "./module/scope-classes.js";
import {addNote} from "./module/notes.js";
import {addNoteTo} from "./module/notes.js";
import {deleteNote} from "./module/notes.js";
import {updateConnectors} from "./module/notes.js";

/**
 * Sets up the environment and manages the hooks.
 */

/**
 * Initialization of the game environment
 */
Hooks.once("init", function () {
  console.log(`SCOPE | Initializing Scope ============================`);

  CONFIG.scope = SCOPE;
  CONFIG.ui.journal = JournalDirectoryScope;
  CONFIG["JournalEntry"]["sheetClass"] = JournalSheetScope;
  CONFIG["Note"]["documentClass"] = ScopeDocument;
  game.scope = SCOPE.namespace;
  game.scope.period = new CardList(SCOPE.sortDirection.horizontal, "period");

  registerSettings();
  patchCore();

  game.scope.bookend = game.settings.get('scope', 'bookend') || SCOPE.Bookends.position;
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
  if (SCOPE.scenePrepared) return;

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
  let scene = game.scenes.getName("scope");
  if (scene) {
    SCOPE.scenePrepared = true;
    await _prepareSceneText(scene);
  } else {
    let scene = await Scene.create(SCOPE.scene);
    await Scene.updateDocuments([{_id: scene._id, active: true, img: "systems/scope/assets/themes/whitespace/background.jpg"}]);
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
  let bpd = drawings.filter(d => d.getFlag("scope", "type") === "bigPicture");
  let fld = drawings.filter(d => d.getFlag("scope", "type") === "focusLabel");
  let fd = drawings.filter(d => d.getFlag("scope", "type") === "focus");
  let legLabel = drawings.filter(d => d.getFlag("scope", "type") === "legacyLabel");
  let leg = drawings.filter(d => d.getFlag("scope", "type") === "legacy");
  let bp;
  let focus;
  if (bpd.length > 0) {
    bp = bpd;
  } else {
    bp = await _createText(scene, "bigPicture");
  }
  if (fld.length === 0) {
    await _createText(scene, "focusLabel");
  }
  if (legLabel.length === 0) {
    await _createText(scene, "legacyLabel");
  }
  if (fd.length > 0) {
    focus = fd;
  } else {
    focus = await _createText(scene, "focus");
  }

  let legList = [];
  if (leg.length > 0) {
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
 * @param {number}  sequence  Optional. The order in which this appears in a list
 * @returns {Promise<*[]>}
 * @private
 */
async function _createText(scene, type, text = "", sequence = 0) {

  let x = (scene.data.width / 2) - (SCOPE[type].width / 2);
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
      scope: {
        type: type,
        ftype: CONST.DRAWING_TYPES.TEXT
      }
    }
  };

  if (text) foundry.utils.mergeObject(drawingData, {text: text});
  foundry.utils.mergeObject(drawingData, SCOPE[type]);
  if (yOverride > 0) foundry.utils.mergeObject(drawingData, {y: yOverride + (sequence * SCOPE[type].height)});

  return await scene.createEmbeddedDocuments("Drawing", [drawingData]);
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
  console.log("Preparing Folders");
  const folder = game.i18n.localize("SCOPE.JournalFolder");
  let journalFolders = game.folders.filter(f => f.type === "JournalEntry");
  await _createFolder(journalFolders, folder, "period");
  await _createFolder(journalFolders, folder, "event");
  await _createFolder(journalFolders, folder, "scene");
}

/**
 * Create the requested folder, if it does not exist
 * @param {Array<JournalEntry>} folders   The list of JournalEntry folders
 * @param {string}              folder    The localized word for Folder
 * @param {string}              type      The type of folder to create
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
      scope: {
        type: type
      }
    }
  });

  if (!folders.find(f => f.getFlag("scope", "type") === type)) {
    console.log(`Creating ${name} ${folder}`);
    await Folder.create(folderData);
  }
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

 // let scene = game.scenes.getName("scope");

  // Remove any existing connectors from the scene
//  let drawings = scene.getEmbeddedCollection("Drawing");
 // let drawingsToClear = [...drawings].filter(d => d.getFlag("scope", "type") === "connector").map(d => d.data._id);
 // if (drawingsToClear.length)
 //   await scene.deleteEmbeddedDocuments("Drawing", drawingsToClear);

 // let notes = scene.getEmbeddedCollection("Note");

  // Rebuild the period list, adding back connectors
  //let periodNotes = notes.filter(n => n.data.type === "period");

  // Order of notes is not saved in the data naturally, we must recreate the periods in order so what is displayed
  // on screen matches what is stored in game.scope.period
  //const sortedPeriods = sortNotes(periodNotes)
  //for (const period of sortedPeriods) {
   // await addNote(scene, period, sortedPeriods);
  //}

  // Rebuild the events, adding back connectors
  /*
  let eventNotes = notes.filter(n => n.getFlag("scope", "type") === "event");
  let eventGroups = eventNotes.reduce((r, a) => {
    const periodNote = a.getFlag("scope", "periodNote");
    r[periodNote] = [...r[periodNote] || [], a];
    return r;
  }, {});

  for (const group in eventGroups) {
    let period = game.scope.period.findCard("noteId", group);
    const sortedEvents = eventGroups[group].sort((a, b) => a.getFlag("scope", "order") - b.getFlag("scope", "order"));
    for (const event of sortedEvents) {
      await game.scope.period.attach("event", event, period.id);
    }
  }

  // Rebuild the scenes, adding back connectors
  let sceneNotes = notes.filter(n => n.getFlag("scope", "type") === "scene");
  let sceneGroups = sceneNotes.reduce((r, a) => {
    const eventNote = a.getFlag("scope", "eventNote");
    r[eventNote] = [...r[eventNote] || [], a];
    return r;
  }, {});

  for (const group in sceneGroups) {
    let period = game.scope.period.findCard("noteId", sceneGroups[group][0].getFlag("scope", "periodNote"));
    let eventList = period.children;
    let event = eventList.findCard("noteId", group);
    const sortedScenes = sceneGroups[group].sort((a, b) => a.getFlag("scope", "order") - b.getFlag("scope", "order"));
    for (const scene of sortedScenes) {
      await eventList.attach("scene", scene, event.id);
    }
  }

   */
});

/**
 * NOTE HANDLING ===========================================================
 */

/**
 * When a journal entry is dropped onto the canvas, create a note
 */
Hooks.on("dropCanvasData", (canvas, data) => {
  if (data.type !== "JournalEntry") return;
  const type = game.journal.get(data.id).getFlag("scope", "type");
  switch (type) {
    case "period":
    case "event":
      insertNote(data.id, {x: data.x, y: data.y});
      break;
    case "scene":
      break;
    case "legacy":
      break;
  }
});

/**
 * Rerender the connectors when the note is moved.
 */
Hooks.on("updateNote", async (entity, note, options, userid) => {
  if (!game.scope.locked)
    await updateConnectors(note);
});

/**
 * Update the note icon and draw the note and add it to the
 * appropriate note list.
 */
Hooks.on("createNote", async (noteDocument, options) => {

  let scene = game.scenes.getName("scope");

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

  //const notes = scene.getEmbeddedCollection("Note");
  const journalEntry = game.journal.get(noteDocument.data.entryId);
  const tone = journalEntry.getFlag("scope", "tone");
  const type = journalEntry.getFlag("scope", "type");
  const attachToPeriod = journalEntry.getFlag("scope", "attachToPeriod");
  const attachToEvent = journalEntry.getFlag("scope", "attachToEvent");
  const attachToScene = journalEntry.getFlag("scope", "attachToScene");
  let periodNote = null;
  let eventNote;
  let sceneNote;
  if (attachToPeriod && attachToPeriod !== "none") {
    periodNote = scene.getEmbeddedDocument("Note", attachToPeriod);
    if (attachToEvent && attachToEvent !== "none") {
      eventNote = scene.getEmbeddedDocument("Note", attachToEvent);
      if (attachToScene && attachToScene !== "none") {
        sceneNote = scene.getEmbeddedDocument("Note", attachToScene);
      }
    }
  }

  let typeData = {
    text: journalEntry.data.name,
    type: type,
    tone: tone,
    icon: SCOPE.icons[type],
    iconSize: SCOPE.noteSettings[type].iconWidth,
    iconTint: getFromTheme(`${type}-icon-color`),
    fontSize: getFromTheme(`${type}-label-size`),
    textColor: getFromTheme(`${type}-label-color`),
    labelBorderColor: getFromTheme(`${type}-label-stroke-color`),
    noteBorderColor: getFromTheme("border-color"),
    order: -1
  }

  switch (type) {
    case "period":
      if (periodNote) await addNoteTo(scene, noteDocument, periodNote, getDirection(noteDocument), typeData);
      else {
        let periodNotes = scene.getEmbeddedCollection("Note").filter(note => note.data.type === "period");
        await addNote(scene, noteDocument, sortNotes(periodNotes), typeData);
      }
      break;
    case "event":
      //card = await game.scope.period.attach(type, noteDocument, attachToPeriod);
      //periodNoteId = card.group;
      //console.log(card);
      break;
    case "scene":
      //card = await periodCard.children.attach(type, noteDocument, attachToEvent);
      //eventNoteId = card.group;
      //periodNoteId = eventCard.group;
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
  await deleteNote(game.scenes.getName("scope"), noteDocument);
});

/**
 * JOURNAL HANDLING ===========================================================
 */

/**
 * If a JournalEntry is removed, so is the associated note and any connectors
 */
Hooks.on("deleteJournalEntry", async (entity, options, userId) => {
  let note = entity.sceneNote;
  if (!note) return;
  await deleteNote(game.scenes.getName("scope"), note);
});