/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $, window */

define(function (require, exports, module) {
	"use strict";

	var AppInit             = brackets.getModule("utils/AppInit"),
		CodeHintManager     = brackets.getModule("editor/CodeHintManager"),
        Async               = brackets.getModule("utils/Async"),
        TypeScriptUtils     = require("TypeScriptUtils"),
        TypeScriptService   = require("TypeScriptService");
    
    /*
     * Get a typescript-code-hint-specific event name
     */
    function eventName(name) {
        var EVENT_TAG = "brackets-typescript-code-hint";
        return name + "." + EVENT_TAG;
    }

    function getCompletionInfo(previousCode, endIndex) {
        var isMember = false,
            lastChar = previousCode[endIndex - 1],
            currentText = "",
            match;

        // if last character is empty
        if (lastChar.match(/[ \t\n]/)) {
            // search the last character
            match = previousCode.match(/[ \t\n]*$/);
        } else {
            // search the last non valid character
            match = previousCode.match(/[ \t\n]*[0-9a-z_\$]*$/i);
            // get current typing text
            currentText = match[0].match(/[0-9a-z_\$]*$/i)[0];
        }

        var index = endIndex - match[0].length;
        var lastCharBefore = previousCode[index - 1];

        if (lastCharBefore === '.') {
            isMember = true;
        } else {
            index = endIndex;
        }

        return {
            index: index,
            isMember: isMember,
            currentText: currentText
        };
    }

    function getCompletionAtPosition(pos, doc) {
        var tsDoc = TypeScriptService.get(doc),
            index = tsDoc.getIndexFromPos(pos, doc),
            textBefore = doc.getRange({line: 0, ch: 0}, pos),
            info = getCompletionInfo(textBefore, index),
            completions = tsDoc.getCompletionsAtIndex(info.index, info.isMember);
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

		return result;
	};

	TsHints.prototype._getHints = function (implicitChar) {
        var that = this,
            completion = getCompletionAtPosition(this.editor.getCursorPos(), this.editor.document);

        // Store the text that was already typed
        this.currentText = completion.info.currentText;

        var hints = $.map(completion.entries, function (entry) {
            if (!that.currentText || entry.name.indexOf(that.currentText) === 0) {
                return entry.name + ': ' + entry.type;
            }
        }).sort();

        return {
            hints: hints,
            match: that.currentText,
            selectInitial: true
        };
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
        if (implicitChar) {
            var result = new $.Deferred(),
                tsDoc = TypeScriptService.get(this.editor.document);
            
            // wait for the current typescript document "change" event because typescript has
            // to process the file with the changes before getting the completions
            $(tsDoc).on(eventName("change"), function () {
                $(tsDoc).off(eventName("change"));
                var hints = this._getHints(implicitChar);
                result.resolve(hints);
            }.bind(this));
            
            return result;
        } else {
            return this._getHints(implicitChar);
        }
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
			keepHints = false,
            // Take only the part of the hint before ':'
            text = hint.match(/^[^:]*/)[0];

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
		CodeHintManager.registerHintProvider(tsHints, [TypeScriptUtils.MODE_NAME], 0);

		// For unit testing
		exports.tsHintsProvider = tsHints;
	});
});