import {isEmpty} from "../helper.js";

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
      html.find('select[name="periodAttach"]').change(this._onChangeCards.bind(this));
      html.find('select[name="eventAttach"]').change(this._onChangeEvent.bind(this));
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
  _onChangeCards(event) {
    event.preventDefault();
    const form = $(event.target.form);
    const periodCardId = form.find('select[name="periodAttach"]').find(':selected').val();
    const children = game.scope.period.findCard("id", periodCardId).children;
    const cMap = children.getCardsIdNamePair();
    if ( !isEmpty(cMap) ) {
      const eventCards = form.find('select[name="eventAttach"]');
      for (const id in cMap) {
        eventCards.append(`<option value="${id}">${cMap[id]}</option>`);
      }
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
    const form = $(event.target.form);
    const periodCardId = form.find('select[name="periodAttach"]').find(':selected').val();
    const eventCardId = form.find('select[name="eventAttach"]').find(':selected').val();
    const periodCard = game.scope.period.findCard("id", periodCardId);
    const eventCard = periodCard.children.findCard("id", eventCardId);
    const children = eventCard.children;

    const cMap = children.getCardsIdNamePair();
    if ( !isEmpty(cMap) ) {
      const sceneCards = form.find('select[name="sceneAttach"]');
      for (const id in cMap) {
        sceneCards.append(`<option value="${id}">${cMap[id]}</option>`);
      }
    }
  }
}