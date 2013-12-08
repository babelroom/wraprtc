wraprtc
=======

Provide a single, simplified js interface to webRTC features. Aims to be browser, version and user flag resilient.

This WebRTC wrapper is designed for environments where >2 peers are in play, so the following considerations apply:

1. Peer connections (RTCPeerConnection) are essentially unidirectional from an active (broadcaster) to a passive (viewer) peer. No media
streams are added to the reverse (passive to active) direction. 

2. For broadcasters a single media stream is opened and then multiple peer connections are established and closed as viewers attach
and detach.

