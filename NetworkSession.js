function NetworkSession() {
	
	EventHandler.call(this);
	
	// Time
	this.start = 0;
	this.lastRecvTick = 0;
	this.lastSendTick = 0;
	this.serverTime = 0;
	
	// Account
	
	this.AuthCode = -1;
	this.AID = -1;
	this.userLevel = 0;
	this.lastLoginIP = -1;
	this.lastLoginTime = null;
	this.Sex = 0;
	
	this.ServerList = [];
	
	// Char
	
	this.TotalNumSlot = 3;
	this.PremiumStartSlot = 3;
	this.PremiumEndSlot = 3;
	
	this.time1 = 0;
	this.time2 = 0;
	
	this.charInfo = [];
	
	// Map
	
	this.mapName = null;
	
	this.pc = {
		GID: -1,
		status: []
	}
	
	this.font = null;
	
};

NetworkSession.prototype = Object.create(EventHandler.prototype);

NetworkSession.prototype.SetMapName = function(mapName) {
	this.mapName = mapName;
	this._fireEvent("OnMapNameChange", mapName);
};

NetworkSession.prototype.SetPCGID = function(GID) {
	this.pc.GID = GID; 
	this._fireEvent("OnGIDChange", GID);
};

NetworkSession.prototype.SetPCStatus = function(variable, status) {
	this.pc.status[variable] = status; 
	this._fireEvent("OnPCStatusChange", variable);
};

NetworkSession.prototype.GetPCStatus = function(variable) { return this.pc.status[variable]; };
NetworkSession.prototype.SelectCharacter = function(id) {
	this.pc.charInfo = this.charInfo[id];
};

NetworkSession.prototype.SetFont = function(font) { this.font = font; };
NetworkSession.prototype.OnPcChange = function() {};

NetworkSession.prototype.__defineGetter__('tick', function() {
	return (new Date).getTime() - this.start;
});