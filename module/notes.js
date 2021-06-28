import {ScopeDocument} from "./scope-classes.js";
import {getFromTheme} from "./helper.js";

/**
 *
 * @param {Scene}           scene
 * @param {ScopeDocument}   note
 * @param {ScopeDocument[]} sortedNotes
 */
export async function addNote(scene, note, sortedNotes) {

  // First of its kind!
  if (!sortedNotes) {
    return scene.updateEmbeddedDocuments("Note", [{_id: note.data._id, order: 0}]);
  }

  // TODO - determine direction stuff. Assume 'x' for now
  let attachTo = findNoteToAttachTo(note.data.x, "x", sortedNotes);

}

/**
 *
 * @param {number}          value
 * @param {string}          direction
 * @param {ScopeDocument[]} list
 * @returns {ScopeDocument}
 */
function findNoteToAttachTo(value, direction, list) {
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
 * @param {ScopeDocument} note
 */
export async function updateConnectors(note) {

  let scene = game.scenes.getName("scope");

  // TODO - Move Attached, if set

  // Remove existing connectors
  let drawingIds = [];
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

  if (drawingIds.length > 0)
    await scene.deleteEmbeddedDocuments("Drawing", drawingIds);

  // Recreate connectors based on the new position
  if (note.data.next) {
    let nextNote = scene.getEmbeddedDocument("Note", note.data.next);
    let nextDrawing = await _createConnection(scene, note, nextNote);
    note.data.connectors.nextHorizontal = nextDrawing;
    nextNote.data.connectors.previousHorizontal = nextDrawing;
  }

  if (note.data.previous) {
    let prevNote = scene.getEmbeddedDocument("Note", note.data.previous);
    let prevDrawing = await _createConnection(scene, note, prevNote);
    note.data.connectors.previousHorizontal = prevDrawing;
    prevNote.data.connectors.nextHorizontal = prevDrawing;
  }

  // TODO - Children

  return true;
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
    strokeColor: getFromTheme("period-link-color")
  }

  foundry.utils.mergeObject(optoins, dynamicOptions);
  return DrawingDocument.create(options, {parent: canvas.scene});
}