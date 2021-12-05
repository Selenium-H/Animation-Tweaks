/*

Version 17.01
=============

Credits:

This file is based on https://extensions.gnome.org/extension/367/window-slide-in/ by mengzhuo.
Rotation animations are based on code from https://extensions.gnome.org/extension/97/coverflow-alt-tab/ by p91paul
Notification animations are based on https://github.com/Selenium-H/Animation-Tweaks/issues/2#issuecomment-535698204 by JasonLG1979 

Some code was also adapted from the upstream Gnome Shell source code.   

Effect Format  [  |  S    Name     C       PPX       PPY       CX        CY        DL        T         OP        SX        SY        PX        PY        TZ        RX        RY        RZ        TRN  ]

Read the effectParameters.txt File for details.

Effect Lists Types - "window", "other",  "notificationbanner", "padosd"
Actions Strings    - "open",   "close",  "minimize",           "unminimize",   "focus",     "defocus", "movestart", "movestop", "newwindow" 
Item Types         - "normal", "dialog", "modaldialog",        "dropdownmenu", "popupmenu", "combo",   "tooltip",   "splashscreen", "overrideother", "notificationbanner", "padosd", "toppanelpopupmenu", "desktoppopupmenu", "dashappiconpopupmenu", "windowmenu", "endsessiondialog", "dashappicon"

SINGLE_TWEEN_PARAMETERS_LENGTH = 16;

*/

const Clutter            = imports.gi.Clutter;
const ExtensionUtils     = imports.misc.extensionUtils;
const DefaultEffectsList = ExtensionUtils.getCurrentExtension().imports.defaultEffectsList;
const GLib               = imports.gi.GLib;
const Main               = imports.ui.main;
const Meta               = imports.gi.Meta;
const Shell              = imports.gi.Shell;
const WindowMenu         = imports.ui.windowMenu;

const GNOME_VERSION      = imports.misc.config.PACKAGE_VERSION;

const defaultUpdateShowingNotification = Main.messageTray._updateShowingNotification;
const defaultHideNotification          = Main.messageTray._hideNotification;
const defaultShowWindowMenu            = Main.wm._windowMenuManager.showWindowMenuForWindow;

const defaultBoxPointerOpenAnimationFunction  = Main.panel.statusArea.dateMenu.menu._boxPointer.open;
const defaultBoxPointerCloseAnimationFunction = Main.panel.statusArea.dateMenu.menu._boxPointer.close;

const defaultPadOSDShow = Main.osdWindowManager._showOsdWindow;

let defaultShellModalDialogOpenAnimationFunction  = null;
let defaultShellModalDialogCloseAnimationFunction = null;

let effectsManager          = null;
let extensionSettings       = null;
let extensionDelayTimeoutId = null;
let extensionState          = null;

function enable() {

  effectsManager = new EffectsManager_AnimationTweaksExtension();
  extensionDelayTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, extensionSettings.get_int("extension-start-delay"), ()=> effectsManager.startEffectsManager()); 
  extensionSettings.connect("changed::reload-profiles-signal", () => effectsManager.loadProfilePrefs()); // Reloads Application Profiles when preferences are changed.
    extensionSettings.connect("changed::reload-signal", () => { // Reloads the Extension when preferences are changed.
    effectsManager.undoChanges();
    effectsManager.startEffectsManager();
  });

}

function disable() {

  extensionSettings.run_dispose();
  if(extensionDelayTimeoutId) {
    GLib.source_remove(extensionDelayTimeoutId);    
    extensionDelayTimeoutId = null;
  }
  
  if(extensionState == "n") { // Extension is not started.
    return;
  }
  else if(extensionState == "s" || extensionState == "k") { // Extension is started. 
    effectsManager.undoChanges();
    return;
  }
  
}

const EffectsManager_AnimationTweaksExtension = class EffectsManager_AnimationTweaksExtension {

  constructor () {

    extensionSettings = ExtensionUtils.getSettings("org.gnome.shell.extensions.animation-tweaks");  
      
  }
        
  addWindowClosingEffects ( window, currentMonitorIndex=0, useApplicationProfilesForThisAction = false ) {

    let eParams = [];
    let parameters = {
      actor        : window,
      action       : "close",
      appName      : "",
      profileIndex : 0, 
      sucess       : false, 
      geom         : null,
      effectName   : "",
      itemType     : "", 
      listType     : "window",
      subeffectNo  : 0, 
      xRes         : Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes         : Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject   : null      
    };
    
    [ this.doFocusAndDefocus, window ] = [ false, window.meta_window ];
    
    switch(window.window_type) {
       
      case Meta.WindowType.NORMAL:
        parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
        eParams                 = this.normalWindowcloseProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          Main.wm._destroying.delete( parameters.actor );
          parameters.actor.remove_all_transitions();  
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "normal", 0, parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters ); 
        }
        return;

      case Meta.WindowType.DIALOG:     
        parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
        eParams                 = this.dialogWindowcloseProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          Main.wm._destroying.delete( parameters.actor );
          parameters.actor.remove_all_transitions();  
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "dialog", 0, parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );      
        }
        return;

      case Meta.WindowType.MODAL_DIALOG:
        parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
        eParams                 = this.modaldialogWindowcloseProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {        
          Main.wm._destroying.delete( parameters.actor );
          parameters.actor.remove_all_transitions();            
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, parameters.listType, eParams[0], eParams[1] ] = [ eParams[1], "modaldialog", 0, "other", parameters.actor.x, parameters.actor.y ];          
          parameters.actor._parentDestroyId = (window.get_transient_for() != null) ? window.get_transient_for().connect('unmanaged', () => {
            parameters.actor.remove_all_transitions();
            this.animationDone( parameters );
          }) : 0;
          this.driveOtherAnimation( eParams, parameters );      
        }
        
      default:        
        return;     
        
    }  
  
  }

  addWindowFocussingEffects( currentMonitorIndex = 0, useApplicationProfilesForThisAction = false ) { 

    let eParams = [];     
    let parameters = {
      actor        : null,
      action       : "defocus",
      appName      : "",
      profileIndex : 0, 
      sucess       : false, 
      geom         : null,
      effectName   : "",
      itemType     : "", 
      listType     : "window",
      subeffectNo  : 0, 
      xRes         : Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes         : Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject   : null      
    };
   
    if(this.focusWindow != null && (parameters.actor = this.focusWindow.get_compositor_private()) != null && global.display.focus_window != null && this.doFocusAndDefocus == true && this.defocussingEffectEnabled == true && !Main.overview._shown ) {
     
      let window              = parameters.actor.meta_window;
      parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();
      parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);

      switch(window.window_type) {
    
        case Meta.WindowType.NORMAL:
          eParams = this.normalWindowdefocusProfile[parameters.profileIndex].slice(0);                    
          if(eParams[0] == "T" ) {
            [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
            [ parameters.effectName, parameters.itemType ] = [ eParams[1], "normal" ];
            this.driveOtherAnimation( eParams, parameters );
          }    
          break;

        case Meta.WindowType.DIALOG:
          eParams = this.dialogWindowdefocusProfile[parameters.profileIndex].slice(0);                              
          if(eParams[0] == "T" ) {
            [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
            [ parameters.effectName, parameters.itemType, ] = [ eParams[1], "dialog", ];
            this.driveOtherAnimation( eParams, parameters );
          }    
          break;

        case Meta.WindowType.MODAL_DIALOG:
          eParams = this.modaldialogWindowdefocusProfile[parameters.profileIndex].slice(0);                              
          if(eParams[0] == "T" ) {
            [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
            [ parameters.effectName, parameters.itemType ] = [ eParams[1], "modaldialog" ];
            this.driveOtherAnimation( eParams, parameters );
          }
          
        default:                 
          break;

      }
              
    }
    
    let eParamsFocus = [];
    let parametersFocus = {
      actor        : null,
      action       : "focus",
      appName      : "",
      profileIndex : 0, 
      sucess       : false, 
      geom         : null,
      effectName   : "",
      itemType     : "", 
      listType     : "window",
      subeffectNo  : 0, 
      xRes         : Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes         : Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject   : null      
    };
    
    if((this.focusWindow = global.display.focus_window) != null && parameters.actor != null && this.doFocusAndDefocus == true && this.focussingEffectEnabled   == true && !Main.overview._shown ) {
      
      parametersFocus.actor        = this.focusWindow.get_compositor_private();
      let window                   = parametersFocus.actor.meta_window;
      parametersFocus.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();
      parametersFocus.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parametersFocus.appName)+1);
      parametersFocus.action       = "focus";
     
      switch(window.window_type) {
    
        case Meta.WindowType.NORMAL:
          eParamsFocus = this.normalWindowfocusProfile[parametersFocus.profileIndex].slice(0);                             
          if(eParamsFocus[0] == "T") {
            [ parametersFocus.sucess, parametersFocus.geom ] = window.get_icon_geometry();  
            [ parametersFocus.effectName, parametersFocus.itemType ] = [ eParamsFocus[1], "normal" ];
            this.driveOtherAnimation( eParamsFocus, parametersFocus );
          }      
          break;

        case Meta.WindowType.DIALOG:
          eParamsFocus = this.dialogWindowfocusProfile[parametersFocus.profileIndex].slice(0);
          if(eParamsFocus[0] == "T") {
            [ parametersFocus.sucess, parametersFocus.geom ] = window.get_icon_geometry();  
            [ parametersFocus.effectName, parametersFocus.itemType ] = [ eParamsFocus[1], "dialog" ];
            this.driveOtherAnimation( eParamsFocus, parametersFocus );
          }   
          break;

        case Meta.WindowType.MODAL_DIALOG:
          eParamsFocus = this.modaldialogWindowfocusProfile[parametersFocus.profileIndex].slice(0);
          if(eParamsFocus[0] == "T") {
            [ parametersFocus.sucess, parametersFocus.geom ] = window.get_icon_geometry(); 
            [ parametersFocus.effectName, parametersFocus.itemType ] = [ eParamsFocus[1], "modaldialog" ];
            this.driveOtherAnimation( eParamsFocus, parametersFocus );
          }

        default:      
          break;

      }
      
    }

  }

  addWindowMinimizingEffects ( window, currentMonitorIndex = 0, useApplicationProfilesForThisAction = false ) {

    let eParams = [];  
    let parameters = {
      actor        : window,
      action       : "minimize",
      appName      : "",
      profileIndex : 0, 
      sucess       : false, 
      geom         : null,
      effectName   : "",
      itemType     : "", 
      listType     : "window",
      subeffectNo  : 0, 
      xRes         : Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes         : Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject   : null      
    };

    window = window.meta_window;
    
    switch(window.window_type) {
    
      case Meta.WindowType.NORMAL:
        parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1); 
        eParams                 = this.normalWindowminimizeProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          this.doFocusAndDefocus = false;
          Main.wm._minimizing.delete( parameters.actor );
          this.pendingMinimize.add(parameters.actor);
          parameters.actor.remove_all_transitions();   
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "normal", 0, parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );
        }
        return;

      case Meta.WindowType.DIALOG:
        parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
        eParams                 = this.dialogWindowminimizeProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          this.doFocusAndDefocus = false;
          Main.wm._minimizing.delete( parameters.actor );
          this.pendingMinimize.add(parameters.actor);
          parameters.actor.remove_all_transitions();   
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "dialog", 0, parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );
        }
        return;                 

      case Meta.WindowType.MODAL_DIALOG:      
        parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();  
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
        eParams                 = this.modaldialogWindowminimizeProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          this.doFocusAndDefocus = false;
          Main.wm._minimizing.delete( parameters.actor );
          this.pendingMinimize.add(parameters.actor);
          parameters.actor.remove_all_transitions();   
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "modaldialog", 0, parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );
        }

        default:
        return;

    }
    
  }

  async addWindowOpeningEffects ( window, currentMonitorIndex = 0, useApplicationProfilesForThisAction = false ) {

    let eParams = [];      
    let parameters = {
      actor        : window,
      action       : "open",
      appName      : "",
      profileIndex : 0, 
      sucess       : false, 
      geom         : null,
      effectName   : "",
      itemType     : "", 
      listType     : "other",
      subeffectNo  : 0, 
      xRes         : Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes         : Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject   : null      
    };

    [ this.doFocusAndDefocus, window ] = [ false, window.meta_window ];
    
    switch(window.window_type) {
          
      case Meta.WindowType.NORMAL:
        parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1); 
        eParams = this.normalWindowopenProfile[parameters.profileIndex].slice(0); 
        if(eParams[0] == "T" ) {
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions(); 
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry();    
          [ parameters.effectName, parameters.itemType, parameters.listType ] = [ eParams[1], "normal", "window" ];
          if(!window.decorated) { 
            if(window.is_monitor_sized()) {
              [eParams[0], eParams[12], eParams[1], eParams[13]] = [0, "C"+eParams[12], 0, "C"+eParams[13]];
            }
            else {
              let rect = window.get_frame_rect();
              [ eParams[0], eParams[12] ] = (window.maximized_horizontally) ? [ rect.x, "C"+eParams[12]]: [ parameters.actor.x, eParams[12]]; 
              [ eParams[1], eParams[13] ] = (window.maximized_vertically)   ? [ rect.y, "C"+eParams[13]]: [ parameters.actor.y, eParams[13]];
            }
          }
          else {
            [ eParams[0], eParams[1] ] = [ parameters.actor.x, parameters.actor.y ];
          }
          await Main.wm._mapWindow;
          this.driveWindowAnimation( eParams, parameters );  
        }
        return;
        
      case Meta.WindowType.DIALOG:
        parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1); 
        eParams                 = this.dialogWindowopenProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {        
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.listType ] = [ eParams[1], "dialog", "window" ];
          await Main.wm._mapWindow;
          this.driveWindowAnimation( eParams, parameters );  
        }
        return;

      case Meta.WindowType.MODAL_DIALOG:
        parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();  
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1); 
        eParams                 = this.modaldialogWindowopenProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {        
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [ parameters.effectName, parameters.itemType ] = [ eParams[1], "modaldialog"];
          await Main.wm._mapWindow;
          this.driveOtherAnimation( eParams, parameters );  
        }
        return;

      case Meta.WindowType.DROPDOWN_MENU :
        eParams = this.dropdownmenuWindowopenProfile[0];  
        if(eParams[0] == "T" ) {
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [  parameters.effectName, parameters.itemType ] = [ eParams[1], "dropdownmenu" ];        
          this.driveOtherAnimation( eParams, parameters ); 
        }
        return;

      case Meta.WindowType.POPUP_MENU :
        eParams = this.popupmenuWindowopenProfile[0];
        if(eParams[0] == "T" ) {
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [  parameters.effectName, parameters.itemType ] = [ eParams[1], "popupmenu" ];        
          this.driveOtherAnimation( eParams, parameters ); 
        }
        return;
        
      case Meta.WindowType.COMBO :
        eParams = this.comboWindowopenProfile[0];
        if(eParams[0] == "T" ) {
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [  parameters.effectName, parameters.itemType ] = [ eParams[1], "combo" ];        
          this.driveOtherAnimation( eParams, parameters );
        }
        return;

      case Meta.WindowType.TOOLTIP :
        eParams = this.tooltipWindowopenProfile[0];
        if(eParams[0] == "T" ) {
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [  parameters.effectName, parameters.itemType ] = [ eParams[1], "tooltip" ];        
          this.driveOtherAnimation( eParams, parameters );
        }
        return;

      case Meta.WindowType.SPLASHSCREEN :
        eParams = this.splashscreenWindowopenProfile[0];
        if(eParams[0] == "T" ) {
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [  parameters.effectName, parameters.itemType ] = [ eParams[1], "splashscreen" ];        
          this.driveOtherAnimation( eParams, parameters ); 
        }
        return;

      case Meta.WindowType.OVERRIDE_OTHER :
        eParams = this.overrideotherWindowopenProfile[0];
        if(eParams[0] == "T" ) {
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [  parameters.effectName, parameters.itemType ] = [ eParams[1], "overrideother" ];        
          this.driveOtherAnimation( eParams, parameters ); 
        }

      default:
        return;

    }
  
  }
  
  addWindowStartMovingEffects ( op, currentMonitorIndex=0, useApplicationProfilesForThisAction = false ) { 

    let window = global.display.focus_window;
    let eParams = [];  
    let parameters = {
      actor        : window,
      action       : "movestart",
      appName      : "",
      profileIndex : 0, 
      sucess       : false, 
      geom         : null,
      effectName   : "",
      itemType     : "", 
      listType     : "window",
      subeffectNo  : 0, 
      xRes         : Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes         : Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject   : null      
    };

    if(window != null && op == 1 && !Main.overview._shown ) {
    
      parameters.actor        = window.get_compositor_private();
      window                  = parameters.actor.meta_window;
      parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name(); 
      parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
      
      switch(window.window_type) {
    
        case Meta.WindowType.NORMAL:
          eParams = this.normalWindowmovestartProfile[parameters.profileIndex].slice(0);
          if(eParams[0] == "T" ) {
            parameters.actor.remove_all_transitions();
            eParams[2] = eParams[2]/2;
            [ parameters.effectName, parameters.itemType] = [ eParams[1], "normal" ];        
            this.driveOtherAnimation( eParams, parameters ); 
          }
          break;

        case Meta.WindowType.DIALOG:
          eParams = this.dialogWindowmovestartProfile[parameters.profileIndex].slice(0);          
          if(eParams[0] == "T" ) {
            parameters.actor.remove_all_transitions();
            eParams[2] = eParams[2]/2;
            [ parameters.effectName, parameters.itemType] = [ eParams[1], "dialog" ];        
            this.driveOtherAnimation( eParams, parameters ); 
          }
          break;

        case Meta.WindowType.MODAL_DIALOG:
          eParams = this.modaldialogWindowmovestartProfile[parameters.profileIndex].slice(0);          
          if(eParams[0] == "T" ) {
            parameters.actor.remove_all_transitions();
            eParams[2] = eParams[2]/2;
            [ parameters.effectName, parameters.itemType] = [ eParams[1], "modaldialog" ];        
            this.driveOtherAnimation( eParams, parameters ); 
          }
          
        default:
          break;

      }

    }   
    
  }
  
  addWindowStopMovingEffects ( op, currentMonitorIndex = 0, useApplicationProfilesForThisAction = false ) { 

    let window = global.display.focus_window;
    let eParams = [];
    let parameters = {
      actor        : null,
      action       : "movestop",
      appName      : "",
      profileIndex : 0, 
      sucess       : false, 
      geom         : null,
      effectName   : "",
      itemType     : "", 
      listType     : "window",
      subeffectNo  : 0, 
      xRes         : Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes         : Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject   : null      
    };

    if(window != null && op == 1 && !Main.overview._shown ) {
    
      parameters.actor        = window.get_compositor_private();
      window                  = parameters.actor.meta_window;
      parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();
      parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
           
      switch(window.window_type) {
    
        case Meta.WindowType.NORMAL:
          eParams = this.normalWindowmovestopProfile[parameters.profileIndex].slice(0);
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo ] = [ eParams[1], "normal", eParams[2]/2 ];        
          break;

        case Meta.WindowType.DIALOG:
          eParams = this.dialogWindowmovestopProfile[parameters.profileIndex].slice(0);          
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo ] = [ eParams[1], "dialog", eParams[2]/2 ];        
          break;

        case Meta.WindowType.MODAL_DIALOG:
          eParams = this.modaldialogWindowmovestopProfile[parameters.profileIndex].slice(0);          
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo ] = [ eParams[1], "modaldialog", eParams[2]/2 ];        
          break;
          
        default:
          return;

      }

      if(eParams[0] == "T" ) {
        if((window.maximized_horizontally || window.maximized_vertically)) {
          this.windowStopMovingEffectsTimeoutID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, ()=> {
            this.driveOtherAnimation( eParams, parameters );
            return GLib.SOURCE_REMOVE;
          }); 
        }
        else {
          parameters.actor.remove_all_transitions();
          this.driveOtherAnimation( eParams, parameters ); 
        }
      }
      
    }   
 
  }

  addWindowUnminimizingEffects ( window, currentMonitorIndex = 0, useApplicationProfilesForThisAction = false ) { 
 
    let eParams    = [];
    let parameters = { 
      actor        : window, 
      action       : "unminimize", 
      appName      : "", 
      profileIndex : 0, 
      sucess       : false, 
      geom         : null, 
      effectName   : "", 
      itemType     : "", 
      listType     : "window", 
      subeffectNo  : 0, 
      xRes         : Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes         : Main.layoutManager.monitors[currentMonitorIndex].height, 
      itemObject   : null 
    };

    window = window.meta_window;
    
    switch(window.window_type) {
    
      case Meta.WindowType.NORMAL:
        eParams = this.normalWindowunminimizeProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T"  && !Main.overview._shown) {
          this.doFocusAndDefocus = false;
          if(this.pendingMinimize.delete(parameters.actor)) {
            Main.wm._shellwm.completed_minimize(parameters.actor);
          }
          Main.wm._unminimizeWindowDone(Main.wm._shellwm, parameters.actor);
          parameters.actor.set_opacity(0); 
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, eParams[0], eParams[1] ] = [ eParams[1], "normal", parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );
        }
        return;              

      case Meta.WindowType.DIALOG:
        eParams = this.dialogWindowunminimizeProfile[parameters.profileIndex].slice(0);
        this.doFocusAndDefocus = false;
        if(eParams[0] == "T"  && !Main.overview._shown) {
          if(this.pendingMinimize.delete(parameters.actor)) {
            Main.wm._shellwm.completed_minimize(parameters.actor);
          }        
          Main.wm._unminimizeWindowDone(Main.wm._shellwm, parameters.actor);
          parameters.actor.set_opacity(0); 
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, eParams[0], eParams[1] ] = [ eParams[1], "dialog", parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );
        }
        return;              

      case Meta.WindowType.MODAL_DIALOG:
        eParams = this.modaldialogWindowunminimizeProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T"  && !Main.overview._shown) {
          this.doFocusAndDefocus = false;
          if(this.pendingMinimize.delete(parameters.actor)) {
            Main.wm._shellwm.completed_minimize(parameters.actor);
          }        
          Main.wm._unminimizeWindowDone(Main.wm._shellwm, parameters.actor);
          parameters.actor.set_opacity(0); 
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, eParams[0], eParams[1] ] = [ eParams[1], "modaldialog", parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );
        }       

      default:
        return;             
         
    }
  }
        
  animationDone ( parameters ) {
  
    switch(parameters.action+parameters.itemType) {
    
      case "newwindowdashappicon":
        parameters.itemObject.actorClone.destroy();
        parameters.itemObject.actorClone = null;
        parameters.itemObject.icon._iconBin.opacity = 255;
        break;

      case "opennotificationbanner":
        this.refreshItemActor(parameters.actor, "hide", "show");
        Main.messageTray._notificationState = 2; //State.SHOWN;
        Main.messageTray._showNotificationCompleted();
        Main.messageTray._updateState();
        break;
        
      case "closenotificationbanner":
        this.refreshItemActor(parameters.actor, "hide", "show");
        Main.messageTray._notificationState = 0; //State.HIDDEN;
        Main.messageTray._hideNotificationCompleted();
        Main.messageTray._updateState(); 
        break;

      case "opendesktoppopupmenu":
      case "opentoppanelpopupmenu":
      case "openwindowmenu":   
      case "opendashappiconpopupmenu":
        [this.shellPopUpMenuPositionX, this.shellPopUpMenuPositionY] = parameters.actor.get_position();
        parameters.actor._muteInput = false; 
        if(parameters.itemObject) {
          parameters.itemObject();
        }
        this.refreshItemActor(parameters.actor, "hide", "show");
        break;
        
      case "closedesktoppopupmenu":
      case "closetoppanelpopupmenu":
      case "closewindowmenu":
      case "closedashappiconpopupmenu":
      case "closeendsessiondialog": // refreshItemActor doesn't work properly.
        this.refreshItemActor(parameters.actor, "hide", "hide");         
        if(parameters.itemObject) {
          parameters.itemObject();
        }
        break;

      case "openpadosd":
        this.refreshItemActor(parameters.actor, "get_opacity", "get_opacity");
        break;

      case "closepadosd":
        this.refreshItemActor(parameters.actor, "hide", "hide");
        parameters.itemObject._reset();
        Meta.enable_unredirect_for_display(global.display);           
        break;

      case "opennormal":
      case "opendialog":
      case "openmodaldialog":
        this.refreshItemActor(parameters.actor, "hide", "show");
        Main.wm._mapWindowDone(Main.wm._shellwm ,parameters.actor);
        this.doFocusAndDefocus = true; 
        break;

      case "closenormal":
      case "closedialog":      
      case "closemodaldialog" : 
        this.refreshItemActor(parameters.actor, "hide", "hide");   
        Main.wm._destroyWindowDone(Main.wm._shellwm ,parameters.actor);
        this.doFocusAndDefocus = true;
        break;

      case "unminimizenormal":
      case "unminimizedialog":
      case "unminimizemodaldialog" :
        this.refreshItemActor(parameters.actor, "hide", "show");
        Main.wm._unminimizeWindowDone(Main.wm._shellwm ,parameters.actor);
        this.doFocusAndDefocus = true;
        break;
             
      case "minimizemodaldialog" :        
      case "minimizenormal":
      case "minimizedialog":
        this.refreshItemActor(parameters.actor, "hide", "hide");
        this.pendingMinimize.delete(parameters.actor);
        Main.wm._minimizing.add(parameters.actor);
        Main.wm._minimizeWindowDone(Main.wm._shellwm, parameters.actor);
        this.doFocusAndDefocus = true;
        break;
 
      case "opendropdownmenu":     
      case "opentooltip": 
      case "opensplashscreen":
      case "openoverrideother":
      case "opencombo":                   
      case "openpopupmenu":
      case "openendsessiondialog":
      case "openother":
      case "focusnormal":
      case "focusdialog":
      case "focusmodaldialog":
      case "defocusnormal":
      case "defocusdialog":
      case "defocusmodaldialog":
      case "movestopnormal":
      case "movestopdialog":
      case "movestopmodaldialog":
        this.refreshItemActor(parameters.actor, "hide", "show");
        
      case "movestartnormal":
      case "movestartdialog":
      case "movestartmodaldialog":
        break;

      default: 
        return;
    }

    if(parameters.effectName == "Random") {
      [ this[ parameters.itemType+"Window"+parameters.action+"Profile"][parameters.profileIndex], this[ parameters.itemType+"Window"+parameters.action+"Profile"][parameters.profileIndex][0], this[ parameters.itemType+"Window"+parameters.action+"Profile"][parameters.profileIndex][1] ] = [this.extractEffectAtIndex(DefaultEffectsList[parameters.listType+parameters.action+"EffectsList"], Math.floor(Math.random()*DefaultEffectsList[parameters.listType+parameters.action+"EffectsListLastIndex"]) ), "T", "Random" ];
    }
    
  }  
    
  defaultDashIconAnimateLaunch() { 
    this.icon.animateZoomOut();
  }

  driveBoxPointerCloseAnimation(animate, onComplete, currentMonitorIndex = global.display.get_current_monitor()) { 
    
    if (!this.visible)
      return;
     
    this._muteInput = true;
    this.remove_all_transitions();    
    let eParams = effectsManager.toppanelpopupmenuWindowcloseProfile[0];
    effectsManager.driveOtherAnimation( eParams, {
      actor:        this,
      action:       "close",
      appName:      "",
      profileIndex: 0, 
      sucess:       false, 
      geom:         null,
      effectName:   eParams[1],
      itemType:     "toppanelpopupmenu", 
      listType:     "other",
      subeffectNo:  0, 
      xRes:         Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes:         Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject:   onComplete      
    });

  }

  driveBoxPointerOpenAnimation ( animate, onComplete, currentMonitorIndex = global.display.get_current_monitor() ) { 
    
    this.show();
    this.set_opacity(0);
    let eParams = effectsManager.toppanelpopupmenuWindowopenProfile[0];
    effectsManager.driveOtherAnimation( eParams, {
      actor:        this,
      action:       "open",
      appName:      "",
      profileIndex: 0, 
      sucess:       false, 
      geom:         null,
      effectName:   eParams[1],
      itemType:     "toppanelpopupmenu", 
      listType:     "other",
      subeffectNo:  0, 
      xRes:         Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes:         Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject:   onComplete      
    });

  }

  driveDashAppIconPopUpMenuBoxPointerCloseAnimation (animate, onComplete, currentMonitorIndex = global.display.get_current_monitor()) { 
    
    if (!this.visible)
      return;
     
    this._muteInput = true;
    this.remove_all_transitions();    
    let eParams = effectsManager.dashappiconpopupmenuWindowcloseProfile[0];
    effectsManager.driveOtherAnimation( eParams, {
      actor:        this,
      action:       "close",
      appName:      "",
      profileIndex: 0, 
      sucess:       false, 
      geom:         null,
      effectName:   eParams[1],
      itemType:     "dashappiconpopupmenu", 
      listType:     "other",
      subeffectNo:  0, 
      xRes:         Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes:         Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject:   onComplete      
    });

  }

  driveDashAppIconPopUpMenuBoxPointerOpenAnimation ( animate, onComplete, currentMonitorIndex = global.display.get_current_monitor() ) { 
    
    this.show();
    this.set_opacity(0);
    let eParams = effectsManager.dashappiconpopupmenuWindowopenProfile[0];
    effectsManager.driveOtherAnimation( eParams, {
      actor:        this,
      action:       "open",
      appName:      "",
      profileIndex: 0, 
      sucess:       false, 
      geom:         null,
      effectName:   eParams[1],
      itemType:     "dashappiconpopupmenu", 
      listType:     "other",
      subeffectNo:  0, 
      xRes:         Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes:         Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject:   onComplete      
    });

  }


  driveDesktopMenuCloseAnimation ( animate, onComplete, currentMonitorIndex = global.display.get_current_monitor() ) { 
        
    if (!this.visible)
      return;
    
    this._muteInput = true;
    this.remove_all_transitions();
    let eParams = effectsManager.desktoppopupmenuWindowcloseProfile[0];
    effectsManager.driveOtherAnimation( eParams, {
      actor:        this,
      action:       "close",
      appName:      "",
      profileIndex: 0, 
      sucess:       false, 
      geom:         null,
      effectName:   effectsManager.desktoppopupmenuWindowcloseProfile[0][1],
      itemType:     "desktoppopupmenu", 
      listType:     "other",
      subeffectNo:  0, 
      xRes:         Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes:         Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject:   onComplete      
    });

  }  

  driveDesktopMenuOpenAnimation ( animate, onComplete, currentMonitorIndex = global.display.get_current_monitor() ) { 
 
    this.show();
    this.set_opacity(0);  
    let eParams = effectsManager.desktoppopupmenuWindowopenProfile[0];
    effectsManager.driveOtherAnimation( eParams, {
      actor:        this,
      action:       "open",
      appName:      "",
      profileIndex: 0, 
      sucess:       false, 
      geom:         null,
      effectName:   effectsManager.desktoppopupmenuWindowopenProfile[0][1],
      itemType:     "desktoppopupmenu", 
      listType:     "other",
      subeffectNo:  0, 
      xRes:         Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes:         Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject:   onComplete      
    });
    
  }  

  driveWindowMenuCloseAnimation(animate, onComplete, currentMonitorIndex = global.display.get_current_monitor()) { 
    
    if (!this.visible)
      return;
    
    this._muteInput = true;
    this.remove_all_transitions();    
    this.set_position(effectsManager.shellPopUpMenuPositionX, effectsManager.shellPopUpMenuPositionY);   
    let eParams = effectsManager.windowmenuWindowcloseProfile[0];
    effectsManager.driveOtherAnimation( eParams, {
      actor:        this,
      action:       "close",
      appName:      "",
      profileIndex: 0, 
      sucess:       false, 
      geom:         null,
      effectName:   eParams[1],
      itemType:     "windowmenu", 
      listType:     "other",
      subeffectNo:  0, 
      xRes:         Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes:         Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject:   onComplete      
    });   

  }

  driveWindowMenuOpenAnimation ( animate, onComplete, currentMonitorIndex = global.display.get_current_monitor() ) { 
    
    this.show();
    this.set_opacity(0);
    let eParams = effectsManager.windowmenuWindowopenProfile[0];
    effectsManager.driveOtherAnimation( eParams, {
      actor:        this,
      action:       "open",
      appName:      "",
      profileIndex: 0, 
      sucess:       false, 
      geom:         null,
      effectName:   eParams[1],
      itemType:     "windowmenu", 
      listType:     "other",
      subeffectNo:  0, 
      xRes:         Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes:         Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject:   onComplete      
    });

  }

  driveNotificationBannerAnimation ( action, subEffectNo=0, eParams, xRes, yRes ) { 
 
    let startIndex  = subEffectNo*16 + 3;   // TWEEN_PARAMETERS_LENGTH
    let onCompleteF = (eParams[2] == subEffectNo+1) ? ()=> {effectsManager.animationDone({ actor: Main.messageTray._bannerBin, action: action, appName: "", profileIndex: 0, effectName: eParams[1], itemType:"notificationbanner", listType:"other"});} :()=> {effectsManager.driveNotificationBannerAnimation(action, subEffectNo+1,eParams,xRes,yRes);}
 
    Main.messageTray._bannerBin.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++] );
    startIndex += 2;
    Main.messageTray._bannerBin.remove_all_transitions();
    Main.messageTray._bannerBin.ease({
      delay:            eParams[startIndex++],
      duration:         eParams[startIndex++],
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
      onUpdate:         ()=>{},
      onComplete:       onCompleteF,
    });

  }
    
  driveOSDAnimation( monitorIndex, icon, label, level, maxLevel, action = "open", osdWindow=null ) { 
        
    osdWindow = (osdWindow==null) ? Main.osdWindowManager._osdWindows[monitorIndex]: osdWindow;
    let [ osdWindowActor, eParams ] = [ osdWindow, effectsManager["padosdWindow"+action+"Profile"][0] ]; 
  
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
            effectsManager.driveOtherAnimation( eParams, {actor: osdWindowActor, action: action, profileIndex:0, effectName:eParams[1], itemType: "padosd", listType:"padosd", subeffectNo:0, xRes: Main.layoutManager.monitors[monitorIndex].width, yRes: Main.layoutManager.monitors[monitorIndex].height, itemObject:osdWindow } );
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
        osdWindowActor._hideTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT,effectsManager.padOSDHideTime,()=>effectsManager.driveOSDAnimation(monitorIndex, icon, label, level, maxLevel, "close", osdWindow));        
        GLib.Source.set_name_by_id( osdWindowActor._hideTimeoutId, '[gnome-shell] this._hide');  
        
        return;
    
      case "close" :         
        GLib.source_remove(osdWindowActor._hideTimeoutId);
        osdWindowActor._hideTimeoutId = 0;
        
        if(eParams[0]=="T") {           
           effectsManager.driveOtherAnimation( eParams, {actor: osdWindowActor, action: action, profileIndex:0, effectName:eParams[1], itemType: "padosd", listType:"padosd", subeffectNo:0, xRes: Main.layoutManager.monitors[monitorIndex].width, yRes: Main.layoutManager.monitors[monitorIndex].height, itemObject:osdWindow } );
        }
        else {
          osdWindowActor.ease({ 
            opacity: 0,
            duration: 250,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: ()=> effectsManager.animationDone( {actor: osdWindowActor, action: action, profileIndex:0, effectName:eParams[1], itemType: "padosd", listType:"padosd", subeffectNo:0, itemObject:osdWindow } ),
          });
        }
        
        return GLib.SOURCE_REMOVE;
        
    }
    
  }

  driveOtherAnimation ( eParams, parameters ) { 

    if(eParams[2] == parameters.subeffectNo) {
      this.animationDone( parameters );
      return;
    }

    let startIndex = (parameters.subeffectNo++)*16 + 3; // TWEEN_PARAMETERS_LENGTH  
    parameters.actor.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++]);        
    startIndex += 2;

    if(this.waylandWorkaroundEnabled && ["popupmenu", "dropdownmenu", "splashscreen", "overrideother", "combo"].indexOf(parameters.itemType) >= 0) {
      let skippedPosIndex = startIndex+6;
      parameters.actor.ease({
        delay:             eParams[startIndex++],
        duration:          eParams[startIndex++],
        opacity:           eParams[startIndex++],
        scale_x:           eParams[startIndex++],
        scale_y:           eParams[startIndex++],         
        translation_z:     eParams[skippedPosIndex++]*parameters.yRes,           
        rotation_angle_x:  eParams[skippedPosIndex++],
        rotation_angle_y:  eParams[skippedPosIndex++],           
        rotation_angle_z:  eParams[skippedPosIndex++],
        mode:              Clutter.AnimationMode[eParams[skippedPosIndex++]],
        onComplete:        ()=>this.driveOtherAnimation( eParams, parameters ),
      });  
     
      return;
    }
   
    parameters.actor.ease({
      delay:             eParams[startIndex++],
      duration:          eParams[startIndex++],
      opacity:           eParams[startIndex++],
      scale_x:           eParams[startIndex++],
      scale_y:           eParams[startIndex++],
      translation_x:     eParams[startIndex++]*parameters.xRes,           
      translation_y:     eParams[startIndex++]*parameters.yRes,           
      translation_z:     eParams[startIndex++]*parameters.yRes,
      rotation_angle_x:  eParams[startIndex++],
      rotation_angle_y:  eParams[startIndex++],           
      rotation_angle_z:  eParams[startIndex++],
      mode:              Clutter.AnimationMode[eParams[startIndex++]],
      onComplete:        ()=>this.driveOtherAnimation( eParams, parameters )
    });  
   
  }

  driveWindowAnimation ( eParams, parameters ) { 
    
    if(eParams[2] == parameters.subeffectNo) {
      this.animationDone( parameters );
      return;
    }
 
    let startIndex        = (parameters.subeffectNo++)*16 + 10; //3+7  TWEEN_PARAMETERS_LENGTH 
    let correctedPosition = parameters.actor.x;  //this.setNextParametersWindow( eParams, parameters, startIndex+7 ); START
    eParams[startIndex]   = (eParams[startIndex]!="MW") ? eParams[startIndex] : (parameters.sucess) ? parameters.geom.width/parameters.actor.width   : (parameters.xRes*0.05)/parameters.actor.width;
    eParams[++startIndex] = (eParams[startIndex]!="MH") ? eParams[startIndex] : (parameters.sucess) ? parameters.geom.height/parameters.actor.height : (parameters.yRes*0.05)/parameters.actor.height;
    
    if(eParams[++startIndex][0] == "C") {
      eParams[startIndex] = eParams[startIndex].substring(1,eParams[startIndex].length);
      correctedPosition   = eParams[0];
    }

    switch(eParams[startIndex][0]) {
      case "L" :
        eParams[startIndex] = 0-parameters.actor.width;
        break;
      case "R" :
        eParams[startIndex] = (parameters.sucess) ? parameters.geom.x:parameters.xRes ;
        break;
      case "M" :
        eParams[startIndex] = (parameters.sucess) ? parameters.geom.x:parameters.xRes/2;
        break;
      case "S" :
        eParams[startIndex] = correctedPosition;
        break;
      case "I" :
        eParams[startIndex] = eParams[0];
        break; 
      default:
        eParams[startIndex] = correctedPosition + parseFloat(eParams[startIndex])*parameters.xRes;
    }

    if(eParams[++startIndex][0] == "C") {
      eParams[startIndex] = eParams[startIndex].substring(1,eParams[startIndex].length);
      correctedPosition = eParams[1];
    }
    else {
      correctedPosition = parameters.actor.y;
    }

    switch(eParams[startIndex][0]) {
      case "U" :
        eParams[startIndex] = 0-parameters.actor.height;
        break;
      case "D" :
        eParams[startIndex] = (parameters.sucess) ? parameters.geom.y:parameters.yRes ;
        break;
      case "M" :
        eParams[startIndex] = (parameters.sucess) ? parameters.geom.y:parameters.yRes/2 ;
        break;
      case "S" :
        eParams[startIndex] = correctedPosition;
        break;
      case "I" :
        eParams[startIndex] = eParams[1];
        break; 
      default :
        eParams[startIndex] = correctedPosition + parseFloat(eParams[startIndex])*parameters.yRes;
    }  //this.setNextParametersWindow( eParams, parameters, startIndex+7 ); END
    
    startIndex -= 10;
    parameters.actor.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++]);        
    startIndex += 2;

    parameters.actor.ease({
      delay:             eParams[startIndex++],
      duration:          eParams[startIndex++],
      opacity:           eParams[startIndex++],
      scale_x:           eParams[startIndex++],
      scale_y:           eParams[startIndex++],
      x:                 eParams[startIndex++],           
      y:                 eParams[startIndex++],           
      translation_z:     eParams[startIndex++]*parameters.yRes,           
      rotation_angle_x:  eParams[startIndex++],
      rotation_angle_y:  eParams[startIndex++],           
      rotation_angle_z:  eParams[startIndex++],
      mode:              Clutter.AnimationMode[eParams[startIndex++]],
      onStopped:         ()=> this.driveWindowAnimation ( eParams, parameters )
    }); 
 
  }
    
  extension_integrate_DashToDock(){
  
    if(this.extension_getItems_DashToDock() == false) {
      return;
    }
    this.onlyExecuteLastTrigger(1, this.extension_DashToDock_AppIconsBox);
    this.eitherDashToDockOrDashToPanelSignalHandler = this.extension_DashToDock_AppIconsBox.connect("actor-added", ()=> this.onlyExecuteLastTrigger(1, this.extension_DashToDock_AppIconsBox));

  }

  extension_integrate_DashToPanel(){
  
    if(this.extension_getItems_DashToPanel() == false) {
      return;
    }
    this.onlyExecuteLastTrigger(1, this.extension_DashToPanel_AppIconsBox);
    this.eitherDashToDockOrDashToPanelSignalHandler = this.extension_DashToPanel_AppIconsBox.connect("actor-added", ()=> this.onlyExecuteLastTrigger(1, this.extension_DashToPanel_AppIconsBox));          
 
  }
    
  extension_getItems_DashToDock() {
  
    let uiChildren = Main.layoutManager.uiGroup.get_children();
    let len        = uiChildren.length;
    let childName  = null;
    
    while(len-- > 0) {   
      childName = uiChildren[len].toString();   
      if( childName.indexOf("dashtodockContainer") > -1 ) {
        this.extension_DashToDock_AppIconsBox = uiChildren[len].get_children()[0].get_children()[0].get_children()[0]._box;
      }           
    }
    
    return (this.extension_DashToDock_AppIconsBox) ? true: false
  
  }
  
  extension_getItems_DashToPanel() {

    if(!(global.dashToPanel && global.dashToPanel.panels) ) {
      return false;
    }
    
    let uiChildren =  global.dashToPanel.panels;
    let len        = uiChildren.length;
    let childName  = null;
    
    while(len-- > 0) {   
      childName = uiChildren[len].toString();  
      if(childName.indexOf("dash-to-panel_jderose9_github_com_utils_DashToPanel-Panel") > -1) {
        this.extension_DashToPanel_AppIconsBox = uiChildren[len].taskbar._box;
      } 
      
    }
    return true;
  
  }
  
  extractEffect ( effectList,startIndex,endIndex ) {
  
    let eStr=[];
  
    while(startIndex <= endIndex) {
      eStr.push(effectList[startIndex++]);
    }
    
    return eStr;
  
  }

  extractEffectAtIndex ( effectsListRaw,index ) {
  
    let startIndex = 0;
    
    while(index-- > 0) {
      startIndex = effectsListRaw.indexOf("|", startIndex+1);
    }

    return this.extractEffect(effectsListRaw,startIndex, this.getEndIndex(effectsListRaw,startIndex));
  
  }

  getEffectFor ( appName,effectsListRaw ) {
    
    let appIndex    = (this.nameList.indexOf(appName)+1)*this.useApplicationProfiles;        
    let effectIndex = 0;
    let startIndex  = 0;

    let endIndex = this.getEndIndex(effectsListRaw,startIndex);
    let eStr = this.extractEffect(effectsListRaw,1,endIndex);
    let effectListLastIndex = effectsListRaw.length-1;
    
    while(startIndex!=-1) {
    
      if(effectIndex == appIndex) {
        startIndex++;
        return this.extractEffect(effectsListRaw,startIndex,endIndex);
      }
      
      if(endIndex == effectListLastIndex) {
        return eStr;
      }
      
      effectIndex++;
      startIndex = effectsListRaw.indexOf('|',startIndex+1);
      endIndex = this.getEndIndex(effectsListRaw,startIndex);
      
    } 
    
  }
  
  getEndIndex ( effectList,startIndex ) {
  
    let endIndex = effectList.indexOf('|',startIndex+1);
        
    if(endIndex == -1) {
      endIndex = effectList.length;
    }  
    
    return --endIndex;

  }

  loadProfilePrefs () {
  
    let normalWindowopenProfileRaw            = extensionSettings.get_strv("normal-open"); 
    let normalWindowcloseProfileRaw           = extensionSettings.get_strv("normal-close");
    let normalWindowminimizeProfileRaw        = extensionSettings.get_strv("normal-minimize");
    let normalWindowunminimizeProfileRaw      = extensionSettings.get_strv("normal-unminimize");    
    let normalWindowmovestartProfileRaw       = extensionSettings.get_strv("normal-movestart");   
    let normalWindowfocusProfileRaw           = extensionSettings.get_strv("normal-focus");    
    let normalWindowdefocusProfileRaw         = extensionSettings.get_strv("normal-defocus");         
    let dialogWindowopenProfileRaw            = extensionSettings.get_strv("dialog-open");
    let dialogWindowcloseProfileRaw           = extensionSettings.get_strv("dialog-close");
    let dialogWindowminimizeProfileRaw        = extensionSettings.get_strv("dialog-minimize");
    let dialogWindowunminimizeProfileRaw      = extensionSettings.get_strv("dialog-unminimize");  
    let dialogWindowmovestartProfileRaw       = extensionSettings.get_strv("dialog-movestart");
    let dialogWindowfocusProfileRaw           = extensionSettings.get_strv("dialog-focus");    
    let dialogWindowdefocusProfileRaw         = extensionSettings.get_strv("dialog-defocus");    
    let modaldialogWindowopenProfileRaw       = extensionSettings.get_strv("modaldialog-open");
    let modaldialogWindowcloseProfileRaw      = extensionSettings.get_strv("modaldialog-close");
    let modaldialogWindowminimizeProfileRaw   = extensionSettings.get_strv("modaldialog-minimize");
    let modaldialogWindowunminimizeProfileRaw = extensionSettings.get_strv("modaldialog-unminimize");  
    let modaldialogWindowmovestartProfileRaw  = extensionSettings.get_strv("modaldialog-movestart");
    let modaldialogWindowfocusProfileRaw      = extensionSettings.get_strv("modaldialog-focus");    
    let modaldialogWindowdefocusProfileRaw    = extensionSettings.get_strv("modaldialog-defocus");    
    
    this.dropdownmenuWindowopenProfile          = [extensionSettings.get_strv("dropdownmenu-open")];
    this.popupmenuWindowopenProfile             = [extensionSettings.get_strv("popupmenu-open")];
    this.comboWindowopenProfile                 = [extensionSettings.get_strv("combo-open")];
    this.splashscreenWindowopenProfile          = [extensionSettings.get_strv("splashscreen-open")];
    this.tooltipWindowopenProfile               = [extensionSettings.get_strv("tooltip-open")];
    this.overrideotherWindowopenProfile         = [extensionSettings.get_strv("overrideother-open")];    
    this.notificationbannerWindowopenProfile    = [extensionSettings.get_strv("notificationbanner-open")];
    this.notificationbannerWindowcloseProfile   = [extensionSettings.get_strv("notificationbanner-close")];
    this.padosdWindowopenProfile                = [extensionSettings.get_strv("padosd-open")];
    this.padosdWindowcloseProfile               = [extensionSettings.get_strv("padosd-close")];
    this.toppanelpopupmenuWindowopenProfile     = [extensionSettings.get_strv("toppanelpopupmenu-open")]; 
    this.toppanelpopupmenuWindowcloseProfile    = [extensionSettings.get_strv("toppanelpopupmenu-close")]; 
    this.desktoppopupmenuWindowopenProfile      = [extensionSettings.get_strv("desktoppopupmenu-open")]; 
    this.desktoppopupmenuWindowcloseProfile     = [extensionSettings.get_strv("desktoppopupmenu-close")];  
    this.dashappiconpopupmenuWindowopenProfile  = [extensionSettings.get_strv("dashappiconpopupmenu-open")]; 
    this.dashappiconpopupmenuWindowcloseProfile = [extensionSettings.get_strv("dashappiconpopupmenu-close")];     
    this.windowmenuWindowopenProfile            = [extensionSettings.get_strv("windowmenu-open")]; 
    this.windowmenuWindowcloseProfile           = [extensionSettings.get_strv("windowmenu-close")];  
    this.endsessiondialogWindowopenProfile      = [extensionSettings.get_strv("endsessiondialog-open")]; 
    this.endsessiondialogWindowcloseProfile     = [extensionSettings.get_strv("endsessiondialog-close")];  
    
    this.dashappiconWindownewwindowProfile = [extensionSettings.get_strv("dashappicon-newwindow")]; 
                 
    this.waylandWorkaroundEnabled             = extensionSettings.get_boolean("wayland");
    this.padOSDHideTime                       = extensionSettings.get_int("padosd-hide-timeout");
    this.useApplicationProfiles               = extensionSettings.get_boolean("use-application-profiles");
    this.nameList                             = extensionSettings.get_strv("name-list");              

    this.normalWindowopenProfile            = [this.getEffectFor("",normalWindowopenProfileRaw)];
    this.normalWindowcloseProfile           = [this.getEffectFor("",normalWindowcloseProfileRaw)];
    this.normalWindowminimizeProfile        = [this.getEffectFor("",normalWindowminimizeProfileRaw)];
    this.normalWindowunminimizeProfile      = [this.getEffectFor("",normalWindowunminimizeProfileRaw)];
    this.normalWindowmovestartProfile       = [this.getEffectFor("",normalWindowmovestartProfileRaw)];
    this.normalWindowfocusProfile           = [this.getEffectFor("",normalWindowfocusProfileRaw)];
    this.normalWindowdefocusProfile         = [this.getEffectFor("",normalWindowdefocusProfileRaw)];         
    this.dialogWindowopenProfile            = [this.getEffectFor("",dialogWindowopenProfileRaw)];
    this.dialogWindowcloseProfile           = [this.getEffectFor("",dialogWindowcloseProfileRaw)];
    this.dialogWindowminimizeProfile        = [this.getEffectFor("",dialogWindowminimizeProfileRaw)];
    this.dialogWindowunminimizeProfile      = [this.getEffectFor("",dialogWindowunminimizeProfileRaw)];
    this.dialogWindowmovestartProfile       = [this.getEffectFor("",dialogWindowmovestartProfileRaw)];
    this.dialogWindowfocusProfile           = [this.getEffectFor("",dialogWindowfocusProfileRaw)];
    this.dialogWindowdefocusProfile         = [this.getEffectFor("",dialogWindowdefocusProfileRaw)];       
    this.modaldialogWindowopenProfile       = [this.getEffectFor("",modaldialogWindowopenProfileRaw)];
    this.modaldialogWindowcloseProfile      = [this.getEffectFor("",modaldialogWindowcloseProfileRaw)];
    this.modaldialogWindowminimizeProfile   = [this.getEffectFor("",modaldialogWindowminimizeProfileRaw)];
    this.modaldialogWindowunminimizeProfile = [this.getEffectFor("",modaldialogWindowunminimizeProfileRaw)];
    this.modaldialogWindowmovestartProfile  = [this.getEffectFor("",modaldialogWindowmovestartProfileRaw)];
    this.modaldialogWindowfocusProfile      = [this.getEffectFor("",modaldialogWindowfocusProfileRaw)];
    this.modaldialogWindowdefocusProfile    = [this.getEffectFor("",modaldialogWindowdefocusProfileRaw)];        
    this.normalWindowmovestopProfile        = this.normalWindowmovestartProfile;
    this.dialogWindowmovestopProfile        = this.dialogWindowmovestartProfile;
    this.modaldialogWindowmovestopProfile   = this.modaldialogWindowmovestartProfile;

    this.dropdownmenuWindowopenProfile[0].splice(0,1);
    this.popupmenuWindowopenProfile[0].splice(0,1);
    this.comboWindowopenProfile[0].splice(0,1);         
    this.splashscreenWindowopenProfile[0].splice(0,1); 
    this.tooltipWindowopenProfile[0].splice(0,1);      
    this.overrideotherWindowopenProfile[0].splice(0,1);
    this.padosdWindowopenProfile[0].splice(0,1);
    this.padosdWindowcloseProfile[0].splice(0,1);       
    this.notificationbannerWindowopenProfile[0].splice(0,1);
    this.notificationbannerWindowcloseProfile[0].splice(0,1);
    this.toppanelpopupmenuWindowopenProfile[0].splice(0,1);
    this.toppanelpopupmenuWindowcloseProfile[0].splice(0,1);
    this.desktoppopupmenuWindowopenProfile[0].splice(0,1);
    this.desktoppopupmenuWindowcloseProfile[0].splice(0,1);
    this.windowmenuWindowopenProfile[0].splice(0,1);
    this.windowmenuWindowcloseProfile[0].splice(0,1);
    this.endsessiondialogWindowopenProfile[0].splice(0,1); 
    this.endsessiondialogWindowcloseProfile[0].splice(0,1);    
    this.dashappiconWindownewwindowProfile[0].splice(0,1);
    this.dashappiconpopupmenuWindowopenProfile[0].splice(0,1);
    this.dashappiconpopupmenuWindowcloseProfile[0].splice(0,1);
    
    Main.osdWindowManager._showOsdWindow = ( this.padosdWindowopenProfile[0][0] =="T" || this.padosdWindowcloseProfile[0][0] =="T" ) ? this.driveOSDAnimation : defaultPadOSDShow;
    this.updateAddNotificationBannerEffects(this.notificationbannerWindowopenProfile[0][0], this.notificationbannerWindowcloseProfile[0][0] );
    Main.wm._windowMenuManager.showWindowMenuForWindow = ( this.windowmenuWindowopenProfile[0][0] =="T" || this.windowmenuWindowcloseProfile[0][0] =="T" ) ? this.overriddenShowWindowMenuForWindow : defaultShowWindowMenu;
    this.updateShellWidgetAnimationFunctions(0);
    this.updateDashAppIconEffects(0, 0);

    if(this.useApplicationProfiles) {
      let listLength = this.nameList.length;
      for(let i=0;i<listLength;i++) { 
        this.normalWindowopenProfile[i+1]            = this.getEffectFor(this.nameList[i],normalWindowopenProfileRaw);
        this.normalWindowcloseProfile[i+1]           = this.getEffectFor(this.nameList[i],normalWindowcloseProfileRaw);
        this.normalWindowminimizeProfile[i+1]        = this.getEffectFor(this.nameList[i],normalWindowminimizeProfileRaw);
        this.normalWindowunminimizeProfile[i+1]      = this.getEffectFor(this.nameList[i],normalWindowunminimizeProfileRaw);   
        this.dialogWindowopenProfile[i+1]            = this.getEffectFor(this.nameList[i],dialogWindowopenProfileRaw);
        this.dialogWindowcloseProfile[i+1]           = this.getEffectFor(this.nameList[i],dialogWindowcloseProfileRaw);
        this.dialogWindowminimizeProfile[i+1]        = this.getEffectFor(this.nameList[i],dialogWindowminimizeProfileRaw);
        this.dialogWindowunminimizeProfile[i+1]      = this.getEffectFor(this.nameList[i],dialogWindowunminimizeProfileRaw);
        this.modaldialogWindowopenProfile[i+1]       = this.getEffectFor(this.nameList[i],modaldialogWindowopenProfileRaw);
        this.modaldialogWindowcloseProfile[i+1]      = this.getEffectFor(this.nameList[i],modaldialogWindowcloseProfileRaw);
        this.modaldialogWindowminimizeProfile[i+1]   = this.getEffectFor(this.nameList[i],modaldialogWindowminimizeProfileRaw);
        this.modaldialogWindowunminimizeProfile[i+1] = this.getEffectFor(this.nameList[i],modaldialogWindowunminimizeProfileRaw); 
      }    
    }
  }

  onlyExecuteLastTrigger(index, obj) {  

    if(this.dashAppIconUpdateTimeoutID[index] != null) {
      GLib.source_remove(this.dashAppIconUpdateTimeoutID[index]);
      this.dashAppIconUpdateTimeoutID[index] = null;
    } 
    this.dashAppIconUpdateTimeoutID[index] = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, ()=> this.updateDashAppIconEffects(index, 0, obj));
    
  }

  overriddenDashAppIconAnimateLaunch( currentMonitorIndex = global.display.get_current_monitor() ) {
  
    let actor = this.icon._iconBin;
    actor.opacity = 0;
        
    if(this.actorClone) {
      this.actorClone.destroy();
    }
    
    this.actorClone = new Clutter.Clone({ source: actor, reactive: false });
    let [width, height] = actor.get_transformed_size();
    let [x, y] = actor.get_transformed_position();
        
    this.actorClone.set_size(width, height);
    this.actorClone.set_position(x, y);
    this.actorClone.opacity = 255;
    this.actorClone.set_pivot_point(0.5, 0.5);

    Main.uiGroup.add_actor(this.actorClone);
    
    let eParams = effectsManager.dashappiconWindownewwindowProfile[0];          
    effectsManager.driveOtherAnimation(eParams, {
      actor        : this.actorClone,
      action       : "newwindow",
      appName      : "",
      profileIndex : 0, 
      sucess       : false, 
      geom         : null,
      effectName   : eParams[1],
      itemType     : "dashappicon", 
      listType     : "dashappicon",
      subeffectNo  : 0, 
      xRes         : Main.layoutManager.monitors[currentMonitorIndex].width, 
      yRes         : Main.layoutManager.monitors[currentMonitorIndex].height,  
      itemObject   : this      
    });
    
  }
        
  overriddenHideNotification ( animate, currentMonitorIndex = global.display.get_current_monitor() ) {
  
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
      effectsManager.driveNotificationBannerAnimation("close" , 0, effectsManager.notificationbannerWindowcloseProfile[0], Main.layoutManager.monitors[currentMonitorIndex].width, Main.layoutManager.monitors[currentMonitorIndex].height );
    } 
    else {
      Main.messageTray._bannerBin.remove_all_transitions();
      Main.messageTray._bannerBin.y = -Main.messageTray._bannerBin.height;
      Main.messageTray._bannerBin.opacity = 0;
      Main.messageTray._notificationState = 0;//State.HIDDEN;
      Main.messageTray._hideNotificationCompleted();
    }
  
  }

  overriddenShellModalDialogClose(timestamp) {
  
        if (this.state == 1/*State.CLOSED*/ || this.state == 3/*State.CLOSING*/)
            return;

        this._setState(3/*State.CLOSING*/);
        this.popModal(timestamp);
        this._savedKeyFocus = null;

        if (this._shouldFadeOut) {
            let eParams = effectsManager.endsessiondialogWindowcloseProfile[0];          
            effectsManager.driveOtherAnimation(eParams, {
              actor        : this.dialogLayout,
              action       : "close",
              appName      : "",
              profileIndex : 0, 
              sucess       : false, 
              geom         : null,
              effectName   : eParams[1],
              itemType     : "endsessiondialog", 
              listType     : "other",
              subeffectNo  : 0, 
              xRes         : Main.layoutManager.monitors[this._monitorConstraint.index].width, 
              yRes         : Main.layoutManager.monitors[this._monitorConstraint.index].height,  
              itemObject   : ()=> this.ease({
                opacity: 0,
                duration: 100,//OPEN_AND_CLOSE_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,//Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                  this._closeComplete();
                  this.dialogLayout.ease({  // Needed since refreshItemActor doesn't work properly
                    duration         : 1,
                    opacity          : 255,
                    scale_x          : 1,
                    scale_y          : 1,
                    translation_x    : 0,           
                    translation_y    : 0,           
                    translation_z    : 0,
                    rotation_angle_x : 0,
                    rotation_angle_y : 0,           
                    rotation_angle_z : 0,
                  });
                  this.dialogLayout.show();
                }
              })
            });
        } else {
            this._closeComplete();
        }
                            
  }

  overriddenShellModalDialogOpen(onPrimary) {
        
        if (onPrimary)
            this._monitorConstraint.primary = true;
        else
            this._monitorConstraint.index = global.display.get_current_monitor();

        this._setState(2/*State.OPENING*/);

        this.dialogLayout.opacity = 255;
        if (this._lightbox)
            this._lightbox.lightOn();
        this.opacity = 0;
        this.show();
        this.ease({
            opacity: 255,
            duration: this._shouldFadeIn ? 100/*OPEN_AND_CLOSE_TIME*/ : 0,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                this._setState(0/*State.OPENED*/);
                this.emit('opened');
            },
        });
        
        let eParams = effectsManager.endsessiondialogWindowopenProfile[0];          
        effectsManager.driveOtherAnimation(eParams, {
          actor        : this.dialogLayout,
          action       : "open",
          appName      : "",
          profileIndex : 0, 
          sucess       : false, 
          geom         : null,
          effectName   : eParams[1],
          itemType     : "endsessiondialog", 
          listType     : "other",
          subeffectNo  : 0, 
          xRes         : Main.layoutManager.monitors[this._monitorConstraint.index].width, 
          yRes         : Main.layoutManager.monitors[this._monitorConstraint.index].height,  
          itemObject   : this      
        });
        
  } 
  
  overriddenShowWindowMenuForWindow(window, type, rect) {
        
        if (this._manager._menus.length || !Main.sessionMode.hasWmMenus)
            return;

        if (type != Meta.WindowMenuType.WM)
            throw new Error('Unsupported window menu type');
        let menu = new WindowMenu.WindowMenu(window, this._sourceActor);
        menu._boxPointer.open  = (effectsManager.windowmenuWindowopenProfile[0][0]  == "T") ? effectsManager.driveWindowMenuOpenAnimation  : menu._boxPointer.open;
        menu._boxPointer.close = (effectsManager.windowmenuWindowcloseProfile[0][0] == "T") ? effectsManager.driveWindowMenuCloseAnimation : menu._boxPointer.close;
        
        this._manager.addMenu(menu);

        menu.connect('activate', () => {
            window.check_alive(global.get_current_time());
        });
        let destroyId = window.connect('unmanaged', () => {
            menu.close(false);
        });

        this._sourceActor.set_size(Math.max(1, rect.width), Math.max(1, rect.height));
        this._sourceActor.set_position(rect.x, rect.y);
        this._sourceActor.show();
        
        menu.open(2/*BoxPointer.PopupAnimation.FADE*/);
        menu.actor.navigate_focus(null, 0/*St.DirectionType.TAB_FORWARD*/, false);
        menu.connect('open-state-changed', (menu_, isOpen) => {
             
            if (isOpen)
                return;

            this._sourceActor.hide();                    
            if(effectsManager.windowmenuWindowcloseProfile[0][0] == "T") {
              menu.connect("menu-closed", ()=>menu.destroy());
              menu.close(true);            
            }
            else {
              menu.destroy();
            }
            window.disconnect(destroyId);
        });

  }  

  overriddenUpdateShowingNotification ( currentMonitorIndex = global.display.get_current_monitor() ) {
  
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
        onComplete : ()=> effectsManager.driveNotificationBannerAnimation( "open" , 0, effectsManager.notificationbannerWindowopenProfile[0], Main.layoutManager.monitors[currentMonitorIndex].width, Main.layoutManager.monitors[currentMonitorIndex].height ),
      });

  } 

  refreshItemActor( actor, fistFunction="hide", secondFunction="show", opacity=255 ) {
    
    actor[fistFunction]();
    [ actor.rotation_angle_x, actor.rotation_angle_y, actor.rotation_angle_z, actor.transition_x, actor.transition_y, actor.transition_z ] = [ 0, 0, 0, 0, 0, 0 ];
    actor.set_scale(1,1);
    actor.set_pivot_point(0,0);     
    actor.set_opacity(opacity);
    actor[secondFunction]();

  }
    
  startEffectsManager () {

    if(extensionSettings.get_double("current-version") < 13.01) {    
      extensionState = "n"; // Extension is not started
      Main.notify("Animation Tweaks","Extension is updated. Please complete the update process in the extension preferences.");
      return;
    }
      
    if(extensionSettings.get_strv("disable-shortcut")[0].indexOf("Disabled") < 0) {
      extensionState = "k";  // Extension is started and Keyboard shortcut is enabled.
      Main.wm.addKeybinding( //this.extensionDisableShortcut(); START
        'disable-shortcut',
        extensionSettings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
        () => {
          let extensionList = Main.extensionManager._enabledExtensions;
          extensionList.splice(extensionList.indexOf("animation-tweaks@Selenium-H"), 1);
          global.settings.set_strv("enabled-extensions", extensionList);       
          Main.notify("Animation Tweaks Extension Disabled ... ", "Extension is disabled by Keyboard Shortcut. To use it again, manually enable it using GNOME Tweak Tool or the Extensions app.");
        }
      );
    } 
    else {
      extensionState = "s"; //Extension is started but keyboard shortcut is not enabled.
    } //this.extensionDisableShortcut(); END
                
    this.focussingEffectEnabled   = extensionSettings.get_boolean("focussing-effect");
    this.defocussingEffectEnabled = extensionSettings.get_boolean("defocussing-effect");    
    this.doFocusAndDefocus = true;
    this.focusWindow = null;
    this.pendingMinimize = new Set();
    this.dashAppIconUpdateTimeoutID = [null, null];
    this.loadProfilePrefs();
    this.extensionlength = Main.extensionManager._extensionOrder.length;
    this.extension_DashToPanel_AppIconsBox = null;
    this.extension_DashToDock_AppIconsBox  = null;            
    this.eitherDashToDockOrDashToPanelSignalHandler = null;
    this.extensionManagerSignalHandler = null;
    this.dontDeactivate = (Main.extensionManager._extensionOrder.indexOf("animation-tweaks@Selenium-H") < Main.extensionManager._extensionOrder.indexOf("dash-to-dock@micxgx.gmail.com") || Main.extensionManager._extensionOrder.indexOf("animation-tweaks@Selenium-H") < Main.extensionManager._extensionOrder.indexOf("dash-to-panel@jderose9.github.com")) ? true: false;

    this.dashActorSignal = Main.overview._overview.dash._box.connect("actor-added", ()=> this.onlyExecuteLastTrigger(0, Main.overview._overview.dash._box));
    
    if( extensionSettings.get_boolean("extension-integration") ) {
                   
      if(Main.extensionManager._extensionOrder.indexOf("dash-to-panel@jderose9.github.com") >= 0) {
        this.extension_integrate_DashToPanel();
      }    
      else if( Main.extensionManager._extensionOrder.indexOf("dash-to-dock@micxgx.gmail.com") >= 0) {
        this.extension_integrate_DashToDock();      
      }
      
      this.extensionManagerSignalHandler = Main.extensionManager.connect("extension-state-changed", (extension)=> { // If the extension is enabled after this extension is enabled.

        if(extension._extensionOrder.indexOf("animation-tweaks@Selenium-H") < extension._extensionOrder.indexOf("dash-to-dock@micxgx.gmail.com") || extension._extensionOrder.indexOf("animation-tweaks@Selenium-H") < extension._extensionOrder.indexOf("dash-to-panel@jderose9.github.com")) {
          this.dontDeactivate = true;
        }
        
        if(this.extensionlength < extension._extensionOrder.length) { // An extension is enabled
          if( extension._extensionOrder[extension._extensionOrder.length-1] == "dash-to-panel@jderose9.github.com" ) {
            this.extension_integrate_DashToPanel();          
          }      
          else if( extension._extensionOrder[extension._extensionOrder.length-1] == "dash-to-dock@micxgx.gmail.com" ) {
            this.extension_integrate_DashToDock();           
          }      
        }
        else {
          if(this.eitherDashToDockOrDashToPanelSignalHandler && Main.extensionManager._extensionOrder.indexOf("dash-to-dock@micxgx.gmail.com") < 0 && Main.extensionManager._extensionOrder.indexOf("dash-to-panel@jderose9.github.com") < 0 ) {
            this.extension_DashToPanel_AppIconsBox = null;
            this.extension_DashToDock_AppIconsBox  = null;            
            this.eitherDashToDockOrDashToPanelSignalHandler = null;
            
            if(this.dashAppIconUpdateTimeoutID[1] != null) {
              GLib.source_remove(this.dashAppIconUpdateTimeoutID[1]);
              this.dashAppIconUpdateTimeoutID[1] = null;
            }            
          }
        }
        this.extensionlength = extension._extensionOrder.length;
        
      });
       
    }
    
    this.popUpMenuManagerSig = Main.layoutManager.uiGroup.connect("actor-added", ( layoutManager, actor )=> {  
      let childName = actor.toString();
      if( childName.indexOf("background-menu") > -1 || childName.indexOf("panel-menu") > -1 || childName.indexOf("modalDialogGroup") > -1) {
        this.updateShellWidgetAnimationFunctions(0);
      }          
    });    
     
    this.onOpeningSig      = (extensionSettings.get_boolean("opening-effect"))      ? global.window_manager.connect("map",        (swm,actor) => this.addWindowOpeningEffects(actor,      global.display.get_current_monitor(), true)) : null;
    this.onClosingSig      = (extensionSettings.get_boolean("closing-effect"))      ? global.window_manager.connect("destroy",    (swm,actor) => this.addWindowClosingEffects(actor,      global.display.get_current_monitor(), true)) : null;
    this.onMinimizingSig   = (extensionSettings.get_boolean("minimizing-effect"))   ? global.window_manager.connect("minimize",   (swm,actor) => this.addWindowMinimizingEffects(actor,   global.display.get_current_monitor(), true)) : null;
    this.onUnminimizingSig = (extensionSettings.get_boolean("unminimizing-effect")) ? global.window_manager.connect("unminimize", (swm,actor) => this.addWindowUnminimizingEffects(actor, global.display.get_current_monitor(), true)) : null;
         
    if(this.focussingEffectEnabled || this.defocussingEffectEnabled) {
      this.focussingDefocussingSig = global.display.connect('notify::focus-window',()=>this.addWindowFocussingEffects(global.display.get_current_monitor()));
      this.switchWorkspaceSig      = global.window_manager.connect('switch-workspace', ()=> {this.doFocusAndDefocus = false;});
      this.restackedSig            = global.display.connect('restacked', ()=> {this.doFocusAndDefocus = true;});
    }
    
    if(extensionSettings.get_boolean("moving-effect") && GNOME_VERSION < "40") {    
      this.onMovingStartSig = global.display.connect('grab-op-begin', (display, screen, window, op)=> this.addWindowStartMovingEffects(op, global.display.get_current_monitor()));
      this.onMovingEndSig   = global.display.connect('grab-op-end',   (display, screen, window, op)=> this.addWindowStopMovingEffects(op, global.display.get_current_monitor()));
    }
    else if(extensionSettings.get_boolean("moving-effect") && GNOME_VERSION >= "40") {
      this.onMovingStartSig = global.display.connect('grab-op-begin', (display, screen, op)=> this.addWindowStartMovingEffects(op, global.display.get_current_monitor()));
      this.onMovingEndSig   = global.display.connect('grab-op-end',   (display, screen, op)=> this.addWindowStopMovingEffects(op, global.display.get_current_monitor())); 
    }       
    else {
      [ this.onMovingStartSig, this.onMovingEndSig ] = [ null, null ];
    }
           
  }

  updateAddNotificationBannerEffects ( openStatus = "F", closeStatus = "F" ) {
  
    Main.messageTray._updateShowingNotification = (openStatus  =="T") ? this.overriddenUpdateShowingNotification : defaultUpdateShowingNotification;  
    Main.messageTray._hideNotification          = (closeStatus =="T") ? this.overriddenHideNotification          : defaultHideNotification;

  }
  
  updateDashAppIconEffects( index, mode = 0, dashIcons = Main.overview._overview.dash._box ) {
    
    this.dashAppIconUpdateTimeoutID[index] = null;
    
    dashIcons = dashIcons.get_children();
    let l = dashIcons.length;     
    let animateLaunchFunctionOverridden = (this.dashappiconWindownewwindowProfile[0][0] == "T" && mode == 0) ? this.overriddenDashAppIconAnimateLaunch : this.defaultDashIconAnimateLaunch;
    
    while(l-- > 0) {
      if(dashIcons[l].get_children()[0]) {
        if(dashIcons[l].get_children()[0].animateLaunch) {
          dashIcons[l].get_children()[0].animateLaunch = animateLaunchFunctionOverridden;          
        }
        
        if(!dashIcons[l].get_children()[0]._menu) {
          dashIcons[l].get_children()[0].popupMenu();
          dashIcons[l].get_children()[0]._menu.close(false);
        }
        dashIcons[l].get_children()[0]._menu._boxPointer.open  = ( this.dashappiconpopupmenuWindowopenProfile[0][0]  == "T" && mode == 0 ) ? this.driveDashAppIconPopUpMenuBoxPointerOpenAnimation : defaultBoxPointerOpenAnimationFunction;   
        dashIcons[l].get_children()[0]._menu._boxPointer.close = ( this.dashappiconpopupmenuWindowcloseProfile[0][0] == "T" && mode == 0 ) ? this.driveDashAppIconPopUpMenuBoxPointerCloseAnimation : defaultBoxPointerCloseAnimationFunction;    
      }
      
    }      

  }
  
  updateShellWidgetAnimationFunctions( mode = 0 ) { // mode = 1 disables
 
    let uiChildren = Main.layoutManager.uiGroup.get_children();
    let len        = uiChildren.length;
    let childName  = null;
    
    while(len-- > 0) {      
      childName = uiChildren[len].toString();
      if( childName.indexOf("background-menu") > -1 ) {
        uiChildren[len].open  = ( this.desktoppopupmenuWindowopenProfile[0][0]  == "T" && mode == 0 ) ? this.driveDesktopMenuOpenAnimation  : defaultBoxPointerOpenAnimationFunction;   
        uiChildren[len].close = ( this.desktoppopupmenuWindowcloseProfile[0][0] == "T" && mode == 0 ) ? this.driveDesktopMenuCloseAnimation : defaultBoxPointerCloseAnimationFunction;
      }
      else if( childName.indexOf("panel-menu") > -1 ) {
        uiChildren[len].open  = ( this.toppanelpopupmenuWindowopenProfile[0][0]  == "T" && mode == 0 ) ? this.driveBoxPointerOpenAnimation  : defaultBoxPointerOpenAnimationFunction;   
        uiChildren[len].close = ( this.toppanelpopupmenuWindowcloseProfile[0][0] == "T" && mode == 0 ) ? this.driveBoxPointerCloseAnimation : defaultBoxPointerCloseAnimationFunction;
      }
      else if( childName.indexOf("modalDialogGroup") > -1 ) {
        if(defaultShellModalDialogOpenAnimationFunction == null) {
          defaultShellModalDialogOpenAnimationFunction = uiChildren[len].get_children()[0]._fadeOpen;
          defaultShellModalDialogCloseAnimationFunction = uiChildren[len].get_children()[0].close;
        }
        uiChildren[len].get_children()[0]._fadeOpen = ( this.endsessiondialogWindowopenProfile[0][0]  == "T" && mode == 0 ) ? this.overriddenShellModalDialogOpen  : defaultShellModalDialogOpenAnimationFunction;   
        uiChildren[len].get_children()[0].close     = ( this.endsessiondialogWindowcloseProfile[0][0] == "T" && mode == 0 ) ? this.overriddenShellModalDialogClose : defaultShellModalDialogCloseAnimationFunction;      
      }
           
    }
  
  }
  
  undoChanges () {

    if(this.extensionManagerSignalHandler) {
      Main.extensionManager.disconnect(this.extensionManagerSignalHandler);
    } 

    if(this.dashAppIconUpdateTimeoutID[0] != null) {
      GLib.source_remove(this.dashAppIconUpdateTimeoutID[0]);
      this.dashAppIconUpdateTimeoutID[0] = null;
    }

    if(this.dashAppIconUpdateTimeoutID[1] != null) {
      GLib.source_remove(this.dashAppIconUpdateTimeoutID[1]);
      this.dashAppIconUpdateTimeoutID[1] = null;
    }
    
    if(this.windowStopMovingEffectsTimeoutID != null) {
      GLib.source_remove(this.windowStopMovingEffectsTimeoutID);
      this.windowStopMovingEffectsTimeoutID = null;
    }

    (this.onOpeningSig)      ? global.window_manager.disconnect(this.onOpeningSig)      : null;
    (this.onClosingSig)      ? global.window_manager.disconnect(this.onClosingSig)      : null;
    (this.onMinimizingSig)   ? global.window_manager.disconnect(this.onMinimizingSig)   : null;
    (this.onUnminimizingSig) ? global.window_manager.disconnect(this.onUnminimizingSig) : null;
    
    if(this.focussingEffectEnabled || this.defocussingEffectEnabled) {
      global.display.disconnect( this.focussingDefocussingSig );
      global.window_manager.disconnect( this.switchWorkspaceSig );
      global.display.disconnect( this.restackedSig );
    }

    if(this.onMovingStartSig) {
      global.display.disconnect(this.onMovingStartSig);
      global.display.disconnect(this.onMovingEndSig);
    }

    Main.layoutManager.uiGroup.disconnect(this.popUpMenuManagerSig); 
    Main.overview._overview.dash._box.disconnect(this.dashActorSignal);
    Main.osdWindowManager._showOsdWindow = defaultPadOSDShow;
    Main.wm._windowMenuManager.showWindowMenuForWindow = defaultShowWindowMenu;
    this.updateAddNotificationBannerEffects();
    this.updateShellWidgetAnimationFunctions(1);
    this.updateDashAppIconEffects(0, 1);
    if(this.eitherDashToDockOrDashToPanelSignalHandler != null && !this.dontDeactivate) {
      if(this.extension_DashToDock_AppIconsBox) {
        this.extension_DashToDock_AppIconsBox.disconnect(this.eitherDashToDockOrDashToPanelSignalHandler);
        this.updateDashAppIconEffects(1, 1, this.extension_DashToDock_AppIconsBox)
      }
      else if(this.extension_DashToPanel_AppIconsBox){
        this.extension_DashToPanel_AppIconsBox.disconnect(this.eitherDashToDockOrDashToPanelSignalHandler);
        this.updateDashAppIconEffects(1, 1, this.extension_DashToPanel_AppIconsBox)
      } 
      this.eitherDashToDockOrDashToPanelSignalHandler = null; 
    }    
    if(extensionState == "k") { // Only run if keyboard shortcut is enabled.
      Main.wm.removeKeybinding('disable-shortcut');
    }
    
  }

}

