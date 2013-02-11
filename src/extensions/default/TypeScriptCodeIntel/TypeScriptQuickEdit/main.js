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
    
    var AppInit                 = brackets.getModule("utils/AppInit"),
        MultiRangeInlineEditor  = brackets.getModule("editor/MultiRangeInlineEditor").MultiRangeInlineEditor,
        FileIndexManager        = brackets.getModule("project/FileIndexManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        NativeFileSystem        = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        FileUtils               = brackets.getModule("file/FileUtils"),
        Async                   = brackets.getModule("utils/Async"),
        TypeScriptUtils         = require("TypeScript/main").TypeScriptUtils,
        TypeScriptService       = require("TypeScript/main").TypeScriptService;
    
    /**
     * @private
     * For unit and performance tests. Allows lookup by function name instead of editor offset .
     *
     * @param {!Editor} hostEditor
     * @param {!string} functionName
     * @return {$.Promise} a promise that will be resolved with an InlineWidget
     *      or null if we're not going to provide anything.
     */
    function _createInlineEditor(hostEditor, hostTsDoc, declInfo) {
        var result = new $.Deferred();
        
        DocumentManager.getDocumentForPath(declInfo.scriptName)
            .done(function (doc) {
                var functions = [{
                    document: doc,
                    lineStart: declInfo.range.start.line,
                    lineEnd: declInfo.range.end.line,
                    name: declInfo.name
                }];
                //TODO: use a one range inline editor if there is always one result?
                var jsInlineEditor = new MultiRangeInlineEditor(functions);
                jsInlineEditor.load(hostEditor);
                result.resolve(jsInlineEditor);
            })
            .fail(function (error) {
                result.reject(error);
            });
        
        return result.promise();
    }
    
    /**
     * This function is registered with EditorManager as an inline editor provider. It creates an inline editor
     * when the cursor is on a JavaScript function name, finds all functions that match the name
     * and shows (one/all of them) in an inline editor.
     *
     * @param {!Editor} editor
     * @param {!{line:Number, ch:Number}} pos
     * @return {$.Promise} a promise that will be resolved with an InlineWidget
     *      or null if we're not going to provide anything.
     */
    function typeScriptFunctionProvider(hostEditor, pos) {
        // Only provide a TypeScript editor when cursor is in TypeScript content
        if (hostEditor.getModeForSelection() !== TypeScriptUtils.MODE_NAME) {
            return null;
        }
        
        // Only provide TypeScript editor if the selection is within a single line
        var sel = hostEditor.getSelection(false);
        if (sel.start.line !== sel.end.line) {
            return null;
        }

        //TODO: async? null?
        var hostTsDoc = TypeScriptService.get(hostEditor.document);
        var symbol = hostTsDoc.getSymbolAtPosition(sel.start);
        var declInfo = hostTsDoc.getDeclarationInfo(symbol);
        
        // Cancel if there is no declaration associated to the current selection
        if (!declInfo) {
            return null;
        }
        
        // Cancel if the declaration is at the same line as the current selection
        if (declInfo.scriptName === hostTsDoc.scriptName) {
            var line = hostEditor.getSelection(false).start.line;
            if (declInfo.range.start.line === line) {
                return null;
            }
        }

        return _createInlineEditor(hostEditor, hostTsDoc, declInfo);
    }

    AppInit.appReady(function () {
        EditorManager.registerInlineEditProvider(typeScriptFunctionProvider);
    });
    
    // For unit testing
    exports.typeScriptFunctionProvider = typeScriptFunctionProvider;
});
