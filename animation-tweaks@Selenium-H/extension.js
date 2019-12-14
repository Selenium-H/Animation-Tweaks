/*

Version 9
=========

Effect String Format     [ |  Status   Name   Tweens  IO      IW     IH     IPX     IPY         T     PPx     PPY     NO      NW      NH     NPX     NPY  ... ]

Read the effectParameters.txt File for details.

*/

const Config = imports.misc.config;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Tweener = imports.ui.tweener;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;

let effectsManager = null;

function enable() {

  effectsManager = new EffectsManager();
  effectsManager.startEffectsManager();
  reloadExtensionOnPrefsChange();
  reloadApplicationProfilesOnPrefsChange();

}

function disable() {

  effectsManager.destroy();

}

function reloadApplicationProfilesOnPrefsChange() {

  // Reloads Application Profiles when preferences are changed.
  effectsManager.prefs.connect("changed::reload-profiles-signal", () => {
    effectsManager.loadProfilePrefs();
  });

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
        eParams = this.getEffectFor("","dropdownmenu",action);
        break;
      case Meta.WindowType.POPUP_MENU :
        eParams = this.getEffectFor("","popupmenu",action);
        break;
      case Meta.WindowType.COMBO :
        eParams = this.getEffectFor("","combo",action);
        break;
      case Meta.WindowType.SPLASHSCREEN :
        eParams = this.getEffectFor("","splashscreen",action);
        break;
      case Meta.WindowType.TOOLTIP :
        eParams = this.getEffectFor("","tooltip",action);
        break;
      case Meta.WindowType.OVERRIDE_OTHER :
        eParams = this.getEffectFor("","overrideother",action);
        break;
    }

    if(eParams[0] == "T") {
      (Config.PACKAGE_VERSION < "3.34.2") ? Tweener.removeTweens(actor) : actor.remove_all_transitions();
      this.initParametersOther(actor, eParams);
      this.driveOtherAnimation(actor, eParams, 0, action);
    }
  
  },

  addWindowEffects : function (shellwm, actor, action) {
        
    this.shellwm = shellwm;
    let eParams=[];
    
    switch(actor.meta_window.window_type) {
      default :
        return;
      case Meta.WindowType.NORMAL :
        eParams = this.getEffectFor(Shell.WindowTracker.get_default().get_window_app(actor.meta_window).get_name(),"normal",action);
        break;
      case Meta.WindowType.DIALOG :
        eParams = this.getEffectFor(Shell.WindowTracker.get_default().get_window_app(actor.meta_window).get_name(),"dialog",action);
        break;
      case Meta.WindowType.MODAL_DIALOG:
        eParams = this.getEffectFor(Shell.WindowTracker.get_default().get_window_app(actor.meta_window).get_name(),"modaldialog",action);
        break;
    }

    if(eParams[0] == "T") {
    
      if(Config.PACKAGE_VERSION < "3.34.2") {
 
        switch(action) {
      
          case "open": 
            Main.wm._removeEffect(Main.wm._mapping, actor);
            break;
          
          case "close":
            Main.wm._removeEffect(Main.wm._destroying, actor); 
          
            let window = actor.meta_window;
            if(window.is_attached_dialog()) {
              let parent = window.get_transient_for();
              actor._parentDestroyId = parent.connect('unmanaged', () => {
              Tweener.removeTweens(actor);
              this.animationDone(actor,action);
              });
            }
            break;
          
          case "minimize":
            Main.wm._removeEffect(Main.wm._minimizing, actor);
            break;
          
          case "unminimize":
            if(Main.overview._shown) {
              this.animationDone(actor,"unminimize");
              return;
            }
            Main.wm._unminimizeWindowDone(this.shellwm ,actor);
            break;
               
        }
      }
      else {
   
        switch(action) {
      
          case "open": 
            Main.wm._mapping.delete(actor);
            actor.remove_all_transitions();
            break;
          
          case "close":
            Main.wm._destroying.delete(actor);
            actor.remove_all_transitions();
          
            let window = actor.meta_window;
            if (window.is_attached_dialog()) {
              let parent = window.get_transient_for();
              actor._parentDestroyId = parent.connect('unmanaged', () => {
                actor.remove_all_transitions();
                this.animationDone(actor,action);
              });
            }
            break;
     
          case "minimize":
            Main.wm._minimizing.delete(actor);
            actor.remove_all_transitions();
            break;
         
          case "unminimize":
            if(Main.overview._shown) {
              this.animationDone(actor,"unminimize");
              return;
            }
            Main.wm._unminimizeWindowDone(this.shellwm ,actor);
            break;
         
        }    
      }

      let [success, geom] = actor.meta_window.get_icon_geometry();
      this.initParametersWindow(actor, eParams,success,geom);
      this.driveWindowAnimation( actor, eParams, 0, action,success,geom);
        
    }

  },

  animationDone : function (actor, action) {

    actor.hide();

    switch(action) {
      case "open" :
        (Config.PACKAGE_VERSION < "3.34.2") ? Main.wm._mapping.push(actor) : Main.wm._mapping.add(actor);
        Main.wm._mapWindowDone(this.shellwm ,actor);
        break;
      case "close" :
        Main.wm._destroyWindowDone(this.shellwm ,actor);
        return;
      case "minimize" :
        (Config.PACKAGE_VERSION < "3.34.2") ? Main.wm._minimizing.push(actor) : Main.wm._minimizing.add(actor);
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
    actor.set_pivot_point( eParams[subEffectNo*8+ 9] ,eParams[subEffectNo*8+ 10]);

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
      opacity:             eParams[subEffectNo*8+ 11],
      scale_x:             eParams[subEffectNo*8+ 12],
      scale_y:             eParams[subEffectNo*8+ 13],
      time:                eParams[subEffectNo*8+  8],
      transition:          'easeOutQuad',
      onComplete:          this.driveOtherAnimation,
      onCompleteScope:     this,
      onCompleteParams:    [actor,eParams,++subEffectNo,"other"],
      onOverwrite:         this.animationDone,
      onOverwriteScope :   this,
      onOverwriteParams:   [actor,action]
    });
   
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
  
  },
   
  extractEffect: function(effectList,startIndex,endIndex) {
  
    let eStr=[];
  
    while(startIndex <= endIndex) {
      eStr.push(effectList[startIndex]);
      startIndex++;
    }
    
    return eStr;
  
  },

  getEffectFor: function(appName,windowType,action) {
    
    let appIndex = (this.nameList.indexOf(appName)+1)*this.useApplicationProfiles;        
    let effectIndex = 0;
    let startIndex = 0;
    let endIndex = this.getEndIndex(this[windowType+"Window"+action+"Profile"],startIndex);
    
    let eStr = this.extractEffect(this[windowType+"Window"+action+"Profile"],1,endIndex);
    
    while(startIndex!=-1) {
    
      if(effectIndex == appIndex) {
        startIndex++;
        return this.extractEffect(this[windowType+"Window"+action+"Profile"],startIndex,endIndex);
      }
      
      if(endIndex == this[windowType+"Window"+action+"Profile"].length-1) {
        return eStr;
      }
      
      effectIndex++;
      startIndex = this[windowType+"Window"+action+"Profile"].indexOf('|',startIndex+1);
      endIndex = this.getEndIndex(this[windowType+"Window"+action+"Profile"],startIndex);
      
    } 
    
  },
  
  getEndIndex: function(effectList,startIndex) {
  
    let endIndex = effectList.indexOf('|',startIndex+1);
        
    if(endIndex == -1) {
      endIndex = effectList.length;
    }  
    
    return --endIndex;

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
    
    this.loadProfilePrefs();

  },
  
  loadProfilePrefs: function() {
  
    this.useApplicationProfiles = this.prefs.get_boolean("use-application-profiles");
    
    this.nameList = this.prefs.get_strv("name-list");
    
    this.normalWindowopenProfile             =  this.prefs.get_strv("normal-open");
    this.normalWindowcloseProfile            =  this.prefs.get_strv("normal-close");
    this.normalWindowminimizeProfile         =  this.prefs.get_strv("normal-minimize");
    this.normalWindowunminimizeProfile       =  this.prefs.get_strv("normal-unminimize");    
    
    this.dialogWindowopenProfile             =  this.prefs.get_strv("dialog-open");
    this.dialogWindowcloseProfile            =  this.prefs.get_strv("dialog-close");
    this.dialogWindowminimizeProfile         =  this.prefs.get_strv("dialog-minimize");
    this.dialogWindowunminimizeProfile       =  this.prefs.get_strv("dialog-unminimize");    

    this.modaldialogWindowopenProfile        =  this.prefs.get_strv("modaldialog-open");
    this.modaldialogWindowcloseProfile       =  this.prefs.get_strv("modaldialog-close");
    this.modaldialogWindowminimizeProfile    =  this.prefs.get_strv("modaldialog-minimize");
    this.modaldialogWindowunminimizeProfile  =  this.prefs.get_strv("modaldialog-unminimize");    

    this.dropdownmenuWindowopenProfile       =  this.prefs.get_strv("dropdownmenu-open");
    this.popupmenuWindowopenProfile          =  this.prefs.get_strv("popupmenu-open");
    this.comboWindowopenProfile              =  this.prefs.get_strv("combo-open");
    this.splashscreenWindowopenProfile       =  this.prefs.get_strv("splashscreen-open");
    this.tooltipWindowopenProfile            =  this.prefs.get_strv("tooltip-open");
    this.overrideotherWindowopenProfile      =  this.prefs.get_strv("overrideother-open");
    
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
        eParams[pIndex] = (success) ? geom.width/actor.width : (Main.layoutManager.monitors[global.display.get_current_monitor()].width*0.05)/actor.width ;
    }

    if(eParams[++pIndex]=="MH") {
        eParams[pIndex] = (success) ? geom.height/actor.height : (Main.layoutManager.monitors[global.display.get_current_monitor()].height*0.05)/actor.height ;
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
        
    }

    return [PX,PY,posChanged];

  },
 
  startEffectsManager: function() {

    this.loadPreferences();

    if(this.openingWindowEffectEnabled) {
        this.onOpening1 = global.window_manager.connect("map", (shellwm ,actor ) => this.addWindowEffects ( shellwm, actor, "open" ));
    }
    if(this.openingOtherEffectEnabled) {
        this.onOpening0 = global.display.connect("window-created", (display ,window) => this.addOtherEffects ( window.get_compositor_private(), "open" ));
    }
    if(this.closingingEffectEnabled) {
        this.onClosing  = global.window_manager.connect("destroy", (shellwm ,actor ) => this.addWindowEffects ( shellwm, actor, "close" ));
    }
    if(this.minimizingEffectEnabled) {
        this.onMinimizing  = global.window_manager.connect("minimize", (shellwm ,actor ) => this.addWindowEffects ( shellwm ,actor ,"minimize" ));
    }
    if(this.unMinimizingEffectEnabled) {
        this.onUnminimizing  = global.window_manager.connect("unminimize", (shellwm ,actor ) => this.addWindowEffects ( shellwm ,actor ,"unminimize" ));
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



