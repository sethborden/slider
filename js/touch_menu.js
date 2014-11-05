var el = $(document);
var vars = {};

el.on('touchstart', function(e) {
    vars.start = e.originalEvent.changedTouches[0];
});

el.on('touchmove', function(e) {
});

el.on('touchend', function(e) {
    vars.end = e.originalEvent.changedTouches[0];
    getTouchVector();
});

function getTouchVector() {
    var delX, delY, theta, quad;
    delX = vars.end.screenX - vars.start.screenX;
    delY = vars.end.screenY - vars.start.screenY;
    if (delX > 0 && delY > 0) {
        quad = 3;
    } else if (delY > 0 && delX < 0) {
        quad = 3;
    } else if (delY < 0 && delX < 0) {
        quad = 1;
    } else if (delY > 0 && delX < 0) {
        quad = 0;
    }
    theta = (Math.atan2(Math.abs(delY),Math.abs(delX)) + (quad * Math.PI / 2)) * 57.2957795;
    console.log("\u03b8:", theta + "\u00b0 distance:", Math.sqrt(delX * delX + delY * delY) + "pixels");
}
