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
        PathUtils           = require("PathUtils"),
        TypeScriptDocument       = require("TypeScriptDocument").TypeScriptDocument,
        TypeScriptSyncDocument       = require("TypeScriptSyncDocument").TypeScriptSyncDocument;

    /**
     * @private
     * All documents with refCount > 0. Maps Document.file.fullPath -> Document.
     * @type {Object.<string, Document>}
     */
    var _syncDocuments = {};

    var _currentSyncDocument;

    // synchronous but can return null
    // return tsDoc for doc (and create a syncDoc on it if necessary)
    //todo: tsDoc or doc in param?
    function get(doc) {
        var tsSyncDoc = _syncDocuments[doc.file.fullPath];
        // if the doc is not in the cache, create it
        if (!tsSyncDoc) {
            var tsDoc = new TypeScriptDocument(doc);
            tsSyncDoc = new TypeScriptSyncDocument(tsDoc);
            _syncDocuments[doc.file.fullPath] = tsSyncDoc;
        }
        return tsSyncDoc.tsDoc;
    }

    /** Get the current document from the document manager
     */
    function getCurrentDocument() {
        return _currentSyncDocument;
//        var doc = DocumentManager.getCurrentDocument();
//        if (doc) {
//            _setDocInfo(doc);
//        }
//        return doc;
    }

    function isDocumentHandled(doc) {
        return PathUtils.getExtension(doc.file.fullPath) === "ts";
    }

    // TODO:
    // relative path (pas juste enfant du directory)
    // updatescript si une reference est ajouté/supprimé dans le fichier courant!
    // raised when the editor show another document
    function _onCurrentDocumentChange() {
        var currentDoc = DocumentManager.getCurrentDocument();

        if(!isDocumentHandled(currentDoc)) {
            _currentSyncDocument = null;
            return;
        }

        console.log("TS currentDocumentChange to: ", currentDoc.file.fullPath);

        //todo: async? if null?
        _currentSyncDocument = get(currentDoc);
    }

    // sync with current document
    $(DocumentManager).on("currentDocumentChange", _onCurrentDocumentChange);

    // Define public API
    exports.get           = get;
    exports.getCurrentDocument           = getCurrentDocument;

    // Performance measurements
    //PerfUtils.createPerfMeasurement("DOCUMENT_MANAGER_GET_DOCUMENT_FOR_PATH", "DocumentManager.getDocumentForPath()");

    // Handle project change events
    //$(ProjectManager).on("projectOpen", _projectOpen);
});
