(function ($) {
  "use strict";

  var defaultOptions = {
    tagClass: function(item) {
      return 'label label-info';
    },
    itemValue: function(item) {
      return item ? item.toString() : item;
    },
    itemText: function(item) {
      return this.itemValue(item);
    },
    freeInput: true,
    addOnBlur: true,
    maxTags: undefined,
    maxChars: undefined,
    confirmKeys: [13, 44],
    onTagExists: function(item, $tag) {
      $tag.hide().fadeIn();
    },
    trimValue: false,
    allowDuplicates: false
  };

  /**
   * Constructor function
   */
  function TagsInput(element, options) {
    this.itemsArray = [];

    this.$element = $(element);
    this.$element.hide();

    this.isSelect = (element.tagName === 'SELECT');
    this.multiple = (this.isSelect && element.hasAttribute('multiple'));
    this.objectItems = options && options.itemValue;
    this.placeholderText = element.hasAttribute('placeholder') ? this.$element.attr('placeholder') : '';
    this.inputSize = Math.max(1, this.placeholderText.length);

    this.$container = $('<div class="bootstrap-tagsinput col-sm-12"></div>');
    this.$input = $('<input type="text" placeholder="' + this.placeholderText + '"/>').appendTo(this.$container);

    this.$element.after(this.$container);

    var inputWidth = (this.inputSize < 3 ? 3 : this.inputSize) + "em";
    this.$input.get(0).style.cssText = "width: " + inputWidth + " !important;";
    this.build(options);
  }

  TagsInput.prototype = {
    constructor: TagsInput,

    /**
     * Adds the given item as a new tag. Pass true to dontPushVal to prevent
     * updating the elements val()
     */
    add: function(item, dontPushVal) {
      var self = this;

      if (self.options.maxTags && self.itemsArray.length >= self.options.maxTags)
        return;

      // Ignore falsey values, except false
      if (item !== false && !item)
        return;

      // Trim value
      if (typeof item === "string" && self.options.trimValue) {
        item = $.trim(item);
      }

      // Throw an error when trying to add an object while the itemValue option was not set
      if (typeof item === "object" && !self.objectItems)
        throw("Can't add objects when itemValue option is not set");

      // Ignore strings only containg whitespace
      if (item.toString().match(/^\s*$/))
        return;

      // If SELECT but not multiple, remove current tag
      if (self.isSelect && !self.multiple && self.itemsArray.length > 0)
        self.remove(self.itemsArray[0]);

      if (typeof item === "string" && this.$element[0].tagName === 'INPUT') {
        var items = item.split(',');
        if (items.length > 1) {
          for (var i = 0; i < items.length; i++) {
            this.add(items[i], true);
          }

          if (!dontPushVal)
            self.pushVal();
          return;
        }
      }

      var itemValue = self.options.itemValue(item),
          itemText = self.options.itemText(item),
          tagClass = self.options.tagClass(item);

      // Ignore items allready added
      var existing = $.grep(self.itemsArray, function(item) { return self.options.itemValue(item) === itemValue; } )[0];
      if (existing && !self.options.allowDuplicates) {
        // Invoke onTagExists
        if (self.options.onTagExists) {
          var $existingTag = $(".tag", self.$container).filter(function() { return $(this).data("item") === existing; });
          self.options.onTagExists(item, $existingTag);
        }
        return;
      }

      // if length greater than limit
      if (self.items().toString().length + item.length + 1 > self.options.maxInputLength)
        return;

      // raise beforeItemAdd arg
      var beforeItemAddEvent = $.Event('beforeItemAdd', { item: item, cancel: false });
      self.$element.trigger(beforeItemAddEvent);
      if (beforeItemAddEvent.cancel)
        return;

      // register item in internal array and map
      self.itemsArray.push(item);

      // add a tag element
      var $tag = $('<span class="tag ' + htmlEncode(tagClass) + '">' + htmlEncode(itemText) + '<span data-role="remove"></span></span>');
      $tag.data('item', item);
      self.findInputWrapper().before($tag);
      $tag.after(' ');

      // add <option /> if item represents a value not present in one of the <select />'s options
      if (self.isSelect && !$('option[value="' + encodeURIComponent(itemValue) + '"]',self.$element)[0]) {
        var $option = $('<option selected>' + htmlEncode(itemText) + '</option>');
        $option.data('item', item);
        $option.attr('value', itemValue);
        self.$element.append($option);
      }

      if (!dontPushVal)
        self.pushVal();

      // Add class when reached maxTags
      if (self.options.maxTags === self.itemsArray.length || self.items().toString().length === self.options.maxInputLength)
        self.$container.addClass('bootstrap-tagsinput-max');

      self.$element.trigger($.Event('itemAdded', { item: item }));
    },

    /**
     * Removes the given item. Pass true to dontPushVal to prevent updating the
     * elements val()
     */
    remove: function(item, dontPushVal) {
      var self = this;

      if (self.objectItems) {
        if (typeof item === "object")
          item = $.grep(self.itemsArray, function(other) { return self.options.itemValue(other) ==  self.options.itemValue(item); } );
        else
          item = $.grep(self.itemsArray, function(other) { return self.options.itemValue(other) ==  item; } );

        item = item[item.length-1];
      }

      if (item) {
        var beforeItemRemoveEvent = $.Event('beforeItemRemove', { item: item, cancel: false });
        self.$element.trigger(beforeItemRemoveEvent);
        if (beforeItemRemoveEvent.cancel)
          return;

        $('.tag', self.$container).filter(function() { return $(this).data('item') === item; }).remove();
        $('option', self.$element).filter(function() { return $(this).data('item') === item; }).remove();
        if($.inArray(item, self.itemsArray) !== -1)
          self.itemsArray.splice($.inArray(item, self.itemsArray), 1);
      }

      if (!dontPushVal)
        self.pushVal();

      // Remove class when reached maxTags
      if (self.options.maxTags > self.itemsArray.length)
        self.$container.removeClass('bootstrap-tagsinput-max');

      self.$element.trigger($.Event('itemRemoved',  { item: item }));
    },

    /**
     * Removes all items
     */
    removeAll: function() {
      var self = this;

      $('.tag', self.$container).remove();
      $('option', self.$element).remove();

      while(self.itemsArray.length > 0)
        self.itemsArray.pop();

      self.pushVal();
    },

    /**
     * Refreshes the tags so they match the text/value of their corresponding
     * item.
     */
    refresh: function() {
      var self = this;
      $('.tag', self.$container).each(function() {
        var $tag = $(this),
            item = $tag.data('item'),
            itemValue = self.options.itemValue(item),
            itemText = self.options.itemText(item),
            tagClass = self.options.tagClass(item);

          // Update tag's class and inner text
          $tag.attr('class', null);
          $tag.addClass('tag ' + htmlEncode(tagClass));
          $tag.contents().filter(function() {
            return this.nodeType == 3;
          })[0].nodeValue = htmlEncode(itemText);

          if (self.isSelect) {
            var option = $('option', self.$element).filter(function() { return $(this).data('item') === item; });
            option.attr('value', itemValue);
          }
      });
    },

    /**
     * Returns the items added as tags
     */
    items: function() {
      return this.itemsArray;
    },

    /**
     * Assembly value by retrieving the value of each item, and set it on the
     * element.
     */
    pushVal: function() {
      var self = this,
          val = $.map(self.items(), function(item) {
            return self.options.itemValue(item).toString();
          });

      self.$element.val(val, true).trigger('change');
    },

    /**
     * Initializes the tags input behaviour on the element
     */
    build: function(options) {
      var self = this;

      self.options = $.extend({}, defaultOptions, options);
      // When itemValue is set, freeInput should always be false
      if (self.objectItems)
        self.options.freeInput = false;

      makeOptionItemFunction(self.options, 'itemValue');
      makeOptionItemFunction(self.options, 'itemText');
      makeOptionFunction(self.options, 'tagClass');
      
      // Typeahead Bootstrap version 2.3.2
      if (self.options.typeahead) {
        var typeahead = self.options.typeahead || {};

        makeOptionFunction(typeahead, 'source');

        self.$input.typeahead($.extend({}, typeahead, {
          source: function (query, process) {
            function processItems(items) {
              var texts = [];

              for (var i = 0; i < items.length; i++) {
                var text = self.options.itemText(items[i]);
                map[text] = items[i];
                texts.push(text);
              }
              process(texts);
            }

            this.map = {};
            var map = this.map,
                data = typeahead.source(query);

            if ($.isFunction(data.success)) {
              // support for Angular callbacks
              data.success(processItems);
            } else if ($.isFunction(data.then)) {
              // support for Angular promises
              data.then(processItems);
            } else {
              // support for functions and jquery promises
              $.when(data)
               .then(processItems);
            }
          },
          updater: function (text) {
            self.add(this.map[text]);
          },
          matcher: function (text) {
            return (text.toLowerCase().indexOf(this.query.trim().toLowerCase()) !== -1);
          },
          sorter: function (texts) {
            return texts.sort();
          },
          highlighter: function (text) {
            var regex = new RegExp( '(' + this.query + ')', 'gi' );
            return text.replace( regex, "<strong>$1</strong>" );
          }
        }));
      }

      // typeahead.js
      if (self.options.typeaheadjs) {
          var typeaheadjs = self.options.typeaheadjs || {};
          
          self.$input.typeahead(null, typeaheadjs).on('typeahead:selected', $.proxy(function (obj, datum) {
            if (typeaheadjs.valueKey)
              self.add(datum[typeaheadjs.valueKey]);
            else
              self.add(datum);
            self.$input.typeahead('val', '');
          }, self));
      }

      self.$container.on('click', $.proxy(function(event) {
        if (! self.$element.attr('disabled')) {
          self.$input.removeAttr('disabled');
        }
        self.$input.focus();
      }, self));

        if (self.options.addOnBlur && self.options.freeInput) {
          self.$input.on('focusout', $.proxy(function(event) {
              // HACK: only process on focusout when no typeahead opened, to
              //       avoid adding the typeahead text as tag
              if ($('.typeahead, .twitter-typeahead', self.$container).length === 0) {
                self.add(self.$input.val());
                self.$input.val('');
              }
          }, self));
        }
        

      self.$container.on('keydown', 'input', $.proxy(function(event) {
        var $input = $(event.target),
            $inputWrapper = self.findInputWrapper();

        if (self.$element.attr('disabled')) {
          self.$input.attr('disabled', 'disabled');
          return;
        }

        switch (event.which) {
          // BACKSPACE
          case 8:
            if (doGetCaretPosition($input[0]) === 0) {
              var prev = $inputWrapper.prev();
              if (prev) {
                self.remove(prev.data('item'));
              }
            }
            break;

          // DELETE
          case 46:
            if (doGetCaretPosition($input[0]) === 0) {
              var next = $inputWrapper.next();
              if (next) {
                self.remove(next.data('item'));
              }
            }
            break;

          // LEFT ARROW
          case 37:
            // Try to move the input before the previous tag
            var $prevTag = $inputWrapper.prev();
            if ($input.val().length === 0 && $prevTag[0]) {
              $prevTag.before($inputWrapper);
              $input.focus();
            }
            break;
          // RIGHT ARROW
          case 39:
            // Try to move the input after the next tag
            var $nextTag = $inputWrapper.next();
            if ($input.val().length === 0 && $nextTag[0]) {
              $nextTag.after($inputWrapper);
              $input.focus();
            }
            break;
         default:
             // ignore
         }

        // Reset internal input's size
        var textLength = $input.val().length,
            wordSpace = Math.ceil(textLength / 5),
            size = textLength + wordSpace + 1;
        $input.attr('size', Math.max(this.inputSize, $input.val().length));
      }, self));

      self.$container.on('keypress', 'input', $.proxy(function(event) {
         var $input = $(event.target);

         if (self.$element.attr('disabled')) {
            self.$input.attr('disabled', 'disabled');
            return;
         }

         var text = $input.val(),
         maxLengthReached = self.options.maxChars && text.length >= self.options.maxChars;
         if (self.options.freeInput && (keyCombinationInList(event, self.options.confirmKeys) || maxLengthReached)) {
            self.add(maxLengthReached ? text.substr(0, self.options.maxChars) : text);
            $input.val('');
            event.preventDefault();
         }

         // Reset internal input's size
         var textLength = $input.val().length,
            wordSpace = Math.ceil(textLength / 5),
            size = textLength + wordSpace + 1;
         $input.attr('size', Math.max(this.inputSize, $input.val().length));
      }, self));

      // Remove icon clicked
      self.$container.on('click', '[data-role=remove]', $.proxy(function(event) {
        if (self.$element.attr('disabled')) {
          return;
        }
        self.remove($(event.target).closest('.tag').data('item'));
      }, self));

      // Only add existing value as tags when using strings as tags
      if (self.options.itemValue === defaultOptions.itemValue) {
        if (self.$element[0].tagName === 'INPUT') {
            self.add(self.$element.val());
        } else {
          $('option', self.$element).each(function() {
            self.add($(this).attr('value'), true);
          });
        }
      }
    },

    /**
     * Removes all tagsinput behaviour and unregsiter all event handlers
     */
    destroy: function() {
      var self = this;

      // Unbind events
      self.$container.off('keypress', 'input');
      self.$container.off('click', '[role=remove]');

      self.$container.remove();
      self.$element.removeData('tagsinput');
      self.$element.show();
    },

    /**
     * Sets focus on the tagsinput
     */
    focus: function() {
      this.$input.focus();
    },

    /**
     * Returns the internal input element
     */
    input: function() {
      return this.$input;
    },

    /**
     * Returns the element which is wrapped around the internal input. This
     * is normally the $container, but typeahead.js moves the $input element.
     */
    findInputWrapper: function() {
      var elt = this.$input[0],
          container = this.$container[0];
      while(elt && elt.parentNode !== container)
        elt = elt.parentNode;

      return $(elt);
    }
  };

  /**
   * Register JQuery plugin
   */
  $.fn.tagsinput = function(arg1, arg2) {
    var results = [];

    this.each(function() {
      var tagsinput = $(this).data('tagsinput');
      // Initialize a new tags input
      if (!tagsinput) {
          tagsinput = new TagsInput(this, arg1);
          $(this).data('tagsinput', tagsinput);
          results.push(tagsinput);

          if (this.tagName === 'SELECT') {
              $('option', $(this)).attr('selected', 'selected');
          }

          // Init tags from $(this).val()
          $(this).val($(this).val());
      } else if (!arg1 && !arg2) {
          // tagsinput already exists
          // no function, trying to init
          results.push(tagsinput);
      } else if(tagsinput[arg1] !== undefined) {
          // Invoke function on existing tags input
          var retVal = tagsinput[arg1](arg2);
          if (retVal !== undefined)
              results.push(retVal);
      }
    });

    if ( typeof arg1 == 'string') {
      // Return the results from the invoked function calls
      return results.length > 1 ? results : results[0];
    } else {
      return results;
    }
  };

  $.fn.tagsinput.Constructor = TagsInput;

  /**
   * Most options support both a string or number as well as a function as
   * option value. This function makes sure that the option with the given
   * key in the given options is wrapped in a function
   */
  function makeOptionItemFunction(options, key) {
    if (typeof options[key] !== 'function') {
      var propertyName = options[key];
      options[key] = function(item) { return item[propertyName]; };
    }
  }
  function makeOptionFunction(options, key) {
    if (typeof options[key] !== 'function') {
      var value = options[key];
      options[key] = function() { return value; };
    }
  }
  /**
   * HtmlEncodes the given value
   */
  var htmlEncodeContainer = $('<div />');
  function htmlEncode(value) {
    if (value) {
      return htmlEncodeContainer.text(value).html();
    } else {
      return '';
    }
  }

  /**
   * Returns the position of the caret in the given input field
   * http://flightschool.acylt.com/devnotes/caret-position-woes/
   */
  function doGetCaretPosition(oField) {
    var iCaretPos = 0;
    if (document.selection) {
      oField.focus ();
      var oSel = document.selection.createRange();
      oSel.moveStart ('character', -oField.value.length);
      iCaretPos = oSel.text.length;
    } else if (oField.selectionStart || oField.selectionStart == '0') {
      iCaretPos = oField.selectionStart;
    }
    return (iCaretPos);
  }

  /**
    * Returns boolean indicates whether user has pressed an expected key combination. 
    * @param object keyPressEvent: JavaScript event object, refer
    *     http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
    * @param object lookupList: expected key combinations, as in:
    *     [13, {which: 188, shiftKey: true}]
    */
  function keyCombinationInList(keyPressEvent, lookupList) {
      var found = false;
      $.each(lookupList, function (index, keyCombination) {
          if (typeof (keyCombination) === 'number' && keyPressEvent.which === keyCombination) {
              found = true;
              return false;
          }

          if (keyPressEvent.which === keyCombination.which) {
              var alt = !keyCombination.hasOwnProperty('altKey') || keyPressEvent.altKey === keyCombination.altKey,
                  shift = !keyCombination.hasOwnProperty('shiftKey') || keyPressEvent.shiftKey === keyCombination.shiftKey,
                  ctrl = !keyCombination.hasOwnProperty('ctrlKey') || keyPressEvent.ctrlKey === keyCombination.ctrlKey;
              if (alt && shift && ctrl) {
                  found = true;
                  return false;
              }
          }
      });

      return found;
  }

  /**
   * Initialize tagsinput behaviour on inputs and selects which have
   * data-role=tagsinput
   */
  $(function() {
    $("input[data-role=tagsinput], select[multiple][data-role=tagsinput]").tagsinput();
  });
})(window.jQuery);

/*!

 handlebars v2.0.0

Copyright (C) 2011-2014 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

@license
*/
/* exported Handlebars */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Handlebars = root.Handlebars || factory();
  }
}(this, function () {
// handlebars/safe-string.js
var __module3__ = (function() {
  "use strict";
  var __exports__;
  // Build out our basic SafeString type
  function SafeString(string) {
    this.string = string;
  }

  SafeString.prototype.toString = function() {
    return "" + this.string;
  };

  __exports__ = SafeString;
  return __exports__;
})();

// handlebars/utils.js
var __module2__ = (function(__dependency1__) {
  "use strict";
  var __exports__ = {};
  /*jshint -W004 */
  var SafeString = __dependency1__;

  var escape = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;"
  };

  var badChars = /[&<>"'`]/g;
  var possible = /[&<>"'`]/;

  function escapeChar(chr) {
    return escape[chr];
  }

  function extend(obj /* , ...source */) {
    for (var i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          obj[key] = arguments[i][key];
        }
      }
    }

    return obj;
  }

  __exports__.extend = extend;var toString = Object.prototype.toString;
  __exports__.toString = toString;
  // Sourced from lodash
  // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
  var isFunction = function(value) {
    return typeof value === 'function';
  };
  // fallback for older versions of Chrome and Safari
  /* istanbul ignore next */
  if (isFunction(/x/)) {
    isFunction = function(value) {
      return typeof value === 'function' && toString.call(value) === '[object Function]';
    };
  }
  var isFunction;
  __exports__.isFunction = isFunction;
  /* istanbul ignore next */
  var isArray = Array.isArray || function(value) {
    return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
  };
  __exports__.isArray = isArray;

  function escapeExpression(string) {
    // don't escape SafeStrings, since they're already safe
    if (string instanceof SafeString) {
      return string.toString();
    } else if (string === null) {
      return "";
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = "" + string;

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  }

  __exports__.escapeExpression = escapeExpression;function isEmpty(value) {
    if (!value && value !== 0) {
      return true;
    } else if (isArray(value) && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }

  __exports__.isEmpty = isEmpty;function appendContextPath(contextPath, id) {
    return (contextPath ? contextPath + '.' : '') + id;
  }

  __exports__.appendContextPath = appendContextPath;
  return __exports__;
})(__module3__);

// handlebars/exception.js
var __module4__ = (function() {
  "use strict";
  var __exports__;

  var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

  function Exception(message, node) {
    var line;
    if (node && node.firstLine) {
      line = node.firstLine;

      message += ' - ' + line + ':' + node.firstColumn;
    }

    var tmp = Error.prototype.constructor.call(this, message);

    // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
    for (var idx = 0; idx < errorProps.length; idx++) {
      this[errorProps[idx]] = tmp[errorProps[idx]];
    }

    if (line) {
      this.lineNumber = line;
      this.column = node.firstColumn;
    }
  }

  Exception.prototype = new Error();

  __exports__ = Exception;
  return __exports__;
})();

// handlebars/base.js
var __module1__ = (function(__dependency1__, __dependency2__) {
  "use strict";
  var __exports__ = {};
  var Utils = __dependency1__;
  var Exception = __dependency2__;

  var VERSION = "2.0.0";
  __exports__.VERSION = VERSION;var COMPILER_REVISION = 6;
  __exports__.COMPILER_REVISION = COMPILER_REVISION;
  var REVISION_CHANGES = {
    1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
    2: '== 1.0.0-rc.3',
    3: '== 1.0.0-rc.4',
    4: '== 1.x.x',
    5: '== 2.0.0-alpha.x',
    6: '>= 2.0.0-beta.1'
  };
  __exports__.REVISION_CHANGES = REVISION_CHANGES;
  var isArray = Utils.isArray,
      isFunction = Utils.isFunction,
      toString = Utils.toString,
      objectType = '[object Object]';

  function HandlebarsEnvironment(helpers, partials) {
    this.helpers = helpers || {};
    this.partials = partials || {};

    registerDefaultHelpers(this);
  }

  __exports__.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
    constructor: HandlebarsEnvironment,

    logger: logger,
    log: log,

    registerHelper: function(name, fn) {
      if (toString.call(name) === objectType) {
        if (fn) { throw new Exception('Arg not supported with multiple helpers'); }
        Utils.extend(this.helpers, name);
      } else {
        this.helpers[name] = fn;
      }
    },
    unregisterHelper: function(name) {
      delete this.helpers[name];
    },

    registerPartial: function(name, partial) {
      if (toString.call(name) === objectType) {
        Utils.extend(this.partials,  name);
      } else {
        this.partials[name] = partial;
      }
    },
    unregisterPartial: function(name) {
      delete this.partials[name];
    }
  };

  function registerDefaultHelpers(instance) {
    instance.registerHelper('helperMissing', function(/* [args, ]options */) {
      if(arguments.length === 1) {
        // A missing field in a {{foo}} constuct.
        return undefined;
      } else {
        // Someone is actually trying to call something, blow up.
        throw new Exception("Missing helper: '" + arguments[arguments.length-1].name + "'");
      }
    });

    instance.registerHelper('blockHelperMissing', function(context, options) {
      var inverse = options.inverse,
          fn = options.fn;

      if(context === true) {
        return fn(this);
      } else if(context === false || context === null) {
        return inverse(this);
      } else if (isArray(context)) {
        if(context.length > 0) {
          if (options.ids) {
            options.ids = [options.name];
          }

          return instance.helpers.each(context, options);
        } else {
          return inverse(this);
        }
      } else {
        if (options.data && options.ids) {
          var data = createFrame(options.data);
          data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
          options = {data: data};
        }

        return fn(context, options);
      }
    });

    instance.registerHelper('each', function(context, options) {
      if (!options) {
        throw new Exception('Must pass iterator to #each');
      }

      var fn = options.fn, inverse = options.inverse;
      var i = 0, ret = "", data;

      var contextPath;
      if (options.data && options.ids) {
        contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
      }

      if (isFunction(context)) { context = context.call(this); }

      if (options.data) {
        data = createFrame(options.data);
      }

      if(context && typeof context === 'object') {
        if (isArray(context)) {
          for(var j = context.length; i<j; i++) {
            if (data) {
              data.index = i;
              data.first = (i === 0);
              data.last  = (i === (context.length-1));

              if (contextPath) {
                data.contextPath = contextPath + i;
              }
            }
            ret = ret + fn(context[i], { data: data });
          }
        } else {
          for(var key in context) {
            if(context.hasOwnProperty(key)) {
              if(data) {
                data.key = key;
                data.index = i;
                data.first = (i === 0);

                if (contextPath) {
                  data.contextPath = contextPath + key;
                }
              }
              ret = ret + fn(context[key], {data: data});
              i++;
            }
          }
        }
      }

      if(i === 0){
        ret = inverse(this);
      }

      return ret;
    });

    instance.registerHelper('if', function(conditional, options) {
      if (isFunction(conditional)) { conditional = conditional.call(this); }

      // Default behavior is to render the positive path if the value is truthy and not empty.
      // The `includeZero` option may be set to treat the condtional as purely not empty based on the
      // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
      if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
        return options.inverse(this);
      } else {
        return options.fn(this);
      }
    });

    instance.registerHelper('unless', function(conditional, options) {
      return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
    });

    instance.registerHelper('with', function(context, options) {
      if (isFunction(context)) { context = context.call(this); }

      var fn = options.fn;

      if (!Utils.isEmpty(context)) {
        if (options.data && options.ids) {
          var data = createFrame(options.data);
          data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
          options = {data:data};
        }

        return fn(context, options);
      } else {
        return options.inverse(this);
      }
    });

    instance.registerHelper('log', function(message, options) {
      var level = options.data && options.data.level !== null ? parseInt(options.data.level, 10) : 1;
      instance.log(level, message);
    });

    instance.registerHelper('lookup', function(obj, field) {
      return obj && obj[field];
    });
  }

  var logger = {
    methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

    // State enum
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    level: 3,

    // can be overridden in the host environment
    log: function(level, message) {
      if (logger.level <= level) {
        var method = logger.methodMap[level];
        if (typeof console !== 'undefined' && console[method]) {
          console[method].call(console, message);
        }
      }
    }
  };
  __exports__.logger = logger;
  var log = logger.log;
  __exports__.log = log;
  var createFrame = function(object) {
    var frame = Utils.extend({}, object);
    frame._parent = object;
    return frame;
  };
  __exports__.createFrame = createFrame;
  return __exports__;
})(__module2__, __module4__);

// handlebars/runtime.js
var __module5__ = (function(__dependency1__, __dependency2__, __dependency3__) {
  "use strict";
  var __exports__ = {};
  var Utils = __dependency1__;
  var Exception = __dependency2__;
  var COMPILER_REVISION = __dependency3__.COMPILER_REVISION;
  var REVISION_CHANGES = __dependency3__.REVISION_CHANGES;
  var createFrame = __dependency3__.createFrame;

  function checkRevision(compilerInfo) {
    var compilerRevision = compilerInfo && compilerInfo[0] || 1,
        currentRevision = COMPILER_REVISION;

    if (compilerRevision !== currentRevision) {
      if (compilerRevision < currentRevision) {
        var runtimeVersions = REVISION_CHANGES[currentRevision],
            compilerVersions = REVISION_CHANGES[compilerRevision];
        throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
              "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
      } else {
        // Use the embedded version info since the runtime doesn't know about this revision yet
        throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
              "Please update your runtime to a newer version ("+compilerInfo[1]+").");
      }
    }
  }

  __exports__.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

  function template(templateSpec, env) {
    /* istanbul ignore next */
    if (!env) {
      throw new Exception("No environment passed to template");
    }
    if (!templateSpec || !templateSpec.main) {
      throw new Exception('Unknown template object: ' + typeof templateSpec);
    }

    // Note: Using env.VM references rather than local var references throughout this section to allow
    // for external users to override these as psuedo-supported APIs.
    env.VM.checkRevision(templateSpec.compiler);

    var invokePartialWrapper = function(partial, indent, name, context, hash, helpers, partials, data, depths) {
      if (hash) {
        context = Utils.extend({}, context, hash);
      }

      var result = env.VM.invokePartial.call(this, partial, name, context, helpers, partials, data, depths);

      if (result === null && env.compile) {
        var options = { helpers: helpers, partials: partials, data: data, depths: depths };
        partials[name] = env.compile(partial, { data: data !== undefined, compat: templateSpec.compat }, env);
        result = partials[name](context, options);
      }
      if (result !== null) {
        if (indent) {
          var lines = result.split('\n');
          for (var i = 0, l = lines.length; i < l; i++) {
            if (!lines[i] && i + 1 === l) {
              break;
            }

            lines[i] = indent + lines[i];
          }
          result = lines.join('\n');
        }
        return result;
      } else {
        throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
      }
    };

    // Just add water
    var container = {
      lookup: function(depths, name) {
        var len = depths.length;
        for (var i = 0; i < len; i++) {
          if (depths[i] && depths[i][name] !== null) {
            return depths[i][name];
          }
        }
      },
      lambda: function(current, context) {
        return typeof current === 'function' ? current.call(context) : current;
      },

      escapeExpression: Utils.escapeExpression,
      invokePartial: invokePartialWrapper,

      fn: function(i) {
        return templateSpec[i];
      },

      programs: [],
      program: function(i, data, depths) {
        var programWrapper = this.programs[i],
            fn = this.fn(i);
        if (data || depths) {
          programWrapper = program(this, i, fn, data, depths);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = program(this, i, fn);
        }
        return programWrapper;
      },

      data: function(data, depth) {
        while (data && depth--) {
          data = data._parent;
        }
        return data;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common && (param !== common)) {
          ret = Utils.extend({}, common, param);
        }

        return ret;
      },

      noop: env.VM.noop,
      compilerInfo: templateSpec.compiler
    };

    var ret = function(context, options) {
      options = options || {};
      var data = options.data;

      ret._setup(options);
      if (!options.partial && templateSpec.useData) {
        data = initData(context, data);
      }
      var depths;
      if (templateSpec.useDepths) {
        depths = options.depths ? [context].concat(options.depths) : [context];
      }

      return templateSpec.main.call(container, context, container.helpers, container.partials, data, depths);
    };
    ret.isTop = true;

    ret._setup = function(options) {
      if (!options.partial) {
        container.helpers = container.merge(options.helpers, env.helpers);

        if (templateSpec.usePartial) {
          container.partials = container.merge(options.partials, env.partials);
        }
      } else {
        container.helpers = options.helpers;
        container.partials = options.partials;
      }
    };

    ret._child = function(i, data, depths) {
      if (templateSpec.useDepths && !depths) {
        throw new Exception('must pass parent depths');
      }

      return program(container, i, templateSpec[i], data, depths);
    };
    return ret;
  }

  __exports__.template = template;function program(container, i, fn, data, depths) {
    var prog = function(context, options) {
      options = options || {};

      return fn.call(container, context, container.helpers, container.partials, options.data || data, depths && [context].concat(depths));
    };
    prog.program = i;
    prog.depth = depths ? depths.length : 0;
    return prog;
  }

  __exports__.program = program;function invokePartial(partial, name, context, helpers, partials, data, depths) {
    var options = { partial: true, helpers: helpers, partials: partials, data: data, depths: depths };

    if(partial === undefined) {
      throw new Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    }
  }

  __exports__.invokePartial = invokePartial;function noop() { return ""; }

  __exports__.noop = noop;function initData(context, data) {
    if (!data || !('root' in data)) {
      data = data ? createFrame(data) : {};
      data.root = context;
    }
    return data;
  }
  return __exports__;
})(__module2__, __module4__, __module1__);

// handlebars.runtime.js
var __module0__ = (function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__) {
  "use strict";
  var __exports__;
  /*globals Handlebars: true */
  var base = __dependency1__;

  // Each of these augment the Handlebars object. No need to setup here.
  // (This is done to easily share code between commonjs and browse envs)
  var SafeString = __dependency2__;
  var Exception = __dependency3__;
  var Utils = __dependency4__;
  var runtime = __dependency5__;

  // For compatibility and usage outside of module systems, make the Handlebars object a namespace
  var create = function() {
    var hb = new base.HandlebarsEnvironment();

    Utils.extend(hb, base);
    hb.SafeString = SafeString;
    hb.Exception = Exception;
    hb.Utils = Utils;
    hb.escapeExpression = Utils.escapeExpression;

    hb.VM = runtime;
    hb.template = function(spec) {
      return runtime.template(spec, hb);
    };

    return hb;
  };

  var Handlebars = create();
  Handlebars.create = create;

  Handlebars['default'] = Handlebars;

  __exports__ = Handlebars;
  return __exports__;
})(__module1__, __module3__, __module4__, __module2__, __module5__);

  return __module0__;
}));

$(document).ready(function() {
    /***************************
     *
     * Actual setup stuff that gets called when the DOM is ready
     *
     * *************************/
    var slideShow;
    ss = new SliderShower(); //...where we pollute the global namespace
    ss.init();

    //Create some one way bindings, we could use a framework for this, but fuck
    //that easy ass shit.
    //TODO add these to the SliderShower init function.
    $('#fit-to-window').change(function(){
        ss.scaleUp = $(this).is(":checked");
    });

    $('#unroll-albums').change(function(){
        ss.unrollAlbums = $(this).is(":checked");
    });

    $('#time-frame').change(function(){
        ss.timeFrame = $(this).val();
        ss.genBaseUrl();
    });

    $('#history-depth').change(function(){
        ss.linksToGrab = $(this).val();
    });

    $('#slide-duration').change(function(){
        ss.slideDuration = $(this).val();
    });

    $('#user').change(function(){
        ss.user = $(this).val();
        ss.genBaseUrl();
    });

    $('#search-term').change(function(){
        ss.searchTerm = $(this).val();
        ss.genBaseUrl();
    });

    $('#subreddit-radio-button').click(function() {
        $('#user').val('');
        $('.user-search').hide();
        $('.subreddit-search').show();
        ss.setCookie();
        ss.genBaseUrl();
    });

    $('#user-radio-button').click(function() {
        $('#subreddit').tagsinput('removeAll');
        $('#search-term').val('');
        $('.subreddit-search').hide();
        $('.user-search').show();
        ss.setCookie();
        ss.genBaseUrl();
    });

    /*************************
     *
     *  Click handlers and other UI control features
     *
     *************************/

    $('#next, .go-next').click(function() {
        endSlideShow();
        nextModalImage();
    });

    $('#prev, .go-prev').click(function() {
        endSlideShow();
        prevModalImage();
    });

    $('#modal-window').mousemove(function(e) {
        clearTimeout(window.a);
        $('.decoration').fadeIn();
        window.a = setTimeout(function() {
            $('.decoration').fadeOut();
        }, 2000);
    });

    //Control swiping here
    //TODO add support to enter/exit albums with up/down swipes
    var touchControls = {
        minDist: 100,
        maxTime: 1000
    };

    $('#modal-window').on('touchstart', function(e) {
        touchControls.xstart = e.originalEvent.touches[0].clientX;
        touchControls.timestart = e.timeStamp;
    });

    $('#modal-window').on('touchmove', function(e) {
        e.preventDefault();
    });

    $('#modal-window').on('touchend', function(e) {
        touchControls.xend = e.originalEvent.changedTouches[0].clientX;
        touchControls.timeend = e.timeStamp;
        deltaX = touchControls.xend - touchControls.xstart;
        deltaT = touchControls.timeend - touchControls.timestart;
        if (deltaX < (-1 * touchControls.minDist) && deltaT < touchControls.maxTime) {
            endSlideShow();
            prevModalImage();
        } else if (deltaX > touchControls.minDist && deltaT < touchControls.maxTime) {
            endSlideShow();
            nextModalImage();
        }
    });

    $('#next, #prev').mouseenter(function(e) {
        clearTimeout(window.a);
        $('.decoration').fadeIn();
    });

    $(document).keydown(function(e) {

        if ($('#modal-window').css('display') !== 'none') {
            if (e.keyCode === 39 || e.keyCode === 78) { //next slide
                endSlideShow();
                nextModalImage();
            } else if (e.keyCode === 37 || e.keyCode === 80) { //prev slide
                endSlideShow();
                prevModalImage();
            } else if (e.keyCode === 38 && !ss.albumMode) { //key up
                enterAlbumMode();
            } else if (e.keyCode === 40 && ss.albumMode) { //key down
                exitAlbumMode();
            } else if (e.keyCode === 27) { //Esc
                endSlideShow();
                $('body').css('overflow', 'auto');
                $('#modal-window').hide();
            } else if (e.keyCode === 83) { //s
                toggleSlideShow();
            } else if (e.keyCode === 32 && !($('input').is(':focus'))) { //space
                toggleSlideShow();
            }
        } else if (!$('input').is(":focus")){
            if (e.keyCode === 83) { //s
                $('.overlay:first').trigger('click');
                toggleSlideShow();
            }
        } else {
        }
    });

    $('#modal-overlay').click(function() {
        endSlideShow();
        $('body').css('overflow', 'auto');
        $('#modal-window').hide();
    });

    $('#options-pin').tooltip()
    .click(function(e) {
        $(this).toggleClass('glyphicon-pushpin');
        $(this).toggleClass('glyphicon-record');
        ss.pinOptions = !ss.pinOptions;
    });

    $('#help-clicker').click(function() {
        $('.help-window').modal('show');
    });

    //TODO this shit needs to get fixed....
    //Oooooh that would work, have a title for each one of them instead of
    //detaching.
    $('.modal-image').mouseenter(function() {
        $('#modal-title').show();
    });

    $('.modal-image').mouseleave(function() {
        if (!ss.pinImageTitles) {
            $('#modal-title').hide();
        }
    });

    //TODO getRedditInfo should resolve as a promise so that other poop can be
    //called here.
    $('#slide-show-button').click(function(e) {
        e.preventDefault();
        hideForm();
        ss.reset();
    });

    $('#fetchButton').click(function(e) {
        e.preventDefault();
        $('.header-container').hide();
        hideForm();
        ss.setCookie(); //save your search options
        ss.reset(); //this is mostly doing ss.images = [];
        toggleMessage();
        window.setTimeout(function() {
            ss.getRedditInfo();
        }, 300);
    });

    $('#image-title-pin').click(function() {
        $(this).toggleClass('glyphicon-pushpin');
        $(this).toggleClass('glyphicon-record');
        ss.pinImageTitles = !ss.pinImageTitles;
    });

    $('#hide-clicker').click(function() {
        if (ss.images.length > 0) {
            $('.reddit-form').slideUp('fast');
            $('.header').fadeIn();
        }
    });

    $('#slideshow-state, .go-play').click(function(e) {
        toggleSlideShow();
    });

    $('#show-options').click(function(e) {
        ss.headerTimeout = setTimeout(function(){
            $('.header').hide();
            $('.reddit-form').slideDown('fast');
        }, 100);
    });

    //This seems inelegant..fuck it;
    vcenter($('#message-box'));
    vcenter($('#prev'));
    vcenter($('#next'));
    vcenter($('#prev div'), true);
    vcenter($('#next div'), true);

    $(window).on('resize', function(e) {
        vcenter($('#message-box'));
        vcenter($('#prev'));
        vcenter($('#next'));
        vcenter($('#prev div'), true);
        vcenter($('#next div'), true);
    });

    //Sets up the tag input area using the tag plugin
    $('#subreddit').tagsinput({
        confirmKeys: [34, 13, 44],
        tagClass: 'big'
    });

    $('input').on('itemAdded', function (){
        ss.subreddits = $('#subreddit').val().split(',');
    });

    $('input').on('itemRemoved', function (){
        ss.subreddits = $('#subreddit').val().split(',');
    });

    ss.getCookie();
    ss.setOptions();
});

/*
 * Turns the slideshow on and off
 */
function toggleSlideShow() {
    if (ss.slideShowActive) {
        endSlideShow();
    } else {
        startSlideShow();
    }
}

/*
 * Starts the slideshow
 */
function startSlideShow() {
    ss.slideShowActive = true;
    $('#slideshow-state').children().first().toggleClass('glyphicon-play');
    $('#slideshow-state').children().first().toggleClass('glyphicon-pause');
    $(document).trigger('imageLoaded');
}

/*
 * Document listener that moves the slideshow along
 */
$(document).on('imageLoaded', function() {
    if (ss.slideShowActive) {
        $('#timer-bar')
        .animate({'width': '100%'}, {
            duration: (ss.slideDuration * 1000),
            easing: 'linear',
        }).promise().done(function() {
            if (ss.slideShowActive) nextModalImage();
        });
    }
});

/**
 * Scales an image so that if will fit inside a given element
 *
 * @param {number} elHeight Height of the element to contain the image.
 * @param {number} elWidth Width of the element to contain the image.
 * @param {Image} image The image to stuff into the element.
 * @param {bool} scaleUp Whether or not to scale images up to the size of the element.
 * @return {object} Object where 'w' is scaled width, 'h' is scaled height, and 'scaled' is true if scaling took place.
 */
function scaleImage (elWidth, elHeight, image, scaleUp) {
    //everthing fits, so we current image size
    var whRatio = image.width / image.height;
    if (image.height < elHeight && image.width < elWidth) {
        if (scaleUp) {
            if (image.height >= image.width) {
                scales = {w: ((elHeight * image.width) / image.height), h: elHeight, scaled: true};
            } else {
                scales = {w: elWidth, h: ((elWidth * image.height) / image.width), scaled: true};
            }
        } else {
            scales = {w: image.width, h: image.height, scaled: false};
        }
    //make the major axis fit
    } else if (image.height >= elHeight || image.width >= elWidth) {
        if (image.height >= image.width) { //portraits
            scales = {w: ((elHeight * image.width) / image.height), h: elHeight, scaled: true};
        } else { //landscape images
            scales = {w: elWidth, h: ((elWidth * image.height) / image.width), scaled: true};
        }
    }
    //check and see if the minor axis fits, fit it if it does not
    if (scales.w >= elWidth || scales.h >= elHeight) {
        if (scales.h >= elHeight) { //portraits
            scales = {w: ((elHeight * scales.w) / scales.h), h: elHeight, scaled: true};
        } else { //landscape images
            scales = {w: elWidth, h: ((elWidth * scales.h) / scales.w), scaled: true};
        }
    }
    //return our results
    return scales;
}

/**
 * Utility function that checks to see if a slideShow var has been set,
 * clears the slideShow interval if it has been, and undefines said
 * variable.
 */
function endSlideShow() {
    ss.slideShowActive = false;
    $('#slideshow-state').children().first().toggleClass('glyphicon-play');
    $('#slideshow-state').children().first().toggleClass('glyphicon-pause');
    $('#timer-bar').stop(true, true);
    $('#timer-bar').width(0);
}

/*Scrolls you up to the album and increments the image appropriately
 * TODO integrate IArray into this
 */
function enterAlbumMode() {
    var i = ss.images[ss.activeImage].data;
    if (i.hasOwnProperty('album')) {
        ss.albumMode = true;
        i.j = typeof i.j === 'undefined' ? 0 : i.j; //j is album index
        i.url = i.album.images[i.j].links.original;
        if (i.album.images[i.j].image.caption) {
            i.title = i.album.images[i.j].image.caption + " (" + (i.j + 1) + "/" + i.album.images.length + ")";
        } else {
            i.title = i.album.title + " (" + (i.j + 1) + "/" + i.album.images.length + ")";
        }
        setupModal(true);
    }
}

/*
 * Exits album mode.
 */
function exitAlbumMode() {
    var i = ss.images[ss.activeImage].data;
    if (i.hasOwnProperty('album') && ss.albumMode) {
        ss.albumMode = false;
        i.j = 0;
        i.url = i.album.images[0].links.original;
        i.title = i.album.title;
        setupModal(true);
    }
}

/*
 * Switches to the next Modal image.
 *
 */
function nextModalImage() {
    $('#imgur-link').hide();
    if (ss.slideShowActive) $('#timer-bar').width('0');
    var i = ss.images[ss.activeImage].data;
    if ((ss.unrollAlbums || ss.albumMode) && i.hasOwnProperty('album')) {
        i.j = typeof i.j === 'undefined' ? 0 : i.j; //j is album index
        if (i.j + 1 === i.album.images.length) {
            if (ss.albumMode) ss.albumMode = false;
            incrementModalImage();
        } else {
            i.j = i.j + 1;
        }
        i.url = i.album.images[i.j].links.original;
        if (i.album.images[i.j].image.caption) {
            i.title = i.album.images[i.j].image.caption + " (" + (i.j + 1) + "/" + i.album.images.length + ")";
        } else {
            i.title = i.album.title + " (" + (i.j + 1) + "/" + i.album.images.length + ")";
        }
    } else {
        incrementModalImage();
    }
    setupModal(true);
}

/*
 * Help function to increment the modalImage
 */
function incrementModalImage() {
    if (Number(ss.activeImage) < ss.images.length - 1) {
        ss.activeImage = Number(ss.activeImage) + 1;
    } else {
        ss.activeImage = 0;
    }
}

/*
 * Switches to the previous Modal image.
 */
function prevModalImage() {
    $('#imgur-link').hide();
    var i = ss.images[ss.activeImage].data;
    if (ss.unrollAlbums && i.hasOwnProperty('album')) {
        i.j = typeof i.j === 'undefined' ? 0 : i.j; //j is album index
        if (i.j === 0) {
            decrementModalImage();
        } else {
            i.j = i.j - 1;
        }
        i.url = i.album.images[i.j].links.original;
        if (i.album.images[i.j].image.caption) {
            i.title = i.album.images[i.j].image.caption + " (" + (i.j + 1) + "/" + i.album.images.length + ")";
        } else {
            i.title = i.album.title + " (" + (i.j + 1) + "/" + i.album.images.length + ")";
        }
    } else {
        decrementModalImage();
    }
    setupModal(true);
}

/*
 * Helper function to decrement the modal image
 */
function decrementModalImage() {
    if (Number(ss.activeImage) > 0) {
        ss.activeImage = Number(ss.activeImage) - 1;
    } else {
        ss.activeImage = ss.images.length - 1;
    }
}

/**
 * Function to setup the 'modal' overlay that displays images in
 * fullscreen mode.
 *
 * @param {string} image_url URL of the image to be displayed.
 * @param {string} title The title of the image to be displayed.
 * @param {string} sub The subredit from which the image was pulled.
 * @param {string} permalink The link to the comments page for the image on reddit.
 */
function setupModal(transition) {
    $('body').css('overflow', 'hidden'); //hides the scrollbars when in FS
    if (transition) {
        var temp = ss.activeImgEl;
        ss.activeImgEl = ss.nextImgEl;
        ss.nextImgEl = temp;
    }
    var i = ss.images[ss.activeImage].data;
    var mod = ss.activeImgEl;
    showLoader(ss.activeImgEl, 'top-right');
    showLoader(ss.nextImgEl, 'top-right');
    var img = new Image();
    $(img).load(function() {
        ss.imageState = 'loaded';
        setupImage(mod, img, i);
        if (transition) {
            $(ss.activeImgEl).fadeToggle('slow');
            $(ss.nextImgEl)
            .fadeToggle({duration: 'slow', complete: function() {
                $(document).trigger('imageLoaded');
            }});
        }
    });
    ss.imageState = 'loading';
    img.src = i.url;
    if (i.source_type === "imgur album") {
    }
}

/*
 * TODO Put handlebars to work here
 */
function setupImage(modal, image, data) {
    var scale = 0.9;
    var w = $(window);
    var scaleUp = ss.scaleUp;
    var maxH = w.height() * scale;
    var maxW = w.width() * scale;
    var scaleVars = scaleImage(maxW, maxH, image, scaleUp);
    modal.height(scaleVars.h);
    modal.width(scaleVars.w);
    modal.css('background-image', "url(\"" + data.url + "\")");
    modal.css('background-size', 'cover');
    modal.css('background-repeat', "none");
    modal.css('top', (w.height() - modal.height()) / 2 + "px");
    modal.css('left', (w.width() - modal.width()) / 2 + "px");
    $('#title').html(setupImageTitle(data));
    $('#modal-sub').text(data.subreddit);
    $('#reddit-link').attr('href', "http://www.reddit.com" + data.permalink);
    $('#reddit-link').attr('target', '_blank');

    //This part sets up the image title
    var modal_title = $('#modal-title').detach();
    modal.append(modal_title);

    $('#modal-window').show();
    hideLoaders();
}

/*
 * Sets up the title
 */
function setupImageTitle(data) {
    if (data.hasOwnProperty('album')) {
        if (ss.albumMode) {
            return data.title;
        } else {
            return data.title + ' (Album - ' + data.album.images.length + ' images)';
        }
    } else {
        return data.title;
    }
}

/*
 * Vertically centers an element
 * TODO: grab everything that uses this as a class and center it...
 */
function vcenter(el, parent) {
    var elHeight, wHeight, newTop, p, pHeight;
    elHeight = $(el).height();
    if (parent) {
        p = $(el).parent();
        pHeight = p.height();
        newTop = p.css('top') + (pHeight / 2) - (elHeight / 2);
    } else {
        wHeight = $(window).height();
        newTop = (wHeight / 2) - (elHeight / 2);
    }
    $(el).css('top', newTop);
}


//this would be so much easier with a fucking template system....
//TODO use mustache or handlebars to simplify this bit
function imageBoxFactory(link, index) {
    var data = link.data;
    var descLen = 65;
    var r = data.subreddit.length > 10 ?
            data.subreddit.substr(0,10) + "..." :
            data.subreddit;
    var u = data.url;
    var th = data.thumbnail === "default" ? "images/default.png" :
             data.thumbnail === "nsfw" ? "images/nsfw.png" : data.thumbnail;
    var pl = "http://www.reddit.com" + data.permalink;
    var t = data.title.replace(/"/g,"'").length > descLen ?
            data.title.substr(0, descLen) + "..." :
            data.title.replace(/"/g,"'");
    var $div = $("<div>", {class: "image"});
    var $inf = $("<div>", {class: "overlay", i: index});
    var $des = $("<div>", {class: "image-description"});
    var $ttl = $("<div>", {class: "image-title"});
    var $red = $("<a>", {href: pl,
                         target: "_blank",
                         style: "target-new: tab; position: absolute; bottom: 5px;"
                });
    var $redImg = $("<img>", {src: "images/reddit.png"});
    $div.css('background-image', 'url(\"' + th + '\")');
    $des.html(t);
    $ttl.html("r/" + r);
    $red.append($redImg);
    $inf.append($ttl);
    $inf.append($des);
    $inf.append($red);
    $inf.click(clickOverlay);
    $div.append($inf);
    return $div;
}

function clickOverlay(e) {
    ss.activeImage = $(this).attr('i');
    showLoader($(this));
    setupModal();
}

/*
 * Show the message box
 *
 */
function toggleMessage(text) {
    var msgBox = $('#message-box');
    var msg = $('#message-progress');
    if (msgBox.css('display') === 'none') {
        msg.text(text);
        msgBox.fadeIn();
    } else {
        msgBox.fadeOut();
        console.log('reverting progress bars')
        $('#progress-bar').attr('aria-valuenow', 0).width(0);
        $('#message-progress').text('');
    }
}

function updateMessage(text) {
    var msgBox = $('#message-progress');
    var percent = (ss.images.length / ss.linksToGrab) * 100;
    var msgProgress = $('#progress-bar');
    msgBox.text(text);
    msgProgress.attr('aria-valuenow', percent)
               .width(percent + "%");
}

$(document).on('addedImages', function(e) {
    var t = "(" + ss.images.length + "/" + ss.linksToGrab + ")";
    updateMessage(t);
});

/**
 * Utility function to hide all loading icons in the DOM.
 */
function hideLoaders() {
    $('.loading').remove();
}

/**
 * Utility function to place a loading icon in the middle of an element.
 * @param {Node} el The DOM element over which we'll display the loader.
 */
function showLoader(el, position) {
    var overlay = $('<img>', {class: 'loading', src: 'loading.gif'});
    el.append(overlay);
    overlay.css('position', 'absolute');
    if (position === "center" || position === undefined) {
        overlay.css('top', ((el.height() - 31) / 2));
        overlay.css('left', ((el.width() - 31) / 2));
    } else {
        overlay.css('top', 0);
        overlay.css('right', 0);
    }
}

/*
* Function to hide the initial search form and set up sub highlightin..
* TODO this needs to be broken out...
* This is really, really ugly.
*/
function hideForm() {
    $('#images').empty();
    if (!ss.pinOptions) {
        $('.reddit-form').slideUp('fast');
        $('#sub-list').empty();
        ss.getSubreddits().split('+').forEach(function(x) {
            var span = $('<span>', {class: 'sub-name', sub: x});
            span.click(function(e) {
                var sub = e.target.attributes.sub.value, i = 0;
                ss.images.forEach(function(z) {
                    if (z.data.subreddit.toLowerCase() === sub) {
                        $('.overlay[i=' + i + ']')
                        .parent()
                        .toggleClass('highlight-overlays');
                    }
                    i++;
                });
            });
            $('#sub-list').append(span.text(x));
        });
        $('.header').fadeIn();
    }
}

$(document).on('foo', function() {
    toggleMessage();
});

//TODO these should all be passed in as part of a config
var SliderShower = function() {
    this.images = [];
    this.activeImage = 0;
    this.albumImage = 0;
    this.slideShowActive = false;
    this.nextPage = '';
    this.subreddits = $('#subreddit').val().split(/\s/);
    this.searchTerm = $('#search-term').val();
    this.timeFrame = $('#reddit-form select[name="time-frame"]').val();
    this.linksToGrab = $('#history-depth').val();
    this.scaleUp = $('#fit-to-window').is(":checked");
    this.slideDuration = $('#slide-duration').val();
    this.activeImgEl = $('#first-modal-image');
    this.nextImgEl = $('#second-modal-image');
    this.unrollAlbums = false;
    this.albumMode = false;
    this.pinOptions = false;
    this.pinImageTitles = false;
};

//TODO these should get the config elements passed into them
SliderShower.prototype.setOptions = function() {
    $('#subreddit').tagsinput('removeAll');
    this.subreddits.forEach(function(z) {
        $('#subreddit').tagsinput('add', z.trim());
    });
    $('#search-term').val(this.searchTerm);
    $('#reddit-form select[name="time-frame"]').val(this.timeFrame);
    $('#history-depth').val(this.linksToGrab);
    $('#slide-duration').val(this.slideDuration);
    this.genBaseUrl();
};

SliderShower.prototype.getSubreddits = function() {
    return this.subreddits.join('+');
};

SliderShower.prototype.genBaseUrl = function(after) {
    var url = "http://www.reddit.com/", query = {}, qString = '', key;
    if (this.user) {
        url += "user/" + this.user + "/submitted/.json";
    } else if (this.searchTerm) {
        url += "r/" + this.getSubreddits() + "/search/.json";
    } else if (this.timeFrame) {
        url += "r/" + this.getSubreddits() + "/top/.json";
    } else {
        url += "r/" + this.getSubreddits() + ".json";
    }
    if (this.timeFrame) {
        query.t = this.timeFrame;
        query.sort = 'top';
    }
    if (this.searchTerm !== '') {
        query.restrict_sr = 'on';
        query.q = this.searchTerm.replace(' ', '+');
        if (!this.timeFrame || this.timeFrame !== 'none') {
            query.sort = 'top';
        } else {
            query.sort = 'relevance';
        }
    }
    if (typeof after !== 'undefined') {
        query.count = 25;
        query.after = after;
    }
    for (key in query) {
        qString += "&" + key + "=" + query[key];
    }
    qString = qString.replace('&', '?');
    console.log(url + qString);
    return url + qString;
};

SliderShower.prototype.setNextPage = function(after) {
    if (typeof after === 'undefined') {
        this.nextPage = this.genBaseUrl();
    } else {
        this.nextPage = this.genBaseUrl(after);
    }
};

SliderShower.prototype.setCookie = function() {
    var cookie = JSON.stringify({
        sr: this.subreddits.join(','),
        st: this.searchTerm,
        un: this.user,
        tf: this.timeFrame,
        lg: this.linksToGrab,
        sd: this.slideDuration,
        si: this.scaleUp,
        ua: this.unrollAlbums
    });
    var date = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toGMTString();
    document.cookie = "options="+ cookie + ";expires=" + date;
};

SliderShower.prototype.getCookie = function() {
    var that = this;
    document.cookie.split(';').forEach(function(c) {
        var optionsObject;
        if (c.trim().indexOf('options') !== -1) {
            c = JSON.parse(c.split('=')[1]);
            that.subreddits = c.sr.split(',');
            that.searchTerm = c.st;
            that.user = c.un;
            that.timeFrame = c.tf;
            that.linksToGrab = c.lg;
            that.slideDuration = c.sd;
            that.scaleUp = c.si;
            that.unrollAlbums = c.ua;
            return true;
        }
        return false;
    });
};

SliderShower.prototype.getRedditInfo = function() {
    var that = this;
    $.ajax({url: that.nextPage})
    .fail(function(e){
        document.dispatchEvent(new Event('foo'));
    })
    .done(function(e) {
        var images = that.filterImageLinks(e.data.children);
        var ev = new Event('addedImages');
        images.forEach(function(i) {
            if (that.images.length < that.linksToGrab) {
                that.images.push(i);
                $('#images').append(imageBoxFactory(i, that.images.length - 1));
            }
        });
        document.dispatchEvent(ev);
    })
    .then(function(e) {
        if (e.data.after !== null) {
            that.setNextPage(e.data.after);
            if (that.images.length < that.linksToGrab) {
                that.getRedditInfo();
            } else {
                document.dispatchEvent(new Event('foo')); //hides the message window
            }
        } else {
            console.log('No after...sorry!');
            document.dispatchEvent(new Event('foo'));
        }
    });
};

/**
 * TODO: Allow allow for a custom set of extensions
 * TODO: Create a similar funciton that will filter out imgur albums, etc.
 * TODO: Clean this shit up
 *
 * @param {string} url The url that we're checking for imageyness.
 * @return {boolean} True if the url ends in an image extension, false otherwise.
 */
SliderShower.prototype.filterImageLinks = function(links) {
    var out_links = [];
    links.forEach(function(link) {
        //This came from RES..credit where credit is due
        var ar = link.data.url.match(/^https?:\/\/(?:i\.|m\.)?imgur\.com\/(?:a|gallery)\/([\w]+)(\..+)?(?:\/)?(?:#?\w*)?$/i);
        if (ar) {
            var apiUrl = "http://api.imgur.com/2/album/" + encodeURIComponent(ar[1]) + ".json";
            link.album_url = link.data.url;
            $.ajax({url: apiUrl, async: false})
            .success(function(data) {
                try {
                    link.data.url = data.album.images[0].links.original;
                    link.data.thumbnail = data.album.images[0].links.small_square;
                    link.data.album = data.album;
                    link.data.album.title = link.data.title;
                    out_links.push(link);
                } catch (e) {
                    //do nothing...probably a 404...
                }
            })
            .fail(function(data) {
                console.log(data);
            });
        } else if (link.data.url.match(/.*\.(?:png|jpg|jpeg|gif)/)) {
            out_links.push(link);
        }
    });
    return out_links;
};

SliderShower.prototype.loadError = function() {
    alert("Unable to load" + this.nextPage + " no such subreddit");
};

SliderShower.prototype.gatherAllImages = function() {
    this.getSinglePageFromReddit();
};

SliderShower.prototype.reset = function() {
    this.images = [];
    this.nextPage = this.genBaseUrl();
    this.activeImage = 0;
};

SliderShower.prototype.init = function() {
    this.setNextPage();
};
