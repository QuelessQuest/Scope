import {SCOPE} from "./config.js";

/**
 * Return true if the object is empty, false otherwise
 * @param thing {{}}
 * @returns {boolean}
 */
export function isEmpty(thing) {
  return Object.keys(thing).length === 0
}

export async function insertNote(id, {x, y}) {
  const noteData = {
    entryId: id,
    x: x,
    y: y,
    icon: CONST.DEFAULT_NOT_ICON,
    textAnchor: CONT.TEXT_ANCHOR_POINTS.CENTER
  };

  if ( !canvas.grid.hitArea.contains(x, y) ) return false;

  canvas.notes.activate();
  let note = new Note(noteData);
  await note.constructor.create(noteData);
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
  const spacing = SCOPE.noteSettings.period.iconWidth + game.settings.get("Scope", "spacing");
  if ( size > 1 ) {
    length = spacing * size;
  } else {
    length = SCOPE.noteSettings.period.iconWidth;
  }
  return {x: mid - (length / 2) + (spacing/2), y: game.settings.get("Scope", "fromTop")}
}

/**
 * Rearrange all the cards into neat columns and rows
 * @returns {Promise<void>}
 */
export async function arrange() {
  if ( !game.scope.period.head ) return;

  game.scope.period.lockRefresh();

  let scene = game.scenes.getName("Scope");
  let notes = scene.getEmbeddedCollection("Note");

  const head = game.scope.period.head;
  const bookend = game.settings.get("Scope", "arrange") === "bookend"
  if ( bookend ) {
    const positions = getBookendPositions();
    const last = game.scope.period.getLast();
    let toUpdate = [{_id: head.noteId, x: positions.start.x, y: positions.start.y}, {_id: last.noteId, x: positions.end.x, y: positions.end.y}]
    await scene.updateEmbeddedDocuments("Note", toUpdate);
    //await canvas.notes.get(head.noteId).update(positions.start);
    //await canvas.notes.get(last.noteId).update(positions.end);
    head.x = positions.start.x;
    head.y = positions.start.y;
    last.x = positions.end.x;
    last.y = positions.end.y;
  } else {
    const position = getListPosition(game.scope.period.size);
    await scene.updateEmbeddedDocuments("Note", [{_id: head.noteId, x: position.x, y: position.y}]);
    //await canvas.notes.get(head.noteId).update(position);
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
    const y = events[idx].parent.y + SCOPE.noteSettings.event.spacing.y + game.settings.get("Scope", "spacing");
    updateList = [ ...updateList, ...{_id: events[idx].head.noteId, x: x, y: y}];
    //await canvas.notes.get(events[idx].head.noteId).update({x: x, y: y});
    events[idx].head.x = x;
    events[idx].head.y = y;
    const eventResults = await events[idx].arrangeList(false);
    sceneList = [...sceneList, ...eventResults.childLists];
    drawingIds = [ ...drawingIds, ...eventResults.drawingIds];
  }

  await scene.updateEmbeddedDocuments("Note", updateList);
  game.scope.period.unlockRefresh();
  await scene.deleteEmbeddedDocuments("Note", drawingIds);
  //await canvas.drawings.deleteMany(drawingIds);
}

export function getFromTheme(item) {
  return CONFIG.Scope.themeDefaults[`--scope-${item}`];
}

export function registerSettings() {
  game.settings.register("Scope", "dropShadow", {
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
  game.settings.register("Scope", "bookend", {
    name: "SCOPE.SETTINGS.BookendPosition",
    hint: "SCOPE.SETTINGS.BookendPositionH",
    scope: "world",
    config: true,
    default: SCOPE.Bookends.position,
    type: Number,
    onChange: () => {
    }
  });
  game.settings.register("Scope", "spacing", {
    name: "SCOPE.SETTINGS.Spacing",
    hint: "SCOPE.SETTINGS.SpacingH",
    scope: "world",
    config: true,
    default: SCOPE.noteSettings.spacing,
    type: Number,
    onChange: () => {
    }
  });
  game.settings.register("Scope", "fromTop", {
    name: "SCOPE.SETTINGS.FromTop",
    hint: "SCOPE.SETTINGS.FromTopH",
    scope: "world",
    config: true,
    default: SCOPE.noteSettings.fromTop,
    type: Number,
    onChange: () => {
    }
  });
  game.settings.register("Scope", "attached", {
    name: "SCOPE.SETTINGS.MoveAttached",
    hint: "SCOPE.SETTINGS.MoveAttachedH",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
    }
  });
  game.settings.register("Scope", "arrange", {
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