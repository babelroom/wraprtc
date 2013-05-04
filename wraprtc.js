(function(window) {
    var obj = { supported: null };

    /* --- */
    function init() {
        if (navigator.mozGetUserMedia) {
            obj.supported = "firefox";
            obj.getuserMedia = navigator.mozGetUserMedia.bind(navigator);
            }
        if (navigator.webkitGetUserMedia) {
            obj.supported = "chrome";
            obj.getuserMedia = navigator.webkitGetUserMedia.bind(navigator);
            }
    }

    /* --- */
    init();
    window.wrapRTC = obj;

})(window);
