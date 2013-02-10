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


/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, describe, it, xit, expect, beforeEach, afterEach, waitsFor, runs, $, brackets, waitsForDone */

define(function (require, exports, module) {
    "use strict";

    var CommandManager,         // loaded from brackets.test
        EditorManager,          // loaded from brackets.test
        FileIndexManager,       // loaded from brackets.test
        PerfUtils,              // loaded from brackets.test
        JSUtils,                // loaded from brackets.test
        
        FileUtils           = brackets.getModule("file/FileUtils"),
        NativeFileSystem    = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        SpecRunnerUtils     = brackets.getModule("spec/SpecRunnerUtils"),
        UnitTestReporter    = brackets.getModule("test/UnitTestReporter");

    var extensionPath = FileUtils.getNativeModuleDirectoryPath(module),
        testPath = extensionPath + "/unittest-files/syntax",
        tempPath = SpecRunnerUtils.getTempDirectory(),
        testWindow,
        initInlineTest;

    function rewriteProject(spec) {
        var result = new $.Deferred(),
            infos = {},
            options = {
                parseOffsets    : true,
                infos           : infos,
                removePrefix    : true
            };
        
        SpecRunnerUtils.copyPath(testPath, tempPath, options).done(function () {
            spec.infos = infos;
            result.resolve();
        }).fail(function () {
            result.reject();
        });
        
        return result.promise();
    }
    
    /**
     * Performs setup for an inline editor test. Parses offsets (saved to Spec.offsets) for all files in
     * the test project (testPath) and saves files back to disk without offset markup.
     * When finished, open an editor for the specified project relative file path
     * then attempts opens an inline editor at the given offset. Installs an after()
     * function restore all file content back to original state with offset markup.
     * 
     * @param {!string} openFile Project relative file path to open in a main editor.
     * @param {!number} openOffset The offset index location within openFile to open an inline editor.
     * @param {?boolean} expectInline Use false to verify that an inline editor should not be opened. Omit otherwise.
     */
    var _initInlineTest = function (openFile, openOffset, expectInline, workingSet) {
        var allFiles,
            inlineOpened = null,
            spec = this;
        
        workingSet = workingSet || [];
        expectInline = (expectInline !== undefined) ? expectInline : true;
        
        runs(function () {
            waitsForDone(rewriteProject(spec), "rewriteProject");
        });
        
        SpecRunnerUtils.loadProjectInTestWindow(tempPath);
        
        runs(function () {
            workingSet.push(openFile);
            waitsForDone(SpecRunnerUtils.openProjectFiles(workingSet), "openProjectFiles");
        });
        
        // wait for typescript service to process the file in the current test window
        runs(function () {
            var extensionRequire = testWindow.brackets.getModule("utils/ExtensionLoader").getRequireContextForExtension("TypeScriptCodeIntel");
            var typeScriptService = extensionRequire("main").TypeScriptService;
            var fullPath = testPath + "/" + openFile;
            
            waitsForDone(typeScriptService.getFromPathAsync(fullPath), "getFromPathAsync");
        });
        
        if (openOffset !== undefined) {
            runs(function () {
                // open inline editor at specified offset index
                waitsForDone(SpecRunnerUtils.toggleQuickEditAtOffset(
                    EditorManager.getCurrentFullEditor(),
                    spec.infos[openFile].offsets[openOffset]
                ), "toggleQuickEditAtOffset");
            });
        }
    };
    
    /**
     * Open an editor for the specified project relative file path
     * then attempts opens an inline editor at the given offset and
     * test if the cursor position is in the specified expected file
     * at the correct given offset (use offset + 1).
     * 
     * For example:
     * 
     * given an openFile with content:
     *     var a = {{10}}func1();
     * and given an expectFile with content:
     *     {{11}}function func1() { //code }
     * 
     * it will open an inline editor at {{10}}
     * and expect the cursor position at {{11}}
     * 
     * @param {!number} offset The offset index location within openFile to open an inline editor.
     * @param {!string} openFile Project relative file path to open in a main editor.
     * @param {?string} expectFile Project relative file path expected to be open in the inline editor.
     *                             Omit if the file is the same as the openFile.
     */
    var _inlineTest = function (offset, openFile, expectFile) {
        expectFile = expectFile || openFile;
        
        initInlineTest(openFile, offset);
        
        runs(function () {
            var inlineWidget = EditorManager.getCurrentFullEditor().getInlineWidgets()[0];
            var inlinePos = inlineWidget.editors[0].getCursorPos();
            
            // verify cursor position in inline editor (use offset + 1)
            expect(inlinePos).toEqual(this.infos[expectFile].offsets[offset + 1]);
        });
    };
    
    describe("TypeScriptQuickEdit", function () {

        /*
         * 
         */
        describe("typeScriptFunctionProvider", function () {

            beforeEach(function () {
                initInlineTest = _initInlineTest.bind(this);
                SpecRunnerUtils.createTestWindowAndRun(this, function (w) {
                    testWindow          = w;
                    EditorManager       = testWindow.brackets.test.EditorManager;
                    CommandManager      = testWindow.brackets.test.CommandManager;
                    FileIndexManager    = testWindow.brackets.test.FileIndexManager;
                    JSUtils             = testWindow.brackets.test.JSUtils;
                });
                
                this.addMatchers({
                        
                    toHaveInlineEditorRange: function (range) {
                        var i = 0,
                            editor = this.actual,
                            hidden,
                            lineCount = editor.lineCount(),
                            shouldHide = [],
                            shouldShow = [],
                            startLine = range.startLine,
                            endLine = range.endLine,
                            visibleRangeCheck;
                        
                        for (i = 0; i < lineCount; i++) {
                            hidden = editor._codeMirror.getLineHandle(i).hidden || false;
                            
                            if (i < startLine) {
                                if (!hidden) {
                                    shouldHide.push(i); // lines above start line should be hidden
                                }
                            } else if ((i >= startLine) && (i <= endLine)) {
                                if (hidden) {
                                    shouldShow.push(i); // lines in the range should be visible
                                }
                            } else if (i > endLine) {
                                if (!hidden) {
                                    shouldHide.push(i); // lines below end line should be hidden
                                }
                            }
                        }
                        
                        visibleRangeCheck = (editor._visibleRange.startLine === startLine) &&
                            (editor._visibleRange.endLine === endLine);
                        
                        this.message = function () {
                            var msg = "";
                            
                            if (shouldHide.length > 0) {
                                msg += "Expected inline editor to hide [" + shouldHide.toString() + "].\n";
                            }
                            
                            if (shouldShow.length > 0) {
                                msg += "Expected inline editor to show [" + shouldShow.toString() + "].\n";
                            }
                            
                            if (!visibleRangeCheck) {
                                msg += "Editor._visibleRange [" +
                                    editor._visibleRange.startLine + "," +
                                    editor._visibleRange.endLine + "] should be [" +
                                    startLine + "," + endLine + "].";
                            }
                            
                            return msg;
                        };
                        
                        return (shouldHide.length === 0) &&
                            (shouldShow.length === 0) &&
                            visibleRangeCheck;
                    }
                });
            });
    
            afterEach(function () {
                //debug visual confirmation of inline editor
                //waits(1000);
                
                // revert files to original content with offset markup
                SpecRunnerUtils.closeTestWindow();
            });

            it("should ignore tokens that are not function calls or references", function () {
                var editor,
                    extensionRequire,
                    tsQuickEditMain,
                    tokensFile = "tokens.ts",
                    promise,
                    offsets;
                
                initInlineTest(tokensFile);
               
                runs(function () {
                    extensionRequire = testWindow.brackets.getModule("utils/ExtensionLoader").getRequireContextForExtension("TypeScriptCodeIntel");
                    tsQuickEditMain = extensionRequire("main").TypeScriptQuickEdit;
                    editor = EditorManager.getCurrentFullEditor();
                    offsets = this.infos[tokensFile];
                    
                    // regexp token
                    promise = tsQuickEditMain.typeScriptFunctionProvider(editor, offsets[0]);
                    expect(promise).toBeNull();
                    
                    // multi-line comment
                    promise = tsQuickEditMain.typeScriptFunctionProvider(editor, offsets[1]);
                    expect(promise).toBeNull();
                    
                    // single-line comment
                    promise = tsQuickEditMain.typeScriptFunctionProvider(editor, offsets[2]);
                    expect(promise).toBeNull();
                    
                    // string, double quotes
                    promise = tsQuickEditMain.typeScriptFunctionProvider(editor, offsets[3]);
                    expect(promise).toBeNull();
                    
                    // string, single quotes
                    promise = tsQuickEditMain.typeScriptFunctionProvider(editor, offsets[4]);
                    expect(promise).toBeNull();
                });
            });
            
            it("should open a function with  form: function functionName()", function () {
                _inlineTest(10, "test1main.ts", "test1inline.ts");
            });

            it("should open a function with  form: functionName = function()", function () {
                _inlineTest(20, "test1main.ts", "test1inline.ts");
            });
            
            it("should open a function declared in the same file", function () {
                _inlineTest(30, "test1main.ts");
            });

            it("should open an object declaration", function () {
                _inlineTest(40, "test1main.ts");
            });

            it("should open a class constructor", function () {
                _inlineTest(50, "test1main.ts", "test1inline.ts");
            });

            it("should open a class property", function () {
                _inlineTest(60, "test1main.ts", "test1inline.ts");
            });

            it("should open a class method", function () {
                _inlineTest(70, "test1main.ts", "test1inline.ts");
            });
        });
        
    });
});
