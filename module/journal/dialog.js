import {getIDTextPairs} from "../helper.js";
import {getNotesFrom} from "../notes.js";

export class DialogScope extends Dialog {
  constructor(data, options) {
    super(options);
    this.data = data;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "templates/hud/dialog.html",
      classes: ["dialog"],
      width: 400,
      jQuery: true,
      onChange: true
    });
  }

  activateListeners(html) {
    if ( this.options.onChange ) {
      html.find('select[name="attachToPeriod"]').change(this._onChangePeriod.bind(this));
      html.find('select[name="attachToEvent"]').change(this._onChangeEvent.bind(this));
    }
    html.find(".dialog-button").click(this._onClickButton.bind(this));
    if ( this.data.render instanceof Function ) this.data.render(this.options.jQuery ? html : html[0]);
  }

  /**
   * When a period is selected for attachment, populate the event drop down with all existing
   * events within that period.
   * @param event
   * @private
   */
  _onChangePeriod(event) {
    event.preventDefault();
    let scene = game.scenes.getName("scope");
    const form = $(event.target.form);
    const periodId = form.find('select[name="attachToPeriod"]').find(':selected').val();
    let periodNote = scene.getEmbeddedDocument("Note", periodId);
    let eventHeadId = periodNote.getFlag("scope", "nextY");
    let events = eventHeadId ?
      getNotesFrom(scene.getEmbeddedDocument("Note", eventHeadId), "nextY") :
      [];
    let eventPairs = getIDTextPairs(events, false);
    const eventNotes = form.find('select[name="attachToEvent"]');
    for (const id in eventPairs) {
      eventNotes.append(`<option value="${id}">${eventPairs[id]}</option>`);
    }
  }

  /**
   * When an event is selected for attachment, populate the event drop down with all existing
   * scenes within that event.
   * @param event
   * @private
   */
  _onChangeEvent(event) {
    event.preventDefault();
    let scene = game.scenes.getName("scope");
    const form = $(event.target.form);
    const eventId = form.find('select[name="attachToEvent"]').find(':selected').val();
    let eventNote = scene.getEmbeddedDocument("Note", eventId);
    let sceneHeadId = eventNote.getFlag("scope", "nextX");
    let scenes = sceneHeadId ?
      getNotesFrom(scene.getEmbeddedDocument("Note", sceneHeadId), "nextX") :
      [];
    let scenePairs = getIDTextPairs(scenes, false);
    const sceneNotes = form.find('select[name="attachToScene"]');
    for (const id in scenePairs) {
      sceneNotes.append(`<option value="${id}">${cMap[id]}</option>`);
    }
  }
}