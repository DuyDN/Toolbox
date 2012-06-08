/**
 * TCGA Toolbox
 * Keep in mind that cross-browser support is not the goal of this library.
 * Depends on: toType.js, jquery.js
 */
/*jshint jquery:true browser:true */
/*global TCGA:false, TarGZ:false, chrome:false */
(function (exports) {
    "use strict";

    var modules, loadScript, httpRequest, get, getJSON, getXML, getArchive, getRange, data, hub,
        registerTab, toast, version, setLocation;

 // Returns a list of registered modules.
 // @param {(err, modules)} callback
 // @param {[string]} callback.modules
    exports.modules = modules = function (callback) {
        var modules, search;
        if (Object.toType(callback) !== "function") {
            throw new Error("Please provide a callback parameter (function).");
        }
        modules = [];
        search = window.location.search;
        if (search !== "") {
            search.substring(1, search.length).split("&").forEach(function (pair) {
                modules.push(pair.split("=")[1]);
            });
        }
        callback(null, modules);
    };

 // Loads one or more scripts in order using HTML script elements.
 // If one script fails, the callback will be executed immediately.
 // @param {string} options
 // @param {[string]} options
 // @param {options} options
 // @param {(err, [loaded_script, loaded_script, ...])} callback
    exports.loadScript = loadScript = function (options, callback) {
        var optionsType, loadedScripts;
        optionsType = Object.toType(options);
        if (["string", "array", "object"].indexOf(optionsType) === -1) {
            throw new Error("Please provide a uri parameter (string, [string], or object).");
        }
        if (callback !== undefined && Object.toType(callback) !== "function") {
            throw new Error("Please provide a callback parameter (function).");
        }
        if (optionsType === "string") {
            options = {
                scripts: [options]
            };
        } else if (optionsType === "array") {
            options = {
                scripts: options
            };
        } else {
            if (options.hasOwnProperty("scripts") === false || Object.toType(options.scripts) !== "array") {
                throw new Error("Please provide an options.scripts parameter ([string]).");
            }
        }
        if (options.hasOwnProperty("registerModule") === false || Object.toType(options.registerModule) !== "boolean") {
            options.registerModule = true;
        }
     // Set default callback handler.
        callback = callback || function () {};
     // Keep a list of loaded scripts.
        loadedScripts = [];
     // Use inline recursion to load all scripts.
        (function loadScriptRec() {
            var target, head, script;
            if (options.scripts.length === 0) {
                if (options.registerModule === true) {
                 // Add modules to URL bar.
                    loadedScripts.forEach(function (script) {
                        setLocation(script);
                    });
                }
                callback(null, loadedScripts);
                return;
            }
            target = options.scripts.shift();
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
 // @param {string} callback.res.body
 // @param {number} callback.res.statusCode
 // @param {object} callback.res.headers
    exports.httpRequest = httpRequest = function (options, callback) {
        var xhr;
        if (Object.toType(options) === "string") {
         // Convert string argument to options object.
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
            var headers, response, body, contentType;
            headers = {};
         // Parse response headers.
            xhr.getAllResponseHeaders().split("\n").forEach(function (line) {
                var fieldName;
             // Skip empty lines.
                if (line !== "") {
                    var matcher = line.match(/([-A-Za-z]+?): *(.*) */);
                 // Convert field names to lowercase.
                    fieldName = matcher[1].toLowerCase();
                    headers[fieldName] = matcher[2];
                }
            });
            response = {
                // At some point I want to be able to tell the user that nothing has changed. Related:
                // "For 304 Not Modified responses that are a result of a user agent generated conditional
                // request the user agent must act as if the server gave a 200 OK response with the appropriate
                // content. The user agent must allow author request headers to override automatic cache
                // validation (e.g. If-None-Match or If-Modified-Since), in which case 304 Not Modified responses
                // must be passed through."
                statusCode: xhr.status,
                headers: headers
            };
            if (xhr.status < 200 || xhr.status >= 300) {
                callback({
                    name: "Error",
                    message: "Status Code: " + xhr.status
                }, null);
            } else {
                if (options.returnXML === true) {
                    body = xhr.responseXML;
                } else {
                    if (options.parseBody === true) {
                     // Ignore media type options.
                        contentType = xhr.getResponseHeader("Content-Type").split(";")[0];
                        if (contentType === "application/json" || contentType === "application/sparql-results+json") {
                            try {
                                body = JSON.parse(xhr.responseText);
                            } catch (e) {
                                callback(e, null);
                                return;
                            }
                        } else {
                            body = xhr.responseText;
                        }
                    } else {
                        body = xhr.responseText;
                    }
                }
                response.body = body;
                callback(null, response);
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
 // @param {(err, body)} callback
 // @param {string} callback.body
    exports.get = get = function (uri, callback) {
        if (Object.toType(uri) !== "string") {
            throw new Error("Please provide a uri parameter (string).");
        }
        if (Object.toType(callback) !== "function") {
            throw new Error("Please provide a callback parameter (function).");
        }
        httpRequest({
            uri: uri
        }, function (err, res) {
            if (err !== null) {
                callback(err, null);
            } else {
                callback(null, res.body);
            }
        });
    };

 // Performs a GET request that treats the body of the response as JSON regardless of its Content-Type (some
 // VCS like GitHub can be used to serve raw content, but they typically don't respect the Content-Type of a file).
 // @param {string} uri
 // @param {(err, json)} callback
 // @param {object} callback.json
    exports.getJSON = getJSON = function (uri, callback) {
        if (Object.toType(uri) !== "string") {
            throw new Error("Please provide a uri parameter (string).");
        }
        if (Object.toType(callback) !== "function") {
            throw new Error("Please provide a callback parameter (function).");
        }
        httpRequest({
            uri: uri,
            parseBody: true
        }, function (err, res) {
            if (err !== null) {
                callback(err, null);
            } else {
                if (Object.toType(res.body) === "string") {
                 // The body is still a string; force it to JSON.
                    try {
                        callback(null, JSON.parse(res.body));
                    } catch (e) {
                        callback(e, null);
                    }
                } else {
                 // The body was already parsed according to the Content-Type of the message.
                    callback(null, res.body);
                }
            }
        });
    };

 // @param {string} uri
 // @param {(err, xml)} callback
 // @param {object} callback.xml
    exports.getXML = getXML = function (uri, callback) {
        if (Object.toType(uri) !== "string") {
            throw new Error("Please provide a uri parameter (string).");
        }
        if (Object.toType(callback) !== "function") {
            throw new Error("Please provide a callback parameter (function).");
        }
        httpRequest({
            uri: uri,
            returnXML: true
        }, function (err, res) {
            if (err !== null) {
                callback(err, null);
            } else {
                callback(null, res.body);
            }
        });
    };

    exports.getArchive = getArchive = function (uri, callback) {
        if (Object.toType(uri) !== "string") {
            throw new Error("Please provide a uri parameter (string).");
        }
        if (Object.toType(callback) !== "function") {
            throw new Error("Please provide a callback parameter (function).");
        }
        TarGZ.load(uri, function (files) {
         // onload
            callback(null, files);
        }, function () {
         // onstream
        }, function () {
         // onerror
            callback(new Error("Getting the URI failed. The browser log might have more details."), null);
        });
    };

 // Performs a ranged GET request.
 // @param {string} uri
 // @param {number} startByte
 // @param {number} endByte
 // @param {(err, body)} callback
 // @param {string} callback.body
    exports.getRange = getRange = function (uri, startByte, endByte, callback) {
        if (Object.toType(uri) !== "string") {
            throw new Error("Please provide a uri parameter (string).");
        }
        if (Object.toType(callback) !== "function") {
            throw new Error("Please provide a callback parameter (function).");
        }
        startByte = startByte || 0;
        endByte = endByte || 100;
        httpRequest({
            uri: uri,
            headers: {
                "Range": "bytes=" + startByte + "-" + endByte
            }
        }, function (err, res) {
            if (err !== null) {
                callback(err, null);
            } else {
                callback(null, res.body);
            }
        });
    };

 // A temporary data store.
    exports.data = {};

 // A persistent key/value store that should be backend agnostic. For now, let's start with localStorage
 // until Chromium issue 108223 (http://code.google.com/p/chromium/issues/detail?id=108223) is fixed.
    exports.store = (function () {

        var set, get, del, exists, keys, clear;

     // @param {string} key
     // @param {any} value
     // @param {string} key
     // @param {(err)} callback
        set = function (key, value, callback) {
            localStorage[key] = JSON.stringify(value);
            callback(null);
        };

     // @param {string} key
     // @param {(err, value)} callback
        get = function (key, callback) {
            exists(key, function (err, flag) {
                var value;
                if (flag === true) {
                    value = JSON.parse(localStorage[key]);
                    callback(null, value);
                } else {
                    callback(new Error("Not Found"));
                }
            });
        };

     // @param {string} key
     // @param {(err)} callback
        del = function (key, callback) {
            exists(key, function (err, flag) {
                if (flag === true) {
                    localStorage.removeItem(key);
                    callback(null);
                } else {
                    callback(new Error("Not Found"));
                }
            });
        };

     // @param {string} key
     // @param {(err, flag)} callback
        exists = function (key, callback) {
            callback(null, localStorage[key] !== undefined ? true : false);
        };

     // @param {(err, value)} callback
        keys = function (callback) {
            callback(null, Object.keys(localStorage));
        };

     // @param {(err)} callback
        clear = function (callback) {
            localStorage.clear();
            callback(null);
        };

        return {
            set: set,
            get: get,
            del: del,
            exists: exists,
            keys: keys,
            clear: clear
        };

    }());

 // The hub is a namespace of its own to communicate with our AG instance.
    exports.hub = (function () {

        var baseURI;

        baseURI = function (repository) {
            repository = repository || "tcga";
            return "http://agalpha.mathbiol.org/repositories/" + repository + "?query=";
        };

        return {
         // @param {string} options
         // @param {object} options
         // @param {string} options.query
         // @param {string} options.repository
         // @param {(err, res)} callback
         // @param {string} callback.res.body
         // @param {number} callback.res.statusCode
         // @param {object} callback.res.headers
            query: function (options, callback) {
                var optionsType;
                optionsType = Object.toType(options);
                if (["object", "string"].indexOf(optionsType) === -1) {
                    throw new Error("Please provide a query parameter (string or object).");
                }
                if (optionsType === "string") {
                 // Convert string argument to options object.
                    options = {
                        query: options
                    };
                } else {
                    if (options.hasOwnProperty("query") === false || Object.toType(options.query) !== "string") {
                        throw new Error("Please provide an options.query parameter (string).");
                    }
                }
                if (options.hasOwnProperty("repository") === false || Object.toType(options.repository) !== "string") {
                    options.repository = "tcga";
                }
                if (Object.toType(callback) !== "function") {
                    throw new Error("Please provide a callback parameter (function).");
                }
                httpRequest({
                    uri: baseURI(options.repository) + encodeURIComponent(options.query),
                    headers: {
                        "Accept": "application/sparql-results+json"
                    },
                    parseBody: true
                }, function (err, res) {
                    if (err !== null) {
                        callback(err, null);
                    } else {
                        callback(null, res.body);
                    }
                });
            }
        };
    }());

 // @param {string} message Message to be displayed.
 // @param {number} duration Visible time in ms.
    exports.toast = toast = (function () {
        var toaster;
        toaster = function (type, message, duration) {
            var alert;
            duration = duration || 2000;
            alert = $("<div></div>").addClass("alert").addClass(type).hide();
            alert.append(
                $("<div></div>").addClass("container").text(message)
            );
            $(".navbar").append(alert);
            alert.fadeIn("slow");
            setTimeout(function () {
                alert.fadeOut("slow", function () {
                    $(this).remove();
                });
            }, duration);
        };
        return {
            info: function (message, duration) {
                toaster("alert-info", message, duration);
            },
            success: function (message, duration) {
                toaster("alert-success", message, duration);
            },
            error: function (message, duration) {
                toaster("alert-error", message, duration);
            }
        };
    }());

 // @param {object} options
 // @param {string} options.id The element ID of the tab pane.
 // @param {string} options.title The title of the tab.
 // @param {string} options.content The content of the tab pane.
 // @param {boolean} options.switchTab If true, immediately switch to newly created tab.
    exports.registerTab = registerTab = function (options) {
        var tab;
     // Add pane.
        $("#end-of-content").before(
            $("<div>").attr("id", options.id).addClass("tab-pane").html(options.content)
        );
     // Add tab.
        tab = $("<a>").attr("href", "#" + options.id).attr("data-toggle", "tab").html(options.title);
        $(".nav").append(
            $("<li>").append(tab)
        );
        if (options.hasOwnProperty("switchTab") && options.switchTab === true) {
            tab.tab("show");
        }
    };

    exports.version = chrome.app.getDetails().version;

    setLocation = function (module) {
        var previousSearch, hash;
     // Prepend question mark or ampersand.
        previousSearch = window.location.search === "" ? "?" : window.location.search + "&";
     // replaceState overwrites the fragment part of the URI.
        hash = window.location.hash;
     // Change the URL without redirect.
        window.history.replaceState(null, "Load module", previousSearch + "module=" + module + hash);
    };

}(this.TCGA = {}));
