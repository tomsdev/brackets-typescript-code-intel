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
* TODO: merge in brackets (in file/FileUtils.js?)
*/
define(function (require, exports, module) {
    "use strict";

    function getExtension(filePath) {
        //TODO: update in this file the method that get an extension manually :)
        //TODO: update code with:
//        var i = fileExt.lastIndexOf("."),
//            ext = (i === -1 || i >= fileExt.length - 1) ? fileExt : fileExt.substr(i + 1);
//
//        return (_staticHtmlFileExts.indexOf(ext.toLowerCase()) !== -1);

        return filePath.substr(filePath.lastIndexOf('.') + 1);
    }

    //TODO: faire une method hasExtension(extensions) que cette méthode utilisera :)
//    function isDocumentHandled(doc) {
//        return getExtension(doc.file.fullPath) === "ts";
//    }

    function getFullPathFromRelative(relativePath, directoryPath) {
        // WARNING: won't work with parent relative path..
        var fullPath = directoryPath + "/" + relativePath;
        console.log("fullPath calculated: ", fullPath);
        return fullPath;
    }

    function getParentPath(filePath) {
        return filePath.substr(0, filePath.lastIndexOf('/'));
    }

    // Define public API
    exports.getExtension                   = getExtension;
    exports.getFullPathFromRelative        = getFullPathFromRelative;
    exports.getParentPath                  = getParentPath;
});
