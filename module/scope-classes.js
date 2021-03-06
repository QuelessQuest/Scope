import {SCOPE} from "./config.js";

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
    if (this.border) this.border.clear();
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