/*

Version 12.00
=============

Effect Format  [  |  S    Name     C       PPX       PPY       CX        CY        CZ        T         OP        SX        SY        PX        PY        TZ        RX        RY        RZ        TRN  ]

Read the effectParameters.txt File for details.

Credits:

This file is based on https://extensions.gnome.org/extension/367/window-slide-in/ by mengzhuo.
Rotation animations are based on code from https://extensions.gnome.org/extension/97/coverflow-alt-tab/ by p91paul
Notification animation are based on https://github.com/Selenium-H/Animation-Tweaks/issues/2#issuecomment-535698204 by JasonLG1979 

Some code was also adapted from the upstream Gnome Shell source code.   

*/

const Clutter        = imports.gi.Clutter;
const Config         = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const GLib           = imports.gi.GLib;
const Lang           = imports.lang;
const Main           = imports.ui.main;
const Meta           = imports.gi.Meta;
const Point3D        = imports.gi.Graphene.Point3D;
const Shell          = imports.gi.Shell;

const defaultUpdateShowingNotification = Main.messageTray._updateShowingNotification;
const defaultHideNotification          = Main.messageTray._hideNotification;

const defaultBoxPointerOpenAnimationFunction  = Main.panel.statusArea.dateMenu.menu._boxPointer.open;
const defaultBoxPointerCloseAnimationFunction = Main.panel.statusArea.dateMenu.menu._boxPointer.close;

const defaultPadOSDShow = Main.osdWindowManager._showOsdWindow;

const TWEEN_PARAMETERS_LENGTH = 16;

let effectsManager    = null;
let extensionSettings = null;

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
  extensionSettings.connect("changed::reload-profiles-signal", () => effectsManager.loadProfilePrefs());

}

function reloadExtensionOnPrefsChange() {

  // Reloads the Extension when preferences are changed.
  extensionSettings.connect("changed::reload-signal", () => {
    effectsManager.destroy();
    effectsManager.startEffectsManager();
  });

}

const EffectsManager = new Lang.Class({

  Name: "EffectsManager",

  _init: function () {

    extensionSettings = ExtensionUtils.getSettings("org.gnome.shell.extensions.animation-tweaks");
    
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

    switch(action+windowType+eParams[0]) {

      case "focusWindowT" :
      case "defocusWindowT"  :
        this.driveOtherAnimation(actor, eParams, 0, action,"window",null, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);
        return;      
    
      case "movestartWindowT" :
        eParams[2] = eParams[2]/2;
        this.driveOtherAnimation(actor, eParams, 0, action,"window",null, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);
        return;
        
      case "movestopWindowT"  :
        this.driveOtherAnimation(actor, eParams, eParams[2]/2, action,"window",null, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);
        return;
        
      case "openOtherT" :
        actor.set_opacity(0);
        actor.remove_all_transitions();
        this.driveOtherAnimation(actor, eParams, 0, action,"other",null, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);
        return;

      case "openWindowT" :
        this.doFocusAndDefocus = false;
        actor.set_opacity(0);
        actor.remove_all_transitions();
        if(actor.meta_window.is_monitor_sized()) {
          actor.set_position(0,0);
        }
        else {
          actor.x = (actor.meta_window.maximized_horizontally)  ? 0                                                                    : actor.x; 
          actor.y = (actor.meta_window.maximized_vertically)    ? (Main.layoutManager.panelBox.y + Main.layoutManager.panelBox.height) : actor.y;    
        }
        break;
        
      case "closeWindowT" :
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

      case "minimizeWindowT":
        this.doFocusAndDefocus = false;
        Main.wm._minimizing.delete(actor);
        actor.remove_all_transitions();        
        break;

      case "unminimizeWindowT" :
      case "unminimizeWindowT" :
        this.doFocusAndDefocus = false;
        if(Main.overview._shown) {
          this.animationDone(actor,"unminimize","window");
          return;
        }
        Main.wm._unminimizeWindowDone(Main.wm._shellwm ,actor);
        actor.set_opacity(0);
        break;
        
      default:
        return;
    
    }

    let [success, geom] = actor.meta_window.get_icon_geometry();
    [eParams[0],eParams[1]] = [actor.x,actor.y];
    this.driveWindowAnimation( actor, eParams, 0, action,success,geom,Main.layoutManager.monitors[global.display.get_current_monitor()].width,Main.layoutManager.monitors[global.display.get_current_monitor()].height);        

  },
   
  animationDone : function (actor, action, itemType="other",itemObject=null) {
  
    switch(action+itemType) {

      case "opennotificationbanner":
      case "opennotificationbanner":
        actor.hide();
        actor.set_scale(1,1);
        actor.show();
        Main.messageTray._notificationState = 2;//State.SHOWN;
        Main.messageTray._showNotificationCompleted();
        Main.messageTray._updateState();
        return;
        
      case "closenotificationbanner":            
      case "closenotificationbanner":
        actor.translation_x = 0;
        actor.hide();
        actor.set_scale(1,1);
        actor.show();
        Main.messageTray._notificationState = 0; //State.HIDDEN;
        Main.messageTray._hideNotificationCompleted();
        Main.messageTray._updateState();   
        return;

      case "opentoppanelpopupmenu":
      case "opentoppanelpopupmenu":
        actor._muteInput = false; 
        if(itemObject) {
          itemObject();
        }
        
      case "openpadosd":
      case "openpadosd":
        actor.set_opacity(255);
        actor.set_scale(1,1);
        return;

      case "closetoppanelpopupmenu":
      case "closetoppanelpopupmenu":
        actor.hide();
        actor.set_scale(1,1);
        actor.opacity = 0;
        actor.translation_x = 0;
        actor.translation_y = 0;        
      
        if(itemObject) {
          itemObject();
        }
        
        return;

      case "closepadosd":
      case "closepadosd":
        actor.hide(); 
        itemObject._reset();
        Meta.enable_unredirect_for_display(global.display);           
        actor.set_opacity(255);
        actor.set_scale(1,1);
        return;

      case "openwindow" :
        Main.wm._mapWindowDone(Main.wm._shellwm ,actor);
        this.doFocusAndDefocus = true;
        break;

      case "closewindow" :
      case "closewindow" :
        actor.hide();   
        Main.wm._destroyWindowDone(Main.wm._shellwm ,actor);
        this.doFocusAndDefocus = true;
        return;

      case "unminimizewindow" :
      case "unminimizewindow" :
        Main.wm._unminimizeWindowDone(Main.wm._shellwm ,actor);
        this.doFocusAndDefocus = true;
        break;
             
      case "minimizewindow" :
        actor.hide();      
        Main.wm._minimizing.add(actor);
        Main.wm._minimizeWindowDone(Main.wm._shellwm ,actor);
        this.doFocusAndDefocus = true;
        return;
      
      case "openother":
      case "openother":
        break;

      case "focusWindowT" :
      case "focusWindowT" :
      case "defocusWindowT"  :
      case "defocusWindowT"  :
      
      case "movestartwindowT" :
      case "movestartwindowT" :
      case "movestopwindowT"  :
      case "movestopwindowT"  :

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
  
  connectPanelMenusAndOverrideBoxPinterAnimationFunctions: function(openStatus, closeStatus) {

    if(this.connectingToPanelMenusInProcess != null) {
      GLib.source_remove(this.connectingToPanelMenusInProcess);
      this.connectingToPanelMenusInProcess = null;
    }
    
    this.connectingToPanelMenusInProcess = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, ()=> {
    
      let panelMenues = Object.getOwnPropertyNames(Main.panel.statusArea);
      let i = panelMenues.length;

      if(openStatus == "T") {
        while(i>0) {
          (Main.panel.statusArea[panelMenues[--i]].menu._boxPointer) ? Main.panel.statusArea[panelMenues[i]].menu._boxPointer.open = this.driveBoxPointerOpenAnimation : null;
        }    
      } 
      else {
        while(i>0) {
          (Main.panel.statusArea[panelMenues[--i]].menu._boxPointer) ? Main.panel.statusArea[panelMenues[i]].menu._boxPointer.open = defaultBoxPointerOpenAnimationFunction   : null;
        } 
      }
      
      i = panelMenues.length;
      
      if(closeStatus == "T") {
        while(i>0) {
          (Main.panel.statusArea[panelMenues[--i]].menu._boxPointer) ? Main.panel.statusArea[panelMenues[i]].menu._boxPointer.close = this.driveBoxPointerCloseAnimation : null;
        }  
      }
      else {
        while(i>0) {
          (Main.panel.statusArea[panelMenues[--i]].menu._boxPointer) ? Main.panel.statusArea[panelMenues[i]].menu._boxPointer.close = defaultBoxPointerCloseAnimationFunction : null;
        }       
      }
      
      this.connectingToPanelMenusInProcess = null;
      
    });
  },
    
  doNothing: function() {
  
  // Do Nothing
  
  },

  driveBoxPointerCloseAnimation: function(animate, onComplete) {
    
    if (!this.visible)
      return;
     
    this._muteInput = true;
    this.remove_all_transitions();    
    effectsManager.driveOtherAnimation(this, effectsManager.toppanelpopupmenuWindowcloseProfile, 0, "close", "toppanelpopupmenu", onComplete, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);

  },  

  driveBoxPointerOpenAnimation: function(animate, onComplete) {
  
    this.show();
    this.set_opacity(0);
    effectsManager.driveOtherAnimation(this, effectsManager.toppanelpopupmenuWindowopenProfile, 0, "open", "toppanelpopupmenu", onComplete, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);

  },  
  
  driveDesktopMenuCloseAnimation: function(animate, onComplete) {
    
    if (!this.visible)
      return;
    
    this._muteInput = true;
    this.remove_all_transitions();
    effectsManager.driveOtherAnimation(this, effectsManager.desktoppopupmenuWindowcloseProfile, 0, "close", "toppanelpopupmenu", onComplete, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);

  },  

  driveDesktopMenuOpenAnimation: function(animate, onComplete) {
  
    this.show();
    this.set_opacity(0);
    effectsManager.driveOtherAnimation(this, effectsManager.desktoppopupmenuWindowopenProfile, 0, "open", "toppanelpopupmenu", onComplete, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height);

  },  

  driveNotificationBannerAnimation: function(action, subEffectNo=0, eParams, xRes, yRes) {
   
    let startIndex = subEffectNo*TWEEN_PARAMETERS_LENGTH + 3;
    let onCompleteF = (eParams[2] == subEffectNo+1) ? ()=> {effectsManager.animationDone(Main.messageTray._bannerBin, action, "notificationbanner");} :()=> {effectsManager.driveNotificationBannerAnimation(action, subEffectNo+1,eParams,xRes,yRes);}
    
    if(action == "open" && Main.messageTray._bannerBin.x != 0 ) {
      Main.messageTray.bannerAlignment = 1;
    }

    Main.messageTray._bannerBin.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++] );
    Main.messageTray._bannerBin.rotation_center_x = new Point3D({ x: parseFloat(eParams[startIndex++])*Main.messageTray._bannerBin.width,y: parseFloat(eParams[startIndex++])*Main.messageTray._bannerBin.height,z: parseFloat(eParams[startIndex++])*Main.messageTray._bannerBin.height})
    Main.messageTray._bannerBin.rotation_center_y = Main.messageTray._bannerBin.rotation_center_x;
    Main.messageTray._bannerBin.rotation_center_z = Main.messageTray._bannerBin.rotation_center_x;

    Main.messageTray._bannerBin.remove_all_transitions();
    Main.messageTray.bannerAlignment = effectsManager.notificationBannerAlignment;
    Main.messageTray._bannerBin.ease({
      duration:         eParams[startIndex++]*1000,
      opacity:          eParams[startIndex++],
      scale_x:          eParams[startIndex++],
      scale_y:          eParams[startIndex++],    
      translation_x:    eParams[startIndex++]*xRes,
      translation_y:    eParams[startIndex++]*yRes, 
      translation_z:    eParams[startIndex++]*yRes,
      rotation_angle_x: eParams[startIndex++],
      rotation_angle_y: eParams[startIndex++],           
      rotation_angle_z: eParams[startIndex++],
      mode:             Clutter.AnimationMode[eParams[startIndex++]],
      onUpdate: effectsManager.doNothing, 
      onComplete: onCompleteF,
    });

  },
    
  driveOSDAnimation: function(monitorIndex, icon, label, level, maxLevel, action="open", osdWindow=null) {
        
    osdWindow = (osdWindow==null) ? Main.osdWindowManager._osdWindows[monitorIndex]: osdWindow;
    let osdWindowActor = osdWindow; 
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
            osdWindowActor.ease({ 
              opacity: 255,
              duration: 250,
              mode: Clutter.AnimationMode.EASE_OUT_QUAD,
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
          osdWindowActor.ease({ 
            opacity: 0,
            duration: 250,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: ()=> effectsManager.animationDone(osdWindowActor, "close", "padosd", osdWindow),
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
    actor.rotation_center_x = new Point3D({ x: parseFloat(eParams[startIndex++])*actor.width,y: parseFloat(eParams[startIndex++])*actor.height,z: parseFloat(eParams[startIndex++])*actor.height})
    actor.rotation_center_y = actor.rotation_center_x;
    actor.rotation_center_z = actor.rotation_center_x;

    if(this.waylandWorkaroundEnabled && itemType == "other") {
    
      let skippedPosIndex = startIndex+6;
      actor.ease({
        duration:          eParams[startIndex++]*1000,
        opacity:           eParams[startIndex++],
        scale_x:           eParams[startIndex++],
        scale_y:           eParams[startIndex++],         
        translation_z:     eParams[skippedPosIndex++]*yRes,           
        rotation_angle_x:  eParams[skippedPosIndex++],
        rotation_angle_y:  eParams[skippedPosIndex++],           
        rotation_angle_z:  eParams[skippedPosIndex++],
        mode:              Clutter.AnimationMode[eParams[startIndex++]],
        onComplete:        ()=>this.driveOtherAnimation(actor,eParams,++subEffectNo,action,itemType,itemObject,xRes,yRes),
     });  
     
      return;
   }
   
    actor.ease({
      duration:          eParams[startIndex++]*1000,
      opacity:           eParams[startIndex++],
      scale_x:           eParams[startIndex++],
      scale_y:           eParams[startIndex++],
      translation_x:     eParams[startIndex++]*xRes,           
      translation_y:     eParams[startIndex++]*yRes,           
      translation_z:     eParams[startIndex++]*yRes,
      rotation_angle_x:  eParams[startIndex++],
      rotation_angle_y:  eParams[startIndex++],           
      rotation_angle_z:  eParams[startIndex++],
      mode:              Clutter.AnimationMode[eParams[startIndex++]],
      onComplete:        ()=>this.driveOtherAnimation(actor,eParams,++subEffectNo,action,itemType,itemObject,xRes,yRes),
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
    actor.rotation_center_x = new Point3D({ x: parseFloat(eParams[startIndex++])*actor.width,y: parseFloat(eParams[startIndex++])*actor.height,z: parseFloat(eParams[startIndex++])*actor.height})
    actor.rotation_center_y = actor.rotation_center_x;
    actor.rotation_center_z = actor.rotation_center_x;

    actor.ease({
      duration:          eParams[startIndex++]*1000,
      opacity:           eParams[startIndex++],
      scale_x:           eParams[startIndex++],
      scale_y:           eParams[startIndex++],
      x:                 eParams[startIndex++],           
      y:                 eParams[startIndex++],           
      translation_z:     eParams[startIndex++]*yRes,           
      rotation_angle_x:  eParams[startIndex++],
      rotation_angle_y:  eParams[startIndex++],           
      rotation_angle_z:  eParams[startIndex++],
      mode:              Clutter.AnimationMode[eParams[startIndex++]],
      onComplete:        ()=> this.driveWindowAnimation(actor,eParams,++subEffectNo,action,success,geom,xRes,yRes),
    });  
 
  },
  
  extensionDisableShortcut : function() {

    Main.wm.addKeybinding(
      'disable-shortcut',
      extensionSettings,
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
      () => {
        let settings = ExtensionUtils.getSettings("org.gnome.shell");
        let extensionList = settings.get_strv("enabled-extensions");
        extensionList.splice(extensionList.indexOf("animation-tweaks@Selenium-H"), 1);
        settings.set_strv("enabled-extensions", extensionList);       
        Main.notify("Animation Tweaks Extension Disabled ... ", "Extension is disabled by Keyboard Shortcut. To use it again, manually enable it using GNOME Tweak Tool or the Extensions app.");
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

    this.openingEffectEnabled      = extensionSettings.get_boolean("opening-effect");
    this.closingingEffectEnabled   = extensionSettings.get_boolean("closing-effect");
    this.minimizingEffectEnabled   = extensionSettings.get_boolean("minimizing-effect");
    this.unMinimizingEffectEnabled = extensionSettings.get_boolean("unminimizing-effect");
    this.movingEffectEnabled       = extensionSettings.get_boolean("moving-effect");
    this.focussingEffectEnabled    = extensionSettings.get_boolean("focussing-effect");
    this.defocussingEffectEnabled  = extensionSettings.get_boolean("defocussing-effect");
    
    this.doFocusAndDefocus = true;
    this.focusWindow = null;
    
    this.loadProfilePrefs();

  },
  
  loadProfilePrefs: function() {
  
    this.useApplicationProfiles = extensionSettings.get_boolean("use-application-profiles");
    this.nameList = extensionSettings.get_strv("name-list");
      
    let normalWindowopenProfileRaw       = extensionSettings.get_strv("normal-open"); 
    let normalWindowcloseProfileRaw      = extensionSettings.get_strv("normal-close");
    let normalWindowminimizeProfileRaw   = extensionSettings.get_strv("normal-minimize");
    let normalWindowunminimizeProfileRaw = extensionSettings.get_strv("normal-unminimize");    
    let normalWindowmovestartProfileRaw  = extensionSettings.get_strv("normal-movestart");   
    let normalWindowfocusProfileRaw      = extensionSettings.get_strv("normal-focus");    
    let normalWindowdefocusProfileRaw    = extensionSettings.get_strv("normal-defocus");    
     
    let dialogWindowopenProfileRaw       = extensionSettings.get_strv("dialog-open");
    let dialogWindowcloseProfileRaw      = extensionSettings.get_strv("dialog-close");
    let dialogWindowminimizeProfileRaw   = extensionSettings.get_strv("dialog-minimize");
    let dialogWindowunminimizeProfileRaw = extensionSettings.get_strv("dialog-unminimize");  
    let dialogWindowmovestartProfileRaw  = extensionSettings.get_strv("dialog-movestart");
    let dialogWindowfocusProfileRaw      = extensionSettings.get_strv("dialog-focus");    
    let dialogWindowdefocusProfileRaw    = extensionSettings.get_strv("dialog-defocus");    

    let modaldialogWindowopenProfileRaw       = extensionSettings.get_strv("modaldialog-open");
    let modaldialogWindowcloseProfileRaw      = extensionSettings.get_strv("modaldialog-close");
    let modaldialogWindowminimizeProfileRaw   = extensionSettings.get_strv("modaldialog-minimize");
    let modaldialogWindowunminimizeProfileRaw = extensionSettings.get_strv("modaldialog-unminimize");  
    let modaldialogWindowmovestartProfileRaw  = extensionSettings.get_strv("modaldialog-movestart");
    let modaldialogWindowfocusProfileRaw      = extensionSettings.get_strv("modaldialog-focus");    
    let modaldialogWindowdefocusProfileRaw    = extensionSettings.get_strv("modaldialog-defocus");    
    
    this.dropdownmenuWindowopenProfile  = extensionSettings.get_strv("dropdownmenu-open");
    this.popupmenuWindowopenProfile     = extensionSettings.get_strv("popupmenu-open");
    this.comboWindowopenProfile         = extensionSettings.get_strv("combo-open");
    this.splashscreenWindowopenProfile  = extensionSettings.get_strv("splashscreen-open");
    this.tooltipWindowopenProfile       = extensionSettings.get_strv("tooltip-open");
    this.overrideotherWindowopenProfile = extensionSettings.get_strv("overrideother-open");    

    this.notificationbannerWindowopenProfile  = extensionSettings.get_strv("notificationbanner-open");
    this.notificationbannerWindowcloseProfile = extensionSettings.get_strv("notificationbanner-close");
    this.notificationBannerAlignment          = extensionSettings.get_enum("notificationbanner-pos");  
    
    this.padosdWindowopenProfile  = extensionSettings.get_strv("padosd-open");
    this.padosdWindowcloseProfile = extensionSettings.get_strv("padosd-close");
    
    this.toppanelpopupmenuWindowopenProfile  = extensionSettings.get_strv("toppanelpopupmenu-open"); 
    this.toppanelpopupmenuWindowcloseProfile = extensionSettings.get_strv("toppanelpopupmenu-close"); 
    
    this.desktoppopupmenuWindowopenProfile  = extensionSettings.get_strv("desktoppopupmenu-open"); 
    this.desktoppopupmenuWindowcloseProfile = extensionSettings.get_strv("desktoppopupmenu-close");     
    
    this.waylandWorkaroundEnabled = extensionSettings.get_boolean("wayland");
    this.padOSDHideTime           = extensionSettings.get_int("padosd-hide-timeout");
    
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
        
    this.notificationbannerWindowopenProfile.splice(0,1);
    this.notificationbannerWindowcloseProfile.splice(0,1);
    
    this.toppanelpopupmenuWindowopenProfile.splice(0,1);
    this.toppanelpopupmenuWindowcloseProfile.splice(0,1);

    this.desktoppopupmenuWindowopenProfile.splice(0,1);
    this.desktoppopupmenuWindowcloseProfile.splice(0,1);

    this.updateAddPadOSDEffects(             this.padosdWindowopenProfile[0],             this.padosdWindowcloseProfile[0]             ); 
    this.updateAddNotificationBannerEffects( this.notificationbannerWindowopenProfile[0], this.notificationbannerWindowcloseProfile[0] );
    this.updateAddTopPanelPopUpMenuEffects(  this.toppanelpopupmenuWindowopenProfile[0], this.toppanelpopupmenuWindowcloseProfile[0]  );
    this.updateAddDesktopPopUpMenuEffects(   this.desktoppopupmenuWindowopenProfile[0],   this.desktoppopupmenuWindowcloseProfile[0]   );
        
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
      effectsManager.driveNotificationBannerAnimation("close" , 0, effectsManager.notificationbannerWindowcloseProfile, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height );
    } 
    else {
      Main.messageTray._bannerBin.remove_all_transitions();
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
    if (Main.messageTray._notification.urgency == 3 || //Urgency.CRITICAL
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

      Main.messageTray._notificationState = 1; //State.SHOWING;
      Main.messageTray._bannerBin.remove_all_transitions();
      
      Main.messageTray._bannerBin.ease({
        opacity: 0,
        y: 0,
        duration: 1,
        onComplete : ()=> effectsManager.driveNotificationBannerAnimation("open" , 0, effectsManager.notificationbannerWindowopenProfile, Main.layoutManager.monitors[global.display.get_current_monitor()].width, Main.layoutManager.monitors[global.display.get_current_monitor()].height ),
      });

  },
  
  restoreTopPanelEffects: function() {
   
    let panelMenues = Object.getOwnPropertyNames(Main.panel.statusArea);
    let i = panelMenues.length;
   
    
    if(this.desktoppopupmenuWindowopenProfile[0] == "T" || this.desktoppopupmenuWindowcloseProfile[0] == "T") {
      Main.panel._leftBox.disconnect(this.panelBoxSignalHandlers[0]);
      Main.panel._centerBox.disconnect(this.panelBoxSignalHandlers[1]);
      Main.panel._rightBox.disconnect(this.panelBoxSignalHandlers[2]);
    }
          
    while(i>0) {
      (Main.panel.statusArea[panelMenues[--i]].menu._boxPointer) ? Main.panel.statusArea[panelMenues[i]].menu._boxPointer.open = defaultBoxPointerOpenAnimationFunction   : null;
      (Main.panel.statusArea[panelMenues[i]].menu._boxPointer)   ? Main.panel.statusArea[panelMenues[i]].menu._boxPointer.close = defaultBoxPointerCloseAnimationFunction : null;
    }  
   
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
   
    if(extensionSettings.get_int("current-version") <= 10) {    
      Main.notify("Animation Tweaks","Extension is updated. A reset is needed. Please reset the extension");
      return;
    }

    this.panelBoxSignalHandlers = [];
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

  updateAddDesktopPopUpMenuEffects: function(openStatus = "F", closeStatus = "F") {

    Main.layoutManager._bgManagers[0].backgroundActor._backgroundMenu._boxPointer.open  = ( openStatus  == "T") ? this.driveDesktopMenuOpenAnimation  : defaultBoxPointerOpenAnimationFunction;   
    Main.layoutManager._bgManagers[0].backgroundActor._backgroundMenu._boxPointer.close = ( closeStatus == "T") ? this.driveDesktopMenuCloseAnimation : defaultBoxPointerCloseAnimationFunction;

  },  
  
  updateAddNotificationBannerEffects: function(openStatus = "F", closeStatus = "F") {
  
    if(this.notificationBannerAlignment != 0) {
      Main.messageTray.bannerAlignment = this.notificationBannerAlignment;
    }
    else {
      this.notificationBannerAlignment = Main.messageTray.bannerAlignment;
      extensionSettings.set_enum("notificationbanner-pos",Main.messageTray.bannerAlignment);
    }

    Main.messageTray._updateShowingNotification = (openStatus  =="T") ? this.overriddenUpdateShowingNotification : defaultUpdateShowingNotification;  
    Main.messageTray._hideNotification          = (closeStatus =="T") ? this.overriddenHideNotification          : defaultHideNotification;

  },
  
  updateAddPadOSDEffects: function(openStatus = "F", closeStatus = "F") {
  
    ( openStatus =="T" || closeStatus =="T" ) ? Main.osdWindowManager._showOsdWindow = this.driveOSDAnimation : defaultPadOSDShow;

  },  
  
  updateAddTopPanelPopUpMenuEffects: function(openStatus = "F", closeStatus = "F") {
        
    this.connectPanelMenusAndOverrideBoxPinterAnimationFunctions(openStatus, closeStatus);
    
    if(openStatus == "T" || closeStatus == "T") {
      this.panelBoxSignalHandlers[0] = Main.panel._leftBox.connect("actor-added",   ()=> this.connectPanelMenusAndOverrideBoxPinterAnimationFunctions(openStatus, closeStatus));
      this.panelBoxSignalHandlers[1] = Main.panel._centerBox.connect("actor-added", ()=> this.connectPanelMenusAndOverrideBoxPinterAnimationFunctions(openStatus, closeStatus));
      this.panelBoxSignalHandlers[2] = Main.panel._rightBox.connect("actor-added",  ()=> this.connectPanelMenusAndOverrideBoxPinterAnimationFunctions(openStatus, closeStatus));
    }
    
    else if(this.panelBoxSignalHandlers.length>0) {
      Main.panel._leftBox.disconnect(this.panelBoxSignalHandlers[0]);
      Main.panel._centerBox.disconnect(this.panelBoxSignalHandlers[1]);
      Main.panel._rightBox.disconnect(this.panelBoxSignalHandlers[2]);
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

    this.updateAddPadOSDEffects(); 
    this.updateAddNotificationBannerEffects();
    this.updateAddDesktopPopUpMenuEffects();
    this.updateAddTopPanelPopUpMenuEffects();
    
    Main.wm.removeKeybinding('disable-shortcut');
    
  },

});

