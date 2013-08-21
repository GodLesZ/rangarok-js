var ActParser = function( buffer ) {
	this.actions = [];
	this.events = [];
	this.delays = [];
	this.parseStructure( buffer );
};

ActParser.prototype = {};

ActParser.prototype.parseStructure = function( buffer ) {
	
	var data = new DataView( buffer );
	var p = 0;
	
	this.header = {
		magic: data.getString( p, 2 ),
		version: -1,
		actionCount: 0
	}
	
	p += 2;
	
	if( this.header.magic != 'AC' ) {
		throw "ActParser: File format error; uknown identifier";
	}
	
	this.header.version = data.getUint16( p, true );
	this.header.actionCount = data.getUint16( p + 2, true );
	
	p += 4;
	
	// Skip uknown bytes "reserved"
	p = 16;
	
	var action;
		
	for( var i = 0; i < this.header.actionCount; i++ ) {
		
		var frameCount = data.getUint32( p, true );
				
		p += 4;
		
		action = [];
		
		var frame;
		var attachments;
		
		for( var j = 0; j < frameCount; j++ ) {
			
			// Skip uknown bytes "range_unknown"
			p += 32;
			
			var spriteCount = data.getUint32( p, true );
			
			p += 4;
			
			frame = [];
			
			var sprite;
			
			for( var k = 0; k < spriteCount; k++ ) {
				
				sprite = {
					x: data.getInt32( p, true ),
					y: data.getInt32( p + 4, true ),
					id: data.getInt32( p + 8, true ),
					flipped: ( data.getInt32( p + 12, true ) != 0 ),
					color: [ 255, 255, 255, 255 ],
					angle: 0,
					type: 'palette',
					scaleX: 1.0,
					scaleY: 1.0,
					width: 0,
					height: 0
				}
				
				p += 16;
				
				if( this.header.version >= 0x200 ) {
					
					sprite.color = new Uint8Array( buffer.slice( p, p + 4 ) );
					
					p += 4;
					
				}
				
				if( this.header.version >= 0x204 ) {
					
					sprite.scaleX = data.getFloat32( p, true );
					sprite.scaleY = data.getFloat32( p + 4, true );
					
					p += 8;
					
				} else if( this.header.version >= 0x200 ) {
					
					sprite.scaleX = data.getFloat32( p, true );
					sprite.scaleY = sprite.scaleX;
					
					p += 4;
					
				}
				
				if( this.header.version >= 0x200 ) {
					
					sprite.angle = data.getInt32( p, true );
					sprite.type = ( data.getInt32( p + 4, true ) == 0 )
						? 'palette'
						: 'rgba';
						
					p += 8;
					
				}
				
				if( this.header.version >= 0x205 ) {
					
					sprite.width = data.getInt32( p, true );
					sprite.height = data.getInt32( p + 4, true );
					
					p += 8;
					
				}
				
				frame.push( sprite );
				
			}
			
			var eventIndex = -1;
			
			if( this.header.version > 0x200 ) {
				
				eventIndex = data.getUint32( p, true );
				
				p += 4;
				
			}
			
			var attachments = [];
			
			if( this.header.version >= 0x203 ) {
				
				var attachmentPointerCount = data.getInt32( p, true );
				
				p += 4;
				
				for( var k = 0; k < attachmentPointerCount; k++ ) {
					
					// Skip reserved bytes "reserved"
					p += 4;
					
					attachments.push({
						x: data.getInt32( p, true ),
						y: data.getInt32( p + 4, true ),
						attribute: data.getUint32( p + 8, true )
					});
					
					p += 12;
					
				}
			}
			
			action.push({
				sprites: frame,
				eventIndex: eventIndex,
				attachmentPointers: attachments
			});
			
		}
		
		this.actions.push( action );
	}
	
	if( this.header.version >= 0x201 ) {
	
		var eventCount = data.getUint32( p, true );
		
		p += 4;
		
		for( var i = 0; i < eventCount; i++ ) {
			
			this.events.push(
				data.getString( p, 40 )
			);
			
			p += 40;
			
		}
	
	}
	
	for( var i = 0; i < this.header.actionCount; i++ ) {
	
		if( this.header.version >= 0x202 ) {
			
			this.delays.push( data.getFloat32( p, true ) );
			
			p += 4;
			
		} else {
		
			this.delays.push( 4.0 );
		
		}
	
	}
	
};

