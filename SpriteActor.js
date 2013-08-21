var SpriteActor = function(mapInstance) {
	
	this.mapInstance = mapInstance;
	
	this.attachments = {};
	
	this.lookingDirection = 0;
	this.standingDirection = 0;
	this.cameraDirection = 0;
	
	this.motionId = 0;
	this.action = 0;
	
	// Display position
	this.position = new THREE.Vector3(0, 0, 0);
	
	this._gatPosition = new THREE.Vector2(0, 0);
	this.movementPath = [];
	
	this._isMoving = false;
	this._cancelMove = false;
	
	this.movementSpeed = 150;
	this.lastUpdate = 0;
	this.movementTime = 0;
	
	this.lightLevel = 1.0;
	
	this.zGroup = SpriteActor.ZGROUPID++;
	
};

SpriteActor.ZGROUPID = 0;

SpriteActor.Types = {
	MONSTER: 0,
	PLAYER: 1,
	ITEM: 2
};

// Monster actions
SpriteActor.Actions = {
	STAND: 0,
	WALK: 1,
	ATTACK: 2,
	HURT1: 3,
	DIE: 4
};

SpriteActor.PlayerActions = {
	STAND: 0,
	WALK: 1,
	SIT: 2,
	PICK: 3,
	ACTION1: 4,
	ATTACK1: 5,
	HURT1: 6,
	HURT2: 7,
	DIE: 8,
	ACTION2: 9,
	ATTACK2: 10,
	ATTACK3: 11,
	ACTION3: 12
};

SpriteActor.Directions = {
	SOUTH: 0,
	SOUTH_WEST: 1,
	WEST: 2,
	NORTH_WEST: 3,
	NORTH: 4,
	NORTH_EAST: 5,
	EAST: 6,
	SOUTH_EAST: 7
};

SpriteActor.prototype.__defineGetter__('Action', function() {
	return this.action;
});

SpriteActor.prototype.__defineSetter__('Action', function(value) {
	this.action = value;
});

SpriteActor.prototype.__defineSetter__('Direction', function(value) {
	this.standingDirection = value % 8;
});


SpriteActor.prototype.__defineGetter__('motionDirection', function() {
	return (this.standingDirection + this.cameraDirection) % 8;
});

SpriteActor.prototype.__defineGetter__('motion', function() {
	return this.action * 8 + this.motionDirection;
});


SpriteActor.prototype.__defineSetter__("MovementSpeed", function(value) {
	this.movementSpeed = value;
});

SpriteActor.prototype.__defineGetter__("isMoving", function() {
	return this._isMoving;
});

SpriteActor.prototype.__defineSetter__("isMoving", function(value) {
	if(value) {
		this.Action = SpriteActor.Actions.WALK;
	} else {
		this.Action = SpriteActor.Actions.STAND;
	}
	this._isMoving = value;
});

SpriteActor.prototype.__defineSetter__("gatPosition", function(value) {
	this.mapInstance.updateEntityGatPosition(this, value.x, value.y, this._gatPosition.x, this._gatPosition.y);
	this._gatPosition = value;
	this.position.copy(this.gatToMapPosition(this._gatPosition));
	//this.lightLevel = 0.5 + 0.5 * this.mapInstance.getGatTileLightLevel(this._gatPosition.x, this._gatPosition.y);
	this.lightLevel = this.mapInstance.getGatTileLightLevel(this._gatPosition.x, this._gatPosition.y);
});

SpriteActor.prototype.__defineGetter__("gatPosition", function() {
	return this._gatPosition;
});


SpriteActor.prototype.SetGatPosition = function(x, y) {
	this.gatPosition = new THREE.Vector2(x, y);
	//getTileLightLevel
};

SpriteActor.prototype.MoveToGatPosition = function(x, y) {
		
	if(this.isMoving && !this._cancelMove) {
		this._cancelMove = true;
		this._requestedNewPosition = new THREE.Vector2(x, y);
		return true;
	}
		
	var path = this.findPath(
		this.gatPosition.x, 
		this.gatPosition.y, 
		x, 
		y
	);
	
	if(path && path.length > 1) {
		if(!this.isMoving) {
			this.movementTime = 0;
			this.isMoving = true;
		}
		// Remove 
		path.splice(0, 1);
		this.movementPath = path;
		this.setDirectionGatNodeChange(this.gatPosition, this.movementPath[0]);	
		return true;
	}
	
	return false;
	
};

// Set direction from change of GAT nodes
SpriteActor.prototype.setDirectionGatNodeChange = function(v1, v2) {

	if(v2.x > v1.x) {
		// EAST
		if(v2.y > v1.y) {
			this.Direction = SpriteActor.Directions.NORTH_EAST;
		} else if(v2.y < v1.y) {
			this.Direction = SpriteActor.Directions.SOUTH_EAST;
		} else {
			this.Direction = SpriteActor.Directions.EAST;
		}
	} else if(v2.x == v1.x) {
		// UP, DOWN
		if(v2.y > v1.y) {
			this.Direction = SpriteActor.Directions.NORTH;
		} else if(v2.y < v1.y) {
			this.Direction = SpriteActor.Directions.SOUTH;
		}
	} else {
		// WEST
		if(v2.y > v1.y) {
			this.Direction = SpriteActor.Directions.NORTH_WEST;
		} else if(v2.y < v1.y) {
			this.Direction = SpriteActor.Directions.SOUTH_WEST;
		} else {
			this.Direction = SpriteActor.Directions.WEST;
		}
	}

}

SpriteActor.prototype.gatToMapPosition = function(v0) {
	var v = this.mapInstance.mapCoordinateToPosition2(v0.x + 0.5, v0.y - 1.5);
	v.y = -this.mapInstance.gatFileObject.getBlockAvgDepth(this.gatPosition.x, this.gatPosition.y) + 0.5; // currentGatPosition
	return v;
};

SpriteActor.prototype.UpdatePosition = function() {
	
	if(this.isMoving) {
		
		this.movementTime += Date.now() - this.lastUpdate;
		
		if(this.movementPath.length == 0) {
			
			this.isMoving = false;
			this.movementTime = 0;
			
		} else {
			
			var nNode = this.movementPath[0];
			
			while(this.movementTime >= this.movementSpeed) {
				
				if(!this.movementPath.length)
					break;
								
				this.movementTime -= this.movementSpeed;
				this.gatPosition = nNode;
				this.movementPath.splice(0, 1);
				
				if(this._cancelMove) {
					// If movement stop requested, do so now that we've 
					// reached a new tile...
					if(this._requestedNewPosition) {
						this.MoveToGatPosition(
							this._requestedNewPosition.x,
							this._requestedNewPosition.y
						);
					} else {
						this.movementPath = [];
					}
					this._cancelMove = false;
					this._requestedNewPosition = null;
				}
				
				nNode = this.movementPath[0] || this.gatPosition;
				/* Set walking direction */
				this.setDirectionGatNodeChange(this.gatPosition, nNode);
				
				
			}
						
			var currentGatPosition = this.gatToMapPosition(this.gatPosition);
			var nextGatPosition = this.gatToMapPosition(nNode);
			
			
			//if(diff2.length > diff.length) {
			//	currentGatPosition = this.position;
			//}
			
			
			var d = this.movementTime / this.movementSpeed;
			
			var dispPos = nextGatPosition.clone().sub(currentGatPosition).multiplyScalar(d).add(currentGatPosition);
			
			//var diff2 = nextGatPosition.clone().sub(this.position);
			//var diff3 = nextGatPosition.clone().sub(dispPos);
			
			//if(diff2.lengthSq() < diff3.lengthSq()) {
			//	console.log("Distance2");
			//	this.position.x = this.position.x + d * (nextGatPosition.x - this.position.x);
			//	this.position.y = this.position.y + d * (nextGatPosition.y - this.position.y);
			//	this.position.z = this.position.z + d * (nextGatPosition.z - this.position.z);
			//} else {
				this.position.copy(dispPos);
				//this.position.x = currentGatPosition.x + d * (nextGatPosition.x - currentGatPosition.x);
				//this.position.y = currentGatPosition.y + d * (nextGatPosition.y - currentGatPosition.y);
				//this.position.z = currentGatPosition.z + d * (nextGatPosition.z - currentGatPosition.z);			
			//}
			
						
			
		}
		
	}
	
};

// A* path search
SpriteActor.prototype.findPath = function(x0, y0, x1, y1) {

	var h = function(node) {
		//return ( Math.abs(x1 - node[0]) + Math.abs(y1 - node[1]) ) / 2;
		return Math.sqrt( Math.pow(x1 - node[0], 2) + Math.pow(y1 - node[1], 2) );
	}
	
	var gat = this.mapInstance.gatFileObject;
	
	var getNeighborNodes = function(x, y) {
		
		var nodes = [];
		
		var adjacents = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		
		for(var i = 0; i < adjacents.length; i++) {
			var n = adjacents[i];
			if(gat.hasProperty(x + n[0], y + n[1], GAT.BlockProperties.WALKABLE))
				nodes.push([x + n[0], y + n[1]]);
		}
		
		var diagonals = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
		
		for(var i = 0; i < diagonals.length; i++) {
			var n = diagonals[i];
			if(gat.hasProperty(x + n[0], y + n[1], GAT.BlockProperties.WALKABLE)
				&& gat.hasProperty(x, y + n[1], GAT.BlockProperties.WALKABLE)
				&& gat.hasProperty(x + n[0], y, GAT.BlockProperties.WALKABLE)
			) {
				nodes.push([x + n[0], y + n[1]]);
			}
		}
		
		return nodes;
		
	};
	
	var nodeId = function(node) { return 'x' + node[0] + 'y' + node[1]; };
	
	var cameFrom = {};
	var openSet = [[x0, y0]];
	var _openSet = {};
	var closedSet = {};
	var gScore = {};
	var fScore = {};
	
	var n0 = nodeId(openSet[0]);
	
	_openSet[n0] = true;
	gScore[n0] = 0;
	fScore[n0] = gScore[n0] + h(openSet[0]);
	
	var q = 0;
	var current;
	
	while(openSet.length && q < 100) {
		
		q++;
		
		var index = 0;
		
		// Get node with lowest F score
		current = openSet.reduce(function(a, b, i) {
			if(fScore[nodeId(a)] > fScore[nodeId(b)]) {
				index = i;
				return b;
			}
			return a;
		});
		
		var cId = nodeId(current);
		
		if(current[0] == x1 && current[1] == y1) {
			
			// Reconstruct path
			var nodeList = [];
			var node = current;
			
			do {
				nodeList.push(new THREE.Vector2(node[0], node[1]));
			} while(node = cameFrom[nodeId(node)]);
			
			return nodeList.reverse();
		}
		
		// Remove current from open set
		openSet.splice(index, 1);
		// Add current to closed set
		_openSet[cId] = false;
		closedSet[cId] = true;
		
		var neighbors = getNeighborNodes(current[0], current[1]);
		
			//console.log('Current', current);
			
		for(var i = 0; i < neighbors.length; i++) {
			
			var node = neighbors[i];
			var nId = nodeId(node);
			
			var dist, dx0, dy0, dx1, dy1, ddir;
			
			dx0 = current[0] - node[0];
			dy0 = current[1] - node[1];
			
			dist = Math.abs(dx0) + Math.abs(dy0);
			
			if(!cameFrom[cId]) {
				ddir = 1.0;
			} else {
				 //Turning penalty
				dx1 = cameFrom[cId][0] - current[0];
				dy1 = cameFrom[cId][1] - current[1];
				ddir = ( (dy0 != dy1) || (dx0 != dx1) ) ? 0.0001 : 0;
			}
			
			var gScore_t = gScore[cId] + 1 + ddir;
			
			//console.log('Child', node);
			
			if(closedSet[nId] && gScore_t >= gScore[nId]) {
				//console.log('Dropping...');
				continue;
			}
			
			if(openSet[nId] !== true || gScore_t < gScore[nId]) {
				cameFrom[nId] = current;
				gScore[nId] = gScore_t;
				fScore[nId] = gScore_t + h(node);
				// Add to openset
				if(_openSet[nId] !== true) {
					_openSet[nId] = true;
					openSet.push(node);
				}
			}
		}
		
	}
	
	//console.error("Pathfinding failed in 100 iterations", current, x0, y0, x1, y1);
	// Failed!
	return null;
	
};

var SpriteActorAttachment = function(sprFileObject, actFileObject) {
	
	this.sprFileObject = sprFileObject;
	this.actFileObject = actFileObject;
	
	var atlasObject = sprFileObject.getAtlasTextureRgba();
	
	this.texture = new THREE.DataTexture(
		atlasObject.data, 
		atlasObject.width, 
		atlasObject.height, 
		THREE.RGBAFormat,
		THREE.UnsignedByteType,
		{},
		THREE.ClampToEdgeWrapping, 
		THREE.ClampToEdgeWrapping, 
		THREE.LinearFilter, 
		THREE.LinearFilter
	);
		
	this.texture.needsUpdate = true;
	
	this.frameId = 0;
	this.timeElapsed = 0;
	this.nSpriteObjectsInScene = 0;
	this.inScene = false;
	
	var motionSet = this.actFileObject.actions;
	var max = 0;
	
	this.spriteObjectSet = [];
	
	for( var i = 0; i < motionSet.length; i++ ) {
		
		var frames = motionSet[i];
		
		for( var j = 0; j < frames.length; j++ ) {
			
			var sprites = frames[j].sprites;
			
			if(sprites.length > max) {
				
				for(var k = max; k < sprites.length; k++) {
					
					var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
						map: this.texture,
						useScreenCoordinates: false,
						alignment: new THREE.Vector2,
						transparent: true,
						opacity: 1.0,
						alphaTest: 0.5,
						//depthTest: true,
						//depthWrite: false
					}));
					
					sprite.visible = false;
					this.spriteObjectSet.push( sprite );
					
				}
				
				max = sprites.length;
				
			}
			
		}
	
	}
	
};

SpriteActor.prototype.SetAttachment = function(attachmentType, sprFileObject, actFileObject) {
	
	if(this.hasAttachment(attachmentType)) {
		this.RemoveAttachment(attachmentType);
	}
	
	var attachment = new SpriteActorAttachment(sprFileObject, actFileObject);
	
	
	this.attachments[attachmentType] = attachment;
	
};

// Remove an existing attachment
SpriteActor.prototype.RemoveAttachment = function(attachmentType) {
	// TODO
	
	console.log("Removing attachment of type " + attachmentType);
	
	this.removeAttachmentFromScene(this.mapInstance.scene, attachmentType);
	this.attachments[attachmentType] = null;
	
};

SpriteActor.prototype.addAttachmentToScene = function(scene, attachmentType) {
	
	var attachment = this.getAttachment(attachmentType);
	
	if(!attachment.inScene) {
		for(var i = 0; i < attachment.spriteObjectSet.length; i++) {
			attachment.spriteObjectSet[i].position = this.position;
			scene.add(attachment.spriteObjectSet[i]);
		}
		attachment.inScene = true;
	}
	
};

SpriteActor.prototype.removeAttachmentFromScene = function(scene, attachmentType) {
	
	var attachment = this.getAttachment(attachmentType);
	
	if(attachment.inScene) {
		var i = 0;
		for(; i < attachment.spriteObjectSet.length; i++) {
			scene.remove(attachment.spriteObjectSet[i]);
		}
		console.log("Removed " + i + " THREE.Sprite objects");
	}
	
};

SpriteActor.Attachment = {
	BODY: 1,
	HEAD: 2,
	TOP: 3
}

SpriteActor.AttachmentPriority = {
	1: 0,
	2: 1000,
	3: 2000
};

SpriteActor.prototype.UpdateAttachment = function(deltaTime, attachmentType, motionFrame, offsetX, offsetY) {
	
	var attachment = this.getAttachment(attachmentType);
	var actFileObject = attachment.actFileObject;
	
	// Number of frames in current motion
	var nMotionFrames = actFileObject.actions[this.motion].length;
	
	// Ensure motion frame ID isn't out of bounds
	attachment.frameId = motionFrame % nMotionFrames;
	
	// Sprite data for current motion frame
	var motionSpriteData = actFileObject.actions[this.motion][attachment.frameId].sprites;
	
	// Set of THREE.Sprite objects
	var spriteObjects = attachment.spriteObjectSet;
	
	// Dimensions of the texture atlas, used for calculating UVs
	var atlasWidth = attachment.texture.image.width;
	var atlasHeight = attachment.texture.image.height;
	
	var updateLimit = Math.max(attachment.nSpriteObjectsInScene, motionSpriteData.length);
	
	for(var i = 0; i < updateLimit; i++) {
		
		// Current THREE.Sprite object
		var spriteObject = spriteObjects[i];
		
		if(i >= motionSpriteData.length) {
			
			spriteObject.visible = false;
			
		} else {
		
			var dispInfo = motionSpriteData[i];
			
			var frameType = dispInfo.type == 'palette' ? 'frames' : 'bitmaps';
			
			if(dispInfo.id < 0) {
				spriteObject.visible = false;
				continue;
			}
			
			// Display information for current SPR frame
			var spriteData = attachment.sprFileObject[frameType][dispInfo.id];
			
			// TODO: Set z order to i + priority
			spriteObject.zGroup = this.zGroup
			spriteObject.zIndex = i + SpriteActor.AttachmentPriority[attachmentType];
			
			// Set spriteObject
			spriteObject.material.uvOffset.x = spriteData.textureAtlasPosition[0] / atlasWidth;
			spriteObject.material.uvOffset.y = 1 - spriteData.textureAtlasPosition[1] / atlasHeight;
			spriteObject.material.uvScale.x = spriteData.width / atlasWidth;
			spriteObject.material.uvScale.y = -spriteData.height / atlasHeight;
			
			spriteObject.material.color.r = this.lightLevel * dispInfo.color[0] / 255;
			spriteObject.material.color.g = this.lightLevel * dispInfo.color[1] / 255;
			spriteObject.material.color.b = this.lightLevel * dispInfo.color[2] / 255;
			spriteObject.material.opacity = dispInfo.color[3] / 255;
			
			var sx = dispInfo.scaleX * ( dispInfo.flipped ? -1 : 1 ) * spriteData.width;
			var sy = -dispInfo.scaleY * spriteData.height;
			var angle = ( dispInfo.flipped ? -1 : 1 ) * dispInfo.angle * Math.PI / 180;
			var	x = 2 * ( dispInfo.x + offsetX );
			var y = -2 * ( dispInfo.y + offsetY );
			
			// Rotation^-1 * Scale^-1 * Translation
			spriteObject.material.alignment.x = x * Math.cos(angle) / sx + y * Math.sin(angle) / sy;
			spriteObject.material.alignment.y = y * Math.cos(angle) / sy - x * Math.sin(angle) / sx;
			
			spriteObject.scale.x = sx * 0.1428571492433548 * 2 * 1.6 ;// / 1.42;
			spriteObject.scale.y = sy * 0.1428571492433548 * 2 * 1.6;// / 1.42;
			spriteObject.rotation = angle;
			
			spriteObject.visible = true;
			
		}
	}
		
	// Save current number of visible THREE.Sprite objects
	attachment.nSpriteObjectsInScene = motionSpriteData.length;
	
	attachment.timeElapsed += deltaTime;
	
	//if(attachment.timeElapsed >= actFileObject.delays[this.motion]) {
	//	console.log("Frame update!", attachment.timeElapsed, actFileObject.delays[this.motion]);
	//	attachment.timeElapsed -= actFileObject.delays[this.motion];
	//}
	
	// Check if we can update the current frame
	
	var delay 
	
	if(this.action == SpriteActor.Actions.WALK) {
		delay = this.movementSpeed / actFileObject.delays[this.motion];
	} else {
		delay = actFileObject.delays[this.motion] * 25;
	}
	
	while(attachment.timeElapsed >= delay) {
		attachment.frameId = (attachment.frameId + 1) % actFileObject.actions[this.motion].length;
		attachment.timeElapsed = attachment.timeElapsed % delay;
	}
	
};

SpriteActor.prototype.getAttachment = function(attachmentType) {
	return this.attachments[attachmentType];
};

SpriteActor.prototype.hasAttachment = function(attachmentType) {
	return this.attachments[attachmentType] instanceof SpriteActorAttachment;
};

SpriteActor.prototype.Update = function(camera) {
	
	this.UpdatePosition();
	
	if(!this.hasAttachment(SpriteActor.Attachment.BODY)) {
		return;
	}
	
	// Through a convoluted process, update the direction from camera
	
	var cameraX = camera.position.x - camera.centerPosition.x;
	var cameraZ = camera.position.z - camera.centerPosition.z;
	
	var angle = Math.atan2(-cameraZ, cameraX) * 360 / (2 * Math.PI);
	
	for(var i = -4; i < 5; i++) {
		if(angle <= (i + 0.5) * 360 / 8) {
			this.cameraDirection = (i + 10) % 8; // +8 for positive number, +2 for direction adjustment (-90 => 0)
			break;
		}
	}
	
	// Number of actions in BODY attachment
	var nBodyActions = this.attachments[SpriteActor.Attachment.BODY].actFileObject.actions.length;
	
	// Ensure action is not out of bounds
	this.action = this.action % Math.floor(nBodyActions / 8);
	
	var dt = Date.now() - this.lastUpdate;
	
	// Update the BODY attachment
	this.UpdateAttachment(
		dt,
		SpriteActor.Attachment.BODY, 
		this.getAttachment(SpriteActor.Attachment.BODY).frameId, 
		0, 
		0
	);
	
	// Get the attachment pointer from the BODY ACT motion frame
	var attachmentFrameId = (this.action == 0 || this.action == 2)
		? 0 // Why?
		: this.attachments[SpriteActor.Attachment.BODY].frameId;
	
	var attachmentPointers = this.attachments[SpriteActor.Attachment.BODY]
			.actFileObject.actions[this.motion][attachmentFrameId].attachmentPointers;
	
	
	//if(!attachmentPointers.length) {
	//	console.log("Attachment pointer are empty!");
	//}
	
	// Update HEAD attachment
	if(this.hasAttachment(SpriteActor.Attachment.HEAD)) {
		// Get the attachment pointer from BODY to HEAD
		var bodyHeadAttachmentPointers = attachmentPointers[0];
		// Get the attachment pointers of HEAD
		var headAttachmentPointers = this.getAttachment(SpriteActor.Attachment.HEAD)
			.actFileObject.actions[this.motion][this.lookingDirection].attachmentPointers[0];
		this.UpdateAttachment(
			dt,
			SpriteActor.Attachment.HEAD, 
			this.lookingDirection, 
			bodyHeadAttachmentPointers.x - headAttachmentPointers.x, 
			bodyHeadAttachmentPointers.y - headAttachmentPointers.y
		);
	}
	
	// Update TOP attachment
	if(this.hasAttachment(SpriteActor.Attachment.TOP)) {
		// Get the attachment pointer from BODY to HEAD
		var bodyHeadAttachmentPointers = attachmentPointers[0];
		// Get the attachment pointers of HEAD
		var headAttachmentPointers = this.getAttachment(SpriteActor.Attachment.TOP)
			.actFileObject.actions[this.motion][this.lookingDirection].attachmentPointers[0];
		this.UpdateAttachment(
			dt,
			SpriteActor.Attachment.TOP, 
			this.lookingDirection, 
			bodyHeadAttachmentPointers.x - headAttachmentPointers.x, 
			bodyHeadAttachmentPointers.y - headAttachmentPointers.y
		);
	}
	
	//this.getAttachment(SpriteActor.Attachment.BODY).frameId++;
	
	
	this.lastUpdate = Date.now();
	
};
