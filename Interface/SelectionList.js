// Simple list of text labels which manages selected item

function SelectionList( width, height ) {

	InterfaceComponent.call( this, width, height );

	this.__itemBaseHeight = 15;
	this.__listPadding = [ 1, 0, 1, 5 ];
	this.__items = [];
	this.__selected = -1;
	
	this.__backgroundColor = "#f7f7f7";
	this.__selectionColor = "#cedeff";
	
};

SelectionList.prototype = Object.create( InterfaceComponent.prototype );

SelectionList.prototype.__defineGetter__('__itemHeight', function() {
	
	return this.__listPadding[0] + this.__listPadding[2] + this.__itemBaseHeight;
	
});

SelectionList.prototype.addItem = function( name, object ) {
	
	var display = new CanvasTextfield( this.width, this.__itemBaseHeight );
	
	display.data = name;
		
	this.__items.push({
		displayObject: display,
		value: object
	});
	
	this.refresh();
	
};

SelectionList.prototype.onInputDown = function( event ) {
	
	var index = Math.floor( event.y / this.__itemHeight );
	
	if( index >= 0 && index < this.__items.length ) {
		this.__selected = index;
	}
	
};

SelectionList.prototype.draw = function( context, sx, sy ) {
	
	var offset = 0;
	
	context.fillStyle = this.__backgroundColor;
	context.fillRect( sx, sy, this.width, this.height );

	context.fillStyle = "#000";
	
	for( var i = 0; i < this.__items.length; i++ ) {
	
		var item = this.__items[i];
		
		if( this.__selected === i ) {
			context.fillStyle = this.__selectionColor;
			context.fillRect( sx, sy + offset, this.width, this.__itemHeight );
			context.fillStyle = "#000";
		}
		
		item.displayObject.draw(
			context,
			sx + this.__listPadding[3],
			sy + offset + this.__listPadding[0]
		);
		
		offset += this.__itemHeight;
	
	}

};
