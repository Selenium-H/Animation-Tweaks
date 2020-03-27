/*

Version 9.3
===========

Effect String Format [ |  S    Name      C    PPX    PPY    CX     CY     CZ     T        OP     SX     SY     PX     PY      TZ     RX     RY     RZ     TRN  ]

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

const defaultNotificationBannerTweenFunction = Main.messageTray._tween;
const defaultUpdateShowingNotification       = Main.messageTray._updateShowingNotification;
const defaultHideNotification                = Main.messageTray._hideNotification;
let defaultOnCompleteParams ;
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

  },

  addNotificationBannerEffects: function() {
  
    if(this.notificationBannerAlignment != 0) {
      Main.messageTray.bannerAlignment = this.notificationBannerAlignment;
    }
    else {
      this.notificationBannerAlignment = Main.messageTray.bannerAlignment;
      this.prefs.set_enum("notificationbanner-pos",Main.messageTray.bannerAlignment);
    }
        
    if(this.notificationbannerWindowopenProfile[1]=="T"||this.notificationbannerWindowcloseProfile[1]=="T") {

      if(Config.PACKAGE_VERSION < "3.34.2") {
        Main.messageTray._tween = this.driveNotificationBannerAnimation;
      }
      else {
        Main.messageTray._updateShowingNotification = (this.notificationbannerWindowopenProfile[1]=="T")?this.overriddenUpdateShowingNotification: defaultUpdateShowingNotification;  
        Main.messageTray._hideNotification = (this.notificationbannerWindowcloseProfile[1]=="T")?this.overriddenHideNotification:defaultHideNotification;
      }

      return;
    }
    
    this.restoreDefaultNotificationBannerEffects();

  },

  addPadOSDEffects: function() {
  
    if(this.padosdWindowopenProfile[1]=="T"||this.padosdWindowcloseProfile[1]=="T"){
      Main.osdWindowManager._showOsdWindow = this.driveOSDAnimation;
      return;
    }  
    this.restoreDefaultPadOSDEffects();

  },
  
  addWindowEffects : function (actor, action) {
    
    let eParams=[];
    let windowType = "Other";
    
    switch(actor.meta_window.window_type) {
    
      default :
        return;
        
      case Meta.WindowType.NORMAL :
        windowType = "Window";
        eParams    = this.getEffectFor(Shell.WindowTracker.get_default().get_window_app(actor.meta_window).get_name(),"normal",action);
        break;
        
      case Meta.WindowType.DIALOG :
        windowType = "Window";
        eParams    = this.getEffectFor(Shell.WindowTracker.get_default().get_window_app(actor.meta_window).get_name(),"dialog",action);
        break;
        
      case Meta.WindowType.MODAL_DIALOG:
        windowType = "Window";
        eParams    = this.getEffectFor(Shell.WindowTracker.get_default().get_window_app(actor.meta_window).get_name(),"modaldialog",action);
        break;
        
      case Meta.WindowType.DROPDOWN_MENU :
        eParams    = this.getEffectFor("","dropdownmenu");
        break;
        
      case Meta.WindowType.POPUP_MENU :
        eParams    = this.getEffectFor("","popupmenu");
        break;
        
      case Meta.WindowType.COMBO :
        eParams    = this.getEffectFor("","combo");
        break;
        
      case Meta.WindowType.SPLASHSCREEN :
        eParams    = this.getEffectFor("","splashscreen");
        break;
        
      case Meta.WindowType.TOOLTIP :
        eParams    = this.getEffectFor("","tooltip");
        break;
        
      case Meta.WindowType.OVERRIDE_OTHER :
        eParams    = this.getEffectFor("","overrideother");
        break;
        
    }

    if(eParams[0] != "T") {
      return ;
    }
    
    let xRes = Main.layoutManager.monitors[global.display.get_current_monitor()].width;
    let yRes = Main.layoutManager.monitors[global.display.get_current_monitor()].height;

    switch(windowType) {
    
      default:

        switch(action) {
          default :
            return;
          case "open" :
            actor.opacity=0;
            (Config.PACKAGE_VERSION < "3.34.2") ? Tweener.removeTweens(actor) : actor.remove_all_transitions();
        } 
        
        this.driveOtherAnimation(actor, eParams, 0, action,"other",null, xRes, yRes);
        return;
    
      case "Window" :
        
        switch(action) {
        
          default :
            return;        
          case "open" :
            actor.opacity=0;
            if(Config.PACKAGE_VERSION < "3.34.2") {
              Main.wm._removeEffect(Main.wm._mapping, actor);
            }  
            else {
              Main.wm._mapping.delete(actor);
              actor.remove_all_transitions();        
            }
            break;
            
          case "close" :
            if(Config.PACKAGE_VERSION < "3.34.2") {
              Main.wm._removeEffect(Main.wm._destroying, actor); 
            }  
            else {
              Main.wm._destroying.delete(actor);
              actor.remove_all_transitions();        
            }
            
            if(actor.meta_window.is_attached_dialog()) {
              actor._parentDestroyId = actor.meta_window.get_transient_for().connect('unmanaged', () => {
                (Config.PACKAGE_VERSION < "3.34.2") ? Tweener.removeTweens(actor) : actor.remove_all_transitions();
                this.animationDone(actor,action,"window");
              });
            }
            break;
            
          case "minimize" :
            if(Config.PACKAGE_VERSION < "3.34.2") {
              Main.wm._removeEffect(Main.wm._minimizing, actor);
            }  
            else {
              Main.wm._minimizing.delete(actor);
              actor.remove_all_transitions();        
            }
            break;
            
          case "unminimize" :
            actor.opacity=0;
            if(Main.overview._shown) {
              this.animationDone(actor,"unminimize","window");
              return;
            }
            Main.wm._unminimizeWindowDone(Main.wm._shellwm ,actor);
            break;
            
        }
        
        let [success, geom] = actor.meta_window.get_icon_geometry();
        [eParams[0],eParams[1]] = [actor.x,actor.y];
        this.driveWindowAnimation( actor, eParams, 0, action,success,geom,xRes,yRes);        
    }

  },
   
  animationDone : function (actor, action, itemType="other",itemObject=null) {

    actor.hide();

    switch(itemType) {
    
      case "padosd" :
        switch(action) {
          case "open" :          
            break;
          case "close" :   
            itemObject._hide();
            actor.set_scale(1,1);
            actor.set_opacity(255);
            actor.set_pivot_point(0,0); 
            return;
        }
        break;
      
      case "window":
        switch(action) {
          case "open" :
            (Config.PACKAGE_VERSION < "3.34.2") ? Main.wm._mapping.push(actor) : (Config.PACKAGE_VERSION < "3.36.0") ? Main.wm._mapping.add(actor): null ;
            Main.wm._mapWindowDone(Main.wm._shellwm ,actor);
            break;
          case "close" :      
            Main.wm._destroyWindowDone(Main.wm._shellwm ,actor);
            return;
          case "minimize" :
            (Config.PACKAGE_VERSION < "3.34.2") ? Main.wm._minimizing.push(actor) : Main.wm._minimizing.add(actor);
            Main.wm._minimizeWindowDone(Main.wm._shellwm ,actor);
            return;
          case "unminimize" :
            Main.wm._unminimizeWindowDone(Main.wm._shellwm ,actor);
            break;
        }
        break;

      case "notificationbanner" :
        actor.set_scale(1,1);
        actor.set_pivot_point(0,0);
        actor.show();
        return;
        
      case "other" :
      default :
        switch(action) {
          case "open" :
            break;
          default :
            return;
        }
      
    }
  
    actor.set_scale(1,1);
    actor.set_opacity(255);
    actor.set_pivot_point(0,0);
    actor.show();
    
  },
  
  doNothing: function() {
  
  // Do Nothing
  
  },
  
  driveNotificationBannerAnimation: function(actor, statevar, value, params,subEffectNo=0,eParams=[],xRes, yRes) {

    let startIndex = subEffectNo*TWEEN_PARAMETERS_LENGTH + 3;
   
    if(subEffectNo == 0) {
      xRes = Main.layoutManager.monitors[global.display.get_current_monitor()].width;
      yRes = Main.layoutManager.monitors[global.display.get_current_monitor()].height;
      eParams = effectsManager.getEffectFor("","notificationbanner",(value==0)?"close":"open"); 
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
      
        actor.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++] );
        actor.rotation_center_x = new changedActorRotationCenter({ x: parseFloat(eParams[startIndex++])*actor.width,y: parseFloat(eParams[startIndex++])*actor.height,z: parseFloat(eParams[startIndex++])*actor.height})
        actor.rotation_center_y = actor.rotation_center_x;
        actor.rotation_center_z = actor.rotation_center_x;
        
        params.time             = eParams[startIndex++];
        params.opacity          = eParams[startIndex++];
        params.scale_x          = eParams[startIndex++];
        params.scale_y          = eParams[startIndex++];    
        params.translation_x    = (parseFloat(eParams[startIndex++]))*xRes;
        params.translation_y    = (parseFloat(eParams[startIndex++]))*yRes; 
        params.translation_z    = eParams[startIndex++]*actor.height;
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
  
  driveOSDAnimation: function(monitorIndex, icon, label, level, maxLevel, action="open",osdWindow=null) {
       
    osdWindow = (osdWindow==null) ? Main.osdWindowManager._osdWindows[monitorIndex]: osdWindow;
    
    let eParams = effectsManager.getEffectFor("","padosd",action);
    let osdWindowActor = (Config.PACKAGE_VERSION < "3.36") ? osdWindow.actor:osdWindow; 
    let xRes = Main.layoutManager.monitors[monitorIndex].width;
    let yRes = Main.layoutManager.monitors[monitorIndex].height;
    
    if(action == "open") {
    
      osdWindow.setIcon(icon);
      osdWindow.setLabel(label);
      osdWindow.setMaxLevel(maxLevel);
      osdWindow.setLevel(level);
       
      if (!osdWindow._icon.gicon){
        return;
      }

      if (!osdWindowActor.visible) {
    
        Meta.disable_unredirect_for_display(global.display);
        osdWindowActor.show();
        osdWindowActor.opacity = 0;
        osdWindowActor.get_parent().set_child_above_sibling(osdWindowActor, null);
      
        if(eParams[0]=="T"){
          effectsManager.driveOtherAnimation(osdWindowActor, eParams, 0, action,"padosd",osdWindow,xRes,yRes);
        }
        else {
          Tweener.addTween(osdWindowActor,{ 
            opacity: 255,
            time: 0.1,
            transition: 'easeOutQuad' 
          });
        }
       
      }

      if (Main.osdWindowManager._hideTimeoutId){
        GLib.source_remove( Main.osdWindowManager._hideTimeoutId);
      }
      
      this._hideTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT,effectsManager.prefs.get_int("padosd-hide-timeout"),()=> effectsManager.driveOSDAnimation(monitorIndex, icon, label, level, maxLevel, "close",osdWindow));
      GLib.Source.set_name_by_id( Main.osdWindowManager._hideTimeoutId, '[gnome-shell] this._hide');  
      
      return;

    }
    
    if(eParams[0]=="F"){
      osdWindow._hide();
      return;
    }
    
    effectsManager.driveOtherAnimation(osdWindowActor, eParams, 0, action, "padosd", osdWindow,xRes,yRes);

    if(Main.osdWindowManager._hideTimeoutId){
      GLib.source_remove(Main.osdWindowManager._hideTimeoutId);
    }
      
  },

  driveOtherAnimation: function( actor, eParams, subEffectNo, action, itemType="other", itemObject=null, xRes,yRes) {

    let startIndex = subEffectNo*TWEEN_PARAMETERS_LENGTH + 3;

    if(eParams[2] == subEffectNo) {
      this.animationDone(actor,action,itemType,itemObject);
      return;
    }

    let posChanged = this.setNextParametersOther(actor,eParams,startIndex+9,xRes,yRes);
    actor.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++] );   
    actor.rotation_center_x = new changedActorRotationCenter({ x: parseFloat(eParams[startIndex++])*actor.width,y: parseFloat(eParams[startIndex++])*actor.height,z: parseFloat(eParams[startIndex++])*actor.height})
    actor.rotation_center_y = actor.rotation_center_x;
    actor.rotation_center_z = actor.rotation_center_x;

    if(posChanged == true) {
      Tweener.addTween(actor, {
        time:              eParams[startIndex++],
        opacity:           eParams[startIndex++],
        scale_x:           eParams[startIndex++],
        scale_y:           eParams[startIndex++],
        translation_x:     eParams[startIndex++],           
        translation_y:     eParams[startIndex++],           
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
      return;
   }

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
   
  },

  driveWindowAnimation: function( actor, eParams, subEffectNo, action,success,geom,xRes,yRes) {

    let startIndex = subEffectNo*TWEEN_PARAMETERS_LENGTH + 3;

    if(eParams[2] == subEffectNo) {
      this.animationDone(actor,action,"window");
      return;
    }
    
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
   
  extractEffect: function(effectList,startIndex,endIndex) {
  
    let eStr=[];
  
    while(startIndex <= endIndex) {
      eStr.push(effectList[startIndex]);
      startIndex++;
    }
    
    return eStr;
  
  },

  getEffectFor: function(appName,windowType,action="open") {
    
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
  
  loadPreferences : function() {

    this.openingEffectEnabled       = this.prefs.get_boolean("opening-effect");
    this.closingingEffectEnabled    = this.prefs.get_boolean("closing-effect");
    this.minimizingEffectEnabled    = this.prefs.get_boolean("minimizing-effect");
    this.unMinimizingEffectEnabled  = this.prefs.get_boolean("unminimizing-effect");
    
    this.loadProfilePrefs();

  },
  
  loadProfilePrefs: function() {
  
    this.useApplicationProfiles = this.prefs.get_boolean("use-application-profiles");
    this.nameList = this.prefs.get_strv("name-list");
    
    this.normalWindowopenProfile               =  this.prefs.get_strv("normal-open");
    this.dialogWindowopenProfile               =  this.prefs.get_strv("dialog-open");
    this.modaldialogWindowopenProfile          =  this.prefs.get_strv("modaldialog-open");

    this.normalWindowcloseProfile              =  this.prefs.get_strv("normal-close");
    this.dialogWindowcloseProfile              =  this.prefs.get_strv("dialog-close");
    this.modaldialogWindowcloseProfile         =  this.prefs.get_strv("modaldialog-close");
    
    this.normalWindowminimizeProfile           =  this.prefs.get_strv("normal-minimize");
    this.dialogWindowminimizeProfile           =  this.prefs.get_strv("dialog-minimize");
    this.modaldialogWindowminimizeProfile      =  this.prefs.get_strv("modaldialog-minimize");

    this.normalWindowunminimizeProfile         =  this.prefs.get_strv("normal-unminimize");    
    this.dialogWindowunminimizeProfile         =  this.prefs.get_strv("dialog-unminimize");  
    this.modaldialogWindowunminimizeProfile    =  this.prefs.get_strv("modaldialog-unminimize");    

    this.dropdownmenuWindowopenProfile         =  this.prefs.get_strv("dropdownmenu-open");
    this.popupmenuWindowopenProfile            =  this.prefs.get_strv("popupmenu-open");
    this.comboWindowopenProfile                =  this.prefs.get_strv("combo-open");
    this.splashscreenWindowopenProfile         =  this.prefs.get_strv("splashscreen-open");
    this.tooltipWindowopenProfile              =  this.prefs.get_strv("tooltip-open");
    this.overrideotherWindowopenProfile        =  this.prefs.get_strv("overrideother-open");

    this.notificationbannerWindowopenProfile   =  this.prefs.get_strv("notificationbanner-open");
    this.notificationbannerWindowcloseProfile  =  this.prefs.get_strv("notificationbanner-close");
    this.notificationBannerAlignment           =  this.prefs.get_enum("notificationbanner-pos");  
    this.addNotificationBannerEffects();
    
    this.padosdWindowopenProfile               =  this.prefs.get_strv("padosd-open");
    this.padosdWindowcloseProfile              =  this.prefs.get_strv("padosd-close");  
    this.addPadOSDEffects();  

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
      effectsManager.driveNotificationBannerAnimation(Main.messageTray._bannerBin, '_notificationState', 0,/*State.HIDDEN/**/{ 
        y:               -Main.messageTray._bannerBin.height,
        _opacity:        0,
        time:            0.200,//ANIMATION_TIME,
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
                          time: 0.200, //ANIMATION_TIME,
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

  setNextParametersOther: function(actor,eParams,pIndex,xRes,yRes) {

    let posChanged = (eParams[pIndex]==1 && eParams[pIndex+1]==1) ? false : true;
    
    eParams[pIndex]   = parseFloat(eParams[pIndex])*xRes;
    eParams[++pIndex] = parseFloat(eParams[pIndex])*yRes;

    return posChanged && !this.prefs.get_boolean("wayland");

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

    this.loadPreferences();
    
    this.onOpening      = (this.openingEffectEnabled)      ? global.window_manager.connect("map",        (swm,actor) => this.addWindowEffects(actor, "open"))       : null;
    this.onClosing      = (this.closingingEffectEnabled)   ? global.window_manager.connect("destroy",    (swm,actor) => this.addWindowEffects(actor, "close"))      : null;
    this.onMinimizing   = (this.minimizingEffectEnabled)   ? global.window_manager.connect("minimize",   (swm,actor) => this.addWindowEffects(actor, "minimize"))   : null;
    this.onUnminimizing = (this.unMinimizingEffectEnabled) ? global.window_manager.connect("unminimize", (swm,actor) => this.addWindowEffects(actor, "unminimize")) : null;
 
  },
    
  destroy: function () {

    (this.openingEffectEnabled)      ? global.window_manager.disconnect(this.onOpening)      : null;
    (this.closingingEffectEnabled)   ? global.window_manager.disconnect(this.onClosing)      : null;
    (this.minimizingEffectEnabled)   ? global.window_manager.disconnect(this.onMinimizing)   : null;
    (this.unMinimizingEffectEnabled) ? global.window_manager.disconnect(this.onUnminimizing) : null;

    this.restoreDefaultNotificationBannerEffects();
    this.restoreDefaultPadOSDEffects();
    
  },

});



