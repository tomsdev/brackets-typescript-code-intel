/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $, window */

//todo: jshint add regex

define(function (require, exports, module) {
	"use strict";

	var AppInit             = brackets.getModule("utils/AppInit"),
		CodeHintManager     = brackets.getModule("editor/CodeHintManager"),
        TypeScriptService       = require("TypeScriptService");

    // vide ou lettre juste avant curseur?
    // si vide:
    //   chercher point direct avant vide
    //   si point: member & index after point
    //   sinon: no completion si c des lettres ... noMember & index courant
    // sinon:
    //   chercher point avant lettre (peut y avoir du vide avant lettre)
    //   si point: member & index after point
    //   sinon: no completion si c des lettres ... noMember & index courant
    function getCompletionInfo(previousCode, endIndex) {
        var isMember = false;
        var lastChar = previousCode[endIndex - 1];
        var match;
        var currentText = "";

        // if last character is empty
        if (lastChar.match(/[ \t\n]/)) {
            // search the last character
            match = previousCode.match(/[ \t\n]*$/);
        } else {
            // search the last non valid character
            match = previousCode.match(/[ \t\n]*[0-9a-zA-Z_\$]*$/);
            // get current typing text
            currentText = match[0].match(/[0-9A-Za-z_\$]*$/)[0];
        }

        var index = endIndex - match[0].length;
        var lastCharBefore = previousCode[index - 1];

        if (lastCharBefore === '.') {
            isMember = true;
        } else {
            index = endIndex;
        }

        var info = {
            index: index,
            isMember: isMember,
            currentText: currentText
        };

        //console.log("completionType: ", JSON.stringify(completionType));

        return info;
    }

    function getCompletionAtPosition(pos, doc) {
        var tsDoc = TypeScriptService.get(doc);
        var index = tsDoc.getIndexFromPos(pos, doc);
        var textBefore = doc.getRange({line:0, ch:0}, pos);
        var info = getCompletionInfo(textBefore, index);
        var completions = tsDoc.getCompletionsAtIndex(info.index, info.isMember);

        return {
            entries: completions.entries,
            info: info
        };
    }

	/**
	 * @constructor
	 */
	function TsHints() {
		this.primaryTriggerKeys = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
		this.secondaryTriggerKeys = ".(";
	}

	/**
	 * Determines whether CSS propertyname or -name hints are available in the current editor
	 * context.
	 *
	 * @param {Editor} editor
	 * A non-null editor object for the active window.
	 *
	 * @param {String} implicitChar
	 * Either null, if the hinting request was explicit, or a single character
	 * that represents the last insertion and that indicates an implicit
	 * hinting request.
	 *
	 * @return {Boolean}
	 * Determines whether the current provider is able to provide hints for
	 * the given editor context and, in case implicitChar is non- null,
	 * whether it is appropriate to do so.
	 */
	TsHints.prototype.hasHints = function (editor, implicitChar) {
		this.editor = editor;
        this.currentText = "";
		var result = true;

		if (implicitChar) {
			result = (this.primaryTriggerKeys.indexOf(implicitChar) !== -1) ||
				(this.secondaryTriggerKeys.indexOf(implicitChar) !== -1);
		}

		if (result) {
			console.log("hasHint!");
		}

		return result;
	};

	/**
	 * Returns a list of availble CSS protertyname or -value hints if possible for the current
	 * editor context.
	 *
	 * @param {Editor} implicitChar
	 * Either null, if the hinting request was explicit, or a single character
	 * that represents the last insertion and that indicates an implicit
	 * hinting request.
	 *
	 * @return {Object<hints: Array<(String + jQuery.Obj)>, match: String,
     *      selectInitial: Boolean>}
	 * Null if the provider wishes to end the hinting session. Otherwise, a
	 * response object that provides
	 * 1. a sorted array hints that consists of strings
	 * 2. a string match that is used by the manager to emphasize matching
	 *    substrings when rendering the hint list
	 * 3. a boolean that indicates whether the first result, if one exists, should be
	 *    selected by default in the hint list window.
	 */
	TsHints.prototype.getHints = function (implicitChar) {
		var that = this,
            completion = getCompletionAtPosition(this.editor.getCursorPos(), this.editor.document);

        // Store the text that was already typed
        this.currentText = completion.info.currentText;

		var hints = $.map(completion.entries, function (entry) {
			if (!that.currentText || entry.name.indexOf(that.currentText) === 0) {
				return entry.name + ': ' + entry.type;
			}
		}).sort();

        // TODO: return a defered?

		return {
			hints: hints,
			match: this.currentText,
			selectInitial: true
		};
	};

	/**
	 * Inserts a given CSS protertyname or -value hint into the current editor context.
	 *
	 * @param {String} hint
	 * The hint to be inserted into the editor context.
	 *
	 * @return {Boolean}
	 * Indicates whether the manager should follow hint insertion with an
	 * additional explicit hint request.
	 */
	TsHints.prototype.insertHint = function (hint) {
		var cursor = this.editor.getCursorPos(),
			keepHints = false;

		// Take only the part of the hint before ':'
		var text = hint.match(/^[^:]*/)[0];

		// Subtract the text that was already typed
		if (this.currentText) {
			text = text.substring(this.currentText.length);
		}

		// Insert the completion at the cursor position
		this.editor.document.replaceRange(text, cursor);

		return keepHints;
	};

	AppInit.appReady(function () {
		var tsHints = new TsHints();
		CodeHintManager.registerHintProvider(tsHints, ["typescript"], 0);

		// For unit testing
		exports.tsHintsProvider = tsHints;
	});
});