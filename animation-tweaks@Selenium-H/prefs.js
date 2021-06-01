/*

Version 13.00
=============

Effect Format  [  |  S    Name     C       PPX       PPY       CX        CY        DL        T         OP        SX        SY        PX        PY        TZ        RX        RY        RZ        TRN  ]

Read the effectParameters.txt File for details.

*/

const Extension     = imports.misc.extensionUtils.getCurrentExtension();
const GLib          = imports.gi.GLib;
const GNOME_VERSION = imports.misc.config.PACKAGE_VERSION;

function init() {
}

function buildPrefsWidget() {

  let prefsProgram = (GNOME_VERSION >= "40") ? Extension.imports.prefsGtk4 : Extension.imports.prefsGtk3;
  prefsProgram.init();
  let widget = new prefsProgram.Prefs_AnimationTweaksExtension();   
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, ()=> {    
    new prefsProgram.ExtensionPreferencesWindow_AnimationTweaksExtension( widget );
    return false;
  });
 
  (GNOME_VERSION >= "40") ? null : widget.show_all();  
  return widget;  
  
}

