//Version 6

const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Meta = imports.gi.Meta;
const Tweener = imports.ui.tweener;
const Main = imports.ui.main;

let effectsManager = null;

function enable() {
  effectsManager = new EffectsManager();  
  effectsManager.startEffectsManager();
  reloadExtensionOnPrefsChange();
}

function disable() {
  effectsManager.destroy();
}

function reloadExtensionOnPrefsChange() {
  // Reloads the Extension when preferences are changed.
  effectsManager.prefs.connect("changed::reload-signal", () => {
    effectsManager.destroy();
    effectsManager.startEffectsManager();
  });
}

const EffectsManager = new Lang.Class({
  Name: "EffectsManager",
  _init: function () {
    this.prefs = new Gio.Settings({ settings_schema: Gio.SettingsSchemaSource.new_from_directory(Me.path + "/schemas", Gio.SettingsSchemaSource.get_default(), false).lookup(Me.metadata["settings-schema"], true) });
    this.loadPreferences();
  },
  
  loadPreferences : function() {
    this.onOpening0      = null;
    this.onOpening1      = null;
    this.onClosing       = null;
    this.onMinimizing    = null;
    this.onUnminimizing  = null;
    
    this.openingWindowEffect = this.prefs.get_boolean("opening-effect-windows");
    this.openingOtherEffect  = this.prefs.get_boolean("opening-effect-others");
    this.closingingEffect    = this.prefs.get_boolean("closing-effect");
    this.minimizingEffect    = this.prefs.get_boolean("minimizing-effect");
    this.unMinimizingEffect  = this.prefs.get_boolean("unminimizing-effect");
  },

  addEffectsO : function (actor, sIndex) {
    let eStr = [];
    let eParams=[sIndex]; 
    
    switch(actor.meta_window.window_type) {
      default : 
        return;
      case Meta.WindowType.DROPDOWN_MENU : 
        eStr = this.prefs.get_strv("dropdown-menu" ); 
        break;
      case Meta.WindowType.POPUP_MENU : 
        eStr = this.prefs.get_strv("popup-menu"    ); 
        break;
      case Meta.WindowType.COMBO : 
        eStr = this.prefs.get_strv("combo"         ); 
        break;
      case Meta.WindowType.SPLASHSCREEN : 
        eStr = this.prefs.get_strv("splashscreen"  ); 
        break;
      case Meta.WindowType.TOOLTIP : 
        eStr = this.prefs.get_strv("tooltip"       ); 
        break;
      case Meta.WindowType.OVERRIDE_OTHER : 
        eStr = this.prefs.get_strv("override-other"); 
        break;
    }
    
    if(eStr[sIndex]=="T") {
		
      for (let i=2;i<14;i++) {
        eParams[i]=parseInt(eStr[i+sIndex]);
      }

      let [ FPX, FPY, posChanged ] = this.baseEffect(actor, eParams);
		
      if(this.prefs.get_boolean("wayland")==true || posChanged == false) {
        Tweener.addTween( actor,{ opacity: 		       eParams[9],
                                  scale_x: 		       eParams[5]*0.01,
                                  scale_y: 		       eParams[7]*0.01,
                                  time:    		       eParams[3]*0.001,
                                  transition: 		   'easeOutQuad',
                                  onComplete:		     this.animationDone,
                                  onCompleteScope: 	 this,
                                  onCompleteParams:	 [actor,100],
                                  onOverwrite: 		   this.animationDone,
                                  onOverwriteScope : this,
                                  onOverwriteParams: [actor,100]
        }); 
        return;	
      }
      Tweener.addTween(actor,{ opacity: 		      eParams[9],
                               x:	  	 	          FPX,
                               y:	   		          FPY,
                               scale_x: 		      eParams[5]*0.01,
                               scale_y: 		      eParams[7]*0.01,
                               time:    		      eParams[3]*0.001,
                               transition: 	      'easeOutQuad',
                               onComplete:	      this.animationDone,
                               onCompleteScope: 	this,
                               onCompleteParams:	[actor,100],
                               onOverwrite: 	    this.animationDone,
                               onOverwriteScope : this,
                               onOverwriteParams: [actor,100]
      });
    }
  },

  addEffectsW : function (shellwm, actor, sIndex) {
    this.shellwm = shellwm;
    let eStr = [];
    let eParams=[sIndex];
    
    switch(actor.meta_window.window_type) {
      default : 
        return;
      case Meta.WindowType.NORMAL : 
        eStr = this.prefs.get_strv("normal"); 
        break;
      case Meta.WindowType.DIALOG : 
        eStr = this.prefs.get_strv("dialog"); 
        break;
      case Meta.WindowType.MODAL_DIALOG: 
        eStr = this.prefs.get_strv("modal-dialog"); 
        break;
    }
		
    if(eStr[sIndex]=="T") {
      
      for (let i=1;i<14;i++) {
        eParams[i]=parseInt(eStr[i+sIndex]);
      }

		  Tweener.removeTweens(actor); 
		  
      if(sIndex==42) {
        Main.wm._unminimizeWindowDone(this.shellwm ,actor);	 
      }

      this.animationDrive(shellwm, actor, sIndex ,eParams);
    }
  },
  
  animationDrive: function(shellwm, actor, sIndex, eParams ) {
    let [ FPX , FPY , posChanged ] = this.baseEffect(actor,eParams);
		
    switch(eParams[0]) { 
      case 0 : 
      case 14:
      case 28:
      case 42:
        if(posChanged==false) {
          Tweener.addTween( actor, { opacity:           eParams[9],
                                     scale_x: 		      eParams[5]*0.01,
                                     scale_y: 		      eParams[7]*0.01,
                                     time:    		      eParams[3]*0.001,
                                     transition: 	      'easeOutQuad',
                                     onComplete:	      this.animationDone,
                                     onCompleteScope: 	this,
                                     onCompleteParams:	[actor,eParams[0]],
                                     onOverwrite: 	    this.animationDone,
                                     onOverwriteScope : this,
                                     onOverwriteParams: [actor,eParams[0]]
  	      });
          return;
        }
        Tweener.addTween( actor, { opacity: 		      eParams[9],
                                   x:	  	 	          FPX,
                                   y:	   		          FPY,
                                   scale_x: 		      eParams[5]*0.01,
                                   scale_y: 	        eParams[7]*0.01,
                                   time:    		      eParams[3]*0.001,
                                   transition: 		    'easeOutQuad',
                                   onComplete:		    this.animationDone,
                                   onCompleteScope: 	this,
                                   onCompleteParams:	[actor,eParams[0]],
                                   onOverwrite: 	    this.animationDone,
                                   onOverwriteScope : this,
                                   onOverwriteParams: [actor,eParams[0]]
  	    }); 
        return;
  		}
  },

  animationDone : function (actor, sIndex) {
    actor.hide();
    switch(sIndex) {
      case 0 :	
        Main.wm._mapWindowDone(this.shellwm ,actor);		
        break;
      case 14 :  		
        Main.wm._destroyWindowDone(this.shellwm ,actor);  	
        return;
      case 28 :   
        Main.wm._minimizeWindowDone(this.shellwm ,actor);  
        return;
			case 42 :  
			  Main.wm._unminimizeWindowDone(this.shellwm ,actor);	 
			  break;  
      case 100 : 
        break;
    }
    actor.set_scale(1,1); 
    actor.set_opacity(255);						
    actor.set_pivot_point(0,0);
    actor.show();
  },

  baseEffect : function(actor, eParams) { //estr = [ State ,name ,No ,time ,IW ,FW ,IH ,FH ,IO ,FO ,PPX ,PPY ,DIR ,OFFSET ] 
    
    actor.set_opacity ( eParams[8 ] );
    actor.set_pivot_point( eParams[10]*0.01 ,eParams[11]*0.01 );
    actor.set_scale ( eParams[4]*0.01 ,eParams[6]*0.01 ); 
    
    let [ FPX ,FPY ] = actor.get_position();
    let posChanged = true;
		
    switch(eParams[12]) {
      default : 
        posChanged = false; 
        break;
      case 1  : 
        actor.set_position( FPX                               ,FPY-actor.height*eParams[13]*0.01 );  
        break;
      case 2  : 
        actor.set_position( FPX+actor.width*eParams[13]*0.01  ,FPY                               );  
        break;
      case 3  : 
        actor.set_position( FPX 			                        ,FPY+actor.height*eParams[13]*0.01 );  
        break;
      case 4  : 
        actor.set_position( FPX-actor.width*eParams[13]*0.01  ,FPY  	  		                     );  
        break;
      case 5  : 
        actor.set_position( FPX+actor.width*eParams[13]*0.01  ,FPY-actor.height*eParams[13]*0.01 );  
        break;
      case 6  : 
        actor.set_position( FPX+actor.width*eParams[13]*0.01  ,FPY+actor.height*eParams[13]*0.01 );  
        break;
      case 7  : 
        actor.set_position( FPX-actor.width*eParams[13]*0.01  ,FPY+actor.height*eParams[13]*0.01 );  
        break;
      case 8  : 
        actor.set_position( FPX-actor.width*eParams[13]*0.01  ,FPY-actor.height*eParams[13]*0.01 );  
        break;
      case 9  : 
        [ FPX ,FPY ] =    [ FPX			                          ,FPY-actor.height*eParams[13]*0.01 ];  
        break;
      case 10 : 
        [ FPX ,FPY ] =    [ FPX+actor.width*eParams[13]*0.01  ,FPY	     	                       ];  
        break;
      case 11 : 
        [ FPX ,FPY ] =    [ FPX				                        ,FPY+actor.height*eParams[13]*0.01 ];  
        break;
      case 12 : 
        [ FPX ,FPY ] =    [ FPX-actor.width*eParams[13]*0.01  ,FPY		 	  	                     ];  
        break;
      case 13 : 
        [ FPX ,FPY ] =    [ FPX+actor.width*eParams[13]*0.01  ,FPY-actor.height*eParams[13]*0.01 ];  
        break;
      case 14 : 
        [ FPX ,FPY ] =    [ FPX+actor.width*eParams[13]*0.01  ,FPY+actor.height*eParams[13]*0.01 ];  
        break;
      case 15 : 
        [ FPX ,FPY ] =    [ FPX-actor.width*eParams[13]*0.01  ,FPY+actor.height*eParams[13]*0.01 ];  
        break;
      case 16 : 
        [ FPX ,FPY ] =    [ FPX-actor.width*eParams[13]*0.01  ,FPY-actor.height*eParams[13]*0.01 ];  
        break;
    }
    return [ FPX, FPY, posChanged];
  },
  
  startEffectsManager: function() {
    if(this.openingWindowEffect) {
        this.onOpening1 = global.window_manager.connect("map" , (shellwm ,actor ) => this.addEffectsW ( shellwm ,actor ,0 ));
    }
    if(this.openingOtherEffect) {
        this.onOpening0 = global.display.connect("window-created" , (display ,window) => this.addEffectsO ( window.get_compositor_private() ,0 ));
    }
    if(this.closingingEffect) {
        this.onClosing  = global.window_manager.connect("destroy" , (shellwm ,actor ) => this.addEffectsW ( shellwm ,actor ,14 ));
    }
    if(this.minimizingEffect) {
        this.onMinimizing  = global.window_manager.connect("minimize" , (shellwm ,actor ) => this.addEffectsW ( shellwm ,actor ,28 ));
    }
    if(this.unMinimizingEffect) {
        this.onUnminimizing  = global.window_manager.connect("unminimize" , (shellwm ,actor ) => this.addEffectsW ( shellwm ,actor ,42 ));
    }
  },
  
  destroy: function () {        	
    if(this.openingWindowEffect) {
      global.window_manager.disconnect( this.onOpening1 );
    }
    if(this.openingOtherEffect) {
      global.display.disconnect( this.onOpening0 );
    }
    if(this.closingingEffect) {
      global.window_manager.disconnect( this.onClosing  );
    }
    if(this.minimizingEffect) {
      global.window_manager.disconnect( this.onMinimizing  );
    }
    if(this.unMinimizingEffect) {
      global.window_manager.disconnect( this.onUnminimizing  );
    }
    this.loadPreferences();
  },
});
