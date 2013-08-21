var Interface = {
	LoginWindow: 0,
	ServiceWindow: 1,
	LoadingScreen: 2,
	CharSelect: 3,
	ChatWindow: 4,
	Button: {
		Login: 0,
		Exit: 1,
		Select: 2,
		Cancel: 3,
		Next: 4
	}
};

var InterfaceAlignment = {
	Center: 0,
	Left: 1,
	Right: 2,
	Top: 1,
	Bottom: 2
};

var InterfaceHelper = {
	
	Pixel: 0,
	Percent: 1,
	Alignment: 2,
	
	parseAlignment: function( argument, sourceWidth, targetWidth ) {
		
		if( argument === null ) {
			return 0;
		}
		
		var type, value;
		
		if( typeof argument == 'string' ) {
			
			var regexPixels = /([0-9])*px/g;
			var regexPercent = /([0-9])*\%/g;
			
			var parsedPixels = regexPixels.exec( argument );
			var parsedPercent = regexPercent.exec( argument );
			
			if( parsedPixels != null && parsedPixels.length > 0 ) {
				
				value = parseInt( parsedPixels[0], 10 );
				type = InterfaceHelper.Pixel;
				
			} else if( parsedPercent != null && parsedPercent.length > 0 ) {
				
				value = parseInt( parsedPercent[0], 10 );
				type = InterfaceHelper.Percent;
				
			} else {
			
				value = parseInt( argument, 10 );
				type = InterfaceHelper.Pixel;
				
			}
			
		} else if( typeof argument == 'number' ) {
			
			value = argument;
			type = InterfaceHelper.Alignment;
			
		} else {
		
			value = 0;
			type = InterfaceHelper.Pixel;
		
		}
		
		if( type == InterfaceHelper.Pixel ) {
			
			return value;
			
		}
		
		if( type == InterfaceHelper.Percent ) {
			
			return targetWidth * value / 100;
			
		}
		
		if( type == InterfaceHelper.Alignment ) {
			
			if( value == InterfaceAlignment.Center ) {
				
				return ( targetWidth - sourceWidth ) / 2;
				
			} else if( value == InterfaceAlignment.Left ) {
				
				return 0;
				
			} else if( value == InterfaceAlignment.Right ) {
			
				return targetWidth - sourceWidth;
			
			}
			
		}
		
		return 0;
		
	}
	
};