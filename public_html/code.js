var dragSystem = {};

dragSystem.makeDraggable = function(draggable, bounds) {
    draggable.dragDescriptor = {};
    draggable.dragDescriptor.ondrags = [];
    draggable.dragDescriptor.lastDrag = {}; //drag info for ondrag callback
    if (bounds) {
        draggable.dragDescriptor.checkX = bounds.checkX;
        draggable.dragDescriptor.checkY = bounds.checkY;
    }
    draggable.dragDescriptor.dragBabies = [];
        draggable.dragDescriptor.offX = 0;
        draggable.dragDescriptor.offY = 0;
        
        
    draggable.dragDescriptor.dragHandler = function(e) {
        dragSystem.dragged = draggable;
        draggable.dragDescriptor.offX = e.offsetX;
        draggable.dragDescriptor.offY = e.pageY - parseInt(draggable.css('top'));
    };

    draggable.mousedown(draggable.dragDescriptor.dragHandler);
};

//Aloitetaan nollasta ja etsitään isoin luku joka kelpaa tarkistusfunktiolle
dragSystem.findMaxDrag = function(checkFun, dx, eX) {
    if (!checkFun || checkFun(eX + dx)) {
        return dx;
    }
    var sign = dx / Math.abs(dx);
    var tryDx = 0;
    while (checkFun(eX + tryDx + sign)) {
        tryDx += sign;
    }
    return tryDx;
};

dragSystem.drag = function drag(element, dx, checkFName, leftOrTop) {
    var checkFun = element.dragDescriptor[checkFName];
    var eX = element.position()[leftOrTop];
    dx = dragSystem.findMaxDrag(checkFun, dx, eX);
    if (dx === 0)
        return;
    element.css(leftOrTop, eX + dx);
    //Information for ondrag handling
    element.dragDescriptor.lastDrag.needsHandling = true;
    element.dragDescriptor.lastDrag[leftOrTop] = dx;
    dragSystem.gotDragged.push(element);

    element.dragDescriptor.dragBabies.forEach(function(e) {
        drag(e, dx, checkFName, leftOrTop);
    });
};

dragSystem.handleDrag = function(e, dragged) {
    if (!dragged)
        var dragged = dragSystem.dragged;
    if (dragged) {
        dragSystem.gotDragged = []; //empty the list for ondrags
        var x = e.pageX - dragged.dragDescriptor.offX;
        var y = e.pageY - dragged.dragDescriptor.offY;
        var dx = x - parseInt($(dragged).css('left'));
        var dy = y - parseInt($(dragged).css('top'));

        dragSystem.drag(dragged, dx, 'checkX', 'left');
        dragSystem.drag(dragged, dy, 'checkY', 'top');

        dragSystem.gotDragged.forEach(function(elem) {
            var lastDrag = elem.dragDescriptor.lastDrag;
            if (lastDrag.needsHandling) {
                lastDrag.needsHandling = false;
                elem.dragDescriptor.ondrags.forEach(function(ondrag) {
                    ondrag(lastDrag.left, lastDrag.top);
                });
                lastDrag.left = lastDrag.top = undefined;
            }
        });
    }
};

//Sets the bounds of a draggable to now escape the given element
dragSystem.bindToElement = function(draggable, parentElement) {
    draggable.dragDescriptor.checkX = function(x) {
        return (parentElement.offset().left <= x && x <=
                parentElement.offset().left + parentElement.width());
    };
    draggable.dragDescriptor.checkY = function(y) {
        return (parentElement.offset().top <= y && y <=
                parentElement.offset().top + parentElement.height());
    };

    draggable.css('top', parentElement.offset().top);
    draggable.css('left', parentElement.offset().left);
};

Arrow = function(a, b) {
    this.startElement = a;
    this.endElement = b;
    var start = this.starthandle = Arrow.makeHandle(this);
    var mid = this.midhandle = Arrow.makeHandle(this);
    var end = this.endhandle = Arrow.makeHandle(this);
    this.closer = $('<div class="arrow closer"></div>').appendTo('body');
    this.further = $('<div class="arrow further"></div>').appendTo('body');

    dragSystem.bindToElement(start, a);
    dragSystem.bindToElement(end, b);
    mid.dragDescriptor.checkY = function() {
        return false;
    };

    mid.css('left', (start.position().left + 50));
    mid.css('top', (start.position().top + end.position().top) / 2);
    this.p = 0.5;
    var that = this;
    var movemid = function() {
        if (start.position().left + 50 < end.position().left) {
            var a = (mid.position().left - start.position().left);
            var b = (end.position().left - start.position().left);
            if (a / b > 0 && a / b < 1)
                mid.css('left', start.position().left + (b * that.p));
        }
    };
    [start, end].forEach(function(e) {
        e.dragDescriptor.ondrags.push(function() {
            var midPosY = (start.position().top + end.position().top) / 2;
            mid.css('top', midPosY);
            movemid();
        });
    });
    start.dragDescriptor.ondrags.push(function(offX) {
        mid.css('left', mid.position().left + offX);
    });
    mid.dragDescriptor.ondrags.push(function() {
        var a = (mid.position().left - start.position().left);
        var b = (end.position().left - start.position().left);
        that.p = a / b;
    });
};

Arrow.prototype.redraw = function() {
    Arrow.redraw(this.starthandle, this.midhandle, this.closer, true);
    Arrow.redraw(this.midhandle, this.endhandle, this.further);
};

Arrow.fieldToContainer = function(field, endElement) {
    var arrow = new Arrow(field.fieldAnchor, endElement);
    field.parentContainer.dragDescriptor.dragBabies.push(arrow.starthandle);
    arrow.starthandle.css('top', arrow.starthandle.position().top + 7);
    arrow.starthandle.css('left', arrow.starthandle.position().left + 7);
    endElement.dragDescriptor.dragBabies.push(arrow.endhandle);
    arrow.redraw();
    return arrow;
};

Arrow.makeHandle = function(parentArrow) {
    var handle = $('<div class="arrowhandle"></div>').appendTo('body');
    handle.parentArrow = parentArrow;
    dragSystem.makeDraggable(handle);
    handle.dragDescriptor.ondrags.push(function() {
        handle.parentArrow.redraw();
    });
    return handle;
};

Arrow.prototype.remove = function() {
    this.starthandle.remove();
    this.midhandle.remove();
    this.endhandle.remove();
    this.closer.remove();
    this.further.remove();
};

//restyles the arrow
Arrow.redraw = function(start, end, box, flip) {
    var start = start.offset();
    var end = end.offset();

    if (start.left <= end.left && end.top <= start.top) {
        box.css('top', end.top)
                .css('left', start.left);
    }
    if (start.left <= end.left && end.top > start.top) {
        box.css('top', start.top)
                .css('left', start.left);
    }
    if (start.left <= end.left && end.top > start.top) {
        box.css('top', start.top)
                .css('left', start.left);
    }
    if (start.left > end.left && end.top > start.top) {
        box.css('top', start.top)
                .css('left', end.left);
    }
    if (start.left > end.left && end.top <= start.top) {
        box.css('top', end.top)
                .css('left', end.left);
    }
    box.css('width', Math.abs(end.left - start.left))
            .css('height', Math.abs(start.top - end.top));

    box.css('border-width', 0);
    var d = ['top', 'bottom', 'left', 'right'];
    if (flip)
        var d = ['bottom', 'top', 'right', 'left'];
    if (start.top >= end.top) {
        box.css('border-' + d[0] + '-width', 3);
    } else {
        box.css('border-' + d[1] + '-width', 3);
    }

    if (start.left <= end.left) {
        box.css('border-' + d[2] + '-width', 3);
    } else {
        box.css('border-' + d[3] + '-width', 3);
    }
};

JsPeek = {};
JsPeek.visibles = [];
JsPeek.arrows = [];

JsPeek.showObject = function(object, label) {
    return JsPeek.Container(object, label);
};

JsPeek.resolveField = function(container, fieldname) {
    var field = container[fieldname];
    if (field.drawn) {
        return;
    }
    var end;
    if (JsPeek.visibles.every(function(e) {
        if (e.containedObject === field.referredObject) {
            end = e;
            return false;
        }
        return true;
    })) {
        end = JsPeek.showObject(field.referredObject);
    }
    field.drawn = true;
    var newArrow = Arrow.fieldToContainer(field, end);
    JsPeek.arrows.push(newArrow);
    return newArrow;
};

JsPeek.remove = function(container) {
    var arrows = JsPeek.arrows;
    var toBePopped = [];
    for (var i = 0; i < arrows.length; i++) {
        var arrow = arrows[i];
        if (arrow.startElement.parentField.parentContainer === container || arrow.endElement === container) {
            toBePopped.push(arrow);
            arrow.startElement.parentField.drawn = false;
            arrow.remove();
        }
    }
    for (var i = 0; i < toBePopped.length; i++) {
        arrows.splice(arrows.indexOf(toBePopped[i]), 1);
    }
    JsPeek.visibles.splice(JsPeek.visibles.indexOf(container), 1);
    container.remove();
};

JsPeek.Container = function(obj, label) {
    var container = $('<div class="box"></div>').appendTo('body');
    container.containedObject = obj;
    container.topbar = $('<div class="topbar"></div>').appendTo(container);
    container.header = $('<input class="label" value="' + (label || '') + '">').appendTo(container.topbar);
    container.closebutton = $('<div class="closebutton">x</div>').appendTo(container.topbar)
            .click(function() {
                JsPeek.remove(container);
            });
    container.tostringfield = $('<div class="tostring">' + obj + '</div>').appendTo(container);

    //Add propertyname fields to the container
    var arr = Object.getOwnPropertyNames(obj);
    if (obj.__proto__ !== null)
        arr.push('__proto__');
    for (var i = 0; i < arr.length; i++) {
        var field = $(('<div class="field"></div>')).appendTo(container);
        field.fieldText = $(('<div class="fieldText">' + arr[i] + '</div>')).appendTo(field);
        field.parentContainer = container;
        field.referredObject = obj[arr[i]];
        container[arr[i] + '_field'] = field;

        if (typeof field.referredObject === 'function' || typeof field.referredObject === 'object' && field.referredObject !== null) {
            field.fieldAnchor = $(('<div class="fieldAnchor"></div>')).appendTo(field);
            field.fieldAnchor.parentField = field;
            (function(a) {
                field.fieldAnchor.click(function() {
                    JsPeek.resolveField(container, a + "_field");
                });
            })(arr[i]);
        } else {
            field.fieldText.text(arr[i] + ' : ' + field.referredObject);
        }
    }
    dragSystem.makeDraggable(container);
    JsPeek.visibles.push(container);
    return container;
};

showObject = JsPeek.showObject;

$('html').mouseup(function(e) {
    dragSystem.dragged = undefined;
});

$(document).mousemove(function(e) {
    dragSystem.handleDrag(e);
});

hideshow = function() {
    var e = $('#controlPanelMain');
    var b = $('#hideshow');
    if (e.is(':visible')) {
        e.hide();
        b.val('⇲');
    } else {
        e.show();
        b.val('⇱');
    }
};

$('#controlPanel').ready(function() {
    var cp = $('#controlPanel');   //Täytyy kikkailla ja antaa koko controlPanelin 
    dragSystem.makeDraggable(cp);  //raahausfunktio vain yläpalkille
    $('#controlPanelTop').mousedown(cp.dragDescriptor.dragHandler);
    cp.unbind('mousedown');
});