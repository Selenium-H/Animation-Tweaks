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

function init()
{
	initTranslations()
}

function buildPrefsWidget() 
{
	let widget 	=  new AnimationTweaksPrefs();
    	let switcher 	=  new Gtk.StackSwitcher({halign: Gtk.Align.CENTER, visible: true, stack: widget});
    	Mainloop.timeout_add(0, () => {	widget.get_toplevel().get_titlebar().custom_title = switcher;	return false; });
    	widget.show_all();
   	return widget;
}

const 	AnimationTweaksPrefs = new GObject.Class({
    	Name: 		'AnimationTweaksPrefs',
    	Extends: 	Gtk.Stack,
    
    	_init: function() 
	{
        	this.parent({ transition_type: 0   ,transition_duration: 500    });
        	this.add_titled(new Prefs1(9 , 0 ) ,'prefs1'	,_('Open'	));
		this.add_titled(new Prefs1(3 ,14 ) ,'prefs2'	,_('Close'	));
		this.add_titled(new AboutPage()	   ,'about'	,_('About'	));	
    	}
});

const 	Prefs1 = 	new GObject.Class({
    	Name: 		'Prefs1',
	Extends: 	Gtk.Grid,

    	_init: function(items,sIndex) 
	{
        	this.parent({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20, row_spacing: 20 ,border_width:20});
		settings	= new Gio.Settings({ 	settings_schema: Gio.SettingsSchemaSource.new_from_directory(Extension.path + "/schemas", 								Gio.SettingsSchemaSource.get_default(), false).lookup(Extension.metadata['settings-schema'], true) });
		if(items<0) return;
                	this.heading(0);
			this.prefsFor(_('Normal Windows        ')  ,'normal'           ,1	,sIndex );
			this.prefsFor(_('Dialog Windows        ')  ,'dialog'           ,2	,sIndex );
			this.prefsFor(_('Modal Dialog Windows  ')  ,'modal-dialog'     ,3	,sIndex );
                if(items>3){
			this.prefsFor(_('Drop Down Menu        ')  ,'dropdown-menu'    ,4	,sIndex );
			this.prefsFor(_('Pop up Menu 	       ')  ,'popup-menu'       ,5	,sIndex );
			this.prefsFor(_('Combo Box 	       ')  ,'combo'  	       ,6	,sIndex );
			this.prefsFor(_('Splash Screen 	       ')  ,'splashscreen'     ,7	,sIndex );
			this.prefsFor(_('Tool tips 	       ')  ,'tooltip'          ,8	,sIndex );
			this.prefsFor(_('Override Others       ')  ,'override-other'   ,9	,sIndex );
		}
	},

	heading: function(pos)
	{
		this.attach(new Gtk.Label({ xalign: 1, label: _("Items") ,halign: Gtk.Align.CENTER }) 	           ,0  ,pos ,1  ,1);
		this.attach(new Gtk.Label({ xalign: 1, label: _("Effect"),halign: Gtk.Align.CENTER }) 	           ,5  ,pos ,11 ,1);
		this.attach(new Gtk.Label({ xalign: 1, label: _("Time in miliseconds"),halign: Gtk.Align.CENTER }) ,20 ,pos ,5  ,1);
		this.attach(new Gtk.Label({ xalign: 1, label: _("          Status"),halign: Gtk.Align.CENTER })    ,25 ,pos ,5  ,1);
	},

	prefsFor: function(LABEL,KEY,pos,sIndex)
	{
		let effectsList;
		switch(sIndex)
		{
			 case 0  :  effectsList=settings.get_strv('open-effects-list'    	); break;
			 case 14 :  effectsList=settings.get_strv('close-effects-list'   	); break;
		}
		let eStr= settings.get_strv(KEY);

		let SettingLabel 	= new Gtk.Label({ xalign:  1, label: LABEL,halign: Gtk.Align.START });
    		let SettingSwitch 	= new Gtk.Switch({hexpand: false,vexpand:false,active: (eStr[0+sIndex]=='T')? true:false,halign:Gtk.Align.END});
		let box			= new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0 });
		let effectsCombo 	= new Gtk.ComboBoxText({hexpand: false,vexpand:false});
		let tweakButton 	= new Gtk.Button({label: _("☰"),halign:Gtk.Align.START});
		let timeSetting 	= Gtk.SpinButton.new_with_range(0,10000,10);

    		SettingSwitch.connect('notify::active', function(button)  {	eStr= settings.get_strv(KEY);
										eStr[sIndex]=(eStr[sIndex]=='F')? 'T':'F';
										settings.set_strv(KEY,eStr);	
							 		  });
		for(let i=0;i<effectsList.length;i=i+13)  effectsCombo.append(effectsList[i],effectsList[i]);
		effectsCombo.set_active(effectsList.indexOf(eStr[1+sIndex])/13);
            	effectsCombo.connect('changed', Lang.bind (this, function(widget) {	eStr= settings.get_strv(KEY);
											for(let i=1;i<14;i++) eStr[i+sIndex]=effectsList[13*widget.get_active()+i-1];
									
											settings.set_strv(KEY,eStr);
											timeSetting.set_value(parseInt(eStr[3+sIndex]));
								 		   }));
		tweakButton.connect('clicked', ()=> this.effectsTweaks(timeSetting,effectsCombo,effectsList,eStr,sIndex,KEY));

  		timeSetting.set_value(parseInt(eStr[3+sIndex]));
  		timeSetting.connect('notify::value', function(spin) {   eStr= settings.get_strv(KEY);
									eStr[3+sIndex]=spin.get_value_as_int().toString();
									settings.set_strv(KEY,eStr);
						  		    });
		box.add(SettingSwitch);
		this.attach(SettingLabel	,0    ,pos  ,1   ,1);
		this.attach(effectsCombo	,5    ,pos  ,11  ,1);
		this.attach(tweakButton		,17   ,pos  ,1   ,1);	
		this.attach(timeSetting		,20   ,pos  ,5   ,1);
                this.attach(box			,25   ,pos  ,5   ,1);
	},

	effectsTweaks : function(timeSetting,effectsCombo,effectsList,eStr,sIndex,KEY)
	{    		
		let dialog = new Gtk.Dialog({title:_("Customize      Animation"),transient_for:this.get_toplevel(),use_header_bar: true,modal:true});
    		dialog.get_content_area().pack_start(new EffectsTweaks(eStr,sIndex,KEY,settings), true, true, 0);
		dialog.set_default_response(Gtk.ResponseType.CANCEL);
    		dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
		let addButton 		= dialog.add_button("Reset Default", Gtk.ResponseType.OK);
		dialog.connect('response', Lang.bind(this, function(dialog, id) { if (id == Gtk.ResponseType.OK){

											eStr= settings.get_strv(KEY);
											for(let i=1;i<14;i++) eStr[i+sIndex]=effectsList[13*effectsCombo.get_active()+i-1];
									
											settings.set_strv(KEY,eStr);
											timeSetting.set_value(parseInt(eStr[3+sIndex]));	
										  }
       										  dialog.destroy();
										}));
    		dialog.show_all();
	},
});

const   EffectsTweaks =	new GObject.Class({
    	Name: 		'EffectsTweaks',
	Extends: 	Gtk.Grid,

	_init: function(eStr,sIndex,KEY,settings) 
	{
		this.parent({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20, row_spacing: 15 ,border_width:20});
		this.attach(new Gtk.Label({xalign:1,use_markup:true,label:"<big><b>"+_("Any  Changes  done  here  are  Applied  immediately")+"</b></big>"}) ,0  ,0 ,1  ,1);
		this.tweakParameter( 3  ,_("Time for which this animation last"			)      	,2  ,0 ,10000	,eStr ,sIndex ,KEY ,settings);	
		this.tweakParameter( 4  ,_("Initial width	[  in Percentage  ]"		)	,3  ,0 ,100	,eStr ,sIndex ,KEY ,settings);
		this.tweakParameter( 5  ,_("Final width  	[  in Percentage  ]"		)   	,4  ,0 ,100	,eStr ,sIndex ,KEY ,settings);	
		this.tweakParameter( 6  ,_("Intial height	[  in Percentage  ]"		)	,5  ,0 ,100	,eStr ,sIndex ,KEY ,settings);	
		this.tweakParameter( 7  ,_("Final height	[  in Percentage  ]"		)	,6  ,0 ,100	,eStr ,sIndex ,KEY ,settings);
		this.tweakParameter( 8  ,_("Intial Opacity	[    0  -  255    ]"		) 	,7  ,0 ,255	,eStr ,sIndex ,KEY ,settings);	
		this.tweakParameter( 9  ,_("Final Opacity	[    0  -  255    ]"		)	,8  ,0 ,255	,eStr ,sIndex ,KEY ,settings);	
		this.tweakParameter( 10 ,_("Pivot Point X	[  in Percentage  ]"		)	,9  ,0 ,100	,eStr ,sIndex ,KEY ,settings);
		this.tweakParameter( 11 ,_("Pivot Point Y	[  in Percentage  ]"		) 	,10 ,0 ,100	,eStr ,sIndex ,KEY ,settings);
	},

	tweakParameter : function(pNo,INFO,pos,minPV,maxPV,eStr,sIndex,KEY,settings)
	{
		let SettingLabel 	= new Gtk.Label({ xalign:  1, label: INFO,halign: Gtk.Align.START });	
		let effectParameter 	= Gtk.SpinButton.new_with_range(minPV,maxPV,1);
		eStr= settings.get_strv(KEY);
 		effectParameter.set_value(parseInt(eStr[pNo+sIndex]));
  		effectParameter.connect('notify::value', function(spin) {   	eStr= settings.get_strv(KEY);
										eStr[pNo+sIndex]=spin.get_value_as_int().toString();
										settings.set_strv(KEY,eStr);
						  		        });
		this.attach(SettingLabel	,0    ,pos  ,1   ,1);
		this.attach(effectParameter	,17   ,pos  ,1   ,1);
	},
});

const	AboutPage = 	new GObject.Class({
    	Name: 		'AboutPage',
    	Extends: 	Gtk.ScrolledWindow,

    	_init: function(params) 
	{
        	this.parent();
        
        	let vbox	= new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 30 });
        	let imageBox	= new Gtk.Box();
        	let image 	= new Gtk.Image({ file: Extension.dir.get_child('eicon.png').get_path(), pixel_size: 96 });
       	 	let textBox	= new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        	let text 	= new Gtk.Label({ wrap: true, justify: 2, use_markup: true,
                                  		  label: "<big><b>" + Metadata.name + "</b></big>" + "\n" +"<small>Version" + " " + Metadata.version +"</small>\n\n" +
                                         	  (Metadata.description) + "\n\n\n" +"<span size=\"small\">This program comes with ABSOLUTELY NO WARRANTY.\nSee the "+ 						  	  "<a href=\"https://www.gnu.org/licenses/old-licenses/gpl-2.0.html\">GNU General Public License, version 2 or later</a>"+ 	 							  "for details.</span>"+ "\n" });
		let ResetExtensionButton 	= new Gtk.Button({label: _("Reset Animation Tweaks Extension "),halign:Gtk.Align.CENTER});

		let box 	        = new Gtk.Box({margin: 20,margin_top: 0,hexpand:false,halign:Gtk.Align.CENTER});
		let SettingLabel 	= new Gtk.Label({ xalign: 1, label: "Use the workaound for wayland   ",halign: Gtk.Align.CENTER });
    		let SettingSwitch 	= new Gtk.Switch({hexpand: false,active: settings.get_boolean('wayland'),halign:Gtk.Align.CENTER});
    		SettingSwitch.connect("notify::active", function(button) {settings.set_boolean('wayland', button.active);});		
    		box.add(SettingLabel);
		box.add(SettingSwitch);

		imageBox.set_center_widget(image);
		textBox.pack_start(text,  false, false, 0);
        	vbox.pack_start(imageBox, false, false, 0);
        	vbox.pack_start(textBox,  false, false, 0);
		vbox.pack_start(box,  false, false, 0);
		vbox.pack_start(ResetExtensionButton,  false, false, 0);
		this.add(vbox);
		ResetExtensionButton.connect('clicked', ()=> this.resetExtension());
    	},

	resetExtension: function()
	{
		settings	= new Gio.Settings({ 	settings_schema: Gio.SettingsSchemaSource.new_from_directory(Extension.path + "/schemas", 								Gio.SettingsSchemaSource.get_default(), false).lookup(Extension.metadata['settings-schema'], true) });
		settings.reset('dropdown-menu' );
		settings.reset('popup-menu'    );
		settings.reset('combo'         );
		settings.reset('splashscreen'  );
		settings.reset('tooltip'       );
		settings.reset('override-other');
		settings.reset('normal'        );
		settings.reset('dialog'        );
		settings.reset('modal-dialog'  );
	},  
});

function initTranslations()
{
    	let localeDir = Extension.dir.get_child("locale");
	Gettext.bindtextdomain("animation-tweaks", localeDir.query_exists(null)?localeDir.get_path():Config.LOCALEDIR);
}
