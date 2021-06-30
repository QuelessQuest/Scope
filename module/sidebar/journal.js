import {DialogScope} from "../journal/dialog.js";
import {getIDTextPairs, insertNote, sortNotes} from "../helper.js";
import {getBookendPositions} from "../helper.js";
import {arrange} from "../helper.js";
import {getSpacedPoint} from "../helper.js";
import {findNoteToAttachTo} from "../notes.js";
import {getNotesFrom} from "../notes.js";

export class JournalDirectoryScope extends JournalDirectory {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/scope/templates/sidebar/journal-directory.html",
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".header-actions .journal.period").click(e => this._onCreateCard(e, "period"));
    html.find(".header-actions .journal.event").click(e => this._onCreateCard(e, "event"));
    html.find(".header-actions .journal.scene").click(e => this._onCreateCard(e, "scene"));
    html.find(".header-actions .journal.legacy").click(e => this._onCreateText(e, "legacy"));
    html.find(".header-actions .journal.palette").click(e => this._onCreatePalette(e));
    html.find(".header-actions .journal.bookends").click(e => this._onCreateBookends(e));
    html.find(".header-actions .journal.arrange").click(e => arrange());
    html.find(".header-actions .journal.picture").click(e => this._onCreateText(e, "picture"));
    html.find(".header-actions .journal.focus").click(e => this._onCreateText(e, "focus"));
  }

  /**
   * Get the options for the display of the dialog
   * @param {string}  type
   * @param button
   * @returns {{name: string, options: {top: number, left: number, width: number}, folderId: string}}
   * @private
   */
  _getData(type, button) {

    const nameFromType = type[0].toUpperCase() + type.substr(1);

    let folderId = "";
    if (type !== "picture" && type !== "palette" && type !== "focus" && type !== "legacy") {
      const folder = game.folders.filter(f => f.data.type === "JournalEntry").find(f => f.getFlag("scope", "type") === type);
      folderId = folder.id;
    }

    return {
      name: game.i18n.localize(`SCOPE.Create${nameFromType}`),
      folderId: folderId,
      options: {
        width: 320,
        left: window.innerWidth - 630,
        top: button.offsetTop
      }
    };
  }

  /**
   * Get the data needed to populate the creation dialog
   * @param {string}  type
   * @param {{}}      data
   * @returns {{
   *          name: {string},
   *          periodCards: {},
   *          cardSelected: {string},
   *          attachCard: {string},
   *          eventCards: {},
   *          subCardSelected: {string},
   *          attachSubCards: {string},
   *          tone: {string},
   *          endTone: {string},
   *          tones: {light: {string}, dark: {string}},
   *          chosen: {string},
   *          text: {string},
   *          id: {string},
   *          folderId: {string},
   *          legacyData: {}}}
   * @private
   */
  _getDialogData(type, data) {

    let scene = game.scenes.getName("scope");
    let periods = scene.getEmbeddedCollection("Note")
      .filter(note => note.getFlag("scope", "type") === "period");

    let periodPairs = getIDTextPairs(periods);
    let typeName = "";
    let attachCard = "";
    let eventCards = null;
    let sceneCards = null;
    let attachSubCard = "";
    let attachSubSubCard = "";
    let text = "";
    let id = "";
    let legacyData = {};
    let direction = "";

    switch (type) {
      case "period":
        typeName = game.i18n.localize('SCOPE.JournalPeriod');
        attachCard = typeName;
        direction = "x";
        break;
      case "event":
        eventCards = {none: "--"};
        typeName = game.i18n.localize('SCOPE.JournalEvent');
        attachCard = game.i18n.localize('SCOPE.JournalPeriod');
        attachSubCard = typeName;
        direction = "y";
        break;
      case "scene":
        eventCards = {none: "--"};
        sceneCards = {none: "--"};
        typeName = game.i18n.localize('SCOPE.JournalScene');
        attachCard = game.i18n.localize('SCOPE.JournalPeriod');
        attachSubCard = game.i18n.localize('SCOPE.JournalEvent');
        attachSubSubCard = typeName;
        direction = "x";
        break;
      case "picture":
        typeName = game.i18n.localize("SCOPE.UpdatePicture");
        text = game.scope.focus.bpText;
        id = game.scope.focus.bpId;
        break;
      case "focus":
        typeName = game.i18n.localize("SCOPE.UpdateFocus");
        text = game.scope.focus.text;
        id = game.scope.focus.id;
        break;
      case "legacy" :
        typeName = game.i18n.localize("SCOPE.UpdateFocus");
        let data = {};
        for (const leg of game.scope.legacies) {
          data[leg.id] = leg.text;
        }
        legacyData = data;
    }

    return {
      name: typeName,
      periodCards: periodPairs,
      cardSelected: "none",
      attachCard: attachCard,
      eventCards: eventCards,
      sceneCards: sceneCards,
      subCardSelected: "none",
      attachSubCard: attachSubCard,
      attachSubSubCard: attachSubSubCard,
      tone: "tone",
      endTone: "endTone",
      tones: {light: "SCOPE.JournalLight", dark: "SCOPE.JournalDark"},
      chosen: "light",
      text: text,
      id: id,
      folderId: data.folderId,
      legacyData: legacyData,
      direction: direction
    };
  }

  /**
   * Create the scope item
   * @param event
   * @param {string}  type
   * @param callback
   * @private
   */
  _onCreate(event, type, callback) {
    const data = this._getData(type, event.currentTarget);
    renderTemplate(
      `systems/scope/templates/journal/journal-create-${type}.html`,
      this._getDialogData(type, data))
      .then(content => {
        new DialogScope({
          title: data.name,
          content: content,
          buttons: {
            create: {
              icon: '<i class="fas fa-check"></i>',
              label: data.name,
              callback: callback
            }
          },
          default: "create"
        }, data.options).render(true);
      });
  }

  /**
   * Render the Create Bookends dialog and process the results
   * @param event
   * @private
   */
  _createTheBookends(event) {

    const data = this._getData("period", event.currentTarget);

    renderTemplate(
      `systems/scope/templates/journal/journal-create-bookends.html`,
      this._getDialogData("period", data))
      .then(content => {
        new DialogScope({
          title: game.i18n.localize("SCOPE.CreateBookends"),
          content: content,
          buttons: {
            create: {
              icon: '<i class="fas fa-check"></i>',
              label: game.i18n.localize("SCOPE.CreateBookends"),
              callback: html => {
                const form = html[0].querySelector("form");
                const fd = new FormDataExtended(form);
                let fo = fd.toObject();
                this._createJournalEntry(fo.name, fo.tone, data.folderId, fo, "period").then(e => {
                  const startId = e.id;
                  this._createJournalEntry(fo.endName, fo.endTone, data.folderId, fo, "period").then(e2 => {
                    const position = getBookendPositions();
                    insertNote(startId, position.start).then(() => {
                      insertNote(e2.id, position.end).then(() => {
                      });
                    });
                  });
                });
              }
            }
          },
          default: "create"
        }, data.options).render(true);
      });
  }

  /**
   * If bookends creation is requested, check to see if there is already data present and warn
   * of data destruction.
   * @param event
   * @private
   */
  _onCreateBookends(event) {
    event.preventDefault();
    event.stopPropagation();

    if (game.scope.period.head !== null) {
      renderTemplate("systems/scope/templates/bookendWarning.html", {}).then(message => {
        new Dialog(
          {
            title: game.i18n.localize('SCOPE.Warning'),
            content: message,
            buttons: {
              ok: {
                icon: '<i class="fas fa-sign-in-alt"></i>',
                label: game.i18n.localize('SCOPE.Continue'),
                callback: () => {
                  this._createTheBookends(event);
                }
              },
              cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize('Cancel'),
                callback: () => {
                }
              }
            }
          },
          {
            width: 320,
            left: window.innerWidth - 630,
            top: event.currentTarget.offsetTop
          }).render(true)
      });
    } else
      this._createTheBookends(event);
  }

  /**
   * Create the Journal Entry for the Palette
   * @param event
   * @private
   */
  _onCreatePalette(event) {
    event.preventDefault();
    event.stopPropagation();

    this._onCreate(event, "palette", html => {
      const form = html[0].querySelector("form");
      const fd = new FormDataExtended(form);
      let fo = fd.toObject();
      this._createPalette("Palette", fo.tone, fo.folderId, fo, "palette")
    });
  }

  /**
   * Update a text drawing
   * @param event
   * @param {string}  type
   * @private
   */
  async _onCreateText(event, type) {
    event.preventDefault();
    event.stopPropagation();

    let scene = game.scenes.getName("scope");

    this._onCreate(event, type, async html => {
      const form = html[0].querySelector("form");
      const fd = new FormDataExtended(form);
      let fo = fd.toObject();
      let id;
      if (type === "legacy")
        id = fo.changeLegacy;
      else
        id = fo.id;

      await scene.updateEmbeddedDocuments("Drawing", [{_id: id, text: fo.text}]);

    });
  }

  /**
   *
   * @param event
   * @param {string}  type
   * @returns {Promise<void>}
   * @private
   */
  async _onCreateCard(event, type) {
    event.preventDefault();
    event.stopPropagation();

    this._onCreate(event, type, html => {
      const form = html[0].querySelector("form");
      const fd = new FormDataExtended(form);
      let fo = fd.toObject();
      this._createJournalEntry(fo.name, fo.tone, fo.folderId, fo, type).then(e => {
        this._maybeCreateNote(
          e.getFlag("scope", "attachToPeriod"),
          e.getFlag("scope", "attachToEvent"),
          e.getFlag("scope", "attachToScene"),
          e.getFlag("scope", "direction"),
          type,
          e.id);
      });
    });
  }

  /**
   * Create the Journal Entry from the form data.
   * @param {string}  name
   * @param {string}  tone
   * @param {string}  folderId
   * @param {{}}      fo
   * @param {string}  type
   * @returns {JournalEntry}
   * @private
   */
  async _createJournalEntry(name, tone, folderId, fo, type) {
    const content = await renderTemplate(`systems/scope/templates/journal/journal-${type}.html`, fo);
    let attachToEvent = fo.attachToEvent ? fo.attachToEvent : "none";
    let attachToScene = fo.attachToScene ? fo.attachToScene : "none";
    const createData = {
      content: content,
      name: name,
      folder: folderId,
      permission: {
        default: CONST.ENTITY_PERMISSIONS.OWNER
      },
      flags: {
        scope: {
          type: type,
          tone: tone,
          direction: fo.direction,
          attachToPeriod: fo.attachToPeriod,
          attachToEvent: attachToEvent,
          attachToScene: attachToScene
        }
      }
    };

    return JournalEntry.create(createData, {renderSheet: false, cardType: type});
  }

  /**
   *
   * @param {string}  name
   * @param {string}  tone
   * @param {string}  folderId
   * @param {{}}      fo
   * @param {string}  type
   * @returns {JournalEntry}
   * @private
   */
  async _createPalette(name, tone, folderId, fo, type) {
    let yl = fo.yes.split(/\r?\n/);
    let nl = fo.no.split(/\r?\n/);

    let fl = [];
    let diff = yl.length - nl.length;
    if (diff > 0) {
      for (let i = 0; i < diff; i++)
        nl.push("");
    }
    if (diff < 0) {
      diff = Math.abs(diff);
      for (let i = 0; i < diff; i++)
        yl.push("");
    }

    for (let i = 0; i < yl.length; i++)
      fl.push({yes: yl[i], no: nl[i]});

    let data = {
      items: fl
    }
    foundry.utils.mergeObject(fo, data);
    return this._createJournalEntry(name, tone, folderId, fo, type);
  }

  /**
   * If the creation form indicates that a note is to be created (inserted, attached,
   * etc), the note will be created from the Journal Entry. Otherwise, Notes
   * are created when Journal Entries are dragged onto the canvas.
   * @param {string}  periodId
   * @param {string}  eventId
   * @param {string}  sceneId
   * @param {string}  direction
   * @param {string}  type
   * @param {string}  entityId
   * @private
   */
  _maybeCreateNote(periodId, eventId, sceneId, direction, type, entityId) {

    if (!periodId || periodId === "none") return;
    let scene = game.scenes.getName("scope");
    let periodNote = scene.getEmbeddedDocument("Note", periodId);
    switch (type) {
      case "period":
        insertNote(entityId, getSpacedPoint(periodNote, "period", "x"), direction).then(() => {
        });
        break;
      case "event":
        this._insertEvent(scene, entityId, periodNote, eventId);
        break;
      case "scene":
        this._insertScene(scene, entityId, periodNote, eventId, sceneId);
        break;
    }
  }

  /**
   *
   * @param {Scene}         scene
   * @param {string}        entityId
   * @param {NoteDocument}  periodNote
   * @param {string}        eventId
   * @private
   */
  _insertEvent(scene, entityId, periodNote, eventId) {
    if (!periodNote) {
      ui.notifications.warn("Something Bad Happened: Could not find the period", {permanent: true});
      return;
    }

    let headEventId = periodNote.getFlag("scope", "nextY");
    if (eventId !== "none") {
      if (!headEventId) {
        ui.notifications.warn("Something Bad Happened: Could not find the event", {permanent: true});
        return;
      }
      let eventNotes = getNotesFrom(scene.getEmbeddedDocument("Note", headEventId), "nextY");
      let eventNote = scene.getEmbeddedDocument("Note", eventId);
      let attachTo = findNoteToAttachTo(eventNote.data.y, "y", sortNotes(eventNotes, "y"));
      insertNote(entityId, getSpacedPoint(attachTo, "event", "y"), "y").then(() => {
      });
    } else {
      // No event specified, so attach to the end of the periods event list
      if (!headEventId) {
        // First child
        insertNote(entityId, getSpacedPoint(periodNote, "event", "y"), "y").then(() => {
        });
      } else {
        let lastNote = scene.getEmbeddedDocument("Note", headEventId);
        let currentNote = lastNote;
        do {
          let nextNoteId = currentNote.getFlag("scope", "nextY");
          currentNote = nextNoteId ? scene.getEmbeddedDocument("Note", nextNoteId) : null;
          if (currentNote) lastNote = currentNote;
        } while (currentNote);
        insertNote(entityId, getSpacedPoint(lastNote, "event", "y"), "y").then(() => {
        });
      }
    }
  }

  _insertScene(scene, entityId, periodNote, eventId, sceneId) {
    if (!periodNote) {
      ui.notifications.warn("Something Bad Happened: Could not find the period", {permanent: true});
      return;
    }
    if (!eventId) {
      ui.notifications.warn("Something Bad Happened: Could not find the event", {permanent: true});
      return;
    }

    let eventNote = scene.getEmbeddedDocument("Note", eventId);
    let headSceneId = eventNote.getFlag("scope", "nextX");
    if (sceneId !== "none") {
      if (!headSceneId) {
        ui.notifications.warn("Something Bad Happened: Could not find the scene", {permanent: true});
        return;
      }
      let sceneNotes = getNotesFrom(scene.getEmbeddedDocument("Note", headSceneId), "nextX");
      let sceneNote = scene.getEmbeddedDocument("Note", sceneId);
      let attachTo = findNoteToAttachTo(sceneNote.data.x, "x", sortNotes(sceneNotes, "x"));
      insertNote(entityId, getSpacedPoint(attachTo, "scene", "x"), "x").then(() => {
      });
    } else {
      // No scene specified, so attach to the end of the events scene list
      if (!headSceneId) {
        // First child
        insertNote(entityId, getSpacedPoint(eventNote, "scene", "x"), "x").then(() => {
        });
      } else {
        let lastNote = scene.getEmbeddedDocument("Note", headSceneId);
        let currentNote = lastNote;
        do {
          let nextNoteId = currentNote.getFlag("scope", "nextX");
          currentNote = nextNoteId ? scene.getEmbeddedDocument("Note", nextNoteId) : null;
          if (currentNote) lastNote = currentNote;
        } while (currentNote);
        insertNote(entityId, getSpacedPoint(lastNote, "scene", "x"), "x").then(() => {
        });
      }
    }
  }
}