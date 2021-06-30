import {SCOPE} from "./config.js";
import {getFromTheme} from "./helper.js";
import {droppedOn} from "./helper.js";
import {isEmpty} from "./helper.js";

/**
 * Add a note to another note. Update as necessary if added between two existing notes.
 * Will shift notes about if it detects a note was dropped on another note.
 * Connectors will be updated accordingly.
 *
 * @param {NoteDocument} note
 * @param {NoteDocument} attachTo
 * @param {string}        direction
 * @param {{text: string, icon: string, iconSize: number, iconTint: string, fontSize: number, textColor: string}}  typeData
 * @param {{type: string, tone: string, iconWidth: number, iconHeight: number, labelBorderColor: string, noteBorderColor: string}} flagData
 * @returns {Promise<void>}
 */
export async function addNoteTo(note, attachTo, direction, typeData, flagData) {
  game.scope.locked = true;

  let notesToUpdate = [];
  let nextFlag = "next" + direction.toUpperCase();

  let scene = game.scenes.getName("scope");

  let attachId = attachTo.getFlag("scope", nextFlag);
  let attachToNext = attachId ? scene.getEmbeddedDocument("Note", attachId) : null;
  let nextId = attachToNext ? attachToNext.data._id : null;

  let noteData = {
    _id: note.data._id,
    flags: {
      scope: foundry.utils.mergeObject(flagData, {
        nextX: direction === "x" ? nextId : note.getFlag("scope", nextFlag),
        nextY: direction === "y" ? nextId : note.getFlag("scope", nextFlag),
      })
    }
  }

  notesToUpdate.push(foundry.utils.mergeObject(noteData, typeData));
  notesToUpdate.push({
    _id: attachTo.data._id,
    flags: {
      scope: {
        nextX: direction === "x" ? note.data._id : note.getFlag("scope", nextFlag),
        nextY: direction === "y" ? note.data._id : note.getFlag("scope", nextFlag)
      }
    }
  });

  await scene.updateEmbeddedDocuments("Note", notesToUpdate);

  let shiftNote = droppedOn(note.getFlag("scope", "type"), direction, note, attachTo);
  if (isEmpty(shiftNote)) {
    await updateConnectors([note, attachTo]);
  } else {
    // TODO
    let shiftedNotes = await _shiftNotesFrom(shiftNote, direction);
    shiftedNotes.push(attachTo);
    await updateConnectors(shiftedNotes);
  }

  game.scope.locked = false;
}

/**
 * Add a note to scope. It will be placed in the proper location and have the connectors updated.
 *
 * @param {NoteDocument}   note
 * @param {NoteDocument[]} notes
 * @param {{text: string, icon: string, iconSize: number, iconTint: string, fontSize: number, textColor: string}}  typeData
 * @param {{type: string, tone: string, iconWidth: number, iconHeight: number, labelBorderColor: string, noteBorderColor: string}} flagData
 */
export async function addNote(note, notes, typeData, flagData) {
  game.scope.locked = true;

  // First of its kind!
  if (notes.length === 0) {
    let x = foundry.utils.mergeObject(typeData, {
      _id: note.data._id,
      flags: {
        scope: flagData
      }
    });

    let scene = game.scenes.getName("scope");
    await scene.updateEmbeddedDocuments("Note", [x]);
    game.scope.locked = false;
    return;
  }

  let direction = note.getFlag("scope", "direction");
  let coord = note.data[direction];

  let attachTo = findNoteToAttachTo(coord, direction, notes);
  game.scope.locked = false;
  if (attachTo) await addNoteTo(note, attachTo, direction, typeData, flagData);
}

/**
 * Retrieve all the notes from this note to the end of the notes
 *
 * @param {NoteDocument}  note
 * @param {string}        nextFlag
 * @returns {NoteDocument[]}
 */
export function getNotesFrom(note, nextFlag) {
  let scene = game.scenes.getName("scope");
  let notes = [];
  let nextId = note.getFlag("scope", nextFlag);
  let next = nextId ? scene.getEmbeddedDocument("Note", nextId) : null;
  notes.push(note);
  if (next) {
    notes.concat(getNotesFrom(next, nextFlag));
  }
  return notes;
}

/**
 * Find the note that has this note attached.
 * @param {NoteDocument}  noteDocument
 * @returns {{} | {direction: string, connector: NoteDocument}}
 * @private
 */
export function findAttachedTo(noteDocument) {
  let scene = game.scenes.getName("scope");
  let notes = scene.getEmbeddedCollection("Note");

  let xConnector = notes.find(note => note.getFlag("scope", "nextX") === noteDocument.data._id);
  if (xConnector) return {direction: "x", connector: xConnector};

  let yConnector = notes.find(note => note.getFlag("scope", "nextY") === noteDocument.data._id);
  if (yConnector) return {direction: "y", connector: yConnector};

  return {};
}

/**
 * Remove a note. This will remove and rebuild connectors as necessary.
 *
 * @param {NoteDocument} note
 * @returns {Promise<void>}
 */
export async function deleteNote(note) {

  let scene = game.scenes.getName("scope");

  // TODO - If I am a parent note (period or event), delete any child list

  let attachedTo = findAttachedTo(note);
  let attachedData = {
    _id: attachedTo.connector.data._id,
    flags: {
      scope: {
        nextX: "x" === attachedTo.direction ? note.getFlag("scope", "nextX") : attachedTo.connector.getFlag("scope", "nextX"),
        nextY: "y" === attachedTo.direction ? note.getFlag("scope", "nextY") : attachedTo.connector.getFlag("scope", "nextY"),
      }
    }
  }

  game.scope.locked = true;
  await scene.updateEmbeddedDocuments("Note", [attachedData]);

  // TODO - Update connector on attachedTo
  // TODO - Does attachedTo variable update when updateEmb is called?

  game.scope.locked = false;
}

/**
 * Shift all notes on the canvas from this note to the end of the notes.
 *
 * @param {{noteToShift: NoteDocument, amount: number}}
 * @param {string}        direction
 * @returns {NoteDocument[]}
 * @private
 */
async function _shiftNotesFrom({noteToShift: noteToShift, amount: amount}, direction) {

  let scene = game.scenes.getName("scope");
  let nextFlag = "next" + direction.toUpperCase();
  let notesToUpdate = [];
  let currentNote = noteToShift;
  do {
    let data = {
      _id: currentNote.data._id,
      x: currentNote.data.x + (direction === "x" ? amount : 0),
      y: currentNote.data.y + (direction === "y" ? amount : 0),
    };

    notesToUpdate.push(data);

    let id = currentNote.getFlag("scope", nextFlag);
    currentNote = id ? scene.getEmbeddedDocument("Note", id) : null;
  } while (currentNote);

  if (notesToUpdate.length > 0)
    return await scene.updateEmbeddedDocuments("Note", notesToUpdate);

  return [];
}

/**
 * Locates the note after which a note can be added. The note is located via the x or y direction
 * compared to the provided value.
 *
 * @param {number}          value
 * @param {string}          direction
 * @param {NoteDocument[]} list
 * @returns {NoteDocument}
 */
export function findNoteToAttachTo(value, direction, list) {
  let scene = game.scenes.getName("scope");
  let nextFlag = "next" + direction.toUpperCase();
  for (const note of list) {
    if (value > note.data[direction]) {
      let nextId = note.getFlag("scope", nextFlag);
      if (nextId) {
        let next = scene.getEmbeddedDocument("Note", nextId);
        if (value <= next.data[direction])
          return note;
      } else
        return note;
    } else
      return note;
  }
}

/**
 * For the provided notes, delete all exiting connectors and create new based on current positions
 *
 * @param {NoteDocument[]}  notes
 * @returns {NoteDocument[]}
 */
export async function updateConnectors(notes) {

  // TODO - Move Attached, if set

  // Remove existing connectors
  await removeConnectors(notes);

  let scene = game.scenes.getName("scope");

  // Recreate connectors based on the new positions
  let updateNotes = [];
  for (const note of notes) {
    let nextXId = note.getFlag("scope", "nextX");
    let nextYId = note.getFlag("scope", "nextY");
    let nextX = nextXId ? scene.getEmbeddedDocument("Note", nextXId) : null;
    let nextY = nextYId ? scene.getEmbeddedDocument("Note", nextYId) : null;
    let connectorX = nextX ? (await _createConnection(scene, note, nextX)).pop() : null;
    let connectorY = nextY ? (await _createConnection(scene, note, nextY)).pop() : null;
    let connectorXId = connectorX ? connectorX.data._id : null;
    let connectorYId = connectorY ? connectorY.data._id : null;

    updateNotes.push({
      _id: note.data._id,
      flags: {
        scope: {
          connectorX: connectorXId,
          connectorY: connectorYId
        }
      }
    });
  }

  return scene.updateEmbeddedDocuments("Note", updateNotes);
}

/**
 * For the provided notes, remove the associated connector drawings
 *
 * @param {NoteDocument[]} notes
 * @returns {Promise<void>}
 */
async function removeConnectors(notes) {
  let scene = game.scenes.getName("scope");
  let drawingIds = [];
  for (const note of notes) {
    if (note.getFlag("scope", "connectorX"))
      drawingIds.push(note.getFlag("scope", "connectorX"));
    if (note.getFlag("scope", "connectorY"))
      drawingIds.push(note.getFlag("scope", "connectorY"));
  }

  if (drawingIds.length > 0)
    await scene.deleteEmbeddedDocuments("Drawing", drawingIds);
}

/**
 * Create a connector drawing between two notes
 *
 * @param {Scene}         scene
 * @param {NoteDocument} noteOne
 * @param {NoteDocument} noteTwo
 * @returns {DrawingDocument}
 * @private
 */
async function _createConnection(scene, noteOne, noteTwo) {

  let points = [[0, 0], [noteTwo.data.x - noteOne.data.x, noteTwo.data.y - noteOne.data.y]];
  let options = {};
  options = Object.assign(options, SCOPE.connectors);

  let dynamicOptions = {
    x: noteOne.data.x,
    y: noteOne.data.y,
    points: points,
    width: noteTwo.data.x - noteOne.data.x,
    height: Math.abs(noteTwo.data.y - noteOne.data.y),
    strokeColor: getFromTheme("period-link-color"),
  }

  foundry.utils.mergeObject(options, dynamicOptions);
  return scene.createEmbeddedDocuments("Drawing", [options]);
}