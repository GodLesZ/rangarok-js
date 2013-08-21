// Text label component

function CanvasTextfield( width, height ) {
	
	InterfaceComponent.call( this, width, height );
	
	this.__data = '';
	this.__font = '12px arial';
	this.__baseline = 'top';
}

CanvasTextfield.prototype = Object.create( InterfaceComponent.prototype );

CanvasTextfield.prototype.draw = function( context, sx, sy ) {
	
	context.textBaseline = this.__baseline;
	context.font = this.__font;
	context.fillText( this.__data, sx, sy, this.width );
	
};

CanvasTextfield.prototype.__defineGetter__('data', function() {
	
	return this.__data;
	
});

CanvasTextfield.prototype.__defineSetter__('data', function( data ) {
	
	this.__data = data;
	this.refresh();
	
});