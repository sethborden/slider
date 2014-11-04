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
    var i = ss.images[ss.activeImage].data;
    if (ss.slideShowActive) {
        $('#timer-bar').width('0');
    }
    if ((ss.unrollAlbums || ss.albumMode) && i.hasOwnProperty('album')) { //if we have an album
        i.j = typeof i.j === 'undefined' ? 0 : i.j; //j is album index
        if (i.j + 1 === i.album.images.length) {
            if (ss.albumMode) {
                ss.albumMode = false;
            }
            incrementModalImage();
        } else {
            i.j = i.j + 1;
        }
        //makes it seem like the album image is actually the image
        i.url = i.album.images[i.j].links.original;
        //Seths the image title
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
    var subName;
    if (Number(ss.activeImage) < ss.images.length - 1) {
        ss.activeImage = Number(ss.activeImage) + 1;
    } else {
        ss.activeImage = 0;
    }
    subName = ss.images[Number(ss.activeImage)].data.subreddit.toLowerCase();
    if (ss.activeSubreddits.indexOf(subName) < 0) {
        incrementModalImage();
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
    subName = ss.images[Number(ss.activeImage)].data.subreddit.toLowerCase();
    if (ss.activeSubreddits.indexOf(subName) < 0) {
        decrementModalImage();
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

