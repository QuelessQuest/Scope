import {SCOPE} from "./config.js";
import {CardScope} from "./scope-classes.js";
import {droppedOn} from "./helper.js";
import {isEmpty} from "./helper.js";
import {getFromTheme} from "./helper.js";

export class CardList {
  /**
   * I'm sure there is a better way to do this. But this works for now.
   *
   * A double linked list of card types, including the lines that link them
   * @param {string}  sortDirection
   * @param {string}  type
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
   * @param {Boolean}       clearDrawing default true
   * @returns {CardScope}
   */
  async add(note, clearDrawing = true) {
    let card = new CardScope(note);
    card.children = new CardList(SCOPE.sortDirection.opposite[this.sortDirection], SCOPE.relationships[this.type].child);
    if (this.head) {
      let scene = game.scenes.getName("scope");
      let dataDirection = this.sortDirection === SCOPE.sortDirection.horizontal ? note.data.x : note.data.y;
      let targetCard = this._findTargetCard(this.sortDirection, dataDirection, this.head);
      if (targetCard) {
        const shiftIt = droppedOn(scene, note, targetCard);
        let targetDirection = this.sortDirection === SCOPE.sortDirection.horizontal ? targetCard.connectors.next.x : targetCard.connectors.next.y;

        if (clearDrawing && targetDirection)
          try {
            await scene.deleteEmbeddedDocuments("Drawing", [targetDirection]);
          } catch (ex) {
            console.log("Attempted to delete a non-existent drawing. Just carry on.");
          }

        // Establish next next/prev on new card before creating connections. This allows the cards to
        // be shifted, if necessary, and only draw the connections once.
        card.prev = targetCard;
        card.order = targetCard.order + 1;
        if (targetCard.next) {
          card.next = targetCard.next;
          this.incrementOrderFrom(card.next);
        }

        if (shiftIt !== null && !isEmpty(shiftIt)) await this._shiftFrom(shiftIt);

        let cid = await this._createConnection(scene, targetCard, card);
        if (this.sortDirection === SCOPE.sortDirection.horizontal) {
          card.connectors.prev.x = cid;
          targetCard.connectors.next.x = cid;
        } else {
          card.connectors.prev.y = cid;
          targetCard.connectors.next.y = cid;
        }

        if (targetCard.next) {
          targetCard.next.prev = card;
          cid = await this._createConnection(scene, card, targetCard.next);
          if (this.sortDirection === SCOPE.sortDirection.horizontal) {
            card.connectors.next.x = cid;
            targetCard.next.connectors.prev.x = cid;
          } else {
            card.connectors.next.y = cid;
            targetCard.next.connectors.prev.y = cid;
          }
        }
        targetCard.next = card;
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
    if (!card) {
      let ptr = this.head;
      while (ptr) {
        if (ptr.children.head != null) {
          if (await ptr.children.remove(noteId)) return;
        }
        ptr = ptr.next;
      }
    }
    if (!card) return false;

    let removeDrawings = [];
    let scene = game.scenes.getName("scope");

    // Is the head of the list being removed?
    if (this.head.id === card.id) {
      let prevDrawing = this.sortDirection === SCOPE.sortDirection.horizontal ? this.head.connectors.prev.x : this.head.connectors.prev.y;
      let nextDrawing = this.sortDirection === SCOPE.sortDirection.horizontal ? this.head.connectors.next.x : this.head.connectors.next.y;
      this.head = card.next;
      if (this.head) {
        this.head.prev = null;
        this.decrementOrderFrom(this.head);
        removeDrawings.push(prevDrawing)
      }
      if (this.parent) {
        removeDrawings.push(nextDrawing);
        if (this.head) {
          let cid = await this._createConnection(scene, this.parent, this.head);
          if (this.sortDirection === SCOPE.sortDirection.horizontal) {
            this.head.connectors.prev.x = cid;
            this.parent.connectors.next.x = cid;
          } else {
            this.head.connectors.prev.y = cid;
            this.parent.connectors.next.y = cid;
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

    if (card.prev)
      card.prev.next = card.next;
    if (card.next)
      card.next.prev = card.prev;

    this.decrementOrderFrom(card);

    let prevDrawing = this.sortDirection === SCOPE.sortDirection.horizontal ? card.connectors.prev.x : card.connectors.prev.y;
    let nextDrawing = this.sortDirection === SCOPE.sortDirection.horizontal ? card.connectors.next.x : card.connectors.next.y;
    if (prevDrawing) removeDrawings.push(prevDrawing);
    if (nextDrawing) removeDrawings.push(nextDrawing);

    try {
      await scene.deleteEmbeddedDocuments("Drawing", removeDrawings);
    } catch (ex) {
      console.log("Attempted to delete a non-existent drawing. Just carry on.");
    }

    if (card.prev) {
      let did = await this._createConnection(scene, card.prev, card.next);
      if (card.prev.next) {
        if (this.sortDirection === SCOPE.sortDirection.horizontal) {
          card.prev.next.connectors.prev.x = did;
          card.prev.connectors.next.x = did;
        } else {
          card.prev.next.connectors.prev.y = did;
          card.prev.connectors.next.y = did;
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
    if (ptr === null) return ptr;
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
   *
   * @param {CardScope} card
   */
  decrementOrderFrom(card) {
    card.order = card.order - 1;
    if (card.next) this.decrementOrderFrom(card.next);
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
    if (ptr[field] === value) return ptr;
    if (ptr.next) return this.findCard(field, value, ptr.next);
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
    if (!card) {
      let ptr = this.head;
      while (ptr) {
        if (ptr.children.head != null) {
          if (await ptr.children.updateCard(noteId, {x: x, y: y})) return;
        }
        ptr = ptr.next;
      }
    }
    if (!card) return false;

    if (game.settings.get("scope", "attached") && card.children.head !== null) {
      const dx = x - card.x;
      const dy = y - card.y;
      await card.children._shiftList(dx, dy);
    }

    card.x = x;
    card.y = y;
    let drawingIds = [];
    // Remove next/prev connectors
    let prevDrawing = this.sortDirection === SCOPE.sortDirection.horizontal ? card.connectors.prev.x : card.connectors.prev.y;
    let nextDrawing = this.sortDirection === SCOPE.sortDirection.horizontal ? card.connectors.next.x : card.connectors.next.y;
    if (card.next) drawingIds.push(nextDrawing);
    if (card.prev) drawingIds.push(prevDrawing);
    // If moving a parent card, removed parent card -> head connector
    let oppositeDrawing = this.sortDirection === SCOPE.sortDirection.horizontal ? card.connectors.next.y : card.connectors.next.x;
    if (card.children.head !== null) drawingIds.push(oppositeDrawing);
    // If moving the head of a child list, remove the head -> parent connector
    if (this.parent && this.head.id === card.id) drawingIds.push(card.connectors.prev[this.sortDirection]);

    let scene = game.scenes.getName("scope");
    try {
      await scene.deleteEmbeddedDocuments("Drawing", drawingIds);
    } catch (ex) {
      console.log("Attempted to delete a non-existent drawing. Just carry on.");
    }

    // Re-establish next connector
    if (card.next) {
      const cid = await this._createConnection(scene, card, card.next);
      if (this.sortDirection === SCOPE.sortDirection.horizontal) {
        card.next.connectors.prev.x = cid;
        card.connectors.next.x = cid;
      } else {
        card.next.connectors.prev.y = cid;
        card.connectors.next.y = cid;
      }
    }

    // Re-establish prev connector
    if (card.prev) {
      const cid = await this._createConnection(scene, card.prev, card);
      if (this.sortDirection === SCOPE.sortDirection.horizontal) {
        card.connectors.prev.x = cid;
        card.prev.connectors.next.x = cid;
      } else {
        card.connectors.prev.y = cid;
        card.prev.connectors.next.y = cid;
      }
    }

    // Re-establish parent -> child list connector
    if (card.children.head !== null) {
      const cid = await card.children._createConnection(scene, card, card.children.head);
      if (this.sortDirection === SCOPE.sortDirection.horizontal) {
        card.connectors.next.y = cid;
      } else {
        card.connectors.next.x = cid;
      }
      if (card.children.sortDirection === SCOPE.sortDirection.horizontal) {
        card.children.head.connectors.prev.x = cid;
      } else {
        card.children.head.connectors.prev.y = cid;
      }
    }

    // Re-establish child list head -> parent connector
    if (this.parent && this.head.id === card.id) {
      const cid = await this._createConnection(scene, this.parent, card);
      if (this.sortDirection === SCOPE.sortDirection.horizontal) {
        card.connectors.prev.x = cid;
        this.parent.connectors.next.x = cid;
      } else {
        card.connectors.prev.y = cid;
        this.parent.connectors.next.y = cid;
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

    let scene = game.scenes.getName("scope");
    let drawingIds = [];
    let childLists = [];

    if (this.head.children.head !== null) childLists.push(this.head.children);
    if (this.parent) {
      let headPrev = this.sortDirection === SCOPE.sortDirection.horizontal ? this.head.connectors.prev.x : this.head.connectors.prev.y;
      drawingIds.push(headPrev);
      const cid = await this._createConnection(scene, this.parent, this.head);
      if (this.sortDirection === SCOPE.sortDirection.horizontal) {
        this.parent.connectors.next.x = cid;
        this.head.connectors.prev.x = cid;
      } else {
        this.parent.connectors.next.y = cid;
        this.head.connectors.prev.y = cid;
      }
    }
    let ptr = this.head.next;
    while (ptr) {
      if (ptr.children.head !== null) childLists.push(ptr.children);
      const newLocation = this._getNewLocation(ptr);
      await canvas.notes.get(ptr.noteId).update(newLocation);
      ptr.x = newLocation.x;
      ptr.y = newLocation.y;
      let connPrev = this.sortDirection === SCOPE.sortDirection.horizontal ? ptr.connectors.prev.x : ptr.connectors.prev.y;
      drawingIds.push(connPrev);
      const cid = await this._createConnection(scene, ptr.prev, ptr);
      if (this.sortDirection === SCOPE.sortDirection.horizontal) {
        ptr.prev.connectors.next.x = cid;
        ptr.connectors.prev.x = cid;
      } else {
        ptr.prev.connectors.next.y = cid;
        ptr.connectors.prev.y = cid;
      }
      if (ptr.next) {
        // If the next card is the last card in the list. Only move it if we are NOT
        // arranging by bookends.
        if (!ptr.next.next && bookend) {
          let c = this.sortDirection === SCOPE.sortDirection.horizontal ? ptr.connectors.next.x : ptr.connectors.next.y;
          drawingIds.push(c);
          const eid = await this._createConnection(scene, ptr, ptr.next);
          if (this.sortDirection === SCOPE.sortDirection.horizontal) {
            ptr.connectors.next.x = eid;
            ptr.next.connectors.prev.x = eid;
          } else {
            ptr.connectors.next.y = eid;
            ptr.next.connectors.prev.y = eid;
          }
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

    if (this.sortDirection === SCOPE.sortDirection.horizontal) {
      x = ptr.prev.x + SCOPE.noteSettings[this.type].spacing.x + game.settings.get("scope", "spacing");
      y = ptr.prev.y;
    } else {
      x = ptr.prev.x;
      y = ptr.prev.y + SCOPE.noteSettings[this.type].spacing.y + game.settings.get("scope", "spacing");
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
    if (ptr.next) {
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
    if (card) return this._getSpacedPoint(card);
    return {x: 0, y: 0};
  }

  /**
   * Remove all current connectors and recreate. This only applies to this list
   * as children are not refreshed.
   */
  async refresh() {
    if (!this.head) return;

    let drawingIds = [];
    let currentList = [];

    let ptr = this.head;
    while (ptr.next) {
      let c = this.sortDirection === SCOPE.sortDirection.horizontal ? ptr.connectors.next.x : ptr.connectors.next.y;
      drawingIds.push(c);
      currentList.push(canvas.notes.get(ptr.noteId));
      ptr = ptr.next;
    }
    currentList.push(canvas.notes.get(ptr.noteId));

    let scene = game.scenes.getName("scope");
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

  /**
   *
   * @param {string}        type
   * @param {NoteDocument}  note
   * @param {string}         cardId
   * @returns {Promise<*>}
   */
  async attach(type, note, cardId) {
    let scene = game.scenes.getName("scope");
    let searchDirection = "";
    if (type === "event") searchDirection = SCOPE.sortDirection.horizontal;
    let targetCard;
    if (cardId && cardId !== "none") {
      targetCard = this.findCard("id", cardId);
    } else {
      // TODO - More detailed logic here
      let noteLocation = searchDirection === SCOPE.sortDirection.horizontal ? note.data.x : note.data.y;
      targetCard = this._findByNearest(this.head, noteLocation, searchDirection);
    }
    if (!targetCard.children) targetCard.children = new CardList(
      SCOPE.sortDirection.opposite[this.sortDirection],
      type);

    if (targetCard.children.head === null) targetCard.children.parent = targetCard;
    let card = await targetCard.children.add(note);
    card.group = targetCard.children.parent.noteId;

    let children = targetCard.children;
    let headPrevious = children.sortDirection === SCOPE.sortDirection.horizontal ? children.head.connectors.prev.x : children.head.connectors.prev.y;
    if (!headPrevious) {
      let cid = await children._createConnection(scene, targetCard, card);
      if (children.sortDirection === SCOPE.sortDirection.horizontal) {
        targetCard.connectors.next.x = cid;
        children.head.connectors.prev.x = cid;
      } else {
        targetCard.connectors.next.y = cid;
        children.head.connectors.prev.y = cid;
      }
    }

    return card;
  }

  /**
   * Given a point {x, y}, determine if that point is inside any on scree
   * card. If so, return the noteId of the intersecting card.
   * @param point {{x: number, y: number}}
   * @param ptr {CardScope}
   * @returns {string|null}
   */
  findByLocation(point, ptr = this.head) {
    if (SCOPE.bump.hitTestPoint(point, game.notes.get(ptr.noteId))) return ptr.noteId;
    if (ptr.next)
      return this.findByLocation(point, ptr.next);
    else
      return null;
  }

  /**
   * Find the note in the list nearest to the given coordinates. This lists sort direction
   * is used to determine nearest.
   * @param {CardScope}   ptr
   * @param {number}      findNear
   * @param {string}      searchDirection
   * @returns {CardScope}
   * @private
   */
  _findByNearest(ptr, findNear, searchDirection) {
    if (findNear >= ptr[searchDirection]) {
      if (ptr.next) {
        if (findNear <= ptr.next[searchDirection]) {
          if (findNear - ptr[searchDirection] <= ptr.next[searchDirection] - findNear)
            return ptr;
          else
            return ptr.next;
        } else {
          return this._findByNearest(ptr.next, findNear, searchDirection);
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
    if (value > ptr[link]) {
      if (ptr.next) {
        if (value > ptr.next[link]) {
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

    if (!card1 || !card2) return;
    let options = {};
    options = Object.assign(options, SCOPE.connectors);
    let points = [[0, 0], [card2.x - card1.x, card2.y - card1.y]];
    console.log("POINTS: " + points);
    if (isNaN(points[1][0]))
      console.log("NAN x: " + points[1][0])
    if (isNaN(points[1][1]))
      console.log("NAN y: " + points[1][1])
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