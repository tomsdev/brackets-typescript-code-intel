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

define(function (require, exports, module) {
    "use strict";

    require("TypeScript/thirdparty/ServiceBuilder");
    
    var TypeScriptUtils = require("TypeScript/TypeScriptUtils"),
        PathUtils       = require("PathUtils");

    /**
     * Returns a reference matching regular expression. Recognizes the forms:
     * ///<reference path='file.ts'/>
     * ///<reference path="file.ts"/>
     *
     * @type {RegExp}
     */
    function getReferenceRegExp() {
        return /^\s*\/\/\/\s*<\s*reference\s+path\s*=\s*[""""']([^""""<>|]+)[""""']\s*\/>/gim;
    }

    /**
     * Extracts references from the contents of a typescript file and returns an
     * hash table (JavaScript object) with the relative path of each reference as
     * property.
     * @param {!string} content Content of the file
     * @returns {Object.<string, *>} Hash table of relative paths
     */
    function _extractReferences(content) {
        var referencesObj = {},
            regExp = getReferenceRegExp(),
            match,
            relativePath;

        while ((match = regExp.exec(content)) !== null) {
            relativePath = match[1];
            referencesObj[relativePath] = 1; // value is not used
        }

        return referencesObj;
    }

    /**
     * Returns the script name that will be used by typescript to identify this document.
     * @param {!Document} doc
     * @returns {string}
     */
    function getScriptName(doc) {
        return doc.file.fullPath;
    }

    /**
     * @constructor
     * Model for a TypeScript code document. It contains its own typescript language service.
     * It provides methods that interact with this language service but in a more
     * brackets friendly way. It is also aware of the others documents that can be
     * referenced by the TypeScript code document.
     *
     * TypeScriptDocument dispatches this event:
     *
     * change -- When this TypeScript document content has changed and the changes has
     *           been processed by the typescript language service.
     *
     * @param {!Document} doc TypeScript code document
     */
    function TypeScriptDocument(doc) {
        this.doc = doc;
        this.scriptName = getScriptName(doc);
        this.lsh = new ServiceBuilder.TypeScriptLSH();
    }

    /**
     * Document wrapped.
     * Note: It should be a document with a *.ts file
     * @type {!Document}
     */
    TypeScriptDocument.prototype.doc = null;

    /**
     * The script name used by typescript to identify this document.
     * @type {!string}
     */
    TypeScriptDocument.prototype.scriptName = null;

    /**
     * The TypeScriptLSH provided by typescript for this document.
     * @type {!TypeScriptLSH}
     */
    TypeScriptDocument.prototype.lsh = null;

    /**
     * The LanguageService provided by typescript for this document.
     * @type {!LanguageService}
     */
    TypeScriptDocument.prototype.langSvc = null;

    /**
     * The cached references extracted from the contents of this document.
     * @type {!Array.<string>} Array of relative paths
     * @private
     */
    TypeScriptDocument.prototype._references = null;

    /**
     * The cached references extracted from the contents of this document as an
     * hash table (JavaScript object) with the relative path of each reference as
     * property.
     * @type {!Object.<string, *>} Hash table of relative paths
     * @private
     */
    TypeScriptDocument.prototype._referencesObj = null;

    /**
     * Converts a typescript index position to a brackets position from the document
     * identify by the given script name.
     * @param {!number} index Index position
     * @param {!string} scriptName Script name of this document or a referenced one
     * @returns {{line: number, ch: number}}
     */
    TypeScriptDocument.prototype.getPosFromIndex = function (index, scriptName) {
        var result = this.lsh.positionToLineCol(scriptName, index);
        return {
            line: result.line - 1,
            ch: result.col - 1
        };
    };

    /**
     * Converts a start and end typescript index position to a brackets range from
     * the document identify by the given script name.
     * @param {!number} minChar Start index position
     * @param {!number} limChar End index position
     * @param {!string} scriptName Script name of this document or a referenced one
     * @returns {{start: {line: number, ch: number}, end: {line: number, ch: number}}}
     */
    TypeScriptDocument.prototype.getRange = function (minChar, limChar, scriptName) {
        return {
            start : this.getPosFromIndex(minChar, scriptName),
            end :  this.getPosFromIndex(limChar, scriptName)
        };
    };

    /**
     * Converts a brackets position to a typescript index position from the document.
     * @param {!{line:number, ch:number}} pos Brackets position
     * @param {!Document} doc This document or a referenced one
     * @returns {*}
     */
    TypeScriptDocument.prototype.getIndexFromPos = function (pos, doc) {
        return this.lsh.lineColToPosition(getScriptName(doc), pos.line + 1, pos.ch + 1);
    };

    /**
     * Returns the full path based on this document directory and the given relative path.
     * @param {!string} relativePath
     * @returns {string}
     */
    TypeScriptDocument.prototype.getFullPath = function (relativePath) {
        var parentPath = PathUtils.getParentPath(this.doc.file.fullPath);
        // WARNING: won't work with parent relative path for the moment
        return PathUtils.convertRelativePathToFullPath(relativePath, parentPath);
    };

    /**
     * Returns the typescript computed AST from this document.
     * @returns {*}
     */
    TypeScriptDocument.prototype.getScriptAST = function () {
        return this.langSvc.getScriptAST(this.scriptName);
    };

    /**
     * Returns the symbol at the given index position in this document.
     * @param {!number} index Index position
     * @returns {*}
     */
    TypeScriptDocument.prototype.getSymbolAtIndex = function (index) {
        return this.langSvc.getSymbolAtPosition(this.getScriptAST(), index);
    };

    /**
     * Returns the symbol at the given brackets position in this document.
     * @param {!{line:number, ch:number}} pos Brackets position
     * @returns {*}
     */
    TypeScriptDocument.prototype.getSymbolAtPosition = function (pos) {
        var index = this.getIndexFromPos(pos, this.doc);
        return this.getSymbolAtIndex(index);
    };

    /**
     * Returns the completion entries at the given index position in this document.
     * Note: The given index position must be well positioned. For example, just after
     * the dot if it's a member completion.
     * @param {!number} index Index position
     * @param {!boolean} isMember
     * @returns {Array.<{kind:string, kindModifiers:string, name:string, type:string}>}
     */
    TypeScriptDocument.prototype.getCompletionsAtIndex = function (index, isMember) {
        return this.langSvc.getCompletionsAtPosition(this.scriptName, index, isMember);
    };

    /**
     * Returns the script name of a symbol from this document.
     * @param symbol
     * @returns {?string}
     */
    TypeScriptDocument.prototype.getScriptNameFromSymbol = function (symbol) {
        if (symbol.unitIndex === -1) {
            return null;
        }
        return this.lsh.scripts[symbol.unitIndex].name;
    };

    /**
     * Returns, if there is one, the declaration information corresponding to the
     * given symbol from this document.
     * @param symbol
     * @returns {?{name: string, range: {start: {line: number, ch: number}, end: {line: number, ch: number}}, scriptName: string}}
     */
    TypeScriptDocument.prototype.getDeclarationInfo = function (symbol) {
        if (!symbol || !symbol.declAST || symbol.declAST.minChar === undefined) {
            return null;
        }
        var minChar = symbol.declAST.minChar,
            limChar = symbol.declAST.limChar,
            scriptName = this.getScriptNameFromSymbol(symbol),
            range = this.getRange(minChar, limChar, scriptName);
        
        return {
            name: symbol.name,
            range: range,
            scriptName: scriptName
        };
    };

    /**
     * Returns the text content of this document.
     * @returns {!string}
     */
    TypeScriptDocument.prototype.getText = function () {
        return this.doc.getText();
    };

    /**
     * Extracts and returns the current references from the contents of this document.
     * If there was other references before, it provides also the added and removed ones.
     * @returns {{references: Array.<string>, added: Array.<string>, removed: Array.<string>}}
     */
    TypeScriptDocument.prototype.getReferences = function () {
        var referencesObj = _extractReferences(this.getText());
        var result = {
            all: TypeScriptUtils.getObjectKeys(referencesObj),
            added: null,
            removed: null
        };
        // Replace the cached array
        this._references = result.all;
        // If there is references in cache, do a diff with them
        if (this._referencesObj) {
            var diff = TypeScriptUtils.getObjectsDiff(this._referencesObj, referencesObj);
            result.added = diff.added;
            result.removed = diff.removed;

            result.added.forEach(function (relativePath) {
                console.log("Reference added: ", relativePath);
            });

            result.removed.forEach(function (relativePath) {
                console.log("Reference removed: ", relativePath);
            });
        } else {
            result.all.forEach(function (relativePath) {
                console.log("Reference found: ", relativePath);
            });
        }
        // Replace the cached object
        this._referencesObj = referencesObj;
        return result;
    };

    /**
     * Adds or updates the entire document content in the corresponding typescript script.
     * @param {!Document} doc This document or a referenced one
     */
    TypeScriptDocument.prototype.updateScriptWithText = function (doc) {
        this.lsh.updateScript(getScriptName(doc), doc.getText(), false);
        
        //TODO: do it only when add
        // we have to update typescript language service when a new script is added
        this.langSvc = this.lsh.getLanguageService();
    };

    /**
     * Removes the corresponding typescript script.
     * @param {!Document} doc This document or a referenced one
     */
    TypeScriptDocument.prototype.removeScript = function (doc) {
        var scriptName = getScriptName(doc);
        for (var i=0; i < this.lsh.scripts.length; i++) {
            // Find the script
            if (this.lsh.scripts[i].name === scriptName) {
                // Remove it
                this.lsh.scripts.splice(i, 1);
                // We have to update typescript language service when a script is removed
                this.langSvc = this.lsh.getLanguageService();
                return;
            }
        }
    };

    /**
     * Updates the typescript script content corresponding to the given document with
     * the given change.
     * @param {!Document} doc This document or a referenced one
     * @param {{from:{line: number, ch: number}, to:{line: number, ch: number},
     *          text:string}} change
     */
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

    /**
     * Updates the typescript script content corresponding to the given document with
     * the given changes.
     * @param {!Document} doc This document or a referenced one
     * @param {{from:{line: number, ch: number}, to:{line: number, ch: number},
     *          text:string, next}} changes
     */
    TypeScriptDocument.prototype.updateScriptWithChanges = function (doc, changes) {
        while (changes) {
            // Apply this step of the change list
            this.updateScriptWithChange(doc, changes);
            changes = changes.next;
        }
    };

    /**
     * Trigger the change event of this TypeScriptDocument.
     */
    TypeScriptDocument.prototype.triggerHandlerChange = function () {
        console.log("Content change: ", this.scriptName);
        $(this).triggerHandler("change");
    };
    
    // Define public API
    exports.TypeScriptDocument = TypeScriptDocument;
    exports.getScriptName      = getScriptName;
    exports.getReferenceRegExp = getReferenceRegExp;
});
