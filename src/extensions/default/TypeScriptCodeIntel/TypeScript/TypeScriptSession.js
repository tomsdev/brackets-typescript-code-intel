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
     *
     *
     * @param {!Document} tsDoc
     */
    function TypeScriptSession(tsDoc) {
        this.tsDoc = tsDoc;
    }

    /**
     * TypeScriptDocument that this session maintains updated.
     * @type {!TypeScriptDocument}
     */
    TypeScriptSession.prototype.tsDoc = null;

    /**
     * Adds, processes and attaches all the scripts contents for this TypeScriptDocument
     * and its references.
     * @returns {$.Promise} A promise object that will be resolved with this
     *      TypeScriptDocument when all referenced documents has been processed.
     */
    TypeScriptSession.prototype.init = function () {
        // Attach this document
        this._attachDocument(this.tsDoc.doc, this._handleDocumentChange.bind(this));
        // Attach referenced documents and return a promise
        return this._attachAllReferencedDocuments();
    };

    /**
     * Updates this TypeScriptDocument's script contents with the given changes for
     * the given referenced document.
     * @param event
     * @param {!Document} referencedDoc A referenced document
     * @param {!{from:number, to:number, text:string, next:{from:number, to:number, text:string}}} changes
     * @private
     */
    TypeScriptSession.prototype._handleReferencedDocumentChange = function (event, referencedDoc, changes) {
        this.tsDoc.updateScriptWithChanges(referencedDoc, changes);
        this.tsDoc.triggerHandlerChange();
    };

    /**
     * Updates this TypeScriptDocument's script contents with the given changes.
     * @param event
     * @param {!Document} doc This document
     * @param {!{from:number, to:number, text:string, next:{from:number, to:number, text:string}}} changes
     * @private
     */
    TypeScriptSession.prototype._handleDocumentChange = function (event, doc, changes) {
        //TODO: watch the top of the file for references changes
        this.tsDoc.updateScriptWithChanges(doc, changes);
        this.tsDoc.triggerHandlerChange();
    };

    /**
     * Adds and processes the given document as a script in this TypeScriptDocument and
     * start listen to the document change event to update the script contents
     * automatically while this Session is active.
     * @param {!Document} doc This document or a referenced one
     * @param {!function(*, Document, {from:number, to:number, text:string, next:{from:number, to:number, text:string}})} handleChangeFn
     * @private
     */
    TypeScriptSession.prototype._attachDocument = function (doc, handleChangeFn) {
        $(doc).on(TypeScriptUtils.eventName("change"), handleChangeFn);

        //TODO: referenceDoc.releaseRef()  when reference changed/deleted
        //TODO: Must do it after deleted event of document or not?
        doc.addRef();

        this.tsDoc.updateScriptWithText(doc);
        console.log("Script loaded: ", doc.file.fullPath);
    };

    /**
     * Attaches and processes all the referenced documents by this TypeScriptDocument.
     * See _attachDocument documentation.
     * @returns {$.Promise} A promise object that will be resolved with this
     *      TypeScriptDocument when all referenced documents has been processed.
     * @private
     */
    TypeScriptSession.prototype._attachAllReferencedDocuments = function () {
        var that = this,
            result = new $.Deferred(),
            references = this.tsDoc.getReferences();

        Async.doInParallel(references, function (relativePath) {
            var oneResult = new $.Deferred(),
                parentPath = PathUtils.getParentPath(that.tsDoc.doc.file.fullPath),
                // WARNING: won't work with parent relative path for the moment
                fullPath = PathUtils.convertRelativePathToFullPath(relativePath, parentPath);
            
            console.log("Start loading script: ", fullPath);

            DocumentManager.getDocumentForPath(fullPath)
                .done(function (referencedDoc) {
                    that._attachDocument(referencedDoc,
                                         that._handleReferencedDocumentChange.bind(that));
                })
                .always(function () {
                    oneResult.resolve();
                });

            return oneResult.promise();
        }).done(function () {
            result.resolve(that.tsDoc);
        });
        
        return result;
    };

    // Define public API
    exports.TypeScriptSession = TypeScriptSession;
});
