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
        	this.parent({ transition_type: 0, transition_duration: 500 });
        	this.add_titled(new Prefs1()	,'prefs'	,_('Preferences'));
		this.add_titled(new AboutPage()	,'about'	,_('About'));	
    	}
});

const 	Prefs1 = 	new GObject.Class({
    	Name: 		'Prefs1',

    	_init: function(params) 
	{
        	this.parent();
	
		settings	= new Gio.Settings({ 	settings_schema: Gio.SettingsSchemaSource.new_from_directory(Extension.path + "/schemas", 								Gio.SettingsSchemaSource.get_default(), false).lookup(Extension.metadata['settings-schema'], true) });
                
    		this.grid 	= new Gtk.Grid({ column_spacing: 20, halign: Gtk.Align.CENTER, margin: 20, row_spacing: 20 });
    		this.grid.set_border_width(20);
		
                this.heading();
		this.prefsFor(_('Drop Down Menu ')  ,'dropdown-menu'  ,1);
		this.prefsFor(_('Pop up Menu 	')  ,'popup-menu'     ,2);
		this.prefsFor(_('Combo Box 	')  ,'combo'  	      ,3);
		this.prefsFor(_('Splash Screen 	')  ,'splashscreen'   ,4);
		this.prefsFor(_('Tool tips 	')  ,'tooltip'        ,5);

		return this.grid;
	},

	heading: function()
	{
		this.grid.attach(new Gtk.Label({ xalign: 1, label: _("Items") ,halign: Gtk.Align.CENTER }) 	        ,0  ,0 ,1  ,1);
		this.grid.attach(new Gtk.Label({ xalign: 1, label: _("Effect"),halign: Gtk.Align.CENTER }) 	        ,5  ,0 ,11 ,1);
		this.grid.attach(new Gtk.Label({ xalign: 1, label: _("Time in miliseconds"),halign: Gtk.Align.CENTER }) ,20 ,0 ,5  ,1);
		this.grid.attach(new Gtk.Label({ xalign: 1, label: _("          Status"),halign: Gtk.Align.CENTER })    ,25 ,0 ,5  ,1);
	},

	prefsFor: function(LABEL,KEY,pos)
	{
		let effectsList= settings.get_strv('effects-list');
		let str= settings.get_strv(KEY);

		let SettingLabel 	= new Gtk.Label({ xalign: 1, label: LABEL,halign: Gtk.Align.START });
    		let SettingSwitch 	= new Gtk.Switch({hexpand: false,vexpand:false,active: (str[0]=='T')? true:false,halign:Gtk.Align.END});

    		SettingSwitch.connect("notify::active", function(button) 
							 {
								str[0]=(str[0]=='F')? 'T':'F';
								settings.set_strv(KEY,str);	
							 });
		
		let box	= new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0 });
		box.add(SettingSwitch);

		let effectsCombo 	= new Gtk.ComboBoxText({hexpand: false,vexpand:false});
		for(let i=0;i<effectsList.length;i=i+7)
		{
			effectsCombo.append(effectsList[i],effectsList[i]);
		}

		effectsCombo.set_active(effectsList.indexOf(str[1])/7);
            	effectsCombo.connect('changed', Lang.bind (this, function(widget) 
								 {									
									for(let i=0;i<7;i++) str[i+1]=effectsList[7*widget.get_active()+i];

									settings.set_strv(KEY,str);
								 }));

		let timeSetting = Gtk.SpinButton.new_with_range(0,10000,10);
  		timeSetting.set_value(parseInt(str[2]));
  		timeSetting.connect('notify::value', function(spin) 
						    {
							  	str[2]=spin.get_value_as_int().toString();
								settings.set_strv(KEY,str);
						    });

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
        	textBox.pack_start(text, false, false, 0);
        	vbox.pack_start(textBox, false, false, 0);
		this.add(vbox);
    	}  
});

function initTranslations()
{
    	let localeDir = Extension.dir.get_child("locale");
	Gettext.bindtextdomain("notification-center", localeDir.query_exists(null)?localeDir.get_path():Config.LOCALEDIR);
}
