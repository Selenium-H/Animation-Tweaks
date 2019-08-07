//Version 7

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
    this.add_titled(new Prefs1(9 , "open"  ), 'Open'    , _('Open'    ));
    this.add_titled(new Prefs1(3 , "close" ), 'Close'   , _('Close'   ));
    this.add_titled(new Prefs2(            ), 'Minimize', _('Minimize'));
    this.add_titled(new AboutPage(         ), 'About'   , _('About'   ));  
  }
});

const Prefs1 = new GObject.Class({

  Name: 'Prefs1',
  Extends: Gtk.Grid,

  _init: function(items,action) {
  
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
    
    switch(action) {
      case "open":
        this.prefsWA("opening-effect-windows","",0  , this.box0);          
        break;
      case "close":
        this.prefsWA("closing-effect"        ,"",0  , this.box0);          
        break;
    }

    this.heading(1 , this.box1);
    this.prefsFor("",       'normal'         ,2   ,action  , this.box1 );
    this.prefsFor("",       'dialog'         ,3   ,action  , this.box1 );
    this.prefsFor("",       'modal-dialog'   ,4   ,action  , this.box1 );
    
    if(items>3) {         
      this.prefsWA("opening-effect-others","wayland",1  , this.box2);
      this.prefsFor("\t\t", 'dropdown-menu'  ,6   ,action  , this.box3 );
      this.prefsFor("",     'popup-menu'     ,7   ,action  , this.box3 );
      this.prefsFor("",     'combo'          ,8   ,action  , this.box3 );
      this.prefsFor("",     'splashscreen'   ,9   ,action  , this.box3 );
      this.prefsFor("",     'tooltip'        ,10  ,action  , this.box3 );
      this.prefsFor("",     'override-other' ,11  ,action  , this.box3 );
    }
  },

  heading: function(pos,sbox) {
  
    sbox.attach(new Gtk.Label({ xalign: 1, label: _("Items") ,halign: Gtk.Align.CENTER })                 ,0  ,pos ,1  ,1);
    sbox.attach(new Gtk.Label({ xalign: 1, label: _("Effect"),halign: Gtk.Align.CENTER })                 ,5  ,pos ,11 ,1);
    sbox.attach(new Gtk.Label({ xalign: 1, label: _("Time in miliseconds"),halign: Gtk.Align.CENTER })    ,20 ,pos ,5  ,1);
    sbox.attach(new Gtk.Label({ xalign: 1, label:  ("          ")+_("Status"),halign: Gtk.Align.CENTER }) ,25 ,pos ,5  ,1);
  },
  
  prefsWA: function(KEY0,KEY1,pos,sbox) {
  
    let SettingLabel0   = new Gtk.Label({ xalign:  1, label: _(settings.settings_schema.get_key(KEY0).get_summary()),halign: Gtk.Align.CENTER });
    let SettingSwitch0 = new Gtk.Switch({hexpand: false, active: settings.get_boolean(KEY0), halign: Gtk.Align.END});
        
    SettingSwitch0.connect("notify::active", Lang.bind(this, function(button) {
      settings.set_boolean(KEY0, button.active);
      this.reloadExtension();
    }));
    
    sbox.attach(SettingLabel0   ,0  ,pos  ,1   ,1);
    sbox.attach(SettingSwitch0  ,2  ,pos  ,3   ,1);

    if(KEY1.length<=0) {
      return;
    }
    
    let SettingLabel1   = new Gtk.Label({ xalign:  1, label:"\t\t\t"+ _(settings.settings_schema.get_key(KEY1).get_summary()),halign: Gtk.Align.END });
    let SettingSwitch1 = new Gtk.Switch({hexpand: false, active: settings.get_boolean(KEY1), halign: Gtk.Align.END});
    
    SettingSwitch1.connect("notify::active", Lang.bind(this, function(button) {
      settings.set_boolean(KEY1, button.active);
    }));
                     
    sbox.attach(SettingLabel1   ,10  ,pos   ,11  ,1);
    sbox.attach(SettingSwitch1  ,12  ,pos   ,13  ,1); 
  },

  prefsFor: function(LABEL,KEY,pos,action, sbox) {
  
    KEY = KEY+'-'+action;
    let  effectsList=settings.get_strv(action+'-effects-list');       
    let eStr = settings.get_strv(KEY);
    
    let SettingLabel = new Gtk.Label({ xalign:  1, label: _(settings.settings_schema.get_key(KEY).get_summary())+LABEL,halign: Gtk.Align.START });
    let SettingSwitch = new Gtk.Switch({hexpand: false,vexpand:false,active: (eStr[0]=='T')? true:false,halign:Gtk.Align.END});
    let box  = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0 });
    let effectsCombo = new Gtk.ComboBoxText({hexpand: false,vexpand:false});
    let tweakButton = new Gtk.Button({label: _("☰"),halign:Gtk.Align.START});
    let timeSetting = Gtk.SpinButton.new_with_range(0,10000,10);


    SettingSwitch.connect('notify::active', function(button) { 
     
      eStr= settings.get_strv(KEY);
      eStr[0]=(eStr[0]=='F')? 'T':'F';
      settings.set_strv(KEY,eStr);  
    });

    
    let cIndex = 0;

   do {
      effectsCombo.append(effectsList[cIndex+1],effectsList[cIndex+1]);
      cIndex = effectsList.indexOf('|',cIndex+1);
   } while(cIndex!=-1);

 
    effectsCombo.set_active(this.getIndexOf(eStr[1],effectsList));

    effectsCombo.connect('changed', (widget)=> {this.getNthEffect(widget.get_active(),effectsList,KEY);eStr = settings.get_strv(KEY);});
    tweakButton.connect('clicked', ()=> this.effectsTweaks(timeSetting,effectsCombo,effectsList,eStr,KEY));

    timeSetting.set_value(this.getTotalTimeOf(eStr));
    timeSetting.connect('notify::value', (spin)=> this.setEffectTime(spin.get_value_as_int(),KEY));
    
    box.add(SettingSwitch);
    sbox.attach(SettingLabel  ,0   ,pos  ,1   ,1);
    sbox.attach(effectsCombo  ,5   ,pos  ,11  ,1);
    sbox.attach(tweakButton   ,17  ,pos  ,1   ,1);  
    sbox.attach(timeSetting   ,20  ,pos  ,5   ,1);
    sbox.attach(box           ,25  ,pos  ,5   ,1);
  },

  setEffectTime: function(value,KEY) {

   let eStr = settings.get_strv(KEY);
   let cIndex = 0;
   let totalTime = this.getTotalTimeOf(eStr); 

   for (cIndex = 8;cIndex<eStr.length;cIndex=cIndex+8) {
 
      eStr[cIndex]=( Math.floor(parseFloat(eStr[cIndex])/(totalTime*0.001)*value)*0.001).toString();
      
   }
   settings.set_strv(KEY,eStr);

  },



  getIndexOf: function(effectName,effectsList) {

    let cIndex = 0;
    let kIndex = 0;

    do {
      if(effectName == effectsList[cIndex+1]) {
        return kIndex;
      }
      kIndex++;
      cIndex = effectsList.indexOf('|',cIndex+1);
   } while(cIndex!=-1);

  },

  getTotalTimeOf: function(eStr) {

   let cIndex = 0;
   let totalTime = 0; 
   for (cIndex = 8;cIndex<eStr.length;cIndex=cIndex+8) {
     totalTime = totalTime + parseFloat(eStr[cIndex]);
   }
  
   return totalTime*1000;

  },

  getNthEffect: function(nthEffect,effectsList,KEY) {
   
    let keyValue = settings.get_strv(KEY);
   
    let kIndex=keyValue[0];
    keyValue=[];
    keyValue[0] = kIndex;
    kIndex=0; 

   
    let startIndex = 0;
    for(kIndex = 0;kIndex<nthEffect;kIndex++) {
      startIndex = effectsList.indexOf('|',startIndex+2);
    }
    
   
    let endIndex   = effectsList.indexOf('|',startIndex+2);
    if(endIndex == -1) {
      endIndex = effectsList.length;
    }

    kIndex=1; 
    for(let i=startIndex+1;i<=endIndex-1;i++) {
      keyValue[kIndex]=effectsList[i];
      kIndex++;
    }

    settings.set_strv(KEY,keyValue);
  },

  effectsTweaks : function(timeSetting,effectsCombo,effectsList,eStr,KEY ) { 
         
    let dialog = new Gtk.Dialog({title:_("Customize")+"   "+eStr[1]+"   "+_("Animation"),transient_for:this.get_toplevel(),use_header_bar: true,modal:true});
    dialog.get_content_area().pack_start(new EffectsTweaks(KEY,settings), true, true, 0);
    dialog.set_default_response(Gtk.ResponseType.CANCEL);
    let addButton     = dialog.add_button("Reset Default", Gtk.ResponseType.OK);
    dialog.connect('response', Lang.bind(this, function(dialog, id) { 
      
      if (id == Gtk.ResponseType.OK) {
        this.getNthEffect(effectsCombo.get_active(),effectsList,KEY);  
      }

      eStr = settings.get_strv(KEY);
      timeSetting.set_value(this.getTotalTimeOf(eStr)); 
      dialog.destroy();
    }));
    dialog.show_all();
  },

  reloadExtension: function() {
    (settings.get_boolean("reload-signal"))?settings.set_boolean("reload-signal", false):settings.set_boolean("reload-signal", true);
  },
});

const Prefs2 =   new GObject.Class({
  Name: 'Prefs2',
  Extends: Prefs1,

  _init: function() {  
  
    this.parent(-1);
    
    this.prefsWA("minimizing-effect","",0  ,this.box0);
    this.heading(1  , this.box1);
    this.prefsFor("",  'normal'  ,3  ,"minimize" , this.box1 );
    this.prefsFor("",  'dialog'  ,4  ,"minimize" , this.box1 );
    this.prefsWA("unminimizing-effect","",6  ,this.box2);
    this.heading(8 , this.box3  );
    this.prefsFor("",  'normal'  ,9  ,"unminimize" ,  this.box3);
    this.prefsFor("",  'dialog'  ,10 ,"unminimize" ,  this.box3);
  },
});


const  EffectsTweaks =  new GObject.Class({
  Name: 'EffectsTweaks',
  Extends: Gtk.ScrolledWindow,

  _init: function(KEY,settings) {
    this.parent({hscrollbar_policy:2});
    this.set_min_content_height(500); 
    this.gridWin = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20, row_spacing: 15 ,border_width:20});
    this.add(this.gridWin);
    let eStr =  settings.get_strv(KEY);
    this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b>"+_("Any  Changes  done  here  are  Applied  immediately")+"</b></big>"}) ,0  ,0 ,1  ,1);
    this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:" ",halign: Gtk.Align.CENTER }) ,0  ,1 ,1  ,1);
    this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b>"+_("Initial Tween Parameters")+"</b></big>",halign: Gtk.Align.CENTER }) ,0  ,2 ,1  ,1);
    this.tweakParameter      ( 3, _("Intial Opacity\t\t[\t0  -  255\t\t]"    ), 3, 0, 255,  eStr,   KEY,  1   );  
    this.tweakParameterSymbol( 4, _("Initial Width\t\t[\tin Percentage\t]"   ), 4,          eStr,   KEY       );
    this.tweakParameterSymbol( 5, _("Initial Height\t\t[\tin Percentage\t]"  ), 5,          eStr,   KEY       );
    this.tweakParameterSymbol( 6, _("Initial Position\t\t[\tX  Coordinate\t]"), 6,          eStr,   KEY       );
    this.tweakParameterSymbol( 7, _("Initial Position\t\t[\tY  Coordinate\t]"), 7,          eStr,   KEY       );

    let pos=7;
    let i=7;

    while(i<8*eStr[2]) {

      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b>"+_("Next Tween Parameters")+"</b></big>",halign: Gtk.Align.CENTER }) ,0  ,++pos ,1  ,1);

      this.tweakParameter      ( ++i, _("Time\t\t\t\t[\tin milliseconds\t]"   ), ++pos, 0, 10000,  eStr,   KEY,  1000);  
      this.tweakParameter      ( ++i, _("Pivot Point X\t\t[\tin Percentage\t]"), ++pos, 0, 100,    eStr,   KEY,   100);
      this.tweakParameter      ( ++i, _("Pivot Point Y\t\t[\tin Percentage\t]"), ++pos, 0, 100,    eStr,   KEY,   100);
      this.tweakParameter      ( ++i, _("Ending Opacity\t\t[\t0  -  255\t\t]" ), ++pos, 0, 255,    eStr,   KEY,     1);
      this.tweakParameterSymbol( ++i, _("Ending Width\t\t[\tin Percentage\t]" ), ++pos,            eStr,   KEY       );
      this.tweakParameterSymbol( ++i, _("Ending Height\t\t[\tin Percentage\t]"), ++pos,            eStr,   KEY       );
      this.tweakParameterSymbol( ++i, _("Ending Position\t[\tX  Coordinate\t]"), ++pos,            eStr,   KEY       );
      this.tweakParameterSymbol( ++i, _("Ending Position\t[\tY  Coordinate\t]"), ++pos,            eStr,   KEY       );
    }
  },

  tweakParameter : function(pNo,INFO,pos,minPV,maxPV,eStr,KEY,multiplier) {
  
    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter   = Gtk.SpinButton.new_with_range(minPV,maxPV,1);
    eStr = settings.get_strv(KEY);
     effectParameter.set_value(parseFloat(eStr[pNo])*multiplier);
      effectParameter.connect('notify::value', function(spin) {     
        eStr= settings.get_strv(KEY);
        eStr[pNo]=(spin.get_value_as_int()/multiplier).toString();
        settings.set_strv(KEY,eStr);
      });
    this.gridWin.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.gridWin.attach(effectParameter ,17   ,pos  ,1   ,1);
  },

  tweakParameterSymbol : function(pNo,INFO,pos,eStr,KEY) {

    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter   = new Gtk.Entry({text:eStr[pNo]});

    eStr = settings.get_strv(KEY);     

     effectParameter.connect('changed', function() {     
        eStr= settings.get_strv(KEY);
        eStr[pNo] = effectParameter.text;
        settings.set_strv(KEY,eStr);
      });


    this.gridWin.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.gridWin.attach(effectParameter ,17   ,pos  ,1   ,1);

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
  
    settings.reset('normal-open');
    settings.reset('normal-close');
    settings.reset('normal-minimize');
    settings.reset('normal-unminimize');


    settings.reset('dialog-open');
    settings.reset('dialog-close');
    settings.reset('dialog-minimize');
    settings.reset('dialog-unminimize');

    settings.reset('modal-dialog-open');
    settings.reset('modal-dialog-close');
    
    settings.reset('dropdown-menu-open');
    settings.reset('popup-menu-open');
    settings.reset('combo-open');
    settings.reset('splashscreen-open');
    settings.reset('tooltip-open');
    settings.reset('override-other-open');
    
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
