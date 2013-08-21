/* PacketEventHandler :: function struct -> void */

var PacketEventHandlers = [
	
	[[0x69, 0x6a], function(struct) {
		
		if( struct.PacketType == 0x6a ) {
			/* Login was rejected */
			this._state = NetworkState.LoginReqAuth;
			this._fireEvent("OnLogin", { code: NetworkManager.LoginDenied });
			
		} else if( struct.PacketType == 0x69 ) {
			/* Login accepted */
			this._state = NetworkState.LoginConnected;
			
			this.session.AuthCode = struct.AuthCode;
			this.session.AID = struct.AID;
			this.session.userLevel = struct.userLevel;
			this.session.lastLoginIP = struct.lastLoginIP;
			this.session.lastLoginTime = struct.lastLoginTime;
			this.session.Sex = struct.Sex;
			this.session.ServerList = struct.ServerList;
			
			this._fireEvent("OnLogin", { code: NetworkManager.ServiceList });
			
		} else {
			console.warn('Error: undefined reponse for 0x' + struct.PacketType.toString(16) + ' in onLoginResponse');
		}
	}],	
	
	[[0x6b, 0x6c], function( struct ) {
	
		if( struct.PacketType == 0x6b ) {
			
			/* Account auth request OK */
			this._state = NetworkState.AccountConnected;
			
			this.session.TotalNumSlot = struct.TotalNumSlot;
			this.session.PremiumStartSlot = struct.PremiumStartSlot;
			this.session.PremiumEndSlot = struct.PremiumEndSlot;
			this.session.time1 = struct.time1;
			this.session.time2 = struct.time2;
			
			for( var i = 0; i < struct.charInfo.length; i++ ) {
				struct.charInfo[i].Sex = this.session.Sex;
			}
			
			this.session.charInfo = struct.charInfo;
			
			this._fireEvent("OnCharSelect", { code: NetworkManager.CharacterList });
			
		} else if( struct.PacketType == 0x6c ) {
			/* Account authorization refused */
			this._fireEvent("OnCharSelect", { code: NetworkManager.ServerSelectDenied, reason: struct.ErrorCode });
		} else {
			console.warn('Error: undefined reponse for 0x' + struct.PacketType.toString(16) + ' in onAccountServerReponse');
		}

	}],
	
	[[0x71], function( struct ) {

		console.log('Received zone server notification',
			'GID ' + struct.GID,
			'mapName ' + struct.mapName,
			'ip ' + struct.addr.ip,
			'port ' + struct.addr.port
		);
		
		this.session.SetPCGID(struct.GID);
		this.session.SetMapName(struct.mapName);
			
		this.disconnect();
		
		this._state = NetworkState.ZoneConnect;
		
		this.connect( struct.addr.ip, struct.addr.port );
	}],
	
	[[0x283], function( s ) { this.session.AID = s.AID }],
	
	[[0x73, 0x74, 0x2eb], function( struct ) {
	
		console.log('Info: Zone connection');
		
		if( struct.PacketType == 0x74 ) {
			/* Sorry, zone account authorization was refused! */
			this._fireEvent("OnZoneLoadWait", { code: NetworkManager.MapEnterRefused });
		} else if( struct.PacketType == 0x73 || struct.PacketType == 0x2eb ) {
		
			// Zone auth OK
			
			this._state = NetworkState.ZoneWait;
		
			this.session.serverTime = struct.startTime;
			
			var posDir = NetworkManager.Util.getZoneCoord(struct.PosDir);
			
			this.session.SetPCStatus(VarEnum.VAR_CURXPOS, posDir.x);
			this.session.SetPCStatus(VarEnum.VAR_CURYPOS, posDir.y);
			this.session.SetPCStatus(VarEnum.VAR_CURDIR, posDir.dir);
			
			this.session.SetPCStatus(VarEnum.VAR_NPCXSIZE, struct.xSize);
			this.session.SetPCStatus(VarEnum.VAR_NPCYSIZE, struct.ySize);
			
			if( struct.PacketType == 0x2eb ) {
				this.session.SetFont(struct.font);
			}
			
			this._fireEvent("OnZoneLoadWait", { code: NetworkManager.MapLoadWait });
		
		} else console.error('Error: Undefined behaviour in onZoneAccept, PacketType=0x' + struct.PacketType.toString(16) );

	}],
	
	[[0x8e], function(s) {
		this._fireEvent("OnPlayerChat", s.msg.toString());
	}]
	
	
	
];
