FileManager = {
	
	baseUri: Settings.dataFolderUri,
	
	loadFileAsync: function( path, callback ) {
	
		var xmlhttp = new XMLHttpRequest();
		
		xmlhttp.open( 'GET', FileManager.baseUri + path, true );
		xmlhttp.responseType = 'arraybuffer';
		
		xmlhttp.onreadystatechange = function() {
			if( this.readyState == 4 ) {
				callback( this.response );
			}
		};
		
		xmlhttp.send(null);
	
	},
	
	Types: {
		
	},
	
	spritePath: 'sprite',
	classPath: '인간족',
	bodyPath: '몸통',
	headPath: '머리통',
	headTopPath: '악세사리',
	genderMale: '남',
	genderFemale: '여',
	
	getGenderName: function( sex ) {
		return ( sex == 1 )
			? FileManager.genderMale
			: FileManager.genderFemale;
	},
	
	// job res name
	getClassResName: function( class_id, sex ) {
		
		var resName = ClassResNameTable[ class_id ];
		
		return resName + '_' + FileManager.getGenderName( sex );
		
	},
	
	// job body res path
	getClassBodyResPath: function( class_id, sex ) {
		
		return FileManager.spritePath + '/'
			+ FileManager.classPath + '/'
			+ FileManager.bodyPath + '/'
			+ FileManager.getGenderName( sex ) + '/'
			+ FileManager.getClassResName( class_id, sex );
	},
	
	// hair res name
	getHeadResName: function( head_id, sex ) {
		
		return HeadIdTable[sex][head_id].toString() + '_' + FileManager.getGenderName( sex );
		
	},
	
	// hair res path
	getHeadResPath: function( head_id, sex ) {
		
		return FileManager.spritePath + '/'
			+ FileManager.classPath + '/'
			+ FileManager.headPath + '/'
			+ FileManager.getGenderName( sex ) + '/'
			+ FileManager.getHeadResName( head_id, sex );
	
	},
	
	getAccessoryResName: function( access_id, sex ) {
		
		return FileManager.getGenderName( sex ) + AccessoryNameTable[ access_id ]
		
	},
	
	// view ID res path
	getAccessoryResPath: function( access_id, sex ) {
		
		return FileManager.spritePath + '/'
			+ FileManager.headTopPath + '/'
			+ FileManager.getGenderName( sex ) + '/'
			+ FileManager.getAccessoryResName( access_id, sex );
	},
	
	__cache: new Map(),
	
	getCache: function( path ) {
		if( FileManager.__cache.has( path ) ) {
			return FileManager.__cache.get( path );
		} else {
			return null;
		}
	},
	
	setCache: function( key, data ) {
		FileManager.__cache.set( key, data );
	},
	
	loadSpriteActAsync: function( uri_base, callback ) {
		
		//var uri_base = path + name;
		
		var cacheData = FileManager.getCache( uri_base );
		
		if( cacheData !== null )
			callback( cacheData );
		
		FileManager.loadFileAsync( uri_base + '.spr', function( sprbuf ) {
			
			FileManager.loadFileAsync( uri_base + '.act', function( actbuf ) {
				
				var obj = {
					sprite: new SprParser( sprbuf ), 
					actor: new ActParser( actbuf )
				};
				
				FileManager.setCache( uri_base, obj );
				callback( obj );
				
			});
			
		});
		
	}
	
};