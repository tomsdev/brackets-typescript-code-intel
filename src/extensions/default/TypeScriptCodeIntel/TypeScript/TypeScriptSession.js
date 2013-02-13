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


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    var DocumentManager    = brackets.getModule("document/DocumentManager"),
        FileUtils          = brackets.getModule("file/FileUtils"),
        Async              = brackets.getModule("utils/Async"),
        PathUtils          = require("PathUtils"),
        TypeScriptUtils    = require("TypeScript/TypeScriptUtils"),
        TypeScriptDocument = require("TypeScript/TypeScriptDocument");

    /**
     * @constructor
     * Session that maintain a given TypeScriptDocument's scripts up to date.
     * It listens to the document's change event and its references documents's change
     * events to update the scripts.
     * When the current document change, it also check if references have been added
     * or removed.
     *
     * @param {!TypeScriptDocument} tsDoc TypeScriptDocument that will be maintain up
     *                                    to date by this session
     */
    function TypeScriptSession(tsDoc) {
        this.tsDoc = tsDoc;
        this._attachedDocuments = {};
    }

    /**
     * TypeScriptDocument that this session maintains updated.
     * @type {!TypeScriptDocument}
     */
    TypeScriptSession.prototype.tsDoc = null;

    /**
     * All documents attached. Maps Document.file.fullPath -> Document.
     * @private
     * @type {Object.<string, Document>}
     */
    TypeScriptSession.prototype._attachedDocuments = null;

    /**
     * Adds, processes and attaches all the scripts contents for this TypeScriptDocument
     * and its references.
     * @returns {$.Promise} A promise object that will be resolved with this
     *      TypeScriptSession when all referenced documents has been processed.
     */
    TypeScriptSession.prototype.init = function () {
        // Attach this document
        this._attachDocument(this.tsDoc.doc, this._handleDocumentChange.bind(this));
        // Get references for this document
        var references = this.tsDoc.getReferences().all;
        // Attach referenced documents and return a promise
        return this._attachReferencedDocuments(references);
    };

    /**
     * Updates this TypeScriptDocument's script contents with the given changes for
     * the given referenced document.
     * @param event
     * @param {!Document} referencedDoc A referenced document
     * @param {{from:{line: number, ch: number}, to:{line: number, ch: number},
     *          text:string, next}} changes
     * @private
     */
    TypeScriptSession.prototype._handleReferencedDocumentChange = function (event, referencedDoc, changes) {
        this.tsDoc.updateScriptWithChanges(referencedDoc, changes);
        this.tsDoc.triggerHandlerChange();
    };

    /**
     * Updates this TypeScriptDocument's script contents with the given changes and
     * check if references have been added or removed.
     * @param event
     * @param {!Document} doc This document
     * @param {{from:{line: number, ch: number}, to:{line: number, ch: number},
     *          text:string, next}} changes
     * @private
     */
    TypeScriptSession.prototype._handleDocumentChange = function (event, doc, changes) {
        //TODO: do it only when the change is at the top of the file (before the first line of code)
        var references = this.tsDoc.getReferences(),
            that = this;

        // Attach added references
        if (references.added.length > 0) {
            this._attachReferencedDocuments(references.added);
        }

        // Detach removed references
        references.removed.forEach(function (relativePath) {
            var fullPath = that.tsDoc.getFullPath(relativePath);
            var doc = that._attachedDocuments[fullPath];
            that._detachDocument(doc);
        });

        this.tsDoc.updateScriptWithChanges(doc, changes);
        this.tsDoc.triggerHandlerChange();
    };

    /**
     * Adds and processes the given document as a script in this TypeScriptDocument and
     * start listening to the document's change event to update the script contents
     * automatically while this Session is active.
     * @param {!Document} doc This document or a referenced one
     * @param {!function(*, Document, {from:{line: number, ch: number},
     *          to:{line: number, ch: number}, text:string, next})} handleChangeFn
     * @private
     */
    TypeScriptSession.prototype._attachDocument = function (doc, handleChangeFn) {
        if (this._attachedDocuments[doc.file.fullPath]) {
            console.error("Document for this path already in _attachedDocuments: ", doc.file.fullPath);
            return;
        }

        doc.addRef();
        $(doc).on(TypeScriptUtils.eventName("change"), handleChangeFn);
        this._attachedDocuments[doc.file.fullPath] = doc;

        this.tsDoc.updateScriptWithText(doc);
        console.log("Script attached: ", doc.file.fullPath);
    };

    /**
     * Remove the given document script from this TypeScriptDocument and stop listening
     * to the document's change event.
     * @param {!Document} doc This document or a referenced one
     * @private
     */
    TypeScriptSession.prototype._detachDocument = function (doc) {
        $(doc).off(TypeScriptUtils.eventName("change"));
        delete this._attachedDocuments[doc.file.fullPath];

        this.tsDoc.removeScript(doc);
        console.log("Script detached: ", doc.file.fullPath);

        //TODO: do it also after deleted event of this document or not?
        doc.releaseRef();
    };

    /**
     * Attaches and processes the referenced document at the given relative path.
     * See _attachDocument documentation.
     * @returns {$.Promise} A promise object that will be resolved with this
     *      TypeScriptSession when the referenced document has been processed.
     * @private
     */
    TypeScriptSession.prototype._attachReferencedDocument = function (relativePath) {
        var that = this,
            result = new $.Deferred(),
            fullPath = this.tsDoc.getFullPath(relativePath);

        console.log("Start loading script: ", fullPath);
        DocumentManager.getDocumentForPath(fullPath)
            .done(function (referencedDoc) {
                that._attachDocument(referencedDoc,
                    that._handleReferencedDocumentChange.bind(that));
                result.resolve();
            });
        return result;
    };

    /**
     * Attaches and processes all the referenced documents.
     * See _attachDocument documentation.
     * @returns {$.Promise} A promise object that will be resolved with this
     *      TypeScriptDocument when all referenced documents has been processed.
     * @private
     */
    TypeScriptSession.prototype._attachReferencedDocuments = function (relativePaths) {
        var that = this,
            result = new $.Deferred();

        Async.doInParallel(relativePaths, function (relativePath) {
            return that._attachReferencedDocument(relativePath).promise();
        }).done(function () {
            result.resolve(that);
        });
        return result;
    };

    // Define public API
    exports.TypeScriptSession = TypeScriptSession;
});
