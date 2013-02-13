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

define(function (require, exports, module) {
    "use strict";

    var DocumentManager        = brackets.getModule("document/DocumentManager"),
        EditorManager          = brackets.getModule("editor/EditorManager"),
        PathUtils              = require("PathUtils"),
        TypeScriptUtils        = require("TypeScript/TypeScriptUtils"),
        TypeScriptDocument     = require("TypeScript/TypeScriptDocument").TypeScriptDocument,
        TypeScriptSession      = require("TypeScript/TypeScriptSession").TypeScriptSession;

    /**
     * All sessions in cache. Maps Document.file.fullPath -> TypeScriptSession.
     * TODO: limit the cache
     * @type {Object.<string, TypeScriptSession>}
     * @private
     */
    var _sessions = {};

    /**
     * Current active session.
     * @type {TypeScriptSession}
     * @private
     */
    var _currentSession = null;

    /**
     * Returns a session associated to the given document and creates it if needed.
     * @param {!Document} doc
     * @returns {$.Promise} A promise object that will be resolved with the session
     */
    function getSession(doc) {
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
            result.resolve(session);
        }
        return result;
    }

    /**
     * Returns a session associated to the given full path and creates it if needed.
     * @param {!Document} doc
     * @returns {$.Promise} A promise object that will be resolved with the session
     */
    function getSessionFromPath(fullPath) {
        var result = new $.Deferred();
        
        DocumentManager.getDocumentForPath(fullPath)
            .done(function (doc) {
                getSession(doc).done(function (session) {
                    result.resolve(session);
                });
            });
        return result;
    }

    /**
     * Returns the current active session.
     * @returns {TypeScriptSession}
     */
    function getCurrentSession() {
        return _currentSession;
    }

    /**
     * When the active editor is changed, change the current active session to its
     * document if it's a typescript file. Create the session if needed.
     * @param event
     * @param {?Editor} current
     * @param {?Editor} previous
     */
    function _handleActiveEditorChange(event, current, previous) {
        if (!current || (previous &&
                         current.document.file.fullPath === previous.document.file.fullPath)) {
            return;
        }
        // Here we could detach the session from the previous editor
        //if (_currentSession && previous) { }

        _currentSession = null;
        if (current.getModeForSelection() === TypeScriptUtils.MODE_NAME) {
            console.log("Current session changing to: ", current.document.file.fullPath);

            getSession(current.document).done(function (session) {
                console.log("Current session changed to: ", current.document.file.fullPath);
                _currentSession = session;
            });
        }
    }

    // Listen for activeEditorChange event
    $(EditorManager).on(TypeScriptUtils.eventName("activeEditorChange"), _handleActiveEditorChange);

    // Define public API
    exports.getSession          = getSession;
    exports.getSessionFromPath  = getSessionFromPath;
    exports.getCurrentSession   = getCurrentSession;
});
