// Network states
NetworkState = {
	DISCONNECTED: -1,
	LoginConnect: 1,
	LoginReqAuth: 2,
	LoginConnected: 3,
	AccountConnect: 4,
	AccountReqAuth: 5,
	AccountConnected: 6,
	ZoneConnect: 7,
	ZoneReqAuth: 8,
	ZoneWait: 9,
	ZoneConnected: 10
};

function NetworkManager /* : EventHandler */ () {
	
	EventHandler.call(this);
	
	this.PacketBindTable = [];
	this._eventListeners = new Map();
	
	/* Set up packet bind table */
	for(var i in PacketEventHandlers) {
		
		var Ids = PacketEventHandlers[i][0];
		var Fn = PacketEventHandlers[i][1].bind(this);
		
		for(var i = 0; i < Ids.length; i++ ) {
			this.PacketBindTable[Ids[i]] = Fn;
		}
		
	}
	
	var networkManager = this;
	
	this.updateInterval = setInterval(function() {
		if( networkManager.__running ) {
			networkManager.update();
		}
	}, 1000 );
	
};

NetworkManager.prototype = Object.create(EventHandler.prototype);

NetworkManager.Util = {
	/* Obfuscate zone pos-dir structure */
	setZoneCoord: function( x, y, dir ) {
		var tmp = new Uint8Array(3);		
		tmp[0] = x >> 2;
		tmp[1] = ( x << 6 ) | ( ( y >> 4 ) & 0x3f );
		tmp[2] = ( y << 4 ) | ( dir & 0xf );
		
		return tmp;
	},
	/* De-obfuscate zone pos-dir structure */
	getZoneCoord: function( arr ) {	
		return {
			x: ( arr[0] << 2 ) | ( arr[1] >> 6 ),
			y: ( ( arr[1] & 0x3f ) << 4 ) | ( arr[2] >> 4 ),
			dir: arr[2] & 0x0f
		};
	}
};

// Response codes (constants for GameManager)
NetworkManager.ConnectionEstablished = 0;
NetworkManager.UnableToConnect = 1;
NetworkManager.Login = 2;
NetworkManager.LoginDenied = 3;
NetworkManager.ServiceList = 4;
NetworkManager.ServerSelectDenied = 5;
NetworkManager.CharacterList = 6;
NetworkManager.MapLoadWait = 7;
NetworkManager.MapEnterRefused = 8;
NetworkManager.MapEnter = 9;

NetworkManager.prototype.PacketVersion = 26;
NetworkManager.prototype.ClientType = 77; // CLIENTTYPE_CURIOSITY :)

// Max time before auto disconnect
NetworkManager.prototype.KeepAliveTime = 12000;

// Offset from reported host port to websocket tunnel port
NetworkManager.prototype.PortOffset = -1;

NetworkManager.prototype.init = function( addr, port ) {
	
	this.detachAllEventListeners();
	
	this.session = new NetworkSession();
	
	this.session.start = (new Date).getTime();
	
	this._state = NetworkState.LoginConnect;
	this.__connection = null;
	this.__buffer = null;
	
	// Start server connection
	this.connect( addr, port );
	
	this.__running = true;
		
};

NetworkManager.prototype.update = function() {
	
	// Keep-alive
	if(this.__connection == null) {
		return;
	}
	
	var now = this.session.tick;
	
	if( ( now - this.session.lastSendTick ) >= this.KeepAliveTime ) {
		
		if( /*this._state == NetworkState.LoginConnected
		||*/	this._state == NetworkState.AccountConnected ) {
			// Keep-alive packet for account servers
			// PACKET_PING
			this.sendPacketStructure({
				PacketType: 0x187,
				AID: this.session.AID
			});
		} else if( this._state == NetworkState.ZoneWait
		||	this._state == NetworkState.ZoneConnected ) {
			// Keep-alive for zone server
			
			
			//if(PACKETVER <= 5) {
				// PACKET_CZ_REQUEST_TIME
				this.sendPacketStructure({
					PacketType: 0x7e,
					clientTime: now
				});
			//}
		}
		
	}
	
};

NetworkManager.prototype.readBufferToPacketStruct = function( id, buf ) {
	if(PacketParser[id]) {
		return(PacketParser[id])(buf);
	}
	return null;
};

// Make a new ArrayBuffer from two existing ones
NetworkManager.prototype.appendBuffer = function( buf_dst, buf_src ) {
	
	var buf_res = new ArrayBuffer( buf_src.byteLength + buf_dst.byteLength );
	var arr_res = new Uint8Array( buf_res );
	
	arr_res.set( new Uint8Array( buf_dst, 0 ), 0 );
	arr_res.set( new Uint8Array( buf_src, 0 ), buf_dst.byteLength );
	
	return buf_res;
	
};

// Append ArrayBuffer object to the network buffer
NetworkManager.prototype.appendToGlobalBuffer = function( buf ) {
	
	if( this.__buffer === null ) {
		this.__buffer = buf;
	} else {
		this.__buffer = this.appendBuffer( this.__buffer, buf );
	}
	
};

// Attempt to extract a buffer containing a single packet
// return either an ArrayBuffer with a complete packet, or null
NetworkManager.prototype.extractPacketBuffer = function() {
	
	if( this.__buffer === null || this.__buffer.byteLength < 2 ) {
		return null;
	}
	
	var packetId = (new Uint16Array( this.__buffer, 0, 1 ))[0];
	var packetLength = PacketLengthTable[ packetId ];
	
	if( packetLength === undefined ) {
		console.log( 'Warning: Unknown length for packet 0x' + packetId.toString(16) );
		console.log( 'Dropping the global buffer (' + this.__buffer.byteLength + ' bytes)' );
		this.__buffer = null;
		return null;
	}
	
	var packetBuffer = null;
	
	if( packetLength === -1 ) {
		if( this.__buffer.byteLength < 4 ) {
			return null;
		}
		packetLength = (new Uint16Array( this.__buffer, 2, 1 ))[0];
	}
	
	if( this.__buffer.byteLength < packetLength ) {
		return null;
	} else if( this.__buffer.byteLength === packetLength ) {
		packetBuffer = this.__buffer;
		this.__buffer = null;
	} else {
		packetBuffer = this.__buffer.slice( 0, packetLength );
		this.__buffer = this.__buffer.slice( packetLength );
	}
	
	return packetBuffer;
	
};

NetworkManager.prototype.__onConnection = function( event ) {
	
	this.session.lastRecvTick = this.session.tick;
	
	if( this._state == NetworkState.LoginConnect ) {

		this._state = NetworkState.LoginReqAuth;
		this._fireEvent("OnConnection", true);

	} else if( this._state == NetworkState.AccountConnect ) {

		
		this._state = NetworkState.AccountReqAuth;
		this._fireEvent("OnAccountConnection", true);

		// Send packet at once
		// Put this into a function, maybe?
		
		console.log('Info: Attempting to authenticate with account server...');
		
		// PACKET_CH_ENTER
		this.sendPacketStructure({
			PacketType: 0x65,
			AID: this.session.AID,
			AuthCode: this.session.AuthCode,
			userLevel: this.session.userLevel,
			Sex: this.session.Sex
		});
	
	} else if( this._state == NetworkState.ZoneConnect ) {
		
		this._fireEvent("OnZoneConnection", true);
		this._state = NetworkState.ZoneReqAuth;
		
		console.log('Info: Attempting to authenticate with zone server...');
		
		//this.sendPacketStructure({
		//	PacketType: 0x436, // PACKET_CZ_ENTER2
		//	AID: this.session.AID,
		//	GID: this.session.pc.GID,
		//	AuthCode: this.session.AuthCode,
		//	clientTime: this.session.tick,
		//	Sex: this.session.Sex
		//});
		
		// #PACKETVER 5
		this.sendPacketStructure({
			PacketType: 0x72, //PACKET_CZ_ENTER
			AID: this.session.AID,
			GID: this.session.pc.GID,
			AuthCode: this.session.AuthCode,
			clientTime: this.session.tick,
			Sex: this.session.Sex
		});
		
	}
	
};

NetworkManager.prototype.__onConnectionError = function( event ) {
	this._fireEvent("OnConnectionError", true);
};

NetworkManager.prototype.__onConnectionMessage = function( event ) {
	
	console.log("Received message ...");
	
	this.session.lastRecvTick = this.session.tick;
	
	this.appendToGlobalBuffer( event.data );
	
	var packetBuffer;
	
	// extract packet buffer from global buffer, parse structure and 
	// call appropriate binding function
	while( ( packetBuffer = this.extractPacketBuffer() ) !== null ) {
		
		var packetId = (new Uint16Array( packetBuffer, 0, 1 ))[0];
		
		console.log('REVC 0x' + packetId.toString(16) );
		
		var bind = this.getPacketBind( packetId );
		
		if( bind !== undefined && bind !== null ) {
			bind(this.readBufferToPacketStruct(
				packetId, packetBuffer
			));
		} else {
			var name = PacketBuilder[packetId] ? PacketBuilder[packetId].name : "UNKNOWN";
			console.warn('Warning: Ignored packet 0x' + packetId.toString(16) + " " + name,this.readBufferToPacketStruct(packetId, packetBuffer));
		}
		
	};
	
};

NetworkManager.prototype.disconnect = function() {
	
	this.__connection.close();
	this.__connection = null;

};

NetworkManager.prototype.connect = function( addr, port ) {
	
	if( typeof addr == 'number' ) {
		// uint32 to string representation
		addr = 
			( ( addr & 0x000000ff ) ).toString() + '.' +
			( ( addr & 0x0000ff00 ) >> 8 ).toString() + '.' +
			( ( addr & 0x00ff0000 ) >> 16 ).toString() + '.' +
			( ( addr & 0xff000000 ) >> 24 ).toString();
	}
	
	port += this.PortOffset;
	addr = 'ws://' + addr + ':' + port.toString() + '/';
	
	if( this.__connection !== null ) {
		this.__connection.close();
	}
	
	this.__connection = new WebSocket( addr, ['binary'] );
	this.__connection.binaryType = 'arraybuffer';
	
	var NetworkManager = this;
	
	this.__connection.onopen = function( event ) {
		NetworkManager.__onConnection( event );
	};
	 
	this.__connection.onerror = function( event ) {
		NetworkManager.__onConnectionError( event );
	};
	
	this.__connection.onmessage = function( event ) {
		NetworkManager.__onConnectionMessage( event );
	};
	
};

NetworkManager.prototype.sendPacketStructure = function( struct ) {

	var fn = PacketBuilder[struct.PacketType];
	var buf = fn(struct);
	
	console.log("SEND 0x" + struct.PacketType.toString(16) + " " + fn.name);
	this.__connection.send( buf );
	
	this.session.lastSendTick = this.session.tick;
	
};

NetworkManager.prototype.getPacketBind = function( packetId ) {
	return this.PacketBindTable[ packetId ];
};

NetworkManager.prototype.doLogin = function( username, password ) {
	
	this.sendPacketStructure({
		PacketType: 0x64,
		Version: this.PacketVersion,
		ID: username.toUint8Array(24),
		Passwd: password.toUint8Array(24),
		clienttype: this.ClientType
	});
	
};

NetworkManager.prototype.selectService = function( id ) {
	
	var server = this.session.ServerList[id];
	
	if( !server ) {
		console.error('Error: Invalid server selected');
		return;
	}
	
	this.disconnect();
	
	this._state = NetworkState.AccountConnect;
	
	this.connect( server.ip, server.port );
	
};

NetworkManager.prototype.selectCharacter = function( charId ) {
	
	this.session.SelectCharacter(charId);
	
	this.sendPacketStructure({
		PacketType: 0x66,
		CharNum: charId
	});
	
};

NetworkManager.prototype.reportMapLoaded = function() {
	
	this._state = NetworkState.ZoneConnected;
	
	this.sendPacketStructure({
		PacketType: 0x7d // PACKET_CZ_NOTIFY_ACTORINIT
	});
	
};

NetworkManager.prototype.requestMove = function(x, y, direction) {
	this.sendPacketStructure({
		PacketType: 0x85, // PACKET_CZ_REQUEST_MOVE
		dest: NetworkManager.Util.setZoneCoord(x, y, direction)
	});
};
