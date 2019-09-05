/*
Version 7
=========

Effect String Format   [ Status   Name   Tweens  IO      IW     IH     IPX     IPY         T     PPx     PPY     NO      NW      NH     NPX     NPY  ... ]

Read the effectParameters.txt File for details.

*/


const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
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

    this.prefs = Convenience.getSettings("org.gnome.shell.extensions.animation-tweaks");
    
  },

  addOtherEffects : function (actor, action) {

    let eParams=[];

    switch(actor.meta_window.window_type) {
      default :
        return;
      case Meta.WindowType.DROPDOWN_MENU :
        eParams = this.prefs.get_strv("dropdown-menu-"+action );
        break;
      case Meta.WindowType.POPUP_MENU :
        eParams = this.prefs.get_strv("popup-menu-"+action    );
        break;
      case Meta.WindowType.COMBO :
        eParams = this.prefs.get_strv("combo-"+action         );
        break;
      case Meta.WindowType.SPLASHSCREEN :
        eParams = this.prefs.get_strv("splashscreen-"+action  );
        break;
      case Meta.WindowType.TOOLTIP :
        eParams = this.prefs.get_strv("tooltip-"+action       );
        break;
      case Meta.WindowType.OVERRIDE_OTHER :
        eParams = this.prefs.get_strv("override-other-"+action);
        break;
    }

    if(eParams[0] == "T") {
      Tweener.removeTweens(actor);
      this.initParametersOther(actor, eParams);
      this.driveOtherAnimation(actor, eParams, 0, action);
    }
    
    return;

  },

  addWindowEffects : function (shellwm, actor, action) {

    this.shellwm = shellwm;
    let eParams=[];

    switch(actor.meta_window.window_type) {
      default :
        return;
      case Meta.WindowType.NORMAL :
        eParams = this.prefs.get_strv("normal-"+action);
        break;
      case Meta.WindowType.DIALOG :
        eParams = this.prefs.get_strv("dialog-"+action);
        break;
      case Meta.WindowType.MODAL_DIALOG:
        eParams = this.prefs.get_strv("modal-dialog-"+action);
        break;
    }

    if(eParams[0] == "T") {

      Tweener.removeTweens(actor);
      if(action == "unminimize") {
        if(Main.overview._shown) {
          this.animationDone(actor,"unminimize");
          return;
        }
        Main.wm._unminimizeWindowDone(this.shellwm ,actor);    	 
      }
      let [success, geom] = actor.meta_window.get_icon_geometry();
      this.initParametersWindow(actor, eParams,success,geom);
      this.driveWindowAnimation( actor, eParams, 0, action,success,geom);
    }

    return;

  },

  animationDone : function (actor, action) {

    actor.hide();
    switch(action) {
      case "open" :
        Main.wm._mapWindowDone(this.shellwm ,actor);
        break;
      case "close" :
        Main.wm._destroyWindowDone(this.shellwm ,actor);
        return;
      case "minimize" :
        Main.wm._minimizeWindowDone(this.shellwm ,actor);
        return;
      case "unminimize" :
        Main.wm._unminimizeWindowDone(this.shellwm ,actor);
        break;
      case "other" :
      default:
    }
    actor.set_scale(1,1);
    actor.set_opacity(255);
    actor.set_pivot_point(0,0);
    actor.show();

  },

  driveOtherAnimation: function( actor, eParams, subEffectNo, action) {

    if(eParams[2] == subEffectNo) {
      this.animationDone(actor,action);
      return;
    }

    let posChanged = this.setNextParametersOther(actor,eParams,subEffectNo*8+ 12);
    actor.set_pivot_point( eParams[subEffectNo*8+ 9] ,eParams[subEffectNo*8+ 10] );

    if(posChanged == true) {
      Tweener.addTween(actor, {
          opacity:           eParams[subEffectNo*8+ 11],
          x:                 eParams[subEffectNo*8+ 14],
          y:                 eParams[subEffectNo*8+ 15],
          scale_x:           eParams[subEffectNo*8+ 12],
          scale_y:           eParams[subEffectNo*8+ 13],
          time:              eParams[subEffectNo*8+  8],
          transition:        'easeOutQuad',
          onComplete:        this.driveOtherAnimation,
          onCompleteScope:   this,
          onCompleteParams:  [actor,eParams,++subEffectNo,"other"],
          onOverwrite:       this.animationDone,
          onOverwriteScope : this,
          onOverwriteParams: [actor,action]
      });
      return;
    }

    Tweener.addTween(actor, {
          opacity:           eParams[subEffectNo*8+ 11],
          scale_x:           eParams[subEffectNo*8+ 12],
          scale_y:           eParams[subEffectNo*8+ 13],
          time:              eParams[subEffectNo*8+  8],
          transition:        'easeOutQuad',
          onComplete:        this.driveOtherAnimation,
          onCompleteScope:   this,
          onCompleteParams:  [actor,eParams,++subEffectNo,"other"],
          onOverwrite:       this.animationDone,
          onOverwriteScope : this,
          onOverwriteParams: [actor,action]
    });
    return;

  },

  driveWindowAnimation: function( actor, eParams, subEffectNo, action,success,geom) {

    if(eParams[2] == subEffectNo) {
      this.animationDone(actor,action);
      return;
    }

    this.setNextParametersWindow(actor,eParams,subEffectNo*8+ 12,success,geom);
    actor.set_pivot_point( eParams[subEffectNo*8+ 9] ,eParams[subEffectNo*8+ 10] );

      Tweener.addTween(actor, {
          opacity:           eParams[subEffectNo*8+ 11],
          x:                 eParams[subEffectNo*8+ 14],
          y:                 eParams[subEffectNo*8+ 15],
          scale_x:           eParams[subEffectNo*8+ 12],
          scale_y:           eParams[subEffectNo*8+ 13],
          time:              eParams[subEffectNo*8+  8],
          transition:        'easeOutQuad',
          onComplete:        this.driveWindowAnimation,
          onCompleteScope:   this,
          onCompleteParams:  [actor,eParams,++subEffectNo,action,success,geom],
          onOverwrite:       this.animationDone,
          onOverwriteScope : this,
          onOverwriteParams: [actor,action]
      });
      return;
      
   },

  initParametersOther: function(actor, eParams) {

    let posChanged = this.setNextParametersOther(actor,eParams,4);

    if(posChanged == true) {
      actor.set_position(  eParams[6] ,eParams[7]  );
    }
    actor.set_opacity ( eParams[3] );
    actor.set_scale ( eParams[4] ,eParams[5] );

    return posChanged;
    
  },

  initParametersWindow: function(actor, eParams,success,geom) {

    let [PX,PY,posChanged] = this.setNextParametersWindow(actor,eParams,4,success,geom);
    if(posChanged== true) {
      actor.set_position(  eParams[6] ,eParams[7]  );
    }
    actor.set_opacity ( eParams[3] );
    actor.set_scale ( eParams[4] ,eParams[5] );

    eParams[6] = PX;
    eParams[7] = PY;

  },
  
  loadPreferences : function() {

    this.onOpening0      = null;
    this.onOpening1      = null;
    this.onClosing       = null;
    this.onMinimizing    = null;
    this.onUnminimizing  = null;

    this.openingWindowEffectEnabled = this.prefs.get_boolean("opening-effect-windows");
    this.openingOtherEffectEnabled  = this.prefs.get_boolean("opening-effect-others");
    this.closingingEffectEnabled    = this.prefs.get_boolean("closing-effect");
    this.minimizingEffectEnabled    = this.prefs.get_boolean("minimizing-effect");
    this.unMinimizingEffectEnabled  = this.prefs.get_boolean("unminimizing-effect");

  },

  setNextParametersOther: function(actor,eParams,pIndex) {

    let [PX, PY] = actor.get_position();
    let posChanged = true;

    pIndex = pIndex+2;
    eParams[pIndex]   = PX + parseFloat(eParams[pIndex]-1)*actor.width;
    eParams[++pIndex] = PY + parseFloat(eParams[pIndex]-1)*actor.height;

    if((parseFloat(eParams[pIndex])+parseFloat(eParams[pIndex-1]))==(PX+PY)) {
      posChanged = false;
    }

    return posChanged && !this.prefs.get_boolean("wayland");

  },

  setNextParametersWindow: function(actor,eParams,pIndex,success,geom) {

    let [PX, PY] = actor.get_position();
    let posChanged = true;

    if(eParams[pIndex]=="MW") {
        eParams[pIndex] = (success) ? geom.width/actor.width : 0.1 ;
    }

    if(eParams[++pIndex]=="MH") {
        eParams[pIndex] = (success) ? geom.height/actor.height : 0.1 ;
    }

    switch(eParams[++pIndex]) {
      case "MX" :
        eParams[pIndex] = (success) ? geom.x:Main.layoutManager.monitors[global.display.get_current_monitor()].width/2;
        break;
      case "mX" :
        if(success) {
          eParams[pIndex] = (PX >= geom.x-geom.width) ? 0-actor.width   : geom.x;
        }
        else {
          eParams[pIndex] = 0-actor.width;
        }
        break;
      case "SX" :
        eParams[pIndex] = PX;
        posChanged = false;
        break;
      case "IX" :
        eParams[pIndex] = eParams[6];
        break; 
      default:
        eParams[pIndex] = PX + parseFloat(eParams[pIndex]-1)*actor.width;
        break;
    }

    switch(eParams[++pIndex]) {
      case "MY" :
        eParams[pIndex] = (success)? geom.y:Main.layoutManager.monitors[global.display.get_current_monitor()].height/2 ;
        break;
      case "mY" :
        if(success) {
          eParams[pIndex] = (PY >= geom.y-geom.height) ? 0-actor.height : geom.y;
        }
        else {
          eParams[pIndex] = Main.layoutManager.monitors[global.display.get_current_monitor()].height;
        }
        break;
      case "SY" :
        eParams[pIndex] = PY;
        posChanged = false;
        break;
      case "IY" :
        eParams[pIndex] = eParams[7];
        break; 

      default :
        eParams[pIndex] = PY + parseFloat(eParams[pIndex]-1)*actor.height;
         break;
    }

    return [PX,PY,posChanged];

  },
 
  startEffectsManager: function() {

    this.loadPreferences();

    if(this.openingWindowEffectEnabled) {
        this.onOpening1 = global.window_manager.connect("map" , (shellwm ,actor ) => this.addWindowEffects ( shellwm, actor, "open" ));
    }
    if(this.openingOtherEffectEnabled) {
        this.onOpening0 = global.display.connect("window-created" , (display ,window) => this.addOtherEffects ( window.get_compositor_private(), "open" ));
    }
    if(this.closingingEffectEnabled) {
        this.onClosing  = global.window_manager.connect("destroy" , (shellwm ,actor ) => this.addWindowEffects ( shellwm, actor, "close" ));
    }
    if(this.minimizingEffectEnabled) {
        this.onMinimizing  = global.window_manager.connect("minimize" , (shellwm ,actor ) => this.addWindowEffects ( shellwm ,actor ,"minimize" ));
    }
    if(this.unMinimizingEffectEnabled) {
        this.onUnminimizing  = global.window_manager.connect("unminimize" , (shellwm ,actor ) => this.addWindowEffects ( shellwm ,actor ,"unminimize" ));
    }

  },

  destroy: function () {

    if(this.openingWindowEffectEnabled) {
      global.window_manager.disconnect(this.onOpening1);
    }
    if(this.openingOtherEffectEnabled) {
      global.display.disconnect(this.onOpening0);
    }
    if(this.closingingEffectEnabled) {
      global.window_manager.disconnect(this.onClosing);
    }
    if(this.minimizingEffectEnabled) {
      global.window_manager.disconnect(this.onMinimizing);
    }
    if(this.unMinimizingEffectEnabled) {
      global.window_manager.disconnect(this.onUnminimizing);
    }
    
  },

});
