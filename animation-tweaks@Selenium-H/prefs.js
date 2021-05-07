/*

Version 12.16
=============

Effect Format  [  |  S    Name     C       PPX       PPY       CX        CY        DL        T         OP        SX        SY        PX        PY        TZ        RX        RY        RZ        TRN  ]

Read the effectParameters.txt File for details.

*/

const Config            = imports.misc.config;
const Extension         = imports.misc.extensionUtils.getCurrentExtension();
const GLib              = imports.gi.GLib;

function init() {
}

function buildPrefsWidget() {

  let gtkVersion = (Config.PACKAGE_VERSION >= "40") ? Extension.imports.prefsGtk4 : Extension.imports.prefsGtk3;
  gtkVersion.init();
  let widget = new gtkVersion.Prefs_AnimationTweaksExtension();   
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, ()=> {    
    new gtkVersion.ExtensionPreferencesWindow_AnimationTweaksExtension( widget );
    return false;
  });
 
  (Config.PACKAGE_VERSION >= "40") ? null : widget.show_all();  
  return widget;  
  
}

