const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Me = ExtensionUtils.getCurrentExtension();
const Meta = imports.gi.Meta;
const Tweener = imports.ui.tweener;

function enable() 
{
	effects = new EffectsManager();  
}

function disable() 
{
  	effects.destroy();
}

const 	EffectsManager = 	new Lang.Class({
				Name: "ManageEffects",
    
	_init: function ()
	{
		this.prefs 	=  new Gio.Settings({	settings_schema: Gio.SettingsSchemaSource.new_from_directory(Me.path + "/schemas", 
							Gio.SettingsSchemaSource.get_default(), false).lookup(Me.metadata["settings-schema"], true) });
        	this.display = global.display;
        	this.onOpening = this.display.connect('window-created', Lang.bind(this, this.addEffects));
    	},

    	addEffects : function (display,window)
	{
		let str;
		switch(window.get_window_type())
		{
                        case Meta.WindowType.DROPDOWN_MENU : str=this.prefs.get_strv('dropdown-menu'); break;
			case Meta.WindowType.POPUP_MENU    : str=this.prefs.get_strv('popup-menu'   ); break;
			case Meta.WindowType.COMBO    	   : str=this.prefs.get_strv('combo'        ); break;
			case Meta.WindowType.SPLASHSCREEN  : str=this.prefs.get_strv('splashscreen' ); break;
			case Meta.WindowType.TOOLTIP  	   : str=this.prefs.get_strv('tooltip'      ); break;

			default : return;
		}
           
		//Settings for a window type are stored as ['Status','effect-name','TIME','INITIAL_X_PERCENT','INITIAL_Y_PERCENT','INITIAL_OPACITY','DIRECTION','OFFSET'] 
		if(str[0]=="T")  
		this.baseEffect(window.get_compositor_private(),parseInt(str[2]),parseInt(str[3]),parseInt(str[4]),parseInt(str[5]),parseInt(str[6]),parseInt(str[7]));
        },
	
    	_animationDone : function (actor)
	{
		actor.hide();
		actor.show();
    	},

    	baseEffect : function (actor,TIME=0,INITIAL_X_PERCENT=100,INITIAL_Y_PERCENT=100,INITIAL_OPACITY=100,FROM_DIR=0,OFFSET=0)
	{
                
                /*
		This baseEffect function is used to create different effects based on their schemma values whhich are stored as
                ['effect-name','TIME','INITIAL_X_PERCENT','INITIAL_Y_PERCENT','INITIAL_OPACITY','DIRECTION','OFFSET'] 

		fadeIn : function (window,TIME,INITIAL_X_PERCENT=90,INITIAL_Y_PERCENT=90,INITIAL_OPACITY=0)
		{        
			this.baseEffect(window,TIME,INITIAL_X_PERCENT,INITIAL_Y_PERCENT,INITIAL_OPACITY,0,0);
    		},

		scaleIn:function(window,TIME,INITIAL_X_PERCENT=0,INITIAL_Y_PERCENT=0,INITIAL_OPACITY=100)
		{
			this.baseEffect(window,TIME,INITIAL_X_PERCENT,INITIAL_Y_PERCENT,INITIAL_OPACITY,0,0);
    		},
	
		slideIn:function(window,TIME,INITIAL_X_PERCENT=100,INITIAL_Y_PERCENT=100,INITIAL_OPACITY=100,DIR=1,OFFSET=20)
		{
			this.baseEffect(window,TIME,INITIAL_X_PERCENT,INITIAL_Y_PERCENT,INITIAL_OPACITY,DIR,OFFSET);
    		},

		zoomIn: function(window,TIME,INITIAL_X_PERCENT=0,INITIAL_Y_PERCENT=0,INITIAL_OPACITY=100)
		{
			this.baseEffect(window,TIME,INITIAL_X_PERCENT,INITIAL_Y_PERCENT,INITIAL_OPACITY,9,0);
		},

		zoomOut: function(window,TIME,INITIAL_X_PERCENT=150,INITIAL_Y_PERCENT=150,INITIAL_OPACITY=100)
		{
			this.baseEffect(window,TIME,INITIAL_X_PERCENT,INITIAL_Y_PERCENT,INITIAL_OPACITY,9,0);
		},/**/
            
            	[ width , height]  = actor.get_size();
            	[ prevX , prevY ]  = actor.get_position();

            	switch(FROM_DIR)
	    	{
			default : actor.set_position ( prevX     		,prevY 			 );  break;

			case  1 : actor.set_position ( prevX          		,prevY-height*OFFSET/100 );  break;  // From TOP
			case  2 : actor.set_position ( prevX+width*OFFSET/100  	,prevY          	 );  break;  // From RIGHT
			case  3 : actor.set_position ( prevX          		,prevY+height*OFFSET/100 );  break;  // From BOTTOM
			case  4 : actor.set_position ( prevX-width*OFFSET/100  	,prevY          	 );  break;  // From LEFT
               		case  5 : actor.set_position ( prevX+width*OFFSET/100  	,prevY-height*OFFSET/100 );  break;  // From TOP RIGHT
			case  6 : actor.set_position ( prevX+width*OFFSET/100 	,prevY+height*OFFSET/100 );  break;  // From BOTTOM RIGHT
			case  7 : actor.set_position ( prevX-width*OFFSET/100  	,prevY+height*OFFSET/100 );  break;  // From BOTTOM RIGHT
			case  8 : actor.set_position ( prevX-width*OFFSET/100  	,prevY-height*OFFSET/100 );  break;  // From TOP LEFT

			case  9 : actor.set_position ( prevX+width/2*(1-INITIAL_X_PERCENT/100) ,prevY+height/2*(1-INITIAL_Y_PERCENT/100) ); break // Zoom Animations
            	}		

            	actor.set_opacity(INITIAL_OPACITY*255/100);
            	actor.set_scale(INITIAL_X_PERCENT/100,INITIAL_Y_PERCENT/100);

            	Tweener.addTween(actor,{
                 	         opacity: 255,
                             	 x:prevX,
                             	 y:prevY,
                             	 scale_x:1,
                                 scale_y:1,
                             	 time: TIME/1000,
                             	 transition: 0,
                             	 onComplete:this._animationDone,
                             	 onCompleteScope : this,
                             	 onCompleteParams:[actor,prevX,prevY],
                             	 onOverwrite : this._animationDone,
                             	 onOverwriteScope : this,
                             	 onOverwriteParams: [actor,prevX,prevY]});
    	},

    	destroy: function ()
	{        	
        	this.display.disconnect(this.onOpening);
    	},
});
