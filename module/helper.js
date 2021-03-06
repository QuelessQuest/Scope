import {SCOPE} from "./config.js";

/**
 * Return true if the object is empty, false otherwise
 * @param thing {{}}
 * @returns {boolean}
 */
export function isEmpty(thing) {
  return Object.keys(thing).length === 0
}

/**
 * Calculates the insertion point of a note from the note it is attached to
 *
 * @param {NoteDocument} note
 * @param {string} type
 * @param {string} direction
 * @returns {{x: *, y: *}}
 */
export function getSpacedPoint(note, type, direction) {
  let shiftX = direction === "x" ? SCOPE.noteSettings[type].iconWidth + SCOPE.noteSettings[type].spacing : 0;
  let shiftY = direction === "y" ? SCOPE.noteSettings[type].iconHeight + SCOPE.noteSettings[type].spacing : 0;
  return {x: note.data.x + shiftX, y: note.data.y + shiftY};
}

/**
 *
 * @param {string}  id
 * @param {number}  x
 * @param {number}  y
 * @param {string}  direction
 * @returns {Document[]}
 */
export async function insertNote(id, {x, y}, direction = "x") {
  const noteData = new foundry.data.NoteData({
    entryId: id,
    x: x,
    y: y,
    icon: CONST.DEFAULT_NOTE_ICON,
    textAnchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
    flags: {
      scope: {
        direction: direction
      }
    }
  });

  if (!canvas.grid.hitArea.contains(x, y)) return false;

  canvas.notes.activate();
  let scene = game.scenes.getName("scope");
  return await scene.createEmbeddedDocuments("Note", [noteData]);
}

/**
 * Determine where on the screen to put the bookends.
 * @returns {{start: {x: number, y: number}, end: {x: number, y: number}}}
 */
export function getBookendPositions() {
  const margin = game.scenes.active.data.width * (game.scope.bookend / 100);
  const halfIcon = SCOPE.noteSettings.period.iconWidth / 2;
  return {
    start: {x: margin + halfIcon, y: 450},
    end: {x: game.scenes.active.data.width - margin - halfIcon, y: 450}
  };
}

/**
 * Rearrange all the cards into neat columns and rows
 * @returns {Promise<void>}
 */
export async function arrange() {
  ui.notifications.warn("Arrange has yet to be updated. Currently broken");
  /*
  if ( !game.scope.period.head ) return;

  game.scope.period.lockRefresh();

  let scene = game.scenes.getName("scope");

  const head = game.scope.period.head;
  const bookend = game.settings.get("scope", "arrange") === "bookend"
  if ( bookend ) {
    const positions = getBookendPositions();
    const last = game.scope.period.getLast();
    let toUpdate = [{_id: head.noteId, x: positions.start.x, y: positions.start.y}, {_id: last.noteId, x: positions.end.x, y: positions.end.y}]
    await scene.updateEmbeddedDocuments("Note", toUpdate);
    head.x = positions.start.x;
    head.y = positions.start.y;
    last.x = positions.end.x;
    last.y = positions.end.y;
  } else {
    const position = getListPosition(game.scope.period.size);
    await scene.updateEmbeddedDocuments("Note", [{_id: head.noteId, x: position.x, y: position.y}]);
    head.x = position.x;
    head.y = position.y;
  }
  let results = await game.scope.period.arrangeList(bookend);
  let sceneList = [];
  let drawingIds = results.drawingIds;
  const events = results.childLists;
  let updateList = [];
  for (let idx = 0; idx < events.length; idx++) {
    const x = events[idx].parent.x;
    const y = events[idx].parent.y + SCOPE.noteSettings.event.spacing.y + game.settings.get("scope", "spacing");
    updateList = [ ...updateList, ...{_id: events[idx].head.noteId, x: x, y: y}];
    events[idx].head.x = x;
    events[idx].head.y = y;
    const eventResults = await events[idx].arrangeList(false);
    sceneList = [...sceneList, ...eventResults.childLists];
    drawingIds = [ ...drawingIds, ...eventResults.drawingIds];
  }

  await scene.updateEmbeddedDocuments("Note", updateList);
  game.scope.period.unlockRefresh();
  try {
    await scene.deleteEmbeddedDocuments("Drawing", drawingIds);
  } catch (ex) {
    console.log("Attempted to delete a non-existent drawing. Just carry on.");
  }

   */
}

/**
 * Temporary (hopefully) placeholder until Whetstone gets updated for 0.8+
 *
 * @param {string} item
 * @returns {string}
 */
export function getFromTheme(item) {
  return CONFIG.scope.themeDefaults[`--scope-${item}`];
}

export function registerSettings() {
  game.settings.register("scope", "dropShadow", {
    name: "SCOPE.SETTINGS.DropShadow",
    hint: "SCOPE.SETTINGS.DropShadowHint",
    scope: "client",
    config: true,
    default: true,
    type: Boolean,
    onChange: () => {
      canvas.notes.placeables.forEach(n => n.draw());
      game.scope.period.refresh();
    }
  });
  game.settings.register("scope", "bookend", {
    name: "SCOPE.SETTINGS.BookendPosition",
    hint: "SCOPE.SETTINGS.BookendPositionH",
    scope: "world",
    config: true,
    default: SCOPE.Bookends.position,
    type: Number,
    onChange: () => {
    }
  });
  game.settings.register("scope", "spacing", {
    name: "SCOPE.SETTINGS.Spacing",
    hint: "SCOPE.SETTINGS.SpacingH",
    scope: "world",
    config: true,
    default: SCOPE.noteSettings.spacing,
    type: Number,
    onChange: () => {
    }
  });
  game.settings.register("scope", "fromTop", {
    name: "SCOPE.SETTINGS.FromTop",
    hint: "SCOPE.SETTINGS.FromTopH",
    scope: "world",
    config: true,
    default: SCOPE.noteSettings.fromTop,
    type: Number,
    onChange: () => {
    }
  });
  game.settings.register("scope", "attached", {
    name: "SCOPE.SETTINGS.MoveAttached",
    hint: "SCOPE.SETTINGS.MoveAttachedH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
    }
  });
  game.settings.register("scope", "arrange", {
    name: "SCOPE.SETTINGS.Arrange",
    hint: "SCOPE.SETTINGS.ArrangeH",
    scope: "world",
    config: true,
    default: "center",
    type: String,
    choices: {
      "center": "SCOPE.SETTINGS.Center",
      "bookend": "SCOPE.SETTINGS.Bookend"
    },
    onChange: () => {
    }
  });
}

/**
 * Get the ID/Text pair from a list of NoteDocuments
 *
 * @param {NoteDocument[]}  notes
 * @param {boolean}         none
 * @returns {{}}
 */
export function getIDTextPairs(notes, none = true) {
  let pairs = none ? {none: "--"} : {};
  for (const note of notes) {
    let thisNote = {};
    thisNote[note.data._id] = note.data.text;
    foundry.utils.mergeObject(pairs, thisNote);
  }
  return pairs;
}

/**
 *
 * @param {string}        type
 * @param {string}        direction
 * @param {NoteDocument} note
 * @param {NoteDocument} noteToCheck
 * @returns {{}|{noteToShift: NoteDocument, amount: number}}
 */
export function droppedOn(type, direction, note, noteToCheck) {

  let scene = game.scenes.getName("scope");

  // Was the new note dropped on top of the note
  if (SCOPE.bump.hitTestRectangle(note, noteToCheck)) {
    return {
      noteToShift: note,
      amount: (SCOPE.noteSettings[type].spacing - (note.data[direction] - noteToCheck.data[direction]))
        + (SCOPE.noteSettings[type].spacing + SCOPE.noteSettings.spacing)
    };
  }

  let nextFlag = "next" + direction.toUpperCase();
  // Was the new note dropped on top of the next note
  let nextId = noteToCheck.getFlag("scope", nextFlag);
  let next = nextId ? scene.getEmbeddedDocument("Note", nextId) : null;
  if (next) {
    if (SCOPE.bump.hitTestRectangle(note, next)) {
      let nextCheck = noteToCheck.getFlag("scope", nextFlag);
      let nextNote = nextCheck ? scene.getEmbeddedDocument("Note", nextCheck) : null;
      let nextDirection = nextNote ? nextNote.data[direction] : 0;
      return {
        noteToShift: next,
        amount: (SCOPE.noteSettings[type].spacing - (note.data[direction] - nextDirection))
          + (SCOPE.noteSettings[this.type].spacing[this.sortDirection] + SCOPE.noteSettings.spacing)
      };
    }
  }

  return {};
}

/**
 * Find the note nearest to this note in the provided list
 *
 * @param {NoteDocument}    note
 * @param {NoteDocument[]}  notesToSort
 * @returns {NoteDocument[]}
 */
export function sortByDistanceFrom(note, notesToSort) {
  return notesToSort.sort((a,b) => {
    let d1 = Math.hypot(a.data.x - note.data.x, a.data.y - note.data.y);
    let d2 = Math.hypot(b.data.x - note.data.x, b.data.y - note.data.y);
    return d1 - d2;
  });
}

/**
 * Sort the notes based on their x or y values.
 *
 * @param {NoteDocument[]}  notesToSort
 * @param {string}          direction
 * @returns {NoteDocument[]}
 */
export function sortNotes(notesToSort, direction) {
  return notesToSort.sort((a, b) => a.data[direction] - b.data[direction]);
}