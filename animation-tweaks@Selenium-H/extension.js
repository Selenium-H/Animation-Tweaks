/*

Version 12.10
=============

Credits:

This file is based on https://extensions.gnome.org/extension/367/window-slide-in/ by mengzhuo.
Rotation animations are based on code from https://extensions.gnome.org/extension/97/coverflow-alt-tab/ by p91paul
Notification animations are based on https://github.com/Selenium-H/Animation-Tweaks/issues/2#issuecomment-535698204 by JasonLG1979 

Some code was also adapted from the upstream Gnome Shell source code.   

Effect Format  [  |  S    Name     C       PPX       PPY       CX        CY        DL        T         OP        SX        SY        PX        PY        TZ        RX        RY        RZ        TRN  ]

Read the effectParameters.txt File for details.

Effect Lists Types - "window", "other",  "notificationbanner", "padosd"
Actions Strings    - "open",   "close",  "minimize",           "unminimize",   "focus",     "defocus", "movestart", "movestop" 
Item Types         - "normal", "dialog", "modaldialog",        "dropdownmenu", "popupmenu", "combo",   "tooltip",   "splashscreen", "overrideother", "notificationbanner", "padosd", "toppanelpopupmenu", "desktoppopupmenu"

SINGLE_TWEEN_PARAMETERS_LENGTH = 16;

*/

const AnimationMode      = imports.gi.Clutter.AnimationMode;
const ExtensionUtils     = imports.misc.extensionUtils;
const DefaultEffectsList = ExtensionUtils.getCurrentExtension().imports.defaultEffectsList;
const GLib               = imports.gi.GLib;
const Main               = imports.ui.main;
const Meta               = imports.gi.Meta;
const Shell              = imports.gi.Shell;

const defaultUpdateShowingNotification = Main.messageTray._updateShowingNotification;
const defaultHideNotification          = Main.messageTray._hideNotification;

const defaultBoxPointerOpenAnimationFunction  = Main.panel.statusArea.dateMenu.menu._boxPointer.open;
const defaultBoxPointerCloseAnimationFunction = Main.panel.statusArea.dateMenu.menu._boxPointer.close;

const defaultPadOSDShow = Main.osdWindowManager._showOsdWindow;

let effectsManager    = null;
let extensionSettings = null;

function enable() {

  effectsManager = new EffectsManager_AnimationTweaksExtension();
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
    
      default:
        return;
   
      case Meta.WindowType.NORMAL:
        parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
        eParams = this.normalWindowcloseProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          Main.wm._destroying.delete( parameters.actor );
          parameters.actor.remove_all_transitions();  
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "normal", 0, parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters ); 
          if( this.useModalDialogPositionProfiles && this.modalDialogNameList.indexOf(parameters.appName) >= 0) {
            let len = this.modalDialogPositionProfiles.length-5;
            while(len >= 0) {
              if(this.modalDialogPositionProfiles[len].substring(0, this.modalDialogPositionProfiles[len].indexOf("[")) == parameters.appName && this.modalDialogPositionProfiles[len+3] == "F1" ) {
                this.modalDialogPositionProfiles[len+3] = "F";
              }
              len -= 5;
            }
          }
        }
        return;

      case Meta.WindowType.DIALOG:     
        parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
        eParams = this.dialogWindowcloseProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          Main.wm._destroying.delete( parameters.actor );
          parameters.actor.remove_all_transitions();  
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "dialog", 0, parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );      
        }
        return;

      case Meta.WindowType.MODAL_DIALOG:
        parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);

        let index = this.modalDialogPositionProfiles.indexOf(parameters.appName+"["+currentMonitorIndex+"]"+window.title);
        if( index >= 0 && this.modalDialogPositionProfiles[index+3] == "R") {
          this.modalDialogPositionProfiles[index+1] = (parameters.actor.x - parseInt(this.modalDialogPositionProfiles[index+1])).toString();
          this.modalDialogPositionProfiles[index+2] = (parameters.actor.y - parseInt(this.modalDialogPositionProfiles[index+2])).toString();
          this.modalDialogPositionProfiles[index+3] = "A";
          (this.modalDialogPositionProfiles[index+2] != "0" || this.modalDialogPositionProfiles[index+1] != "0") ? extensionSettings.set_strv("modal-dialog-position-profiles", this.modalDialogPositionProfiles) : this.modalDialogPositionProfiles.splice(index, 5);              
        }                
    
        eParams = this.modaldialogWindowcloseProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          Main.wm._destroying.delete( parameters.actor );
          parameters.actor.remove_all_transitions();            
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "modaldialog", 0, parameters.actor.x, parameters.actor.y ];
          parameters.actor._parentDestroyId = window.get_transient_for().connect('unmanaged', () => {
           parameters.actor.remove_all_transitions();
            this.animationDone( parameters );
          });
          this.driveWindowAnimation( eParams, parameters );      
        }
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
   
    if(this.focusWindow != null && this.doFocusAndDefocus == true && this.defocussingEffectEnabled == true && !Main.overview._shown ) {
    
      parameters.actor = this.focusWindow.get_compositor_private();
      let window = parameters.actor.meta_window;
      parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();
      parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);

      switch(window.window_type) {
    
        default:
          break;

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
    
    if((this.focusWindow = global.display.focus_window) != null && this.doFocusAndDefocus == true && this.focussingEffectEnabled   == true && !Main.overview._shown ) {
        
      parametersFocus.actor = this.focusWindow.get_compositor_private();
      let window = parametersFocus.actor.meta_window;
      parametersFocus.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();
      parametersFocus.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parametersFocus.appName)+1);
      parametersFocus.action = "focus";
     
      switch(window.window_type) {
    
        default:
          break;

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

    [ this.doFocusAndDefocus, window ] = [ false, window.meta_window ];
    
    switch(window.window_type) {
    
      default:
        return;

      case Meta.WindowType.NORMAL:
        parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1); 
        eParams = this.normalWindowminimizeProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          Main.wm._minimizing.delete( parameters.actor );
          this.pendingMinimize.add(parameters.actor);
          parameters.actor.remove_all_transitions();   
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "normal", 0, parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );
        }
        return;

      case Meta.WindowType.DIALOG:
        parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
        eParams = this.dialogWindowminimizeProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          Main.wm._minimizing.delete( parameters.actor );
          this.pendingMinimize.add(parameters.actor);
          parameters.actor.remove_all_transitions();   
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "dialog", 0, parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );
        }
        return;                 

      case Meta.WindowType.MODAL_DIALOG:      
        parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();  
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
        eParams = this.modaldialogWindowminimizeProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {
          Main.wm._minimizing.delete( parameters.actor );
          this.pendingMinimize.add(parameters.actor);
          parameters.actor.remove_all_transitions();   
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.subeffectNo, eParams[0], eParams[1] ] = [ eParams[1], "modaldialog", 0, parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );
        }
        return;                 

    }
    
  }

  addWindowOpeningEffects ( window, currentMonitorIndex = 0, useApplicationProfilesForThisAction = false ) {

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
    
      default:
        return;
      
      case Meta.WindowType.NORMAL:
        parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1); 
        eParams = this.normalWindowopenProfile[parameters.profileIndex].slice(0); 
        if(eParams[0] == "T" ) {
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry();    
          [ parameters.effectName, parameters.itemType, parameters.listType ] = [ eParams[1], "normal", "window" ];
          if(window.is_monitor_sized()) {
            [eParams[0], eParams[12], eParams[1], eParams[13]] = [0, "C"+eParams[12], 0, "C"+eParams[13]];
          }
          else {
            [ eParams[0], eParams[12] ] = (window.maximized_horizontally) ? [ 0,                                                                    "C"+eParams[12]]: [ parameters.actor.x, eParams[12]]; 
            [ eParams[1], eParams[13] ] = (window.maximized_vertically)   ? [ (Main.layoutManager.panelBox.y + Main.layoutManager.panelBox.height), "C"+eParams[13]]: [ parameters.actor.y, eParams[13]];
          } 
          this.driveWindowAnimation( eParams, parameters );  
        }
        return;
        
      case Meta.WindowType.DIALOG:
        parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1); 
        eParams = this.dialogWindowopenProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {        
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.listType ] = [ eParams[1], "dialog", "window" ];
          this.driveWindowAnimation( eParams, parameters );  
        }
        return;

      case Meta.WindowType.MODAL_DIALOG:
        parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name();  
        parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1); 
        eParams = this.modaldialogWindowopenProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T" ) {        
          parameters.actor.set_opacity(0);
          parameters.actor.remove_all_transitions();
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, parameters.listType ] = [ eParams[1], "modaldialog", "window" ];
          if( this.useModalDialogPositionProfiles && this.modalDialogNameList.indexOf(parameters.appName ) >= 0) {
            let index = this.modalDialogPositionProfiles.indexOf(parameters.appName +"["+currentMonitorIndex+"]"+window.title); 
            if(index < 0 && this.autodetectMisplacedModalDialogs) {
              this.modalDialogPositionProfiles.push(parameters.appName +"["+currentMonitorIndex+"]"+window.title);
              this.modalDialogPositionProfiles.push(parameters.actor.x.toString());
              this.modalDialogPositionProfiles.push(parameters.actor.y.toString());
              this.modalDialogPositionProfiles.push("R");
              this.modalDialogPositionProfiles.push("A");
              [eParams[0],eParams[1]] = [parameters.actor.x,parameters.actor.y];
            }
            else if (this.modalDialogPositionProfiles[index + 3] == "R"){
              this.modalDialogPositionProfiles[index+1] = (parameters.actor.x);
              this.modalDialogPositionProfiles[index+2] = (parameters.actor.y);
              [eParams[0],eParams[1]] = [parameters.actor.x,parameters.actor.y];
            } 
            else if (this.modalDialogPositionProfiles[index + 3] == "I" || this.modalDialogPositionProfiles[index + 3] == "G1" || this.modalDialogPositionProfiles[index + 3] == "F1"){
              [eParams[0],eParams[1]] = [parameters.actor.x, parameters.actor.y];
            }
            else {
              if(this.modalDialogPositionProfiles[index + 3] == "G") { 
                this.modalDialogPositionProfiles[index + 3] = "G1";
              }
              else if(this.modalDialogPositionProfiles[index + 3] == "F") { 
                this.modalDialogPositionProfiles[index + 3] = "F1";
              }  
              eParams[12] = "C"+eParams[12];
              eParams[13] = "C"+eParams[13];
              eParams[0] = parameters.actor.x + parseInt(this.modalDialogPositionProfiles[index+1]);
              eParams[1] = parameters.actor.y + parseInt(this.modalDialogPositionProfiles[index+2]);
            }
          }
          else {
            [eParams[0],eParams[1]] = [parameters.actor.x, parameters.actor.y];
          }
          this.driveWindowAnimation( eParams, parameters );  
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
        return;

    }
  
  }
  
  addWindowStartMovingEffects ( window, op, currentMonitorIndex=0, useApplicationProfilesForThisAction = false ) { 

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
    
      parameters.actor = window.get_compositor_private();
      window = parameters.actor.meta_window;
      parameters.appName = Shell.WindowTracker.get_default().get_window_app(window).get_name(); 
      parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
      
      switch(window.window_type) {
    
        default:
          break;

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
          break;
      }

    }   
    
  }
  
  addWindowStopMovingEffects ( window, op, currentMonitorIndex=0, useApplicationProfilesForThisAction = false ) { 

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
    
      parameters.actor = window.get_compositor_private();
      window = parameters.actor.meta_window;
      parameters.appName      = Shell.WindowTracker.get_default().get_window_app(window).get_name();
      parameters.profileIndex = (this.useApplicationProfiles && useApplicationProfilesForThisAction)*(this.nameList.indexOf(parameters.appName)+1);
      
      switch(window.window_type) {
    
        default:
          break;

        case Meta.WindowType.NORMAL:
          eParams = this.normalWindowmovestopProfile[parameters.profileIndex].slice(0);
          if(eParams[0] == "T" ) {
            parameters.actor.remove_all_transitions();
            [ parameters.effectName, parameters.itemType, parameters.subeffectNo ] = [ eParams[1], "normal", eParams[2]/2 ];        
            this.driveOtherAnimation( eParams, parameters ); 
          }
          break;

        case Meta.WindowType.DIALOG:
          eParams = this.dialogWindowmovestopProfile[parameters.profileIndex].slice(0);          
          if(eParams[0] == "T" ) {
            parameters.actor.remove_all_transitions();
            [ parameters.effectName, parameters.itemType, parameters.subeffectNo ] = [ eParams[1], "dialog", eParams[2]/2 ];        
            this.driveOtherAnimation( eParams, parameters ); 
          }
          break;

        case Meta.WindowType.MODAL_DIALOG:
          eParams = this.modaldialogWindowmovestopProfile[parameters.profileIndex].slice(0);          
          if(eParams[0] == "T" ) {
            parameters.actor.remove_all_transitions();
            [ parameters.effectName, parameters.itemType, parameters.subeffectNo ] = [ eParams[1], "modaldialog", eParams[2]/2 ];        
            this.driveOtherAnimation( eParams, parameters ); 
          }
          break;
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

    this.doFocusAndDefocus = false;
    window                 = window.meta_window;
    
    switch(window.window_type) {
    
      default:
        return;

      case Meta.WindowType.NORMAL:
        eParams = this.normalWindowunminimizeProfile[parameters.profileIndex].slice(0);
        if(eParams[0] == "T"  && !Main.overview._shown) {
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
          if(this.pendingMinimize.delete(parameters.actor)) {
            Main.wm._shellwm.completed_minimize(parameters.actor);
          }        
          Main.wm._unminimizeWindowDone(Main.wm._shellwm, parameters.actor);
          parameters.actor.set_opacity(0); 
          [ parameters.sucess, parameters.geom ] = window.get_icon_geometry(); 
          [ parameters.effectName, parameters.itemType, eParams[0], eParams[1] ] = [ eParams[1], "modaldialog", parameters.actor.x, parameters.actor.y ];
          this.driveWindowAnimation( eParams, parameters );
        }       
        return;             
         
    }
  }
        
  animationDone ( parameters ) {
  
    switch(parameters.action+parameters.itemType) {

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
        parameters.actor._muteInput = false; 
        if(parameters.itemObject) {
          parameters.itemObject();
        }
        this.refreshItemActor(parameters.actor, "hide", "show");
        break;
        
      case "closedesktoppopupmenu":
      case "closetoppanelpopupmenu":
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
      case "openother":
        this.refreshItemActor(parameters.actor, "hide", "show");
        break;

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
      [ this[ parameters.itemType+"Window"+parameters.action+"Profile"][parameters.profileIndex], this[ parameters.itemType+"Window"+parameters.action+"Profile"][parameters.profileIndex][0], this[ parameters.itemType+"Window"+parameters.action+"Profile"][parameters.profileIndex][1] ] = [this.extractEffectAtIndex(DefaultEffectsList[parameters.listType+parameters.action+"EffectsList"], Math.floor(Math.random()*(DefaultEffectsList[parameters.listType+parameters.action+"EffectsListLastIndex"])) ), "T", "Random" ];
    }
    
  }
  
  connectPanelMenusAndOverrideBoxPinterAnimationFunctions ( openStatus, closeStatus ) {

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
          (Main.panel.statusArea[panelMenues[--i]].menu._boxPointer) ? Main.panel.statusArea[panelMenues[i]].menu._boxPointer.open = defaultBoxPointerOpenAnimationFunction : null;
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

  driveNotificationBannerAnimation ( action, subEffectNo=0, eParams, xRes, yRes ) { 
 
    let startIndex = subEffectNo*16 + 3;   // TWEEN_PARAMETERS_LENGTH
    let onCompleteF = (eParams[2] == subEffectNo+1) ? ()=> {effectsManager.animationDone({ actor: Main.messageTray._bannerBin, action: action, appName: "", profileIndex: 0, effectName: eParams[1], itemType:"notificationbanner", listType:"other"});} :()=> {effectsManager.driveNotificationBannerAnimation(action, subEffectNo+1,eParams,xRes,yRes);}
    
    if(action == "open" && Main.messageTray._bannerBin.x != 0 ) {
      Main.messageTray.bannerAlignment = 1;
    }

    Main.messageTray._bannerBin.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++] );
    startIndex += 2;
    Main.messageTray._bannerBin.remove_all_transitions();
    Main.messageTray.bannerAlignment = effectsManager.notificationBannerAlignment;
    Main.messageTray._bannerBin.ease({
      delay:            eParams[startIndex++],
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
      mode:             AnimationMode[eParams[startIndex++]],
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
              mode: AnimationMode.EASE_OUT_QUAD,
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
            mode: AnimationMode.EASE_OUT_QUAD,
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
        duration:          eParams[startIndex++]*1000,
        opacity:           eParams[startIndex++],
        scale_x:           eParams[startIndex++],
        scale_y:           eParams[startIndex++],         
        translation_z:     eParams[skippedPosIndex++]*parameters.yRes,           
        rotation_angle_x:  eParams[skippedPosIndex++],
        rotation_angle_y:  eParams[skippedPosIndex++],           
        rotation_angle_z:  eParams[skippedPosIndex++],
        mode:              AnimationMode[eParams[skippedPosIndex++]],
        onComplete:        ()=>this.driveOtherAnimation( eParams, parameters ),
      });  
     
      return;
    }
   
    parameters.actor.ease({
      delay:             eParams[startIndex++],
      duration:          eParams[startIndex++]*1000,
      opacity:           eParams[startIndex++],
      scale_x:           eParams[startIndex++],
      scale_y:           eParams[startIndex++],
      translation_x:     eParams[startIndex++]*parameters.xRes,           
      translation_y:     eParams[startIndex++]*parameters.yRes,           
      translation_z:     eParams[startIndex++]*parameters.yRes,
      rotation_angle_x:  eParams[startIndex++],
      rotation_angle_y:  eParams[startIndex++],           
      rotation_angle_z:  eParams[startIndex++],
      mode:              AnimationMode[eParams[startIndex++]],
      onComplete:        ()=>this.driveOtherAnimation( eParams, parameters )
    });  
   
  }

  driveWindowAnimation ( eParams, parameters ) { 

    if(eParams[2] == parameters.subeffectNo) {
      this.animationDone( parameters );
      return;
    }
    
    let startIndex = (parameters.subeffectNo++)*16 + 3; // TWEEN_PARAMETERS_LENGTH 
    this.setNextParametersWindow( eParams, parameters, startIndex+7 );
    parameters.actor.set_pivot_point( eParams[startIndex++] ,eParams[startIndex++]);        
    startIndex += 2;
        
    parameters.actor.ease({
      delay:             eParams[startIndex++],
      duration:          eParams[startIndex++]*1000,
      opacity:           eParams[startIndex++],
      scale_x:           eParams[startIndex++],
      scale_y:           eParams[startIndex++],
      x:                 eParams[startIndex++],           
      y:                 eParams[startIndex++],           
      translation_z:     eParams[startIndex++]*parameters.yRes,           
      rotation_angle_x:  eParams[startIndex++],
      rotation_angle_y:  eParams[startIndex++],           
      rotation_angle_z:  eParams[startIndex++],
      mode:              AnimationMode[eParams[startIndex++]],
      onComplete:        ()=> this.driveWindowAnimation ( eParams, parameters ) 
    });  
 
  }
  
  extensionDisableShortcut() {

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

  }

  extractEffect ( effectList,startIndex,endIndex ) {
  
    let eStr=[];
  
    while(startIndex <= endIndex) {
      eStr.push(effectList[startIndex]);
      startIndex++;
    }
    
    return eStr;
  
  }

  extractEffectAtIndex ( effectsListRaw,index ) {
  
    let startIndex = 0;
    
    while(index > 0) {
      startIndex = effectsListRaw.indexOf("|", startIndex+1);
      index--;
    }

    return this.extractEffect(effectsListRaw,startIndex, this.getEndIndex(effectsListRaw,startIndex));
  
  }

  getEffectFor ( appName,effectsListRaw ) {
    
    let appIndex = (this.nameList.indexOf(appName)+1)*this.useApplicationProfiles;        
    let effectIndex = 0;
    let startIndex = 0;

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

  loadPreferences() {

    this.openingEffectEnabled      = extensionSettings.get_boolean("opening-effect");
    this.closingingEffectEnabled   = extensionSettings.get_boolean("closing-effect");
    this.minimizingEffectEnabled   = extensionSettings.get_boolean("minimizing-effect");
    this.unMinimizingEffectEnabled = extensionSettings.get_boolean("unminimizing-effect");
    this.movingEffectEnabled       = extensionSettings.get_boolean("moving-effect");
    this.focussingEffectEnabled    = extensionSettings.get_boolean("focussing-effect");
    this.defocussingEffectEnabled  = extensionSettings.get_boolean("defocussing-effect");
    
    this.doFocusAndDefocus = true;
    this.focusWindow = null;
    
    this.pendingMinimize = new Set();
    
    this.loadProfilePrefs();

  } 
  
  loadProfilePrefs () {
  
    this.useApplicationProfiles = extensionSettings.get_boolean("use-application-profiles");
    this.nameList = extensionSettings.get_strv("name-list");

    this.useModalDialogPositionProfiles  = extensionSettings.get_boolean("use-modaldialog-position-profiles");
    this.modalDialogNameList             = extensionSettings.get_strv("modal-dialog-name-list");
    this.modalDialogPositionProfiles     = extensionSettings.get_strv("modal-dialog-position-profiles")
    this.autodetectMisplacedModalDialogs = extensionSettings.get_boolean("autodetect-misplaced-modal-dialogs");

    let len = this.modalDialogPositionProfiles.length-2;
    while(len >= 0) {
      if(this.modalDialogPositionProfiles[len+3] == "F1" ) {
        this.modalDialogPositionProfiles[len] = "F";
      }
      if(this.modalDialogPositionProfiles[len+3] == "G1" ) {
        this.modalDialogPositionProfiles[len] = "G";
      }
      len -= 5;
    }
      
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
    
    this.dropdownmenuWindowopenProfile  = [extensionSettings.get_strv("dropdownmenu-open")];
    this.popupmenuWindowopenProfile     = [extensionSettings.get_strv("popupmenu-open")];
    this.comboWindowopenProfile         = [extensionSettings.get_strv("combo-open")];
    this.splashscreenWindowopenProfile  = [extensionSettings.get_strv("splashscreen-open")];
    this.tooltipWindowopenProfile       = [extensionSettings.get_strv("tooltip-open")];
    this.overrideotherWindowopenProfile = [extensionSettings.get_strv("overrideother-open")];    

    this.notificationbannerWindowopenProfile  = [extensionSettings.get_strv("notificationbanner-open")];
    this.notificationbannerWindowcloseProfile = [extensionSettings.get_strv("notificationbanner-close")];
    this.notificationBannerAlignment          = extensionSettings.get_enum("notificationbanner-pos");  
    
    this.padosdWindowopenProfile  = [extensionSettings.get_strv("padosd-open")];
    this.padosdWindowcloseProfile = [extensionSettings.get_strv("padosd-close")];
    
    this.toppanelpopupmenuWindowopenProfile  = [extensionSettings.get_strv("toppanelpopupmenu-open")]; 
    this.toppanelpopupmenuWindowcloseProfile = [extensionSettings.get_strv("toppanelpopupmenu-close")]; 
    
    this.desktoppopupmenuWindowopenProfile  = [extensionSettings.get_strv("desktoppopupmenu-open")]; 
    this.desktoppopupmenuWindowcloseProfile = [extensionSettings.get_strv("desktoppopupmenu-close")];     
    
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

    this.updateAddPadOSDEffects(             this.padosdWindowopenProfile[0][0],             this.padosdWindowcloseProfile[0][0]             ); 
    this.updateAddNotificationBannerEffects( this.notificationbannerWindowopenProfile[0][0], this.notificationbannerWindowcloseProfile[0][0] );
    this.updateAddTopPanelPopUpMenuEffects(  this.toppanelpopupmenuWindowopenProfile[0][0], this.toppanelpopupmenuWindowcloseProfile[0][0]   );
    this.updateAddDesktopPopUpMenuEffects(   this.desktoppopupmenuWindowopenProfile[0][0],   this.desktoppopupmenuWindowcloseProfile[0][0]   );
        
    if(this.useApplicationProfiles) {
    
      let listLength = this.nameList.length;
      for(let i=0;i<listLength;i++) { 
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
 
  restoreTopPanelEffects () {
   
    let [ panelMenues, i ] = [ Object.getOwnPropertyNames(Main.panel.statusArea), panelMenues.length ];
 
    if(this.desktoppopupmenuWindowopenProfile[0][0] == "T" || this.desktoppopupmenuWindowcloseProfile[0][0] == "T") {
      Main.panel._leftBox.disconnect(this.panelBoxSignalHandlers[0]);
      Main.panel._centerBox.disconnect(this.panelBoxSignalHandlers[1]);
      Main.panel._rightBox.disconnect(this.panelBoxSignalHandlers[2]);
    }
          
    while(i>0) {
      (Main.panel.statusArea[panelMenues[--i]].menu._boxPointer) ? Main.panel.statusArea[panelMenues[i]].menu._boxPointer.open = defaultBoxPointerOpenAnimationFunction   : null;
      (Main.panel.statusArea[panelMenues[i]].menu._boxPointer)   ? Main.panel.statusArea[panelMenues[i]].menu._boxPointer.close = defaultBoxPointerCloseAnimationFunction : null;
    }  
   
  }

  setNextParametersWindow ( eParams, parameters, pIndex ) {

    let correctedPosition = parameters.actor.x;

    eParams[pIndex]   = (eParams[pIndex]!="MW") ? eParams[pIndex] : (parameters.sucess) ? parameters.geom.width/parameters.actor.width   : (parameters.xRes*0.05)/parameters.actor.width;
    eParams[++pIndex] = (eParams[pIndex]!="MH") ? eParams[pIndex] : (parameters.sucess) ? parameters.geom.height/parameters.actor.height : (parameters.yRes*0.05)/parameters.actor.height;
    
    if(eParams[++pIndex][0] == "C") {
      eParams[pIndex] = eParams[pIndex].substring(1,eParams[pIndex].length);
      correctedPosition = eParams[0];
    }

    switch(eParams[pIndex][0]) {

      case "L" :
        eParams[pIndex] = 0-parameters.actor.width;
        break;
        
      case "R" :
        eParams[pIndex] = (parameters.sucess) ? parameters.geom.x:parameters.xRes ;
        break;

      case "M" :
        eParams[pIndex] = (parameters.sucess) ? parameters.geom.x:parameters.xRes/2;
        break;

      case "S" :
        eParams[pIndex] = correctedPosition;
        break;

      case "I" :
        eParams[pIndex] = eParams[0];
        break; 

      default:
        eParams[pIndex] = correctedPosition + parseFloat(eParams[pIndex])*parameters.xRes;
        
    }

    if(eParams[++pIndex][0] == "C") {
      eParams[pIndex] = eParams[pIndex].substring(1,eParams[pIndex].length);
      correctedPosition = eParams[1];
    }
    else {
      correctedPosition = parameters.actor.y;
    }

    switch(eParams[pIndex][0]) {
        
      case "U" :
        eParams[pIndex] = 0-parameters.actor.height;
        break;

      case "D" :
        eParams[pIndex] = (parameters.sucess) ? parameters.geom.y:parameters.yRes ;
        break;

      case "M" :
        eParams[pIndex] = (parameters.sucess) ? parameters.geom.y:parameters.yRes/2 ;
        break;

      case "S" :
        eParams[pIndex] = correctedPosition;
        break;

      case "I" :
        eParams[pIndex] = eParams[1];
        break; 

      default :
        eParams[pIndex] = correctedPosition + parseFloat(eParams[pIndex])*parameters.yRes;
        
    }
    
  }

  startEffectsManager () {

    this.extensionDisableShortcut();
   
    if(extensionSettings.get_int("current-version") <= 10) {    
      Main.notify("Animation Tweaks","Extension is updated. A reset is needed. Please reset the extension");
      return;
    }

    this.panelBoxSignalHandlers = [];
    this.loadPreferences();
     
    this.onOpeningSig      = (this.openingEffectEnabled)      ? global.window_manager.connect("map",        (swm,actor) => this.addWindowOpeningEffects(actor,      global.display.get_current_monitor(), true)) : null;
    this.onClosingSig      = (this.closingingEffectEnabled)   ? global.window_manager.connect("destroy",    (swm,actor) => this.addWindowClosingEffects(actor,      global.display.get_current_monitor(), true)) : null;
    this.onMinimizingSig   = (this.minimizingEffectEnabled)   ? global.window_manager.connect("minimize",   (swm,actor) => this.addWindowMinimizingEffects(actor,   global.display.get_current_monitor(), true)) : null;
    this.onUnminimizingSig = (this.unMinimizingEffectEnabled) ? global.window_manager.connect("unminimize", (swm,actor) => this.addWindowUnminimizingEffects(actor, global.display.get_current_monitor(), true)) : null;
         
    if(this.focussingEffectEnabled || this.defocussingEffectEnabled) {
      this.focussingDefocussingSig = global.display.connect('notify::focus-window',()=>this.addWindowFocussingEffects(global.display.get_current_monitor()));
      this.switchWorkspaceSig      = global.window_manager.connect('switch-workspace', ()=> {this.doFocusAndDefocus = false;});
      this.restackedSig            = global.display.connect('restacked', ()=> {this.doFocusAndDefocus = true;});
    }
    
    if(this.movingEffectEnabled) {
      this.onMovingStartSig = global.display.connect('grab-op-begin', (display, screen, window, op)=> this.addWindowStartMovingEffects(window, op, global.display.get_current_monitor()));
      this.onMovingEndSig   = global.display.connect('grab-op-end',   (display, screen, window, op)=> this.addWindowStopMovingEffects(window,  op, global.display.get_current_monitor()));
    }
       
  }

  updateAddDesktopPopUpMenuEffects ( openStatus = "F", closeStatus = "F" ) {

    Main.layoutManager._bgManagers[0].backgroundActor._backgroundMenu._boxPointer.open  = ( openStatus  == "T") ? this.driveDesktopMenuOpenAnimation  : defaultBoxPointerOpenAnimationFunction;   
    Main.layoutManager._bgManagers[0].backgroundActor._backgroundMenu._boxPointer.close = ( closeStatus == "T") ? this.driveDesktopMenuCloseAnimation : defaultBoxPointerCloseAnimationFunction;

  }
  
  updateAddNotificationBannerEffects ( openStatus = "F", closeStatus = "F" ) {
  
    if(this.notificationBannerAlignment != 0) {
      Main.messageTray.bannerAlignment = this.notificationBannerAlignment;
    }
    else {
      this.notificationBannerAlignment = Main.messageTray.bannerAlignment;
      extensionSettings.set_enum("notificationbanner-pos",Main.messageTray.bannerAlignment);
    }

    Main.messageTray._updateShowingNotification = (openStatus  =="T") ? this.overriddenUpdateShowingNotification : defaultUpdateShowingNotification;  
    Main.messageTray._hideNotification          = (closeStatus =="T") ? this.overriddenHideNotification          : defaultHideNotification;

  }
  
  updateAddPadOSDEffects ( openStatus = "F", closeStatus = "F" ) {
  
    ( openStatus =="T" || closeStatus =="T" ) ? Main.osdWindowManager._showOsdWindow = this.driveOSDAnimation : defaultPadOSDShow;

  }
  
  updateAddTopPanelPopUpMenuEffects ( openStatus = "F", closeStatus = "F" ) {
        
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
         
  }

  destroy () {

    (this.openingEffectEnabled)      ? global.window_manager.disconnect(this.onOpeningSig)      : null;
    (this.closingingEffectEnabled)   ? global.window_manager.disconnect(this.onClosingSig)      : null;
    (this.minimizingEffectEnabled)   ? global.window_manager.disconnect(this.onMinimizingSig)   : null;
    (this.unMinimizingEffectEnabled) ? global.window_manager.disconnect(this.onUnminimizingSig) : null;
    
    if(this.focussingEffectEnabled || this.defocussingEffectEnabled) {
      global.display.disconnect( this.focussingDefocussingSig );
      global.window_manager.disconnect( this.switchWorkspaceSig );
      global.display.disconnect( this.restackedSig );
    }

    if(this.movingEffectEnabled) {
      global.display.disconnect(this.onMovingStartSig);
      global.display.disconnect(this.onMovingEndSig);
    }

    this.updateAddPadOSDEffects(); 
    this.updateAddNotificationBannerEffects();
    this.updateAddDesktopPopUpMenuEffects();
    this.updateAddTopPanelPopUpMenuEffects();
    
    Main.wm.removeKeybinding('disable-shortcut');
    
  }

}

