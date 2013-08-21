var Deferred = function(fn) {
	
	if(!(this instanceof Deferred))
		return (new Deferred).success();

	this._state = Deferred.State.PENDING;
	this.data = null;
	this.error = null;
	this.chain = [];
	this.final = null;
	this.finalized = false;
	this.fn = fn;
	this.n_resolved = 0;
	this.n_total = 0;
};

Deferred.State = {
	PENDING: 0,
	SUCCESS: 1,
	ERROR: 2
};

Deferred.prototype.__defineSetter__('state', function(state) {
	if(this._state != Deferred.State.PENDING) {
		// State is already set, can't reverse it!
	} else {
		this._state = state;
		this.fire();
	}
});

Deferred.prototype.__defineGetter__('state', function() {
	return this._state;
});

Deferred.prototype.resolveChild = function() {
	this.n_resolved++;
	this.tryFinalize();
}

Deferred.prototype.tryFinalize = function(n) {
	
	if(this.finalized)
		return;
	
	if(this.state == Deferred.State.SUCCESS 
		&& this.n_resolved == this.n_total) {
		if(this.final) {
			this.finalized = true;
			this.final(this.data);
		}
	}
};

Deferred.prototype.fire = function() {
	
	if(this.state == Deferred.State.SUCCESS) {
		for(var i = 0; i < this.chain.length; i++) {
			this.chain[i](this.data);
		}
		this.chain = [];
	} else if(this.state == Deferred.State.ERROR) {
		// this.onerror ...
	} else {
		// Do nothing
	}
	
	this.tryFinalize();
	
};

Deferred.prototype.finally = function(action) {
	
	var p = new Deferred(action);
	var parent = this;
	
	this.final = function() {
		if(typeof action == "function") {
			p.success(action(parent.data));
		} else {
			p.success(action);
		}
	}
	
	this.tryFinalize();
	
	return p;
};

Deferred.prototype.then = function(action) {
	return this.onload(action);
};

Deferred.prototype.onload = function(fn) {
	
	var p;
	
	if(fn instanceof Deferred) {
		p = new Deferred(function() {
			return fn;
		});
	}
	else {	
		p = new Deferred(fn);
	}
	
	var parent = this;
	this.n_total++;
	
	this.chain.push(function(data) {
		
		var p2 = p.fn(data);
		
		if(p2 instanceof Deferred) {		
			// Queue next chain if deferred
			p2.onload(function(data) {
				p.success(data);
				parent.resolveChild();
			});
		} else {
			// Or just pass on value
			p.success(p2);
			parent.resolveChild();
		}
		
	});
	
	if(this.state != Deferred.State.PENDING)
		this.fire();
	
	return p;
};

Deferred.prototype.success = function(data) {
	this.data = data;
	this.state = Deferred.State.SUCCESS;
	return this;
};

Deferred.prototype.error = function(err) {
	this.error = err;
	this.state = Deferred.State.ERROR;
	return this;
};
