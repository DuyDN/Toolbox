/**
 * TCGA Toolbox
 * Keep in mind that cross-browser support is not the goal of this library.
 * Depends on: toType.js, jquery.js
 */
/*jshint jquery:true browser:true */
/*global TCGA:false */
(function (exports) {
    "use strict";

    var loadScript, httpRequest, get, getRange, registerTab;

 // loadScript loads one or more scripts in order using HTML script elements.
 // If one script fails, the callback will be executed immediately.
 // @param {string} uri
 // @param {[string]} uri
 // @param {(err, [loaded_script, loaded_script, ...])} callback
    exports.loadScript = loadScript = function (uri, callback) {
        var uriType, loadedScripts;
        uriType = Object.toType(uri);
        if (uriType !== "string" && uriType !== "array") {
            throw new Error("Please provide a uri parameter (string or [string]).");
        }
        if (callback !== undefined && Object.toType(callback) !== "function") {
            throw new Error("Please provide a callback parameter (function).");
        }
        if (uriType === "string") {
         // Create list from string.
            uri = [uri];
        }
     // Set default callback handler.
        callback = callback || function () {};
     // Keep a list of loaded scripts.
        loadedScripts = [];
     // Use inline recursion to load all scripts.
        (function loadScriptRec() {
            var target, head, script;
            if (uri.length === 0) {
                callback(null, loadedScripts);
                return;
            }
            target = uri.shift();
            head = document.head;
            script = document.createElement("script");
            script.src = target;
            script.onload = function () {
                loadedScripts.push(target);
                head.removeChild(script);
                loadScriptRec();
            };
            script.onerror = function () {
                head.removeChild(script);
                callback({
                    name: "Error",
                    message: "Loading the script failed. The browser log might have more details."
                }, loadedScripts);
            };
            head.appendChild(script);
        }());
    };

 // Performs an HTTP request.
 // @param {string} options
 // @param {object} options
 // @param {string} options.uri
 // @param {string} options.method
 // @param {object} options.headers
 // @param {boolean} options.parseBody Parse body according to Content-Type (currently supported: JSON).
 // @param {(err, res)} callback
    exports.httpRequest = httpRequest = function (options, callback) {
        var xhr;
        if (Object.toType(options) === "string") {
            options = {
                uri: options
            };
        } else {
            options = options || {};
            if (options.hasOwnProperty("uri") === false || Object.toType(options.uri) !== "string") {
                throw new Error("Please provide an options.uri parameter (string).");
            }
        }
        if (Object.toType(callback) !== "function") {
            throw new Error("Please provide a callback parameter (function).");
        }
     // Set default options.
        options.headers = options.headers || {};
        options.parseBody = options.parseBody || false;
     // Create client.
        xhr = new XMLHttpRequest();
        xhr.open("GET", options.uri);
        Object.keys(options.headers).forEach(function (header) {
            xhr.setRequestHeader(header, options.headers[header]);
        });
        xhr.onload = function () {
            var body;
            if (xhr.status >= 200 && xhr.status < 300) {
                if (options.parseBody === true) {
                    try {
                        switch (xhr.getResponseHeader("Content-Type")) {
                            case "application/json":
                                body = JSON.parse(xhr.responseText);
                                break;
                            default:
                                body = xhr.responseText;
                                break;
                        }
                    } catch (e) {
                        callback(e, null);
                        return;
                    }
                    callback(null, body);
                } else {
                    callback(null, xhr.responseText);
                }
            } else {
                callback({
                    name: "Error",
                    message: "Status Code: " + xhr.status
                }, null);
            }
        };
        xhr.onerror = function () {
            callback({
                name: "Error",
                message: "Getting the URI failed. The browser log might have more details."
            }, null);
        };
        xhr.send(null);
    };

 // Performs a GET request.
 // @param {string} uri
 // @param {(err, res)} callback
    exports.get = get = function (uri, callback) {
        httpRequest({
            uri: uri
        }, callback);
    };

 // Performs a ranged GET request.
 // @param {string} uri
 // @param {number} startByte
 // @param {number} endByte
 // @param {(err, res)} callback
    exports.getRange = getRange = function (uri, startByte, endByte, callback) {
        startByte = startByte || 0;
        endByte = endByte || 100;
        httpRequest({
            uri: uri,
            headers: {
                "Range": "bytes=" + startByte + "-" + endByte
            }
        }, callback);
    };

 // @param {string} name
 // @param {string} title
 // @param {string} contents
    exports.registerTab = registerTab = function (name, title, contents) {
        var tab, nav, navLi;
        if (!title || !contents) {
            return;
        } else {
            tab = $("<div>").addClass("tab-pane")
                            .addClass("row")
                            .attr("id", name)
                            .html(contents)
                            .insertBefore("#end-of-content");
            navLi = $("<li>");
            nav = $("<a>").attr("href", "#" + name)
                          .attr("data-toggle", "tab")
                          .html(title);
            navLi.append(nav)
                 .appendTo(".nav");
        }
    };

}(this.TCGA = {}));
