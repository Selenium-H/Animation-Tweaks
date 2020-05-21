/*

Version 11
==========

Effect Format  [  |  S    Name     C       PPX       PPY       CX        CY        CZ        T         OP        SX        SY        PX        PY        TZ        RX        RY        RZ        TRN  ]

Read the effectParameters.txt File for details.

*/

const Config      = imports.misc.config;
const Extension   = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const GLib        = imports.gi.GLib;
const Lang        = imports.lang;
const Meta        = imports.gi.Meta;
const Tweener     = imports.ui.tweener;
const Main        = imports.ui.main;
const Shell       = imports.gi.Shell;

const changedActorRotationCenter = (Config.PACKAGE_VERSION >= "3.36.0")?imports.gi.Graphene.Point3D : imports.gi.Clutter.Vertex;

const defaultNotificationBannerTweenFunction = (Config.PACKAGE_VERSION >= "3.36.0")? null : Main.messageTray._tween;
const defaultUpdateShowingNotification       = Main.messageTray._updateShowingNotification;
const defaultHideNotification                = Main.messageTray._hideNotification;

let defaultOnCompleteParams;
let defaultOnComplete;

const defaultPadOSDShow = Main.osdWindowManager._showOsdWindow;

const TWEEN_PARAMETERS_LENGTH = 16;

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
  effectsManager.prefs.connect("changed::reload-profiles-signal", () => effectsManager.loadProfilePrefs());

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
        
    this.forThisVersion=(Config.PACKAGE_VERSION < "3.34.2") ? "Old" : "New";
    
    this.dropdownmenuWindowcloseProfile  =  [''];   
    this.popupmenuWindowcloseProfile     =  [''];
    this.comboWindowcloseProfile         =  [''];
    this.splashscreenWindowcloseProfile  =  [''];
    this.tooltipWindowcloseProfile       =  [''];
    this.overrideotherWindowcloseProfile =  [''];
      
  },

  addFocussingEffects: function() {

    (this.focusWindow != null                                 && this.doFocusAndDefocus == true && this.defocussingEffectEnabled == true && !Main.overview._shown ) ? this.addWindowEffects(this.focusWindow.get_compositor_private(),"defocus") : null;
    ((this.focusWindow = global.display.focus_window) != null && this.doFocusAndDefocus == true && this.focussingEffectEnabled   == true && !Main.overview._shown ) ? this.addWindowEffects(this.focusWindow.get_compositor_private(),"focus")   : null;

  },
  
  addMovingEffects: function(window, action,op) {

    (window != null && op == 1 && !Main.overview._shown ) ? this.addWindowEffects(window.get_compositor_private(),action): null;
    
  },
 
  addNotificationBannerEffects: function() {
  
    if(this.notificationBannerAlignment != 0) {
      Main.messageTray.bannerAlignment = this.notificationBannerAlignment;
    }
    else {
      this.notificationBannerAlignment = Main.messageTray.bannerAlignment;
      this.prefs.set_enum("notificationbanner-pos",Main.messageTray.bannerAlignment);
    }
        
    if(this.notificationbannerWindowopenProfile[0]=="T"||this.notificationbannerWindowcloseProfile[0]=="T") {

      if(Config.PACKAGE_VERSION < "3.34.2") {
        Main.messageTray._tween = this.driveNotificationBannerAnimation;
      }
      else {
        Main.messageTray._updateShowingNotification = (this.notificationbannerWindowopenProfile[0]=="T")?this.overriddenUpdateShowingNotification: defaultUpdateShowingNotification;  
        Main.messageTray._hideNotification = (this.notificationbannerWindowcloseProfile[0]=="T")?this.overriddenHideNotification:defaultHideNotification;
      }

      return;
    }
    
    this.restoreDefaultNotificationBannerEffects();

  },

  addPadOSDEffects: function() {
  
    if(this.padosdWindowopenProfile[0]=="T"||this.padosdWindowcloseProfile[0]=="T"){
      Main.osdWindowManager._showOsdWindow = this.driveOSDAnimation;
      return;
    }  
    this.restoreDefaultPadOSDEffects();

  },
  
  addWindowEffects : function (actor, action, useApplicationProfilesForThisAction = false) {
    
    let eParams=[];
    let windowType = "Other";

    switch(actor.meta_window.window_type) {
    
      default :
        return;
        
      case Meta.WindowType.NORMAL :
        windowType = "Window";
        eParams = this["normalWindow"+action+"Profile"][(this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(Shell.WindowTracker.get_default().get_window_app(actor.meta_window).get_name())+1)].slice(0);
        break;
        
      case Meta.WindowType.DIALOG :
        windowType = "Window";
        eParams = this["dialogWindow"+action+"Profile"][(this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(Shell.WindowTracker.get_default().get_window_app(actor.meta_window).get_name())+1)].slice(0);
        break;
        
      case Meta.WindowType.MODAL_DIALOG:
        windowType = "Window";
        eParams = this["modaldialogWindow"+action+"Profile"][(this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(Shell.WindowTracker.get_default().get_window_app(actor.meta_window).get_name())+1)].slice(0);
        break;
        
      case Meta.WindowType.DROPDOWN_MENU :
        eParams = this["dropdownmenuWindow"+action+"Profile"];
        break;
        
      case Meta.WindowType.POPUP_MENU :
        eParams = this["popupmenuWindow"+action+"Profile"];
        break;
        
      case Meta.WindowType.COMBO :
        eParams = this["comboWindow"+action+"Profile"];
        break;
        
      case Meta.WindowType.SPLASHSCREEN :
        eParams = this["splashscreenWindow"+action+"Profile"];
        break;
        
      case Meta.WindowType.TOOLTIP :
        eParams = this["tooltipWindow"+action+"Profile"];
        break;
        
      case Meta.WindowType.OVERRIDE_OTHER :
        eParams = this["overrideotherWindow"+action+"Profile"];
        break;
        
    }

    switch(action+windowType+this.forThisVersion+eParams[0]) {

      case "focusWindowOldT" :
      case "focusWindowNewT" :
      case "defocusWindowOldT"  :
      case "defocusWindowNewT"  :
        this.driveOtherAnimation(actor, eParams, 0, action,"window",null, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);
        return;      
    
      case "movestartWindowOldT" :
      case "movestartWindowNewT" :
        eParams[2] = eParams[2]/2;
        this.driveOtherAnimation(actor, eParams, 0, action,"window",null, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);
        return;
        
      case "movestopWindowOldT"  :
      case "movestopWindowNewT"  :
        this.driveOtherAnimation(actor, eParams, eParams[2]/2, action,"window",null, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);
        return;

      case "openOtherOldT" :
        actor.set_opacity(0);
        Tweener.removeTweens(actor);
        this.driveOtherAnimation(actor, eParams, 0, action,"other",null, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);
        return;
        
      case "openOtherNewT" :
        actor.set_opacity(0);
        actor.remove_all_transitions();
        this.driveOtherAnimation(actor, eParams, 0, action,"other",null, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);
        return;

      case "openWindowOldT" :
        this.doFocusAndDefocus = false;
        actor.set_opacity(0);
        Main.wm._removeEffect(Main.wm._mapping, actor);
        break;
        
      case "openWindowNewT" :
        this.doFocusAndDefocus = false;
        actor.set_opacity(0);
        Main.wm._mapping.delete(actor);
        actor.remove_all_transitions();        
        break;
        
      case "closeWindowOldT" :
        this.doFocusAndDefocus = false;
        Main.wm._removeEffect(Main.wm._destroying, actor);   
        if(actor.meta_window.is_attached_dialog()) {
          actor._parentDestroyId = actor.meta_window.get_transient_for().connect('unmanaged', () => {
            Tweener.removeTweens(actor);
            this.animationDone(actor,action,"window");
          });
        }
        break;
        
      case "closeWindowNewT" :
        this.doFocusAndDefocus = false;
        Main.wm._destroying.delete(actor);
        actor.remove_all_transitions();        
            
        if(actor.meta_window.is_attached_dialog()) {
          actor._parentDestroyId = actor.meta_window.get_transient_for().connect('unmanaged', () => {
            actor.remove_all_transitions();
            this.animationDone(actor,action,"window");
          });
        }
        break;
        
      case "minimizeWindowOldT":
        this.doFocusAndDefocus = false;
        Main.wm._removeEffect(Main.wm._minimizing, actor);
        break;

      case "minimizeWindowNewT":
        this.doFocusAndDefocus = false;
        Main.wm._minimizing.delete(actor);
        actor.remove_all_transitions();        
        break;

      case "unminimizeWindowOldT" :
      case "unminimizeWindowNewT" :
        this.doFocusAndDefocus = false;
        if(Main.overview._shown) {
          this.animationDone(actor,"unminimize","window");
          return;
        }
        actor.set_opacity(0);
        Main.wm._unminimizeWindowDone(Main.wm._shellwm ,actor);
        break;
        
      default:
        return;
    
    }

    let [success, geom] = actor.meta_window.get_icon_geometry();
    
    [eParams[0],eParams[1]] = [actor.x,actor.y];
    this.driveWindowAnimation( actor, eParams, 0, action,success,geom,Main.layoutManager.monitors[global.display.get_current_monitor()].width,Main.layoutManager.monitors[global.display.get_current_monitor()].height);        

  },
   
  animationDone : function (actor, action, itemType="other",itemObject=null) {
  
    switch(action+itemType+this.forThisVersion) {

      case "opennotificationbannerOld":
      case "opennotificationbannerNew":
      case "closenotificationbannerOld":            
      case "closenotificationbannerNew":
        actor.hide();
        actor.set_scale(1,1);
        actor.show();
        return;
    
      case "openpadosdOld":
      case "openpadosdNew":
        actor.set_opacity(255);
        actor.set_scale(1,1);
        return;

      case "closepadosdOld":
      case "closepadosdNew":
        actor.hide(); 
        itemObject._reset();
        Meta.enable_unredirect_for_display(global.display);           
        actor.set_opacity(255);
        actor.set_scale(1,1);
        return;
      
      case "openwindowOld" :
        Main.wm._mapping.push(actor);
        Main.wm._mapWindowDone(Main.wm._shellwm ,actor);
        this.doFocusAndDefocus = true;
        break;

      case "openwindowNew" :
        (Config.PACKAGE_VERSION < "3.36.0") ? Main.wm._mapping.add(actor): null;
        Main.wm._mapWindowDone(Main.wm._shellwm ,actor);
        this.doFocusAndDefocus = true;
        break;

      case "closewindowOld" :
      case "closewindowNew" :
        actor.hide();   
        Main.wm._destroyWindowDone(Main.wm._shellwm ,actor);
        this.doFocusAndDefocus = true;
        return;

      case "unminimizewindowOld" :
      case "unminimizewindowNew" :
        Main.wm._unminimizeWindowDone(Main.wm._shellwm ,actor);
        this.doFocusAndDefocus = true;
        break;

      case "minimizewindowOld" :
        actor.hide(); 
        Main.wm._minimizing.push(actor);
        Main.wm._minimizeWindowDone(Main.wm._shellwm ,actor);
        this.doFocusAndDefocus = true;
        return;
               
      case "minimizewindowNew" :
        actor.hide();      
        Main.wm._minimizing.add(actor);
        Main.wm._minimizeWindowDone(Main.wm._shellwm ,actor);
        this.doFocusAndDefocus = true;
        return;
      
      case "openotherOld":
      case "openotherNew":
        break;

      case "focusWindowOldT" :
      case "focusWindowNewT" :
      case "defocusWindowOldT"  :
      case "defocusWindowNewT"  :
      
      case "movestartwindowOldT" :
      case "movestartwindowNewT" :
      case "movestopwindowOldT"  :
      case "movestopwindowNewT"  :

      default: return;
    }

    actor.set_scale(1,1);
    actor.set_opacity(255);
    actor.set_pivot_point(0,0); 
    actor.rotation_angle_x = 0;
    actor.rotation_angle_y = 0;
    actor.rotation_angle_z = 0;
    actor.hide();
    actor.show();
    
  },
  
  doNothing: function() {
  
  // Do Nothing
  
  },
  
  driveNotificationBannerAnimation: function(actor, statevar, value, params,subEffectNo=0,eParams=[],xRes, yRes) {
   
    if(subEffectNo == 0) {
      xRes = Main.layoutManager.monitors[global.display.get_current_monitor()].width;
      yRes = Main.layoutManager.monitors[global.display.get_current_monitor()].height;
      eParams = effectsManager["notificationbannerWindow"+((value==0)?"close":"open")+"Profile"];
      params.y = (eParams[0]=="T" && value==0)? 0 : params.y;
      defaultOnComplete = params.onComplete;
      defaultOnCompleteParams = params.onCompleteParams;
    }

    switch(eParams[0]) {
 
      case "F": 
        params.onComplete = Main.messageTray._tweenComplete;
        params.onCompleteParams = [statevar, value, defaultOnComplete, Main.messageTray, defaultOnCompleteParams];
        actor.set_opacity(255);
        break;
     
      default: 
        if(value == 0 && actor.x != 0 ) {
          Main.messageTray.bannerAlignment = 1;
        }
      
        let startIndex = subEffectNo*TWEEN_PARAMETERS_LENGTH + 3;
      
        actor.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++] );
        actor.rotation_center_x = new changedActorRotationCenter({ x: parseFloat(eParams[startIndex++])*actor.width,y: parseFloat(eParams[startIndex++])*actor.height,z: parseFloat(eParams[startIndex++])*actor.height})
        actor.rotation_center_y = actor.rotation_center_x;
        actor.rotation_center_z = actor.rotation_center_x;
        
        params.time             = eParams[startIndex++];
        params.opacity          = eParams[startIndex++];
        params.scale_x          = eParams[startIndex++];
        params.scale_y          = eParams[startIndex++];    
        params.translation_x    = eParams[startIndex++]*xRes;
        params.translation_y    = eParams[startIndex++]*yRes; 
        params.translation_z    = eParams[startIndex++]*yRes;
        params.rotation_angle_x = eParams[startIndex++];
        params.rotation_angle_y = eParams[startIndex++];           
        params.rotation_angle_z = eParams[startIndex++];
        params.transition       = eParams[startIndex++];
        params.onUpdate         = effectsManager.doNothing; 

        if(eParams[2] == subEffectNo+1) {
          params.onComplete = ()=> {
            effectsManager.animationDone(Main.messageTray._bannerBin, "open", "notificationbanner");
            (Config.PACKAGE_VERSION < "3.34.2") ? Main.messageTray._tweenComplete(statevar, value, defaultOnComplete , Main.messageTray, defaultOnCompleteParams):defaultOnComplete();
          }
          params.onCompleteParams = [statevar, value, defaultOnComplete , Main.messageTray, defaultOnCompleteParams];
        }
        else {
          params.onComplete = effectsManager.driveNotificationBannerAnimation;
          params.onCompleteParams = [actor,statevar, value, params,subEffectNo+1,eParams,xRes,yRes];
        }
    
    }  
  
    Tweener.removeTweens(actor); 
    Main.messageTray.bannerAlignment = effectsManager.notificationBannerAlignment;
    Tweener.addTween(actor, params);
     
    if(Config.PACKAGE_VERSION < "3.34.2") {
      let valuing = (value == 2  ) ? 1 : 3 ;
      Main.messageTray[statevar] = valuing;
    }
  
  },
    
  driveOSDAnimation: function(monitorIndex, icon, label, level, maxLevel, action="open", osdWindow=null) {
        
    osdWindow = (osdWindow==null) ? Main.osdWindowManager._osdWindows[monitorIndex]: osdWindow;
    let osdWindowActor = (Config.PACKAGE_VERSION < "3.36") ? osdWindow.actor:osdWindow; 
    let eParams = effectsManager["padosdWindow"+action+"Profile"];
   
    switch (action) {
    
      case "open" :
        osdWindow.setIcon(icon);
        osdWindow.setLabel(label);
        osdWindow.setMaxLevel(maxLevel);
        osdWindow.setLevel(level);
       
        if (!osdWindow._icon.gicon){
          return;
        }
                
        if(!osdWindowActor.visible) {
    
          Meta.disable_unredirect_for_display(global.display);
          osdWindowActor.show();
          osdWindowActor.opacity = 0;
          osdWindowActor.get_parent().set_child_above_sibling(osdWindowActor, null);
      
          if(eParams[0]=="T"){         
            effectsManager.driveOtherAnimation(osdWindowActor, eParams, 0, action, "padosd", osdWindow, Main.layoutManager.monitors[monitorIndex].width, Main.layoutManager.monitors[monitorIndex].height);
          }
          else {
            Tweener.addTween(osdWindowActor,{ 
              opacity: 255,
              time: 0.250,
              transition: 'easeOutQuad' 
            });
          } 
       
        }
        
        if(osdWindowActor._hideTimeoutId) {
          GLib.source_remove(osdWindowActor._hideTimeoutId);
        } 
        osdWindowActor._hideTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT,effectsManager.padOSDHideTime,()=>effectsManager.driveOSDAnimation(monitorIndex, icon, label, level, maxLevel, "close",osdWindow));        
        GLib.Source.set_name_by_id( osdWindowActor._hideTimeoutId, '[gnome-shell] this._hide');  
        
        return;
    
      case "close" :         
        GLib.source_remove(osdWindowActor._hideTimeoutId);
        osdWindowActor._hideTimeoutId = 0;
        
        if(eParams[0]=="T") {
          effectsManager.driveOtherAnimation(osdWindowActor, eParams, 0, action, "padosd", osdWindow, Main.layoutManager.monitors[monitorIndex].width, Main.layoutManager.monitors[monitorIndex].height);
        }
        else {
          Tweener.addTween(osdWindowActor,{ 
            opacity: 0,
            duration: 0.250,
            transition: 'easeOutQuad', 
            onComplete: effectsManager.animationDone,
            onCompleteParams: [osdWindowActor, "close", "padosd", osdWindow]
          });
        }
        
        return GLib.SOURCE_REMOVE;
        
    }
    
  },

  driveOtherAnimation: function( actor, eParams, subEffectNo, action, itemType="other", itemObject=null, xRes,yRes) {

    if(eParams[2] == subEffectNo) {
      this.animationDone(actor,action,itemType,itemObject);
      return;
    }

    let startIndex = subEffectNo*TWEEN_PARAMETERS_LENGTH + 3;
       
    actor.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++] );   
    actor.rotation_center_x = new changedActorRotationCenter({ x: parseFloat(eParams[startIndex++])*actor.width,y: parseFloat(eParams[startIndex++])*actor.height,z: parseFloat(eParams[startIndex++])*actor.height})
    actor.rotation_center_y = actor.rotation_center_x;
    actor.rotation_center_z = actor.rotation_center_x;

    if(this.waylandWorkaroundEnabled && itemType == "other") {
    
      let skippedPosIndex = startIndex+6;
      Tweener.addTween(actor, {
        time:              eParams[startIndex++],
        opacity:           eParams[startIndex++],
        scale_x:           eParams[startIndex++],
        scale_y:           eParams[startIndex++],         
        translation_z:     eParams[skippedPosIndex++]*yRes,           
        rotation_angle_x:  eParams[skippedPosIndex++],
        rotation_angle_y:  eParams[skippedPosIndex++],           
        rotation_angle_z:  eParams[skippedPosIndex++],
        transition:        eParams[skippedPosIndex++],
        onComplete:        this.driveOtherAnimation,
        onCompleteScope:   this,
        onCompleteParams:  [actor,eParams,++subEffectNo,action,itemType,itemObject,xRes,yRes],
        onOverwrite:       this.animationDone,
        onOverwriteScope : this,
        onOverwriteParams: [actor,action,itemType,itemObject]
      });
      return;
   }
   
   Tweener.addTween(actor, {
     time:              eParams[startIndex++],
     opacity:           eParams[startIndex++],
     scale_x:           eParams[startIndex++],
     scale_y:           eParams[startIndex++],
     translation_x:     eParams[startIndex++]*xRes,           
     translation_y:     eParams[startIndex++]*yRes,           
     translation_z:     eParams[startIndex++]*yRes,
     rotation_angle_x:  eParams[startIndex++],
     rotation_angle_y:  eParams[startIndex++],           
     rotation_angle_z:  eParams[startIndex++],
     transition:        eParams[startIndex++],
     onComplete:        this.driveOtherAnimation,
     onCompleteScope:   this,
     onCompleteParams:  [actor,eParams,++subEffectNo,action,itemType,itemObject,xRes,yRes],
     onOverwrite:       this.animationDone,
     onOverwriteScope : this,
     onOverwriteParams: [actor,action,itemType,itemObject]   
   });
   
  },

  driveWindowAnimation: function( actor, eParams, subEffectNo, action,success,geom,xRes,yRes) {

    if(eParams[2] == subEffectNo) {
      this.animationDone(actor,action,"window");
      return;
    }
    
    let startIndex = subEffectNo*TWEEN_PARAMETERS_LENGTH + 3;
    
    this.setNextParametersWindow(actor,eParams,startIndex+7,success,geom,xRes,yRes);
    actor.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++]);        
    actor.rotation_center_x = new changedActorRotationCenter({ x: parseFloat(eParams[startIndex++])*actor.width,y: parseFloat(eParams[startIndex++])*actor.height,z: parseFloat(eParams[startIndex++])*actor.height})
    actor.rotation_center_y = actor.rotation_center_x;
    actor.rotation_center_z = actor.rotation_center_x;

    Tweener.addTween(actor, {
      time:              eParams[startIndex++],
      opacity:           eParams[startIndex++],
      scale_x:           eParams[startIndex++],
      scale_y:           eParams[startIndex++],
      x:                 eParams[startIndex++],           
      y:                 eParams[startIndex++],           
      translation_z:     eParams[startIndex++]*yRes,           
      rotation_angle_x:  eParams[startIndex++],
      rotation_angle_y:  eParams[startIndex++],           
      rotation_angle_z:  eParams[startIndex++],
      transition:        eParams[startIndex++],
      onComplete:        this.driveWindowAnimation,
      onCompleteScope:   this,
      onCompleteParams:  [actor,eParams,++subEffectNo,action,success,geom,xRes,yRes],
      onOverwrite:       this.animationDone,
      onOverwriteScope : this,
      onOverwriteParams: [actor,action,"window"]
    });
  
  },
  
  extensionDisableShortcut : function() {

    Main.wm.addKeybinding(
      'disable-shortcut',
      this.prefs,
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
      () => {
        disable();
        Main.notify("Animation Tweaks Extension Stopped ... ", "Extension is stopped temporarily. It will restart on restarting GNOME Shell");
      }
    );

  },

  extractEffect: function(effectList,startIndex,endIndex) {
  
    let eStr=[];
  
    while(startIndex <= endIndex) {
      eStr.push(effectList[startIndex]);
      startIndex++;
    }
    
    return eStr;
  
  },

  getEffectFor: function(appName,effectsListRaw) {
    
    let appIndex = (this.nameList.indexOf(appName)+1)*this.useApplicationProfiles;        
    let effectIndex = 0;
    let startIndex = 0;

    let endIndex = this.getEndIndex(effectsListRaw,startIndex);
    let eStr = this.extractEffect(effectsListRaw,1,endIndex);
    
    while(startIndex!=-1) {
    
      if(effectIndex == appIndex) {
        startIndex++;
        return this.extractEffect(effectsListRaw,startIndex,endIndex);
      }
      
      if(endIndex == effectsListRaw.length-1) {
        return eStr;
      }
      
      effectIndex++;
      startIndex = effectsListRaw.indexOf('|',startIndex+1);
      endIndex = this.getEndIndex(effectsListRaw,startIndex);
      
    } 
    
  },
  
  getEndIndex: function(effectList,startIndex) {
  
    let endIndex = effectList.indexOf('|',startIndex+1);
        
    if(endIndex == -1) {
      endIndex = effectList.length;
    }  
    
    return --endIndex;

  },

  loadPreferences : function() {

    this.openingEffectEnabled       = this.prefs.get_boolean("opening-effect");
    this.closingingEffectEnabled    = this.prefs.get_boolean("closing-effect");
    this.minimizingEffectEnabled    = this.prefs.get_boolean("minimizing-effect");
    this.unMinimizingEffectEnabled  = this.prefs.get_boolean("unminimizing-effect");
    this.movingEffectEnabled        = this.prefs.get_boolean("moving-effect");
    this.focussingEffectEnabled     = this.prefs.get_boolean("focussing-effect");
    this.defocussingEffectEnabled   = this.prefs.get_boolean("defocussing-effect");
    
    this.doFocusAndDefocus = true;
    this.focusWindow = null;
    
    this.loadProfilePrefs();

  },
  
  loadProfilePrefs: function() {
  
    this.useApplicationProfiles = this.prefs.get_boolean("use-application-profiles");
    this.nameList = this.prefs.get_strv("name-list");
    
    let normalWindowopenProfileRaw       = this.prefs.get_strv("normal-open"); 
    let normalWindowcloseProfileRaw      = this.prefs.get_strv("normal-close");
    let normalWindowminimizeProfileRaw   = this.prefs.get_strv("normal-minimize");
    let normalWindowunminimizeProfileRaw = this.prefs.get_strv("normal-unminimize");    
    let normalWindowmovestartProfileRaw  = this.prefs.get_strv("normal-movestart");   
    let normalWindowfocusProfileRaw      = this.prefs.get_strv("normal-focus");    
    let normalWindowdefocusProfileRaw    = this.prefs.get_strv("normal-defocus");    
     
    let dialogWindowopenProfileRaw       = this.prefs.get_strv("dialog-open");
    let dialogWindowcloseProfileRaw      = this.prefs.get_strv("dialog-close");
    let dialogWindowminimizeProfileRaw   = this.prefs.get_strv("dialog-minimize");
    let dialogWindowunminimizeProfileRaw = this.prefs.get_strv("dialog-unminimize");  
    let dialogWindowmovestartProfileRaw  = this.prefs.get_strv("dialog-movestart");
    let dialogWindowfocusProfileRaw      = this.prefs.get_strv("dialog-focus");    
    let dialogWindowdefocusProfileRaw    = this.prefs.get_strv("dialog-defocus");    

    let modaldialogWindowopenProfileRaw       = this.prefs.get_strv("modaldialog-open");
    let modaldialogWindowcloseProfileRaw      = this.prefs.get_strv("modaldialog-close");
    let modaldialogWindowminimizeProfileRaw   = this.prefs.get_strv("modaldialog-minimize");
    let modaldialogWindowunminimizeProfileRaw = this.prefs.get_strv("modaldialog-unminimize");  
    let modaldialogWindowmovestartProfileRaw  = this.prefs.get_strv("modaldialog-movestart");
    let modaldialogWindowfocusProfileRaw      = this.prefs.get_strv("modaldialog-focus");    
    let modaldialogWindowdefocusProfileRaw    = this.prefs.get_strv("modaldialog-defocus");    
    
    this.dropdownmenuWindowopenProfile  = this.prefs.get_strv("dropdownmenu-open");
    this.popupmenuWindowopenProfile     = this.prefs.get_strv("popupmenu-open");
    this.comboWindowopenProfile         = this.prefs.get_strv("combo-open");
    this.splashscreenWindowopenProfile  = this.prefs.get_strv("splashscreen-open");
    this.tooltipWindowopenProfile       = this.prefs.get_strv("tooltip-open");
    this.overrideotherWindowopenProfile = this.prefs.get_strv("overrideother-open");    

    this.notificationbannerWindowopenProfile  = this.prefs.get_strv("notificationbanner-open");
    this.notificationbannerWindowcloseProfile = this.prefs.get_strv("notificationbanner-close");
    this.notificationBannerAlignment          = this.prefs.get_enum("notificationbanner-pos");  
    
    this.padosdWindowopenProfile  = this.prefs.get_strv("padosd-open");
    this.padosdWindowcloseProfile = this.prefs.get_strv("padosd-close"); 
      
    this.waylandWorkaroundEnabled = this.prefs.get_boolean("wayland");
    this.padOSDHideTime           = this.prefs.get_int("padosd-hide-timeout");
    
    this.normalWindowopenProfile       = [this.getEffectFor("",normalWindowopenProfileRaw)];
    this.normalWindowcloseProfile      = [this.getEffectFor("",normalWindowcloseProfileRaw)];
    this.normalWindowminimizeProfile   = [this.getEffectFor("",normalWindowminimizeProfileRaw)];
    this.normalWindowunminimizeProfile = [this.getEffectFor("",normalWindowunminimizeProfileRaw)];
    this.normalWindowmovestartProfile  = [this.getEffectFor("",normalWindowmovestartProfileRaw)];
    this.normalWindowfocusProfile      = [this.getEffectFor("",normalWindowfocusProfileRaw)];
    this.normalWindowdefocusProfile    = [this.getEffectFor("",normalWindowdefocusProfileRaw)];        
    
    this.dialogWindowopenProfile       = [this.getEffectFor("",dialogWindowopenProfileRaw)];
    this.dialogWindowcloseProfile      = [this.getEffectFor("",dialogWindowcloseProfileRaw)];
    this.dialogWindowminimizeProfile   = [this.getEffectFor("",dialogWindowminimizeProfileRaw)];
    this.dialogWindowunminimizeProfile = [this.getEffectFor("",dialogWindowunminimizeProfileRaw)];
    this.dialogWindowmovestartProfile  = [this.getEffectFor("",dialogWindowmovestartProfileRaw)];
    this.dialogWindowfocusProfile      = [this.getEffectFor("",dialogWindowfocusProfileRaw)];
    this.dialogWindowdefocusProfile    = [this.getEffectFor("",dialogWindowdefocusProfileRaw)];        

    this.modaldialogWindowopenProfile       = [this.getEffectFor("",modaldialogWindowopenProfileRaw)];
    this.modaldialogWindowcloseProfile      = [this.getEffectFor("",modaldialogWindowcloseProfileRaw)];
    this.modaldialogWindowminimizeProfile   = [this.getEffectFor("",modaldialogWindowminimizeProfileRaw)];
    this.modaldialogWindowunminimizeProfile = [this.getEffectFor("",modaldialogWindowunminimizeProfileRaw)];
    this.modaldialogWindowmovestartProfile  = [this.getEffectFor("",modaldialogWindowmovestartProfileRaw)];
    this.modaldialogWindowfocusProfile      = [this.getEffectFor("",modaldialogWindowfocusProfileRaw)];
    this.modaldialogWindowdefocusProfile    = [this.getEffectFor("",modaldialogWindowdefocusProfileRaw)];        

    this.normalWindowmovestopProfile      = this.normalWindowmovestartProfile;
    this.dialogWindowmovestopProfile      = this.dialogWindowmovestartProfile;
    this.modaldialogWindowmovestopProfile = this.modaldialogWindowmovestartProfile;
      
    this.dropdownmenuWindowopenProfile.splice(0,1);
    this.popupmenuWindowopenProfile.splice(0,1);
    this.comboWindowopenProfile.splice(0,1);         
    this.splashscreenWindowopenProfile.splice(0,1); 
    this.tooltipWindowopenProfile.splice(0,1);      
    this.overrideotherWindowopenProfile.splice(0,1);

    this.padosdWindowopenProfile.splice(0,1);
    this.padosdWindowcloseProfile.splice(0,1);
    this.addPadOSDEffects(); 
        
    this.notificationbannerWindowopenProfile.splice(0,1);
    this.notificationbannerWindowcloseProfile.splice(0,1);
    this.addNotificationBannerEffects();

    if(this.useApplicationProfiles) {
      for(let i=0;i<this.nameList.length;i++) {
    
        this.normalWindowopenProfile[i+1]       = this.getEffectFor(this.nameList[i],normalWindowopenProfileRaw);
        this.normalWindowcloseProfile[i+1]      = this.getEffectFor(this.nameList[i],normalWindowcloseProfileRaw);
        this.normalWindowminimizeProfile[i+1]   = this.getEffectFor(this.nameList[i],normalWindowminimizeProfileRaw);
        this.normalWindowunminimizeProfile[i+1] = this.getEffectFor(this.nameList[i],normalWindowunminimizeProfileRaw);   
      
        this.dialogWindowopenProfile[i+1]       = this.getEffectFor(this.nameList[i],dialogWindowopenProfileRaw);
        this.dialogWindowcloseProfile[i+1]      = this.getEffectFor(this.nameList[i],dialogWindowcloseProfileRaw);
        this.dialogWindowminimizeProfile[i+1]   = this.getEffectFor(this.nameList[i],dialogWindowminimizeProfileRaw);
        this.dialogWindowunminimizeProfile[i+1] = this.getEffectFor(this.nameList[i],dialogWindowunminimizeProfileRaw);
        
        this.modaldialogWindowopenProfile[i+1]       = this.getEffectFor(this.nameList[i],modaldialogWindowopenProfileRaw);
        this.modaldialogWindowcloseProfile[i+1]      = this.getEffectFor(this.nameList[i],modaldialogWindowcloseProfileRaw);
        this.modaldialogWindowminimizeProfile[i+1]   = this.getEffectFor(this.nameList[i],modaldialogWindowminimizeProfileRaw);
        this.modaldialogWindowunminimizeProfile[i+1] = this.getEffectFor(this.nameList[i],modaldialogWindowunminimizeProfileRaw); 
        
      }    
    }

  },

  overriddenHideNotification: function(animate) {

    Main.messageTray._notificationFocusGrabber.ungrabFocus();

    if(Main.messageTray._bannerClickedId) {
      Main.messageTray._banner.disconnect(Main.messageTray._bannerClickedId);
      Main.messageTray._bannerClickedId = 0;
    }
    if(Main.messageTray._bannerUnfocusedId) {
      Main.messageTray._banner.disconnect(Main.messageTray._bannerUnfocusedId);
      Main.messageTray._bannerUnfocusedId = 0;
    }

    Main.messageTray._resetNotificationLeftTimeout();

    if (animate) {
      effectsManager.driveNotificationBannerAnimation(Main.messageTray._bannerBin, '_notificationState', 0,/*State.HIDDEN/**/ { 
        y:               -Main.messageTray._bannerBin.height,
        _opacity:        0,
        time:            0.250,//ANIMATION_TIME,
        transition:      'easeOutBack',
        onUpdate:        Main.messageTray._clampOpacity,
        onUpdateScope:   Main.messageTray,
        onComplete:      () => {
                           Main.messageTray._notificationState = 0;
                           Main.messageTray._hideNotificationCompleted();
                           Main.messageTray._updateState();
                         },
        onCompleteScope: Main.messageTray
      });
    } 
    else {
      Tweener.removeTweens(Main.messageTray._bannerBin);
      Main.messageTray._bannerBin.y = -Main.messageTray._bannerBin.height;
      Main.messageTray._bannerBin.opacity = 0;
      Main.messageTray._notificationState = 0;//State.HIDDEN;
      Main.messageTray._hideNotificationCompleted();
    }
  
  },

  overriddenUpdateShowingNotification: function() {
  
    Main.messageTray._notification.acknowledged = true;
    Main.messageTray._notification.playSound();

    // We auto-expand notifications with CRITICAL urgency, or for which the relevant setting
    // is on in the control center.
    if (Main.messageTray._notification.urgency == 3  ||  // Urgency.CRITICAL
      Main.messageTray._notification.source.policy.forceExpanded)
      Main.messageTray._expandBanner(true);

      // We tween all notifications to full opacity. This ensures that both new notifications and
      // notifications that might have been in the process of hiding get full opacity.
      //
      // We tween any notification showing in the banner mode to the appropriate height
      // (which is banner height or expanded height, depending on the notification state)
      // This ensures that both new notifications and notifications in the banner mode that might
      // have been in the process of hiding are shown with the correct height.
      //
      // We use this._showNotificationCompleted() onComplete callback to extend the time the updated
      // notification is being shown.

      Main.messageTray._notificationState = 1;//State.SHOWING;
      Main.messageTray._bannerBin.remove_all_transitions();
      Main.messageTray._bannerBin.set_opacity(255);
          
      let tweenParams = { y: 0,
                          _opacity: 255,
                          time: 0.250, //ANIMATION_TIME,
                          transition: 'easeOutBack',
                          onUpdate: Main.messageTray._clampOpacity,
                          onUpdateScope: Main.messageTray,
                          onComplete: () => {
                                        Main.messageTray._notificationState = 2;//State.SHOWN;
                                        Main.messageTray._showNotificationCompleted();
                                        Main.messageTray._updateState();
                                      },

                          onCompleteScope: Main.messageTray
                        };      
        
      effectsManager.driveNotificationBannerAnimation(Main.messageTray._bannerBin,  '_notificationState', 2 , tweenParams,0)

  },
    
  restoreDefaultNotificationBannerEffects: function() {

    if(Config.PACKAGE_VERSION < "3.34.2") {
      Main.messageTray._tween = defaultNotificationBannerTweenFunction;
      return;
    }
      
    Main.messageTray._updateShowingNotification = defaultUpdateShowingNotification; 
    Main.messageTray._hideNotification = defaultHideNotification;
    
  },

  restoreDefaultPadOSDEffects: function() {
  
    Main.osdWindowManager._showOsdWindow = defaultPadOSDShow; 
    
  },

  setNextParametersWindow: function(actor,eParams,pIndex,success,geom,xRes,yRes) {

    eParams[pIndex]   = (eParams[pIndex]!="MW") ? eParams[pIndex] : (success) ? geom.width/actor.width   : (xRes*0.05)/actor.width;
    eParams[++pIndex] = (eParams[pIndex]!="MH") ? eParams[pIndex] : (success) ? geom.height/actor.height : (yRes*0.05)/actor.height;

    switch(eParams[++pIndex]) {

      case "LX" :
        eParams[pIndex] = 0-actor.width;
        break;
        
      case "RX" :
        eParams[pIndex] = (success)? geom.x:xRes ;
        break;

      case "MX" :
        eParams[pIndex] = (success) ? geom.x:xRes/2;
        break;

      case "SX" :
        eParams[pIndex] = actor.x;
        break;

      case "IX" :
        eParams[pIndex] = eParams[0];
        break; 

      default:
        eParams[pIndex] = actor.x + parseFloat(eParams[pIndex])*xRes;
        
    }

    switch(eParams[++pIndex]) {
    
      case "UY" :
        eParams[pIndex] = 0-actor.height;
        break;

      case "DY" :
        eParams[pIndex] = (success)? geom.y:yRes ;
        break;

      case "MY" :
        eParams[pIndex] = (success)? geom.y:yRes/2 ;
        break;

      case "SY" :
        eParams[pIndex] = actor.y;
        break;

      case "IY" :
        eParams[pIndex] = eParams[1];
        break; 

      default :
        eParams[pIndex] = actor.y + parseFloat(eParams[pIndex])*yRes;
        
    }
    
  },

  startEffectsManager: function() {

    this.extensionDisableShortcut();
   
    if(this.prefs.get_int("current-version") <= 10) {    
      Main.notify("Animation Tweaks","Extension is updated. A reset is needed. Please reset the extension");
      return;
    }

    this.loadPreferences();
   
    this.onOpeningSig      = (this.openingEffectEnabled)      ? global.window_manager.connect("map",        (swm,actor) => this.addWindowEffects(actor, "open",       true)) : null;
    this.onClosingSig      = (this.closingingEffectEnabled)   ? global.window_manager.connect("destroy",    (swm,actor) => this.addWindowEffects(actor, "close",      true)) : null;
    this.onMinimizingSig   = (this.minimizingEffectEnabled)   ? global.window_manager.connect("minimize",   (swm,actor) => this.addWindowEffects(actor, "minimize",   true)) : null;
    this.onUnminimizingSig = (this.unMinimizingEffectEnabled) ? global.window_manager.connect("unminimize", (swm,actor) => this.addWindowEffects(actor, "unminimize", true)) : null;
    
    this.focussingDefocussingSig = (this.focussingEffectEnabled || this.defocussingEffectEnabled) ? global.display.connect('notify::focus-window',()=>this.addFocussingEffects()) : null;
    
    if(this.movingEffectEnabled) {
      this.onMovingStartSig = global.display.connect('grab-op-begin', (display, screen, window, op)=> this.addMovingEffects(window, "movestart", op));
      this.onMovingEndSig   = global.display.connect('grab-op-end',   (display, screen, window, op)=> this.addMovingEffects(window, "movestop",  op));
    }
     
  },

  destroy: function () {

    (this.openingEffectEnabled)      ? global.window_manager.disconnect(this.onOpeningSig)      : null;
    (this.closingingEffectEnabled)   ? global.window_manager.disconnect(this.onClosingSig)      : null;
    (this.minimizingEffectEnabled)   ? global.window_manager.disconnect(this.onMinimizingSig)   : null;
    (this.unMinimizingEffectEnabled) ? global.window_manager.disconnect(this.onUnminimizingSig) : null;
    
    (this.focussingEffectEnabled || this.defocussingEffectEnabled) ? global.display.disconnect(this.focussingDefocussingSig) : null;

    if(this.movingEffectEnabled) {
      global.display.disconnect(this.onMovingStartSig);
      global.display.disconnect(this.onMovingEndSig);
    }

    this.restoreDefaultNotificationBannerEffects();
    this.restoreDefaultPadOSDEffects();
    
    Main.wm.removeKeybinding('disable-shortcut');
    
  },

});



