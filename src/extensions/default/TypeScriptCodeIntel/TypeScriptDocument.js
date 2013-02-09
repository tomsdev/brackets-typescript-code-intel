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

    //todo: keep it here or not?
    require("thirdparty/ServiceBuilder");

    /**
     * Unique PreferencesManager clientID
     */
    var PREFERENCES_CLIENT_ID = "com.adobe.brackets.DocumentManager";

    /**
     * @private
     * All documents with refCount > 0. Maps Document.file.fullPath -> Document.
     * @type {Object.<string, Document>}
     */
    // todo: delete it?
    var _typeScriptDocuments = {};

//    /**
//     * Cleans up any loose Documents whose only ref is its own master Editor, and that Editor is not
//     * rooted in the UI anywhere. This can happen if the Editor is auto-created via Document APIs that
//     * trigger _ensureMasterEditor() without making it dirty. E.g. a command invoked on the focused
//     * inline editor makes no-op edits or does a read-only operation.
//     */
//    function _gcDocuments() {
//        getAllOpenDocuments().forEach(function (doc) {
//            // Is the only ref to this document its own master Editor?
//            if (doc._refCount === 1 && doc._masterEditor) {
//                // Destroy the Editor if it's not being kept alive by the UI
//                EditorManager._destroyEditorIfUnneeded(doc);
//            }
//        });
//    }

    function getScriptName(doc) {
        return doc.file.fullPath;
    }

    /** Extract references from the content of a typescript file */
    function extractReferences(content) {
        // match references line by line
        var reg = new RegExp(/^\s*\/\/\/\s*<\s*reference\s+path\s*=\s*[""""']([^""""<>|]+)[""""']\s*\/>/gim);

        var relativePaths = [];
        var match, relativePath;

        // iterate over all references found
        do {
            match = reg.exec(content);
            if (match) {
                relativePath = match[1];
                console.log("reference found: ", relativePath);
                relativePaths.push(relativePath);
            }
        } while (match);

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
        //todo: delete it?
        if (_typeScriptDocuments[doc.file.fullPath]) {
            throw new Error("Creating a typescript document when one already exists, for: " + doc.file);
        }
        _typeScriptDocuments[doc.file.fullPath] = this;

        this.doc = doc;
        this.scriptName = getScriptName(doc);

        this.lsh = new ServiceBuilder.TypeScriptLSH();

        //this.refreshText(rawText, initialTimestamp);

        // This is a good point to clean up any old dangling Documents
        //_gcDocuments();
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

    ///////////// Getters only //////////////////////////////

    /// ScriptName or Other doc required ////////////////////////////////////////////////
    // TODO: move or private this 3 methods

    // return the cursor index based on the codemirror position
    TypeScriptDocument.prototype.getIndexFromPos = function (pos, doc) {
        return this.lsh.lineColToPosition(getScriptName(doc), pos.line + 1, pos.ch + 1);
    };

    /**
     * Convert a TS offset position to a codemirror position
     */
    TypeScriptDocument.prototype.getPosFromIndex = function (index, scriptName) {
        var result = this.lsh.positionToLineCol(scriptName, index);
        return {
            line: result.line - 1,
            ch: result.col - 1
        };
    };

    TypeScriptDocument.prototype.getRange = function (minChar, limChar, scriptName) {
        return {
            start : this.getPosFromIndex(minChar, scriptName),
            end :  this.getPosFromIndex(limChar, scriptName)
        };
    };

    /////////////////////////////////////////////////////////////////////////////////////

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

    // warning: index must be correct (after a dot for example)
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

        var minChar = symbol.declAST.minChar;
        var limChar = symbol.declAST.limChar;

        // todo: what if its a file parent or child??
        var scriptName = this.getScriptNameFromSymbol(symbol);

        var range = this.getRange(minChar, limChar, scriptName);

        return {
            name: symbol.name,
            range: range,
            scriptName: scriptName
        };
    };

    TypeScriptDocument.prototype.getText = function () {
        return this.doc.getText();
    };

    // todo: cache (and maintain cache updated)
    TypeScriptDocument.prototype.getReferences = function () {
        var references = extractReferences(this.getText());
        return references;
    };

    ////////// Modifier /////////////////////////////
    // TODO: move?

    // add script to TS doc
    // optional......
    // todo: rename?
    TypeScriptDocument.prototype.updateScriptWithText = function (doc) {
        this.lsh.updateScript(getScriptName(doc), doc.getText(), false);
        // todo: only when add.. i think
        this.langSvc = this.lsh.getLanguageService();
    };

    TypeScriptDocument.prototype.updateScriptWithChange = function (doc, change) {
        // Special case: the range is no longer meaningful since the entire text was replaced
        if (!change.from || !change.to) {
            // Update all the script
            this.updateScriptWithText(doc, doc.getText());
        }

        var minChar = this.getIndexFromPos(change.from, doc);
        var limChar = this.getIndexFromPos(change.to, doc);
        var newText = change.text.join('\n');

        this.lsh.editScript(getScriptName(doc), minChar, limChar, newText);
    };

    TypeScriptDocument.prototype.updateScriptWithChanges = function (doc, changes) {
        while (changes) {
            // Apply this step of the change list
            this.updateScriptWithChange(doc, changes);
            changes = changes.next;
        }
    };

    // Define public API
    exports.TypeScriptDocument          = TypeScriptDocument;
});
