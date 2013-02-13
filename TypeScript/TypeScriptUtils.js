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
    
    var MODE_NAME = "typescript";
    
    /**
     * Get a typescript-specific event name
     */
    function eventName(name) {
        var EVENT_TAG = "brackets-typescript";
        return name + "." + EVENT_TAG;
    }

    /**
     * Returns the elements added and removed between the given previous and current
     * objects.
     * Note: The objects should be hash tables.
     * @param {Object} previous
     * @param {Object} current
     * @returns {{added: Array.<string>, removed: Array.<string>}}
     */
    function getObjectsDiff(previous, current) {
        var added = [],
            removed = [];

        for (var i in current) {
            if (i in previous) {
                delete previous[i];
            }
            else {
                added.push(i);
            }
        }

        for (var i in previous) {
            removed.push(i);
        }
        return {added: added, removed: removed};
    }

    /**
     * Returns the object properties as an array.
     * @param {Object} obj
     * @returns {Array.<string>}
     */
    function getObjectKeys(obj) {
        var array = [],
            key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                array.push(key);
            }
        }
        return array;
    }

    // Define public API
    exports.MODE_NAME      = MODE_NAME;
    exports.eventName      = eventName;
    exports.getObjectsDiff = getObjectsDiff;
    exports.getObjectKeys  = getObjectKeys;
});
