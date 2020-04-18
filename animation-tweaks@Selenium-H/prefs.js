/*

Version 9.4
===========

Effect String Format [ |  S    Name      C    PPX    PPY    CX     CY     CZ     T        OP     SX     SY     PX     PY      TZ     RX     RY     RZ     TRN  ]

Read the effectParameters.txt File for details.

*/

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const Metadata = Extension.metadata;
const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const _ = Gettext.domain("animation-tweaks").gettext;

const TWEEN_PARAMETERS_LENGTH = 16;

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

function reloadApplicationProfiles() {
  
  (settings.get_boolean("reload-profiles-signal")) ? settings.set_boolean("reload-profiles-signal", false) : settings.set_boolean("reload-profiles-signal", true);
    
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
                                      "\nSee the <a href=\"https://www.gnu.org/licenses/old-licenses/gpl-2.0.html\">GNU General Public License, version 2 or later</a>"+
                                      "for details.</span>"+"\n"
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
    settings.reset('normal-movestart');
    settings.reset('normal-movestop');

    settings.reset('dialog-open');
    settings.reset('dialog-close');
    settings.reset('dialog-minimize');
    settings.reset('dialog-unminimize');
    settings.reset('dialog-movestart');
    settings.reset('dialog-movestop');

    settings.reset('modaldialog-open');
    settings.reset('modaldialog-close');
    settings.reset('modaldialog-minimize');
    settings.reset('modaldialog-unminimize');
    settings.reset('modaldialog-movestart');
    settings.reset('modaldialog-movestop');
    
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
    
    settings.reset('opening-effect');
    settings.reset('closing-effect');
    settings.reset("minimizing-effect");
    settings.reset("unminimizing-effect");
    settings.reset("moving-effect");
        
    settings.reset("use-application-profiles");
    settings.reset("application-list");
    settings.reset("name-list");
   
    settings.reset('wayland');
    settings.reset("padosd-hide-timeout");
    settings.reset("notificationbanner-pos");
    
    reloadExtension();
    
  }  

});

const AnimationSettingsForItem = new GObject.Class({

  Name: 'AnimationSettingsForItem',

  _init(itemType,windowType,action,grid,posY,topLevel,dontAttach=false) {
   
    this.action          =  action;
    this.itemType        =  itemType;
    this.windowType      =  windowType;
    this.appIndex        =  0;
    this.KEY             =  this.windowType+"-"+this.action;
    this.allEffectsList  =  new EffectsList(this.itemType+"-"+this.action+"-effects-list");   
    this.appProfile      =  new EffectsList(this.KEY);
    this.eStr            =  this.eStr = this.appProfile.getEffectAt(this.appIndex);
    
    this.prefsLabel      =  new Gtk.Label({xalign: 1, label:_(settings.settings_schema.get_key(this.KEY).get_summary()), halign: Gtk.Align.START});
    this.prefsCombo      =  new Gtk.ComboBoxText({hexpand: false,vexpand:false});
    this.tweakButton     =  new Gtk.Button({label: "☰",halign:Gtk.Align.START});
    this.timeSetting     =      Gtk.SpinButton.new_with_range(10,10000,10);
    this.prefsSwitch     =  new Gtk.Switch({hexpand: false,vexpand:false,active: (this.eStr[0]=='T')? true:false,halign:Gtk.Align.CENTER});
    this.prefsSwitchBox  =  new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0,hexpand:true});
    
    this.prefsSwitchBox.add(this.prefsSwitch);
    
    if(dontAttach==false) {
      grid.attach(this.prefsLabel   ,0   ,posY  ,1   ,1);
      grid.attach(this.prefsCombo   ,1   ,posY  ,1   ,1);
      grid.attach(this.tweakButton  ,2   ,posY  ,1   ,1);  
      grid.attach(this.timeSetting  ,3   ,posY  ,1   ,1);
      grid.attach(this.prefsSwitchBox               ,4   ,posY  ,1   ,1);
    }
    
    this.allEffectsList.loadEffectsListToComboBox(this.prefsCombo);
    
    this.prefsCombo.connect('changed', (widget)=> this.selectEffectFromList(widget.get_active()));
    this.timeSetting.connect('notify::value', (spin)=> this.changeEffectTime(spin.get_value_as_int()));
    this.prefsSwitch.connect('notify::active', ()=> this.toggleItemStatus(this.prefsSwitch.active));  
    this.tweakButton.connect('clicked', ()=> this.effectsTweaks(topLevel));  
    
    settings.connect("changed::"+this.KEY,()=>this.updateValues(this.appIndex));
    this.updateValues(this.appIndex);

  },
  
  changeEffectTime: function(value) {

    if(this.updatingProfiles==true || this.appIndex ==-1 ) {
      return;
    }

    this.eStr = this.appProfile.getEffectAt(this.appIndex);
    this.appProfile.modifyEffectForWindowAction(this.appIndex,this.allEffectsList.setEffectTime(value,this.eStr));
    reloadApplicationProfiles();

  },
  
  effectsTweaks : function(topLevel) { 
   
    let dialog = new Gtk.Dialog({title:_("Customize")+"   "+this.eStr[1]+"   "+_("Animation"),transient_for: topLevel.get_toplevel(),use_header_bar: true,modal:true});
    dialog.get_content_area().pack_start(new EffectsTweaks(this.appProfile,this.appIndex), true, true, 0)
    dialog.set_default_response(Gtk.ResponseType.CANCEL);
    let addButton     = dialog.add_button("Restore Default", Gtk.ResponseType.OK);
    dialog.connect('response', Lang.bind(this, function(dialog, id) { 
      
      if (id == Gtk.ResponseType.OK) {
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

    this.eStr = this.appProfile.getEffectAt(this.appIndex);
    let state = this.eStr[0];
    this.eStr = [];
    this.eStr[0] = state;

    let selectedEffectFromList = this.allEffectsList.getEffectAt(selectedIndex);
  
    let i=1;

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

    this.prefsSwitch.active = (this.eStr[0]=="T")? true:false;
    this.prefsCombo.set_active(this.allEffectsList.getIndexOf(this.eStr[1]));
    this.timeSetting.set_value(this.allEffectsList.getTotalTimeOf(this.eStr));
    
    this.updatingProfiles = false;
  
  },
  
});

const AnimationSettingsForItemProfile = new GObject.Class({

  Name: 'AnimationSettingsForItemProfile',
  Extends: AnimationSettingsForItem,
  
  _init(itemType,windowType,action,grid,posY,topLevel,dontAttach=false) {
  
    this.parent(itemType,windowType,action,grid,posY,topLevel,dontAttach);
    this.prefsLabel.label = this.action.charAt(0).toUpperCase()+this.action.slice(1)
    this.updateValues(-1);
  
  },
  
});

const AnimationSettingsForItemPaired = new GObject.Class({

  Name: 'AnimationSettingsForItemPaired',
  
  _init(itemType,windowType,action,action1,grid,posY,topLevel) {

    let startEffectPrefs = new AnimationSettingsForItem(itemType,windowType,action,grid,posY,topLevel,true);
    let stopEffectPrefs  = new AnimationSettingsForItem(itemType,windowType,action1,grid,posY,topLevel,true);
    
    this.prefsBoxStart  =  new Gtk.Box({spacing: 5, orientation: Gtk.Orientation.HORIZONTAL, margin: 0,hexpand:true});   
    this.prefsBoxStart.add(startEffectPrefs.prefsCombo);
    this.prefsBoxStart.add(startEffectPrefs.tweakButton);
    this.prefsBoxStart.add(startEffectPrefs.timeSetting);
    
    this.prefsBoxStop  =  new Gtk.Box({ spacing: 5,orientation: Gtk.Orientation.HORIZONTAL, margin: 0,hexpand:true});   
    this.prefsBoxStop.add(stopEffectPrefs.prefsCombo);
    this.prefsBoxStop.add(stopEffectPrefs.tweakButton);
    this.prefsBoxStop.add(stopEffectPrefs.timeSetting);

    grid.attach(startEffectPrefs.prefsLabel,     0, posY, 1, 1);
    grid.attach(this.prefsBoxStart,              1, posY, 1, 1);
    grid.attach(this.prefsBoxStop,               2, posY, 1, 1);    
    grid.attach(startEffectPrefs.prefsSwitchBox, 3, posY, 1, 1);    
    
  },
  
});

const AnimationTweaksPrefs = new GObject.Class({

  Name: 'AnimationTweaksPrefs',
  Extends: Gtk.Stack,
    
  _init: function() {
  
    this.openingPrefs = new PrefsWindowForOpening("open");
    this.closingPrefs = new PrefsWindowForClosing("close");
    this.morePrefs    = new PrefsWindowForMore("minimize");
    this.profilePrefs = new PrefsWindowForProfiles();
    this.tweaksPrefs  = new PrefsWindowForTweaks();
    this.aboutPage    = new AboutPage();

    this.prefsWindowOpening = new Gtk.ScrolledWindow({hexpand: true,shadow_type: Gtk.ShadowType.IN});
    this.prefsWindowOpening.add(this.openingPrefs);
    this.prefsWindowOpening.set_min_content_height(700);
    
    this.prefsWindowMore = new Gtk.ScrolledWindow({hexpand: true,shadow_type: Gtk.ShadowType.IN});
    this.prefsWindowMore.add(this.morePrefs);
    this.prefsWindowMore.set_min_content_height(700);

    this.parent({ transition_type: 6  ,transition_duration: 300 });
    
    this.add_titled(this.prefsWindowOpening, "Open",     _("Open")    );
    this.add_titled(this.closingPrefs,       "Close",    _("Close")   );
    this.add_titled(this.prefsWindowMore,    "More",     _("More")    );
    this.add_titled(this.profilePrefs,       "Profiles", _("Profiles"));
    this.add_titled(this.tweaksPrefs,        "Tweaks",   _("Tweaks")  );
    this.add_titled(this.aboutPage,          "About",    _("About")   );  

    this.openingPrefs.displayPrefs();
    this.closingPrefs.displayPrefs();
    this.morePrefs.displayPrefs();
    this.profilePrefs.displayPrefs();
    this.tweaksPrefs.displayPrefs();
    this.aboutPage.showInfo();

  },

});

const EffectsList = new GObject.Class({

  Name: 'EffectsList',
    
  _init: function(KEY) {
  
    this.reloadList(KEY);
    
  },
  
  addDefaultEffectForWindowAction: function() {
  
    let windowOpenEffect  =  this.getEffectAt(0);
        
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
    let startIndex = 0;
    let endIndex = this.getEndIndex(startIndex);
    let eStr=[];
   
    while(startIndex!=-1) {
    
      if(effectIndex == index) {
        startIndex++;
        return this.extractEffect(startIndex,endIndex);
      }
      
      effectIndex++;
      startIndex = this.effectsList.indexOf('|',startIndex+1);
      endIndex = this.getEndIndex(startIndex);
      
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

    let cIndex = 8;
    let totalTime = 0; 

    for (cIndex;cIndex<eStr.length;cIndex=cIndex+TWEEN_PARAMETERS_LENGTH) {
      totalTime += (eStr[cIndex]>"0.010") ? parseFloat(eStr[cIndex]) : 0;
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

  modifyEffectForWindowAction: function(appIndex,eStr) {
    
    let windowOpenEffect = eStr;
    
    let effectIndex = 0;
    let startIndex = 0;
    let endIndex = this.getEndIndex(startIndex);
   
    windowOpenEffect.splice(0,0,"|");
   
    while(startIndex!=-1) {
    
      if(effectIndex == appIndex) {

        for(let i=0;i<windowOpenEffect.length;i++) {
          this.effectsList.splice(startIndex+i,0,windowOpenEffect[i]);
        }
        settings.set_strv(this.KEY,this.effectsList);  
        this.removeEffectForWindowAction(appIndex+1); 
        windowOpenEffect.splice(0,1);
        
        return;
        
      }
      
      effectIndex++;
      startIndex = this.effectsList.indexOf('|',startIndex+1);
      endIndex = this.getEndIndex(startIndex);
      
    } 
    
    windowOpenEffect.splice(0,1);
        
  },

  reloadList: function(KEY,TYPE) {
    
    this.KEY = KEY;
    this.effectsList = settings.get_strv(this.KEY); 
    
  },
  
  removeEffectForWindowAction: function(appIndex) {
  
    let effectIndex = 0;
    let startIndex = 0;
    let endIndex = this.getEndIndex(startIndex);
   
    while(startIndex!=-1) {
    
      if(effectIndex == appIndex) {
        this.effectsList.splice(startIndex,(endIndex-startIndex+1));
        settings.set_strv(this.KEY,this.effectsList); 
        return;
      }
      
      effectIndex++;
      startIndex = this.effectsList.indexOf('|',startIndex+1);
      endIndex = this.getEndIndex(startIndex);
    } 
    
  },
  
  setEffectTime: function(value,eStr) {

    let cIndex = 8;
    let totalTime = this.getTotalTimeOf(eStr); 

    for (let pIndex = cIndex;pIndex <eStr.length;pIndex=pIndex+TWEEN_PARAMETERS_LENGTH) {
      if(eStr[pIndex] > "0.010"){
        eStr[pIndex] = (((parseFloat(eStr[pIndex])*value)/totalTime).toPrecision(3)>="0.050") ? ((parseFloat(eStr[pIndex])*value)/totalTime).toPrecision(3).toString() : "0.050";
      }
    }  
  
    return eStr;

  },
  
});

const  EffectsTweaks =  new GObject.Class({

  Name: 'EffectsTweaks',
  Extends: Gtk.ScrolledWindow,

  _init: function(appProfile,appIndex) {

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

    while(i<TWEEN_PARAMETERS_LENGTH*this.eStr[2]) {
      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:" ",halign: Gtk.Align.CENTER }) ,0  ,++pos ,1  ,1);
      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b><u>"+_("Tween Parameters - "+((i-2)/TWEEN_PARAMETERS_LENGTH+1))+"</u></b></big>", halign: Gtk.Align.CENTER }) ,0  ,++pos ,3  ,1);
      this.gridWin.attach(new Gtk.Label({xalign:1,use_markup:true,label:" ",halign: Gtk.Align.CENTER }) ,0  ,++pos ,1  ,1);
       
      this.tweakParameter        ( ++i, _("Pivot Point X\t\t\t[\t-500  -  500\t%\t\t]"),                   ++pos, -500,  500,     100                            );
      this.tweakParameter        ( ++i, _("Pivot Point Y\t\t\t[\t-500  -  500\t%\t\t]"),                   ++pos, -500,  500,     100                            );
      this.tweakParameter        ( ++i, _("Rotation Center X\t\t[\t0  -  100\t%\t\t]"),                    ++pos, 0,     100,     100                            );
      this.tweakParameter        ( ++i, _("Rotation Center Y\t\t[\t0  -  100\t%\t\t]"),                    ++pos, 0,     100,     100                            );
      this.tweakParameter        ( ++i, _("Rotation Center Z\t\t[\t0  -  100\t%\t\t]"),                    ++pos, 0,     100,     100                            );
      this.tweakParameter        ( ++i, _("Time\t\t\t\t\t[\tin milliseconds\t]"),                          ++pos, 1,     10000,   1000                           ); 
      this.tweakParameter        ( ++i, _("Ending Opacity\t\t[\t0  -  255\t\t\t]"),                        ++pos, 0,     255,     1                              );
      this.tweakParameterDim     ( ++i, _("Ending Width\t\t\t[\t0  -  200\t%\t\t]"),                       ++pos, 0,     200,     100, ["MW"]                    );
      this.tweakParameterDim     ( ++i, _("Ending Height\t\t\t[\t0  -  200\t%\t\t]"),                      ++pos, 0,     200,     100, ["MH"]                    );
      this.tweakParameterPosition( ++i, _("Movement along X\t[\t0 ± % Screen width from current X→\t]"),   ++pos, -100,  100,     100, ["MX","LX","RX","SX","IX"]);
      this.tweakParameterPosition( ++i, _("Movement along Y\t[\t0 ± % Screen height from current Y↓\t]"),  ++pos, -100,  100,     100, ["MY","DY","UY","SY","IY"]);
      this.tweakParameter        ( ++i, _("Movement along Z\t[\t0 ± % Screen height from current Z\t]"),   ++pos, -100,  100,     100,                           );
      this.tweakParameter        ( ++i, _("Rotation about X\t\t[\tin Degree\t%\t\t]"),                     ++pos, -3600, 3600,    1                              );
      this.tweakParameter        ( ++i, _("Rotation about Y\t\t[\tin Degree\t%\t\t]"),                     ++pos, -3600, 3600,    1                              );
      this.tweakParameter        ( ++i, _("Rotation about Z\t\t[\tin Degree\t%\t\t]"),                     ++pos, -3600, 3600,    1                              );
      this.tweakTransitionType   ( ++i, _("Transition Type\t\t"),                                          ++pos                                                 );

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
  
    let SettingLabel    = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter = Gtk.SpinButton.new_with_range(minPV,maxPV,1);
    
    effectParameter.set_value(parseFloat(this.eStr[pNo])*multiplier);
    effectParameter.connect('notify::value', (spin)=> {     
      this.eStr[pNo]=(spin.get_value_as_int()/multiplier).toString();
      this.appProfile.modifyEffectForWindowAction(this.appIndex,this.eStr);
      reloadApplicationProfiles();
    });
    this.gridWin.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.gridWin.attach(effectParameter ,2    ,pos  ,1   ,1);
    
  },
  
  tweakTransitionType: function(pNo,INFO,pos) {
  
    let options=["easeInBack","easeInBounce","easeInCirc","easeInCubic","easeInElastic","easeInExpo","easeInQuad","easeInQuart","easeInQuint","easeInSine",
                 "easeInOutBack","easeInOutBounce","easeInOutCirc","easeInOutCubic","easeInOutElastic","easeInOutExpo","easeInOutQuad","easeInOutQuart","easeInOutQuint","easeInOutSine",
                 "easeOutBack","easeOutBounce","easeOutCirc","easeOutCubic","easeOutElastic","easeOutExpo","easeOutQuad","easeOutQuart","easeOutQuint","easeOutSine"
                ];
                 
    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter = new Gtk.ComboBoxText();
    for (let i = 0; i < options.length; i++) {
      effectParameter.append(options[i],  options[i]);
    }
    effectParameter.set_active(options.indexOf(this.eStr[pNo]));
    effectParameter.connect('changed', Lang.bind(this, function(widget) {
      
      this.eStr[pNo]=options[widget.get_active()];
      this.appProfile.modifyEffectForWindowAction(this.appIndex,this.eStr);
      reloadApplicationProfiles();
            
    }));
    
    this.gridWin.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.gridWin.attach(effectParameter ,2    ,pos  ,1   ,1);
    
  },
  
  tweakParameterDim : function(pNo,INFO,pos,minPV,maxPV,multiplier,acceptableValues) {

    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter   = new Gtk.Entry({text: this.filterInvalidValues( this.eStr[pNo],minPV,maxPV,acceptableValues,multiplier,multiplier)[1] });

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

    this.gridWin.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.gridWin.attach(effectParameter ,2    ,pos  ,1   ,1);

  }, 

  tweakParameterPosition : function(pNo,INFO,pos,minPV,maxPV,multiplier,acceptableValues) {

    let SettingLabel   = new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });  
    let effectParameter   = new Gtk.Entry({text: this.filterInvalidValues( this.eStr[pNo],minPV,maxPV,acceptableValues,multiplier,multiplier)[1] });

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

    this.gridWin.attach(SettingLabel    ,0    ,pos  ,1   ,1);
    this.gridWin.attach(effectParameter ,2    ,pos  ,1   ,1);

  }, 

});

const PrefsWindow = new GObject.Class({

  Name: 'PrefsWindow',
  Extends: Gtk.Grid,

  _init: function(action) {
      
    this.parent({ column_spacing: 40, halign: Gtk.Align.CENTER, margin: 20,margin_top:0, row_spacing: 20 ,border_width:20});
    this.addGrids();
    this.action = action;
     
  },

  addGrids: function() {

    this.switchBox0 = new Gtk.Grid({ column_spacing: 30, halign: Gtk.Align.CENTER, margin: 20, margin_top: 10, row_spacing: 0  ,border_width:0 });
    this.switchBox1 = new Gtk.Grid({ column_spacing: 30, halign: Gtk.Align.CENTER, margin: 20,                 row_spacing: 0  ,border_width:0 });
    
    this.attach(this.switchBox0,0,0,5,1);
    this.attach(this.switchBox1,0,10,5,1);

  },
 
  heading: function(posY,grid=this) {
  
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Items") ,halign: Gtk.Align.CENTER })           ,0  ,posY ,1  ,1);
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Effect"),halign: Gtk.Align.CENTER })           ,1  ,posY ,1  ,1);
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Time ( in ms )"),halign: Gtk.Align.CENTER })   ,3  ,posY ,1  ,1);
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Status"),     halign: Gtk.Align.CENTER })      ,4  ,posY ,1  ,1);
    
  },
  
  emptyLine: function(posY) {
  
    this.attach(new Gtk.Label({ xalign: 1, label: "" ,halign: Gtk.Align.CENTER }) ,0  ,posY ,1  ,1);
    
  },

  insertSpace: function(LABEL,posX,posY,sBox) {
  
    sBox.attach(new Gtk.Label({ xalign: 1, label: LABEL ,halign: Gtk.Align.CENTER }), posX, posY, 1, 1);
    
  },
  
  prefsWA: function(KEY,posX,posY,sbox,space=1) {
  
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
    
    sbox.attach(SettingLabel0   ,posX        ,posY  ,1   ,1);
    sbox.attach(SettingSwitch0  ,posX+space  ,posY  ,1   ,1);
    
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
    let pos = 2;
    new AnimationSettingsForItem("window",             "normal",             "close", this, pos++,this);
    new AnimationSettingsForItem("window",             "dialog",             "close", this, pos++,this);
    new AnimationSettingsForItem("window",             "modaldialog",        "close", this, pos++,this);
    this.emptyLine(pos++);
    new AnimationSettingsForItem("notificationbanner", "notificationbanner", "close", this, pos++,this);
    new AnimationSettingsForItem("padosd",             "padosd",             "close", this, pos++,this);
    
  },
  
});

const PrefsWindowForMore = new GObject.Class({

  Name: 'PrefsWindowForMore',
  Extends: PrefsWindow,

  _init: function(action) {  
  
    this.parent(action);
    
    this.switchBox2 = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20,                 row_spacing: 20  ,border_width:0 });
    this.switchBox3 = new Gtk.Grid({ column_spacing: 70, halign: Gtk.Align.CENTER, margin: 20, margin_top: 0,  row_spacing: 20  ,border_width:0 ,hexpand: true, });
    this.switchBox4 = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20,                 row_spacing: 20  ,border_width:0 });
    this.switchBox5 = new Gtk.Grid({ column_spacing: 30, halign: Gtk.Align.CENTER, margin: 20, margin_top: 0,  row_spacing: 20  ,border_width:0 });
  
    this.attach(this.switchBox2,0,20,5,1);
    this.attach(this.switchBox3,0,30,5,1);
    this.attach(this.switchBox4,0,40,5,1);
    this.attach(this.switchBox5,0,50,5,1);
                  
    this.switchBox1.margin_top = 0;
    this.switchBox1.row_spacing = 20;
    this.switchBox1.column_spacing = 70;
  },

  displayPrefs: function() { 
    
    this.prefsWA("minimizing-effect",      0,  0,   this.switchBox0);
    this.heading(0,this.switchBox1);
    let pos=1;
    new AnimationSettingsForItem("window", "normal", "minimize", this.switchBox1, pos++,this);
    new AnimationSettingsForItem("window", "dialog", "minimize", this.switchBox1, pos++,this);
    this.prefsWA("unminimizing-effect",    0,  0,   this.switchBox2);
    pos=pos+7;
    new AnimationSettingsForItem("window", "normal", "unminimize", this.switchBox3, pos++,this);
    new AnimationSettingsForItem("window", "dialog", "unminimize", this.switchBox3, pos++,this);
    this.prefsWA("moving-effect",          0,  0,   this.switchBox4);
    pos=pos+12;
    this.headingForParedEffects(pos++,this.switchBox5);
    new AnimationSettingsForItemPaired("window", "normal", "movestart", "movestop", this.switchBox5, pos++,this);
    new AnimationSettingsForItemPaired("window", "dialog", "movestart", "movestop", this.switchBox5, pos++,this);

  },
  
  headingForParedEffects: function(posY, grid) {

    grid.attach(new Gtk.Label({ xalign: 1, label: _("Items") ,halign: Gtk.Align.CENTER }),          0, posY, 1, 1);
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Starting Effect"),halign: Gtk.Align.CENTER }), 1, posY, 1, 1);
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Ending Effect"),halign: Gtk.Align.CENTER }),   2, posY, 1, 1);
    grid.attach(new Gtk.Label({ xalign: 1, label: _("Status"),     halign: Gtk.Align.CENTER }),     3, posY, 1, 1);
   
  },
  
});

const PrefsWindowForOpening = new GObject.Class({

  Name: 'PrefsWindowForOpening',
  Extends: PrefsWindow,

  _init: function(action) {  
  
    this.parent(action);
  },

  displayPrefs: function() { 
    
    let pos=0;
    
    this.prefsWA("opening-effect",         0,  pos++,   this.switchBox0); 
    this.heading(pos++);
    new AnimationSettingsForItem("window",             "normal",             "open", this, pos++, this);
    new AnimationSettingsForItem("window",             "dialog",             "open", this, pos++, this);
    new AnimationSettingsForItem("window",             "modaldialog",        "open", this, pos++, this);
    new AnimationSettingsForItem("other",              "dropdownmenu",       "open", this, pos++, this);
    new AnimationSettingsForItem("other",              "popupmenu",          "open", this, pos++, this);    
    new AnimationSettingsForItem("other",              "combo",              "open", this, pos++, this);    
    new AnimationSettingsForItem("other",              "tooltip",            "open", this, pos++, this);    
    new AnimationSettingsForItem("other",              "splashscreen",       "open", this, pos++, this);    
    new AnimationSettingsForItem("other",              "overrideother",      "open", this, pos++, this);   
    this.emptyLine(pos++); 
    new AnimationSettingsForItem("notificationbanner", "notificationbanner", "open", this, pos++, this); 
    new AnimationSettingsForItem("padosd",             "padosd",             "open", this, pos++, this);   
    
  },

}); 

const PrefsWindowForProfiles = new GObject.Class({

  Name: 'PrefsWindowForProfiles',
  Extends: Gtk.Grid,

  _init: function() {  
  
    this.parent();
    
  },
 
  addApp: function()  {
  
    let dialog = new Gtk.Dialog({ title: _('Choose an application'),transient_for: this.get_toplevel(),use_header_bar: true,modal: true });
    dialog._appChooser = new Gtk.AppChooserWidget({ show_all: true });
    dialog.set_default_response(Gtk.ResponseType.OK);
    dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    let addButton = dialog.add_button("Add", Gtk.ResponseType.OK);
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

      let appsList = settings.get_strv('application-list');
      let nameList = settings.get_strv('name-list');
      if (appsList.indexOf(appInfo.get_id())>=0) {
        dialog.destroy();
        return;
      }
      appsList.push(appInfo.get_id());
      nameList.push(appInfo.get_name());
      this.addDefaultEffectsAt(nameList.length-1);
      
      settings.set_strv('application-list', appsList);
      settings.set_strv('name-list', nameList);
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
    this.appNormalMovestartPrefs.appProfile.addDefaultEffectForWindowAction();  
    this.appNormalMovestopPrefs.appProfile.addDefaultEffectForWindowAction();  
    
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
    this.profilesOptionTopGrid.attach(box  ,2   ,0    ,1   ,1);
     
  },
  
  appViewChange: function() {
    
    let appsList = settings.get_strv('application-list');
    let nameList = settings.get_strv('name-list');
    
    let [any, model, iter] = this.treeView.get_selection().get_selected();
    let index=-1;
    
    if(any) {
      let appInfo = this._store.get_value(iter, 0); 
      index=appsList.indexOf(appInfo.get_id());
    }
    
    if(index >= 0 ) {
      this.AppLabel.label = "<big><b>"+settings.get_strv('name-list')[index]+" - "+_("Window Preferences")+"</b></big>";
      let appInfo = this._store.get_value(iter, 0); 
      this.AppIcon.gicon = appInfo.get_icon();
      index++;
    }
    
    else {
      this.AppLabel.label = "<big><b>"+_("No Application Selected")+" - "+_("Window Preferences")+"</b></big>";
    }
    
    this.appNormalOpenPrefs.updateValues(index);
    this.appNormalClosePrefs.updateValues(index);
    this.appNormalMinimizePrefs.updateValues(index);
    this.appNormalUnminimizePrefs.updateValues(index);
    this.appNormalMovestartPrefs.updateValues(index);
    this.appNormalMovestopPrefs.updateValues(index);
   
  }, 
  
  attachLabel: function(KEY,pos,box) {

    let prefLabel = new Gtk.Label({xalign: 1, label: _(settings.settings_schema.get_key(KEY).get_summary()), halign: Gtk.Align.CENTER});
    box.attach(prefLabel,1,pos,1,1);
    
  },

  displayPrefs: function() {
  
    this.makeList();
    this.refreshList();
    this.showPrefs();
  
  },
  
  emptyLine: function(posY) {
  
    this.gridWin.attach(new Gtk.Label({ xalign: 1, label: "" ,halign: Gtk.Align.CENTER }) ,0  ,posY ,1  ,1);
    
  },
  
  heading: function(posY) {
  
    this.gridWin.attach(new Gtk.Label({ xalign: 1, label: _("Action") ,halign: Gtk.Align.CENTER })          ,0  ,posY ,1  ,1);
    this.gridWin.attach(new Gtk.Label({ xalign: 1, label: _("Effect"),halign: Gtk.Align.CENTER })           ,1  ,posY ,1  ,1);
    this.gridWin.attach(new Gtk.Label({ xalign: 1, label: _("Time ( in ms )"),halign: Gtk.Align.CENTER })   ,3  ,posY ,1  ,1);
    this.gridWin.attach(new Gtk.Label({ xalign: 1, label: _("Status"),     halign: Gtk.Align.CENTER })      ,4  ,posY ,1  ,1);
    
  },

  makeList: function() {
  
    this._store = new Gtk.ListStore();
    this._store.set_column_types([Gio.AppInfo, GObject.TYPE_STRING, Gio.Icon]);
    this.treeView = new Gtk.TreeView({ model: this._store,hexpand: true,vexpand: true ,halign: Gtk.Align.START});

    let iconRenderer = new Gtk.CellRendererPixbuf;
    let nameRenderer = new Gtk.CellRendererText;
    let appColumn    = new Gtk.TreeViewColumn({expand: true, resizable:true,alignment: 0.5,sort_column_id: 1,title:_("Application List")});
    let listBox   = new Gtk.ScrolledWindow({hexpand: true,shadow_type: Gtk.ShadowType.IN});
    
    appColumn.pack_start(iconRenderer, false);
    appColumn.pack_start(nameRenderer, true);
    appColumn.add_attribute(iconRenderer, "gicon"  ,2);
    appColumn.add_attribute(nameRenderer, "text"   ,1);
    
    this.treeView.append_column(appColumn);
    appColumn.set_fixed_width(300);
    listBox.add(this.treeView);
    listBox.set_min_content_width(200);
    
    let addButton = new Gtk.Button({label: "     "+_("Add")+"    ", halign:Gtk.Align.START});
    addButton.connect('clicked', Lang.bind(this, this.addApp));

    let delButton = new Gtk.Button({label: " "+_("Remove")+" ", halign:Gtk.Align.END});
    delButton.connect('clicked', Lang.bind(this, this.removeApp));

    this.profilesOptionTopGrid = new Gtk.Grid({ column_spacing: 40, halign: Gtk.Align.CENTER, margin: 10, row_spacing: 10 ,border_width: 10});
    this.gridWin    = new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 10, row_spacing: 20 ,border_width: 10});

    this.profilesOptionTopGrid.attach(addButton,0,0,1,1);
    this.profilesOptionTopGrid.attach(delButton,3,0,1,1);
    
    this.attach(listBox, 0,0,1,3);
    this.attach(this.profilesOptionTopGrid, 1,0,1,1);
    this.attach(this.gridWin, 1,1,1,1);
    
  },

  prefCombo: function(KEY, pos, options, items,box) {
  
    let SettingCombo = new Gtk.ComboBoxText();
    for (let i = 0; i < options.length; i++) {
      SettingCombo.append(options[i],  items[i]);
    }
    SettingCombo.set_active(options.indexOf(settings.get_string(KEY)));
    SettingCombo.connect('changed', Lang.bind(this, function(widget) {
      settings.set_string(KEY, options[widget.get_active()]);
    }));
    
    this.attachLabel(KEY,pos,box);
    box.attach(SettingCombo, 0, pos+1, 1, 1);
    
  },

  refreshList: function()  {
  
    this._store.clear();
    let appsList = settings.get_strv("application-list");
    let nameList = settings.get_strv("name-list");

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
    
    settings.set_strv("application-list",appsList);
    settings.set_strv("name-list", nameList);
    
  },

  removeApp: function() {
  
    let [any, model, iter] = this.treeView.get_selection().get_selected();
    let appsList = settings.get_strv("application-list");
    let nameList = settings.get_strv("name-list");

    if (any) {
      let indx,appInfo = this._store.get_value(iter, 0); 
      appsList.splice((indx=appsList.indexOf(appInfo.get_id())),1);
      nameList.splice(indx,1);
      this.removeAppEffectsAt(indx);
      settings.set_strv("application-list",appsList);
      settings.set_strv("name-list", nameList);
      this._store.remove(iter);
    }

  },
  
  removeAppEffectsAt: function(index) {
 
    if(index >= 0 )  {
      index++;
    }
    
    this.appNormalOpenPrefs.appIndex--;
    this.appNormalClosePrefs.appIndex--;
    this.appNormalMinimizePrefs.appIndex--;
    this.appNormalUnminimizePrefs.appIndex--;
    this.appNormalMovestartPrefs.appIndex--;
    this.appNormalMoveStopPrefs.appIndex--;
    
    this.appNormalOpenPrefs.appProfile.removeEffectForWindowAction(index);  
    this.appNormalClosePrefs.appProfile.removeEffectForWindowAction(index);  
    this.appNormalMinimizePrefs.appProfile.removeEffectForWindowAction(index);  
    this.appNormalUnminimizePrefs.appProfile.removeEffectForWindowAction(index);  
    this.appNormalMovestartPrefs.appProfile.removeEffectForWindowAction(index);  
    this.appNormalMovestopPrefs.appProfile.removeEffectForWindowAction(index);  
    
    reloadApplicationProfiles();
    
  },

  showPrefs: function() {
    
    let pos = 0;
    
    this.AppLabel = new Gtk.Label({ xalign:  1, use_markup: true, halign: Gtk.Align.CENTER });
    this.AppIcon = new Gtk.Image({ gicon:null, pixel_size: 96 });
    this.iconImageBox  = new Gtk.Box();
    this.iconImageBox.set_center_widget(this.AppIcon);
    
    this.AppLabel.label = "<big><b>"+_("No Application Selected")+" - "+_("Window Preferences")+"</b></big>";
    this.emptyLine(pos++);
    this.gridWin.attach(this.iconImageBox ,0,pos++,7,1); 
    this.gridWin.attach(this.AppLabel,0,pos++,7,1);    
    this.emptyLine(pos++);
    this.heading(pos++);
    this.applicationProfilesStateSwitch("use-application-profiles");
    this.appNormalOpenPrefs       =  new AnimationSettingsForItemProfile("window", "normal", "open",       this.gridWin, pos++, this);
    this.appNormalClosePrefs      =  new AnimationSettingsForItemProfile("window", "normal", "close",      this.gridWin, pos++, this);
    this.appNormalMinimizePrefs   =  new AnimationSettingsForItemProfile("window", "normal", "minimize",   this.gridWin, pos++, this);
    this.appNormalUnminimizePrefs =  new AnimationSettingsForItemProfile("window", "normal", "unminimize", this.gridWin, pos++, this);
    this.appNormalMovestartPrefs  =  new AnimationSettingsForItemProfile("window", "normal", "movestart",  this.gridWin, pos++, this, true);
    this.appNormalMovestopPrefs   =  new AnimationSettingsForItemProfile("window", "normal", "movestop",   this.gridWin, pos++, this, true);    
    
    this.treeView.connect("cursor-changed",()=>this.appViewChange());
    
  },

});

const PrefsWindowForTweaks = new GObject.Class({

  Name: 'PrefsWindowForTweaks',
  Extends: PrefsWindow,

  _init: function() {  
  
    this.parent();
    
  },  
  
  displayPrefs: function() {
  
    let pos=0;
    this.prefsWA("wayland",                   10,  pos++, this,                                                                                                     7);
    this.prefInt("padosd-hide-timeout",       10,  pos++,                                                                                                           7);
    this.prefCombo("notificationbanner-pos",  10,  pos++, ["auto","left","center","right"],          ["Autodetect","Left","Center","Right"],                        7);
    this.prefStr("disable-shortcut",          10,  pos++, ['<Alt>', '<Ctrl>', '<Shift>', '<Super>'], [_('Alt Key'), _('Ctrl Key'), _('Shift Key'), _('Super Key')], 7);
    
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

  prefCombo: function(KEY, posX, posY, options, items,space) {
  
    let settingLabel = new Gtk.Label({xalign: 1, label: _(settings.settings_schema.get_key(KEY).get_summary()), halign: Gtk.Align.START});  
    let SettingCombo = new Gtk.ComboBoxText();
    for (let i = 0; i < options.length; i++) {
      SettingCombo.append(options[i],  items[i]);
    }
    SettingCombo.set_active(options.indexOf(settings.get_string(KEY)));
    SettingCombo.connect('changed', Lang.bind(this, function(widget) {
      settings.set_string(KEY, options[widget.get_active()]);
      reloadApplicationProfiles();
    }));
    
    this.attach(settingLabel, posX,       posY, space, 1);
    this.attach(SettingCombo, posX+space, posY, 1,     1);
    
  },
  
  prefStr: function(KEY, posX, posY, options, items,space) {
  
    let SettingCombo  = new Gtk.ComboBoxText();
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


