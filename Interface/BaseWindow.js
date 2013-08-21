// Simple window that can hold other display components

function BaseWindow( width, height ) {
	
	InterfaceComponent.call( this, width, height );
	
	this.__components = [];
	this.__forceDrawComponents = false;
	
	this.draggable = false;

};

BaseWindow.WindowComponent = function( component, x, y ) {
	
	this.object = component;
	
	this.x = x;
	this.y = y;
	
};

BaseWindow.prototype = Object.create( InterfaceComponent.prototype );

BaseWindow.prototype.setInterface = function( handler ) {
	
	this.__interface = handler;
	
	for( var i = 0; i < this.__components.length; i++ ) {
		
		this.__components[i].object.setInterface( handler );
		
	};
	
	this.refresh();
	
};

BaseWindow.prototype.addComponent = function( cmp, sx, sy, adjustX, adjustY ) {

	adjustX = adjustX ? adjustX : 0;
	adjustY = adjustY ? adjustY : 0;
	
	var x = InterfaceHelper.parseAlignment( sx, cmp.width, this.width ) + adjustX;
	var y = InterfaceHelper.parseAlignment( sy, cmp.height, this.height ) + adjustY;
	
	this.__components.push(
		new BaseWindow.WindowComponent( 
			cmp, 
			x,
			y 
		) 
	);
	
};

BaseWindow.InputAction = {
	Up: 0,
	Down: 1,
	Hover: 2
};

BaseWindow.prototype.propagateInput = function( event, __type ) {

	for( var i = 0; i < this.__components.length; i++ ) {
	
		var component = this.__components[i];
		
		if( event.x > component.x
		&&	event.x < component.x + component.object.width 
		&&	event.y > component.y
		&&	event.y < component.y + component.object.height
		&&	component.object.__visible ) {
		
			var localEvent = {
				x: event.x - component.x,
				y: event.y - component.y
			};
		
			if( __type === BaseWindow.InputAction.Down ) {
				
				component.object.onInputDown( localEvent );
				
				return true;
				
			} else if( __type === BaseWindow.InputAction.Up ) {
			
				component.object.onInputUp( localEvent );
				
				return true;
			
			} else if( __type === BaseWindow.InputAction.Hover ) {
			
				component.object.onInputHover( localEvent );
				
				return component.object;
			
			}
			
		}
	
	}
	
	return false;

}

BaseWindow.prototype.onInputDown = function( event ) {
	
	return this.propagateInput( event, BaseWindow.InputAction.Down );

};

BaseWindow.prototype.onInputUp = function( event ) {

	return this.propagateInput( event, BaseWindow.InputAction.Up );

};

BaseWindow.prototype.onInputHover = function( event ) {

	var obj = this.propagateInput( event, BaseWindow.InputAction.Hover );
	
	return obj ? obj : null;

};

BaseWindow.prototype.__destroy = function() {
	
	for( var i = 0; i < this.__components.length; i++ ) {
		
		(this.__components[i]).object.__destroy();
		
	}
	
}

BaseWindow.prototype.draw = function( context, sx, sy ) {
	
	if( !this.__ready && !this.__forceDrawComponents ) {
		return;
	}
	
	InterfaceComponent.prototype.draw.call( this, context, sx, sy );
	
	for( var i = 0; i < this.__components.length; i++ ) {
		
		var cmp = this.__components[i];
		
		cmp.object.draw(
			context, 
			sx + cmp.x, 
			sy + cmp.y
		);
		
	}

};

