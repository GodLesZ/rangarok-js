function RSM( buffer ) {
	
	var start = (new Date).getTime();
	
	this.header = {
		alpha: 0xff,
		animationLength: -1,
		magic: 'GRSM',
		mainNodeName: null,
		nodeCount: -1,
		shadeType: -1,
		textureCount: -1,
		version: {
			major: -1,
			minor: -1,
			compareTo: function( maj, min ) {
				if( this.major > maj 
				||	( this.major >= maj && this.minor >= min ) ) {
					return 1;
				}
				else if( this.major === maj && this.minor === min ) {
					return 0;
				}
				else return -1;
			},
			toString: function() {
				return this.major + '.' + this.minor;
			},
		}
	};
		
	this.textureNames = [];
	this.nodes = {};
	
	this.parse( buffer );
	
	//this.computeFaceNormals();
	//this.computeVertexNormals();
	
}

RSM.ShadeType = {
	None: 0,
	FlatShading: 1,
	SmoothShading: 2,
	Black: 3
};

RSM.MaxSmoothingGroups = 32;

RSM.prototype = {};

RSM.BoundingBox = function( min, max ) {
	this.min = min ? min : [ +2e32, +2e32, +2e32 ];
	this.max = max ? max : [ -2e32, -2e32, -2e32 ];
	this.offset = [ 0, 0, 0 ];
	this.range = [ 0, 0, 0 ];
}

RSM.BoundingBox.prototype = {
	
	setMin: function( v ) {
		this.min[0] = Math.min( this.min[0], v[0] );
		this.min[1] = Math.min( this.min[1], v[1] );
		this.min[2] = Math.min( this.min[2], v[2] );
	},
	
	setMax: function( v ) {
		this.max[0] = Math.max( this.max[0], v[0] );
		this.max[1] = Math.max( this.max[1], v[1] );
		this.max[2] = Math.max( this.max[2], v[2] );
	},
	
	calculateRange: function() {
		this.range[0] = ( this.max[0] + this.min[0] ) / 2;
		this.range[1] = ( this.max[1] + this.min[1] ) / 2;
		this.range[2] = ( this.max[2] + this.min[2] ) / 2;
	},
	
	calculateOffset: function() {
		this.offset[0] = ( this.max[0] - this.min[0] ) / 2;
		this.offset[1] = ( this.max[1] - this.min[1] ) / 2;
		this.offset[2] = ( this.max[2] - this.min[2] ) / 2;
	}

};

// Find bounding box for a single mesh
RSM.prototype.nodeUpdateBoundingBox = function( node ) {
		
	if( !node.main ) {
		node.box = new RSM.BoundingBox();
	}
	
	function matrix3MultVect3( m, v ) {
		return [ 
			v[0] * m[0] + v[1] * m[3] + v[2] * m[6],
			v[0] * m[1] + v[1] * m[4] + v[2] * m[7],
			v[0] * m[2] + v[1] * m[5] + v[2] * m[8]
		];
	}
	
	for( var i = 0, v; i < node.verticeCount; i++ ) {
		
		v = matrix3MultVect3( node.offsetMatrix, node.vertices[i] );
		
		if( !node.main || node.children.length > 0 ) {
			v[0] += node.offsetTranslation[0] + node.translation[0];
			v[1] += node.offsetTranslation[1] + node.translation[1];
			v[2] += node.offsetTranslation[2] + node.translation[2];
		}
		
		node.box.setMin( v );
		node.box.setMax( v );
		
	}
	
	for( var i = 0; i < node.children.length; i++ ) {
		
		this.nodeUpdateBoundingBox( node.children[i] );
		
		node.box.setMin( node.children[i].box.min );
		node.box.setMax( node.children[i].box.max );
	}
	
	node.box.calculateRange();
	node.box.calculateOffset();
	
	
};

// Calculate bounding box of MODEL by applying tranformation matrices to
// each mesh bounding box.
RSM.prototype.nodeUpdateRealBoundingBox = function( node, box, mat4 ) {
	
	this.nodeUpdateGlobalMatrix( node, 0 );
	this.nodeUpdateLocalMatrix( node );
	
	var gMat = mat4.multiplySelf( node.globalMatrix );
	var lMat = gMat.clone().multiplySelf( node.localMatrix );
	
	function matrix4MultVect3( m, v ) {
	
		var d = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15];

		return [
			( m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] ) / d,
			( m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] ) / d,
			( m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] ) / d
		];
	}
	
	for( var i = 0; i < node.verticeCount; i++ ) {
		
		var v = matrix4MultVect3( lMat.elements, node.vertices[i] );
		
		box.setMin( v );
		box.setMax( v );
		
	}
	
	for( var i = 0; i < node.children.length; i++ ) {
		this.nodeUpdateRealBoundingBox( node.children[i], box, gMat );
	}
	
	
};

RSM.prototype.nodeUpdateGlobalMatrix = function( node, timeElapsed ) {
	
	if( node.globalMatrix !== undefined && node.rotKeyFrameCount < 1 ) {
		return node.globalMatrix;
	}
		
	node.globalMatrix = new THREE.Matrix4();
	
	var main = this.mainNode;
	
	if( node.main ) {
		if( node.children.length == 0 ) {
			node.globalMatrix.translate(new THREE.Vector3(
				0, 
				main.box.range[1] - main.box.max[1], 
				0 
			));
		} else {
			node.globalMatrix.translate(new THREE.Vector3(
				-main.box.range[0], 
				-main.box.max[1], 
				-main.box.range[2]
			));
		}
	} else {
		node.globalMatrix.translate(new THREE.Vector3(
			node.translation[0],
			node.translation[1],
			node.translation[2]
		));
	}
	
	if( node.rotKeyFrameCount <= 0 ) {
		if( node.rotangle != 0 ) {
			node.globalMatrix.rotateByAxis(
				new THREE.Vector3( 
					node.rotaxis[0], 
					node.rotaxis[1], 
					node.rotaxis[2] 
				), 
				node.rotangle
			);
		}
	} else if( timeElapsed > 0 ) {
			
		var current = 0;
		
		for( var i = 0; i < node.rotKeyFrameCount; i++ ) {
			var keyFrame = node.rotKeyFrame[i];
			if( keyFrame.time > node.timeElapsed ) {
				current = i - 1;
				break;
			}
		}
		
		current = Math.max( current, 0 );
		
		var next = ( current + 1 ) % node.rotKeyFrameCount;
		
		var currentKeyFrame = node.rotKeyFrame[current];
		var nextKeyFrame = node.rotKeyFrame[next];
		
		var interval = ( node.timeElapsed - currentKeyFrame.time ) / ( nextKeyFrame.time - currentKeyFrame.time );
		
		var quatCurrent = new THREE.Quaternion(
			currentKeyFrame.orientation[0],
			currentKeyFrame.orientation[1],
			currentKeyFrame.orientation[2],
			currentKeyFrame.orientation[3]
		);
		
		var quatNext = new THREE.Quaternion(
			nextKeyFrame.orientation[0],
			nextKeyFrame.orientation[1],
			nextKeyFrame.orientation[2],
			nextKeyFrame.orientation[3]
		);
		
		var quatThis = new THREE.Quaternion();
		
		THREE.Quaternion.slerp( quatCurrent, quatNext, quatThis, interval );
		
		node.globalMatrix.multiplySelf(
			(new THREE.Matrix4).setRotationFromQuaternion(
				quatThis.normalize() 
			)
		);
		
		node.timeElapsed += timeElapsed;
		
		while( node.timeElapsed > node.rotKeyFrame[ node.rotKeyFrameCount - 1 ].time ) {
			node.timeElapsed -= node.rotKeyFrame[ node.rotKeyFrameCount - 1 ].time;
		}
		
		
	} else {
		node.globalMatrix.multiplySelf(
			(new THREE.Matrix4).setRotationFromQuaternion(
				new THREE.Quaternion(
					node.rotKeyFrame[0].orientation[0],
					node.rotKeyFrame[0].orientation[1],
					node.rotKeyFrame[0].orientation[2],
					node.rotKeyFrame[0].orientation[3]
				).normalize()
			)
		);
	}
	
	node.globalMatrix.scale( 
		new THREE.Vector3( 
			node.scale[0],
			node.scale[1],
			node.scale[2] 
		)
	);
	
};

RSM.prototype.nodeUpdateLocalMatrix = function( node ) {
	
	if( node.localMatrixCalculated ) {
		return node.localMatrix;
	} else {
		node.localMatrix = new THREE.Matrix4();
	}
	
	var main = this.mainNode;
	
	if( node.main && node.children.length == 0 ) {
		node.localMatrix.translate(new THREE.Vector3(
			-main.box.range[0],
			-main.box.range[1],
			-main.box.range[2]
		));
	} else {
		node.localMatrix.translate(new THREE.Vector3(
			node.offsetTranslation[0],
			node.offsetTranslation[1],
			node.offsetTranslation[2]
		));
	}
	
	var m = node.offsetMatrix;
	
	node.localMatrix.multiplySelf(new THREE.Matrix4(
		m[0], 	m[3], 	m[6], 	0,
		m[1], 	m[4], 	m[7], 	0,
		m[2], 	m[5], 	m[8], 	0,
		0, 		0, 		0, 		1
	));
	
	node.localMatrixCalculated = true;
	

};

RSM.prototype.nodeUpdate = function( node, timeElapsed, fast ) {
	
	this.nodeUpdateGlobalMatrix( node, timeElapsed );
	this.nodeUpdateLocalMatrix( node );
	
	for( var i = 0; i < node.children.length; i++ ) {
		this.nodeUpdate( node.children[i], timeElapsed );
	}

};

RSM.prototype.updateBoundingBox = function() {
	
	this.nodeUpdateBoundingBox( this.mainNode );
	
	this.nodeUpdateRealBoundingBox(
		this.mainNode, 
		this.box, 
		(new THREE.Matrix4()).scale(
			new THREE.Vector3( 1.0, -1.0, 1.0 ) 
		)
	);
		
	this.box.calculateRange();
	this.box.calculateOffset();
	
	
};

RSM.prototype.meshComputeFaceNormals = function( mesh ) {
	
	var vertices = mesh.vertices;
	
	mesh.faceNormals = [];
	
	for( var i = 0; i < mesh.faces.length; i++ ) {
		
		var vi = mesh.faces[i].vertIndex;
		
		var v1 = vertices[ vi[ 0 ] ],
			v2 = vertices[ vi[ 1 ] ],
			v3 = vertices[ vi[ 2 ] ];
		
		var normal = new THREE.Vector3();
		
		var u_x = v3[0] - v2[0],
			u_y = v3[1] - v2[1],
			u_z = v3[2] - v2[2],
			v_x = v1[0] - v2[0],
			v_y = v1[1] - v2[1],
			v_z = v1[2] - v2[2];
		
		normal.x = u_y * v_z - u_z * v_y;
		normal.y = u_z * v_x - u_x * v_z;
		normal.z = u_x * v_y - u_y * v_x;
		
		//normal.x = ( v3[1] - v2[1] ) * ( v3[2] - v1[2] ) - ( v3[2] - v2[2] ) * ( v3[1] - v1[1] );
		//normal.y = ( v3[2] - v2[2] ) * ( v3[0] - v1[0] ) - ( v3[2] - v1[2] ) * ( v3[0] - v2[0] );
		//normal.z = ( v3[1] - v1[1] ) * ( v3[0] - v2[0] ) - ( v3[1] - v2[1] ) * ( v3[0] - v1[0] );
		
		
		if( normal.x || normal.y || normal.z ) {
			
			var len = Math.sqrt( normal.x * normal.x + normal.y * normal.y + normal.z * normal.z );
			
			normal.x /= len;
			normal.y /= len;
			normal.z /= len;
		}
		
		if( mesh.faces[i].doubleSided ) {
			
			normal.x *= 1;
			normal.y *= 1;
			normal.z *= 1;
			
		}
		
		mesh.faces[i].normal = normal;
		
		mesh.faceNormals.push( normal );
		
	}
	
};

RSM.prototype.computeFaceNormals = function() {

	for( var i in this.nodes ) {
		
		this.meshComputeFaceNormals( this.nodes[i] );
		
	}


};

RSM.prototype.meshComputeVertexNormals = function( mesh ) {
	
	//mesh.vertexNormals = Array( mesh.vertices.length );
	
	var smoothingGroups = Array( RSM.MaxSmoothingGroups );
	
	for( var i = 0; i < mesh.faces.length; i++ ) {
		
		// Setup normals array
		
		//mesh.faces[i].vertexNormals = Array(3);
		
		// Add face to smoothing group
		
		var g = mesh.faces[i].smoothGroup;
		
		if( !smoothingGroups[g] ) {
			smoothingGroups[g] = [];
		}
		
		smoothingGroups[g].push( i );
		
	};
	
	var tmp = Array( mesh.vertices.length );
	
	// Each vertex normal is the normalization of every face normal 
	// within the smoothing group?
	
	for( var g = 0; g < smoothingGroups.length; g++ ) {
		
		var group = smoothingGroups[g];
		
		if( !group || !group.length )
			continue;
		
		// Setup vectors
		for( var i = 0; i < mesh.vertices.length; i++ ) {
			tmp[i] = new THREE.Vector3();
		}
		
		// Add face normals
		for( var i = 0; i < group.length; i++ ) {
			
			var face = mesh.faces[ group[i] ];
		
			var vi = face.vertIndex;
			
			tmp[ vi[ 0 ] ].addSelf( face.normal );
			tmp[ vi[ 1 ] ].addSelf( face.normal );
			tmp[ vi[ 2 ] ].addSelf( face.normal );
			
			// Add references for keeping
			// Each face should only belong to one smooth group
			face.vertexNormals = [
				tmp[ vi[ 0 ] ],
				tmp[ vi[ 1 ] ],
				tmp[ vi[ 2 ] ]
			];
			
		
		}
		
		// Normalize vectors
		// Setup vectors
		for( var i = 0; i < mesh.vertices.length; i++ ) {
			tmp[i].normalize();
		}
		
		//for( var v = 0; v < mesh.vertices.length; v++ ) {
			
		//	tmp[v] = new THREE.Vector3();
			
			// Find faces in smoothing group
		//	for( var i = 0; i < mesh.faces.length; i++ ) {
			
		//		var face = mesh.faces[i];
				
		//		if( face.smoothGroup !== g ) {
		//			continue;
		//		}
				
		//		var vi = face.vertIndex;
				
		//		if( vi[0] === v || vi[1] === v || vi[2] === v ) {
		//			tmp[v].addSelf( face.normal );
		//		}
			
		//	}
			
		//	tmp[v].normalize();
			
		//}
		
		//for( var i = 0; i < group.length; i++ ) {
			
		//	var face = mesh.faces[ group[i] ];
		//	var vi = face.vertIndex;
			
		//	face.vertexNormals = [
		//		tmp[ vi[ 0 ] ],
		//		tmp[ vi[ 1 ] ],
		//		tmp[ vi[ 2 ] ]
		//	];
			
			//mesh.vertexNormals[ 3*f + 0 ] = tmp[ vi[ 0 ] ];
			//mesh.vertexNormals[ 3*f + 1 ] = tmp[ vi[ 1 ] ];
			//mesh.vertexNormals[ 3*f + 2 ] = tmp[ vi[ 2 ] ];
			
		//}
	
	}
	
};

RSM.prototype.computeVertexNormals = function() {
	
	for( var i in this.nodes ) {
		
		this.meshComputeVertexNormals( this.nodes[i] );
	}

};

RSM.prototype.__defineGetter__('boundingBox', function() {
	
	if( this._boundingBox !== undefined )
		return this._boundingBox;
	
	return this._boundingBox = RSM.calcBoundingBox( this.mainNode );
	
});

RSM.prototype.__defineGetter__('mainNode', function() {
	if( this.header.mainNodeName !== null ) {
		return this.nodes[ this.header.mainNodeName ];
	}
	else return null;
});

RSM.prototype.parse = function( buffer ) {
	
	var	data = new DataView( buffer ),
		p = 0;
	
	this.header.magic = data.getString( p, 4 );
	p += 4;
	
	if( this.header.magic.localeCompare('GRSM') !== 0 ) {
		throw 'RSM :: uknown identifier ' + this.header.magic;
	}
	
	this.header.version.major = data.getUint8( p );
	this.header.version.minor = data.getUint8( p + 1);
		
	this.header.animationLength = data.getInt32( p + 2, true );
	this.header.shadeType = data.getInt32( p + 6, true );
		
	p += 10;
	
	if( this.header.version.compareTo( 1, 4 ) >= 0 ) {
		this.header.alpha = data.getUint8( p );
		p += 1;
	}
		
	// skip reserved ; 16 bytes
	this.header.textureCount = data.getUint32( p + 16, true );
	
	p += 20;
		
	for( var i = 0; i < this.header.textureCount; i++ ) {
		this.textureNames.push(
			data.getString( p, 40 )
		);
		p += 40;
	}
	
	this.header.mainNodeName = data.getString( p, 40 );
	
	p += 40;
		
	this.header.nodeCount = data.getInt32( p, true );
	
	p += 4;
	
	// Extract all the nodes
	for( var i = 0, node; i < this.header.nodeCount; i++ ) {
		
		node = {
			children: [],
			faceCount: -1,
			faces: [],
			globalMatrixCalculated: false,
			localMatrixCalculated: false,
			main: false,
			name: data.getString( p, 40 ),
			parent: null,
			parentName: data.getString( p + 40, 40 ),
			posKeyFrameCount: 0,
			posKeyFrames: [],
			rotKeyFrame: [],
			rotKeyFrameCount: 0,
			textureCount: data.getInt32( p + 80, true ),
			textures: [],
			timeElapsed: 0,
			tVerticeCount: -1,
			tVertices: [],
			verticeCount: -1,
			vertices: []
		}
		
		p += 84;
		
		// This evaluation is a bit shady...
		if( node.parentName == '' )
			node.main = true;
		
		if( this.header.nodeCount == 1 )
			node.only = true;
		
		// Indices to texture names in header
		for( var j = 0; j < node.textureCount; j++ ) {
			node.textures.push( data.getInt32( p, true ) );
			p += 4;
		}
		
		// 4x4 offsetMatrix (matrix3)
		node.offsetMatrix = new Float32Array(
			buffer.slice( p, p + 36)
		);
		
		node.offsetTranslation = data.getVector3( p + 36 );
		
		p += 48;
		
		node.translation = data.getVector3( p );
		node.rotangle = data.getFloat32( p + 12, true );
		node.rotaxis = data.getVector3( p + 16 );
		node.scale = data.getVector3( p + 28 );
		
		p += 40;
		
		node.verticeCount = data.getInt32( p, true );
		
		p += 4;
		
		// Mesh vertices
		for( var j = 0; j < node.verticeCount; j++ ) {
			node.vertices.push( data.getVector3( p ) );
			p += 12;
		}
		
		node.tVerticeCount = data.getInt32( p, true );
		
		p += 4;
		
		// Mesh UVs
		for( var j = 0; j < node.tVerticeCount; j++ ) {
			// Version 1.2 and above also store color data
			if( this.header.version.compareTo( 1, 2 ) >= 0 ) {
				// ulong color, float u, float v
				node.tVertices.push([
					data.getUint32( p, true ),
					data.getFloat32( p + 4, true ),
					data.getFloat32( p + 8, true )
				]);
				p += 12;
			} else {
				// float u, float v
				node.tVertices.push([
					0xffffffff,
					data.getFloat32( p, true ),
					data.getFloat32( p + 4, true )
				]);
				p += 8;
			}
		}
		
		node.faceCount = data.getInt32( p, true );
		
		p += 4;
		
		// Mesh triangular faces
		for( var j = 0, face; j < node.faceCount; j++ ) {
			
			face = {
				// Indices of vertices
				vertIndex: [
					data.getUint16( p, true ),
					data.getUint16( p + 2, true ),
					data.getUint16( p + 4, true )
				],
				// Indices of UVs
				tVertIndex: [
					data.getUint16( p + 6, true ), 
					data.getUint16( p + 8, true ), 
					data.getUint16( p + 10, true )
				],
				// Texture index from list
				materialId: data.getUint16( p + 12, true ),
				// ; skip 2 bytes (reserved)
				doubleSided: data.getInt32( p + 16, true ), 
				smoothGroup: 0
			}
			
			p += 20;
			
			// Smooth group defined for version 1.2 and above
			if( this.header.version.compareTo( 1, 2 ) >= 0 ) {
				face.smoothGroup = data.getInt32( p, true );
				p += 4;
			}
			
			node.faces.push( face );
			
		}
		
		// From version 1.5 and above each node may have individual key
		// frames for its animation.		
		if( this.header.version.compareTo( 1, 5 ) >= 0 ) {
			
			node.posKeyFrameCount = data.getInt32( p, true );
			p += 4;
			
			for( var j = 0; j < node.posKeyFrameCount; j++ ) {
				node.posKeyFrame.push({
					time: data.getInt32( p, true ), // frame number
					orientation: new Float32Array(
						buffer.slice( p + 4, p + 16 ) // vector3
					)
				});
				p += 16;
			}
			
		}
		
		node.rotKeyFrameCount = data.getInt32( p, true );
		p += 4;
		
		for( var j = 0; j < node.rotKeyFrameCount; j++ ) {
			node.rotKeyFrame.push({
				time: data.getInt32( p, true ),
				orientation: new Float32Array(
					buffer.slice( p + 4, p + 20 ) // quat
				)
			});
			p += 20;
		}
		
		this.nodes[ node.name ] = node;
		
	}
	
	// Setup children
	for( var i in this.nodes ) {
		
		var node = this.nodes[i];
		var parentNode = this.nodes[ node.parentName ];
		
		if( parentNode !== undefined ) {
			
			if( parentNode === node ) {
				console.warn('RSM: Mesh "', node.name, '" is it\'s own parent.', this);
				continue;
			}
			
			node.parent = parentNode;
			node.parent.children.push( node );
		}
	}
	
	if( this.header.version.compareTo( 1, 5 ) >= 0 ) {
		
		this.globalPosKeyFrameCount = data.getInt32( p, true );
		
		p += 4;
		
		this.globalPosKeyFrame = [];
		
		for( var i = 0; i < this.globalPosKeyFrameCount; i++ ) {
			this.globalPosKeyFrame.push({
				time: data.getInt32( p, true ),
				orientation: data.getVector3( p + 4 )
			});
			p += 16;
		}
		
	}
	
	//this.numVol = this.fp.readInt(4);
	//this.volumes = [];
	
	//var volume;
	
	//for( var i = 0; i < this.numVol; i++ ) {
		
	//	volume = {
	//		size: this.fp.readVector3(),
	//		pos: this.fp.readVector3(),
	//		rot: this.fp.readVector3(),
	//		flag: 0
	//	}
		
	//	if( this.header.version.compareTo( 1, 3 ) >= 0 ) {
	//		volume.flag = this.fp.readBoolean(4);
	//		if(volume.flag === true) {
	//			volume.size[0] += 3;
	//			volume.size[2] += 3;
	//		}
	//	}
		
	//	this.volumes.push( volume );
		
	//}
	
	this.byteCompletion = p;
	this.byteLength = buffer.byteLength;
	this.completePercent = 100 * p / buffer.byteLength;
	
	
}