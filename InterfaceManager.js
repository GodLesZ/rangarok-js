InputType = {
	ButtonLeft: 0,
	ButtonMiddle: 1,
	ButtonRight: 2,
	ButtonUp: true,
	ButtonDown: false
};

function InterfaceManager( document ) {
	
	this.domElement = document.createElement('canvas');
	
	this.domElement.style.zIndex = 10;
	
	this.context = this.domElement.getContext('2d');
	
	//window.onresize = (function() {
		
	//	console.log('Info: Interface refreshing from resize');
		
	//	setTimeout((function() {
			
	//		this.refresh( true );
			
	//	}).bind( this ), 100 );
	
	//}).bind( this );
	
	this.mouseDownEvent = this.OnMouseDown.bind( this );
	this.mouseUpEvent = this.OnMouseUp.bind( this );
	this.mouseMoveEvent = this.OnMouseMove.bind( this );
	
};

InterfaceManager.InterfaceWindowObjects = {
	0: LoginWindow,
	1: ServiceWindow,
	3: CharacterSelectWindow,
	4: ChatWindow
};

InterfaceManager.Window = function( windowObject, x, y ) {
	
	this.x = x;
	this.y = y;
	
	this.object = windowObject;
	
};


InterfaceManager.prototype.OnMouseMove = function( e ) {

	return this.onInputMove({
		x: e.x,
		y: e.y
	});

};

InterfaceManager.prototype.OnMouseDown = function( e ) {

	return this.onInputClick({
		x: e.x,
		y: e.y
	}, e.button, InputType.ButtonDown );
	
};

InterfaceManager.prototype.OnMouseUp = function( e ) {

	return this.onInputClick({
		x: e.x,
		y: e.y
	}, e.button, InputType.ButtonUp );
	
};

InterfaceManager.prototype.init = function() {
	
	// Remove all objects if we're already setup
	if(this.__objects instanceof Array)
		this.removeAll();
	
	this.__objects = [];
	
	this.__focusObject = null;
	this.__dragObject = null;
	this.__hoverObject = null;
	
	this.__background = null;
	
	this.domElement.width = window.innerWidth;
	this.domElement.height = window.innerHeight;
	
	//this.domElement.style.width = "100%";
	//this.domElement.style.height = "100%";
	
	this.domElement.style.zIndex = "2";
	
	this.setBackground('load_kr/bgi_temp.bmp');
	
};

InterfaceManager.prototype.refresh = function( clear ) {
	
	clear = true;
	
	if( clear === true ) {
		
		if( this.__background !== null ) {
			
			this.context.drawImage(
				this.__background,
				0, 0,
				this.domElement.width, this.domElement.height
			);
			
		} else {
				
			this.context.clearRect(
				0, 0, 
				this.domElement.width, this.domElement.height
			);
			
		}
	}
	
	this.draw();
	
};

InterfaceManager.prototype.setBackground = function( uri ) {
	
	if( uri === null ) {
		
		this.__background = null;
		this.refresh( true );
		
		return;
	}
	
	this.__background = new Image;
	
	this.__background.onload = (function() {
		this.refresh( true );
	}).bind( this );
	
	this.__background.src = uri;
	
};

InterfaceManager.prototype.clearBackground = function() {
	this.__background = null;
	this.refresh( true );
};

InterfaceManager.prototype.draw = function() {
	
	for( var i = 0; i < this.__objects.length; i++ ) {
		
		if( !this.__objects[i].object.__visible )
			continue;
		
		var isDragged = this.__dragObject !== null 
			&& this.__dragObject.window == this.__objects[i];
		
		if( isDragged ) {
			this.context.globalAlpha = 0.5;
		}
		
		(this.__objects[i]).object.draw(
			this.context, 
			this.__objects[i].x, 
			this.__objects[i].y
		);
		
		if( isDragged ) {
			this.context.globalAlpha = 1.0;
		}
	
	};
	
};

InterfaceManager.prototype.create = function( id ) {
	return new InterfaceManager.InterfaceWindowObjects[id];
};

InterfaceManager.prototype.add = function( window, sx, sy, adjustX, adjustY ) {
	
	window.setInterface( this );
	
	adjustX = adjustX ? adjustX : 0;
	adjustY = adjustY ? adjustY : 0;
	
	var x = InterfaceHelper.parseAlignment( sx, window.width, this.domElement.width ) + adjustX;
	var y = InterfaceHelper.parseAlignment( sy, window.height, this.domElement.height ) + adjustY;
	
	this.__objects.push( new InterfaceManager.Window( window, x, y ) );
	
	this.refresh();
	
};

InterfaceManager.prototype.removeAll = function() {

	for(var i = 0; i < this.__objects.length; i++) {
		this.remove(this.__objects[i]);
	}
};

InterfaceManager.prototype.remove = function( windowObject ) {
	
	var idx = -1;
	
	
	for( var i = 0; i < this.__objects.length; i++ )
		if( this.__objects[i].object === windowObject )
			idx = i;
	
	
	if( idx >= 0 ) {
		
		windowObject.__destroy();
		this.__objects.splice( idx, 1 );
		
		this.refresh( true );
		
	}
	
};

InterfaceManager.prototype.onInputMove = function( event ) {
	
	var stop_propagate = false;
	
	if( this.__dragObject !== null ) {
		
		// We're dragging an object
		
		this.__dragObject.window.x = Math.max(
			Math.min(
				event.x - this.__dragObject.offset.x, 
				this.domElement.width - this.__dragObject.window.object.width
			),
			0
		);
		
		this.__dragObject.window.y = Math.max(
			Math.min(
				event.y - this.__dragObject.offset.y,
				this.domElement.height - this.__dragObject.window.object.height
			),
			0
		);
		
		this.refresh( true );
		
		stop_propagate = true;
		
	} else {
		
		// Fire hover events
		
		var hoverObject = null;
		
		for( var i = this.__objects.length - 1; i >= 0; i-- ) {
			
			var window = this.__objects[i];
			
			if( !window.object.__visible )
				continue;
			
			if( event.x > window.x 
			&&	event.x < window.x + window.object.width 
			&&	event.y > window.y
			&&	event.y < window.y + window.object.height ) {
				
				// Chat window isn't allowed to take mouse movement
				stop_propagate = !(window.object instanceof ChatWindow) || stop_propagate;
				
				hoverObject = window.object.onInputHover({
					x: event.x - window.x,
					y: event.y - window.y
				});
				
				if( hoverObject !== null ) {
					
					break;
					
				}
				
			}
			
		}
		
		if( hoverObject !== this.__hoverObject ) {
			
			if( this.__hoverObject !== null ) {
				
				//console.log( this.__hoverObject );
				this.__hoverObject.onInputBlur();
				
			}
			
			this.__hoverObject = hoverObject;
			
		}
		
	}
	
	return stop_propagate;
	
};

InterfaceManager.prototype.onInputClick = function( event, button, state ) {

	var stop_propagate = false;

	if( this.__dragObject !== null && state === InputType.ButtonUp ) {
		
		this.__dragObject = null;
		
		this.refresh();
		
		
		stop_propagate = true;
		
		return stop_propagate;
		
	}
	
	for( var i = 0; i < this.__objects.length; i++ ) {
	
		var window = this.__objects[i];
		
		if( !window.object.__visible )
				continue;
		
		if( event.x > window.x 
		&&	event.x < window.x + window.object.width 
		&&	event.y > window.y
		&&	event.y < window.y + window.object.height ) {
		
			stop_propagate = true;
		
			// Re-order windows
			
			this.__objects.splice( i, 1 );
			this.__objects.push( window );
			
			// Drop focus
			
			if( state === InputType.ButtonDown ) {
				
				this.__focusObject = null;
				
			}
			
			var clickFired = false;
			
			var localEvent = {
				x: event.x - window.x,
				y: event.y - window.y
			};
			
			if( state == InputType.ButtonDown ) {
			
				clickFired = window.object.onInputDown( localEvent );
			
			} else if( state == InputType.ButtonUp ) {
			
				clickFired = window.object.onInputUp( localEvent );
				
			}
			
			if( !clickFired 
			&& 	window.object.draggable 
			&&	button === InputType.ButtonLeft
			&&	state == InputType.ButtonDown ) {
			
				this.__dragObject = {
					
					window: window,
					offset: localEvent
					
				};
				
			}
			
			this.refresh();
			
			break;
		
		}
	
	}
	
	return stop_propagate;

};