import {SCOPE} from "./config.js";
import {CardScope} from "./scope-classes.js";
import {droppedOn} from "./helper.js";
import {isEmpty} from "./helper.js";
import {getFromTheme} from "./helper.js";

export class CardList {
  /**
   * A double linked list of card types, including the lines that link them
   * @param sortDirection {String}
   * @param type {String}
   */
  constructor(sortDirection, type) {
    this.head = null;
    this.sortDirection = sortDirection;
    this.type = type;
    this.size = 0;
    this._canRefresh = true;
    this.parent = null;
  }

  lockRefresh() {
    this._canRefresh = false;
  }

  unlockRefresh() {
    this._canRefresh = true;
  }

  get canRefresh() {
    return this._canRefresh;
  }

  /**
   * Add an element to the list, based on the items screen location
   * @param {NoteDocument}  note
   * @param {boolean}       clearDrawing default true
   * @returns {CardScope}
   */
  async add(note, clearDrawing = true) {
    let card = new CardScope(note);
    card.children = new CardList(SCOPE.sortDirection.opposite[this.sortDirection], SCOPE.relationships[this.type].child);
    if ( this.head ) {
      let scene = game.scenes.getName("Scope");
      let targetCard = this._findTargetCard(this.sortDirection, note.data[this.sortDirection], this.head);
      if ( targetCard ) {
        const shiftIt = droppedOn(scene, note, targetCard);

        if ( clearDrawing && targetCard.connectors.next[this.sortDirection] )
          try {
            await scene.deleteEmbeddedDocuments("Drawing", [targetCard.connectors.next[this.sortDirection]]);
          } catch (ex) {
            console.log("Attempted to delete a non-existent drawing. Just carry on.");
          }

        // Establish next next/prev on new card before creating connections. This allows the cards to
        // be shifted, if necessary, and only draw the connections once.
        card.prev = targetCard;
        card.order = targetCard.order + 1;
        if ( targetCard.next ) {
          card.next = targetCard.next;
          this.incrementOrderFrom(card.next);
        }

        if ( shiftIt !== null && !isEmpty(shiftIt) ) await this._shiftFrom(shiftIt);

        let cid = await this._createConnection(scene, targetCard, card);
        if (this.sortDirection === SCOPE.sortDirection.horizontal) {
          card.connectors.prev = {x: cid, y: ""};
          targetCard.connectors.next = {x: cid, y: ""};
        } else {
          card.connectors.prev = {x: "", y: cid};
          targetCard.connectors.next = {x: "", y: cid};
        }

        if ( targetCard.next ) {
          targetCard.next.prev = card;
          cid = await this._createConnection(scene, card, targetCard.next);
          if (this.sortDirection === SCOPE.sortDirection.horizontal) {
            card.connectors.next = {x: cid, y: ""};
            targetCard.next.connectors.prev = {x: cid, y: ""};
          } else {
            card.connectors.next = {x: "", y: cid};
            targetCard.next.connectors.prev = {x: "", y: cid};
          }
        }
        targetCard.next = card;
        console.log("HERE");
      }
    } else {
      this.head = card;
    }

    this.size++;
    return card;
  }

  /**
   * Remove a card from the list
   */
  async remove(noteId) {

    let card = this.findCard("noteId", noteId);
    if ( !card ) {
      let ptr = this.head;
      while (ptr) {
        if ( ptr.children.head != null ) {
          if ( await ptr.children.remove(noteId) ) return;
        }
        ptr = ptr.next;
      }
    }
    if ( !card ) return false;

    let removeDrawings = [];
    let scene = game.scenes.getName("Scope");

    // Is the head of the list being removed?
    if ( this.head.id === card.id ) {
      this.head = card.next;
      if ( this.head ) {
        this.head.prev = null;
        removeDrawings.push(this.head.connectors.prev[this.sortDirection])
      }
      if ( this.parent ) {
        removeDrawings.push(this.parent.connectors.next[this.sortDirection]);
        if ( this.head ) {
          let cid = await this._createConnection(scene, this.parent, this.head);
          if (this.sortDirection === SCOPE.sortDirection.horizontal) {
            this.head.connectors.prev = {x: cid, y: ""};
            this.parent.connectors.next = {x: cid, y: ""};
          } else {
            this.head.connectors.prev = {x: "", y: cid};
            this.parent.connectors.next = {x: "", y: cid};
          }
        }
      }
      try {
        await scene.deleteEmbeddedDocuments("Drawing", removeDrawings);
      } catch (ex) {
        console.log("Attempted to delete a non-existent drawing. Just carry on.");
      }
      return;
    }

    if ( card.prev )
      card.prev.next = card.next;
    if ( card.next )
      card.next.prev = card.prev;

    if ( card.connectors.prev[this.sortDirection] ) removeDrawings.push(card.connectors.prev[this.sortDirection]);
    if ( card.connectors.next[this.sortDirection] ) removeDrawings.push(card.connectors.next[this.sortDirection]);

    try {
      await scene.deleteEmbeddedDocuments("Drawing", removeDrawings);
    } catch (ex) {
      console.log("Attempted to delete a non-existent drawing. Just carry on.");
    }

    if ( card.prev ) {
      let did = await this._createConnection(scene, card.prev, card.next);
      if ( card.prev.next ) {
        if (this.sortDirection === SCOPE.sortDirection.horizontal) {
          card.prev.next.connectors.prev = {x: did, y: ""};
          card.prev.connectors.next = {x: did, y: ""};
        } else {
          card.prev.next.connectors.prev = {x: "", y: did};
          card.prev.connectors.next = {x: "", y: did};
        }
      }
    }
    this.size--;
  }

  /**
   * Get all the cards in this list as a map of the card Id and the card name.
   */
  getCardsIdNamePair() {
    let ptr = this.head;
    const data = {};
    while (ptr) {
      data[ptr.id] = ptr.name;
      ptr = ptr.next;
    }
    return data;
  }

  /**
   * Return the last card in this list
   * @returns {null|*}
   */
  getLast() {
    let ptr = this.head;
    if ( ptr === null ) return ptr;
    while (ptr.next) {
      ptr = ptr.next;
    }
    return ptr;
  }

  /**
   *
   * @param {CardScope} card
   */
  incrementOrderFrom(card) {
      card.order = card.order + 1;
      if (card.next) this.incrementOrderFrom(card.next);
  }

  /**
   * Find the card in the list that matches the provided field with the given value.
   * This will only search the list, not any children.
   * @param field {string}
   * @param value {string}
   * @param ptr {CardScope}
   * @returns {null|CardScope}
   */
  findCard(field, value, ptr = this.head) {
    if ( ptr[field] === value ) return ptr;
    if ( ptr.next ) return this.findCard(field, value, ptr.next);
    return null;
  }

  /**
   * Redraws the connections for a card given the new coordinates. This will
   * recursively search children as well.
   * @param noteId {string}
   * @param x {number}
   * @param y {number}
   */
  async updateCard(noteId, {x, y}) {
    let card = this.findCard("noteId", noteId);
    if ( !card ) {
      let ptr = this.head;
      while (ptr) {
        if ( ptr.children.head != null ) {
          if ( await ptr.children.updateCard(noteId, {x: x, y: y}) ) return;
        }
        ptr = ptr.next;
      }
    }
    if ( !card ) return false;

    if ( game.settings.get("Scope", "attached") && card.children.head !== null ) {
      const dx = x - card.x;
      const dy = y - card.y;
      await card.children._shiftList(dx, dy);
    }

    card.x = x;
    card.y = y;
    let drawingIds = [];
    // Remove next/prev connectors
    if ( card.next ) drawingIds.push(card.connectors.next[this.sortDirection]);
    if ( card.prev ) drawingIds.push(card.connectors.prev[this.sortDirection]);
    // If moving a parent card, removed parent card -> head connector
    if ( card.children.head !== null ) drawingIds.push(card.connectors.next[SCOPE.sortDirection.opposite[this.sortDirection]]);
    // If moving the head of a child list, remove the head -> parent connector
    if ( this.parent && this.head.id === card.id ) drawingIds.push(card.connectors.prev[this.sortDirection]);

    let scene = game.scenes.getName("Scope");
    try {
      await scene.deleteEmbeddedDocuments("Drawing", drawingIds);
    } catch (ex) {
      console.log("Attempted to delete a non-existent drawing. Just carry on.");
    }

    // Re-establish next connector
    if ( card.next ) {
      const cid = await this._createConnection(scene, card, card.next);
      if (this.sortDirection === SCOPE.sortDirection.horizontal) {
        card.next.connectors.prev = {x: cid, y: ""};
        card.connectors.next = {x: cid, y: ""};
      } else {
        card.next.connectors.prev = {x: "", y: cid};
        card.connectors.next = {x: "", y: cid};
      }
    }

    // Re-establish prev connector
    if ( card.prev ) {
      const cid = await this._createConnection(scene, card.prev, card);
      if (this.sortDirection === SCOPE.sortDirection.horizontal) {
        card.connectors.prev = {x: cid, y: ""};
        card.prev.connectors.next = {x: cid, y: ""};
      } else {
        card.connectors.prev = {x: "", y: cid};
        card.prev.connectors.next = {x: "", y: cid};
      }
    }

    // Re-establish parent -> child list connector
    if ( card.children.head !== null ) {
      const cid = await card.children._createConnection(scene, card, card.children.head);
      if (this.sortDirection === SCOPE.sortDirection.horizontal) {
        card.connectors.next = {x: "", y: cid};
      } else {
        card.connectors.next = {x: cid, y: ""};
      }
      if (card.children.sortDirection === SCOPE.sortDirection.horizontal) {
        card.children.head.connectors.prev = {x: cid, y: ""};
      } else {
        card.children.head.connectors.prev = {x: "", y: cid};
      }
    }

    // Re-establish child list head -> parent connector
    if ( this.parent && this.head.id === card.id ) {
      const cid = await this._createConnection(scene, this.parent, card);
      if (this.sortDirection === SCOPE.sortDirection.horizontal) {
        card.connectors.prev = {x: cid, y: ""};
        this.parent.connectors.next = {x: cid, y: ""};
      } else {
        card.connectors.prev = {x: "", y: cid};
        this.parent.connectors.next = {x: "", y: cid};
      }
    }

    return true;
  }

  /**
   * Shift every card and note in this list by the amound provided
   * @param dx {number}
   * @param dy {number}
   * @returns {Promise<void>}
   * @private
   */
  async _shiftList(dx, dy) {
    game.scope.period.lockRefresh();
    let ptr = this.head;
    while (ptr) {
      ptr.x = ptr.x + dx;
      ptr.y = ptr.y + dy;
      await canvas.notes.get(ptr.noteId).update({x: ptr.x, y: ptr.y});
      ptr = ptr.next;
    }
    await this.refresh();
    game.scope.period.unlockRefresh();
  }

  /**
   * Arrange this list, returning any child lists to be arranged
   * @param bookend {boolean}
   * @returns {Promise<{drawingIds: [string], childLists: [CardList]}>}
   */
  async arrangeList(bookend) {

    let scene = game.scenes.getName("Scope");
    let drawingIds = [];
    let childLists = [];

    if ( this.head.children.head !== null ) childLists.push(this.head.children);
    if ( this.parent ) {
      drawingIds.push(this.head.connectors.prev[this.sortDirection]);
      const cid = await this._createConnection(scene, this.parent, this.head);
      this.parent.connectors.next[this.sortDirection] = cid;
      this.head.connectors.prev[this.sortDirection] = cid;
    }
    let ptr = this.head.next;
    while (ptr) {
      if ( ptr.children.head !== null ) childLists.push(ptr.children);
      const newLocation = this._getNewLocation(ptr);
      await canvas.notes.get(ptr.noteId).update(newLocation);
      ptr.x = newLocation.x;
      ptr.y = newLocation.y;
      drawingIds.push(ptr.connectors.prev[this.sortDirection]);
      const cid = await this._createConnection(scene, ptr.prev, ptr);
      ptr.prev.connectors.next[this.sortDirection] = cid;
      ptr.connectors.prev[this.sortDirection] = cid;
      if ( ptr.next ) {
        // If the next card is the last card in the list. Only move it if we are NOT
        // arranging by bookends.
        if ( !ptr.next.next && bookend ) {
          drawingIds.push(ptr.connectors.next[this.sortDirection]);
          const eid = await this._createConnection(scene, ptr, ptr.next);
          ptr.connectors.next[this.sortDirection] = eid;
          ptr.next.connectors.prev[this.sortDirection] = eid;
          ptr = null;
        } else ptr = ptr.next;
      } else ptr = ptr.next;
    }
    return {childLists: childLists, drawingIds: drawingIds};
  }

  /**
   * Determine the new location of this card based on the previous cards location and configured
   * spacing.
   * @param ptr {CardScope}
   * @returns {{x: number, y: number}}
   * @private
   */
  _getNewLocation(ptr) {
    let x;
    let y;

    if ( this.sortDirection === SCOPE.sortDirection.horizontal ) {
      x = ptr.prev.x + SCOPE.noteSettings[this.type].spacing.x + game.settings.get("Scope", "spacing");
      y = ptr.prev.y;
    } else {
      x = ptr.prev.x;
      y = ptr.prev.y + SCOPE.noteSettings[this.type].spacing.y + game.settings.get("Scope", "spacing");
    }

    return {x: x, y: y};
  }

  /**
   * Update the on screen layout of all cards according to the theme settings
   * @param point {{x, y}}
   * @param ptr {CardScope}
   * @returns {Promise<void>}
   */
  async _arrange(point, ptr) {
    let note = canvas.notes.get(ptr.noteId);
    note.update(point);
    // TODO - Process children
    if ( ptr.next ) {
      await this._arrange(this._getSpacedPoint(ptr), ptr.next);
    }
  }

  _getSpacedPoint(card) {
    return {x: card.x + SCOPE.noteSettings[this.type].spacing.x, y: card.y + SCOPE.noteSettings[this.type].spacing.y};
  }

  /**
   * Given a card, find the insertion point that would follow the card. Shift others,
   * if necessary
   * @param cardId {string}
   * @returns {{x: number, y: number}}
   */
  getInsertPosition(cardId) {
    let card = this.findCard("id", cardId);
    if ( card ) return this._getSpacedPoint(card);
    return {x: 0, y: 0};
  }

  /**
   * Remove all current connectors and recreate. This only applies to this list
   * as children are not refreshed.
   */
  async refresh() {
    if ( !this.head ) return;

    let drawingIds = [];
    let currentList = [];

    let ptr = this.head;
    while (ptr.next) {
      drawingIds.push(ptr.connectors.next[this.sortDirection]);
      currentList.push(canvas.notes.get(ptr.noteId));
      ptr = ptr.next;
    }
    currentList.push(canvas.notes.get(ptr.noteId));

    let scene = game.scenes.getName("Scope");
    try {
      await scene.deleteEmbeddedDocuments("Drawing", removeDrawings);
    } catch (ex) {
      console.log("Attempted to delete a non-existent drawing. Just carry on.");
    }

    this.head = null;
    this.size = 0;

    for (let note of currentList) {
      await this.add(note, false);
    }
  }

  async attach(type, note, cardId) {
    let scene = game.scenes.getName("Scope");
    let targetCard;
    if ( cardId ) {
      targetCard = this.findCard("id", cardId);
    } else {
      // TODO - More detailed logic here
      targetCard = this._findByNearest(note.data[this.sortDirection], this.head);
    }
    if ( !targetCard.children ) targetCard.children = new CardList(
        SCOPE.sortDirection.opposite[this.sortDirection],
        type);

    if ( targetCard.children.head === null ) targetCard.children.parent = targetCard;
    let card = await targetCard.children.add(note);
    let children = targetCard.children;
    if ( !children.head.connectors.prev[children.sortDirection] ) {
      let cid = await children._createConnection(scene, targetCard, card);
      targetCard.connectors.next[children.sortDirection] = cid;
      children.head.connectors.prev[children.sortDirection] = cid;
    }

    return {cardId: card.id, attachId: targetCard.id};
  }

  /**
   * Given a point {x, y}, determine if that point is inside any on scree
   * card. If so, return the noteId of the intersecting card.
   * @param point {{x: number, y: number}}
   * @param ptr {CardScope}
   * @returns {string|null}
   */
  findByLocation(point, ptr = this.head) {
    if ( SCOPE.bump.hitTestPoint(point, game.notes.get(ptr.noteId)) ) return ptr.noteId;
    if ( ptr.next )
      return this.findByLocation(point, ptr.next);
    else
      return null;
  }

  /**
   * Find the note in the list nearest to the given coordinates. This lists sort direction
   * is used to determine nearest.
   * @param v {number}
   * @param ptr {CardScope}
   * @returns {CardScope}
   * @private
   */
  _findByNearest(v, ptr) {
    if ( v >= ptr[this.sortDirection] ) {
      if ( ptr.next ) {
        if ( v <= ptr.next[this.sortDirection] ) {
          if ( v - ptr[this.sortDirection] <= ptr.next[this.sortDirection] - v )
            return ptr;
          else
            return ptr.next;
        } else {
          return this._findByNearest(v, ptr.next);
        }
      } else {
        return ptr;
      }
    }
  }

  /**
   * Find the card after which the given card should be inserted based on
   * screen location.
   * @param link {String} The link direction to check (x/y)
   * @param value {Number} The direction screen location
   * @param ptr {CardScope} The card to be inserted
   * @returns {CardScope}
   * @private
   */
  _findTargetCard(link, value, ptr) {
    if ( value > ptr[link] ) {
      if ( ptr.next ) {
        if ( value > ptr.next[link] ) {
          return this._findTargetCard(link, value, ptr.next);
        } else {
          return ptr;
        }
      } else {
        return ptr;
      }
    } else {
      return ptr;
    }
  }

  /**
   * Create the drawing element that connects two cards
   * @param scene
   * @param card1 {CardScope}
   * @param card2 {CardScope}
   * @private
   */
  async _createConnection(scene, card1, card2) {

    if ( !card1 || !card2 ) return;
    let options = {};
    options = Object.assign(options, SCOPE.connectors);
    let points = [[0, 0], [card2.x - card1.x, card2.y - card1.y]];
    let dynamicOptions = {
      x: card1.x,
      y: card1.y,
      points: points,
      width: card2.x - card1.x,
      height: Math.abs(card2.y - card1.y),
      strokeColor: getFromTheme("period-link-color")
    }

    foundry.utils.mergeObject(options, dynamicOptions);
    let d = await DrawingDocument.create(options, {parent: canvas.scene});
    //scene.createEmbeddedDocuments("Drawing", [d]);
    return d.data._id;
  }

  /**
   * Shift the card and all cards/children after this card by the amount
   * @param card {CardScope}
   * @param amount {number}
   * @returns {Promise<void>}
   * @private
   */
  async _shiftFrom({card, amount}) {
    this.lockRefresh();
    console.log(`Shift ${card.name} by ${amount}`);
    card[this.sortDirection] += amount;
    await canvas.notes.get(card.noteId).update({x: card.x, y: card.y});
    this.unlockRefresh();
    /*
        SCOPE.updateRefresh = false;
        let ptr = card;
        while (ptr) {
          card[this.sortDirection] += amount;
          await canvas.notes.get(card.noteId).update({x: card.x, y: card.y});
          // TODO - Shift Children
          ptr = ptr.next;
        }

        SCOPE.updateRefresh = true;

     */
    //await this.refresh();
  }

}