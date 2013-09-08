// Basic button with support for hover, input down and input up events

function InputButton( interfaceType, width, height ) {
	
	InterfaceComponent.call( this, width, height );
	
	this.__event = interfaceType;
	
	this.__components = [];
	
	this.__normalBitmapIndex = 0;
	this.__hoverBitmapIndex = 1;
	this.__activeBitmapIndex = 2;
	
	this.__useHover = true;
	this.__useActive = true;
	
	this.__stateActive = false;
	this.__stateHover = false;

};

InputButton.prototype = Object.create( InterfaceComponent.prototype );

InputButton.prototype.onInputDown = function() {

	this.__stateActive = true;
	this.refresh();

};

InputButton.prototype.onInputUp = function() {
	
	
	if( this.__stateActive === true ) {
		
		this.fireEvent();
		
	}
	
	this.__stateActive = false;
	this.refresh();

};

InputButton.prototype.onInputHover = function() {
	
	if( !this.__stateHover ) {
		this.__stateHover = true;
		this.refresh();
	}
	
};

InputButton.prototype.onInputBlur = function() {
	
	this.__stateHover = false;
	this.refresh();

};

InputButton.prototype.draw = function( context, sx, sy ) {
	
	this.__bitmapIndex = this.__normalBitmapIndex;

	if( this.__stateActive && this.__useActive ) {
		
		this.__bitmapIndex = this.__activeBitmapIndex;
		
	} else if( this.__stateHover && this.__useHover ) {
	
		this.__bitmapIndex = this.__hoverBitmapIndex;
	
	}
	
	InterfaceComponent.prototype.draw.call( this, context, sx, sy );

};