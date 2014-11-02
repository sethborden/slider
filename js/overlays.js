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
    }
}

function updateMessage(text) {
    var msgBox = $('#message-progress');
    var percent = (ss.images.length / ss.linksToGrab) * 100;
    msgBox.text(text)
          .attr('aria-valuenow', percent)
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
