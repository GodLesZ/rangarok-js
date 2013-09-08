// The most basic component in the interface
// Implements simple behaviour for graphics and events, and contains all
// the methods and member objects expected of any display component

function InterfaceComponent( width, height ) {
	
	this.width = width;
	this.height = height;
	
	this.color = 0xff00ff;
	this.alphaColor = 1.0;
	
	this.opacity = 1.0;
	
	this.__ready = true;
	
	this.__visible = true;
	
	this.__bitmaps = [];
	this.__bitmapIndex = 0;
	this.__bitmapsAdded = 0;
	this.__bitmapsLoaded = 0;
	
	this.processBackground = false;
	this.backgroundRepeat = false;
	
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
	
	if( this.opacity != 1.0 ) {
		context.save();
		context.globalAlpha *= this.opacity;
	}
	
	if( this.__bitmapIndex < this.__bitmaps.length && this.__bitmaps[ this.__bitmapIndex ] !== undefined ) {
	
		if( this.backgroundRepeat ) {

			var img = this.__bitmaps[ this.__bitmapIndex ];

			var width = img.width;
			var height = img.height;

			for(var x = 0; x < this.width; x += width) {

				for(var y = 0; y < this.height; y += height) {
					
					var dw = Math.min( this.width - x, width );
					var dh = Math.min( this.height - y, height );
					
					context.drawImage( img, 0, 0, dw, dh, sx + x, sy + y, dw, dh );
					
				}
				
			}
		
		} else {

			context.drawImage(
				this.__bitmaps[ this.__bitmapIndex ],
				sx, sy,
				this.width, this.height
			);
		
		}
		
	
	} else if(this.alphaColor != 0) {
		
		context.fillStyle = this.color.toString(16);
		
		if(this.alphaColor != 1)
			this.globalAlpha *= this.alphaColor;
		
		context.fillRect(
			sx, sy,
			this.width, this.height
		);
		
		if(this.alphaColor != 1)
			this.globalAlpha /= this.alphaColor;
	
	}
	
	if( this.opacity != 1.0 ) {
		context.restore();
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
			
			var image = this;
			
			if(component.processBackground === true) {
				
				// Set mangenta (255, 0, 255) to transparent
				
				image = document.createElement("canvas");
				
				image.width = this.width;
				image.height = this.height;
				
				var ctx = image.getContext('2d');
				
				ctx.drawImage(this, 0, 0);
				
				var imgd = ctx.getImageData(0, 0, image.width, image.height);
				
				console.log(imgd);
				
				for(var i = 0; i < image.width * image.height; i++) {
				
					var r = imgd.data[4 * i + 0];
					var g = imgd.data[4 * i + 1];
					var b = imgd.data[4 * i + 2];
					
					if( r === 255 && g === 0 && b === 255 ) {
						// Alpha
						imgd.data[4 * i + 3] = 0;
					}
				}
				
				ctx.putImageData(imgd, 0, 0);
				
			}
			
			
			component.__bitmapsLoaded++;
			component.__bitmaps[ index ] = image;
			
			var ready = true;
			
			if(component.__bitmapsLoaded < component.__bitmapsAdded) {
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