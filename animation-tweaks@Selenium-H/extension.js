const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Me = ExtensionUtils.getCurrentExtension();
const Meta = imports.gi.Meta;
const Tweener = imports.ui.tweener;
const Main=imports.ui.main;

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
		this.onOpening0     =  global.display.connect       ('window-created' , (display ,window) => this.addEffects0 ( window.get_compositor_private() ,0  ));
		this.onOpening1     =  global.window_manager.connect('map'            , (shellwm ,actor ) => this.addEffects1 ( actor                           ,0  ));
		this.onClosing      =  global.window_manager.connect('destroy'        , (shellwm ,actor ) => this.addEffects1 ( actor                           ,14 ));
    	},

	addEffects0 : function (actor,prefStart)
	{
		switch(actor.meta_window.window_type)
		{
                        case Meta.WindowType.DROPDOWN_MENU  : this.eStr = this.prefs.get_strv('dropdown-menu'  ); break;
			case Meta.WindowType.POPUP_MENU     : this.eStr = this.prefs.get_strv('popup-menu'     ); break;
			case Meta.WindowType.COMBO    	    : this.eStr = this.prefs.get_strv('combo'          ); break;
			case Meta.WindowType.SPLASHSCREEN   : this.eStr = this.prefs.get_strv('splashscreen'   ); break;
			case Meta.WindowType.TOOLTIP  	    : this.eStr = this.prefs.get_strv('tooltip'        ); break;
			case Meta.WindowType.OVERRIDE_OTHER : this.eStr = this.prefs.get_strv('override-other' ); break;
             
			default : return;
		}
		if(this.eStr[prefStart]=="T") this.baseEffect(actor,prefStart);
        },

	addEffects1 : function (actor,prefStart)
	{
		switch(actor.meta_window.window_type)
		{
			case Meta.WindowType.NORMAL  	    : this.eStr = this.prefs.get_strv('normal'         ); break;
			case Meta.WindowType.DIALOG  	    : this.eStr = this.prefs.get_strv('dialog'         ); break;
			case Meta.WindowType.MODAL_DIALOG   : this.eStr = this.prefs.get_strv('modal-dialog'   ); break;

			default : return;
		}

		if(this.eStr[prefStart]=="T")
		switch(prefStart)
		{
			case 0  : this.baseEffect(actor,prefStart);  return;
			case 14 : if ( actor.meta_window.is_attached_dialog() ) 
				       actor._parentDestroyId = actor.meta_window.get_transient_for().connect('unmanaged',()=> {actor.hide();});
				   Main.wm._removeEffect(Main.wm._destroying, actor); 
				   this.baseEffect(actor,prefStart); return;
		}
        },

    	_animationDone : function (actor,prefStart)
	{
		Tweener.removeTweens(actor);
		actor.hide();	
		if(prefStart==14) return;
		actor.show();
    	},

    	baseEffect : function (actor,prefStart)
	{   
            	[ IPX   ,IPY    ]  =  actor.get_position();
		[ width ,height ]  =  actor.get_size();
		[ FPX   ,FPY	]  =  [ IPX   ,IPY    ];

		switch(parseInt(this.eStr[prefStart+12]))
	    	{
		    default : break;

		    case  1 :  actor.set_position(IPX						  ,IPY-height*parseInt(this.eStr[prefStart+13])/100 ); break;// From TOP
		    case  2 :  actor.set_position(IPX+width*parseInt(this.eStr[prefStart+13])/100 ,IPY						    ); break;// From RIGHT
		    case  3 :  actor.set_position(IPX						  ,IPY+height*parseInt(this.eStr[prefStart+13])/100 ); break;// From BOTTOM
		    case  4 :  actor.set_position(IPX-width*parseInt(this.eStr[prefStart+13])/100 ,IPY						    ); break;// From LEFT
               	    case  5 :  actor.set_position(IPX+width*parseInt(this.eStr[prefStart+13])/100 ,IPY-height*parseInt(this.eStr[prefStart+13])/100 ); break;// From TOP RIGHT
		    case  6 :  actor.set_position(IPX+width*parseInt(this.eStr[prefStart+13])/100 ,IPY+height*parseInt(this.eStr[prefStart+13])/100 ); break;// From BOTTOM RIGHT
		    case  7 :  actor.set_position(IPX-width*parseInt(this.eStr[prefStart+13])/100 ,IPY+height*parseInt(this.eStr[prefStart+13])/100 ); break;// From BOTTOM RIGHT
		    case  8 :  actor.set_position(IPX-width*parseInt(this.eStr[prefStart+13])/100 ,IPY-height*parseInt(this.eStr[prefStart+13])/100 ); break; // From TOP LEFT

		    case  9 :  [ FPX , FPY ] = [ IPX					 	  ,IPY-height*parseInt(this.eStr[prefStart+13])/100 ]; break;
		    case  10 : [ FPX , FPY ] = [ IPX+width*parseInt(this.eStr[prefStart+13])/100  ,IPY						    ]; break;
		    case  11 : [ FPX , FPY ] = [ IPX						  ,IPY+height*parseInt(this.eStr[prefStart+13])/100 ]; break;
		    case  12 : [ FPX , FPY ] = [ IPX-width*parseInt(this.eStr[prefStart+13])/100  ,IPY						    ]; break;
               	    case  13 : [ FPX , FPY ] = [ IPX+width*parseInt(this.eStr[prefStart+13])/100  ,IPY-height*parseInt(this.eStr[prefStart+13])/100 ]; break;
		    case  14 : [ FPX , FPY ] = [ IPX+width*parseInt(this.eStr[prefStart+13])/100  ,IPY+height*parseInt(this.eStr[prefStart+13])/100 ]; break;
		    case  15 : [ FPX , FPY ] = [ IPX-width*parseInt(this.eStr[prefStart+13])/100  ,IPY+height*parseInt(this.eStr[prefStart+13])/100 ]; break;
		    case  16 : [ FPX , FPY ] = [ IPX-width*parseInt(this.eStr[prefStart+13])/100  ,IPY-height*parseInt(this.eStr[prefStart+13])/100 ]; break; 
            	}

		actor.set_scale ( parseInt(this.eStr[prefStart+4])/100 ,parseInt(this.eStr[prefStart+6])/100 );
		actor.set_opacity ( parseInt(this.eStr[prefStart+8])*255/100 );
		actor.set_pivot_point ( parseInt(this.eStr[prefStart+10])/100	,parseInt(this.eStr[prefStart+11])/100 );

            	Tweener.addTween(actor,{
                 	         	  opacity: 		parseInt(this.eStr[prefStart+9])*255/100,
                             	 	  x:	  	 	FPX,
                             	 	  y:	   		FPY,
                             	 	  scale_x: 		parseInt(this.eStr[prefStart+5])/100,
                                 	  scale_y: 		parseInt(this.eStr[prefStart+7])/100,
                             	 	  time:    		parseInt(this.eStr[prefStart+3])/1000,
                             	 	  transition: 		'easeOutQuad',
                             	 	  onComplete:		(actor)=>this._animationDone(actor,prefStart),
                             	 	  onCompleteScope: 	this,
                             	 	  onCompleteParams:	[actor,IPX,IPY],
                             	 	  onOverwrite: 		(actor)=>this._animationDone(actor,prefStart),
                             	 	  onOverwriteScope : 	this,
                             	 	  onOverwriteParams: 	[actor,IPX,IPY]
  				       });
    	},

    	destroy: function ()
	{        	
		global.display.disconnect(this.onOpening0);
		global.window_manager.disconnect(this.onOpening1);
		global.window_manager.disconnect(this.onClosing);
    	},
});
