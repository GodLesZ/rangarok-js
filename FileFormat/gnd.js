function GND( buffer ) {
	
	var start = (new Date).getTime();
	
	this.header = {};
	this.textures = [];
	this.lightMaps = [];
	this.grid = [];
	this.surfaces = [];
	
	this.parse( buffer );
	
	this.generateLightMaps();
	
	console.log('Parsed GND file format in ' + ((new Date).getTime() - start) + ' ms');
	
}

GND.prototype = {};

GND.prototype.lightMapTextureSize = 7;
GND.prototype.posterizationLevel = 16;

GND.prototype.getTileAvgHeight = function(x, y) {

	var tile = this.getTile(x, y);
	
	if(!tile)
		return 0;
	
	return 0.25 * (tile.upperLeftHeight + tile.upperRightHeight 
		+ tile.lowerLeftHeight + tile.lowerRightHeight);

};

GND.prototype.getTileLightLevel = function(x, y) {
	
	var tile = this.getTile(x, y);
	
	if(!tile)
		return 0;
	
	var topSurfaceId = tile.topSurfaceId;
	
	if(!topSurfaceId)
		return 0;
	
	var surface = this.surfaces[topSurfaceId];
	
	if(!surface)
		return 0;
	
	return this.lightMapSaturationLevels[surface.lightMapId || 0] / 12495;
};

GND.prototype.generateLightMaps = function() {
	
	var tsize = this.lightMapTextureSize;
	
	var w = Math.floor( Math.sqrt( this.header.numLightMaps ) );
	var h = Math.ceil( this.header.numLightMaps / w );
	
	var lightMapShadow = new Uint8Array( w * h * tsize * tsize );
	var lightMapColor = new Uint8Array( w * h * tsize * tsize * 4 );
	
	this.lightMapSaturationLevels = new Uint32Array(this.header.numLightMaps);
	
	var x = 0, y = 0;
	
	for( var i = 0; i < this.header.numLightMaps; i++ ) {
		
		for( var j = 0; j < tsize; j++ ) {
		
			var p = ( y * w * tsize * tsize + j * w * tsize + x * tsize );
			
			var lmap = this.lightMaps[i];
			
			//brightness		1*lmapWidth*lmapHeight		unsigned brightness values of the grid (must be 8x8) (uchar[8][8])
			//color			3*lmapWidth*lmapHeight		RGB/BGR(?) colors of the grid (must be 8x8) (uchar[3][8][8])
			
			//brightness: new Uint8Array( buffer.slice( p, p + dim ) ),
			//color: new Uint8Array( buffer.slice( p + dim, p + 4*dim ) ),
			
			for( var k = 0; k < tsize; k++ ) {
				
				var pk = p + k;
				var pc = 3 * ( j * 8 + k );
				var ps = j * 8 + k;
				
				lightMapShadow[ pk ] = lmap.brightness[ ps ];
				
				this.lightMapSaturationLevels[i] += lmap.brightness[ps];
				
				//lightMapColor[ 4*pk + 0 ] = lmap.brightness[ ps ];
				//lightMapColor[ 4*pk + 1 ] = lmap.brightness[ ps ];
				//lightMapColor[ 4*pk + 2 ] = lmap.brightness[ ps ];
				//lightMapColor[ 4*pk + 3 ] = 255;
				
				
				//if( lmap.color[ pc + 0 ] != 0 
				//|| lmap.color[ pc + 1 ] != 0 
				//|| lmap.color[ pc + 2 ] != 0 
				//) {
				//	console.log('not zero');
				//}
				
				// Posterization
				
				var r = (~~( lmap.color[ pc + 0 ] / this.posterizationLevel )) * this.posterizationLevel;
				var g = (~~( lmap.color[ pc + 1 ] / this.posterizationLevel )) * this.posterizationLevel;
				var b = (~~( lmap.color[ pc + 2 ] / this.posterizationLevel )) * this.posterizationLevel;
				
				//lightMapShadow[ pk ] = lmap.brightness[ ps ];
				//lightMapColor[ 4*pk + 0 ] = 255;
				//lightMapColor[ 4*pk + 1 ] = 255;
				//lightMapColor[ 4*pk + 2 ] = 255;
				
				lightMapColor[ 4*pk + 0 ] = r;
				lightMapColor[ 4*pk + 1 ] = g;
				lightMapColor[ 4*pk + 2 ] = b;
				lightMapColor[ 4*pk + 3 ] = lmap.brightness[ ps ];
				//lightMapColor[ 4*pk + 3 ] = 255;
				
				
				//lightMapColor[ 4*pk + 3 ] = lmap.brightness[ ps ];
			}
			
		}
		
		y++;
		
		if( y >= h ) {
			y = 0;
			x++;
		}
	}
	
	this.lightMapTextureWidth = w * tsize;
	this.lightMapTextureHeight = h * tsize;
	this.lightMapColor = lightMapColor;
	this.lightMapShadow = lightMapShadow;
	
};

GND.prototype.__defineGetter__('width', function() {
		return this.header.width;
}); 
	
GND.prototype.__defineGetter__('height', function() {
	return this.header.height;
});

GND.prototype.getTile = function( x, y ) {
	return this.grid[ x + y * this.width ];
}

GND.prototype.parse = function( buffer ) {
	
	var data = new DataView( buffer );
	var p = 0;
	
	this.header = {
		magic: data.getString( p, 4 )
	};
	
	p += 4;
	
	if(this.header.magic.localeCompare('GRGN') !== 0) {
		throw 'GND :: uknown identifier ' + this.header.magic;
	}
	
	this.header.version = {
		major: 0,
		minor: 0,
		get toString() {
			return this.major + '.' + this.minor;
		},
		compareTo: function(v1, v2) {
			if(this.major > v1 || (this.major >= v1 && this.minor >= v2)) {
				return 1;
			}
			if(this.major === v1 && this.minor === v2) {
				return 0;
			}
			return -1;
		}
	}
	
	this.header.version.major = data.getUint8( p );
	this.header.version.minor = data.getUint8( p + 1);
	
	p += 2;
	
	if( this.header.version.compareTo(1, 6) < 0 )
		throw 'GND :: Unable to read file version ' + this.header.version.toString;
	
	this.header.width = data.getInt32( p, true );
	this.header.height = data.getInt32( p + 4, true );
	this.header.zoom = data.getFloat32( p + 8, true );
	this.header.numTextures = data.getInt32( p + 12, true );
	this.header.maxTextureNameLen = data.getInt32( p + 16, true );
	
	p += 20;
	
	for( var i = 0; i < this.header.numTextures; i++ ) {
		this.textures.push( data.getString( p, this.header.maxTextureNameLen ) );
		p += this.header.maxTextureNameLen;
	}
	
	this.header.numLightMaps = data.getInt32( p, true );
	this.header.lightMapWidth = data.getInt32( p + 4, true );
	this.header.lightMapHeight = data.getInt32( p + 8, true );
	this.header.lightMapCellsEachGrid = data.getInt32( p + 12, true );
	
	p += 16;
	
	var dim = this.header.lightMapWidth * this.header.lightMapHeight;

	if( this.header.version.compareTo( 1, 7 ) >= 0 ) {
		for( var i = 0; i < this.header.numLightMaps; i++ ) {
			this.lightMaps.push({
				brightness: new Uint8Array( buffer.slice( p, p + dim ) ),
				color: new Uint8Array( buffer.slice( p + dim, p + 4*dim ) ),
			});
			p += 4*dim;
		}
	} else {
		throw 'GND :: Version 1.6 not implemented, I\'m quitting!';
		
		p += 16 * this.header.numLightMaps;
		
		//{ v1.6
		//	{ * numLightmap
		//		[ LMIndex ] sizeof=0x10
		//		Field		Size		Comment
		//		-----		----		-------
		//		a			4			(ulong)
		//		r			4			(ulong)
		//		g			4			(ulong)
		//		b			4			(ulong)
		//	}
		//	colorchannel		4		??? number of color channels? (int)
		//	{ * colorchannel
		//		[ ColorChannel ] sizeof=0x28
		//		Field		Size		Comment
		//		-----		----		-------
		//		buffer		40			(uchar[40])
		//	}
		//}
	}
	
	this.header.numSurfaces = data.getInt32( p, true );
	
	p += 4;
	
	var coordinates;
	
	for( var i = 0; i < this.header.numSurfaces; i++ ) {
		
		coordinates = new Float32Array( buffer.slice( p, p + 32 ) );
		
		this.surfaces.push({
			u: coordinates.subarray( 0, 4 ),
			v: coordinates.subarray( 4, 8 ),
			textureId: data.getInt16( p + 32, true ),
			lightMapId: data.getUint16( p + 34, true ),
			color_bgra: new Uint8Array( buffer.slice( p + 36, p + 40 ) )
		});
		
		p += 40;
	}
	
	var block;
	
	for( var i = 0; i < this.header.width * this.header.height; i++ ) {
		
		block = {
			upperLeftHeight: data.getFloat32( p, true ),
			upperRightHeight: data.getFloat32( p + 4, true ),
			lowerLeftHeight: data.getFloat32( p + 8, true ),
			lowerRightHeight: data.getFloat32( p + 12, true )
		};
		
		if( this.header.version.compareTo( 1, 7 ) >= 0 ) {
			block.topSurfaceId = data.getInt32( p + 16, true );
			block.frontSurfaceId = data.getInt32( p + 20, true );
			block.rightSurfaceId = data.getInt32( p + 24, true );
			p += 28;
		} else {
			block.topSurfaceId = data.getInt16( p + 16, true );
			block.frontSurfaceId = data.getInt16( p + 18, true );
			block.rightSurfaceId = data.getInt16( p + 20, true );
			p += 22;
		}
		
		this.grid.push( block );
	}
	
}
