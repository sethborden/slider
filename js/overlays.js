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
    var $container = $("<div>", {class: "col-md-2 col-xs-6"});
    var $div = $("<div>", {class: "image"});
    var $inf = $("<div>", {class: "overlay", i: index}); //TODO figure out where we're using this and destroy...
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
    $container.append($div)
    ss.images[index].element = $div;
    return $container;
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
    $('.csspinner').each(function(e) {
        $(this).toggleClass('csspinner');
        $(this).toggleClass('ringed');
    });
}

/**
 * Utility function to place a loading icon in the middle of an element.
 * @param {Node} el The DOM element over which we'll display the loader.
 */
function showLoader(el, position) {
    el.toggleClass('csspinner');
    el.toggleClass('ringed');
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
        $('.header').fadeIn();
    }
}

/*
 * Add a pill to the title bar for each subreddit you've selected
 */
function createSubredditMenu() {
    var subreddits = ss.getSubreddits().split('+'), sub;
    var fragment = $(document.createDocumentFragment());
    var color;
    $('#sub-list').empty();
    subreddits.forEach(function(sub) {
        color = ss.getColor();
        setBorder(sub, color);
        fragment.append(genSubredditButton(sub, color));
    });
    $('#sub-list').append(fragment);
}

function setBorder(sub, color) {
    ss.images.filter(function(img) {
        return (img.data.subreddit.toLowerCase() === sub);
    })
    .forEach(function(img) {
        img.element.css('border', '3px solid ' + color);
    });
}

function genSubredditButton(sub, color) {
    var count = ss.images.filter(function(img) {
        return (img.data.subreddit.toLowerCase() === sub);
    }).length;
    return $('<span>', {class: 'sub-name', sub: sub})
           .text(sub + "  (" + count +")")
           .css('background', color)
           .click(function() {
               var that = this;
               clickSubreddit(sub, that);
           });
}

function clickSubreddit(sub, that) {
    var i = ss.activeSubreddits.indexOf(sub);
    if (i !== -1) {
       ss.activeSubreddits.splice(i, 1);
    } else {
       ss.activeSubreddits.push(sub);
    }
    $(that).toggleClass('strike-through');
    filterSubreddits(sub);
}

function filterSubreddits(sub) {
    ss.images.filter(function(img) {
        return (img.data.subreddit.toLowerCase() === sub);
    })
    .forEach(function(img) {
        img.element.toggle('scale');
    });
}

//So much spaghetti....

$(document).on('ajaxLoadingDone', function() {
    window.setTimeout(function() {
        createSubredditMenu();
        toggleMessage();
    }, 700);
});
