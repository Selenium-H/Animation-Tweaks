//Version 6

const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Metadata = Extension.metadata;
const _ = Gettext.domain("animation-tweaks").gettext;

let settings = null;

function init() {
  initTranslations()
}

function buildPrefsWidget() {

  settings = new Gio.Settings({settings_schema: Gio.SettingsSchemaSource.new_from_directory(Extension.path + "/schemas", Gio.SettingsSchemaSource.get_default(), false).lookup(Extension.metadata['settings-schema'], true) });
  let widget = new AnimationTweaksPrefs();
  let switcher = new Gtk.StackSwitcher({halign: Gtk.Align.CENTER, visible: true, stack: widget});
  Mainloop.timeout_add(0, () => {widget.get_toplevel().get_titlebar().custom_title = switcher;return false;});
  widget.show_all();
  return widget;
}

const AnimationTweaksPrefs = new GObject.Class({
  Name: 'AnimationTweaksPrefs',
  Extends: Gtk.Stack,
    
  _init: function() {
  
    this.parent({ transition_type: 0  ,transition_duration: 500 });
    this.add_titled(new Prefs1(9 , 0 ), 'Open'    , _('Open'    ));
    this.add_titled(new Prefs1(3 ,14 ), 'Close'   , _('Close'   ));
    this.add_titled(new Prefs2(      ), 'Minimize', _('Minimize'));
    this.add_titled(new AboutPage()   , 'About'   , _('About'   ));  
  }
});

const Prefs1 = new GObject.Class({
  Name: 'Prefs1',
  Extends: Gtk.Grid,

  _init: function(items,sIndex) {
  
    this.parent({ column_spacing: 0, halign: Gtk.Align.CENTER, margin: 0, row_spacing: 0 ,border_width:0});
    
    this.box0 = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin_top: 20, row_spacing: 0  ,border_width:0 });
    this.box1 = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20,     row_spacing: 20 ,border_width:20});
    this.box2 = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 0,      row_spacing: 0  ,border_width:0 });
    this.box3 = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20,     row_spacing: 20 ,border_width:20});
    
    this.attach(this.box0,0,0,1,1);
    this.attach(this.box1,0,1,1,1);
    this.attach(this.box2,0,2,1,1);
    this.attach(this.box3,0,3,1,1);
      
    if(items<0) {
      return;
    }
    
    switch(sIndex) {
      case 0:
        this.prefsWA(_("Opening Effects  [ for windows ]") ,"opening-effect-windows","","",0  ,settings, this.box0);          
        break;
      case 14:
        this.prefsWA(_("Closing Effects  ") ,"closing-effect", "" ,"",0  ,settings, this.box0);          
        break;
    }

    this.heading(1 , this.box1);
    this.prefsFor(_('Normal Windows')        ,'normal'         ,2   ,sIndex  ,settings , this.box1 );
    this.prefsFor(_('Dialog Windows')        ,'dialog'         ,3   ,sIndex  ,settings , this.box1 );
    this.prefsFor(_('Modal Dialog Windows')  ,'modal-dialog'   ,4   ,sIndex  ,settings , this.box1 );
    
    if(items>3) {         
      this.prefsWA(_("Opening Effects [ for other items ]"),"opening-effect-others",("     ")+_("Use the workaround for Wayland") ,"wayland",1  ,settings, this.box2);
      this.prefsFor(_('Drop Down Menu')+('           ')  ,'dropdown-menu'  ,6   ,sIndex  ,settings , this.box3 );
      this.prefsFor(_('Pop up Menu')                     ,'popup-menu'     ,7   ,sIndex  ,settings , this.box3 );
      this.prefsFor(_('Combo Box')                       ,'combo'          ,8   ,sIndex  ,settings , this.box3 );
      this.prefsFor(_('Splash Screen')                   ,'splashscreen'   ,9   ,sIndex  ,settings , this.box3 );
      this.prefsFor(_('Tool tips')                       ,'tooltip'        ,10  ,sIndex  ,settings , this.box3 );
      this.prefsFor(_('Override Others')                 ,'override-other' ,11  ,sIndex  ,settings , this.box3 );
    }
  },

  heading: function(pos,sbox) {
  
    sbox.attach(new Gtk.Label({ xalign: 1, label: _("Items") ,halign: Gtk.Align.CENTER })                 ,0  ,pos ,1  ,1);
    sbox.attach(new Gtk.Label({ xalign: 1, label: _("Effect"),halign: Gtk.Align.CENTER })                 ,5  ,pos ,11 ,1);
    sbox.attach(new Gtk.Label({ xalign: 1, label: _("Time in miliseconds"),halign: Gtk.Align.CENTER })    ,20 ,pos ,5  ,1);
    sbox.attach(new Gtk.Label({ xalign: 1, label:  ("          ")+_("Status"),halign: Gtk.Align.CENTER }) ,25 ,pos ,5  ,1);
  },
  
  prefsWA: function(LABEL0,KEY0,LABEL1,KEY1,pos,settings,sbox) {
  
    let SettingLabel0   = new Gtk.Label({ xalign:  1, label: LABEL0,halign: Gtk.Align.CENTER });
    let SettingSwitch0 = new Gtk.Switch({hexpand: false, active: settings.get_boolean(KEY0), halign: Gtk.Align.END});
        
    SettingSwitch0.connect("notify::active", Lang.bind(this, function(button) {
      settings.set_boolean(KEY0, button.active);
      this.reloadExtension(settings);
    }));
    
    sbox.attach(SettingLabel0   ,0  ,pos  ,1   ,1);
    sbox.attach(SettingSwitch0  ,2  ,pos  ,3   ,1);

    if(LABEL1.length<=0) {
      return;
    }
    
    let SettingLabel1   = new Gtk.Label({ xalign:  1, label: LABEL1,halign: Gtk.Align.END });
    let SettingSwitch1 = new Gtk.Switch({hexpand: false, active: settings.get_boolean(KEY1), halign: Gtk.Align.END});
    
    SettingSwitch1.connect("notify::active", Lang.bind(this, function(button) {
      settings.set_boolean(KEY1, button.active);
    }));
                     
    sbox.attach(SettingLabel1   ,10  ,pos   ,11  ,1);
    sbox.attach(SettingSwitch1  ,12  ,pos   ,13  ,1); 
  },

  prefsFor: function(LABEL,KEY,pos,sIndex  ,settings , sbox) {
  
    let effectsList = null;
    switch(sIndex)
    {
       case 0  :  
         effectsList=settings.get_strv('open-effects-list');       
         break;
       case 14 :  
         effectsList=settings.get_strv('close-effects-list');      
         break;
       case 28 :  
         effectsList=settings.get_strv('minimize-effects-list');   
         break;
       case 42 :  
         effectsList=settings.get_strv('unminimize-effects-list'); 
         break;
    }
    let eStr= settings.get_strv(KEY);

    let SettingLabel = new Gtk.Label({ xalign:  1, label: LABEL,halign: Gtk.Align.START });
    let SettingSwitch = new Gtk.Switch({hexpand: false,vexpand:false,active: (eStr[0+sIndex]=='T')? true:false,halign:Gtk.Align.END});
    let box  = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0 });
    let effectsCombo = new Gtk.ComboBoxText({hexpand: false,vexpand:false});
    let tweakButton = new Gtk.Button({label: _("☰"),halign:Gtk.Align.START});
    let timeSetting = Gtk.SpinButton.new_with_range(0,10000,10);

    SettingSwitch.connect('notify::active', function(button) { 
     
      eStr= settings.get_strv(KEY);
      eStr[sIndex]=(eStr[sIndex]=='F')? 'T':'F';
      settings.set_strv(KEY,eStr);  
    });
    
    for(let i=0;i<effectsList.length;i=i+13) {
      effectsCombo.append(effectsList[i],effectsList[i]);
    }
    effectsCombo.set_active(effectsList.indexOf(eStr[1+sIndex])/13);
    effectsCombo.connect('changed', Lang.bind (this, function(widget) {  
      eStr= settings.get_strv(KEY);
      for(let i=1;i<14;i++) {
        eStr[i+sIndex]=effectsList[13*widget.get_active()+i-1];            
      }
      settings.set_strv(KEY,eStr);
      timeSetting.set_value(parseInt(eStr[3+sIndex]));
    }));
    tweakButton.connect('clicked', ()=> this.effectsTweaks(timeSetting,effectsCombo,effectsList,eStr,sIndex,KEY  ,settings));

    timeSetting.set_value(parseInt(eStr[3+sIndex]));
    timeSetting.connect('notify::value', function(spin) {   
      eStr= settings.get_strv(KEY);
      eStr[3+sIndex]=spin.get_value_as_int().toString();
      settings.set_strv(KEY,eStr);
    });
    
    box.add(SettingSwitch);
    sbox.attach(SettingLabel  ,0   ,pos  ,1   ,1);
    sbox.attach(effectsCombo  ,5   ,pos  ,11  ,1);
    sbox.attach(tweakButton   ,17  ,pos  ,1   ,1);  
    sbox.attach(timeSetting   ,20  ,pos  ,5   ,1);
    sbox.attach(box           ,25  ,pos  ,5   ,1);
  },

  effectsTweaks : function(timeSetting,effectsCombo,effectsList,eStr,sIndex,KEY  ,settings) { 
         
    let dialog = new Gtk.Dialog({title:_("Customize      Animation"),transient_for:this.get_toplevel(),use_header_bar: true,modal:true});
        dialog.get_content_area().pack_start(new EffectsTweaks(eStr,sIndex,KEY,settings), true, true, 0);
    dialog.set_default_response(Gtk.ResponseType.CANCEL);
        dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    let addButton     = dialog.add_button("Reset Default", Gtk.ResponseType.OK);
    dialog.connect('response', Lang.bind(this, function(dialog, id) { 
      if (id == Gtk.ResponseType.OK) {
        eStr= settings.get_strv(KEY);
        for(let i=1;i<14;i++) {
          eStr[i+sIndex]=effectsList[13*effectsCombo.get_active()+i-1];
        }          
        settings.set_strv(KEY,eStr);
        timeSetting.set_value(parseInt(eStr[3+sIndex]));  
      }
      dialog.destroy();
    }));
    dialog.show_all();
  },
  
  reloadExtension: function(settings) {
    (settings.get_boolean("reload-signal"))?settings.set_boolean("reload-signal", false):settings.set_boolean("reload-signal", true);
  },
});

const Prefs2 =   new GObject.Class({
  Name: 'Prefs2',
  Extends: Prefs1,

  _init: function() {  
  
    this.parent(-1);
    
    this.prefsWA(_("Minimizing Effects  ") ,"minimizing-effect","" ,"",0  ,settings,this.box0);
    this.heading(1  , this.box1);
    this.prefsFor(_('Normal Windows')   ,'normal'  ,3  ,28 ,settings , this.box1 );
    this.prefsFor(_('Dialog Windows')   ,'dialog'  ,4  ,28 ,settings , this.box1 );
    this.prefsWA(_("Unminimizing Effects  ") ,"unminimizing-effect","","",6  ,settings,this.box2);
    this.heading(8 , this.box3  );
    this.prefsFor(_('Normal Windows')   ,'normal'  ,9  ,42 ,settings,  this.box3);
    this.prefsFor(_('Dialog Windows')   ,'dialog'  ,10 ,42 ,settings,  this.box3);
  },
});

const  EffectsTweaks =  new GObject.Class({
  Name: 'EffectsTweaks',
  Extends: Gtk.Grid,

  _init: function(eStr,sIndex,KEY,settings) {
  
    this.parent({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20, row_spacing: 15 ,border_width:20});
    this.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b>"+_("Any  Changes  done  here  are  Applied  immediately")+"</b></big>"}) ,0  ,0 ,1  ,1);
    this.tweakParameter( 3  ,_("Time for which this animation last")  ,2  ,0 ,10000  ,eStr ,sIndex ,KEY ,settings);  
    this.tweakParameter( 4  ,_("Initial width  [  in Percentage  ]")  ,3  ,0 ,100    ,eStr ,sIndex ,KEY ,settings);
    this.tweakParameter( 5  ,_("Final width    [  in Percentage  ]")  ,4  ,0 ,100    ,eStr ,sIndex ,KEY ,settings);  
    this.tweakParameter( 6  ,_("Intial height  [  in Percentage  ]")  ,5  ,0 ,100    ,eStr ,sIndex ,KEY ,settings);  
    this.tweakParameter( 7  ,_("Final height  [  in Percentage  ]")   ,6  ,0 ,100    ,eStr ,sIndex ,KEY ,settings);
    this.tweakParameter( 8  ,_("Intial Opacity  [    0  -  255    ]") ,7  ,0 ,255    ,eStr ,sIndex ,KEY ,settings);  
    this.tweakParameter( 9  ,_("Final Opacity  [    0  -  255    ]")  ,8  ,0 ,255    ,eStr ,sIndex ,KEY ,settings);  
    this.tweakParameter( 10 ,_("Pivot Point X  [  in Percentage  ]")  ,9  ,0 ,100    ,eStr ,sIndex ,KEY ,settings);
    this.tweakParameter( 11 ,_("Pivot Point Y  [  in Percentage  ]")  ,10 ,0 ,100    ,eStr ,sIndex ,KEY ,settings);
  },

  tweakParameter : function(pNo,INFO,pos,minPV,maxPV,eStr,sIndex,KEY,settings) {
  
    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter   = Gtk.SpinButton.new_with_range(minPV,maxPV,1);
    eStr= settings.get_strv(KEY);
     effectParameter.set_value(parseInt(eStr[pNo+sIndex]));
      effectParameter.connect('notify::value', function(spin) {     
        eStr= settings.get_strv(KEY);
        eStr[pNo+sIndex]=spin.get_value_as_int().toString();
        settings.set_strv(KEY,eStr);
      });
    this.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.attach(effectParameter ,17   ,pos  ,1   ,1);
  },
});

const AboutPage =  new GObject.Class({
  Name: 'AboutPage',
  Extends: Gtk.ScrolledWindow,

  _init: function(params) {
  
    this.parent();
        
    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 30 });
    let imageBox = new Gtk.Box();
    let image = new Gtk.Image({ file: Extension.dir.get_child('eicon.png').get_path(), pixel_size: 96 });
    let textBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
    let text = new Gtk.Label({ wrap: true, justify: 2, use_markup: true,label: "<big><b>" + Metadata.name + "</b></big>" + "\n" +"<small>Version  "+ Metadata.version +"</small>\n\n" +(Metadata.description)+"\n\n\n\n\n<span size=\"small\">This program comes with ABSOLUTELY NO WARRANTY.\nSee the <a href=\"https://www.gnu.org/licenses/old-licenses/gpl-2.0.html\">GNU General Public License, version 2 or later</a>for details.</span>"+ "\n" });
    let ResetExtensionButton = new Gtk.Button({label: _("Reset Animation Tweaks Extension"),halign:Gtk.Align.CENTER});

    imageBox.set_center_widget(image);
    textBox.pack_start(text,  false, false, 0);
    vbox.pack_start(imageBox, false, false, 0);
    vbox.pack_start(textBox,  false, false, 0);
    vbox.pack_start(ResetExtensionButton,  false, false, 0);
    this.add(vbox);
    ResetExtensionButton.connect('clicked', ()=> this.resetExtension( settings));
  },

  resetExtension: function( settings) {
  
    settings.reset('normal');
    settings.reset('dialog');
    settings.reset('modal-dialog');
    
    settings.reset('dropdown-menu');
    settings.reset('popup-menu');
    settings.reset('combo');
    settings.reset('splashscreen');
    settings.reset('tooltip');
    settings.reset('override-other');
    
    settings.reset('opening-effect-windows');
    settings.reset('opening-effect-others');
    settings.reset('closing-effect');
    settings.reset("minimizing-effect");
    settings.reset("unminimizing-effect");
    settings.reset('wayland');
    
    this.reloadExtension(settings);
  },  
  
  reloadExtension: function(settings) {
  
    (settings.get_boolean("reload-signal"))?settings.set_boolean("reload-signal", false):settings.set_boolean("reload-signal", true);
  },
});

function initTranslations() {

  let localeDir = Extension.dir.get_child("locale");
  Gettext.bindtextdomain("animation-tweaks", localeDir.query_exists(null)?localeDir.get_path():Config.LOCALEDIR);
}
