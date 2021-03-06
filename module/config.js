export const SCOPE = {};

SCOPE.updateRefresh = true;
SCOPE.scenePrepared = false;
SCOPE.bump = null;

SCOPE.sortDirection = {
    horizontal: "x",
    vertical: "y",
    x: "width",
    y: "height",
    opposite: {
        x: "y",
        y: "x"
    }
}

SCOPE.Bookends = {
    position: 5
}

SCOPE.relationships = {
    period: {
        self: "period",
        parent: null,
        child: "event"
    },
    event: {
        self: "event",
        parent: "period",
        child: "scene"
    },
    scene: {
        self: "scene",
        parent: "event",
        child: null
    }
}

SCOPE.noteSettings = {
    spacing: 100,
    fromTop: 450,
    period: {
        type: "period",
        iconWidth: 360,
        iconHeight: 160,
        spacing: 180
    },
    event: {
        type: "event",
        iconWidth: 250,
        iconHeight: 200,
        spacing: 100
    },
    scene: {
        type: "scene",
        iconWidth: 160,
        iconHeight: 160,
        spacing: 100
    }
}

SCOPE.icons = {
    size: 38,
    light: "systems/scope/assets/card-light.svg",
    dark: "systems/scope/assets/card-dark.svg",
    period: "systems/scope/assets/card-period.svg",
    event: "systems/scope/assets/card-event.svg",
    scene: "systems/scope/assets/card-scene.svg"
}

SCOPE.connectors = {
    t: CONST.DRAWING_TYPES.FREEHAND,
    type: CONST.DRAWING_TYPES.FREEHAND,
    flags: {
        scope: {
            type: "connector"
        }
    },
    fillType: CONST.DRAWING_FILL_TYPES.NONE,
    strokeWidth: 8,
    strokeAlpha: 1,
    fillAlpha: 1
}

SCOPE.legacies = ["Not Yet Defined", "Not Yet Defined", "Not Yet Defined", "Not Yet Defined", "Not Yet Defined"];

SCOPE.namespace = {
    locked: false,
    focus: {
        id: "",
        text: ""
    },
    legacies: [],
    bookend: 0,
    attached: false
}

SCOPE.legacyListStart = 100;

SCOPE.legacy = {
    t: CONST.DRAWING_TYPES.TEXT,
    type: CONST.DRAWING_TYPES.TEXT,
    pendingX: 1117,
    width: 464,
    height: 75,
    fillType: CONST.DRAWING_FILL_TYPES.NONE,
    fillColor: "",
    fillAlpha: 0,
    strokeWidth: 0,
    strokeColor: "",
    strokeAlpha: 0,
    texture: "",
    textureAlpha: 0,
    fontSize: 40,
    locked: true,
    points: []
}

SCOPE.legacyLabel = {
    t: CONST.DRAWING_TYPES.TEXT,
    type: CONST.DRAWING_TYPES.TEXT,
    pendingX: 1117,
    y: 25,
    width: 388,
    height: 107,
    fillType: CONST.DRAWING_FILL_TYPES.NONE,
    fillColor: "",
    fillAlpha: 0,
    strokeWidth: 0,
    strokeColor: "",
    strokeAlpha: 0,
    texture: "",
    textureAlpha: 0,
    text: "Legacies",
    fontSize: 48,
    locked: true,
    points: []
}

SCOPE.focus = {
    t: CONST.DRAWING_TYPES.TEXT,
    y: 175,
    width: 464,
    height: 115,
    fillType: CONST.DRAWING_FILL_TYPES.NONE,
    fillColor: "",
    fillAlpha: 0,
    strokeWidth: 0,
    strokeColor: "",
    strokeAlpha: 0,
    texture: "",
    textureAlpha: 0,
    text: "No Current Focus",
    fontSize: 48,
    locked: true,
    points: []
}

SCOPE.focusLabel = {
    t: CONST.DRAWING_TYPES.TEXT,
    pendingX: 2235,
    y: 100,
    width: 388,
    height: 107,
    fillType: CONST.DRAWING_FILL_TYPES.NONE,
    fillColor: "",
    fillAlpha: 0,
    strokeWidth: 0,
    strokeColor: "",
    strokeAlpha: 0,
    texture: "",
    textureAlpha: 0,
    text: "Current Focus",
    fontSize: 48,
    locked: true,
    points: []
}

SCOPE.bigPicture = {
    t: CONST.DRAWING_TYPES.TEXT,
    pendingX: 2235,
    y: 25,
    width: 388,
    height: 107,
    fillType: CONST.DRAWING_FILL_TYPES.NONE,
    fillColor: "",
    fillAlpha: 0,
    strokeWidth: 0,
    strokeColor: "",
    strokeAlpha: 0,
    texture: "",
    textureAlpha: 0,
    text: "The Big Picture",
    fontSize: 48,
    locked: true,
    points: []
}

SCOPE.scene = {
    name: "scope",
    journal: "",
    width: 5120,
    height: 2880,
    padding: 0,
    backgroundColor: "#A1A1A1",
    gridType: CONST.GRID_TYPES.SQUARE,
    grid: 100,
    shiftX: 0,
    shiftY: 0,
    gridUnits: "ft",
    gridDistance: 5,
    gridColor: "#000000",
    gridAlpha: 0,
    tokenVision: false,
    globalLight: true,
    fogExploration: false,
    darkness: 0,
    globalLightThreshold: null,
    playlist: "",
    weather: "",
    initial: {
        x: 2543,
        y: 1246,
        scale: 0.47
    },
    permission: {
        default: 3
    },
    navigation: true,
    navName: "",
}

SCOPE.themeDefaults = {
    "--scope-focus-label-color": "#7F7F7F80",
    "--scope-focus-color": "#872C2C",
    "--scope-legacy-label-color": "#7F7F7F80",
    "--scope-legacy-color": "#872C2C",
    "--scope-period-label-color": "#EDEDED",
    "--scope-period-label-stroke-color": "#292929",
    "--scope-period-label-size": 24,
    "--scope-period-icon-color": "#7E676A",
    "--scope-period-link-color": "#6E5D5C",
    "--scope-event-label-color": "#EDEDED",
    "--scope-event-label-stroke-color": "#292929",
    "--scope-event-label-size": 24,
    "--scope-event-icon-color": "#989797",
    "--scope-event-link-color": "#6E5D5C",
    "--scope-scene-label-color": "#FFFFFF",
    "--scope-scene-label-stroke-color": "#EDEDED",
    "--scope-scene-label-size": 24,
    "--scope-scene-icon-color": "#713737",
    "--scope-scene-link-color": "#6E5D5C",
    "--scope-border-color": "#601F1F",
    "--scope-border-color-half": "#601F1F80",
    "--scope-border-color-lighter": "#872C2C"
}

SCOPE.setDefault = function (value, defaultValue) {
    return (value === undefined) ? defaultValue : value;
}