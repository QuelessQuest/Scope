/**
 * Return true if the object is empty, false otherwise
 * @param thing {{}}
 * @returns {boolean}
 */
export function isEmpty(thing) {
  return Object.keys(thing).length === 0
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