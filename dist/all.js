/*

   jQuery Tags Input Plugin 1.3.3

   Copyright (c) 2011 XOXCO, Inc

   Documentation for this plugin lives here:
   http://xoxco.com/clickable/jquery-tags-input

   Licensed under the MIT license:
   http://www.opensource.org/licenses/mit-license.php

   ben@xoxco.com

*/

(function($) {

    var delimiter = [];
    var tags_callbacks = [];
    $.fn.doAutosize = function(o){
        var minWidth = $(this).data('minwidth'),
    maxWidth = $(this).data('maxwidth'),
    val = '',
    input = $(this),
    testSubject = $('#'+$(this).data('tester_id'));

    if (val === (val = input.val())) {return;}

    // Enter new content into testSubject
    var escaped = val.replace(/&/g, '&amp;').replace(/\s/g,' ').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    testSubject.html(escaped);
    // Calculate new width + whether to change
    var testerWidth = testSubject.width(),
    newWidth = (testerWidth + o.comfortZone) >= minWidth ? testerWidth + o.comfortZone : minWidth,
    currentWidth = input.width(),
    isValidWidthChange = (newWidth < currentWidth && newWidth >= minWidth) ||
        (newWidth > minWidth && newWidth < maxWidth);

    // Animate width
    if (isValidWidthChange) {
        input.width(newWidth);
    }


    };
    $.fn.resetAutosize = function(options){
        // alert(JSON.stringify(options));
        var minWidth =  $(this).data('minwidth') || options.minInputWidth || $(this).width(),
            maxWidth = $(this).data('maxwidth') || options.maxInputWidth || ($(this).closest('.tagsinput').width() - options.inputPadding),
            val = '',
            input = $(this),
            testSubject = $('<tester/>').css({
                position: 'absolute',
            top: -9999,
            left: -9999,
            width: 'auto',
            fontSize: input.css('fontSize'),
            fontFamily: input.css('fontFamily'),
            fontWeight: input.css('fontWeight'),
            letterSpacing: input.css('letterSpacing'),
            whiteSpace: 'nowrap'
            }),
            testerId = $(this).attr('id')+'_autosize_tester';
        if($('#'+testerId).length === 0){
            testSubject.attr('id', testerId);
            testSubject.appendTo('body');
        }

        input.data('minwidth', minWidth);
        input.data('maxwidth', maxWidth);
        input.data('tester_id', testerId);
        input.css('width', minWidth);
    };

    $.fn.addTag = function(value,options) {
        options = jQuery.extend({focus:false,callback:true},options);
        this.each(function() {
            var id = $(this).attr('id');
            var skipTag;
            var tagslist = $(this).val().split(delimiter[id]);
            var f;
            if (tagslist[0] === '') {
                tagslist = [];
            }

            value = jQuery.trim(value);

            if (options.unique) {
                skipTag = $(this).tagExist(value);
                if(skipTag === true) {
                    //Marks fake input as not_valid to let styling it
                    $('#'+id+'_tag').addClass('not_valid');
                }
            } else {
                skipTag = false;
            }
            if (value !== '' && skipTag !== true) {
                $('<span>').addClass('tag').append(
                    $('<span>').text(value).append('&nbsp;&nbsp;'),
                    $('<a>', {
                        href  : '#',
                    title : 'Removing tag',
                    text  : 'x'
                    }).click(function () {
                        return $('#' + id).removeTag(escape(value));
                    })
                    ).insertBefore('#' + id + '_addTag');
                tagslist.push(value);
                $('#'+id+'_tag').val('');
                if (options.focus) {
                    $('#'+id+'_tag').focus();
                } else {
                    $('#'+id+'_tag').blur();
                }
                $.fn.tagsInput.updateTagsField(this,tagslist);
                if (options.callback && tags_callbacks[id] && tags_callbacks[id].onAddTag) {
                    f = tags_callbacks[id].onAddTag;
                    f.call(this, value);
                }
                if(tags_callbacks[id] && tags_callbacks[id].onChange)
                {
                    var i = tagslist.length;
                    f = tags_callbacks[id].onChange;
                    f.call(this, $(this), tagslist[i-1]);
                }
            }
        });

        return false;
    };
    $.fn.removeTag = function(value) {
        value = unescape(value);
        this.each(function() {
            var id = $(this).attr('id');
            var old = $(this).val().split(delimiter[id]);
            $('#'+id+'_tagsinput .tag').remove();
            str = '';
            for (i=0; i< old.length; i++) {
                if (old[i]!=value) {
                    str = str + delimiter[id] +old[i];
                }
            }
            $.fn.tagsInput.importTags(this,str);

            if (tags_callbacks[id] && tags_callbacks[id].onRemoveTag) {
                var f = tags_callbacks[id].onRemoveTag;
                f.call(this, value);
            }
        });
        return false;
    };
    $.fn.tagExist = function(val) {
        var id = $(this).attr('id');
        var tagslist = $(this).val().split(delimiter[id]);
        return (jQuery.inArray(val, tagslist) >= 0); //true when tag exists, false when not
    };
    // clear all existing tags and import new ones from a string
    $.fn.importTags = function(str) {
        id = $(this).attr('id');
        $('#'+id+'_tagsinput .tag').remove();
        $.fn.tagsInput.importTags(this,str);
    };
    $.fn.tagsInput = function(options) {
        var settings = jQuery.extend({
            interactive:true,
            defaultText:'add a tag',
            minChars:0,
            width:'300px',
            height:'100px',
            autocomplete: {selectFirst: false },
            'hide':true,
            'delimiter':',',
            'unique':true,
            removeWithBackspace:true,
            placeholderColor:'#666666',
            autosize: true,
            comfortZone: 20,
            inputPadding: 6*2
        },options);

        this.each(function() {
            if (settings.hide) {
                $(this).hide();
            }
            var id = $(this).attr('id');
            if (!id || delimiter[$(this).attr('id')]) {
                id = $(this).attr('id', 'tags' + new Date().getTime()).attr('id');
            }

            var data = jQuery.extend({
                pid:id,
                real_input: '#'+id,
                holder: '#'+id+'_tagsinput',
                input_wrapper: '#'+id+'_addTag',
                fake_input: '#'+id+'_tag'
            },settings);

            delimiter[id] = data.delimiter;

            if (settings.onAddTag || settings.onRemoveTag || settings.onChange) {
                tags_callbacks[id] = [];
                tags_callbacks[id].onAddTag = settings.onAddTag;
                tags_callbacks[id].onRemoveTag = settings.onRemoveTag;
                tags_callbacks[id].onChange = settings.onChange;
            }

            var markup = '<div id="'+id+'_tagsinput" class="tagsinput"><div id="'+id+'_addTag">';

            if (settings.interactive) {
                markup = markup + '<input id="'+id+'_tag" value="" data-default="'+settings.defaultText+'" />';
            }

            markup = markup + '</div><div class="tags_clear"></div></div>';

            $(markup).insertAfter(this);

            $(data.holder).css('width',settings.width);
            $(data.holder).css('min-height',settings.height);
            $(data.holder).css('height','100%');

            if ($(data.real_input).val() !== '') {
                $.fn.tagsInput.importTags($(data.real_input),$(data.real_input).val());
            }
            if (settings.interactive) {
                $(data.fake_input).val($(data.fake_input).attr('data-default'));
                $(data.fake_input).css('color',settings.placeholderColor);
                $(data.fake_input).resetAutosize(settings);

                $(data.holder).bind('click',data,function(event) {
                    $(event.data.fake_input).focus();
                });

                $(data.fake_input).bind('focus',data,function(event) {
                    if ($(event.data.fake_input).val()==$(event.data.fake_input).attr('data-default')) {
                        $(event.data.fake_input).val('');
                    }
                    $(event.data.fake_input).css('color','#000000');
                });

                if (settings.autocomplete_url !== undefined) {
                    autocomplete_options = {source: settings.autocomplete_url};
                    for (var attrname in settings.autocomplete) {
                        autocomplete_options[attrname] = settings.autocomplete[attrname];
                    }

                    if (jQuery.Autocompleter !== undefined) {
                        $(data.fake_input).autocomplete(settings.autocomplete_url, settings.autocomplete);
                        $(data.fake_input).bind('result',data,function(event,data,formatted) {
                            if (data) {
                                $('#'+id).addTag(data[0] + "",{focus:true,unique:(settings.unique)});
                            }
                        });
                    } else if (jQuery.ui.autocomplete !== undefined) {
                        $(data.fake_input).autocomplete(autocomplete_options);
                        $(data.fake_input).bind('autocompleteselect',data,function(event,ui) {
                            $(event.data.real_input).addTag(ui.item.value,{focus:true,unique:(settings.unique)});
                            return false;
                        });
                    }


                } else {
                    // if a user tabs out of the field, create a new tag
                    // this is only available if autocomplete is not used.
                    $(data.fake_input).bind('blur',data,function(event) {
                        var d = $(this).attr('data-default');
                        if ($(event.data.fake_input).val() !== '' && $(event.data.fake_input).val()!=d) {
                            if( (event.data.minChars <= $(event.data.fake_input).val().length) && (!event.data.maxChars || (event.data.maxChars >= $(event.data.fake_input).val().length)) )
                        $(event.data.real_input).addTag($(event.data.fake_input).val(),{focus:true,unique:(settings.unique)});
                        } else {
                            $(event.data.fake_input).val($(event.data.fake_input).attr('data-default'));
                            $(event.data.fake_input).css('color',settings.placeholderColor);
                        }
                        return false;
                    });

                }
                // if user types a comma, create a new tag
                $(data.fake_input).bind('keypress',data,function(event) {
                    if (event.which==event.data.delimiter.charCodeAt(0) || event.which==13 ) {
                        event.preventDefault();
                        if( (event.data.minChars <= $(event.data.fake_input).val().length) && (!event.data.maxChars || (event.data.maxChars >= $(event.data.fake_input).val().length)) )
                    $(event.data.real_input).addTag($(event.data.fake_input).val(),{focus:true,unique:(settings.unique)});
                $(event.data.fake_input).resetAutosize(settings);
                return false;
                    } else if (event.data.autosize) {
                        $(event.data.fake_input).doAutosize(settings);

                    }
                });
                //Delete last tag on backspace
                $(data.fake_input).bind('keydown', function(event) {
                    if(event.keyCode == 8 && $(this).val() === '') {
                        event.preventDefault();
                        var last_tag = $(this).closest('.tagsinput').find('.tag:last').text();
                        var id = $(this).attr('id').replace(/_tag$/, '');
                        last_tag = last_tag.replace(/[\s]+x$/, '');
                        $('#' + id).removeTag(escape(last_tag));
                        $(this).trigger('focus');
                    }
                });
                $(data.fake_input).blur();

                //Removes the not_valid class when user changes the value of the fake input
                if(data.unique) {
                    $(data.fake_input).keydown(function(event){
                        if(event.keyCode == 8 || String.fromCharCode(event.which).match(/\w+|[áéíóúÁÉÍÓÚñÑ,/]+/)) {
                            $(this).removeClass('not_valid');
                        }
                    });
                }
            } // if settings.interactive
        });

        return this;

    };

    $.fn.tagsInput.updateTagsField = function(obj,tagslist) {
        var id = $(obj).attr('id');
        $(obj).val(tagslist.join(delimiter[id]));
    };

    $.fn.tagsInput.importTags = function(obj,val) {
        $(obj).val('');
        var id = $(obj).attr('id');
        var tags = val.split(delimiter[id]);
        for (i=0; i<tags.length; i++) {
            $(obj).addTag(tags[i],{focus:false,callback:false});
        }
        if(tags_callbacks[id] && tags_callbacks[id].onChange)
        {
            var f = tags_callbacks[id].onChange;
            f.call(obj, obj, tags[i]);
        }
    };

})(jQuery);

$(document).ready(function() {

    /***************************
     *
     * Controller part of our ghetto MVC....
     *
     ***************************/

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
                if (slideShow) toggleSlideShow();
                $('body').css('overflow', 'auto');
                $('#modal-window').hide();
            } else if (e.keyCode === 83) {
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

    //TODO this should fetch and then start the slideshoe
    $('#slide-show-button').click(function(e) {
        e.preventDefault();
        hideForm();
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
        toggleMessage('Loading images...');
        window.setTimeout(function() {
            ss.getRedditInfo();
        }, 200);
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
        $('.header').hide();
        $('.reddit-form').slideDown('fast');
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
    $('#subreddit').tagsInput({
       'height':'100px',
       'width':'500px',
       'interactive':true,
       'defaultText':'...',
       'removeWithBackspace' : true,
       'placeholderColor' : '#666666',
       'delimiter': ' ',
       'onChange' : function (){
            ss.subreddits = $('#subreddit').val().split(/\s/);
       }
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
        var duration = ss.slideDuration * 1000;
        $('#slideshow-state').html('&#9632;');
        ss.slideShowActive = true;
        $('#timer-bar').animate({'width': '100%'}, (duration - 50), 'linear');
        slideShow = setInterval(nextModalImage, duration);
    }

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
        clearInterval(slideShow);
        $('#slideshow-state').html('&#9654;');
        $('#timer-bar').stop();
        $('#timer-bar').width(0);
        ss.slideShowActive = false;
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
        if (ss.slideShowActive) {
            $('#timer-bar').width('0');
            $('#timer-bar').animate({'width': '100%'}, (ss.slideDuration * 1000) - 50, 'linear');
        }
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
        var img = new Image();
        showLoader(mod);
        $(img).load(function() {
            setupImage(mod, img, i);
            if (transition) {
                $(ss.activeImgEl).fadeToggle('slow');
                $(ss.nextImgEl).fadeToggle('slow');
            }
        });
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
        $('#modal-link').attr('href', data.permalink);
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
     * TODO: Allow to optionally call this on one Node or an array of Nodes.
     * TODO: Allow use of a custom (and optional) loader class name
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
        var descLen = 80;
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
    if (this.timeFrame !== 'none') {
        return "http://www.reddit.com/r/" +
               this.getSubreddits() +
               "/top/.json?sort=top&t=" +
               this.timeFrame;
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
        console.log("failure");
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
        that.setNextPage(e.data.after);
        console.log(that.nextPage);
        if (that.images.length < that.linksToGrab) {
            that.getRedditInfo();
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
            $.ajax({url: apiUrl, async: false}).done(function(data) {
                link.data.url = data.album.images[0].links.original;
                link.data.thumbnail = data.album.images[0].links.small_square;
                link.data.album = data.album;
                link.data.album.title = link.data.title;
                out_links.push(link);
            }).fail(function(data) {});
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

function getImgurAlbum(args) {
    var apiUrl = "http://api.imgur.com/2/album/" + encodeURIComponent(ar[1]) + ".json";
    $.ajax({url: apiUrl}).done(function(data) {
        //console.dir(data);
    });
}
