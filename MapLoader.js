var MapLoader = function() {
	EventHandler.call(this);
	this.reset();
};

MapLoader.prototype = Object.create(EventHandler.prototype);

MapLoader.prototype.derefTempObjects = function() {
	this.rsmAtlasObject = null;
};

MapLoader.prototype.reset = function() {
	
	this.rswFileObject = null;
	this.gndFileObject = null;
	this.gatFileObject = null;
	
	this.rsmFileObjects = new Map();
	
	this.actors = new Map();
	
	this.rsmAtlasObject = null;
	
	this.rsmFileObjectTotal = 0;
	this.rsmFileObjectLoaded = 0;
	
	this.running = false;
	
	this.mouse3 = new THREE.Vector3(0, 0, 1);
	this.mouse2 = new THREE.Vector2(0, 0);
	
	this.mousePickingInterval = 30;
	this.mousePickingIntervalKey = null;
	this.mouseGatPosition = new THREE.Vector2(0, 0);
	
	this.colorPickingInterval = 1000 / 10;
	this.colorPickingFocusObjectId = 0;
	
	this._worldComponents = {};
	
	this._worldComponents[MapLoader.WorldMesh.GROUND] = null;
	this._worldComponents[MapLoader.WorldMesh.WATER] = null;
	this._worldComponents[MapLoader.WorldMesh.MODEL] = [];
	
	this.entities = new Map();
	this.entityMap = new Map();
	
};

MapLoader.WorldMesh = {
	GROUND: 0,
	WATER: 1,
	MODEL: 2,
	COORDPOINTER: 3
};

MapLoader.prototype.registerWorldComponent = function(type, mesh) {

	if(type == MapLoader.WorldMesh.MODEL) {
		console.warn("REGISTERING COMPONENT", mesh);
		this._worldComponents[type].push(mesh);
	} else {
		this._worldComponents[type] = mesh;
	}
	
};

MapLoader.prototype.setWorldComponentDisplay = function(type, value) {
	
	if(type == MapLoader.WorldMesh.MODEL) {
		for(var i = 0; i < this._worldComponents[type].length; i++) {
			if(this._worldComponents[type][i] instanceof THREE.Object3D) 
				this._worldComponents[type][i].visible = value;
		}
	} else {
		if(this._worldComponents[type] instanceof THREE.Object3D) 
			this._worldComponents[type].visible = value;
	}
};

MapLoader.prototype.setWorldDisplay = function(value) {
	for(var i in MapLoader.WorldMesh) {
		this.setWorldComponentDisplay(MapLoader.WorldMesh[i], value);
	}
};

MapLoader.prototype.hideWorldComponent = function(type) {
	this.setWorldComponentDisplay(type, false);
};

MapLoader.prototype.showWorldComponent = function(type) {
	this.setWorldComponentDisplay(type, true);
};

MapLoader.prototype.loadRsw = function(rswBufferObject) {
	console.log('Parsing RSW object');
	this.rswFileObject = new RSW(rswBufferObject);
};

MapLoader.prototype.generateGroundLightmapTexture = function() {
	
	var map = new THREE.DataTexture(
		this.gndFileObject.lightMapColor, 
		this.gndFileObject.lightMapTextureWidth, 
		this.gndFileObject.lightMapTextureHeight, 
		THREE.RGBAFormat,
		THREE.UnsignedByteType,
		{},//mapping,
		THREE.ClampToEdgeWrapping, 
		THREE.ClampToEdgeWrapping, 
		THREE.LinearFilter, 
		THREE.LinearFilter
	);
	
	map.flipY = false;
	map.needsUpdate = true;
	
	this.groundLightMapTexture = map;
	
};

// Load textures, create the atlas texture

MapLoader.AtlasDataObject = function() {
	this.materials = [];
	this.canvas = [];
	this.textures = [];
	this.data = new Map();
};

MapLoader.AtlasTextureWidth = 2048;
MapLoader.AtlasTextureHeight = 1024;

MapLoader.prototype.generateAtlasTexture = function(textureNameList) {
	
	var pipe = new Deferred();
	var batch = Deferred();
	
	var textures = new Map();
	
	/* Load all textures in name list */
	for(var i = 0; i < textureNameList.length; i++)
		batch
			.then(ResourceLoader.getTextureImage.bind(this, textureNameList[i]))
			.then((function(name) {
				return function(image) {
					textures.set(name, image);
				};
			})(textureNameList[i]));
	
	batch.finally((function() {
		
		// Combine Image to DataTexture
		
		var atlasData = new MapLoader.AtlasDataObject(),
			width = MapLoader.AtlasTextureWidth, height = MapLoader.AtlasTextureHeight,
			position = new THREE.Vector3(0, 0, 0),
			position2 = new THREE.Vector3(0, 0, 0);
		
		// Sort all textures by height
		textureNameList.sort(function( a, b ) {
			return textures.get(b).height - textures.get(a).height;
		});
		
		console.log("Creating atlas texture from " + textureNameList.length + " bitmaps");
		
		var aId = 0;
		var canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		var context = canvas.getContext("2d");
		
		var addTexture = function() {
			
			/* Clear magenta (255, 0, 255) */
			var imgd = context.getImageData(0, 0, width, height);
			
			for(var i = 0; i < imgd.data.length; i += 4) {
				if(imgd.data[i] > 0xf0
					&& imgd.data[i+1] < 0x0a
					&& imgd.data[i+2] > 0xf0
				)
					imgd.data[i+3] = 0;
			}
			
			context.putImageData(imgd, 0, 0);
			
			// Create texture
			
			var t = new THREE.Texture(canvas);
			t.needsUpdate = true;
			t.flipY = false;
			
			console.log("ADDING TEXTURE!!!", aId, t, atlasData);
			
			atlasData.textures.push(t);
			
			/* Reset to new, blank canvas */
			canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			context = canvas.getContext("2d");
			
		};
		
		var rows = [];
		
		/* Map of processed textures */
		var processed = new Map();
		
		for(var i = 0; i < textureNameList.length; i++) {
			
			if(processed.has(i))
				continue;
			
			var name = textureNameList[i];
			var image = textures.get(name);
			
			if(position.x + image.width > width) {
				/* Change to next row */
				position.y += position.z;
				position.x = 0;
				position.z = 0;
				
				position2.x = 0;
				
			}
			
			if(position.y + image.height > height) {
				/* Canvas is full, try to use remaining space ... */
				position2.x = 0;
				
				for(var j = i + 1; j < textureNameList.length; j++) {
					
					if(processed.has(j))
						continue;
					
					var name2 = textureNameList[j];
					var image2 = textures.get(name2);
					
					
					if((image2.height <= (height - position.y - position.z))
						&& (position2.x + image2.width <= width)) {
						
						processed.set(j, true);
						
						atlasData.data.set(name2, {
							aId: aId,
							offset: new THREE.Vector2(position2.x / width, (position.y + position.z) / height),
							size: new THREE.Vector2(image2.width / width, image2.height / height)
						});
						
						context.drawImage(
							image2,
							position2.x, 
							position.y + position.z
						);
						
						position2.x += image2.width;
												
					}
					
				}
				
				/* Switch to next canvas. Edge case: if this is the last
				texture the canvas is pushed after the main loop instead */
				if(i + 1 < textureNameList.length) {
					addTexture.call(this);
					aId++;
				}
				
				position.x = 0;
				position.y = 0;
				position.z = 0;
				
				position2.x = 0;
				
			}
			
			if(position.z - image.height >= 16) {
				
				for(var j = i + 1; j < textureNameList.length; j++) {
					
					if(processed.has(j))
						continue;
					
					var name2 = textureNameList[j];
					var image2 = textures.get(name2);
					
					position2.x = Math.max(position.x, position2.x);
					
					if((image2.height <= (position.z - image.height))
						&& (position2.x + image2.width <= width)) {
						
						processed.set(j, true);
						
						atlasData.data.set(name2, {
							aId: aId,
							offset: new THREE.Vector2(position2.x / width, (position.y + image.height) / height),
							size: new THREE.Vector2(image2.width / width, image2.height / height)
						});
						
						context.drawImage(
							image2,
							position2.x, 
							position.y + image.height
						);
						
						position2.x += image2.width;
						
						break;
						
					}
					
				}
			}
			
			atlasData.data.set(name, {
				aId: aId,
				offset: new THREE.Vector2(position.x / width, position.y / height),
				size: new THREE.Vector2(image.width / width, image.height / height)
			});
			
			context.drawImage(image, position.x, position.y);
			
			position.x += image.width;
			position.z = Math.max(image.height, position.z);
			
		}
		
		// Add the last one canvas as texture
		addTexture.call(this);
		
		console.log("Info: Created texture atlas in " + (aId+1) + " parts");
		
		pipe.success(atlasData);
		
	}).bind(this));
	
	return pipe;
	
};

MapLoader.prototype.getAtlasFromDisk = function() {
	
	var pipe = new Deferred();
	var batch = Deferred();
	
	var atlasData = new MapLoader.AtlasDataObject();
	var mapName = this.getMapName();
	
	batch
		.then(ResourceLoader.getFile.bind(null, mapName, "atlasdata.txt", "text"))
		.then(function(ret) {
			
			if(ret == false) {
				console.log("Failed to get atlasdata.txt");
				pipe.success(false);
				return;
			}
				
			var lines = ret.split("\n");
			var header = lines[0].split(",");
			
			for(var i = 1; i < lines.length; i++) {
				var data = lines[i].split(String.fromCharCode(0));
				atlasData.data.set(data[0], {
					aId: Number(data[1]),
					offset: new THREE.Vector2(Number(data[2]), Number(data[3])),
					size: new THREE.Vector2(Number(data[4]), Number(data[5]))
				});
			}
			
			var setup = {
				width: Number(header[0]),
				height: Number(header[1]),
				n_textures: Number(header[2])
			};
			
			atlasData.textures = Array(setup.n_textures);
			
			var batch = Deferred();
			
			for(var i = 0; i < setup.n_textures; i++) {
				
				var loadTask = ResourceLoader.getFile(mapName, "texture" + i + ".dat", "arraybuffer")
					.then((function(i) {
						return function(buffer) {
							if(buffer == false) {
								console.log("Failed to fetch texture!");
								pipe.success(false);
							} else {
								var texture = new THREE.DataTexture(
									new Uint8Array(buffer),
									setup.width, 
									setup.height, 
									THREE.RGBAFormat, 
									THREE.UnsignedByteType
								);
								texture.needsUpdate = true;
								texture.flipY = false;
								atlasData.textures[i] = texture;
							}
						}
					})(i));
				
				batch.then(loadTask);
				
			}
			
			batch.finally(function() {
				pipe.success(atlasData);
			});
			
		});
	
	return pipe;
	
};

MapLoader.prototype.saveAtlasToDisk = function(textureNameList) {
	
	console.log("Writing atlas to disk ...");
		
	var out = MapLoader.AtlasTextureWidth + "," + MapLoader.AtlasTextureHeight + "," + this.rsmAtlasObject.materials.length + "\n";
	
	for(var i = 0; i < textureNameList.length; i++) {
		
		var name = textureNameList[i];
		var data = this.rsmAtlasObject.data.get(name);
		
		out += [name, data.aId, data.offset.x, data.offset.y, data.size.x, data.size.y].join(String.fromCharCode(0)) + "\n";
	}
	
	ResourceLoader.createFile(this.getMapName(), "atlasdata.txt", out, "text/plain")
		.then(function(ret) {
			console.log('done writing atlas data ...', ret);
		});
	
	for(var i = 0; i < this.rsmAtlasObject.textures.length; i++) {
		
		var buffer = new ArrayBuffer(MapLoader.AtlasTextureWidth * MapLoader.AtlasTextureHeight * 4);
		var array = new Uint8Array(buffer);
		var imgd = this.rsmAtlasObject.textures[i].image.getContext("2d").getImageData(0, 0, MapLoader.AtlasTextureWidth, MapLoader.AtlasTextureHeight);
		
		for(var p = 0; p < imgd.data.length; p++) {
			array[p] = imgd.data[p];
		}
		
		ResourceLoader.createFile(this.getMapName(), "texture" + i + ".dat", buffer, "application/octet-binary");
		
	}
};

MapLoader.prototype.setupModelTextures = function() {
		
	var textures = new Map();
	var textureNameList = [];
	
	var batch = new Deferred();
	var loadedFromDisk = false;
	
	/* Find all unique texture names in RSM files */
	for(var i = 0; i < this.rswFileObject.objects.length; i++) {
		
		if( this.rswFileObject.objects[i].type != 1 )
			continue;
		
		var rsm = this.rsmFileObjects.get(this.rswFileObject.objects[i].modelName);
		
		for(var j = 0; j < rsm.textureNames.length; j++) {
			
			var name = rsm.textureNames[j];
			
			if(!textures.has(name)) {
				
				if(name.match(/\.tga$/i)) {
					console.log("Skipping Targa texture");
					continue;
				}
				
				// Temp set to true
				textures.set(name, true);
				textureNameList.push(name);
			}
		}
	}
	
	if(ResourceLoader.useFileSystem) {
		
		// Try to get texture atlas from disk
		batch.then(
			this.getAtlasFromDisk().then((function(atlasData) {
				if(atlasData instanceof MapLoader.AtlasDataObject) {
					loadedFromDisk = true;
					batch.success(atlasData);
				} else {
					// Loading from disk failed ...
					return this.generateAtlasTexture(textureNameList).then(function(atlasData) {
						batch.success(atlasData);
					});
				}
			}).bind(this))
		);
		
	} else {
		batch.then(this.generateAtlasTexture(textureNameList).then(function(atlasData) {
			batch.success(atlasData);
		}));
	}
	
	/* Return atlas texture task */
	return batch.finally((function(atlasData) {
		
		if(loadedFromDisk)
			console.log("Loaded texture atlas from disk in " + atlasData.textures.length + " files");
		else 
			console.log("Created texture atlas from remote files");
			
		this.rsmAtlasObject = atlasData;
		
		for(var i = 0; i < this.rsmAtlasObject.textures.length; i++) {
			
			var texture = this.rsmAtlasObject.textures[i];
			
			this.rsmAtlasObject.materials.push(new THREE.MeshLambertMaterial({
				map: texture,
				transparent: true,
				alphaTest: 0.5,
				shading: THREE.SmoothShading,
				side: THREE.DoubleSide
			}));
		}
		
		if(ResourceLoader.useFileSystem && loadedFromDisk != true) {
			// Do this later to reduce loading time?
			this.saveAtlasToDisk(textureNameList);
		}
		
	}).bind(this));

};

MapLoader.prototype.createGround = function() {
	
	// Setup materials for ground mesh
	
	this.generateGroundLightmapTexture();
	
	var lightMapWidth = Math.floor( Math.sqrt( this.gndFileObject.header.numLightMaps ) );
	var lightMapHeight = Math.ceil( this.gndFileObject.header.numLightMaps / lightMapWidth );
	
	var materials = [];
	
	// Base material
	materials.push(new THREE.MeshBasicMaterial({ color: 0xff0000 }));
	
	var gndMaterialOffset = 1;
	
	console.log("CREATING GROUND", this.gndFileObject, this.gatFileObject);
	
	for( var i = 0; i < this.gndFileObject.textures.length; i++ ) {
		
		var texture = ResourceLoader.getTexture(this.gndFileObject.textures[i]);
		
		texture.flipY = false;
		//texture.minFilter = THREE.NearestFilter;
		//texture.magFilter = THREE.LinearFilter;
		
		var material = new THREE.MeshLambertMaterial({
			map: texture,
			color: 0xffffff,
			transparent: false,
			lightMap: this.groundLightMapTexture,
			alphaTest: 0.5,
			//blending: THREE.MultiplyBlending,
			//bumpMap: texture,
			//bumpScale: 10,
			//combine: THREE.MixOperation,
			//overdraw: window.overdraw
			/*magFilter: THREE.LinearMipmapLinearFilter,
			minFilter: THREE.LinearFilter*/
		});
		
		material.vertexColors = THREE.VertexColors;
		
		materials.push(material);
	}
	
	// Build water geometry structure
	
	var waterGeometry = new THREE.Geometry();
	
	// Build ground geometry structure
	
	var groundGeometry = new THREE.Geometry();
	
	// Alternative UVs for lightmap
	groundGeometry.faceVertexUvs[1] = [];
	
	var surfaces = ['frontSurfaceId', 'rightSurfaceId', 'topSurfaceId'];
			
	var surfaceVerticeAligments = [
		[	[0, 1, 'lowerLeftHeight'],
			[1, 1, 'lowerRightHeight'],
			[1, 1, 'upperRightHeight'],
			[0, 1, 'upperLeftHeight']
		], [
			[1, 1, 'lowerRightHeight'],
			[1, 0, 'upperRightHeight'],
			[1, 0, 'upperLeftHeight'],
			[1, 1, 'lowerLeftHeight']
		], [
			[0, 0, 'upperLeftHeight'],
			[1, 0, 'upperRightHeight'],
			[1, 1, 'lowerRightHeight'],
			[0, 1, 'lowerLeftHeight']
		]
	];
	
	var neighborTileId = [
		[0, 1],
		[1, 0],
		[0, 0]
	];
	
	
	for( var p = 0, x = 0; x < this.gndFileObject.width; x++ ) {
		
		for( var y = 0; y < this.gndFileObject.height; y++ ) {
			
			// gnd order: 0 upperleft, 1 upperright, 2 lowerleft, 3 lowerright
			
			var tile = this.gndFileObject.getTile(x, y);
						
			for(var i = 0; i < surfaces.length; i++) {
				
				var surfaceIdx = surfaces[i];
				
				if(tile[surfaceIdx] > -1) {
				
					var tile2 = this.gndFileObject.getTile(x + neighborTileId[i][0], y + neighborTileId[i][1]);
					
					if(tile2 === undefined) {
						console.warn("Weird GAT? Possible edge case.");
						continue;
					}
					
					var v = surfaceVerticeAligments[i];
					
					groundGeometry.vertices.push(new THREE.Vector3(x + v[0][0], y + v[0][1], -tile[v[0][2]]));
					groundGeometry.vertices.push(new THREE.Vector3(x + v[1][0], y + v[1][1], -tile[v[1][2]]));
					groundGeometry.vertices.push(new THREE.Vector3(x + v[2][0], y + v[2][1], -tile2[v[2][2]]));
					groundGeometry.vertices.push(new THREE.Vector3(x + v[3][0], y + v[3][1], -tile2[v[3][2]]));
					
					var gnd_surface = this.gndFileObject.surfaces[tile[surfaceIdx]];
					
					// Setup UVs for textures
					
					groundGeometry.faceVertexUvs[0].push([
						new THREE.Vector2( gnd_surface.u[0], gnd_surface.v[0] ),
						new THREE.Vector2( gnd_surface.u[1], gnd_surface.v[1] ),
						new THREE.Vector2( gnd_surface.u[3], gnd_surface.v[3] ),
						new THREE.Vector2( gnd_surface.u[2], gnd_surface.v[2] )
					]);
					
					// Setup UVs for lightmap
					
					var lh = lightMapHeight;
					var lw = lightMapWidth;
					var lx = Math.floor(gnd_surface.lightMapId / lh);
					var ly = gnd_surface.lightMapId % lh;
					var lv = new THREE.Vector2(( 0.1 + ly ) / lh, ( 0.9 + ly) / lh);
					var lu = new THREE.Vector2(( 0.1 + lx ) / lw, ( 0.9 + lx ) / lw);
					
					groundGeometry.faceVertexUvs[1].push([
						new THREE.Vector2(lu.x, lv.x),
						new THREE.Vector2(lu.y, lv.x),
						new THREE.Vector2(lu.y, lv.y),
						new THREE.Vector2(lu.x, lv.y)
					]);
					
					//THREE.Face4 = function ( a, b, c, d, normal, color, materialIndex );
					var face = new THREE.Face4(p, p + 1, p + 2, p + 3, null, null, gnd_surface.textureId + gndMaterialOffset);
					
					// Add vertex colors for top surface
					
					if(surfaceIdx == 'topSurfaceId') {
						
						var maxHeight = Math.max(
							tile.lowerLeftHeight,
							tile.upperLeftHeight,
							tile.lowerRightHeight,
							tile.lowerRightHeight
						);
						
						if(this.rswFileObject.header.waterLevel < maxHeight) {
							//console.log("Underwater tile at", x, y);
							waterGeometry.vertices.push(new THREE.Vector3(x, y, -this.rswFileObject.header.waterLevel));
							waterGeometry.vertices.push(new THREE.Vector3(x + 1, y, -this.rswFileObject.header.waterLevel));
							waterGeometry.vertices.push(new THREE.Vector3(x + 1, y + 1, -this.rswFileObject.header.waterLevel));
							waterGeometry.vertices.push(new THREE.Vector3(x, y + 1, -this.rswFileObject.header.waterLevel));
							var id = waterGeometry.vertices.length;
							waterGeometry.faces.push(new THREE.Face4(id-4, id-3, id-2, id-1));
							
							var _y = y % 2;
							var _x = x % 2;
							
							waterGeometry.faceVertexUvs[0].push([
								new THREE.Vector2( 0 + _x * 0.5, 0 + _y * 0.5 ),
								new THREE.Vector2( 0.5 + _x * 0.5, 0 + _y * 0.5 ),
								new THREE.Vector2( 0.5 + _x * 0.5, 0.5 + _y * 0.5 ),
								new THREE.Vector2( 0 + _x * 0.5, 0.5 + _y * 0.5 )
							]);
							
						}
						
						// top left, bottom right, top right, bottom left
						for(var i = 0; i < 4; i++) {
							
							var tile = this.gndFileObject.getTile(x + v[i][0], y + v[i][1]) || {};
							
							if(tile['topSurfaceId'] >= 0 && this.gndFileObject.surfaces[tile['topSurfaceId']]) {
								var color32dpp = this.gndFileObject.surfaces[ tile['topSurfaceId'] ].color_bgra;
								face.vertexColors[i] = (new THREE.Color).setRGB(
									color32dpp[2] / 255,
									color32dpp[1] / 255,
									color32dpp[0] / 255
								);
							} else {
								face.vertexColors[i] = (new THREE.Color).setRGB(0, 0, 0);
							}
							
						}
						
						
						
					}
										
					groundGeometry.faces.push( face );
					
					p += 4;
					
				}
				
			}
			
		}
	}
	
	// set orentation down and scale
	groundGeometry.applyMatrix( new THREE.Matrix4(
		this.gndFileObject.header.zoom, 0, 0, 0,
		0, 0, 1, 0,
		0,-this.gndFileObject.header.zoom, 0, 0,
		0, 0, 0, 1
	) );
	
	waterGeometry.applyMatrix( new THREE.Matrix4(
		this.gndFileObject.header.zoom, 0, 0, 0,
		0, 0, 1, 0,
		0,-this.gndFileObject.header.zoom, 0, 0,
		0, 0, 0, 1
	) );
	
	console.log(groundGeometry);
	
	groundGeometry.dynamic = false;
		
	var mesh = new THREE.Mesh(groundGeometry, new THREE.MeshFaceMaterial(materials));
	
	var waterMesh = new THREE.Mesh(waterGeometry, new THREE.MeshBasicMaterial({
		//map: ResourceLoader.getTexture("¿öÅÍ/water" + this.rswFileObject.header.waterType + "01.jpg"),
		map: ResourceLoader.getTexture(decodeURIComponent("%C2%BF%C3%B6%C3%85%C3%8D") + "/water" + this.rswFileObject.header.waterType + "01.jpg"),
		//color: 0x0000ff,
		transparent: true,
		opacity: 0.7
	}));
	
	
	/*var mesh = new THREE.Mesh(groundGeometry, new THREE.MeshBasicMaterial({
		//wireframe: true,
		//color: 0xff0000
	}));*/
	
	this.registerWorldComponent(MapLoader.WorldMesh.GROUND, mesh);
	this.registerWorldComponent(MapLoader.WorldMesh.WATER, waterMesh);
	
	// Add GND to scene
	this.scene.add( mesh );
	this.scene.add(waterMesh);
	
};


MapLoader.prototype.createCoordinatePointer = function() {

	var len = this.gndFileObject.header.zoom / 2;
	
	var geo = new THREE.Geometry();
	
	geo.dynamic = true;
	
	var h = len / 9;
	var w = len / 3 /*- h*/;
	
	var f = geo.faces;
	var v = geo.vertices;
	
	// TOP LEFT CORNER
	
	v.push( new THREE.Vector3( 0, 0, 0 ) ); // top left
	v.push( new THREE.Vector3( w, 0, 0 ) ); // top right
	v.push( new THREE.Vector3( w, h, 0 ) ); // bottom right
	v.push( new THREE.Vector3( 0, h, 0 ) ); // bottom left
	f.push( new THREE.Face4( 0, 1, 2, 3 ) );
	
	v.push( new THREE.Vector3( 0, h, 0 ) ); // top left
	v.push( new THREE.Vector3( h, h, 0 ) ); // top right
	v.push( new THREE.Vector3( h, w, 0 ) ); // bottom right
	v.push( new THREE.Vector3( 0, w, 0 ) ); // bottom left
	f.push( new THREE.Face4( 4, 5, 6, 7 ));
	
	// TOP RIGHT CORNER
	v.push( new THREE.Vector3( len - w, 0, 0 ) ); // top left
	v.push( new THREE.Vector3( len, 0, 0 ) ); // top right
	v.push( new THREE.Vector3( len, h, 0 ) ); // bottom right
	v.push( new THREE.Vector3( len - w, h, 0 ) ); // bottom left
	f.push( new THREE.Face4( 8, 9, 10, 11 ) );
	
	v.push( new THREE.Vector3( len - h, h, 0 ) ); // top left
	v.push( new THREE.Vector3( len, h, 0 ) ); // top right
	v.push( new THREE.Vector3( len, w, 0 ) ); // bottom right
	v.push( new THREE.Vector3( len - h, w, 0 ) ); // bottom left
	f.push( new THREE.Face4( 12, 13, 14, 15 ) );
	
	// BOTTOM RIGHT CORNER
	v.push( new THREE.Vector3( len - w, len - h, 0 ) ); // top left
	v.push( new THREE.Vector3( len, len - h, 0 ) ); // top right
	v.push( new THREE.Vector3( len, len, 0 ) ); // bottom right
	v.push( new THREE.Vector3( len - w, len, 0 ) ); // bottom left
	f.push( new THREE.Face4( 16, 17, 18, 19 ) );
	
	v.push( new THREE.Vector3( len - h, len - w, 0 ) ); // top left
	v.push( new THREE.Vector3( len, len - w, 0 ) ); // top right
	v.push( new THREE.Vector3( len, len - h, 0 ) ); // bottom right
	v.push( new THREE.Vector3( len - h, len - h, 0 ) ); // bottom left
	f.push( new THREE.Face4( 20, 21, 22, 23 ) );
	
	// BOTTOM LEFT CORNER
	v.push( new THREE.Vector3( 0, len - h ) ); // top left
	v.push( new THREE.Vector3( w, len - h ) ); // top right
	v.push( new THREE.Vector3( w, len, 0 ) ); // bottom right
	v.push( new THREE.Vector3( 0, len, 0 ) ); // bottom left
	f.push( new THREE.Face4( 24, 25, 26, 27 ) );
	
	v.push( new THREE.Vector3( 0, len - w ) ); // top left
	v.push( new THREE.Vector3( h, len - w ) ); // top right
	v.push( new THREE.Vector3( h, len - h, 0 ) ); // bottom right
	v.push( new THREE.Vector3( 0, len - h, 0 ) ); // bottom left
	f.push( new THREE.Face4( 28, 29, 30, 31 ) );
	
	geo.applyMatrix( new THREE.Matrix4(
		1, 0, 0, 0,
		0, 0, 1, 0,
		0, 1, 0, 0,
		0, 0, 0, 1
	) );
	
	this.coordinatePointer = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
		color: 0x2ddb9d,
		opacity: 0.5,
		transparent: true,
		side: THREE.DoubleSide
	}));

	this.registerWorldComponent(MapLoader.WorldMesh.COORDPOINTER, this.coordinatePointer);

};

MapLoader.FogFarLimit = 1200;

MapLoader.prototype.setupWorldLighting = function() {
	
	/* Ambient lighting */
	
	this.ambientLight = new THREE.AmbientLight(0xffffff);
	
	this.ambientLight.color = (new THREE.Color).setRGB(
		Math.min(1.0, 0.75 * this.rswFileObject.header.diffuseCol[0] + 0.75 * this.rswFileObject.header.ambientCol[0]),
		Math.min(1.0, 0.75 * this.rswFileObject.header.diffuseCol[1] + 0.75 * this.rswFileObject.header.ambientCol[1]),
		Math.min(1.0, 0.75 * this.rswFileObject.header.diffuseCol[2] + 0.75 * this.rswFileObject.header.ambientCol[2])
	);
	
	this.scene.add(this.ambientLight);
	
	/* Directional lighting */
	
	var diffuseColor = ( ( Math.round( 255 * this.rswFileObject.header.diffuseCol[0] ) << 16 )
					+( Math.round( 255 * this.rswFileObject.header.diffuseCol[1] ) << 8 )
					+( Math.round( 255 * this.rswFileObject.header.diffuseCol[2] ) ) );
	
	var directionalLight = new THREE.DirectionalLight(0xffffff, -1.0);
	
	var r = new THREE.Matrix4();
	
	var rx = new THREE.Matrix4();
	var ry = new THREE.Matrix4();
	var s = new THREE.Matrix4();
	
	rx.makeRotationX(this.rswFileObject.header.lightLatitude * Math.PI / 180);
	ry.makeRotationY(this.rswFileObject.header.lightLongitude * Math.PI / 180);
	
	//ry.makeRotationY(3 + this.rswFileObject.header.lightLongitude * Math.PI / 180);
	
	r.multiply(rx);
	r.multiply(ry);
	
	directionalLight.position.applyMatrix4(r).multiplyScalar(-1).normalize();
	
	//directionalLight.position.set(re[1] + re[3], re[5] + re[7], re[9] + re[11]).normalize();
	//directionalLight.position.set(1, 1, 1).normalize();
	
	this.scene.add(directionalLight);
	
	// Fog
		
	if(this.getMapName() in FogParameterTable) {
		
		console.log("Info: Adding fog ...");
		
		var fogParam = FogParameterTable[this.getMapName()];
		
		this.fogFar = fogParam[1] * MapLoader.FogFarLimit;
		this.fogNear = fogParam[0] * MapLoader.FogFarLimit;
		
		this.scene.fog = new THREE.Fog( fogParam[2], this.fogNear, this.fogFar );
		//scene.fog = new THREE.FogExp2( 0x660000, 0.0003 * 0xff / 255 );
		
	}
	
	//var directionalLight = new THREE.DirectionalLight(0xffffff);
    //directionalLight.position.set(1, 1, 1).normalize();
    //this.scene.add(directionalLight);
	
	
};

var BoundingBox = function() {
	this.max = new THREE.Vector3(-9999, -9999, -9999);
	this.min = new THREE.Vector3(9999, 9999, 9999);
};

BoundingBox.prototype.setMax = function(v) {
	this.max.max(v);
};

BoundingBox.prototype.setMin = function(v) {
	this.min.min(v);
};

BoundingBox.prototype.__defineGetter__("offset", function() {
	return this.max.clone().add(this.min).divideScalar(2);
});

BoundingBox.prototype.__defineGetter__("range", function() {
	return this.max.clone().sub(this.min).divideScalar(2);
});

BoundingBox.prototype.__defineGetter__("center", function() {
	return this.min.clone().add(this.range);
});


MapLoader.prototype.rsmMeshNodeCalculateBoundingBox = function(rsmNode, base_matrix) {
	
	var matrix = base_matrix.clone();
	
	var translation = (new THREE.Matrix4).makeTranslation(rsmNode.translation[0], rsmNode.translation[1], rsmNode.translation[2]);
	var rotation = (new THREE.Matrix4).makeRotationAxis(new THREE.Vector3(rsmNode.rotaxis[0], rsmNode.rotaxis[1], rsmNode.rotaxis[2]), rsmNode.rotangle);
	var scale = (new THREE.Matrix4).makeScale(rsmNode.scale[0], rsmNode.scale[1], rsmNode.scale[2]);
	var offsetTranslation = (new THREE.Matrix4).makeTranslation(rsmNode.offsetTranslation[0], rsmNode.offsetTranslation[1], rsmNode.offsetTranslation[2]);
	
	matrix.multiply(translation);
	
	if(rsmNode.rotKeyFrameCount == 0) {
		matrix.multiply(rotation);
	} else {
		// TODO: Animation with quaternion
		matrix.multiply((new THREE.Matrix4).makeRotationFromQuaternion(
			new THREE.Quaternion(
				rsmNode.rotKeyFrame[0].orientation[0],
				rsmNode.rotKeyFrame[0].orientation[1],
				rsmNode.rotKeyFrame[0].orientation[2],
				rsmNode.rotKeyFrame[0].orientation[3]
			).normalize()
		));
	}
	
	matrix.multiply(scale);
	
	// Matrix is not global matrix
	rsmNode.globalMatrix = matrix.clone();
	
	if(!rsmNode.only) {
		// Only apply offset translation if this is the only node!
		matrix.multiply(offsetTranslation);
	}
		
	var m = rsmNode.offsetMatrix;
	
	var nodeTransf = new THREE.Matrix4(
		m[0], 	m[3], 	m[6], 	0,
		m[1], 	m[4], 	m[7], 	0,
		m[2], 	m[5], 	m[8], 	0,
		0, 		0, 		0, 		1
	);
	
	matrix.multiply(nodeTransf);
	
	rsmNode.localMatrix = matrix.clone();
	
	var box = new BoundingBox();
	
	for(var i = 0; i < rsmNode.vertices.length; i++) {
		
		var v = (new THREE.Vector3(
			rsmNode.vertices[i][0],
			rsmNode.vertices[i][1],
			rsmNode.vertices[i][2]
		)).applyMatrix4(matrix);
		
		box.setMin(v);
		box.setMax(v);
		
	}
	
	rsmNode.box = box;

	for(var i = 0; i < rsmNode.children.length; i++) {
		this.rsmMeshNodeCalculateBoundingBox(rsmNode.children[i], rsmNode.globalMatrix);
	}
	
};

MapLoader.prototype.rsmMeshCalculateBoundingBox = function(rsmFile) {
	
	var box = new BoundingBox();
	
	// Calcualte all the bounding boxes of all nodes
	this.rsmMeshNodeCalculateBoundingBox(rsmFile.mainNode, new THREE.Matrix4);
	
	// Set RSM bounding box based on node boxes
	for(var i in rsmFile.nodes) {
		var node = rsmFile.nodes[i];
		box.setMax(node.box.max);
		box.setMin(node.box.min);
	}
	
	rsmFile.box = box;
	
	//if(rsmFile.box.max.x < -1000 || rsmFile.box.min.x > 1000) {
	//	console.warn("Strange bounding box?", rsmFile.box);
	//}
	
}

MapLoader.prototype.createRsmMesh = function(rsmFile, rsmNode) {
	
	var geometry;
	
	var geometryIdentifier = rsmFile.header.name + "_" + rsmNode.name;
	
	if(this._rsmNodeGeometries.has(geometryIdentifier)) {
	
		geometry = this._rsmNodeGeometries.get(geometryIdentifier);
	
	} else {
	
	
	var geometry = new THREE.Geometry();
	
	// Calculate
	
	//console.log(rsmFile, rsmNode);
	
	// Add vertices
	for(var i = 0; i < rsmNode.vertices.length; i++) {
		geometry.vertices.push(new THREE.Vector3(
			rsmNode.vertices[i][0],
			rsmNode.vertices[i][1],
			rsmNode.vertices[i][2]
		));
	}
	
	// Add faces
	//console.log(rsmNode.faces.length);
	
	for(var i = 0; i < rsmNode.faces.length; i++) {
		
		var fData = rsmNode.faces[i]; // RSM rsmNode face data
		var vId = fData.vertIndex; // Vertex indices
		var tvId = fData.tVertIndex; // Texture vertex indices
		var vNorm = fData.vertexNormals;// Vertex normals
		
		// Set UVs from atlas texture
		
		// atlas texture data from maploader : aId, offset, size
		var atlasData = this.rsmAtlasObject.data.get(rsmFile.textureNames[rsmNode.textures[fData.materialId]]); 
		
		if(!atlasData) {
			
			//continue;
			// Don't continue, or else face indices gets screwed up later
			
			geometry.faceVertexUvs[0].push([
				new THREE.Vector2(0, 0),
				new THREE.Vector2(0, 0),
				new THREE.Vector2(0, 0)
			]);
			
			geometry.faces.push(new THREE.Face3(0, 0, 0, null, null, 0));
			
		} else {
		
			var atlasId = atlasData.aId;
			var uvs = rsmNode.tVertices; // RSM base UVs : color, u, v
			var i1 = tvId[0], i2 = tvId[1], i3 = tvId[2]; // RSM rsmNode UV indices
			var offset = atlasData.offset; // UV offset in atlas texture
			var size = atlasData.size; // UV length in atlas texture
			
			// a, b, c, color, normal, materialIndex
			var face = new THREE.Face3(vId[0], vId[1], vId[2], null, null, atlasId);
			
			if(!this.rsmAtlasObject.materials[atlasId]) {
				// Material missing. This really shouldn't happen!
				console.error("Missing texture for atlas ID " + atlasId);
			}
			
			//face.vertexNormals = [new THREE.Vector3, new THREE.Vector3, new THREE.Vector3];
			//face.normal = new THREE.Vector3;
			
			geometry.faceVertexUvs[0].push([
				new THREE.Vector2(offset.x + size.x * uvs[i1][1], offset.y + size.y * uvs[i1][2]),
				new THREE.Vector2(offset.x + size.x * uvs[i2][1], offset.y + size.y * uvs[i2][2]),
				new THREE.Vector2(offset.x + size.x * uvs[i3][1], offset.y + size.y * uvs[i3][2])
			]);
			
			geometry.faces.push(face);
		
		}
		
		
	}
	
	//var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(this.rsmAtlasObject.materials));
	
	var matrix = new THREE.Matrix4;
	
	matrix.multiply((new THREE.Matrix4).makeTranslation(
		-rsmFile.box.center.x,
		-rsmFile.box.max.y,
		-rsmFile.box.center.z
	));
	
	matrix.multiply(rsmNode.globalMatrix);
	
	if(!rsmNode.only) {
		// Only apply offset translation if this is not the only node
		matrix.multiply((new THREE.Matrix4).makeTranslation(
			rsmNode.offsetTranslation[0], 
			rsmNode.offsetTranslation[1], 
			rsmNode.offsetTranslation[2]
		));
	}
	
	var m = rsmNode.offsetMatrix;
	
	matrix.multiply(new THREE.Matrix4(
		m[0], 	m[3], 	m[6], 	0,
		m[1], 	m[4], 	m[7], 	0,
		m[2], 	m[5], 	m[8], 	0,
		0, 		0, 		0, 		1
	));
		
	/* Setup face and vertex normals */
	
	//geometry.computeFaceNormals();
	
	// Setup the smoothing groups
	
	//var faceVertexNormalGroups = Array(32);
	
	//for(var i = 0; i < rsmNode.faces.length; i++) {
	
	//	var groupId = rsmNode.faces[i].smoothGroup;
	
	//	if(!(faceVertexNormalGroups[groupId] instanceof Array))
	//		faceVertexNormalGroups[groupId] = [];
	
	//	faceVertexNormalGroups[groupId].push(i);
	
	//}
	
	// Push face normals to lists for vertex normals by smooth group
	
	/*
	
	var vertexNormalGroups = Array(rsmNode.vertices.length);
	
	for(var i = 0; i < rsmNode.faces.length; i++) {
	
		var faceData = rsmNode.faces[i];
		var face = geometry.faces[i];
		
		for(var j = 0; j < 3; j++) {
			
			var vId = faceData.vertIndex[j];
			
			if(!(vertexNormalGroups[vId] instanceof Array))
				vertexNormalGroups[vId] = Array(32);
			
			if(!(vertexNormalGroups[vId][faceData.smoothGroup] instanceof Array))
				vertexNormalGroups[vId][faceData.smoothGroup] = [];
			
			vertexNormalGroups[vId][faceData.smoothGroup].push(face.normal);
			
		}
		
	}
	
	//console.log(vertexNormalGroups);
	//throw "fuck";
	
	// Compute vertex normals as sum of average of face normal groups
	
	var vertexNormals = Array(rsmNode.vertices.length);
	
	for(var i = 0; i < rsmNode.vertices.length; i++) {
		
		var groups = vertexNormalGroups[i];
		var normal = new THREE.Vector3();
		
		if(!(groups instanceof Array)) {
			vertexNormals[i] = normal;
			continue;
		}
		
		for(var j = 0; j < groups.length; j++) {
			
			var group = groups[j];
			
			if(!(group instanceof Array))
				continue;
			
			var groupAvg = new THREE.Vector3();
			
			for(var k = 0; k < group.length; k++) {
				groupAvg.add(group[k]);
			}
			
			//groupAvg.divideScalar(group.length);
			normal.add(groupAvg);
			
		}
		
		normal.normalize();
		
		vertexNormals[i] = normal;
		
	}
	
	// Set faces vertex normals from vertex normals
	
	for(var i = 0; i < geometry.faces.length; i++) {
		
		var face = geometry.faces[i];
		
		face.vertexNormals = [ new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3() ];
		
		face.vertexNormals[ 0 ].copy( vertexNormals[ face.a ] );
		face.vertexNormals[ 1 ].copy( vertexNormals[ face.b ] );
		face.vertexNormals[ 2 ].copy( vertexNormals[ face.c ] );
		
	}
	*/
	//geometry.computeVertexNormals();
	
	// Apply transformation last to have affect normals
	geometry.applyMatrix(matrix);
	
	this._rsmNodeGeometries.set(geometryIdentifier, geometry);
	
	}
		
	var outMeshList = [geometry];
	
	for(var i = 0; i < rsmNode.children.length; i++) {
		
		Array.prototype.push.apply(outMeshList, this.createRsmMesh(rsmFile, rsmNode.children[i]));
	}
	
	return outMeshList;
	


};

MapLoader.prototype.createWorldModel = function(rswModelData, rsmFile) {
	
	rsmFile.header.name = rswModelData.name;
	
	var rswMatrix = new THREE.Matrix4;
	
	//#MODEL
	var align = (new THREE.Matrix4).makeScale(1, -1, -1);
	
	var center = (new THREE.Matrix4).makeTranslation(
		this.gndFileObject.header.zoom * this.gndFileObject.width / 2,
		0,
		this.gndFileObject.header.zoom * this.gndFileObject.height / 2
	);
	
	var translation = (new THREE.Matrix4).makeTranslation(
		rswModelData.position[0],	
		rswModelData.position[1], 
		rswModelData.position[2]
	)
	
	var rotationX = (new THREE.Matrix4).makeRotationX(rswModelData.rotation[0] * Math.PI / 180);
	var rotationY = (new THREE.Matrix4).makeRotationY(rswModelData.rotation[1] * Math.PI / 180);
	var rotationZ = (new THREE.Matrix4).makeRotationZ(rswModelData.rotation[2] * Math.PI / 180);
	
	var scale = (new THREE.Matrix4).makeScale(rswModelData.scale[0], rswModelData.scale[1], rswModelData.scale[2]);
	
	rswMatrix.multiply(align);
	rswMatrix.multiply(center);
	rswMatrix.multiply(translation);
	rswMatrix.multiply(rotationZ);
	rswMatrix.multiply(rotationX);
	rswMatrix.multiply(rotationY);
	rswMatrix.multiply(scale);
	
	// Calculate bounding box
	if(!rsmFile.box)
		this.rsmMeshCalculateBoundingBox(rsmFile);
	
	var meshes = this.createRsmMesh(rsmFile, rsmFile.mainNode);
	
	//var a = (new THREE.Matrix4).makeTranslation(Math.random() * 10000, 0, - 100 - Math.random() * 10000);
	
	for(var i = 0; i < meshes.length; i++) {
		
		meshes[i].applyMatrix(rswMatrix);
		
		//meshes[i].computeFaceNormals();
		//meshes[i].computeVertexNormals();
		
		//this.scene.add(new THREE.Mesh(
		//	meshes[i],
		//	new THREE.MeshFaceMaterial(this.rsmAtlasObject.materials)
		//));
		
		THREE.GeometryUtils.merge(this.staticResourceGeometry, meshes[i]);
	}
	
	if(MapLoader.DEBUG.DisplayBoundingBox) {
		var geometry = new THREE.CubeGeometry( 
			rsmFile.box.max.x - rsmFile.box.min.x, // width
			rsmFile.box.max.y - rsmFile.box.min.y, // height
			rsmFile.box.max.z - rsmFile.box.min.z, // depth
			1, // widthSegments
			1, // heightSegments
			1 // depthSegments
		);
		
		geometry.dynamic = false;
		
		// !! THIS IS THE BOUNDING BOX; STOP WORKING HERE !!
		geometry.applyMatrix(rswMatrix.clone().multiply((new THREE.Matrix4).makeTranslation(
			-rsmFile.box.center.x,
			-rsmFile.box.max.y,
			-rsmFile.box.center.z
		)));
		// !! THIS IS THE BOUNDING BOX; STOP WORKING HERE !!
		THREE.GeometryUtils.merge(this.staticBoxGeo, geometry);
		// !! THIS IS THE BOUNDING BOX; STOP WORKING HERE !!
	}
	
	
};

MapLoader.DEBUG = {
	DisplayBoundingBox: false // Display bounding box for models
};

MapLoader.prototype.setupModels = function() {
	
	// Temporary holder
	this._rsmNodeGeometries = new Map();
	
	this.staticResourceGeometry = new THREE.Geometry();
	this.staticResourceGeometry.dynamic = false;
	
	this.staticBoxGeo = new THREE.Geometry();
	this.staticBoxGeo.dynamic = false;
	
	for(var i = 0; i < this.rswFileObject.objects.length; i++) {
		
		//console.log(this.rswFileObject.objects.);
		
		var obj = this.rswFileObject.objects[i];
		
		if(obj.type == 1) {
			
			this.createWorldModel(obj, this.rsmFileObjects.get(obj.modelName));
		}
	}
	
	//this.staticResourceGeometry.mergeVertices();
	//this.staticResourceGeometry.computeCentroids();
	this.staticResourceGeometry.computeFaceNormals();
	
	/* Use for smooth shading */
	//this.staticResourceGeometry.computeVertexNormals();
	
	var rsModelStaticMesh = new THREE.Mesh(
		this.staticResourceGeometry, 
		new THREE.MeshFaceMaterial(this.rsmAtlasObject.materials)
	);
	
	this.registerWorldComponent(MapLoader.WorldMesh.MODEL, rsModelStaticMesh);
	
	this.scene.add(rsModelStaticMesh);
	
	if(MapLoader.DEBUG.DisplayBoundingBox) {
		this.scene.add(new THREE.Mesh(
			this.staticBoxGeo, 
			new THREE.MeshBasicMaterial({
				wireframe: true,
				color: 0xff0000
			})
		));
	}
	
	//RsmMesh(new RSM(data));
	
}

MapLoader.prototype.setupWorld = function() {


	// Create ground from GND structure
	this.createGround();
	
	//Tick("Creating ground");
	
	// Create the coordinate pointer
	this.createCoordinatePointer();
	
	//Tick("Creating coordinate pointer");
	
	this.scene.add(this.coordinatePointer);
	
	this.setupWorldLighting();

	//Tick("Creating world lighting");
	
};

MapLoader.prototype.setupScene = function() {

	console.log('Loading scene!');
	
	var width = window.innerWidth;
	var height = window.innerHeight;
	
	var renderer = this.renderer = new THREE.WebGLRenderer({
		antialias: true
	});
	
	var scene = this.scene = new THREE.Scene();
	
	var camera = this.camera = new THREE.PerspectiveCamera( MapLoader.CameraFOV, width / height, 0.1, 10000 );
	
	renderer.setClearColor(0x000000);
	
	renderer.setSize(width, height);
	
	// Target for color picking
	this.colorPickingRenderTarget = new THREE.WebGLRenderTarget(width, height);
	this.colorPickingRenderTarget.generateMipmaps = false;
	
	// Little helper!
	var a = new THREE.AxisHelper();
	a.scale = new THREE.Vector3(100, 100, 100);
	scene.add(a);
	
};


MapLoader.prototype.setMousePosition = function(x, y) {

	this.mouse2.x = x;
	this.mouse2.y = y;

	this.mouse3.x = (x / this.renderer.domElement.width) * 2 - 1;
	this.mouse3.y = -(y / this.renderer.domElement.height) * 2 + 1;

};


MapLoader.prototype.positionToMapCoordinate = function(v) {
	return new THREE.Vector2(
		(v.x / this.gndFileObject.header.zoom) << 0,
		(-v.z / this.gndFileObject.header.zoom) << 0
	);
};

MapLoader.prototype.mapCoordinateToPosition = function(x, y) {
	return new THREE.Vector3(
		(x << 0) * this.gndFileObject.header.zoom,
		0,
		-((y << 0) + 1.0 ) * this.gndFileObject.header.zoom
	);
};

MapLoader.prototype.mapCoordinateToPosition2 = function(x, y) {
	return new THREE.Vector3(
		x/2 * this.gndFileObject.header.zoom,
		0,
		-(y/2+1) * this.gndFileObject.header.zoom
	);
};

MapLoader.prototype.getGatTileLightLevel = function(x, y) {
	
	var gnd_x = Math.round(x / 2);
	var gnd_y = Math.round(y / 2);
	
	var gnd_height = this.gndFileObject.getTileAvgHeight(gnd_x, gnd_y);
	var gat_height = this.gatFileObject.getBlockAvgDepth(x, y);
	
	if(Math.abs(gnd_height - gat_height) > 2.5) {
		//console.log("no cigar", Math.abs(gnd_height - gat_height));
		return 1.0;
	}
	
	return this.gndFileObject.getTileLightLevel(gnd_x, gnd_y);
};

MapLoader.prototype.registerEntity = function(id, entity) {

	if(this.entities.has(entity)) {
		console.warn("MapLoader: Attempt to re-register entity");
		return false;
	}
	
	this.entities.set(id, entity);
	
};

MapLoader.prototype.getEntity = function(id) {
	
	return this.entities.get(id);
	
};

MapLoader.prototype.releaseEntity = function(id) {

	// TODO remove from entity map

	return this.entities.delete(id);

};

MapLoader.prototype.updateEntityGatPosition = function(obj, x, y, lastX, lastY) {
	
	x = Math.round(x);
	y = Math.round(y);
	lastX = Math.round(lastX);
	lastY = Math.round(lastY);
	
	var id = 'x' + x + 'y' + y;
	var lid = 'x' + lastX + 'y' + lastY;
	
	if(this.entityMap.has(lid)) {
		var objs = this.entityMap.get(lid);
		var idx = objs.indexOf(obj);
		if(idx > -1) {
			objs.splice(idx, 1);
			// Is this needed?
			this.entityMap.set(lid, objs);
		}
	}
	
	if(this.entityMap.has(id)) {
		var objs = this.entityMap.get(id);
		var idx = objs.indexOf(obj);
		if(idx < 0) {
			objs.push(obj);
			this.entityMap.set(id, objs);
		}
	} else {
		var objs = [obj];
		this.entityMap.set(id, objs);
	}
	
};

MapLoader.prototype.getEntitiesGatPosition = function(x, y) {

	x = Math.round(x);
	y = Math.round(y);
	
	var id = 'x' + x + 'y' + y;

	if(this.entityMap.has(id)) {
		return this.entityMap.get(id);
	}
	
	return null;
};

MapLoader.CameraFOV = 15;

MapLoader.CameraDistanceZ = 182;
MapLoader.CameraDistanceXYRatio = 0.99;

MapLoader.CameraDistanceXYZRatio = MapLoader.CameraDistanceZ / MapLoader.CameraDistanceXYRatio;

MapLoader.CTargetShiftMin = 0.9;
MapLoader.CTargetShiftMax = 1.55;

MapLoader.CLerpRatio = 0.06;

MapLoader.CCameraScrollSensitivity = 0.5;

MapLoader.prototype.setCameraPosition = function() {
	
	//this.camera.centerPosition = this.mapCoordinateToPosition2(x, y);
	
	var pos = this.cCameraPosition;
	
	var h = this.cShift * MapLoader.CameraDistanceZ;
	
	this.camera.position = new THREE.Vector3(
		pos.x + h / MapLoader.CameraDistanceXYRatio * Math.cos(this.cRotation),
		h  + pos.y,
		pos.z + h / MapLoader.CameraDistanceXYRatio * Math.sin(this.cRotation)
	);
	
	this.camera.lookAt(pos);
	
};

MapLoader.prototype.updateCameraPosition = function() {
	this.setCameraPosition();
};

MapLoader.prototype.bindCamera = function(object) {
	this.cCameraTarget = object;
	this.cTargetPosition = object.position;
	this.cCameraPosition.copy(object.position);
};

MapLoader.prototype.start = function() {
	
	
	this.cRotate = false;
	this.cRotation = Math.PI/2;
	this.cRotationSpeed = 0;
	this.cShift = MapLoader.CTargetShiftMin;
	this.cTargetShift = 1.0;
	this.cLastPos = null;
	
	this.cDeltaCutoff = 0.0025;
	
	var startX = 10 * this.gatFileObject.width / 2 << 0;
	var startY = 10 * this.gatFileObject.height / 2 << 0;
	
	
	this.cCameraPosition = new THREE.Vector3(startX, 0, startY);
	this.cTargetPosition = new THREE.Vector3(startX, 0, startY);
	
	this.camera.centerPosition = this.cCameraPosition;
	
	var coord = this.positionToMapCoordinate(this.cTargetPosition.x, this.cTargetPosition.y);
	
	this.cTargetHeight = this.gatFileObject.getBlockAvgDepth(coord.x, coord.y);
	this.cHeight = this.cTargetHeight;
	
	this.cCameraTarget = null;
	
//if(false){//if-false
	
	document.body.oncontextmenu = function(e) {
		e.stopPropagation();
		return false;
	}
	
	this.CRotDampening = 0.85;
	this.CRotAcceleration = 0.15;
	
	
	var cameraUpdate = (function(dt) {
	
		if(this.cCameraTarget) {
		
			var dr = dt / 10;
		
			this.cTargetHeight = -this.gatFileObject.getBlockAvgDepth(this.cCameraTarget.gatPosition.x, this.cCameraTarget.gatPosition.y);
			
			//this.cHeight += (this.cTargetHeight - this.cHeight) * 0.05;
			this.cRotationSpeed = this.CRotDampening * this.cRotationSpeed;
			this.cRotation += dr * this.cRotationSpeed;
			
			var cPosXDt = (this.cTargetPosition.x - this.cCameraPosition.x) * MapLoader.CLerpRatio;
			var cPosYDt = (this.cTargetHeight - this.cCameraPosition.y) * MapLoader.CLerpRatio;
			var cPosZDt = (this.cTargetPosition.z - this.cCameraPosition.z) * MapLoader.CLerpRatio;
			
			this.cCameraPosition.x += Math.abs(cPosXDt) > this.cDeltaCutoff ? dr * cPosXDt : 0;
			this.cCameraPosition.y += Math.abs(cPosYDt) > this.cDeltaCutoff ? dr * cPosYDt : 0;
			this.cCameraPosition.z += Math.abs(cPosZDt) > this.cDeltaCutoff ? dr * cPosZDt : 0;
			
			this.cTargetShift = Math.max(
				MapLoader.CTargetShiftMin, 
				Math.min(
					MapLoader.CTargetShiftMax, 
					this.cTargetShift
				)
			);
			
			cameraUpdate
						
			var cShiftDt = (this.cTargetShift - this.cShift) * MapLoader.CLerpRatio;
			this.cShift += Math.abs(cShiftDt) > this.cDeltaCutoff ? dr * cShiftDt : 0;
			
			
			this.updateCameraPosition();
		}
	
	}).bind(this);
	
//}//if-false
	
	
	window.addEventListener('mousewheel', (function(e) {
		
		this.cTargetShift += MapLoader.CCameraScrollSensitivity * e.wheelDeltaY / this.renderer.domElement.height;
		
	}).bind(this))
	
	var focusEntityId = -1;
	
	window.addEventListener('mousemove', (function(e) {
	
		this.setMousePosition(e.clientX, e.clientY);
		
		if(this.colorPickingFocusObjectId > 0) {
			
			var entity = this.getEntity(this.colorPickingFocusObjectId);
			
			entity.showNameLabel();
			
			if(focusEntityId > 0 && focusEntityId != this.colorPickingFocusObjectId) {
				this.getEntity(focusEntityId).hideNameLabel();
			}
			
			focusEntityId = this.colorPickingFocusObjectId;
			
		} else if(focusEntityId > 0) {
			this.getEntity(focusEntityId).hideNameLabel();
		}
		
		if(!this.cLastPos) {
			this.cLastPos = new THREE.Vector2(e.clientX, e.clientY);
		} else {
			var now = new THREE.Vector2(e.clientX, e.clientY);
			var delta = now.clone().sub(this.cLastPos);
			this.cLastPos = now;
			
			if(this.cRotate) {
				
				if(e.shiftKey) {
					//this.cShift += 2 * delta.y / this.renderer.domElement.height;
					MapLoader.CameraDistanceXYRatio += 0.5 * delta.y / this.renderer.domElement.height;
					MapLoader.CameraDistanceZ = MapLoader.CameraDistanceXYRatio * MapLoader.CameraDistanceXYZRatio;
					
					//MapLoader.CameraDistanceXYZRatio = MapLoader.CameraDistanceZ / MapLoader.CameraDistanceXYRatio;
				}
				
				//this.cRotation += 2 * Math.PI * delta.x / this.renderer.domElement.width;
				this.cRotationSpeed += 2 * Math.PI * delta.x / this.renderer.domElement.width * this.CRotAcceleration;
				//this.setCameraPosition(this.mouseGatPosition.x, this.mouseGatPosition.y);			
				//this.updateCameraPosition();
			}
		}
	}).bind(this));
	
	window.addEventListener('mouseup', (function(e) {
		
		if(e.button == 0) {			
		} else if(e.button == 2) {
			this.cRotate = false;
		}
		
	}).bind(this));
	

	window.addEventListener('mousedown', (function(e) {
		
		if(e.button == 0) {
		
			// Clicking on a SpriteActor
			if(this.colorPickingFocusObjectId > 0) {
				console.log(this.colorPickingFocusObjectId);
				return;
			}
		
			console.log(this.mouseGatPosition.x, this.mouseGatPosition.y, this.gatFileObject.getBlock(this.mouseGatPosition.x, this.mouseGatPosition.y).type);
			
			//this.setCameraPosition(this.mouseGatPosition.x, this.mouseGatPosition.y);
			//this.updateCameraPosition();
			
			if(false && e.shiftKey) {
				// change position
				//this.cTargetPosition.x = this.mouseGatPosition.x;
				//this.cTargetPosition.y = this.mouseGatPosition.y;
				//this.cTargetHeight = this.gatFileObject.getBlockAvgDepth(this.cTargetPosition.x, this.cTargetPosition.y);
				
				// List entities in 5*5 area
				
				for(var x = -5; x <= 5; x++) {
					for(var y = -5; y <= 5; y++) {
						var d = this.getEntitiesGatPosition(this.mouseGatPosition.x + x, this.mouseGatPosition.y + y);
						if(d instanceof Array && d.length) {
							console.log(this.mouseGatPosition.x + x, this.mouseGatPosition.y + y, d);
						}
					}
				}
				
				
			} else {
				// move camera
				if(this.cCameraTarget != null) {
					
					if(this.gatFileObject.hasProperty(this.mouseGatPosition.x, this.mouseGatPosition.y, GAT.BlockProperties.WALKABLE)) {
						this._fireEvent("OnPCRequestMove", this.mouseGatPosition.clone());
					}
					
					//console.log("Light: " + this.getGatTileLightLevel(this.mouseGatPosition.x, this.mouseGatPosition.y));
					
					if(e.shiftKey) {
						// Teleport
						this.cCameraTarget.SetGatPosition(this.mouseGatPosition.x, this.mouseGatPosition.y);
					} else {
						// Walk to position
						this.cCameraTarget.MoveToGatPosition(this.mouseGatPosition.x, this.mouseGatPosition.y);
					}
					
				}
			}
			
		} else if(e.button == 2) {
			this.cRotate = true;
		}
		
	}).bind(this));


	// Append to DOM
	document.body.appendChild(this.renderer.domElement);

	console.log("Starting to render " + this.worldResourceName);
	
	this.running = true;
	
	var last = Date.now();
	var ref = this;
	
	var projector = new THREE.Projector();
	var ray = new THREE.ReusableRay();
	var direction = new THREE.Vector3();
	
	// Start the mouse picking
	
	this.mousePickingIntervalKey = setInterval((function() {
		
		direction.x = this.mouse3.x;
		direction.y = this.mouse3.y;
		direction.z = 1.0;
		
		projector.unprojectVector(direction, this.camera);
		
		direction.sub(this.camera.position);
		direction.normalize();
		
		ray.setSource(this.camera.position, direction);
		
		var start = ray.origin;
		var unit = ray.direction;
		
		// Max test iterations
		var max = 500 * this.cShift;
		
        var cx = -1;
        var cz = -1;
        var c2x = 0;
        var c2z = 0;
        
		for (var i = 0 ; i < max ; i++) {
             
             var cpt = new THREE.Vector3(
				start.x + unit.x * i,
				start.y + unit.y * i,
				start.z + unit.z * i
             );
             
             cx = (cpt.x / this.gndFileObject.header.zoom) << 0;
             cz = (cpt.z / -this.gndFileObject.header.zoom) << 0;
             c2x = (cpt.x / this.gndFileObject.header.zoom) - cx;
             c2z = (cpt.z / -this.gndFileObject.header.zoom) - cz;
             
             var tile = this.gatFileObject.getBlock(2*cx, 2*cz);
             
             if( tile ) {
				var h = - this.gatFileObject.getBlockAvgDepth( 2*cx, 2*cz );
				if( Math.abs(h - cpt.y) < 0.5)
					break;
             }
        }
         
        var x = 2*cx;
        var z = 2*cz - 1;
         
		// Adjust for error margin
		if( Math.abs(c2x) > 0.5 ) x += 1;
		if( Math.abs(c2z) > 0.5 ) z += 1;
		
		this.mouseGatPosition.x = x;
		this.mouseGatPosition.y = z + 1;
		
		// Mouse pick entities in position
		//var entities = [];
		var intersections = [];
		
		if(false) {
		
		for(var dx = -5; dx <= 5; dx++) {
			for(var dy = -5; dy <= 5; dy++) {
				var entities = this.getEntitiesGatPosition(this.mouseGatPosition.x + dx, this.mouseGatPosition.y + dy);
				if(entities instanceof Array && entities.length) {
					//console.log(this.mouseGatPosition.x + x, this.mouseGatPosition.y + y, d);
					//Array.prototype.push.apply(entities, d);
					
					for(var i = 0; i < entities.length; i++) {
						var entity = entities[i];
						var distance = ray.distanceFromIntersection(ray.origin, ray.direction, entity.position);
						if(distance < 10.0) {
							//console.log(entity);
						}
					}
					
					
				}
			}
		}
		
		}
		
		//var intersects = ray.intersectObjects(entities);
		
		//if(intersects.length > 0) {
		//	console.log(intersects);
		//}
		
		// Set coordinate pointer		
		if(this.gatFileObject.getBlock(this.mouseGatPosition.x, this.mouseGatPosition.y)) {
			
			if(!this.gatFileObject.hasProperty(
				this.mouseGatPosition.x, 
				this.mouseGatPosition.y, 
				GAT.BlockProperties.WALKABLE
			))
				return;
			
			this.coordinatePointer.position = this.mapCoordinateToPosition2(x, z);
			
			// Adjust so it's a little above ground :)
			this.coordinatePointer.position.y -= this.gatFileObject.getBlockAvgDepth(this.mouseGatPosition.x, this.mouseGatPosition.y) - 0.5;
			
			//coordPointer.geometry.vertices[0].y = -tile.lowerLeftHeight; // top left
			//coordPointer.geometry.vertices[1].y = -tile.lowerRightHeight; // top right
			//coordPointer.geometry.vertices[2].y = -tile.upperRightHeight; // bottom left
			//coordPointer.geometry.vertices[3].y = -tile.upperLeftHeight; // bottom right
			//coordPointer.geometry.verticesNeedUpdate = true;
		 }
		
	}).bind(this), this.mousePickingInterval);
	
	
	// Add camera
	
	//var controls = new THREE.CustomControls(this.camera, document);
	//controls.movementSpeed = 40;
	
	// Start the animation loop
	
	var lastColorPick = Date.now();
	var colorPick = true;
	
	(function animate() {
		
		var now = Date.now()
		var dt = now - last;
		//controls.update( dt*0.01 );
		last = now;
		
		if(ref.running) {
			
			cameraUpdate(dt);
			
			ref.renderer.render(ref.scene, ref.camera);
			
			if(colorPick && now - lastColorPick >= ref.colorPickingInterval) {
			
				//console.log("color picking");
			
				mapLoader.setWorldDisplay(false); // hide all world objects
				THREE.Sprite.PickingMode = 1; // uuugh -_-"
				
				var gl = ref.renderer.getContext();
				
				ref.renderer.render(ref.scene, ref.camera, ref.colorPickingRenderTarget);
				
				var u32 = new Uint8Array(4);
				
				// #ICEICE PICK
				gl.readPixels(
					ref.mouse2.x, 
					ref.colorPickingRenderTarget.height - ref.mouse2.y,
					1, 1, 
					gl.RGBA, 
					gl.UNSIGNED_BYTE, 
					u32
				);
				
				var id = (u32[0] << 16) | (u32[1] << 8) | (u32[2]);
				
				ref.colorPickingFocusObjectId = id;
				
				mapLoader.setWorldDisplay(true); // restore world objects
				THREE.Sprite.PickingMode = 0;
				
				lastColorPick = now;
			}
			
			
			requestAnimationFrame(animate);
		}
		
	})();

};

MapLoader.prototype.stop = function() {
	
	// Stop running the animation loop
	this.running = false;
	
	if(this.mousePickingIntervalKey)
		clearInterval(this.mousePickingIntervalKey);
	
	document.body.removeChild(this.renderer.domElement);
	
};

MapLoader.prototype.switchMap = function(mapName) {
	
	var ref = this;
	
	ref.stop();
	ref.loadMap(mapName).then(function() {
		console.log("MAP LOADED; READY TO START");
		ref.start();
	});
	
};


function Tick(msg, id) {
	id = id || 0;
	if(Tick.time[id]) {
		console.warn("(Time) " + msg + ": " + (Date.now() - Tick.time[id]) + "ms");
	}
	Tick.time[id] = Date.now();
}

Tick.time = [];

MapLoader.prototype._setFogFar = function(value) {
	if(!this.scene || !this.scene.fog) {
		return false;
	}
	this.scene.fog.far = value;
	return true;
};

MapLoader.prototype.fogOn = function() {
	return this._setFogFar(this.fogFar);
};

MapLoader.prototype.fogOff = function() {
	return this._setFogFar(2e32); // far, far away!
};

MapLoader.prototype.__defineGetter__("screen", function() {
	return {
		width: this.renderer.domElement.width,
		height: this.renderer.domElement.height
	};
});

MapLoader.prototype.loadMap = function(worldResourceName) {
	
	this.setupScene();
	
	this.worldResourceName = worldResourceName;
	
	Tick();
	
	// Guess file names and start loading instead of waiting for 
	// header data from RSW ...
	var gndName = this.worldResourceName.replace(/rsw$/, "gnd");
	var gatName = this.worldResourceName.replace(/rsw$/, "gat"); 
	
	var loadPromise = new Deferred();
	var loadFilePipe = Deferred();
	var loadBranchMerge = Deferred();
	
	var LOAD_RSM = true;
	
	// Start loading RSW
	
	var rswContentPipe = loadFilePipe.then(ResourceLoader.getRsw(worldResourceName).then(
		(function(data) {
			console.log("Loaded RSW");
			this.rswFileObject = new RSW(data);
		}).bind(this)
	));
	
	// Start loading GND
	loadFilePipe.then(ResourceLoader.getGnd(gndName).then(
		(function(data) {
			console.log('Loaded GND');
			this.gndFileObject = new GND(data);
		}).bind(this)
	));
	
	// Start loading GAT
	var gatLoader = loadFilePipe.then(ResourceLoader.getGat(gatName).then(
		(function(data) {
			console.log('Loaded GAT');
			this.gatFileObject = new GAT(data);
		}).bind(this)
	));
	
	// On RSW loaded
	
	if(LOAD_RSM) {
	
	var rsmContentPipe = rswContentPipe
		.then((function() {
	
			var rsmLoader = Deferred();
			var pipe = new Deferred;
			
			for(var i = 0; i < this.rswFileObject.objects.length; i++) {
						
				if(this.rswFileObject.objects[i].type == 1 ) {
					
					var name = this.rswFileObject.objects[i].modelName;
					
					rsmLoader.then(ResourceLoader.getRsm.bind(this, name)).then(
						(function(thisArg, name) {
							return (function(data) {
								this.rsmFileObjectLoaded++;
								if(!this.rsmFileObjects.has(name)) {
									this.rsmFileObjects.set(name, new RSM(data));
								}
							}).bind(thisArg);
						})(this, name)
					);
				}
				
			}
			
			rsmLoader.finally(function() {
				console.log("All RSMs are loaded!");
				pipe.success(true);
			})
			
			return pipe;
			
		}).bind(this))
		
	}
	
	// On RSW, GND and GAT loaded, branch in
	loadBranchMerge.then(
		loadFilePipe.finally(this.setupWorld.bind(this))
		.then((function() {
			if(LOAD_RSM) {
				return Deferred()
					.then(rsmContentPipe)
					.then(this.setupModelTextures.bind(this))
					.then(this.setupModels.bind(this))
			}
		}).bind(this))
	);
	
	loadBranchMerge.finally((function() {
		
		// Render once to finalize scene in THREE.js
		this.renderer.render(this.scene, this.camera);
		
		// Clear any loading data here
		this.derefTempObjects();
		
		loadPromise.success();
	}).bind(this));
	
	return loadPromise;
	
};

MapLoader.prototype.getMapName = function() {
	return this.worldResourceName;
};