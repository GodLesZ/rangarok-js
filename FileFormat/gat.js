function GAT( buffer ) {
	
	var start = (new Date).getTime();
	
	this.header = {};
	this.blocks = [];
	
	this.init = function( buffer ) {
		this.buffer = buffer;
		this.parseFormat();
		this.buffer = null;
	}
	
	this.__defineGetter__( 'width', function() {
		return this.header.width;
	}); 
	
	this.__defineGetter__( 'height', function() {
		return this.header.height;
	});
	
	this.getBlock = function( x, y ) {
		return this.blocks[ x + y * this.width ];
	}
	
	// block is considered underwater if avgDepth > waterLevel
	this.getBlockAvgDepth = function( x, y ) {	
		
		var block = this.getBlock( x, y );
		
		if(block === undefined)
			return 0;
		
		return averageDepth = (block.upperLeftHeight + block.upperRightHeight + block.lowerLeftHeight + block.lowerRightHeight) / 4;
		
	}
		
	this.hasProperty = function(x, y, property) {
	
		var block = this.getBlock(x, y);
		
		if(block === undefined || block === null) {
			return false;
		}
	
		return (GAT.BlockTypes[block.type] & property) != 0;
	};
	
	this.parseFormat = function() {
		
		var data = new DataView( this.buffer, 0 );
		var offset = 0;
		
		this.header = {
			magic: data.getString( offset, 4 ),
			version: data.getUint16( offset + 4, true ),
			width: data.getUint32( offset + 6, true ),
			height: data.getUint32( offset + 10, true )
		};
		
		offset += 14;
		
		if(this.header.magic.localeCompare('GRAT') !== 0) {
			throw 'GAT :: uknown identifier ' + this.header.magic;
		}
		
		if( this.header.version !== 0x201 )
			console.log('GAT :: Info: File format version 0x' + this.header.version.toString(16) );
		
		for( var i = 0; i < this.header.width * this.header.height; i++, offset += 20 ) {
			this.blocks.push({
				upperLeftHeight: data.getFloat32( offset, true ),
				upperRightHeight: data.getFloat32( offset + 4, true ),
				lowerLeftHeight: data.getFloat32( offset + 8, true ),
				lowerRightHeight: data.getFloat32( offset + 12, true ),
				type: data.getUint8( offset + 16 )
				// skip uknown, 3 bytes (or is type integer?)
			});
		}
		
	}
	
	this.init( buffer );
	console.log('Parsed GAT file format in ' + ((new Date).getTime() - start) + ' ms');
	
};

GAT.BlockProperties = {
	NONE: 0,
	WALKABLE: 1,
	WATER: 2,
	SNIPABLE: 4,
	CLIFF: 8
};

GAT.BlockTypes = {
	0: GAT.BlockProperties.WALKABLE,
	1: GAT.BlockProperties.NONE,
	2: GAT.BlockProperties.WATER,
	3: GAT.BlockProperties.WATER | GAT.BlockProperties.WALKABLE,
	4: GAT.BlockProperties.WATER | GAT.BlockProperties.SNIPABLE,
	5: GAT.BlockProperties.CLIFF | GAT.BlockProperties.SNIPABLE,
	6: GAT.BlockProperties.CLIFF
};