﻿/// <reference path="../src/bobril.d.ts"/>

// ReSharper restore InconsistentNaming
if (typeof DEBUG === 'undefined')
    DEBUG = true;

b = (function (window, undefined) {
    function assert(shoudBeTrue, messageIfFalse) {
        if (DEBUG)
            if (!shoudBeTrue)
                throw Error(messageIfFalse || "assertion failed");
    }

    var objectToString = {}.toString;
    var isArray = Array.isArray || (function (a) {
        return objectToString.call(a) === "[object Array]";
    });

    var inNamespace = false;

    function updateElement(el, newAttrs, oldAttrs) {
        if (!newAttrs)
            return undefined;
        for (var attrName in newAttrs) {
            var newAttr = newAttrs[attrName];
            var oldAttr = oldAttrs[attrName];
            if ((oldAttr === undefined) || (oldAttr !== newAttr)) {
                oldAttrs[attrName] = newAttr;
                if (attrName === "style") {
                    var rule;
                    if (oldAttr) {
                        for (rule in newAttr) {
                            var v = newAttr[rule];
                            if (oldAttr[rule] !== v)
                                el.style[rule] = v;
                        }
                        for (rule in oldAttr) {
                            if (!(rule in newAttr))
                                el.style[rule] = "";
                        }
                    } else {
                        for (rule in newAttr) {
                            el.style[rule] = newAttr[rule];
                        }
                    }
                } else if (inNamespace) {
                    if (attrName === "href")
                        el.setAttributeNS("http://www.w3.org/1999/xlink", "href", newAttr);
                    else if (attrName === "className")
                        el.setAttribute("class", newAttr);
                    else
                        el.setAttribute(attrName, newAttr);
                } else if (attrName in el && !(attrName == "list" || attrName == "form")) {
                    el[attrName] = newAttr;
                } else
                    el.setAttribute(attrName, newAttr);
            }
        }
        return oldAttrs;
    }

    function createNode(n) {
        var c = n;
        if (c.component) {
            c.componentInstance = {};
            if (c.component.init) {
                c.component.init(c.componentInstance, n);
            }
        }
        var backupInNamespace = inNamespace;
        if (n.tag === "") {
            c.element = window.document.createTextNode("" + c.content);
            return c;
        } else if (n.tag === "svg") {
            c.element = window.document.createElementNS("http://www.w3.org/2000/svg", n.tag);
            inNamespace = true;
        } else {
            c.element = window.document.createElement(n.tag);
        }
        createChildren(c);
        c.attrs = updateElement(c.element, c.attrs, {});
        inNamespace = backupInNamespace;
        return c;
    }

    function normalizeNode(n) {
        var t = typeof n;
        if (t === "string" || t === "number" || t === "boolean") {
            return { tag: "", content: n };
        }
        return n;
    }

    function createChildren(c) {
        var ch = c.children;
        if (!ch)
            return;
        if (!isArray(ch)) {
            ch = [ch];
        }
        var i = 0, l = ch.length;
        while (i < l) {
            var item = ch[i];
            if (isArray(item)) {
                ch.splice.apply(ch, [i, 1].concat(item));
                l = ch.length;
                continue;
            }
            var j = ch[i] = createNode(normalizeNode(item));
            c.element.appendChild(j.element);
            i++;
        }
        c.children = ch;
    }

    function destroyNode(c) {
        var ch = c.children;
        if (ch) {
            for (var i = 0, l = ch.length; i < l; i++) {
                destroyNode(ch[i]);
            }
        }
        if (c.component) {
            if (c.component.destroy)
                c.component.destroy(c.componentInstance, c, c.element);
        }
    }

    function removeNode(c) {
        destroyNode(c);
        c.element.parentNode.removeChild(c.element);
    }

    function updateNode(n, c) {
        if (n.component) {
            if (n.component.shouldChange)
                if (!n.component.shouldChange(c.componentInstance, n, c))
                    return c;
        }
        if (n.tag === c.tag) {
            if (n.tag === "") {
                if (c.content !== n.content) {
                    c.content = n.content;
                    if ('textContent' in c.element) {
                        c.element.textContent = "" + c.content;
                        return c;
                    }
                } else
                    return c;
            } else {
                var backupInNamespace = inNamespace;
                if (n.tag === "svg")
                    inNamespace = true;
                if (!n.attrs && !c.attrs) {
                    updateChildrenNode(n, c);
                    inNamespace = backupInNamespace;
                    return c;
                } else if (n.attrs && c.attrs && Object.keys(n.attrs).join() === Object.keys(c.attrs).join() && n.attrs.id === c.attrs.id) {
                    updateChildrenNode(n, c);
                    c.attrs = updateElement(c.element, n.attrs, c.attrs);
                    inNamespace = backupInNamespace;
                    return c;
                }
                inNamespace = backupInNamespace;
            }
        }
        var r = createNode(n);
        if (c.element.parentNode) {
            c.element.parentNode.insertBefore(r.element, c.element);
        }
        removeNode(c);
        return r;
    }

    function updateChildrenNode(n, c) {
        c.children = updateChildren(c.element, n.children, c.children);
    }

    function updateChildren(element, newChildren, cachedChildren) {
        newChildren = newChildren || [];
        if (!isArray(newChildren))
            newChildren = [newChildren];
        cachedChildren = cachedChildren || [];
        var newLength = newChildren.length;
        var cachedLength = cachedChildren.length;
        var minNewCachedLength = newLength < cachedLength ? newLength : cachedLength;
        for (var newIndex = 0; newIndex < newLength;) {
            var item = newChildren[newIndex];
            if (isArray(item)) {
                newChildren.splice.apply(newChildren, [newIndex, 1].concat(item));
                newLength = newChildren.length;
                continue;
            }
            newChildren[newIndex] = normalizeNode(item);
            newIndex++;
        }
        newIndex = 0;
        for (; newIndex < minNewCachedLength; newIndex++) {
            if (newChildren[newIndex].key !== cachedChildren[newIndex].key)
                break;
            cachedChildren[newIndex] = updateNode(newChildren[newIndex], cachedChildren[newIndex]);
        }
        if (newIndex === minNewCachedLength) {
            while (newIndex < newLength) {
                cachedChildren.push(createNode(newChildren[newIndex]));
                element.appendChild(cachedChildren[newIndex].element);
                newIndex++;
            }
            while (cachedLength > newIndex) {
                cachedLength--;
                removeNode(cachedChildren[cachedLength]);
                cachedChildren.pop();
            }
        } else {
            // order of keyed nodes ware changed => reorder keyed nodes first
            var cachedIndex;
            var cachedKeys = {};
            var newKeys = {};
            var key;
            var node;
            var backupCommonIndex = newIndex;
            var deltaKeyless = 0;
            for (cachedIndex = backupCommonIndex; cachedIndex < cachedLength; cachedIndex++) {
                node = cachedChildren[cachedIndex];
                key = node.key;
                if (key !== undefined && !(key in cachedKeys))
                    cachedKeys[key] = cachedIndex;
                else
                    deltaKeyless--;
            }
            for (; newIndex < newLength; newIndex++) {
                node = newChildren[newIndex];
                key = node.key;
                if (key !== undefined && !(key in newKeys))
                    newKeys[key] = newIndex;
                else
                    deltaKeyless++;
            }
            var delta = 0;
            newIndex = backupCommonIndex;
            cachedIndex = backupCommonIndex;
            var cachedKey;
            while (cachedIndex < cachedLength && newIndex < newLength) {
                if (cachedChildren[cachedIndex] === null) {
                    cachedChildren.splice(cachedIndex, 1);
                    cachedLength--;
                    delta--;
                    continue;
                }
                cachedKey = cachedChildren[cachedIndex].key;
                if (!cachedKey) {
                    cachedIndex++;
                    continue;
                }
                key = newChildren[newIndex].key;
                if (!key) {
                    newIndex++;
                    while (newIndex < newLength) {
                        key = newChildren[newIndex].key;
                        if (key)
                            break;
                    }
                    if (!key)
                        break;
                }
                var akpos = cachedKeys[key];
                if (akpos === undefined) {
                    // New key
                    cachedChildren.splice(cachedIndex, 0, createNode(newChildren[newIndex]));
                    element.insertBefore(cachedChildren[cachedIndex].element, cachedChildren[cachedIndex + 1].element);
                    delta++;
                    newIndex++;
                    cachedIndex++;
                    cachedLength++;
                    continue;
                }
                if (!(cachedKey in newKeys)) {
                    // Old key
                    removeNode(cachedChildren[cachedIndex]);
                    cachedChildren.splice(cachedIndex, 1);
                    delta--;
                    cachedLength--;
                    continue;
                }
                if (cachedIndex === akpos + delta) {
                    // Inplace update
                    cachedChildren[cachedIndex] = updateNode(newChildren[newIndex], cachedChildren[cachedIndex]);
                    newIndex++;
                    cachedIndex++;
                } else {
                    // Move
                    cachedChildren.splice(cachedIndex, 0, cachedChildren[akpos + delta]);
                    delta++;
                    cachedChildren[akpos + delta] = null;
                    element.insertBefore(cachedChildren[cachedIndex].element, cachedChildren[cachedIndex + 1].element);
                    cachedChildren[cachedIndex] = updateNode(newChildren[newIndex], cachedChildren[cachedIndex]);
                    cachedIndex++;
                    cachedLength++;
                    newIndex++;
                }
            }

            while (cachedIndex < cachedLength) {
                if (cachedChildren[cachedIndex] === null) {
                    cachedChildren.splice(cachedIndex, 1);
                    cachedLength--;
                    continue;
                }
                if (cachedChildren[cachedIndex].key) {
                    removeNode(cachedChildren[cachedIndex]);
                    cachedChildren.splice(cachedIndex, 1);
                    cachedLength--;
                    continue;
                }
                cachedIndex++;
            }

            while (newIndex < newLength) {
                key = newChildren[newIndex].key;
                if (key) {
                    cachedChildren.push(createNode(newChildren[newIndex]));
                    element.insertBefore(cachedChildren[cachedIndex].element, cachedChildren[cachedIndex + 1].element);
                    delta++;
                    cachedIndex++;
                    cachedLength++;
                }
                newIndex++;
            }

            // reorder just nonkeyed nodes
            newIndex = cachedIndex = backupCommonIndex;
            while (newIndex < newLength) {
                if (cachedIndex < cachedLength) {
                    cachedKey = cachedChildren[cachedIndex].key;
                    if (cachedKey) {
                        cachedIndex++;
                        continue;
                    }
                }
                key = newChildren[newIndex].key;
                if (key === cachedChildren[newIndex].key) {
                    if (key) {
                        newIndex++;
                        continue;
                    }
                    cachedChildren[newIndex] = updateNode(newChildren[newIndex], cachedChildren[newIndex]);
                    newIndex++;
                    if (cachedIndex < newIndex)
                        cachedIndex = newIndex;
                    continue;
                }
                if (key) {
                    assert(newIndex === cachedIndex);
                    if (newLength - newIndex - deltaKeyless == cachedLength - cachedIndex) {
                        while (true) {
                            removeNode(cachedChildren[cachedIndex]);
                            cachedChildren.splice(cachedIndex, 1);
                            cachedLength--;
                            deltaKeyless++;
                            assert(cachedIndex !== cachedLength, "there still need to exist key node");
                            if (cachedChildren[cachedIndex].key)
                                break;
                        }
                        continue;
                    }
                    while (!cachedChildren[cachedIndex].key)
                        cachedIndex++;
                    assert(key !== cachedChildren[cachedIndex].key);
                    cachedChildren.splice(newIndex, 0, cachedChildren[cachedIndex]);
                    cachedChildren.splice(cachedIndex + 1, 1);
                    element.insertBefore(cachedChildren[newIndex].element, cachedChildren[newIndex + 1].element);
                    newIndex++;
                    cachedIndex = newIndex;
                    continue;
                }
                if (cachedIndex < cachedLength) {
                    cachedChildren.splice(newIndex, 0, cachedChildren[cachedIndex]);
                    cachedChildren.splice(cachedIndex + 1, 1);
                    if (key) {
                        newIndex++;
                        while (newIndex < newLength) {
                            key = newChildren[newIndex].key;
                            if (!key)
                                break;
                        }
                        if (key)
                            break;
                    }
                    cachedChildren[cachedIndex] = updateNode(newChildren[newIndex], cachedChildren[cachedIndex]);
                    newIndex++;
                    cachedIndex++;
                } else {
                    cachedChildren.push(createNode(newChildren[newIndex]));
                    element.appendChild(cachedChildren[cachedIndex].element);
                    newIndex++;
                    cachedIndex++;
                    cachedLength++;
                }
            }
            while (cachedLength > newIndex) {
                cachedLength--;
                removeNode(cachedChildren[cachedLength]);
                cachedChildren.pop();
            }
        }
        return cachedChildren;
    }

    var hasNativeRaf = false;
    var nativeRaf = window.requestAnimationFrame;
    if (nativeRaf) {
        nativeRaf(function (param) {
            if (typeof param === "number")
                hasNativeRaf = true;
        });
    }

    var now = Date.now || (function () {
        return (new Date).getTime();
    });
    var startTime = now();
    var lastTickTime = 0;

    function requestAnimationFrame(callback) {
        if (hasNativeRaf) {
            nativeRaf(callback);
        } else {
            var delay = 50 / 3 + lastTickTime - now();
            if (delay < 0)
                delay = 0;
            window.setTimeout(function () {
                lastTickTime = now();
                callback(lastTickTime - startTime);
            }, delay);
        }
    }

    var rootFactory;
    var rootCacheChildren = [];

    var scheduled = false;
    function scheduleUpdate() {
        if (scheduled)
            return;
        scheduled = true;
        requestAnimationFrame(update);
    }

    function init(factory) {
        rootFactory = factory;
        scheduleUpdate();
    }

    var uptime = 0;

    function update(time) {
        uptime = time;
        scheduled = false;
        var newChildren = rootFactory();
        rootCacheChildren = updateChildren(document.body, newChildren, rootCacheChildren);
    }

    return {
        createNode: createNode,
        updateNode: updateNode,
        init: init,
        uptime: function () {
            return uptime;
        },
        now: now,
        invalidate: scheduleUpdate
    };
})((typeof window != "undefined" ? window : {}));
//# sourceMappingURL=bobril.js.map