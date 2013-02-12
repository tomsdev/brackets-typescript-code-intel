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

	var AppInit           = brackets.getModule("utils/AppInit"),
		CodeHintManager   = brackets.getModule("editor/CodeHintManager"),
        Async             = brackets.getModule("utils/Async"),
        StringUtils       = brackets.getModule("utils/StringUtils"),
        TypeScriptUtils   = require("TypeScript/main").TypeScriptUtils,
        TypeScriptService = require("TypeScript/main").TypeScriptService;
    
    var SINGLE_QUOTE    = "\'",
        DOUBLE_QUOTE    = "\"";
    
    /**
     * Get a typescript-code-hint-specific event name
     */
    function eventName(name) {
        var EVENT_TAG = "brackets-typescript-code-hint";
        return name + "." + EVENT_TAG;
    }

    /**
     * Returns the information needed by typescript to provide completion
     * at the given index position.
     * @param {!string} previousCode Code before the position asking for completion
     * @param {!number} endIndex Index position of the end of previousCode
     * @returns {{index: number, isMember: boolean, currentText: string}}
     * @private
     */
    function _getCompletionInfo(previousCode, endIndex) {
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

    /**
     * Returns the completion entries given by typescript and some information about
     * the completion.
     * @param {!{line:number, ch:number}} pos Position where the completion happens
     * @param {!Document} doc Document where the completion happens
     * @returns {{entries: Array, info: {index: number, isMember: boolean, currentText: string}}}
     * @private
     */
    function _getCompletionAtPosition(pos, doc) {
        var tsDoc = TypeScriptService.get(doc),
            index = tsDoc.getIndexFromPos(pos, doc),
            textBefore = doc.getRange({line: 0, ch: 0}, pos),
            info = _getCompletionInfo(textBefore, index),
            completions = tsDoc.getCompletionsAtIndex(info.index, info.isMember);
        return {
            entries: completions.entries,
            info: info
        };
    }
    
    /**
     * Creates a hint response object
     * @private
     */
    function _getResponse(hints, query) {

        var trimmedQuery,
            filteredHints,
            formattedHints;
        
        // Sample hints data:
        // For a member:
        //CompletionEntry
        //    kind: "property"
        //    kindModifiers: "public"
        //    name: "greeting"
        //    type: "string"
        //CompletionEntry
        //    kind: "method"
        //    kindModifiers: "public"
        //    name: "sayHello"
        //    type: "() => string"
        //
        // From anywhere:
        //CompletionEntry
        //    kind: "keyword"
        //    kindModifiers: ""
        //    name: "number"
        //    type: "number"
        //CompletionEntry
        //    kind: "variable"
        //    kindModifiers: ""
        //    name: "c"
        //    type: "string"
        //CompletionEntry
        //    kind: "function"
        //    kindModifiers: ""
        //    name: "func1"
        //    type: "() => string"
        //CompletionEntry
        //    kind: "variable"
        //    kindModifiers: ""
        //    name: "func2"
        //    type: "() => string"

        /**
         * Filter a list of hints using a given query string
         */
        function filterWithQuery(hints) {
            // If the query is non-empty then the hints are filtered.
            if (query.length > 0) {
                return hints.filter(function (entry) {
                    return (entry.name.indexOf(query) === 0);
                });
            } else {
                return hints;
            }
        }

        /**
         * Returns a formatted list of hints with the query substring highlighted
         */
        function formatHints(hints, query) {
            return hints.map(function (entry) {
                var hint        = entry.name + ': ' + entry.type,
                    index       = hint.indexOf(query),
                    $hintObj    = $('<span>'),
                    delimiter   = "";

                //TODO: put the same colors that codemirror uses for TypeScript
                switch (entry.kind) {
                case "keyword":
                    $hintObj.css('color', 'rgb(0,100,0)'); // green
                    break;
                case "variable":
                    $hintObj.css('color', 'rgb(125,125,0)'); // yellow
                    break;
                case "property":
                    $hintObj.css('color', 'rgb(125,125,125)'); // ?
                    break;
                case "function":
                    $hintObj.css('color', 'rgb(0,0,100)'); // blue
                    break;
                case "method":
                    $hintObj.css('color', 'rgb(100,0,100)'); // ?
                    break;
                }

                // highlight the matched portion of each hint
                if (index >= 0) {
                    var prefix  = StringUtils.htmlEscape(hint.slice(0, index)),
                        match   = StringUtils.htmlEscape(hint.slice(index, index + query.length)),
                        suffix  = StringUtils.htmlEscape(hint.slice(index + query.length));

                    $hintObj.append(delimiter + prefix)
                        .append($('<span>')
                                .append(match)
                                .css('font-weight', 'bold'))
                        .append(suffix + delimiter);
                } else {
                    $hintObj.text(delimiter + hint + delimiter);
                }
                $hintObj.data('entry', entry);
                
                return $hintObj;
            });
        }

        // trim leading and trailing string literal delimiters from the query
        if (query.indexOf(SINGLE_QUOTE) === 0 ||
                query.indexOf(DOUBLE_QUOTE) === 0) {
            trimmedQuery = query.substring(1);
            if (trimmedQuery.lastIndexOf(DOUBLE_QUOTE) === trimmedQuery.length - 1 ||
                    trimmedQuery.lastIndexOf(SINGLE_QUOTE) === trimmedQuery.length - 1) {
                trimmedQuery = trimmedQuery.substring(0, trimmedQuery.length - 1);
            }
        } else {
            trimmedQuery = query;
        }

        filteredHints = filterWithQuery(hints).slice(0, 100);
        formattedHints = formatHints(filteredHints, trimmedQuery);

        return {
            hints: formattedHints,
            match: null, // the CodeHintManager should not format the results
            selectInitial: true
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
	 * Determines whether hints are available for a given editor context.
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
    
    /**
	 * Returns a list of hints, possibly deferred, for the current editor
     * context.
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
        var that = this;

        /**
         * Return a list of hints for the current editor context.
         */
        function _getHints(implicitChar) {
            var completion = _getCompletionAtPosition(that.editor.getCursorPos(),
                                                      that.editor.document);
            // Store the text that was already typed
            that.currentText = completion.info.currentText;
            return _getResponse(completion.entries, completion.info.currentText);
        }

        if (implicitChar) {
            var result = new $.Deferred(),
                tsDoc = TypeScriptService.get(this.editor.document);
            
            // wait for the current typescript document "change" event because typescript
            // has to process the file with the changes before getting the completions
            $(tsDoc).on(eventName("change"), function () {
                $(tsDoc).off(eventName("change"));

                var hints = _getHints(implicitChar);
                result.resolve(hints);
            }.bind(this));
            
            return result;
        } else {
            return _getHints(implicitChar);
        }
    };

	/**
	 * Enters the code completion text into the editor.
	 *
	 * @param $hintObj
	 * The hint object  to be inserted into the editor context.
	 *
	 * @return {Boolean}
	 * Indicates whether the manager should follow hint insertion with an
	 * additional explicit hint request.
	 */
	TsHints.prototype.insertHint = function ($hintObj) {
        var hint = $hintObj.data('entry'),
            text = hint.name,
            cursor = this.editor.getCursorPos(),
			keepHints = false;
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
		exports.tsHintProvider = tsHints;
	});
});