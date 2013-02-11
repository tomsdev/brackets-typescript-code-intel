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

/**
 * DocumentManager maintains a list of currently 'open' Documents. It also owns the list of files in
 * the working set, and the notion of which Document is currently shown in the main editor UI area.
 *
 * This module dispatches several events:
 *
 *    - dirtyFlagChange -- When any Document's isDirty flag changes. The 2nd arg to the listener is the
 *      Document whose flag changed.
 */
define(function (require, exports, module) {
    "use strict";

    var DocumentManager     = brackets.getModule("document/DocumentManager"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        Async               = brackets.getModule("utils/Async"),
        TypeScriptUtils     = require("TypeScriptUtils"),
        PathUtils           = require("PathUtils"),
        TypeScriptDocument  = require("TypeScriptDocument");

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
    // TODO: rename to TypeScriptSession
    function TypeScriptSession(tsDoc) {
        this.tsDoc = tsDoc;
    }

    /**
     * Whether this document has unsaved changes or not.
     * When this changes on any Document, DocumentManager dispatches a "dirtyFlagChange" event.
     * @type {Document}
     */
    TypeScriptSession.prototype.tsDoc = null;
    
    TypeScriptSession.prototype.init = function () {
        // load script content
        //TODO: surveiller que top de file et line changed pr references
        this._attachDocument(this.tsDoc.doc, this._handleDocumentChange.bind(this));
        // load references content, return promise
        return this._attachAllReferencedDocument();
    };

    TypeScriptSession.prototype._handleReferencedDocumentChange = function (event, changedDoc, changes) {
        this.tsDoc.updateScriptWithChanges(changedDoc, changes);
        this.tsDoc.triggerHandlerChange();
    };

    TypeScriptSession.prototype._handleDocumentChange = function (event, changedDoc, changes) {
        this.tsDoc.updateScriptWithChanges(changedDoc, changes);
        
        //TODO: scan references
        
        this.tsDoc.triggerHandlerChange();
    };

    TypeScriptSession.prototype._attachDocument = function (doc, handleChangeFn) {
        $(doc).on(TypeScriptUtils.eventName("change"), handleChangeFn);

        //TODO: referenceDoc.releaseRef()  when reference changed/deleted
        //TODO: Question: must do it after deleted event of document or not?
        doc.addRef();

        this.tsDoc.updateScriptWithText(doc);

        console.log("Script loaded: ", doc.file.fullPath);
    };

    TypeScriptSession.prototype._attachAllReferencedDocument = function () {
        var that = this,
            result = new $.Deferred(),
            references = this.tsDoc.getReferences();

        Async.doInParallel(references, function (relativePath) {
            var oneResult = new $.Deferred(),
                parentPath = PathUtils.getParentPath(that.tsDoc.doc.file.fullPath),
                // WARNING: won't work with parent relative path
                fullPath = PathUtils.getFullPathFromRelative(relativePath, parentPath);
            
            console.log("Start loading script: ", fullPath);

            DocumentManager.getDocumentForPath(fullPath)
                .done(function (referencedDoc) {
                    that._attachDocument(referencedDoc, that._handleReferencedDocumentChange.bind(that));
                })
                .always(function () {
                    oneResult.resolve();
                });

            return oneResult.promise();
        }).done(function () {
            result.resolve(this.tsDoc);
        });
        
        return result;
    };

    // Define public API
    exports.TypeScriptSession = TypeScriptSession;
});
