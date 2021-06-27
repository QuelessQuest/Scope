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
 *
 * @param {string}  id
 * @param {number}  x
 * @param {number}  y
 * @returns {Promise<abstract.Document[]|boolean>}
 */
export async function insertNote(id, {x, y}) {
  const noteData = new foundry.data.NoteData({
    entryId: id,
    x: x,
    y: y,
    icon: CONST.DEFAULT_NOTE_ICON,
    textAnchor: CONST.TEXT_ANCHOR_POINTS.CENTER
  });

  if ( !canvas.grid.hitArea.contains(x, y) ) return false;

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

export function getListPosition(size) {
  let mid = game.scenes.active.data.width / 2;
  let length;
  const spacing = SCOPE.noteSettings.period.iconWidth + game.settings.get("scope", "spacing");
  if ( size > 1 ) {
    length = spacing * size;
  } else {
    length = SCOPE.noteSettings.period.iconWidth;
  }
  return {x: mid - (length / 2) + (spacing/2), y: game.settings.get("scope", "fromTop")}
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

export function droppedOn(scene, note, targetCard) {
  let shiftIt = {};
  // Is it on top of target
  let targetNote = scene.getEmbeddedDocument("Note", targetCard.noteId);
  if ( SCOPE.bump.hitTestRectangle(note, targetNote) ) {
    const amount = (SCOPE.noteSettings[this.type].spacing[this.sortDirection]
        - (card[this.sortDirection]
            - targetCard[this.sortDirection]))
        + (SCOPE.noteSettings[this.type].spacing[this.sortDirection]
            + SCOPE.noteSettings.spacing);
    shiftIt = {card: card, amount: amount};
  }
  // Is it on top of targets next
  if ( targetCard.next ) {
    let targetNextNote = scene.getEmbeddedDocument("Note", targetCard.next.noteId);
    if ( SCOPE.bump.hitTestRectangle(note, targetNextNote) ) {
      const amount = (SCOPE.noteSettings[this.type].spacing[this.sortDirection]
          - (card[this.sortDirection]
              - targetCard.next[this.sortDirection]))
          + (SCOPE.noteSettings[this.type].spacing[this.sortDirection]
              + SCOPE.noteSettings.spacing);
      shiftIt = {card: targetCard.next, amount: amount};
    }
  }

  return shiftIt;
}