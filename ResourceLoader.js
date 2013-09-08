var ResourceLoader = {};

ResourceLoader.files = new Map();
ResourceLoader.processing = new Map();
ResourceLoader.requests = new Map();

ResourceLoader.baseUrl = Settings.dataFolderUri;

ResourceLoader.useFileSystem = false;
ResourceLoader.useNativeFileSystem = false;

ResourceLoader.fs = null;

if( Settings.standAlone ) {

	ResourceLoader.useNativeFileSystem = true;
	ResourceLoader.nativeFs = require('fs');

}

ResourceLoader.init = function() {
	
	ResourceLoader.ready = new Deferred();
	
	if(window.requestFileSystem) {
		window.requestFileSystem(
			window.TEMPORARY, 
			(1024 + 512) * 1024 * 1024, // 1.5GB
			function(fs) {
				console.log("Info: File system API seems to be available");
				ResourceLoader.useFileSystem = true;
				ResourceLoader.fs = fs;
				ResourceLoader.ready.success(true);
			},
			function() {
				console.warn("Info: File system API not available");
				ResourceLoader.ready.success(false);
			}
		);
	}
	
};

ResourceLoader.init();

ResourceLoader.storeTextureAtlas = function(mapName, index, data) {
	
};

ResourceLoader.removeDirectory = function(dirName) {
	
	return ResourceLoader.getDirectory(dirName).then(function(ret) {
		if(ret !== false) {
			ret.removeRecursively(function() {
				console.log("Removed directory!");
			}, function(e) {
				console.log("Error!", e);
			});
		} else
			console.log("Error getting directory!", ret);
	});
	
};

// Create or get existing directory
ResourceLoader.createDirectory = function(dirName) {
	
	var p = new Deferred();
	
	ResourceLoader.fs.root.getDirectory(
		dirName,
		{ create: true },
		function(dirEntry) {
			p.success(dirEntry);
		},
		function(error) {
			console.log("error!", error);
			p.success(false);
		}
	);
	
	return p;
};

// Get directory if it exists
ResourceLoader.getDirectory = function(dirName) {
	
	var p = new Deferred();
	
	var dirReader = ResourceLoader.fs.root.getDirectory(
		dirName,
		{},
		function(dirEntry) {
			//console.log("Has dir!");
			p.success(dirEntry);
		},
		function(error) {
			console.log("Error!", error);
			p.success(false);
		}
	);
	
	return p;
};

ResourceLoader.getFile = function(dirName, fileName, returnType) {
	
	var p = new Deferred();
	
	ResourceLoader.getDirectory(dirName)
		.then(function(dirEntry) {
			if(dirEntry !== false) {
				dirEntry.getFile(
					fileName, 
					{},
					function(fileEntry) {
						//console.log(fileEntry);
						fileEntry.file(function(file) {
							var reader = new FileReader();
							//console.log("Reading file");
							reader.onloadend = function(e) {
								//console.log("Got the file here!", e.target.result);
								p.success(e.target.result);
							};
							switch(returnType) {
								case 'binarystring': reader.readAsBinaryString(file); break;
								case 'dataurl': reader.readAsDataURL(file); break;
								case 'text': reader.readAsText(file); break;
								case 'arraybuffer': 
								default:
									reader.readAsArrayBuffer(file);
							}
							
						});
					},
					function(error) {
						console.log("Failed to fetch file entry");
						p.success(false)
					}
				);
			} else {
				console.log("Failed to fetch directory entry");
				p.success(false);
			}
		});
	
	return p;
	
};

ResourceLoader.createFile = function(dirName, fileName, fileData, type) {
	
	var p = new Deferred();
	
	ResourceLoader.createDirectory(dirName)
		.then(function(dirEntry) {
			if(dirEntry !== false) {
				dirEntry.getFile(
					fileName, 
					{ create: true },
					function(fileEntry) {
						fileEntry.createWriter(function(fileWriter) {
							fileWriter.onwriteend = function() {
								console.log("Wrote file " + fileName + " to disk");
								p.success(true);
							};
							
							fileWriter.onerror = function() {
								console.log("Writing file failed");
								p.success(false);
							};
							
							var blobEntry;
							
							switch(type) {
								case "text/plain": 
									blobEntry = [fileData];
									break;
								case "application/octet-binary":
								default:
									blobEntry = [new Uint8Array(fileData)];
							}
							
							fileWriter.write(new Blob(
								blobEntry,
								{ type: type }
							));
							
						}, function() {
							console.log("Failed to create file writer");
							p.success(false);
						});
					},
					function(error) {
						console.log("Failed to fetch file entry");
						p.success(false)
					}
				);
			} else {
				console.log("Failed to create directory");
				p.success(false);
			}
		});
	
	return p;
};

ResourceLoader.escapeRemotePath = function(fileName) {
	fileName = fileName.replace("\\", "/");
	var name = "";
	for(var i = 0; i < fileName.length; i++){
		if(fileName.charAt(i) != "/") {
			name += encodeURIComponent(fileName.charAt(i));
		} else {
			name += "/";
		}
	}
	return name;
};

ResourceLoader.getLocalFile = function( fileName ) {

	var filePromise = new Deferred();
	
	var toArrayBuffer = function( buffer ) {
		var ab = new ArrayBuffer(buffer.length);
		var view = new Uint8Array(ab);
		for (var i = 0; i < buffer.length; ++i) {
			view[i] = buffer[i];
		}
		return ab;
	};
	
	ResourceLoader.nativeFs.readFile( ResourceLoader.baseUrl + fileName, undefined, function(err, data) {
		
		if(err != null) {
			console.log( "Error reading local file \"" + fileName + "\"", err, data, typeof data );
			return;
		}
		
		filePromise.success( toArrayBuffer(data) );
		
	});
	
	return filePromise;

};

ResourceLoader.getRemoteFile = function(fileName) {
		
	var item = new Deferred();
	
	if(ResourceLoader.files.has(fileName)) {
		
		item.success(ResourceLoader.files.get(fileName));
		
	} else if(ResourceLoader.processing.has(fileName)) {
		
		var reqs = ResourceLoader.requests.get(fileName);
		reqs.push(item);
		ResourceLoader.requests.set(fileName, reqs);
		
	} else {
	
		ResourceLoader.processing.set(fileName, true);
		ResourceLoader.requests.set(fileName, [item]);
		
		var xmlhttp = new XMLHttpRequest();
		
		xmlhttp.open('GET', ResourceLoader.baseUrl + ResourceLoader.escapeRemotePath(fileName), true);
		xmlhttp.responseType = 'arraybuffer';
		xmlhttp.onreadystatechange = function() {
			
			if( this.readyState == 4 ) {
				
				ResourceLoader.files.set(fileName, this.response);
				var reqs = ResourceLoader.requests.get(fileName);
				
				ResourceLoader.requests.set(fileName, []);				
				
				for(var i = 0; i < reqs.length; i++) {
					reqs[i].success(this.response);
				}
				
				
			}
		}
		
		xmlhttp.send(null);
		
	}
	
	return item;
	
};

ResourceLoader.requestFile = function( name ) {
	
	if( ResourceLoader.useNativeFileSystem ) {
		return ResourceLoader.getLocalFile( name );
	} else {
		return ResourceLoader.getRemoteFile( name );
	}
	
};

ResourceLoader.getRsw = function(rswName) { return ResourceLoader.requestFile(rswName); };
ResourceLoader.getGnd = function(gndName) { return ResourceLoader.requestFile(gndName); };
ResourceLoader.getGat = function(gatName) { return ResourceLoader.requestFile(gatName); };
ResourceLoader.getRsm = function(rsmName) { return ResourceLoader.requestFile("model/" + rsmName); };

ResourceLoader.getSpr = function(spriteName) { return ResourceLoader.requestFile(spriteName); };
ResourceLoader.getAct = function(rsmName) { return ResourceLoader.requestFile(rsmName); };

ResourceLoader.FileType = {
	SPR: 0,
	ACT: 1,
	RSW: 2,
	GAT: 3,
	GND: 4,
	RSM: 5
};

ResourceLoader.FileFormatParser = {};

ResourceLoader.FileFormatParser[ ResourceLoader.FileType.SPR ] = SprParser;
ResourceLoader.FileFormatParser[ ResourceLoader.FileType.ACT ] = ActParser;

ResourceLoader.getBinaryFileData = function(fileType, pathName) {
	
	var fn = null;
	
	switch(fileType) {
		case ResourceLoader.FileType.SPR: fn = ResourceLoader.getSpr; break;
		case ResourceLoader.FileType.ACT: fn = ResourceLoader.getAct; break;
		case ResourceLoader.FileType.RSW: fn = ResourceLoader.getRsw; break;
		case ResourceLoader.FileType.GAT: fn = ResourceLoader.getGat; break;
		case ResourceLoader.FileType.GND: fn = ResourceLoader.getGnd; break;
		case ResourceLoader.FileType.RSM: fn = ResourceLoader.getRsm; break;
	};
	
	if(!fn)
		throw "ResourceLoader: Invalid format type in request for processed file object";
	
	return fn(pathName);
	
};

ResourceLoader._processedFileObjects = new Map();

ResourceLoader.getProcessedFileObject = function(fileType, pathName) {
	
	return ResourceLoader.getBinaryFileData(fileType, pathName)
		
		.then(function(data) {
			
			var fId = fileType + pathName;
			
			if(ResourceLoader._processedFileObjects.has(fId)) {
				return ResourceLoader._processedFileObjects.get(fId);
			}
			
			var parser = ResourceLoader.FileFormatParser[fileType];
			var pfObj = new parser(data);
			
			ResourceLoader._processedFileObjects.set(fId, pfObj);
			
			return pfObj;
			
		});
	
};


ResourceLoader.getSpriteObject = function(spriteName) {
	return ResourceLoader.getSpr();
};

ResourceLoader.getTexture = function(texturePath) {
	return THREE.ImageUtils.loadTexture(ResourceLoader.baseUrl + "texture/" + ResourceLoader.escapeRemotePath(texturePath), {});
};

ResourceLoader.getTextureImage = function(imagePath) {
	
	var q = new Deferred;
	var img = new Image;
	
	img.src = ResourceLoader.baseUrl + "texture/" + ResourceLoader.escapeRemotePath(imagePath);
	
	img.onload = function() {
		q.success(this);
	};
	
	return q;
};