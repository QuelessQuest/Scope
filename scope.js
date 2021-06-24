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

  CONFIG.scope = SCOPE;
  CONFIG.ui.journal = JournalDirectoryScope;
  CONFIG["JournalEntry"]["sheetClass"] = JournalSheetScope;
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
    let x = await Scene.create(SCOPE.scene);
    await Scene.updateDocuments([{_id: x._id, active: true, img: "systems/scope/assets/themes/whitespace/background.jpg"}]);
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
 * @param {Number}  sequence  Optional. The order in which this appears in a list
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

  let scene = game.scenes.getName("scope");

  // Remove any existing connectors from the scene
  let drawings = scene.getEmbeddedCollection("Drawing");
  let drawingsToClear = [...drawings].filter(d => d.getFlag("scope", "type") === "connector").map(d => d.data._id);
  if (drawingsToClear.length > 0)
    try {
      await scene.deleteEmbeddedDocuments("Drawing", drawingsToClear);
    } catch (ex) {
      console.log("Attempted to delete a non-existent drawing. Just carry on.");
    }

  let notes = scene.getEmbeddedCollection("Note");

  // Rebuild the period list, adding back connectors
  let periodNotes = notes.filter(n => n.getFlag("scope", "type") === "period");

  // Order of notes is not saved in the data naturally, we must recreate the periods in order so what is displayed
  // on screen matches what is stored in game.scope.period
  const sortedPeriods = periodNotes.sort((a, b) => a.getFlag("scope", "order") - b.getFlag("scope", "order"));
  for (const period of sortedPeriods) {
    await game.scope.period.add(period);
  }

  // Rebuild the events, adding back connectors
  let eventNotes = notes.filter(n => n.getFlag("scope", "type") === "event");
  let eventGroups = eventNotes.reduce((r, a) => {
    const periodNote = a.getFlag("scope", "periodNote");
    r[periodNote] = [...r[periodNote] || [], a];
    return r;
  }, {});

  for (const group in eventGroups) {
    let periodCard = game.scope.period.findCard("noteId", group);
    const sortedEvents = eventGroups[group].sort((a, b) => a.getFlag("scope", "order") - b.getFlag("scope", "order"));
    sortedEvents.forEach(note => game.scope.period.attach("event", note, periodCard));
  }

  // Rebuild the scenes, adding back connectors
  let sceneNotes = notes.filter(n => n.getFlag("scope", "type") === "scene");
  let sceneGroups = sceneNotes.reduce((r, a) => {
    const eventNote = a.getFlag("scope", "eventNote");
    r[eventNote] = [...r[eventNote] || [], a];
    return r;
  }, {});
  for (const group in sceneGroups) {

  }

  /*
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
      sortedScenes.forEach(note => eventList.attach("scene", note, event.id));
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
      insertNote(data.id, {x: data.x, y: data.y});
      break;
    case "event":
      insertNote(data.id, {x: data.x, y: data.y});
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
  if (!game.scope.period.canRefresh) return;
  if (isNaN(d.x) || isNaN(d.y)) {
    console.log("Got a NaN");
    return;
  }
  await game.scope.period.updateCard(noteId, {x: d.x, y: d.y});
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

  const entry = game.journal.get(noteDocument.data.entryId);
  const tone = entry.getFlag("scope", "tone");
  const type = entry.getFlag("scope", "type");
  const periodAttach = entry.getFlag("scope", "periodAttach");
  const eventAttach = entry.getFlag("scope", "eventAttach");
  const sceneAttach = entry.getFlag("scope", "sceneAttach");
  let periodNoteId = "none";
  let eventNoteId = "none";
  let sceneNoteId = "none";
  let periodCard = null;
  let eventCard = null;
  if (periodAttach && periodAttach !== "none") {
    periodCard = game.scope.period.findCard("id", periodAttach);
    periodNoteId = periodCard.noteId;
    if (eventAttach && eventAttach !== "none") {
      eventCard = periodCard.children.findCard("id", eventAttach);
      eventNoteId = eventCard.noteId;
      if (sceneAttach && sceneAttach !== "none") {
        sceneNoteId = eventCard.children.findCard("id", sceneAttach).noteId;
      }
    }
  }

  let card;
  switch (type) {
    case "period":
      card = await game.scope.period.add(noteDocument);
      break;
    case "event":
      card = await game.scope.period.attach(type, noteDocument, periodCard);
      periodNoteId = card.group;
      console.log(card);
      break;
    case "scene":
      if (periodCard && eventCard) {
        card = await periodCard.children.attach(type, noteDocument, eventCard);
        eventNoteId = card.group;
        periodNoteId = eventCard.group;
      }
      break;
    case "legacy":
      break;
  }

  let flagData = SCOPE.noteSettings[type];
  let flagTypeData = {
    tone: tone,
    labelBorderColor: getFromTheme(`${type}-label-stroke-color`),
    noteBorderColor: getFromTheme("border-color"),
    periodNote: periodNoteId,
    eventNote: eventNoteId,
    sceneNote: sceneNoteId,
    order: card.order
  }
  flagData = foundry.utils.mergeObject(flagData, flagTypeData);
  const flags = {
    scope: flagData
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
  await scene.updateEmbeddedDocuments("Note", [typeData]);
  game.scope.period.unlockRefresh();

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
 * @param {string}  noteId
 * @private
 */
async function _deleteNote(noteId) {
  console.log("Deleting Note with id: " + noteId);
  let scene = game.scenes.getName("scope");
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
  if (!note) return;
  await _deleteNote(note.id);
});