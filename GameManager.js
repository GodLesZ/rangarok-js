function Ragnarok( document ) {
	
	if(!(this instanceof Ragnarok)) {
		return new Ragnarok;
	}
	
	this.scene = new MapLoader();
	this.gui = new InterfaceManager( document );
	this.network = new NetworkManager();
	
	this.input = new InputEventHandler( document );
	
	window.network = this.network;
	window.map = this.scene;
	
	Ragnarok.Instance = this;
	
	//window.network.this.sendPacketStructure({
	//	PacketType: 0x67,
	//	name: ('newchar1').toUint8Array(),
	//	Str: 5,
	//	Agi: 5,
	//	Vit: 5,
	//	Int: 5,
	//	Dex: 5,
	//	Luk: 5,
	//	CharNum: 4,
	//	headPal: 0,
	//	head: 10000
	//});
	
};

Ragnarok.Instance = null;

Ragnarok.prototype.onEvent = function( fn ) {
	return (function( game, fn ) {
		return function( event ) {
			fn.call( game, event );
		};
	})( this, fn );
};

Ragnarok.prototype.init = function() {
	
	console.log("Initializing game");
	
	this.gui.init();
	
	this.input.attachEventListener("mousemove", this.gui.mouseMoveEvent );
	this.input.attachEventListener("mouseup", this.gui.mouseUpEvent );
	this.input.attachEventListener("mousedown", this.gui.mouseDownEvent );
	
	/*
	this.chatWindow = this.gui.create( Interface.ChatWindow );
	
	this.chatWindow.onEvent = (function(str) {
		if(str)
			this.chatWindow.writeLine(str);
	}).bind(this);
	
	this.gui.add(this.chatWindow, InterfaceAlignment.Left, InterfaceAlignment.Bottom);
	*/
	
	this.onStateLoginReady();
	
};

Ragnarok.prototype.playerRequestMove = function(gatPosition) {
	console.log("Requested move to", gatPosition);
	
	//if player not dead .. etc {
	
	//this.PCActor.findPath();
	
	this.network.requestMove(gatPosition.x, gatPosition.y, 0);
	// }
};

Ragnarok.prototype.CreateAttachment = function(obj, n, ttype) {
	// REMOVe THIS SHIT CODE!
	var q = Deferred();
	var sprFileObject = null;
	var actFileObject = null;
	
	var scene = this.scene.scene;
	
	q	.then(ResourceLoader.getSpr.bind(this, n + ".spr"))
		.then(function(data) {
			sprFileObject = new SprParser(data);
		});
		
	q	.then(ResourceLoader.getAct.bind(this, n + ".act"))
		.then(function(data) {
			actFileObject = new ActParser(data);
		});
		
	q	.finally(function() {
			
		obj.SetAttachment(ttype, sprFileObject, actFileObject);
		
		obj.addAttachmentToScene(scene, ttype);
		
	});

}

// Called when map name is received from zone server
Ragnarok.prototype.onStateLoadMap = function() {
	
	console.log('Map accepted us, now we need to load the map');
	console.log(this.network.session.mapName.toString());
	
	this.PCActor = new SpriteActor(this.scene);
	this.PCActor.MovementSpeed = this.network.session.pc.charInfo.speed;
	
	this.network.attachEventListener("OnPlayerChat", this.onEvent(function(msg) {
		this.chatWindow.writeLine(msg);
	}));
	
	this.scene.loadMap(this.network.session.mapName.toString().replace(/gat$/, "rsw"))
		.then((function() {
			
			this.scene.start(); 
						
			var bodyRes = FileManager.getClassBodyResPath(this.network.session.pc.charInfo.job, this.network.session.pc.charInfo.Sex);
			var headRes = FileManager.getHeadResPath(this.network.session.pc.charInfo.head, this.network.session.pc.charInfo.Sex);
			
			Deferred()
				.then(this.CreateAttachment.bind(this, this.PCActor, bodyRes, SpriteActor.Attachment.BODY))
				.then(this.CreateAttachment.bind(this, this.PCActor, headRes, SpriteActor.Attachment.HEAD))
				.then((function() {
					
					this.PCActor.SetGatPosition(
						this.network.session.GetPCStatus(VarEnum.VAR_CURXPOS),
						this.network.session.GetPCStatus(VarEnum.VAR_CURYPOS)
					);
					
					this.PCActor.Direction = this.network.session.GetPCStatus(VarEnum.VAR_CURDIR);
					
					setInterval((function() {
						this.PCActor.Update(this.scene.camera);
					}).bind(this), 10);
					
					this.scene.bindCamera(this.PCActor);
					
					this.scene.attachEventListener("OnPCRequestMove", this.playerRequestMove.bind(this));
					
				}).bind(this));
			
		}).bind(this))
		.then((function() { 
			this.gui.clearBackground();
			this.network.reportMapLoaded(); 
		}).bind(this));
	
};

// Called when character is selected
Ragnarok.prototype.onStateCharacterSelected = function( charId ) {
	
	// Network send character select
	
	this.network.attachEventListener("OnZoneLoadWait", this.onEvent(function(response) {
		
		if( response.code == NetworkManager.MapLoadWait ) {
			
			this.onStateLoadMap();
			
		} else if( response.code == NetworkManager.MapEnterRefused ) {
			
			console.error('Error: zone authreq rejected');
			this.network.disconnect();
			this.init();
		}
		
	}));
	
	this.network.selectCharacter( charId );
	
}

// Called when client is ready to list characters
Ragnarok.prototype.onStateCharSelect = function() {

	//console.log('onStateCharSelect');
	console.log( this.network.session );
	
	//return;

	var charSelectWindow = this.gui.create( Interface.CharSelect );
	
	var accountData = this.network.session.charInfo;
	
	for( var i = 0; i < accountData.length && i < 3; i++ ) {
		
		charSelectWindow.addCharacter( accountData[i] );
		
	}
	
	charSelectWindow.onEvent = this.onEvent( function( event ) {
		
		// Select character
		if( event.action == Interface.Button.Select ) {
			
			// validation should be done first
			// simple for now...
			if( event.charId === null ) {
				return;
			}
			
			this.gui.remove( event.window );
			
			this.onStateCharacterSelected( event.charId );
			
		} else if( event.action == Interface.Button.Cancel ) {
			
			this.gui.remove( event.window );
			this.network.disconnect();
			this.init();
			
		}
		
	});
	
	this.gui.add(
		charSelectWindow,
		InterfaceAlignment.Center, 
		InterfaceAlignment.Center
	);

};

// Called when the user has requested access to a server
Ragnarok.prototype.onStateServiceSelected = function( serverId ) {

	this.network.attachEventListener("OnCharSelect", this.onEvent(function(response) {
		if( response.code == NetworkManager.CharacterList ) {
			this.onStateCharSelect();
		} else if( response.code == NetworkManager.ServerSelectDenied ) {
			// Login to server dened
			// TODO: display message and return to login (or server listing?)
			console.error('Error: Server access was denied');
			this.network.disconnect();
			this.init();
		}
	}));

	this.network.selectService( serverId );

}

// Called when client receives the server list
Ragnarok.prototype.onStateServiceSelectReady = function() {
	
	var serviceWindow = this.gui.create( Interface.ServiceWindow );
	
	var services = this.network.session.ServerList;
	
	for( var i = 0; i < services.length; i++ ) {
		
		var service = services[i]; /*
			ip, port, name, usercount, state, property
		*/
		
		// { name (usercount), id }
		serviceWindow.addService( service.name.toString() + ' (' + service.usercount.toString() + ')', i );
		
	}
	
	serviceWindow.onEvent = this.onEvent( function( event ) {
		
		if( event.action == Interface.Button.Select ) {
			
			this.gui.remove( event.window );
			
			this.onStateServiceSelected( event.serverId );
			
		} else if( event.action == Interface.Button.Cancel ) {
			
			this.gui.remove( event.window );
			
			// User has canceled login
			// Do network cancel and go back to login screen
			this.network.disconnect();
			this.init();
			
		}
		
	});
	
	this.gui.add(
		serviceWindow, 
		InterfaceAlignment.Center, 
		InterfaceAlignment.Center
	);
	
}

// Called when user has requested login through interface
Ragnarok.prototype.onStateDoLogin = function( username, password) {
	
	this.network.init(Settings.loginHost, Settings.loginPort);
	
	this.network.attachEventListener("OnConnectionError", function() {
		console.error("Connection error!"); 
	});
	
	this.network.attachEventListener("OnConnection", this.onEvent(function() {
		this.network.doLogin(username, password);
	}));
	
	this.network.attachEventListener("OnLogin", this.onEvent(function(response) {
		
		if( response.code == NetworkManager.ServiceList ) {
			
			console.log('Info: Login was accepted');
			this.onStateServiceSelectReady();
			
		} else if( response.code == NetworkManager.LoginDenied ) {
			// TODO: Display info box and go back to login screen
			console.error('Error: Login was rejected');
		}
	
	}));
		
};

// Called when client is ready to perform login
Ragnarok.prototype.onStateLoginReady = function() {
	
	var loginWindow = this.gui.create( Interface.LoginWindow );
	
	loginWindow.onEvent = this.onEvent( function( event ) {
				
		if( event.action == Interface.Button.Login ) {
			
			// TODO: validate input
			
			this.gui.remove( event.window );
			
			this.onStateDoLogin(
				event.username, 
				event.password
			);
			
		} else if( event.action == Interface.Button.Exit ) {
			// Do nothing for now...
		}
		
	});
	
	loginWindow.userTextField.data = 'gamemaster';
	loginWindow.passwordTextField.data = 'poring';
	
	this.gui.add(
		loginWindow, 
		InterfaceAlignment.Center, 
		InterfaceAlignment.Center
	);
	
}
