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

    var DocumentManager        = brackets.getModule("document/DocumentManager"),
        EditorManager          = brackets.getModule("editor/EditorManager"),
        TypeScriptUtils        = require("TypeScriptUtils"),
        PathUtils              = require("PathUtils"),
        TypeScriptDocument     = require("TypeScriptDocument").TypeScriptDocument,
        TypeScriptSession      = require("TypeScriptSession").TypeScriptSession;

    /**
     * @private
     * All documents with refCount > 0. Maps Document.file.fullPath -> Document.
     * @type {Object.<string, Document>}
     */
    var _sessions = {};

    var _currentSession;

    // return a synchronized tsDoc for the given doc
    // warning: it doesn't wait for the tsDoc to be ready
    function get(doc) {
        var session = _sessions[doc.file.fullPath];
        // if the doc is not in the cache, create it
        if (!session) {
            var tsDoc = new TypeScriptDocument(doc);
            session = new TypeScriptSession(tsDoc);
            session.init();
            _sessions[doc.file.fullPath] = session;
        }
        return session.tsDoc;
    }
    
    // return a synchronized tsDoc for the given doc
    // warning: it doesn't wait for the tsDoc to be ready
    function getSession(doc) {
        var session = _sessions[doc.file.fullPath];
        // if the doc is not in the cache, create it
        if (!session) {
            var tsDoc = new TypeScriptDocument(doc);
            session = new TypeScriptSession(tsDoc);
            session.init();
            _sessions[doc.file.fullPath] = session;
        }
        return session;
    }
    
    // return a synchronized tsDoc for the given doc
    function getAsync(doc) {
        var session = _sessions[doc.file.fullPath],
            result;
        // if the doc is not in the cache, create it
        if (!session) {
            var tsDoc = new TypeScriptDocument(doc);
            session = new TypeScriptSession(tsDoc);
            result = session.init();
            _sessions[doc.file.fullPath] = session;
        } else {
            result = new $.Deferred();
            result.resolve(session.tsDoc);
        }
        return result;
    }
    
    // return a synchronized tsDoc for the doc at the given fullPath
    function getFromPathAsync(fullPath) {
        var result = new $.Deferred();
        
        DocumentManager.getDocumentForPath(fullPath)
            .done(function (doc) {
                getAsync(doc).done(function (tsDoc) {
                    result.resolve(tsDoc);
                });
            });
        
        return result;
    }

    /** Get the current active session */
    function getCurrentSession() {
        return _currentSession;
    }

    /*
     * When the editor is changed, reset the hinting session and cached 
     * information, and reject any pending deferred requests.
     */
    function handleActiveEditorChange(event, current, previous) {
        if (!current || (previous &&
                         current.document.file.fullPath === previous.document.file.fullPath)) {
            return;
        }
        
        //TODO: updatescript si une/des references sont ajouté/supprimé dans le fichier courant!
        
//        if (_currentSyncDocument && previous) {
//            ////_currentSession.uninstallEditorListeners(previous);
//        }
        
        if (current.getModeForSelection() === TypeScriptUtils.MODE_NAME) {
            var currentDoc = current.document;
            console.log("Current session change to: ", currentDoc.file.fullPath);
            
            //TODO: async? if null?
            _currentSession = getSession(currentDoc);
            ////_currentSession.installEditorListeners(current);
        } else {
            _currentSession = null;
        }
    }

    $(EditorManager).on(TypeScriptUtils.eventName("activeEditorChange"), handleActiveEditorChange);

    // Define public API
    exports.get                = get;
    exports.getAsync           = getAsync;
    exports.getFromPathAsync   = getFromPathAsync;
    exports.getCurrentSession  = getCurrentSession;
});
