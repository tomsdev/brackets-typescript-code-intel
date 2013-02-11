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
/*global define, brackets, $, ServiceBuilder */

/**
* DocumentManager maintains a list of currently 'open' Documents. It also owns the list of files in
* the working set.
*
* This module dispatches several events:
*
*    - dirtyFlagChange -- When any Document's isDirty flag changes. The 2nd arg to the listener is the
*      Document whose flag changed.
*/
define(function (require, exports, module) {
    "use strict";

    require("thirdparty/ServiceBuilder");
    
    var TypeScriptUtils = require("TypeScriptUtils");
    
    /**
     * Function matching regular expression. Recognizes the forms:
     * "function functionName()", "functionName = function()", and
     * "functionName: function()".
     *
     * Note: JavaScript identifier matching is not strictly to spec. This
     * RegExp matches any sequence of characters that is not whitespace.
     * @type {RegExp}
     */
    var _referenceRegExp = /^\s*\/\/\/\s*<\s*reference\s+path\s*=\s*[""""']([^""""<>|]+)[""""']\s*\/>/gim;

    function getScriptName(doc) {
        return doc.file.fullPath;
    }

    /** Extract references from the content of a typescript file */
    function extractReferences(content) {
        var relativePaths = [],
            match,
            relativePath;
        
        while ((match = _referenceRegExp.exec(content)) !== null) {
            relativePath = match[1];
            console.log("Reference found: ", relativePath);
            relativePaths.push(relativePath);
        }

        return relativePaths;
    }

    /**
     * @constructor
     * Model for the contents of a single file and its current modification state.
     * See DocumentManager documentation for important usage notes.
     *
     * Document dispatches these events:
     *
     * deleted -- When the file for this document has been deleted. All views onto the document should
     *      be closed. The document will no longer be editable or dispatch "change" events.
     *
     * @param {!FileEntry} file  Need not lie within the project.
     * @param {!Date} initialTimestamp  File's timestamp when we read it off disk.
     * @param {!string} rawText  Text content of the file.
     */
    function TypeScriptDocument(doc) {
        this.doc = doc;
        this.scriptName = getScriptName(doc);
        this.lsh = new ServiceBuilder.TypeScriptLSH();
    }

    /**
     * Whether this document has unsaved changes or not.
     * When this changes on any Document, DocumentManager dispatches a "dirtyFlagChange" event.
     * @type {Document}
     */
    TypeScriptDocument.prototype.doc = false;

    /**
     * Whether this document has unsaved changes or not.
     * When this changes on any Document, DocumentManager dispatches a "dirtyFlagChange" event.
     * @type {Document}
     */
    TypeScriptDocument.prototype.scriptName = false;

    /**
     * The text contents of the file, or null if our backing model is _masterEditor.
     * @type {?string}
     */
    TypeScriptDocument.prototype.lsh = null;

    /**
     * The text contents of the file, or null if our backing model is _masterEditor.
     * @type {?string}
     */
    TypeScriptDocument.prototype.langSvc = null;

    /**
     * The text contents of the file, or null if our backing model is _masterEditor.
     * @type {?string}
     */
    TypeScriptDocument.prototype.references = null;

    /**
     * Convert a TS offset position to a codemirror position
     */
    TypeScriptDocument.prototype._getPosFromIndex = function (index, scriptName) {
        var result = this.lsh.positionToLineCol(scriptName, index);
        return {
            line: result.line - 1,
            ch: result.col - 1
        };
    };

    TypeScriptDocument.prototype._getRange = function (minChar, limChar, scriptName) {
        return {
            start : this._getPosFromIndex(minChar, scriptName),
            end :  this._getPosFromIndex(limChar, scriptName)
        };
    };
    
    // return the cursor index based on the codemirror position
    TypeScriptDocument.prototype.getIndexFromPos = function (pos, doc) {
        return this.lsh.lineColToPosition(getScriptName(doc), pos.line + 1, pos.ch + 1);
    };

    TypeScriptDocument.prototype.getScriptAST = function () {
        return this.langSvc.getScriptAST(this.scriptName);
    };

    TypeScriptDocument.prototype.getSymbolAtIndex = function (index) {
        return this.langSvc.getSymbolAtPosition(this.getScriptAST(), index);
    };

    TypeScriptDocument.prototype.getSymbolAtPosition = function (pos) {
        var index = this.getIndexFromPos(pos, this.doc);
        return this.getSymbolAtIndex(index);
    };

    // warning: given index must be well positioned (for example: just after a dot for a member)
    TypeScriptDocument.prototype.getCompletionsAtIndex = function (index, isMember) {
        return this.langSvc.getCompletionsAtPosition(this.scriptName, index, isMember);
    };

    /**
     * Get the ScriptName of a symbol.
     * optionnal parameter doc (default: current document)
     */
    TypeScriptDocument.prototype.getScriptNameFromSymbol = function (symbol) {
        if (symbol.unitIndex === -1) {
            return null;
        }
        return this.lsh.scripts[symbol.unitIndex].name;
    };

    TypeScriptDocument.prototype.getDeclarationInfo = function (symbol) {
        if (!symbol || !symbol.declAST || symbol.declAST.minChar === undefined) {
            return null;
        }
        var minChar = symbol.declAST.minChar,
            limChar = symbol.declAST.limChar,
            scriptName = this.getScriptNameFromSymbol(symbol),
            range = this._getRange(minChar, limChar, scriptName);
        
        return {
            name: symbol.name,
            range: range,
            scriptName: scriptName
        };
    };

    TypeScriptDocument.prototype.getText = function () {
        return this.doc.getText();
    };

    //TODO: cache (and maintain cache updated)
    TypeScriptDocument.prototype.getReferences = function () {
        var references = extractReferences(this.getText());
        return references;
    };

    TypeScriptDocument.prototype.updateScriptWithText = function (doc) {
        this.lsh.updateScript(getScriptName(doc), doc.getText(), false);
        
        //TODO: do it only when add
        // we have to update typescript language service when a new script is added
        this.langSvc = this.lsh.getLanguageService();
    };

    TypeScriptDocument.prototype.updateScriptWithChange = function (doc, change) {
        // Special case: the range is no longer meaningful since the entire text was replaced
        if (!change.from || !change.to) {
            // Update all the script
            this.updateScriptWithText(doc, doc.getText());
        }
        var minChar = this.getIndexFromPos(change.from, doc),
            limChar = this.getIndexFromPos(change.to, doc),
            newText = change.text.join('\n');

        this.lsh.editScript(getScriptName(doc), minChar, limChar, newText);
    };

    TypeScriptDocument.prototype.updateScriptWithChanges = function (doc, changes) {
        while (changes) {
            // Apply this step of the change list
            this.updateScriptWithChange(doc, changes);
            changes = changes.next;
        }
    };
    
    TypeScriptDocument.prototype.triggerHandlerChange = function () {
        console.log("Content change: ", this.scriptName);
        $(this).triggerHandler("change");
    };
    
    // Define public API
    exports.TypeScriptDocument          = TypeScriptDocument;
});
