var InputEvent = function() {
	this.x = -1;
	this.y = -1;
	this.shift = false;
	this.control = false;
	this.keyCode = 0;
	this.button = -1;
};

InputEvent.Button = {
	LEFT: 0,
	MIDDLE: 1,
	RIGHT: 2
};

var InputEventHandler = function( document ) {

	EventHandler.call( this );

	this.registerHandlers( document );

};

InputEventHandler.prototype = Object.create( EventHandler.prototype );

InputEventHandler.prototype._fireEvent = function(event, value) {
	
	if(this._eventListeners.has(event)) {
		
		var listeners = this._eventListeners.get(event);
		
		for(var i = 0; i < listeners.length; i++) {
			
			if(typeof listeners[i] == "function") {
				
				if( listeners[i](value) === true ) {
					break;
				}
				
			}
		}
		
	}
		
};

InputEventHandler.prototype.translateMouseEvent = function( mouseEvent ) {
	
	var e = new InputEvent;
	
	e.x = mouseEvent.clientX;
	e.y = mouseEvent.clientY;
	e.button = mouseEvent.button;
	e.shift = mouseEvent.shiftKey;
	
	return e;
};

InputEventHandler.prototype.registerHandlers = function( document ) {

	document.addEventListener("mousedown", (function( e ) {
				
		this._fireEvent("mousedown", this.translateMouseEvent( e ) );
		
	}).bind( this ));

	document.addEventListener("mouseup", (function( e ) {
		
		this._fireEvent("mouseup", this.translateMouseEvent( e ) );
		
	}).bind( this ));
	
	document.addEventListener("mousemove", (function( e ) {
				
		this._fireEvent("mousemove", this.translateMouseEvent( e ) );
		
	}).bind( this ));

};
