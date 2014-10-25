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
        console.log('showing subreddit search');
        $('.subreddit-search').show();
        $('.user-search').hide();
    });

    $('#user-radio-button').click(function() {
        console.log('showing user search');
        $('.subreddit-search').hide();
        $('.user-search').show();
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
        } else if (!$('input').is(":focus")){
            if (e.keyCode === 83) {
                $('.overlay:first').trigger('click');
                toggleSlideShow();
            }
        } else {
            console.log(e.keyCode);
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

    //TODO this shit needs to get fixed....
    //Oooooh that would work, have a title for each one of them instead of
    //detaching.
    $('.modal-image').mouseenter(function() {
        $('#modal-title').show();
    });

    $('.modal-image').mouseleave(function() {
        $('#modal-title').hide();
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
        hideForm();
        ss.reset(); //this is mostly doing ss.images = [];
        $('.page-title').slideUp('fast');
        toggleMessage('Loading images...');
        window.setTimeout(function() {
            ss.getRedditInfo();
        }, 300);
    });

    $('.reddit-form').mouseleave(function(e) {
        if (!ss.pinOptions) {
            if (ss.images.length > 0) {
                $('.reddit-form').slideUp('fast');
                $('.header').fadeIn();
            }
        }
    });

    $('#slideshow-state').click(function(e) {
        toggleSlideShow();
    });

    $('.header').click(function(e) {
        ss.headerTimeout = setTimeout(function(){
            $('.header').hide();
            $('.reddit-form').slideDown('fast');
        }, 100);
    });

    //$('.header').mouseenter(function(e) {
    //    ss.headerTimeout = setTimeout(function(){
    //        $('.header').hide();
    //        $('.reddit-form').slideDown('fast');
    //    }, 500);
    //});

    //$('.header').mouseleave(function(e) {
    //    if (ss.headerTimeout) {
    //        clearTimeout(ss.headerTimeout);
    //    }
    //});

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
        confirmKeys: [34, 13, 44],
        tagClass: 'big'
    });

    $('input').on('itemAdded', function (){
        ss.subreddits = $('#subreddit').val().split(',');
    });

    $('input').on('itemRemoved', function (){
        ss.subreddits = $('#subreddit').val().split(',');
    });
});
