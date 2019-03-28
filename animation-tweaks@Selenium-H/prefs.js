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

    	_init: function(items,prefStrStart) 
	{
        	this.parent();
	
		settings	= new Gio.Settings({ 	settings_schema: Gio.SettingsSchemaSource.new_from_directory(Extension.path + "/schemas", 								Gio.SettingsSchemaSource.get_default(), false).lookup(Extension.metadata['settings-schema'], true) });
    		this.grid 	= new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20, row_spacing: 20 });
    		this.grid.set_border_width(20);
		
                this.heading();
		this.prefsFor(_('Normal Windows        ')  ,'normal'           ,1	,prefStrStart );
		this.prefsFor(_('Dialog Windows        ')  ,'dialog'           ,2	,prefStrStart );

		if(items>2)
			this.prefsFor(_('Modal Dialog Windows  ')  ,'modal-dialog'     ,3	,prefStrStart );
                if(items>3)
		{
			this.prefsFor(_('Drop Down Menu        ')  ,'dropdown-menu'    ,4	,prefStrStart );
			this.prefsFor(_('Pop up Menu 	       ')  ,'popup-menu'       ,5	,prefStrStart );
			this.prefsFor(_('Combo Box 	       ')  ,'combo'  	       ,6	,prefStrStart );
			this.prefsFor(_('Splash Screen 	       ')  ,'splashscreen'     ,7	,prefStrStart );
			this.prefsFor(_('Tool tips 	       ')  ,'tooltip'          ,8	,prefStrStart );
			this.prefsFor(_('Override Others       ')  ,'override-other'   ,9	,prefStrStart );
		}
		return this.grid;
	},

	heading: function()
	{
		this.grid.attach(new Gtk.Label({ xalign: 1, label: _("Items") ,halign: Gtk.Align.CENTER }) 	        ,0  ,0 ,1  ,1);
		this.grid.attach(new Gtk.Label({ xalign: 1, label: _("Effect"),halign: Gtk.Align.CENTER }) 	        ,5  ,0 ,11 ,1);
		this.grid.attach(new Gtk.Label({ xalign: 1, label: _("Time in miliseconds"),halign: Gtk.Align.CENTER }) ,20 ,0 ,5  ,1);
		this.grid.attach(new Gtk.Label({ xalign: 1, label: _("          Status"),halign: Gtk.Align.CENTER })    ,25 ,0 ,5  ,1);
	},

	prefsFor: function(LABEL,KEY,pos,prefStrStart)
	{
		let effectsList;
		switch(prefStrStart)
		{
			 case 0  :  effectsList=settings.get_strv('open-effects-list' ); break;
			 case 14 :  effectsList=settings.get_strv('close-effects-list'); break;
		}
		let eStr= settings.get_strv(KEY);

		let SettingLabel 	= new Gtk.Label({ xalign:  1, label: LABEL,halign: Gtk.Align.START });
    		let SettingSwitch 	= new Gtk.Switch({hexpand: false,vexpand:false,active: (eStr[0+prefStrStart]=='T')? true:false,halign:Gtk.Align.END});
		let box			= new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0 });
		let effectsCombo 	= new Gtk.ComboBoxText({hexpand: false,vexpand:false});
		let timeSetting 	= Gtk.SpinButton.new_with_range(0,10000,10);

    		SettingSwitch.connect('notify::active', function(button)  {	eStr= settings.get_strv(KEY);
										eStr[prefStrStart]=(eStr[prefStrStart]=='F')? 'T':'F';
										settings.set_strv(KEY,eStr);	
							 		  });
		for(let i=0;i<effectsList.length;i=i+13)  effectsCombo.append(effectsList[i],effectsList[i]);
		
		effectsCombo.set_active(effectsList.indexOf(eStr[1+prefStrStart])/13);
            	effectsCombo.connect('changed', Lang.bind (this, function(widget) {	eStr= settings.get_strv(KEY);
											for(let i=1;i<14;i++) eStr[i+prefStrStart]=effectsList[13*widget.get_active()+i-1];
									
											settings.set_strv(KEY,eStr);
											timeSetting.set_value(parseInt(eStr[3+prefStrStart]));
								 		   }));
  		timeSetting.set_value(parseInt(eStr[3+prefStrStart]));
  		timeSetting.connect('notify::value', function(spin) {   eStr= settings.get_strv(KEY);
									eStr[3+prefStrStart]=spin.get_value_as_int().toString();
									settings.set_strv(KEY,eStr);
						  		    });
		box.add(SettingSwitch);
		this.grid.attach(SettingLabel	,0    ,pos  ,1   ,1);
		this.grid.attach(effectsCombo	,5    ,pos  ,11  ,1);
		this.grid.attach(timeSetting	,20   ,pos  ,5   ,1);
                this.grid.attach(box		,25   ,pos  ,5   ,1);
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
                                         	  (Metadata.description) + "\n\n\n\n\n\n" +"<span size=\"small\">This program comes with ABSOLUTELY NO WARRANTY.\nSee the "+ 						  	  "<a href=\"https://www.gnu.org/licenses/old-licenses/gpl-2.0.html\">GNU General Public License, version 2 or later</a>"+ 	 							  "for details.</span>"+ "\n" });
		imageBox.set_center_widget(image);
        	vbox.pack_start(imageBox, false, false, 0);
        	textBox.pack_start(text,  false, false, 0);
        	vbox.pack_start(textBox,  false, false, 0);
		this.add(vbox);
    	}  
});

function initTranslations()
{
    	let localeDir = Extension.dir.get_child("locale");
	Gettext.bindtextdomain("animation-tweaks", localeDir.query_exists(null)?localeDir.get_path():Config.LOCALEDIR);
}
