//Version 5

const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Me = ExtensionUtils.getCurrentExtension();
const Meta = imports.gi.Meta;
const Tweener = imports.ui.tweener;
const Main = imports.ui.main;

let effects;

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
		this.prefs          =  new Gio.Settings({ settings_schema: Gio.SettingsSchemaSource.new_from_directory(Me.path + "/schemas", 
							  Gio.SettingsSchemaSource.get_default(), false).lookup(Me.metadata["settings-schema"], true) });
		this.onOpening0     =  global.display.connect  ('window-created' , (display ,window) => this.addEffectsO ( window.get_compositor_private() ,0  ));
		this.onOpening1     =  Main.wm._shellwm.connect('map'            , (shellwm ,actor ) => this.addEffectsW ( shellwm ,actor                  ,0  ));
		this.onClosing      =  Main.wm._shellwm.connect('destroy'        , (shellwm ,actor ) => this.addEffectsW ( shellwm ,actor                  ,14 ));
    	},

	addEffectsO : function (actor,sIndex)
	{
		switch(actor.meta_window.window_type)
		{
			default : return;
                        case Meta.WindowType.DROPDOWN_MENU  : eStr = this.prefs.get_strv('dropdown-menu'  ); break;
			case Meta.WindowType.POPUP_MENU     : eStr = this.prefs.get_strv('popup-menu'     ); break;
			case Meta.WindowType.COMBO    	    : eStr = this.prefs.get_strv('combo'          ); break;
			case Meta.WindowType.SPLASHSCREEN   : eStr = this.prefs.get_strv('splashscreen'   ); break;
			case Meta.WindowType.TOOLTIP  	    : eStr = this.prefs.get_strv('tooltip'        ); break;
			case Meta.WindowType.OVERRIDE_OTHER : eStr = this.prefs.get_strv('override-other' ); break;
             	}
		if(eStr[sIndex]!="T") return;
		
		eParams=[sIndex]; for (i=2;i<14;i++) eParams[i]=parseInt(eStr[i+sIndex]);
		this.baseEffect(actor,eParams);
		if(this.prefs.get_boolean('wayland')==true){
			Tweener.addTween(actor,{ 	opacity: 		eParams[9],
					       		scale_x: 		eParams[5]*0.01,
                       		       	       		scale_y: 		eParams[7]*0.01,
                       					time:    		eParams[3]*0.001,
                        	            		transition: 		'easeOutQuad',
                        	    	       		onComplete:		this.animationDone,
                       		    	       		onCompleteScope: 	this,
							onCompleteParams:	[actor,-1],
                       	     	       			onOverwrite: 		this.animationDone,
                      		     	       		onOverwriteScope : 	this,
							onOverwriteParams: 	[actor,-1]
  					    	}); return;	
		}
			Tweener.addTween(actor,{ 	opacity: 		eParams[9],
                            	       	       		x:	  	 	FPX,
                      		     	       		y:	   		FPY,
					       		scale_x: 		eParams[5]*0.01,
                      		       	       		scale_y: 		eParams[7]*0.01,
              			 	      		time:    		eParams[3]*0.001,
                       		     	      		transition: 		'easeOutQuad',
                        		    	       	onComplete:		this.animationDone,
                        		    	       	onCompleteScope: 	this,
							onCompleteParams:	[actor,-1],
                        	            		onOverwrite: 		this.animationDone,
                       		    	       		onOverwriteScope : 	this,
							onOverwriteParams: 	[actor,-1]
  					    	});
        },

	addEffectsW : function (shellwm ,actor,sIndex)
	{
		this.shellwm 	= shellwm;
		switch(actor.meta_window.window_type)
		{
			default : return;
			case Meta.WindowType.NORMAL  	    : eStr = this.prefs.get_strv('normal'         ); break;
			case Meta.WindowType.DIALOG  	    : eStr = this.prefs.get_strv('dialog'         ); break;
			case Meta.WindowType.MODAL_DIALOG   : eStr = this.prefs.get_strv('modal-dialog'   ); break;
		}
		if(eStr[sIndex]!="T") return;
		
		eParams=[sIndex];for (i=2;i<14;i++) eParams[i]=parseInt(eStr[i+sIndex]);
		this.baseEffect(actor,eParams);
		switch(eParams[0])
		{
			case 0  : 
			case 14 : Tweener.addTween(actor,{ 	opacity: 		eParams[9],
               	        	    	       	       		x:	  	 	FPX,
               	        	     	       			y:	   		FPY,
						       		scale_x: 		eParams[5]*0.01,
        	                	       	       		scale_y: 		eParams[7]*0.01,
        	               		 	   		time:    		eParams[3]*0.001,
        	                	     	       		transition: 		'easeOutQuad',
        	                	     	       		onComplete:		this.animationDone,
        	                	     	      		onCompleteScope: 	this,
								onCompleteParams:	[actor,eParams[0]],
        	                	            		onOverwrite: 		this.animationDone,
        	                	    	       		onOverwriteScope : 	this,
								onOverwriteParams: 	[actor,eParams[0]]
  					    	    	  }); return; 
		}
        },

    	animationDone : function (actor,sIndex)
	{
		actor.hide();
		switch(sIndex)
		{
			case 0  : Main.wm._mapping.push(actor);		Main.wm._mapWindowDone(this.shellwm ,actor);		break;
			case 14 : Main.wm._destroying.push(actor);	Main.wm._destroyWindowDone(this.shellwm ,actor);  	return;
		}
		actor.show();
    	},

	baseEffect : function(actor,eParams) //estr = [ State ,name ,No ,time ,IW ,FW ,IH ,FH ,IO ,FO ,PPX ,PPY ,DIR ,OFFSET ] 
	{
		Tweener.removeTweens(actor); 
		actor.set_opacity 	( eParams[8 ]			      );
		actor.set_pivot_point	( eParams[10]*0.01  ,eParams[11]*0.01 );
		actor.set_scale 	( eParams[4 ]*0.01  ,eParams[6 ]*0.01 ); 
		[ FPX   ,FPY    ] = actor.get_position();
		switch(eParams[12])
	    	{
			default : break;
	         	case 1  : actor.set_position( FPX				,FPY-actor.height*eParams[13]*0.01 );  break;
		 	case 2  : actor.set_position( FPX+actor.width*eParams[13]*0.01  ,FPY	  			   );  break;
	         	case 3  : actor.set_position( FPX 				,FPY+actor.height*eParams[13]*0.01 );  break;
	   	 	case 4  : actor.set_position( FPX-actor.width*eParams[13]*0.01  ,FPY  	  		           );  break;
               	 	case 5  : actor.set_position( FPX+actor.width*eParams[13]*0.01  ,FPY-actor.height*eParams[13]*0.01 );  break;
		 	case 6  : actor.set_position( FPX+actor.width*eParams[13]*0.01  ,FPY+actor.height*eParams[13]*0.01 );  break;
		 	case 7  : actor.set_position( FPX-actor.width*eParams[13]*0.01  ,FPY+actor.height*eParams[13]*0.01 );  break;
		 	case 8  : actor.set_position( FPX-actor.width*eParams[13]*0.01  ,FPY-actor.height*eParams[13]*0.01 );  break;
		 	case 9  : [ FPX ,FPY ] =    [ FPX			        ,FPY-actor.height*eParams[13]*0.01 ];  break;
		 	case 10 : [ FPX ,FPY ] =    [ FPX+actor.width*eParams[13]*0.01  ,FPY	     	  	   	   ];  break;
		 	case 11 : [ FPX ,FPY ] =    [ FPX				,FPY+actor.height*eParams[13]*0.01 ];  break;
		 	case 12 : [ FPX ,FPY ] =    [ FPX-actor.width*eParams[13]*0.01  ,FPY		 	  	   ];  break;
               	 	case 13 : [ FPX ,FPY ] =    [ FPX+actor.width*eParams[13]*0.01  ,FPY-actor.height*eParams[13]*0.01 ];  break;
		 	case 14 : [ FPX ,FPY ] =    [ FPX+actor.width*eParams[13]*0.01  ,FPY+actor.height*eParams[13]*0.01 ];  break;
		 	case 15 : [ FPX ,FPY ] =    [ FPX-actor.width*eParams[13]*0.01  ,FPY+actor.height*eParams[13]*0.01 ];  break;
		 	case 16 : [ FPX ,FPY ] =    [ FPX-actor.width*eParams[13]*0.01  ,FPY-actor.height*eParams[13]*0.01 ];  break;
		}
    	},

    	destroy: function ()
	{        	
		global.display.disconnect  (this.onOpening0	);
		Main.wm._shellwm.disconnect(this.onOpening1	);
		Main.wm._shellwm.disconnect(this.onClosing 	);	
    	},
});
