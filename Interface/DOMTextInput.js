// Text input using DOM element

function DOMTextInput( width, height, __type ) {

	InterfaceComponent.call( this, width, height );

	this.__type = __type ? __type : 'text';
	this.__font = '12px arial';
	this.__container = 'ro-text-container';
	this.__data = '';
	
	this.__lastX = -1;
	this.__lastY = -1;
	
	this.domElement = document.createElement('input');
	this.domElement.type = this.__type;
	this.domElement.className = 'roDomTextInput';
	this.domElement.style.width = this.width.toString() + 'px';
	this.domElement.style.height = this.height.toString() + 'px';
	
	document.getElementById( this.__container ).appendChild( this.domElement );

};

DOMTextInput.prototype = Object.create( InterfaceComponent.prototype );

DOMTextInput.prototype.__defineGetter__('data', function() {
	
	return this.domElement.value;
	
});

DOMTextInput.prototype.__defineSetter__('data', function( data ) {
	
	this.domElement.value = data;
	
});

DOMTextInput.prototype.draw = function( context, sx, sy ) {

	if( sx != this.__lastX || sy != this.__lastY ) {	
		this.domElement.style.left = sx + 'px';
		this.domElement.style.top = sy + 'px';
	}
		
	this.__lastX = sx;
	this.__lastY = sy;
	
};

DOMTextInput.prototype.__destroy = function() {
	
	document.getElementById( this.__container ).removeChild( this.domElement );
	
};