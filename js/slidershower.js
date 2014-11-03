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
    this.getNsfw = $('#get-nsfw').is(":checked");
    this.unrollAlbums = $('#unroll-albums').is(":checked");
    this.slideDuration = $('#slide-duration').val();
    this.activeImgEl = $('#first-modal-image');
    this.nextImgEl = $('#second-modal-image');
    this.albumMode = false;
    this.pinOptions = false;
    this.pinImageTitles = false;
};

//TODO these should get the config elements passed into them
//
SliderShower.prototype.setOptions = function() {
    $('#subreddit').tagsinput('removeAll');
    this.subreddits.forEach(function(z) {
        $('#subreddit').tagsinput('add', z.trim());
    });
    $('#search-term').val(this.searchTerm);
    $('#time-frame').val(this.timeFrame);
    $('#history-depth').val(this.linksToGrab);
    $('#slide-duration').val(this.slideDuration);
    $('#fit-to-window').prop("checked", this.scaleUp);
    $('#get-nsfw').prop("checked", this.getNsfw);
    $('#unroll-albums').prop("checked", this.unrollAlbums);
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
        ua: this.unrollAlbums,
        gn: this.getNsfw
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
            that.getNsfw = c.gn;
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
    if (!ss.getNsfw) {
        links = links.filter(function(l) {
            return !l.data.over_18;
        });
    }
    console.log(links.length);
    links.forEach(function(link) {
        //This came from RES..credit where credit is due
        //TODO make this a lazy loader of sorts
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
