var SpriteActor = function(mapInstance, name) {
	
	EventHandler.call(this);
	
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
	
	this.type = SpriteActor.Types.PLAYER;
	
	this.name = name || (function keyOf(obj, value) {
		for(i in obj) {
			if(obj[i] == value)
				return i;
		}
		return null;
	})(SpriteActor.Types, this.type) || "nil";
	
	this.zGroup = ++SpriteActor.ZGROUPID;
	
	this.mapInstance.registerEntity(this.zGroup, this);
	this._nameLabelGenerated = false;
	
	
};

SpriteActor.prototype = Object.create(EventHandler.prototype);

SpriteActor.CSpriteScale = 0.54857;

SpriteActor.ZGROUPID = 200;

SpriteActor.Types = {
	MONSTER: 0,
	PLAYER: 1,
	NPC: 2,
	ITEM: 3
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

SpriteActor.Attachment = {
	SHADOW: 0,
	BODY: 1,
	HEAD: 2,
	TOP: 3,
	MID: 4,
	BOTTOM: 5
};

SpriteActor.AttachmentPriority = {
	0: 0, // SHADOW
	1: 1, // BODY
	2: 100, // HEAD
	3: 400, // TOP
	4: 300, // MID
	5: 200, // BOTTOM
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
	
	this._fireEvent("OnGatPositionChange", this.gatPosition);
	
	
	//this.lightLevel = 0.5 + 0.5 * this.mapInstance.getGatTileLightLevel(this._gatPosition.x, this._gatPosition.y);
	this.lightLevel = this.mapInstance.getGatTileLightLevel(this._gatPosition.x, this._gatPosition.y);
});

SpriteActor.prototype.__defineGetter__("gatPosition", function() {
	return this._gatPosition;
});


SpriteActor.prototype.SetGatPosition = function(x, y) {
	
	if(this.isMoving) {
		// 
		this.isMoving = false;	
	}
	
	this.gatPosition = new THREE.Vector2(x, y);
};

SpriteActor.prototype.CancelMove = function() {
	if(this.isMoving) {
		this._cancelMove = true;
		return true;
	}
	return false;
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
		this.Direction = this.getDirectionChange(this.gatPosition, this.movementPath[0]);
		return true;
	}
	
	return false;
	
};

// Set direction from change of GAT nodes
SpriteActor.prototype.getDirectionChange = function(srcNode, dstNode) {
	
	var dir = 0;
	
	if(dstNode.x > srcNode.x) {
		// EAST
		if(dstNode.y > srcNode.y) {
			dir = SpriteActor.Directions.NORTH_EAST;
		} else if(dstNode.y < srcNode.y) {
			dir = SpriteActor.Directions.SOUTH_EAST;
		} else {
			dir = SpriteActor.Directions.EAST;
		}
	} else if(dstNode.x == srcNode.x) {
		// UP, DOWN
		if(dstNode.y > srcNode.y) {
			dir = SpriteActor.Directions.NORTH;
		} else if(dstNode.y < srcNode.y) {
			dir = SpriteActor.Directions.SOUTH;
		}
	} else {
		// WEST
		if(dstNode.y > srcNode.y) {
			dir = SpriteActor.Directions.NORTH_WEST;
		} else if(dstNode.y < srcNode.y) {
			dir = SpriteActor.Directions.SOUTH_WEST;
		} else {
			dir = SpriteActor.Directions.WEST;
		}
	}
	
	return dir;

}

/**
 * Get the 3D scene position in the center of a GAT node
 *
 * @param {THREE.Vector2} position - GAT tile position
 * @returns {THREE.Vector3} - Map position
 *
 */

SpriteActor.prototype.gatToMapPosition = function( position ) {
	
	var v = this.mapInstance.mapCoordinateToPosition( position.x + 0.5, position.y + 0.5 );
	
	//v.y = -this.mapInstance.gatFileObject.getBlockAvgDepth(this.gatPosition.x, this.gatPosition.y) + 0.5; // currentGatPosition
	
	// Get height in the middle of the GAT cell
	v.y = -this.mapInstance.subGatPositionToMapHeight( position.x, position.y, 0.5, 0.5 ) + 0.5;
	
	return v;
};

/**
 * Get the 3D scene position in-betweeen to neighboring GAT nodes.
 *
 * @param {THREE.Vector2} srcPosition - Source GAT tile 
 * @param {THREE.Vector2} dstPosition - Destination GAT tile
 * @param {float} weight - Blending weight in range [0, 1].
 * @returns {THREE.Vector3} - Map position
 *
 */
SpriteActor.prototype.mixNodePositionsToMapCoordinate = function(srcPosition, dstPosition, weight) {
	
	var s = 0.5, t = 0.5; // Middle of cell
	
	s += ( dstPosition.x - srcPosition.x ) * weight;
	t += ( dstPosition.y - srcPosition.y ) * weight;
	
	var targetPosition = srcPosition;
	
	if( s > 1.0 ) {
		s -= 1;
		targetPosition = dstPosition;
	} else if( s < 0.0 ) {
		s += 1;
		targetPosition = dstPosition;
	}
	
	if( t > 1.0 ) {
		t -= 1;
		targetPosition = dstPosition;
	} else if( t < 0.0 ) {
		t += 1;
		targetPosition = dstPosition;
	}
	
	var height = -this.mapInstance.subGatPositionToMapHeight(targetPosition.x, targetPosition.y, s, t) + 0.5;
	
	var srcCoord = this.gatToMapPosition( srcPosition );
	var dstCoord = this.gatToMapPosition( dstPosition );
	
	var finalCoord = dstCoord.sub( srcCoord ).multiplyScalar( weight ).add( srcCoord );
	
	finalCoord.y = height;
	
	return finalCoord;
	
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
				
				// Change direction
				if(nNode !== this.gatPosition) {
					this.Direction = this.getDirectionChange( this.gatPosition, nNode );
				}
				
			}
			
			// Get position between GAT nodes
			
			var d = this.movementTime / this.movementSpeed;
			
			this.position.copy( this.mixNodePositionsToMapCoordinate(this.gatPosition, nNode, d) );
			
		}
		
	}
	
};

// A* path search
SpriteActor.prototype.findPath = function(x0, y0, x1, y1) {

	var gat = this.mapInstance.gatFileObject;
	
	// First check if destination is reachable
	if(!gat.hasProperty(x1, y1, GAT.BlockProperties.WALKABLE))
		return false;
	
	var h = function(node) {
		//return ( Math.abs(x1 - node[0]) + Math.abs(y1 - node[1]) ) / 2;
		var x2 = x1 - node[0];
		var y2 = y1 - node[1];
		return Math.sqrt( x2 * x2 + y2 * y2 );
	}
	
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

var SpriteActorAttachment = function(groupId, sprFileObject, actFileObject) {
	
	this.sprFileObject = sprFileObject;
	this.actFileObject = actFileObject;
	
	this.texture = this.sprFileObject.getAtlasTextureThreeJs();
	
	this.frameId = 0;
	this.timeElapsed = 0;
	this.nSpriteObjectsInScene = 0;
	this.inScene = false;
	this.groupId = groupId;
	
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
					
					sprite.material.alphaTest = 0.5;
					sprite.material.colorId = new THREE.Color(this.groupId);
					sprite.material.fog = true;
					
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
	
	var attachment = new SpriteActorAttachment(this.zGroup, sprFileObject, actFileObject);
	
	
	this.attachments[attachmentType] = attachment;
	
};

// Remove an existing attachment
SpriteActor.prototype.RemoveAttachment = function(attachmentType) {
	
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

SpriteActor.prototype.HideAttachment = function(attachmentType) {
	
	var attachment = this.getAttachment(attachmentType);
	
	attachment.nSpriteObjectsInScene = 0;
	
	for(var i = 0; i < attachment.spriteObjectSet.length; i++) {
		attachment.spriteObjectSet[i].visible = false;
	}
	
};

SpriteActor.prototype.UpdateAttachment = function(deltaTime, attachmentType, motionFrame, offsetX, offsetY) {
	
	var attachment = this.getAttachment(attachmentType);
	var actFileObject = attachment.actFileObject;
	
	// Number of frames in current motion
	
	var motion = 0;
	
	if(attachmentType != SpriteActor.Attachment.SHADOW) {
		motion = this.motion;
	}
	
	var nMotionFrames = actFileObject.actions[motion].length;
	
	// Ensure motion frame ID isn't out of bounds
	attachment.frameId = motionFrame % nMotionFrames;
	
	// Sprite data for current motion frame
	var motionSpriteData = actFileObject.actions[motion][attachment.frameId].sprites;
	
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
			
			// Set the drawing priority of this sprite object
			spriteObject.zGroup = this.zGroup;
			spriteObject.zIndex = i + SpriteActor.AttachmentPriority[attachmentType];
			
			// Set spriteObject
			spriteObject.material.uvOffset.x = spriteData.textureAtlasPosition[0] / atlasWidth;
			spriteObject.material.uvOffset.y = 1 - spriteData.textureAtlasPosition[1] / atlasHeight;
			spriteObject.material.uvScale.x = spriteData.width / atlasWidth;
			spriteObject.material.uvScale.y = -spriteData.height / atlasHeight;
			
			spriteObject.material.color.r = this.lightLevel * dispInfo.color[0] / 255;
			spriteObject.material.color.g = this.lightLevel * dispInfo.color[1] / 255;
			spriteObject.material.color.b = this.lightLevel * dispInfo.color[2] / 255;
			
			//spriteObject.material.color.r = 1;
			//spriteObject.material.color.g = 0;
			//spriteObject.material.color.b = 0;
			
			spriteObject.material.opacity = dispInfo.color[3] / 255;
			
			var sx = dispInfo.scaleX * ( dispInfo.flipped ? -1 : 1 ) * spriteData.width;
			var sy = -dispInfo.scaleY * spriteData.height;
			var angle = ( dispInfo.flipped ? -1 : 1 ) * dispInfo.angle * Math.PI / 180;
			var	x = 2 * ( dispInfo.x + offsetX );
			var y = -2 * ( dispInfo.y + offsetY );
			
			// Rotation^-1 * Scale^-1 * Translation
			spriteObject.material.alignment.x = x * Math.cos(angle) / sx + y * Math.sin(angle) / sy;
			spriteObject.material.alignment.y = y * Math.cos(angle) / sy - x * Math.sin(angle) / sx;
						
			spriteObject.scale.x = sx * SpriteActor.CSpriteScale;
			spriteObject.scale.y = sy * SpriteActor.CSpriteScale;
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
	
	var delay = 1;
	
	// if attacking, use aMotion
	// if walking, use aMotion or speed?
	
	if(this.action == SpriteActor.Actions.WALK) {
		delay = this.movementSpeed / actFileObject.delays[motion];
	} else {
		delay = actFileObject.delays[motion] * 25;
	}
	
	delay = Math.max(1, delay);
	
	if(attachment.timeElapsed >= delay) {
		
		attachment.frameId = (attachment.frameId + 1) % actFileObject.actions[motion].length;
		attachment.timeElapsed = attachment.timeElapsed % delay;
		
	}
	
};

SpriteActor.prototype.getAttachment = function(attachmentType) {
	return this.attachments[attachmentType];
};

SpriteActor.prototype.hasAttachment = function(attachmentType) {
	return this.attachments[attachmentType] instanceof SpriteActorAttachment;
};

// Check if the face of the character is hidden
SpriteActor.prototype.__defineGetter__("faceObscured", function() {
	return this.motionDirection >= 3 && this.motionDirection <= 5;
});

SpriteActor.prototype.Update = function(camera) {
	
	this.UpdatePosition();
	
	if(!this.hasAttachment(SpriteActor.Attachment.BODY)) {
		return;
	}
	
	// Through a convoluted process, update the direction from camera
	
	var cameraX = camera.position.x - camera.target.x;
	var cameraZ = camera.position.z - camera.target.z;
	
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
	
	var attachmentPointers = this
			.attachments[SpriteActor.Attachment.BODY]
			.actFileObject
			.actions[this.motion][attachmentFrameId]
			.attachmentPointers;
	
	// Ground shadow
	
	if(this.hasAttachment(SpriteActor.Attachment.SHADOW)) {
		this.UpdateAttachment(
			dt,
			SpriteActor.Attachment.SHADOW, 
			0,
			0.0, 
			-1.0
		);
	}
	
	// Head & headgear attachments
	
	var attachments = [SpriteActor.Attachment.HEAD, SpriteActor.Attachment.TOP, SpriteActor.Attachment.MID, SpriteActor.Attachment.BOTTOM];
	
	var bodyAttachmentOffset = attachmentPointers[0];
	
	for(var i = 0; i < attachments.length; i++) {
	
		var attachment = attachments[i];
		
		
		if(this.hasAttachment(attachment)) {
			
			if(attachment == SpriteActor.Attachment.BOTTOM && this.faceObscured) {
				// hide attachment from view
				this.HideAttachment(attachment);
				continue;
			}
			
			var currentAttachmentOffset = this
				.getAttachment(attachment)
				.actFileObject
				.actions[this.motion][this.lookingDirection]
				.attachmentPointers[0];
			
			this.UpdateAttachment(
				dt,
				attachment, 
				this.lookingDirection,
				bodyAttachmentOffset.x - currentAttachmentOffset.x, 
				bodyAttachmentOffset.y - currentAttachmentOffset.y
			);
		}
	};
	
	if(this.displayMessageSprite instanceof THREE.Sprite) {
		
		this.alignMessageSprite();
		
		if(Date.now() - this.displayMessageCreationTime > SpriteActor.CMessageDuration) {
			this.removeDisplayMessageLabel();
		}
		
	}
	
	if(this.nameLabelSprite instanceof THREE.Sprite && this.nameLabelSprite.visible) {
		this.alignNameLabelSprite();
	}
		
	this.lastUpdate = Date.now();
	
};

SpriteActor.CMessageBoxPadding = 12;
SpriteActor.CMessageBoxAlpha = 1/3 + 1/9;

SpriteActor.CMessageBoxAlignmentY = 28.0 - Settings.fontSize;

SpriteActor.CMessageDuration = 5000;

SpriteActor.CMessageColorDefault = new THREE.Color(0xffffff);
SpriteActor.CMessageColorGM = new THREE.Color(0xffde00);

SpriteActor.CLabelAlignmentY = 8.0 - Settings.fontSize;
//SpriteActor.CLabelTimeout = 100;

SpriteActor.CLabelFontOption = "bold";

SpriteActor.CLabelColorPlayer = new THREE.Color(0xffffff);
SpriteActor.CLabelColorNPC = new THREE.Color(0x94bdf7);
SpriteActor.CLabelColorMonster = new THREE.Color(0x9c9c9c);
SpriteActor.CLabelOutlineColor = new THREE.Color(0x000000);

SpriteActor.prototype.alignMessageSprite = function() {
	
	var a = this.displayMessageSprite.material.alignment;
		
	a.y = SpriteActor.CMessageBoxAlignmentY / ( this.mapInstance.controls.zoom ); // ! todo: increase cohesion
	a.y += 20 * a.y * (0.03 - this.displayMessageSprite.scale.y);
};

SpriteActor.prototype.alignNameLabelSprite = function() {
	
	var a = this.nameLabelSprite.material.alignment;
		
	a.y = SpriteActor.CLabelAlignmentY / ( this.mapInstance.controls.zoom ); // ! todo: increase cohesion
	a.y += 10 * a.y * (0.03 - this.nameLabelSprite.scale.y);
};

SpriteActor.prototype.generateNameLabel = function() {
	
	name = this.name || "unknown";
	
	this.nameLabelCreationTime = Date.now();

	var textColor;
	var strokeColor = SpriteActor.CLabelOutlineColor;
	
	switch(this.type) {
		case SpriteActor.Types.NPC: 
			textColor = SpriteActor.CLabelColorNPC;
			break;
		case SpriteActor.Types.MONSTER: 
			textColor = SpriteActor.CLabelColorMonster;
			break;
		case SpriteActor.Types.PLAYER: 
		default:
			textColor = SpriteActor.CLabelColorPlayer;
	}
	
	var canvas = window.document.createElement("canvas");
	var ctx = canvas.getContext("2d");
	
	var textHeight = Settings.fontSize;
	
	var fontStyle = SpriteActor.CLabelFontOption + " " + textHeight + "pt " + Settings.fontFamily;
	
	ctx.font = fontStyle;
	
	var textWidth = ctx.measureText(name).width;
	
	canvas.width = textWidth + SpriteActor.CMessageBoxPadding;
	canvas.height = 2 * textHeight;
	
	// setting canvas.width resets the font size ...
	ctx.font = fontStyle;
	
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#" + textColor.getHexString();
	ctx.strokeStyle = "#" + strokeColor.getHexString();
	ctx.lineWidth = 3;
	
	ctx.strokeText(name, canvas.width / 2 + 0.5, canvas.height / 2 + 0.5);
	ctx.fillText(name, canvas.width / 2, canvas.height / 2);
	
	var texture = new THREE.Texture(canvas);
	
	texture.generateMipmaps = false;
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	
	texture.needsUpdate = true;
	
	var material = new THREE.MeshBasicMaterial({
		map: texture,
		transparent: true
	});
	
	var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
		map: texture,
		useScreenCoordinates: false,
		alignment: new THREE.Vector2,
		transparent: true,
		opacity: 1.0,
		alphaTest: 0.5,
	}));
	
	sprite.zIndex = 0;
	sprite.zGroup = 1e10;
	
	sprite.material.alphaTest = 0.0;
	
	sprite.material.sizeAttenuation = false;
	sprite.material.alignment.y = 999.0;
	sprite.material.depthTest = false;
	
	sprite.scale.y = 0.9 * 0.03 * textHeight / 14 * ( 1080 / mapLoader.screen.height );
	
	sprite.scale.x = sprite.scale.y * canvas.width / canvas.height;
		
	sprite.position = this.position;
	
	sprite.visible = false;
	
	this.nameLabelSprite = sprite;
	
	this._nameLabelGenerated = true;
	
	this.mapInstance.scene.add(sprite);
	
};

SpriteActor.prototype.showNameLabel = function() {
	
	if(!this._nameLabelGenerated)
		this.generateNameLabel();
	
	this.alignNameLabelSprite();
	this.nameLabelSprite.visible = true;
};

SpriteActor.prototype.hideNameLabel = function() {

	if(!this._nameLabelGenerated)
		return;

	this.nameLabelSprite.visible = false;
};

SpriteActor.prototype.removeDisplayMessageLabel = function() {

	if(this.displayMessageSprite instanceof THREE.Sprite) {
		this.mapInstance.scene.remove(this.displayMessageSprite);
	}
	
	this.displayMessageSprite = null;
	this.displayMessageCreationTime = -1;

};

SpriteActor.prototype.displayMessageLabel = function(message) {

	this.removeDisplayMessageLabel();

	this.displayMessageCreationTime = Date.now();

	var color = color || SpriteActor.CMessageColorDefault;
	
	var canvas = window.document.createElement("canvas");
	var ctx = canvas.getContext("2d");
	
	var textHeight = Settings.fontSize;
	
	ctx.font = textHeight + "pt " + Settings.fontFamily;
	
	var textWidth = ctx.measureText(message).width;
	
	canvas.width = textWidth + SpriteActor.CMessageBoxPadding;
	canvas.height = 2 * textHeight;
	
	// setting canvas.width resets the font size ...
	ctx.font = textHeight + "pt " + Settings.fontFamily;
	
	ctx.globalAlpha = SpriteActor.CMessageBoxAlpha;
	
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	ctx.globalAlpha = 1.0;
	
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#" + color.getHexString();
	ctx.strokeStyle = "#" + SpriteActor.CLabelOutlineColor.getHexString();
	ctx.strokeText(message, canvas.width / 2, canvas.height / 2);
	ctx.fillText(message, canvas.width / 2, canvas.height / 2);
	
	var texture = new THREE.Texture(canvas);
	
	texture.generateMipmaps = false;
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	
	texture.needsUpdate = true;
	
	var material = new THREE.MeshBasicMaterial({
		map: texture,
		transparent: true
	});
	
	var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
		map: texture,
		useScreenCoordinates: false,
		alignment: new THREE.Vector2,
		transparent: true,
		opacity: 1.0,
		alphaTest: 0.5,
	}));
	
	sprite.zIndex = 0;
	sprite.zGroup = 1e10;
	
	sprite.material.alphaTest = 0.0;
	
	sprite.material.sizeAttenuation = false;
	sprite.material.alignment.y = 999.0;
	sprite.material.depthTest = false;
	
	sprite.scale.y = 0.9 * 0.03 * ( textHeight / 14 ) * ( 1080 / mapLoader.screen.height );
	sprite.scale.x = sprite.scale.y * canvas.width / canvas.height;
		
	sprite.position = this.position;
	
	this.displayMessageSprite = sprite;
	
	this.mapInstance.scene.add(sprite);
	
};
