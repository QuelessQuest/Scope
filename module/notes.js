import {SCOPE} from "./config.js";
import {ScopeDocument} from "./scope-classes.js";
import {getFromTheme} from "./helper.js";
import {droppedOn} from "./helper.js";
import {isEmpty} from "./helper.js";
import {getDirection} from "./helper.js";
import {sortNotes} from "./helper.js";

/**
 *
 * @param {Scene}         scene
 * @param {ScopeDocument} note
 * @param {ScopeDocument} attachTo
 * @param {string}        direction
 * @param {{text: string, type: string, tone: string, icon: string, iconSize: number, iconTint: string, fontSize: number, textColor: string, labelBorderColor: string, noteBorderColor: string}}  typeData
 * @returns {Promise<void>}
 */
export async function addNoteTo(scene, note, attachTo, direction, typeData) {
  let notesToUpdate = [];

  let noteData = {
    _id: note.data._id,
    next: attachTo.data.next ? attachTo.data.next : null,
    previous: attachTo,
    order: attachTo.data.order + 1
  }
  notesToUpdate.push(foundry.utils.mergeObject(noteData, typeData));
  notesToUpdate.push({
    _id: attachTo.data._id,
    next: note
  });
  if (attachTo.data.next)
    notesToUpdate.push({
      _id: attachTo.data.next.data._id,
      previous: note
    });

  await scene.updateEmbeddedDocuments("Note", notesToUpdate);

  let shiftNote = droppedOn(scene, note.data.type, direction, note, attachTo);
  if (isEmpty(shiftNote)) {
    let rebuildConnectorsFor = [];
    rebuildConnectorsFor.push(note);
    rebuildConnectorsFor.push(attachTo);
    if (attachTo.next) rebuildConnectorsFor.push(attachTo.next);
    await updateConnectors(sortNotes(rebuildConnectorsFor));
  } else {
    let shiftedNotes = await _shiftNotesFrom(shiftNote, direction, scene);
    shiftedNotes.push(attachTo);
    await updateConnectors(sortNotes(shiftedNotes));
  }
}
/**
 *
 * @param {Scene}           scene
 * @param {ScopeDocument}   note
 * @param {ScopeDocument[]} sortedNotes
 */
export async function addNote(scene, note, sortedNotes, typeData) {
  // First of its kind!
  if (!sortedNotes) {
    return scene.updateEmbeddedDocuments("Note", [{_id: note.data._id, order: 0}]);
  }

  game.scope.locked = true;

  let direction = getDirection(note);
  let coord = note.data[direction];

  let attachTo = _findNoteToAttachTo(coord, direction, sortedNotes);
  if (attachTo) await addNoteTo(scene, note, attachTo, direction, typeData);

  game.scope.locked = false;
}

/**
 *
 * @param {ScopeDocument} note
 * @returns {Promise<void>}
 */
export async function deleteNote(note) {
  // TODO
  // Remove any connectors for this note. Then recreate connector and reorder notes

}

/**
 *
 * @param {ScopeDocument} noteToShift
 * @param {number}        order
 * @param {number}        amount
 * @param {string}        direction
 * @param {Scene}         scene
 * @returns {ScopeDocument[]}
 * @private
 */
async function _shiftNotesFrom({noteToShift: noteToShift, order: order, amount: amount}, direction, scene) {

  let notesToUpdate = [];
  let currentNote = noteToShift;
  do {
    let data = {
      _id: currentNote.data._id,
      order: currentNote.data.order + order,
      x: currentNote.data.x + (direction === "x" ? amount : 0),
      y: currentNote.data.y + (direction === "y" ? amount : 0)
    }

    notesToUpdate.push(data);

    order++;
    currentNote = currentNote.data.next;
  } while (currentNote);

  if (notesToUpdate)
    return await scene.updateEmbeddedDocuments("Note", notesToUpdate);

  return [];
}

/**
 *
 * @param {number}          value
 * @param {string}          direction
 * @param {ScopeDocument[]} list
 * @returns {ScopeDocument}
 */
function _findNoteToAttachTo(value, direction, list) {
  for (const note of list) {
    if (value > list.data[direction])
      if (list.data.next) {
        if (value <= list.data.next.data[direction])
          return note;
      } else
        return note;
    else
      return note;
  }
}

/**
 * @param {ScopeDocument[]} notes
 * @returns {ScopeDocument[]}
 */
export async function updateConnectors(notes) {

  let scene = game.scenes.getName("scope");

  // TODO - Move Attached, if set

  // Remove existing connectors
  let drawingIds = [];
  for (const note of notes) {
    if (note.data.connectors) {
      if (note.data.connectors.previousHorizontal)
        drawingIds.push(note.data.connectors.previousHorizontal.data._id);
      if (note.data.connectors.nextHorizontal)
        drawingIds.push(note.data.connectors.nextHorizontal.data._id);
      if (note.data.connectors.previousVertical)
        drawingIds.push(note.data.connectors.previousVertical.data._id);
      if (note.data.connectors.nextVertical)
        drawingIds.push(note.data.connectors.nextVertical.data._id);
    }
  }

  if (drawingIds)
    await scene.deleteEmbeddedDocuments("Drawing", drawingIds);

  // Recreate connectors based on the new positions
  let updateNotes = [];
  for (const note of notes) {
    let previousHorizontal = note.data.previous ? note.data.previous.connectors.nextHorizontal : null;
    let previousVertical = note.data.previous ? note.data.previous.connectors.nextVertical : null;
    let next = note.data.next ? await _createConnection(scene, note, note.data.next) : null;

    let direction = getDirection(note);
    updateNotes.push({
      _id: note.data._id,
      connectors: {
        previousVertical: previousVertical,
        previousHorizontal: previousHorizontal,
        nextVertical: direction === "x" ? next : null,
        nextHorizontal: direction === "y" ? next : null
      }
    });
  }

  return scene.updateEmbeddedDocuments("Note", updateNotes);
}

/**
 *
 * @param {Scene}         scene
 * @param {ScopeDocument} noteOne
 * @param {ScopeDocument} noteTwo
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
    width: cardTwo.data.x - cardOne.data.x,
    height: Math.abs(cardTwo.data.y - cardOne.data.y),
    strokeColor: getFromTheme("period-link-color"),
    flags: {

    }
  }

  foundry.utils.mergeObject(options, dynamicOptions);
  return DrawingDocument.create(options, {parent: canvas.scene});
}