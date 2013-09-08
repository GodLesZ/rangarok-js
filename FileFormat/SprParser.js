function SprParser( buffer ) {
	
	this.frames = [];
	this.bitmaps = [];
	
	this._atlasProcessed = false;
	this._atlasDataTexture = null;
	
	this.parseStructure( buffer );
	
	/** save buffer for now... */
	this.buffer = buffer;
	
};

SprParser.PALFrame = function( buffer, offset ) {
	
	var struct = new DataView( buffer, offset );
	
	this.width = struct.getUint16( 0, true );
	this.height = struct.getUint16( 2, true );
	this.byteLength = struct.getUint16( 4, true );
	this.byteOffset = offset + 6;
	this.textureAtlasPosition = [ 0, 0 ];
	
};

SprParser.RGBAFrame = function( buffer, offset ) {
	
	var struct = new DataView( buffer, offset );
	
	this.width = struct.getUint16( 0, true );
	this.height = struct.getUint16( 2, true );
	this.byteOffset = offset + 4;
	this.byteLength = this.width * this.height * 4;
	this.textureAtlasPosition = [ 0, 0 ];
	
};

SprParser.prototype = {};

SprParser.prototype.parseHeader = function( buffer ) {
	
	if( buffer.byteLength < 6 ) {
		throw 'Not enough data to parse header';
	}
	
	var struct = new DataView( buffer );
	
	this.header = {
		magic: struct.getString( 0, 2 ),
		version: struct.getUint16( 2, true ),
		frameCount: struct.getUint16( 4, true ),
		rgbFrameCount: 0
	};
	
	if( this.header.magic.localeCompare('SP') !== 0 ) {
		throw 'Incorrect file header';
	}
	
	if( this.header.version >= 0x200 ) {
		if( struct.buffer.byteLength < 8 ) {
			throw 'Not enough data to parse header';
		}
		this.header.rgbFrameCount = struct.getUint16( 6, true );
	}
		
};

SprParser.prototype.parsePalette = function( buffer ) {
	// 256 color RGBA palette
	var offset = buffer.byteLength - 1024;
	this.palette = new Uint8Array( buffer, offset, 1024 );
};

SprParser.prototype.parseFrameHeaders = function( buffer ) {
	
	var offset = ( this.header.version >= 0x200 ) ? 8 : 6;
	var frame;
	
	for( var i = 0; i < this.header.frameCount; i++ ) {
		
		frame = new SprParser.PALFrame( buffer, offset );
		offset += 6 + frame.byteLength;
		this.frames.push( frame );
		
	}
	
	if( this.header.version >= 0x200 ) {
	
		for( var i = 0; i < this.header.rgbFrameCount; i++ ) {
			
			frame = new SprParser.RGBAFrame( buffer, offset );
			offset += 4 + frame.byteLength;
			this.bitmaps.push( frame );
			
		}
	}
	
};

SprParser.prototype.parseStructure = function( buffer ) {
		
	if( !buffer ) throw 'Nothing to parse!';
	
	var offset = 0;
	
	var time = (new Date()).getTime();
	
	try {
		
		this.parseHeader( buffer );
		
		if( this.header.frameCount > 0 )
			this.parsePalette( buffer );
		
		this.parseFrameHeaders( buffer );
	
	} catch( e ) {
		throw e;
	}
	
};

SprParser.prototype.getIndexedFrameWidth = function( id ) {
	return this.frames[id].width;
};

SprParser.prototype.getIndexedFrameHeight = function( id ) {
	return this.frames[id].height;
};

SprParser.prototype.getRgbaFrameWidth = function( id ) {
	return this.bitmaps[id].width;
};

SprParser.prototype.getRgbaFrameHeight = function( id ) {
	return this.bitmaps[id].height;
};

SprParser.prototype.getIndexedFrameDataRgba = function( id ) {
	
	var frame = this.frames[id];
	
	var indexedData = new Uint8Array( 
		this.buffer, 
		frame.byteOffset, 
		frame.byteLength
	);
	
	var data = new Uint8Array( frame.width * frame.height * 4 );
	
	for( var i = 0, p = 0; p < indexedData.byteLength 
		&& i < frame.width * frame.height; ) {
		
		var colorIndex = indexedData[p++];
		
		if( colorIndex == 0 && this.header.version >= 0x201 ) {
			
			// RLE compressed sequence of "background color".
			// "0x00 0x00" is read as "0x00 0x02"
			
			var colorIndex2 = indexedData[p++];
			var length = ( colorIndex2 == 0 ) ? 2 : colorIndex2;
			
			// Note: Not really needed if transparency is used; typed 
			// arrays are initialized with zero filled buffers...
			for( var j = 0; j < length; j++, i++ ) {
				
				//data[4*i+0] = this.palette[0];
				//data[4*i+1] = this.palette[1];
				//data[4*i+2] = this.palette[2];
				//data[4*i+3] = 0;
			}
			
		} else {
			
			data[4*i+0] = this.palette[4*colorIndex+0];
			data[4*i+1] = this.palette[4*colorIndex+1];
			data[4*i+2] = this.palette[4*colorIndex+2];
			data[4*i+3] = 255;
			i++;
		}
		
	}
	
	return data;
	
};

SprParser.prototype.getAtlasUvs = function( id, frame_is_rgba ) {
	
};

// requires three.js
SprParser.prototype.getAtlasTextureThreeJs = function() {
	
	if(this._atlasProcessed) {
		return this._atlasDataTexture;
	}
	
	var atlasDataObject = this.getAtlasTextureRgba();
	
	this._atlasDataTexture = new THREE.DataTexture(
		atlasDataObject.data, 
		atlasDataObject.width, 
		atlasDataObject.height, 
		THREE.RGBAFormat,
		THREE.UnsignedByteType,
		{},
		THREE.ClampToEdgeWrapping, 
		THREE.ClampToEdgeWrapping, 
		THREE.LinearFilter, 
		THREE.LinearFilter
	);
	
	this._atlasDataTexture.needsUpdate = true;
	
	this._atlasProcessed = true;
	
	return this._atlasDataTexture;
	
};

SprParser.prototype.freeAtlasTextureThreeJs = function() {
	this._atlasProcessed = false;
	this._atlasDataTexture = null;
};

SprParser.prototype.atlasDefaultWidth = 512;
SprParser.prototype.atlasDefaultHeight = 512;

// @overrideSize Use a custom size for the atlas area
SprParser.prototype.getAtlasTextureRgba = function(overrideSize) {

	overrideSize = overrideSize || false;

	var frameData = [];
	
	var totalArea = 0;
	
	for( var i = 0; i < this.header.frameCount; i++ ) {
		
		totalArea += this.frames[i].width * this.frames[i].height;
		
		frameData.push({
			width: this.frames[i].width,
			height: this.frames[i].height,
			id: i,
			type: 'palette'
		});
	}
	
	for( var i = 0; i < this.header.rgbFrameCount; i++ ) {
		
		totalArea += this.bitmaps[i].width * this.bitmaps[i].height;
		
		frameData.push({
			width: this.bitmaps[i].width,
			height: this.bitmaps[i].height,
			id: i,
			type: 'rgba'
		});
	}
	
	frameData.sort(function( a, b ) {
		return b.height - a.height;
	});
	
	var width, height;
	var expectedArea = (overrideSize) || ( 1.8 * totalArea );
	
	if( false && this.atlasDefaultWidth * this.atlasDefaultHeight < expectedArea ) {	
		width = this.atlasDefaultWidth;
		height = this.atlasDefaultHeight;
	} else {
		width = Math.max(
			frameData[0].width * Math.floor( Math.sqrt( expectedArea ) / frameData[0].width ),
			128
		);
		height = Math.ceil( expectedArea / width );
	}
	
	// Minimum dimensions
	width = Math.max(width, 32);
	height = Math.max(height, 32);
	
	var atlas = new Uint8Array( 4 * width * height );
	
	var lastX = 0;
	var lastY = 0;
	var maxY = 0;
	
	for( var i = 0; i < frameData.length; i++ ) {
		
		var frame = frameData[i];
		var data = this.getFrameDataRgba( frame.id, frame.type );
		
		if( ( lastX + frame.width ) > width ) {
			lastX = 0;
			lastY += maxY;
			maxY = 0;
		}
		
		if( ( lastY + frame.height ) > height ) {
			console.log("Not enough room to make atlas texture! Trying again...", width, height);
			return this.getAtlasTextureRgba(2 * expectedArea);
		}
		
		var frameObject = ( frame.type == 'rgba' )
			? this.bitmaps[frame.id]
			: this.frames[frame.id];
		
		frameObject.textureAtlasPosition = [ lastX, lastY ];
		
		for( var y = 0; y < frame.height; y++ ) {
			
			for( var x = 0; x < frame.width; x++ ) {
				
				var p1 = 4 * ( y * frame.width + x );
				var p2 = 4 * ( ( lastY + y ) * width + lastX + x );
				
				if( frame.type == 'rgba' ) {
					atlas[p2+0] = data[p1+3];
					atlas[p2+1] = data[p1+2];
					atlas[p2+2] = data[p1+1];
					atlas[p2+3] = data[p1+0];
				} else {
					atlas[p2+0] = data[p1+0];
					atlas[p2+1] = data[p1+1];
					atlas[p2+2] = data[p1+2];
					atlas[p2+3] = data[p1+3];
				}
				
			}
		}
		
		lastX += frame.width;
		maxY = Math.max( frame.height, maxY );
		
	}
	
	var finalHeight = lastY + maxY;
	var finalArea = finalHeight * width;
	
	if( finalArea > 2048 * 2048 ) {
		console.log('Warning: Texture atlas for', this, 'is larger than 2048x2048!');
	}
	
	//console.log( width, finalHeight, totalArea, finalArea / totalArea );
	
	return {
		// Note to self: Should atlas.buffer be sliced?
		data: new Uint8Array( atlas.buffer.slice( 0, 4 * finalArea ), 0, 4 * finalArea ),
		width: width,
		height: finalHeight
	};

};

SprParser.prototype.getRgbaFrameDataRgba = function( id ) {
	
	var frame = this.bitmaps[id];
	
	console.log( 'Unpacking RGBA frame at 0x' + frame.byteOffset.toString(16) );
	
	// actually this data is ABGR
	return new Uint8Array( this.buffer, frame.byteOffset, frame.byteLength );
	
};

SprParser.prototype.getFrameDataRgba = function( id, type ) {
	return ( type == 'rgba' ) 
		? this.getRgbaFrameDataRgba( id )
		: this.getIndexedFrameDataRgba( id )
}