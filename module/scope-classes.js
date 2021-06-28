import {SCOPE} from "./config.js";
import {ScopeData} from "./data/data.mjs";

/**
 * Class that hold all card information at a game level.
 */

/**
 * The data contained within the Card List (Double linked list)
 * Also contains the drawing references between cards.
 */
export class CardScope {
  /**
   *
   * @param noteDocument {NoteDocument}
   */
  constructor(noteDocument) {
    this.entry = noteDocument.data.entryId;
    this.noteId = noteDocument.data._id;
    this.prev = null;
    this.next = null;
    let je = game.journal.get(this.entry);
    this.name = je.data.name;
    this.connectors = {
      prev: {},
      next: {}
    }
    this.x = noteDocument.data.x;
    this.y = noteDocument.data.y;
    this._id = foundry.utils.randomID();
    this._children = null;  // This note may have an additional list attached
    this.connectors.prev = {x: "", y: ""};
    this.connectors.next = {x: "", y: ""};
    this._order = 0;
    this._group = null; // hold the object id under which this card a child
  }

  get id() {
    return this._id;
  }

  get children() {
    return this._children;
  }

  set children(childList) {
    this._children = childList;
  }

  get order() {
    return this._order;
  }

  set order(newOrder) {
    this._order = newOrder;
  }

  get group() {
    return this._group;
  }

  set group(newGroup) {
    this._group = newGroup;
  }
}

/**
 * Class to draw the card icons. Replaces the ControlIcon class of Core.
 * Allows for non-square icons, removes the background and reshapes the border.
 */
export class ScopeControlIcon extends PIXI.Container {
  constructor({texture, iconWidth = 40, iconHeight = 40, borderColor = 0xFF5500, borderColorHalf = 0xFF550080, tint = null, tone = "light"} = {}, ...args) {
    super(...args);

    // Define arguments
    this.iconSrc = texture;
    this.iconWidth = iconWidth;
    this.iconHeight = iconHeight;
    this.rect = [-1, -1, iconWidth + 2, iconHeight + 2];
    this.borderColor = borderColor;
    this.borderColorHalf = borderColorHalf;
    this.tintColor = tint;
    this.tone = tone;

    // Define hit area
    this.interactive = true;
    this.interactiveChildren = false;
    this.hitArea = new PIXI.Rectangle(...this.rect);

    // Icon
    this.icon = this.addChild(new PIXI.Sprite());

    // Tone
    this.iconTone = this.addChild(new PIXI.Sprite());

    // Border
    this.border = this.addChild(new PIXI.Graphics());

    // Draw asynchronously
    this.draw();
  }

  /* -------------------------------------------- */

  async draw() {

    // Load the icon texture
    this.texture = this.texture ?? await loadTexture(this.iconSrc);
    this.toneTexture = this.toneTexture ?? await loadTexture(SCOPE.icons[this.tone]);

    // Draw border
    this.border.clear();
    this.border.lineStyle(2, this.borderColor, 1.0).drawRoundedRect(...this.rect, 20).endFill();
    //this.border.clear().lineStyle(2, this.borderColor, 1.0).drawRoundedRect(...this.rect, 20).endFill();
    this.border.filters = [new PIXI.filters.GlowFilter({color: this.borderColor, innerStrength: 2})];
    this.border.visible = false;

    // Draw tone icon
    this.iconTone.texture = this.toneTexture;
    this.iconTone.width = SCOPE.icons.size;
    this.iconTone.height = SCOPE.icons.size;

    // Draw icon
    if ( game.settings.get("scope", "dropShadow") ) {
      let dropShadow = new PIXI.filters.DropShadowFilter();
      this.icon.filters = [dropShadow];
    }
    this.icon.texture = this.texture;
    this.icon.width = this.iconWidth;
    this.icon.height = this.iconHeight;
    this.icon.tint = Number.isNumeric(this.tintColor) ? this.tintColor : 0xFFFFFF;

    return this;
  }

  /* -------------------------------------------- */

  _onHoverIn(event) {
    this.border.visible = true;
  }

  _onHoverOut(event) {
    this.border.visible = false;
  }
}

export class BaseScope extends foundry.abstract.Document {
  /** @inheritDoc */
  static get schema() {
    return ScopeData;
  }

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      name: "Note",
      collection: "notes",
      label: "something",
      isEmbedded: true,
      permissions: {
        create: "NOTE_CREATE"
      }
    });
  };

  /** @inheritdoc */
  testUserPermission(user, permission, {exact=false}={}) {
    if ( user.isGM ) return true;                   // Game-masters always have control
    if ( !this.data.entryId ) return true;          // Players can create un-linked notes
    if ( !this.entry ) return false;                // Otherwise permission comes through the JournalEntry
    return this.entry.testUserPermission(user, permission, exact);
  }
}

export class ScopeDocument extends CanvasDocumentMixin(BaseScope) {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The associated JournalEntry which is referenced by this Note
   * @type {JournalEntry}
   */
  get entry() {
    return game.journal.get(this.data.entryId);
  }

  /* -------------------------------------------- */

  /**
   * The text label used to annotate this Note
   * @type {string}
   */
  get label() {
    return this.data.text || this.entry?.name || "Unknown";
  }
}
