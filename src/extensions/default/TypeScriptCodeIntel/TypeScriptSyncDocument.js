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

    // Idea:
    // each plugin could activate this service
    // so that it runs only if really needed
    // (keep a count of plugin that need it so that we can dispose when no one need it anymore)

    var DocumentManager     = brackets.getModule("document/DocumentManager"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        Async               = brackets.getModule("utils/Async"),
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
    // TODO: rename to TypeScriptDevelopment OR keep it as a private class?
    function TypeScriptSyncDocument(tsDoc) {
        this.tsDoc = tsDoc;

        // load script content
        this._attachDocument(this.tsDoc.doc, this._handleDocumentChange.bind(this)); //todo: surveiller que top de file et line changed pr references

        // load references content
        this._attachAllReferencedDocument();
    }

    /**
     * Whether this document has unsaved changes or not.
     * When this changes on any Document, DocumentManager dispatches a "dirtyFlagChange" event.
     * @type {Document}
     */
    TypeScriptSyncDocument.prototype.tsDoc = null;

    TypeScriptSyncDocument.prototype._handleReferencedDocumentChange = function (event, changedDoc, changes) {
        this.tsDoc.updateScriptWithChanges(changedDoc, changes);
    };

    TypeScriptSyncDocument.prototype._handleDocumentChange = function (event, changedDoc, changes) {
        this.tsDoc.updateScriptWithChanges(changedDoc, changes);
        //todo: scan ref
    };

    TypeScriptSyncDocument.prototype._attachDocument = function (doc, handleChangeFn) {

        $(doc).on("change", handleChangeFn);

        //TODO: referenceDoc.releaseRef()  when reference changed/deleted
        //TODO: Question: must do it after deleted event of document or not?
        doc.addRef();

        this.tsDoc.updateScriptWithText(doc);

        console.log("!script loaded: " + doc.file.fullPath);
    };

    TypeScriptSyncDocument.prototype._attachAllReferencedDocument = function () {
        var that = this,
            references = this.tsDoc.getReferences();

        Async.doInParallel(references, function (relativePath) {
            var oneResult = new $.Deferred();

            console.log("...loading script: " + relativePath);

            var parentPath = PathUtils.getParentPath(that.tsDoc.doc.file.fullPath);

            // WARNING: won't work with parent relative path..
            var fullPath = PathUtils.getFullPathFromRelative(relativePath, parentPath);

            DocumentManager.getDocumentForPath(fullPath)
                .done(function (referencedDoc) {
                    that._attachDocument(referencedDoc, that._handleReferencedDocumentChange.bind(that));
                })
                .always(function () {
                    oneResult.resolve();
                });

            return oneResult.promise();
        });
    };

//    // todo: maintain a count of enable demands?
//    TypeScriptSyncDocument.prototype.enableSync = function () {
//        // todo: i can't reload all script
//        // todo: i have to know which ones need to be updated
//
//        // load script content in itself TS document
//        this.tsDoc.updateAllScript(this.tsDoc.doc); //todo: sync?? surveiller que top de file et line changed pr references
//
//        // load references content in current TS document
//        this._attachAllReferencedDocument();
//    };
//
//    TypeScriptSyncDocument.prototype.DisableSync = function () {
//        //todo: this._detachAllReferencedDocument();
//    };


    ////////////////////////////////////////////////////////////////////////////////////////





//    /** Get the current document from the document manager
//     * _adds extension, url and root to the document
//     */
//    function _getCurrentDocument() {
//        var doc = DocumentManager.getCurrentDocument();
//        if (doc) {
//            _setDocInfo(doc);
//        }
//        return doc;
//    }
//
//    /** Create a live version of a Brackets document */
//    function _createDocument(doc, editor) {
//        var DocClass = _classForDocument(doc);
//        if (DocClass) {
//            return new DocClass(doc, editor);
//        } else {
//            return null;
//        }
//    }
//
//    /** Open a live document
//     * @param {Document} source document to open
//     */
//    function _openDocument(doc, editor) {
//        _closeDocument();
//        _liveDocument = _createDocument(doc, editor);
//
//        // Gather related CSS documents.
//        // FUTURE: Gather related JS documents as well.
//        _relatedDocuments = [];
//        agents.css.getStylesheetURLs().forEach(function (url) {
//            // FUTURE: when we get truly async file handling, we might need to prevent other
//            // stuff from happening while we wait to add these listeners
//            DocumentManager.getDocumentForPath(_urlToPath(url))
//                .done(function (doc) {
//                    if (!_liveDocument || (doc !== _liveDocument.doc)) {
//                        _setDocInfo(doc);
//                        var liveDoc = _createDocument(doc);
//                        if (liveDoc) {
//                            _relatedDocuments.push(liveDoc);
//                            $(liveDoc).on("deleted", _handleRelatedDocumentDeleted);
//                        }
//                    }
//                });
//        });
//    }
//
//    /** Triggered by a document change from the DocumentManager */
//    function _onDocumentChange() {
//        var doc = _getCurrentDocument(),
//            status = STATUS_ACTIVE;
//        if (!doc) {
//            return;
//        }
//
//        if (Inspector.connected()) {
//            hideHighlight();
//            if (agents.network && agents.network.wasURLRequested(doc.url)) {
//                _closeDocument();
//                var editor = EditorManager.getCurrentFullEditor();
//                _openDocument(doc, editor);
//            } else {
//                if (exports.config.experimental || _isHtmlFileExt(doc.extension)) {
//                    close();
//                    window.setTimeout(open);
//                }
//            }
//
//            if (doc.isDirty && _classForDocument(doc) !== CSSDocument) {
//                status = STATUS_OUT_OF_SYNC;
//            }
//            _setStatus(status);
//        }
//    }
//
//    /** Initialize the LiveDevelopment Session */
//    function init(theConfig) {
//        exports.config = theConfig;
//        $(Inspector).on("connect", _onConnect)
//            .on("disconnect", _onDisconnect)
//            .on("error", _onError);
//        $(DocumentManager).on("currentDocumentChange", _onDocumentChange)
//            .on("documentSaved", _onDocumentSaved)
//            .on("dirtyFlagChange", _onDirtyFlagChange);
//    }










//            TypeScriptDocument.getAsync(currentDoc).done(function (tsDoc) {
//                console.log("TS currentDocumentChange get");
//
//                // load script content in its TS document
//                TypeScriptService.updateAllScript(); //todo: sync?? surveiller que top de file et line changed pr references
//
//                // load references content in current TS document
//                loadReferences();
//
//                console.log("TS currentDocumentChange get end");
//            });

    // Define public API
    exports.TypeScriptSyncDocument  = TypeScriptSyncDocument;

    // Performance measurements
    //PerfUtils.createPerfMeasurement("DOCUMENT_MANAGER_GET_DOCUMENT_FOR_PATH", "DocumentManager.getDocumentForPath()");

    // Handle project change events
    //$(ProjectManager).on("projectOpen", _projectOpen);
});
