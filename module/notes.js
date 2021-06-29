import {SCOPE} from "./config.js";
import {getFromTheme} from "./helper.js";
import {droppedOn} from "./helper.js";
import {isEmpty} from "./helper.js";
import {sortNotes} from "./helper.js";

/**
 * Add a note to another note. Update as necessary if added between two existing notes.
 * Will shift notes about if it detects a note was dropped on another note.
 * Connectors will be updated accordingly.
 *
 * @param {NoteDocument} note
 * @param {NoteDocument} attachTo
 * @param {string}        direction
 * @param {{text: string, type: string, tone: string, icon: string, iconSize: number, iconTint: string, fontSize: number, textColor: string, labelBorderColor: string, noteBorderColor: string}}  typeData
 * @returns {Promise<void>}
 */
export async function addNoteTo(note, attachTo, direction, typeData, flagData) {
  game.scope.locked = true;

  let notesToUpdate = [];
  let nextFlag = "next" + direction.toUpperCase();
  let previousFlag = "previous" + direction.toUpperCase();
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
        previousX: direction === "x" ? attachTo.data._id : note.getFlag("scope", previousFlag),
        previousY: direction === "y" ? attachTo.data._id : note.getFlag("scope", previousFlag),
        order: attachTo.getFlag("scope", "order") + 1
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
  if (attachToNext) {
    notesToUpdate.push({
      _id: attachToNext.data._id,
      flags: {
        scope: {
          previousX: direction === "x" ? note.data._id : note.getFlag("scope", previousFlag),
          previousY: direction === "y" ? note.data._id : note.getFlag("scope", previousFlag),
          order: attachToNext.getFlag("scope", "order") + 1
        }
      }
    });
    let atnNextId = attachToNext.getFlag("scope", nextFlag);
    if (atnNextId) {
      notesToUpdate = notesToUpdate.concat(_incrementOrderFrom(scene.getEmbeddedDocument("Note", atnNextId), nextFlag));
    }
  }

  await scene.updateEmbeddedDocuments("Note", notesToUpdate);

  let shiftNote = droppedOn(note.getFlag("scope", "type"), direction, note, attachTo);
  if (isEmpty(shiftNote)) {
    let rebuildConnectorsFor = [];
    rebuildConnectorsFor.push(note);
    rebuildConnectorsFor.push(attachTo);
    if (attachToNext) rebuildConnectorsFor.push(attachToNext);
    await updateConnectors(sortNotes(rebuildConnectorsFor), direction);
  } else {
    let shiftedNotes = await _shiftNotesFrom(shiftNote, direction);
    shiftedNotes.push(attachTo);
    await updateConnectors(sortNotes(shiftedNotes), direction);
  }

  game.scope.locked = false;
}

/**
 * Add a note to scope. It will be placed in the proper location and have order and connectors updated.
 *
 * @param {NoteDocument}   note
 * @param {NoteDocument[]} sortedNotes
 * @param {{text: string, type: string, tone: string, icon: string, iconSize: number, iconTint: string, fontSize: number, textColor: string, labelBorderColor: string, noteBorderColor: string}}  typeData
 */
export async function addNote(note, sortedNotes, typeData, flagData) {
  game.scope.locked = true;

  // First of its kind!
  if (sortedNotes.length === 0) {
    let x = foundry.utils.mergeObject(typeData, {
      _id: note.data._id,
      flags: {
        scope: foundry.utils.mergeObject(flagData, {order: 0})
      }
    });

    let scene = game.scenes.getName("scope");
    await scene.updateEmbeddedDocuments("Note", [x]);
    game.scope.locked = false;
    return;
  }

  let direction = note.getFlag("scope", "direction");
  let coord = note.data[direction];

  let attachTo = findNoteToAttachTo(coord, direction, sortedNotes);
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
 * Remove a note. This will remove and rebuild connectors as necessary and update the order
 * of the notes to reflect the removal of a note.
 *
 * @param {NoteDocument} note
 * @returns {Promise<void>}
 */
export async function deleteNote(note) {

  let scene = game.scenes.getName("scope");
  let direction = note.getFlag("scope", "direction");
  let nextFlag = "next" + direction.toUpperCase();
  let previousFlag = "previous" + direction.toUpperCase();

  let connectorsToUpdate = [];
  let notesToUpdate = [];
  let nextId = note.getFlag("scope", nextFlag);
  let previousId = note.getFlag("scope", previousFlag);
  let next = nextId ? scene.getEmbeddedDocument("Note", nextId) : null;
  let previous = previousId ? scene.getEmbeddedDocument("Note", previousId) : null;

  if (next) {

    connectorsToUpdate.push(next);
    notesToUpdate.push({
      id: next.data._id,
      flags: {
        scope: {
          previousX: direction === "x" ? next.data._id : next.getFlag("scope", previousFlag),
          previousY: direction === "y" ? next.data._id : next.getFlag("scope", previousFlag),
          order: next.getFlag("scope", "order") - 1
        }
      }
    });

    for (const n of getNotesFrom(next, nextFlag)) {
      notesToUpdate.push({
        id: n.data._id,
        flags: {
          scope: {
            order: n.getFlag("scope", "order") - 1
          }
        }
      });
    }
  }

  if (previous) {
    connectorsToUpdate.push(previous);
    notesToUpdate.push({
      id: previous.data._id,
      nextX: direction === "x" ? next.data._id : previous.getFlag("scope", nextFlag),
      nextY: direction === "y" ? next.data._id : previous.getFlag("scope", nextFlag)
    });
  }

  game.scope.locked = true;
  if (connectorsToUpdate)
    await updateConnectors(connectorsToUpdate, direction);
  if (notesToUpdate)
    await scene.updateEmbeddedDocuments("Note", notesToUpdate);

  game.scope.locked = false;
}

/**
 * Shift all notes on the canvas from this note to the end of the notes.
 *
 * @param {NoteDocument} noteToShift
 * @param {number}        order
 * @param {number}        amount
 * @param {string}        direction
 * @returns {NoteDocument[]}
 * @private
 */
async function _shiftNotesFrom({noteToShift: noteToShift, order: order, amount: amount}, direction) {

  let scene = game.scenes.getName("scope");
  let nextFlag = "next" + direction.toUpperCase();
  let notesToUpdate = [];
  let currentNote = noteToShift;
  do {
    let data = {
      _id: currentNote.data._id,
      x: currentNote.data.x + (direction === "x" ? amount : 0),
      y: currentNote.data.y + (direction === "y" ? amount : 0),
      flags: {
        scope: {
          order: currentNote.getFlag("scope", "order") + order,
        }
      }
    };

    notesToUpdate.push(data);

    order++;
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
 * @param {string}          direction
 * @returns {NoteDocument[]}
 */
export async function updateConnectors(notes, direction) {

  // TODO - Move Attached, if set

  let nextFlag = "next" + direction.toUpperCase();
  let previousConnectorFlag = "previous" + (direction === "x" ? "Horizontal" : "Vertical");

  // Remove existing connectors
  await removeConnectors(notes);

  let scene = game.scenes.getName("scope");

  // Recreate connectors based on the new positions
  let previous = null;
  let updateNotes = [];
  for (const note of notes) {
    let nextId = note.getFlag("scope", nextFlag);
    let next = nextId ? scene.getEmbeddedDocument("Note", nextId) : null;
    let nextConnector = next ? (await _createConnection(scene, note, next)).pop() : null;
    let nextConnectorId = nextConnector ? nextConnector.data._id : null;

    let currentPreviousId = note.getFlag("scope", previousConnectorFlag);
    let usePrevious = currentPreviousId ? currentPreviousId : previous;

    updateNotes.push({
      _id: note.data._id,
      flags: {
        scope: {
          previousVertical: direction === "y" ? usePrevious : null,
          previousHorizontal: direction === "x" ? usePrevious : null,
          nextVertical: direction === "y" ? nextConnectorId : null,
          nextHorizontal: direction === "x" ? nextConnectorId : null
        }
      }
    });

    previous = nextConnectorId;
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
    if (note.getFlag("scope", "nextHorizontal"))
      drawingIds.push(note.getFlag("scope", "nextHorizontal"));
    if (note.getFlag("scope", "nextVertical"))
      drawingIds.push(note.getFlag("scope", "nextVertical"));
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

/**
 *
 * @param {NoteDocument}  note
 * @param {string}        nextFlag
 * @returns {NoteDocument[]}
 * @private
 */
function _incrementOrderFrom(note, nextFlag) {

  let scene = game.scenes.getName("scope");
  let notesToUpdate = [];
  let currentNote = note;
  do {
    let data = {
      _id: currentNote.data._id,
      flags: {
        scope: {
          order: currentNote.getFlag("scope", "order") + 1,
        }
      }
    };

    notesToUpdate.push(data);

    let id = currentNote.getFlag("scope", nextFlag);
    currentNote = id ? scene.getEmbeddedDocument("Note", id) : null;

  } while (currentNote);

  return notesToUpdate;
}