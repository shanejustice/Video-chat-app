let Peer = require('simple-peer')
let socket = io()
const video = document.querySelector('video')
let client = {}

//get video stream
navigator.mediaDevices.getUserMedia({video: true, audio: true})
.then(stream => {

	//notify backend that permission has been granted
	socket.emit('NewClient')

	//user can see himself
	video.srcObject = stream
	video.play()

	//Define new peer and return it OR used to initialize a peer
	//type = peer init should be true or false
	//true: we will send the offer itself
	//false: wait for the offer and then answer
	function InitPeer(type){
		let peer = new Peer({initiator:(type == 'init')? true:false, stream:stream, trickle:false})
		//when we get stream from other user we create a video
		peer.on('stream', function(stream){
			CreateVideo(stream)
		})
		//if our peer is closed, destroy the video
		peer.on('close', function(stream){
			document.getElementById('peerVideo').remove();
			peer.destroy()
		})
		return peer


	}
	//for peer of type init OR this function will be called when we want a peer which will send a offer  
	function MakePeer(){
		//we sent offer and wait for the answer till then got answer is false
		client.gotAnswer = false
		let peer = InitPeer('init')
		//Since peer is of the type init it will automatically run signal function and send the offer
		peer.on('signal', function(data){
			if(!client.gotAnswer){
				socket.emit('Offer', data)
			}

		})
		client.peer = peer

	}
	//for peer of type not init
	//when we get an offer from another client and we want to send him the answer
	function FrontAnswer(offer){
		//here peer won't be of the type init
		let peer = InitPeer('notInit')
		//Here signal won't run automatically, we have to call it
		//We got a signal, so we got a offer
		peer.on('signal', (data) => {
			socket.emit('Answer', data)
		})
		//calling itself
		//pass offer to the signal, it will generate an answer, answer goes to the back-end so it can go the other user
		peer.signal(offer)

	}
	//this fn handle when answer comes from the back-end
	function SignalAnswer(answer){
		client.gotAnswer = true
		let peer = client.peer
		// we got a peer, we send an answer for that peer
		peer.signal(answer)
	}

	function CreateVideo(stream){
		let video = document.createElement('video')
		video.id = 'peerVideo'
		video.srcObject = stream
		video.class = 'embed-responsive-item'
		document.querySelector("#peerDiv").appendChild(video)
		video.play()
	}
	//already two people chatting, third party notified about the existing chat going on
	function SessionActive(){
		document.write('Session Active. Please come back later')

	}

	socket.on('BackOffer', FrontAnswer)
	socket.on('BackAnswer', SignalAnswer)
	socket.on('SessionActive', SessionActive)
	socket.on('CreatePeer', MakePeer)





})
.catch(err => document.write(err))