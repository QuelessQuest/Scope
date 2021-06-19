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
   * @param note {Note}
   */
  constructor(note) {
    this.entry = note.data.entryId;
    this.noteId = note.id;
    this.prev = null;
    this.next = null;
    this.name = note.text;
    this.connectors = {
      prev: {
        x: "",
        y: ""
      },
      next: {
        x: "",
        y: ""
      }
    }
    this.x = note.data.x;
    this.y = note.data.y;
    this._id = foundry.utils.randomID();
    this._children = null;  // This note may have an additional list attached
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
}