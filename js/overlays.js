//this would be so much easier with a fucking template system....
//TODO use mustache or handlebars to simplify this bit
function imageBoxFactory(link, index) {
    var data = link.data;
    console.log(data.thumbnail);
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
    var msgBox = $('#messages');
    if (msgBox.css('display') === 'none') {
        msgBox.text(text);
        msgBox.fadeIn();
    } else {
        msgBox.fadeOut();
    }
}

/**
 * Utility function to hide all loading icons in the DOM.
 */
function hideLoaders() {
    $('.loading').remove();
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

function hideForm() {
    $('#images').empty();
    if (!ss.pinOptions) {
        $('.reddit-form').slideUp('fast');
        $('.header-info').text($('#subreddit').val());
        $('.header').fadeIn();
    }
}

$(document).on('foo', function() {
    toggleMessage();
});
