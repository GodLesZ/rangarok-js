if(Map === undefined) {
	
	var Map = function() {
		this.data = {};
	};
	
	Map.prototype.set = function(str, obj) { this.data[str] = obj; };
	Map.prototype.get = function(str) { return this.data[str]; };
	Map.prototype.has = function(str) { return this.data[str] !== undefined; };
}

var EventHandler = function() {
	this._eventListeners = new Map();
}

EventHandler.prototype.attachEventListener = function(event, fn) {
	
	var listeners;
	
	if(this._eventListeners.has(event)) {
		listeners = this._eventListeners.get(event);
	} else {
		listeners = [];
	}
	
	listeners.push(fn);
	
	this._eventListeners.set(event, listeners);
	
};

EventHandler.prototype.detachAllEventListeners = function() {
	this._eventListeners = new Map();
};

EventHandler.prototype.detachEventListener = function(event, fn) {
	
	if(fn === undefined) {
		this._eventListeners.set(event, []);
		return;
	}
	
	var listeners;
	
	if(this._eventListeners.has(event)) {
		listeners = this._eventListeners.get(event);
	} else {
		return;
	}
	
	var idx = listeners.indexOf(event);
	
	if(idx > -1) {
		listeners.slice(idx, 1);
	}
	
	this._eventListeners.set(event, listeners);
	
};

EventHandler.prototype._fireEvent = function(event, value) {
	
	if(this._eventListeners.has(event)) {
		
		var listeners = this._eventListeners.get(event);
		
		for(var i = 0; i < listeners.length; i++) {
			if(typeof listeners[i] == "function")
				listeners[i](value);
		}
		
	}
		
};