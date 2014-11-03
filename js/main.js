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
    $('#fit-to-window').change(function(){
        ss.scaleUp = $(this).is(":checked");
    });

    $('#unroll-albums').change(function(){
        ss.unrollAlbums = $(this).is(":checked");
    });

    $('#get-nsfw').change(function(){
        ss.getNsfw = $(this).is(":checked");
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
        $('#user').val('');
        ss.user = undefined;
        $('.user-search').hide();
        $('.subreddit-search').show();
        ss.setCookie();
        ss.genBaseUrl();
    });

    $('#user-radio-button').click(function() {
        $('#subreddit').tagsinput('removeAll');
        $('#search-term').val('');
        $('.subreddit-search').hide();
        $('.user-search').show();
        ss.setCookie();
        ss.genBaseUrl();
    });

    /*************************
     *
     *  Click handlers and other UI control features
     *
     *************************/

    $('#next, .go-next').click(function() {
        endSlideShow();
        nextModalImage();
    });

    $('#prev, .go-prev').click(function() {
        endSlideShow();
        prevModalImage();
    });

    $('#modal-window').mousemove(function(e) {
        clearTimeout(window.a);
        $('.decoration').fadeIn();
        window.a = setTimeout(function() {
            $('.decoration').fadeOut();
        }, 2000);
    });

    //Control swiping here
    //TODO add support to enter/exit albums with up/down swipes
    var touchControls = {
        minDist: 100,
        maxTime: 1000
    };

    $('#modal-window').on('touchstart', function(e) {
        touchControls.xstart = e.originalEvent.touches[0].clientX;
        touchControls.timestart = e.timeStamp;
    });

    $('#modal-window').on('touchmove', function(e) {
        e.preventDefault();
    });

    $('#modal-window').on('touchend', function(e) {
        touchControls.xend = e.originalEvent.changedTouches[0].clientX;
        touchControls.timeend = e.timeStamp;
        deltaX = touchControls.xend - touchControls.xstart;
        deltaT = touchControls.timeend - touchControls.timestart;
        if (deltaX < (-1 * touchControls.minDist) && deltaT < touchControls.maxTime) {
            endSlideShow();
            prevModalImage();
        } else if (deltaX > touchControls.minDist && deltaT < touchControls.maxTime) {
            endSlideShow();
            nextModalImage();
        }
    });

    $('#next, #prev').mouseenter(function(e) {
        clearTimeout(window.a);
        $('.decoration').fadeIn();
    });

    $(document).keydown(function(e) {

        if ($('#modal-window').css('display') !== 'none') {
            if (e.keyCode === 39 || e.keyCode === 78) { //next slide
                endSlideShow();
                nextModalImage();
            } else if (e.keyCode === 37 || e.keyCode === 80) { //prev slide
                endSlideShow();
                prevModalImage();
            } else if (e.keyCode === 38 && !ss.albumMode) { //key up
                enterAlbumMode();
            } else if (e.keyCode === 40 && ss.albumMode) { //key down
                exitAlbumMode();
            } else if (e.keyCode === 27) { //Esc
                endSlideShow();
                $('body').css('overflow', 'auto');
                $('#modal-window').hide();
            } else if (e.keyCode === 83) { //s
                toggleSlideShow();
            } else if (e.keyCode === 32 && !($('input').is(':focus'))) { //space
                toggleSlideShow();
            }
        } else if (!$('input').is(":focus")){
            if (e.keyCode === 83) { //s
                $('.overlay:first').trigger('click');
                toggleSlideShow();
            }
        } else {
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

    $('#help-clicker').click(function() {
        $('.help-window').modal('show');
    });

    //TODO this shit needs to get fixed....
    //Oooooh that would work, have a title for each one of them instead of
    //detaching.
    $('.modal-image').mouseenter(function() {
        $('#modal-title').show();
    });

    $('.modal-image').mouseleave(function() {
        if (!ss.pinImageTitles) {
            $('#modal-title').hide();
        }
    });

    //TODO make this work...
    $('#slide-show-button').click(function(e) {
        e.preventDefault();
        hideForm();
        ss.reset();
    });

    $('#fetchButton').click(function(e) {
        e.preventDefault();
        $('.header-container').hide();
        hideForm();
        ss.setCookie(); //save your search options
        ss.reset(); //this is mostly doing ss.images = [];
        toggleMessage();
        window.setTimeout(function() {
            ss.getRedditInfo();
        }, 300);
    });

    $('#image-title-pin').click(function() {
        $(this).toggleClass('glyphicon-pushpin');
        $(this).toggleClass('glyphicon-record');
        ss.pinImageTitles = !ss.pinImageTitles;
    });

    $('#hide-clicker').click(function() {
        if (ss.images.length > 0) {
            $('.reddit-form').slideUp('fast');
            $('.header').fadeIn();
        }
    });

    $('#slideshow-state, .go-play').click(function(e) {
        toggleSlideShow();
    });

    $('#show-options').click(function(e) {
        ss.headerTimeout = setTimeout(function(){
            $('.header').hide();
            $('.reddit-form').slideDown('fast');
        }, 100);
    });

    //This seems inelegant..fuck it;
    vcenter($('#message-box'));
    vcenter($('#prev'));
    vcenter($('#next'));
    vcenter($('#prev div'), true);
    vcenter($('#next div'), true);

    $(window).on('resize', function(e) {
        vcenter($('#message-box'));
        vcenter($('#prev'));
        vcenter($('#next'));
        vcenter($('#prev div'), true);
        vcenter($('#next div'), true);
    });

    //Sets up the tag input area using the tag plugin
    $('#subreddit').tagsinput({
        confirmKeys: [34, 13, 44],
        tagClass: 'big'
    });

    if (ss.getSubreddits() === '') {
        $('#search-term').prop('disabled', true);
    }

    $('input').on('itemAdded', function (){
        ss.subreddits = $('#subreddit').val().split(',');
        if (ss.getSubreddits !== '') {
            $('#search-term').prop('disabled', false);
        }
    });

    $('input').on('itemRemoved', function (){
        ss.subreddits = $('#subreddit').val().split(',');
        if (ss.getSubreddits() === '') {
            $('#search-term').prop('disabled', true);
        }
    });

    //Tries to retrieve the options cookie and sets the options up.
    ss.getCookie();
    ss.setOptions();
});
