import {SCOPE} from "../config.js";
import {DialogScope} from "../journal/dialog.js";

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

  async _onCreateCard(event, type) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const data = {folder: button.dataset.folder};
    const options = {width: 320, left: window.innerWidth - 630, top: button.offsetTop};
    const dialogData = {
      name: "typeName",
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
      folderId: data.folder._id
    }

    // Render the entity creation form
    const html = await renderTemplate(`systems/scope/templates/journal/journal-create-${type}.html`, dialogData);
    let dialog = new DialogScope({
          title: "title",
          content: html,
          buttons: {
            create: {
              icon: '<i class="fas fa-check"></i>',
              label: data.name,
              callback: callback
            }
          },
          default: "create"
        },
        options);

    dialog.render(true);
  }
}