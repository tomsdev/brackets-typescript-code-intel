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

    exports.TypeScriptService       = require("TypeScriptService"),
    exports.TypeScriptQuickEdit     = require("TypeScriptQuickEdit/main"),
    exports.TypeScriptCodeHints     = require("TypeScriptCodeHints/main");

    // function getSymbol(index) {
    //     var doc = DocumentManager.getCurrentDocument();
    //     var symbol = getSymbolAtPosition(doc, index);

    //     var info = {};
    //     if (symbol) {
    //         if (symbol.unitIndex !== -1) {
    //             info.fileName = getFileName(symbol.unitIndex);
    //         }

    //         if (symbol.declAST) {
    //             info.hasAST = true;
    //             info.nodeType = TypeScript.NodeType._map[symbol.declAST.nodeType];

    //             if (symbol.declAST.minChar !== undefined) {
    //                 info.minChar = symbol.declAST.minChar;
    //             }

    //             if (symbol.declAST.limChar !== undefined) {
    //                 info.limChar = symbol.declAST.limChar;
    //             }

    //             if (symbol.declAST.preComments && symbol.declAST.preComments.length > 0) {
    //                 // todo: get other comments line in the array
    //                 // bug: no comments when it's a class method
    //                 info.declComments = symbol.declAST.preComments[0].content;
    //             }

    //             if (symbol.declAST.arguments) {
    //                 if (symbol.declAST.arguments.members && symbol.declAST.arguments.members.length > 0) {
    //                     //todo: other parameters
    //                     var parameters = symbol.declAST.arguments.members;
    //                     var name = parameters[0].id.text;
    //                     var type = parameters[0].typeExpr.term.text;

    //                     info.firstParameter = name + " : " + type;
    //                 }
    //             }
    //         }

    //         if (symbol.container) {
    //             info.container = symbol.container.name;
    //         }
            
    //         //console.log("symbol info: ", JSON.stringify(info));
    //         //console.log(symbol);
    //     }

    //     return symbol;
    // }

});
