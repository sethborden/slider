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

$(document).ready(function() {
    /***************************
     *
     * Actual setup stuff that gets called when the DOM is ready
     *
     * *************************/
    var slideShow;

    //create a new implementation of this.
    var ss = new SliderShower();
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

    $('#search-term').change(function(){
        ss.searchTerm = $(this).val();
    });

    /*************************
     *
     *  Click handlers and other UI control features
     *
     *************************/

    $(document).keydown(function(e) {
        if ($('#modal-window').css('display') !== 'none') {
            if (e.keyCode === 39) {
                endSlideShow();
                nextModalImage();
            } else if (e.keyCode === 37) {
                endSlideShow();
                prevModalImage();
            } else if (e.keyCode === 38 && !ss.albumMode) {
                enterAlbumMode();
            } else if (e.keyCode === 40 && ss.albumMode) {
                exitAlbumMode();
            } else if (e.keyCode === 27) {
                endSlideShow();
                $('body').css('overflow', 'auto');
                $('#modal-window').hide();
            } else if (e.keyCode === 83) {
                toggleSlideShow();
            } else if (e.keyCode === 32 && !($('input').is(':focus'))) {
                toggleSlideShow();
            }
        } else {
            if (e.keyCode === 83) {
                $('.overlay:first').trigger('click');
                toggleSlideShow();
            }
        }
    });

    $(document).on('foo', function() {
        toggleMessage();
    });

    $('#modal-overlay').click(function() {
        endSlideShow();
        $('body').css('overflow', 'auto');
        $('#modal-window').hide();
    });

    //TODO getRedditInfo should resolve as a promise so that other poop can be
    //called here.
    $('#slide-show-button').click(function(e) {
        e.preventDefault();
        hideForm();
        ss.reset();
    });

    function hideForm() {
        $('#images').empty();
        $('.reddit-form').slideUp('fast');
        $('.header-info').text($('#subreddit').val());
        $('.header').fadeIn();
    }

    $('#fetchButton').click(function(e) {
        e.preventDefault();
        hideForm();
        ss.reset(); //this is mostly doing ss.images = [];
        $('.page-title').slideUp('fast');
        toggleMessage('Loading images...');
        window.setTimeout(function() {
            ss.getRedditInfo();
        }, 300);
    });

    $('.reddit-form').mouseleave(function(e) {
        if (ss.images.length > 0) {
            $('.reddit-form').slideUp('fast');
            $('.header').fadeIn();
        }
    });

    $('#slideshow-state').click(function(e) {
        toggleSlideShow();
    });

    $('.header').mouseenter(function(e) {
        ss.headerTimeout = setTimeout(function(){
            $('.header').hide();
            $('.reddit-form').slideDown('fast');
        }, 500);
    });

    $('.header').mouseleave(function(e) {
        if (ss.headerTimeout) {
            clearTimeout(ss.headerTimeout);
        }
    });

    $('#title-toggle').click(function(e) {
        var that = $(this);
        $('#title').toggle(300, function() {
            if (that.text() === '-') {
                that.text('+');
            } else {
                that.text('-');
            }
        });
    });

    //Sets up the tag input area using the tag plugin
    $('#subreddit').tagsinput({
        confirmKeys: [32, 13, 44]
    });

    $('input').on('itemAdded', function (){
        ss.subreddits = $('#subreddit').val().split(',');
    });

    $('input').on('itemRemoved', function (){
        ss.subreddits = $('#subreddit').val().split(',');
    });

    function clickOverlay(e) {
        showLoader($(this));
        ss.activeImage = $(this).attr('i');
        setupModal();
    }

    /*****************************
     *
     * Utility functions that don't actually change anything in the UI
     *
     * ***************************/


    /*
     * If the slideshow is running, stop it, otherwise start it.
     *
     */
    function toggleSlideShow() {
        if (ss.slideShowActive) {
            endSlideShow();
        } else {
            startSlideShow();
        }
    }

    function startSlideShow() {
        ss.slideShowActive = true;
        $('#slideshow-state').html('&#9632;');
        $(document).trigger('imageLoaded');
    }

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
        $('#slideshow-state').html('&#9654;');
        $('#timer-bar').stop(true, true);
        $('#timer-bar').width(0);
    }

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
     *TODO Set up images a linked list, and lazy-eval imgur albums into linked lists as well.
     *That way, when we auto-unroll albums, you just need to change the first image link to the second link, etc.
     *If we're not auto-unrolling, "Up" trigges the unroll, etc.
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

    function decrementModalImage() {
        if (Number(ss.activeImage) > 0) {
            ss.activeImage = Number(ss.activeImage) - 1;
        } else {
            ss.activeImage = ss.images.length - 1;
        }
    }
    /********************************
     *
     * Functions that draw things into the UI
     *
     ********************************/

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
        showLoader(ss.activeImgEl);
        showLoader(ss.nextImgEl);
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
        $('#modal-link').attr('href', "http://www.reddit.com" + data.permalink);
        if (data.hasOwnProperty('album_url')) {
            $('#imgur-link').show().attr('href', data.album_url);
        }
        $('#modal-link').attr('target', '_blank');
        $('#modal-window').show();
        hideLoaders();
    }

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

    /**
     * Utility function to place a loading icon in the middle of an element.
     *
     * TODO: Allow to specify where on the el the loader is located
     * TODO: Allow for a custom loader
     * TODO: Allow for a custom loader class name
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

    /**
     * Utility function to hide all loading icons in the DOM.
     */
    function hideLoaders() {
        $('.loading').remove();
    }

    /*
     * Show the message box
     *
     */
    function toggleMessage(text) {
        var msgBox = $('#messages');
        if (msgBox.css('display') === 'none') {
            msgBox.text(text);
            msgBox.fadeIn();
        } else {
            msgBox.fadeOut();
        }
    }

    //this would be so much easier with a fucking template system....
    //TODO use mustache or handlebars to simplify this bit
    imageBoxFactory = function(link, index) {
        var data = link.data;
        var descLen = 65;
        var r = data.subreddit.length > 10 ?
                data.subreddit.substr(0,10) + "..." :
                data.subreddit;
        var u = data.url;
        var th = data.thumbnail === "default" ? "images/default.png" : data.thumbnail;
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
    };
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
    this.scaleUp = $('#unroll-albums').is(":checked");
    this.slideDuration = $('#slide-duration').val();
    this.activeImgEl = $('#first-modal-image');
    this.nextImgEl = $('#second-modal-image');
    this.unrollAlbums = false;
    this.albumMode = false;
};

SliderShower.prototype.getSubreddits = function() {
    return this.subreddits.join('+');
};

SliderShower.prototype.genBaseUrl = function() {
    if (this.searchTerm !== '' && this.timeFrame !== 'none') {
        return "http://www.reddit.com/r/" +
               this.getSubreddits() +
               "/search.json?q=" +
               this.searchTerm.replace(' ', '+') +
               "&restrict_sr=on&sort=relevance&t=" +
               this.timeFrame;
    } else if (this.timeFrame !== 'none') {
        return "http://www.reddit.com/r/" +
               this.getSubreddits() +
               "/top/.json?sort=top&t=" +
               this.timeFrame;
    } else if (this.searchTerm !== '') {
        return "http://www.reddit.com/r/" +
               this.getSubreddits() +
               "/search.json?q=" +
               this.searchTerm.replace(' ', '+') +
               "&restrict_sr=on&sort=relevance&t=all";
    } else {
        return "http://www.reddit.com/r/" +
               this.getSubreddits() +
               ".json";
    }
};

SliderShower.prototype.setNextPage = function(after) {
    if (this.images.length === 0) {
        this.nextPage = this.genBaseUrl();
    } else if (this.timeFrame !== 'none') {
        this.nextPage = this.genBaseUrl() + "&count=25&after=" + after;
    } else {
        this.nextPage = this.genBaseUrl() + "?count=25&after=" + after;
    }
};

SliderShower.prototype.getRedditInfo = function() {
    var that = this;
    var currentJSON = $.ajax({url: that.nextPage, async: false});
    currentJSON.fail(function(e){
        document.dispatchEvent(new Event('foo'));
    });
    currentJSON.done(function(e) {
        var images = that.filterImageLinks(e.data.children);
        images.forEach(function(i) {
            if (that.images.length < that.linksToGrab) {
                that.images.push(i);
                $('#images').append(imageBoxFactory(i, that.images.length - 1));
            }
        });
    })
    .then(function(e) {
        if (e.data.after !== null) {
            that.setNextPage(e.data.after);
            if (that.images.length < that.linksToGrab) {
                that.getRedditInfo();
            } else {
                document.dispatchEvent(new Event('foo'));
            }
        } else {
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

SliderShower.prototype.processRedditPage = function(images, base) {
    for (var i = 0, l = images.length; i < l; i++) {
    }
    //this.setNextPage(data.data.after);
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
