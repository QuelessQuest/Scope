import {SCOPE} from "../config.js";
import {DialogScope} from "../journal/dialog.js";
import {insertNote} from "../helper.js";
import {getBookendPositions} from "../helper.js";
import {arrange} from "../helper.js";

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
    html.find(".header-actions .journal.legacy").click(e => this._onCreateCard(e, "legacy"));
    html.find(".header-actions .journal.palette").click(e => this._onCreatePalette(e));
    html.find(".header-actions .journal.bookends").click(e => this._onCreateBookends(e));
    html.find(".header-actions .journal.arrange").click(e => arrange());
    html.find(".header-actions .journal.picture").click(e => this._onCreateText(e, "picture"));
    html.find(".header-actions .journal.focus").click(e => this._onCreateText(e, "focus"));
  }

  /**
   * Get the options for the display of the dialog
   * @param type {string}
   * @param button
   * @returns {{name: String, options: {top: number, left: number, width: number}, folderId: string}}
   * @private
   */
  _getData(type, button) {

    const nameFromType = type[0].toUpperCase() + type.substr(1);

    let folderId = "";
    if ( type !== "picture" && type !== "palette" && type !== "focus") {
      const folder = game.folders.filter(f => f.data.type === "JournalEntry").find(f => f.getFlag("Scope", "type") === type);
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
   * @param type {string}
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
   *          id: {string}}}
   * @private
   */
  _getDialogData(type, data) {
    let periodCards = game.scope.period.getCardsIdNamePair();
    periodCards = foundry.utils.mergeObject({"none": "--"}, periodCards);

    let typeName = "";
    let attachCard = "";
    let eventCards = null;
    let attachSubCard = "";
    let text = "";
    let id = "";

    switch (type) {
      case "period":
        typeName = game.i18n.localize('SCOPE.JournalPeriod');
        attachCard = typeName;
        break;
      case "event":
        eventCards = {"none": "--"};
        typeName = game.i18n.localize('SCOPE.JournalEvent');
        attachCard = game.i18n.localize('SCOPE.JournalPeriod');
        attachSubCard = typeName;
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
    }

    return {
      name: typeName,
      periodCards: periodCards,
      cardSelected: "none",
      attachCard: attachCard,
      eventCards: eventCards,
      subCardSelected: "none",
      attachSubCards: attachSubCard,
      tone: "tone",
      endTone: "endTone",
      tones: {light: "SCOPE.JournalLight", dark: "SCOPE.JournalDark"},
      chosen: "light",
      text: text,
      id: id,
      folderId: data.folderId
    };
  }

  /**
   * Create the scope item
   * @param event
   * @param type
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

    if ( game.scope.period.head !== null ) {
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
    });
  }

  /**
   * Update a text drawing
   * @param event
   * @param type {string}
   * @private
   */
  async _onCreateText(event, type) {
    event.preventDefault();
    event.stopPropagation();

    let scene = game.scenes.getName("Scope");

    this._onCreate(event, type, async html => {
      const form = html[0].querySelector("form");
      const fd = new FormDataExtended(form);
      let fo = fd.toObject();
      await scene.updateEmbeddedDocuments("Drawing", [{_id: fo.id, text: fo.text}]);
    });
  }

  async _onCreateCard(event, type) {
    event.preventDefault();
    event.stopPropagation();

    this._onCreate(event, type, html => {
        const form = html[0].querySelector("form");
        const fd = new FormDataExtended(form);
        let fo = fd.toObject();
        this._createJournalEntry(fo.name, fo.tone, fo.folderId, fo, type).then( e => {
          this._maybeCreateNote(e.getFlag("Scope", "periodAttach"), e.getFlag("Scope", "eventAttach"), type, e.id);
        });
    });
  }

  /**
   * Create the Journal Entry from the form data.
   * @param name {string}
   * @param tone {string}
   * @param folderId {string}
   * @param fo {{}}
   * @param type {string}
   * @returns
   * @private
   */
  async _createJournalEntry(name, tone, folderId, fo, type) {
    const content = await renderTemplate(`systems/scope/templates/journal/journal-${type}.html`, fo);
    let eventAttach = "none";
    if ( fo.eventAttach ) eventAttach = fo.eventAttach;
    const createData = {
      content: content,
      name: name,
      folder: folderId,
      flags: {
        Scope: {
          type: type,
          tone: tone,
          periodAttach: fo.periodAttach,
          eventAttach: eventAttach
        }
      }
    };

    return JournalEntry.create(createData, {renderSheet: false, cardType: type});
  }

  /**
   * If the creation form indicates that a note is to be created (inserted, attached,
   * etc), the note will be created from the Journal Entry. Otherwise, Notes
   * are created when Journal Entries are dragged onto the canvas.
   * @param periodId {string}
   * @param eventId {string}
   * @param type {string}
   * @param entityId {string}
   * @private
   */
  _maybeCreateNote(periodId, eventId, type, entityId) {

    if ( periodId && periodId !== "none" ) {
      switch (type) {
        case "period":
          insertNote(entityId, game.scope.period.getInsertPosition(periodId)).then(() => {
          });
          break;
        case "event":
          // Get the event x position
          const periodCard = game.scope.period.findCard("id", periodId);
          if ( !periodCard ) {
            ui.notifications.warn("Something Bad Happened: Could not find the required period card", {permanent: true});
            return;
          }

          if ( eventId !== "none" ) {
            const eventCards = game.scope.period.findCard("id", periodId).children;
            insertNote(entityId, eventCards.getInsertPosition(eventId)).then(() => {
            });
          } else {
            // No event insertion point specified, attach to end of list
            const eventX = periodCard.x;
            let eventY = 0;
            let insertAt = periodCard.children.getLast();
            if ( insertAt ) {
              ui.notifications.info("Period Attachment Requested without Event Entry Point set. Attaching to the End of the List")
              eventY = insertAt.y + SCOPE.noteSettings.event.spacing.y;
            } else {
              eventY = periodCard.y + (SCOPE.noteSettings.period.iconHeight / 2) + (SCOPE.noteSettings.event.iconHeight / 2) + 100;
            }
            insertNote(entityId, {x: eventX, y: eventY}).then(() => {
            });
          }
          break;
        case "scene":
          break;
      }
    }
  }
}