/*

Version 13.02
=============

Effect Format  [  |  S    Name     C       PPX       PPY       CX        CY        DL        T         OP        SX        SY        PX        PY        TZ        RX        RY        RZ        TRN  ]

Read the effectParameters.txt File for details.

Credits:

This file is based on https://extensions.gnome.org/extension/1395/files-view/ by abakkk.
Application List is based on code from https://extensions.gnome.org/extension/258/notifications-alert-on-user-menu/ by hackedbellini

Some code was also adapted from the upstream Gnome Shell source code.   

*/

const ExtensionUtils    = imports.misc.extensionUtils;
const Extension         = ExtensionUtils.getCurrentExtension();
const DefaultEffectList = Extension.imports.defaultEffectsList;
const Metadata          = Extension.metadata;
const Gettext           = imports.gettext;
const Gio               = imports.gi.Gio;
const GLib              = imports.gi.GLib;
const GObject           = imports.gi.GObject;
const Gtk               = imports.gi.Gtk;
const Lang              = imports.lang;
const _                 = Gettext.domain("animation-tweaks").gettext;

const TWEEN_PARAMETERS_LENGTH = 16;

const PROFILE_FILE_NAME = "animationTweaksExtensionProfiles.js"; 
const SETTINGS_APPLY_DELAY_TIME = 500;   
    
let settings = null;
let reloadApplicationProfileAfterSomeTime = null;
let reloadExtensionAfterSomeTime          = null;

function init() {

  ExtensionUtils.initTranslations("animation-tweaks");
  settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.animation-tweaks");
  
}

function reloadExtension () {

  if(reloadExtensionAfterSomeTime != null) {
      GLib.source_remove(reloadExtensionAfterSomeTime);
      reloadExtensionAfterSomeTime = null;
  }

  if(reloadApplicationProfileAfterSomeTime != null) {
      GLib.source_remove(reloadApplicationProfileAfterSomeTime);
      reloadApplicationProfileAfterSomeTime = null;
  }
 
  reloadExtensionAfterSomeTime = GLib.timeout_add(GLib.PRIORITY_DEFAULT, SETTINGS_APPLY_DELAY_TIME, ()=> {
    settings.set_boolean("reload-signal", (settings.get_boolean("reload-signal")) ? false : true ); 
    settings.set_boolean("current-profile-modified", true);
    reloadExtensionAfterSomeTime = null;
  });
    
}

function reloadApplicationProfiles() {

  if(reloadApplicationProfileAfterSomeTime != null) {
    GLib.source_remove(reloadApplicationProfileAfterSomeTime);
    reloadApplicationProfileAfterSomeTime = null;
  }

  reloadApplicationProfileAfterSomeTime = GLib.timeout_add(GLib.PRIORITY_DEFAULT, SETTINGS_APPLY_DELAY_TIME, ()=> {
    settings.set_boolean("reload-profiles-signal", (settings.get_boolean("reload-profiles-signal")) ? false : true );
    settings.set_boolean("current-profile-modified", true);
    reloadApplicationProfileAfterSomeTime = null;
  });

}

const ExtensionPreferencesWindow_AnimationTweaksExtension = new GObject.Class({

  Name: 'ExtensionPreferencesWindow_AnimationTweaksExtension',

  _init: function( widget ) {
  
    this.toplevel  = widget.get_toplevel();
    this.headerBar = this.toplevel.get_titlebar();
    this.headerBar.custom_title = new Gtk.StackSwitcher({expand:true, halign: Gtk.Align.CENTER, visible: true, stack: widget});
    this.createAppMenu();  
    this.createRefreshButton();  
    
  },
  
  createAppMenu: function( ) {
      
    let preferencesDialogAction = new Gio.SimpleAction({ name: 'app.preferences'});  
    let helpDialogAction        = new Gio.SimpleAction({ name: 'app.help'});
    let aboutDialogAction       = new Gio.SimpleAction({ name: 'app.about'});
    let actionGroup             = new Gio.SimpleActionGroup();
    let menu                    = new Gio.Menu();
    let appMenu                 = new Gtk.PopoverMenu();
    let appMenuButton           = new Gtk.MenuButton({ popover: appMenu, image: new Gtk.Image({ gicon: new Gio.ThemedIcon({ name: "open-menu-symbolic" }), icon_size: Gtk.IconSize.BUTTON, visible: true, }), visible:true});
    
    actionGroup.add_action(aboutDialogAction)
    actionGroup.add_action(helpDialogAction)
    actionGroup.add_action(preferencesDialogAction)

    menu.append(_("Preferences"),               "app.preferences");
    menu.append(_("Help"),                      "app.help"       );
    menu.append(_("About")+" Animation Tweaks", "app.about"      );

    appMenu.bind_model(menu, "app"); 
        
    this.headerBar.pack_end(appMenuButton);
    this.toplevel.insert_action_group('app', actionGroup);    
    
    preferencesDialogAction.connect('activate', ()=> {
      let dialog = new Gtk.Dialog({ title: _("Preferences"),transient_for: this.toplevel,use_header_bar: true, modal: true });
      let vbox                  = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 30 });    
      this.resetExtensionButton = new ExtensionResetButton_AnimationTweaksExtension(this.toplevel );
      vbox.pack_start(this.resetExtensionButton, false, false, 0);
      dialog.get_content_area().pack_start(vbox, false, false, 0);  
      dialog.show_all();  
    });

    helpDialogAction.connect('activate', ()=> {
      let dialog    = new Gtk.Dialog({ title: _("Help"), transient_for: this.toplevel, use_header_bar: true, modal: true });
      let vbox      = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 30 });    
      let firstInfo = new Gtk.Label({ justify: 0, use_markup: true, label: _(Metadata.description)});  
      vbox.pack_start(firstInfo,            false, false, 0);
      dialog.get_content_area().pack_start(vbox, false, false, 0);  
      dialog.show_all();  
    });    

    aboutDialogAction.connect('activate', ()=> {  
      let aboutDialog = new Gtk.AboutDialog({ transient_for: this.toplevel, modal: true, logo: (new Gtk.Image({ file: Extension.dir.get_child('eicon.png').get_path(), pixel_size: 128 })).get_pixbuf(), program_name: Extension.metadata.name, version: Extension.metadata.version.toString()+_(Extension.metadata.status), comments: _(Extension.metadata.comment), license_type: 3    } );
      aboutDialog.get_header_bar().get_custom_title().visible = true;
      aboutDialog.show_all();      
    });
    
    appMenu.connect("button-release-event", ()=> {
      appMenu.popdown();
    });
            
  },
  
  createRefreshButton: function() {
  
    let refreshButton = new Gtk.Button({ image: new Gtk.Image({ gicon: new Gio.ThemedIcon({ name: "view-refresh-symbolic" }), icon_size: Gtk.IconSize.BUTTON, visible: true, }), visible:true}); 
    refreshButton.connect('clicked', ()=> {
      reloadExtension();
    });
    this.headerBar.pack_start(refreshButton);

  },  
  
});

const ExtensionResetButton_AnimationTweaksExtension =  new GObject.Class({

  Name: 'ExtensionResetButton_AnimationTweaksExtension',

  _init: function( object ) {
    
    this.resetExtensionButton = new Gtk.Button({label: _("Reset Animation Tweaks Extension"),halign:Gtk.Align.CENTER});
    this.resetExtensionButton.connect('clicked', ()=> { this.resetExtension( object, "updateDone", true ) });    
    return this.resetExtensionButton;
    
  },
  
  resetExtension: function( object, functionToBeCalledAtTheEnd, parameter ) {
  
    let dialog = new Gtk.MessageDialog({ transient_for: object.get_toplevel ? object.get_toplevel() : object, modal: true });  
    dialog.set_default_response(Gtk.ResponseType.OK);
    dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    dialog.add_button(Gtk.STOCK_OK, Gtk.ResponseType.OK);
    dialog.set_markup("<big><b>"+_("Reset Animation Tweaks to defaults?")+"</b></big>");
    dialog.get_message_area().pack_start(new Gtk.Label({ wrap: true, justify: 3, use_markup: true, label: _("Resetting the extension will discard the current preferences configuration and restore default one.")}), true, true, 0);
    dialog.connect('response', Lang.bind(this, function(dialog, id) {
      if(id != Gtk.ResponseType.OK) {
        dialog.destroy();  
        return;
      }      
      settings.reset('normal-open');
      settings.reset('normal-close');
      settings.reset('normal-minimize');
      settings.reset('normal-unminimize');
      settings.reset('normal-movestart');
      settings.reset('normal-focus');
      settings.reset('normal-defocus');
      settings.reset('dialog-open');
      settings.reset('dialog-close');
      settings.reset('dialog-minimize');
      settings.reset('dialog-unminimize');
      settings.reset('dialog-movestart');
      settings.reset('dialog-focus');
      settings.reset('dialog-defocus');
      settings.reset('modaldialog-open');
      settings.reset('modaldialog-close');
      settings.reset('modaldialog-minimize');
      settings.reset('modaldialog-unminimize');
      settings.reset('modaldialog-movestart');
      settings.reset('modaldialog-focus');    
      settings.reset('modaldialog-defocus');    
      settings.reset('dropdownmenu-open');
      settings.reset('popupmenu-open');
      settings.reset('combo-open');
      settings.reset('splashscreen-open');
      settings.reset('tooltip-open');
      settings.reset('overrideother-open');
      settings.reset("notificationbanner-open");
      settings.reset("notificationbanner-close");
      settings.reset("padosd-open");
      settings.reset("padosd-close");
      settings.reset("toppanelpopupmenu-open");
      settings.reset("toppanelpopupmenu-close"); 
      settings.reset("desktoppopupmenu-open");
      settings.reset("desktoppopupmenu-close");    
      settings.reset("windowmenu-open");
      settings.reset("windowmenu-close");        
      settings.reset("endsessiondialog-open");
      settings.reset("endsessiondialog-close");                  
      settings.reset('opening-effect');
      settings.reset('closing-effect');
      settings.reset("minimizing-effect");
      settings.reset("unminimizing-effect");
      settings.reset("moving-effect");
      settings.reset("focussing-effect");
      settings.reset("defocussing-effect");
      settings.reset("use-application-profiles");
      settings.reset("application-list");
      settings.reset("name-list");
      settings.reset('wayland');
      settings.reset("padosd-hide-timeout");
      //settings.reset('current-version');
      dialog.destroy();
      if(object[functionToBeCalledAtTheEnd]) {
        object[functionToBeCalledAtTheEnd]( parameter );
      }
      reloadExtension();
    }));
    dialog.show_all();
   
  },
  
})

const UpdatePage_AnimationTweaksExtension =  new GObject.Class({

  Name: 'UpdatePage_AnimationTweaksExtension',
  Extends: Gtk.ScrolledWindow,

  _init: function(profilesObject) {
  
    this.parent();
    this.profilesObject = profilesObject;
    
  },
  
  convertTimeToInteger: function() {  // Upgrade from 12.13 to 12.14 
  
    this.convertTimeToIntegerFor('normal-open');
    this.convertTimeToIntegerFor('normal-close');
    this.convertTimeToIntegerFor('normal-minimize');
    this.convertTimeToIntegerFor('normal-unminimize');
    this.convertTimeToIntegerFor('normal-movestart');
    this.convertTimeToIntegerFor('normal-focus');
    this.convertTimeToIntegerFor('normal-defocus');
    this.convertTimeToIntegerFor('dialog-open');
    this.convertTimeToIntegerFor('dialog-close');
    this.convertTimeToIntegerFor('dialog-minimize');
    this.convertTimeToIntegerFor('dialog-unminimize');
    this.convertTimeToIntegerFor('dialog-movestart');
    this.convertTimeToIntegerFor('dialog-focus');
    this.convertTimeToIntegerFor('dialog-defocus');
    settings.reset('modaldialog-open');
    settings.reset('modaldialog-close');
    settings.reset('modaldialog-minimize');
    settings.reset('modaldialog-unminimize');
    settings.reset('modaldialog-movestart');
    settings.reset('modaldialog-focus');    
    settings.reset('modaldialog-defocus');    
    this.convertTimeToIntegerFor('dropdownmenu-open');
    this.convertTimeToIntegerFor('popupmenu-open');
    this.convertTimeToIntegerFor('combo-open');
    this.convertTimeToIntegerFor('splashscreen-open');
    this.convertTimeToIntegerFor('tooltip-open');
    this.convertTimeToIntegerFor('overrideother-open');
    this.convertTimeToIntegerFor("notificationbanner-open");
    this.convertTimeToIntegerFor("notificationbanner-close");
    this.convertTimeToIntegerFor("padosd-open");
    this.convertTimeToIntegerFor("padosd-close");
    this.convertTimeToIntegerFor("toppanelpopupmenu-open");
    this.convertTimeToIntegerFor("toppanelpopupmenu-close"); 
    this.convertTimeToIntegerFor("desktoppopupmenu-open");
    this.convertTimeToIntegerFor("desktoppopupmenu-close");    
    this.convertTimeToIntegerFor("windowmenu-open");
    this.convertTimeToIntegerFor("windowmenu-close");        
    this.convertTimeToIntegerFor("endsessiondialog-open");
    this.convertTimeToIntegerFor("endsessiondialog-close");       
                  
  },
  
  convertTimeToIntegerFor: function(key) {

    let eStr = settings.get_strv(key);

    for (let cIndex = 9;cIndex<eStr.length;cIndex=cIndex+TWEEN_PARAMETERS_LENGTH) {
      if(eStr[cIndex].indexOf(".") > -1) {
        eStr[cIndex] = (parseFloat(eStr[cIndex])*1000).toString();
      }
      else {
        return;
      }
    }
    settings.set_strv(key, eStr);
  
  },
  
  keepPreferences: function(dialog) {
  
    this.convertTimeToInteger();
    this.profilesObject.extensionProfilesPrefs.saveCurrentProfile();
    settings.set_double('current-version', Metadata.version);//settings.reset('current-version');
    reloadExtension();
    this.updateDone();
    dialog.destroy();
    
  },
     
  displayPrefs: function(){
  
    this.vbox    = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 30 });
    let imageBox = new Gtk.Box();
    let image    = new Gtk.Image({ file: Extension.dir.get_child('eicon.png').get_path(), pixel_size: 96 });
    
    this.firstInfo            = new Gtk.Label({ wrap: true, justify: 2, use_markup: true, label: _("Extension is upgraded to Version  ")+ Metadata.version+"\n\n" + _("A Reset to default preferences is needed if upgrading from a version older than version 10 or unable to reset during previous upgrade to version 10. Please Reset the extension by clicking the button below.")+"\n\n"});  
    this.resetExtensionButton = new ExtensionResetButton_AnimationTweaksExtension( this );

    imageBox.set_center_widget(image);
    this.vbox.pack_start(imageBox,                  false, false, 0);
    this.vbox.pack_start(this.firstInfo,            false, false, 0);
    this.vbox.pack_start(this.resetExtensionButton, false, false, 0);
    this.add(this.vbox);
    
    this.secondInfo = new Gtk.Label({ wrap: true, justify: 2, use_markup: true, label: "\n\n"+_("If already upgraded to Version 10 or higher and it's working fine, you can keep some of the preferences as it is. Incompatible preferences will be reset.\nIn that case click on the button below. Otherwise click the above button to reset.")+"\n\n"});
    this.upgradeFormVersion10 = new Gtk.Button({label: _("Upgrade From Version 10 or newer."),halign:Gtk.Align.CENTER});
    this.upgradeFormVersion10.connect('clicked', ()=> this.showVersion10Options());
      
    this.vbox.pack_start(this.secondInfo,           false, false, 0);
    this.vbox.pack_start(this.upgradeFormVersion10, false, false, 0);   
 
  },

  showVersion10Options: function() {
  
    let dialog = new Gtk.MessageDialog({ transient_for: this.get_toplevel(), modal: true });  
    dialog.set_default_response(Gtk.ResponseType.OK);
    dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    dialog.add_button(Gtk.STOCK_OK, Gtk.ResponseType.OK);
    dialog.set_markup("<big><b>"+_("Keep Preferences and Upgrade?")+"</b></big>");
    dialog.get_message_area().pack_start(new Gtk.Label({ wrap: true, justify: 3, use_markup: true, label: _("\nPlease make sure that\n\nYou are upgrading from version 10 or newer of this extension to current version.\nAlready Reset the extension during previous upgrade.\nThe extension is working fine.\n\n"+_("Otherwise click Cancel to go back and reset.")+"\n\n"+_("Note: Incompatible preferences will be reset anyway."))}), true, true, 0);
    dialog.connect('response', Lang.bind(this, function(dialog, id) {
      if(id != Gtk.ResponseType.OK) {
        dialog.destroy();  
        return;
      }
      this.keepPreferences(dialog);
    }));    
    dialog.show_all();
    
  },
    
  updateDone: function(mode) {
  
    if(mode == false) {
      return;
    }
    
    this.secondInfo.destroy();
    this.resetExtensionButton.destroy();
    this.upgradeFormVersion10.destroy();
    
    this.firstInfo.label =_("Version  ")+ Metadata.version+"\n\n <big><b> "+_("Upgraded Successfully")+"</b></big>";
    settings.set_double('current-version', Metadata.version);//settings.reset('current-version');
  
  },
  
});

const AnimationSettingsForItem_AnimationTweaksExtension = new GObject.Class({

  Name: 'AnimationSettingsForItem_AnimationTweaksExtension',

  _init( itemType, windowType, action, keysSensitiveTo, grid, posY, topLevel, thisIsPairedEffect = false ) {
   
    this.action         =  action;
    this.itemType       =  itemType;
    this.windowType     =  windowType;
    this.appIndex       =  0;
    this.KEY            =  this.windowType+"-"+this.action;
    this.allEffectsList =  new EffectsList_AnimationTweaksExtension(this.itemType+"-"+this.action+"-effects-list");   
    this.appProfile     =  new EffectsList_AnimationTweaksExtension(this.KEY);
    this.eStr           =  this.eStr = this.appProfile.getEffectAt(this.appIndex);
    this.posY           = posY;
    this.grid           = grid;
    this.visible        = false;
    
    this.prefsLabel     =  new Gtk.Label({xalign: 1, label:_(settings.settings_schema.get_key(this.KEY).get_summary()), halign: Gtk.Align.START});
    this.prefsCombo     =  new Gtk.ComboBoxText({hexpand: false,vexpand:false});
    this.tweakButton    =  new Gtk.Button({ image: new Gtk.Image({ gicon: new Gio.ThemedIcon({ name: "emblem-system-symbolic"}), icon_size: Gtk.IconSize.BUTTON, visible: true }), halign:Gtk.Align.START});
    this.delaySetting   =      Gtk.SpinButton.new_with_range(0,10000,10);
    this.timeSetting    =      Gtk.SpinButton.new_with_range(10,10000,10);
    this.prefsSwitch    =  new Gtk.Switch({hexpand: false,vexpand:false,active: (this.eStr[0]=='T') ? true : false,halign:Gtk.Align.CENTER});
    this.prefsSwitchBox =  new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0,hexpand:true});    
    this.prefsSwitchBox.add(this.prefsSwitch);
    
    let pos = 0;      
    this.grid.sensitive = true;
    this.grid.attach(this.prefsLabel,     pos++, this.posY, 1, 1);
    this.grid.attach(this.prefsCombo,     pos++, this.posY, 1, 1);
    this.grid.attach(this.tweakButton,    pos++, this.posY, 1, 1);
    if(settings.get_boolean("show-delay") == true) {
        this.grid.attach(this.delaySetting,   pos++, this.posY, 1, 1);  
    }
    this.grid.attach(this.timeSetting,    pos++, this.posY, 1, 1);
    this.grid.attach(this.prefsSwitchBox, pos++, this.posY, 1, 1);
    this.allEffectsList.loadEffectsListToComboBox(this.prefsCombo);
    
    this.prefsCombo.connect('changed',         (widget) => this.selectEffectFromList(widget.get_active()));
    this.timeSetting.connect('notify::value',  (spin  ) => this.changeEffectTime(spin.get_value_as_int()));
    this.delaySetting.connect('notify::value', (spin  ) => this.changeEffectDelay(spin.get_value_as_int()));
    this.prefsSwitch.connect('notify::active', (      ) => this.toggleItemStatus(this.prefsSwitch.active));  
    this.tweakButton.connect('clicked',        (      ) => this.effectsTweaks(topLevel, thisIsPairedEffect));  
    
    settings.connect("changed::"+this.KEY,     (      ) => this.updateValues(this.appIndex));
    this.updateValues(this.appIndex);
    
    switch(keysSensitiveTo.length) {
      case 1:
        this.prefsSwitch.sensitive = settings.get_boolean(keysSensitiveTo[0]);
        settings.connect("changed::"+keysSensitiveTo[0], () => {
          this.prefsSwitch.sensitive = settings.get_boolean(keysSensitiveTo[0]);
        });
        break;
      case 2:
        this.prefsSwitch.sensitive = settings.get_boolean(keysSensitiveTo[0]) && settings.get_boolean(keysSensitiveTo[1]) ;
        settings.connect("changed::"+keysSensitiveTo[0], () => {
          this.prefsSwitch.sensitive = settings.get_boolean(keysSensitiveTo[0]) && settings.get_boolean(keysSensitiveTo[1]) ;
        });
        settings.connect("changed::"+keysSensitiveTo[1], () => {
          this.prefsSwitch.sensitive = settings.get_boolean(keysSensitiveTo[0]) && settings.get_boolean(keysSensitiveTo[1]) ;
        });
        break;
      default:
        break;
    }
    
  },
  
  changeEffectDelay: function(value) {

    if(this.updatingProfiles==true || this.appIndex ==-1 ) {
      return;
    }

    this.eStr = this.appProfile.getEffectAt(this.appIndex);
    this.appProfile.modifyEffectForWindowAction(this.appIndex,this.allEffectsList.setEffectDelay(value, this.eStr));
   
  },

  changeEffectTime: function(value) {

    if(this.updatingProfiles==true || this.appIndex ==-1 ) {
      return;
    }

    this.eStr = this.appProfile.getEffectAt(this.appIndex);
    this.appProfile.modifyEffectForWindowAction(this.appIndex, this.allEffectsList.setEffectTime(value, this.eStr));
   
  },
  
  effectsTweaks : function(topLevel, thisIsPairedEffect) {

    let dialog = new Gtk.Dialog({title:_("Customize Animation") + "  -  «" + _(this.eStr[1]) + "»", transient_for: topLevel.get_toplevel(), use_header_bar: true,modal:true});
    dialog.get_content_area().pack_start(new EffectsTweaks_AnimationTweaksExtension(this.appProfile, this.appIndex, thisIsPairedEffect), true, true, 0)

    dialog.set_default_response(Gtk.ResponseType.CANCEL);
    let addButton = dialog.add_button(_("Restore Default"), Gtk.ResponseType.OK);
    dialog.connect('response', Lang.bind(this, function(dialog, id) { 

      if(id == Gtk.ResponseType.OK) {
        this.selectEffectFromList(this.prefsCombo.get_active());
      }
      dialog.destroy();

    }));
    dialog.show_all();

  },

  selectEffectFromList: function(selectedIndex) {

    if(this.updatingProfiles==true || this.appIndex ==-1 ) {
      return;
    }

    this.eStr    = this.appProfile.getEffectAt(this.appIndex);
    let state    = this.eStr[0];
    this.eStr    = [];
    this.eStr[0] = state;

    let selectedEffectFromList = this.allEffectsList.getEffectAt(selectedIndex);
    let i                      = 1;

    while(i!= selectedEffectFromList.length+1) {
      this.eStr[i] = selectedEffectFromList[i-1];
      i++;
    }

    this.appProfile.modifyEffectForWindowAction(this.appIndex,this.eStr);
    reloadApplicationProfiles();
    
  },
  
  toggleItemStatus: function(state) {
  
    if(this.updatingProfiles==true || this.appIndex ==-1 ) {
      return;
    }
      
    this.eStr = this.appProfile.getEffectAt(this.appIndex);
    this.eStr[0] = (state)? "T":"F";
    this.appProfile.modifyEffectForWindowAction(this.appIndex,this.eStr);
    reloadApplicationProfiles();
 
  },

  updateValues: function(appIndex) {
  
    this.updatingProfiles = true;
    
    this.appProfile.reloadList(this.windowType+"-"+this.action);
    this.appIndex = appIndex;
    
    this.eStr = (this.appIndex == -1)? this.appProfile.getEffectAt(0) : this.appProfile.getEffectAt(this.appIndex);
    this.grid.sensitive = (this.appIndex == -1)? false:true;

    this.prefsSwitch.active = (this.eStr[0]=="T")? true:false;
    this.prefsCombo.set_active(this.allEffectsList.getIndexOf(this.eStr[1]));
    this.timeSetting.set_value(this.allEffectsList.getTotalTimeOf(this.eStr));
    this.delaySetting.set_value(this.allEffectsList.getTotalDelayOf(this.eStr));
    
    this.updatingProfiles = false;
  
  },
  
});

const AnimationSettingsForItemProfile_AnimationTweaksExtension = new GObject.Class({

  Name: 'AnimationSettingsForItemProfile_AnimationTweaksExtension',
  Extends: AnimationSettingsForItem_AnimationTweaksExtension,
  
  _init(itemType,windowType,action,keysSensitiveTo,grid,posY,topLevel,thisIsPairedEffect=false) {
  
    this.parent(itemType,windowType,action,keysSensitiveTo,grid,posY,topLevel,thisIsPairedEffect);
    this.prefsLabel.label = _(this.action.charAt(0).toUpperCase()+this.action.slice(1));
    this.updateValues(-1);
  
  },
  
});

const Prefs_AnimationTweaksExtension = new GObject.Class({

  Name: 'Prefs_AnimationTweaksExtension',
  Extends: Gtk.Stack,
    
  _init: function() {

    this.actionPrefs  = new PrefsWindowForAction_AnimationTweaksExtension();    
    this.profilePrefs = new PrefsWindowForProfiles_AnimationTweaksExtension();
    this.tweaksPrefs  = new PrefsWindowForTweaks_AnimationTweaksExtension();
    this.updatePage   = new UpdatePage_AnimationTweaksExtension(this.profilePrefs);

    this.parent({ transition_type: 6  ,transition_duration: 200 });
    
    if( settings.get_double("current-version") < Metadata.version ) {
      this.add_titled( this.updatePage, "Update", _("Update") );
      this.updatePage.displayPrefs();
    }
    this.add_titled(this.actionPrefs,  "Actions",  _("Actions") );
    this.add_titled(this.profilePrefs, "Profiles", _("Profiles"));
    this.add_titled(this.tweaksPrefs,  "Tweaks",   _("Tweaks")  );
      
    this.tweaksPrefs.displayPrefs();
    
  },

});

const EffectsList_AnimationTweaksExtension = new GObject.Class({

  Name: 'EffectsList_AnimationTweaksExtension',
    
  _init: function(KEY) {
  
    this.reloadList(KEY);
    this.modifyAfterSomeTime = null;
    
  },
  
  addDefaultEffectForWindowAction: function() {
  
    let windowOpenEffect = this.getEffectAt(0);
        
    this.effectsList.push("|");
    
    for(let i=0;i<windowOpenEffect.length;i++) {
      this.effectsList.push(windowOpenEffect[i]);
    }
    
    settings.set_strv(this.KEY,this.effectsList);
    
  },

  extractEffect: function(startIndex,endIndex) {
  
    let eStr=[];
  
    while(startIndex <= endIndex) {
      eStr.push(this.effectsList[startIndex]);
      startIndex++;
    }
    
    return eStr;
  
  },
  
  getEffectAt: function(index) {
    
    let effectIndex = 0;
    let startIndex  = 0;
    let endIndex    = this.getEndIndex(startIndex);
    let eStr        = [];
   
    while(startIndex!=-1) {
    
      if(effectIndex == index) {
        startIndex++;
        return this.extractEffect(startIndex,endIndex);
      }
      
      effectIndex++;
      startIndex = this.effectsList.indexOf('|',startIndex+1);
      endIndex   = this.getEndIndex(startIndex);
      
    } 
    
    return eStr;

  },
  
  getEndIndex: function(startIndex) {
  
    let endIndex = this.effectsList.indexOf('|',startIndex+1);
        
    if(endIndex == -1) {
      endIndex = this.effectsList.length;
    }  
    
    return --endIndex;

  },
  
  getIndexOf: function(effectName) {
  
    let listIndex   = 0;
    let effectIndex = 0;

    while(listIndex!=-1) {

      if(this.effectsList[listIndex+1] == effectName) {
        return effectIndex;
      }
      effectIndex++;
      listIndex = this.effectsList.indexOf('|',listIndex+1);
      
    } 
    
    return -1;

  },

  getTotalDelayOf: function(eStr) {

    for (cIndex = 8; cIndex<eStr.length; cIndex = cIndex + TWEEN_PARAMETERS_LENGTH) {
      if(parseFloat(eStr[cIndex])>10) {
        return parseFloat(eStr[cIndex-1]);
      }   
    }

  },  

  getTotalTimeOf: function(eStr) {

    let totalTime = 0; 
    for (let cIndex = 8;cIndex<eStr.length;cIndex=cIndex+TWEEN_PARAMETERS_LENGTH) {
      totalTime += (parseFloat(eStr[cIndex])>15) ? parseFloat(eStr[cIndex]) : 0;
    }
    return totalTime;

  },  
  
  loadEffectsListToComboBox: function(effectsCombo) {
  
    let cIndex = 0;

     while(cIndex!=-1) {
       effectsCombo.append(this.effectsList[cIndex+1],_(this.effectsList[cIndex+1]));
       cIndex = this.effectsList.indexOf('|',cIndex+1);
     } 
     
  },

  modifyEffectForWindowAction: function(appIndex,eStr) {
    
    if(this.modifyAfterSomeTime != null) {
      GLib.source_remove(this.modifyAfterSomeTime);
      this.modifyAfterSomeTime = null;
    }
    
    this.modifyAfterSomeTime = GLib.timeout_add(GLib.PRIORITY_DEFAULT, SETTINGS_APPLY_DELAY_TIME, ()=> {
    
      this.modifyAfterSomeTime = null;
  
      let windowOpenEffect = eStr;  
      let effectIndex = 0;
      let startIndex  = 0;
      let endIndex    = this.getEndIndex(startIndex);
   
      windowOpenEffect.splice(0,0,"|");
   
      while(startIndex!=-1) {
    
        if(effectIndex == appIndex) {

          for(let i=0;i<windowOpenEffect.length;i++) {
            this.effectsList.splice(startIndex+i,0,windowOpenEffect[i]);
          }
          settings.set_strv(this.KEY,this.effectsList); 
          reloadApplicationProfiles(); 
          this.removeEffectForWindowAction(appIndex+1); 
          windowOpenEffect.splice(0,1);
        
          return;
        
        }
      
        effectIndex++;
        startIndex = this.effectsList.indexOf('|',startIndex+1);
        endIndex   = this.getEndIndex(startIndex);
      
      } 
    
      windowOpenEffect.splice(0,1);
      
    });
        
  },

  reloadList: function(KEY,TYPE) {
    
    this.KEY = KEY;

    switch(this.KEY) {
      case "window-open-effects-list" : 
        this.effectsList = DefaultEffectList.windowopenEffectsList;
        break;

      case "other-open-effects-list" : 
        this.effectsList = DefaultEffectList.otheropenEffectsList;
        break;

      case "notificationbanner-open-effects-list" : 
        this.effectsList = DefaultEffectList.notificationbanneropenEffectsList;
        break;

      case "padosd-open-effects-list" : 
        this.effectsList = DefaultEffectList.padosdopenEffectsList;
        break;

      case "window-close-effects-list" : 
        this.effectsList = DefaultEffectList.windowcloseEffectsList;
        break;

      case "notificationbanner-close-effects-list" : 
        this.effectsList = DefaultEffectList.notificationbannercloseEffectsList;
        break;
        
      case "padosd-close-effects-list" : 
        this.effectsList = DefaultEffectList.padosdcloseEffectsList;
        break;

      case "other-close-effects-list" : 
        this.effectsList = DefaultEffectList.othercloseEffectsList;
        break;
     
      case "window-minimize-effects-list" : 
        this.effectsList = DefaultEffectList.windowminimizeEffectsList;
        break;
  
      case "window-unminimize-effects-list" : 
        this.effectsList = DefaultEffectList.windowunminimizeEffectsList;
        break;

      case "window-movestart-effects-list" :
        this.effectsList = DefaultEffectList.windowmovestartEffectsList;
        break;
        
      case "window-focus-effects-list" :
        this.effectsList = DefaultEffectList.windowfocusEffectsList;
        break;

      case "window-defocus-effects-list" :
        this.effectsList = DefaultEffectList.windowdefocusEffectsList;
        break;
     
      default: 
        this.effectsList = settings.get_strv(this.KEY);
        
    }
     
  },
  
  removeEffectForWindowAction: function(appIndex) {
  
    let effectIndex = 0;
    let startIndex  = 0;
    let endIndex    = this.getEndIndex(startIndex);
   
    while(startIndex!=-1) {
    
      if(effectIndex == appIndex) {
        this.effectsList.splice(startIndex,(endIndex-startIndex+1));
        settings.set_strv(this.KEY,this.effectsList); 
        return;
      }
      
      effectIndex++;
      startIndex = this.effectsList.indexOf('|',startIndex+1);
      endIndex   = this.getEndIndex(startIndex);
    } 
    
  },

  setEffectDelay: function(value, eStr) {

    for (let pIndex = 8; pIndex < eStr.length; pIndex = pIndex+TWEEN_PARAMETERS_LENGTH) {
      if(parseInt(eStr[pIndex]) > 10) {
        eStr[pIndex-1] = value.toString();
        return eStr;    
      }
    }  

  },
  
  setEffectTime: function(value,eStr) {

    let totalTime = this.getTotalTimeOf(eStr); 

    for (let pIndex = 8; pIndex < eStr.length; pIndex = pIndex+TWEEN_PARAMETERS_LENGTH) {
      if(parseInt(eStr[pIndex]) > 15) {
        eStr[pIndex] = (((parseInt(eStr[pIndex])*value)/totalTime)>= 20) ? ((parseInt(eStr[pIndex])*value)/totalTime).toString() : "20";
      }
    }    
    return eStr;

  },
  
});

const EffectsTweaks_AnimationTweaksExtension =  new GObject.Class({

  Name: 'EffectsTweaks_AnimationTweaksExtension',
  Extends: Gtk.ScrolledWindow,

  _init: function(appProfile,appIndex, messageForPairedEffects=false) {

    this.parent({hscrollbar_policy:2});
    this.set_min_content_height(500); 
    
    this.gridWin = new Gtk.Grid({ column_spacing: 30, halign: Gtk.Align.CENTER, margin: 20, row_spacing: 15 ,border_width:20});
    this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b>"+_("Any  Changes  done  here  are  Applied  immediately")+"</b></big>",halign: Gtk.Align.CENTER}),0,0,3,1);
    this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:_("Details of parameter values are described in")+"  <i>effectParameters.txt</i>  "+_("file  in  extension folder."),halign: Gtk.Align.CENTER }) ,0  ,1 ,3  ,1); 
    this.add(this.gridWin);        
    
    this.appIndex = appIndex;
    this.appProfile = appProfile;
    this.eStr = (this.appIndex == -1)? this.appProfile.getEffectAt(0):this.appProfile.getEffectAt(this.appIndex);
    
    let i=2;
    let pos=3;

    if(messageForPairedEffects==true) {

      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:" ",halign: Gtk.Align.CENTER }) ,0  ,++pos ,1  ,1);
      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b><u>"+_("Parameters for Starting Effect")+"</u></b></big>", halign: Gtk.Align.CENTER }) ,0  ,++pos ,3  ,1);
    
    }

    while(i<TWEEN_PARAMETERS_LENGTH*this.eStr[2]) {
    
      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:" ",halign: Gtk.Align.CENTER }) ,0  ,++pos ,1  ,1);
      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b><u>"+(_("Tween Parameters - ")+((i-2)/TWEEN_PARAMETERS_LENGTH+1))+"</u></b></big>", halign: Gtk.Align.CENTER }) ,0  ,++pos ,3  ,1);
      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:" ",halign: Gtk.Align.CENTER }) ,0  ,++pos ,1  ,1);
       
      this.tweakParameter(         ++i, _("Pivot Point X")+"\t\t\t"+"["+"\t"+_("-500  -  500")+"\t%\t\t"+"]",                 ++pos, -500,  500,     100                            );
      this.tweakParameter(         ++i, _("Pivot Point Y")+"\t\t\t"+"["+"\t"+_("-500  -  500")+"\t%\t\t"+"]",                 ++pos, -500,  500,     100                            );
      //this.tweakParameter(         ++i, _("Rotation Center X")+"\t\t"+"["+"\t"+_("0  -  100")+"\t%\t\t"+"]",                  ++pos, 0,     100,     100                            );
      //this.tweakParameter(         ++i, _("Rotation Center Y")+"\t\t"+"["+"\t"+_("0  -  100")+"\t%\t\t"+"]",                  ++pos, 0,     100,     100                            );
      //this.tweakParameter(         ++i, _("Delay")+"\t\t\t\t\t"+"["+"\t"+_("in milliseconds")+"\t"+"]",                       ++pos, 0,     10000,   1                              ); 
      i+=3;
      this.tweakParameter(         ++i, _("Time")+"\t\t\t\t\t"+"["+"\t"+_("in milliseconds")+"\t"+"]",                        ++pos, 1,     10000,   1, false                       ); 
      this.tweakParameter(         ++i, _("Ending Opacity")+"\t\t"+"["+"\t"+_("0  -  255")+"\t\t\t"+"]",                      ++pos, 0,     255,     1                              );
      this.tweakParameterDim(      ++i, _("Ending Width")+"\t\t\t"+"["+"\t"+_("0  -  200")+"\t%\t\t"+"]",                     ++pos, 0,     200,     100, ["MW"]                    );
      this.tweakParameterDim(      ++i, _("Ending Height")+"\t\t\t"+"["+"\t"+_("0  -  200")+"\t%\t\t"+"]",                    ++pos, 0,     200,     100, ["MH"]                    );
      this.tweakParameterPosition( ++i, _("Movement along X")+"\t"+"["+"\t"+_("0 ± % Screen width from current X→")+"\t"+"]", ++pos, -100,  100,     100, ["MX","LX","RX","SX","IX"]);
      this.tweakParameterPosition( ++i, _("Movement along Y")+"\t[\t"+_("0 ± % Screen height from current Y↓")+"\t]",         ++pos, -100,  100,     100, ["MY","DY","UY","SY","IY"]);
      this.tweakParameter(         ++i, _("Movement along Z")+"\t[\t"+_("0 ± % Screen height from current Z")+"\t]",          ++pos, -100,  100,     100,                           );
      this.tweakParameter(         ++i, _("Rotation about X")+"\t\t[\t"+_("in Degree")+"\t%\t\t]",                            ++pos, -3600, 3600,    1                              );
      this.tweakParameter(         ++i, _("Rotation about Y")+"\t\t[\t"+_("in Degree")+"\t%\t\t]",                            ++pos, -3600, 3600,    1                              );
      this.tweakParameter(         ++i, _("Rotation about Z")+"\t\t[\t"+_("in Degree")+"\t%\t\t]",                            ++pos, -3600, 3600,    1                              );
      this.tweakTransitionType(    ++i, _("Transition Type")+"\t\t",                                                          ++pos                                                 );

      if(messageForPairedEffects==true && i == (TWEEN_PARAMETERS_LENGTH*this.eStr[2]*0.5)+2) {
      
        this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:" ",halign: Gtk.Align.CENTER }) ,0  ,++pos ,1  ,1);
        this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b><u>"+_("Parameters for Ending Effect")+"</u></b></big>", halign: Gtk.Align.CENTER }) ,0  ,++pos ,3  ,1);
    
      }

    }
    
  },
  
  filterInvalidValues: function(checkForThisValue,minPV,maxPV,acceptableValues,temp,multiplier) {

    for(let i=0;i<acceptableValues.length;i++){
      if(checkForThisValue==acceptableValues[i]){
        return [checkForThisValue,checkForThisValue,true]; 
      }
    }
    
    if(checkForThisValue == "") {
      return [(minPV/multiplier).toString(),minPV.toString(),false,false];  
    }
    
    let value = parseFloat(checkForThisValue)*temp;
    
    if(isNaN(value)) {
      return [(minPV/multiplier).toString(),minPV.toString(),false,false];  
    }
    
    if(value >= minPV && value <= maxPV) {
      return [(value/multiplier).toString(),value.toString(),true,false];
    }
    
    if(value > maxPV) {
      return [(maxPV/multiplier).toString(),maxPV.toString(),true,true];
    }

    if(value < minPV) {
      return [(minPV/multiplier).toString(),minPV.toString(),true,true];
    }

    return [(minPV/multiplier).toString(),minPV.toString(),false,false];
    
  },

  tweakParameter : function(pNo,INFO,pos,minPV,maxPV,multiplier, sensitive = true) {
  
    let SettingLabel    = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter = Gtk.SpinButton.new_with_range(minPV,maxPV,1);
    
    effectParameter.set_value(parseFloat(this.eStr[pNo])*multiplier);

    if(sensitive == true) {
      effectParameter.sensitive = true;
    }
    else {
      if(effectParameter.get_value_as_int()/multiplier <= 15) {
        effectParameter.sensitive = false;
      }
      else {
        effectParameter.sensitive = true;
      }
    }

    effectParameter.connect('notify::value', (spin)=> {     
      this.eStr[pNo]=(spin.get_value_as_int()/multiplier).toString();
      this.appProfile.modifyEffectForWindowAction(this.appIndex,this.eStr);
      reloadApplicationProfiles();
    });
    this.gridWin.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.gridWin.attach(effectParameter ,2    ,pos  ,1   ,1);
    
  },
  
  tweakTransitionType: function(pNo,INFO,pos) {
                   
    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter = new Gtk.ComboBoxText();
    for (let i = 0; i < DefaultEffectList.transitionOptions.length; i++) {
      effectParameter.append(DefaultEffectList.transitionOptions[i],  DefaultEffectList.transitionOptions[i]);
    }
    effectParameter.set_active(DefaultEffectList.transitionOptions.indexOf(this.eStr[pNo]));
    effectParameter.connect('changed', Lang.bind(this, function(widget) {
      
      this.eStr[pNo]=DefaultEffectList.transitionOptions[widget.get_active()];
      this.appProfile.modifyEffectForWindowAction(this.appIndex,this.eStr);
      reloadApplicationProfiles();
            
    }));
    
    this.gridWin.attach(SettingLabel,    0, pos, 1, 1);
    this.gridWin.attach(effectParameter, 2, pos, 1, 1);
    
  },
  
  tweakParameterDim : function(pNo,INFO,pos,minPV,maxPV,multiplier,acceptableValues) {

    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter   = new Gtk.Entry({text: this.filterInvalidValues( this.eStr[pNo],minPV,maxPV,acceptableValues,multiplier,multiplier)[1] });

    effectParameter.connect('changed', ()=> {     
     
      let value="" ; 
      let shouldCommit = false;
      let shouldOverrideText = false;
        
      if(parseFloat(effectParameter.text) > maxPV){
        effectParameter.text = maxPV.toString();
        this.eStr[pNo] = (maxPV/multiplier).toString();
        shouldCommit = true;
      }
      else {
        [this.eStr[pNo],value, shouldCommit, shouldOverrideText] = this.filterInvalidValues( effectParameter.text , minPV , maxPV,acceptableValues,1,multiplier);
      }
        
      if(shouldOverrideText == true){
        effectParameter.text = value;
      }
        
      if(shouldCommit == true){
        this.appProfile.modifyEffectForWindowAction(this.appIndex,this.eStr);
        reloadApplicationProfiles();
      }
     
    });

    this.gridWin.attach(SettingLabel,    0, pos, 1, 1);
    this.gridWin.attach(effectParameter, 2, pos, 1, 1);

  }, 

  tweakParameterPosition : function(pNo,INFO,pos,minPV,maxPV,multiplier,acceptableValues) {

    let SettingLabel    = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter = new Gtk.Entry({text: this.filterInvalidValues( this.eStr[pNo],minPV,maxPV,acceptableValues,multiplier,multiplier)[1] });

    effectParameter.connect('changed', ()=> {     
     
      let value="" ; 
      let shouldCommit = false;
      let shouldOverrideText = false;
        
      if(effectParameter.text.length > 3){
        effectParameter.text = maxPV.toString();
        this.eStr[pNo] = (maxPV/multiplier).toString();
        shouldCommit = true;
      }
      else {
        [this.eStr[pNo],value, shouldCommit, shouldOverrideText] = this.filterInvalidValues( effectParameter.text , minPV , maxPV,acceptableValues,1,multiplier);
      }
        
      if(shouldOverrideText == true){
        effectParameter.text = value;
      }
        
      if(shouldCommit == true){
        this.appProfile.modifyEffectForWindowAction(this.appIndex,this.eStr);
        reloadApplicationProfiles();
      }
     
    });

    this.gridWin.attach(SettingLabel,    0, pos, 1, 1);
    this.gridWin.attach(effectParameter, 2, pos, 1, 1);

  }, 

});

const PrefsWindow_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindow_AnimationTweaksExtension',
  Extends: Gtk.Grid,

  _init: function(action) {
      
    this.parent({ column_spacing: 40, halign: Gtk.Align.CENTER, margin: 20,margin_top:0, row_spacing: 20 ,border_width:20});
    this.addGrids();
    this.action = action;
     
  },

  addGrids: function() {

    this.switchBox0 = new Gtk.Grid({ column_spacing: 30, halign: Gtk.Align.CENTER, margin: 20, margin_top: 10, row_spacing: 0  ,border_width:0 });
    this.switchBox1 = new Gtk.Grid({ column_spacing: 30, halign: Gtk.Align.CENTER, margin: 20, margin_top: 0,  row_spacing: 0  ,border_width:0 });
    
    this.attach(this.switchBox0, 0, 0,  5, 1);
    this.attach(this.switchBox1, 0, 11, 5, 1);

  },
 
  heading: function(posY,grid=this) {
  
    let pos = 0;
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Items"), halign: Gtk.Align.CENTER }),             pos++, posY, 1, 1);
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Effect"), halign: Gtk.Align.CENTER }),            pos++, posY, 1, 1);
    if(settings.get_boolean("show-delay") == true) {
      grid.attach(new Gtk.Label({ xalign: 1, label: _("Delay [ in ms ]"), halign: Gtk.Align.CENTER }), ++pos, posY, 1, 1);
    }
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Time [ in ms ]"), halign: Gtk.Align.CENTER }),    ++pos, posY, 1, 1);
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Status"), halign: Gtk.Align.CENTER }),            ++pos, posY, 1, 1);
    
  },
  
  emptyLine: function(posY) {
  
    this.attach(new Gtk.Label({ xalign: 1, label: "" ,halign: Gtk.Align.CENTER }) ,0  ,posY ,1  ,1);
    
  },

  insertSpace: function(LABEL,posX,posY,sBox) {
  
    sBox.attach(new Gtk.Label({ xalign: 1, label: LABEL ,halign: Gtk.Align.CENTER }), posX, posY, 1, 1);
    
  },
  
  prefsWA: function(KEY,posX,posY,sbox,space=1) {
  
    let SettingLabel0  = new Gtk.Label({ xalign:  1, label:_(settings.settings_schema.get_key(KEY).get_summary()),halign: Gtk.Align.START });
    let SettingSwitch0 = new Gtk.Switch({hexpand: false, active: settings.get_boolean(KEY), halign: Gtk.Align.START});
    let prefsSwitchBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0,hexpand:true});
        
    SettingSwitch0.connect("notify::active", Lang.bind(this, function(button) {
      settings.set_boolean(KEY, button.active);
      reloadExtension();
    }));

    settings.connect("changed::"+KEY, () => {
      SettingSwitch0.set_active(settings.get_boolean(KEY));
    });
   
    prefsSwitchBox.add(SettingSwitch0);
    sbox.attach(SettingLabel0,  posX,       posY, 1, 1);
    sbox.attach(prefsSwitchBox, posX+space, posY, 1, 1);
    
  },  

});

const PrefsWindowForAction_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindowForAction_AnimationTweaksExtension',
  Extends: Gtk.Notebook,
    
  _init: function() {
  
    this.parent({});
          
    this.openingPrefs  = new PrefsWindowForOpening_AnimationTweaksExtension("open");
    this.closingPrefs  = new PrefsWindowForClosing_AnimationTweaksExtension("close");
    this.minimizePrefs = new PrefsWindowForMinimize_AnimationTweaksExtension("minimze");
    this.focusPrefs    = new PrefsWindowForFocus_AnimationTweaksExtension("focus");
    this.morePrefs     = new PrefsWindowForMore_AnimationTweaksExtension("more");

    this.prefsWindowOpening = new Gtk.ScrolledWindow({hexpand: true });
    this.prefsWindowOpening.add(this.openingPrefs);
    this.prefsWindowOpening.set_min_content_height(700);

    const cssProvider = new Gtk.CssProvider();
    cssProvider.load_from_data('notebook > stack { background: rgba(0,0,0,0.0); }');
    this.get_style_context().add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

    this.append_page(this.prefsWindowOpening, new Gtk.Label({ label: _("Open")                         }));
    this.append_page(this.closingPrefs,       new Gtk.Label({ label: _("Close")                        }));    
    this.append_page(this.minimizePrefs,      new Gtk.Label({ label: _("Minimize")+" / "+_("Unminimize")}));    
    this.append_page(this.focusPrefs,         new Gtk.Label({ label: _("Focus")   +" / "+_("Defocus")  }));    
    this.append_page(this.morePrefs,          new Gtk.Label({ label: _("Drag")                         }));

    this.child_set_property(this.prefsWindowOpening, "tab-expand", true);
    this.child_set_property(this.closingPrefs,       "tab-expand", true);
    this.child_set_property(this.minimizePrefs,      "tab-expand", true);
    this.child_set_property(this.focusPrefs,         "tab-expand", true);
    this.child_set_property(this.morePrefs,          "tab-expand", true);

    this.openingPrefs.displayPrefs();
    this.closingPrefs.displayPrefs();
    this.minimizePrefs.displayPrefs();
    this.focusPrefs.displayPrefs();
    this.morePrefs.displayPrefs();
        
  },

});

const PrefsWindowForApps_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindowForApps_AnimationTweaksExtension',
  Extends: Gtk.Grid,

  _init: function() {  
  
    this.parent();
    
  },
 
  addApp: function()  {
  
    let dialog = new Gtk.Dialog({ title: _('Choose an application'),transient_for: this.get_toplevel(),use_header_bar: true,modal: true });
    dialog._appChooser = new Gtk.AppChooserWidget({ show_all: true });
    dialog.set_default_response(Gtk.ResponseType.OK);
    dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    let addButton = dialog.add_button(_("Add"), Gtk.ResponseType.OK);
    let hbox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL,margin: 5});
    hbox.pack_start(dialog._appChooser, true, true, 0);
    dialog.get_content_area().pack_start(hbox, true, true, 0);
    dialog.connect('response', Lang.bind(this, function(dialog, id) {
      if (id != Gtk.ResponseType.OK) {
        dialog.destroy();
        return;
      }

      let appInfo = dialog._appChooser.get_app_info();
      if (!appInfo) {
        return;
      }

      let appsList = settings.get_strv(this.APPLICATION_LIST_KEY);
      let nameList = settings.get_strv(this.NAME_LIST_KEY);
      if (appsList.indexOf(appInfo.get_id())>=0) {
        dialog.destroy();
        return;
      }
      appsList.push(appInfo.get_id());
      nameList.push(appInfo.get_name());
      (this.addDefaultEffects == true) ? this.addDefaultEffectsAt(nameList.length-1): null; // Needed to prevent adding default effects to position list for Modal dialog list
      
      settings.set_strv(this.APPLICATION_LIST_KEY, appsList);
      settings.set_strv(this.NAME_LIST_KEY, nameList);
      this._store.set(this._store.append(),[0, 2, 1],[appInfo, appInfo.get_icon(), appInfo.get_name()]);

      dialog.destroy();
    }));
    
    dialog.show_all();
    
  },
  
  addDefaultEffectsAt: function() {

    this.appNormalOpenPrefs.appProfile.addDefaultEffectForWindowAction();  
    this.appNormalClosePrefs.appProfile.addDefaultEffectForWindowAction();  
    this.appNormalMinimizePrefs.appProfile.addDefaultEffectForWindowAction();  
    this.appNormalUnminimizePrefs.appProfile.addDefaultEffectForWindowAction();   
    
    reloadApplicationProfiles();
    
  },
  
  applicationProfilesStateSwitch: function(KEY) {
  
    let settingSwitch = new Gtk.Switch({hexpand: false,vexpand:false,active: settings.get_boolean(KEY),halign:Gtk.Align.END});
    let box  = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0,hexpand:true});
     box.add(settingSwitch);

    settingSwitch.connect('notify::active', ()=> { 
      settings.set_boolean(KEY,settingSwitch.active); 
      (settings.get_boolean("reload-profiles-signal")) ? settings.set_boolean("reload-profiles-signal", false) : settings.set_boolean("reload-profiles-signal", true);
    });
    
    settings.connect("changed::"+KEY, () => {
      settingSwitch.set_active(settings.get_boolean(KEY));
    });

    this.attachLabel(KEY,0,this.profilesOptionTopGrid);
    this.profilesOptionTopGrid.attach(box, 2, 0, 1, 1);
     
  },
  
  appViewChange: function() {
    
    let appsList = settings.get_strv(this.APPLICATION_LIST_KEY);
    let nameList = settings.get_strv(this.NAME_LIST_KEY);
    let appName = "";
    
    let [any, model, iter] = this.treeView.get_selection().get_selected();
    let index=-1;
    
    if(any) {
      let appInfo = this._store.get_value(iter, 0); 
      index=appsList.indexOf(appInfo.get_id());
    }
    
    if(index >= 0 ) {
      appName = settings.get_strv(this.NAME_LIST_KEY)[index];
      this.AppLabel.label = "<big><b>"+settings.get_strv(this.NAME_LIST_KEY)[index]+" - "+this.prefsName+"</b></big>";
      let appInfo = this._store.get_value(iter, 0); 
      this.AppIcon.gicon = appInfo.get_icon();
      index++;
    }
    else {
      this.AppLabel.label = "<big><b>"+_("No Application Selected")+" - "+this.prefsName+"</b></big>";
    }
    
    if(this.addDefaultEffects == true) {
      this.appNormalOpenPrefs.updateValues(index);
      this.appNormalClosePrefs.updateValues(index);
      this.appNormalMinimizePrefs.updateValues(index);
      this.appNormalUnminimizePrefs.updateValues(index);
    }
    
    return appName;
   
  }, 
  
  attachLabel: function(KEY,pos,box) {

    let prefLabel = new Gtk.Label({xalign: 1, label: _(settings.settings_schema.get_key(KEY).get_summary()), halign: Gtk.Align.CENTER});
    box.attach(prefLabel,1,pos,1,1);
    
  },

  displayPrefs: function() {
  
    this.APPLICATION_LIST_KEY = "application-list";
    this.NAME_LIST_KEY        = "name-list";
    this.addDefaultEffects    = true;
    this.prefsName            = _("Window Preferences");
  
    this.makeList();
    this.refreshList();
    this.showPrefs();
  
  },
  
  emptyLine: function(posY) {
  
    this.gridWin.attach(new Gtk.Label({ xalign: 1, label: "" ,halign: Gtk.Align.CENTER }) ,0  ,posY ,1  ,1);
    
  },
  
  heading: function(posY) {
  
    let pos = 0;
    
    this.gridWin.attach(new Gtk.Label({ xalign: 1, label: _("Action") ,halign: Gtk.Align.CENTER })         ,pos++  ,posY ,1  ,1);
    this.gridWin.attach(new Gtk.Label({ xalign: 1, label: _("Effect"),halign: Gtk.Align.CENTER })          ,pos++  ,posY ,1  ,1);
    if(settings.get_boolean("show-delay") == true) {
      this.gridWin.attach(new Gtk.Label({ xalign: 1, label: _("Delay [ in ms ]"), halign: Gtk.Align.CENTER }),      ++pos, posY, 1, 1);
    }
    this.gridWin.attach(new Gtk.Label({ xalign: 1, label: _("Time [ in ms ]"),halign: Gtk.Align.CENTER })  ,++pos  ,posY ,1  ,1);
    this.gridWin.attach(new Gtk.Label({ xalign: 1, label: _("Status"),     halign: Gtk.Align.CENTER })     ,++pos  ,posY ,1  ,1);
    
  },

  makeList: function() {
  
    this._store = new Gtk.ListStore();
    this._store.set_column_types([Gio.AppInfo, GObject.TYPE_STRING, Gio.Icon]);
    this.treeView = new Gtk.TreeView({ model: this._store,hexpand: true,vexpand: true ,halign: Gtk.Align.START});

    let iconRenderer = new Gtk.CellRendererPixbuf;
    let nameRenderer = new Gtk.CellRendererText;
    let appColumn    = new Gtk.TreeViewColumn({expand: true, resizable:true,alignment: 0.5,sort_column_id: 1,title:_("Application List")});
    let listBox      = new Gtk.ScrolledWindow({hexpand: true,shadow_type: Gtk.ShadowType.IN});
    
    appColumn.pack_start(iconRenderer, false);
    appColumn.pack_start(nameRenderer, true);
    appColumn.add_attribute(iconRenderer, "gicon", 2);
    appColumn.add_attribute(nameRenderer, "text",  1);
    
    this.treeView.append_column(appColumn);
    appColumn.set_fixed_width(300);
    listBox.add(this.treeView);
    listBox.set_min_content_width(200); 
    
    let addButton = new Gtk.Button({label: "     "+_("Add")+"    ", halign:Gtk.Align.START});
    addButton.connect('clicked', Lang.bind(this, this.addApp));

    let delButton = new Gtk.Button({label: " "+_("Remove")+" ", halign:Gtk.Align.END});
    delButton.connect('clicked', Lang.bind(this, this.removeApp));

    this.profilesOptionTopGrid = new Gtk.Grid({ column_spacing: 40, halign: Gtk.Align.CENTER, margin: 20, row_spacing: 20 ,border_width: 0});
    this.gridWin               = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20, row_spacing: 20 ,border_width: 0});

    this.profilesOptionTopGrid.attach(addButton,0,0,1,1);
    this.profilesOptionTopGrid.attach(delButton,3,0,1,1);
    
    this.attach(listBox, 0,0,1,3);
    this.attach(this.profilesOptionTopGrid, 1,0,1,1);
    this.attach(this.gridWin, 1,1,1,1);
    
  },

  refreshList: function()  {
  
    this._store.clear();
    let appsList = settings.get_strv(this.APPLICATION_LIST_KEY);
    let nameList = settings.get_strv(this.NAME_LIST_KEY);

    for (let i = 0; i < nameList.length; i++) {
      let appInfo = Gio.DesktopAppInfo.new(appsList[i]);
      if(Gio.DesktopAppInfo.new(appsList[i])==null){
        appsList.splice(i,1);
        nameList.splice(i,1);
        i--;
      }
      else {
        this._store.set(this._store.append(),[0, 2, 1],[appInfo, appInfo.get_icon(), nameList[i]]);
      }
    }
    
    settings.set_strv(this.APPLICATION_LIST_KEY,appsList);
    settings.set_strv(this.NAME_LIST_KEY, nameList);
    
  },

  removeApp: function() {
  
    let [any, model, iter] = this.treeView.get_selection().get_selected();
    let appsList = settings.get_strv(this.APPLICATION_LIST_KEY);
    let nameList = settings.get_strv(this.NAME_LIST_KEY);

    if (any) {
      let indx,appInfo = this._store.get_value(iter, 0); 
      appsList.splice((indx=appsList.indexOf(appInfo.get_id())),1);
      nameList.splice(indx,1);
      (this.addDefaultEffects == true) ? this.removeAppEffectsAt(indx) : null;
      settings.set_strv(this.APPLICATION_LIST_KEY,appsList);
      settings.set_strv(this.NAME_LIST_KEY, nameList);
      this._store.remove(iter);
    }

  },
  
  removeAppEffectsAt: function(index) {
 
    if(index >= 0 ) {
      index++;
    }
    
    this.appNormalOpenPrefs.appIndex--;
    this.appNormalClosePrefs.appIndex--;
    this.appNormalMinimizePrefs.appIndex--;
    this.appNormalUnminimizePrefs.appIndex--;
    
    this.appNormalOpenPrefs.appProfile.removeEffectForWindowAction(index);  
    this.appNormalClosePrefs.appProfile.removeEffectForWindowAction(index);  
    this.appNormalMinimizePrefs.appProfile.removeEffectForWindowAction(index);  
    this.appNormalUnminimizePrefs.appProfile.removeEffectForWindowAction(index); 
    
    reloadApplicationProfiles();
    
  },

  showPrefs: function() {
    
    let pos = 0;
    
    this.AppLabel = new Gtk.Label({ xalign:  1, use_markup: true, halign: Gtk.Align.CENTER });
    this.AppIcon = new Gtk.Image({ gicon:null, pixel_size: 96 });
    this.iconImageBox  = new Gtk.Box();
    this.iconImageBox.set_center_widget(this.AppIcon);
    
    this.AppLabel.label = "<big><b>"+_("No Application Selected")+" - "+this.prefsName+"</b></big>";
    this.emptyLine(pos++);
    this.gridWin.attach(this.iconImageBox ,0,pos++,7,1); 
    this.gridWin.attach(this.AppLabel,0,pos++,7,1);    
    this.emptyLine(pos++);
    this.heading(pos++);
    this.applicationProfilesStateSwitch("use-application-profiles");
    this.appNormalOpenPrefs       =  new AnimationSettingsForItemProfile_AnimationTweaksExtension("window", "normal", "open",       ["opening-effect", "use-application-profiles"], this.gridWin, pos++, this);
    this.appNormalClosePrefs      =  new AnimationSettingsForItemProfile_AnimationTweaksExtension("window", "normal", "close",      ["closing-effect", "use-application-profiles"], this.gridWin, pos++, this);
    this.appNormalMinimizePrefs   =  new AnimationSettingsForItemProfile_AnimationTweaksExtension("window", "normal", "minimize",   ["minimizing-effect", "use-application-profiles"], this.gridWin, pos++, this);
    this.appNormalUnminimizePrefs =  new AnimationSettingsForItemProfile_AnimationTweaksExtension("window", "normal", "unminimize", ["unminimizing-effect", "use-application-profiles"], this.gridWin, pos++, this); 
    this.emptyLine(pos++);
    this.treeView.connect("cursor-changed",()=>this.appViewChange());
    
  },

});

const PrefsWindowForClosing_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindowForClosing_AnimationTweaksExtension',
  Extends: PrefsWindow_AnimationTweaksExtension,

  _init: function(action) {  
  
    this.parent(action);
    
  },

  displayPrefs: function() { 
    
    this.prefsWA("closing-effect",        0,  0,  this.switchBox0    );
    this.heading(1);
    let pos = 2;
    new AnimationSettingsForItem_AnimationTweaksExtension("window",             "normal",             "close", ["closing-effect"], this, pos++,this);
    new AnimationSettingsForItem_AnimationTweaksExtension("window",             "dialog",             "close", ["closing-effect"], this, pos++,this);
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "modaldialog",        "close", ["closing-effect"], this, pos++,this);
    this.emptyLine(pos++);
    new AnimationSettingsForItem_AnimationTweaksExtension("notificationbanner", "notificationbanner", "close", [],               this, pos++,this);
    new AnimationSettingsForItem_AnimationTweaksExtension("padosd",             "padosd",             "close", [],               this, pos++,this);
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "toppanelpopupmenu",  "close", [],               this, pos++,this);
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "desktoppopupmenu",   "close", [],               this, pos++,this);
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "windowmenu",         "close", [],               this, pos++,this);
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "endsessiondialog",   "close", [],               this, pos++,this);
    
  },
  
});

const PrefsWindowForFocus_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindowForFocus_AnimationTweaksExtension',
  Extends: PrefsWindow_AnimationTweaksExtension,

  _init: function(action) {  
  
    this.parent(action);
    
    this.switchBox2 = new Gtk.Grid({ column_spacing: 40, halign: Gtk.Align.CENTER, margin: 20,                 row_spacing: 20 ,border_width:0 });
    this.switchBox3 = new Gtk.Grid({ column_spacing: 40, halign: Gtk.Align.CENTER, margin: 20, margin_top: 0,  row_spacing: 20 ,border_width:0 });

    this.attach(this.switchBox2, 0, 20, 5, 1);
    this.attach(this.switchBox3, 0, 30, 5, 1);

    this.switchBox1.margin_top     = 0;
    this.switchBox1.row_spacing    = 20;
    this.switchBox1.column_spacing = 40;
    
  },

  displayPrefs: function() { 
    
    this.prefsWA("focussing-effect",   0, 0, this.switchBox0);
    this.heading(0, this.switchBox1);
   
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "normal",      "focus", ["focussing-effect"], this.switchBox1, 1,  this      );
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "dialog",      "focus", ["focussing-effect"], this.switchBox1, 2,  this      );
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "modaldialog", "focus", ["focussing-effect"], this.switchBox1, 3,  this      );     
    this.prefsWA("defocussing-effect",  0, 0, this.switchBox2);
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "normal",      "defocus", ["defocussing-effect"], this.switchBox3, 0,  this      );
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "dialog",      "defocus", ["defocussing-effect"], this.switchBox3, 1,  this      );
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "modaldialog", "defocus", ["defocussing-effect"], this.switchBox3, 2,  this      );

  },
  
});

const PrefsWindowForMinimize_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindowForMinimize_AnimationTweaksExtension',
  Extends: PrefsWindow_AnimationTweaksExtension,

  _init: function(action) {  
  
    this.parent(action);
    
    this.switchBox2 = new Gtk.Grid({ column_spacing: 40, halign: Gtk.Align.CENTER, margin: 20,                 row_spacing: 20 ,border_width:0 });
    this.switchBox3 = new Gtk.Grid({ column_spacing: 40, halign: Gtk.Align.CENTER, margin: 20, margin_top: 0,  row_spacing: 20 ,border_width:0 });

    this.attach(this.switchBox2, 0, 20, 5, 1);
    this.attach(this.switchBox3, 0, 30, 5, 1);
                  
    this.switchBox1.margin_top     = 0;
    this.switchBox1.row_spacing    = 20;
    this.switchBox1.column_spacing = 40;
  },

  displayPrefs: function() { 
    
    this.prefsWA("minimizing-effect",   0, 0, this.switchBox0);
    this.heading(0, this.switchBox1);
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "normal",      "minimize", ["minimizing-effect"],  this.switchBox1, 1,  this      );
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "dialog",      "minimize", ["minimizing-effect"],  this.switchBox1, 2,  this      ); 
    
    this.prefsWA("unminimizing-effect", 0, 0, this.switchBox2);
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "normal",      "unminimize", ["unminimizing-effect"], this.switchBox3, 0,  this      );
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "dialog",      "unminimize", ["unminimizing-effect"], this.switchBox3, 1,  this      );

  },
  
});

const PrefsWindowForMore_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindowForMore_AnimationTweaksExtension',
  Extends: PrefsWindow_AnimationTweaksExtension,

  _init: function(action) {  
  
    this.parent(action);
                      
    this.switchBox1.margin_top     = 0;
    this.switchBox1.row_spacing    = 20;
    this.switchBox1.column_spacing = 40;
  },

  displayPrefs: function() { 
    
    this.prefsWA("moving-effect",   0, 0, this.switchBox0);
    this.heading(0, this.switchBox1);
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "normal",      "movestart", ["moving-effect"], this.switchBox1, 1, this, true);
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "dialog",      "movestart", ["moving-effect"], this.switchBox1, 2, this, true);   
    new AnimationSettingsForItem_AnimationTweaksExtension("window", "modaldialog", "movestart", ["moving-effect"], this.switchBox1, 3, this, true);    

  },
  
});

const PrefsWindowForOpening_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindowForOpening_AnimationTweaksExtension',
  Extends: PrefsWindow_AnimationTweaksExtension,

  _init: function(action) {  
  
    this.parent(action);
  },

  displayPrefs: function() { 
    
    let pos=0;
    
    this.prefsWA("opening-effect", 0, pos++, this.switchBox0); 
    this.heading(pos++);
    new AnimationSettingsForItem_AnimationTweaksExtension("window",             "normal",             "open", ["opening-effect"], this, pos++, this);
    new AnimationSettingsForItem_AnimationTweaksExtension("window",             "dialog",             "open", ["opening-effect"], this, pos++, this);
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "modaldialog",        "open", ["opening-effect"], this, pos++, this);
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "dropdownmenu",       "open", ["opening-effect"], this, pos++, this);
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "popupmenu",          "open", ["opening-effect"], this, pos++, this);    
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "combo",              "open", ["opening-effect"], this, pos++, this);    
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "tooltip",            "open", ["opening-effect"], this, pos++, this);    
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "splashscreen",       "open", ["opening-effect"], this, pos++, this);    
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "overrideother",      "open", ["opening-effect"], this, pos++, this);   
    this.emptyLine(pos++); 
    new AnimationSettingsForItem_AnimationTweaksExtension("notificationbanner", "notificationbanner", "open", [], this, pos++, this); 
    new AnimationSettingsForItem_AnimationTweaksExtension("padosd",             "padosd",             "open", [], this, pos++, this);   
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "toppanelpopupmenu",  "open", [], this, pos++, this);       
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "desktoppopupmenu",   "open", [], this, pos++, this);       
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "windowmenu",         "open", [], this, pos++, this);           
    new AnimationSettingsForItem_AnimationTweaksExtension("other",              "endsessiondialog",   "open", [], this, pos++, this);           
    
  },

}); 

const PrefsWindowForProfiles_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindowForProfiles_AnimationTweaksExtension',
  Extends: Gtk.Notebook,
    
  _init: function() {
  
    this.parent({});
          
    this.appProfilesPrefs       = new PrefsWindowForApps_AnimationTweaksExtension();
    this.extensionProfilesPrefs = new PrefsWindowForExtensionProfiles_AnimationTweaksExtension();

    const cssProvider = new Gtk.CssProvider();
    cssProvider.load_from_data('notebook > stack { background: rgba(0,0,0,0.0); }');
    this.get_style_context().add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

    this.append_page(this.appProfilesPrefs,         new Gtk.Label({ label: _("Application Profiles")}) );
    this.append_page(this.extensionProfilesPrefs,   new Gtk.Label({ label: _("Extension Profiles")})   );

    this.child_set_property(this.appProfilesPrefs,       "tab-expand", true);
    this.child_set_property(this.extensionProfilesPrefs, "tab-expand", true);

    this.appProfilesPrefs.displayPrefs();
    this.extensionProfilesPrefs.displayPrefs();
    
  },

});

const PrefsWindowForExtensionProfiles_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindowForExtensionProfiles_AnimationTweaksExtension',
  Extends: PrefsWindow_AnimationTweaksExtension,

  _init: function() {  
  
    this.parent();
    this.valign = Gtk.Align.CENTER;
    const cssProvider = new Gtk.CssProvider();
    cssProvider.load_from_data('grid { padding-left: 80px; padding-top: 60px; }');
    this.get_style_context().add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);    
    this.get_style_context().add_class("frame");
    this.get_style_context().add_class("view");
    this.setPath();   
   
  },
  
  addImportExportPrefs: function() {

    let exportExtensionProfilesButton  = new Gtk.Button({label: _("Export Profiles"),halign:Gtk.Align.START});  
    let importExtensionProfilesButton  = new Gtk.Button({label: _("Import Profiles"),halign:Gtk.Align.END});
    
    exportExtensionProfilesButton.connect('clicked', ()=>  this.fileManagementDialogWindow(1));
    importExtensionProfilesButton.connect('clicked',  ()=> this.fileManagementDialogWindow(0));

    this.existingProfiles = this.listProfiles(this.PROFILE_PATH+PROFILE_FILE_NAME);  
    this.prefCombo("profile-name", 0, 0, this.existingProfiles, this.existingProfiles);

    this.attach(exportExtensionProfilesButton,0,1,1,1);
    this.attach(importExtensionProfilesButton,1,1,2,1);
    
  },
  
  applyProfile: function(profileName) {
  
    let profileClass = new Extension.imports.profiles.animationTweaksExtensionProfiles["AnimationTweaksExtensionProfile"+profileName]();
    
    settings.set_string("profile-name", profileClass.animationTweaksExtensionProfileName);
  
    settings.set_boolean("opening-effect",      profileClass.openingEffectEnabled);
    settings.set_boolean("closing-effect",      profileClass.closingingEffectEnabled);
    settings.set_boolean("minimizing-effect",   profileClass.minimizingEffectEnabled);
    settings.set_boolean("unminimizing-effect", profileClass.unMinimizingEffectEnabled);
    settings.set_boolean("moving-effect",       profileClass.movingEffectEnabled);
    settings.set_boolean("focussing-effect",    profileClass.focussingEffectEnabled);
    settings.set_boolean("defocussing-effect",  profileClass.defocussingEffectEnabled);
  
    settings.set_boolean("use-application-profiles", profileClass.useApplicationProfiles);
    settings.set_strv("name-list",                   profileClass.nameList);
    settings.set_strv("application-list",            profileClass.appList);
        
    settings.set_strv("normal-open",       profileClass.normalWindowopenProfileRaw); 
    settings.set_strv("normal-close",      profileClass.normalWindowcloseProfileRaw);
    settings.set_strv("normal-minimize",   profileClass.normalWindowminimizeProfileRaw);
    settings.set_strv("normal-unminimize", profileClass.normalWindowunminimizeProfileRaw);    
    settings.set_strv("normal-movestart",  profileClass.normalWindowmovestartProfileRaw);   
    settings.set_strv("normal-focus",      profileClass.normalWindowfocusProfileRaw);    
    settings.set_strv("normal-defocus",    profileClass.normalWindowdefocusProfileRaw);    
     
    settings.set_strv("dialog-open",       profileClass.dialogWindowopenProfileRaw);
    settings.set_strv("dialog-close",      profileClass.dialogWindowcloseProfileRaw);
    settings.set_strv("dialog-minimize",   profileClass.dialogWindowminimizeProfileRaw);
    settings.set_strv("dialog-unminimize", profileClass.dialogWindowunminimizeProfileRaw);  
    settings.set_strv("dialog-movestart",  profileClass.dialogWindowmovestartProfileRaw);
    settings.set_strv("dialog-focus",      profileClass.dialogWindowfocusProfileRaw);    
    settings.set_strv("dialog-defocus",    profileClass.dialogWindowdefocusProfileRaw);    

    settings.set_strv("modaldialog-open",       profileClass.modaldialogWindowopenProfileRaw);
    settings.set_strv("modaldialog-close",      profileClass.modaldialogWindowcloseProfileRaw);
    settings.set_strv("modaldialog-minimize",   profileClass.modaldialogWindowminimizeProfileRaw);
    settings.set_strv("modaldialog-unminimize", profileClass.modaldialogWindowunminimizeProfileRaw);  
    settings.set_strv("modaldialog-movestart",  profileClass.modaldialogWindowmovestartProfileRaw);
    settings.set_strv("modaldialog-focus",      profileClass.modaldialogWindowfocusProfileRaw);    
    settings.set_strv("modaldialog-defocus",    profileClass.modaldialogWindowdefocusProfileRaw);    
    
    settings.set_strv("dropdownmenu-open",  profileClass.dropdownmenuWindowopenProfile);
    settings.set_strv("popupmenu-open",     profileClass.popupmenuWindowopenProfile);
    settings.set_strv("combo-open",         profileClass.comboWindowopenProfile);
    settings.set_strv("splashscreen-open",  profileClass.splashscreenWindowopenProfile);
    settings.set_strv("tooltip-open",       profileClass.tooltipWindowopenProfile);
    settings.set_strv("overrideother-open", profileClass.overrideotherWindowopenProfile);    

    settings.set_strv("notificationbanner-open",  profileClass.notificationbannerWindowopenProfile);
    settings.set_strv("notificationbanner-close", profileClass.notificationbannerWindowcloseProfile);
    
    settings.set_strv("padosd-open",  profileClass.padosdWindowopenProfile);
    settings.set_strv("padosd-close", profileClass.padosdWindowcloseProfile); 
    
    settings.set_strv("toppanelpopupmenu-open",  profileClass.toppanelpopupmenuWindowopenProfile);
    settings.set_strv("toppanelpopupmenu-close", profileClass.toppanelpopupmenuWindowcloseProfile);     
      
    settings.set_strv("desktoppopupmenu-open",  profileClass.desktoppopupmenuWindowopenProfile);
    settings.set_strv("desktoppopupmenu-close", profileClass.desktoppopupmenuWindowcloseProfile);     

    if(profileClass.windowmenuWindowcloseProfile) {
      settings.set_strv("windowmenu-open",  profileClass.windowmenuWindowcloseProfile);
      settings.set_strv("windowmenu-close", profileClass.windowmenuWindowopenProfile);     
    }

    if(profileClass.endsessiondialogWindowopenProfile) {
      settings.set_strv("endsessiondialog-open",  profileClass.endsessiondialogWindowopenProfile);
      settings.set_strv("endsessiondialog-close", profileClass.endsessiondialogWindowcloseProfile);     
    }

    settings.set_boolean("wayland",         profileClass.waylandWorkaroundEnabled);
    settings.set_int("padosd-hide-timeout", profileClass.padOSDHideTime);    
    
    ( profileClass.showDelay ) ? settings.set_boolean("show-delay", profileClass.showDelay ) : null;
    
  },
  
  displayPrefs: function() {
  
    this.addImportExportPrefs();     
    
  },
  
  fileManagementDialogWindow: function(action) {
  
    let fileFormats  = new Gtk.FileFilter();        
    let dialog       = new Gtk.FileChooserDialog({ title: (( action == 0 ) ? _("Import") : _("Export"))+_(" Animation Tweaks Profile") ,action: action, filter: fileFormats, do_overwrite_confirmation: true, transient_for: this.get_toplevel(),use_header_bar: true,modal: true });
    let exportButton = dialog.add_button(( action == 0 ) ? _("Import") : _("Export"), Gtk.ResponseType.OK);
        
    fileFormats.add_pattern("*.js");    
    dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    ( action != 0 ) ? dialog.set_current_name (PROFILE_FILE_NAME): null;
    dialog.show_all();
    
    dialog.connect('response', Lang.bind(this, function(dialog, id) {
    
      if(id == Gtk.ResponseType.OK) {
        ( action == 0 ) ? this.importProfiles(dialog.get_filename()) : GLib.file_set_contents( dialog.get_filename(), String( GLib.file_get_contents(this.PROFILE_PATH+PROFILE_FILE_NAME) [1]) );      
      }
      
      dialog.destroy();
      return;
        
    }));
    
  },
  
  importProfiles: function(location) {
  
    let importedFileData = String( GLib.file_get_contents(location) [1]);
    let profileFileData  = String( GLib.file_get_contents(this.PROFILE_PATH+PROFILE_FILE_NAME) [1]);
    let profilesClassList = this.listProfiles(this.PROFILE_PATH+PROFILE_FILE_NAME);  
    let importedClassList = this.listProfiles(location);  
    
    profileFileData += this.onlyKeepProfiles(importedFileData, importedClassList, profilesClassList);    
    GLib.file_set_contents(this.PROFILE_PATH+PROFILE_FILE_NAME, profileFileData);
  
  },
  
  listProfiles: function(fileName) {
  
    let profileFileData = String( GLib.file_get_contents(fileName)[1]);
    let profilesList = []; 
    let indexOfVar = profileFileData.indexOf("var AnimationTweaksExtensionProfile");
    
    while(indexOfVar != -1) {
    
      profilesList.push(profileFileData.substring(indexOfVar+35, profileFileData.indexOf("=", indexOfVar) ));
      indexOfVar = profileFileData.indexOf("var AnimationTweaksExtensionProfile", indexOfVar+1);
      
    } 
    
    return profilesList;
  
  }, 
  
  loadExtensionProfiles: function() {
  
    this.profileName = settings.get_string("profile-name");
    this.version     = settings.get_double("current-version");
  
    this.openingEffectEnabled       = settings.get_boolean("opening-effect");
    this.closingingEffectEnabled    = settings.get_boolean("closing-effect");
    this.minimizingEffectEnabled    = settings.get_boolean("minimizing-effect");
    this.unMinimizingEffectEnabled  = settings.get_boolean("unminimizing-effect");
    this.movingEffectEnabled        = settings.get_boolean("moving-effect");
    this.focussingEffectEnabled     = settings.get_boolean("focussing-effect");
    this.defocussingEffectEnabled   = settings.get_boolean("defocussing-effect");
  
    this.useApplicationProfiles = settings.get_boolean("use-application-profiles");
    this.nameList = settings.get_strv("name-list");
    this.appList  = settings.get_strv("application-list");

    this.normalWindowopenProfileRaw       = settings.get_strv("normal-open"); 
    this.normalWindowcloseProfileRaw      = settings.get_strv("normal-close");
    this.normalWindowminimizeProfileRaw   = settings.get_strv("normal-minimize");
    this.normalWindowunminimizeProfileRaw = settings.get_strv("normal-unminimize");    
    this.normalWindowmovestartProfileRaw  = settings.get_strv("normal-movestart");   
    this.normalWindowfocusProfileRaw      = settings.get_strv("normal-focus");    
    this.normalWindowdefocusProfileRaw    = settings.get_strv("normal-defocus");    
     
    this.dialogWindowopenProfileRaw       = settings.get_strv("dialog-open");
    this.dialogWindowcloseProfileRaw      = settings.get_strv("dialog-close");
    this.dialogWindowminimizeProfileRaw   = settings.get_strv("dialog-minimize");
    this.dialogWindowunminimizeProfileRaw = settings.get_strv("dialog-unminimize");  
    this.dialogWindowmovestartProfileRaw  = settings.get_strv("dialog-movestart");
    this.dialogWindowfocusProfileRaw      = settings.get_strv("dialog-focus");    
    this.dialogWindowdefocusProfileRaw    = settings.get_strv("dialog-defocus");    

    this.modaldialogWindowopenProfileRaw       = settings.get_strv("modaldialog-open");
    this.modaldialogWindowcloseProfileRaw      = settings.get_strv("modaldialog-close");
    this.modaldialogWindowminimizeProfileRaw   = settings.get_strv("modaldialog-minimize");
    this.modaldialogWindowunminimizeProfileRaw = settings.get_strv("modaldialog-unminimize");  
    this.modaldialogWindowmovestartProfileRaw  = settings.get_strv("modaldialog-movestart");
    this.modaldialogWindowfocusProfileRaw      = settings.get_strv("modaldialog-focus");    
    this.modaldialogWindowdefocusProfileRaw    = settings.get_strv("modaldialog-defocus");    
    
    this.dropdownmenuWindowopenProfile  = settings.get_strv("dropdownmenu-open");
    this.popupmenuWindowopenProfile     = settings.get_strv("popupmenu-open");
    this.comboWindowopenProfile         = settings.get_strv("combo-open");
    this.splashscreenWindowopenProfile  = settings.get_strv("splashscreen-open");
    this.tooltipWindowopenProfile       = settings.get_strv("tooltip-open");
    this.overrideotherWindowopenProfile = settings.get_strv("overrideother-open");    

    this.notificationbannerWindowopenProfile  = settings.get_strv("notificationbanner-open");
    this.notificationbannerWindowcloseProfile = settings.get_strv("notificationbanner-close");
    
    this.padosdWindowopenProfile  = settings.get_strv("padosd-open");
    this.padosdWindowcloseProfile = settings.get_strv("padosd-close"); 
    
    this.toppanelpopupmenuWindowopenProfile  = settings.get_strv("toppanelpopupmenu-open"); 
    this.toppanelpopupmenuWindowcloseProfile = settings.get_strv("toppanelpopupmenu-close"); 
    
    this.desktoppopupmenuWindowopenProfile  = settings.get_strv("desktoppopupmenu-open"); 
    this.desktoppopupmenuWindowcloseProfile = settings.get_strv("desktoppopupmenu-close");        
      
    this.windowmenuWindowopenProfile  = settings.get_strv("windowmenu-open"); 
    this.windowmenuWindowcloseProfile = settings.get_strv("windowmenu-close");        
    
    this.endsessiondialogWindowopenProfile  = settings.get_strv("endsessiondialog-open"); 
    this.endsessiondialogWindowcloseProfile = settings.get_strv("endsessiondialog-close");       

    this.waylandWorkaroundEnabled = settings.get_boolean("wayland");
    this.padOSDHideTime           = settings.get_int("padosd-hide-timeout");
    this.showDelay                = settings.get_boolean("show-delay");

  },
   
  onlyKeepProfiles: function(fileData, importedClassList, profilesClassList) {
  
    let onlyProfileData = "";
    let thisprofileData = "";
    
    for(let i=0;i<importedClassList.length;i++) {
      
      let newName = this.solveNameConflict(importedClassList[i],profilesClassList);
  
      let indexOfVar = fileData.indexOf("var AnimationTweaksExtensionProfile"+importedClassList[i]+"=class AnimationTweaksExtensionProfile"+importedClassList[i]+"{");
      let indexOfEndOfProfile = fileData.indexOf("}}//EndOfAnimationTweaksExtensionProfile"+importedClassList[i], indexOfVar);
      
      if(indexOfVar != -1 && indexOfEndOfProfile != -1) {
        thisprofileData = "\n"+fileData.substring(indexOfVar,indexOfEndOfProfile+40+importedClassList[i].length);    
        thisprofileData = thisprofileData.replace("var AnimationTweaksExtensionProfile"+importedClassList[i]+"=class AnimationTweaksExtensionProfile"+importedClassList[i]+"{", "var AnimationTweaksExtensionProfile"+newName+"=class AnimationTweaksExtensionProfile"+newName+"{");
        thisprofileData = thisprofileData.replace("this.animationTweaksExtensionProfileName=\""+importedClassList[i]+"\"","this.animationTweaksExtensionProfileName=\""+newName+"\"");
        thisprofileData = thisprofileData.replace("}}//EndOfAnimationTweaksExtensionProfile"+importedClassList[i],"}}//EndOfAnimationTweaksExtensionProfile"+newName);
        onlyProfileData += thisprofileData; 
      }
      
      profilesClassList.push(newName);
     
    }
    
    return onlyProfileData;
    
  },
  
  prefCombo: function(KEY, posX, posY, options, items) {
  
    let settingLabel = new Gtk.Label({xalign: 1, label: _(settings.settings_schema.get_key(KEY).get_summary()), halign: Gtk.Align.START});  
    let SettingCombo = new Gtk.ComboBoxText();
    let saveExtensionProfilesButton = new Gtk.Button({label: _("Save"), halign:Gtk.Align.START, sensitive: settings.get_boolean("current-profile-modified") });
    
    saveExtensionProfilesButton.connect('clicked', ()=> this.saveCurrentProfile());
    settings.connect("changed::current-profile-modified", ()=> {
      saveExtensionProfilesButton.sensitive = settings.get_boolean("current-profile-modified");
    });
    
    for (let i = 0; i < options.length; i++) {
      SettingCombo.append(options[i],  items[i]);
    }
    SettingCombo.set_active(options.indexOf(settings.get_string(KEY)));
    SettingCombo.connect('changed', Lang.bind(this, function(widget) {
      settings.set_string(KEY, options[widget.get_active()]);
      this.applyProfile(options[widget.get_active()]);
      reloadApplicationProfiles();
    }));
    
    this.attach(settingLabel,                posX,   posY, 1, 1);
    this.attach(SettingCombo,                posX+1, posY, 1, 1);
    this.attach(saveExtensionProfilesButton, posX+2, posY, 1, 1);
      
  },
  
  saveCurrentProfile: function() {
  
    settings.set_boolean("current-profile-modified", false);
    this.loadExtensionProfiles();
    let oldProfileFileData = String( GLib.file_get_contents(this.PROFILE_PATH+PROFILE_FILE_NAME) [1]);
     
    let newProfileData = "var AnimationTweaksExtensionProfile"+this.profileName+"=class AnimationTweaksExtensionProfile"+this.profileName+"{\n"
                       + "constructor(){\n"     
                       + "this.animationTweaksExtensionProfileName=\""+this.profileName+"\";\n"
                       + "this.firstUse=false;\n"
                       + "this.version="+this.version+";\n"
                       + "this.openingEffectEnabled="+this.openingEffectEnabled+";\n"
                       + "this.closingingEffectEnabled="+this.closingingEffectEnabled+";\n"
                       + "this.minimizingEffectEnabled="+this.minimizingEffectEnabled+";\n"
                       + "this.unMinimizingEffectEnabled="+this.unMinimizingEffectEnabled+";\n"
                       + "this.movingEffectEnabled="+this.movingEffectEnabled+";\n"
                       + "this.focussingEffectEnabled="+this.focussingEffectEnabled+";\n"
                       + "this.defocussingEffectEnabled="+this.defocussingEffectEnabled+";\n"    
 
                       + "this.useApplicationProfiles="+this.useApplicationProfiles+";\n"
                       + "this.nameList="+this.stringifyParameters(this.nameList)
                       + "this.appList="+this.stringifyParameters(this.appList)
   
                       + "this.normalWindowopenProfileRaw="+this.stringifyParameters(this.normalWindowopenProfileRaw)
                       + "this.normalWindowcloseProfileRaw="+this.stringifyParameters(this.normalWindowcloseProfileRaw)
                       + "this.normalWindowminimizeProfileRaw="+this.stringifyParameters(this.normalWindowminimizeProfileRaw)
                       + "this.normalWindowunminimizeProfileRaw="+this.stringifyParameters(this.normalWindowunminimizeProfileRaw)
                       + "this.normalWindowmovestartProfileRaw="+this.stringifyParameters(this.normalWindowmovestartProfileRaw)
                       + "this.normalWindowfocusProfileRaw="+this.stringifyParameters(this.normalWindowfocusProfileRaw)
                       + "this.normalWindowdefocusProfileRaw="+this.stringifyParameters(this.normalWindowdefocusProfileRaw)    
     
                       + "this.dialogWindowopenProfileRaw="+this.stringifyParameters(this.dialogWindowopenProfileRaw)
                       + "this.dialogWindowcloseProfileRaw="+this.stringifyParameters(this.dialogWindowcloseProfileRaw)
                       + "this.dialogWindowminimizeProfileRaw="+this.stringifyParameters(this.dialogWindowminimizeProfileRaw)
                       + "this.dialogWindowunminimizeProfileRaw="+this.stringifyParameters(this.dialogWindowunminimizeProfileRaw)
                       + "this.dialogWindowmovestartProfileRaw="+this.stringifyParameters(this.dialogWindowmovestartProfileRaw)
                       + "this.dialogWindowfocusProfileRaw="+this.stringifyParameters(this.dialogWindowfocusProfileRaw)    
                       + "this.dialogWindowdefocusProfileRaw="+this.stringifyParameters(this.dialogWindowdefocusProfileRaw)

                       + "this.modaldialogWindowopenProfileRaw="+this.stringifyParameters(this.modaldialogWindowopenProfileRaw)
                       + "this.modaldialogWindowcloseProfileRaw="+this.stringifyParameters(this.modaldialogWindowcloseProfileRaw)
                       + "this.modaldialogWindowminimizeProfileRaw="+this.stringifyParameters(this.modaldialogWindowminimizeProfileRaw)
                       + "this.modaldialogWindowunminimizeProfileRaw="+this.stringifyParameters(this.modaldialogWindowunminimizeProfileRaw)
                       + "this.modaldialogWindowmovestartProfileRaw="+this.stringifyParameters(this.modaldialogWindowmovestartProfileRaw)
                       + "this.modaldialogWindowfocusProfileRaw="+this.stringifyParameters(this.modaldialogWindowfocusProfileRaw)
                       + "this.modaldialogWindowdefocusProfileRaw="+this.stringifyParameters(this.modaldialogWindowdefocusProfileRaw)    
    
                       + "this.dropdownmenuWindowopenProfile="+this.stringifyParameters(this.dropdownmenuWindowopenProfile)
                       + "this.popupmenuWindowopenProfile="+this.stringifyParameters(this.popupmenuWindowopenProfile)
                       + "this.comboWindowopenProfile="+this.stringifyParameters(this.comboWindowopenProfile)
                       + "this.splashscreenWindowopenProfile="+this.stringifyParameters(this.splashscreenWindowopenProfile)
                       + "this.tooltipWindowopenProfile="+this.stringifyParameters(this.tooltipWindowopenProfile)    
                       + "this.overrideotherWindowopenProfile="+this.stringifyParameters(this.overrideotherWindowopenProfile)

                       + "this.notificationbannerWindowopenProfile="+this.stringifyParameters(this.notificationbannerWindowopenProfile)
                       + "this.notificationbannerWindowcloseProfile="+this.stringifyParameters(this.notificationbannerWindowcloseProfile)
                       + "this.notificationBannerAlignment=\""+this.notificationBannerAlignment+"\";\n"
   
                       + "this.padosdWindowopenProfile="+this.stringifyParameters(this.padosdWindowopenProfile)
                       + "this.padosdWindowcloseProfile="+this.stringifyParameters(this.padosdWindowcloseProfile)

                       + "this.toppanelpopupmenuWindowopenProfile="+this.stringifyParameters(this.toppanelpopupmenuWindowopenProfile)
                       + "this.toppanelpopupmenuWindowcloseProfile="+this.stringifyParameters(this.toppanelpopupmenuWindowcloseProfile)

                       + "this.desktoppopupmenuWindowopenProfile="+this.stringifyParameters(this.desktoppopupmenuWindowopenProfile)
                       + "this.desktoppopupmenuWindowcloseProfile="+this.stringifyParameters(this.desktoppopupmenuWindowcloseProfile)
                       
                       + "this.windowmenuWindowopenProfile="+this.stringifyParameters(this.windowmenuWindowopenProfile)
                       + "this.windowmenuWindowcloseProfile="+this.stringifyParameters(this.windowmenuWindowcloseProfile)                       
      
                       + "this.endsessiondialogWindowopenProfile="+this.stringifyParameters(this.endsessiondialogWindowopenProfile)
                       + "this.endsessiondialogWindowcloseProfile="+this.stringifyParameters(this.endsessiondialogWindowcloseProfile)       
      
                       + "this.waylandWorkaroundEnabled="+this.waylandWorkaroundEnabled+";\n"
                       + "this.padOSDHideTime="+this.padOSDHideTime+";\n"
                       + "this.showDelay="+this.showDelay+";\n"
                       + "}}//EndOfAnimationTweaksExtensionProfile"+this.profileName;     
    
    let indexOfVar = oldProfileFileData.indexOf("var AnimationTweaksExtensionProfile"+this.profileName+"=class AnimationTweaksExtensionProfile"+this.profileName+"{");
    let indexOfEndOfProfile = oldProfileFileData.indexOf("}}//EndOfAnimationTweaksExtensionProfile"+this.profileName, indexOfVar);
    oldProfileFileData = oldProfileFileData.replace(oldProfileFileData.substring(indexOfVar,indexOfEndOfProfile+40+this.profileName.length),newProfileData);
    GLib.file_set_contents(this.PROFILE_PATH+PROFILE_FILE_NAME, oldProfileFileData);
    
  }, 
  
  setPath: function() {
 
    this.PROFILE_PATH = Extension.path+"/../../../../../.config/gnome-shell-extension-animation-tweaks@Selenium-H";
    let pathManager = Gio.File.new_for_path(this.PROFILE_PATH+"/profiles");
    if(!pathManager.query_exists(null)) {
      pathManager.make_directory_with_parents(null);
      Gio.File.new_for_path(Extension.path+"/profiles").get_child("animationTweaksExtensionProfiles.js").copy(pathManager.get_child("animationTweaksExtensionProfiles.js"), 1, null, null);
    }
 
    Extension.imports.searchPath = [this.PROFILE_PATH];
    this.PROFILE_PATH += "/profiles/";
    return;

  },
  
  solveNameConflict: function(profileName, profilesClassList) {

    while(profilesClassList.indexOf(profileName) >= 0) {
      profileName += "_1";
    }
    
    return profileName;
  
  },
  
  stringifyParameters: function(stringArray) {
  
    let stringifiedArray = "[";
    
    if(stringArray.length > 0) {
      stringifiedArray += "\""+stringArray[0]+"\"";
      for(let i=1;i<stringArray.length;i++) {
        stringifiedArray += ",\""+stringArray[i]+"\""; 
      }
    }
   
    stringifiedArray += "];\n";

    return stringifiedArray; 
  
  },

});

const PrefsWindowForTweaks_AnimationTweaksExtension = new GObject.Class({

  Name: 'PrefsWindowForTweaks_AnimationTweaksExtension',
  Extends: PrefsWindow_AnimationTweaksExtension,

  _init: function() {  
  
    this.parent();
    
  },  
  
  displayPrefs: function() {
  
    this.margin_top     = 20;
  
    let pos=0;
    this.prefsWA("wayland",                  0, pos++, this, 7);
    this.prefInt("padosd-hide-timeout",      0, pos++,       7);
    this.prefStr("disable-shortcut",         0, pos++, ['<Alt>', '<Ctrl>', '<Shift>', '<Super>'], [_('Alt Key'), _('Ctrl Key'), _('Shift Key'), _('Super Key')], 7);
    this.prefsWA("show-delay",               0, pos++, this, 7);
    
  },
  
  prefInt: function(KEY,posX,posY,space) {

    let settingLabel = new Gtk.Label({xalign: 1, label: _(settings.settings_schema.get_key(KEY).get_summary()), halign: Gtk.Align.START});  
    let timeSetting = Gtk.SpinButton.new_with_range(250,10000, 1);
    timeSetting.set_value(settings.get_int(KEY));
    timeSetting.connect('notify::value', function(spin) {
      settings.set_int(KEY,spin.get_value_as_int());
    });

    this.attach(settingLabel, posX,       posY, space, 1);
    this.attach(timeSetting,  posX+space, posY, 1,     1);
    
  },
  
  prefStr: function(KEY, posX, posY, options, items,space) {
  
    let SettingCombo = new Gtk.ComboBoxText();
    let settingLabel = new Gtk.Label({xalign: 1, label: _(settings.settings_schema.get_key(KEY).get_summary()), halign: Gtk.Align.START});  
    
    for (let i=0;i<options.length;i++) {
      SettingCombo.append(options[i],   items[i]);
    }
    
    let keyVal=settings.get_strv(KEY);
    let strSetting = new Gtk.Entry({text:keyVal[0].substring(1+keyVal[0].indexOf('>'))});
    let box = new Gtk.Box({halign:Gtk.Align.END});
    
    strSetting.set_width_chars(1);
    SettingCombo.set_active(options.indexOf(keyVal[0].substring(0,1+keyVal[0].indexOf('>'))));
    SettingCombo.connect('changed', Lang.bind (this, function(widget) {  
      keyVal.pop(); 
      keyVal.push(options[widget.get_active()]+strSetting.text);
      settings.set_strv(KEY,keyVal);
    }));
    
    strSetting.connect('changed'  , Lang.bind (this, function()  {  
      keyVal.pop(); 
      keyVal.push(options[SettingCombo.get_active()]+strSetting.text);
      settings.set_strv(KEY,keyVal);
    }));
    
    box.add(SettingCombo);
    box.add(new Gtk.Label({label: "  +  "}));
    box.add(strSetting);
    
    this.attach(settingLabel, posX,       posY,  space, 1);
    this.attach(box,          posX+space, posY,  1,     1);
    
  },
  
});


