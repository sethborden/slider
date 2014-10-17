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
