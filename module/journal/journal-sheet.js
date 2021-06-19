export class JournalSheetScope extends JournalSheet {
  constructor(object, options={}) {
    super(object, options);
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet"],
      width: 360,
      height: 400,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: true,
      viewPermission: CONST.ENTITY_PERMISSIONS.NONE
    });
  }
}