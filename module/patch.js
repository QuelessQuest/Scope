import {ScopeControlIcon} from "./scope-classes.js";

/**
 * Modify the functionality of Notes to:
 *  - Always have the tooltip visible
 *  - Allow for non-square notes
 *  - Allow the explicit setting of the text stroke color
 */
export function patchCore() {

  Note.prototype.refresh = function () {
    this.position.set(this.data.x, this.data.y);
    this.controlIcon.border.visible = this._hover;
    this.tooltip.visible = true;
    this.visible = this.entry?.testUserPermission(game.user, "LIMITED") ?? true;
    return this;
  }

  Note.prototype._drawControlIcon = function () {
    let tint = this.data.iconTint ? foundry.utils.colorStringToHex(this.data.iconTint) : null;
    let iconWidth = this.document.getFlag("scope", "iconWidth") || 360;
    let iconHeight = this.document.getFlag("scope", "iconHeight") || 160;
    let nbc = this.document.getFlag("scope", "noteBorderColor");
    let borderColor = foundry.utils.colorStringToHex(nbc);
    let borderColorHalf = foundry.utils.colorStringToHex(`${nbc}80`);
    let tone = this.document.getFlag("scope", "tone");
    let icon = new ScopeControlIcon({texture: this.data.icon, iconWidth: iconWidth, iconHeight: iconHeight, borderColor: borderColor, borderColorHalf: borderColorHalf, tint: tint, tone: tone});
    icon.x -= (iconWidth / 2);
    icon.y -= (iconHeight / 2);
    return icon;
  }

  Note.prototype._getTextStyle = function () {
    const style = CONFIG.canvasTextStyle.clone();

    // Positioning
    if ( this.data.textAnchor === CONST.TEXT_ANCHOR_POINTS.LEFT ) style.align = "right";
    else if ( this.data.textAnchor === CONST.TEXT_ANCHOR_POINTS.RIGHT ) style.align = "left";

    // Font preferences
    style.fontFamily = this.data.fontFamily || CONFIG.defaultFontFamily;
    style.fontSize = this.data.fontSize;

    const color = this.data.textColor ? colorStringToHex(this.data.textColor) : 0xFFFFFF;
    const hsv = foundry.utils.rgbToHsv(...foundry.utils.hexToRGB(color));
    style.wordWrap = true;
    style.fill = color;
    style.stroke = foundry.utils.colorStringToHex(this.document.getFlag("scope", "labelBorderColor"));
    style.stroke = hsv[2] > 0.6 ? 0x000000 : 0xFFFFFF;
    style.wordWrapWidth = this.data.iconSize;
    return style;
  }

}