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

  Drawing.prototype._drawFreehand = function() {
    let factor = this.data.bezierFactor ?? 0.5;

    if ( game.settings.get("scope", "dropShadow") ) {
      let dropShadow = new PIXI.filters.DropShadowFilter();
      dropShadow.distance = 2;
      dropShadow.blur = 1;
      this.shape.filters = [dropShadow];
    }

    // Get drawing points
    let points = this.data.points;
    let last = points[points.length - 1];
    let isClosed = points[0].equals(last);

    // Handle edge cases
    this.shape.moveTo(...points[0]);
    if ( points.length < 2 ) return;
    else if ( points.length === 2 ) {
      this.shape.lineTo(...points[1]);
      return;
    }

    // Set initial conditions
    let [previous, point] = points.slice(0, 2);
    if ( this.data.fillType ) points = points.concat([previous, point]);
    let cp0 = this._getBezierControlPoints(factor, last, previous, point).next_cp0;
    let cp1, next_cp0, next;

    // Begin iteration
    for ( let i = 1; i < points.length; i++ ) {
      next = points[i+1];
      if ( next ) {
        let bp = this._getBezierControlPoints(factor, previous, point, next);
        cp1 = bp.cp1;
        next_cp0 = bp.next_cp0;
      }

      // First point
      if ( (i === 1) && !isClosed ) {
        this.shape.quadraticCurveTo(cp1.x, cp1.y, point[0], point[1]);
      }

      // Last Point
      else if ( (i === points.length - 1) && !isClosed ) {
        this.shape.quadraticCurveTo(cp0.x, cp0.y, point[0], point[1]);
      }

      // Bezier points
      else {
        this.shape.bezierCurveTo(cp0.x, cp0.y, cp1.x, cp1.y, point[0], point[1]);
      }

      // Increment
      previous = point;
      point = next;
      cp0 = next_cp0;
    }

  }
}