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
        //TODO might be better to have the gAI function pass back the links and
        //then have something in this file add them into the view....
        ss.gatherAllImages();
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
                $(ss.activeImgEl).fadeToggle('fast');
                $(ss.nextImgEl).fadeToggle('fast');
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
