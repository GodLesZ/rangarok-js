var BoundingBox = function() {
	this.max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
	this.min = new THREE.Vector3(+Infinity, +Infinity, +Infinity);
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
