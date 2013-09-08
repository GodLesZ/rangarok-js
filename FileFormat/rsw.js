function RSW( buffer ) {
	
	var start = (new Date).getTime();
	
	this.header = {};
	this.objects = [];
	
	this.__defineGetter__( 'width', function() {
		return this.header.width;
	}); 
	
	this.__defineGetter__( 'height', function() {
		return this.header.height;
	});
	
	this.getTile = function( x, y ) {
		return this.grid[ x + y * this.width ];
	}
	
	this.init = function( buffer ) {
		this.buffer = buffer;
		this.parseFormat();
		this.buffer = null;
	}
	
	this.parseFormat = function() {
		
		var data = new DataView( this.buffer );
		
		var offset = 0;
		
		this.header = {
			magic: data.getString( offset, 4 ),
			waterLevel: 10.0,
			waterType: 0,
			waveHeight: 1.0,
			waveSpeed: 2.0,
			waterAnimSpeed: 3,
			wavePitch: 50.0,
			lightLongitude: 45,
			lightLatitude: 45,
			diffuseCol: [ 1.0, 1.0, 1.0 ],
			ambientCol: [ 0.3, 0.3, 0.3 ]
		};
		
		offset += 4;
		
		if(this.header.magic.localeCompare('GRSW') !== 0) {
			throw 'RSW :: uknown identifier ' + this.header.magic;
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
		
		this.header.version.major = data.getUint8( offset );
		this.header.version.minor = data.getUint8( offset + 1);
		
		offset += 2;
		
		if( this.header.version.compareTo(1, 2) < 0 )
			throw 'GND :: Unable to read file version ' + this.header.version.toString;
		
		offset += 40; // INI file
		
		this.header.gnd = data.getString( offset, 40 );
		
		offset += 40;
		
		if( this.header.version.compareTo(1, 4) >= 0 ) {
			this.header.gat = data.getString( offset, 40 ); // GAT file
			offset += 40;
		}
		
		offset += 40; // SRC file
		
		if( this.header.version.compareTo(1, 3) >= 0 ) {
			this.header.waterLevel = data.getFloat32( offset, true );
			offset += 4;
		}
		
		if( this.header.version.compareTo(1, 8) >= 0 ) {
			this.header.waterType = data.getInt32( offset, true );
			this.header.waveHeight = data.getFloat32( offset + 4, true );
			this.header.waveSpeed = data.getFloat32( offset + 8, true );
			this.header.wavePitch = data.getFloat32( offset + 12, true );
			offset += 16;
		}
		
		if( this.header.version.compareTo(1, 9) >= 0 ) {
			this.header.waterAnimSpeed = data.getInt32( offset, true );
			offset += 4;
		}
		
		if( this.header.version.compareTo(1, 5) >= 0 ) {
			this.header.lightLongitude = data.getInt32( offset, true );
			this.header.lightLatitude = data.getInt32( offset + 4, true );
			this.header.diffuseCol = data.getVector3( offset + 8 );
			this.header.ambientCol = data.getVector3( offset + 20 );
			offset += 32;
		}
		
		if( this.header.version.compareTo(1, 7) >= 0 ) {
			this.header.f_uknown1 = data.getFloat32( offset, true );
			offset += 4;
		}
		
		if( this.header.version.compareTo(1, 6) >= 0 ) {
			this.header.groundTop = data.getInt32( offset, true );
			this.header.groundBottom = data.getInt32( offset + 4, true );
			this.header.groundLeft = data.getInt32( offset + 8, true );
			this.header.groundRight = data.getInt32( offset + 12, true );
			offset += 16;
		}
		
		this.header.numObjects = data.getInt32( offset, true );
		offset += 4;
		
		var type;
		var sound;
		
		for( var i = 0; i < this.header.numObjects; i++ ) {
			type = data.getInt32( offset, true );
			offset += 4;
			
			if( type == 1 ) {
			
				if( this.header.version.compareTo(1, 6) >= 0 ) {
				
					this.objects.push({
						type: type,
						name: data.getString( offset, 40 ),
						animType: data.getInt32( offset + 40, true ),
						animSpeed: data.getFloat32( offset + 44, true ),
						blockType: data.getInt32( offset + 48, true ),
						modelName: data.getString( offset + 52, 80 ),
						nodeName: data.getString( offset + 132, 80 ),
						position: data.getVector3( offset + 212 ),
						rotation: data.getVector3( offset + 224 ),
						scale: data.getVector3( offset + 236 )
					});
					
					offset += 248;
					
				} else {
				
					this.objects.push({
						type: type,
						name: 'untitled#' + offset.toString(16),
						animType: 0,
						animSpeed: 1.0,
						blockType: 0,
						modelName: data.getString( offset, 80 ),
						nodeName: data.getString( offset + 80, 80 ),
						position: data.getVector3( offset + 160 ),
						rotation: data.getVector3( offset + 172 ),
						scale: data.getVector3( offset + 184 )
					});
					
					offset += 196;
					
				}
				
			} else if( type == 2 ) {
			
				// light source
				//name		80			(char[80])
				//pos		12			(vector3d)
				//red		4			(int)
				//green		4			(int)
				//blue		4			(int)
				//range		4			(float)
				
				offset += 80;
				
				//this.objects.push({
				//	type: type,
					// skip name
				//	pos: data.getVector3( offset ),
					//red: data.getUint32( offset + 12 ),
					//green: data.getUint32( offset + 12 + 4 ),
					//blue: data.getUint32( offset + 12 + 8 ),
					//range: data.getFloat32( offset + 12 + 12 )
				//});
				
				offset += 108 - 80;
				
			} else if( type == 3 ) {
			
				// sound source
				
				sound = {
					type: type,
					name: data.getString( offset, 80 ),
					waveName: data.getString( offset + 80, 80 ),
					position: data.getVector3( offset + 160 ),
					volume: data.getFloat32( offset + 172, true ),
					width: data.getInt32( offset + 176, true ),
					height: data.getInt32( offset + 180, true ),
					range: data.getFloat32( offset + 184, true ),
					cycle: 4.0
				};
				
				offset += 188;
				
				if( this.header.version.compareTo(2, 0) >= 0 ) {
					sound.cycle = data.getFloat32( offset, true );
					offset += 4;
				}
				
				this.objects.push( sound );
			
			} else if( type == 4 ) {
				// effect source
				
				this.objects.push({
					type: type,
					name: data.getString( offset, 80 ),
					position: data.getVector3( offset + 80 ),
					effectType: data.getInt32( offset + 92, true ),
					emitSpeed: data.getFloat32( offset + 96, true ),
					param: [
						data.getFloat32( offset + 100, true ),
						data.getFloat32( offset + 104, true ),
						data.getFloat32( offset + 108, true ),
						data.getFloat32( offset + 112, true )
					]
				});
				
				offset += ( 80 + 12 + 4 + 4 + 16 );
				
			} else {
				throw "RSW: Unknown type";
			}
			
		}
		
		if( this.header.version.compareTo(2, 1) >= 0 ) {
			
			//{ * 1365 (4^0 + 4^1 + 4^2 + 4^3 + 4^4 + 4^5, quadtree with 6 levels, depth-first ordering)
			//	[ QuadTreeNode ]
			//	Field			Size		Comment
			//	-----			----		-------
			//	max				12			(vector3d)
			//	min				12			(vector3d)
			//	halfSize		12			(vector3d)
			//	center			12			(vector3d)
			//}
			
			// Skipping this for now ...
		
		}
		
	}
	
	this.init( buffer );
	console.log('Parsed RSW file format in ' + ((new Date).getTime() - start) + ' ms');
	
}