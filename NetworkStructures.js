var ItemTypes = {
	
};

function ItemRecord() {
	this.index = 0;
	this.id = 0;
	this.type = 0;
	this.identifed = 0;
	this.type_equip = 0;
	this.count = 0;
	this.equipped = 0;
	this.broken = 0;
	this.upgrade = 0;
	this.cards = [];
};

function PlayerStatus() {
	this.points = 0;
	this.str = 0;
	// TODO
}

function CActor() {
	
	this.actorType = 0;
	this.gId = 0;
	this.speed = 0;
	this.bodyState = 0;
	this.healthState = 0;
	this.effectState = 0;
	this.jobId = 0;
	this.headId = 0;
	this.weaponId = 0;
	this.accessoryId = 0;
	this.shieldId = 0;
	this.accessory2Id = 0;
	this.accessory3Id = 0;
	this.headPaletteId = 0;
	this.bodyPaletteId = 0;
	this.headDirection = 0;
	this.guildId = 0;
	this.guildEmblemVersion = 0;
	this.honor = 0;
	this.virtue = 0;
	this.inPkMode = 0;
	this.gender = 0;
	this.xSize = 0;
	this.ySize = 0;
	this.state = 0;
	this.clientLevel = 0;
	this.sit = 0;
	
	this.x = 0;
	this.y = 0;
	
	this.__targetX = 0;
	this.__targetY = 0;
	
};