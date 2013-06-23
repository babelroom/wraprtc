/* JR 5/2013 - parts of code borrowed heavily from other projects - see README */
(function(window) {
    var supported = null
        , getUserMedia = null
        , _stopUserMedia = null     /* our non-standard addition */
        , attachMediaStream = null
        // Set up audio and video regardless of what devices are present.
        , sdpConstraints = {'mandatory': {
                          'OfferToReceiveAudio':true, 
                          'OfferToReceiveVideo':true }}
        ;

    /* --- */
    function init() {
        if (navigator.mozGetUserMedia) {
            supported = "firefox";
            RTCPeerConnection = function(){return mozRTCPeerConnection();}
            RTCSessionDescription = mozRTCSessionDescription;
            RTCIceCandidate = mozRTCIceCandidate;
            getUserMedia = navigator.mozGetUserMedia.bind(navigator);
            _stopUserMedia = function(element, stream) {
                element.pause();
                element.mozSrcObject = null;
                };
            attachMediaStream = function(element, stream) {
//                console.log("Attaching media stream");
                element.mozSrcObject = stream;
                element.play();
                };
/*            reattachMediaStream = function(to, from) {
//                console.log("Reattaching media stream");
                to.mozSrcObject = from.mozSrcObject;
                to.play();
                }; */
            MediaStream.prototype.getVideoTracks = function() { return []; }
            MediaStream.prototype.getAudioTracks = function() { return []; }
            }
        else if (navigator.webkitGetUserMedia) {
            supported = "chrome";
            getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
            _stopUserMedia = function(element, stream) {
                element.pause();
                element.src = "";
                if (typeof(stream.stop)!=='undefined')
                    stream.stop();  /* this works for chrome Mac/25.0.1364.160 */
                };
            RTCPeerConnection = webkitRTCPeerConnection;
            attachMediaStream = function(element, stream) {
                element.src = webkitURL.createObjectURL(stream);
                };
/*            reattachMediaStream = function(to, from) {
                to.src = from.src;
                }; */

            // The representation of tracks in a stream is changed in M26.
            // Unify them for earlier Chrome versions in the coexisting period.
            if (!webkitMediaStream.prototype.getVideoTracks) {
                webkitMediaStream.prototype.getVideoTracks = function() {
                    return this.videoTracks;
                    };
                webkitMediaStream.prototype.getAudioTracks = function() {
                    return this.audioTracks;
                    };
                }

/*
            // New syntax of getXXXStreams method in M26.
            if (!webkitRTCPeerConnection.prototype.getLocalStreams) {
                webkitRTCPeerConnection.prototype.getLocalStreams = function() {
                    return this.localStreams;
                    };
                webkitRTCPeerConnection.prototype.getRemoteStreams = function() {
                    return this.remoteStreams;
                    };
                }
*/
/* -- not looking into opera further for the present, seems to be a lack of documentation and/or features
        else if (navigator.getUserMedia) {
            supported = "opera??";
            getUserMedia = navigator.getUserMedia.bind(navigator);
/*Opera 12: http://stackoverflow.com/questions/11642926/stop-close-webcam-which-is-opened-by-navigator-getusermedia
                element.pause();
                element.src = null; *./
            }
*/
    }

    function createPeerConnection(opts) {
        /*  https://groups.google.com/forum/#!topic/discuss-webrtc/b-5alYpbxXw
            http://code.google.com/p/natvpn/source/browse/trunk/stun_server_list */
        var pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
        var pc_constraints = {"optional": [{"DtlsSrtpKeyAgreement": true}]};
        var pc = null;
        // Force the use of a number IP STUN server for Firefox.
/*
        if (supported === "firefox") {
console.log('foo');
            pc_config = {"iceServers":[{"url":"stun:173.194.79.127"/* IP of stun.l.google.com, orig=stun:23.21.150.121*./}]};
            };
*/
        try {
            pc = new RTCPeerConnection(pc_config, pc_constraints);
            opts.setPC && opts.setPC(pc);
//console.log(pc);
//var fne = function(event){/*console.log(event);*/ return true;}
var fne = function(event,marker){console.log(marker,event); return true;}
pc.onsignalingstatechange = function(e){fne(e,7);}
pc.onstatechange = function(e){fne(e,8);}
pc.onopen = function(e){fne(e,9);}
//pc.onicechange = fne;
/*
*/
pc.oniceconnectionstatechange = function(event){
fne(event,22);
//    console.log(['ICESC',event.type, pc.iceState, pc.iceConnectionState, pc.iceGatheringState]);
                if (pc.iceConnectionState==='connected' && opts.connected) opts.connected(event);
                if (pc.iceConnectionState==='disconnected' && opts.connected) opts.disconnected(event);
    return true;
}
pc.ondatachannel = fne;
pc.onidentityresult = fne;
pc.onnegotiationneeded = fne;
            pc.onicecandidate = function(event) {
fne(event,33);
                //if (!event.candidate) { return/* console.log("End of candidates.") */; }
//    console.log(['ICE',event.type, pc.iceState, pc.iceConnectionState, pc.iceGatheringState,event]);
//                if (!event.candidate) { console.log('FFOO'); return opts.signalOut && opts.signalOut({type: 'end_of_candidates'}); }
                if (!event.candidate) { return opts.signalOut && opts.signalOut(undefined); }
                opts.signalOut && opts.signalOut({type: 'candidate',
                   label: event.candidate.sdpMLineIndex,
                   id: event.candidate.sdpMid,
                   candidate: event.candidate.candidate});
/*
*/
                }
//            console.log("Created RTCPeerConnnection with:\n" + 
//                  "  config: \"" + JSON.stringify(pc_config) + "\";\n" + 
//                  "  constraints: \"" + JSON.stringify(pc_constraints) + "\".");
            } catch (e) {
//                console.log("Failed to create PeerConnection, exception: " + e.message);
//                alert("Cannot create RTCPeerConnection object; WebRTC is not supported by this browser.");
                opts.onSupportFailure && opts.onSupportFailure(e.message);
                return;
            }
if (opts.element) { // should this be defined?
        pc.onaddstream = /*onRemoteStreamAdded*/ function(event) {
//                console.log("Remote stream added."); 
//                reattachMediaStream(miniVideo, localVideo);
            attachMediaStream(opts.element, event.stream);
            opts.setStream && opts.setStream(event.stream);
//                waitForRemoteVideo(event.stream); -- this means remote peer has video -- what to do?
            };
}
        pc.onremovestream = function(event) { fne(event);/* console.log("onRemoteStreamRemoved;"); example also doesn't do anything here ... */
            };
        return pc;
    }

/*
    function maybeStart(how, stream) {
        setStatus("Connecting...");
//        console.log("Creating PeerConnection.");
        var pc = createPeerConnection(how);
//        console.log("Adding local stream.");
        pc.addStream(stream);
//      started = true;
      // Caller initiates offer to peer.
        if (how.broadcast)
            doCall(how, pc);
        how.setPC && how.setPC(pc);
    }
*/

    function setStatus(state) {
//        __elem__.innerHTML = state; -- reference
    }

    function ______old___doCall(how, pc) {
        var constraints = {"optional": [], "mandatory": {"MozDontOfferDataChannel": true}};
        // temporary measure to remove Moz* constraints in Chrome
        if (supported === "chrome") {
            for (prop in constraints.mandatory) {
                if (prop.indexOf("Moz") != -1) {
                    delete constraints.mandatory[prop];
                    }
                }
            }   
        constraints = mergeConstraints(constraints, sdpConstraints);
/*        console.log("Sending offer to peer, with constraints: \n" +
            "  \"" + JSON.stringify(constraints) + "\".") */
        pc.createOffer(function(sdp){setLocalAndSendMessage(how, pc, sdp);}, null, constraints);
    }

    function mergeConstraints(cons1, cons2) {
        var merged = cons1;
        for (var name in cons2.mandatory) {
            merged.mandatory[name] = cons2.mandatory[name];
            }
        merged.optional.concat(cons2.optional);
        return merged;
    }

    function setLocalAndSendMessage(how, pc, sessionDescription) {
        // Set Opus as the preferred codec in SDP if Opus is present.
        sessionDescription.sdp = preferOpus(sessionDescription.sdp);
        pc.setLocalDescription(sessionDescription);
        how.signalOut && how.signalOut(sessionDescription);
    }

    /* --- */
    function openWebcam(opts) {
        try {
            getUserMedia(
                {"audio": true, "video": {"mandatory": {}, "optional": []}},
                function(stream) /* success */ {
                    opts.element && attachMediaStream(opts.element, stream);
//        setStatus("Connecting...");
                    /*var pc = createPeerConnection(opts);
                    pc.addStream(stream);*/
//      started = true;
      // Caller initiates offer to peer.
//        if (how.broadcast)
//            doCall(how, pc);
//                    opts.setPC && opts.setPC(pc);
//opts.element.style.opacity = 1;
//console.log(stream);
                    opts.setStream && opts.setStream(stream);
                    },
                function(error) /* failure */ {
                    /* called with error.code==1 if user denies permission (on chrome ) */
                    opts.onError && opts.onError(error.code);
                    });
            }
        catch (e) {
            opts.onSupportFailure && opts.onSupportFailure(e.message);
            }
    }

    /* --- */
    function old_start(how) {
        var constraints = {"audio": true, "video": {"mandatory": {}, "optional": []}}; 
        function onSuccess(stream) {

//    console.log("User has granted access to local media.");
    // Call the polyfill wrapper to attach the media stream to this element.
            attachMediaStream(how.element, stream);
//    element.style.opacity = 1;
//    localStream = stream;
    // Caller creates PeerConnection.
            if (how.broadcast)
                maybeStart(how, stream);
            }
        try {
//alert("Failed to get access to local media. Error code was " + error.code + ".") --- reference use of error.code
            getUserMedia(constraints, onSuccess, function(error) { how.onError && how.onError(error.code); });
//            console.log("Requested access to local media with mediaConstraints:\n" + "  \"" + JSON.stringify(constraints) + "\"");
        } catch (e) {
//            alert("getUserMedia() failed. Is this a WebRTC capable browser?");
//            console.log("getUserMedia failed with exception: " + e.message);
            how.onSupportFailure && how.onSupportFailure(e.message);
        }
    }

    function callPeer(stream, opts) {
//        setStatus("Connecting...");
        var pc = createPeerConnection(opts);
        pc.addStream(stream);
        //doCall(opts, pc);
        var constraints = {"optional": [], "mandatory": {"MozDontOfferDataChannel": true}};
        // temporary measure to remove Moz* constraints in Chrome
        if (supported === "chrome") {
            for (prop in constraints.mandatory) {
                if (prop.indexOf("Moz") != -1) {
                    delete constraints.mandatory[prop];
                    }
                }
            }
        constraints = mergeConstraints(constraints, sdpConstraints);
/*        console.log("Sending offer to peer, with constraints: \n" +
            "  \"" + JSON.stringify(constraints) + "\".") */
        pc.createOffer(function(sdp){setLocalAndSendMessage(opts, pc, sdp);}, opts.onError, constraints);
    }

    function answer(msg, opts) {
        var pc = createPeerConnection(opts);
        var rtcsd = new RTCSessionDescription(msg);
        pc.setRemoteDescription(rtcsd);
        pc.createAnswer(function(sdp){setLocalAndSendMessage(opts, pc, sdp);}, opts.onError, sdpConstraints);
    }

    function setRemoteDescription(pc, msg) {
        pc.setRemoteDescription(new RTCSessionDescription(msg));
    }

    function candidate(pc, msg) {
        var candy = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate: msg.candidate});
        pc.addIceCandidate(candy);
    }

    function stop(element, stream) { _stopUserMedia(element, stream); }
    function stopConnection(pc) {
        try {
            pc.close(); /* this is throwing DOM exception 11 on chrome */
            }
        catch(e) {
            console.log && console.log('Exception in RTCPeerConnection.close()', pc, e);
            }
        pc = null;
    }

    function mediaChannelAction(stream, action) {
        var tracks, endis;
        switch(action) {
            case 'mute': tracks=stream.getAudioTracks(); endis = false; break;
            case 'unmute': tracks=stream.getAudioTracks(); endis = true; break;
            case 'video_off': tracks=stream.getVideoTracks(); endis = false; break;
            case 'video_on': tracks=stream.getVideoTracks(); endis = true; break;
            default:
                return false;
            }
        for(var i=0; i<tracks.length; i++) {
            tracks[i].enabled = endis;
            }
        return true;
    }

    /* === SDP manipulation utils === */
    // Set Opus as the default audio codec if it's present.
    function preferOpus(sdp) {
        var sdpLines = sdp.split('\r\n');
        // Search for m line.
        for (var i = 0; i < sdpLines.length; i++) {
                if (sdpLines[i].search('m=audio') !== -1) {
                    var mLineIndex = i;
                    break;
                } 
        }
        if (mLineIndex === null)
            return sdp;
        // If Opus is available, set it as the default in m line.
        for (var i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search('opus/48000') !== -1) {                
                var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
                if (opusPayload)
                    sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
                break;
            }
        }
        // Remove CN in m line and sdp.
        sdpLines = removeCN(sdpLines, mLineIndex);
        sdp = sdpLines.join('\r\n');
        return sdp;
    }

    // Set Opus in stereo if stereo is enabled.
    function addStereoToSDP(msg) {
        if (!msg.sdp)
            return;
        var sdpLines = msg.sdp.split('\r\n');

        // Find opus payload.
        for (var i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search('opus/48000') !== -1) {
                var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
                break;
                }
            }

        // Find the payload in fmtp line.
        for (var i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search('a=fmtp') !== -1) {
                var payload = extractSdp(sdpLines[i], /a=fmtp:(\d+)/ );
                if (payload === opusPayload) {
                    var fmtpLineIndex = i;
                    break;
                    }
                }
            }
        // No fmtp line found.
        if (fmtpLineIndex === null)
            return ;

        // Append stereo=1 to fmtp line.
        sdpLines[fmtpLineIndex] = sdpLines[fmtpLineIndex].concat(' stereo=1');

        msg.sdp = sdpLines.join('\r\n');
    }

    function extractSdp(sdpLine, pattern) {
        var result = sdpLine.match(pattern);
        return (result && result.length == 2)? result[1]: null;
    }

    // Set the selected codec to the first in m line.
    function setDefaultCodec(mLine, payload) {
        var elements = mLine.split(' ');
        var newLine = new Array();
        var index = 0;
        for (var i = 0; i < elements.length; i++) {
            if (index === 3) // Format of media starts from the fourth.
                newLine[index++] = payload; // Put target payload to the first.
            if (elements[i] !== payload)
                newLine[index++] = elements[i];
        }
        return newLine.join(' ');
    }

    // Strip CN from sdp before CN constraints is ready.
    function removeCN(sdpLines, mLineIndex) {
        var mLineElements = sdpLines[mLineIndex].split(' ');
        // Scan from end for the convenience of removing an item.
        for (var i = sdpLines.length-1; i >= 0; i--) {
            var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
            if (payload) {
                var cnPos = mLineElements.indexOf(payload);
                if (cnPos !== -1) {
                    // Remove CN payload from m line.
                    mLineElements.splice(cnPos, 1);
                }
                // Remove CN line in sdp
                sdpLines.splice(i, 1);
            }
        }

        sdpLines[mLineIndex] = mLineElements.join(' ');
        return sdpLines;
    }
    /* === */

    /* --- */
    init();
    window.wrapRTC = {
        supported: supported,
        openWebcam: openWebcam,
        stop: stop,
        stopConnection: stopConnection,
        callPeer: callPeer,
        answer: answer,
        setRemoteDescription: setRemoteDescription,
        candidate: candidate,
        mediaChannelAction: mediaChannelAction,
        addStereoToSDP: addStereoToSDP
        }
})(window);
