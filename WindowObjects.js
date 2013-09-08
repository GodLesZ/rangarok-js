function LoginWindow() {
	
	BaseWindow.call( this, 280, 120 );
	
	this.addBitmap( 'login_interface/win_login.gif', 0 );
	
	this.draggable = true;
	
	// Add buttons
	
	var buttonLogin = new InputButton( Interface.Button.Login, 42, 20 );
	var buttonExit = new InputButton( Interface.Button.Exit, 42, 20 );
	
	buttonLogin.addBitmap( 'login_interface/btn_connect.gif', 0 );
	buttonLogin.addBitmap( 'login_interface/btn_connect_a.gif', 1 );
	buttonLogin.addBitmap( 'login_interface/btn_connect_b.gif', 2 );
	
	buttonExit.addBitmap( 'login_interface/btn_exit.gif', 0 );
	buttonExit.addBitmap( 'login_interface/btn_exit_a.gif', 1 );
	buttonExit.addBitmap( 'login_interface/btn_exit_b.gif', 2 );
	
	buttonLogin.addListener( this );
	buttonExit.addListener( this );
	
	this.addComponent( buttonLogin, InterfaceAlignment.Right, InterfaceAlignment.Bottom, -50, -4 );
	this.addComponent( buttonExit, InterfaceAlignment.Right, InterfaceAlignment.Bottom, -4, -4 );
	
	// Set-up text fields
	
	this.userTextField = new DOMTextInput( 120, 15, 'text' );
	this.passwordTextField = new DOMTextInput( 120, 15, 'password' );
	
	this.addComponent( this.userTextField, '95px', '31px' );
	this.addComponent( this.passwordTextField, '95px', '63px' );
	
};

LoginWindow.prototype = Object.create( BaseWindow.prototype );

LoginWindow.prototype.__onEvent = function( button ) {
	
	this.onEvent({
		window: this,
		action: button.__event,
		username: this.userTextField.data,
		password: this.passwordTextField.data
	});
	
};


function ServiceWindow() {
	
	BaseWindow.call( this, 280, 120 );
	
	this.addBitmap( 'login_interface/win_service.gif', 0 );
	
	this.draggable = true;
	
	var buttonSelect = new InputButton( Interface.Button.Select, 42, 20 );
	
	buttonSelect.addListener( this );
	
	buttonSelect.addBitmap( 'login_interface/btn_ok.gif', 0 );
	buttonSelect.addBitmap( 'login_interface/btn_ok_a.gif', 1 );
	buttonSelect.addBitmap( 'login_interface/btn_ok_b.gif', 2 );
	
	this.addComponent( buttonSelect, InterfaceAlignment.Right, InterfaceAlignment.Bottom, -50, -4 );
	
	var buttonCancel = new InputButton( Interface.Button.Cancel, 42, 20 );
	
	buttonCancel.addListener( this );
	
	buttonCancel.addBitmap( 'login_interface/btn_cancel.gif', 0 );
	buttonCancel.addBitmap( 'login_interface/btn_cancel_a.gif', 1 );
	buttonCancel.addBitmap( 'login_interface/btn_cancel_b.gif', 2 );
	
	this.addComponent( buttonCancel, InterfaceAlignment.Right, InterfaceAlignment.Bottom, -4, -4 );
	
	this.list = new SelectionList( 260, 60 );
	
	this.addComponent( this.list, InterfaceAlignment.Center, '25px' );
	
};

ServiceWindow.prototype = Object.create( BaseWindow.prototype );

ServiceWindow.prototype.addService = function( serviceName, serviceId ) {
	
	this.list.addItem( serviceName, serviceId );
	
};

ServiceWindow.prototype.__onEvent = function( button ) {
	
	var value = this.list.__selected >= 0 
		&& this.list.__selected < this.list.__items.length
			? this.list.__items[ this.list.__selected ].value
			: -1;
	
	this.onEvent({
		window: this,
		action: button.__event,
		serverId: value
	});

};

function RagnarokCharacterComponent( charInfo, width, height ) {

	width = width || 139;
	height = height || 144;

	InterfaceComponent.call( this, width, height );
	
	this.__charInfo = charInfo;
	this.__attachments = {};
	this.__action = 0;
	this.__needsUpdate = true;
	
	this.__empty = this.__charInfo ? false : true;
	
	this.__canvas = document.createElement('canvas');
	
	this.__canvas.width = this.width;
	this.__canvas.height = this.height;
	
	this.__context = this.__canvas.getContext('2d');
	
	if( !this.__empty ) {
		
		var self = this;
		
		// Body
		
		var classRes = FileManager.getClassBodyResPath( charInfo.job, charInfo.Sex );
		
		FileManager.loadSpriteActAsync( classRes, function( obj ) {
			self.setAttachment( 'body', obj );
		});
		
		// Head
		
		var headRes = FileManager.getHeadResPath( charInfo.head, charInfo.Sex );
		
		FileManager.loadSpriteActAsync( headRes, function( obj ) {
			self.setAttachment( 'head', obj );
		});
		
		// Head top
		
		if( charInfo.accessory2 > 0 ) {
			
			var topRes = FileManager.getAccessoryResPath( charInfo.accessory2, charInfo.Sex );
			
			FileManager.loadSpriteActAsync( topRes, function( obj ) {
				self.setAttachment( 'top', obj );
			});
		
		}
		
		// Head mid
		
		if( charInfo.accessory3 > 0 ) {
			
			var midRes = FileManager.getAccessoryResPath( charInfo.accessory3, charInfo.Sex );
			
			FileManager.loadSpriteActAsync( midRes, function( obj ) {
				self.setAttachment( 'mid', obj );
			});
		
		}
		
		// Head bottom
		
		if( charInfo.accessory > 0 ) {
			
			var bottomRes = FileManager.getAccessoryResPath( charInfo.accessory, charInfo.Sex );
			
			FileManager.loadSpriteActAsync( bottomRes, function( obj ) {
				self.setAttachment( 'bottom', obj );
			});
		
		}
		
		
	}
	
};

RagnarokCharacterComponent.prototype = Object.create( InterfaceComponent.prototype );

RagnarokCharacterComponent.prototype.onInputDown = function( event ) {
	// Check button, perhaps?
	this.fireEvent();
};

// Sets a new attachment to the actor
// valid types: "body", "hair", "accessory" (head bottom), "accessory2" (head mid), "accessory3" (head top)
RagnarokCharacterComponent.prototype.setAttachment = function( type, obj ) {
	this.__attachments[ type ] = obj;
	this.__needsUpdate = true;
	this.refresh();
};

RagnarokCharacterComponent.prototype.draw = function( context, sx, sy ) {
	
	if( this.__empty ) {
		return;
	}
	
	if( this.__needsUpdate ) {	
		
		if( !this.__attachments.body ) {
			return;
		}
		
		this.drawAttachment( this.__context, 'body', 0, 0, 0 );
		
		var bodyPointer = this.__attachments.body.actor.actions[ this.__action ][0].attachmentPointers[0];
		
		if( this.__attachments.head ) {
			
			var headPointer = this.__attachments.head.actor.actions[ this.__action ][0].attachmentPointers[0];
			
			this.drawAttachment(
				this.__context, 
				'head', 
				0, 
				bodyPointer.x - headPointer.x,
				bodyPointer.y - headPointer.y
			);
		}
		
		var views = ['bottom', 'mid', 'top'];
		
		for( var i = 0; i < views.length; i++ ) {
		
			var loc = views[i];
			
			if( this.__attachments[loc] ) {
				
				var locPointer = this.__attachments[loc].actor.actions[ this.__action ][0].attachmentPointers[0];
				
				this.drawAttachment(
					this.__context, 
					loc, 
					0,  
					bodyPointer.x - locPointer.x, 
					bodyPointer.y - locPointer.y
				);
				
			}
		
		}
		
		this.__needsUpdate = false;
		
	}
	
	context.drawImage( this.__canvas, sx, sy );
	
};

RagnarokCharacterComponent.prototype.drawAttachment = function( context, type, frameNo, dx, dy ) {
	
	var sprActor = this.__attachments[type];
	var sprite = sprActor.sprite;
	var frameData = sprActor.actor.actions[ this.__action ][ frameNo ].sprites;

	var tmpCanvas = document.createElement('canvas');
	var tmpContext = tmpCanvas.getContext('2d');

	for( var i = 0; i < frameData.length; i++ ) {
		
		var dispInfo = frameData[i];
		
		if( dispInfo.id < 0 )
			continue;
		
		var width, height, data;
		
		if( dispInfo.type == 'rgba' ) {
			width = sprite.getRgbaFrameWidth( dispInfo.id );
			height = sprite.getRgbaFrameHeight( dispInfo.id );
			data = sprite.getRgbaFrameDataRgba( dispInfo.id );
		} else {
			width = sprite.getIndexedFrameWidth( dispInfo.id );
			height = sprite.getIndexedFrameHeight( dispInfo.id );
			data = sprite.getIndexedFrameDataRgba( dispInfo.id );
		}
		
		// Create sprite from image data
		
		tmpCanvas.width = width;
		tmpCanvas.height = height;
		
		var imgd = tmpContext.createImageData( width, height );
		
		for( var p = 0; p < 4 * width * height; p++ ) {
			imgd.data[p] = data[p];
		}
		
		tmpContext.putImageData( imgd, 0, 0 );
		
		// Draw to proper canvas
		
		context.save();
		
		var sx = dispInfo.scaleX * ( dispInfo.flipped ? -1 : 1 );
		var sy = dispInfo.scaleY;
		var theta = Math.PI * dispInfo.angle / 180 * ( dispInfo.flipped ? -1 : 1 );
		var alpha = dispInfo.color[0] / 255;
		
		var cos_a = Math.cos( theta );
		var sin_a = Math.sin( theta );
		
		var x0 = -width / 2;
		var y0 = -height / 2;
		var x = context.canvas.width / 2 + dispInfo.x + dx;
		var y = 4 * context.canvas.height / 5 + dispInfo.y + dy;
		
		// Setup transformation matrix:
		// translate_center_canvas * translation * rotation * scale * translate_center_sprite
		// m11	m21	dx
		// m12	m22	dy
		var trans = [
			sx * cos_a, -sy * sin_a, sx * x0 * cos_a - sy * y0 * sin_a + x,
			sx * sin_a, sy * cos_a, sy * y0 * cos_a + sy * x0 * sin_a + y
		];
		
		// m11, m12, m21, m22, dx, dy 
		context.transform( trans[0], trans[3], trans[1], trans[4], trans[2], trans[5] );
		
		if( alpha < 1 ) {
			context.globalAlpha = alpha;
		}
		
		context.drawImage( tmpCanvas, 0, 0 );
		
		context.restore();
		
	}

};

var CharacterSelectWindow = function() {
	
	BaseWindow.call( this, 576, 342 );
	
	this.addBitmap( 'login_interface/win_select.gif', 0 );
	this.addBitmap( 'login_interface/box_select.gif', 1 );
	
	this.draggable = true;
	this.numSlots = 3;
	
	this.__dispAttrs = [ 
		'name', 'job', 'level',
		'exp', 'hp', 'sp',
		'Str', 'Agi', 'Vit',
		'Int', 'Dex', 'Luk'
	];
	
	this.__attrDim = [ 90, 16 ];
	this.__slotPos = [ [ 55, 40 ], [ 218, 40 ], [ 382, 40 ] ];
	this.__slot = null;
	this.__charComponents = [];
	this.__attrLabels = [];
	
	// Setup labels
	
	var baseX = 68, baseY = 204;
	var offsetX = 0, offsetY = 0;
	
	for( var i = 0; i < this.__dispAttrs.length; i++ ) {
		
		if( i > 0 && i % 6 == 0 ) {
			offsetY = 0;
			offsetX += 145;
		}
		
		var label = new CanvasTextfield( this.__attrDim[0], this.__attrDim[1] );
		
		//label.data = this.__dispAttrs[i];
		
		this.__attrLabels.push( label );
		
		this.addComponent( label, '0px', '0px', baseX + offsetX, baseY + offsetY );
		
		offsetY += this.__attrDim[1];
		
	};
	
	// Buttons
	
	var buttonSelect = new InputButton( Interface.Button.Select, 42, 20 );
	
	buttonSelect.addListener( this );
	
	buttonSelect.addBitmap( 'login_interface/btn_ok.gif', 0 );
	buttonSelect.addBitmap( 'login_interface/btn_ok_a.gif', 1 );
	buttonSelect.addBitmap( 'login_interface/btn_ok_b.gif', 2 );
	
	this.addComponent( buttonSelect, InterfaceAlignment.Right, InterfaceAlignment.Bottom, -50, -4 );
	
	var buttonCancel = new InputButton( Interface.Button.Cancel, 42, 20 );
	
	buttonCancel.addListener( this );
	
	buttonCancel.addBitmap( 'login_interface/btn_cancel.gif', 0 );
	buttonCancel.addBitmap( 'login_interface/btn_cancel_a.gif', 1 );
	buttonCancel.addBitmap( 'login_interface/btn_cancel_b.gif', 2 );
	
	this.addComponent( buttonCancel, InterfaceAlignment.Right, InterfaceAlignment.Bottom, -4, -4 );
	
};

CharacterSelectWindow.prototype = Object.create( BaseWindow.prototype );

CharacterSelectWindow.prototype.__onEvent = function( obj ) {
	
	if( obj instanceof RagnarokCharacterComponent ) {
		
		this.__slot = obj.__charInfo.CharNum;
		
		if( !obj.__empty ) {
			// Display attributes
			for( var i = 0; i < this.__attrLabels.length; i++ ) {
				// Set __data directly, click event refreshes anyway...
				this.__attrLabels[i].__data 
					= obj.__charInfo[ this.__dispAttrs[i] ];
			}
		}
		
		
	} else if( obj instanceof InputButton ) {
		
		this.onEvent({
			window: this,
			action: obj.__event,
			charId: this.__slot
		});
		
	}
	
};

CharacterSelectWindow.prototype.draw = function( context, sx, sy ) {

	// Draw the characters in the three first slots
	for( var i = 0; i < 3; i++ ) {
		if( this.__charComponents[i] !== undefined ) {
			this.__charComponents[i].__visible = true;
		}
	}
	
	context.fillStyle = "black";
	
	BaseWindow.prototype.draw.call( this, context, sx, sy );
	
	if( this.__slot !== null && this.__ready && this.__bitmaps.length > 1 ) {
		
		var selected_position = this.__slotPos[ this.__slot % 3 ];
		
		context.drawImage(
			this.__bitmaps[1],
			sx + selected_position[0],
			sy + selected_position[1]
		);
	
	}

};

CharacterSelectWindow.prototype.addCharacter = function( charInfo ) {
	
	var roChar = new RagnarokCharacterComponent( charInfo );
	
	roChar.__visible = false;
	roChar.addListener( this );
	
	var pos = this.__slotPos[ charInfo.CharNum % 3 ];
	
	this.__charComponents[ charInfo.CharNum ] = roChar;
	this.addComponent( roChar, null, null, pos[0], pos[1] );
	
	this.refresh();
	
};

var ScrollBar = function(width, height, scrollButtonHeight, scrollBarHeight, scrollUp, scrollDown, scrollBg, scrollBar ) {
	
	BaseWindow.call(this, width, height);
	
	this.backgroundRepeat = true;
	
	this.addBitmap( scrollBg, 0 );
	
	var bScrollUp = new InputButton( Interface.Button.Select, width, scrollButtonHeight );
	var bScrollDown = new InputButton( Interface.Button.Select, width, scrollButtonHeight );
	
	bScrollUp.__useHover = false;
	bScrollDown.__useHover = false;
	bScrollUp.__useActive = false;
	bScrollDown.__useActive = false;
	
	bScrollUp.addBitmap( scrollUp, 0 );
	bScrollDown.addBitmap( scrollDown, 0 );
	
	this.addComponent( bScrollUp, InterfaceAlignment.Left, InterfaceAlignment.Top, 0, 0 );
	this.addComponent( bScrollDown, InterfaceAlignment.Left, InterfaceAlignment.Bottom, 0, 0 );
	
};

ScrollBar.prototype = Object.create( BaseWindow.prototype );


var ChatWindow = function() {

	BaseWindow.call( this, 600, 195);

	this.lines = Array(10);
	this.alphaColor = 0.0;
	this.addBitmap('basic_interface/dialog_bg.gif', 1);

	this.history = [];
	this.historyOffset = 0;

	// Scroll bar
	
	var scroll = new ScrollBar(
		10, this.height - 25, // w, h
		10, 4, // buttonHeight, barHeight
		"basic_interface/dialscr_up.gif",
		"basic_interface/dialscr_down.gif",
		"basic_interface/dialscr_bg2.gif",
		"basic_interface/dialsrc_bar.gif"
	);

	this.addComponent( scroll, InterfaceAlignment.Right, InterfaceAlignment.Top, -7, 0 );

	// Buttons right
	
	// Right
	var buttonSelect = new InputButton( Interface.Button.Select, 11, 11 );
	
	buttonSelect.addListener( this );
	
	buttonSelect.addBitmap( 'basic_interface/sys_base_off.gif', 0 );
	buttonSelect.addBitmap( 'basic_interface/sys_base_on.gif', 1 );
	buttonSelect.addBitmap( 'basic_interface/sys_base_on.gif', 2 );
	
	this.addComponent( buttonSelect, InterfaceAlignment.Right, InterfaceAlignment.Bottom, -4, -6 );

	// Left
	var buttonSelect = new InputButton( Interface.Button.Select, 11, 11 );
	
	buttonSelect.addListener( this );
	
	buttonSelect.addBitmap( 'basic_interface/sys_base_off.gif', 0 );
	buttonSelect.addBitmap( 'basic_interface/sys_base_on.gif', 1 );
	buttonSelect.addBitmap( 'basic_interface/sys_base_on.gif', 2 );
	
	this.addComponent( buttonSelect, InterfaceAlignment.Right, InterfaceAlignment.Bottom, -17, -6 );
	
	// Main text input

	this.inputField = new DOMTextInput(460, 15, 'text');
	
	this.inputField.domElement.onkeyup = (function(e) {
		if(e.keyCode == 13) {
			this.__onEvent(this.inputField.data);
			this.inputField.data = "";
		}
		
		if(e.keyCode == 38 || e.keyCode == 40) { // UP
			
			if(this.history.length < 1)
				return;
		
			var t = this.historyOffset;
		
			if(e.keyCode == 40) {
				this.historyOffset = Math.max(this.historyOffset - 1, 1);
			} else {
				this.historyOffset = Math.min(this.historyOffset + 1, this.history.length );
			}
			
			if(this.historyOffset !== t) {
				this.inputField.data = this.history[ this.history.length - this.historyOffset ];
				this.inputField.domElement.select();			
			}
		}
		
	}).bind(this);
	
	this.addComponent(this.inputField, '115px', InterfaceAlignment.Bottom, null, -4);

};

ChatWindow.prototype = Object.create( BaseWindow.prototype );

ChatWindow.prototype.__onEvent = function(e) {	
	
	if(typeof e == "string") {
		this.onEvent(e);
	}
	else console.log(e);
};

ChatWindow.prototype.pushHistory = function(str) {
	this.history.push(str);
	this.historyOffset = 0;
};

ChatWindow.prototype.writeLine = function(str, color) {
	this.lines.shift();
	this.lines.push({
		message: str,
		color: color ? color : "#fff"
	});
	this.refresh();
};

ChatWindow.prototype.draw = function(ctx, sx, sy) {

	ctx.globalAlpha = 0.5;
	ctx.fillStyle = "black";
	ctx.fillRect(sx + 3, sy, this.width - 6, this.height);
	ctx.globalAlpha = 1.0;
	
	ctx.font = Settings.fontSize + "px " + Settings.fontFamily;
	ctx.textBaseline = "bottom";
	
	for(var i = 0; i < this.lines.length - 1; i++) {
		
		var line = this.lines[this.lines.length - i - 1];
	
		if( line ) {
			
			ctx.fillStyle = line.color;
			ctx.fillText(line.message, sx + 10, sy + this.height - 30 - 18 * i);
		}
	
	}
	
	var inputBg = this.__bitmaps[1];
	
	if(inputBg)
		ctx.drawImage(inputBg, sx, sy + this.height - inputBg.height);
	
	BaseWindow.prototype.draw.call(this, ctx, sx, sy);
	
};

var Minimap = function(width, height) {

	BaseWindow.call( this, width, height );
	
	this.processBackground = true;
	
	this.gatX = 0;
	this.gatY = 0;
	this.gatWidth = 400;
	this.gatHeight = 400;
	this.gatDirection = 0;

};

Minimap.prototype = Object.create( BaseWindow.prototype );

Minimap.prototype.setMap = function( mapName ) {

	var path = Settings.dataFolderUri + "texture/À¯ÀúÀÎÅÍÆäÀÌ½º/map/";

	this.addBitmap(path + mapName.replace(".rsw", ".bmp"), 0);

};

Minimap.prototype.setPosition = function(x, y, width, height, direction) {
	
	this.gatX = x;
	this.gatY = y;
	this.gatWidth = width;
	this.gatHeight = height;
	this.gatDirection = direction;
	
	this.__needsUpdate = true;
	this.refresh();
	
};

Minimap.prototype.draw = function( ctx, sx, sy ) {

	BaseWindow.prototype.draw.call(this, ctx, sx, sy);
	
	// Draw marker

	ctx.save();
	
	ctx.fillStyle = "#ffffff";
	ctx.stokeStyle = "#000000";
	
	//ctx.fillRect(, , 3, 3 );
	
	var x = sx + this.width * this.gatX / this.gatWidth;
	var y = sy + this.height * (1.0 - this.gatY / this.gatHeight);
	
	//ctx.translate(-x, -y);
	
	ctx.translate(x, y);
	ctx.rotate( 45 * this.gatDirection * Math.PI / 180 );
	
	ctx.beginPath();
	
	ctx.moveTo(0, 0);
	ctx.lineTo(0 - 5, 0 - 4);
	ctx.lineTo(0 + 0, 0 + 6);
	ctx.lineTo(0 + 5, 0 - 4);
	ctx.lineTo(0 + 0, 0 + 0);
	
	ctx.stroke();
	ctx.fill();
	
	ctx.closePath();
	
	
	ctx.restore();

};

//function LoadingScreen() {

//	BaseWindow.call( this );

//};

//LoadingScreen.prototype = Object.create( BaseWindow.prototype );

//LoadingScreen.prototype.updateProgress = function( numLoaded, numTotal ) {};
