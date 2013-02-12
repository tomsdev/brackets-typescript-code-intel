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

//TODO: merge these functions in brackets (in file/FileUtils.js)
define(function (require, exports, module) {
    "use strict";

    /**
     * Converts a relative path to a full path based on the given directory path.
     * @param {!string} relativePath
     * @param {!string} directoryPath
     * @returns {string}
     */
    function convertRelativePathToFullPath(relativePath, directoryPath) {
        //TODO: handle parent relative path (starting with ../)
        var fullPath = directoryPath + "/" + relativePath;
        console.log("FullPath calculated: ", fullPath);
        return fullPath;
    }

    /**
     * Return the parent path of the given path.
     * @param {!string} path
     * @returns {string}
     */
    function getParentPath(path) {
        return path.substr(0, path.lastIndexOf('/'));
    }

    // Define public API
    exports.convertRelativePathToFullPath = convertRelativePathToFullPath;
    exports.getParentPath                 = getParentPath;
});
