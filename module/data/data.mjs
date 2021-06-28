import {BaseScope} from "../scope-classes.js";
import {IMAGE_FILE_EXTENSIONS} from "../../constants.mjs";

function isValidId(id) {
  return /^[a-zA-Z0-9]{16}$/.test(id);
}

function foreignDocumentField(options) {
  return {
    type: String,
    required: options.required ?? false,
    nullable: options.nullable ?? true,
    default: options.default || null,
    clean: d => {
      if ( d instanceof options.type ) return d.id;
      return d || null
    },
    validate: _validateId,
    validationError: `{name} {field} "{value}" is not a valid ${options.type.documentName} id`
  }
}

function _validateId(id) {
  return (id === null) || isValidId(id);
}

const REQUIRED_NUMBER = {
  type: Number,
  required: true,
  nullable: false,
  default: 0
};

function _hasFileExtension(path, extensions) {
  const xts = extensions.map(ext => `\\.${ext}`).join("|");
  const rgx = new RegExp(`(${xts})(\\?.*)?$`, "i");
  return !!path && rgx.test(path);
}

function isBase64Image(data) {
  return /^data:image\/(png|jpeg);base64,/.test(data);
}

const DOCUMENT_ID = {
  type: String,
  required: true,
  default: null,
  nullable: false,
  validate: _validateId,
  validationError: '{name} {field} "{value}" is not a valid document ID string'
};

function hasImageExtension(path) {
  return _hasFileExtension(path, IMAGE_FILE_EXTENSIONS) || isBase64Image(path);
}

const IMAGE_FIELD = {
  type: String,
  required: false,
  nullable: true,
  validate: hasImageExtension,
  validationError: '{name} {field} "{value}" does not have a valid image file extension'
};

function isColorString(color) {
  return /#[0-9A-z]{6}/.test(color);
}

const COLOR_FIELD = {
  type: String,
  required: false,
  nullable: true,
  validate: isColorString,
  validationError: '{name} {field} "{value}" is not a valid hexadecimal color string'
};

const STRING_FIELD = {
  type: String,
  required: false,
  nullable: false
};

const REQUIRED_STRING = {
  type: String,
  required: true,
  nullable: false,
  clean: v => v ? String(v).trim() : undefined
};

const OBJECT_FIELD = {
  type: Object,
  default: {},
  required: true
};

function field(field, options={}) {
  return foundry.utils.mergeObject(options, field, {overwrite: false, recursive: false});
}

export class ScopeData extends foundry.abstract.DocumentData {
  static defineSchema() {
    return {
      _id: DOCUMENT_ID,
      type: STRING_FIELD,
      tone: STRING_FIELD,
      next: foreignDocumentField({type: BaseScope, required: false}),
      prev: foreignDocumentField({type: BaseScope, required: false}),
      connectors: {
        nextHorizontal: foreignDocumentField({type: foundry.documents.BaseDrawing, required: false}),
        nextVertical: foreignDocumentField({type: foundry.documents.BaseDrawing, required: false}),
        previousHorizontal: foreignDocumentField({type: foundry.documents.BaseDrawing, required: false}),
        previousVertical: foreignDocumentField({type: foundry.documents.BaseDrawing, required: false})
      },
      order: Number,
      entryId: foreignDocumentField({type: foundry.documents.BaseJournalEntry, required: false}),
      x: REQUIRED_NUMBER,
      y: REQUIRED_NUMBER,
      icon: field(IMAGE_FIELD, {required: true, default: CONST.DEFAULT_NOTE_ICON}),
      iconSize: field(REQUIRED_NUMBER, {
        default: 40,
        validate: n => Number.isInteger(n) && n >= 32,
        validationError: "Invalid {name} {field} which must be an integer greater than 32"
      }),
      iconWidth: Number,
      iconHeight: Number,
      iconTint: COLOR_FIELD,
      text: STRING_FIELD,
      fontFamily: field(REQUIRED_STRING, {
        default: () => globalThis.CONFIG?.defaultFontFamily || "Signika"
      }),
      fontSize: field(REQUIRED_NUMBER, {
        default: 48,
        validate: n => Number.isInteger(n) && n.between(8, 128),
        validationError: "Invalid {name} {field} which must be an integer between 8 and 128"
      }),
      textAnchor: {
        type: Number,
        required: true,
        default: CONST.TEXT_ANCHOR_POINTS.BOTTOM,
        validate: p => Object.values(CONST.TEXT_ANCHOR_POINTS).includes(p),
        validationError: "Invalid {name} {field} which must be a value in CONST.TEXT_ANCHOR_POINTS"
      },
      textColor: field(COLOR_FIELD, {default: "#FFFFFF"}),
      flags: OBJECT_FIELD
    }
  }
}