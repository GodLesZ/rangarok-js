var RagnarokControls = function( camera, domElement ) {
	
	this.camera = camera;
	this.domElement = domElement;
	
	this.isRotating = false;
	
	this.rotation = Math.PI / 2;
	this.rotationSpeed = 0;
	this.rotationMin = 0;
	this.rotationMax = 2 * Math.PI;
	
	this.zoom = RagnarokControls.ZoomTargetMin;
	this.targetZoom = 1.0;
	
	this.shift = 0;
	
	this.position = new THREE.Vector3;
	
	this.target = null;
	
	//
	this.camera.target = this.position;
	
	this.height = 0;
	this.targetHeight = 0;
	
	this.mouseCoords = new THREE.Vector2(0, 0);
	
};

RagnarokControls.ZoomTargetMin = 0.9;
RagnarokControls.ZoomTargetMax = 1.55;

RagnarokControls.CameraMovementCutoff = 2.5 / 10e3;

RagnarokControls.RotDampening = 0.85;
RagnarokControls.RotAcceleration = 0.15;

RagnarokControls.LerpRatio = 0.08;

RagnarokControls.CameraDistanceZ = 182;
RagnarokControls.CameraDistanceXYRatio = 0.99;

RagnarokControls.ScrollSensitivity = 0.5 / 768;

RagnarokControls.prototype.bindActor = function( actor ) {
	
	this.target = actor;
	
	this.position.copy( this.target.position );
	
};

RagnarokControls.prototype.setCamera = function() {
	
	var p = this.position;
	var h = this.zoom * RagnarokControls.CameraDistanceZ;
	
	var s = RagnarokControls.CameraDistanceXYRatio - this.shift;
	
	this.camera.position = new THREE.Vector3(
		p.x + h / s * Math.cos( this.rotation ),
		p.y + h,
		p.z + h / s * Math.sin( this.rotation )
	);
	
	this.camera.lookAt( p );
	
};

RagnarokControls.prototype.EnableRotation = function() {
	this.isRotating = true;
};

RagnarokControls.prototype.DisableRotation = function() {
	this.isRotating = false;
};

RagnarokControls.prototype.SetRotationRange = function(min, max) {
	// Indoor ; 115 - 150
	this.rotationMin = min;
	this.rotationMax = max;
};

RagnarokControls.prototype.Zoom = function( delta ) {
	
	this.targetZoom += delta * RagnarokControls.ScrollSensitivity;
	
};

RagnarokControls.prototype.OnMouseMove = function( e ) {
	
	var dx = e.x - this.mouseCoords.x;
	var dy = e.y - this.mouseCoords.y;
	
	if( this.isRotating ) {
		
		if( e.shift ) {
			
			this.shift += 0.5 * dy / this.domElement.height;
			//MapLoader.CameraDistanceXYRatio += 0.5 * delta.y / this.renderer.domElement.height;
			//MapLoader.CameraDistanceZ = MapLoader.CameraDistanceXYRatio * MapLoader.CameraDistanceXYZRatio;
		
		}
		
		this.rotationSpeed += dx * (2 * Math.PI) * RagnarokControls.RotAcceleration / this.domElement.height;
		
	}
	
	this.mouseCoords.x = e.x;
	this.mouseCoords.y = e.y;
	
};

RagnarokControls.prototype.Update = function( dt ) {

	if( this.target !== null  ) {
		
		var r = dt / 10;
		
		// Update rotation
		
		//if( this.rotationMax < 2 * Math.PI && this.rotationSpeed > 0 ) {
		//	this.rotation *= Math.min(1.0, Math.log(this.rotationMax - this.rotation) );
		//}
		
		this.rotationSpeed *= RagnarokControls.RotDampening;
		this.rotation = ( this.rotation + r * this.rotationSpeed ) % (2 * Math.PI);
		
		if(this.rotation < 0) {
			this.rotation += 2 * Math.PI;
		}
		
		//if( this.rotation > this.rotationMax ) {
		//	this.rotation *= 0.99;
		//}
		
		//if( this.rotation < this.rotationMin ) {
		//	this.rotation *= 1.01;
		//}
		
		
		this.rotation = Math.min( this.rotation, this.rotationMax );
		this.rotation = Math.max( this.rotation, this.rotationMin );
		
		// Update position
		
		var dx0 = this.target.position.x 
			- this.position.x;
		var dy0 = this.target.position.y - this.position.y;
		var dz0 = this.target.position.z - this.position.z;
		
		var dx1 = dx0 * RagnarokControls.LerpRatio;
		var dy1 = dy0 * RagnarokControls.LerpRatio;
		var dz1 = dz0 * RagnarokControls.LerpRatio;
		
		this.position.x += Math.abs( dx1 ) < RagnarokControls.CameraMovementCutoff ? dx0 : dx1;
		this.position.y += Math.abs( dy1 ) < RagnarokControls.CameraMovementCutoff ? dy0 : dy1;
		this.position.z += Math.abs( dz1 ) < RagnarokControls.CameraMovementCutoff ? dz0 : dz1;
		
		// Clamp target zoom
		
		this.targetZoom = Math.max(
			Math.min( this.targetZoom, RagnarokControls.ZoomTargetMax ),
			RagnarokControls.ZoomTargetMin
		);
		
		// Set zoom
		
		var zoomDt0 = this.targetZoom - this.zoom;
		var zoomDt1 = zoomDt0 * RagnarokControls.LerpRatio;
		
		this.zoom += Math.abs( zoomDt1 ) < RagnarokControls.CameraMovementCutoff ? zoomDt0 : zoomDt1;
		
		// Update main actor (remove when actors are synced to camera drawing)
		this.target.Update( this.camera );
		
		this.setCamera();
		
	}

};