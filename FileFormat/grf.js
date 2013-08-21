
// Port from the OpenRagnarok ROInt project
var DES = {
	
	BitMaskTable : [ 0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01 ],
	
	BitSwapTable1 : new Uint8Array( 16*4 ).set([
		58, 50, 42, 34, 26, 18, 10,  2, 60, 52, 44, 36, 28, 20, 12,  4,
		62, 54, 46, 38, 30, 22, 14,  6, 64, 56, 48, 40, 32, 24, 16,  8,
		57, 49, 41, 33, 25, 17,  9,  1, 59, 51, 43, 35, 27, 19, 11,  3,
		61, 53, 45, 37, 29, 21, 13,  5, 63, 55, 47, 39, 31, 23, 15,  7
	]),
	
	BitSwapTable2 : new Uint8Array( 16*4 ).set([
		40,  8, 48, 16, 56, 24, 64, 32, 39,  7, 47, 15, 55, 23, 63, 31,
		38,  6, 46, 14, 54, 22, 62, 30, 37,  5, 45, 13, 53, 21, 61, 29,
		36,  4, 44, 12, 52, 20, 60, 28, 35,  3, 43, 11, 51, 19, 59, 27,
		34,  2, 42, 10, 50, 18, 58, 26, 33,  1, 41,  9, 49, 17, 57, 25
	]),
	
	BitSwapTable3 : new Uint8Array( 16*2 ).set([
		16, 7, 20, 21, 29, 12, 28, 17,  1, 15, 23, 26,  5, 18, 31, 10,
	    2,  8, 24, 14, 32, 27,  3,  9, 19, 13, 30,  6, 22, 11,  4, 25
	]),
	
	NibbleData : [
		new Uint8Array( 16*4 ).set([
			0xef, 0x03, 0x41, 0xfd, 0xd8, 0x74, 0x1e, 0x47,  0x26, 0xef, 0xfb, 0x22, 0xb3, 0xd8, 0x84, 0x1e,
			0x39, 0xac, 0xa7, 0x60, 0x62, 0xc1, 0xcd, 0xba,  0x5c, 0x96, 0x90, 0x59, 0x05, 0x3b, 0x7a, 0x85,
			0x40, 0xfd, 0x1e, 0xc8, 0xe7, 0x8a, 0x8b, 0x21,  0xda, 0x43, 0x64, 0x9f, 0x2d, 0x14, 0xb1, 0x72,
			0xf5, 0x5b, 0xc8, 0xb6, 0x9c, 0x37, 0x76, 0xec,  0x39, 0xa0, 0xa3, 0x05, 0x52, 0x6e, 0x0f, 0xd9,
		]), new Uint8Array( 16*4 ).set([
			0xa7, 0xdd, 0x0d, 0x78, 0x9e, 0x0b, 0xe3, 0x95,  0x60, 0x36, 0x36, 0x4f, 0xf9, 0x60, 0x5a, 0xa3,
			0x11, 0x24, 0xd2, 0x87, 0xc8, 0x52, 0x75, 0xec,  0xbb, 0xc1, 0x4c, 0xba, 0x24, 0xfe, 0x8f, 0x19,
			0xda, 0x13, 0x66, 0xaf, 0x49, 0xd0, 0x90, 0x06,  0x8c, 0x6a, 0xfb, 0x91, 0x37, 0x8d, 0x0d, 0x78,
			0xbf, 0x49, 0x11, 0xf4, 0x23, 0xe5, 0xce, 0x3b,  0x55, 0xbc, 0xa2, 0x57, 0xe8, 0x22, 0x74, 0xce,
		]), new Uint8Array( 16*4 ).set([
			0x2c, 0xea, 0xc1, 0xbf, 0x4a, 0x24, 0x1f, 0xc2,  0x79, 0x47, 0xa2, 0x7c, 0xb6, 0xd9, 0x68, 0x15,
			0x80, 0x56, 0x5d, 0x01, 0x33, 0xfd, 0xf4, 0xae,  0xde, 0x30, 0x07, 0x9b, 0xe5, 0x83, 0x9b, 0x68,
			0x49, 0xb4, 0x2e, 0x83, 0x1f, 0xc2, 0xb5, 0x7c,  0xa2, 0x19, 0xd8, 0xe5, 0x7c, 0x2f, 0x83, 0xda,
			0xf7, 0x6b, 0x90, 0xfe, 0xc4, 0x01, 0x5a, 0x97,  0x61, 0xa6, 0x3d, 0x40, 0x0b, 0x58, 0xe6, 0x3d,
		]), new Uint8Array( 16*4 ).set([
			0x4d, 0xd1, 0xb2, 0x0f, 0x28, 0xbd, 0xe4, 0x78,  0xf6, 0x4a, 0x0f, 0x93, 0x8b, 0x17, 0xd1, 0xa4,
			0x3a, 0xec, 0xc9, 0x35, 0x93, 0x56, 0x7e, 0xcb,  0x55, 0x20, 0xa0, 0xfe, 0x6c, 0x89, 0x17, 0x62,
			0x17, 0x62, 0x4b, 0xb1, 0xb4, 0xde, 0xd1, 0x87,  0xc9, 0x14, 0x3c, 0x4a, 0x7e, 0xa8, 0xe2, 0x7d,
			0xa0, 0x9f, 0xf6, 0x5c, 0x6a, 0x09, 0x8d, 0xf0,  0x0f, 0xe3, 0x53, 0x25, 0x95, 0x36, 0x28, 0xcb,
		])
	],

	decode : function( buf, len, cycle ) {

		var p = 0;
		var lop = 0;
		var cnt = 0;
		
		var type = ( cycle == 0 );
		
		if(cycle < 3) cycle = 3;
		else if(cycle < 5) cycle++;
		else if(cycle < 7)  cycle += 9;
		else cycle += 15;
		
		
		var prm, lop_b, tmp, tmp2, a;
		
		for(lop = 0; lop*8 < len; lop++, p += 8) {
			if(lop<20 || (type == 0 && lop % cycle == 0)) { // des
				
				tmp = new Uint8Array(8);
				
				for( lop_b = 0; lop_b != 64; lop_b++ ) {
					prm = DES.BitSwapTable1[lop_b]-1;
					if(buf[((prm >> 3) & 7)+p] & DES.BitMaskTable[prm & 7]) {
						tmp[(lop_b >> 3) & 7] |= DES.BitMaskTable[lop_b & 7];
					}
				}
				
				tmp2 = new Uint8Array(8);
				
				tmp2[0] = ((tmp[7]<<5) | (tmp[4]>>3)) & 0x3f;	// ..0 vutsr
				tmp2[1] = ((tmp[4]<<1) | (tmp[5]>>7)) & 0x3f;	// ..srqpo n
				tmp2[2] = ((tmp[4]<<5) | (tmp[5]>>3)) & 0x3f;	// ..o nmlkj
				tmp2[3] = ((tmp[5]<<1) | (tmp[6]>>7)) & 0x3f;	// ..kjihg f
				tmp2[4] = ((tmp[5]<<5) | (tmp[6]>>3)) & 0x3f;	// ..g fedcb
				tmp2[5] = ((tmp[6]<<1) | (tmp[7]>>7)) & 0x3f;	// ..cba98 7
				tmp2[6] = ((tmp[6]<<5) | (tmp[7]>>3)) & 0x3f;	// ..8 76543
				tmp2[7] = ((tmp[7]<<1) | (tmp[4]>>7)) & 0x3f;	// ..43210 v
				
				for( lop_b = 0; lop_b != 4; lop_b++ ) {
					tmp2[lop_b] = ( DES.NibbleData[lop_b][tmp2[lop_b*2]] & 0xf0 )
					| ( DES.NibbleData[lop_b][tmp2[lop_b*2+1]] & 0x0f );
				}
				
				tmp2[4] = 0;
				tmp2[5] = 0;
				tmp2[6] = 0;
				tmp2[7] = 0;
				
				for( lop_b = 0; lop_b != 32; lop_b++ ) {
					prm = DES.BitSwapTable3[lop_b]-1;
					if(tmp2[prm >> 3] & DES.BitMaskTable[ prm & 7 ]) {
						tmp2[ (lop_b >> 3) + 4 ] |= DES.BitMaskTable[ lop_b & 7 ];
					}
				}
				
				tmp[0] ^= tmp2[4];
				tmp[1] ^= tmp2[5];
				tmp[2] ^= tmp2[6];
				tmp[3] ^= tmp2[7];
				
				tmp2 = new Uint8Array(8);
				
				buf[p+0] = 0;
				buf[p+1] = 0;
				buf[p+2] = 0;
				buf[p+3] = 0;
				buf[p+4] = 0;
				buf[p+5] = 0;
				buf[p+6] = 0;
				buf[p+7] = 0;
				
				for( lop_b = 0; lop_b != 64; lop_b++ ) {
					prm = DES.BitSwapTable2[lop_b]-1;
					if(tmp[((prm >> 3) & 7)] & DES.BitMaskTable[prm & 7]) {
						buf[((lop_b >> 3) & 7)+p] |= DES.BitMaskTable[lop_b & 7];
					}
				}

			} else {
			
				if( cnt == 7 && type == 0 ) {
					
					cnt = 0;
					
					tmp1 = buf[p+3];
					
					buf[p+3] = buf[p+0];
					buf[p+0] = tmp1;
					
					tmp1 = buf[p+4];
					
					buf[p+4] = buf[p+1];
					buf[p+1] = tmp1;
					
					tmp1 = buf[p+5];
					
					buf[p+5] = buf[p+2];
					buf[p+2] = buf[p+6];
					buf[p+6] = tmp1;
					
					a = buf[p+7];
					
					switch(a) {
						case 0x00: a = 0x2b; break;
						case 0x2b: a = 0x00; break;
						case 0x01: a = 0x68; break;
						case 0x68: a = 0x01; break;
						case 0x48: a = 0x77; break;
						case 0x77: a = 0x48; break;
						case 0x60: a = 0xff; break;
						case 0xff: a = 0x60; break;
						case 0x6c: a = 0x80; break;
						case 0x80: a = 0x6c; break;
						case 0xb9: a = 0xc0; break;
						case 0xc0: a = 0xb9; break;
						case 0xeb: a = 0xfe; break;
						case 0xfe: a = 0xeb; break;
					}
					
					buf[p+7] = a;
				}
				cnt++;
			}
		}
		return buf;
	}
};

Uint8Array.prototype.toString = function() {
	var ret = '';
	var code = 0;
	for( var i = 0; i < this.length; i++ ) {
		code = this[i];
		if( code == 0 )
			return ret;
		ret += String.fromCharCode( code );
	}
	return ret;
}

DataView.prototype.getString = function( offset, length ) {
	if( offset + length > this.buffer.byteLength ) length = this.buffer.byteLength - offset;
	return (new Uint8Array( this.buffer, offset, length )).toString();
}

var ZLIB = {

	uncompress : function ( char_array, uncompressed_length ) {
		
		var cmf = char_array[0];
		var flg = char_array[1];
		var cm = cmf & 0x0f;
		
		if( cm !== 8 ) throw 'ZLIB: Uknown compression algorithm';
		
		//var cinfo = (cmf & 0xf0) >> 4;
		//var window_size = 2 << (cinfo + 8);
		//var fcheck = flg & 0x1f;
		var fdict = (flg & 0x20) !== 0;
		//var flevel = (flg & 0xc0) >> 6;
		
		if( ( (cmf << 8 ) + flg ) % 31 !== 0 ) console.log('ZLIB: FCHECK error');
		if( fdict ) throw 'ZLIB: Dictionaries are not accepted';
		
		return  RawDeflate.inflate( char_array.subarray(2), uncompressed_length );
	}
}

var GRF = function( buffer ) {
	
	this.buffer = buffer;
	
	this.header = {
		table: new Map()
	};
	
	this.stringEncode = function( string ) {
		var ret;
		for( var i = 0; i < string.length; i++ ) {
			if( string.charCodeAt(i) ) {
				return;
			}
		}
	};
	
	this.parseFormat = function() {
		
		var data = new DataView( this.buffer );
		var offset = 0;
		
		this.header.magic = data.getString( offset, 15 );
		
		if( this.header.magic != 'Master of Magic' )
			throw 'GRF: Error: Uknown identifier!';
		
		offset += 15; // skip watermark ( 0x0f bytes )
		
		this.header.table_offset = data.getUint32( offset + 15, true );
		this.header.seeds = data.getUint32( offset + 19, true );
		this.header.file_count = data.getUint32( offset + 23, true ) - this.header.seeds - 7;
		this.header.version = data.getUint32( offset + 27, true );
		
		if( this.header.version !== 0x200 )
			throw 'GRF: Warning: Unsupported version 0x' + this.header.version.toString(16);
		
		offset += 31;
		
		console.log( 'magic:', this.header.magic );
		console.log( 'table offset:', this.header.table_offset );
		console.log( 'seeds:', this.header.seeds );
		console.log( 'filecount:', this.header.file_count );
		console.log( 'version:', this.header.version );
		
		offset += this.header.table_offset;
		
		var table_size_compressed = data.getUint32( offset, true );
		var table_size_real = data.getUint32( offset + 4, true );
		
		offset += 8;
		
		var table;
		
		try {
			table = ZLIB.uncompress(
				new Uint8Array( this.buffer, offset, table_size_compressed ),
				table_size_real
			);
		} catch( e ) {
			throw 'GRF: Error: ' + e;
		}
		
		offset += table_size_compressed;
		
		var table_data = new DataView( table.buffer );
		var p = 0, name, record;
		
		while( p < table.length ) {
			
			name = table_data.getString( p, 255 );
			p += name.length + 1; // name length + \0 delimiter
			
			record = {
				size_compressed: table_data.getUint32( p, true ),
				length_alignment: table_data.getUint32( p + 4, true ),
				size_real: table_data.getUint32( p + 8, true ),
				flags: table_data.getUint8( p + 12 ),
				offset: table_data.getUint32( p + 13, true ),
				cycle: 1
			};
			
			if( record.flags == 3 ) {
				//var lop = 10, record.cycle = 1;
				//for( ; record.size_compressed >= lop; lop *= 10, record.cycle++ );
				record.cycle += Math.floor( Math.log( size ) / Math.log( 10 ) );
			}
			
			this.header.table.set( escape(name), record );
			
			p += 17;
			
		}
		
	}
	
	this.getFileBuffer = function( filename ) {
		
		filename = escape( filename );
		
		if( this.header.table.has( filename ) ) {
			
			var record = this.header.table.get( filename );
			var p = record.offset + 46;
			
			if( !(record.flags & 1) )
				throw 'GRF: Unpack: Record is not a file';
			
			console.log( 'offset:', p);
			console.log( 'length alignment:', record.length_alignment );
			console.log( 'size (compressed):', record.size_compressed );
			console.log( 'flags:', record.flags );
			
			var data = ( record.flags == 3 || record.flags == 5 )
				? DES.decode(
					new Uint8Array( this.buffer, p, record.length_alignment ),
					record.length_alignment,
					record.cycle
				) : new Uint8Array( this.buffer, p, record.size_compressed );
			
			return ZLIB.uncompress( data, record.size_real );
			
		} else {
			throw 'GRF: Unpack: No file record \"' + filename + '\" found';
			return null;
		}
	}
	
	var time = (new Date).getTime();
	this.parseFormat();
	console.log('total parse time:', (new Date).getTime() - time );
	
}