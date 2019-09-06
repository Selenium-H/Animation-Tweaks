/*
Version 7
=========

Effect String Format   [ Status   Name   Tweens  IO      IW     IH     IPX     IPY         T     PPx     PPY     NO      NW      NH     NPX     NPY  ... ]

Read the effectParameters.txt File for details.

*/

const Config = imports.misc.config;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
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

  Convenience.initTranslations("animation-tweaks");
  settings = Convenience.getSettings("org.gnome.shell.extensions.animation-tweaks");
  
}

function buildPrefsWidget() {

  let widget = new AnimationTweaksPrefs();
  let switcher  = new Gtk.StackSwitcher({halign: Gtk.Align.CENTER, visible: true, stack: widget});
  Mainloop.timeout_add(0, () => {widget.get_toplevel().get_titlebar().custom_title = switcher;return false;});
  widget.show_all();
  return widget;
  
}

function reloadExtension () {

    (settings.get_boolean("reload-signal")) ? settings.set_boolean("reload-signal", false) : settings.set_boolean("reload-signal", true);
    
}

const AboutPage =  new GObject.Class({
  Name: 'AboutPage',
  Extends: Gtk.ScrolledWindow,

  _init: function(params) {
  
    this.parent();
  },
  
  showInfo: function(){
  
    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 30 });
    let imageBox = new Gtk.Box();
    let image = new Gtk.Image({ file: Extension.dir.get_child('eicon.png').get_path(), pixel_size: 96 });
    let textBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
    let text = new Gtk.Label({ wrap: true, 
                               justify: 2, 
                               use_markup: true,
                               label: "<big><b>" + Metadata.name + "</b></big>" + "\n" +"<small>Version  "+ Metadata.version +"</small>\n\n" +(Metadata.description)+
                                      "\n\n\n\n\n<span size=\"small\">This program comes with ABSOLUTELY NO WARRANTY."+
                                      "\nSee the <a href=\"https://www.gnu.org/licenses/old-licenses/gpl-2.0.html\">GNU General Public License, version 2 or later</a>for"+
                                      " details.</span>"+"\n"
                             });
    let ResetExtensionButton = new Gtk.Button({label: _("Reset Animation Tweaks Extension"),halign:Gtk.Align.CENTER});

    imageBox.set_center_widget(image);
    textBox.pack_start(text,  false, false, 0);
    vbox.pack_start(imageBox, false, false, 0);
    vbox.pack_start(textBox,  false, false, 0);
    vbox.pack_start(ResetExtensionButton,  false, false, 0);
    this.add(vbox);

    ResetExtensionButton.connect('clicked', ()=> this.resetExtension());
    
  },
  
  resetExtension: function() {
  
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
    settings.reset('modal-dialog-minimize');
    settings.reset('modal-dialog-unminimize');
    
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
    
    reloadExtension();
  }  

});

const AnimationTweaksPrefs = new GObject.Class({
  Name: 'AnimationTweaksPrefs',
  Extends: Gtk.Stack,
    
  _init: function() {
  
    this.openingPrefs = new PrefsWindowForOpening("open");
    this.closingPrefs = new PrefsWindowForClosing("close");
    this.mixMaxPrefs  = new PrefsWindowForMinMax("minimize");
    this.aboutPage    = new AboutPage();
  
    this.parent({ transition_type: 6  ,transition_duration: 300 });
    
    this.add_titled(this.openingPrefs, "Open"    , _("Open"    ));
    this.add_titled(this.closingPrefs, "Close"   , _("Close"   ));
    this.add_titled(this.mixMaxPrefs,  "Minimize", _("Minimize"));
    this.add_titled(this.aboutPage,    "About"   , _("About"   ));  

    this.openingPrefs.displayPrefs();
    this.closingPrefs.displayPrefs();
    this.mixMaxPrefs.displayPrefs();
    this.aboutPage.showInfo();

  },

});

const EffectsList = new GObject.Class({
  Name: 'EffectsList',
    
  _init: function(KEY) {
  
    this.effectsList = settings.get_strv(KEY); 
    
  },
  
  getEffectAt: function(index) {
  
    let listIndex = 0;
    let endIndex = 0;
    let effectIndex = 0;
    let eStr=[];

    while(listIndex!=-1) {
      if(effectIndex == index) {
        endIndex = this.effectsList.indexOf('|',listIndex+1);
        if(endIndex == -1) {
          endIndex = this.effectsList.length;
        }  
        else {
          endIndex--;
        }
 
        listIndex++;
        while(listIndex <= endIndex) {
          eStr.push(this.effectsList[listIndex]);
          listIndex++;
        }

        return eStr;
      }
      effectIndex++;
      listIndex = this.effectsList.indexOf('|',listIndex+1);
    } 
  
    return [];

  },
  
  getIndexOf: function(effectName) {
  
    let listIndex = 0;
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
 
  getTotalTimeOf: function(eStr) {

   let cIndex = 0;
   let totalTime = 0; 
   for (cIndex = 8;cIndex<eStr.length;cIndex=cIndex+8) {
     totalTime = totalTime + parseFloat(eStr[cIndex]);
   }
  
   return totalTime*1000;

  },  
  
  loadEffectsListToComboBox: function(effectsCombo) {
  
    let cIndex = 0;

     while(cIndex!=-1) {
       effectsCombo.append(this.effectsList[cIndex+1],this.effectsList[cIndex+1]);
       cIndex = this.effectsList.indexOf('|',cIndex+1);
     } 
  },

  setEffectTime: function(value,eStr) {

   let cIndex = 0;
   let totalTime = this.getTotalTimeOf(eStr); 

   if(totalTime == 0) {
     for (cIndex = 8;cIndex<eStr.length;cIndex=cIndex+8) {
       eStr[cIndex]="0.001";
     }
     totalTime = parseInt(eStr[2]);
   }

   for (cIndex = 8;cIndex<eStr.length;cIndex=cIndex+8) {
     eStr[cIndex]= ((parseFloat(eStr[cIndex])*value)/totalTime).toPrecision(3).toString();
   }  
  
   return eStr;

  },
  
});

const  EffectsTweaks =  new GObject.Class({
  Name: 'EffectsTweaks',
  Extends: Gtk.ScrolledWindow,

  _init: function(KEY,settings) {

    this.parent({hscrollbar_policy:2});
    this.set_min_content_height(500); 
    this.gridWin = new Gtk.Grid({ column_spacing: 30, halign: Gtk.Align.CENTER, margin: 20, row_spacing: 15 ,border_width:20});
    this.add(this.gridWin);
    this.KEY = KEY;
    let eStr = settings.get_strv(this.KEY);
    
    this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b>"+_("Any  Changes  done  here  are  Applied  immediately")+"</b></big>",
                                       halign: Gtk.Align.CENTER}),0,0,3,1);
    this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:_("Details of parameter values are described in")+"  <i>effectParameters.txt</i>  "+_("file  in  extension folder."),                             halign: Gtk.Align.CENTER }) ,0  ,1 ,3  ,1);
    this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b><u>"+_("Initial Tween Parameters")+"</u></b></big>",
                                       halign: Gtk.Align.CENTER }) ,0  ,2 ,3  ,1);
    this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:" ",halign: Gtk.Align.CENTER }) ,0  ,3 ,1  ,1);
    this.tweakParameter        ( 3, _("Intial Opacity\t\t    [\t    0  -  255\t\t\t]"),                         4, 0, 255,       1                       );  
    this.tweakParameterDim     ( 4, _("Initial Width\t\t    [\t    0  -  200\t%\t\t]"),                         5, 0, 200,     100, ["MW"]               );
    this.tweakParameterDim     ( 5, _("Initial Height\t\t    [\t    0  -  200\t%\t\t]"),                        6, 0, 200,     100, ["MH"]               );
    this.tweakParameterPosition( 6, _("Initial Position  X\t    [\t    100 ± % width from default X→    \t]"),  7, 0, 200,     100, ["MX","mX","SX","IX"]);
    this.tweakParameterPosition( 7, _("Initial Position  Y\t    [\t    100 ± % height from default Y↓    \t]"), 8, 0, 200,     100, ["MY","mY","SY","IY"]);

    let pos=8;
    let i=7;

    while(i<8*eStr[2]) {

      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:" ",halign: Gtk.Align.CENTER }) ,0  ,++pos ,1  ,1);
      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b><u>"+_("Next Tween Parameters")+"</u></b></big>",
                                         halign: Gtk.Align.CENTER }) ,0  ,++pos ,3  ,1);
      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:" ",halign: Gtk.Align.CENTER }) ,0  ,++pos ,1  ,1);
     
      this.tweakParameter        ( ++i, _("Time\t\t\t\t    [\t    in milliseconds\t]"),                        ++pos, 0, 10000,  1000                       );  
      this.tweakParameter        ( ++i, _("Pivot Point   X\t\t    [\t    0  -  100\t%\t\t]"),                  ++pos, 0, 100,     100                       );
      this.tweakParameter        ( ++i, _("Pivot Point   Y\t\t    [\t    0  -  100\t%\t\t]"),                  ++pos, 0, 100,     100                       );
      this.tweakParameter        ( ++i, _("Ending Opacity\t    [\t    0  -  255\t\t\t]"),                      ++pos, 0, 255,       1                       );
      this.tweakParameterDim     ( ++i, _("Ending Width\t\t    [\t    0  -  200\t%\t\t]"),                     ++pos, 0, 200,     100, ["MW"]               );
      this.tweakParameterDim     ( ++i, _("Ending Height\t\t    [\t    0  -  200\t%\t\t]"),                    ++pos, 0, 200,     100, ["MH"]               );
      this.tweakParameterPosition( ++i, _("Ending Position  X\t    [\t    100 ± % width from current X→\t]"),  ++pos, 0, 200,     100, ["MX","mX","SX","IX"]);
      this.tweakParameterPosition( ++i, _("Ending Position  Y\t    [\t    100 ± % height from current Y↓\t]"), ++pos, 0, 200,     100, ["MY","mY","SY","IY"]);
    }
    
  },
  
  filterInvalidValues: function(checkForThisValue,minPV,maxPV,acceptableValues,temp,multiplier) {

    for(let i=0;i<acceptableValues.length;i++){
      if(checkForThisValue==acceptableValues[i]){
        return [checkForThisValue,checkForThisValue,true]; 
      }
    }
    
    if(checkForThisValue == ""){
      return [(minPV/multiplier).toString(),minPV.toString(),false,false];  
    }
    
    let value = parseFloat(checkForThisValue)*temp;
    
    if(isNaN(value)){
      return [(minPV/multiplier).toString(),minPV.toString(),false,false];  
    }
    
    if(value >= minPV && value <= maxPV) {
      return [(value/multiplier).toString(),value.toString(),true,false];
    }
    
    if(value > maxPV){
      return [(maxPV/multiplier).toString(),maxPV.toString(),true,true];
    }

    if(value < minPV){
      return [(minPV/multiplier).toString(),minPV.toString(),true,true];
    }

    return [(minPV/multiplier).toString(),minPV.toString(),false,false];
    
  },

  tweakParameter : function(pNo,INFO,pos,minPV,maxPV,multiplier) {
  
    let eStr = settings.get_strv(this.KEY);   
    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter   = Gtk.SpinButton.new_with_range(minPV,maxPV,1);
    
     effectParameter.set_value(parseFloat(eStr[pNo])*multiplier);
      effectParameter.connect('notify::value', (spin)=> {     
        eStr= settings.get_strv(this.KEY);
        eStr[pNo]=(spin.get_value_as_int()/multiplier).toString();
        settings.set_strv(this.KEY,eStr);
      });
    this.gridWin.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.gridWin.attach(effectParameter ,2    ,pos  ,1   ,1);
    
  },

  tweakParameterDim : function(pNo,INFO,pos,minPV,maxPV,multiplier,acceptableValues) {

    let eStr = settings.get_strv(this.KEY);   
    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter   = new Gtk.Entry({text: this.filterInvalidValues( eStr[pNo],minPV,maxPV,acceptableValues,multiplier,multiplier)[1] });

     effectParameter.connect('changed', ()=> {     
     
        let value="" ; 
        let shouldCommit = false;
        let shouldOverrideText = false;
        
        if(effectParameter.text.length > 3){
          effectParameter.text = maxPV.toString();
          eStr[pNo] = (maxPV/multiplier).toString();
          shouldCommit = true;
        }
        else {
          [eStr[pNo],value, shouldCommit, shouldOverrideText] = this.filterInvalidValues( effectParameter.text , minPV , maxPV,acceptableValues,1,multiplier);
        }
        
        if(shouldOverrideText == true){
          effectParameter.text = value;
        }
        
        if(shouldCommit == true){
          settings.set_strv(this.KEY,eStr);
        }
     
      });

    this.gridWin.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.gridWin.attach(effectParameter ,2    ,pos  ,1   ,1);

  }, 

  tweakParameterPosition : function(pNo,INFO,pos,minPV,maxPV,multiplier,acceptableValues) {

    let eStr = settings.get_strv(this.KEY);   
    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter   = new Gtk.Entry({text: this.filterInvalidValues( eStr[pNo],minPV,maxPV,acceptableValues,multiplier,multiplier)[1] });

     effectParameter.connect('changed', ()=> {     
     
        let value="" ; 
        let shouldCommit = false;
        let shouldOverrideText = false;
        
        if(effectParameter.text.length > 3){
          effectParameter.text = maxPV.toString();
          eStr[pNo] = (maxPV/multiplier).toString();
          shouldCommit = true;
        }
        else {
          [eStr[pNo],value, shouldCommit, shouldOverrideText] = this.filterInvalidValues( effectParameter.text , minPV , maxPV,acceptableValues,1,multiplier);
        }
        
        if(shouldOverrideText == true){
          effectParameter.text = value;
        }
        
        if(shouldCommit == true){
          settings.set_strv(this.KEY,eStr);
        }
     
      });

    this.gridWin.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.gridWin.attach(effectParameter ,2    ,pos  ,1   ,1);

  }, 

});

const PrefsWindow = new GObject.Class({
  Name: 'PrefsWindow',
  Extends: Gtk.Grid,

  _init: function(action) {
  
    this.parent({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20,margin_top:0, row_spacing: 20 ,border_width:20});
    this.addGrids();
    this.action = action;
   
  },

  addGrids: function() {

    this.switchBox0 = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20, margin_top: 10, row_spacing: 0  ,border_width:0 });
    this.switchBox1 = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20,                 row_spacing: 0  ,border_width:0 });
    
    this.attach(this.switchBox0,0,0,5,1);
    this.attach(this.switchBox1,0,10,5,1);
    
  },
  
  changeEffectTime: function(value,allEffectsList,KEY) {

   let eStr = settings.get_strv(KEY);
   settings.set_strv(KEY,allEffectsList.setEffectTime(value,eStr));

  },
  
  effectsTweaks : function(timeSetting,effectsCombo,allEffectsList,KEY ) { 
   
    let eStr = settings.get_strv(KEY);    
    let dialog = new Gtk.Dialog({title:_("Customize")+"   "+eStr[1]+"   "+_("Animation"),transient_for:this.get_toplevel(),use_header_bar: true,modal:true});
    dialog.get_content_area().pack_start(new EffectsTweaks(KEY,settings), true, true, 0);
    dialog.set_default_response(Gtk.ResponseType.CANCEL);
    let addButton     = dialog.add_button("Restore Default", Gtk.ResponseType.OK);
    dialog.connect('response', Lang.bind(this, function(dialog, id) { 
      
      if (id == Gtk.ResponseType.OK) {
        this.selectEffectFromList(timeSetting,effectsCombo.get_active(),allEffectsList,KEY);
      }

      eStr = settings.get_strv(KEY);
      timeSetting.set_value(allEffectsList.getTotalTimeOf(eStr)); 
      dialog.destroy();
    }));
    dialog.show_all();
    
  },

  heading: function(posY) {
  
    this.attach(new Gtk.Label({ xalign: 1, label: _("Items") ,halign: Gtk.Align.CENTER })                 ,0  ,posY ,1  ,1);
    this.attach(new Gtk.Label({ xalign: 1, label: _("Effect"),halign: Gtk.Align.CENTER })                 ,1  ,posY ,1  ,1);
    this.attach(new Gtk.Label({ xalign: 1, label: _("Time in milliseconds"),halign: Gtk.Align.CENTER })   ,3  ,posY ,1  ,1);
    this.attach(new Gtk.Label({ xalign: 1, label: _("Status"),     halign: Gtk.Align.CENTER })            ,4  ,posY ,1  ,1);
    
  },

  insertSpace: function(LABEL,posX,posY,sBox) {
  
    sBox.attach(new Gtk.Label({ xalign: 1, label: LABEL ,halign: Gtk.Align.CENTER }), posX, posY, 1, 1);
    
  },

  prefsFor: function(KEY,posY,effectType,action) {
  
    KEY = KEY+'-'+action;
    let  allEffectsList = new EffectsList(effectType+"-"+action+"-effects-list");       
    let eStr = settings.get_strv(KEY);
    
    let SettingLabel = new Gtk.Label({ xalign:  1, label: _(settings.settings_schema.get_key(KEY).get_summary()),halign: Gtk.Align.START });
 
    let SettingSwitch = new Gtk.Switch({hexpand: false,vexpand:false,active: (eStr[0]=='T')? true:false,halign:Gtk.Align.CENTER});
    let box  = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0,hexpand:true});
    
    let effectsCombo = new Gtk.ComboBoxText({hexpand: false,vexpand:false});
    allEffectsList.loadEffectsListToComboBox(effectsCombo);    
    effectsCombo.set_active(allEffectsList.getIndexOf(eStr[1]));
    
    let tweakButton = new Gtk.Button({label: "☰",halign:Gtk.Align.START});

    let timeSetting = Gtk.SpinButton.new_with_range(0,10000,10);
    timeSetting.set_value(allEffectsList.getTotalTimeOf(eStr));


    SettingSwitch.connect('notify::active', ()=> this.toggleItemStatus(SettingSwitch.active,KEY));
    effectsCombo.connect('changed', (widget)=> this.selectEffectFromList(timeSetting,widget.get_active(),allEffectsList,KEY));
    timeSetting.connect('notify::value', (spin)=> this.changeEffectTime(spin.get_value_as_int(),allEffectsList,KEY));

    tweakButton.connect('clicked', ()=> this.effectsTweaks(timeSetting,effectsCombo,allEffectsList,KEY));

    settings.connect("changed::"+KEY, () => {
      let eStr = settings.get_strv(KEY);
      SettingSwitch.active = (eStr[0]=='T')? true:false;
      effectsCombo.set_active(allEffectsList.getIndexOf(eStr[1]));
      timeSetting.set_value(allEffectsList.getTotalTimeOf(eStr));
    });

    box.add(SettingSwitch);
    
    this.attach(SettingLabel  ,0   ,posY  ,1   ,1);
    this.attach(effectsCombo  ,1   ,posY  ,1   ,1);
    this.attach(tweakButton   ,2   ,posY  ,1   ,1);  
    this.attach(timeSetting   ,3   ,posY  ,1   ,1);
    this.attach(box           ,4   ,posY  ,1   ,1);
    
  },
  
  prefsWA: function(KEY,posX,posY,sbox) {
  
    let SettingLabel0   = new Gtk.Label({ xalign:  1, label:_(settings.settings_schema.get_key(KEY).get_summary()),halign: Gtk.Align.START });
    let SettingSwitch0 = new Gtk.Switch({hexpand: false, active: settings.get_boolean(KEY), halign: Gtk.Align.START});
        
    SettingSwitch0.connect("notify::active", Lang.bind(this, function(button) {
      settings.set_boolean(KEY, button.active);
      reloadExtension();
    }));

    settings.connect("changed::"+KEY, () => {
      SettingSwitch0.set_active(settings.get_boolean(KEY));
    });

    let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, margin: 0,hexpand:true});
    
    sbox.attach(SettingLabel0   ,posX    ,posY  ,1   ,1);
    sbox.attach(SettingSwitch0  ,posX+1  ,posY  ,1   ,1);
    
  },  

  selectEffectFromList: function(timeSetting,selectedIndex,allEffectsList,KEY) {

    let eStr = settings.get_strv(KEY);
    let state = eStr[0];
    eStr = [];
    eStr[0] = state;

    let selectedEffectFromList = allEffectsList.getEffectAt(selectedIndex);
  
    let i=1;

    while(i!= selectedEffectFromList.length+1) {
      eStr[i] = selectedEffectFromList[i-1];
      i++;
    }

    settings.set_strv(KEY,eStr);
    timeSetting.set_value(allEffectsList.getTotalTimeOf(eStr));
    
  },
  
  toggleItemStatus: function(state,KEY) {
  
      let eStr = settings.get_strv(KEY);
      eStr[0] = (state)? "T":"F";
      settings.set_strv(KEY,eStr);  
 
  },

});

const PrefsWindowForClosing = new GObject.Class({
  Name: 'PrefsWindowForClosing',
  Extends: PrefsWindow,

  _init: function(action) {  
  
    this.parent(action);
    
  },

  displayPrefs: function() { 
    
    this.prefsWA("closing-effect",        0,  0,  this.switchBox0    );
    this.heading(1);
    this.prefsFor("normal",                   2,  "window", "close"  );
    this.prefsFor("dialog",                   3,  "window", "close"  );
    this.prefsFor("modal-dialog",             4,  "window", "close"  );
    
  },
  
});

const PrefsWindowForMinMax = new GObject.Class({
  Name: 'PrefsWindowForMinMax',
  Extends: PrefsWindow,

  _init: function(action) {  
  
    this.parent(action);
    
  },

  displayPrefs: function() { 
    
    this.prefsWA("minimizing-effect",      0,  0,   this.switchBox0       );
    this.heading(1);
    this.prefsFor("normal",                    2,   "window", "minimize"  );
    this.prefsFor("dialog",                    3,   "window", "minimize"  );
    this.prefsWA("unminimizing-effect",    0,  0,   this.switchBox1       );
    this.heading(12);
    this.prefsFor("normal",                    13,  "window", "unminimize");
    this.prefsFor("dialog",                    14,  "window", "unminimize");
    
  },
  
});

const PrefsWindowForOpening = new GObject.Class({
  Name: 'PrefsWindowForOpening',
  Extends: PrefsWindow,

  _init: function(action) {  
  
    this.parent(action);
  },

  displayPrefs: function() { 
    
    this.prefsWA("opening-effect-windows", 0,  0,   this.switchBox0   ); 
    this.heading(1);
    this.prefsFor("normal",                    2,   "window", "open"  );
    this.prefsFor("dialog",                    3,   "window", "open"  );
    this.prefsFor("modal-dialog",              4,   "window", "open"  );
    this.prefsWA("opening-effect-others",  0,  6,   this.switchBox1   );          
    this.insertSpace("",                   2,  6,   this.switchBox1   );
    this.prefsWA("wayland",                7,  6,   this.switchBox1   );
    this.prefsFor('dropdown-menu',             13,  "other",  "open"  );
    this.prefsFor('popup-menu',                14,  "other",  "open"  );
    this.prefsFor('combo',                     15,  "other",  "open"  );
    this.prefsFor('splashscreen',              16,  "other",  "open"  );
    this.prefsFor('tooltip',                   17,  "other",  "open"  );
    this.prefsFor('override-other',            18,  "other",  "open"  );
    
  },

}); 
