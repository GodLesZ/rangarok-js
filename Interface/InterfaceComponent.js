// The most basic component in the interface
// Implements simple behaviour for graphics and events, and contains all
// the methods and member objects expected of any display component

function InterfaceComponent( width, height ) {
	
	this.width = width;
	this.height = height;
	
	this.color = 0xff00ff;
	this.alphaColor = 1.0;
	
	this.__ready = true;
	
	this.__visible = true;
	
	this.__bitmaps = [];
	this.__bitmapIndex = 0;
	this.__bitmapsAdded = 0;
	this.__bitmapsLoaded = 0;
	
	this.__listeners = [];
	
};

InterfaceComponent.prototype = {};

InterfaceComponent.prototype.refresh = function() {

	if( this.__interface  ) {
		
		this.__interface.refresh();
		
	}

};

InterfaceComponent.prototype.draw = function( context, sx, sy ) {
	
	if( !this.__ready || !this.__visible ) {
		return;
	}
	
	if( this.__bitmapIndex < this.__bitmaps.length && this.__bitmaps[ this.__bitmapIndex ] !== undefined ) {
		
		context.drawImage(
			this.__bitmaps[ this.__bitmapIndex ],
			sx, sy,
			this.width, this.height
		);
	
	} else if(this.alphaColor != 0) {
		
		context.fillStyle = this.color.toString(16);
		
		if(this.alphaColor != 1)
			this.globalAlpha = this.alphaColor;
		
		context.fillRect(
			sx, sy,
			this.width, this.height
		);
		
		if(this.alphaColor != 1)
			this.globalAlpha = 1.0;
	
	}

};

InterfaceComponent.prototype.__defineSetter__('ready', function( value ) {
	
	this.__ready = value;
	
	if( value && this.__interface  ) {
		
		this.__interface.refresh();
		
	}
	
});

InterfaceComponent.prototype.addBitmap = function( uri, index ) {
	
	this.__bitmapsAdded++;
	
	var image = new Image;
	
	this.ready = false;
	
	image.onload = (function(component) {
		
		return function() {
			
			component.__bitmapsLoaded++;
			component.__bitmaps[ index ] = this;
			
			var ready = true;
			
			if(this.__bitmapsLoaded < this.__bitmapsAdded) {
				ready = false;
			}
			
			component.ready = ready;
		}
		
	})(this);
	
	image.src = uri;

};

InterfaceComponent.prototype.setInterface = function( handler ) {
	
	this.__interface = handler;
	
};

InterfaceComponent.prototype.__destroy = function() {};

InterfaceComponent.prototype.addListener = function( obj ) {
	
	this.__listeners.push( obj );
	
};

InterfaceComponent.prototype.__onEvent = function() {

	this.onEvent({
		window: this
	});

};

InterfaceComponent.prototype.onEvent = function( event ) {};

InterfaceComponent.prototype.fireEvent = function( obj ) {
	
	for( var i = 0; i < this.__listeners.length; i++ ) {
		
		this.__listeners[i].__onEvent( obj || this );
		
	}
	
}

InterfaceComponent.prototype.onInputDown = function() {};
InterfaceComponent.prototype.onInputUp = function() {};
InterfaceComponent.prototype.onInputHover = function() {};
InterfaceComponent.prototype.onInputBlur = function() {};